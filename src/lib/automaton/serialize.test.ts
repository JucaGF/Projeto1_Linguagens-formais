import { compressToEncodedURIComponent } from 'lz-string'
import { describe, expect, it } from 'vitest'
import { EXAMPLES, PDF_EXAMPLE } from '@/examples'
import { build } from './build'
import { circleLayout } from './geometry'
import {
  decodeShare,
  encodeShare,
  parseAutomatonJson,
  toExtendedJson,
  toProfessorJson,
} from './serialize'
import type { Automaton } from './types'

const PDF_JSON = { q0: { a: 'q1', b: 'q0' }, q1: { a: 'q0', b: 'q1' } }

interface Draft {
  format: unknown
  automaton: {
    states: Record<string, unknown>[]
    transitions: Record<string, unknown>[]
  }
}

/** Cópia profunda e mutável do JSON estendido do exemplo do PDF. */
function draft(): Draft {
  return JSON.parse(JSON.stringify(toExtendedJson(PDF_EXAMPLE)))
}

function example(id: string): Automaton {
  const found = EXAMPLES.find((e) => e.id === id)
  if (!found) throw new Error(`exemplo ausente: ${id}`)
  return found.automaton
}

function imported(text: string): Automaton {
  const result = parseAutomatonJson(text)
  if (!result.ok) throw new Error(`importação falhou: ${result.error}`)
  return result.automaton
}

describe('toProfessorJson', () => {
  it('exporta o exemplo do PDF igual ao PDF', () => {
    expect(toProfessorJson(PDF_EXAMPLE)).toEqual(PDF_JSON)
  })

  it('AFN usa listas em todos os valores', () => {
    const json = toProfessorJson(example('contem-aba'))
    expect(json.q0).toEqual({ a: ['q0', 'q1'], b: ['q0'] })
    expect(json.q1).toEqual({ b: ['q2'] })
  })

  it('AFN com ε-transições usa ε como chave', () => {
    expect(toProfessorJson(example('as-ou-bs'))).toEqual({
      q0: { ε: ['q1', 'q2'] },
      q1: { a: ['q1'] },
      q2: { b: ['q2'] },
    })
  })

  it('AFD incompleto continua usando strings', () => {
    const a = build({ states: ['q0', 'q1'], transitions: [['q0', 'a', 'q1']] })
    expect(toProfessorJson(a)).toEqual({ q0: { a: 'q1' }, q1: {} })
  })

  it('estado sem transição vira {}', () => {
    const a = build({ states: ['q0', 'q1', 'q2'], transitions: [['q0', 'a', 'q1']] })
    const json = toProfessorJson(a)
    expect(json.q2).toEqual({})
    expect(Object.keys(json)).toEqual(['q0', 'q1', 'q2'])
  })

  it('usa os rótulos, não os ids, nas chaves e nos destinos', () => {
    const a: Automaton = {
      states: [
        { id: 's-1', label: 'início', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 's-2', label: 'fim', x: 10, y: 0, isInitial: false, isAccepting: true },
      ],
      transitions: [{ id: 't1', from: 's-1', to: 's-2', symbols: ['a'] }],
    }
    expect(toProfessorJson(a)).toEqual({ início: { a: 'fim' }, fim: {} })
  })

  it('rótulos repetidos não perdem destinos nem deixam de ser listas', () => {
    const a: Automaton = {
      states: [
        { id: 's1', label: 'q', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 's2', label: 'q', x: 10, y: 0, isInitial: false, isAccepting: false },
        { id: 's3', label: 'r', x: 20, y: 0, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: 't1', from: 's1', to: 's2', symbols: ['a'] },
        { id: 't2', from: 's2', to: 's3', symbols: ['a'] },
      ],
    }
    expect(toProfessorJson(a)).toEqual({ q: { a: ['q', 'r'] }, r: {} })
  })

  it('um estado chamado __proto__ vira chave própria do objeto', () => {
    const a = build({ states: ['__proto__'], transitions: [['__proto__', 'a', '__proto__']] })
    const json = toProfessorJson(a)
    expect(Object.keys(json)).toEqual(['__proto__'])
    expect(JSON.stringify(json)).toBe('{"__proto__":{"a":"__proto__"}}')
  })
})

