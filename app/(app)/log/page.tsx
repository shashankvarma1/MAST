'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logReaction } from '@/lib/logReaction'
import { BodySystem } from '@/types'

const TRIGGERS = [
  { id: 'food', label: 'Food', icon: '🍽' },
  { id: 'fragrance', label: 'Fragrance', icon: '🌸' },
  { id: 'heat', label: 'Heat', icon: '☀️' },
  { id: 'cold', label: 'Cold', icon: '❄️' },
  { id: 'stress', label: 'Stress', icon: '⚡' },
  { id: 'exercise', label: 'Exercise', icon: '🏃' },
  { id: 'medication', label: 'Medication', icon: '💊' },
  { id: 'mold', label: 'Mold/Dust', icon: '🍂' },
  { id: 'alcohol', label: 'Alcohol', icon: '🍷' },
  { id: 'vibration', label: 'Vibration', icon: '🔊' },
]

const SYMPTOMS = [
  { id: 'hives', label: 'Hives / Rash', system: 'skin' as BodySystem },
  { id: 'flush', label: 'Flushing', system: 'skin' as BodySystem },
  { id: 'itch', label: 'Itching', system: 'skin' as BodySystem },
  { id: 'wheeze', label: 'Wheezing', system: 'respiratory' as BodySystem },
  { id: 'throat', label: 'Throat tightness', system: 'respiratory' as BodySystem },
  { id: 'nausea', label: 'Nausea', system: 'gi' as BodySystem },
  { id: 'cramps', label: 'Abdominal cramps', system: 'gi' as BodySystem },
  { id: 'diarrhea', label: 'Diarrhea', system: 'gi' as BodySystem },
  { id: 'palpitations', label: 'Palpitations', system: 'cardiac' as BodySystem },
  { id: 'dizzy', label: 'Dizziness', system: 'neuro' as BodySystem },
  { id: 'fog', label: 'Brain fog', system: 'neuro' as BodySystem },
  { id: 'anxiety', label: 'Sudden anxiety', system: 'neuro' as BodySystem },
  { id: 'fatigue', label: 'Fatigue', system: 'systemic' as BodySystem },
  { id: 'headache', label: 'Headache', system: 'neuro' as BodySystem },
]

const SYSTEM_COLORS: Record<string, string> = {
  skin: '#d4a85a',
  respiratory: '#6ab0c5',
  gi: '#8fba7a',
  cardiac: '#e07a7a',
  neuro: '#a78bca',
  systemic: '#aaaaaa',
}

const MSS_LABELS = ['Minimal', 'Mild', 'Moderate', 'Significant', 'Severe']

