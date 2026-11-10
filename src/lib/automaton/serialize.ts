import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { analyze } from './analysis'
import { circleLayout } from './geometry'
import { mergeSymbols, parseSymbols } from './symbols'
import type { Automaton, State, StateId, Transition } from './types'

/** Formato do professor: estado -> símbolo -> destino (AFD) ou lista de destinos (AFN). */
export type ProfessorJson = Record<string, Record<string, string | string[]>>

export const EXTENDED_FORMAT = 'automato-editor/v1'

/** Formato do editor: o autômato inteiro, com posições e marcações. */
export interface ExtendedJson {
  format: typeof EXTENDED_FORMAT
  automaton: Automaton
}

export type ParseResult = { ok: true; automaton: Automaton } | { ok: false; error: string }

const INVALID_JSON = 'JSON inválido'
const UNRECOGNIZED = 'Formato não reconhecido'
const missingState = (id: string) => `Transição para estado inexistente: "${id}"`
const invalidSymbol = (symbol: string) => `Símbolo inválido: "${symbol}"`

const fail = (error: string): ParseResult => ({ ok: false, error })

export function toProfessorJson(a: Automaton): ProfessorJson {
  const labelOf = new Map(a.states.map((s) => [s.id, s.label]))
  const label = (id: StateId): string => labelOf.get(id) ?? id
  const asLists = analyze(a).kind === 'NFA'

  const rows = new Map<string, Map<string, string[]>>(a.states.map((s) => [s.label, new Map()]))
  for (const t of a.transitions) {
    const row = rows.get(label(t.from))
    if (!row) continue
    for (const symbol of t.symbols) {
      row.set(symbol, mergeSymbols(row.get(symbol) ?? [], [label(t.to)]))
    }
  }

  const value = (targets: string[]) => (asLists || targets.length > 1 ? targets : targets[0])
  return Object.fromEntries(
    [...rows].map(([name, row]) => [
      name,
      Object.fromEntries(
        [...row].sort(([x], [y]) => (x < y ? -1 : 1)).map(([symbol, to]) => [symbol, value(to)]),
      ),
    ]),
  )
}

export function toExtendedJson(a: Automaton): ExtendedJson {
  return { format: EXTENDED_FORMAT, automaton: a }
}

export function parseAutomatonJson(text: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return fail(INVALID_JSON)
  }
  if (!isRecord(value)) return fail(UNRECOGNIZED)
  return typeof value.format === 'string' ? parseExtended(value) : parseProfessor(value)
}

export function encodeShare(a: Automaton): string {
  return compressToEncodedURIComponent(JSON.stringify(toExtendedJson(a)))
}

export function decodeShare(s: string): Automaton | null {
  try {
    const text = decompressFromEncodedURIComponent(s)
    if (!text) return null
    const value: unknown = JSON.parse(text)
    if (!isRecord(value)) return null
    const result = parseExtended(value)
    return result.ok ? result.automaton : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** O símbolo que `raw` representa, ou null se não for exatamente um símbolo válido. */
function singleSymbol(raw: string): string | null {
  if (raw.includes(',')) return null
  const { symbols, invalid } = parseSymbols(raw)
  return invalid.length === 0 && symbols.length === 1 ? symbols[0] : null
}

function parseProfessor(root: Record<string, unknown>): ParseResult {
  const names = Object.keys(root)
  if (names.includes('')) return fail(UNRECOGNIZED)
  const known = new Set(names)

  const edges = new Map<string, Transition>()
  const usedIds = new Set<string>()
  for (const [from, row] of Object.entries(root)) {
    if (!isRecord(row)) return fail(UNRECOGNIZED)
    for (const [key, raw] of Object.entries(row)) {
      const symbol = singleSymbol(key)
      if (symbol === null) return fail(invalidSymbol(key))
      const targets = typeof raw === 'string' ? [raw] : isStringArray(raw) ? raw : null
      if (targets === null) return fail(UNRECOGNIZED)
      for (const to of targets) {
        if (!known.has(to)) return fail(missingState(to))
        const pair = JSON.stringify([from, to])
        const edge = edges.get(pair)
        if (edge) {
          edge.symbols = mergeSymbols(edge.symbols, [symbol])
        } else {
          const id = uniqueId(`${from}-${to}`, usedIds)
          edges.set(pair, { id, from, to, symbols: [symbol] })
        }
      }
    }
  }

  const states: State[] = names.map((name, index) => ({
    id: name,
    label: name,
    ...circleLayout(names.length, index),
    isInitial: index === 0,
    isAccepting: false,
  }))
  return { ok: true, automaton: { states, transitions: [...edges.values()] } }
}

/** `base`, ou `base~2`, `base~3`... se já estiver em uso. Registra o id escolhido em `used`. */
function uniqueId(base: string, used: Set<string>): string {
  let id = base
  for (let n = 2; used.has(id); n++) id = `${base}~${n}`
  used.add(id)
  return id
}

function parseState(raw: unknown): State | null {
  if (!isRecord(raw)) return null
  const { id, label, x, y, isInitial, isAccepting } = raw
  if (typeof id !== 'string' || id === '') return null
  if (typeof label !== 'string') return null
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null
  if (typeof isInitial !== 'boolean' || typeof isAccepting !== 'boolean') return null
  return { id, label, x, y, isInitial, isAccepting }
}

function parseExtended(root: Record<string, unknown>): ParseResult {
  if (root.format !== EXTENDED_FORMAT || !isRecord(root.automaton)) return fail(UNRECOGNIZED)
  const { states: rawStates, transitions: rawTransitions } = root.automaton
  if (!Array.isArray(rawStates) || !Array.isArray(rawTransitions)) return fail(UNRECOGNIZED)

  const states: State[] = []
  const stateIds = new Set<StateId>()
  for (const raw of rawStates) {
    const state = parseState(raw)
    if (state === null || stateIds.has(state.id)) return fail(UNRECOGNIZED)
    stateIds.add(state.id)
    states.push(state)
  }

  const transitions: Transition[] = []
  const transitionIds = new Set<string>()
  for (const raw of rawTransitions) {
    if (!isRecord(raw)) return fail(UNRECOGNIZED)
    const { id, from, to, symbols: rawSymbols } = raw
    if (typeof id !== 'string' || typeof from !== 'string' || typeof to !== 'string') {
      return fail(UNRECOGNIZED)
    }
    if (!isStringArray(rawSymbols) || rawSymbols.length === 0 || transitionIds.has(id)) {
      return fail(UNRECOGNIZED)
    }
    for (const endpoint of [from, to]) {
      if (!stateIds.has(endpoint)) return fail(missingState(endpoint))
    }
    const symbols: string[] = []
    for (const entry of rawSymbols) {
      const symbol = singleSymbol(entry)
      if (symbol === null) return fail(invalidSymbol(entry))
      symbols.push(symbol)
    }
    if (new Set(symbols).size !== symbols.length) return fail(UNRECOGNIZED)
    transitionIds.add(id)
    transitions.push({ id, from, to, symbols })
  }

  return { ok: true, automaton: { states, transitions } }
}
