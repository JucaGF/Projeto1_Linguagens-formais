import { build } from '@/lib/automaton/build'
import type { Automaton } from '@/lib/automaton/types'

export interface Example {
  id: string
  name: string
  description: string
  automaton: Automaton
}

export const EXAMPLES: Example[] = [
  {
    id: 'impar-de-a',
    name: "Número ímpar de a's (exemplo do PDF)",
    description: "AFD sobre {a, b} que aceita as palavras com uma quantidade ímpar de a's.",
    automaton: build({
      states: ['q0', 'q1'],
      initial: 'q0',
      accepting: ['q1'],
      transitions: [
        ['q0', 'b', 'q0'],
        ['q0', 'a', 'q1'],
        ['q1', 'a', 'q0'],
        ['q1', 'b', 'q1'],
      ],
    }),
  },
  {
    id: 'termina-em-ab',
    name: 'Termina em ab',
    description: 'AFD sobre {a, b} que aceita as palavras cujos dois últimos símbolos são ab.',
    automaton: build({
      states: ['q0', 'q1', 'q2'],
      initial: 'q0',
      accepting: ['q2'],
      transitions: [
        ['q0', 'b', 'q0'],
        ['q0', 'a', 'q1'],
        ['q1', 'a', 'q1'],
        ['q1', 'b', 'q2'],
        ['q2', 'a', 'q1'],
        ['q2', 'b', 'q0'],
      ],
    }),
  },
  {
    id: 'contem-aba',
    name: 'Contém aba',
    description:
      'AFN sobre {a, b} que aceita as palavras com aba como subpalavra. Em q0, ler a leva a q0 e a q1 ao mesmo tempo.',
    automaton: build({
      states: ['q0', 'q1', 'q2', 'q3'],
      initial: 'q0',
      accepting: ['q3'],
      transitions: [
        ['q0', 'a,b', 'q0'],
        ['q0', 'a', 'q1'],
        ['q1', 'b', 'q2'],
        ['q2', 'a', 'q3'],
        ['q3', 'a,b', 'q3'],
      ],
    }),
  },
  {
    id: 'as-ou-bs',
    name: "Só a's ou só b's",
    description:
      "AFN com ε-transições que aceita as palavras formadas apenas por a's ou apenas por b's, inclusive a palavra vazia.",
    automaton: build({
      states: ['q0', 'q1', 'q2'],
      initial: 'q0',
      accepting: ['q1', 'q2'],
      transitions: [
        ['q0', 'ε', 'q1'],
        ['q0', 'ε', 'q2'],
        ['q1', 'a', 'q1'],
        ['q2', 'b', 'q2'],
      ],
    }),
  },
]

export const PDF_EXAMPLE: Automaton = EXAMPLES[0].automaton
