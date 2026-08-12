import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MAST — MCAS Tracker',
  description: 'Track your MCAS reactions and patterns',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0d0d0d' }}>
        {children}
      </body>
    </html>
  )
}