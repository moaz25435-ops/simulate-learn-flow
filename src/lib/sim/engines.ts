/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Canvas engines.
 *
 * Each engine owns a mutable state object plus a `step` (physics) and `draw`
 * pass. They all speak in CSS pixels and take parameters straight from the
 * sliders, so dragging a control changes the picture on the very next frame.
 */
import type { EngineId, ParamValues, ToggleValues } from "./templates";

export const LIME = "#A3E635";
export const VIOLET = "#8B5CF6";
export const INK = "#E9EEF7";
export const MUTED = "rgba(147,160,184,0.9)";
export const FAINT = "rgba(233,238,247,0.14)";
export const PAPER = "#121824";

const TAU = Math.PI * 2;

export type Readout = { label: string; value: string; accent?: "lime" | "violet" };
export type PointerSample = { x: number; y: number; phase: "down" | "move" | "up" };
export type Frame = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dt: number;
  time: number;
  params: ParamValues;
  toggles: ToggleValues;
};

export type Engine = {
  /** Param keys that require rebuilding the state (e.g. a fresh launch). */
  resetOn: string[];
  init: (w: number, h: number, params: ParamValues, toggles: ToggleValues) => any;
  step: (state: any, f: Frame) => void;
  draw: (state: any, f: Frame) => void;
  readout: (state: any, f: Frame) => Readout[];
  pointer?: (state: any, f: Frame, sample: PointerSample) => boolean;
  cursor?: (state: any, f: Frame, point: { x: number; y: number }) => string;
};

/* ------------------------------------------------------------------ shared */

function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 0.6,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1.4,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 6;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color = MUTED,
  size = 11,
  align: CanvasTextAlign = "left",
  hand = false,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = hand
    ? `600 ${size + 3}px Caveat, "Segoe Script", cursive`
    : `500 ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
  ctx.restore();
}

function dashed(ctx: CanvasRenderingContext2D, pattern: number[]) {
  ctx.save();
  ctx.setLineDash(pattern);
}

const fmt = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

/* ------------------------------------------------------------- oscillator */

const oscillator: Engine = {
  resetOn: ["startAngle", "length", "gravity", "damping"],
  init(w, h, params) {
    const angle = (params.startAngle * Math.PI) / 180;
    return {
      theta: angle,
      omega: 0,
      dragging: false,
      dragOffset: 0,
      trail: [] as { theta: number; t: number }[],
      traceTime: 0,
      w,
      h,
    };
  },
  step(state, f) {
    const g = f.params.gravity;
    const L = Math.max(0.15, f.params.length);
    const pivotX = f.w / 2;
    const pivotY = f.h * 0.17;
    const scale = Math.min((f.h * 0.74) / 2.4, f.h * 0.44);
    const rod = L * scale;

    if (!state.dragging) {
      const alpha = -(g / L) * Math.sin(state.theta) - f.params.damping * state.omega;
      state.omega += alpha * f.dt;
      state.theta += state.omega * f.dt;
    }

    state.traceTime += f.dt;
    const bobX = pivotX + Math.sin(state.theta) * rod;
    const bobY = pivotY + Math.cos(state.theta) * rod;
    state.bobX = bobX;
    state.bobY = bobY;
    state.rod = rod;
    state.pivotX = pivotX;
    state.pivotY = pivotY;

    if (f.toggles.trail && !state.dragging) {
      state.trail.push({ theta: state.theta, t: state.traceTime });
      if (state.trail.length > 520) state.trail.shift();
    } else if (!f.toggles.trail) {
      state.trail.length = 0;
    }
  },
  draw(state, f) {
    const { ctx } = f;
    const rod = state.rod ?? 200;

    // velocity arc trail (ghost pendulum)
    if (f.toggles.trail && state.trail.length > 2) {
      for (let i = 1; i < state.trail.length; i += 1) {
        const a = state.trail[i - 1];
        const b = state.trail[i];
        const age = state.traceTime - b.t;
        const alpha = Math.max(0, 0.5 - age * 0.06);
        if (alpha <= 0.01) continue;
        const x1 = state.pivotX + Math.sin(a.theta) * rod;
        const y1 = state.pivotY + Math.cos(a.theta) * rod;
        const x2 = state.pivotX + Math.sin(b.theta) * rod;
        const y2 = state.pivotY + Math.cos(b.theta) * rod;
        ctx.strokeStyle = `rgba(163,230,53,${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // rod
    ctx.strokeStyle = "rgba(233,238,247,0.32)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(state.pivotX, state.pivotY);
    ctx.lineTo(state.bobX, state.bobY);
    ctx.stroke();

    // pivot plate
    ctx.fillStyle = "#1B2434";
    dot(ctx, state.pivotX, state.pivotY, 7, "#1E2839", "rgba(233,238,247,0.25)");
    dot(ctx, state.pivotX, state.pivotY, 2, "rgba(233,238,247,0.55)");

    // force vectors
    if (f.toggles.forces) {
      const weight = Math.min(120, 14 * f.params.gravity);
      arrow(ctx, state.bobX, state.bobY, state.bobX, state.bobY + weight, "rgba(139,92,246,0.9)");
      const dirX = state.pivotX - state.bobX;
      const dirY = state.pivotY - state.bobY;
      const len = Math.hypot(dirX, dirY) || 1;
      const tension = weight * Math.cos(state.theta);
      arrow(
        ctx,
        state.bobX,
        state.bobY,
        state.bobX + (dirX / len) * tension,
        state.bobY + (dirY / len) * tension,
        "rgba(163,230,53,0.9)",
      );
      text(ctx, "F = mg", state.bobX + 8, state.bobY + weight * 0.5, "rgba(139,92,246,0.95)", 10);
    }

    // bob
    glow(ctx, state.bobX, state.bobY, 46, "rgba(163,230,53,0.55)", 0.55);
    dot(ctx, state.bobX, state.bobY, 12, "#0F1420", "rgba(163,230,53,0.85)");
    const inner = ctx.createRadialGradient(
      state.bobX - 3,
      state.bobY - 4,
      0,
      state.bobX,
      state.bobY,
      11,
    );
    inner.addColorStop(0, "#E7FFB0");
    inner.addColorStop(0.6, LIME);
    inner.addColorStop(1, "#5F8C16");
    ctx.beginPath();
    ctx.arc(state.bobX, state.bobY, 10, 0, TAU);
    ctx.fillStyle = inner;
    ctx.fill();

    text(
      ctx,
      "drag me",
      state.bobX + 18,
      state.bobY - 16,
      "rgba(163,230,53,0.75)",
      13,
      "left",
      true,
    );
  },
  readout(state, f) {
    const L = Math.max(0.15, f.params.length);
    const period = TAU * Math.sqrt(L / Math.max(0.1, f.params.gravity));
    const energy =
      Math.max(0, 1 - Math.cos(state.theta)) * f.params.gravity * L +
      0.5 * L * L * state.omega * state.omega;
    return [
      { label: "Period", value: `${fmt(period)} s`, accent: "lime" },
      { label: "Angle", value: `${fmt((state.theta * 180) / Math.PI, 0)}°` },
      { label: "Ang. speed", value: `${fmt(state.omega)} rad/s` },
      { label: "Energy", value: `${fmt(energy)} J`, accent: "violet" },
    ];
  },
  pointer(state, f, sample) {
    if (sample.phase === "down") {
      const d = Math.hypot(sample.x - (state.bobX ?? 0), sample.y - (state.bobY ?? 0));
      if (d < 46) {
        state.dragging = true;
        return true;
      }
      return false;
    }
    if (sample.phase === "move" && state.dragging) {
      const dx = sample.x - state.pivotX;
      const dy = sample.y - state.pivotY;
      const next = Math.atan2(dx, dy);
      const prev = state.theta;
      state.theta = next;
      state.omega = Math.max(-24, Math.min(24, (next - prev) / Math.max(0.004, f.dt)));
      state.trail.length = 0;
      return true;
    }
    if (sample.phase === "up" && state.dragging) {
      state.dragging = false;
      return true;
    }
    return false;
  },
  cursor(state, _f, point) {
    return Math.hypot(point.x - (state.bobX ?? 0), point.y - (state.bobY ?? 0)) < 46
      ? "grab"
      : "default";
  },
};

