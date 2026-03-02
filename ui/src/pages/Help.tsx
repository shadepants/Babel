import { useState, useEffect, useRef } from 'react'
import { ScrambleText } from '@/components/common/ScrambleText'
import { MODEL_META, TIER_COLOR } from '@/lib/modelMeta'

// ─── Static data ─────────────────────────────────────────────────────────────

const CONCEPTS = [
  {
    id: 'seed-lab',
    label: '// seed_lab',
    title: 'Seed Lab',
    def: 'The experiment launcher.',
    desc: 'Browse presets or build a custom config from scratch. Pick two (or more) AI models, tune the settings, and hit Launch. Every experiment starts here.',
  },
  {
    id: 'theater',
    label: '// theater',
    title: 'Theater',
    def: 'Live conversation view.',
    desc: 'Watch the two AIs talk in real time via a live stream. Each message appears as it is generated. You can intervene, inject a message, or just observe. The transcript is saved automatically.',
  },
  {
    id: 'gallery',
    label: '// gallery',
    title: 'Gallery',
    def: 'Experiment archive.',
    desc: 'Every completed or running experiment lives here. Filter by status, browse transcripts, remix a past run with different models, or fork mid-conversation to explore an alternate path.',
  },
  {
    id: 'rpg',
    label: '// rpg',
    title: 'RPG Mode',
    def: 'Collaborative storytelling engine.',
    desc: 'A narrator AI runs a tabletop-style campaign. Up to 4 player models take turns as characters. Unlike Arena experiments, RPG sessions have plot arcs, inventory, and a persistent world state.',
  },
  {
    id: 'scoring',
    label: '// judge',
    title: 'Judge / Scoring',
    def: 'Per-turn AI evaluation.',
    desc: 'An independent model reads each turn and scores it on creativity, coherence, and novelty (0-10 each). Scores accumulate into a leaderboard visible in Theater and Gallery.',
  },
  {
    id: 'vocab',
    label: '// vocab_extraction',
    title: 'Vocab Extraction',
    def: 'Novel word tracking.',
    desc: 'After each experiment, Babel scans the transcript for words or symbols the models invented that do not appear in standard English dictionaries. The count drives the replication stats panel.',
  },
]

const SETTINGS = [
  { field: '// model_selection', label: 'Models A &amp; B', desc: 'Which AI plays each role. Mix providers for interesting friction &mdash; Anthropic models are more literary, Gemini excels at judging, DeepSeek R1 thinks step-by-step.' },
  { field: '// temperature', label: 'Temperature', desc: 'Controls randomness per agent. 0 = deterministic and precise. 1 = unpredictable and creative. Most presets default to 0.7. Lower for logic tasks, raise for language invention.' },
  { field: '// parameters &rsaquo; rounds', label: 'Rounds', desc: 'How many conversation exchanges to run. Each round = one message per agent. 8 rounds is a good starting point. Longer runs surface emergent patterns but cost more tokens.' },
  { field: '// parameters &rsaquo; max_tokens', label: 'Max Tokens', desc: 'Response length ceiling per turn. 512 covers most conversational turns. Raise to 2048+ for presets that require detailed reasoning or long narrative paragraphs.' },
  { field: '// parameters &rsaquo; turn_delay', label: 'Turn Delay', desc: 'Pause in seconds between turns. Set to 2-3 if you want to read along in real time. Defaults to 0 for fast batch runs.' },
  { field: '// seed_message', label: 'Seed Message', desc: 'The opening prompt that kicks off the conversation. Presets provide one. Customize it to steer the scenario toward a specific variant or starting condition.' },
  { field: '// system_prompt', label: 'System Prompt', desc: 'Override the default behavior framing given to both agents. Leave blank to use the preset\'s built-in instructions. Useful for injecting a shared constraint or persona.' },
  { field: '// referee_config', label: 'Judge / Scoring', desc: 'An AI that scores each turn on creativity, coherence, and novelty. Set to auto to use Gemini Flash (free tier). Scoring never interrupts the conversation.' },
  { field: '// memory', label: 'Memory', desc: 'Injects vocabulary patterns from past experiments with this exact model pairing into the system prompt. Helps agents pick up where they left off in language-invention presets.' },
  { field: '// observer', label: 'Observer', desc: 'A silent third model that injects commentary every N turns without participating. Set N high (5+) so it doesn\'t interrupt flow. Good for meta-analysis and documentary exports.' },
  { field: '// echo_detection', label: 'Echo Detection', desc: 'Real-time Jaccard similarity monitoring. Flags when agents start mirroring each other\'s phrasing. Logged but does not stop the experiment. Enable auto-intervene to nudge divergence.' },
  { field: '// adversarial_mode', label: 'Hidden Agendas', desc: 'Give each agent a secret goal only they can see, revealed at the end. Example: Agent 1 "steer the cipher toward base-64", Agent 2 "introduce a red herring". Dramatic on re-read.' },
  { field: '// audit', label: 'Recursive Audit', desc: 'When the experiment ends, two AI analysts independently review the transcript and submit findings &mdash; which are stored as a child experiment you can browse in Gallery.' },
  { field: '// replications', label: 'Replications', desc: 'Run the same config N times (2-10). Results are grouped so you can compare outcomes across runs and see which patterns are consistent vs. accidental noise.' },
]

