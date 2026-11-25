import type { Band, Family, HintStep, Plan } from '../content/types.ts'
import { BANDS } from '../content/types.ts'
import { DECORATIONS, SAVE_VERSION, STORAGE_KEY, type DecorationId } from '../content/world.ts'
import {
  blankPlan,
  defaultProfile,
  freshSave,
  isAvatarId,
  isProfileId,
  type ActiveAttempt,
  type Profile,
  type ProjectPhase,
  type ReplayState,
  type SaveFile,
  type SkillRecord,
} from '../model/profile.ts'

export type ParsedSave = {
  save: SaveFile
  recoveryNote: string | null
}

export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const PHASES: readonly ProjectPhase[] = ['locked', 'ready', 'challenging', 'planValid', 'built']
const FAMILIES: readonly Family[] = ['campsite', 'trail', 'lookout']
const INTROS = ['welcome', 'collect', 'play'] as const
const CORRUPT = 'The saved park could not be read, so a new park was started.'
const PROFILE_CORRUPT = 'Part of a ranger save could not be read, so that ranger started fresh.'
const VERSION_NOTE = 'This save is from a different version, so a new park was started.'

export function loadGame(store: KeyValueStore): ParsedSave {
  try {
    return parseSave(store.getItem(STORAGE_KEY))
  } catch {
    return { save: freshSave(), recoveryNote: CORRUPT }
  }
}

export function persistGame(store: KeyValueStore, save: SaveFile): void {
  store.setItem(STORAGE_KEY, JSON.stringify(save))
}

export function parseSave(raw: string | null): ParsedSave {
  if (raw === null || raw.trim() === '') return { save: freshSave(), recoveryNote: null }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { save: freshSave(), recoveryNote: CORRUPT }
  }
  if (!isRecord(data) || data.version !== SAVE_VERSION) {
    return { save: freshSave(), recoveryNote: VERSION_NOTE }
  }
  const incoming = isRecord(data.profiles) ? data.profiles : {}
  const profiles = {} as SaveFile['profiles']
  let recoveryNote: string | null = null
  for (const id of ['ranger-1', 'ranger-2', 'ranger-3'] as const) {
    const parsed = parseProfile(incoming[id], id)
    if (!parsed) {
      profiles[id] = defaultProfile(id)
      recoveryNote = PROFILE_CORRUPT
    } else {
      profiles[id] = parsed.profile
      if (parsed.repaired) recoveryNote = PROFILE_CORRUPT
    }
  }
  const requested = typeof data.activeProfileId === 'string' ? data.activeProfileId : 'ranger-1'
  const activeProfileId = isProfileId(requested) ? requested : 'ranger-1'
  return { save: { version: 1, activeProfileId, profiles }, recoveryNote }
}

