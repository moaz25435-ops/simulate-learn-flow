/**
 * The interactive concept tree.
 *
 * Nodes are laid out with a radial "branch" algorithm so the map reads as an
 * organic growth chart instead of a rigid grid: every node fans out from its
 * parent, then the whole tree is normalised into a square viewport.
 */

export type BranchId = "mechanics" | "waves" | "systems" | "fields" | "root";

export type ConceptNode = {
  id: string;
  label: string;
  parent: string | null;
  branch: BranchId;
  /** Direction the node sits from its parent, in maths degrees (90 = straight up). */
  angle: number;
  /** One-line annotation, revealed on hover / selection. */
  hint: string;
};

export const BRANCHES: Record<
  BranchId,
  { label: string; color: string; glow: string }
> = {
  root: { label: "Curiosity", color: "#E9EEF7", glow: "rgba(233,238,247,0.55)" },
  mechanics: { label: "Mechanics", color: "#A3E635", glow: "rgba(163,230,53,0.55)" },
  systems: { label: "Systems", color: "#D9F99D", glow: "rgba(217,249,157,0.5)" },
  waves: { label: "Waves & Light", color: "#8B5CF6", glow: "rgba(139,92,246,0.6)" },
  fields: { label: "Fields", color: "#C4B5FD", glow: "rgba(196,181,253,0.5)" },
};

export const CONCEPTS: ConceptNode[] = [
  {
    id: "curiosity",
    label: "Curiosity",
    parent: null,
    branch: "root",
    angle: 90,
    hint: "Every branch starts as a question you can't stop poking at.",
  },
  {
    id: "motion",
    label: "Motion",
    parent: "curiosity",
    branch: "mechanics",
    angle: 148,
    hint: "Position, velocity, acceleration — the vocabulary of everything that moves.",
  },
  {
    id: "gravity",
    label: "Gravity",
    parent: "motion",
    branch: "mechanics",
    angle: 175,
    hint: "A long-range pull that never switches off. Curves straight lines into arcs.",
  },
  {
    id: "energy",
    label: "Energy",
    parent: "motion",
    branch: "mechanics",
    angle: 156,
    hint: "Movement turns into heat and back. The ledger always balances.",
  },
  {
    id: "oscillation",
    label: "Oscillation",
    parent: "motion",
    branch: "mechanics",
    angle: 137,
    hint: "Restoring forces always overshoot. That overshoot is a rhythm.",
  },
  {
    id: "force",
    label: "Forces",
    parent: "motion",
    branch: "mechanics",
    angle: 118,
    hint: "Push, pull, drag. Change the net force and you change the story.",
  },
  {
    id: "electric",
    label: "Electric Field",
    parent: "force",
    branch: "fields",
    angle: 132,
    hint: "Charges don't touch; they act through the space between them.",
  },
  {
    id: "waves",
    label: "Waves",
    parent: "curiosity",
    branch: "waves",
    angle: 90,
    hint: "Energy travelling without carrying the medium along for the ride.",
  },
  {
    id: "interference",
    label: "Interference",
    parent: "waves",
    branch: "waves",
    angle: 105,
    hint: "Waves add up. Sometimes to double, sometimes to silence.",
  },
  {
    id: "optics",
    label: "Optics",
    parent: "waves",
    branch: "waves",
    angle: 74,
    hint: "Bending light with shaped glass — geometry doing the work.",
  },
  {
    id: "light",
    label: "Light",
    parent: "optics",
    branch: "waves",
    angle: 90,
    hint: "An image is just rays that agree on where they should meet.",
  },
  {
    id: "growth",
    label: "Growth & Decay",
    parent: "curiosity",
    branch: "systems",
    angle: 34,
    hint: "Rates multiply themselves. That is why curves feel like ambushes.",
  },
  {
    id: "population",
    label: "Population",
    parent: "growth",
    branch: "systems",
    angle: 52,
    hint: "Resource limits are what turn a runaway curve into an S.",
  },
  {
    id: "thermo",
    label: "Heat",
    parent: "growth",
    branch: "systems",
    angle: 24,
    hint: "Temperature is average molecular kinetic energy — nothing more exotic.",
  },
  {
    id: "fluids",
    label: "Fluids",
    parent: "thermo",
    branch: "systems",
    angle: -2,
    hint: "Billions of near-random collisions add up to smooth, predictable pressure.",
  },
];

