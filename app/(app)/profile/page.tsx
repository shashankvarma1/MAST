'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reactionCount, setReactionCount] = useState(0)
  const [memberSince, setMemberSince] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    setEmail(user.email || '')
    setMemberSince(new Date(user.created_at).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    }))

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (profile) setName(profile.display_name || '')

    const { count } = await supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })

    setReactionCount(count || 0)
    setLoading(false)
  }

  async function saveName() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

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
        <p style={s.meta}>ACCOUNT</p>
        <h1 style={s.title}>Profile</h1>

        {/* Avatar */}
        <div style={s.avatarWrap}>
          <div style={s.avatar}>
            {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={s.avatarName}>{name || 'Your name'}</p>
            <p style={s.avatarEmail}>{email}</p>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <p style={s.statVal}>{reactionCount}</p>
            <p style={s.statLabel}>Reactions logged</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statVal}>{memberSince}</p>
            <p style={s.statLabel}>Member since</p>
          </div>
        </div>

        {/* Edit name */}
        <div style={s.section}>
          <p style={s.sectionLabel}>DISPLAY NAME</p>
          <div style={s.inputRow}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={s.input}
            />
            <button
              style={{
                ...s.saveBtn,
                opacity: saving || !name.trim() ? 0.5 : 1,
                background: saved ? '#8fba7a' : '#d4a85a',
              }}
              onClick={saveName}
              disabled={saving || !name.trim()}
            >
              {saved ? '✓' : saving ? '...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Email (read only) */}
        <div style={s.section}>
          <p style={s.sectionLabel}>EMAIL</p>
          <div style={s.readonlyField}>
            <p style={s.readonlyText}>{email}</p>
            <span style={s.readonlyBadge}>Read only</span>
          </div>
        </div>

        {/* About MAST */}
        <div style={s.section}>
          <p style={s.sectionLabel}>ABOUT MAST</p>
          <div style={s.infoCard}>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Version</span>
              <span style={s.infoVal}>1.0.0 MVP</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Condition</span>
              <span style={s.infoVal}>MCAS</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Scoring</span>
              <span style={s.infoVal}>MSS (0–4)</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>AI model</span>
              <span style={s.infoVal}>Claude Sonnet</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Data storage</span>
              <span style={s.infoVal}>Supabase (private)</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={s.section}>
          <p style={s.sectionLabel}>MEDICAL DISCLAIMER</p>
          <div style={s.disclaimerCard}>
            <p style={s.disclaimerText}>
              MAST is a symptom tracking tool and does not provide medical advice or diagnosis.
              MSS scores are patient-reported outcome measures, not validated diagnostic instruments.
              All data is self-reported and should be discussed with a qualified healthcare provider.
              In case of severe reaction or anaphylaxis, call emergency services immediately.
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button style={s.signOutBtn} onClick={signOut}>
          Sign out
        </button>

        <p style={s.version}>MAST · Built with Next.js + Supabase + Claude</p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#0d0d0d',
    color: '#f0ece4',
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 12px',
  },
  logo: {
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: '0.2em',
    color: '#d4a85a',
  },
  content: { padding: '8px 24px 48px' },
  meta: {
    fontSize: 11,
    letterSpacing: '0.2em',
    color: '#d4a85a',
    marginBottom: 6,
    fontFamily: "'DM Mono', monospace",
  },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 28 },
  avatarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#d4a85a',
    color: '#0d0d0d',
    fontSize: 22,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarName: { fontSize: 16, fontWeight: 600, color: '#f0ece4', marginBottom: 3 },
  avatarEmail: { fontSize: 13, color: '#555' },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 12,
    padding: '14px 16px',
  },
  statVal: { fontSize: 18, fontWeight: 700, color: '#f0ece4', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#555', letterSpacing: '0.05em' },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: '0.15em',
    color: '#555',
    marginBottom: 10,
    fontFamily: "'DM Mono', monospace",
  },
  inputRow: { display: 'flex', gap: 10 },
  input: {
    flex: 1,
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 10,
    color: '#f0ece4',
    fontSize: 14,
    padding: '12px 16px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: 10,
    color: '#0d0d0d',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  readonlyField: {
    background: '#141414',
    border: '1px solid #1e1e1e',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readonlyText: { fontSize: 14, color: '#555' },
  readonlyBadge: {
    fontSize: 10,
    letterSpacing: '0.1em',
    color: '#333',
    border: '1px solid #333',
    borderRadius: 20,
    padding: '2px 8px',
    fontFamily: 'monospace',
  },
  infoCard: {
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e1e1e',
  },
  infoLabel: { fontSize: 13, color: '#555' },
  infoVal: { fontSize: 13, color: '#aaa' },
  disclaimerCard: {
    background: '#141414',
    border: '1px solid #1e1e1e',
    borderRadius: 12,
    padding: '14px 16px',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 1.7,
  },
  signOutBtn: {
    width: '100%',
    padding: '15px',
    background: 'transparent',
    border: '1px solid #e07a7a',
    borderRadius: 12,
    color: '#e07a7a',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 24,
    marginTop: 8,
  },
  version: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
}