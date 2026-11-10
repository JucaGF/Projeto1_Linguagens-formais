import { describe, expect, it } from 'vitest'
import { simulate } from '@/lib/automaton/simulate'
import { EXAMPLES, PDF_EXAMPLE } from './index'

function wordsUpTo(length: number): string[] {
  let level = ['']
  const all = ['']
  for (let i = 0; i < length; i++) {
    level = level.flatMap((w) => [`${w}a`, `${w}b`])
    all.push(...level)
  }
  return all
}

const languages: Record<string, (w: string) => boolean> = {
  'impar-de-a': (w) => [...w].filter((c) => c === 'a').length % 2 === 1,
  'termina-em-ab': (w) => w.endsWith('ab'),
  'contem-aba': (w) => w.includes('aba'),
  'as-ou-bs': (w) => !(w.includes('a') && w.includes('b')),
}

describe('EXAMPLES', () => {
  it('traz os quatro exemplos, com o do PDF em primeiro', () => {
    expect(EXAMPLES.map((e) => e.id)).toEqual(['impar-de-a', 'termina-em-ab', 'contem-aba', 'as-ou-bs'])
    expect(PDF_EXAMPLE).toBe(EXAMPLES[0].automaton)
  })

  it.each(EXAMPLES.map((e) => [e.id, e] as const))('%s é um autômato bem formado', (_id, example) => {
    const { states, transitions } = example.automaton
    const ids = new Set(states.map((s) => s.id))
    expect(example.name).not.toBe('')
    expect(example.description).not.toBe('')
    expect(states.filter((s) => s.isInitial)).toHaveLength(1)
    expect(states.some((s) => s.isAccepting)).toBe(true)
    expect(new Set(states.map((s) => s.label)).size).toBe(states.length)
    expect(new Set(transitions.map((t) => t.id)).size).toBe(transitions.length)
    for (const t of transitions) {
      expect(ids.has(t.from) && ids.has(t.to)).toBe(true)
      expect(t.symbols.length).toBeGreaterThan(0)
    }
  })

  it.each(EXAMPLES.map((e) => [e.id, e] as const))('%s reconhece a linguagem anunciada', (id, example) => {
    const inLanguage = languages[id]
    for (const word of wordsUpTo(6)) {
      expect(simulate(example.automaton, word).accepted, `"${word}"`).toBe(inLanguage(word))
    }
  })
})
