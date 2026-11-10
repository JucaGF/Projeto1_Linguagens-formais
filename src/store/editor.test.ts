import { beforeEach, describe, expect, it } from 'vitest'
import { PDF_EXAMPLE } from '@/examples'
import { build } from '@/lib/automaton/build'
import type { StateId } from '@/lib/automaton/types'
import { useEditor } from './editor'

const initial = useEditor.getState()
const editor = () => useEditor.getState()
const history = () => useEditor.temporal.getState()

function addTwoStates(): [StateId, StateId] {
  editor().addStateAt({ x: 0, y: 0 })
  editor().addStateAt({ x: 100, y: 0 })
  const [first, second] = editor().automaton.states
  return [first.id, second.id]
}

function pendingTransitionBetween(from: StateId, to: StateId) {
  editor().setTool('add-transition')
  editor().clickState(from)
  editor().clickState(to)
}

beforeEach(() => {
  useEditor.setState(initial, true)
  history().clear()
})

describe('estado inicial', () => {
  it('começa com um autômato vazio e a ferramenta de seleção', () => {
    expect(editor().automaton).toEqual({ states: [], transitions: [] })
    expect(editor().tool).toBe('select')
    expect(editor().selection).toBeNull()
    expect(editor().simulation).toBeNull()
  })
})

describe('estados', () => {
  it('addStateAt duas vezes cria q0 e q1', () => {
    addTwoStates()
    const { states } = editor().automaton
    expect(states.map((s) => s.label)).toEqual(['q0', 'q1'])
    expect(states.map((s) => s.isInitial)).toEqual([true, false])
    expect(states[1]).toMatchObject({ x: 100, y: 0 })
  })

  it('renameState devolve o erro e só aplica nomes válidos', () => {
    const [q0, q1] = addTwoStates()
    expect(editor().renameState(q1, 'q0')).toBe('Já existe um estado chamado "q0"')
    expect(editor().renameState(q1, '  ')).toBe('O nome não pode ser vazio')
    expect(editor().automaton.states[1].label).toBe('q1')

    expect(editor().renameState(q0, ' inicio ')).toBeNull()
    expect(editor().automaton.states[0].label).toBe('inicio')
  })

  it('moveState, setInitial e toggleAccepting editam o estado', () => {
    const [, q1] = addTwoStates()
    editor().moveState(q1, { x: 7, y: 9 })
    editor().setInitial(q1)
    editor().toggleAccepting(q1)
    const [first, second] = editor().automaton.states
    expect(second).toMatchObject({ x: 7, y: 9, isInitial: true, isAccepting: true })
    expect(first.isInitial).toBe(false)
  })

  it('removeState leva junto as transições do estado', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    editor().removeState(q1)
    expect(editor().automaton.states).toHaveLength(1)
    expect(editor().automaton.transitions).toEqual([])
  })
})

describe('transição em dois cliques', () => {
  it('o segundo clique abre o diálogo e confirmTransition cria a transição', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    expect(editor().pendingFrom).toBeNull()
    expect(editor().pendingTransition).toEqual({ from: q0, to: q1 })

    expect(editor().confirmTransition('a, b')).toBeNull()
    expect(editor().pendingTransition).toBeNull()
    expect(editor().automaton.transitions).toEqual([
      expect.objectContaining({ from: q0, to: q1, symbols: ['a', 'b'] }),
    ])
  })

  it('o primeiro clique só guarda a origem', () => {
    const [q0] = addTwoStates()
    editor().setTool('add-transition')
    editor().clickState(q0)
    expect(editor().pendingFrom).toBe(q0)
    expect(editor().pendingTransition).toBeNull()
  })

  it('dois cliques no mesmo estado fazem um laço', () => {
    const [q0] = addTwoStates()
    pendingTransitionBetween(q0, q0)
    expect(editor().pendingTransition).toEqual({ from: q0, to: q0 })
  })

  it('símbolo inválido mantém o diálogo aberto', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    const pending = editor().pendingTransition
    expect(editor().confirmTransition('ab')).toBe('Símbolo inválido: ab')
    expect(editor().pendingTransition).toEqual(pending)
    expect(editor().automaton.transitions).toEqual([])
  })

  it('sem símbolos também mantém o diálogo aberto', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    expect(editor().confirmTransition(' , ')).toBe('Informe ao menos um símbolo')
    expect(editor().pendingTransition).toEqual({ from: q0, to: q1 })
  })

  it('cancelTransition fecha o diálogo sem criar nada', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().cancelTransition()
    expect(editor().pendingTransition).toBeNull()
    expect(editor().automaton.transitions).toEqual([])
  })

  it('cancelPending esquece a origem sem trocar de ferramenta', () => {
    const [q0] = addTwoStates()
    editor().setTool('add-transition')
    editor().clickState(q0)
    editor().cancelPending()
    expect(editor().pendingFrom).toBeNull()
    expect(editor().tool).toBe('add-transition')
  })

  it('desfazer a criação de um estado do diálogo fecha o diálogo', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    history().undo()
    expect(editor().automaton.states.map((s) => s.id)).toEqual([q0])
    expect(editor().pendingTransition).toBeNull()
    expect(editor().confirmTransition('a')).toBeNull()
    expect(editor().automaton.transitions).toEqual([])
  })

  it('editar sem remover os estados do diálogo o mantém aberto', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().toggleAccepting(q1)
    expect(editor().pendingTransition).toEqual({ from: q0, to: q1 })
  })

  it('trocar de ferramenta descarta a origem pendente', () => {
    const [q0] = addTwoStates()
    editor().setTool('add-transition')
    editor().clickState(q0)
    editor().setTool('select')
    expect(editor().pendingFrom).toBeNull()
  })
})

