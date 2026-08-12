'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: name || email.split('@')[0],
        })
      }
      router.push('/log')

    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/log')

    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) { setError(error.message); setLoading(false); return }
      setResetSent(true)
    }

    setLoading(false)
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setResetSent(false)
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        <p style={s.logo}>MAST</p>

        {/* Forgot password — sent state */}
        {mode === 'forgot' && resetSent ? (
          <div style={s.sent}>
            <span style={s.sentIcon}>✉</span>
            <p style={s.sentTitle}>Check your inbox</p>
            <p style={s.sentSub}>Password reset link sent to {email}</p>
            <button style={s.switchBtn} onClick={() => switchMode('login')}>
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h1 style={s.title}>
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p style={s.sub}>
              {mode === 'login' ? 'Track your MCAS reactions'
                : mode === 'signup' ? 'Start tracking your patterns'
                : 'Enter your email and we\'ll send a reset link'}
            </p>

            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={s.input}
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input}
            />

            {mode !== 'forgot' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={s.input}
              />
            )}

            {error && <p style={s.error}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || (mode !== 'forgot' && !password)}
              style={{
                ...s.btn,
                opacity: loading || !email || (mode !== 'forgot' && !password) ? 0.5 : 1
              }}
            >
              {loading ? 'Please wait...'
                : mode === 'login' ? 'Sign in'
                : mode === 'signup' ? 'Create account'
                : 'Send reset link'}
            </button>

            {/* Footer links */}
            <div style={s.footer}>
              {mode === 'login' && (
                <>
                  <div style={s.switchRow}>
                    <span style={s.switchText}>Don't have an account?</span>
                    <button style={s.linkBtn} onClick={() => switchMode('signup')}>Sign up</button>
                  </div>
                  <button style={{ ...s.linkBtn, marginTop: 8 }} onClick={() => switchMode('forgot')}>
                    Forgot password?
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <div style={s.switchRow}>
                  <span style={s.switchText}>Already have an account?</span>
                  <button style={s.linkBtn} onClick={() => switchMode('login')}>Sign in</button>
                </div>
              )}
              {mode === 'forgot' && (
                <button style={s.linkBtn} onClick={() => switchMode('login')}>
                  ← Back to sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#0d0d0d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 16,
    padding: 40,
  },
  logo: {
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '0.2em',
    color: '#d4a85a',
    marginBottom: 32,
  },
  title: { fontSize: 26, fontWeight: 700, color: '#f0ece4', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', marginBottom: 28 },
  input: {
    width: '100%',
    background: '#0d0d0d',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    color: '#f0ece4',
    fontSize: 15,
    padding: '14px 16px',
    marginBottom: 12,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  btn: {
    width: '100%',
    padding: '15px',
    background: '#d4a85a',
    border: 'none',
    borderRadius: 10,
    color: '#0d0d0d',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
  error: { fontSize: 13, color: '#e07a7a', marginBottom: 10 },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  switchText: { fontSize: 14, color: '#555' },
  linkBtn: {
    fontSize: 14,
    color: '#d4a85a',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 600,
  },
  sent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '20px 0',
    gap: 8,
  },
  sentIcon: { fontSize: 40 },
  sentTitle: { fontSize: 18, fontWeight: 700, color: '#f0ece4', margin: '8px 0 4px' },
  sentSub: { fontSize: 14, color: '#666', marginBottom: 16 },
}