function parseProfile(value: unknown, id: Profile['id']): { profile: Profile; repaired: boolean } | null {
  if (!isRecord(value)) return null
  const defaults = defaultProfile(id)
  const nickname = typeof value.nickname === 'string' ? value.nickname.replace(/\s+/g, ' ').trim().slice(0, 16) : ''
  const band = value.band
  if (!isBand(band)) return null
  const coins = whole(value.coins)
  const supplies = whole(value.supplies)
  const welcomeRewards = whole(value.welcomeRewards)
  if (coins === null || supplies === null || welcomeRewards === null) return null
  const projects = parseProjects(value.projects)
  if (!projects) return null
  const intro = INTROS.includes(value.intro as (typeof INTROS)[number]) ? (value.intro as Profile['intro']) : null
  if (!intro) return null
  const avatarId = typeof value.avatarId === 'string' && isAvatarId(value.avatarId) ? value.avatarId : defaults.avatarId
  let repaired = false
  const attempt = parseAttempt(value.activeAttempt)
  if (value.activeAttempt != null && !attempt) repaired = true
  let activeAttempt = attempt
  if (activeAttempt && (projects[activeAttempt.family] === 'built' || projects[activeAttempt.family] === 'locked')) {
    activeAttempt = null
    repaired = true
  }
  if (
    activeAttempt &&
    projects[activeAttempt.family] !== 'ready' &&
    projects[activeAttempt.family] !== 'challenging' &&
    projects[activeAttempt.family] !== 'planValid'
  ) {
    activeAttempt = null
    repaired = true
  }
  for (const projectId of FAMILIES) {
    const phase = projects[projectId]
    if ((phase === 'challenging' || phase === 'planValid') && activeAttempt?.family !== projectId) {
      projects[projectId] = 'ready'
      repaired = true
    }
  }
  if (
    activeAttempt &&
    projects[activeAttempt.family] === 'planValid' &&
    !activeAttempt.submittedPlan
  ) {
    projects[activeAttempt.family] = 'challenging'
    repaired = true
  }
  const replayParsed = parseReplay(value.replay)
  if (value.replay != null && !replayParsed) repaired = true
  const decorations = parseDecorations(value.decorations)
  const badges = stringList(value.badges, 12)
  const history = parseHistory(value.skillHistory)
  if (value.skillHistory != null && !Array.isArray(value.skillHistory)) repaired = true
  return {
    repaired,
    profile: {
      id,
      nickname: nickname || defaults.nickname,
      avatarId,
      band,
      mute: value.mute === true,
      coins,
      supplies,
      projects,
      activeAttempt,
      replay: replayParsed,
      badges,
      skillHistory: history,
      decorations,
      collectedBundleIds: stringList(value.collectedBundleIds, 12),
      welcomedVisitorIds: stringList(value.welcomedVisitorIds, 12),
      welcomeRewards,
      intro,
    },
  }
}

function parseProjects(value: unknown): Profile['projects'] | null {
  if (!isRecord(value)) return null
  const projects = {} as Profile['projects']
  for (const id of FAMILIES) {
    const phase = value[id]
    if (!isPhase(phase)) return null
    projects[id] = phase
  }
  if (projects.campsite === 'locked') return null
  if (projects.trail !== 'locked' && projects.campsite !== 'built') return null
  if (projects.lookout !== 'locked' && projects.trail !== 'built') return null
  if (projects.trail === 'built' && projects.campsite !== 'built') return null
  if (projects.lookout === 'built' && projects.trail !== 'built') return null
  return projects
}

function parseReplay(value: unknown): ReplayState | null {
  if (value == null) return null
  if (!isRecord(value)) return null
  if (value.stage !== 'ready' && value.stage !== 'challenging' && value.stage !== 'planValid') return null
  const attempt = parseAttempt(value.attempt)
  if (!attempt) return null
  if (value.stage === 'planValid' && !attempt.submittedPlan) return null
  return { stage: value.stage, attempt }
}

function parseAttempt(value: unknown): ActiveAttempt | null {
  if (value == null) return null
  if (!isRecord(value)) return null
  if (typeof value.missionId !== 'string' || value.missionId.length > 80) return null
  if (!isFamily(value.family) || !isBand(value.band)) return null
  if (typeof value.instructions !== 'string' || typeof value.completionText !== 'string') return null
  if (!isRecord(value.parameters)) return null
  if (!parametersMatchFamily(value.family, value.parameters)) return null
  const supplyCost = whole(value.supplyCost)
  const hintsUsed = whole(value.hintsUsed)
  const attempts = whole(value.attempts)
  if (supplyCost === null || hintsUsed === null || attempts === null) return null
  if (typeof value.badgeId !== 'string') return null
  const draft = parsePlan(value.draft, value.family) ?? blankPlan(value.family)
  const submittedPlan = value.submittedPlan == null ? null : parsePlan(value.submittedPlan, value.family)
  if (value.submittedPlan != null && !submittedPlan) return null
  const hintSteps = parseHints(value.hintSteps)
  if (!hintSteps) return null
  return {
    missionId: value.missionId,
    family: value.family,
    band: value.band,
    skillTags: stringList(value.skillTags, 12),
    instructions: value.instructions.slice(0, 600),
    hintSteps,
    parameters: value.parameters,
    supplyCost,
    badgeId: value.badgeId.slice(0, 40),
    completionText: value.completionText.slice(0, 400),
    fieldNote: typeof value.fieldNote === 'string' ? value.fieldNote.slice(0, 400) : null,
    hintsUsed,
    attempts,
    draft,
    submittedPlan,
  }
}

