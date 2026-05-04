import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  loadConversation,
  appendUserTurn,
  appendAssistantTurn,
  resetMemoryForTest,
  hasPendingClarification,
} from '../src/llm/memory'

describe('memory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetMemoryForTest()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates fresh state for unseen (team, channel, user)', () => {
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toEqual([])
    expect(state.awaitingClarification).toBe(false)
  })

  it('persists messages across calls', () => {
    appendUserTurn('T1', 'C1', 'U1', 'hello')
    appendAssistantTurn('T1', 'C1', 'U1', 'hi there', false)
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0]).toMatchObject({ role: 'user', content: 'hello' })
    expect(state.messages[1]).toMatchObject({ role: 'assistant', content: 'hi there' })
  })

  it('expires conversation after 15 minutes idle', () => {
    appendUserTurn('T1', 'C1', 'U1', 'hello')
    vi.advanceTimersByTime(16 * 60 * 1000)
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toEqual([])
  })

  it('keeps conversation alive within 15 minutes', () => {
    appendUserTurn('T1', 'C1', 'U1', 'hello')
    vi.advanceTimersByTime(14 * 60 * 1000)
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toHaveLength(1)
  })

  it('truncates to last 20 messages', () => {
    for (let i = 0; i < 25; i++) {
      appendUserTurn('T1', 'C1', 'U1', `msg${i}`)
    }
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toHaveLength(20)
    expect(state.messages[0].content).toBe('msg5')
    expect(state.messages[19].content).toBe('msg24')
  })

  it('separates state per (channel, user)', () => {
    appendUserTurn('T1', 'C1', 'U1', 'alice in c1')
    appendUserTurn('T1', 'C1', 'U2', 'bob in c1')
    appendUserTurn('T1', 'C2', 'U1', 'alice in c2')
    expect(loadConversation('T1', 'C1', 'U1').messages[0].content).toBe('alice in c1')
    expect(loadConversation('T1', 'C1', 'U2').messages[0].content).toBe('bob in c1')
    expect(loadConversation('T1', 'C2', 'U1').messages[0].content).toBe('alice in c2')
  })

  it('flags awaitingClarification when assistant turn is a question', () => {
    appendAssistantTurn('T1', 'C1', 'U1', 'Which Acme project?', true)
    expect(hasPendingClarification('T1', 'C1', 'U1')).toBe(true)
  })

  it('clears awaitingClarification on next user turn', () => {
    appendAssistantTurn('T1', 'C1', 'U1', 'Which one?', true)
    appendUserTurn('T1', 'C1', 'U1', 'the spot')
    expect(hasPendingClarification('T1', 'C1', 'U1')).toBe(false)
  })

  it('hasPendingClarification returns false when no state', () => {
    expect(hasPendingClarification('T1', 'C1', 'U1')).toBe(false)
  })
})
