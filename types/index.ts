export type BodySystem = 'skin' | 'respiratory' | 'gi' | 'cardiac' | 'neuro' | 'systemic'

export interface Trigger {
  id: string
  label: string
  icon: string
}

export interface Symptom {
  id: string
  label: string
  system: BodySystem
}

export interface ReactionInput {
  severity: number
  mssScore: number
  triggerKeys: string[]
  symptoms: { id: string; system: BodySystem }[]
  notes: string
}

export interface Reaction {
  id: string
  user_id: string
  created_at: string
  severity: number
  mss_score: number
  notes: string | null
}