describe('edição de transições', () => {
  it('setTransitionSymbols troca os símbolos ou devolve o erro', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    const [{ id }] = editor().automaton.transitions

    expect(editor().setTransitionSymbols(id, 'b, c')).toBeNull()
    expect(editor().automaton.transitions[0].symbols).toEqual(['b', 'c'])
    expect(editor().setTransitionSymbols(id, 'xy')).toBe('Símbolo inválido: xy')
    expect(editor().setTransitionSymbols(id, '')).toBe('Informe ao menos um símbolo')
    expect(editor().automaton.transitions[0].symbols).toEqual(['b', 'c'])
  })

  it('removeTransition remove só a transição', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    editor().removeTransition(editor().automaton.transitions[0].id)
    expect(editor().automaton.transitions).toEqual([])
    expect(editor().automaton.states).toHaveLength(2)
  })
})

describe('ferramentas e seleção', () => {
  it('clickState com a ferramenta de seleção seleciona o estado', () => {
    const [q0] = addTwoStates()
    editor().clickState(q0)
    expect(editor().selection).toEqual({ kind: 'state', id: q0 })
  })

  it('clickState com a ferramenta apagar remove o estado', () => {
    const [q0] = addTwoStates()
    editor().setTool('delete')
    editor().clickState(q0)
    expect(editor().automaton.states.map((s) => s.label)).toEqual(['q1'])
  })

  it('clickTransition com a ferramenta de seleção seleciona a transição', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    const [{ id }] = editor().automaton.transitions
    editor().setTool('select')
    editor().clickTransition(id)
    expect(editor().selection).toEqual({ kind: 'transition', id })
  })

  it('clickTransition com a ferramenta apagar remove a transição', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    const [{ id }] = editor().automaton.transitions
    editor().setTool('delete')
    editor().clickTransition(id)
    expect(editor().automaton.transitions).toEqual([])
  })

  it('clickTransition com as ferramentas de criação não muda nada', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    const [{ id }] = editor().automaton.transitions
    const before = editor().automaton
    for (const tool of ['add-state', 'add-transition'] as const) {
      editor().setTool(tool)
      editor().clickTransition(id)
    }
    expect(editor().automaton).toBe(before)
    expect(editor().selection).toBeNull()
  })

  it('deleteSelection remove o estado selecionado e limpa a seleção', () => {
    const [q0] = addTwoStates()
    editor().select({ kind: 'state', id: q0 })
    editor().deleteSelection()
    expect(editor().automaton.states).toHaveLength(1)
    expect(editor().selection).toBeNull()
  })

  it('deleteSelection remove a transição selecionada', () => {
    const [q0, q1] = addTwoStates()
    pendingTransitionBetween(q0, q1)
    editor().confirmTransition('a')
    const [{ id }] = editor().automaton.transitions
    editor().select({ kind: 'transition', id })
    editor().deleteSelection()
    expect(editor().automaton.transitions).toEqual([])
    expect(editor().selection).toBeNull()
  })

  it('deleteSelection sem seleção não faz nada', () => {
    addTwoStates()
    const before = editor().automaton
    editor().deleteSelection()
    expect(editor().automaton).toBe(before)
  })

  it('apagar outro elemento mantém a seleção', () => {
    const [q0, q1] = addTwoStates()
    editor().select({ kind: 'state', id: q0 })
    editor().removeState(q1)
    expect(editor().selection).toEqual({ kind: 'state', id: q0 })
  })
})

