'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from '@/components/AiChatWidget.module.css'
import { tenantConfig } from '@/lib/tenant.config'


type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

type StreamPayload = {
  type: 'text' | 'done'
  text?: string
}

const QUICK_REPLIES = [
  'What products do you have?',
  'How do I order?',
  'Do you ship to my area?',
  'Talk to a person',
] as const

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  }
}

export default function AiChatWidget() {
  const pathname = usePathname()
  const brandShort = tenantConfig.branding.shortName
  const whatsappNumber = tenantConfig.contact.whatsappNumber
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  const welcomeMessage = useMemo(
    () =>
      `Hi! I'm your ${brandShort} AI assistant. Ask me anything about our products, shipping, or how to order! 🌿`,
    [brandShort]
  )

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage('assistant', welcomeMessage),
  ])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [isUnavailable, setIsUnavailable] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)

  const isCartOrCheckout = pathname === '/cart' || pathname === '/checkout'
  const hasWhatsAppFloating = Boolean(whatsappNumber) && !isCartOrCheckout
  const isLifted = isCartOrCheckout || hasWhatsAppFloating
  const showQuickReplies = messages.length === 1 && messages[0]?.role === 'assistant'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (rootRef.current?.contains(target)) return
      setIsOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [isOpen])

  const resetTextareaHeight = () => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
  }

  const adjustTextareaHeight = () => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`
  }

  const appendAssistantChunk = (messageId: string, chunk: string) => {
    if (!chunk) return

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: `${message.content}${chunk}`,
            }
          : message
      )
    )
  }

  const setAssistantText = (messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content,
            }
          : message
      )
    )
  }

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim()
    if (!trimmed || isLoading || isUnavailable) return

    const userMessage = createMessage('user', trimmed)
    const assistantMessage = createMessage('assistant', '')
    const historyForRequest = [...messages, userMessage]
      .slice(-10)
      .map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
    resetTextareaHeight()
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: historyForRequest }),
      })

      if (!response.ok) {
        let fallbackMessage = 'I could not respond right now. Please try again in a moment.'

        try {
          const errorBody = (await response.json()) as {
            error?: string
            code?: string
          }

          if (errorBody.error) {
            fallbackMessage = errorBody.error
          }

          if (errorBody.code === 'CHAT_UNAVAILABLE') {
            setIsUnavailable(true)
          }
        } catch {
          // Keep fallback message when response body is not JSON.
        }

        setAssistantText(assistantMessage.id, fallbackMessage)
        return
      }

      if (!response.body) {
        setAssistantText(
          assistantMessage.id,
          'I could not stream a response right now. Please try again shortly.'
        )
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let completed = false

      while (!completed) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          const lines = event
            .split('\n')
            .filter((line) => line.startsWith('data: '))
            .map((line) => line.slice(6))

          for (const line of lines) {
            try {
              const payload = JSON.parse(line) as StreamPayload
              if (payload.type === 'text' && payload.text) {
                appendAssistantChunk(assistantMessage.id, payload.text)
              }

              if (payload.type === 'done') {
                completed = true
                break
              }
            } catch {
              // Ignore malformed chunks and continue processing stream.
            }
          }

          if (completed) break
        }
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== assistantMessage.id) return message
          if (message.content.trim()) return message
          return {
            ...message,
            content: 'I could not generate an answer this time. Please try again.',
          }
        })
      )
    } catch {
      setAssistantText(
        assistantMessage.id,
        'I hit a temporary issue. Please retry, or message us on WhatsApp for quick help.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendMessage(input)
  }

  const handleTextareaKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      await sendMessage(input)
    }
  }

  const handleQuickReply = async (value: (typeof QUICK_REPLIES)[number]) => {
    if (value === 'Talk to a person') {
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      }
      return
    }

    await sendMessage(value)
  }

  return (
    <>
      <div ref={rootRef} className={`${styles.root} ${isLifted ? styles.lifted : ''}`}>
        {!isOpen ? (
          <button
            type="button"
            className={styles.fab}
            aria-label="Open AI chat assistant"
            onClick={() => setIsOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.fabIcon}>
              <path
                d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.2 3.4a.5.5 0 0 1-.8-.4V5.5Z"
                fill="currentColor"
              />
            </svg>
            <span className={styles.fabLabel}>AI Chat</span>
          </button>
        ) : (
          <section ref={panelRef} className={styles.panel} aria-label="AI chat panel">
            <header className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.headerAvatar}>AI</div>
                <div>
                  <h2 className={styles.title}>{brandShort} Assistant</h2>
                  <p className={styles.subtitle}>
                    <span className={styles.onlineDot} />
                    Online · Ready to help
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close chat"
                onClick={() => setIsOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.closeIcon}>
                  <path
                    d="M6.7 5.3a1 1 0 0 0-1.4 1.4L10.6 12l-5.3 5.3a1 1 0 1 0 1.4 1.4l5.3-5.3 5.3 5.3a1 1 0 1 0 1.4-1.4L13.4 12l5.3-5.3a1 1 0 1 0-1.4-1.4L12 10.6 6.7 5.3Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </header>

            <div className={styles.messages}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageRow} ${
                    message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant
                  }`}
                >
                  <div className={styles.messageGroup}>
                    <span className={styles.messageSender}>
                      {message.role === 'user' ? 'You' : `${brandShort} AI`}
                    </span>
                    <div
                      className={`${styles.messageBubble} ${
                        message.role === 'user' ? styles.userBubble : styles.assistantBubble
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {showQuickReplies ? (
                <div className={styles.quickReplies}>
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      className={styles.quickReplyChip}
                      onClick={() => void handleQuickReply(reply)}
                      disabled={isLoading || (reply === 'Talk to a person' && !whatsappUrl)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              ) : null}

              {isLoading ? (
                <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
                  <div className={styles.messageGroup}>
                    <span className={styles.messageSender}>{brandShort} AI</span>
                    <div className={`${styles.messageBubble} ${styles.assistantBubble}`}>
                      <div className={styles.typingDots} aria-label="Assistant is typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <form className={styles.inputArea} onSubmit={handleSubmit}>
              {isUnavailable ? (
                <p className={styles.unavailableText}>
                  Chat is temporarily unavailable. Please use WhatsApp for immediate support.
                </p>
              ) : null}
              <textarea
                ref={textareaRef}
                className={styles.input}
                placeholder="Ask anything..."
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={(event) => {
                  void handleTextareaKeyDown(event)
                }}
                rows={1}
                maxLength={1000}
                disabled={isLoading || isUnavailable}
              />
              <button
                type="submit"
                className={styles.sendButton}
                aria-label="Send message"
                disabled={!input.trim() || isLoading || isUnavailable}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.sendIcon}>
                  <path
                    d="M3.4 11.4 19 4.5a1 1 0 0 1 1.4 1.2l-3.3 12a1 1 0 0 1-1.5.6l-4.2-2.6-2.9 2.9a1 1 0 0 1-1.7-.7v-3.8L3.6 13a1 1 0 0 1-.2-1.6Zm3.8.8 3.1 1.1a1 1 0 0 1 .6.6l1.1 3.1 1.5-1.5a1 1 0 0 1 1.2-.1l2.4 1.5 2.4-8.9-11.4 5.1Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </form>
          </section>
        )}
      </div>
    </>
  )
}
