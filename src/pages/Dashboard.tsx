import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  BookMarked,
  FlaskConical,
  Library,
  LogOut,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { ConceptTree } from "@/components/sim/ConceptTree";
import { PromptToSim } from "@/components/sim/PromptToSim";
import { SimCanvas } from "@/components/sim/SimCanvas";
import { DataChip, NeoSlider, TactileSwitch } from "@/components/sim/TactileControls";
import { MarginNote, NotebookPanel, RuledList, SectionHeading } from "@/components/NotebookKit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BRANCHES,
  CONCEPTS,
  MASTERED_AT,
  type MasteryMap,
  branchProgress,
} from "@/lib/concepts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isSoundEnabled, setSoundEnabled, sounds, subscribeSound } from "@/lib/haptics";
import { matchTemplate, titleForPrompt } from "@/lib/sim/match";
import {
  TEMPLATES,
  TEMPLATE_BY_ID,
  type ParamValues,
  type SimTemplate,
  type ToggleValues,
  defaultParams,
  defaultToggles,
  sanitizeParams,
  sanitizeToggles,
} from "@/lib/sim/templates";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const STARTER = TEMPLATE_BY_ID.oscillator ?? TEMPLATES[0];

type SavedSim = {
  _id: Id<"simulations">;
  title: string;
  prompt: string;
  templateId: string;
  params: string;
  toggles: string;
  concepts: string[];
  runs: number;
  updatedAt: number;
};