describe('toExtendedJson', () => {
  it('marca o formato e carrega o autômato inteiro', () => {
    expect(toExtendedJson(PDF_EXAMPLE)).toEqual({
      format: 'automato-editor/v1',
      automaton: PDF_EXAMPLE,
    })
  })
})

describe('parseAutomatonJson: formato estendido', () => {
  it.each(EXAMPLES.map((e) => [e.id, e.automaton] as const))(
    'ida e volta do estendido: %s',
    (_id, automaton) => {
      const result = parseAutomatonJson(JSON.stringify(toExtendedJson(automaton)))
      expect(result).toEqual({ ok: true, automaton })
    },
  )

  it('preserva estados com ids e rótulos diferentes, posições e flags', () => {
    const a: Automaton = {
      states: [
        { id: 's-1', label: 'início', x: 12.5, y: -3, isInitial: true, isAccepting: true },
        { id: 's-2', label: '', x: 0, y: 99, isInitial: false, isAccepting: false },
      ],
      transitions: [{ id: 't1', from: 's-1', to: 's-2', symbols: ['a', 'ε'] }],
    }
    expect(parseAutomatonJson(JSON.stringify(toExtendedJson(a)))).toEqual({
      ok: true,
      automaton: a,
    })
  })

  it('aceita o autômato vazio', () => {
    const empty: Automaton = { states: [], transitions: [] }
    expect(parseAutomatonJson(JSON.stringify(toExtendedJson(empty)))).toEqual({
      ok: true,
      automaton: empty,
    })
  })

  it('descarta campos desconhecidos em vez de repassá-los', () => {
    const doc = toExtendedJson(PDF_EXAMPLE)
    const text = JSON.stringify({
      ...doc,
      extra: 1,
      automaton: {
        states: doc.automaton.states.map((s) => ({ ...s, evil: true })),
        transitions: doc.automaton.transitions.map((t) => ({ ...t, evil: true })),
        evil: true,
      },
    })
    expect(parseAutomatonJson(text)).toEqual({ ok: true, automaton: PDF_EXAMPLE })
  })

  describe('rejeita com "Formato não reconhecido"', () => {
    const cases: [string, (d: Draft) => void][] = [
      ['formato com outra versão', (d) => void (d.format = 'automato-editor/v2')],
      ['automaton ausente', (d) => void (d.automaton = null as never)],
      ['automaton é lista', (d) => void (d.automaton = [] as never)],
      ['states não é lista', (d) => void (d.automaton.states = {} as never)],
      ['transitions não é lista', (d) => void (d.automaton.transitions = 'x' as never)],
      ['estado nulo', (d) => void (d.automaton.states[0] = null as never)],
      ['estado é número', (d) => void (d.automaton.states[0] = 7 as never)],
      ['id do estado numérico', (d) => void (d.automaton.states[0].id = 1)],
      ['id do estado vazio', (d) => void (d.automaton.states[0].id = '')],
      ['rótulo numérico', (d) => void (d.automaton.states[0].label = 1)],
      ['x como string', (d) => void (d.automaton.states[0].x = '10')],
      ['x nulo (era Infinity)', (d) => void (d.automaton.states[0].x = null)],
      ['y ausente', (d) => void delete d.automaton.states[0].y],
      ['isInitial como string', (d) => void (d.automaton.states[0].isInitial = 'true')],
      ['isAccepting numérico', (d) => void (d.automaton.states[0].isAccepting = 1)],
      [
        'ids de estado repetidos',
        (d) => void (d.automaton.states[1].id = d.automaton.states[0].id),
      ],
      ['id da transição numérico', (d) => void (d.automaton.transitions[0].id = 1)],
      ['from numérico', (d) => void (d.automaton.transitions[0].from = 0)],
      ['to ausente', (d) => void delete d.automaton.transitions[0].to],
      ['symbols não é lista', (d) => void (d.automaton.transitions[0].symbols = 'a')],
      ['symbols vazio', (d) => void (d.automaton.transitions[0].symbols = [])],
      ['symbols com repetição', (d) => void (d.automaton.transitions[0].symbols = ['a', 'a'])],
      ['symbols com número', (d) => void (d.automaton.transitions[0].symbols = ['a', 1])],
      [
        'ids de transição repetidos',
        (d) => void (d.automaton.transitions[1].id = d.automaton.transitions[0].id),
      ],
    ]

    it.each(cases)('%s', (_name, edit) => {
      const d = draft()
      edit(d)
      expect(parseAutomatonJson(JSON.stringify(d))).toEqual({
        ok: false,
        error: 'Formato não reconhecido',
      })
    })
  })

  it('transição para estado inexistente aponta o id', () => {
    const toMissing = draft()
    toMissing.automaton.transitions[0].to = 'q9'
    expect(parseAutomatonJson(JSON.stringify(toMissing))).toEqual({
      ok: false,
      error: 'Transição para estado inexistente: "q9"',
    })

    const fromMissing = draft()
    fromMissing.automaton.transitions[0].from = 'q8'
    expect(parseAutomatonJson(JSON.stringify(fromMissing))).toEqual({
      ok: false,
      error: 'Transição para estado inexistente: "q8"',
    })
  })

  it('símbolo com mais de um caractere aponta o símbolo', () => {
    const doc = draft()
    doc.automaton.transitions[0].symbols = ['a', 'ab']
    expect(parseAutomatonJson(JSON.stringify(doc))).toEqual({
      ok: false,
      error: 'Símbolo inválido: "ab"',
    })
  })
})

