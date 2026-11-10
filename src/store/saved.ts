import { parseAutomatonJson, toExtendedJson } from '@/lib/automaton/serialize'
import type { Automaton } from '@/lib/automaton/types'

const KEY = 'automato-editor:automaton'

/**
 * O autômato salvo no navegador, validado como qualquer JSON importado. Sem armazenamento (modo
 * privado, bloqueio, ambiente de teste) ou com conteúdo inválido, o editor começa vazio.
 */
export function readSavedAutomaton(): Automaton | null {
  try {
    const text = localStorage.getItem(KEY)
    if (text === null) return null
    const result = parseAutomatonJson(text)
    return result.ok ? result.automaton : null
  } catch {
    return null
  }
}

export function saveAutomaton(a: Automaton): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(toExtendedJson(a)))
  } catch {
    // sem armazenamento o editor segue funcionando, só não lembra o desenho ao recarregar
  }
}
