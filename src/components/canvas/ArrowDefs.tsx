export type EdgeTone = 'default' | 'selected' | 'conflict' | 'firing'

const MARKER_IDS: Record<EdgeTone, string> = {
  default: 'arrow',
  selected: 'arrow-selected',
  conflict: 'arrow-conflict',
  firing: 'arrow-firing',
}

const MARKER_COLORS: Record<EdgeTone, string> = {
  default: 'var(--canvas-edge)',
  selected: 'var(--canvas-selection)',
  conflict: 'var(--canvas-conflict)',
  firing: 'oklch(0.62 0.14 70)',
}

export const arrowUrl = (tone: EdgeTone) => `url(#${MARKER_IDS[tone]})`

/**
 * Pontas de seta compartilhadas por arestas e pela seta de entrada. Uma por cor, porque a
 * ponta não herda o traço do caminho em todos os navegadores. O `<svg>` tem tamanho zero em vez
 * de `display: none`, que desligaria os marcadores.
 */
export function ArrowDefs() {
  return (
    <svg aria-hidden width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        {(Object.keys(MARKER_IDS) as EdgeTone[]).map((tone) => (
          <marker
            key={tone}
            id={MARKER_IDS[tone]}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={10}
            markerHeight={10}
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M 0 1 L 10 5 L 0 9 L 2.5 5 z" style={{ fill: MARKER_COLORS[tone] }} />
          </marker>
        ))}
      </defs>
    </svg>
  )
}