describe('parseAutomatonJson: formato do professor', () => {
  it('importa o formato do professor', () => {
    const a = imported(JSON.stringify(PDF_JSON))
    expect(a.states.map((s) => s.id)).toEqual(['q0', 'q1'])
    expect(a.states.map((s) => s.label)).toEqual(['q0', 'q1'])
    expect(a.states.map((s) => s.isInitial)).toEqual([true, false])
    expect(a.states.some((s) => s.isAccepting)).toBe(false)
    a.states.forEach((s, i) => {
      expect({ x: s.x, y: s.y }).toEqual(circleLayout(2, i))
    })
    expect(toProfessorJson(a)).toEqual(PDF_JSON)
  })

  it('o primeiro estado do JSON é o inicial', () => {
    const a = imported('{"início":{"a":"fim"},"fim":{}}')
    expect(a.states.map((s) => [s.id, s.isInitial])).toEqual([
      ['início', true],
      ['fim', false],
    ])
  })

  it('aceita destinos em lista e junta símbolos de um mesmo par de estados', () => {
    const a = imported('{"q0":{"a":["q0","q1"],"b":"q1"},"q1":{}}')
    expect(a.transitions).toHaveLength(2)
    expect(a.transitions.find((t) => t.to === 'q1')?.symbols).toEqual(['a', 'b'])
    expect(toProfessorJson(a)).toEqual({ q0: { a: ['q0', 'q1'], b: ['q1'] }, q1: {} })
  })

  it('"eps" e "ε" viram a transição vazia', () => {
    const a = imported('{"q0":{"eps":"q1"},"q1":{"ε":"q0"}}')
    expect(a.transitions.map((t) => t.symbols)).toEqual([['ε'], ['ε']])
  })

  it('lista vazia de destinos não cria transição', () => {
    const a = imported('{"q0":{"a":[]}}')
    expect(a.states).toHaveLength(1)
    expect(a.transitions).toEqual([])
  })

  it('o objeto vazio é o autômato vazio', () => {
    expect(imported('{}')).toEqual({ states: [], transitions: [] })
  })

  it('um estado chamado "format" continua sendo formato do professor', () => {
    const a = imported('{"format":{"a":"format"}}')
    expect(a.states.map((s) => s.id)).toEqual(['format'])
  })

  it('um estado chamado __proto__ é um estado comum', () => {
    const a = imported('{"__proto__":{"a":"__proto__"}}')
    expect(a.states.map((s) => s.id)).toEqual(['__proto__'])
    expect(a.transitions).toHaveLength(1)
    expect(Object.keys(toProfessorJson(a))).toEqual(['__proto__'])
  })

  it('ids de transição são únicos mesmo quando os nomes têm hífen', () => {
    const a = imported('{"a-b":{"x":"c"},"a":{"y":"b-c"},"c":{},"b-c":{}}')
    expect(new Set(a.transitions.map((t) => t.id)).size).toBe(2)
    expect(a.transitions.map((t) => [t.from, t.to, t.symbols])).toEqual([
      ['a-b', 'c', ['x']],
      ['a', 'b-c', ['y']],
    ])
  })

  it.each(EXAMPLES.map((e) => [e.id, e.automaton] as const))(
    'ida e volta do formato do professor: %s',
    (_id, automaton) => {
      const json = toProfessorJson(automaton)
      expect(toProfessorJson(imported(JSON.stringify(json)))).toEqual(json)
    },
  )

  describe('erros', () => {
    it("'{' é JSON inválido", () => {
      expect(parseAutomatonJson('{')).toEqual({ ok: false, error: 'JSON inválido' })
      expect(parseAutomatonJson('')).toEqual({ ok: false, error: 'JSON inválido' })
    })

    it.each(['[1,2]', '1', '"q0"', 'null', 'true'])(
      'a raiz %s não é um objeto: formato não reconhecido',
      (text) => {
        expect(parseAutomatonJson(text)).toEqual({ ok: false, error: 'Formato não reconhecido' })
      },
    )

    it('estado que só aparece como destino', () => {
      expect(parseAutomatonJson('{"q0":{"a":"q9"}}')).toEqual({
        ok: false,
        error: 'Transição para estado inexistente: "q9"',
      })
    })

    it('destino inexistente dentro de uma lista', () => {
      expect(parseAutomatonJson('{"q0":{"a":["q0","q7"]}}')).toEqual({
        ok: false,
        error: 'Transição para estado inexistente: "q7"',
      })
    })

    it('símbolo com mais de um caractere', () => {
      expect(parseAutomatonJson('{"q0":{"ab":"q0"}}')).toEqual({
        ok: false,
        error: 'Símbolo inválido: "ab"',
      })
    })

    it.each(['', ' ', 'a,b', 'a,a', ','])('chave de símbolo %j é inválida', (key) => {
      expect(parseAutomatonJson(JSON.stringify({ q0: { [key]: 'q0' } }))).toEqual({
        ok: false,
        error: `Símbolo inválido: "${key}"`,
      })
    })

    it.each([
      ['linha que não é objeto', '{"q0":"q1","q1":{}}'],
      ['linha nula', '{"q0":null}'],
      ['linha é lista', '{"q0":[]}'],
      ['destino numérico', '{"q0":{"a":1}}'],
      ['destino nulo', '{"q0":{"a":null}}'],
      ['destino objeto', '{"q0":{"a":{"b":"q0"}}}'],
      ['lista com número', '{"q0":{"a":["q0",2]}}'],
      ['estado com nome vazio', '{"":{}}'],
      ['formato estendido sem o campo format', '{"states":[],"transitions":[]}'],
    ])('%s: formato não reconhecido', (_name, text) => {
      expect(parseAutomatonJson(text)).toEqual({ ok: false, error: 'Formato não reconhecido' })
    })
  })
})