function safeParse<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const saved = useQuery(api.lab.listSimulations);
  const masteryRows = useQuery(api.lab.myMastery);
  const saveSimulation = useMutation(api.lab.saveSimulation);
  const patchSimulation = useMutation(api.lab.patchSimulation);
  const removeSimulation = useMutation(api.lab.removeSimulation);
  const recordExperiments = useMutation(api.lab.recordExperiments);

  const [searchParams] = useSearchParams();
  const incomingPrompt = searchParams.get("prompt") ?? "";
  const initial = useMemo(() => {
    const text = incomingPrompt.trim();
    const first = text ? matchTemplate(text).template : STARTER;
    return {
      template: first,
      params: defaultParams(first),
      toggles: defaultToggles(first),
      prompt: text || "why does a pendulum's period ignore its mass?",
    };
  }, [incomingPrompt]);

  const [template, setTemplate] = useState<SimTemplate>(initial.template);
  const [params, setParams] = useState<ParamValues>(initial.params);
  const [toggles, setToggles] = useState<ToggleValues>(initial.toggles);
  const [prompt, setPrompt] = useState(initial.prompt);
  const [activeId, setActiveId] = useState<Id<"simulations"> | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>("oscillation");
  const [runKey, setRunKey] = useState(0);
  const [sound, setSound] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => subscribeSound(setSound), []);

  const templateRef = useRef(template);
  const paramsRef = useRef(params);
  const togglesRef = useRef(toggles);
  const activeIdRef = useRef(activeId);
  templateRef.current = template;
  paramsRef.current = params;
  togglesRef.current = toggles;
  activeIdRef.current = activeId;

  const mastery: MasteryMap = useMemo(() => {
    const map: MasteryMap = {};
    for (const row of masteryRows ?? []) map[row.concept] = row.level;
    return map;
  }, [masteryRows]);

  const previousMastery = useRef<MasteryMap>({});
  const masteryPrimed = useRef(false);
  const masteryLoaded = masteryRows !== undefined;
  useEffect(() => {
    if (!masteryLoaded) return;
    if (!masteryPrimed.current) {
      // First load: adopt the server's levels silently instead of celebrating
      // everything the learner already mastered.
      masteryPrimed.current = true;
      previousMastery.current = mastery;
      return;
    }
    const previous = previousMastery.current;
    for (const node of CONCEPTS) {
      const before = previous[node.id] ?? 0;
      const now = mastery[node.id] ?? 0;
      if (before < MASTERED_AT && now >= MASTERED_AT) {
        sounds.mastery();
        toast.success(`${node.label} mastered`, {
          description: "A new branch is glowing on your concept tree.",
        });
      }
    }
    previousMastery.current = mastery;
  }, [mastery, masteryLoaded]);

  /** Debounced persistence + mastery gain while the learner experiments. */
  const pending = useRef<number | null>(null);
  const touch = useCallback(() => {
    if (pending.current !== null) window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      pending.current = null;
      void recordExperiments({ concepts: templateRef.current.concepts, amount: 0.03 });
      const id = activeIdRef.current;
      if (id) {
        void patchSimulation({
          id,
          params: JSON.stringify(paramsRef.current),
          toggles: JSON.stringify(togglesRef.current),
        });
      }
    }, 1200);
  }, [patchSimulation, recordExperiments]);

  useEffect(
    () => () => {
      if (pending.current !== null) window.clearTimeout(pending.current);
    },
    [],
  );

  const startPrompt = useCallback(
    async (text: string) => {
      const match = matchTemplate(text);
      const next = match.template;
      const nextParams = defaultParams(next);
      const nextToggles = defaultToggles(next);
      setTemplate(next);
      setParams(nextParams);
      setToggles(nextToggles);
      setPrompt(text);
      setRunKey((key) => key + 1);
      setActiveNode(next.concepts[0] ?? null);
      try {
        const id = await saveSimulation({
          prompt: text,
          title: titleForPrompt(text, next),
          templateId: next.id,
          params: JSON.stringify(nextParams),
          toggles: JSON.stringify(nextToggles),
          concepts: next.concepts,
        });
        setActiveId(id as Id<"simulations">);
      } catch {
        setActiveId(null);
      }
      void recordExperiments({ concepts: next.concepts, amount: 0.03 });
    },
    [recordExperiments, saveSimulation],
  );

  const openSaved = useCallback(
    (row: SavedSim) => {
      const next = TEMPLATE_BY_ID[row.templateId];
      if (!next) return;
      setTemplate(next);
      setParams(sanitizeParams(next, safeParse<ParamValues>(row.params)));
      setToggles(sanitizeToggles(next, safeParse<ToggleValues>(row.toggles)));
      setPrompt(row.prompt);
      setActiveId(row._id);
      setRunKey((key) => key + 1);
      setActiveNode(next.concepts[0] ?? null);
      sounds.node();
    },
    [],
  );

  const openTemplate = useCallback(
    (next: SimTemplate) => {
      setTemplate(next);
      setParams(defaultParams(next));
      setToggles(defaultToggles(next));
      setPrompt(
        PROMPT_SEEDS[next.id] ?? `let me play with ${next.name.toLowerCase()}`,
      );
      setActiveId(null);
      setRunKey((key) => key + 1);
      setActiveNode(next.concepts[0] ?? null);
      sounds.node();
    },
    [],
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const experiments = saved?.length ?? 0;
  const masteredNodes = CONCEPTS.filter((node) => (mastery[node.id] ?? 0) >= MASTERED_AT).length;

  return (
    <main className="notebook-page paper-grain relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-20%,rgba(139,92,246,0.14),transparent_65%)]" />

      <div className="relative mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6">
        {/* ---------------------------------------------------------- header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] py-5">
          <div className="flex items-center gap-3">
            <span className="neu-raise flex size-10 items-center justify-center rounded-2xl border border-lime-neon/25">
              <FlaskConical className="size-5 text-lime-neon" />
            </span>
            <div>
              <h1 className="font-display text-lg leading-none tracking-tight text-ink">
                Marginalia
              </h1>
              <p className="hand text-sm text-muted-foreground">
                lab notebook {user?.name ? `· ${user.name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !sound;
                setSoundEnabled(next);
                if (next) sounds.toggleOn();
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] transition-colors",
                sound
                  ? "border-lime-neon/35 bg-lime-neon/10 text-lime-neon"
                  : "border-white/10 text-muted-foreground hover:text-ink",
              )}
              aria-pressed={sound}
            >
              {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              {sound ? "haptics on" : "muted"}
            </button>
            <span className="tick-label hidden rounded-full border border-white/10 px-3 py-2 text-[11px] text-muted-foreground sm:block">
              {masteredNodes}/{CONCEPTS.length} mastered · {experiments} experiments
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full border-white/10 bg-white/[0.03]"
                  aria-label="Account"
                >
                  <span className="text-xs font-medium text-ink">
                    {(user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                  {user?.email ?? "signed in"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {branchProgress(mastery).map(({ branch, value }) => (
                  <div
                    key={branch}
                    className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="capitalize">{branch}</span>
                    <span className="tick-label">{Math.round(value * 100)}%</span>
                  </div>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ------------------------------------------------------------ grid */}
        <div className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_330px]">
          {/* left column: prompt + experiment index */}
          <div className="order-2 flex flex-col gap-5 xl:order-1">
            <NotebookPanel tone="violet">
              <SectionHeading index="01" title="Ask the lab" kicker="Type a question, get a playground." />
              <PromptToSim stacked onSubmit={startPrompt} defaultValue={prompt} />
            </NotebookPanel>

            <NotebookPanel>
              <SectionHeading
                index="02"
                title="Sim library"
                kicker="Eight engines, endlessly re-mixed."
              />
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openTemplate(item)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      template.id === item.id
                        ? "border-lime-neon/45 bg-lime-neon/12 text-lime-neon"
                        : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-ink",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </NotebookPanel>

            <NotebookPanel className="min-h-0">
              <SectionHeading
                index="03"
                title="Experiment index"
                kicker="Every prompt you build is filed here."
              />
              {experiments === 0 ? (
                <MarginNote tone="ink">
                  Nothing filed yet — your first prompt becomes entry 01.
                </MarginNote>
              ) : (
                <RuledList className="max-h-[22rem] overflow-y-auto pr-1 scrollbar-thin-neu">
                  {(saved ?? []).map((row, index) => (
                    <li key={row._id} className="group">
                      <div className="flex items-start gap-3 py-2.5">
                        <span className="tick-label mt-0.5 w-6 shrink-0 text-[10px] text-muted-foreground/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => openSaved(row as SavedSim)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span
                            className={cn(
                              "block truncate text-sm",
                              activeId === row._id ? "text-lime-neon" : "text-ink/90",
                            )}
                          >
                            {row.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {TEMPLATE_BY_ID[row.templateId]?.name ?? row.templateId} · {row.runs} runs
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${row.title}`}
                          onClick={() => void removeSimulation({ id: row._id })}
                          className="mt-0.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </RuledList>
              )}
            </NotebookPanel>
          </div>

          {/* center column: the canvas */}
          <div className="order-1 flex flex-col gap-5 xl:order-2">
            <NotebookPanel className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-violet-neon/35 bg-violet-neon/10 px-2 py-0.5 text-[10px] tracking-[0.14em] text-violet-200 uppercase">
                      {template.family}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {template.concepts.length} concepts linked
                    </span>
                  </div>
                  <h2 className="font-display mt-2 text-2xl leading-tight tracking-tight text-ink">
                    {template.name}
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    {template.blurb}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRunKey((key) => key + 1);
                      sounds.release();
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:border-white/25 hover:text-ink"
                  >
                    <RotateCcw className="size-3.5" />
                    Restart
                  </button>
                </div>
              </div>

              <SimCanvas
                key={`${template.id}-${runKey}`}
                engineId={template.engine}
                params={params}
                toggles={toggles}
                onInteract={touch}
                className="h-[360px] sm:h-[440px] xl:h-[540px]"
              />

              <div className="px-1">
                <MarginNote tone="lime">{template.note}</MarginNote>
              </div>
            </NotebookPanel>

            <NotebookPanel>
              <SectionHeading
                index="04"
                title="Variables"
                kicker="Drag a handle — the field reacts on the next frame."
              />
              <div className="grid gap-5 sm:grid-cols-2">
                {template.params.map((param) => (
                  <NeoSlider
                    key={param.key}
                    label={param.label}
                    value={params[param.key] ?? param.value}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    unit={param.unit}
                    accent={param.accent}
                    signed={param.signed}
                    onChange={(value) => {
                      setParams((current) => ({ ...current, [param.key]: value }));
                      touch();
                    }}
                  />
                ))}
              </div>

              {template.toggles.length > 0 && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {template.toggles.map((toggle) => (
                    <TactileSwitch
                      key={toggle.key}
                      label={toggle.label}
                      checked={toggles[toggle.key] ?? toggle.value}
                      onChange={(checked) => {
                        setToggles((current) => ({ ...current, [toggle.key]: checked }));
                        touch();
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {template.concepts.slice(0, 4).map((concept) => {
                  const node = CONCEPTS.find((item) => item.id === concept);
                  return (
                    <DataChip
                      key={concept}
                      label={node?.label ?? concept}
                      value={`${Math.round((mastery[concept] ?? 0) * 100)}%`}
                      accent={node?.branch === "waves" || node?.branch === "fields" ? "violet" : "lime"}
                    />
                  );
                })}
              </div>
            </NotebookPanel>
          </div>

          {/* right column: the concept tree */}
          <div className="order-3 flex flex-col gap-5">
            <NotebookPanel tone="lime">
              <SectionHeading
                index="05"
                title="Concept tree"
                kicker="Branches glow as topics stick."
              />
              <ConceptTree
                mastery={mastery}
                selected={activeNode}
                onSelect={setActiveNode}
                showLegend
              />
            </NotebookPanel>

            <NotebookPanel>
              <SectionHeading index="06" title="Field notes" kicker="What you've actually poked at." />
              <RuledList>
                {CONCEPTS.filter((node) => (mastery[node.id] ?? 0) > 0)
                  .sort((a, b) => (mastery[b.id] ?? 0) - (mastery[a.id] ?? 0))
                  .slice(0, 6)
                  .map((node) => (
                    <li key={node.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          background: BRANCHES[node.branch].color,
                          boxShadow: `0 0 8px ${BRANCHES[node.branch].glow}`,
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink/90">{node.label}</span>
                      <span className="tick-label text-[10px] text-muted-foreground">
                        {Math.round((mastery[node.id] ?? 0) * 100)}%
                      </span>
                    </li>
                  ))}
                {CONCEPTS.every((node) => (mastery[node.id] ?? 0) === 0) && (
                  <li className="py-3">
                    <MarginNote tone="ink">
                      Move a slider to open your first field note.
                    </MarginNote>
                  </li>
                )}
              </RuledList>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <BookMarked className="size-3.5 shrink-0 text-lime-neon" />
                <span className="text-[11px] text-muted-foreground">
                  Everything you build is saved to this notebook automatically.
                </span>
              </motion.div>
            </NotebookPanel>

            <NotebookPanel>
              <div className="flex items-center gap-2">
                <Library className="size-3.5 text-violet-300" />
                <span className="text-[11px] text-muted-foreground">
                  {TEMPLATES.length} engines live · prompt matching runs locally, instantly.
                </span>
              </div>
            </NotebookPanel>
          </div>
        </div>
      </div>
    </main>
  );
}

const PROMPT_SEEDS: Record<string, string> = {
  oscillator: "swing a pendulum and watch the damping eat it",
  projectile: "launch a ball at 42 degrees in thick air",
  wave: "two stones dropped in water, interference pattern",
  growth: "a virus spreading through a small town",
  gas: "what does doubling temperature do to a gas",
  gravity: "a moon that slowly escapes its planet",
  optics: "how a lens flips an image",
  field: "two opposite charges tracing field lines",
};
