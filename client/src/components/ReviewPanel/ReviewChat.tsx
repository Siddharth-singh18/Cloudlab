import React, { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useStore } from '../../store'
import { timeAgo, shortName } from '../../lib/utils'
import { getSocket } from '../../lib/socket'

export function ReviewChat() {
  const { chatMessages, currentUser, presences, currentProject, currentReview } = useStore()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const send = () => {
    if (!text.trim() || !currentUser) return
    const roomId = currentReview?.id ? `review:${currentReview.id}` : currentProject?.id ? `project:${currentProject.id}` : null
    if (!roomId) return
    getSocket().emit('chat:send', { roomId, body: text.trim() })
    setText('')
  }

  const isMe = (userId: string) => userId === currentUser?.id

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Online users */}
      <div className="px-3 py-2 border-b border-editor-border flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-editor-muted">Online:</span>
        {currentUser && (
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse_dot"
              style={{ backgroundColor: currentUser.color }}
            />
            <span className="text-[10px] text-editor-text">You</span>
          </div>
        )}
        {presences.map((p) => (
          <div key={p.userId} className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: p.user.color }}
            />
            <span className="text-[10px] text-editor-muted">{p.user.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.map((msg) => {
          const mine = isMe(msg.userId)
          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}
            >
              {!mine && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 mt-0.5"
                  style={{
                    backgroundColor: msg.user.color + '25',
                    color: msg.user.color,
                    border: `1.5px solid ${msg.user.color}40`,
                  }}
                >
                  {shortName(msg.user.name)}
                </div>
              )}
              <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!mine && (
                  <span className="text-[10px] font-medium text-editor-text px-1">
                    {msg.user.name.split(' ')[0]}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                    mine
                      ? 'bg-editor-accent/20 text-editor-accent rounded-tr-sm'
                      : 'bg-editor-surface border border-editor-border text-editor-text rounded-tl-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-[9px] text-editor-muted px-1">
                  {timeAgo(msg.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-editor-border flex gap-2 shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Message the team…"
          className="input flex-1 text-[11px]"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="p-1.5 rounded text-editor-accent hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
