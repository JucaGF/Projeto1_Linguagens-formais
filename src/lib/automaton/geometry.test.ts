import { describe, expect, it } from 'vitest'
import { build } from './build'
import {
  circleLayout,
  CURVE_OFFSET,
  edgeGeometry,
  initialArrowPath,
  LABEL_GAP,
  labelCenter,
  selfLoopGeometry,
  STATE_RADIUS,
  transitionShape,
} from './geometry'

describe('circleLayout', () => {
  it('começa à esquerda do centro (320, 260) e segue pela parte de cima', () => {
    expect(circleLayout(4, 0)).toEqual({ x: 140, y: 260 })
    expect(circleLayout(4, 1)).toEqual({ x: 320, y: 80 })
    expect(circleLayout(4, 2)).toEqual({ x: 500, y: 260 })
    expect(circleLayout(4, 3)).toEqual({ x: 320, y: 440 })
  })

  it('coloca um único estado à esquerda', () => {
    expect(circleLayout(1, 0)).toEqual({ x: 140, y: 260 })
  })

  it('mantém todos os centros a 180 do centro do círculo', () => {
    for (let i = 0; i < 7; i++) {
      const { x, y } = circleLayout(7, i)
      expect(Math.hypot(x - 320, y - 260)).toBeCloseTo(180, 0)
    }
  })

  it('separa estados vizinhos o bastante para os círculos não se tocarem', () => {
    const a = circleLayout(8, 0)
    const b = circleLayout(8, 1)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * STATE_RADIUS)
  })
})

const numbers = (path: string) => (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

describe('edgeGeometry reta', () => {
  it('vai de borda a borda e ancora o rótulo LABEL_GAP acima do ponto médio', () => {
    expect(LABEL_GAP).toBe(3)
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, false)).toEqual({
      path: 'M 28 0 L 72 0',
      labelX: 50,
      labelY: -3,
      labelSide: { x: 0, y: -1 },
    })
  })

  it('numa aresta vertical o rótulo fica ao lado, LABEL_GAP à direita da linha', () => {
    const { labelX, labelY, labelSide } = edgeGeometry({ x: 0, y: 0 }, { x: 0, y: 100 }, false)
    expect(labelSide.x).toBe(1)
    expect(labelSide.y).toBeCloseTo(0)
    expect({ labelX, labelY }).toEqual({ labelX: LABEL_GAP, labelY: 50 })
  })

  it('numa aresta quase vertical o rótulo também fica ao lado', () => {
    const { labelX, labelSide } = edgeGeometry({ x: 0, y: 100 }, { x: 4, y: 0 }, false)
    expect(labelSide.x).toBeCloseTo(-1, 2)
    expect(Math.abs(labelSide.y)).toBeLessThan(0.05)
    expect(labelX).toBeCloseTo(2 - LABEL_GAP, 1)
  })

  it('arredonda a 2 casas em direções oblíquas', () => {
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 60, y: 80 }, false)).toEqual({
      path: 'M 16.8 22.4 L 43.2 57.6',
      labelX: 32.4,
      labelY: 38.2,
      labelSide: { x: 0.8, y: -0.6 },
    })
  })

  it('não imprime -0 nem NaN', () => {
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 100, y: -0.0001 }, false).path).toBe('M 28 0 L 72 0')
    expect(edgeGeometry({ x: 5, y: 5 }, { x: 5, y: 5 }, false).path).not.toContain('NaN')
    expect(edgeGeometry({ x: 5, y: 5 }, { x: 5, y: 5 }, true).path).not.toContain('NaN')
  })
})

