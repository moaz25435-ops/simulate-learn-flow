/**
 * Tiny WebAudio "haptic" layer.
 *
 * Every tactile control (slider drag, toggle flip, node tap) fires a very short
 * synthesised blip so the interface feels physical. All of it is lazily created
 * on first use and can be muted globally.
 */

type Listener = (enabled: boolean) => void;

let enabled = true;
const listeners = new Set<Listener>();

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeSound(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let context: AudioContext | null = null;
let available = true;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !available) return null;
  if (context) {
    if (context.state === "suspended") void context.resume();
    return context;
  }
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    available = false;
    return null;
  }
  try {
    context = new Ctor();
  } catch {
    available = false;
    return null;
  }
  return context;
}

type ToneOptions = {
  freq: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  /** Optional second blip, offset in seconds — gives toggles a "clack". */
  second?: { freq: number; at: number; dur?: number };
};

function tone({ freq, dur = 0.05, gain = 0.04, type = "triangle", second }: ToneOptions) {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime;

  const play = (f: number, at: number, d: number, g: number) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, start + at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.62), start + at + d);
    amp.gain.setValueAtTime(0.0001, start + at);
    amp.gain.exponentialRampToValueAtTime(g, start + at + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + at + d);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start + at);
    osc.stop(start + at + d + 0.02);
  };

  play(freq, 0, dur, gain);
  if (second) play(second.freq, second.at, second.dur ?? 0.04, gain * 0.8);
}

let lastSlide = 0;

export const sounds = {
  /** Slider drag: pitch follows the handle position. */
  slide(position: number) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastSlide < 55) return;
    lastSlide = now;
    tone({ freq: 230 + position * 260, dur: 0.028, gain: 0.022, type: "sine" });
  },
  release() {
    tone({ freq: 620, dur: 0.06, gain: 0.03, type: "sine" });
  },
  toggleOn() {
    tone({ freq: 540, dur: 0.045, gain: 0.05, second: { freq: 880, at: 0.045 } });
  },
  toggleOff() {
    tone({ freq: 320, dur: 0.05, gain: 0.045, second: { freq: 190, at: 0.045 } });
  },
  launch() {
    tone({ freq: 300, dur: 0.16, gain: 0.045, type: "sawtooth" });
  },
  node() {
    tone({ freq: 700, dur: 0.09, gain: 0.03, type: "sine", second: { freq: 1046, at: 0.06 } });
  },
  mastery() {
    tone({ freq: 660, dur: 0.12, gain: 0.04, type: "sine", second: { freq: 990, at: 0.1 } });
  },
};
