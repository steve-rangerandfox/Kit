'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Send, Loader } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    title: string
    projectId?: string
    documentId?: string
    url?: string
  }>
  suggestedQuestions?: string[]
  timestamp: Date
}

interface ChatProps {
  suggestedQuestions: string[]
}

export function Chat({ suggestedQuestions }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 96) // Max 4 lines
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [input])

  const handleSendMessage = async (messageText: string = input.trim()) => {
    if (!messageText) return

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      // Call the Ask Kit API
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from Kit')
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.response,
        sources: data.sources || [],
        suggestedQuestions: data.suggestedQuestions || [],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  // Empty state with suggested questions
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#2a2f3d]">
          <h1 className="text-3xl font-bold text-white mb-2">Ask Kit</h1>
          <p className="text-[#9ca3af]">Ask anything about your projects, timelines, budgets, and team</p>
        </div>

        {/* Empty State Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center px-8 py-12">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold text-white mb-3">What would you like to know?</h2>
              <p className="text-[#9ca3af]">Kit can help you understand project status, budget health, team capacity, and more</p>
            </div>

            {/* Suggested Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {suggestedQuestions.map((question, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="group relative overflow-hidden text-left p-4 bg-[#181B24] border border-[#2a2f3d] rounded-lg hover:border-indigo-500/50 hover:bg-[#1f2332] transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-white font-medium relative z-10 text-sm">{question}</p>
                  <p className="text-[#6B7280] text-xs mt-1 relative z-10">Click to ask Kit</p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-8 py-6 border-t border-[#2a2f3d] bg-[#0C0E12]">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Kit anything..."
                  rows={1}
                  className="w-full px-4 py-3 bg-[#181B24] border border-[#2a2f3d] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-colors"
                  style={{ minHeight: '42px', maxHeight: '96px' }}
                />
              </div>
              <Button
                size="md"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-[#6B7280] mt-2">
              Tip: Press Enter to send, Shift+Enter for a new line
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Conversation view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#2a2f3d]">
        <h1 className="text-2xl font-bold text-white">Ask Kit</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
          <AnimatePresence mode="wait">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xl ${
                    message.role === 'user'
                      ? 'bg-indigo-600 rounded-lg rounded-tr-none'
                      : 'bg-[#181B24] border border-[#2a2f3d] rounded-lg rounded-tl-none'
                  } p-4`}
                >
                  {message.role === 'user' ? (
                    <p className="text-white text-sm">{message.content}</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Parse basic markdown-like formatting */}
                      <div className="text-[#9ca3af] text-sm leading-relaxed">
                        {message.content.split('\n').map((paragraph, i) => {
                          // Handle bold text
                          const parts = paragraph.split(/\*\*(.*?)\*\*/g)
                          return (
                            <p key={i} className="mb-2 last:mb-0">
                              {parts.map((part, j) =>
                                j % 2 === 0 ? (
                                  part
                                ) : (
                                  <span key={j} className="font-semibold text-white">
                                    {part}
                                  </span>
                                )
                              )}
                            </p>
                          )
                        })}
                      </div>

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="pt-3 border-t border-[#2a2f3d] space-y-2">
                          <p className="text-xs text-[#6B7280] font-medium">Sources:</p>
                          <div className="space-y-1">
                            {message.sources.map((source, i) => (
                              <a
                                key={i}
                                href={source.url || '#'}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors block truncate"
                              >
                                {source.projectId && `[${source.projectId}] `}
                                {source.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested follow-up questions */}
                      {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                        <div className="pt-3 border-t border-[#2a2f3d] space-y-2">
                          <p className="text-xs text-[#6B7280] font-medium">Follow-up questions:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestedQuestions.map((question, i) => (
                              <button
                                key={i}
                                onClick={() => handleSuggestedQuestion(question)}
                                className="text-xs px-2 py-1 bg-[#252d3d] hover:bg-[#2a3545] text-indigo-300 hover:text-indigo-200 rounded transition-colors border border-[#2a2f3d] hover:border-indigo-500/50"
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-[#181B24] border border-[#2a2f3d] rounded-lg rounded-tl-none p-4">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="text-sm text-[#9ca3af]">Kit is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="px-8 py-6 border-t border-[#2a2f3d] bg-[#0C0E12]">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Kit anything..."
                rows={1}
                className="w-full px-4 py-3 bg-[#181B24] border border-[#2a2f3d] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-colors"
                style={{ minHeight: '42px', maxHeight: '96px' }}
              />
            </div>
            <Button
              size="md"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">
            Tip: Press Enter to send, Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  )
}
