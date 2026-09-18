import { useEffect, useMemo, useRef, useState } from "react";

import { ENGINES, type Frame, type Readout } from "@/lib/sim/engines";
import type { EngineId, ParamValues, ToggleValues } from "@/lib/sim/templates";
import { cn } from "@/lib/utils";

type Props = {
  engineId: EngineId;
  params: ParamValues;
  toggles: ToggleValues;
  interactive?: boolean;
  className?: string;
  /** Fired whenever the learner drags inside the canvas. */
  onInteract?: () => void;
};

/**
 * Hosts one canvas engine: DPR scaling, the animation loop, physics dragging
 * with grab feedback, and a throttled stream of live readouts for the chips
 * that float over the bottom of the viewport.
 */
export function SimCanvas({
  engineId,
  params,
  toggles,
  interactive = true,
  className,
  onInteract,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<unknown>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const paramsRef = useRef(params);
  const togglesRef = useRef(toggles);
  const interactRef = useRef(onInteract);
  const [readouts, setReadouts] = useState<Readout[]>([]);

  paramsRef.current = params;
  togglesRef.current = toggles;
  interactRef.current = onInteract;

  const engine = ENGINES[engineId];
  const resetSignature = useMemo(
    () => engine.resetOn.map((key) => params[key] ?? "").join("|"),
    [engine, params],
  );
  const lastResetRef = useRef<string | null>(null);

  // Rebuild the engine whenever a structural parameter changes.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) {
      // Layout hasn't measured yet — the resize pass builds the first state.
      lastResetRef.current = resetSignature;
      return;
    }
    if (lastResetRef.current === resetSignature) return;
    lastResetRef.current = resetSignature;
    stateRef.current = engine.init(w, h, paramsRef.current, togglesRef.current);
  }, [engine, resetSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let previous = performance.now();
    let elapsed = 0;
    let lastReadout = 0;
    let built = { w: 0, h: 0 };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(120, wrap.clientWidth);
      const h = Math.max(120, wrap.clientHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      if (built.w !== w || built.h !== h || !stateRef.current) {
        stateRef.current = engine.init(w, h, paramsRef.current, togglesRef.current);
        built = { w, h };
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.0005, (now - previous) / 1000));
      previous = now;
      elapsed += dt;

      const state = stateRef.current;
      if (state) {
        const frame: Frame = {
          ctx,
          w: sizeRef.current.w,
          h: sizeRef.current.h,
          dt,
          time: elapsed,
          params: paramsRef.current,
          toggles: togglesRef.current,
        };
        ctx.clearRect(0, 0, frame.w, frame.h);
        engine.step(state, frame);
        engine.draw(state, frame);
        if (now - lastReadout > 140) {
          lastReadout = now;
          setReadouts(engine.readout(state, frame));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let dragging = false;

    const frameFor = (dt: number): Frame => ({
      ctx,
      w: sizeRef.current.w,
      h: sizeRef.current.h,
      dt,
      time: 0,
      params: paramsRef.current,
      toggles: togglesRef.current,
    });

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const down = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      dragging = Boolean(
        engine.pointer?.(state, frameFor(0.016), { ...toCanvas(event), phase: "down" }),
      );
      if (dragging) {
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
        interactRef.current?.();
      }
    };

    const move = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const point = toCanvas(event);
      if (dragging) {
        engine.pointer?.(state, frameFor(0.016), { ...point, phase: "move" });
      } else {
        canvas.style.cursor = engine.cursor?.(state, frameFor(0.016), point) ?? "grab";
      }
    };

    const up = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state || !dragging) return;
      engine.pointer?.(state, frameFor(0.016), { ...toCanvas(event), phase: "up" });
      dragging = false;
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, [engine, interactive]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={wrapRef}
        className="paper-grain relative h-full w-full overflow-hidden rounded-[1.75rem]"
      >
        <canvas ref={canvasRef} className={cn("block h-full w-full", interactive && "touch-none")} />
      </div>
      {readouts.length > 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap gap-1.5">
          {readouts.slice(0, 5).map((item) => (
            <span
              key={item.label}
              className={cn(
                "tick-label rounded-full border px-2.5 py-1 text-[10px] backdrop-blur-sm",
                item.accent === "lime"
                  ? "border-lime-neon/40 bg-lime-neon/10 text-lime-neon"
                  : item.accent === "violet"
                    ? "border-violet-neon/40 bg-violet-neon/15 text-violet-200"
                    : "border-white/10 bg-slate-deep/80 text-muted-foreground",
              )}
            >
              <span className="opacity-60">{item.label}</span> {item.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
