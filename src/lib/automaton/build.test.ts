import { describe, expect, it } from 'vitest'
import { build } from './build'
import { circleLayout } from './geometry'

describe('build', () => {
  it('usa o rótulo como id e posiciona os estados em círculo', () => {
    const a = build({ states: ['q0', 'q1', 'q2'], transitions: [] })
    expect(a.states.map((s) => s.id)).toEqual(['q0', 'q1', 'q2'])
    expect(a.states.map((s) => s.label)).toEqual(['q0', 'q1', 'q2'])
    a.states.forEach((s, i) => {
      expect({ x: s.x, y: s.y }).toEqual(circleLayout(3, i))
    })
  })

  it('marca inicial e finais; sem `initial` não há estado inicial', () => {
    const a = build({ states: ['q0', 'q1'], initial: 'q0', accepting: ['q1'], transitions: [] })
    expect(a.states.map((s) => [s.isInitial, s.isAccepting])).toEqual([
      [true, false],
      [false, true],
    ])
    const b = build({ states: ['q0'], transitions: [] })
    expect(b.states[0]).toMatchObject({ isInitial: false, isAccepting: false })
  })

  it('cria transições com id `${from}-${to}` e símbolos separados por vírgula', () => {
    const a = build({ states: ['q0', 'q1'], transitions: [['q0', 'a, b', 'q1']] })
    expect(a.transitions).toEqual([{ id: 'q0-q1', from: 'q0', to: 'q1', symbols: ['a', 'b'] }])
  })

  it('mescla símbolos do mesmo par, preservando a ordem de listagem', () => {
    const a = build({
      states: ['q0', 'q1'],
      transitions: [
        ['q0', 'a', 'q1'],
        ['q1', 'b', 'q0'],
        ['q0', 'b,a', 'q1'],
      ],
    })
    expect(a.transitions.map((t) => [t.id, t.symbols])).toEqual([
      ['q0-q1', ['a', 'b']],
      ['q1-q0', ['b']],
    ])
  })

  it('entende ε e o apelido eps', () => {
    const a = build({ states: ['q0', 'q1'], transitions: [['q0', 'eps', 'q1']] })
    expect(a.transitions[0].symbols).toEqual(['ε'])
  })

  it('falha alto diante de referências ou símbolos inválidos', () => {
    expect(() => build({ states: ['q0'], initial: 'q9', transitions: [] })).toThrow(/q9/)
    expect(() => build({ states: ['q0'], accepting: ['q9'], transitions: [] })).toThrow(/q9/)
    expect(() => build({ states: ['q0'], transitions: [['q0', 'a', 'q9']] })).toThrow(/q9/)
    expect(() => build({ states: ['q0', 'q1'], transitions: [['q0', 'ab', 'q1']] })).toThrow(/ab/)
    expect(() => build({ states: ['q0', 'q0'], transitions: [] })).toThrow(/q0/)
  })
})
