import { describe, expect, it } from 'vitest'
import { EXAMPLES, PDF_EXAMPLE } from '@/examples'
import { build } from './build'
import { emptyAutomaton } from './operations'
import { toSvg } from './svg'

const count = (text: string, part: string) => text.split(part).length - 1

const example = (id: string) => {
  const found = EXAMPLES.find((e) => e.id === id)
  if (!found) throw new Error(`exemplo ${id} não existe`)
  return found.automaton
}

describe('toSvg', () => {
  const svg = toSvg(PDF_EXAMPLE)

  it('gera um SVG autônomo com os rótulos e as setas', () => {
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('>q0<')
    expect(svg).toContain('>a<')
    expect(svg).toContain('marker-end')
  })

  it('declara a ponta da seta em <defs> e a usa nas arestas', () => {
    expect(svg).toContain('<defs>')
    expect(svg).toContain('<marker id="arrow"')
    expect(svg).toContain('marker-end="url(#arrow)"')
  })

  it('desenha um círculo por estado e um anel por estado de aceitação', () => {
    expect(count(svg, '<circle')).toBe(3)
  })

  it('tem fundo branco e fonte serifada', () => {
    expect(svg).toContain('fill="#fff"')
    expect(svg).toContain('serif')
  })

  it('usa a caixa dos estados mais 60 de margem como viewBox', () => {
    expect(svg).toContain('viewBox="52 172 536 176"')
    expect(svg).toContain('width="536"')
    expect(svg).toContain('height="176"')
  })

  it('curva o par de ida e volta e desenha um laço em cada estado', () => {
    expect(count(svg, ' Q ')).toBe(2)
    expect(count(svg, ' C ')).toBe(2)
  })

  it('desenha reta onde não existe a transição inversa', () => {
    const aba = toSvg(example('contem-aba'))
    expect(count(aba, ' Q ')).toBe(0)
    expect(count(aba, ' C ')).toBe(2)
    const lines = aba.match(/ d="M \S+ \S+ L \S+ \S+"/g) ?? []
    expect(lines).toHaveLength(3 + 1)
  })

  it('escreve um <text> por transição, com os símbolos juntos, e um por estado', () => {
    const aba = toSvg(example('contem-aba'))
    expect(aba).toContain('>a, b<')
    expect(count(aba, '<text')).toBe(5 + 4)
  })

  it('desenha a seta de entrada só no estado inicial', () => {
    expect(count(svg, 'marker-end')).toBe(4 + 1)
  })

  it('mostra ε', () => {
    expect(toSvg(example('as-ou-bs'))).toContain('>ε<')
  })

  it('tem 200 x 200 quando o autômato está vazio', () => {
    const empty = toSvg(emptyAutomaton())
    expect(empty).toContain('width="200"')
    expect(empty).toContain('height="200"')
  })

  it('escapa & < > " \' nos rótulos e símbolos', () => {
    const hostile = build({
      states: ['<a&b>', 'q"1\''],
      initial: '<a&b>',
      transitions: [
        ['<a&b>', '&', 'q"1\''],
        ['q"1\'', '<', 'q"1\''],
        ['<a&b>', '"', '<a&b>'],
        ['<a&b>', "'", '<a&b>'],
        ['<a&b>', '>', '<a&b>'],
      ],
    })
    const out = toSvg(hostile)
    expect(out).toContain('>&lt;a&amp;b&gt;<')
    expect(out).toContain('>q&quot;1&#39;<')
    expect(out).toContain('>&amp;<')
    expect(out).toContain('>&lt;<')
    expect(out).toContain('>&quot;, &#39;, &gt;<')
    expect(out).not.toContain('<a&b>')
    expect(out).not.toMatch(/>[^<]*&(?!amp;|lt;|gt;|quot;|#39;)[^<]*</)
  })
})
