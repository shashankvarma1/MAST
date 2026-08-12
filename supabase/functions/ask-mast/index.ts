import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { question, reactions, triggers, symptoms } = await req.json()

    const trigCount: Record<string, number> = {}
    triggers.forEach((t: any) => { trigCount[t.trigger_key] = (trigCount[t.trigger_key] || 0) + 1 })

    const symCount: Record<string, number> = {}
    symptoms.forEach((s: any) => { symCount[s.symptom_key] = (symCount[s.symptom_key] || 0) + 1 })

    const context = `You are MAST, an AI assistant for an MCAS (Mast Cell Activation Syndrome) patient tracking app.

CRITICAL DISCLAIMERS — always follow these:
- You are NOT a doctor and cannot diagnose, prescribe, or provide medical advice
- MSS scores are patient-reported outcome measures, not validated diagnostic tools
- Always recommend the patient discuss findings with their healthcare provider
- This app is a tracking and pattern recognition tool only

PATIENT DATA CONTEXT:
- Total reactions logged: ${reactions.length}
- Average severity: ${reactions.length ? (reactions.reduce((a: number, r: any) => a + r.severity, 0) / reactions.length).toFixed(1) : '—'}/10
- Top triggers: ${Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v}x)`).join(', ') || 'none'}
- Top symptoms: ${Object.entries(symCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v}x)`).join(', ') || 'none'}
- Recent severity trend: ${reactions.slice(-5).map((r: any) => r.severity).join(', ') || 'no data'}

Answer the patient's question using their data. Be concise, warm, and always remind them to discuss findings with their doctor. Never diagnose or prescribe.`

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
        messages: [
          { role: 'user', content: `${context}\n\nPatient question: ${question}` }
        ],
      }),
    })

    const data = await response.json()
    const answer = data.content?.[0]?.text ?? 'Unable to generate response.'

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})