import { describe, expect, it } from 'vitest'
import {
  circleLayout,
  CURVE_OFFSET,
  edgeGeometry,
  initialArrowPath,
  selfLoopGeometry,
  STATE_RADIUS,
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
  it('vai de borda a borda e põe o rótulo acima do ponto médio', () => {
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, false)).toEqual({
      path: 'M 28 0 L 72 0',
      labelX: 50,
      labelY: -12,
    })
  })

  it('usa a perpendicular (dy, -dx) para afastar o rótulo', () => {
    const { labelX, labelY } = edgeGeometry({ x: 0, y: 0 }, { x: 0, y: 100 }, false)
    expect({ labelX, labelY }).toEqual({ labelX: 12, labelY: 50 })
  })

  it('arredonda a 2 casas em direções oblíquas', () => {
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 60, y: 80 }, false)).toEqual({
      path: 'M 16.8 22.4 L 43.2 57.6',
      labelX: 39.6,
      labelY: 32.8,
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
    expect({ labelX, labelY }).toEqual({ labelX: 50, labelY: -32 })
  })

  it('o par invertido curva para o lado oposto', () => {
    const { path, labelX, labelY } = edgeGeometry({ x: 100, y: 0 }, { x: 0, y: 0 }, true)
    expect(path).toContain('Q 50 40')
    expect({ labelX, labelY }).toEqual({ labelX: 50, labelY: 32 })
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
  it('é uma cúbica acima do estado, de -120° a -60°, com o rótulo 72 acima do centro', () => {
    expect(selfLoopGeometry({ x: 0, y: 0 })).toEqual({
      path: 'M -14 -24.25 C -40 -72 40 -72 14 -24.25',
      labelX: 0,
      labelY: -72,
    })
  })

  it('acompanha o centro do estado', () => {
    const { path, labelX, labelY } = selfLoopGeometry({ x: 300, y: 200 })
    expect(path).toContain(' C ')
    expect({ labelX, labelY }).toEqual({ labelX: 300, labelY: 128 })
  })
})

describe('initialArrowPath', () => {
  it('é uma reta de 40 vinda da esquerda até a borda do círculo', () => {
    expect(initialArrowPath({ x: 100, y: 50 })).toBe('M 32 50 L 72 50')
  })
})
