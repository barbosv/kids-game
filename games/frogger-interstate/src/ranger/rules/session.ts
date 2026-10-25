import { missionsFor } from '../content/catalog.ts'
import type { Band, Family, HintStep, Mission, Plan, ProjectId } from '../content/types.ts'
import { PROJECT_ORDER } from '../content/types.ts'
import { DECORATIONS, REPLAY_COINS, VISITORS, type DecorationId } from '../content/world.ts'
import {
  blankPlan,
  defaultProfile,
  isAvatarId,
  isProfileId,
  profileOf,
  replaceProfile,
  type ActiveAttempt,
  type Profile,
  type ReplayState,
  type SaveFile,
  type SkillRecord,
} from '../model/profile.ts'
import { collectBundle, spendCoins, spendSupplies, welcomeVisitors } from './economy.ts'
import { validate } from './validate.ts'

export type Step<T extends object = object> = {
  save: SaveFile
  error: string | null
} & T

function edit(save: SaveFile, profileId: string, fn: (profile: Profile) => void): SaveFile {
  const current = profileOf(save, profileId)
  if (!current) return save
  const next = structuredClone(current)
  fn(next)
  return replaceProfile(save, next)
}

export function attemptFromMission(mission: Mission): ActiveAttempt {
  return {
    missionId: mission.id,
    family: mission.family,
    band: mission.band,
    skillTags: [...mission.skillTags],
    instructions: mission.instructions,
    hintSteps: mission.hintSteps.map((step) => ({
      text: step.text,
      highlightIds: [...step.highlightIds],
    })),
    parameters: structuredClone(mission.parameters),
    supplyCost: mission.supplyCost,
    badgeId: mission.badgeId,
    completionText: mission.completionText,
    fieldNote: mission.fieldNote,
    hintsUsed: 0,
    attempts: 0,
    draft: blankPlan(mission.family),
    submittedPlan: null,
  }
}

export function pickMission(
  family: Family,
  band: Band,
  history: readonly SkillRecord[],
  avoidId?: string,
): Mission {
  const variants = missionsFor(family, band)
  const done = new Set(
    history.filter((record) => record.family === family && record.band === band).map((record) => record.missionId),
  )
  const fresh = variants.find((mission) => !done.has(mission.id) && mission.id !== avoidId)
  if (fresh) return fresh
  const pool = variants.filter((mission) => mission.id !== avoidId)
  const usable = pool.length > 0 ? pool : variants
  const index = history.filter((record) => record.family === family && record.band === band).length % usable.length
  return usable[index] ?? variants[0]!
}

export function previousReady(profile: Profile, projectId: ProjectId): boolean {
  const index = PROJECT_ORDER.indexOf(projectId)
  return PROJECT_ORDER.slice(0, index).every((id) => profile.projects[id] === 'built')
}

export function parkComplete(profile: Profile): boolean {
  return PROJECT_ORDER.every((id) => profile.projects[id] === 'built')
}

export function availableVisitorIds(profile: Profile): string[] {
  return VISITORS.filter((visitor) => {
    if (visitor.appears === 'start') return true
    if (visitor.appears === 'campsite') return profile.projects.campsite === 'built'
    return profile.projects.trail === 'built'
  }).map((visitor) => visitor.id)
}

export function currentHint(attempt: ActiveAttempt | null): HintStep | null {
  if (!attempt || attempt.hintsUsed <= 0) return null
  const index = Math.min(attempt.hintsUsed, attempt.hintSteps.length) - 1
  return attempt.hintSteps[index] ?? null
}

export function renameProfile(save: SaveFile, profileId: string, nickname: string): Step {
  if (!profileOf(save, profileId)) return { save, error: 'That ranger was not found.' }
  const clean = nickname.replace(/\s+/g, ' ').trim().slice(0, 16)
  if (!clean) return { save, error: 'The name needs at least one letter.' }
  return { save: edit(save, profileId, (profile) => { profile.nickname = clean }), error: null }
}

