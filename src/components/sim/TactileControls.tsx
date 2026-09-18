import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

import { sounds } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function decimalsFor(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  accent?: "lime" | "violet";
  signed?: boolean;
  onChange: (value: number) => void;
};

/**
 * A physical-feeling slider: chunky inset track, oversized neumorphic handle,
 * synthesized ticks while dragging and a spring when released.
 */
export function NeoSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  accent = "lime",
  signed = false,
  onChange,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const ratio = clamp((value - min) / (max - min || 1), 0, 1);
  const digits = decimalsFor(step);
  const decimals = Math.abs(value) >= 100 ? Math.min(digits, 1) : digits;

  const commit = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = clamp((clientX - rect.left) / rect.width, 0, 1);
      const snapped = clamp(Math.round((min + t * (max - min)) / step) * step, min, max);
      const rounded = Number(snapped.toFixed(4));
      if (rounded !== value) {
        onChange(rounded);
        sounds.slide(t);
      }
    },
    [max, min, onChange, step, value],
  );

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    commit(event.clientX);
  };

  const isLime = accent === "lime";
  const display = `${signed && value > 0 ? "+" : ""}${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="group/slider">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </span>
        <motion.span
          animate={{ scale: dragging ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className={cn(
            "tick-label rounded-full border px-2 py-0.5 text-[11px]",
            isLime
              ? "border-lime-neon/35 bg-lime-neon/10 text-lime-neon"
              : "border-violet-neon/40 bg-violet-neon/15 text-violet-200",
          )}
        >
          {display}
        </motion.span>
      </div>

      <div
        className="neu-sink relative h-9 cursor-pointer rounded-full px-3 py-3"
        onPointerDown={begin}
        onPointerMove={(event) => {
          if (dragging) commit(event.clientX);
        }}
        onPointerUp={(event) => {
          if (!dragging) return;
          setDragging(false);
          commit(event.clientX);
          sounds.release();
        }}
        onPointerCancel={() => setDragging(false)}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onKeyDown={(event) => {
          const direction =
            event.key === "ArrowRight" || event.key === "ArrowUp"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? -1
                : 0;
          if (!direction) return;
          event.preventDefault();
          const next = clamp(Number((value + direction * step).toFixed(4)), min, max);
          onChange(next);
          sounds.slide((next - min) / (max - min || 1));
        }}
      >
        <div ref={trackRef} className="relative flex h-3 items-center">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0C1119] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-75",
                isLime
                  ? "bg-gradient-to-r from-lime-neon/50 to-lime-neon"
                  : "bg-gradient-to-r from-violet-neon/60 to-violet-400",
              )}
              style={{
                width: `${ratio * 100}%`,
                boxShadow: isLime
                  ? "0 0 14px rgba(163,230,53,0.55)"
                  : "0 0 14px rgba(139,92,246,0.6)",
              }}
            />
          </div>
          <motion.div
            className={cn(
              "absolute -top-[13px] size-7 rounded-full border",
              isLime ? "border-lime-neon/50" : "border-violet-neon/60",
            )}
            style={{
              left: `calc(${ratio * 100}% - 14px)`,
              background:
                "radial-gradient(circle at 32% 28%, #F5F9FF 0%, #C9D4E4 28%, #5A6a83 70%, #2A3446 100%)",
              boxShadow: dragging
                ? `0 0 0 6px ${isLime ? "rgba(163,230,53,0.14)" : "rgba(139,92,246,0.18)"}, 0 8px 18px -6px rgba(0,0,0,0.9)`
                : "0 6px 14px -6px rgba(0,0,0,0.85)",
            }}
            animate={{ scale: dragging ? 1.16 : 1 }}
            transition={{ type: "spring", stiffness: 460, damping: 24 }}
          >
            <span
              className={cn(
                "absolute inset-[7px] rounded-full",
                isLime ? "bg-lime-neon/80" : "bg-violet-neon/85",
              )}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  note?: string;
};

/** Toggle with a springy thumb and a one-shot ripple on flip. */
export function TactileSwitch({ label, checked, onChange, note }: SwitchProps) {
  const [ripple, setRipple] = useState(0);

  const flip = () => {
    const next = !checked;
    setRipple((value) => value + 1);
    if (next) sounds.toggleOn();
    else sounds.toggleOff();
    onChange(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={flip}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors",
        checked
          ? "border-lime-neon/30 bg-lime-neon/[0.06]"
          : "border-white/[0.06] bg-white/[0.015] hover:border-white/15",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-ink">{label}</span>
        {note && <span className="mt-0.5 block text-[11px] text-muted-foreground">{note}</span>}
      </span>
      <span
        className={cn(
          "relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked
            ? "bg-lime-neon/25 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.5),inset_0_0_18px_-4px_rgba(163,230,53,0.7)]"
            : "bg-[#0C1119] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.05)]",
        )}
      >
        <motion.span
          key={`thumb-${checked}`}
          className={cn(
            "absolute left-0.5 size-6 rounded-full",
            checked
              ? "bg-gradient-to-b from-lime-200 to-lime-neon shadow-[0_0_12px_rgba(163,230,53,0.7)]"
              : "bg-gradient-to-b from-[#64748B] to-[#334155] shadow-[0_3px_8px_-2px_rgba(0,0,0,0.9)]",
          )}
          initial={{ x: checked ? 0 : 20, scale: checked ? 0.85 : 0.9 }}
          animate={{ x: checked ? 20 : 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 560, damping: 26, mass: 0.7 }}
        />
        {ripple > 0 && (
          <motion.span
            key={`ripple-${ripple}`}
            className={cn(
              "pointer-events-none absolute inset-0 rounded-full",
              checked ? "bg-lime-neon/40" : "bg-violet-neon/40",
            )}
            initial={{ opacity: 0.55, scale: 1 }}
            animate={{ opacity: 0, scale: 1.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </span>
    </button>
  );
}

/** Small monospaced data pill used for live values. */
export function DataChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "lime" | "violet";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        accent === "lime"
          ? "border-lime-neon/25 bg-lime-neon/[0.07]"
          : accent === "violet"
            ? "border-violet-neon/30 bg-violet-neon/[0.1]"
            : "border-white/[0.07] bg-white/[0.02]",
      )}
    >
      <div className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{label}</div>
      <div
        className={cn(
          "tick-label mt-1 text-sm",
          accent === "lime"
            ? "text-lime-neon"
            : accent === "violet"
              ? "text-violet-200"
              : "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}
