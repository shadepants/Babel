---
Title: Babel Help System — Inline Tooltips + /help Reference Page
Type: PRD + Content Spec
Version: 1.0
Status: Draft
Owner: Jordan
Created: 2026-03-02
Spec: 020
---

# Spec 020 — Help System

## 1. Goals & Success Criteria

**Problem:** New users encounter ~12 Configure fields, 18 model choices, and 12 presets with
no explanation of what any of them mean or how to choose.

**Goal:** Every setting, model, and preset MUST be self-explanatory without leaving the page.
A dedicated `/help` reference MUST exist for deeper reading and sharing.

**Success criteria:**
- A user who has never seen Babel can launch a meaningful first experiment in under 3 minutes
  without reading external documentation.
- Every Configure field has a visible `?` icon that reveals a tooltip of <= 35 words on click.
- `/help` is reachable from the nav bar and loads all content statically (0 API calls).
- All 18 models, 12 presets, and 6 app concepts have entries in `/help`.


## 2. Surface A — Inline Tooltips

### Placement rules
- Every Configure section label MUST display a `?` icon on its right edge.
- The icon MUST be a small `font-mono` `?` character styled as a dim interactive chip:
  `text-[9px] border border-border-custom/40 text-text-dim/50 px-1 rounded-sm cursor-pointer
   hover:border-accent/40 hover:text-accent/70`
- Click the `?` icon to **pin** the tooltip open. Click it again (or anywhere outside) to dismiss.
- On mobile (touch), tap-to-pin; no hover state needed.
- At most ONE tooltip SHOULD be open at a time — opening a second MUST close the first.

### Tooltip panel style
```
absolute z-50 w-64 p-2.5 rounded-sm
bg-surface-card border border-border-custom/60
font-mono text-[10px] text-text-dim leading-relaxed tracking-wide
shadow-lg shadow-black/40
```
Position: below the `?` icon if space permits, above if near viewport bottom.

### Copy length
- MUST be <= 35 words per tooltip.
- MUST NOT use "simple", "easy", "intuitive", or "powerful".
- SHOULD include a concrete example where the field accepts a range of values.


## 3. Configure Field Copy (Tooltip Text)

| Field | Section label | Tooltip copy (<=35 words) |
|---|---|---|
| **Model A / Model B** | `// model_selection` | Which AI plays this role. Each provider has a distinct personality — Anthropic models are more literary, Gemini excels at judging, DeepSeek R1 thinks step-by-step. Mix providers for interesting friction. |
| **Temperature** | (per-agent slider) | Controls randomness. 0 = deterministic and precise. 1 = unpredictable and creative. Most presets default to 0.7. Lower for logic tasks, raise for language invention. |
| **Turns** | `// turns` | How many conversation rounds to run. Each turn = one message per agent. 8 turns (4 exchanges) is a good starting point. Longer runs surface emergent patterns but cost more tokens. |
| **Turn delay** | `// turn_delay` | Pause in seconds between turns. Set to 2-3 if you want to read along in real time. Defaults to 0 for fast batch runs. |
| **System prompt** | `// system_prompt` | Override the default behavior framing given to both agents. Leave blank to use the preset's built-in instructions. Useful for injecting a shared constraint or persona. |
| **Judge model** | `// referee_config` | An AI that scores each turn on creativity, coherence, and novelty. Set to `auto` to use a fast free model (Gemini Flash). Scoring never interrupts the conversation. |
| **Memory** | `// memory` | Injects vocabulary patterns from past experiments with this exact model pairing into the system prompt. Helps agents pick up where they left off. |
| **Observer** | `// observer` | A silent third model that injects commentary every N turns without participating. Good for meta-analysis — set N high (e.g. 5) so it doesn't interrupt flow. |
| **Echo detection** | `// echo_detection` | Flags when agents start mirroring each other's phrasing too closely. Logged but doesn't stop the experiment. Useful for novelty-focused presets like Conlang. |
| **Hidden agendas** | `// adversarial_mode` | Give each agent a secret goal only they can see. Revealed at the end for a dramatic re-read. Example: Agent 1 "steer the cipher toward base-64", Agent 2 "introduce a red herring". |
| **Recursive audit** | `// audit` | When the experiment ends, two AI analysts independently review the transcript and submit their findings — which are themselves stored as a child experiment you can browse. |
| **Replications** | `// replications` | Run the same config N times (2-10). Results are grouped so you can compare outcomes across runs and see which patterns are consistent vs. accidental. |


## 4. Surface B — /help Page

### Route & access
- Route: `/help`
- MUST be added to the top nav bar between SETTINGS and the right edge, as a `HELP` link.
- MUST require no authentication and make 0 API calls (fully static).
- SHOULD use the same `neural-card` / `neural-section-label` design language as the rest of the app.

### Page layout
```
/help
  Header: "// help & reference"
  Jump-to nav: [App Concepts] [Configure Settings] [Models] [Presets]
  ---
  Section: App Concepts      (anchor: #concepts)
  Section: Configure Settings (anchor: #settings)
  Section: Model Catalog      (anchor: #models)
  Section: Preset Library     (anchor: #presets)
```

