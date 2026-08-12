import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { reactions, topTriggers, topSymptoms, topSystems, goals, patientName } = await req.json()

    const prompt = `You are a clinical documentation assistant helping an MCAS (Mast Cell Activation Syndrome) patient prepare a report for their doctor.

IMPORTANT DISCLAIMERS TO INCLUDE:
- This report is patient-generated and not a clinical diagnosis
- MSS (Mast Cell Symptom Severity Score) is a patient-reported outcome measure, not a validated diagnostic tool
- All data is self-reported and should be interpreted alongside clinical assessment
- MAST is a symptom tracking tool only — it does not provide medical advice

Patient: ${patientName}
Report date: ${new Date().toLocaleDateString()}

PATIENT GOALS FOR THIS APPOINTMENT:
${goals.filter((g: string) => g.trim()).map((g: string, i: number) => `${i + 1}. ${g}`).join('\n') || 'No goals specified'}

REACTION DATA SUMMARY:
- Total reactions logged: ${reactions.length}
- Average severity: ${reactions.length ? (reactions.reduce((a: number, r: any) => a + r.severity, 0) / reactions.length).toFixed(1) : '—'}/10
- Date range: ${reactions.length >= 2 ? `${new Date(reactions[0].created_at).toLocaleDateString()} to ${new Date(reactions[reactions.length - 1].created_at).toLocaleDateString()}` : 'insufficient data'}
- Last MSS score: ${reactions.length ? reactions[reactions.length - 1].mss_score + '/4' : '—'}

TOP TRIGGERS (by frequency):
${topTriggers.map(([key, count]: [string, number]) => `- ${key}: ${count} reactions`).join('\n') || 'None logged'}

TOP BODY SYSTEMS AFFECTED:
${topSystems.map(([sys, count]: [string, number]) => `- ${sys}: ${count} symptom occurrences`).join('\n') || 'None logged'}

TOP SYMPTOMS:
${topSymptoms.map((s: any) => `- ${s.name} (${s.system}): ${s.count} occurrences`).join('\n') || 'None logged'}

Write a structured clinical narrative with exactly 3 sections:

1. PATIENT GOALS — Restate the patient's goals for this appointment in clinical language
2. PATTERN SUMMARY — A concise clinical summary of the reaction patterns, trigger correlations, and body systems involved
3. SUGGESTED DISCUSSION POINTS — 3-5 specific questions or topics the patient should raise with their clinician based on this data

Keep language professional but accessible. Be factual, not dramatic. Include the disclaimers naturally within the report footer.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const narrative = data.content?.[0]?.text ?? 'Unable to generate narrative.'

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})