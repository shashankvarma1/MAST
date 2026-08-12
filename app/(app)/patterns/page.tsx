'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Reaction {
  id: string
  created_at: string
  severity: number
  mss_score: number
}

interface TriggerRow { reaction_id: string; trigger_key: string }
interface SymptomRow { reaction_id: string; symptom_key: string; body_system: string }

interface InsightCard {
  type: 'warning' | 'info' | 'pattern'
  title: string
  body: string
}

const TRIGGER_LABELS: Record<string, string> = {
  food: 'Food', fragrance: 'Fragrance', heat: 'Heat', cold: 'Cold',
  stress: 'Stress', exercise: 'Exercise', medication: 'Medication',
  mold: 'Mold/Dust', alcohol: 'Alcohol', vibration: 'Vibration',
}

const SYSTEM_COLORS: Record<string, string> = {
  skin: '#d4a85a', respiratory: '#6ab0c5', gi: '#8fba7a',
  cardiac: '#e07a7a', neuro: '#a78bca', systemic: '#aaaaaa',
}

const INSIGHT_COLORS = {
  warning: { bg: '#e07a7a18', border: '#e07a7a', dot: '#e07a7a' },
  info: { bg: '#6ab0c518', border: '#6ab0c5', dot: '#6ab0c5' },
  pattern: { bg: '#d4a85a18', border: '#d4a85a', dot: '#d4a85a' },
}