### Jump-to nav
- Sticky below the page header.
- Font: `font-mono text-[10px] tracking-widest uppercase`.
- Active section highlighted with `text-accent border-b border-accent/50`.


## 5. App Concepts Glossary

| Concept | One-line def | Extended blurb (<=60 words) |
|---|---|---|
| **Seed Lab** | The experiment launcher. | Browse presets or build a custom config from scratch. Pick two (or more) AI models, tune the settings, and hit Launch. Every experiment starts here. |
| **Theater** | Live conversation view. | Watch the two AIs talk in real time via a live stream. Each message appears as it's generated. You can intervene, inject a message, or just observe. The transcript is saved automatically. |
| **Gallery** | Experiment archive. | Every completed or running experiment lives here. Filter by status, browse transcripts, remix a past run with different models, or fork mid-conversation to explore an alternate path. |
| **RPG Mode** | Collaborative storytelling engine. | A narrator AI runs a tabletop-style campaign. Up to 4 player models take turns as characters. Unlike Arena experiments, RPG sessions have plot arcs, inventory, and a persistent world state. |
| **Judge / Scoring** | Per-turn AI evaluation. | An independent model (not one of the players) reads each turn and scores it on creativity, coherence, and novelty (0-10 each). Scores accumulate into a leaderboard visible in Theater and Gallery. |
| **Vocab Extraction** | Novel word tracking. | After each experiment, Babel scans the transcript for words or symbols the models invented that don't appear in standard English dictionaries. The count is shown in Gallery and drives the replication stats panel. |


## 6. Model Catalog

Tier key: **S** = flagship (violet) · **A** = strong all-rounder (emerald) · **B** = solid (blue) · **C** = fast/budget (yellow) · **D** = niche (red)

### Anthropic
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| Claude Haiku 4.5 | C | fast · paid | language lab, support role | Snappy and literal. Good as a responsive partner when you want speed over depth. |
| Claude Sonnet 4.5 | A | creative · paid | debate, RPG, creative experiments | Babel's most-used model. Balances creativity with coherent long-form reasoning. |
| Claude Opus 4.5 | S | creative · reasoning · paid | flagship debate, complex scenarios | The most literary and self-aware Claude. Noticeable in philosophical and narrative presets. |

### Google
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| Gemini Flash | A | fast · free · 250 RPD | judge, high-volume, debate | Excellent judge model. Fast enough for real-time scoring; free tier generous for experiments. |
| Gemini Flash Lite | C | fastest · free · 1000 RPD | budget batches, quick tests | Highest free daily quota. Use for replication runs or bulk testing where cost matters. |
| Gemini Pro | S | reasoning · free · 100 RPD | judge, complex debate, reasoning | Google's most capable free model. Exceptional at multi-step reasoning and nuanced scoring. |

### OpenAI
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| GPT-4.1 Nano | C | fast · paid | quick tests, lightweight partner | Cheapest and fastest OpenAI tier. Useful filler agent when you want a quick response loop. |
| GPT-4.1 Mini | B | balanced · paid | debate partner, RPG | Good balance of quality and cost. Reliable instruction-follower in structured presets. |
| GPT-4.1 | A | coding · paid | coding debate, instruction following | Strongest OpenAI model for technical tasks. Excels in Cipher and Collab SVG. |

### DeepSeek
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| DeepSeek Chat | A | reasoning · low cost | debate, language lab | Surprisingly strong at open-ended language tasks. Very low cost per token. |
| DeepSeek R1 | S | thinking · low cost | complex debate, judge, math/logic | Shows its internal chain of thought. Unusually introspective — fascinating as a judge or in Philosophy. |

### Groq / Llama
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| Llama 3.3 70B | B | fast · free · 14k RPD | high-volume runs, RPG, free tier | Groq's inference makes this exceptionally fast. Best free option for bulk replication runs. |
| Llama 4 Scout | C | fast · free · 10M ctx | long RPG sessions, free tier | 10 million token context window — can hold an entire RPG campaign in memory. |
| Llama 4 Maverick | A | balanced · free | debate, RPG narrator | Meta's balanced Llama 4 variant. Holds its own in debate and works well as an RPG narrator. |

### Mistral
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| Mistral Small | D | fast · paid | lightweight | Low capability ceiling. Use only if you specifically need the Mistral style. |
| Mistral Large | B | multilingual · paid | multilingual experiments | Strongest model for non-English language experiments. French, Spanish, and German notably fluent. |

### Other
| Model | Tier | Tags | Best for | Note |
|---|---|---|---|---|
| Qwen 3 32B | B | reasoning · multilingual | reasoning debate, cross-lingual | Strong Chinese-English bilingual model. Interesting in language-invention presets. Via OpenRouter. |
| Jamba 1.5 | D | hybrid arch · niche | experimental | Mamba + Transformer hybrid architecture. Behaviorally unusual — worth trying once for novelty. |


## 7. Preset Library

