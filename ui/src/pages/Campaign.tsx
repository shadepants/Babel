import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { RelayStartRequest, RPGParticipant, CampaignPreset } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CLASS_OPTIONS = ['Warrior', 'Mage', 'Rogue', 'Cleric', 'Ranger', 'Bard', 'Custom']
const TONE_OPTIONS = ['cinematic', 'whimsical', 'grimdark', 'serious'] as const
const SETTING_OPTIONS = ['Fantasy', 'Sci-Fi', 'Horror', 'Historical', 'Cyberpunk', 'Steampunk', 'Modern', 'Custom']
const DIFFICULTY_OPTIONS = ['casual', 'normal', 'deadly'] as const

// Maps preset's lowercase rpgSetting values to display-label values
const SETTING_MAP: Record<string, string> = {
  fantasy: 'Fantasy',
  scifi: 'Sci-Fi',
  horror: 'Horror',
  historical: 'Historical',
  cyberpunk: 'Cyberpunk',
  steampunk: 'Steampunk',
  modern: 'Modern',
}

// Models known to fail as DM (0/3 sessions completed, or daily token limits)
const DM_BLOCKED_MODELS = [
  'gemini/gemini-2.5-pro',  // silent failure: 0 turns produced in every DM attempt
  'groq/',                   // daily TPD limit; never completed a DM session
]

type Tone = typeof TONE_OPTIONS[number]
type Difficulty = typeof DIFFICULTY_OPTIONS[number]

interface CampaignNavState {
  preset?: CampaignPreset
  agents?: Array<{ model: string; name: string }>
  rounds?: number
  maxTokens?: number
  turnDelay?: number
  systemPrompt?: string
  enableScoring?: boolean
  enableVerdict?: boolean
  enableMemory?: boolean
  observerModel?: string
  observerInterval?: number
  judgeModel?: string
}