/* ------------------------------------------------------------- projectile */

function launch(state: any, w: number, h: number, params: ParamValues) {
  const rad = (params.angle * Math.PI) / 180;
  const range = (params.speed * params.speed * Math.sin(2 * rad)) / Math.max(0.6, params.gravity);
  const apex = (params.speed * params.speed * Math.sin(rad) ** 2) / (2 * Math.max(0.6, params.gravity));
  const groundY = h * 0.86;
  const originX = Math.max(34, w * 0.08);
  const spanX = Math.max(24, range * 1.12);
  const scaleX = (w - originX - 24) / spanX;
  const scaleY = Math.min(scaleX, (groundY - 26) / Math.max(8, apex * 1.05));
  const scale = Math.max(1.2, Math.min(scaleX, scaleY));

  state.originX = originX;
  state.groundY = groundY;
  state.scale = scale;
  state.x = 0;
  state.y = 0.6;
  state.vx = Math.cos(rad) * params.speed;
  state.vy = Math.sin(rad) * params.speed;
  state.flight = 0;
  state.landed = false;
  state.holdTimer = 0;
  state.apex = 0;
  state.trace = [] as { x: number; y: number }[];
  state.ghost = state.lastTrace ?? null;
  state.speedNow = params.speed;
}

const projectile: Engine = {
  resetOn: ["speed", "angle", "gravity", "drag"],
  init(w, h, params) {
    const state: any = { time0: 0 };
    launch(state, w, h, params);
    return state;
  },
  step(state, f) {
    const p = f.params;
    if (!state.landed) {
      const steps = 4;
      const dt = Math.min(0.033, f.dt) / steps;
      for (let i = 0; i < steps; i += 1) {
        const speed = Math.hypot(state.vx, state.vy);
        const ax = -p.drag * speed * state.vx;
        const ay = -p.gravity - p.drag * speed * state.vy;
        state.vx += ax * dt;
        state.vy += ay * dt;
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        state.flight += dt;
        state.apex = Math.max(state.apex, state.y);
        if (state.y <= 0) {
          state.y = 0;
          state.landed = true;
          state.lastTrace = state.trace;
          break;
        }
      }
      state.trace.push({ x: state.x, y: state.y });
      if (state.trace.length > 900) state.trace.shift();
    } else {
      state.holdTimer += f.dt;
      if (state.holdTimer > 1.1) launch(state, f.w, f.h, p);
    }
    state.speedNow = Math.hypot(state.vx, state.vy);
  },
  draw(state, f) {
    const { ctx } = f;
    const { originX, groundY, scale } = state;
    const toX = (m: number) => originX + m * scale;
    const toY = (m: number) => groundY - m * scale;

    // ground
    ctx.strokeStyle = "rgba(233,238,247,0.28)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(12, groundY);
    ctx.lineTo(f.w - 12, groundY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(233,238,247,0.1)";
    for (let x = 12; x < f.w - 12; x += 13) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 7, groundY + 7);
      ctx.stroke();
    }

    // distance ruler
    const span = (f.w - originX - 20) / scale;
    const stepM = span > 120 ? 25 : span > 50 ? 10 : 5;
    dashed(ctx, [3, 5]);
    ctx.strokeStyle = "rgba(233,238,247,0.13)";
    for (let m = stepM; m < span; m += stepM) {
      ctx.beginPath();
      ctx.moveTo(toX(m), groundY);
      ctx.lineTo(toX(m), groundY - 16);
      ctx.stroke();
      text(ctx, `${m}m`, toX(m), groundY + 12, "rgba(147,160,184,0.7)", 9, "center");
    }
    ctx.restore();

    // ghost of previous shot
    if (state.ghost && f.toggles.trace) {
      dashed(ctx, [4, 6]);
      ctx.strokeStyle = "rgba(139,92,246,0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      state.ghost.forEach((point: any, index: number) => {
        const x = toX(point.x);
        const y = toY(point.y);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // live trace
    if (f.toggles.trace && state.trace.length > 1) {
      ctx.strokeStyle = "rgba(163,230,53,0.5)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      state.trace.forEach((point: any, index: number) => {
        const x = toX(point.x);
        const y = toY(point.y);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // launcher
    const rad = (f.params.angle * Math.PI) / 180;
    arrow(
      ctx,
      originX,
      groundY,
      originX + Math.cos(rad) * 46,
      groundY - Math.sin(rad) * 46,
      "rgba(233,238,247,0.55)",
      2.4,
    );
    dot(ctx, originX, groundY, 5, "#1E2839", "rgba(233,238,247,0.4)");

    // apex annotation
    if (state.apex > 0.5) {
      const apexX = toX(0);
      dashed(ctx, [2, 4]);
      ctx.strokeStyle = "rgba(139,92,246,0.45)";
      ctx.beginPath();
      ctx.moveTo(originX, toY(state.apex));
      ctx.lineTo(f.w - 16, toY(state.apex));
      ctx.stroke();
      ctx.restore();
      text(
        ctx,
        `apex ${fmt(state.apex, 1)} m`,
        f.w - 18,
        toY(state.apex) - 12,
        "rgba(196,181,253,0.9)",
        14,
        "right",
        true,
      );
    }

    // ball
    const bx = toX(state.x);
    const by = toY(state.y);
    glow(ctx, bx, by, 40, "rgba(163,230,53,0.5)", 0.5);
    dot(ctx, bx, by, 8, LIME, "rgba(233,238,247,0.5)");

    if (f.toggles.velocity) {
      const vScale = 5.5;
      arrow(
        ctx,
        bx,
        by,
        bx + state.vx * vScale,
        by - state.vy * vScale,
        "rgba(139,92,246,0.95)",
      );
      text(
        ctx,
        `${fmt(state.speedNow, 1)} m/s`,
        bx + state.vx * vScale,
        by - state.vy * vScale - 12,
        "rgba(196,181,253,0.95)",
        10,
        "center",
      );
    }

    if (state.landed) {
      text(
        ctx,
        `range ${fmt(state.x, 1)} m`,
        bx + 4,
        by - 22,
        "rgba(163,230,53,0.95)",
        16,
        "left",
        true,
      );
    }
  },
  readout(state, f) {
    return [
      { label: "Range", value: `${fmt(state.x, 1)} m`, accent: "lime" },
      { label: "Apex", value: `${fmt(state.apex, 1)} m` },
      { label: "Air time", value: `${fmt(state.flight, 2)} s` },
      { label: "Speed now", value: `${fmt(state.speedNow, 1)} m/s`, accent: "violet" },
      { label: "Launch angle", value: `${fmt(f.params.angle, 0)}°` },
    ];
  },
};

/* ------------------------------------------------------------------ wave */

const GW = 220;
const GH = 132;

const wave: Engine = {
  resetOn: [],
  init() {
    const buffer = document.createElement("canvas");
    buffer.width = GW;
    buffer.height = GH;
    const bctx = buffer.getContext("2d")!;
    return {
      buffer,
      image: bctx.createImageData(GW, GH),
      phase: 0,
    };
  },
  step(state, f) {
    state.phase += f.dt * f.params.speed * 2.4;
  },
  draw(state, f) {
    const { ctx, w, h } = f;
    const data = state.image.data as Uint8ClampedArray;
    const lambda = Math.max(6, f.params.wavelength);
    const k = TAU / lambda;
    const sep = Math.min(w - 90, f.params.separation);
    const cx = w / 2;
    const cy = h / 2;
    const s1 = { x: cx - sep / 2, y: cy };
    const s2 = { x: cx + sep / 2, y: cy };
    const amp = f.params.contrast;
    const t = state.phase;
    const scaleX = w / GW;
    const scaleY = h / GH;

    for (let py = 0; py < GH; py += 1) {
      const wy = py * scaleY;
      for (let px = 0; px < GW; px += 1) {
        const wx = px * scaleX;
        const d1 = Math.hypot(wx - s1.x, wy - s1.y);
        let value = Math.sin(k * d1 - t);
        if (!f.toggles.single) {
          const d2 = Math.hypot(wx - s2.x, wy - s2.y);
          value = (value + Math.sin(k * d2 - t)) / 2;
        }
        const amount = Math.pow(Math.abs(value), 1 / Math.max(0.15, amp)) * amp;
        const i = (py * GW + px) * 4;
        if (value >= 0) {
          data[i] = 18 + amount * 145;
          data[i + 1] = 24 + amount * 206;
          data[i + 2] = 36 + amount * 17;
        } else {
          data[i] = 18 + amount * 121;
          data[i + 1] = 24 + amount * 68;
          data[i + 2] = 36 + amount * 210;
        }
        data[i + 3] = 255;
      }
    }

    const bufferCtx = state.buffer.getContext("2d") as CanvasRenderingContext2D;
    bufferCtx.putImageData(state.image, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(state.buffer, 0, 0, w, h);
    ctx.restore();

    // faint construction lines through the sources
    dashed(ctx, [4, 7]);
    ctx.strokeStyle = "rgba(233,238,247,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s1.x, 0);
    ctx.lineTo(s1.x, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.restore();

    if (f.toggles.sources) {
      for (const source of [s1, s2]) {
        glow(ctx, source.x, source.y, 34, "rgba(233,238,247,0.35)", 0.5);
        dot(ctx, source.x, source.y, 4, INK);
      }
      text(ctx, "S₁", s1.x - 12, s1.y - 16, "rgba(163,230,53,0.95)", 13, "center", true);
      text(
        ctx,
        f.toggles.single ? "S₂ (muted)" : "S₂",
        s2.x + 26,
        s2.y - 16,
        f.toggles.single ? "rgba(147,160,184,0.6)" : "rgba(196,181,253,0.95)",
        13,
        "center",
        true,
      );
    }

    text(
      ctx,
      "antinodes where crests agree",
      cx,
      h - 18,
      "rgba(163,230,53,0.8)",
      15,
      "center",
      true,
    );
  },
  readout(_state, f) {
    const lambda = Math.max(6, f.params.wavelength);
    return [
      { label: "Wavelength", value: `${fmt(lambda, 0)} px`, accent: "lime" },
      { label: "Frequency", value: `${fmt(f.params.speed / lambda, 3)} /s` },
      { label: "Source gap", value: `${fmt(f.params.separation, 0)} px`, accent: "violet" },
      {
        label: "Fringe spacing",
        value: `${fmt((lambda * 260) / Math.max(20, f.params.separation), 1)} px`,
      },
    ];
  },
};

/* ---------------------------------------------------------------- growth */

type Curve = {
  rate: number;
  capacity: number;
  start: number;
  logistic: boolean;
  points: number[];
  from: number[];
  morph: number;
};

function buildCurve(
  rate: number,
  capacity: number,
  start: number,
  logistic: boolean,
  from: number[],
): Curve {
  const samples = 200;
  const points: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    if (logistic) {
      const k = capacity / Math.max(1, start) - 1;
      points.push(capacity / (1 + k * Math.exp(-rate * 10 * t)));
    } else {
      points.push(Math.max(0, start * Math.exp(rate * 6 * t)));
    }
  }
  return { rate, capacity, start, logistic, points, from: from.slice(), morph: 0 };
}

const growth: Engine = {
  resetOn: [],
  init(_w, _h, params, toggles) {
    const curve = buildCurve(params.rate, params.capacity, params.start, toggles.logistic, []);
    return { curve, ghosts: [] as number[][], playhead: 0, paused: 0 };
  },
  step(state, f) {
    const key = `${f.params.rate}|${f.params.capacity}|${f.params.start}|${f.toggles.logistic}`;
    if (key !== state.key) {
      if (state.key !== undefined && f.toggles.ghosts) {
        state.ghosts.push(state.curve.points);
        if (state.ghosts.length > 3) state.ghosts.shift();
      }
      const previous = state.curve?.points ?? [];
      const previousPlayhead = state.playhead ?? 0;
      state.curve = buildCurve(
        f.params.rate,
        f.params.capacity,
        f.params.start,
        f.toggles.logistic,
        previous,
      );
      state.key = key;
      state.playhead = Math.min(previousPlayhead, 1);
    }
    if (state.curve.morph < 1) state.curve.morph = Math.min(1, state.curve.morph + f.dt * 2.2);
    state.playhead += f.dt * 0.42;
    if (state.playhead > 1.35) {
      state.paused += f.dt;
      if (state.paused > 1.2) {
        state.playhead = 0;
        state.paused = 0;
      }
    }
  },
  draw(state, f) {
    const { ctx, w, h } = f;
    const padL = 52;
    const padR = 26;
    const padT = 28;
    const padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const curve: Curve = state.curve;
    const ceiling = f.toggles.logistic ? curve.capacity : 0;
    const peak = Math.max(
      1,
      ceiling,
      ...curve.points,
      ...state.ghosts.map((g: number[]) => Math.max(...g)),
    );
    const toX = (t: number) => padL + t * plotW;
    const toY = (v: number) => padT + plotH - (v / peak) * plotH;

    // axes
    ctx.strokeStyle = "rgba(233,238,247,0.28)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(padL, padT - 6);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(w - padR + 8, padT + plotH);
    ctx.stroke();

    // y ticks
    ctx.strokeStyle = "rgba(233,238,247,0.1)";
    for (let i = 0; i <= 4; i += 1) {
      const value = (peak * i) / 4;
      const y = toY(value);
      ctx.beginPath();
      ctx.moveTo(padL - 5, y);
      ctx.lineTo(w - padR + 8, y);
      ctx.stroke();
      text(ctx, `${value.toFixed(0)}`, padL - 10, y, "rgba(147,160,184,0.75)", 9, "right");
    }
    text(ctx, "population", padL - 10, padT - 16, MUTED, 10, "right");
    text(ctx, "time →", w - padR + 8, padT + plotH + 18, MUTED, 10, "right");

    // ghost curves
    state.ghosts.forEach((ghost: number[], index: number) => {
      const alpha = 0.1 + index * 0.06;
      ctx.strokeStyle = `rgba(139,92,246,${alpha + 0.16})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ghost.forEach((value, i) => {
        const x = toX(i / (ghost.length - 1));
        const y = toY(value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // carrying-capacity line
    if (f.toggles.logistic) {
      dashed(ctx, [5, 5]);
      ctx.strokeStyle = "rgba(139,92,246,0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padL, toY(curve.capacity));
      ctx.lineTo(w - padR + 8, toY(curve.capacity));
      ctx.stroke();
      ctx.restore();
      text(
        ctx,
        `ceiling ${curve.capacity.toFixed(0)}`,
        w - padR - 4,
        toY(curve.capacity) - 13,
        "rgba(196,181,253,0.9)",
        14,
        "right",
        true,
      );
    }

    // morph between old and new curve
    const eased = 1 - Math.pow(1 - curve.morph, 3);
    const rendered = curve.points.map((value, i) =>
      curve.from.length === curve.points.length
        ? curve.from[i] + (value - curve.from[i]) * eased
        : value,
    );

    const progressIndex = Math.max(1, Math.floor(state.playhead * rendered.length));

    ctx.save();
    ctx.shadowColor = "rgba(163,230,53,0.55)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < Math.min(progressIndex, rendered.length); i += 1) {
      const x = toX(i / (rendered.length - 1));
      const y = toY(rendered[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // fill under the drawn portion
    const lastIndex = Math.min(progressIndex, rendered.length) - 1;
    if (lastIndex > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = LIME;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(0));
      for (let i = 0; i <= lastIndex; i += 1) {
        ctx.lineTo(toX(i / (rendered.length - 1)), toY(rendered[i]));
      }
      ctx.lineTo(toX(lastIndex / (rendered.length - 1)), toY(0));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // playhead marker
    if (lastIndex >= 0) {
      const x = toX(lastIndex / (rendered.length - 1));
      const y = toY(rendered[lastIndex]);
      glow(ctx, x, y, 26, "rgba(163,230,53,0.6)", 0.6);
      dot(ctx, x, y, 5, INK);
      text(
        ctx,
        rendered[lastIndex].toFixed(1),
        x + 12,
        y - 12,
        "rgba(233,238,247,0.95)",
        15,
        "left",
        true,
      );
    }

    text(
      ctx,
      curve.rate < 0 ? "decaying every step" : f.toggles.logistic ? "logistic ceiling" : "pure exponential",
      padL + 6,
      padT + 14,
      "rgba(163,230,53,0.85)",
      14,
      "left",
      true,
    );
  },
  readout(state, f) {
    const curve: Curve = state.curve;
    const last = curve.points[curve.points.length - 1];
    const t2 = curve.points[Math.floor(curve.points.length / 2)];
    const doublings =
      f.params.rate > 0.001 ? Math.log(2) / (f.params.rate * 6) : Infinity;
    return [
      { label: "End value", value: fmt(last, 1), accent: "lime" },
      { label: "Mid value", value: fmt(t2, 1) },
      { label: "Growth rate", value: `${fmt(f.params.rate * 100, 0)}%`, accent: "violet" },
      {
        label: "Doubling time",
        value: Number.isFinite(doublings) ? `${fmt(doublings, 2)} t` : "—",
      },
    ];
  },
};

/* ------------------------------------------------------------------- gas */

type Particle = { x: number; y: number; vx: number; vy: number; history: number[] };

function spawnParticles(state: any, w: number, h: number, params: ParamValues) {
  const target = Math.round(params.count);
  const speed = Math.sqrt(params.temperature) * 210;
  while (state.particles.length > target) state.particles.pop();
  while (state.particles.length < target) {
    const angle = Math.random() * TAU;
    const magn = speed * (0.55 + Math.random() * 0.9);
    const x = 24 + Math.random() * Math.max(10, w - 48);
    const y = 24 + Math.random() * Math.max(10, h - 48);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * magn,
      vy: Math.sin(angle) * magn,
      history: [x, y],
    });
  }
}

const gas: Engine = {
  resetOn: [],
  init(w, h, params) {
    const state: any = { particles: [] as Particle[], lastTemperature: params.temperature };
    spawnParticles(state, w, h, params);
    return state;
  },
  step(state, f) {
    const p = f.params;
    if (Math.abs(p.temperature - state.lastTemperature) > 1e-4) {
      const factor = Math.sqrt(Math.max(0.01, p.temperature) / Math.max(0.01, state.lastTemperature));
      for (const particle of state.particles) {
        particle.vx *= factor;
        particle.vy *= factor;
      }
      state.lastTemperature = p.temperature;
    }
    spawnParticles(state, f.w, f.h, p);

    const dt = Math.min(0.033, f.dt);
    const r = p.size;
    for (const particle of state.particles) {
      particle.vy += p.gravity * 190 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.x < r) {
        particle.x = r;
        particle.vx = Math.abs(particle.vx);
      } else if (particle.x > f.w - r) {
        particle.x = f.w - r;
        particle.vx = -Math.abs(particle.vx);
      }
      if (particle.y < r) {
        particle.y = r;
        particle.vy = Math.abs(particle.vy);
      } else if (particle.y > f.h - r) {
        particle.y = f.h - r;
        particle.vy = -Math.abs(particle.vy) * 0.995;
      }
      if (f.toggles.trails) {
        particle.history.push(particle.x, particle.y);
        if (particle.history.length > 8) particle.history.splice(0, 2);
      } else if (particle.history.length) {
        particle.history.length = 0;
      }
    }
  },
  draw(state, f) {
    const { ctx } = f;
    const r = f.params.size;
    for (const particle of state.particles) {
      if (f.toggles.trails && particle.history.length >= 4) {
        ctx.strokeStyle = "rgba(139,92,246,0.22)";
        ctx.lineWidth = Math.max(0.6, r * 0.5);
        ctx.beginPath();
        for (let i = 0; i < particle.history.length; i += 2) {
          const x = particle.history[i];
          const y = particle.history[i + 1];
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const speed = Math.hypot(particle.vx, particle.vy);
      const heat = Math.min(1, speed / 420);
      dot(
        ctx,
        particle.x,
        particle.y,
        r,
        `rgba(${Math.round(163 + heat * 60)},${Math.round(230 - heat * 60)},${Math.round(53 + heat * 120)},0.95)`,
      );
    }

    if (f.toggles.histogram) {
      const bins = 11;
      const counts = new Array(bins).fill(0);
      let max = 0;
      for (const particle of state.particles) {
        const speed = Math.hypot(particle.vx, particle.vy);
        max = Math.max(max, speed);
        const index = Math.min(bins - 1, Math.floor((speed / 460) * bins));
        counts[index] += 1;
      }
      const peak = Math.max(1, ...counts);
      const baseX = 20;
      const baseY = f.h - 22;
      const barW = 12;
      text(ctx, "speed distribution", baseX, baseY - 58, "rgba(147,160,184,0.85)", 10);
      counts.forEach((count, index) => {
        const height = (count / peak) * 46;
        const x = baseX + index * (barW + 3);
        ctx.fillStyle = `rgba(163,230,53,${0.25 + (index / bins) * 0.7})`;
        ctx.beginPath();
        ctx.roundRect(x, baseY - height, barW, height, 3);
        ctx.fill();
      });
      text(ctx, "slow", baseX, baseY + 10, "rgba(147,160,184,0.6)", 9);
      text(
        ctx,
        `peak ${max.toFixed(0)} px/s`,
        baseX + bins * (barW + 3) + 6,
        baseY + 10,
        "rgba(147,160,184,0.6)",
        9,
      );
    }

    text(
      ctx,
      `T = ${fmt(f.params.temperature, 2)}  ·  ${state.particles.length} particles`,
      f.w - 18,
      22,
      "rgba(196,181,253,0.9)",
      14,
      "right",
      true,
    );
  },
  readout(state, f) {
    const speeds = state.particles.map((p: Particle) => Math.hypot(p.vx, p.vy));
    const avg = speeds.reduce((a: number, b: number) => a + b, 0) / Math.max(1, speeds.length);
    return [
      { label: "Particles", value: `${state.particles.length}`, accent: "lime" },
      { label: "Mean speed", value: `${fmt(avg, 0)} px/s` },
      { label: "Temperature", value: fmt(f.params.temperature, 2), accent: "violet" },
      { label: "T ∝ v²", value: fmt(avg * avg, 0) },
    ];
  },
};

/* --------------------------------------------------------------- gravity */

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  tone: number;
  phase: number;
};

const gravity: Engine = {
  resetOn: ["mass", "distance", "speed", "bodies"],
  init(w, h, params) {
    const state: any = { bodies: [] as Body[], w, h };
    resetBodies(state, w, h, params);
    return state;
  },
  step(state, f) {
    const GM = 1.458e6 * f.params.mass;
    const cx = f.w / 2;
    const cy = f.h / 2;
    const dt = Math.min(0.032, f.dt);
    const sub = 4;
    for (const body of state.bodies) {
      for (let i = 0; i < sub; i += 1) {
        const dx = cx - body.x;
        const dy = cy - body.y;
        const distSq = Math.max(120, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const accel = GM / distSq;
        body.vx += (dx / dist) * accel * (dt / sub);
        body.vy += (dy / dist) * accel * (dt / sub);
        body.x += body.vx * (dt / sub);
        body.y += body.vy * (dt / sub);
      }
      if (f.toggles.trails) {
        body.trail.push({ x: body.x, y: body.y });
        if (body.trail.length > 460) body.trail.shift();
      } else if (body.trail.length) {
        body.trail.length = 0;
      }
      const radius = Math.hypot(body.x - cx, body.y - cy);
      if (radius < 16 || radius > Math.max(f.w, f.h) * 1.1) {
        resetBodies(state, f.w, f.h, f.params);
        return;
      }
    }
    state.cx = cx;
    state.cy = cy;
  },
  draw(state, f) {
    const { ctx } = f;
    const cx = f.w / 2;
    const cy = f.h / 2;
    const massRadius = 12 + f.params.mass * 7;

    // gravity well rings
    for (let i = 3; i >= 1; i -= 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, massRadius + i * 26 * f.params.mass, 0, TAU);
      ctx.strokeStyle = `rgba(139,92,246,${0.06 * i})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const body of state.bodies) {
      if (body.trail.length > 2) {
        ctx.lineWidth = 1.2;
        for (let i = 1; i < body.trail.length; i += 1) {
          const alpha = (i / body.trail.length) * 0.55;
          ctx.strokeStyle =
            body.tone === 0
              ? `rgba(163,230,53,${alpha})`
              : `rgba(139,92,246,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(body.trail[i - 1].x, body.trail[i - 1].y);
          ctx.lineTo(body.trail[i].x, body.trail[i].y);
          ctx.stroke();
        }
      }

      if (f.toggles.vectors) {
        const dx = cx - body.x;
        const dy = cy - body.y;
        const len = Math.hypot(dx, dy) || 1;
        arrow(
          ctx,
          body.x,
          body.y,
          body.x + (dx / len) * 34,
          body.y + (dy / len) * 34,
          "rgba(139,92,246,0.85)",
        );
      }

      const color = body.tone === 0 ? LIME : VIOLET;
      glow(ctx, body.x, body.y, 26, body.tone === 0 ? "rgba(163,230,53,0.55)" : "rgba(139,92,246,0.6)");
      dot(ctx, body.x, body.y, 5, color, "rgba(233,238,247,0.5)");
    }

    glow(ctx, cx, cy, massRadius * 3.4, "rgba(139,92,246,0.5)", 0.55);
    const core = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, massRadius);
    core.addColorStop(0, "#F3E8FF");
    core.addColorStop(0.45, VIOLET);
    core.addColorStop(1, "#2B1D5C");
    ctx.beginPath();
    ctx.arc(cx, cy, massRadius, 0, TAU);
    ctx.fillStyle = core;
    ctx.fill();

    text(
      ctx,
      `M = ${fmt(f.params.mass, 2)}`,
      cx,
      cy + massRadius + 20,
      "rgba(196,181,253,0.9)",
      14,
      "center",
      true,
    );
    const orbit = state.bodies[0];
    if (orbit) {
      const radius = Math.hypot(orbit.x - cx, orbit.y - cy);
      text(
        ctx,
        `r = ${radius.toFixed(0)} px`,
        f.w - 18,
        22,
        "rgba(163,230,53,0.9)",
        14,
        "right",
        true,
      );
    }
  },
  readout(state, f) {
    const body = state.bodies[0];
    const GM = 1.458e6 * f.params.mass;
    const radius = body ? Math.hypot(body.x - f.w / 2, body.y - f.h / 2) : f.params.distance;
    const circular = Math.sqrt(GM / Math.max(20, radius));
    const speed = body ? Math.hypot(body.vx, body.vy) : 0;
    const escape = circular * Math.SQRT2;
    return [
      { label: "Radius", value: `${fmt(radius, 0)} px` },
      { label: "Speed", value: `${fmt(speed, 1)} px/s`, accent: "lime" },
      { label: "Circular v", value: `${fmt(circular, 1)} px/s` },
      { label: "Escape v", value: `${fmt(escape, 1)} px/s`, accent: "violet" },
      {
        label: "Verdict",
        value:
          speed > escape ? "escaping" : speed > circular * 0.85 ? "orbiting" : "falling in",
      },
    ];
  },
};

function resetBodies(state: any, w: number, h: number, params: ParamValues) {
  const GM = 1.458e6 * params.mass;
  const count = Math.round(params.bodies);
  const bodies: Body[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + 0.6;
    const radius = params.distance * (1 + i * 0.06);
    const x = w / 2 + Math.cos(angle) * radius;
    const y = h / 2 + Math.sin(angle) * radius;
    const circular = Math.sqrt(GM / Math.max(20, radius));
    const speed = circular * params.speed;
    bodies.push({
      x,
      y,
      vx: -Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      trail: [],
      tone: i % 2,
      phase: angle,
    });
  }
  state.bodies = bodies;
  state.w = w;
  state.h = h;
}

/* ---------------------------------------------------------------- optics */

const optics: Engine = {
  resetOn: [],
  init() {
    return { pulse: 0 };
  },
  step(state, f) {
    state.pulse += f.dt;
  },
  draw(state, f) {
    const { ctx, w, h } = f;
    const axisY = h * 0.52;
    const lensX = w * 0.56;
    const scale = Math.min(1, (lensX - 26) / 470);
    const focal = f.params.focal * scale;
    const objectDistance = Math.max(focal + 6, f.params.objectDistance * scale);
    const objectHeight = f.params.objectHeight * scale;
    const objectX = lensX - objectDistance;
    const inverse = 1 / focal - 1 / objectDistance;
    const imageDistance = Math.abs(inverse) < 1e-6 ? Infinity : 1 / inverse;
    const magnification = Number.isFinite(imageDistance) ? -imageDistance / objectDistance : Infinity;
    const imageHeight = objectHeight * magnification;

    // optical axis
    ctx.strokeStyle = "rgba(233,238,247,0.22)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(14, axisY);
    ctx.lineTo(w - 14, axisY);
    ctx.stroke();

    // focal marks
    for (const x of [lensX - focal, lensX + focal]) {
      ctx.strokeStyle = "rgba(233,238,247,0.45)";
      ctx.beginPath();
      ctx.moveTo(x, axisY - 6);
      ctx.lineTo(x, axisY + 6);
      ctx.stroke();
      text(
        ctx,
        x < lensX ? "F" : "F′",
        x,
        axisY + 20,
        "rgba(196,181,253,0.9)",
        14,
        "center",
        true,
      );
    }

    // lens: soft biconvex shape
    ctx.save();
    ctx.beginPath();
    const lensHeight = h * 0.78;
    ctx.moveTo(lensX, axisY - lensHeight / 2);
    ctx.quadraticCurveTo(lensX + 34, axisY, lensX, axisY + lensHeight / 2);
    ctx.quadraticCurveTo(lensX - 34, axisY, lensX, axisY - lensHeight / 2);
    ctx.closePath();
    const lensFill = ctx.createLinearGradient(lensX - 30, 0, lensX + 30, 0);
    lensFill.addColorStop(0, "rgba(139,92,246,0.18)");
    lensFill.addColorStop(0.5, "rgba(196,181,253,0.34)");
    lensFill.addColorStop(1, "rgba(139,92,246,0.18)");
    ctx.fillStyle = lensFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(196,181,253,0.7)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    const objectTopY = axisY - objectHeight;

    // principal rays
    if (f.toggles.principal) {
      const rayColor = "rgba(163,230,53,0.9)";
      // 1. parallel in -> through F'
      arrow(ctx, objectX, objectTopY, lensX, objectTopY, rayColor, 1.3);
      const slope = (axisY - objectTopY) / Math.max(1, focal);
      const endY = objectTopY + slope * (w - 14 - lensX);
      ctx.strokeStyle = "rgba(163,230,53,0.75)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(lensX, objectTopY);
      ctx.lineTo(w - 14, endY);
      ctx.stroke();

      // 2. through the centre, undeviated
      ctx.strokeStyle = "rgba(163,230,53,0.5)";
      ctx.beginPath();
      ctx.moveTo(objectX, objectTopY);
      const centerSlope = (axisY - objectTopY) / Math.max(1, lensX - objectX);
      ctx.lineTo(w - 14, objectTopY + centerSlope * (w - 14 - objectX));
      ctx.stroke();

      // 3. through F in front -> parallel out
      const frontFocalX = lensX - focal;
      const slope3 = (axisY - objectTopY) / Math.max(1, frontFocalX - objectX);
      const yAtLens = objectTopY + slope3 * (lensX - objectX);
      if (Math.abs(yAtLens - axisY) < h) {
        ctx.strokeStyle = "rgba(163,230,53,0.65)";
        ctx.beginPath();
        ctx.moveTo(objectX, objectTopY);
        ctx.lineTo(lensX, yAtLens);
        ctx.lineTo(w - 14, yAtLens);
        ctx.stroke();
      }

      // virtual construction lines
      if (f.toggles.principal && Number.isFinite(imageDistance) && imageDistance < 0) {
        dashed(ctx, [5, 6]);
        ctx.strokeStyle = "rgba(139,92,246,0.6)";
        ctx.beginPath();
        ctx.moveTo(lensX, objectTopY);
        ctx.lineTo(lensX - 240, objectTopY - slope * 240);
        ctx.moveTo(lensX, yAtLens);
        ctx.lineTo(lensX - 240, yAtLens);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ray fan showing convergence
    if (f.toggles.fan) {
      const imageX = lensX + imageDistance;
      const imageY = axisY - imageHeight;
      const spread = (f.params.aperture * Math.PI) / 180;
      const fanCount: number = 9;
      for (let i = 0; i < fanCount; i += 1) {
        const t = fanCount === 1 ? 0.5 : i / (fanCount - 1);
        const angle = -Math.PI / 2 + (t - 0.5) * spread * 2.4;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const travel = (lensX - objectX) / Math.max(0.001, dirX);
        const hitY = objectTopY + dirY * travel;
        if (Math.abs(hitY - axisY) > lensHeight / 2) continue;
        ctx.strokeStyle = "rgba(163,230,53,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(objectX, objectTopY);
        ctx.lineTo(lensX, hitY);
        if (Number.isFinite(imageX) && Number.isFinite(imageY)) {
          ctx.lineTo(imageX, imageY);
          ctx.lineTo(imageX + 160, imageY + ((imageY - hitY) / 110) * 160);
        } else {
          ctx.lineTo(w - 14, hitY + (hitY - axisY) * 0.4);
        }
        ctx.stroke();
      }
    }

    // object arrow
    arrow(ctx, objectX, axisY, objectX, objectTopY, LIME, 2.4);
    dot(ctx, objectX, axisY, 3.4, LIME);
    text(ctx, "object", objectX, axisY + 18, "rgba(163,230,53,0.9)", 13, "center", true);

    // image arrow
    if (Number.isFinite(imageDistance) && Math.abs(imageHeight) > 1) {
      const imageX = lensX + imageDistance;
      const imageY = axisY - imageHeight;
      const visible = imageX > 10 && imageX < w - 10;
      if (visible) {
        arrow(ctx, imageX, axisY, imageX, imageY, VIOLET, 2.4);
        dot(ctx, imageX, axisY, 3.4, VIOLET);
        glow(ctx, imageX, imageY, 26, "rgba(139,92,246,0.5)", 0.5);
        text(
          ctx,
          imageHeight < 0 ? "real · inverted" : "virtual · upright",
          imageX,
          axisY + (imageHeight < 0 ? 30 : -30),
          "rgba(196,181,253,0.95)",
          14,
          "center",
          true,
        );
      }
    }
  },
  readout(_state, f) {
    const focal = f.params.focal;
    const objectDistance = Math.max(focal + 6, f.params.objectDistance);
    const inverse = 1 / focal - 1 / objectDistance;
    const imageDistance = Math.abs(inverse) < 1e-6 ? Infinity : 1 / inverse;
    const magnification = Number.isFinite(imageDistance) ? -imageDistance / objectDistance : Infinity;
    return [
      { label: "Focal length", value: `${fmt(focal, 0)} px`, accent: "violet" },
      {
        label: "Image distance",
        value: Number.isFinite(imageDistance) ? `${fmt(imageDistance, 0)} px` : "∞",
        accent: "lime",
      },
      {
        label: "Magnification",
        value: Number.isFinite(magnification) ? `${fmt(magnification, 2)}×` : "∞",
      },
      {
        label: "Image type",
        value:
          !Number.isFinite(imageDistance) ? "none"
            : imageDistance > 0
              ? "real, inverted"
              : "virtual, upright",
      },
    ];
  },
};

/* ----------------------------------------------------------------- field */

type Charge = { x: number; y: number; q: number; pinned: boolean };

function resetCharges(state: any, w: number, h: number, params: ParamValues) {
  const gap = Math.min(params.gap, w - 120);
  const cx = w / 2;
  const cy = h / 2;
  state.charges = [
    { x: cx - gap / 2, y: cy, q: params.chargeA, pinned: false },
    { x: cx + gap / 2, y: cy, q: params.chargeB, pinned: false },
  ];
}

function fieldAt(charges: Charge[], x: number, y: number) {
  let ex = 0;
  let ey = 0;
  let potential = 0;
  for (const charge of charges) {
    const dx = x - charge.x;
    const dy = y - charge.y;
    const distSq = Math.max(60, dx * dx + dy * dy);
    const dist = Math.sqrt(distSq);
    const strength = charge.q / distSq;
    ex += strength * (dx / dist) * 900;
    ey += strength * (dy / dist) * 900;
    potential += (charge.q / dist) * 900;
  }
  return { ex, ey, potential };
}

const field: Engine = {
  resetOn: ["gap"],
  init(w, h, params) {
    const state: any = { charges: [] as Charge[], dragging: -1 };
    resetCharges(state, w, h, params);
    return state;
  },
  step(state, f) {
    state.charges = state.charges.map((charge: Charge, index: number) => ({
      ...charge,
      // follow the gap slider unless the learner has dragged it somewhere
      x:
        charge.pinned || state.dragging === index
          ? Math.min(f.w - 22, Math.max(22, charge.x))
          : index === 0
            ? Math.max(30, f.w / 2 - Math.min(f.params.gap, f.w - 120) / 2)
            : Math.min(f.w - 30, f.w / 2 + Math.min(f.params.gap, f.w - 120) / 2),
      y: Math.min(f.h - 22, Math.max(22, charge.y)),
      q: index === 0 ? f.params.chargeA : f.params.chargeB,
    }));
  },
  draw(state, f) {
    const { ctx, w, h } = f;
    const charges: Charge[] = state.charges;

    if (f.toggles.potential) {
      const step = 13;
      const levels = [-760, -320, -120, 120, 320, 760];
      for (const level of levels) {
        ctx.strokeStyle = level > 0 ? "rgba(163,230,53,0.28)" : "rgba(139,92,246,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (let gy = 0; gy <= h; gy += step) {
          for (let gx = 0; gx <= w; gx += step) {
            const a = fieldAt(charges, gx, gy).potential;
            const b = fieldAt(charges, gx + step, gy).potential;
            const c = fieldAt(charges, gx, gy + step).potential;
            const d = fieldAt(charges, gx + step, gy + step).potential;
            const cross = (v1: number, v2: number) => (v1 - level) * (v2 - level) < 0;
            if (cross(a, b)) {
              const t = (level - a) / (b - a);
              const px = gx + t * step;
              if (!started) {
                ctx.moveTo(px, gy);
                started = true;
              } else ctx.lineTo(px, gy);
            } else if (cross(a, c)) {
              const t = (level - a) / (c - a);
              const py = gy + t * step;
              if (!started) {
                ctx.moveTo(gx, py);
                started = true;
              } else ctx.lineTo(gx, py);
            }
            if (cross(a, d)) {
              const t = (level - a) / (d - a);
              ctx.moveTo(gx, gy);
              ctx.lineTo(gx + t * step, gy + t * step);
            }
          }
        }
        ctx.stroke();
      }
    }

    if (f.toggles.lines) {
      const total = charges.reduce((sum, charge) => sum + Math.abs(charge.q), 0) || 1;
      for (const charge of charges) {
        const sign = Math.sign(charge.q);
        if (sign === 0) continue;
        const lines = Math.max(3, Math.round((f.params.density * Math.abs(charge.q)) / (total / 2)));
        for (let i = 0; i < lines; i += 1) {
          let angle = (i / lines) * TAU + (charge.x / 90) % TAU;
          let x = charge.x + Math.cos(angle) * 8;
          let y = charge.y + Math.sin(angle) * 8;
          ctx.strokeStyle = sign > 0 ? "rgba(163,230,53,0.5)" : "rgba(196,181,253,0.45)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let stepIndex = 0; stepIndex < 900; stepIndex += 1) {
            const e = fieldAt(charges, x, y);
            const magnitude = Math.hypot(e.ex, e.ey);
            if (magnitude < 1e-4) break;
            const dir = sign > 0 ? 1 : -1;
            const nx = e.ex / magnitude;
            const ny = e.ey / magnitude;
            x += nx * dir * 6;
            y += ny * dir * 6;
            if (x < -40 || x > w + 40 || y < -40 || y > h + 40) break;
            ctx.lineTo(x, y);
            if (charges.some((other) => Math.hypot(other.x - x, other.y - y) < 9)) break;
          }
          ctx.stroke();
        }
      }
    }

    charges.forEach((charge) => {
      const color = charge.q > 0 ? LIME : charge.q < 0 ? VIOLET : MUTED;
      const radius = 12 + Math.min(12, Math.abs(charge.q) * 2.6);
      glow(ctx, charge.x, charge.y, radius * 3, charge.q > 0 ? "rgba(163,230,53,0.55)" : "rgba(139,92,246,0.6)", 0.5);
      const core = ctx.createRadialGradient(
        charge.x - 3,
        charge.y - 4,
        1,
        charge.x,
        charge.y,
        radius,
      );
      core.addColorStop(0, charge.q > 0 ? "#F0FFC9" : "#F0E9FF");
      core.addColorStop(0.6, color);
      core.addColorStop(1, "#131A26");
      ctx.beginPath();
      ctx.arc(charge.x, charge.y, radius, 0, TAU);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.strokeStyle = "rgba(233,238,247,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      text(
        ctx,
        `${charge.q > 0 ? "+" : ""}${charge.q.toFixed(1)}`,
        charge.x,
        charge.y,
        "#0F1420",
        12,
        "center",
      );
    });

    text(
      ctx,
      "drag a charge",
      charges[0].x,
      charges[0].y - (28 + Math.min(12, Math.abs(charges[0].q) * 2.6)),
      "rgba(163,230,53,0.75)",
      14,
      "center",
      true,
    );
  },
  readout(state, f) {
    const center = fieldAt(state.charges, f.w / 2, f.h / 2);
    const separation = Math.abs(state.charges[1].x - state.charges[0].x);
    return [
      { label: "Charge A", value: `${state.charges[0].q >= 0 ? "+" : ""}${fmt(state.charges[0].q, 1)}`, accent: "lime" },
      { label: "Charge B", value: `${state.charges[1].q >= 0 ? "+" : ""}${fmt(state.charges[1].q, 1)}`, accent: "violet" },
      { label: "Separation", value: `${fmt(separation, 0)} px` },
      { label: "Field at centre", value: fmt(Math.hypot(center.ex, center.ey), 0) },
      {
        label: "Interaction",
        value:
          state.charges[0].q * state.charges[1].q < 0 ? "attractive" : "repulsive",
      },
    ];
  },
  pointer(state, f, sample) {
    if (sample.phase === "down") {
      const index = state.charges.findIndex(
        (charge: Charge) => Math.hypot(charge.x - sample.x, charge.y - sample.y) < 30,
      );
      if (index === -1) return false;
      state.dragging = index;
      state.charges[index].pinned = true;
      return true;
    }
    if (sample.phase === "move" && state.dragging >= 0) {
      state.charges[state.dragging].x = sample.x;
      state.charges[state.dragging].y = sample.y;
      return true;
    }
    if (sample.phase === "up" && state.dragging >= 0) {
      state.dragging = -1;
      return true;
    }
    return false;
  },
  cursor(state, _f, point) {
    return state.charges.some(
      (charge: Charge) => Math.hypot(charge.x - point.x, charge.y - point.y) < 30,
    )
      ? "grab"
      : "default";
  },
};

export const ENGINES: Record<EngineId, Engine> = {
  oscillator,
  projectile,
  wave,
  growth,
  gas,
  gravity,
  optics,
  field,
};