export const ROOT_ID = "curiosity";
export const MASTERED_AT = 0.9;

export type Point = { x: number; y: number };
export type ConceptLayout = {
  positions: Record<string, Point>;
  /** Depth used for node sizing. */
  depths: Record<string, number>;
};

const RADIUS = 20;
const DEPTH_STEP = 19;
const ORIGIN: Point = { x: 50, y: 88 };
const PAD = 8;

let cachedLayout: ConceptLayout | null = null;

/** Radial branch layout, normalised into a 0–100 square with padding. */
export function conceptLayout(): ConceptLayout {
  if (cachedLayout) return cachedLayout;

  const byParent = new Map<string, ConceptNode[]>();
  for (const node of CONCEPTS) {
    if (!node.parent) continue;
    const list = byParent.get(node.parent) ?? [];
    list.push(node);
    byParent.set(node.parent, list);
  }

  const raw: Record<string, Point> = {};
  const depths: Record<string, number> = {};

  const walk = (node: ConceptNode, depth: number) => {
    depths[node.id] = depth;
    const radius = RADIUS + depth * DEPTH_STEP;
    const rad = (node.angle * Math.PI) / 180;
    raw[node.id] = {
      x: ORIGIN.x + Math.cos(rad) * radius,
      y: ORIGIN.y - Math.sin(rad) * radius,
    };
    for (const child of byParent.get(node.id) ?? []) walk(child, depth + 1);
  };

  const root = CONCEPTS.find((node) => node.parent === null)!;
  walk(root, 0);

  const xs = Object.values(raw).map((p) => p.x);
  const ys = Object.values(raw).map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const usable = 100 - PAD * 2;

  const positions: Record<string, Point> = {};
  for (const [id, point] of Object.entries(raw)) {
    positions[id] = {
      x: PAD + ((point.x - minX) / spanX) * usable,
      y: PAD + ((point.y - minY) / spanY) * usable,
    };
  }

  cachedLayout = { positions, depths };
  return cachedLayout;
}

export type ConceptEdge = {
  id: string;
  from: Point;
  to: Point;
  /** Quadratic control point, bent so branches look hand-grown. */
  control: Point;
  fromId: string;
  toId: string;
};

export function conceptEdges(): ConceptEdge[] {
  const { positions } = conceptLayout();
  const edges: ConceptEdge[] = [];
  for (const node of CONCEPTS) {
    if (!node.parent) continue;
    const from = positions[node.parent];
    const to = positions[node.id];
    if (!from || !to) continue;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    // Bend perpendicular to the branch for an organic, hand-drawn arc.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = 4.5;
    edges.push({
      id: `${node.parent}->${node.id}`,
      from,
      to,
      control: { x: midX + (-dy / len) * bend, y: midY + (dx / len) * bend },
      fromId: node.parent,
      toId: node.id,
    });
  }
  return edges;
}

export type MasteryMap = Record<string, number>;

export function clampLevel(level: number): number {
  return Math.max(0, Math.min(1, level));
}

/** Fraction of all nodes that have reached mastery. */
export function treeProgress(mastery: MasteryMap): number {
  const total = CONCEPTS.length;
  if (!total) return 0;
  const reached = CONCEPTS.filter((node) => (mastery[node.id] ?? 0) >= MASTERED_AT).length;
  return reached / total;
}

/** Per-branch average mastery, used by the legend. */
export function branchProgress(mastery: MasteryMap): { branch: BranchId; value: number }[] {
  const order: BranchId[] = ["mechanics", "waves", "systems", "fields"];
  return order.map((branch) => {
    const nodes = CONCEPTS.filter((node) => node.branch === branch);
    const value =
      nodes.reduce((sum, node) => sum + clampLevel(mastery[node.id] ?? 0), 0) /
      Math.max(1, nodes.length);
    return { branch, value };
  });
}