export function setAvatar(save: SaveFile, profileId: string, avatarId: string): Step {
  if (!profileOf(save, profileId)) return { save, error: 'That ranger was not found.' }
  if (!isAvatarId(avatarId)) return { save, error: 'Choose one of the ranger hats.' }
  return { save: edit(save, profileId, (profile) => { profile.avatarId = avatarId }), error: null }
}

export function setMute(save: SaveFile, profileId: string, mute: boolean): Step {
  if (!profileOf(save, profileId)) return { save, error: 'That ranger was not found.' }
  return { save: edit(save, profileId, (profile) => { profile.mute = mute }), error: null }
}

export function setActiveProfile(save: SaveFile, profileId: string): Step {
  if (!isProfileId(profileId)) return { save, error: 'That ranger was not found.' }
  return { save: { ...save, activeProfileId: profileId }, error: null }
}

/** Band changes apply to the next challenge. An active attempt keeps its parameters. */
export function setBand(save: SaveFile, profileId: string, band: Band): Step {
  if (!profileOf(save, profileId)) return { save, error: 'That ranger was not found.' }
  return { save: edit(save, profileId, (profile) => { profile.band = band }), error: null }
}

export function restartActiveAttempt(save: SaveFile, profileId: string): Step {
  if (!profileOf(save, profileId)) return { save, error: 'That ranger was not found.' }
  return {
    save: edit(save, profileId, (profile) => {
      if (profile.replay) {
        profile.replay = null
        return
      }
      const family = profile.activeAttempt?.family
      profile.activeAttempt = null
      if (family && (profile.projects[family] === 'challenging' || profile.projects[family] === 'planValid')) {
        profile.projects[family] = 'ready'
      }
    }),
    error: null,
  }
}

export function resetProfile(save: SaveFile, profileId: string): Step {
  if (!isProfileId(profileId)) return { save, error: 'That ranger was not found.' }
  return { save: replaceProfile(save, defaultProfile(profileId)), error: null }
}

export function welcomeAvailable(save: SaveFile, profileId: string): Step<{ gained: number }> {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.', gained: 0 }
  const result = welcomeVisitors(profile, availableVisitorIds(profile))
  const next = structuredClone(result.profile)
  if (next.intro === 'welcome') next.intro = 'collect'
  if (next.intro === 'collect' && next.collectedBundleIds.includes('bundle-meadow')) next.intro = 'play'
  return { save: replaceProfile(save, next), error: null, gained: result.gained }
}

export function collectSupplyBundle(save: SaveFile, profileId: string, bundleId: string): Step<{ gained: number }> {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.', gained: 0 }
  const result = collectBundle(profile, bundleId)
  const next = structuredClone(result.profile)
  if (next.intro === 'collect' && next.collectedBundleIds.includes('bundle-meadow')) next.intro = 'play'
  return { save: replaceProfile(save, next), error: null, gained: result.gained }
}

export function startChallenge(save: SaveFile, profileId: string, family: Family): Step {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.' }
  if (!previousReady(profile, family)) return { save, error: 'Build the earlier project first.' }
  if (profile.projects[family] === 'built') return { save, error: 'That project is already built.' }
  if (profile.projects[family] === 'locked') return { save, error: 'That project is not open yet.' }
  return {
    save: edit(save, profileId, (next) => {
      let attempt = next.activeAttempt
      if (!attempt || attempt.family !== family) {
        attempt = attemptFromMission(pickMission(family, next.band, next.skillHistory))
      }
      next.activeAttempt = attempt
      next.replay = null
      if (next.projects[family] === 'ready') next.projects[family] = 'challenging'
    }),
    error: null,
  }
}

export function updateDraft(save: SaveFile, profileId: string, plan: Plan, target: 'project' | 'replay'): Step {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.' }
  return {
    save: edit(save, profileId, (next) => {
      const attempt = target === 'replay' ? next.replay?.attempt : next.activeAttempt
      if (!attempt) return
      attempt.draft = structuredClone(plan)
    }),
    error: null,
  }
}

