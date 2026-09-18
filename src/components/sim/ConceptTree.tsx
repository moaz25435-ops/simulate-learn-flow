import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import {
  BRANCHES,
  CONCEPTS,
  MASTERED_AT,
  type MasteryMap,
  branchProgress,
  clampLevel,
  conceptEdges,
  conceptLayout,
} from "@/lib/concepts";
import { sounds } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Props = {
  mastery: MasteryMap;
  selected?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  showLegend?: boolean;
  showAnnotation?: boolean;
};

const RADIUS: Record<number, number> = { 0: 4.6, 1: 3.3, 2: 2.9, 3: 2.6 };

/**
 * The concept map: an organic, radial branch structure drawn as SVG with
 * HTML labels on top. Nodes glow and grow a progress ring as their topic gets
 * experimented with.
 */
export function ConceptTree({
  mastery,
  selected,
  onSelect,
  className,
  showLegend = true,
  showAnnotation = true,
}: Props) {
  const { positions, depths } = useMemo(() => conceptLayout(), []);
  const edges = useMemo(() => conceptEdges(), []);
  const [hovered, setHovered] = useState<string | null>(null);

  const activeId = selected ?? hovered;
  const activeNode = CONCEPTS.find((node) => node.id === activeId) ?? null;
  const progress = useMemo(() => branchProgress(mastery), [mastery]);
  const masteredCount = CONCEPTS.filter((node) => (mastery[node.id] ?? 0) >= MASTERED_AT).length;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative aspect-square w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            {(["mechanics", "waves", "systems", "fields", "root"] as const).map((branch) => (
              <radialGradient key={branch} id={`glow-${branch}`}>
                <stop offset="0%" stopColor={BRANCHES[branch].glow} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            ))}
          </defs>

          {edges.map((edge, index) => {
            const level = clampLevel(mastery[edge.toId] ?? 0);
            const color = BRANCHES[CONCEPTS.find((n) => n.id === edge.toId)?.branch ?? "root"];
            return (
              <motion.path
                key={edge.id}
                d={`M ${edge.from.x} ${edge.from.y} Q ${edge.control.x} ${edge.control.y} ${edge.to.x} ${edge.to.y}`}
                fill="none"
                stroke={color.color}
                strokeWidth={level >= MASTERED_AT ? 0.9 : 0.45}
                strokeLinecap="round"
                style={{ opacity: 0.16 + level * 0.66 }}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: 0.1 + index * 0.07, ease: "easeOut" }}
              />
            );
          })}

          {CONCEPTS.map((node) => {
            const point = positions[node.id];
            const level = clampLevel(mastery[node.id] ?? 0);
            const radius = RADIUS[depths[node.id] ?? 2];
            const branch = BRANCHES[node.branch];
            const mastered = level >= MASTERED_AT;
            const isActive = activeId === node.id;
            const circumference = 2 * Math.PI * (radius + 1.5);
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.label} — ${Math.round(level * 100)}% mastered`}
                style={{ cursor: "pointer", outline: "none" }}
                onClick={() => {
                  onSelect?.(node.id);
                  sounds.node();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect?.(node.id);
                    sounds.node();
                  }
                }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered((current) => (current === node.id ? null : current))}
              >
                <circle cx={point.x} cy={point.y} r={radius * 3.6} fill={`url(#glow-${node.branch})`} />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 1.5}
                  fill="none"
                  stroke="rgba(233,238,247,0.09)"
                  strokeWidth={0.7}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 1.5}
                  fill="none"
                  stroke={branch.color}
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeDasharray={`${level * circumference} ${circumference}`}
                  transform={`rotate(-90 ${point.x} ${point.y})`}
                  style={{ filter: `drop-shadow(0 0 2px ${branch.glow})` }}
                />
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={branch.color}
                  initial={false}
                  animate={{
                    opacity: mastered ? [0.75, 1, 0.75] : 0.28 + level * 0.62,
                    scale: isActive ? 1.14 : 1,
                  }}
                  transition={
                    mastered
                      ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                      : { type: "spring", stiffness: 300, damping: 22 }
                  }
                  style={{ filter: `drop-shadow(0 0 ${level >= MASTERED_AT ? 3 : 1.4}px ${branch.glow})` }}
                />
                {isActive && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={radius + 4}
                    fill="none"
                    stroke="rgba(233,238,247,0.35)"
                    strokeWidth={0.4}
                    strokeDasharray="1.4 1.8"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {CONCEPTS.map((node) => {
          const point = positions[node.id];
          const level = clampLevel(mastery[node.id] ?? 0);
          const radius = RADIUS[depths[node.id] ?? 2];
          const branch = BRANCHES[node.branch];
          const isActive = activeId === node.id;
          const isRoot = node.parent === null;
          return (
            <button
              key={`label-${node.id}`}
              type="button"
              onClick={() => {
                onSelect?.(node.id);
                sounds.node();
              }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered((current) => (current === node.id ? null : current))}
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] tracking-wide transition-colors",
                isActive ? "text-ink" : "text-muted-foreground hover:text-ink/90",
                isRoot && "-translate-y-full text-[11px] tracking-[0.18em] uppercase",
              )}
              style={{
                left: `${point.x}%`,
                top: `${isRoot ? point.y - radius - 2.2 : point.y + radius + 2.6}%`,
                color: isActive ? branch.color : undefined,
              }}
            >
              {node.label}
              {level >= MASTERED_AT && <span className="ml-1 text-lime-neon">✓</span>}
            </button>
          );
        })}
      </div>

      {showLegend && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {progress.map(({ branch, value }) => (
            <div key={branch} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: BRANCHES[branch].color, boxShadow: `0 0 8px ${BRANCHES[branch].glow}` }}
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {BRANCHES[branch].label}
              </span>
              <span className="tick-label text-[10px] text-muted-foreground/80">
                {Math.round(value * 100)}%
              </span>
            </div>
          ))}
          <p className="hand col-span-2 text-sm text-muted-foreground">
            {masteredCount}/{CONCEPTS.length} nodes mastered — experiment to make them glow.
          </p>
        </div>
      )}

      {showAnnotation && (
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          {activeNode ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: BRANCHES[activeNode.branch].color }}
                >
                  {activeNode.label}
                </span>
                <span className="tick-label text-[10px] text-muted-foreground">
                  {Math.round(clampLevel(mastery[activeNode.id] ?? 0) * 100)}% mastered
                </span>
              </div>
              <p className="hand mt-1 text-[15px] leading-snug text-ink/85">{activeNode.hint}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${clampLevel(mastery[activeNode.id] ?? 0) * 100}%`,
                    background: BRANCHES[activeNode.branch].color,
                    boxShadow: `0 0 10px ${BRANCHES[activeNode.branch].glow}`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="hand text-[15px] leading-snug text-muted-foreground">
              Tap any node to read the margin note — the brighter the ring, the deeper you've gone.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
