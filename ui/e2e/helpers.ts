import type { APIRequestContext } from '@playwright/test'

export interface Experiment {
  id: string
  status: string
  winner: string | null
  verdict_reasoning: string | null
  model_a: string
  model_b: string
}

const API = 'http://localhost:8000/api'

/** Returns the first completed experiment, or null if none exist. */
export async function findCompleted(request: APIRequestContext): Promise<Experiment | null> {
  const res = await request.get(`${API}/experiments/?status=completed&limit=5`)
  if (!res.ok()) return null
  const data = await res.json()
  return (data.experiments as Experiment[])[0] ?? null
}

/** Returns the first completed experiment WITH a verdict (winner set), or null. */
export async function findWithVerdict(request: APIRequestContext): Promise<Experiment | null> {
  const exp = await findCompleted(request)
  if (!exp || !exp.winner) return null
  return exp
}

/** Returns the first running experiment, or null. */
export async function findRunning(request: APIRequestContext): Promise<Experiment | null> {
  const res = await request.get(`${API}/experiments/?status=running&limit=5`)
  if (!res.ok()) return null
  const data = await res.json()
  return (data.experiments as Experiment[])[0] ?? null
}

/** Returns any experiment (any status), or null if DB is empty. */
export async function findAny(request: APIRequestContext): Promise<Experiment | null> {
  const res = await request.get(`${API}/experiments/?limit=5`)
  if (!res.ok()) return null
  const data = await res.json()
  return (data.experiments as Experiment[])[0] ?? null
}
