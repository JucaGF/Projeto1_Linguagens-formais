import { describe, expect, it } from 'vitest'
import { formatSymbols, parseSymbols } from './symbols'
import { EPSILON } from './types'

describe('parseSymbols', () => {
  it('separa por vírgula, ignora espaços e remove duplicados', () => {
    expect(parseSymbols('a, b ,a')).toEqual({ symbols: ['a', 'b'], invalid: [] })
  })

  it('aceita "eps" como apelido de ε', () => {
    expect(parseSymbols('eps, ε')).toEqual({ symbols: ['ε'], invalid: [] })
    expect(parseSymbols('eps').symbols).toEqual([EPSILON])
  })

  it('separa entradas vazias e entradas com mais de um caractere', () => {
    expect(parseSymbols('ab, ,c')).toEqual({ symbols: ['c'], invalid: ['ab'] })
  })

  it('devolve listas vazias para entrada vazia', () => {
    expect(parseSymbols('')).toEqual({ symbols: [], invalid: [] })
    expect(parseSymbols(' , ,')).toEqual({ symbols: [], invalid: [] })
  })

  it('preserva a ordem de digitação', () => {
    expect(parseSymbols('b, a, ε, 0').symbols).toEqual(['b', 'a', 'ε', '0'])
  })

  it('lista cada entrada inválida uma única vez', () => {
    expect(parseSymbols('ab, a, ab, xyz').invalid).toEqual(['ab', 'xyz'])
  })
})

describe('formatSymbols', () => {
  it('junta os símbolos com vírgula e espaço', () => {
    expect(formatSymbols(['a', 'ε'])).toBe('a, ε')
    expect(formatSymbols(['a'])).toBe('a')
    expect(formatSymbols([])).toBe('')
  })

  it('é o inverso de parseSymbols para símbolos válidos', () => {
    const symbols = ['a', 'b', 'ε']
    expect(parseSymbols(formatSymbols(symbols)).symbols).toEqual(symbols)
  })
})