export default function LogPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [severity, setSeverity] = useState(5)
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const mssScore = Math.round((severity / 10) * 4)
  const mssLabel = MSS_LABELS[mssScore]

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await logReaction({
        severity,
        mssScore,
        triggerKeys: selectedTriggers,
        symptoms: selectedSymptoms.map(id => {
          const s = SYMPTOMS.find(s => s.id === id)!
          return { id, system: s.system }
        }),
        notes,
      })
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1)
    setSeverity(5)
    setSelectedTriggers([])
    setSelectedSymptoms([])
    setNotes('')
    setSubmitted(false)
    setError('')
  }

  if (submitted) return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.logo}>MAST</span>
      </div>
      <div style={s.successCard}>
        <div style={s.successIcon}>✓</div>
        <h2 style={s.successTitle}>Reaction logged</h2>
        <p style={s.successSub}>
          MSS Score: <span style={{ color: '#d4a85a' }}>{mssScore}/4 — {mssLabel}</span>
        </p>
        <p style={s.successMeta}>
          {selectedTriggers.length} trigger{selectedTriggers.length !== 1 ? 's' : ''} · {selectedSymptoms.length} symptom{selectedSymptoms.length !== 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <button style={s.dashBtn} onClick={() => router.push('/dashboard')}>
            View dashboard →
          </button>
          <button style={s.newBtn} onClick={reset}>
            Log another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.logo}>MAST</span>
        <span style={s.stepLabel}>Step {step} of 3</span>
      </div>

      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${(step / 3) * 100}%` }} />
      </div>

      <div style={s.content}>
        {step === 1 && (
          <div style={s.stepWrap}>
            <p style={s.meta}>NOW</p>
            <h1 style={s.title}>How severe is this reaction?</h1>
            <p style={s.sub}>Drag to set intensity</p>
            <div style={s.severityDisplay}>
              <span style={s.severityNum}>{severity}</span>
              <span style={s.severityOf}>/10</span>
            </div>
            <input
              type="range" min={1} max={10} value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              style={s.slider}
            />
            <div style={s.sliderLabels}><span>1</span><span>10</span></div>
            <div style={s.mssChip}>
              <span style={s.mssLabel}>MSS</span>
              <span style={s.mssScore}>{mssScore}/4</span>
              <span style={s.mssText}>{mssLabel}</span>
            </div>
            <button style={s.nextBtn} onClick={() => setStep(2)}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div style={s.stepWrap}>
            <p style={s.meta}>TRIGGERS</p>
            <h1 style={s.title}>What were you exposed to?</h1>
            <p style={s.sub}>Select all that apply</p>
            <div style={s.triggerGrid}>
              {TRIGGERS.map(t => {
                const active = selectedTriggers.includes(t.id)
                return (
                  <button
                    key={t.id}
                    style={{ ...s.triggerChip, ...(active ? s.triggerActive : {}) }}
                    onClick={() => toggle(t.id, selectedTriggers, setSelectedTriggers)}
                  >
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
            <div style={s.navRow}>
              <button style={s.backBtn} onClick={() => setStep(1)}>← Back</button>
              <button style={s.nextBtn} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={s.stepWrap}>
            <p style={s.meta}>SYMPTOMS</p>
            <h1 style={s.title}>What are you experiencing?</h1>
            <p style={s.sub}>Select all that apply</p>
            <div style={s.symptomList}>
              {SYMPTOMS.map(sym => {
                const active = selectedSymptoms.includes(sym.id)
                const color = SYSTEM_COLORS[sym.system]
                return (
                  <button
                    key={sym.id}
                    style={{ ...s.symptomRow, ...(active ? { borderColor: color, background: color + '15' } : {}) }}
                    onClick={() => toggle(sym.id, selectedSymptoms, setSelectedSymptoms)}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? color : '#333', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>{sym.label}</span>
                    <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', textTransform: 'uppercase' }}>{sym.system}</span>
                    {active && <span style={{ color, fontSize: 16, marginLeft: 'auto' }}>✓</span>}
                  </button>
                )
              })}
            </div>
            <textarea
              placeholder="Additional notes — food eaten, medications, environment..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={s.notes}
              rows={3}
            />
            {error && <p style={{ color: '#e07a7a', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={s.navRow}>
              <button style={s.backBtn} onClick={() => setStep(2)}>← Back</button>
              <button
                style={{ ...s.nextBtn, opacity: loading ? 0.6 : 1 }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Reaction'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0d0d0d', color: '#f0ece4', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' },
  logo: { fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: '0.2em', color: '#d4a85a' },
  stepLabel: { fontSize: 12, color: '#666', letterSpacing: '0.1em' },
  progressBar: { height: 2, background: '#1e1e1e', margin: '0 24px', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#d4a85a', transition: 'width 0.4s ease' },
  content: { padding: '0 24px 32px' },
  stepWrap: { paddingTop: 32 },
  meta: { fontSize: 11, letterSpacing: '0.2em', color: '#d4a85a', marginBottom: 8, fontFamily: "'DM Mono', monospace" },
  title: { fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 },
  sub: { fontSize: 14, color: '#666', marginBottom: 32 },
  severityDisplay: { textAlign: 'center', marginBottom: 16 },
  severityNum: { fontSize: 72, fontWeight: 800, color: '#d4a85a', lineHeight: 1 },
  severityOf: { fontSize: 24, color: '#555', marginLeft: 4 },
  slider: { width: '100%', accentColor: '#d4a85a', cursor: 'pointer', marginBottom: 6 },
  sliderLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 28 },
  mssChip: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 16px', marginBottom: 32 },
  mssLabel: { fontSize: 10, letterSpacing: '0.15em', color: '#666', fontFamily: "'DM Mono', monospace" },
  mssScore: { fontSize: 16, fontWeight: 700, color: '#d4a85a' },
  mssText: { fontSize: 14, color: '#aaa' },
  triggerGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 },
  triggerChip: { display: 'flex', alignItems: 'center', gap: 10, background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', color: '#ccc', textAlign: 'left' },
  triggerActive: { border: '1px solid #d4a85a', background: '#d4a85a18', color: '#f0ece4' },
  symptomList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  symptomRow: { display: 'flex', alignItems: 'center', gap: 12, background: '#141414', border: '1px solid #222', borderRadius: 10, padding: '13px 16px', cursor: 'pointer', color: '#ccc' },
  notes: { width: '100%', background: '#141414', border: '1px solid #222', borderRadius: 10, color: '#ccc', fontSize: 14, padding: 14, resize: 'none', marginBottom: 24, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
  navRow: { display: 'flex', gap: 12 },
  backBtn: { flex: 1, padding: 16, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 12, color: '#666', fontSize: 15, cursor: 'pointer' },
  nextBtn: { flex: 2, padding: 16, background: '#d4a85a', border: 'none', borderRadius: 12, color: '#0d0d0d', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  dashBtn: { width: '100%', padding: 15, background: '#d4a85a', border: 'none', borderRadius: 12, color: '#0d0d0d', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  newBtn: { width: '100%', padding: 15, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 12, color: '#aaa', fontSize: 15, cursor: 'pointer' },
  successCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 40, textAlign: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: '50%', background: '#d4a85a', color: '#0d0d0d', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontWeight: 700 },
  successTitle: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  successSub: { fontSize: 16, color: '#aaa', marginBottom: 8 },
  successMeta: { fontSize: 13, color: '#555', marginBottom: 40 },
}