export function submitPlan(
  save: SaveFile,
  profileId: string,
  plan: Plan,
  target: 'project' | 'replay',
): Step<{ result: 'valid' | 'invalid'; reason: string | null }> {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.', result: 'invalid', reason: null }
  const attempt = target === 'replay' ? profile.replay?.attempt : profile.activeAttempt
  if (!attempt) return { save, error: 'There is no challenge to check.', result: 'invalid', reason: null }
  const check = validate(attempt.family, attempt.parameters, plan)
  const nextSave = edit(save, profileId, (next) => {
    const live = target === 'replay' ? next.replay?.attempt : next.activeAttempt
    if (!live) return
    live.draft = structuredClone(plan)
    live.attempts += 1
    if (check.ok) {
      live.submittedPlan = structuredClone(plan)
      if (target === 'replay' && next.replay) next.replay.stage = 'planValid'
      else next.projects[live.family] = 'planValid'
    } else {
      live.submittedPlan = null
      if (target === 'replay' && next.replay) next.replay.stage = 'challenging'
      else if (next.projects[live.family] !== 'built') next.projects[live.family] = 'challenging'
    }
  })
  if (check.ok) return { save: nextSave, error: null, result: 'valid', reason: null }
  return { save: nextSave, error: null, result: 'invalid', reason: check.reason }
}

export function leaveChallenge(save: SaveFile, profileId: string, target: 'project' | 'replay'): Step {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.' }
  return {
    save: edit(save, profileId, (next) => {
      if (target === 'replay') {
        if (!next.replay) return
        next.replay.stage = 'ready'
        next.replay.attempt.submittedPlan = null
        return
      }
      const attempt = next.activeAttempt
      if (!attempt) return
      attempt.submittedPlan = null
      if (next.projects[attempt.family] === 'challenging' || next.projects[attempt.family] === 'planValid') {
        next.projects[attempt.family] = 'ready'
      }
    }),
    error: null,
  }
}

export function useHint(save: SaveFile, profileId: string, target: 'project' | 'replay'): Step {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.' }
  return {
    save: edit(save, profileId, (next) => {
      const attempt = target === 'replay' ? next.replay?.attempt : next.activeAttempt
      if (!attempt) return
      if (attempt.hintsUsed >= attempt.hintSteps.length) return
      attempt.hintsUsed += 1
    }),
    error: null,
  }
}

export function confirmBuild(save: SaveFile, profileId: string, now = Date.now()): Step<{ built: ProjectId | null }> {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.', built: null }
  const attempt = profile.activeAttempt
  if (!attempt || !attempt.submittedPlan) return { save, error: 'Check a plan before building.', built: null }
  const family = attempt.family
  if (profile.projects[family] !== 'planValid') return { save, error: 'Check a plan before building.', built: null }
  if (!previousReady(profile, family)) return { save, error: 'Build the earlier project first.', built: null }
  const check = validate(family, attempt.parameters, attempt.submittedPlan)
  if (!check.ok) return { save, error: check.reason, built: null }
  if (profile.supplies < attempt.supplyCost) {
    return { save, error: 'Collect a supply bundle before building. The plan is still saved.', built: null }
  }
  const nextSave = edit(save, profileId, (next) => {
    const live = next.activeAttempt
    if (!live || next.projects[live.family] !== 'planValid') return
    const spent = spendSupplies(next, live.supplyCost)
    if (!spent.ok) return
    next.supplies = spent.profile.supplies
    next.projects[live.family] = 'built'
    if (!next.badges.includes(live.badgeId)) next.badges.push(live.badgeId)
    next.skillHistory.push(recordFrom(live, 'built', now))
    const orderIndex = PROJECT_ORDER.indexOf(live.family)
    const following = PROJECT_ORDER[orderIndex + 1]
    if (following && next.projects[following] === 'locked') next.projects[following] = 'ready'
    next.activeAttempt = null
    next.collectedBundleIds = []
  })
  const builtNow = profileOf(nextSave, profileId)?.projects[family] === 'built'
  if (!builtNow) return { save, error: 'Collect a supply bundle before building. The plan is still saved.', built: null }
  return { save: nextSave, error: null, built: family }
}

