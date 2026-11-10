import type { Point } from './types'

export const STATE_RADIUS = 28

const LAYOUT_CENTER: Point = { x: 320, y: 260 }
const LAYOUT_RADIUS = 180

/** Distribui `count` estados num círculo, o primeiro à esquerda e os seguintes no sentido horário da tela. */
export function circleLayout(count: number, index: number): Point {
  const angle = Math.PI + (2 * Math.PI * index) / count
  return {
    x: Math.round(LAYOUT_CENTER.x + LAYOUT_RADIUS * Math.cos(angle)),
    y: Math.round(LAYOUT_CENTER.y + LAYOUT_RADIUS * Math.sin(angle)),
  }
}
