import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Minimize2 } from 'lucide-react'
import { Spinner } from '../ui'

const SYSTEM_PROMPT = `You are Aleph Ops, an AI assistant for airport operations management. 
You help operations staff with flight scheduling, stand assignments, and airport operations queries.
Keep responses concise and professional. Use aviation terminology appropriately.
Format key data (flight numbers, stand IDs, times) in monospace when relevant.
You know about the Aleph airport operations system which manages flights across terminals T1 and T2,
with aircraft stands ranging from A1-01 through B1-05. Aircraft size codes: A (smallest) through F (A380, largest).`

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 2,
        animation: 'slideUp 0.2s ease',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 11px',
          borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          fontSize: 12,
          lineHeight: 1.55,
          background: isUser
            ? 'var(--accent-dim)'
            : 'var(--bg-raised)',
          border: `1px solid ${isUser ? 'rgba(56,189,248,0.25)' : 'var(--border)'}`,
          color: isUser ? 'var(--accent)' : 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
      </div>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
        {isUser ? 'OPS' : 'ALEPH AI'}
      </span>
    </div>
  )
}

export function ChatPanel() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Aleph Ops online. How can I assist with operations today?' }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      // Simulated assistant reply (streams characters to emulate a real LLM)
      const simulatedReply = simulateAssistantReply(text)
      // Insert an empty assistant message placeholder (marked streaming)
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])
      // Stream the reply character-by-character
      await streamReply(simulatedReply, (chunk) => {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.streaming) {
            const updatedMsg = { ...last, content: last.content + chunk }
            return [...prev.slice(0, -1), updatedMsg]
          }
          return prev
        })
      })
      // Finalize the assistant message (remove streaming marker)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'assistant' && last.streaming) {
          const finalized = { ...last }
          delete finalized.streaming
          return [...prev.slice(0, -1), finalized]
        }
        return prev
      })
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: open ? 'var(--bg-raised)' : 'var(--accent)',
          border: `1px solid ${open ? 'var(--border)' : 'transparent'}`,
          color: open ? 'var(--text-muted)' : 'var(--bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 50,
          transition: 'all 0.2s',
        }}
        title="Aleph AI Ops"
      >
        {open ? <X size={16} /> : <MessageSquare size={16} />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 74,
            right: 20,
            width: 320,
            height: 420,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-bright)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            zIndex: 50,
            animation: 'slideUp 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'var(--accent-dim)', border: '1px solid rgba(56,189,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 11, color: 'var(--accent)' }}>A</span>
              </div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Aleph Ops AI</div>
                <div className="font-mono" style={{ fontSize: 9, color: 'var(--green)' }}>● ONLINE</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Minimize2 size={13} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                <Spinner size={12} />
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Processing…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '8px 10px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about flights, stands, ops…"
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 7,
                padding: '6px 9px',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'DM Sans',
                outline: 'none',
                resize: 'none',
                minHeight: 32,
                maxHeight: 80,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 32, height: 32,
                borderRadius: 7, cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                background: (!input.trim() || loading) ? 'var(--bg-raised)' : 'var(--accent)',
                border: 'none',
                color: (!input.trim() || loading) ? 'var(--text-muted)' : 'var(--bg-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.14s',
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ----- Helpers: simulated assistant and streaming -----
function simulateAssistantReply(userText) {
  // Lightweight rule-based responses using mock data hints.
  const lc = userText.toLowerCase()
  if (lc.includes('stand utilization') || lc.includes('utilization')) {
    return 'T1: 4/5 stands occupied (80%). A1-05 available (remote).'
  }
  if (lc.includes('delayed') && lc.includes('qr501')) {
    return 'QR501 ETA revised to 10:40. A1-01 clear from 08:45. B777-300ER compatible.'
  }
  if (lc.includes('show') && lc.includes('delayed')) {
    return 'Delayed flights: QR501, AF218.'
  }
  // Default fallback
  return "I'm Aleph Ops. I can report stand utilization, flight status, and reassign feasibility."
}

function streamReply(text, onChunk) {
  return new Promise((resolve) => {
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval)
        // done
        resolve()
        return
      }
      onChunk(text[i])
      i += 1
    }, 20)
  })
}
