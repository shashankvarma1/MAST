'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleReset = async () => {
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }

    router.push('/log')
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        <p style={s.logo}>MAST</p>
        <h1 style={s.title}>New password</h1>
        <p style={s.sub}>Choose a strong password for your account</p>

        {!ready ? (
          <p style={{ color: '#555', fontSize: 14 }}>Verifying reset link...</p>
        ) : (
          <>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.input}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              style={s.input}
            />
            {error && <p style={s.error}>{error}</p>}
            <button
              onClick={handleReset}
              disabled={loading || !password || !confirm}
              style={{ ...s.btn, opacity: loading || !password || !confirm ? 0.5 : 1 }}
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
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
}