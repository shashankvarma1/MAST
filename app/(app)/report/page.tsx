'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AIDisclaimer from '@/components/ui/AIDisclaimer'

interface Reaction {
  id: string
  created_at: string
  severity: number
  mss_score: number
  notes: string | null
}

interface TriggerRow { reaction_id: string; trigger_key: string }
interface SymptomRow { reaction_id: string; symptom_key: string; body_system: string }

const TRIGGER_LABELS: Record<string, string> = {
  food: 'Food', fragrance: 'Fragrance', heat: 'Heat', cold: 'Cold',
  stress: 'Stress', exercise: 'Exercise', medication: 'Medication',
  mold: 'Mold/Dust', alcohol: 'Alcohol', vibration: 'Vibration',
}

const SYSTEM_COLORS: Record<string, string> = {
  skin: '#d4a85a', respiratory: '#6ab0c5', gi: '#8fba7a',
  cardiac: '#e07a7a', neuro: '#a78bca', systemic: '#aaaaaa',
}

export default function ReportPage() {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [triggers, setTriggers] = useState<TriggerRow[]>([])
  const [symptoms, setSymptoms] = useState<SymptomRow[]>([])
  const [goals, setGoals] = useState(['', '', ''])
  const [profileName, setProfileName] = useState('')
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [narrative, setNarrative] = useState('')
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [narrativeError, setNarrativeError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (profile) setProfileName(profile.display_name || user.email || '')

    const { data: rxns } = await supabase
      .from('reactions')
      .select('*')
      .order('created_at', { ascending: true })

    if (!rxns) { setLoading(false); return }
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

    setTriggers(trigs || [])
    setSymptoms(syms || [])
    setLoading(false)
  }

  // Compute stats
  const avg = reactions.length
    ? (reactions.reduce((a, r) => a + r.severity, 0) / reactions.length).toFixed(1)
    : '—'

  const trigCount: Record<string, number> = {}
  triggers.forEach(t => { trigCount[t.trigger_key] = (trigCount[t.trigger_key] || 0) + 1 })
  const topTriggers = Object.entries(trigCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const systemCount: Record<string, number> = {}
  symptoms.forEach(s => { systemCount[s.body_system] = (systemCount[s.body_system] || 0) + 1 })
  const topSystems = Object.entries(systemCount)
    .sort((a, b) => b[1] - a[1])

  const symptomCount: Record<string, { count: number; system: string }> = {}
  symptoms.forEach(s => {
    if (!symptomCount[s.symptom_key]) symptomCount[s.symptom_key] = { count: 0, system: s.body_system }
    symptomCount[s.symptom_key].count++
  })
  const topSymptoms = Object.entries(symptomCount)
    .map(([name, { count, system }]) => ({ name, count, system }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const dateRange = reactions.length >= 2
    ? `${new Date(reactions[0].created_at).toLocaleDateString()} – ${new Date(reactions[reactions.length - 1].created_at).toLocaleDateString()}`
    : reactions.length === 1
      ? new Date(reactions[0].created_at).toLocaleDateString()
      : '—'

  async function generateNarrative() {
    setNarrativeLoading(true)
    setNarrativeError('')

    const { data: { session } } = await supabase.auth.getSession()

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            reactions,
            topTriggers,
            topSymptoms,
            topSystems,
            goals,
            patientName: profileName,
          }),
        }
      )
      const data = await res.json()
      if (data.error) setNarrativeError(data.error)
      else setNarrative(data.narrative)
    } catch (e: any) {
      setNarrativeError(e.message)
    } finally {
      setNarrativeLoading(false)
    }
  }

  const handlePrint = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 300)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555', fontFamily: 'monospace' }}>Loading...</p>
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-root { background: white !important; color: #111 !important; max-width: 100% !important; padding: 40px !important; }
          .print-card { background: #f9f9f9 !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div style={s.root} className="print-root">

        {/* Header */}
        <div style={s.header} className="no-print">
          <span style={s.logo}>MAST</span>
          <button style={s.printBtn} onClick={handlePrint} disabled={printing}>
            {printing ? 'Preparing...' : '↓ Export PDF'}
          </button>
        </div>

        <div style={s.content}>

          {/* Print-only header */}
          <div style={{ display: 'none' }} className="print-show">
            <p style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>MAST — MCAS Patient Report</p>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 32 }}>Generated {new Date().toLocaleDateString()}</p>
          </div>

          <p style={s.meta} className="no-print">CLINICIAN REPORT</p>
          <h1 style={s.title} className="no-print">Patient summary</h1>

          {/* Section 01 — Goals */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionNum}>01</span>
              <div>
                <p style={s.sectionTitle}>Patient goals</p>
                <p style={s.sectionSub}>What the patient wants to achieve from this appointment</p>
              </div>
            </div>
            <div style={s.goalsCard} className="print-card">
              {goals.map((g, i) => (
                <div key={i} style={s.goalRow}>
                  <span style={s.goalNum}>{i + 1}</span>
                  <input
                    className="no-print"
                    placeholder={[
                      'e.g. Identify my top 3 triggers',
                      'e.g. Reduce reaction frequency',
                      'e.g. Find medications that help',
                    ][i]}
                    value={g}
                    onChange={e => {
                      const next = [...goals]
                      next[i] = e.target.value
                      setGoals(next)
                    }}
                    style={s.goalInput}
                  />
                  {g && <p style={s.goalPrint}>{g}</p>}
                </div>
              ))}
              <p style={{ ...s.goalHint, marginTop: 8 }} className="no-print">
                Fill these in before your appointment
              </p>
            </div>
          </div>

          {/* Section AI — Narrative */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionNum}>AI</span>
              <div>
                <p style={s.sectionTitle}>AI clinical narrative</p>
                <p style={s.sectionSub}>Claude summarizes your data into a clinician-ready narrative</p>
              </div>
            </div>
            <AIDisclaimer />
            {!narrative ? (
              <button
                style={{
                  ...s.printBtn,
                  width: '100%',
                  padding: 16,
                  fontSize: 15,
                  borderRadius: 12,
                  opacity: narrativeLoading || reactions.length === 0 ? 0.5 : 1,
                }}
                onClick={generateNarrative}
                disabled={narrativeLoading || reactions.length === 0}
              >
                {narrativeLoading ? 'Generating...' : '✦ Generate AI narrative'}
              </button>
            ) : (
              <div style={s.narrativeCard} className="print-card">
                {narrative.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p
                    key={i}
                    style={line.match(/^[A-Z][A-Z\s]+:?$/) ? s.narrativeHeading : s.narrativePara}
                  >
                    {line}
                  </p>
                ))}
                <button
                  style={s.regenBtn}
                  onClick={generateNarrative}
                  disabled={narrativeLoading}
                  className="no-print"
                >
                  {narrativeLoading ? 'Regenerating...' : '↺ Regenerate'}
                </button>
              </div>
            )}
            {narrativeError && (
              <p style={{ color: '#e07a7a', fontSize: 13, marginTop: 8 }}>{narrativeError}</p>
            )}
          </div>

          {/* Section 02 — Overview */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionNum}>02</span>
              <div>
                <p style={s.sectionTitle}>Reaction overview</p>
                <p style={s.sectionSub}>Summary of logged reactions using MSS scoring</p>
              </div>
            </div>
            <div style={s.statsGrid} className="print-card">
              <div style={s.statBlock}>
                <p style={s.statVal}>{reactions.length}</p>
                <p style={s.statLabel}>Total reactions logged</p>
              </div>
              <div style={s.statBlock}>
                <p style={s.statVal}>{avg}<span style={s.statUnit}>/10</span></p>
                <p style={s.statLabel}>Average severity</p>
              </div>
              <div style={s.statBlock}>
                <p style={s.statVal}>{dateRange}</p>
                <p style={s.statLabel}>Date range</p>
              </div>
              <div style={s.statBlock}>
                <p style={s.statVal}>
                  {reactions.length ? reactions[reactions.length - 1].mss_score : '—'}
                  <span style={s.statUnit}>/4</span>
                </p>
                <p style={s.statLabel}>Last MSS score</p>
              </div>
            </div>
          </div>

          {/* Section 03 — Top triggers */}
          {topTriggers.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <span style={s.sectionNum}>03</span>
                <div>
                  <p style={s.sectionTitle}>Top triggers</p>
                  <p style={s.sectionSub}>Most frequent exposure factors preceding reactions</p>
                </div>
              </div>
              <div style={s.listCard} className="print-card">
                {topTriggers.map(([key, count], i) => (
                  <div key={key} style={{ ...s.listRow, borderBottom: i < topTriggers.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
                    <span style={s.listRank}>#{i + 1}</span>
                    <span style={s.listName}>{TRIGGER_LABELS[key] || key}</span>
                    <div style={s.listTrack}>
                      <div style={{
                        ...s.listFill,
                        width: `${(count / topTriggers[0][1]) * 100}%`,
                        background: '#d4a85a',
                      }} />
                    </div>
                    <span style={s.listCount}>{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 04 — Body systems */}
          {topSystems.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <span style={s.sectionNum}>04</span>
                <div>
                  <p style={s.sectionTitle}>Affected body systems</p>
                  <p style={s.sectionSub}>Symptom burden by system</p>
                </div>
              </div>
              <div style={{ ...s.systemGrid, padding: 16 }} className="print-card">
                {topSystems.map(([sys, count]) => (
                  <div key={sys} style={{ ...s.systemChip, borderColor: SYSTEM_COLORS[sys] || '#444' }}>
                    <span style={{ ...s.systemDot, background: SYSTEM_COLORS[sys] || '#555' }} />
                    <span style={s.systemName}>{sys}</span>
                    <span style={s.systemCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 05 — Top symptoms */}
          {topSymptoms.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <span style={s.sectionNum}>05</span>
                <div>
                  <p style={s.sectionTitle}>Most frequent symptoms</p>
                  <p style={s.sectionSub}>Symptoms logged most across all reactions</p>
                </div>
              </div>
              <div style={s.listCard} className="print-card">
                {topSymptoms.map((sym, i) => (
                  <div key={i} style={{ ...s.listRow, borderBottom: i < topSymptoms.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
                    <span style={{ ...s.systemDot, background: SYSTEM_COLORS[sym.system] || '#555', marginRight: 4 }} />
                    <span style={s.listName}>{sym.name}</span>
                    <div style={s.listTrack}>
                      <div style={{
                        ...s.listFill,
                        width: `${(sym.count / topSymptoms[0].count) * 100}%`,
                        background: SYSTEM_COLORS[sym.system] || '#555',
                      }} />
                    </div>
                    <span style={s.listCount}>{sym.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 06 — Recent reactions */}
          {reactions.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <span style={s.sectionNum}>06</span>
                <div>
                  <p style={s.sectionTitle}>Recent reactions</p>
                  <p style={s.sectionSub}>Last 5 logged reactions with severity and notes</p>
                </div>
              </div>
              <div style={s.listCard} className="print-card">
                {[...reactions].reverse().slice(0, 5).map((r, i) => (
                  <div key={i} style={{ ...s.recentRow, borderBottom: i < 4 ? '1px solid #1e1e1e' : 'none' }}>
                    <div style={s.recentLeft}>
                      <span style={s.recentDate}>{new Date(r.created_at).toLocaleDateString()}</span>
                      {r.notes && <span style={s.recentNote}>{r.notes}</span>}
                    </div>
                    <div style={s.recentRight}>
                      <span style={s.recentSev}>{r.severity}<span style={{ fontSize: 11, color: '#555' }}>/10</span></span>
                      <span style={s.recentMSS}>MSS {r.mss_score}/4</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={s.footer}>
            <p style={s.footerText}>
              Generated by MAST · Patient: {profileName} · {new Date().toLocaleDateString()}
            </p>
            <p style={s.footerDisclaimer}>
              This report is patient-generated using MSS (Mast Cell Symptom Severity Score),
              a patient-reported outcome measure. It is not a clinical diagnosis and should be
              interpreted alongside professional medical assessment. MAST is a symptom tracking
              tool only and does not provide medical advice. In case of severe reaction or
              anaphylaxis, call emergency services immediately.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0d0d0d', color: '#f0ece4', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' },
  logo: { fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: '0.2em', color: '#d4a85a' },
  printBtn: { padding: '8px 18px', background: '#d4a85a', border: 'none', borderRadius: 8, color: '#0d0d0d', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  content: { padding: '8px 24px 48px' },
  meta: { fontSize: 11, letterSpacing: '0.2em', color: '#d4a85a', marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionHeader: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  sectionNum: { fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#d4a85a', fontWeight: 700, paddingTop: 2, flexShrink: 0 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#f0ece4', marginBottom: 2 },
  sectionSub: { fontSize: 12, color: '#555' },
  goalsCard: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '16px 20px' },
  goalRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  goalNum: { fontSize: 13, color: '#d4a85a', fontFamily: "'DM Mono', monospace", fontWeight: 700, width: 16, flexShrink: 0 },
  goalInput: { flex: 1, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8, color: '#f0ece4', fontSize: 14, padding: '10px 12px', outline: 'none', fontFamily: 'inherit' },
  goalPrint: { flex: 1, fontSize: 14, color: '#f0ece4', margin: 0 },
  goalHint: { fontSize: 12, color: '#444', textAlign: 'center' },
  narrativeCard: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20 },
  narrativeHeading: { fontSize: 11, letterSpacing: '0.15em', color: '#d4a85a', fontFamily: "'DM Mono', monospace", marginBottom: 8, marginTop: 16 },
  narrativePara: { fontSize: 14, color: '#ccc', lineHeight: 1.7, marginBottom: 8 },
  regenBtn: { marginTop: 16, padding: '8px 16px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, color: '#666', fontSize: 13, cursor: 'pointer' },
  statsGrid: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  statBlock: {},
  statVal: { fontSize: 24, fontWeight: 700, color: '#f0ece4', marginBottom: 4 },
  statUnit: { fontSize: 14, color: '#555', marginLeft: 2 },
  statLabel: { fontSize: 12, color: '#555' },
  listCard: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '4px 20px' },
  listRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' },
  listRank: { fontSize: 11, color: '#555', fontFamily: 'monospace', width: 24, flexShrink: 0 },
  listName: { fontSize: 14, color: '#ccc', width: 110, flexShrink: 0 },
  listTrack: { flex: 1, height: 5, background: '#222', borderRadius: 3, overflow: 'hidden' },
  listFill: { height: '100%', borderRadius: 3 },
  listCount: { fontSize: 12, color: '#555', width: 28, textAlign: 'right' },
  systemGrid: { background: '#141414', border: '1px solid #222', borderRadius: 12, display: 'flex', flexWrap: 'wrap', gap: 10 },
  systemChip: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid', borderRadius: 20, padding: '8px 14px' },
  systemDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  systemName: { fontSize: 13, color: '#ccc', textTransform: 'capitalize' },
  systemCount: { fontSize: 12, color: '#555', marginLeft: 4 },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' },
  recentLeft: { display: 'flex', flexDirection: 'column', gap: 3 },
  recentDate: { fontSize: 13, color: '#aaa' },
  recentNote: { fontSize: 12, color: '#555', maxWidth: 240 },
  recentRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
  recentSev: { fontSize: 18, fontWeight: 700, color: '#d4a85a' },
  recentMSS: { fontSize: 11, color: '#555', fontFamily: 'monospace' },
  footer: { borderTop: '1px solid #1e1e1e', paddingTop: 20, marginTop: 8 },
  footerText: { fontSize: 12, color: '#555', marginBottom: 8 },
  footerDisclaimer: { fontSize: 11, color: '#444', lineHeight: 1.6 },
}