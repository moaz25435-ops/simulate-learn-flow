import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Soft curved container with a subtle inner glow — never a hard rectangle. */
export function NotebookPanel({
  children,
  className,
  tone = "plain",
}: {
  children: ReactNode;
  className?: string;
  tone?: "plain" | "lime" | "violet";
}) {
  return (
    <section
      className={cn(
        "paper-grain neu-raise relative rounded-[2rem] border border-white/[0.06] p-5",
        tone === "lime" && "inner-glow-lime",
        tone === "violet" && "inner-glow-violet",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Handwritten margin annotation, with a small ink dash before it. */
export function MarginNote({
  children,
  tone = "lime",
  className,
}: {
  children: ReactNode;
  tone?: "lime" | "violet" | "ink";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "hand flex items-start gap-2 text-[15px] leading-snug",
        tone === "lime"
          ? "text-lime-neon/90"
          : tone === "violet"
            ? "text-violet-300/90"
            : "text-ink/80",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-[9px] block h-[1.5px] w-4 shrink-0 rounded-full",
          tone === "lime" ? "bg-lime-neon/70" : tone === "violet" ? "bg-violet-neon/80" : "bg-ink/50",
        )}
      />
      <span>{children}</span>
    </p>
  );
}

/** Numbered, ruled section header — reads like a page in a lab notebook. */
export function SectionHeading({
  index,
  title,
  kicker,
  className,
}: {
  index?: string;
  title: string;
  kicker?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center gap-3">
        {index && (
          <span className="tick-label rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">
            {index}
          </span>
        )}
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-white/12 via-white/5 to-transparent" />
      </div>
      {kicker && <p className="mt-1 text-xs text-muted-foreground">{kicker}</p>}
    </div>
  );
}

/** Ruled list: hairline separators between entries, like notebook rows. */
export function RuledList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn("divide-y divide-white/[0.06]", className)}>{children}</ul>
  );
}

/** Tiny label chip used for tags such as concept names. */
export function Tag({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "lime" | "violet" | "ink";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase",
        tone === "lime"
          ? "border-lime-neon/30 bg-lime-neon/[0.08] text-lime-neon/90"
          : tone === "violet"
            ? "border-violet-neon/35 bg-violet-neon/[0.12] text-violet-200"
            : "border-white/10 bg-white/[0.03] text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
