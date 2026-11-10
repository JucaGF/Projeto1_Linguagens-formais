export type EdgeTone = 'default' | 'selected' | 'conflict' | 'firing'

export const MARKER_IDS: Record<EdgeTone, string> = {
  default: 'arrow',
  selected: 'arrow-selected',
  conflict: 'arrow-conflict',
  firing: 'arrow-firing',
}

export const arrowUrl = (tone: EdgeTone) => `url(#${MARKER_IDS[tone]})`
