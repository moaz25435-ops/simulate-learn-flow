import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Hand,
  MousePointerClick,
  Sparkles,
  TreePine,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";

import { ConceptTree } from "@/components/sim/ConceptTree";
import { SimCanvas } from "@/components/sim/SimCanvas";
import { MarginNote, NotebookPanel, SectionHeading, Tag } from "@/components/NotebookKit";
import { Button } from "@/components/ui/button";
import type { MasteryMap } from "@/lib/concepts";
import { PROMPT_SUGGESTIONS } from "@/lib/sim/match";
import { TEMPLATE_BY_ID, defaultParams, defaultToggles } from "@/lib/sim/templates";

const SAMPLE_MASTERY: MasteryMap = {
  curiosity: 1,
  motion: 0.82,
  gravity: 0.34,
  energy: 0.58,
  oscillation: 0.96,
  force: 0.4,
  electric: 0.12,
  waves: 0.72,
  interference: 0.93,
  optics: 0.28,
  light: 0.14,
  growth: 0.61,
  population: 0.24,
  thermo: 0.18,
  fluids: 0.06,
};

const STEPS = [
  {
    icon: <Sparkles className="size-4" />,
    title: "Ask in plain language",
    body: "Type a question the way you'd say it out loud. Suggestions float in and drift around the field.",
    note: "no menus, no lesson list",
  },
  {
    icon: <MousePointerClick className="size-4" />,
    title: "Poke the field",
    body: "Every sim is a set of variables you can drag, flip and throw — the picture answers back on the next frame.",
    note: "haptics on every flip",
  },
  {
    icon: <TreePine className="size-4" />,
    title: "Grow the concept tree",
    body: "Experiments feed an organic map of ideas. Branches start dim and glow as the ideas actually stick.",
    note: "your progress, filed as notes",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const wave = TEMPLATE_BY_ID.wave;
  const waveParams = useMemo(() => defaultParams(wave), [wave]);
  const waveToggles = useMemo(() => defaultToggles(wave), [wave]);

  const openLab = (prompt?: string) => {
    navigate(prompt ? `/dashboard?prompt=${encodeURIComponent(prompt)}` : "/dashboard");
  };

  return (
    <div className="notebook-page paper-grain relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_60%_at_15%_-10%,rgba(139,92,246,0.2),transparent_60%),radial-gradient(90%_50%_at_100%_0%,rgba(163,230,53,0.09),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* ------------------------------------------------------------- nav */}
        <header className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-between gap-4 border-b border-white/[0.07] bg-[#121824]/85 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="neu-raise flex size-9 items-center justify-center rounded-2xl border border-lime-neon/25">
              <FlaskConical className="size-4 text-lime-neon" />
            </span>
            <span className="font-display text-base tracking-tight text-ink">Marginalia</span>
          </div>
          <nav className="hidden items-center gap-6 text-xs text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#prompts" className="transition-colors hover:text-ink">
              Prompts
            </a>
            <a href="#map" className="transition-colors hover:text-ink">
              Concept map
            </a>
          </nav>
          <Button
            type="button"
            onClick={() => openLab()}
            className="rounded-full bg-lime-neon text-[#131a08] shadow-[0_0_30px_-8px_rgba(163,230,53,0.85)] hover:bg-lime-300"
          >
            Open the lab
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </header>

        {/* ------------------------------------------------------------ hero */}
        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="hand text-base text-violet-300">
                entry 001 — a lab notebook for curious minds
              </span>
            </div>
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink balancing sm:text-5xl lg:text-[3.4rem]">
              Describe it once. Then{" "}
              <span className="text-lime-neon text-glow-lime">push it, break it</span> and
              feel how it works.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Marginalia turns a sentence into a live micro-simulation — sliders you can throw,
              fields that ripple back at you, and an organic concept tree that lights up as the
              ideas stick. Not a course. A sandbox with a notebook attached.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => openLab("two stones dropped in water")}
                className="rounded-full bg-lime-neon text-[#131a08] shadow-[0_0_40px_-10px_rgba(163,230,53,0.9)] hover:bg-lime-300"
              >
                Start with a prompt
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => openLab()}
                className="rounded-full border-white/12 bg-white/[0.03] text-ink hover:border-violet-neon/50 hover:bg-violet-neon/10"
              >
                <BookOpen className="mr-2 size-4 text-violet-300" />
                Open my notebook
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <Tag tone="lime">8 live engines</Tag>
              <Tag tone="violet">sliders + toggles</Tag>
              <Tag>drag physics</Tag>
              <Tag>haptic feedback</Tag>
            </div>

            <div className="mt-8 pl-7">
              <MarginNote tone="ink">
                Ask once, then wander. Nothing here is graded — the tree just glows where you
                lingered.
              </MarginNote>
            </div>
          </div>

          {/* live preview */}
          <NotebookPanel tone="violet" className="relative p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="tick-label text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                live · interference field
              </span>
              <span className="hand -rotate-2 text-base text-lime-neon">
                this one is running right now
              </span>
            </div>

            <div className="neu-sink mb-3 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] text-ink/90">
                <Sparkles className="size-3.5 shrink-0 text-lime-neon" />
                <span className="truncate font-display">
                  two stones dropped in water
                </span>
                <motion.span
                  className="ml-0.5 inline-block h-4 w-[2px] bg-lime-neon"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  matched <span className="text-lime-neon/90">Interference Field</span> · 94%
                </span>
                <span className="rounded-full border border-lime-neon/40 bg-lime-neon/10 px-2 py-0.5 text-[10px] text-lime-neon">
                  build sim
                </span>
              </div>
            </div>

            <SimCanvas
              engineId="wave"
              params={waveParams}
              toggles={waveToggles}
              interactive={false}
              className="h-[240px] sm:h-[300px]"
            />

            <div className="mt-4 pl-6">
              <MarginNote tone="lime">
                drag the source gap wider and the bright fringes squeeze together.
              </MarginNote>
            </div>
          </NotebookPanel>
        </section>

        {/* ------------------------------------------------------ how it works */}
        <section id="how" className="scroll-mt-24 py-12">
          <SectionHeading
            index="02"
            title="How the lab works"
            kicker="Three moves, repeated until you're the one explaining it."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <NotebookPanel className="h-full">
                  <div className="flex items-center justify-between">
                    <span className="neu-raise-soft flex size-9 items-center justify-center rounded-xl border border-white/10 text-lime-neon">
                      {step.icon}
                    </span>
                    <span className="font-display text-3xl text-white/8">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-lg text-ink">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <MarginNote tone={index === 1 ? "violet" : "lime"}>{step.note}</MarginNote>
                  </div>
                </NotebookPanel>
              </motion.div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- prompts */}
        <section id="prompts" className="scroll-mt-24 py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <SectionHeading
                index="03"
                title="Start from a question"
                kicker="Tap any line — it opens straight into the sandbox."
              />
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Every prompt is matched to one of eight simulation engines instantly, then you take
                over: change gravity, add drag, mute a source, and watch the field answer.
              </p>
              <div className="mt-5 pl-7">
                <MarginNote tone="violet">
                  nothing to install, nothing to configure — the sim is generated the moment you hit
                  enter.
                </MarginNote>
              </div>
            </div>

            <NotebookPanel className="p-0">
              <ul className="divide-y divide-white/[0.06]">
                {PROMPT_SUGGESTIONS.slice(0, 7).map((text, index) => (
                  <li key={text}>
                    <button
                      type="button"
                      onClick={() => openLab(text)}
                      className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="tick-label w-6 shrink-0 text-[10px] text-muted-foreground/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-ink/90 group-hover:text-lime-neon">
                        {text}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-lime-neon" />
                    </button>
                  </li>
                ))}
              </ul>
            </NotebookPanel>
          </div>
        </section>

        {/* ------------------------------------------------------ concept map */}
        <section id="map" className="scroll-mt-24 py-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading
                index="04"
                title="A tree that grows with you"
                kicker="Ideas branch, connect, and start to glow."
              />
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Mechanics, waves, systems and fields fan out from one root. Each node carries a
                ring that fills as you experiment, and every branch keeps a margin note about why it
                matters.
              </p>
              <ul className="mt-5 space-y-3">
                {[
                  "Rings fill with every slider you drag — no quizzes, no streaks.",
                  "Nodes glow once a topic is genuinely yours.",
                  "Your whole notebook is saved, so yesterday's curiosity carries over.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-neon shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <NotebookPanel tone="lime" className="p-4 sm:p-5">
              <ConceptTree mastery={SAMPLE_MASTERY} showLegend showAnnotation />
            </NotebookPanel>
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="py-14">
          <NotebookPanel
            tone="lime"
            className="relative overflow-hidden px-6 py-10 text-center sm:px-12"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,rgba(139,92,246,0.22),transparent_65%)]" />
            <div className="relative">
              <span className="hand inline-flex items-center gap-2 text-base text-lime-neon">
                <Hand className="size-4" />
                your next question is worth playing with
              </span>
              <h2 className="font-display mx-auto mt-4 max-w-2xl text-3xl leading-tight tracking-tight text-ink balancing sm:text-4xl">
                Open a blank page and give it something to simulate.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Sign in with an email code or as a guest — your experiments, sliders and glowing
                branches stay filed in your notebook.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={() => openLab()}
                className="mt-7 rounded-full bg-lime-neon text-[#131a08] shadow-[0_0_45px_-10px_rgba(163,230,53,0.95)] hover:bg-lime-300"
              >
                Open the lab
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </NotebookPanel>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] py-8 text-[11px] text-muted-foreground">
          <span className="hand text-sm">Marginalia — notes in the margin of everything you learn.</span>
          <span className="flex items-center gap-4">
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#map" className="transition-colors hover:text-ink">
              Concept map
            </a>
            <button type="button" onClick={() => openLab()} className="transition-colors hover:text-ink">
              Sign in
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
