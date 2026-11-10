import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addState,
  addTransition,
  emptyAutomaton,
  labelError,
  moveState,
  removeState,
  removeTransition,
  renameState,
  setInitial,
  setTransitionSymbols,
  toggleAccepting,
} from './operations'
import type { Automaton, StateId } from './types'

const at = { x: 0, y: 0 }

function withStates(count: number): { a: Automaton; ids: StateId[] } {
  let a = emptyAutomaton()
  const ids: StateId[] = []
  for (let i = 0; i < count; i++) {
    const created = addState(a, at)
    a = created.automaton
    ids.push(created.state.id)
  }
  return { a, ids }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('addState', () => {
  it('numera q0, q1 e só o primeiro é inicial', () => {
    const { a } = withStates(2)
    expect(a.states.map((s) => s.label)).toEqual(['q0', 'q1'])
    expect(a.states.map((s) => s.isInitial)).toEqual([true, false])
  })

  it('reaproveita o menor índice livre', () => {
    const { a, ids } = withStates(2)
    const { state } = addState(removeState(a, ids[0]), at)
    expect(state.label).toBe('q0')
  })

  it('posiciona o centro do estado no ponto dado e devolve o estado criado', () => {
    const { automaton, state } = addState(emptyAutomaton(), { x: 12, y: 34 })
    expect(state).toMatchObject({ x: 12, y: 34, isAccepting: false })
    expect(automaton.states).toEqual([state])
  })

  it('gera ids distintos', () => {
    const { ids } = withStates(3)
    expect(new Set(ids).size).toBe(3)
  })

  it('não torna inicial um estado novo quando já existem estados', () => {
    const { a, ids } = withStates(2)
    const { automaton, state } = addState(removeState(a, ids[0]), at)
    expect(state.isInitial).toBe(false)
    expect(automaton.states.some((s) => s.isInitial)).toBe(false)
  })
})

describe('ids fora de contexto seguro', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sem crypto.randomUUID os estados e transições ainda ganham ids distintos', () => {
    vi.stubGlobal('crypto', {})
    const { a, ids } = withStates(3)
    expect(new Set(ids).size).toBe(3)
    expect(ids.every((id) => id.length > 0)).toBe(true)

    const linked = addTransition(addTransition(a, ids[0], ids[1], ['a']), ids[1], ids[2], ['b'])
    const transitionIds = linked.transitions.map((t) => t.id)
    expect(new Set(transitionIds).size).toBe(2)
  })
})

describe('removeState', () => {
  it('remove as transições ligadas', () => {
    const { a, ids } = withStates(2)
    const [q0, q1] = ids
    let b = addTransition(a, q0, q1, ['a'])
    b = addTransition(b, q1, q0, ['b'])
    b = addTransition(b, q1, q1, ['b'])
    expect(removeState(b, q1).transitions).toEqual([])
  })

  it('preserva as transições que não tocam o estado removido', () => {
    const { a, ids } = withStates(3)
    const [q0, q1, q2] = ids
    let b = addTransition(a, q0, q2, ['a'])
    b = addTransition(b, q0, q1, ['b'])
    const result = removeState(b, q1)
    expect(result.states.map((s) => s.id)).toEqual([q0, q2])
    expect(result.transitions.map((t) => [t.from, t.to])).toEqual([[q0, q2]])
  })

  it('do inicial deixa sem inicial', () => {
    const { a, ids } = withStates(2)
    expect(removeState(a, ids[0]).states.some((s) => s.isInitial)).toBe(false)
  })
})

describe('moveState', () => {
  it('troca apenas a posição do estado indicado', () => {
    const { a, ids } = withStates(2)
    const result = moveState(a, ids[1], { x: 50, y: 60 })
    expect(result.states[1]).toMatchObject({ x: 50, y: 60 })
    expect(result.states[0]).toEqual(a.states[0])
  })
})

describe('setInitial', () => {
  it('deixa exatamente um inicial', () => {
    const { a, ids } = withStates(3)
    const result = setInitial(a, ids[1])
    expect(result.states.filter((s) => s.isInitial).map((s) => s.id)).toEqual([ids[1]])
  })

  it('devolve o mesmo objeto quando o estado não existe, sem apagar o inicial', () => {
    const { a } = withStates(2)
    expect(setInitial(a, 'inexistente')).toBe(a)
  })
})

describe('toggleAccepting', () => {
  it('alterna o estado de aceitação sem afetar os demais', () => {
    const { a, ids } = withStates(2)
    const once = toggleAccepting(a, ids[1])
    expect(once.states.map((s) => s.isAccepting)).toEqual([false, true])
    expect(toggleAccepting(once, ids[1]).states.map((s) => s.isAccepting)).toEqual([false, false])
  })
})

describe('labelError', () => {
  it('rejeita nome vazio ou só com espaços', () => {
    const { a, ids } = withStates(2)
    expect(labelError(a, ids[0], '')).toBe('O nome não pode ser vazio')
    expect(labelError(a, ids[0], '  ')).toBe('O nome não pode ser vazio')
  })

  it('rejeita o nome de outro estado', () => {
    const { a, ids } = withStates(2)
    expect(labelError(a, ids[0], 'q1')).toBe('Já existe um estado chamado "q1"')
  })

  it('aceita o próprio nome do estado e nomes livres', () => {
    const { a, ids } = withStates(2)
    expect(labelError(a, ids[0], 'q0')).toBeNull()
    expect(labelError(a, ids[0], 'inicio')).toBeNull()
  })

  it('compara o nome sem os espaços das pontas', () => {
    const { a, ids } = withStates(2)
    expect(labelError(a, ids[0], ' q1 ')).toBe('Já existe um estado chamado "q1"')
  })
})

