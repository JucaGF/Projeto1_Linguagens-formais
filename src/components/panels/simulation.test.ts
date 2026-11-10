import { describe, expect, it } from 'vitest'
import { copiesText, tapeCells } from './simulation'

const states = (input: string, consumed: number) => tapeCells(input, consumed).map((c) => c.state)

describe('tapeCells', () => {
  it('no passo 0 nada foi lido', () => {
    expect(states('abba', 0)).toEqual(['pending', 'pending', 'pending', 'pending'])
  })

  it('esmaece as lidas e destaca a lida neste passo', () => {
    expect(states('abba', 2)).toEqual(['read', 'current', 'pending', 'pending'])
    expect(states('abba', 4)).toEqual(['read', 'read', 'read', 'current'])
  })

  it('mostra a cadeia vazia como uma célula ε', () => {
    expect(tapeCells('', 0)).toEqual([{ symbol: 'ε', state: 'empty' }])
  })
})

describe('copiesText', () => {
  it('usa singular só para uma cópia', () => {
    expect(copiesText(1)).toBe('1 cópia')
    expect(copiesText(2)).toBe('2 cópias')
    expect(copiesText(0)).toBe('0 cópias')
  })
})