export default function PatternsPage() {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [triggers, setTriggers] = useState<TriggerRow[]>([])
  const [symptoms, setSymptoms] = useState<SymptomRow[]>([])
  const [insights, setInsights] = useState<InsightCard[]>([])
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: rxns } = await supabase
      .from('reactions')
      .select('*')
      .order('created_at', { ascending: true })

    if (!rxns || rxns.length === 0) { setLoading(false); return }

    setReactions(rxns)
    const ids = rxns.map((r: Reaction) => r.id)

    const { data: trigs } = await supabase
      .from('reaction_triggers')
      .select('reaction_id, trigger_key')
      .in('reaction_id', ids)

    const { data: syms } = await supabase
      .from('reaction_symptoms')
      .select('reaction_id, symptom_key, body_system')
      .in('reaction_id', ids)

    const t = trigs || []
    const s = syms || []

    setTriggers(t)
    setSymptoms(s)
    setInsights(generateInsights(rxns, t, s))
    setLoading(false)
  }

  function generateInsights(
    rxns: Reaction[],
    trigs: TriggerRow[],
    syms: SymptomRow[]
  ): InsightCard[] {
    const cards: InsightCard[] = []
    if (rxns.length < 3) {
      cards.push({ type: 'info', title: 'Keep logging', body: 'Log at least 3 reactions to start seeing patterns.' })
      return cards
    }

    // Avg severity
    const avg = rxns.reduce((a, r) => a + r.severity, 0) / rxns.length
    if (avg >= 7) {
      cards.push({ type: 'warning', title: 'High average severity', body: `Your average reaction severity is ${avg.toFixed(1)}/10. Consider discussing this trend with your doctor.` })
    }

    // Most common trigger
    const trigCount: Record<string, number> = {}
    trigs.forEach(t => { trigCount[t.trigger_key] = (trigCount[t.trigger_key] || 0) + 1 })
    const topTrig = Object.entries(trigCount).sort((a, b) => b[1] - a[1])[0]
    if (topTrig) {
      const pct = Math.round((topTrig[1] / rxns.length) * 100)
      cards.push({
        type: 'pattern',
        title: `${TRIGGER_LABELS[topTrig[0]] || topTrig[0]} is your top trigger`,
        body: `Present in ${pct}% of your reactions (${topTrig[1]} of ${rxns.length}).`
      })
    }

    // Co-occurrence: find trigger pairs that lead to high severity
    const trigsByReaction: Record<string, string[]> = {}
    trigs.forEach(t => {
      if (!trigsByReaction[t.reaction_id]) trigsByReaction[t.reaction_id] = []
      trigsByReaction[t.reaction_id].push(t.trigger_key)
    })

    const pairSeverity: Record<string, { total: number; count: number }> = {}
    rxns.forEach(r => {
      const rTrigs = trigsByReaction[r.id] || []
      for (let i = 0; i < rTrigs.length; i++) {
        for (let j = i + 1; j < rTrigs.length; j++) {
          const pair = [rTrigs[i], rTrigs[j]].sort().join('+')
          if (!pairSeverity[pair]) pairSeverity[pair] = { total: 0, count: 0 }
          pairSeverity[pair].total += r.severity
          pairSeverity[pair].count++
        }
      }
    })

    const dangerPair = Object.entries(pairSeverity)
      .filter(([, v]) => v.count >= 2)
      .map(([pair, v]) => ({ pair, avg: v.total / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg)[0]

    if (dangerPair && dangerPair.avg >= 6) {
      const [a, b] = dangerPair.pair.split('+')
      cards.push({
        type: 'warning',
        title: `${TRIGGER_LABELS[a] || a} + ${TRIGGER_LABELS[b] || b} = high severity`,
        body: `When these two triggers combine, your average severity is ${dangerPair.avg.toFixed(1)}/10 across ${dangerPair.count} reactions.`
      })
    }

    // Most affected body system
    const systemCount: Record<string, number> = {}
    syms.forEach(s => { systemCount[s.body_system] = (systemCount[s.body_system] || 0) + 1 })
    const topSystem = Object.entries(systemCount).sort((a, b) => b[1] - a[1])[0]
    if (topSystem) {
      cards.push({
        type: 'info',
        title: `${topSystem[0].charAt(0).toUpperCase() + topSystem[0].slice(1)} system most affected`,
        body: `${topSystem[1]} symptom occurrences logged in your ${topSystem[0]} system across all reactions.`
      })
    }

    // Time of day pattern
    const hourBuckets: Record<string, number[]> = { morning: [], afternoon: [], evening: [], night: [] }
    rxns.forEach(r => {
      const h = new Date(r.created_at).getHours()
      if (h >= 5 && h < 12) hourBuckets.morning.push(r.severity)
      else if (h >= 12 && h < 17) hourBuckets.afternoon.push(r.severity)
      else if (h >= 17 && h < 21) hourBuckets.evening.push(r.severity)
      else hourBuckets.night.push(r.severity)
    })

    const worstTime = Object.entries(hourBuckets)
      .filter(([, v]) => v.length > 0)
      .map(([label, v]) => ({ label, avg: v.reduce((a, b) => a + b, 0) / v.length, count: v.length }))
      .sort((a, b) => b.avg - a.avg)[0]

    if (worstTime && worstTime.count >= 2) {
      cards.push({
        type: 'pattern',
        title: `Reactions worse in the ${worstTime.label}`,
        body: `Your ${worstTime.label} reactions average ${worstTime.avg.toFixed(1)}/10 severity across ${worstTime.count} logged reactions.`
      })
    }

    return cards
  }

  // Drill-down: reactions for selected trigger
  const triggerReactionIds = selectedTrigger
    ? new Set(triggers.filter(t => t.trigger_key === selectedTrigger).map(t => t.reaction_id))
    : null

  const drillReactions = triggerReactionIds
    ? reactions.filter(r => triggerReactionIds.has(r.id))
    : []

  const drillAvg = drillReactions.length
    ? (drillReactions.reduce((a, r) => a + r.severity, 0) / drillReactions.length).toFixed(1)
    : null

  // Drill-down: symptom breakdown for selected trigger
  const drillSymptoms = triggerReactionIds
    ? symptoms.filter(s => triggerReactionIds.has(s.reaction_id))
    : []

  const drillSymptomCount: Record<string, { count: number; system: string }> = {}
  drillSymptoms.forEach(s => {
    if (!drillSymptomCount[s.symptom_key]) drillSymptomCount[s.symptom_key] = { count: 0, system: s.body_system }
    drillSymptomCount[s.symptom_key].count++
  })

  const drillSymptomList = Object.entries(drillSymptomCount)
    .map(([name, { count, system }]) => ({ name, count, system }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // System drill-down
  const systemReactionIds = selectedSystem
    ? new Set(symptoms.filter(s => s.body_system === selectedSystem).map(s => s.reaction_id))
    : null

  const systemSymptoms = selectedSystem
    ? symptoms.filter(s => s.body_system === selectedSystem)
    : []

  const systemSymptomCount: Record<string, number> = {}
  systemSymptoms.forEach(s => { systemSymptomCount[s.symptom_key] = (systemSymptomCount[s.symptom_key] || 0) + 1 })

  const systemSymptomList = Object.entries(systemSymptomCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // All unique triggers in data
  const uniqueTriggers = [...new Set(triggers.map(t => t.trigger_key))]
  const uniqueSystems = [...new Set(symptoms.map(s => s.body_system))]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555', fontFamily: 'monospace' }}>Loading...</p>
    </div>
  )

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.logo}>MAST</span>
      </div>

      <div style={s.content}>
        <p style={s.meta}>INTELLIGENCE</p>
        <h1 style={s.title}>Your patterns</h1>

        {reactions.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No data yet</p>
            <p style={s.emptySub}>Log at least 3 reactions to see patterns</p>
          </div>
        ) : (
          <>
            {/* Auto insights */}
            <p style={s.sectionLabel}>AUTO INSIGHTS</p>
            <div style={s.insightList}>
              {insights.map((ins, i) => {
                const colors = INSIGHT_COLORS[ins.type]
                return (
                  <div key={i} style={{ ...s.insightCard, background: colors.bg, borderColor: colors.border }}>
                    <div style={{ ...s.insightDot, background: colors.dot }} />
                    <div>
                      <p style={s.insightTitle}>{ins.title}</p>
                      <p style={s.insightBody}>{ins.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trigger drill-down */}
            <p style={{ ...s.sectionLabel, marginTop: 32 }}>DRILL DOWN BY TRIGGER</p>
            <div style={s.chipRow}>
              {uniqueTriggers.map(t => (
                <button
                  key={t}
                  style={{ ...s.chip, ...(selectedTrigger === t ? s.chipActive : {}) }}
                  onClick={() => setSelectedTrigger(selectedTrigger === t ? null : t)}
                >
                  {TRIGGER_LABELS[t] || t}
                </button>
              ))}
            </div>

            {selectedTrigger && (
              <div style={s.drillCard}>
                <p style={s.drillTitle}>{TRIGGER_LABELS[selectedTrigger] || selectedTrigger}</p>
                <div style={s.drillStats}>
                  <div style={s.drillStat}>
                    <span style={s.drillStatVal}>{drillReactions.length}</span>
                    <span style={s.drillStatLabel}>reactions</span>
                  </div>
                  <div style={s.drillStat}>
                    <span style={s.drillStatVal}>{drillAvg}</span>
                    <span style={s.drillStatLabel}>avg severity</span>
                  </div>
                  <div style={s.drillStat}>
                    <span style={s.drillStatVal}>{Math.round((drillReactions.length / reactions.length) * 100)}%</span>
                    <span style={s.drillStatLabel}>of reactions</span>
                  </div>
                </div>

                {drillSymptomList.length > 0 && (
                  <>
                    <p style={s.drillSubLabel}>TOP SYMPTOMS WITH THIS TRIGGER</p>
                    {drillSymptomList.map((sym, i) => (
                      <div key={i} style={s.drillSymRow}>
                        <span style={{ ...s.drillSymDot, background: SYSTEM_COLORS[sym.system] || '#555' }} />
                        <span style={s.drillSymName}>{sym.name}</span>
                        <div style={s.drillSymTrack}>
                          <div style={{
                            ...s.drillSymFill,
                            width: `${(sym.count / drillSymptomList[0].count) * 100}%`,
                            background: SYSTEM_COLORS[sym.system] || '#555',
                          }} />
                        </div>
                        <span style={s.drillSymCount}>{sym.count}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* System drill-down */}
            <p style={{ ...s.sectionLabel, marginTop: 32 }}>DRILL DOWN BY BODY SYSTEM</p>
            <div style={s.chipRow}>
              {uniqueSystems.map(sys => (
                <button
                  key={sys}
                  style={{
                    ...s.chip,
                    ...(selectedSystem === sys ? {
                      borderColor: SYSTEM_COLORS[sys],
                      background: SYSTEM_COLORS[sys] + '18',
                      color: '#f0ece4',
                    } : {})
                  }}
                  onClick={() => setSelectedSystem(selectedSystem === sys ? null : sys)}
                >
                  {sys}
                </button>
              ))}
            </div>

            {selectedSystem && (
              <div style={s.drillCard}>
                <p style={s.drillTitle} style={{ color: SYSTEM_COLORS[selectedSystem] }}>
                  {selectedSystem.charAt(0).toUpperCase() + selectedSystem.slice(1)} system
                </p>
                <p style={s.drillSubLabel}>SYMPTOMS LOGGED</p>
                {systemSymptomList.map((sym, i) => (
                  <div key={i} style={s.drillSymRow}>
                    <span style={{ ...s.drillSymDot, background: SYSTEM_COLORS[selectedSystem] }} />
                    <span style={s.drillSymName}>{sym.name}</span>
                    <div style={s.drillSymTrack}>
                      <div style={{
                        ...s.drillSymFill,
                        width: `${(sym.count / systemSymptomList[0].count) * 100}%`,
                        background: SYSTEM_COLORS[selectedSystem],
                      }} />
                    </div>
                    <span style={s.drillSymCount}>{sym.count}</span>
                  </div>
                ))}
                <p style={{ ...s.drillSubLabel, marginTop: 16 }}>
                  Affected in {systemReactionIds?.size} of {reactions.length} reactions ({Math.round(((systemReactionIds?.size || 0) / reactions.length) * 100)}%)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0d0d0d', color: '#f0ece4', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' },
  logo: { fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: '0.2em', color: '#d4a85a' },
  content: { padding: '8px 24px 48px' },
  meta: { fontSize: 11, letterSpacing: '0.2em', color: '#d4a85a', marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 24 },
  sectionLabel: { fontSize: 11, letterSpacing: '0.15em', color: '#555', marginBottom: 12, fontFamily: "'DM Mono', monospace" },
  insightList: { display: 'flex', flexDirection: 'column', gap: 10 },
  insightCard: { display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid', borderRadius: 12, padding: '14px 16px' },
  insightDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  insightTitle: { fontSize: 14, fontWeight: 600, color: '#f0ece4', marginBottom: 4 },
  insightBody: { fontSize: 13, color: '#aaa', lineHeight: 1.5 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { padding: '7px 14px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 20, color: '#aaa', fontSize: 13, cursor: 'pointer' },
  chipActive: { borderColor: '#d4a85a', background: '#d4a85a18', color: '#f0ece4' },
  drillCard: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 8 },
  drillTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#d4a85a' },
  drillStats: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 },
  drillStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  drillStatVal: { fontSize: 22, fontWeight: 700, color: '#f0ece4' },
  drillStatLabel: { fontSize: 11, color: '#555', letterSpacing: '0.05em' },
  drillSubLabel: { fontSize: 10, letterSpacing: '0.15em', color: '#555', marginBottom: 12, fontFamily: "'DM Mono', monospace" },
  drillSymRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  drillSymDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  drillSymName: { fontSize: 13, color: '#aaa', width: 110, flexShrink: 0 },
  drillSymTrack: { flex: 1, height: 5, background: '#222', borderRadius: 3, overflow: 'hidden' },
  drillSymFill: { height: '100%', borderRadius: 3 },
  drillSymCount: { fontSize: 12, color: '#555', width: 20, textAlign: 'right' },
  empty: { textAlign: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: '#aaa', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#555' },
}