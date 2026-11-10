import { describe, expect, it } from 'vitest'
import { EXAMPLES, PDF_EXAMPLE } from '@/examples'
import { build } from './build'
import { epsilonClosure, simulate } from './simulate'

const example = (id: string) => EXAMPLES.find((e) => e.id === id)!.automaton

describe('simulate', () => {
  it('PDF: ímpar de a\'s', () => {
    expect(simulate(PDF_EXAMPLE, 'a').accepted).toBe(true)
    expect(simulate(PDF_EXAMPLE, 'aa').accepted).toBe(false)
    expect(simulate(PDF_EXAMPLE, 'abba').accepted).toBe(false)
    expect(simulate(PDF_EXAMPLE, 'bab').accepted).toBe(true)
  })

  it('passo 0 traz o estado inicial e o primeiro passo dispara a transição', () => {
    const trace = simulate(PDF_EXAMPLE, 'a')
    expect(trace.error).toBeNull()
    expect(trace.steps).toHaveLength(2)
    expect(trace.steps[0]).toEqual({ consumed: 0, symbol: null, active: ['q0'], fired: [], died: [] })
    expect(trace.steps[1]).toEqual({ consumed: 1, symbol: 'a', active: ['q1'], fired: ['q0-q1'], died: [] })
  })

  it('cadeia vazia gera um único passo', () => {
    const rejected = simulate(PDF_EXAMPLE, '')
    expect(rejected.steps).toHaveLength(1)
    expect(rejected.accepted).toBe(false)

    const accepted = simulate(example('as-ou-bs'), '')
    expect(accepted.accepted).toBe(true)
    expect(accepted.steps[0].active).toEqual(['q0', 'q1', 'q2'])
  })

  it('AFN se ramifica', () => {
    const afn = example('contem-aba')
    expect(simulate(afn, 'ba').steps[2].active).toEqual(['q0', 'q1'])
    expect(simulate(afn, 'babab').accepted).toBe(true)
    expect(simulate(afn, 'abba').accepted).toBe(false)
  })

  it('símbolo fora do alfabeto mata todas as cópias', () => {
    const trace = simulate(PDF_EXAMPLE, 'ac')
    expect(trace.steps).toHaveLength(3)
    expect(trace.steps[2].active).toEqual([])
    expect(trace.steps[2].died).toEqual(['q1'])
    expect(trace.accepted).toBe(false)
  })

  it('depois que tudo morre os passos seguintes continuam vazios', () => {
    const trace = simulate(PDF_EXAMPLE, 'acab')
    expect(trace.steps).toHaveLength(5)
    expect(trace.steps[3]).toEqual({ consumed: 3, symbol: 'a', active: [], fired: [], died: [] })
    expect(trace.steps[4]).toEqual({ consumed: 4, symbol: 'b', active: [], fired: [], died: [] })
    expect(trace.accepted).toBe(false)
  })

  it('ciclo de ε termina', () => {
    const cyclic = build({
      states: ['q0', 'q1'],
      initial: 'q0',
      accepting: ['q1'],
      transitions: [
        ['q0', 'ε', 'q1'],
        ['q1', 'ε', 'q0'],
      ],
    })
    const trace = simulate(cyclic, '')
    expect(trace.accepted).toBe(true)
    expect(trace.steps[0].active).toEqual(['q0', 'q1'])
  })

  it('sem inicial', () => {
    const trace = simulate(build({ states: ['q0'], transitions: [] }), 'a')
    expect(trace).toEqual({ input: 'a', steps: [], accepted: false, error: 'no-initial' })
  })

  it('lista as cópias vivas na ordem dos estados e as transições na ordem de a.transitions', () => {
    const afn = example('contem-aba')
    const step = simulate(afn, 'a').steps[1]
    expect(step.active).toEqual(['q0', 'q1'])
    expect(step.fired).toEqual(['q0-q0', 'q0-q1'])
  })

  it('só marca como morto o estado ativo sem transição para o símbolo', () => {
    const step = simulate(example('contem-aba'), 'aa').steps[2]
    expect(step.died).toEqual(['q1'])
    expect(step.active).toEqual(['q0', 'q1'])
    expect(step.fired).toEqual(['q0-q0', 'q0-q1'])
  })

  it('o fecho-ε inicial alimenta a leitura: só q1 lê a e q0 e q2 morrem', () => {
    const afn = example('as-ou-bs')
    const trace = simulate(afn, 'aa')
    expect(trace.steps[1]).toEqual({ consumed: 1, symbol: 'a', active: ['q1'], fired: ['q1-q1'], died: ['q0', 'q2'] })
    expect(trace.accepted).toBe(true)
    expect(simulate(afn, 'ab').accepted).toBe(false)
  })

  it('o fecho-ε vale depois de cada leitura', () => {
    const afn = build({
      states: ['q0', 'q1', 'q2'],
      initial: 'q0',
      accepting: ['q2'],
      transitions: [
        ['q0', 'a', 'q1'],
        ['q1', 'ε', 'q2'],
      ],
    })
    const trace = simulate(afn, 'a')
    expect(trace.steps[1]).toEqual({ consumed: 1, symbol: 'a', active: ['q1', 'q2'], fired: ['q0-q1'], died: [] })
    expect(trace.accepted).toBe(true)
  })

  it('o caractere ε na entrada é um símbolo comum, não segue transição-ε', () => {
    const trace = simulate(example('as-ou-bs'), 'ε')
    expect(trace.steps[1].active).toEqual([])
    expect(trace.steps[1].fired).toEqual([])
    expect(trace.accepted).toBe(false)
  })
})

describe('epsilonClosure', () => {
  it('inclui os próprios estados e segue ε em cadeia', () => {
    const chain = build({
      states: ['q0', 'q1', 'q2', 'q3'],
      initial: 'q0',
      transitions: [
        ['q0', 'ε', 'q1'],
        ['q1', 'ε', 'q2'],
        ['q2', 'a', 'q3'],
      ],
    })
    expect(epsilonClosure(chain, ['q0'])).toEqual(new Set(['q0', 'q1', 'q2']))
    expect(epsilonClosure(chain, ['q3'])).toEqual(new Set(['q3']))
    expect(epsilonClosure(chain, [])).toEqual(new Set())
  })
})
