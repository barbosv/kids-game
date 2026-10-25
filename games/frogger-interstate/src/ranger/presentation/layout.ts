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
  gate: { id: 'gate', x: 110, y: 450, label: 'Front gate' },
  center: { id: 'center', x: 250, y: 340, label: 'Ranger cabin' },
  meadow: { id: 'meadow', x: 430, y: 470, label: 'Meadow crate', bundleId: 'bundle-meadow' },
  campsite: { id: 'campsite', x: 400, y: 214, label: 'Campsite' },
  creek: { id: 'creek', x: 610, y: 156, label: 'Creek crate', bundleId: 'bundle-creek' },
  crossing: { id: 'crossing', x: 700, y: 320, label: 'Creek crossing' },
  ridge: { id: 'ridge', x: 860, y: 455, label: 'Ridge crate', bundleId: 'bundle-ridge' },
  lookout: { id: 'lookout', x: 840, y: 200, label: 'Deer hill' },
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
