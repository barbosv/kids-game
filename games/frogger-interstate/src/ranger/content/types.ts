export type Band = 'explorer' | 'trailblazer' | 'pathfinder'

export type Family = 'campsite' | 'trail' | 'lookout'

export type ProjectId = Family

export const PROJECT_ORDER: readonly ProjectId[] = ['campsite', 'trail', 'lookout']

export const BANDS: readonly Band[] = ['explorer', 'trailblazer', 'pathfinder']

export type HintStep = {
  text: string
  highlightIds: string[]
}

export type CampsiteMode = 'fill' | 'share' | 'fractions'

export type CampsiteGroup = {
  id: string
  label: string
  /** Tokens required. Quarter-pieces when mode is fractions. */
  need: number
}

export type CampsiteParams = {
  mode: CampsiteMode
  groups: CampsiteGroup[]
  tokenCount: number
  /** Pathfinder only: maximum quarter-pieces that may be placed. */
  budget?: number
  showNeed: boolean
}

export type CampsitePlan = {
  kind: 'campsite'
  counts: Record<string, number>
}

export type TrailSegment = {
  id: string
  from: string
  to: string
  cost: number
  distance: number
  label: string
  closed?: boolean
}

export type TrailParams = {
  start: string
  goal: string
  startLabel: string
  goalLabel: string
  budget: number
  maxSteps?: number
  /** When true, the UI shows walking distance beside supply cost. */
  showDistance: boolean
  segments: TrailSegment[]
}

export type TrailPlan = {
  kind: 'trail'
  segmentIds: string[]
}

export type CellKind = 'safe' | 'trail' | 'water' | 'habitat' | 'buffer'

export type LookoutCell = {
  id: string
  col: number
  row: number
  kind: CellKind
  label: string
}

export type LookoutFacility = {
  id: string
  label: string
  cost: number
}

export type LookoutParams = {
  columns: number
  rows: number
  cells: LookoutCell[]
  facilities: LookoutFacility[]
  requiredIds: string[]
  chooseOneOf?: string[]
  requireTrailLink: boolean
  maxBudget?: number
}

export type LookoutPlacement = {
  facilityId: string
  cellId: string
}

export type LookoutPlan = {
  kind: 'lookout'
  placements: LookoutPlacement[]
}

export type Plan = CampsitePlan | TrailPlan | LookoutPlan

export type MissionBase = {
  id: string
  family: Family
  band: Band
  skillTags: string[]
  instructions: string
  hintSteps: HintStep[]
  supplyCost: number
  badgeId: string
  completionText: string
  fieldNote: string | null
}

export type CampsiteMission = MissionBase & {
  family: 'campsite'
  parameters: CampsiteParams
  knownSolution: CampsitePlan
}

export type TrailMission = MissionBase & {
  family: 'trail'
  parameters: TrailParams
  knownSolution: TrailPlan
}

export type LookoutMission = MissionBase & {
  family: 'lookout'
  parameters: LookoutParams
  knownSolution: LookoutPlan
}

export type Mission = CampsiteMission | TrailMission | LookoutMission

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: string; highlightIds: string[] }

export function fail(reason: string, highlightIds: string[] = []): CheckResult {
  return { ok: false, reason, highlightIds }
}
