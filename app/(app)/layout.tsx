'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/ui/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
      else setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (checking) return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{ color: '#d4a85a', fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: 18 }}>
        MAST
      </p>
    </div>
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      {children}
      <BottomNav />
    </div>
  )
}