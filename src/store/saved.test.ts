import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDF_EXAMPLE } from '@/examples'
import { toExtendedJson } from '@/lib/automaton/serialize'

const KEY = 'automato-editor:automaton'

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  }
}

const brokenStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

/** Carrega o store do zero, como numa página recém-aberta. */
async function openEditor(storage: object) {
  vi.resetModules()
  vi.stubGlobal('localStorage', storage)
  const { useEditor } = await import('./editor')
  return useEditor
}

afterEach(() => vi.unstubAllGlobals())

describe('autômato salvo no navegador', () => {
  it('abre com o autômato salvo, sem entrada no histórico', async () => {
    const storage = memoryStorage({ [KEY]: JSON.stringify(toExtendedJson(PDF_EXAMPLE)) })
    const useEditor = await openEditor(storage)
    expect(useEditor.getState().automaton).toEqual(PDF_EXAMPLE)
    expect(useEditor.temporal.getState().pastStates).toHaveLength(0)
  })

  it('cada edição, inclusive mover, fica salva', async () => {
    const storage = memoryStorage()
    const useEditor = await openEditor(storage)
    useEditor.getState().loadAutomaton(PDF_EXAMPLE)
    useEditor.getState().moveState('q1', { x: 321, y: 123 })

    const reopened = await openEditor(storage)
    expect(reopened.getState().automaton.states[1]).toMatchObject({ x: 321, y: 123 })
  })

  it('conteúdo inválido é ignorado e o editor começa vazio', async () => {
    for (const text of ['{', '{"format":"automato-editor/v1","automaton":{"states":1}}']) {
      const useEditor = await openEditor(memoryStorage({ [KEY]: text }))
      expect(useEditor.getState().automaton).toEqual({ states: [], transitions: [] })
    }
  })

  it('armazenamento bloqueado não quebra o editor', async () => {
    const useEditor = await openEditor(brokenStorage)
    expect(useEditor.getState().automaton).toEqual({ states: [], transitions: [] })
    expect(() => useEditor.getState().addStateAt({ x: 0, y: 0 })).not.toThrow()
    expect(useEditor.getState().automaton.states).toHaveLength(1)
  })
})