describe('simulação', () => {
  it('startSimulation guarda o traço no passo 0', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().startSimulation('ab')
    const sim = editor().simulation
    expect(sim?.step).toBe(0)
    expect(sim?.playing).toBe(false)
    expect(sim?.trace.input).toBe('ab')
    expect(sim?.trace.steps).toHaveLength(3)
  })

  it('stepTo limita o passo ao intervalo do traço', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().startSimulation('ab')
    editor().stepTo(2)
    expect(editor().simulation?.step).toBe(2)
    editor().stepTo(99)
    expect(editor().simulation?.step).toBe(2)
    editor().stepTo(-3)
    expect(editor().simulation?.step).toBe(0)
  })

  it('sem estado inicial o traço com erro é guardado', () => {
    editor().loadAutomaton(build({ states: ['q0'], transitions: [] }))
    editor().startSimulation('a')
    expect(editor().simulation?.trace.error).toBe('no-initial')
    expect(editor().simulation?.step).toBe(0)
    editor().stepTo(5)
    expect(editor().simulation?.step).toBe(0)
  })

  it('setPlaying e stopSimulation mexem só na simulação', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().startSimulation('a')
    editor().setPlaying(true)
    expect(editor().simulation?.playing).toBe(true)
    editor().stopSimulation()
    expect(editor().simulation).toBeNull()
    editor().setPlaying(true)
    expect(editor().simulation).toBeNull()
  })

  it('editar o autômato descarta a simulação', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().startSimulation('a')
    expect(editor().simulation?.step).toBe(0)
    editor().toggleAccepting('q0')
    expect(editor().simulation).toBeNull()
  })

  it('editar o autômato descarta a origem pendente da transição', () => {
    const [q0] = addTwoStates()
    editor().setTool('add-transition')
    editor().clickState(q0)
    editor().toggleAccepting(q0)
    expect(editor().pendingFrom).toBeNull()
  })

  it('carregar um autômato descarta a seleção', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().select({ kind: 'state', id: 'q0' })
    editor().loadAutomaton(PDF_EXAMPLE)
    expect(editor().selection).toBeNull()
  })

  it('mudanças que não editam o autômato preservam a simulação', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().startSimulation('a')
    editor().setTool('delete')
    editor().select({ kind: 'state', id: 'q1' })
    expect(editor().simulation).not.toBeNull()
  })
})

describe('histórico', () => {
  it('undo desfaz a remoção de um estado', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().removeState('q1')
    expect(editor().automaton.states).toHaveLength(1)
    history().undo()
    expect(editor().automaton.states).toHaveLength(2)
    expect(editor().automaton).toEqual(PDF_EXAMPLE)
  })

  it('redo refaz o que o undo desfez', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().removeState('q1')
    history().undo()
    history().redo()
    expect(editor().automaton.states).toHaveLength(1)
  })

  it('só o autômato entra no histórico', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    const entries = history().pastStates.length
    editor().setTool('delete')
    editor().select({ kind: 'state', id: 'q0' })
    editor().startSimulation('a')
    editor().setPlaying(true)
    editor().stopSimulation()
    expect(history().pastStates).toHaveLength(entries)

    editor().removeState('q1')
    history().undo()
    expect(editor().tool).toBe('delete')
  })

  it('edições que não mudam nada não criam entrada nem apagam a simulação', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().startSimulation('a')
    const entries = history().pastStates.length

    editor().removeState('inexistente')
    editor().removeTransition('inexistente')
    editor().setInitial('q0')
    editor().moveState('q0', { x: PDF_EXAMPLE.states[0].x, y: PDF_EXAMPLE.states[0].y })
    editor().renameState('q0', 'q0')
    editor().setTransitionSymbols('q0-q1', 'a')

    expect(history().pastStates).toHaveLength(entries)
    expect(editor().simulation).not.toBeNull()
  })

  it('undo descarta a simulação e a seleção que deixaram de valer', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().addStateAt({ x: 5, y: 5 })
    const added = editor().automaton.states[2].id
    editor().select({ kind: 'state', id: added })
    editor().startSimulation('a')

    history().undo()
    expect(editor().automaton.states).toHaveLength(2)
    expect(editor().simulation).toBeNull()
    expect(editor().selection).toBeNull()
  })

  it('undo mantém a seleção que ainda existe', () => {
    editor().loadAutomaton(PDF_EXAMPLE)
    editor().toggleAccepting('q0')
    editor().select({ kind: 'state', id: 'q1' })
    history().undo()
    expect(editor().selection).toEqual({ kind: 'state', id: 'q1' })
  })

  it('guarda no máximo 100 passos', () => {
    const [q0] = addTwoStates()
    for (let i = 0; i < 150; i++) editor().moveState(q0, { x: i + 1, y: 0 })
    expect(history().pastStates).toHaveLength(100)
  })
})
