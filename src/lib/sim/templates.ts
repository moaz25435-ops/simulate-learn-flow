/**
 * The simulation library.
 *
 * Every template is a small, self-contained "micro-simulation": a list of
 * variables (sliders), a few toggles and a canvas engine that reacts to them in
 * real time. The prompt bar matches a sentence to the closest template, so the
 * app never needs a network round-trip to feel alive.
 */

export type EngineId =
  | "oscillator"
  | "projectile"
  | "wave"
  | "growth"
  | "gas"
  | "gravity"
  | "optics"
  | "field";

export type Accent = "lime" | "violet";

export type ParamDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  accent?: Accent;
  /** Optional signed display, e.g. charges */
  signed?: boolean;
};

export type ToggleDef = {
  key: string;
  label: string;
  value: boolean;
};

export type SimTemplate = {
  id: string;
  engine: EngineId;
  name: string;
  family: string;
  blurb: string;
  /** Margin note shown next to the canvas — the "aha" to look for. */
  note: string;
  concepts: string[];
  keywords: string[];
  params: ParamDef[];
  toggles: ToggleDef[];
};

export type ParamValues = Record<string, number>;
export type ToggleValues = Record<string, boolean>;

export const TEMPLATES: SimTemplate[] = [
  {
    id: "oscillator",
    engine: "oscillator",
    name: "Damped Oscillator",
    family: "Mechanics",
    blurb:
      "A pendulum you can throw. Watch amplitude bleed away and period cling to length.",
    note: "Drag the bob to give it energy, then pull damping up. Period barely moves — only length changes it.",
    concepts: ["oscillation", "energy", "motion"],
    keywords: [
      "pendulum",
      "swing",
      "oscillat",
      "vibrat",
      "spring",
      "harmonic",
      "period",
      "damping",
      "damp",
      "friction",
      "clock",
      "resonan",
    ],
    params: [
      { key: "gravity", label: "Gravity", min: 0.5, max: 20, step: 0.1, value: 9.8, unit: "m/s²" },
      { key: "length", label: "Rod length", min: 0.3, max: 2.4, step: 0.01, value: 1.2, unit: "m" },
      { key: "damping", label: "Air damping", min: 0, max: 1.2, step: 0.01, value: 0.1, accent: "violet" },
      { key: "startAngle", label: "Release angle", min: 5, max: 170, step: 1, value: 62, unit: "°", accent: "violet" },
    ],
    toggles: [
      { key: "trail", label: "Ghost trail", value: true },
      { key: "forces", label: "Force vectors", value: false },
    ],
  },
  {
    id: "projectile",
    engine: "projectile",
    name: "Projectile Range",
    family: "Mechanics",
    blurb:
      "Launch angles, air drag and gravity — the classic parabola you can feel out.",
    note: "45° maximises range in a vacuum. Add drag and the sweet spot quietly slides below 45°.",
    concepts: ["motion", "gravity", "force"],
    keywords: [
      "projectile",
      "launch",
      "trajector",
      "parabol",
      "cannon",
      "throw",
      "ballis",
      "range",
      "angle",
      "basketball",
      "firing",
      "thrown",
      "rocket",
    ],
    params: [
      { key: "speed", label: "Launch speed", min: 6, max: 60, step: 0.5, value: 27, unit: "m/s" },
      { key: "angle", label: "Launch angle", min: 5, max: 85, step: 1, value: 42, unit: "°" },
      { key: "gravity", label: "Gravity", min: 0.8, max: 25, step: 0.1, value: 9.8, unit: "m/s²" },
      { key: "drag", label: "Air drag", min: 0, max: 0.6, step: 0.005, value: 0.05, accent: "violet" },
    ],
    toggles: [
      { key: "trace", label: "Trace path", value: true },
      { key: "velocity", label: "Velocity vector", value: true },
    ],
  },
  {
    id: "wave",
    engine: "wave",
    name: "Interference Field",
    family: "Waves",
    blurb:
      "Two sources ripple into each other. Fringes, nodes, antinodes — painted live.",
    note: "Where crests meet you get bright antinodes; where one crest meets a trough the field goes quiet.",
    concepts: ["waves", "interference"],
    keywords: [
      "wave",
      "interferen",
      "ripple",
      "double slit",
      "diffract",
      "superpos",
      "fringe",
      "water",
      "acoustic",
      "two source",
      "standing",
      "phase",
      "light pattern",
    ],
    params: [
      { key: "wavelength", label: "Wavelength", min: 10, max: 70, step: 1, value: 30, unit: "px" },
      { key: "separation", label: "Source gap", min: 20, max: 300, step: 2, value: 130, unit: "px" },
      { key: "speed", label: "Wave speed", min: 0.2, max: 3, step: 0.05, value: 1.1, accent: "violet" },
      { key: "contrast", label: "Contrast", min: 0.2, max: 1, step: 0.02, value: 0.78, accent: "violet" },
    ],
    toggles: [
      { key: "sources", label: "Show sources", value: true },
      { key: "single", label: "Mute right source", value: false },
    ],
  },
  {
    id: "growth",
    engine: "growth",
    name: "Growth & Decay",
    family: "Systems",
    blurb:
      "Exponential runaway versus logistic ceiling. Loop, curve, saturate, collapse.",
    note: "Drag rate below zero and the whole population flips into decay. The ceiling only bites late.",
    concepts: ["growth", "population"],
    keywords: [
      "growth",
      "decay",
      "exponential",
      "populat",
      "logistic",
      "compound",
      "interest",
      "epidemic",
      "virus",
      "bacteria",
      "spread",
      "half life",
      "saturat",
      "carrying",
      "compound interest",
    ],
    params: [
      { key: "rate", label: "Growth rate", min: -1, max: 1.4, step: 0.01, value: 0.32, signed: true },
      { key: "capacity", label: "Carrying capacity", min: 5, max: 240, step: 1, value: 90 },
      { key: "start", label: "Starting value", min: 1, max: 40, step: 1, value: 6 },
      { key: "horizon", label: "Time horizon", min: 20, max: 400, step: 5, value: 150, unit: "steps", accent: "violet" },
    ],
    toggles: [
      { key: "logistic", label: "Logistic ceiling", value: true },
      { key: "ghosts", label: "Keep old curves", value: true },
    ],
  },
  {
    id: "gas",
    engine: "gas",
    name: "Kinetic Gas",
    family: "Systems",
    blurb:
      "Hundreds of molecules, one temperature knob. Pressure emerges before your eyes.",
    note: "Temperature is just average kinetic energy. Double it and the histogram smears wider.",
    concepts: ["thermo", "fluids", "motion"],
    keywords: [
      "gas",
      "molecul",
      "particle",
      "kinetic",
      "temperature",
      "heat",
      "thermo",
      "pressure",
      "brownian",
      "diffus",
      "entropy",
      "fluid",
      "ideal gas",
    ],
    params: [
      { key: "temperature", label: "Temperature", min: 0.1, max: 3, step: 0.02, value: 1 },
      { key: "count", label: "Particle count", min: 20, max: 300, step: 2, value: 110 },
      { key: "gravity", label: "Downward pull", min: 0, max: 2, step: 0.02, value: 0.2, accent: "violet" },
      { key: "size", label: "Particle size", min: 1, max: 6, step: 0.1, value: 2.4, accent: "violet" },
    ],
    toggles: [
      { key: "trails", label: "Motion trails", value: true },
      { key: "histogram", label: "Speed histogram", value: true },
    ],
  },
  {
    id: "gravity",
    engine: "gravity",
    name: "Orbital Gravity",
    family: "Mechanics",
    blurb:
      "Drop bodies into a gravity well and find the speed that keeps them circling.",
    note: "Too slow and it spirals in. Too fast and it escapes forever. The edge between is an orbit.",
    concepts: ["gravity", "energy", "motion"],
    keywords: [
      "orbit",
      "gravit",
      "planet",
      "satellit",
      "solar",
      "black hole",
      "well",
      "kepler",
      "moon",
      "escape velocity",
      "space",
      "weight",
      "free fall",
    ],
    params: [
      { key: "mass", label: "Central mass", min: 0.2, max: 4, step: 0.05, value: 1.2, unit: "M" },
      { key: "distance", label: "Orbit radius", min: 50, max: 340, step: 2, value: 180, unit: "px" },
      { key: "speed", label: "Speed multiplier", min: 0.2, max: 2.2, step: 0.02, value: 1, accent: "violet" },
      { key: "bodies", label: "Bodies", min: 1, max: 5, step: 1, value: 2, accent: "violet" },
    ],
    toggles: [
      { key: "trails", label: "Orbit trails", value: true },
      { key: "vectors", label: "Gravity vectors", value: false },
    ],
  },
  {
    id: "optics",
    engine: "optics",
    name: "Lens Refraction",
    family: "Waves",
    blurb:
      "A thin lens bending light. Slide the object and watch the image flip and grow.",
    note: "Inside the focal point the rays stop converging — your image turns virtual and upright.",
    concepts: ["optics", "light", "waves"],
    keywords: [
      "lens",
      "optic",
      "refract",
      "focal",
      "mirror",
      "camera",
      "telescope",
      "magnif",
      "eyeglass",
      "ray diagram",
      "focus",
      "light",
      "photon",
      "prism",
    ],
    params: [
      { key: "focal", label: "Focal length", min: 40, max: 240, step: 2, value: 130, unit: "px" },
      { key: "objectDistance", label: "Object distance", min: 30, max: 460, step: 2, value: 330, unit: "px" },
      { key: "objectHeight", label: "Object height", min: 20, max: 130, step: 2, value: 70, unit: "px", accent: "violet" },
      { key: "aperture", label: "Beam spread", min: 4, max: 40, step: 1, value: 16, accent: "violet" },
    ],
    toggles: [
      { key: "principal", label: "Principal rays", value: true },
      { key: "fan", label: "Ray fan", value: true },
    ],
  },
  {
    id: "field",
    engine: "field",
    name: "Electric Field Lab",
    family: "Fields",
    blurb:
      "Two charges, one field. Drag them around and trace the lines of force.",
    note: "Lines always leave the positive charge and land on the negative one — never crossing, never looping.",
    concepts: ["electric", "force"],
    keywords: [
      "electric",
      "charge",
      "field",
      "magnet",
      "coulomb",
      "electro",
      "voltage",
      "capacitor",
      "flux",
      "dipole",
      "force field",
      "circuit",
    ],
    params: [
      { key: "chargeA", label: "Charge A", min: -6, max: 6, step: 0.1, value: 4, signed: true },
      { key: "chargeB", label: "Charge B", min: -6, max: 6, step: 0.1, value: -3, signed: true, accent: "violet" },
      { key: "gap", label: "Separation", min: 60, max: 340, step: 2, value: 190, unit: "px" },
      { key: "density", label: "Line density", min: 6, max: 26, step: 1, value: 14, accent: "violet" },
    ],
    toggles: [
      { key: "lines", label: "Field lines", value: true },
      { key: "potential", label: "Equipotentials", value: false },
    ],
  },
];

export const TEMPLATE_BY_ID: Record<string, SimTemplate> = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, template]),
);

export function defaultParams(template: SimTemplate): ParamValues {
  return Object.fromEntries(template.params.map((p) => [p.key, p.value]));
}

export function defaultToggles(template: SimTemplate): ToggleValues {
  return Object.fromEntries(template.toggles.map((t) => [t.key, t.value]));
}

/** Params + toggles kept only if they still exist on the template. */
export function sanitizeParams(
  template: SimTemplate,
  incoming: Record<string, number> | undefined,
): ParamValues {
  const base = defaultParams(template);
  if (!incoming) return base;
  for (const param of template.params) {
    const raw = incoming[param.key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      base[param.key] = Math.min(param.max, Math.max(param.min, raw));
    }
  }
  return base;
}

export function sanitizeToggles(
  template: SimTemplate,
  incoming: Record<string, boolean> | undefined,
): ToggleValues {
  const base = defaultToggles(template);
  if (!incoming) return base;
  for (const toggle of template.toggles) {
    if (typeof incoming[toggle.key] === "boolean") {
      base[toggle.key] = incoming[toggle.key] as boolean;
    }
  }
  return base;
}