describe('edgeGeometry curva', () => {
  it('usa Q com o controle a CURVE_OFFSET do ponto médio', () => {
    expect(CURVE_OFFSET).toBe(40)
    const { path, labelX, labelY } = edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, true)
    expect(path).toContain('Q 50 -40')
    // o ápice da curva fica em y ≈ -28.75; o rótulo, LABEL_GAP além dele
    expect({ labelX, labelY }).toEqual({ labelX: 50, labelY: -31.75 })
  })

  it('o par invertido curva para o lado oposto', () => {
    const { path, labelX, labelY } = edgeGeometry({ x: 100, y: 0 }, { x: 0, y: 0 }, true)
    expect(path).toContain('Q 50 40')
    expect({ labelX, labelY }).toEqual({ labelX: 50, labelY: 31.75 })
  })

  it('começa e termina na borda dos círculos', () => {
    const from = { x: 10, y: 20 }
    const to = { x: 200, y: 90 }
    const [x1, y1, , , x2, y2] = numbers(edgeGeometry(from, to, true).path)
    expect(Math.hypot(x1 - from.x, y1 - from.y)).toBeCloseTo(STATE_RADIUS, 1)
    expect(Math.hypot(x2 - to.x, y2 - to.y)).toBeCloseTo(STATE_RADIUS, 1)
  })
})

describe('selfLoopGeometry', () => {
  it('é uma cúbica acima do estado, de -120° a -60°, com o rótulo LABEL_GAP acima do topo', () => {
    expect(selfLoopGeometry({ x: 0, y: 0 })).toEqual({
      path: 'M -14 -24.25 C -40 -72 40 -72 14 -24.25',
      labelX: 0,
      labelY: -63.06,
      labelSide: { x: 0, y: -1 },
    })
  })

  it('acompanha o centro do estado', () => {
    const { path, labelX, labelY } = selfLoopGeometry({ x: 300, y: 200 })
    expect(path).toContain(' C ')
    expect({ labelX, labelY }).toEqual({ labelX: 300, labelY: 136.94 })
  })
})

describe('labelCenter', () => {
  const distanceToLine = (p: { x: number; y: number }, side: { x: number; y: number }) =>
    p.x * side.x + p.y * side.y

  it('encosta a caixa na âncora: nenhum canto fica a menos de LABEL_GAP da aresta', () => {
    for (const to of [
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: -70, y: 40 },
      { x: 20, y: -90 },
    ]) {
      const g = edgeGeometry({ x: 0, y: 0 }, to, false)
      const width = 54
      const height = 20
      const c = labelCenter(g, width, height)
      const corners = [-1, 1].flatMap((dx) =>
        [-1, 1].map((dy) => ({ x: c.x + (dx * width) / 2, y: c.y + (dy * height) / 2 })),
      )
      const middle = { x: to.x / 2, y: to.y / 2 }
      const nearest = Math.min(
        ...corners.map((p) =>
          distanceToLine({ x: p.x - middle.x, y: p.y - middle.y }, g.labelSide),
        ),
      )
      expect(nearest).toBeCloseTo(LABEL_GAP, 1)
    }
  })

  it('centraliza a caixa sobre o ponto médio de uma aresta horizontal', () => {
    const g = edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, false)
    expect(labelCenter(g, 40, 20)).toEqual({ x: 50, y: -13 })
  })
})

describe('initialArrowPath', () => {
  it('é uma reta de 40 vinda da esquerda até a borda do círculo', () => {
    expect(initialArrowPath({ x: 100, y: 50 })).toBe('M 32 50 L 72 50')
  })
})

describe('transitionShape', () => {
  const shapes = (spec: Parameters<typeof build>[0]) => {
    const a = build(spec)
    return a.transitions.map((t) => `${t.from}>${t.to}:${transitionShape(a, t)}`)
  }

  it('é laço quando origem e destino coincidem', () => {
    expect(shapes({ states: ['q0'], transitions: [['q0', 'a', 'q0']] })).toEqual(['q0>q0:loop'])
  })

  it('é reta quando não existe a transição inversa', () => {
    expect(shapes({ states: ['q0', 'q1'], transitions: [['q0', 'a', 'q1']] })).toEqual([
      'q0>q1:straight',
    ])
  })

  it('curva as duas transições de um par de ida e volta', () => {
    expect(
      shapes({
        states: ['q0', 'q1', 'q2'],
        transitions: [
          ['q0', 'a', 'q1'],
          ['q1', 'b', 'q0'],
          ['q1', 'a', 'q2'],
        ],
      }),
    ).toEqual(['q0>q1:curved', 'q1>q0:curved', 'q1>q2:straight'])
  })
})
