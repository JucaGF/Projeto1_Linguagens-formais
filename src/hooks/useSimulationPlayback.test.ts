import { describe, expect, it } from 'vitest'
import { simulate } from '@/lib/automaton/simulate'
import { PDF_EXAMPLE } from '@/examples'
import { advancePlayback, PLAYBACK_INTERVAL_MS } from './useSimulationPlayback'

const playing = (input: string, step: number) => ({
  trace: simulate(PDF_EXAMPLE, input),
  step,
  playing: true,
})

describe('advancePlayback', () => {
  it('avança um passo e continua tocando antes do último', () => {
    expect(advancePlayback(playing('abba', 0))).toEqual({ step: 1, playing: true })
    expect(advancePlayback(playing('abba', 2))).toEqual({ step: 3, playing: true })
  })

  it('pausa ao chegar no último passo', () => {
    expect(advancePlayback(playing('abba', 3))).toEqual({ step: 4, playing: false })
  })

  it('no último passo, ou sem passos, só pausa', () => {
    expect(advancePlayback(playing('abba', 4))).toEqual({ step: 4, playing: false })
    expect(advancePlayback(playing('', 0))).toEqual({ step: 0, playing: false })
    const noInitial = { trace: { input: 'a', steps: [], accepted: false, error: 'no-initial' as const }, step: 0, playing: true }
    expect(advancePlayback(noInitial)).toEqual({ step: 0, playing: false })
  })

  it('o intervalo cobre os 0,6s do token', () => {
    expect(PLAYBACK_INTERVAL_MS).toBeGreaterThanOrEqual(600)
  })
})
