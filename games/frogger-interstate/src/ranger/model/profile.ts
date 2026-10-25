import type { Band, Family, HintStep, Plan, ProjectId } from '../content/types.ts'
import {
  AVATAR_IDS,
  PROFILE_IDS,
  type AvatarId,
  type DecorationId,
  type ProfileId,
} from '../content/world.ts'

export type ProjectPhase = 'locked' | 'ready' | 'challenging' | 'planValid' | 'built'

export type SkillRecord = {
  missionId: string
  family: Family
  band: Band
  skillTags: string[]
  attempts: number
  hintsUsed: number
  outcome: 'built' | 'replayed'
  at: number
}

export type ActiveAttempt = {
  missionId: string
  family: Family
  band: Band
  skillTags: string[]
  instructions: string
  hintSteps: HintStep[]
  parameters: unknown
  supplyCost: number
  badgeId: string
  completionText: string
  fieldNote: string | null
  hintsUsed: number
  attempts: number
  draft: Plan
  submittedPlan: Plan | null
}

export type ReplayState = {
  stage: 'ready' | 'challenging' | 'planValid'
  attempt: ActiveAttempt
}

export type Profile = {
  id: ProfileId
  nickname: string
  avatarId: AvatarId
  band: Band
  mute: boolean
  coins: number
  supplies: number
  projects: Record<ProjectId, ProjectPhase>
  activeAttempt: ActiveAttempt | null
  replay: ReplayState | null
  badges: string[]
  skillHistory: SkillRecord[]
  decorations: DecorationId[]
  collectedBundleIds: string[]
  welcomedVisitorIds: string[]
  welcomeRewards: number
  intro: 'welcome' | 'collect' | 'play'
}

export type SaveFile = {
  version: 1
  activeProfileId: ProfileId
  profiles: Record<ProfileId, Profile>
}

const DEFAULTS: Record<ProfileId, { nickname: string; band: Band; avatarId: AvatarId }> = {
  'ranger-1': { nickname: 'Ranger 1', band: 'explorer', avatarId: 'pine' },
  'ranger-2': { nickname: 'Ranger 2', band: 'trailblazer', avatarId: 'river' },
  'ranger-3': { nickname: 'Ranger 3', band: 'pathfinder', avatarId: 'sunset' },
}

export function defaultProfile(id: ProfileId): Profile {
  const defaults = DEFAULTS[id]
  return {
    id,
    nickname: defaults.nickname,
    avatarId: defaults.avatarId,
    band: defaults.band,
    mute: false,
    coins: 0,
    supplies: 0,
    projects: { campsite: 'ready', trail: 'locked', lookout: 'locked' },
    activeAttempt: null,
    replay: null,
    badges: [],
    skillHistory: [],
    decorations: [],
    collectedBundleIds: [],
    welcomedVisitorIds: [],
    welcomeRewards: 0,
    intro: 'welcome',
  }
}

export function freshSave(): SaveFile {
  return {
    version: 1,
    activeProfileId: 'ranger-1',
    profiles: {
      'ranger-1': defaultProfile('ranger-1'),
      'ranger-2': defaultProfile('ranger-2'),
      'ranger-3': defaultProfile('ranger-3'),
    },
  }
}

export function isProfileId(value: string): value is ProfileId {
  return (PROFILE_IDS as readonly string[]).includes(value)
}

export function isAvatarId(value: string): value is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(value)
}

export function blankPlan(family: Family): Plan {
  if (family === 'campsite') return { kind: 'campsite', counts: {} }
  if (family === 'trail') return { kind: 'trail', segmentIds: [] }
  return { kind: 'lookout', placements: [] }
}

export function profileOf(save: SaveFile, id: string): Profile | null {
  if (!isProfileId(id)) return null
  return save.profiles[id]
}

export function replaceProfile(save: SaveFile, profile: Profile): SaveFile {
  return {
    ...save,
    profiles: {
      ...save.profiles,
      [profile.id]: profile,
    },
  }
}