export default function Campaign() {
  const { presetId } = useParams<{ presetId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const configState = location.state as CampaignNavState | null
  const campaignPreset = configState?.preset

  const [dmModel, setDmModel] = useState<string>(
    configState?.agents?.[0]?.model ?? ''
  )
  const [dmModelName, setDmModelName] = useState<string>(
    configState?.agents?.[0]?.name ?? ''
  )
  const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string }>>([])

  useEffect(() => {
    if (dmModel && !dmModelName) {
      const found = availableModels.find(m => m.model === dmModel)
      if (found) setDmModelName(found.name)
      else setDmModelName(dmModel.split('/').pop() ?? 'DM')
    }
  }, [dmModel, availableModels, dmModelName])

  // World settings
  const [rpgTone, setRpgTone] = useState<Tone>('cinematic')
  const [rpgSetting, setRpgSetting] = useState('Fantasy')
  const [rpgDifficulty, setRpgDifficulty] = useState<Difficulty>('normal')
  const [campaignHook, setCampaignHook] = useState('')

  // Party roster
  const [participants, setParticipants] = useState<RPGParticipant[]>([
    { name: 'Adventurer', model: 'human', role: 'player', char_class: 'Warrior', motivation: '' },
  ])

  // Pacing parameters -- initialized from Configure state, editable here
  const [rounds, setRounds] = useState<number>(configState?.rounds ?? 10)
  const [maxTokens, setMaxTokens] = useState<number>(configState?.maxTokens ?? 800)
  const [turnDelay, setTurnDelay] = useState<number>(configState?.turnDelay ?? 1)
  const [temperature, setTemperature] = useState<number>(0.8)

  const [starting, setStarting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch available models for NPC model selector
  useEffect(() => {
    api.getModels().then(res => setAvailableModels(res.models)).catch(() => {})
  }, [])

  // Auto-populate from campaign preset
  useEffect(() => {
    if (campaignPreset) {
      setRpgTone(campaignPreset.rpgTone)
      setRpgSetting(SETTING_MAP[campaignPreset.rpgSetting] ?? campaignPreset.rpgSetting)
      setRpgDifficulty(campaignPreset.rpgDifficulty)
      setCampaignHook(campaignPreset.campaignHook)
      setParticipants(
        campaignPreset.participantTemplate.map(p => ({
          name: p.name || '',
          model: p.model || 'human',
          role: p.role || 'player',
          char_class: p.char_class || 'Custom',
          motivation: p.motivation || '',
        }))
      )
    }
  }, [campaignPreset])

  function addParticipant() {
    setParticipants(prev => [
      ...prev,
      { name: '', model: 'human', role: 'player', char_class: 'Warrior', motivation: '' },
    ])
  }

  function removeParticipant(idx: number) {
    setParticipants(prev => prev.filter((_, i) => i !== idx))
  }

  function updateParticipant(idx: number, patch: Partial<RPGParticipant>) {
    setParticipants(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  async function handleLaunch() {
    if (!dmModel) {
      setFormError('Please select a Dungeon Master model above.')
      return
    }
    const unnamedMember = participants.find(p => !p.name.trim())
    if (unnamedMember) {
      setFormError('All party members must have a name before launching.')
      return
    }
    const emptyNpc = participants.find(p => p.role === 'npc' && (!p.model || p.model === 'human'))
    if (emptyNpc) {
      setFormError(`"${emptyNpc.name || 'An NPC'}" has no AI model assigned. Select a model for all NPC participants.`)
      return
    }
    setStarting(true)
    setFormError(null)
    try {
      const allParticipants: RPGParticipant[] = [
        { name: 'DM', model: dmModel, role: 'dm' },
        ...participants,
      ]
      // Explicit snake_case mapping -- spreading configState alone drops maxTokens/turnDelay
      const payload: RelayStartRequest = {
        ...configState,
        model_a: dmModel,
        model_b: dmModel,
        mode: 'rpg',
        rounds,
        max_tokens: maxTokens,
        temperature_a: temperature,
        temperature_b: temperature,
        turn_delay_seconds: turnDelay,
        seed: campaignHook.trim() || 'You are the Dungeon Master. Begin the adventure \u2014 set the scene for the party based on your campaign parameters.',

        // preset must be a string ID (not the full object that's in location.state)
        preset: campaignPreset?.id,
        // Explicit camelCase -> snake_case for Configure page settings (spread alone doesn't map these)
        system_prompt: configState?.systemPrompt,
        enable_scoring: configState?.enableScoring,
        enable_verdict: configState?.enableVerdict,
        enable_memory: configState?.enableMemory,
        observer_model: (configState?.observerModel && configState?.observerModel !== 'none') ? configState.observerModel : null,
        observer_interval: configState?.observerInterval,
        judge_model: (configState?.judgeModel && configState?.judgeModel !== 'auto') ? configState.judgeModel : null,
        participants: allParticipants,
        rpg_config: {
          tone: rpgTone,
          setting: rpgSetting.toLowerCase().replace('-', ''),
          difficulty: rpgDifficulty,
          campaign_hook: campaignHook,
        },
      }
      const res = await api.startRelay(payload)
      navigate(`/rpg/${res.match_id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start campaign')
    } finally {
      setStarting(false)
    }
  }

  const btnGroup = (active: boolean) =>
    `font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-sm border transition-colors ${
      active
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
        : 'bg-transparent border-border-custom/40 text-text-dim/60 hover:border-accent/40 hover:text-text-dim'
    }`

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div>
        <Link
          to="/rpg-hub"
          className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase"
        >
          &larr; RPG Hub
        </Link>
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary mt-4">
          Campaign Setup
        </h1>
        {campaignPreset && (
          <p className="font-mono text-[10px] text-emerald-400/60 mt-1 tracking-wider">
            // {campaignPreset.name}
          </p>
        )}
        <p className="font-mono text-[10px] text-text-dim mt-1 tracking-wider">
          <span className="text-accent/60">// </span>configure the world, party, and pacing before launching
        </p>
      </div>

      {/* Two-column: World + Party */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: World Settings */}
        <div className="neural-card">
          <div className="neural-card-bar" />
          <div className="p-6 space-y-6">
            <div className="neural-section-label">// world_settings</div>

            {/* Tone */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Tone
              </label>
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // narrative mood for the campaign
              </p>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map(t => (
                  <button key={t} type="button" onClick={() => setRpgTone(t)} className={btnGroup(rpgTone === t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Setting */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Setting
              </label>
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // world genre and backdrop
              </p>
              <div className="flex flex-wrap gap-2">
                {SETTING_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setRpgSetting(s)} className={btnGroup(rpgSetting === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Difficulty
              </label>
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // stakes and DM lethality
              </p>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d} type="button" onClick={() => setRpgDifficulty(d)} className={`flex-1 ${btnGroup(rpgDifficulty === d)}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Hook */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Campaign Hook
              </label>
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // opening premise injected into the DM&apos;s context
              </p>
              <textarea
                value={campaignHook}
                onChange={e => setCampaignHook(e.target.value)}
                rows={5}
                maxLength={500}
                className="w-full resize-none bg-bg-deep/80 border border-border-custom/50 rounded-sm px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-dim/30"
                placeholder="A dark wizard has stolen the sacred flame from the village temple..."
              />
              <div className="text-right font-mono text-[9px] text-text-dim/40">
                {campaignHook.length}/500
              </div>
            </div>
          </div>
        </div>

        {/* Right: Party */}
        <div className="neural-card">
          <div className="neural-card-bar" />
          <div className="p-6 space-y-6">
            <div className="neural-section-label flex items-center justify-between">
              <span>// party</span>
              <button
                type="button"
                onClick={addParticipant}
                className="font-mono text-[9px] text-emerald-400/60 hover:text-emerald-400 tracking-wider uppercase transition-colors"
              >
                + Add Member
              </button>
            </div>

            {/* DM Selection */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Dungeon Master Model
              </label>
              <Select
                value={dmModel}
                onValueChange={(v) => {
                  setDmModel(v)
                  const found = availableModels.find(m => m.model === v)
                  if (found) setDmModelName(found.name)
                }}
              >
                <SelectTrigger className="font-mono text-xs border-emerald-500/30 bg-emerald-500/5 text-emerald-400">
                  <SelectValue placeholder="Select DM Model..." />
                </SelectTrigger>
                <SelectContent>
                  {availableModels
                    .filter(m => !DM_BLOCKED_MODELS.some(blocked => m.model.startsWith(blocked)))
                    .map(m => (
                      <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // guides the narrative and controls NPCs
              </p>
            </div>

            {/* Party members */}
            {participants.map((p, i) => (
              <div
                key={i}
                className="p-3 border border-border-custom/40 rounded-sm bg-bg-deep/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase">
                    {p.role === 'npc' ? 'NPC' : 'Player'} {i + 1}
                  </span>
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(i)}
                      className="font-mono text-[10px] text-danger/50 hover:text-danger transition-colors font-symbol"
                      title="Remove"
                      aria-label="Remove participant"
                    >
                      &#10005;
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">
                      Name
                    </label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => updateParticipant(i, { name: e.target.value })}
                      className="w-full bg-bg-deep/80 border border-border-custom/50 rounded-sm px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-dim/30"
                      placeholder="Character name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">
                      Class
                    </label>
                    <Select
                      value={p.char_class ?? 'Warrior'}
                      onValueChange={v => updateParticipant(i, { char_class: v })}
                    >
                      <SelectTrigger className="font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_OPTIONS.map(c => (
                          <SelectItem key={c} value={c} className="font-mono text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">
                      Role
                    </label>
                    <Select
                      value={p.role}
                      onValueChange={v =>
                        updateParticipant(i, {
                          role: v as 'player' | 'npc',
                          model: v === 'player' ? 'human' : dmModel,
                        })
                      }
                    >
                      <SelectTrigger className="font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player" className="font-mono text-xs">
                          Player (Human)
                        </SelectItem>
                        <SelectItem value="npc" className="font-mono text-xs">
                          NPC (AI)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">
                      Controlled by
                    </label>
                    {p.role === 'player' ? (
                      <div className="bg-bg-deep/80 border border-emerald-500/20 rounded-sm px-2 py-1.5 font-mono text-xs text-emerald-400/70">
                        Human
                      </div>
                    ) : (
                      <Select
                        value={p.model && p.model !== 'auto' ? p.model : dmModel}
                        onValueChange={v => updateParticipant(i, { model: v })}
                      >
                        <SelectTrigger className="font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map(m => (
                            <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">
                    Drive / Motivation
                  </label>
                  <input
                    type="text"
                    value={p.motivation ?? ''}
                    onChange={e => updateParticipant(i, { motivation: e.target.value })}
                    className="w-full bg-bg-deep/80 border border-border-custom/50 rounded-sm px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-dim/30"
                    placeholder="Seeking revenge for a fallen mentor..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pacing Parameters */}
      <div className="neural-card">
        <div className="neural-card-bar" />
        <div className="p-6 space-y-4">
          <div className="neural-section-label">// pacing_parameters</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">
                  Rounds
                </label>
                <span className="font-mono text-xs text-emerald-400">{rounds}</span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                value={rounds}
                onChange={e => setRounds(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">// total story beats</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">
                  Turn Delay
                </label>
                <span className="font-mono text-xs text-emerald-400">{turnDelay}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={turnDelay}
                onChange={e => setTurnDelay(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">// pause between turns</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">
                  Max Tokens
                </label>
                <span className="font-mono text-xs text-emerald-400">{maxTokens}</span>
              </div>
              <input
                type="range"
                min={200}
                max={2000}
                step={50}
                value={maxTokens}
                onChange={e => setMaxTokens(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">// response length cap</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">
                  Temperature
                </label>
                <span className="font-mono text-xs text-emerald-400">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">// narrative creativity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {formError && (
        <p className="font-mono text-xs text-danger">// {formError}</p>
      )}

      {/* Sticky launch bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border-custom/40 bg-bg-surface/95 backdrop-blur-sm px-6 py-4 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {campaignPreset && (
              <span className="font-mono text-[10px] text-text-dim/60 tracking-wider truncate hidden sm:block">
                // {campaignPreset.name}
              </span>
            )}
            <span className="font-mono text-[10px] text-emerald-400/60 shrink-0">
              DM: {dmModelName || 'none'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/rpg-hub">
              <Button variant="outline" className="font-mono text-xs tracking-widest uppercase">
                &larr; Back
              </Button>
            </Link>
            <Button
              onClick={handleLaunch}
              disabled={starting || !dmModel}
              className="bg-emerald-600 hover:bg-emerald-500 font-display font-bold tracking-widest text-xs uppercase px-6"
            >
              {starting ? '// Launching...' : 'Begin Campaign \u2192'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
