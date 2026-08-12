'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

interface Reaction {
  id: string
  created_at: string
  severity: number
  mss_score: number
  notes: string | null
}

interface TriggerRow { trigger_key: string }
interface SymptomRow { symptom_key: string; body_system: string }

const SYSTEM_COLORS: Record<string, string> = {
  skin: '#d4a85a',
  respiratory: '#6ab0c5',
  gi: '#8fba7a',
  cardiac: '#e07a7a',
  neuro: '#a78bca',
  systemic: '#aaaaaa',
}

const MSS_LABELS = ['Minimal', 'Mild', 'Moderate', 'Significant', 'Severe']

function fmt(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [triggerCounts, setTriggerCounts] = useState<{ name: string; count: number }[]>([])
  const [symptomCounts, setSymptomCounts] = useState<{ name: string; system: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: rxns } = await supabase
      .from('reactions')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(30)

    if (!rxns) return

    setReactions(rxns)

    const ids = rxns.map(r => r.id)

    const { data: triggers } = await supabase
      .from('reaction_triggers')
      .select('trigger_key')
      .in('reaction_id', ids)

    const { data: symptoms } = await supabase
      .from('reaction_symptoms')
      .select('symptom_key, body_system')
      .in('reaction_id', ids)

    if (triggers) {
      const counts: Record<string, number> = {}
      triggers.forEach((t: TriggerRow) => {
        counts[t.trigger_key] = (counts[t.trigger_key] || 0) + 1
      })
      setTriggerCounts(
        Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      )
    }

    if (symptoms) {
      const counts: Record<string, { count: number; system: string }> = {}
      symptoms.forEach((s: SymptomRow) => {
        if (!counts[s.symptom_key]) counts[s.symptom_key] = { count: 0, system: s.body_system }
        counts[s.symptom_key].count++
      })
      setSymptomCounts(
        Object.entries(counts)
          .map(([name, { count, system }]) => ({ name, count, system }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      )
    }

    setLoading(false)
  }

  const avgSeverity = reactions.length
    ? (reactions.reduce((a, r) => a + r.severity, 0) / reactions.length).toFixed(1)
    : '—'

  const lastMSS = reactions.length ? reactions[reactions.length - 1].mss_score : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555', fontFamily: 'monospace', letterSpacing: '0.1em' }}>Loading...</p>
    </div>
  )

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.logo}>MAST</span>
        <button style={s.logBtn} onClick={() => router.push('/log')}>+ Log</button>
      </div>

      <div style={s.content}>
        <p style={s.meta}>OVERVIEW</p>
        <h1 style={s.title}>Your patterns</h1>

        {reactions.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No reactions logged yet</p>
            <p style={s.emptySub}>Tap + Log to record your first reaction</p>
            <button style={s.emptyBtn} onClick={() => router.push('/log')}>Log a reaction</button>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={s.statRow}>
              <div style={s.statCard}>
                <p style={s.statLabel}>Total reactions</p>
                <p style={s.statValue}>{reactions.length}</p>
              </div>
              <div style={s.statCard}>
                <p style={s.statLabel}>Avg severity</p>
                <p style={s.statValue}>{avgSeverity}<span style={s.statUnit}>/10</span></p>
              </div>
              <div style={s.statCard}>
                <p style={s.statLabel}>Last MSS</p>
                <p style={s.statValue}>
                  {lastMSS !== null ? (
                    <>{lastMSS}<span style={s.statUnit}>/4</span></>
                  ) : '—'}
                </p>
              </div>
            </div>

            {/* Severity timeline */}
            <div style={s.section}>
              <p style={s.sectionLabel}>SEVERITY OVER TIME</p>
              <div style={s.chartCard}>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={reactions.map(r => ({ date: fmt(r.created_at), severity: r.severity }))}>
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#f0ece4', fontSize: 13 }}
                      cursor={{ stroke: '#333' }}
                    />
                    <Line type="monotone" dataKey="severity" stroke="#d4a85a" strokeWidth={2} dot={{ fill: '#d4a85a', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top triggers */}
            {triggerCounts.length > 0 && (
              <div style={s.section}>
                <p style={s.sectionLabel}>TOP TRIGGERS</p>
                <div style={s.chartCard}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={triggerCounts} layout="vertical" margin={{ left: 8 }}>
                      <XAxis type="number" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#f0ece4', fontSize: 13 }}
                        cursor={{ fill: '#ffffff08' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {triggerCounts.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#d4a85a' : '#2a2a2a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top symptoms */}
            {symptomCounts.length > 0 && (
              <div style={s.section}>
                <p style={s.sectionLabel}>TOP SYMPTOMS</p>
                <div style={s.symptomBars}>
                  {symptomCounts.map((sym, i) => (
                    <div key={i} style={s.symptomBarRow}>
                      <span style={s.symptomBarLabel}>{sym.name}</span>
                      <div style={s.symptomBarTrack}>
                        <div style={{
                          ...s.symptomBarFill,
                          width: `${(sym.count / symptomCounts[0].count) * 100}%`,
                          background: SYSTEM_COLORS[sym.system] || '#555',
                        }} />
                      </div>
                      <span style={s.symptomBarCount}>{sym.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reactions */}
            <div style={s.section}>
              <p style={s.sectionLabel}>RECENT</p>
              <div style={s.recentList}>
                {[...reactions].reverse().slice(0, 5).map(r => (
                  <div key={r.id} style={s.recentRow}>
                    <div style={s.recentLeft}>
                      <span style={s.recentDate}>{fmt(r.created_at)}</span>
                      {r.notes && <span style={s.recentNote}>{r.notes.slice(0, 40)}{r.notes.length > 40 ? '...' : ''}</span>}
                    </div>
                    <div style={s.recentRight}>
                      <span style={s.recentSeverity}>{r.severity}<span style={{ fontSize: 11, color: '#555' }}>/10</span></span>
                      <span style={s.recentMSS}>MSS {r.mss_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
  logBtn: { padding: '8px 18px', background: '#d4a85a', border: 'none', borderRadius: 8, color: '#0d0d0d', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  content: { padding: '8px 24px 48px' },
  meta: { fontSize: 11, letterSpacing: '0.2em', color: '#d4a85a', marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 24 },
  statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 },
  statCard: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' },
  statLabel: { fontSize: 11, color: '#555', letterSpacing: '0.08em', marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: 700, color: '#f0ece4' },
  statUnit: { fontSize: 13, color: '#555', marginLeft: 2 },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 11, letterSpacing: '0.15em', color: '#555', marginBottom: 12, fontFamily: "'DM Mono', monospace" },
  chartCard: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '16px 8px 8px' },
  symptomBars: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '16px' },
  symptomBarRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  symptomBarLabel: { fontSize: 13, color: '#aaa', width: 100, flexShrink: 0 },
  symptomBarTrack: { flex: 1, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' },
  symptomBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
  symptomBarCount: { fontSize: 12, color: '#555', width: 20, textAlign: 'right' },
  recentList: { background: '#141414', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #1e1e1e' },
  recentLeft: { display: 'flex', flexDirection: 'column', gap: 3 },
  recentDate: { fontSize: 13, color: '#aaa' },
  recentNote: { fontSize: 12, color: '#555' },
  recentRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
  recentSeverity: { fontSize: 18, fontWeight: 700, color: '#d4a85a' },
  recentMSS: { fontSize: 11, color: '#555', fontFamily: 'monospace' },
  empty: { textAlign: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: '#aaa', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#555', marginBottom: 32 },
  emptyBtn: { padding: '14px 32px', background: '#d4a85a', border: 'none', borderRadius: 12, color: '#0d0d0d', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
}