describe('link compartilhável', () => {
  it.each(EXAMPLES.map((e) => [e.id, e.automaton] as const))(
    'decodeShare(encodeShare(a)) devolve o mesmo autômato: %s',
    (_id, automaton) => {
      expect(decodeShare(encodeShare(automaton))).toEqual(automaton)
    },
  )

  it('preserva acentos e ε', () => {
    const a = build({
      states: ['início', 'fim'],
      initial: 'início',
      accepting: ['fim'],
      transitions: [['início', 'ε,é', 'fim']],
    })
    expect(decodeShare(encodeShare(a))).toEqual(a)
  })

  it('o texto codificado cabe num fragmento de URL', () => {
    expect(encodeShare(PDF_EXAMPLE)).toMatch(/^[A-Za-z0-9+\-$]+$/)
  })

  it('decodeShare("lixo") é null', () => {
    expect(decodeShare('lixo')).toBeNull()
    expect(decodeShare('')).toBeNull()
  })

  it('devolve null quando o conteúdo não é JSON', () => {
    expect(decodeShare(compressToEncodedURIComponent('isso não é json'))).toBeNull()
  })

  it('devolve null quando o JSON não tem a forma do formato estendido', () => {
    const shapeless = { format: 'automato-editor/v1', automaton: { states: 'x', transitions: [] } }
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify(shapeless)))).toBeNull()
  })

  it('devolve null quando uma transição aponta para estado inexistente', () => {
    const doc = draft()
    doc.automaton.transitions[0].to = 'q9'
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify(doc)))).toBeNull()
  })

  it('só aceita o formato estendido, não o do professor', () => {
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify(PDF_JSON)))).toBeNull()
  })
})
