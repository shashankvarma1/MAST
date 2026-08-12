import { supabase } from './supabase'
import { ReactionInput } from '@/types'

export async function logReaction(data: ReactionInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: reaction, error } = await supabase
    .from('reactions')
    .insert({
      user_id: user.id,
      severity: data.severity,
      mss_score: data.mssScore,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  if (data.triggerKeys.length > 0) {
    await supabase.from('reaction_triggers').insert(
      data.triggerKeys.map(t => ({ reaction_id: reaction.id, trigger_key: t }))
    )
  }

  if (data.symptoms.length > 0) {
    await supabase.from('reaction_symptoms').insert(
      data.symptoms.map(s => ({
        reaction_id: reaction.id,
        symptom_key: s.id,
        body_system: s.system,
      }))
    )
  }

  return reaction
}