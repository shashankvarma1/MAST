'use client'
import { useRouter, usePathname } from 'next/navigation'

const tabs = [
  { label: 'Log', path: '/log', icon: '⊕' },
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Patterns', path: '/patterns', icon: '◎' },
  { label: 'Ask AI', path: '/chat', icon: '✦' },
  { label: 'Report', path: '/report', icon: '↗' },
  { label: 'Profile', path: '/profile', icon: '◯' },
]

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()

  return (
    <nav style={s.nav}>
      {tabs.map(tab => {
        const active = path === tab.path
        return (
          <button
            key={tab.path}
            style={s.tab}
            onClick={() => router.push(tab.path)}
          >
            <span style={{ ...s.icon, color: active ? '#d4a85a' : '#444' }}>
              {tab.icon}
            </span>
            <span style={{ ...s.label, color: active ? '#d4a85a' : '#444' }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    background: '#0d0d0d',
    borderTop: '1px solid #1e1e1e',
    display: 'flex',
    padding: '8px 0 20px',
    zIndex: 100,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 0',
  },
  icon: { fontSize: 16 },
  label: { fontSize: 8, letterSpacing: '0.04em' },
}