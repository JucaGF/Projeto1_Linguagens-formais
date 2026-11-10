import { describe, expect, it } from 'vitest'
import { PDF_EXAMPLE } from '@/examples'
import { build } from '@/lib/automaton/build'
import { deltaEntries, deltaValue, formatSet } from './notation'

const text = (entries: ReturnType<typeof deltaEntries>) =>
  entries.map((e) => `δ(${e.state}, ${e.symbol}) = ${e.value}`)

describe('formatSet', () => {
  it('usa ∅ para o conjunto vazio e chaves para os demais', () => {
    expect(formatSet([])).toBe('∅')
    expect(formatSet(['q0', 'q1'])).toBe('{q0, q1}')
  })
})

describe('deltaValue', () => {
  it('no AFD o valor é o estado; no AFN é sempre um conjunto', () => {
    expect(deltaValue(['q1'], 'DFA')).toBe('q1')
    expect(deltaValue(['q1'], 'NFA')).toBe('{q1}')
    expect(deltaValue(['q0', 'q1'], 'NFA')).toBe('{q0, q1}')
    expect(deltaValue([], 'NFA')).toBe('∅')
  })
})

describe('deltaEntries', () => {
  it('lista δ do exemplo do PDF na ordem dos estados e do alfabeto', () => {
    expect(text(deltaEntries(PDF_EXAMPLE, 'DFA'))).toEqual([
      'δ(q0, a) = q1',
      'δ(q0, b) = q0',
      'δ(q1, a) = q0',
      'δ(q1, b) = q1',
    ])
  })

  it('no AFN junta os destinos e põe ε por último', () => {
    const nfa = build({
      states: ['q0', 'q1', 'q2'],
      transitions: [
        ['q0', 'a', 'q0'],
        ['q0', 'a', 'q1'],
        ['q0', 'ε', 'q2'],
      ],
    })
    expect(text(deltaEntries(nfa, 'NFA'))).toEqual([
      'δ(q0, a) = {q0, q1}',
      'δ(q0, ε) = {q2}',
    ])
  })

  it('omite as entradas indefinidas', () => {
    const partial = build({ states: ['q0', 'q1'], transitions: [['q0', 'a', 'q1']] })
    expect(text(deltaEntries(partial, 'DFA'))).toEqual(['δ(q0, a) = q1'])
  })
})