function parametersMatchFamily(family: Family, parameters: Record<string, unknown>): boolean {
  if (family === 'campsite') {
    return (
      (parameters.mode === 'fill' || parameters.mode === 'share' || parameters.mode === 'fractions') &&
      Array.isArray(parameters.groups) &&
      parameters.groups.length > 0 &&
      whole(parameters.tokenCount) !== null
    )
  }
  if (family === 'trail') {
    return typeof parameters.start === 'string' && typeof parameters.goal === 'string' && Array.isArray(parameters.segments) && whole(parameters.budget) !== null
  }
  return Array.isArray(parameters.cells) && Array.isArray(parameters.facilities) && Array.isArray(parameters.requiredIds)
}

function parsePlan(value: unknown, family: Family): Plan | null {
  if (!isRecord(value) || value.kind !== family) return null
  if (family === 'campsite') {
    if (!isRecord(value.counts)) return null
    const counts: Record<string, number> = {}
    for (const [key, count] of Object.entries(value.counts)) {
      if (!Number.isInteger(count) || (count as number) < 0) return null
      counts[key] = count as number
    }
    return { kind: 'campsite', counts }
  }
  if (family === 'trail') {
    if (!Array.isArray(value.segmentIds) || !value.segmentIds.every((id) => typeof id === 'string')) return null
    return { kind: 'trail', segmentIds: value.segmentIds.slice(0, 12) }
  }
  if (!Array.isArray(value.placements)) return null
  const placements: { facilityId: string; cellId: string }[] = []
  for (const placement of value.placements) {
    if (!isRecord(placement) || typeof placement.facilityId !== 'string' || typeof placement.cellId !== 'string') return null
    placements.push({ facilityId: placement.facilityId, cellId: placement.cellId })
  }
  return { kind: 'lookout', placements }
}

function parseHints(value: unknown): HintStep[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null
  const steps: HintStep[] = []
  for (const step of value) {
    if (!isRecord(step) || typeof step.text !== 'string' || !Array.isArray(step.highlightIds)) return null
    if (!step.highlightIds.every((id) => typeof id === 'string')) return null
    steps.push({ text: step.text.slice(0, 400), highlightIds: step.highlightIds.slice(0, 12) as string[] })
  }
  return steps
}

function parseHistory(value: unknown): SkillRecord[] {
  if (!Array.isArray(value)) return []
  const records: SkillRecord[] = []
  for (const entry of value.slice(0, 40)) {
    if (!isRecord(entry)) continue
    if (typeof entry.missionId !== 'string' || !isFamily(entry.family) || !isBand(entry.band)) continue
    const attempts = whole(entry.attempts)
    const hintsUsed = whole(entry.hintsUsed)
    const at = whole(entry.at)
    if (attempts === null || hintsUsed === null || at === null) continue
    if (entry.outcome !== 'built' && entry.outcome !== 'replayed') continue
    records.push({
      missionId: entry.missionId,
      family: entry.family,
      band: entry.band,
      skillTags: stringList(entry.skillTags, 12),
      attempts,
      hintsUsed,
      outcome: entry.outcome,
      at,
    })
  }
  return records
}

function parseDecorations(value: unknown): DecorationId[] {
  if (!Array.isArray(value)) return []
  const known = new Set(DECORATIONS.map((item) => item.id))
  const found: DecorationId[] = []
  for (const id of value) {
    if (typeof id === 'string' && known.has(id as DecorationId) && !found.includes(id as DecorationId)) {
      found.push(id as DecorationId)
    }
  }
  return found
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length < 80).slice(0, max)
}

function whole(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1_000_000) return null
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBand(value: unknown): value is Band {
  return typeof value === 'string' && (BANDS as readonly string[]).includes(value)
}

function isFamily(value: unknown): value is Family {
  return typeof value === 'string' && (FAMILIES as readonly string[]).includes(value)
}

function isPhase(value: unknown): value is ProjectPhase {
  return typeof value === 'string' && (PHASES as readonly string[]).includes(value)
}
