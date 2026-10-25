export type ParkNodeId =
  | 'gate'
  | 'center'
  | 'meadow'
  | 'campsite'
  | 'creek'
  | 'crossing'
  | 'ridge'
  | 'lookout'

export type ParkNode = {
  id: ParkNodeId
  x: number
  y: number
  label: string
  bundleId?: string
}

export const PARK_NODES: Record<ParkNodeId, ParkNode> = {
  gate: { id: 'gate', x: 100, y: 430, label: 'Gate' },
  center: { id: 'center', x: 270, y: 320, label: 'Visitor center' },
  meadow: { id: 'meadow', x: 450, y: 450, label: 'Meadow supplies', bundleId: 'bundle-meadow' },
  campsite: { id: 'campsite', x: 400, y: 160, label: 'Campsite' },
  creek: { id: 'creek', x: 610, y: 100, label: 'Creek supplies', bundleId: 'bundle-creek' },
  crossing: { id: 'crossing', x: 690, y: 300, label: 'Trail crossing' },
  ridge: { id: 'ridge', x: 840, y: 450, label: 'Ridge supplies', bundleId: 'bundle-ridge' },
  lookout: { id: 'lookout', x: 860, y: 150, label: 'Wildlife lookout' },
}

export const PARK_NODE_LIST = Object.values(PARK_NODES)

const EDGES: [ParkNodeId, ParkNodeId][] = [
  ['gate', 'center'],
  ['center', 'meadow'],
  ['center', 'campsite'],
  ['campsite', 'creek'],
  ['campsite', 'crossing'],
  ['meadow', 'crossing'],
  ['crossing', 'ridge'],
  ['crossing', 'lookout'],
  ['creek', 'lookout'],
]

const NEIGHBORS = new Map<ParkNodeId, ParkNodeId[]>()
for (const [a, b] of EDGES) {
  const left = NEIGHBORS.get(a) ?? []
  left.push(b)
  NEIGHBORS.set(a, left)
  const right = NEIGHBORS.get(b) ?? []
  right.push(a)
  NEIGHBORS.set(b, right)
}

export function isParkNode(value: string): value is ParkNodeId {
  return value in PARK_NODES
}

/** Nodes to walk after `from`, not including `from`. Empty when already there or no path exists. */
export function pathBetween(from: ParkNodeId, to: ParkNodeId): ParkNodeId[] {
  if (from === to) return []
  const previous = new Map<ParkNodeId, ParkNodeId | null>([[from, null]])
  const queue: ParkNodeId[] = [from]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const next of NEIGHBORS.get(current) ?? []) {
      if (previous.has(next)) continue
      previous.set(next, current)
      if (next === to) {
        const steps: ParkNodeId[] = []
        let cursor: ParkNodeId | null = to
        while (cursor && cursor !== from) {
          steps.push(cursor)
          cursor = previous.get(cursor) ?? null
        }
        return steps.reverse()
      }
      queue.push(next)
    }
  }
  return []
}

export const PARK_EDGES = EDGES
