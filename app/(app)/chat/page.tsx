'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import AIDisclaimer from '@/components/ui/AIDisclaimer'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Reaction {
  id: string
  created_at: string
  severity: number
  mss_score: number
}

interface TriggerRow { reaction_id: string; trigger_key: string }
interface SymptomRow { reaction_id: string; symptom_key: string; body_system: string }

const SUGGESTED_QUESTIONS = [
  'What are my top triggers?',
  'When do my worst reactions happen?',
  'Which body systems are most affected?',
  'How has my severity changed over time?',
  'What should I discuss with my doctor?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [triggers, setTriggers] = useState<TriggerRow[]>([])
  const [symptoms, setSymptoms] = useState<SymptomRow[]>([])
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadData() {
    const { data: rxns } = await supabase
      .from('reactions')
      .select('*')
      .order('created_at', { ascending: true })

    if (!rxns) { setDataLoading(false); return }
    setReactions(rxns)

    const ids = rxns.map((r: Reaction) => r.id)
    if (ids.length === 0) { setDataLoading(false); return }

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
    setDataLoading(false)
  }

  async function sendMessage(question?: string) {
    const q = question || input.trim()
    if (!q || loading) return

    const userMsg: Message = { role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ask-mast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            question: q,
            reactions,
            triggers,
            symptoms,
          }),
        }
      )

      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer || data.error || 'Something went wrong.',
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555', fontFamily: 'monospace' }}>Loading...</p>
    </div>
  )

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <span style={s.logo}>MAST</span>
          <span style={s.logoSub}> AI</span>
        </div>
        <span style={s.badge}>Beta</span>
      </div>

      {/* Scrollable messages area */}
      <div style={s.messagesWrap}>

        {/* Disclaimer */}
        {showDisclaimer && (
          <div style={s.disclaimerWrap}>
            <AIDisclaimer />
            <button style={s.dismissBtn} onClick={() => setShowDisclaimer(false)}>
              I understand — start chatting
            </button>
          </div>
        )}

        {/* Empty state */}
        {!showDisclaimer && messages.length === 0 && (
          <div style={s.emptyState}>
            <p style={s.emptyTitle}>Ask MAST anything about your reactions</p>
            <p style={s.emptySub}>Your data stays private — only you can access it</p>
            <div style={s.suggestedList}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  style={s.suggestedBtn}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...s.messageBubble,
              ...(msg.role === 'user' ? s.userBubble : s.assistantBubble),
            }}
          >
            {msg.role === 'assistant' && (
              <span style={s.assistantLabel}>MAST AI</span>
            )}
            <p style={s.messageText}>{msg.content}</p>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ ...s.messageBubble, ...s.assistantBubble }}>
            <span style={s.assistantLabel}>MAST AI</span>
            <div style={s.typingDots}>
              <span style={s.dot} />
              <span style={s.dot} />
              <span style={s.dot} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {!showDisclaimer && (
        <div style={s.inputBar}>
          <input
            type="text"
            placeholder="Ask about your reactions..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            style={s.input}
            disabled={loading}
          />
          <button
            style={{
              ...s.sendBtn,
              opacity: loading || !input.trim() ? 0.4 : 1,
            }}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            ↑
          </button>
        </div>
      )}
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
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 12px',
    borderBottom: '1px solid #1e1e1e',
    flexShrink: 0,
  },
  logo: {
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: '0.2em',
    color: '#d4a85a',
  },
  logoSub: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: '#555',
    letterSpacing: '0.1em',
  },
  badge: {
    fontSize: 10,
    letterSpacing: '0.1em',
    color: '#a78bca',
    border: '1px solid #a78bca',
    borderRadius: 20,
    padding: '3px 10px',
    fontFamily: 'monospace',
  },
  messagesWrap: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 20px 100px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  disclaimerWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  dismissBtn: {
    padding: '14px',
    background: '#d4a85a',
    border: 'none',
    borderRadius: 12,
    color: '#0d0d0d',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
  emptyState: {
    paddingTop: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f0ece4',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#555',
    marginBottom: 20,
  },
  suggestedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  suggestedBtn: {
    textAlign: 'left',
    padding: '12px 16px',
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 10,
    color: '#aaa',
    fontSize: 14,
    cursor: 'pointer',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: '#d4a85a',
    color: '#0d0d0d',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: '#141414',
    border: '1px solid #222',
    borderBottomLeftRadius: 4,
  },
  assistantLabel: {
    fontSize: 10,
    letterSpacing: '0.12em',
    color: '#d4a85a',
    fontFamily: 'monospace',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  typingDots: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    padding: '4px 0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#555',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  inputBar: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    padding: '12px 16px',
    background: '#0d0d0d',
    borderTop: '1px solid #1e1e1e',
    display: 'flex',
    gap: 10,
    boxSizing: 'border-box',
  },
  input: {
    flex: 1,
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    color: '#f0ece4',
    fontSize: 14,
    padding: '12px 16px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: 44,
    height: 44,
    background: '#d4a85a',
    border: 'none',
    borderRadius: 10,
    color: '#0d0d0d',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
}