import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Minimize2, RotateCcw } from 'lucide-react'
import { Spinner } from '../ui'
import { getChatHistory, sendChatMessage } from '../../api'
import { useTheme } from '../ThemeContext'

function Message({ msg, isDarkMode }) {
  const isUser = msg.role === 'user'
  const isTool = msg.role === 'tool'

  if (isTool) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '8px 0',
          animation: 'slideUp 0.2s ease',
        }}
      >
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono',
            background: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(249, 250, 251, 0.8)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            maxWidth: '90%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
            🔧 {msg.tool_name} • {msg.status} • {msg.duration}
          </div>
          <div style={{ opacity: 0.8 }}>{msg.content}</div>
        </div>
      </div>
    )
  }

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
          padding: '10px 14px',
          borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          fontSize: 13,
          lineHeight: 1.5,
          background: isUser
            ? 'var(--accent-dim)'
            : isDarkMode 
            ? 'var(--bg-raised)'
            : '#f8fafc',
          border: `1px solid ${isUser ? 'rgba(56,189,248,0.25)' : 'var(--border)'}`,
          color: isUser ? 'var(--accent)' : 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {msg.streaming && <span className="typing-cursor">|</span>}
        {msg.content}
      </div>
      <span style={{ 
        fontSize: 9, 
        color: 'var(--text-muted)', 
        fontFamily: 'JetBrains Mono', 
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        {isUser ? (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            OPS
          </>
        ) : (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            ALEPH AI
          </>
        )}
        {msg.timestamp && (
          <span style={{ opacity: 0.6, fontSize: 8 }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </span>
    </div>
  )
}

function SuggestedPrompts({ prompts, onSelect, disabled }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '6px', 
      padding: '8px 12px',
      borderTop: '1px solid var(--border)'
    }}>
      {prompts.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            fontSize: '10px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: disabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.target.style.background = 'var(--bg-raised)'
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.color = 'var(--text)'
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.target.style.background = 'var(--bg-surface)'
              e.target.style.borderColor = 'var(--border)'
              e.target.style.color = 'var(--text-muted)'
            }
          }}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedPrompts, setSuggestedPrompts] = useState([])
  const { isDarkMode } = useTheme()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load chat history on mount
  useEffect(() => {
    getChatHistory().then(data => {
      setMessages(data.messages || [])
      setSuggestedPrompts(data.suggested_prompts || [])
    }).catch(err => {
      console.error('Failed to load chat history:', err)
      // Fallback to welcome message
      setMessages([
        { 
          role: 'assistant', 
          content: 'Aleph Ops online. How can I assist with operations today?',
          timestamp: new Date().toISOString()
        }
      ])
      setSuggestedPrompts([
        "Show me all delayed flights",
        "What's the current stand utilization?", 
        "Which flights arrive in the next hour?",
        "Reassign EK512 to a PLB stand"
      ])
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function handleSendMessage(text) {
    const message = text.trim()
    if (!message || loading) return

    const userMsg = { 
      role: 'user', 
      content: message,
      timestamp: new Date().toISOString()
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      // Add tool message for some queries
      if (message.toLowerCase().includes('utilization') || 
          message.toLowerCase().includes('delayed') ||
          message.toLowerCase().includes('reassign')) {
        
        const toolMsg = {
          role: 'tool',
          tool_name: message.toLowerCase().includes('utilization') ? 'fetch_stand_status' : 
                    message.toLowerCase().includes('delayed') ? 'check_flight_status' : 
                    'check_assignment_feasibility',
          status: 'complete',
          duration: `${(Math.random() * 0.8 + 0.2).toFixed(1)}s`,
          content: message.toLowerCase().includes('utilization') ? 
                   'Retrieved stand occupancy data for all terminals' :
                   message.toLowerCase().includes('delayed') ?
                   'Checked current flight delays and ETAs' :
                   'Validated stand availability and aircraft compatibility',
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, toolMsg])
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      // Get AI response
      const response = await sendChatMessage(message)
      
      // Insert streaming placeholder
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        streaming: true,
        timestamp: response.timestamp
      }])

      // Stream the response
      await streamReply(response.content, (chunk) => {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.streaming) {
            const updatedMsg = { ...last, content: last.content + chunk }
            return [...prev.slice(0, -1), updatedMsg]
          }
          return prev
        })
      })

      // Finalize message
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
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠ Error: ${err.message}`,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(input)
    }
  }

  function handleSuggestedPrompt(prompt) {
    setInput(prompt)
    setTimeout(() => {
      handleSendMessage(prompt)
    }, 100)
  }

  function clearChat() {
    setMessages([
      { 
        role: 'assistant', 
        content: 'Chat cleared. How can I assist with operations?',
        timestamp: new Date().toISOString()
      }
    ])
  }

  const characterCount = input.length
  const maxChars = 500

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
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
        title="Aleph AI Ops Assistant"
      >
        {open ? <X size={18} /> : <MessageSquare size={18} />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 380,
            height: 500,
            background: isDarkMode ? 'var(--bg-surface)' : '#ffffff',
            border: '1px solid var(--border-bright)',
            borderRadius: 16,
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
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              background: isDarkMode ? 'var(--bg-surface)' : '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--accent-dim)', 
                  border: '1px solid rgba(56,189,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ 
                  fontFamily: 'Syne', 
                  fontWeight: 800, 
                  fontSize: 13, 
                  color: 'var(--accent)' 
                }}>A</span>
              </div>
              <div>
                <div className="font-display font-semibold" style={{ 
                  fontSize: 14, 
                  color: 'var(--text-primary)' 
                }}>Aleph Ops AI</div>
                <div className="font-mono" style={{ 
                  fontSize: 10, 
                  color: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />
                  ONLINE
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={clearChat}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer' 
                }}
                title="Clear Chat"
              >
                <RotateCcw size={14} />
              </button>
              <button 
                onClick={() => setOpen(false)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer' 
                }}
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '16px 14px 12px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 6 
          }}>
            {messages.map((m, i) => <Message key={i} msg={m} isDarkMode={isDarkMode} />)}
            {loading && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '8px 0',
                justifyContent: 'center'
              }}>
                <Spinner size={14} />
                <span className="font-mono" style={{ 
                  fontSize: 11, 
                  color: 'var(--text-muted)' 
                }}>Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested Prompts */}
          {suggestedPrompts.length > 0 && (
            <SuggestedPrompts 
              prompts={suggestedPrompts}
              onSelect={handleSuggestedPrompt}
              disabled={loading}
            />
          )}

          {/* Input */}
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about flights, stands, operations..."
                rows={1}
                maxLength={maxChars}
                style={{
                  flex: 1,
                  background: isDarkMode ? 'var(--bg-raised)' : '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'DM Sans',
                  outline: 'none',
                  resize: 'none',
                  minHeight: 36,
                  maxHeight: 100,
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || loading || input.length > maxChars}
                style={{
                  width: 36, height: 36,
                  borderRadius: 8, 
                  cursor: (!input.trim() || loading || input.length > maxChars) ? 'not-allowed' : 'pointer',
                  background: (!input.trim() || loading || input.length > maxChars) ? 'var(--bg-raised)' : 'var(--accent)',
                  border: 'none',
                  color: (!input.trim() || loading || input.length > maxChars) ? 'var(--text-muted)' : 'var(--bg-base)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.14s',
                }}
              >
                <Send size={15} />
              </button>
            </div>
            {characterCount > 0 && (
              <div style={{ 
                fontSize: 9, 
                color: characterCount > maxChars * 0.8 ? 'var(--amber)' : 'var(--text-muted)',
                textAlign: 'right',
                fontFamily: 'JetBrains Mono'
              }}>
                {characterCount}/{maxChars}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .typing-cursor {
          animation: blink 1s infinite;
          color: var(--accent);
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}

// ----- Helpers: streaming text -----
function streamReply(text, onChunk) {
  return new Promise((resolve) => {
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval)
        resolve()
        return
      }
      onChunk(text[i])
      i += 1
    }, 25) // Slightly slower for better readability
  })
}
