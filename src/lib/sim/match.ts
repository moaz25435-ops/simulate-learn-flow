import { TEMPLATES, type SimTemplate } from "./templates";

/** Words that carry no signal when matching a prompt to a template. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "of",
  "in",
  "on",
  "for",
  "to",
  "with",
  "how",
  "does",
  "do",
  "what",
  "is",
  "are",
  "me",
  "my",
  "show",
  "simulate",
  "simulation",
  "explain",
  "build",
  "make",
  "me",
  "visual",
  "visualize",
  "between",
  "when",
  "why",
  "that",
  "this",
  "it",
  "as",
  "at",
  "by",
  "or",
]);

export type Match = {
  template: SimTemplate;
  score: number;
  confidence: number;
  hits: string[];
};

/**
 * Score every template against the prompt. Keyword fragments are matched as
 * substrings so "gravitational" still hits the "gravit" keyword; whole-word
 * matches get a bonus. Ties fall back to the plain keyword count.
 */
export function matchTemplate(prompt: string): Match {
  const text = ` ${prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, " ")} `;
  const words = new Set(text.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w)));

  const scored = TEMPLATES.map((template) => {
    const hits: string[] = [];
    let score = 0;
    for (const keyword of template.keywords) {
      if (!text.includes(keyword)) continue;
      hits.push(keyword);
      score += 3;
      if (words.has(keyword)) score += 4;
    }
    // Mild nudge for words that also appear in the template name / family.
    const nameWords = template.name.toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 3 && words.has(word)) score += 1.5;
    }
    return { template, score, hits };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const runnerUp = scored[1]?.score ?? 0;
  const confidence =
    best.score === 0
      ? 0.34
      : Math.min(0.99, 0.5 + best.score / 24 - Math.max(0, runnerUp - best.score) * 0);

  return {
    template: best.template,
    score: best.score,
    confidence,
    hits: best.hits,
  };
}

const TITLE_STOP = /^(simulate|visuali[sz]e|show|explain|explore|build|make|me|a|an|the|how|does|what|is)\b[\s:,-]*/i;

/** Turn a raw prompt into a short notebook entry title. */
export function titleForPrompt(prompt: string, template: SimTemplate): string {
  let clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return template.name;
  // Trim leading command words ("show me how a ...") in a loop.
  let previous = "";
  while (previous !== clean) {
    previous = clean;
    clean = clean.replace(TITLE_STOP, "");
  }
  clean = clean.replace(/[.?!]+$/, "");
  const words = clean.split(" ");
  let title = words.slice(0, 7).join(" ");
  if (words.length > 7) title += "…";
  if (title.length < 3) return template.name;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/** Shared, drifting prompt suggestions on the landing page and in the lab. */
export const PROMPT_SUGGESTIONS = [
  "why does a pendulum's period ignore its mass?",
  "what happens to water ripples when two stones drop",
  "simulate a virus spreading through a town",
  "how do lenses flip an image",
  "what does doubling temperature do to a gas",
  "when does a moon stop orbiting and escape",
  "launch a ball at 45° in thick air",
  "two charges, opposite signs, tracing field lines",
  "compound interest versus logistic growth",
];