describe('renameState', () => {
  it('com nome inválido devolve o mesmo objeto', () => {
    const { a, ids } = withStates(2)
    expect(renameState(a, ids[0], 'q1')).toBe(a)
    expect(renameState(a, ids[0], '')).toBe(a)
  })

  it('grava o nome sem espaços nas pontas', () => {
    const { a, ids } = withStates(2)
    const result = renameState(a, ids[0], '  inicio ')
    expect(result.states.map((s) => s.label)).toEqual(['inicio', 'q1'])
  })

  it('libera o nome antigo para outro estado', () => {
    const { a, ids } = withStates(2)
    const renamed = renameState(a, ids[0], 'x')
    expect(labelError(renamed, ids[1], 'q0')).toBeNull()
  })
})

describe('addTransition', () => {
  it('mescla símbolos no mesmo par', () => {
    const { a, ids } = withStates(2)
    const [q0, q1] = ids
    const result = addTransition(addTransition(a, q0, q1, ['a']), q0, q1, ['a', 'b'])
    expect(result.transitions).toHaveLength(1)
    expect(result.transitions[0]).toMatchObject({ from: q0, to: q1, symbols: ['a', 'b'] })
  })

  it('mantém transições de sentidos opostos separadas', () => {
    const { a, ids } = withStates(2)
    const [q0, q1] = ids
    const result = addTransition(addTransition(a, q0, q1, ['a']), q1, q0, ['a'])
    expect(result.transitions.map((t) => [t.from, t.to])).toEqual([
      [q0, q1],
      [q1, q0],
    ])
  })

  it('aceita laço no mesmo estado', () => {
    const { a, ids } = withStates(1)
    const result = addTransition(a, ids[0], ids[0], ['a'])
    expect(result.transitions).toHaveLength(1)
  })

  it('remove duplicados dentro dos próprios símbolos', () => {
    const { a, ids } = withStates(2)
    const result = addTransition(a, ids[0], ids[1], ['a', 'a', 'b'])
    expect(result.transitions[0].symbols).toEqual(['a', 'b'])
  })

  it('devolve o mesmo objeto sem símbolos ou com estado inexistente', () => {
    const { a, ids } = withStates(2)
    expect(addTransition(a, ids[0], ids[1], [])).toBe(a)
    expect(addTransition(a, ids[0], 'inexistente', ['a'])).toBe(a)
    expect(addTransition(a, 'inexistente', ids[1], ['a'])).toBe(a)
  })

  it('gera ids distintos para transições distintas', () => {
    const { a, ids } = withStates(3)
    const [q0, q1, q2] = ids
    const result = addTransition(addTransition(a, q0, q1, ['a']), q1, q2, ['a'])
    expect(new Set(result.transitions.map((t) => t.id)).size).toBe(2)
  })
})

describe('setTransitionSymbols', () => {
  it('substitui os símbolos da transição', () => {
    const { a, ids } = withStates(2)
    const b = addTransition(a, ids[0], ids[1], ['a'])
    const result = setTransitionSymbols(b, b.transitions[0].id, ['b', 'c', 'b'])
    expect(result.transitions[0].symbols).toEqual(['b', 'c'])
  })

  it('com [] remove a transição', () => {
    const { a, ids } = withStates(2)
    const b = addTransition(a, ids[0], ids[1], ['a'])
    expect(setTransitionSymbols(b, b.transitions[0].id, []).transitions).toEqual([])
  })

  it('devolve o mesmo objeto quando a transição não existe', () => {
    const { a } = withStates(2)
    expect(setTransitionSymbols(a, 'inexistente', ['a'])).toBe(a)
  })
})

describe('removeTransition', () => {
  it('remove só a transição indicada', () => {
    const { a, ids } = withStates(3)
    const [q0, q1, q2] = ids
    const b = addTransition(addTransition(a, q0, q1, ['a']), q1, q2, ['b'])
    const result = removeTransition(b, b.transitions[0].id)
    expect(result.transitions.map((t) => t.to)).toEqual([q2])
  })

  it('devolve o mesmo objeto quando a transição não existe', () => {
    const { a } = withStates(2)
    expect(removeTransition(a, 'inexistente')).toBe(a)
  })
})

describe('imutabilidade', () => {
  it('nenhuma operação altera o autômato recebido', () => {
    const { a, ids } = withStates(3)
    const [q0, q1] = ids
    const populated = addTransition(addTransition(a, q0, q1, ['a']), q1, q0, ['b'])
    const snapshot = structuredClone(populated)
    const frozen = deepFreeze(populated)
    const tid = frozen.transitions[0].id

    addState(frozen, at)
    removeState(frozen, q0)
    moveState(frozen, q0, { x: 9, y: 9 })
    renameState(frozen, q0, 'novo')
    setInitial(frozen, q1)
    toggleAccepting(frozen, q0)
    addTransition(frozen, q0, q1, ['c'])
    setTransitionSymbols(frozen, tid, ['z'])
    setTransitionSymbols(frozen, tid, [])
    removeTransition(frozen, tid)

    expect(frozen).toEqual(snapshot)
  })
})