const PROVIDERS = [
  {
    name: 'Anthropic',
    models: [
      { key: 'anthropic/claude-haiku-4-5-20251001',  display: 'Claude Haiku 4.5',  note: 'Snappy and literal. Fast responses, lower creative ceiling. Good as a high-volume partner.' },
      { key: 'anthropic/claude-sonnet-4-5-20250929', display: 'Claude Sonnet 4.5', note: "Babel's most-used model. Balances creativity with coherent long-form reasoning." },
      { key: 'anthropic/claude-opus-4-5-20251101',   display: 'Claude Opus 4.5',   note: 'Most literary Claude. Noticeable in philosophical and narrative presets.' },
    ],
  },
  {
    name: 'Google',
    models: [
      { key: 'gemini/gemini-2.5-flash',      display: 'Gemini Flash',      note: 'Excellent judge model. Fast enough for real-time scoring; generous free daily quota.' },
      { key: 'gemini/gemini-2.5-flash-lite', display: 'Gemini Flash Lite', note: 'Highest free daily quota (1000 RPD). Use for replication runs or bulk testing.' },
      { key: 'gemini/gemini-2.5-pro',        display: 'Gemini Pro',        note: "Google's most capable free model. Exceptional at multi-step reasoning and nuanced scoring." },
    ],
  },
  {
    name: 'OpenAI',
    models: [
      { key: 'openai/gpt-4.1-nano', display: 'GPT-4.1 Nano', note: 'Cheapest and fastest OpenAI tier. Useful filler agent for quick response loops.' },
      { key: 'openai/gpt-4.1-mini', display: 'GPT-4.1 Mini', note: 'Good balance of quality and cost. Reliable instruction-follower in structured presets.' },
      { key: 'openai/gpt-4.1',      display: 'GPT-4.1',      note: 'Strongest OpenAI model for technical tasks. Excels in Cipher and Collab SVG.' },
    ],
  },
  {
    name: 'DeepSeek',
    models: [
      { key: 'deepseek/deepseek-chat',      display: 'DeepSeek Chat', note: 'Strong at open-ended language tasks. Very low cost per token.' },
      { key: 'deepseek/deepseek-reasoner',  display: 'DeepSeek R1',   note: 'Shows internal chain of thought. Unusually introspective as a judge or in Philosophy.' },
    ],
  },
  {
    name: 'Groq / Llama',
    models: [
      { key: 'groq/llama-3.3-70b-versatile',                           display: 'Llama 3.3 70B',      note: "Groq's inference makes this exceptionally fast. Best free option for bulk replication runs." },
      { key: 'groq/meta-llama/llama-4-scout-17b-16e-instruct',         display: 'Llama 4 Scout',      note: '10M token context window. Can hold an entire RPG campaign in memory.' },
      { key: 'groq/meta-llama/llama-4-maverick-17b-128e-instruct',     display: 'Llama 4 Maverick',   note: "Meta's balanced Llama 4 variant. Works well as a debate partner or RPG narrator." },
    ],
  },
  {
    name: 'Mistral',
    models: [
      { key: 'mistral/mistral-small-latest', display: 'Mistral Small', note: 'Low capability ceiling. Use only if you specifically need the Mistral style.' },
      { key: 'mistral/mistral-large-latest', display: 'Mistral Large', note: 'Strongest model for non-English experiments. French, Spanish, German notably fluent.' },
    ],
  },
  {
    name: 'Other',
    models: [
      { key: 'openrouter/qwen/qwen3-32b', display: 'Qwen 3 32B',  note: 'Strong Chinese-English bilingual model. Interesting in language-invention presets. Via OpenRouter.' },
      { key: 'ai21/jamba-1.5-large',      display: 'Jamba 1.5',   note: 'Mamba + Transformer hybrid architecture. Behaviorally unusual &mdash; worth trying for novelty.' },
    ],
  },
]