export function resumeReplay(save: SaveFile, profileId: string): Step {
  const profile = profileOf(save, profileId)
  if (!profile?.replay) return { save, error: 'There is no replay to continue.' }
  return {
    save: edit(save, profileId, (next) => {
      if (next.replay) next.replay.stage = 'challenging'
    }),
    error: null,
  }
}

export function startReplay(save: SaveFile, profileId: string, family: Family): Step {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.' }
  if (!parkComplete(profile)) return { save, error: 'Finish the park before replaying a challenge.' }
  return {
    save: edit(save, profileId, (next) => {
      const avoid = next.replay?.attempt.family === family ? next.replay.attempt.missionId : undefined
      const mission = pickMission(family, next.band, next.skillHistory, avoid)
      const attempt = attemptFromMission(mission)
      attempt.supplyCost = 0
      const replay: ReplayState = { stage: 'challenging', attempt }
      next.replay = replay
    }),
    error: null,
  }
}

export function confirmReplay(save: SaveFile, profileId: string, now = Date.now()): Step<{ gained: number }> {
  const profile = profileOf(save, profileId)
  if (!profile?.replay || profile.replay.stage !== 'planValid' || !profile.replay.attempt.submittedPlan) {
    return { save, error: 'Check a replay plan before finishing it.', gained: 0 }
  }
  const check = validate(profile.replay.attempt.family, profile.replay.attempt.parameters, profile.replay.attempt.submittedPlan)
  if (!check.ok) return { save, error: check.reason, gained: 0 }
  const coinsBefore = profile.coins
  const nextSave = edit(save, profileId, (next) => {
    if (!next.replay || next.replay.stage !== 'planValid' || !next.replay.attempt.submittedPlan) return
    next.coins += REPLAY_COINS
    next.skillHistory.push(recordFrom(next.replay.attempt, 'replayed', now))
    next.replay = null
  })
  const gained = (profileOf(nextSave, profileId)?.coins ?? coinsBefore) - coinsBefore
  return { save: nextSave, error: null, gained }
}

export function buyDecoration(save: SaveFile, profileId: string, decorationId: string): Step {
  const profile = profileOf(save, profileId)
  if (!profile) return { save, error: 'That ranger was not found.' }
  if (!parkComplete(profile)) return { save, error: 'Decorations unlock after the park is complete.' }
  const item = DECORATIONS.find((decoration) => decoration.id === decorationId)
  if (!item) return { save, error: 'That decoration is not in the shop.' }
  if (profile.decorations.includes(item.id)) return { save, error: 'You already added that decoration.' }
  const spent = spendCoins(profile, item.cost)
  if (!spent.ok) return { save, error: 'Collect a few more coins from visitors or replay challenges.' }
  return {
    save: edit(save, profileId, (next) => {
      const again = spendCoins(next, item.cost)
      if (!again.ok) return
      next.coins = again.profile.coins
      next.decorations.push(item.id as DecorationId)
    }),
    error: null,
  }
}

function recordFrom(attempt: ActiveAttempt, outcome: 'built' | 'replayed', at: number): SkillRecord {
  return {
    missionId: attempt.missionId,
    family: attempt.family,
    band: attempt.band,
    skillTags: [...attempt.skillTags],
    attempts: attempt.attempts,
    hintsUsed: attempt.hintsUsed,
    outcome,
    at,
  }
}

export function openProject(profile: Profile): ProjectId | null {
  return PROJECT_ORDER.find((id) => profile.projects[id] !== 'built') ?? null
}
