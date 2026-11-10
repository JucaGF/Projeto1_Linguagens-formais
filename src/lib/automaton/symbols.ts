import { EPSILON } from './types'

const EPSILON_ALIAS = 'eps'

export function mergeSymbols(...lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}

export function parseSymbols(input: string): { symbols: string[]; invalid: string[] } {
  const symbols: string[] = []
  const invalid: string[] = []
  for (const raw of input.split(',')) {
    const token = raw.trim()
    if (token === '') continue
    const symbol = token === EPSILON_ALIAS ? EPSILON : token
    if ([...symbol].length === 1) symbols.push(symbol)
    else invalid.push(token)
  }
  return { symbols: mergeSymbols(symbols), invalid: mergeSymbols(invalid) }
}

export function formatSymbols(symbols: string[]): string {
  return symbols.join(', ')
}