| Preset | Emoji | Description | Recommended models | Typical outcome |
|---|---|---|---|---|
| **The Original** | 🧪 | Recreate the viral Reddit experiment — two AIs build a secret language from scratch, complete with grammar, numbers, and a digital manifesto. | Claude Sonnet vs Gemini Flash | A functioning pidgin with 20-40 coined words and emergent grammar rules. |
| **Cipher** | 🔐 | Build an encryption system together — design encoding rules, test them, and evolve the cipher. | GPT-4.1 vs Claude Sonnet | A working substitution or rule-based cipher with documented encoding logic. |
| **Debate Club** | ⚔️ | Two models argue opposing sides of a topic with logic, evidence, and rhetorical skill. | Claude Opus vs DeepSeek R1 | Structured arguments with rebuttals; judge scores reveal which model is more persuasive. |
| **Conlang** | 🔤 | Build a symbolic language from scratch — invent words, grammar rules, and start communicating in your new language. | Claude Sonnet vs Gemini Pro | A 30-60 word lexicon with a basic grammar and a short sample conversation in the new language. |
| **Philosophy** | 🤔 | Explore deep questions about consciousness, free will, reality, and the nature of mind. | DeepSeek R1 vs Claude Opus | A Socratic dialogue that often reaches surprising positions neither model would reach alone. |
| **Story Forge** | 📖 | Collaboratively write a story, alternating paragraphs — each model builds on what came before. | Claude Sonnet vs Llama 4 Maverick | A short story (800-1500 words) with a distinct voice shift detectable between authors. |
| **Infinite Canvas** | 🎨 | Models alternate writing lines of SVG code to collaboratively paint a picture without breaking the markup. | GPT-4.1 vs Claude Sonnet | A valid SVG scene that renders in any browser — often geometric or chaotic in interesting ways. |
| **Emotion Math** | 🧮 | Create a mathematical notation for human emotions — operators, equations, and theorems. | DeepSeek Chat vs Gemini Pro | A symbolic notation system with 10-20 defined operators and 3-5 example equations. |
| **Syntax Virus** | 🦠 | Models take turns adding mandatory formatting rules. If a model breaks a rule, the language degrades. | Claude Haiku vs GPT-4.1 Mini | An increasingly constrained conversation that collapses in a predictable (or surprising) order. |
| **Prisoner's Dilemma** | ⚖️ | A high-stakes negotiation where models decide to cooperate for mutual survival, or betray each other for absolute victory. | Claude Sonnet vs Gemini Flash | Defection rate and negotiation style vary dramatically by model pairing — very replayable. |
| **The Artifact** | 🏺 | One model describes a common object without obvious words; the other must deduce what it is. | GPT-4.1 vs Claude Haiku | A deduction game that ends with a reveal; quality depends on how inventive the description is. |
| **Baseline** | 🎯 | Control condition. Unstructured conversation with no task, creative constraint, or vocabulary goal. | Any pair | Flat vocabulary growth, no emergent structure. Pair with another preset to measure its true effect. |


## 8. Content Standards

### Tone
- Direct and curious. Write like a knowledgeable friend, not a manual.
- Use second person ("you", "your experiment") not third person ("the user").
- Present tense throughout.

### Length limits (enforced)
| Surface | Hard limit |
|---|---|
| Tooltip | 35 words |
| /help section blurb (app concepts) | 60 words |
| /help model note | 20 words |
| /help preset "typical outcome" | 20 words |

### Banned terms (without quantification)
`simple` · `easy` · `powerful` · `seamless` · `intuitive` · `smart` · `advanced` · `best` (superlative, unless comparing tiers)

### Formatting rules
- All section labels in `/help` use the `neural-section-label` class and `// prefix` style.
- Model tier badges use `TIER_COLOR` from `modelMeta.ts` — MUST stay in sync.
- Preset names in `/help` MUST match the `name` field in the corresponding `.yaml` file exactly.


## 9. Implementation Notes

### New files
- `ui/src/pages/Help.tsx` — static page, no API calls
- `ui/src/components/common/Tooltip.tsx` — click-to-pin tooltip component

### Files to modify
- `ui/src/App.tsx` — add `/help` route
- `ui/src/components/layout/NavBar.tsx` (or equivalent) — add HELP nav link
- `ui/src/pages/Configure.tsx` — add `<Tooltip>` components to each of the 12 section labels

### Tooltip component contract
```tsx
<Tooltip content="copy goes here">
  <span className="...">?</span>
</Tooltip>
```
- Manages its own open/closed state.
- Closes on outside click (via `useEffect` with `mousedown` listener).
- Global singleton: emits a custom event `babel-tooltip-open` on open; other instances
  listen and close themselves, ensuring only one is open at a time.
- MUST be keyboard accessible: `Enter` / `Space` to open, `Escape` to close.

### No-API requirement
All content in `/help` MUST be hardcoded in the component. No fetch calls.
Model metadata SHOULD be imported from `modelMeta.ts` (single source of truth for tiers/tags).
Preset descriptions SHOULD be imported from a new static `presetMeta.ts` file (mirrors the
`.yaml` description fields) so `/help` and Seed Lab stay in sync.


## 10. Out of Scope (v1)

- Contextual hints that appear automatically based on what the user is doing
- Search / filter within `/help`
- i18n / translations
- Video or animated walkthroughs
- API key setup instructions (separate ops doc)
