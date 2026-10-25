import { quarterLabel } from '../content/world.ts'
import type {
  CampsiteParams,
  CampsitePlan,
  CheckResult,
  Family,
  LookoutParams,
  LookoutPlan,
  Plan,
  TrailParams,
  TrailPlan,
  TrailSegment,
} from '../content/types.ts'
import { fail } from '../content/types.ts'

export function validate(family: Family, parameters: unknown, plan: Plan): CheckResult {
  if (family === 'campsite') {
    if (plan.kind !== 'campsite') return fail('That plan does not match this project.')
    return validateCampsite(parameters as CampsiteParams, plan)
  }
  if (family === 'trail') {
    if (plan.kind !== 'trail') return fail('That plan does not match this project.')
    return validateTrail(parameters as TrailParams, plan)
  }
  if (plan.kind !== 'lookout') return fail('That plan does not match this project.')
  return validateLookout(parameters as LookoutParams, plan)
}

export function validateCampsite(params: CampsiteParams, plan: CampsitePlan): CheckResult {
  let total = 0
  for (const group of params.groups) {
    const count = plan.counts[group.id] ?? 0
    if (!Number.isInteger(count) || count < 0) {
      return fail('Use whole supply tokens.', [group.id])
    }
    total += count
  }
  if (total > params.tokenCount) {
    return fail('That uses more tokens than are in the pile.')
  }
  if (params.mode === 'fractions' && params.budget !== undefined && total > params.budget) {
    return fail(`This plan uses ${total} quarter pieces. The budget is ${params.budget}.`)
  }
  if (params.mode === 'share') {
    if (total !== params.tokenCount) {
      return fail('Share all of the supplies. Some bundles are still in the pile.')
    }
    const each = params.tokenCount / params.groups.length
    if (!Number.isInteger(each)) return fail('These supplies cannot be shared equally.')
    for (const group of params.groups) {
      if ((plan.counts[group.id] ?? 0) !== each) {
        return fail('The campsites do not have equal supplies yet.', [group.id])
      }
    }
    return { ok: true }
  }
  for (const group of params.groups) {
    const count = plan.counts[group.id] ?? 0
    if (count !== group.need) {
      const need =
        params.mode === 'fractions'
          ? `${quarterLabel(group.need)} bundle`
          : `${group.need} ${group.need === 1 ? 'slot' : 'slots'}`
      const have =
        params.mode === 'fractions'
          ? `${count} quarter ${count === 1 ? 'piece' : 'pieces'}`
          : `${count} ${count === 1 ? 'token' : 'tokens'}`
      return fail(`${group.label} has ${have} and needs ${need}.`, [group.id])
    }
  }
  return { ok: true }
}

export function validateTrail(params: TrailParams, plan: TrailPlan): CheckResult {
  const byId = new Map(params.segments.map((segment) => [segment.id, segment]))
  const seen = new Set<string>()
  let location = params.start
  const visited = new Set<string>([location])
  let cost = 0
  for (const id of plan.segmentIds) {
    const segment = byId.get(id)
    if (!segment) return fail('That trail piece is not on this map.', [id])
    if (seen.has(id)) return fail('Each trail part can be used once.', [id])
    seen.add(id)
    if (segment.closed) {
      return fail(`${segment.label} is closed. Choose an open trail.`, [id])
    }
    if (segment.from !== location && segment.to !== location) {
      return fail('Those trail pieces do not connect. Select the next part from where you are.', [id])
    }
    const next = segment.from === location ? segment.to : segment.from
    if (visited.has(next)) return fail('The route visits the same place twice.', [id])
    visited.add(next)
    location = next
    cost += segment.cost
  }
  if (location !== params.goal) {
    return fail(`The route does not reach ${params.goalLabel} yet.`)
  }
  if (params.maxSteps !== undefined && plan.segmentIds.length > params.maxSteps) {
    return fail(
      `This route has ${plan.segmentIds.length} parts. Use ${params.maxSteps} or fewer.`,
    )
  }
  if (cost > params.budget) {
    return fail(`This route costs ${cost} supplies. The budget is ${params.budget}.`)
  }
  return { ok: true }
}

export function trailSelectionTotals(params: TrailParams, segmentIds: string[]): { cost: number; distance: number } {
  const byId = new Map(params.segments.map((segment) => [segment.id, segment]))
  let cost = 0
  let distance = 0
  for (const id of segmentIds) {
    const segment = byId.get(id)
    if (!segment) continue
    cost += segment.cost
    distance += segment.distance
  }
  return { cost, distance }
}

export function validateLookout(params: LookoutParams, plan: LookoutPlan): CheckResult {
  const cells = new Map(params.cells.map((cell) => [cell.id, cell]))
  const facilities = new Map(params.facilities.map((facility) => [facility.id, facility]))
  const placed = new Map<string, string>()
  const occupied = new Set<string>()
  for (const placement of plan.placements) {
    if (placed.has(placement.facilityId)) {
      return fail('Each building can be placed once.', [placement.facilityId])
    }
    const facility = facilities.get(placement.facilityId)
    if (!facility) return fail('That building is not part of this plan.', [placement.facilityId])
    const cell = cells.get(placement.cellId)
    if (!cell) return fail('That cell is not on the map.', [placement.cellId])
    if (occupied.has(cell.id)) return fail('Two buildings cannot share a cell.', [cell.id])
    if (cell.kind === 'water' || cell.kind === 'habitat' || cell.kind === 'buffer') {
      const name = cell.kind === 'buffer' ? 'a buffer' : cell.kind
      return fail(`${cell.label} is ${name}. Choose a safe cell or a trail cell.`, [cell.id])
    }
    placed.set(placement.facilityId, cell.id)
    occupied.add(cell.id)
  }
  for (const id of params.requiredIds) {
    if (!placed.has(id)) {
      const facility = facilities.get(id)
      return fail(`Place the ${facility?.label ?? 'building'}.`, [id])
    }
  }
  if (params.chooseOneOf) {
    const chosen = params.chooseOneOf.filter((id) => placed.has(id))
    if (chosen.length !== 1) {
      return fail('Choose exactly one visitor spot: the bench or the viewing blind.', params.chooseOneOf)
    }
  }
  const allowed = new Set([...params.requiredIds, ...(params.chooseOneOf ?? [])])
  for (const id of placed.keys()) {
    if (!allowed.has(id)) return fail('That building is not part of this plan.', [id])
  }
  if (params.requireTrailLink) {
    const linked = [...placed.values()].some((cellId) => {
      const cell = cells.get(cellId)
      return cell ? touchesTrail(cell, params.cells) : false
    })
    if (!linked) {
      return fail('Connect at least one building to the trail. It can sit on the trail or share a side with it.')
    }
  }
  if (params.maxBudget !== undefined) {
    let cost = 0
    for (const id of placed.keys()) cost += facilities.get(id)?.cost ?? 0
    if (cost > params.maxBudget) {
      return fail(`This plan uses ${cost} space. The limit is ${params.maxBudget}.`)
    }
  }
  return { ok: true }
}

function touchesTrail(cell: { id: string; col: number; row: number; kind: string }, cells: LookoutParams['cells']): boolean {
  if (cell.kind === 'trail') return true
  return cells.some(
    (other) =>
      other.kind === 'trail' && Math.abs(other.col - cell.col) + Math.abs(other.row - cell.row) === 1,
  )
}

export function segmentById(params: TrailParams, id: string): TrailSegment | undefined {
  return params.segments.find((segment) => segment.id === id)
}
