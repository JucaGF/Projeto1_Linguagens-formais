import { describe, expect, it } from 'vitest'
import { EXAMPLES, PDF_EXAMPLE } from '@/examples'
import { analyze, transitionTable } from './analysis'
import { build } from './build'

const example = (id: string) => EXAMPLES.find((e) => e.id === id)!.automaton

describe('analyze', () => {
  it('exemplo do PDF é AFD completo', () => {
    expect(analyze(PDF_EXAMPLE)).toEqual({
      alphabet: ['a', 'b'],
      kind: 'DFA',
      conflicts: [],
      missing: [],
      initial: 'q0',
      accepting: ['q1'],
      unreachable: [],
      warnings: [],
    })
  })

  it('contem-aba é AFN por não determinismo', () => {
    const result = analyze(example('contem-aba'))
    expect(result.kind).toBe('NFA')
    expect(result.conflicts).toContainEqual({
      kind: 'nondeterministic',
      stateId: 'q0',
      symbol: 'a',
      transitionIds: ['q0-q0', 'q0-q1'],
    })
    expect(result.conflicts).toHaveLength(1)
  })

  it('AFN não lista transições faltantes nem avisa de AFD incompleto', () => {
    const result = analyze(example('contem-aba'))
    expect(result.missing).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('as-ou-bs é AFN por ε', () => {
    const result = analyze(example('as-ou-bs'))
    expect(result.alphabet).toEqual(['a', 'b'])
    expect(result.kind).toBe('NFA')
    expect(result.conflicts).toEqual([
      { kind: 'epsilon', transitionId: 'q0-q1' },
      { kind: 'epsilon', transitionId: 'q0-q2' },
    ])
  })

  it('segue transições ε na alcançabilidade', () => {
    const result = analyze(example('as-ou-bs'))
    expect(result.unreachable).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('AFD incompleto lista o que falta e avisa', () => {
    const a = build({
      states: ['q0', 'q1'],
      initial: 'q0',
      transitions: [['q0', 'a,b', 'q1']],
    })
    const result = analyze(a)
    expect(result.kind).toBe('DFA')
    expect(result.missing).toEqual([
      { stateId: 'q1', symbol: 'a' },
      { stateId: 'q1', symbol: 'b' },
    ])
    expect(result.warnings).toEqual([
      'Nenhum estado de aceitação — clique com o botão direito num estado',
      'AFD incompleto: faltam 2 transições',
    ])
  })

  it('AFD com uma única transição faltando avisa no singular', () => {
    const a = build({
      states: ['q0', 'q1'],
      initial: 'q0',
      accepting: ['q1'],
      transitions: [['q0', 'a', 'q1']],
    })
    const result = analyze(a)
    expect(result.missing).toEqual([{ stateId: 'q1', symbol: 'a' }])
    expect(result.warnings).toEqual(['AFD incompleto: falta 1 transição'])
  })

  it('transição com símbolo e ε ao mesmo tempo gera conflito ε', () => {
    const a = build({
      states: ['q0', 'q1'],
      initial: 'q0',
      accepting: ['q1'],
      transitions: [['q0', 'b,ε', 'q1']],
    })
    const result = analyze(a)
    expect(result.alphabet).toEqual(['b'])
    expect(result.kind).toBe('NFA')
    expect(result.conflicts).toEqual([{ kind: 'epsilon', transitionId: 'q0-q1' }])
  })

  it('estado sem caminho a partir do inicial é inalcançável', () => {
    const a = build({
      states: ['q0', 'q2'],
      initial: 'q0',
      accepting: ['q0'],
      transitions: [['q0', 'a', 'q0']],
    })
    const result = analyze(a)
    expect(result.unreachable).toEqual(['q2'])
    expect(result.warnings).toContain('Estado inalcançável: q2')
  })

  it('inalcançáveis em cadeia saem na ordem dos estados, um aviso por estado', () => {
    const a = build({
      states: ['q0', 'q1', 'q2', 'q3'],
      initial: 'q0',
      accepting: ['q0'],
      transitions: [
        ['q0', 'a', 'q0'],
        ['q3', 'a', 'q2'],
        ['q2', 'a', 'q1'],
      ],
    })
    const result = analyze(a)
    expect(result.unreachable).toEqual(['q1', 'q2', 'q3'])
    expect(result.warnings.filter((w) => w.startsWith('Estado inalcançável'))).toEqual([
      'Estado inalcançável: q1',
      'Estado inalcançável: q2',
      'Estado inalcançável: q3',
    ])
  })

  it('sem estado inicial: initial é null, nada é inalcançável e o primeiro aviso o denuncia', () => {
    const a = build({
      states: ['q0', 'q1'],
      accepting: ['q1'],
      transitions: [['q0', 'a', 'q1']],
    })
    const result = analyze(a)
    expect(result.initial).toBeNull()
    expect(result.unreachable).toEqual([])
    expect(result.warnings[0]).toBe('Nenhum estado inicial — clique com o botão direito num estado')
  })

  it('avisos saem na ordem: inicial, aceitação, inalcançáveis, AFD incompleto', () => {
    const noInitial = build({
      states: ['q0', 'q1'],
      transitions: [
        ['q0', 'a', 'q1'],
        ['q1', 'a', 'q0'],
      ],
    })
    expect(analyze(noInitial).warnings).toEqual([
      'Nenhum estado inicial — clique com o botão direito num estado',
      'Nenhum estado de aceitação — clique com o botão direito num estado',
    ])

    const rest = build({
      states: ['q0', 'q1', 'q2'],
      initial: 'q0',
      transitions: [['q0', 'a', 'q1']],
    })
    expect(analyze(rest).warnings).toEqual([
      'Nenhum estado de aceitação — clique com o botão direito num estado',
      'Estado inalcançável: q2',
      'AFD incompleto: faltam 2 transições',
    ])
  })

  it('autômato de um estado sem transições é AFD com alfabeto vazio e nada faltando', () => {
    const a = build({ states: ['q0'], initial: 'q0', accepting: ['q0'], transitions: [] })
    expect(analyze(a)).toMatchObject({
      alphabet: [],
      kind: 'DFA',
      missing: [],
      warnings: [],
    })
  })

  it('alfabeto é ordenado, sem repetições e sem ε', () => {
    const a = build({
      states: ['q0', 'q1'],
      initial: 'q0',
      accepting: ['q1'],
      transitions: [
        ['q0', 'b,ε', 'q1'],
        ['q1', 'b,1,a', 'q0'],
      ],
    })
    expect(analyze(a).alphabet).toEqual(['1', 'a', 'b'])
  })

  it('ordena conflitos por estado, depois símbolo; ε por último, na ordem das transições', () => {
    const a = build({
      states: ['q0', 'q1', 'q2'],
      initial: 'q0',
      transitions: [
        ['q1', 'b', 'q1'],
        ['q1', 'b', 'q2'],
        ['q0', 'b,a', 'q1'],
        ['q0', 'a,b', 'q0'],
        ['q2', 'ε', 'q0'],
        ['q1', 'ε', 'q2'],
      ],
    })
    expect(analyze(a).conflicts).toEqual([
      { kind: 'nondeterministic', stateId: 'q0', symbol: 'a', transitionIds: ['q0-q1', 'q0-q0'] },
      { kind: 'nondeterministic', stateId: 'q0', symbol: 'b', transitionIds: ['q0-q1', 'q0-q0'] },
      { kind: 'nondeterministic', stateId: 'q1', symbol: 'b', transitionIds: ['q1-q1', 'q1-q2'] },
      { kind: 'epsilon', transitionId: 'q1-q2' },
      { kind: 'epsilon', transitionId: 'q2-q0' },
    ])
  })

  it.each(EXAMPLES.map((e) => [e.id, e.automaton] as const))('o exemplo %s não gera avisos', (_id, automaton) => {
    expect(analyze(automaton).warnings).toEqual([])
  })
})

describe('transitionTable', () => {
  it('colunas são o alfabeto; cada célula lista todos os destinos', () => {
    const table = transitionTable(example('contem-aba'))
    expect(table.columns).toEqual(['a', 'b'])
    const q0 = table.rows.find((r) => r.state.id === 'q0')!
    expect(q0.cells.a).toEqual(['q0', 'q1'])
    expect(q0.cells.b).toEqual(['q0'])
  })

  it('uma linha por estado, na ordem dos estados, carregando o próprio estado', () => {
    const a = example('contem-aba')
    const table = transitionTable(a)
    expect(table.rows.map((r) => r.state)).toEqual(a.states)
  })

  it('transição inexistente vira célula vazia', () => {
    const table = transitionTable(example('contem-aba'))
    const q1 = table.rows.find((r) => r.state.id === 'q1')!
    expect(q1.cells.a).toEqual([])
    expect(q1.cells.b).toEqual(['q2'])
  })

  it('acrescenta a coluna ε ao fim quando alguma transição é ε', () => {
    const table = transitionTable(example('as-ou-bs'))
    expect(table.columns).toEqual(['a', 'b', 'ε'])
    const q0 = table.rows.find((r) => r.state.id === 'q0')!
    expect(q0.cells['ε']).toEqual(['q1', 'q2'])
    expect(q0.cells.a).toEqual([])
  })

  it('destinos seguem a ordem dos estados, não a das transições', () => {
    const a = build({
      states: ['q0', 'q1', 'q2'],
      transitions: [
        ['q0', 'a', 'q2'],
        ['q0', 'a', 'q1'],
      ],
    })
    expect(transitionTable(a).rows[0].cells.a).toEqual(['q1', 'q2'])
  })
})