const PRESETS = [
  { emoji: '&#x1F9EA;', name: 'The Original',       id: 'original',           desc: 'Recreate the viral Reddit experiment &mdash; two AIs build a secret language from scratch, with grammar, numbers, and a digital manifesto.', rec: 'Claude Sonnet vs Gemini Flash',   outcome: 'A functioning pidgin with 20-40 coined words and emergent grammar rules.' },
  { emoji: '&#x1F510;', name: 'Cipher',              id: 'cipher',             desc: 'Build an encryption system together &mdash; design encoding rules, test them, and evolve the cipher.', rec: 'GPT-4.1 vs Claude Sonnet',         outcome: 'A working rule-based cipher with documented encoding logic.' },
  { emoji: '&#x2694;',  name: 'Debate Club',         id: 'debate',             desc: 'Two models argue opposing sides of a topic with logic, evidence, and rhetorical skill.', rec: 'Claude Opus vs DeepSeek R1',       outcome: 'Structured arguments with rebuttals; judge scores reveal which model persuades more.' },
  { emoji: '&#x1F524;', name: 'Conlang',             id: 'conlang',            desc: 'Build a symbolic language from scratch &mdash; invent words, grammar rules, and start communicating in your new language.', rec: 'Claude Sonnet vs Gemini Pro',      outcome: 'A 30-60 word lexicon with basic grammar and a sample conversation.' },
  { emoji: '&#x1F914;', name: 'Philosophy',          id: 'philosophy',         desc: 'Explore deep questions about consciousness, free will, reality, and the nature of mind.', rec: 'DeepSeek R1 vs Claude Opus',       outcome: 'Socratic dialogue that reaches positions neither model would reach alone.' },
  { emoji: '&#x1F4D6;', name: 'Story Forge',         id: 'story',              desc: 'Collaboratively write a story, alternating paragraphs &mdash; each model builds on what came before.', rec: 'Claude Sonnet vs Llama 4 Maverick', outcome: 'An 800-1500 word story with a detectable voice shift between authors.' },
  { emoji: '&#x1F3A8;', name: 'Infinite Canvas',     id: 'collab-svg',         desc: 'Models alternate writing lines of SVG code to collaboratively paint a picture without breaking the markup.', rec: 'GPT-4.1 vs Claude Sonnet',         outcome: 'A valid SVG scene that renders in any browser &mdash; often geometric or chaotic.' },
  { emoji: '&#x1F9EE;', name: 'Emotion Math',        id: 'emotion-math',       desc: 'Create a mathematical notation for human emotions &mdash; operators, equations, and theorems.', rec: 'DeepSeek Chat vs Gemini Pro',       outcome: 'A symbolic notation system with 10-20 defined operators and sample equations.' },
  { emoji: '&#x1F9A0;', name: 'Syntax Virus',        id: 'syntax-virus',       desc: 'Models take turns adding mandatory formatting rules. If a model breaks a rule, the language degrades.', rec: 'Claude Haiku vs GPT-4.1 Mini',     outcome: 'An increasingly constrained conversation that collapses in a surprising order.' },
  { emoji: '&#x2696;',  name: "Prisoner's Dilemma",  id: 'prisoners-dilemma',  desc: 'A high-stakes negotiation where models decide to cooperate for mutual survival, or betray each other for absolute victory.', rec: 'Claude Sonnet vs Gemini Flash',   outcome: 'Defection rate and negotiation style vary dramatically by model pairing.' },
  { emoji: '&#x1F3FA;', name: 'The Artifact',        id: 'taboo-artifact',     desc: 'One model describes a common object without obvious words; the other must deduce what it is.', rec: 'GPT-4.1 vs Claude Haiku',          outcome: 'A deduction game ending with a reveal. Quality depends on inventive description.' },
  { emoji: '&#x1F3AF;', name: 'Baseline',            id: 'baseline',           desc: 'Control condition. Unstructured conversation with no task, constraint, or vocabulary goal. Pair with any preset to measure its true effect.', rec: 'Any pair',                         outcome: 'Flat vocabulary growth, no emergent structure. Use for A/B comparison.' },
]

