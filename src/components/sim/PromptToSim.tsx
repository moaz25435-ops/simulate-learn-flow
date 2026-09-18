import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Dices, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { sounds } from "@/lib/haptics";
import { PROMPT_SUGGESTIONS, matchTemplate } from "@/lib/sim/match";
import { cn } from "@/lib/utils";

/** A handful of dots that scatter outwards when a suggestion appears. */
function ParticleBurst({ seed, tone }: { seed: number; tone: "lime" | "violet" }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2 + seed * 0.7;
        const distance = 16 + ((seed * 13 + index * 7) % 18);
        return {
          key: `${seed}-${index}`,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 3 + ((index + seed) % 3),
        };
      }),
    [seed],
  );

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((particle) => (
        <motion.span
          key={particle.key}
          className={cn(
            "absolute top-1/2 left-1/2 rounded-full",
            tone === "lime" ? "bg-lime-neon" : "bg-violet-400",
          )}
          style={{ width: particle.size, height: particle.size }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.9, 0], x: particle.x, y: particle.y, scale: 1 }}
          transition={{ duration: 0.85, ease: "easeOut", times: [0, 0.25, 1] }}
        />
      ))}
    </span>
  );
}

function SuggestionChip({
  text,
  index,
  onPick,
  className,
}: {
  text: string;
  index: number;
  onPick: (text: string) => void;
  className?: string;
}) {
  const tone = index % 2 === 0 ? "lime" : "violet";
  return (
    <motion.button
      type="button"
      onClick={() => onPick(text)}
      className={cn(
        "neu-raise-soft group relative max-w-[19rem] rounded-[1.4rem] border px-4 py-2.5 text-left text-xs leading-snug text-ink/85 transition-colors",
        tone === "lime"
          ? "border-lime-neon/20 hover:border-lime-neon/45"
          : "border-violet-neon/25 hover:border-violet-neon/50",
        className,
      )}
      initial={{ opacity: 0, y: 18, scale: 0.86, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: 0.12 + index * 0.09 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      <ParticleBurst seed={index + 1} tone={tone} />
      <span
        className={cn(
          "mr-2 inline-block size-1.5 -translate-y-px rounded-full align-middle",
          tone === "lime" ? "bg-lime-neon" : "bg-violet-400",
        )}
      />
      {text}
    </motion.button>
  );
}

type Props = {
  onSubmit: (prompt: string) => void;
  className?: string;
  /** Rendered inside the narrow sidebar instead of the wide hero. */
  stacked?: boolean;
  defaultValue?: string;
};

/**
 * Minimalist prompt bar. Suggestions float around the field and enter with a
 * particle burst; a live hint shows which simulation the sentence will build.
 */
export function PromptToSim({ onSubmit, className, stacked = false, defaultValue = "" }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [deal, setDeal] = useState(0);

  const suggestions = useMemo(() => {
    const pool = [...PROMPT_SUGGESTIONS];
    const picked: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const index = (deal * 3 + i * 2) % pool.length;
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }, [deal]);

  const preview = value.trim().length > 2 ? matchTemplate(value) : null;

  const submit = (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    sounds.launch();
    onSubmit(clean);
  };

  const field = (
    <div className="relative">
      <div className="neu-sink rounded-[1.6rem] px-5 py-4">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(value);
            }
          }}
          rows={2}
          placeholder="Describe something you want to feel out — “why does a pendulum's period ignore mass?”"
          className="w-full resize-none bg-transparent font-display text-[15px] leading-relaxed text-ink placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key={preview.template.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-2 text-[11px] text-muted-foreground"
                >
                  <Sparkles className="size-3.5 text-lime-neon" />
                  <span className="truncate">
                    builds{" "}
                    <span className="text-lime-neon/90">{preview.template.name}</span>{" "}
                    <span className="text-muted-foreground/60">
                      · {Math.round(preview.confidence * 100)}% match
                    </span>
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] text-muted-foreground/70"
                >
                  Enter to build · Shift+Enter for a new line
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            type="button"
            onClick={() => submit(value)}
            whileTap={{ scale: 0.94 }}
            className="group flex shrink-0 items-center gap-2 rounded-full border border-lime-neon/40 bg-lime-neon/12 px-4 py-2 text-xs font-medium text-lime-neon shadow-[0_0_28px_-8px_rgba(163,230,53,0.7)] transition-colors hover:bg-lime-neon/20"
          >
            Build sim
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );

  const float = ["-mt-1", "mt-7", "mt-1", "mt-9"];

  const deck = (
    <div className={cn("flex flex-wrap gap-2", stacked && "flex-col")}>
      {suggestions.map((text, index) => (
        <SuggestionChip
          key={`${deal}-${text}`}
          text={text}
          index={index}
          onPick={(picked) => {
            setValue(picked);
            submit(picked);
          }}
          className={stacked ? undefined : float[index % float.length]}
        />
      ))}
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {stacked ? (
        <div className="space-y-4">
          {field}
          <div className="flex items-center justify-between gap-2">
            <span className="hand text-sm text-muted-foreground">try one of these…</span>
            <button
              type="button"
              onClick={() => {
                setDeal((value) => value + 1);
                sounds.node();
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-ink"
            >
              <Dices className="size-3" />
              shuffle
            </button>
          </div>
          {deck}
        </div>
      ) : (
        <div className="relative pb-4 sm:pb-6">
          <div className="relative z-10 mb-4 flex flex-wrap items-end justify-center gap-3">
            {deck}
          </div>
          {field}
        </div>
      )}
    </div>
  );
}
