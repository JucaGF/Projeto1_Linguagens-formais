import { describe, expect, it } from 'vitest'
import { PDF_EXAMPLE } from '@/examples'
import { analyze } from '@/lib/automaton/analysis'
import { build } from '@/lib/automaton/build'
import { simulate } from '@/lib/automaton/simulate'
import type { Automaton } from '@/lib/automaton/types'
import type { SimulationState } from '@/store/editor'
import { islandDetails, islandStatus } from './status'

const status = (a: Automaton, simulation: SimulationState | null = null) =>
  islandStatus(a, analyze(a), simulation)

describe('islandStatus', () => {
  it('convida a criar um estado quando o autômato está vazio', () => {
    expect(status({ states: [], transitions: [] })).toEqual({
      tone: 'empty',
      text: 'Vazio — dê dois cliques para criar um estado',
    })
  })

  it('marca o AFD completo com ✓', () => {
    expect(status(PDF_EXAMPLE)).toEqual({ tone: 'dfa', text: 'AFD ✓' })
  })

  it('avisa o AFD incompleto', () => {
    const a = build({ states: ['q0', 'q1'], transitions: [['q0', 'a', 'q1']] })
    expect(status(a)).toEqual({ tone: 'incomplete', text: 'AFD incompleto' })
  })

  it('conta os conflitos do AFN no singular e no plural', () => {
    const one = build({
      states: ['q0', 'q1'],
      transitions: [
        ['q0', 'a,b', 'q0'],
        ['q0', 'a', 'q1'],
      ],
    })
    expect(status(one)).toEqual({ tone: 'nfa', text: 'AFN · 1 conflito' })
    const two = build({
      states: ['q0', 'q1'],
      transitions: [
        ['q0', 'a,b', 'q0'],
        ['q0', 'a,ε', 'q1'],
      ],
    })
    expect(status(two).text).toBe('AFN · 2 conflitos')
  })

  it('mostra o passo e o símbolo lido durante a simulação', () => {
    const trace = simulate(PDF_EXAMPLE, 'ab')
    expect(status(PDF_EXAMPLE, { trace, step: 0, playing: false }).text).toBe('Passo 0/2')
    expect(status(PDF_EXAMPLE, { trace, step: 2, playing: false })).toEqual({
      tone: 'simulating',
      text: "Passo 2/2 · lendo 'b'",
    })
  })
})

describe('islandDetails', () => {
  it('não lista avisos com o autômato vazio', () => {
    const empty = { states: [], transitions: [] }
    expect(islandDetails(empty, analyze(empty))).toEqual([])
  })

  it('explica cada conflito antes dos avisos', () => {
    const a = build({
      states: ['q0', 'q1'],
      initial: 'q0',
      transitions: [
        ['q0', 'a', 'q0'],
        ['q0', 'a,ε', 'q1'],
      ],
    })
    expect(islandDetails(a, analyze(a))).toEqual([
      'δ(q0, a) tem 2 destinos',
      'ε-transição de q0 para q1',
      'Nenhum estado de aceitação',
    ])
  })
})