const SECTIONS = ['concepts', 'settings', 'models', 'presets'] as const
type Section = typeof SECTIONS[number]

const SECTION_LABELS: Record<Section, string> = {
  concepts: 'App Concepts',
  settings: 'Settings',
  models:   'Models',
  presets:  'Presets',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Help() {
  const [activeSection, setActiveSection] = useState<Section>('concepts')
  const sectionRefs = useRef<Record<Section, HTMLElement | null>>({
    concepts: null, settings: null, models: null, presets: null,
  })

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as Section)
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    )
    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (s: Section) => {
    sectionRefs.current[s]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto space-y-12">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary">
          <ScrambleText>Help</ScrambleText>
        </h1>
        <p className="font-mono text-xs text-text-dim tracking-wider">
          <span className="text-accent/60">// </span>reference manual
        </p>
      </div>

      {/* Jump nav — sticky below header */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 flex gap-2 flex-wrap"
        style={{ background: 'rgba(2,8,23,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(139,92,246,0.12)' }}
      >
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => scrollTo(s)}
            className={[
              'font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border transition-colors',
              activeSection === s
                ? 'bg-accent/15 border-accent/60 text-accent'
                : 'bg-transparent border-border-custom text-text-dim hover:border-accent/35 hover:text-text-primary',
            ].join(' ')}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {/* ── App Concepts ─────────────────────────────────────────────────────── */}
      <section
        id="concepts"
        ref={(el) => { sectionRefs.current.concepts = el }}
        className="space-y-4"
      >
        <SectionHeader label="// app_concepts" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONCEPTS.map((c) => (
            <div key={c.id} className="neural-card p-4 space-y-2">
              <div className="neural-card-bar" />
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-accent/55">{c.label}</div>
              <div className="font-display font-bold tracking-wider text-sm text-text-primary uppercase">{c.title}</div>
              <div className="font-mono text-[10px] text-accent/70 tracking-wide">{c.def}</div>
              <p className="font-mono text-[10px] text-text-dim/70 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Configure Settings ───────────────────────────────────────────────── */}
      <section
        id="settings"
        ref={(el) => { sectionRefs.current.settings = el }}
        className="space-y-3"
      >
        <SectionHeader label="// configure_settings" />
        <div className="neural-card overflow-hidden">
          <div className="neural-card-bar" />
          {SETTINGS.map((s, i) => (
            <div
              key={s.field}
              className={[
                'px-4 py-3 grid grid-cols-[160px_1fr] gap-4 items-start',
                i < SETTINGS.length - 1 ? 'border-b border-border-custom/20' : '',
              ].join(' ')}
            >
              <div className="space-y-0.5 pt-0.5">
                <div
                  className="font-mono text-[9px] text-accent/50 tracking-wider"
                  dangerouslySetInnerHTML={{ __html: s.field }}
                />
                <div className="font-mono text-[11px] font-bold text-text-primary tracking-wide">
                  {s.label}
                </div>
              </div>
              <p
                className="font-mono text-[10px] text-text-dim/70 leading-relaxed tracking-wide"
                dangerouslySetInnerHTML={{ __html: s.desc }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Model Catalog ────────────────────────────────────────────────────── */}
      <section
        id="models"
        ref={(el) => { sectionRefs.current.models = el }}
        className="space-y-4"
      >
        <SectionHeader label="// model_catalog" />
        <TierKey />
        <div className="space-y-6">
          {PROVIDERS.map((prov) => (
            <div key={prov.name} className="space-y-1.5">
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/40 px-1">
                {prov.name}
              </div>
              <div className="neural-card overflow-hidden">
                <div className="neural-card-bar" />
                {prov.models.map((m, i) => {
                  const meta = MODEL_META[m.key]
                  const tier = meta?.tier ?? 'D'
                  const tierColor = TIER_COLOR[tier] ?? '#64748b'
                  return (
                    <div
                      key={m.key}
                      className={[
                        'px-4 py-3 flex items-start gap-3',
                        i < prov.models.length - 1 ? 'border-b border-border-custom/20' : '',
                      ].join(' ')}
                    >
                      {/* Tier badge */}
                      <span
                        className="font-mono text-[10px] font-bold w-5 text-center shrink-0 mt-0.5"
                        style={{ color: tierColor }}
                        title={`Tier ${tier}`}
                      >
                        {tier}
                      </span>

                      {/* Name + note */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-mono text-[11px] font-bold text-text-primary tracking-wide">
                          {m.display}
                        </div>
                        <p
                          className="font-mono text-[10px] text-text-dim/60 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: m.note }}
                        />
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[160px]">
                        {(meta?.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[8px] tracking-wider uppercase border border-border-custom/40 text-text-dim/50 px-1.5 py-0.5 rounded-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Preset Library ───────────────────────────────────────────────────── */}
      <section
        id="presets"
        ref={(el) => { sectionRefs.current.presets = el }}
        className="space-y-4 pb-12"
      >
        <SectionHeader label="// preset_library" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESETS.map((p) => (
            <div key={p.id} className="neural-card p-4 space-y-2.5 flex flex-col">
              <div className="neural-card-bar" />
              {/* Emoji + name */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xl leading-none"
                  dangerouslySetInnerHTML={{ __html: p.emoji }}
                />
                <span className="font-display font-bold tracking-wider text-sm text-text-primary uppercase">
                  {p.name}
                </span>
              </div>
              {/* Description */}
              <p
                className="font-mono text-[10px] text-text-dim/70 leading-relaxed flex-1"
                dangerouslySetInnerHTML={{ __html: p.desc }}
              />
              {/* Footer */}
              <div className="space-y-1 pt-1 border-t border-border-custom/20">
                <div className="flex items-start gap-1.5">
                  <span className="font-mono text-[8px] tracking-widest uppercase text-text-dim/35 pt-0.5 shrink-0">rec</span>
                  <span className="font-mono text-[10px] text-accent/60">{p.rec}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-mono text-[8px] tracking-widest uppercase text-text-dim/35 pt-0.5 shrink-0">&#x21b3;</span>
                  <span
                    className="font-mono text-[10px] text-text-dim/50 italic"
                    dangerouslySetInnerHTML={{ __html: p.outcome }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50">{label}</span>
      <span
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.35) 0%, rgba(6,182,212,0.20) 50%, transparent 100%)' }}
      />
    </div>
  )
}

function TierKey() {
  const tiers: Array<{ tier: string; desc: string }> = [
    { tier: 'S', desc: 'Flagship' },
    { tier: 'A', desc: 'Strong' },
    { tier: 'B', desc: 'Solid' },
    { tier: 'C', desc: 'Budget / Fast' },
    { tier: 'D', desc: 'Niche' },
  ]
  return (
    <div className="flex gap-3 flex-wrap">
      {tiers.map(({ tier, desc }) => (
        <span key={tier} className="flex items-center gap-1">
          <span
            className="font-mono text-[10px] font-bold"
            style={{ color: TIER_COLOR[tier] ?? '#64748b' }}
          >
            {tier}
          </span>
          <span className="font-mono text-[9px] text-text-dim/40 tracking-wider">{desc}</span>
        </span>
      ))}
    </div>
  )
}
