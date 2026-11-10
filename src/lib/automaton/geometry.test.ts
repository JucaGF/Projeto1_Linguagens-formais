import { describe, expect, it } from 'vitest'
import { circleLayout, STATE_RADIUS } from './geometry'

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
