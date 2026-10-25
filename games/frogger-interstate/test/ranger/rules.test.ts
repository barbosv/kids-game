import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MISSIONS } from '../../src/ranger/content/catalog.ts'
import type { LookoutMission, LookoutPlan, TrailMission, TrailParams } from '../../src/ranger/content/types.ts'
import { freshSave } from '../../src/ranger/model/profile.ts'
import { collectBundle, spendSupplies, welcomeVisitors } from '../../src/ranger/rules/economy.ts'
import {
  buyDecoration,
  confirmBuild,
  confirmReplay,
  leaveChallenge,
  pickMission,
  restartActiveAttempt,
  setBand,
  startChallenge,
  startReplay,
  submitPlan,
  useHint,
  collectSupplyBundle,
} from '../../src/ranger/rules/session.ts'
import { validate, validateTrail } from '../../src/ranger/rules/validate.ts'
import { parseSave } from '../../src/ranger/persistence/save.ts'

test('every family and band has three solvable variants', () => {
  const families = ['campsite', 'trail', 'lookout'] as const
  const bands = ['explorer', 'trailblazer', 'pathfinder'] as const
  assert.equal(MISSIONS.length, 27)
  const ids = new Set(MISSIONS.map((mission) => mission.id))
  assert.equal(ids.size, 27)
  for (const family of families) {
    for (const band of bands) {
      const variants = MISSIONS.filter((mission) => mission.family === family && mission.band === band)
      assert.equal(variants.length, 3, `${family} ${band}`)
      for (const mission of variants) {
        assert.ok(mission.hintSteps.length >= 2)
        assert.ok(mission.hintSteps[0]!.highlightIds.length > 0)
        const ok = validate(mission.family, mission.parameters, mission.knownSolution)
        assert.equal(ok.ok, true, mission.id)
        const wrong = wrongPlan(mission)
        const bad = validate(mission.family, mission.parameters, wrong)
        assert.equal(bad.ok, false, mission.id)
        if (!bad.ok) assert.ok(bad.reason.length > 8, mission.id)
      }
    }
  }
})

test('trail graphs always have a recoverable valid route and a closed option', () => {
  for (const mission of MISSIONS.filter((item): item is TrailMission => item.family === 'trail')) {
    const openPaths = simplePaths(mission.parameters)
    assert.ok(openPaths.length >= 2, mission.id)
    const valid = openPaths.filter((path) => validateTrail(mission.parameters, { kind: 'trail', segmentIds: path }).ok)
    assert.ok(valid.length >= 1, mission.id)
    const closed = mission.parameters.segments.find((segment) => segment.closed)
    assert.ok(closed, mission.id)
    const closedResult = validateTrail(mission.parameters, { kind: 'trail', segmentIds: [closed!.id] })
    assert.equal(closedResult.ok, false)
    if (mission.band === 'pathfinder') {
      const shortest = openPaths.reduce((best, path) => (distanceOf(mission.parameters, path) < distanceOf(mission.parameters, best) ? path : best))
      const shortestResult = validateTrail(mission.parameters, { kind: 'trail', segmentIds: shortest })
      assert.equal(shortestResult.ok, false, mission.id)
    }
    if (mission.band === 'trailblazer') {
      assert.ok(openPaths.some((path) => path.length > (mission.parameters.maxSteps ?? 99)), mission.id)
      assert.ok(
        openPaths.some((path) => {
          const result = validateTrail(mission.parameters, { kind: 'trail', segmentIds: path })
          return !result.ok && result.reason.includes('budget')
        }),
        mission.id,
      )
    }
  }
})

test('lookout missions accept more than one layout and reject habitat cells', () => {
  for (const mission of MISSIONS.filter((item): item is LookoutMission => item.family === 'lookout')) {
    const plans = candidateLayouts(mission)
    const valid = plans.filter((plan) => validate(mission.family, mission.parameters, plan).ok)
    assert.ok(valid.length >= 2, `${mission.id} valid ${valid.length}`)
    const habitat = mission.parameters.cells.find((cell) => cell.kind === 'habitat')
    assert.ok(habitat)
    const required = mission.parameters.requiredIds[0]!
    const bad = validate(mission.family, mission.parameters, {
      kind: 'lookout',
      placements: [{ facilityId: required, cellId: habitat!.id }],
    })
    assert.equal(bad.ok, false)
    if (mission.parameters.chooseOneOf?.includes('blind')) {
      const knownLookout = mission.knownSolution.placements.find((placement) => placement.facilityId === 'lookout')
      const knownBench = mission.knownSolution.placements.find((placement) => placement.facilityId === 'bench')
      assert.ok(knownLookout && knownBench)
      const expensive = validate(mission.family, mission.parameters, {
        kind: 'lookout',
        placements: [
          knownLookout!,
          { facilityId: 'blind', cellId: knownBench!.cellId },
        ],
      })
      assert.equal(expensive.ok, false)
      if (!expensive.ok) assert.match(expensive.reason, /space/i)
    }
  }
})

test('spending is atomic, nonnegative, and rewards are not duplicated', () => {
  const original = freshSave()
  const profile = original.profiles['ranger-1']
  const first = collectBundle(profile, 'bundle-meadow')
  const second = collectBundle(first.profile, 'bundle-meadow')
  assert.equal(first.gained, 3)
  assert.equal(second.gained, 0)
  assert.equal(second.profile.supplies, 3)
  assert.equal(profile.supplies, 0)
  const broke = spendSupplies(second.profile, 4)
  assert.equal(broke.ok, false)
  assert.equal(broke.profile.supplies, 3)
  const paid = spendSupplies(second.profile, 3)
  assert.equal(paid.ok, true)
  assert.equal(paid.profile.supplies, 0)
  const welcomed = welcomeVisitors(profile, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  assert.equal(welcomed.gained, 6)
  assert.equal(welcomeVisitors(welcomed.profile, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).gained, 0)
})

test('projects unlock in order, wrong plans keep supplies, and builds spend once', () => {
  let save = freshSave()
  const id = 'ranger-1'
  assert.ok(startChallenge(save, id, 'trail').error)
  assert.ok(startChallenge(save, id, 'lookout').error)
  save = replaceCoins(save, id, 999)
  assert.ok(startChallenge(save, id, 'lookout').error)
  assert.ok(buyDecoration(save, id, 'flowers').error)
  assert.equal(save.profiles[id].projects.campsite, 'ready')

  save = collectSupplyBundle(save, id, 'bundle-meadow').save
  const supplies = save.profiles[id].supplies
  save = startChallenge(save, id, 'campsite').save
  const mission = MISSIONS.find((item) => item.id === save.profiles[id].activeAttempt?.missionId)
  assert.ok(mission)
  const wrong = submitPlan(save, id, wrongPlan(mission!), 'project')
  assert.equal(wrong.result, 'invalid')
  assert.ok(wrong.reason)
  assert.equal(wrong.save.profiles[id].supplies, supplies)
  assert.equal(wrong.save.profiles[id].projects.campsite, 'challenging')
  assert.equal(wrong.save.profiles[id].badges.length, 0)

  const hinted = useHint(useHint(wrong.save, id, 'project').save, id, 'project')
  assert.equal(hinted.save.profiles[id].activeAttempt?.hintsUsed, 2)
  assert.equal(hinted.save.profiles[id].projects.campsite, 'challenging')
  assert.equal(hinted.save.profiles[id].activeAttempt?.submittedPlan, null)

  const accepted = submitPlan(hinted.save, id, mission!.knownSolution, 'project')
  assert.equal(accepted.result, 'valid')
  assert.equal(accepted.save.profiles[id].supplies, supplies)
  const left = leaveChallenge(accepted.save, id, 'project')
  assert.equal(left.save.profiles[id].supplies, supplies)
  assert.equal(left.save.profiles[id].projects.campsite, 'ready')
  assert.equal(left.save.profiles[id].activeAttempt?.missionId, mission!.id)

  save = startChallenge(left.save, id, 'campsite').save
  save = submitPlan(save, id, mission!.knownSolution, 'project').save
  const built = confirmBuild(save, id, 100)
  assert.equal(built.error, null)
  assert.equal(built.built, 'campsite')
  assert.equal(built.save.profiles[id].supplies, supplies - 3)
  assert.equal(built.save.profiles[id].projects.trail, 'ready')
  assert.equal(built.save.profiles[id].projects.lookout, 'locked')
  assert.deepEqual(built.save.profiles[id].badges, ['badge-campsite'])
  const again = confirmBuild(built.save, id, 100)
  assert.ok(again.error)
  assert.equal(again.save.profiles[id].supplies, supplies - 3)

  const broke = confirmBuild(startAndAccept(freshSave(), id, 'campsite'), id, 100)
  assert.ok(broke.error)
  assert.equal(broke.save.profiles[id].supplies, 0)
  assert.equal(broke.save.profiles[id].projects.campsite, 'planValid')
})

test('difficulty sticks to the active attempt until restart', () => {
  let save = startChallenge(freshSave(), 'ranger-1', 'campsite').save
  const missionId = save.profiles['ranger-1'].activeAttempt?.missionId
  assert.equal(missionId, 'campsite-explorer-1')
  save = setBand(save, 'ranger-1', 'pathfinder').save
  save = startChallenge(save, 'ranger-1', 'campsite').save
  assert.equal(save.profiles['ranger-1'].activeAttempt?.missionId, missionId)
  assert.equal(save.profiles['ranger-1'].band, 'pathfinder')
  save = restartActiveAttempt(save, 'ranger-1').save
  assert.equal(save.profiles['ranger-1'].activeAttempt, null)
  assert.equal(save.profiles['ranger-1'].projects.campsite, 'ready')
  save = startChallenge(save, 'ranger-1', 'campsite').save
  assert.equal(save.profiles['ranger-1'].activeAttempt?.band, 'pathfinder')
  assert.equal(save.profiles['ranger-1'].projects.campsite, 'challenging')
})

test('profiles stay isolated and a finished park can replay without skipping builds', () => {
  let save = freshSave()
  save = finishPark(save, 'ranger-1')
  assert.equal(save.profiles['ranger-2'].projects.campsite, 'ready')
  assert.equal(save.profiles['ranger-2'].supplies, 0)
  assert.equal(save.profiles['ranger-2'].badges.length, 0)
  assert.deepEqual(save.profiles['ranger-1'].projects, { campsite: 'built', trail: 'built', lookout: 'built' })
  const before = save.profiles['ranger-1'].coins
  const replay = startReplay(save, 'ranger-1', 'campsite')
  assert.equal(replay.error, null)
  const missionId = replay.save.profiles['ranger-1'].replay?.attempt.missionId
  assert.ok(missionId)
  const mission = MISSIONS.find((item) => item.id === missionId)
  assert.ok(mission)
  save = submitPlan(replay.save, 'ranger-1', mission!.knownSolution, 'replay').save
  const done = confirmReplay(save, 'ranger-1', 200)
  assert.equal(done.gained, 2)
  assert.equal(done.save.profiles['ranger-1'].coins, before + 2)
  assert.equal(done.save.profiles['ranger-1'].projects.lookout, 'built')
  assert.equal(confirmReplay(done.save, 'ranger-1', 200).gained, 0)
  const freshReplay = startReplay(freshSave(), 'ranger-2', 'lookout')
  assert.ok(freshReplay.error)
  assert.equal(freshReplay.save.profiles['ranger-2'].projects.lookout, 'locked')
})

test('saves round-trip active parameters and recover from corrupt data', () => {
  let save = startChallenge(freshSave(), 'ranger-3', 'campsite').save
  save.profiles['ranger-1'].nickname = 'Ada'
  const raw = JSON.stringify(save)
  const loaded = parseSave(raw)
  assert.equal(loaded.recoveryNote, null)
  assert.equal(loaded.save.profiles['ranger-3'].activeAttempt?.missionId, save.profiles['ranger-3'].activeAttempt?.missionId)
  assert.deepEqual(loaded.save.profiles['ranger-3'].activeAttempt?.parameters, save.profiles['ranger-3'].activeAttempt?.parameters)
  assert.equal(loaded.save.profiles['ranger-1'].nickname, 'Ada')

  const broken = parseSave('{')
  assert.ok(broken.recoveryNote)
  assert.equal(broken.save.profiles['ranger-1'].supplies, 0)
  const version = parseSave(JSON.stringify({ version: 99, profiles: {} }))
  assert.ok(version.recoveryNote)
  assert.equal(version.save.profiles['ranger-2'].band, 'trailblazer')

  const partial = structuredClone(save)
  const encoded = JSON.parse(JSON.stringify(partial)) as { profiles: Record<string, unknown> }
  encoded.profiles['ranger-1'] = { coins: -5 }
  const recovered = parseSave(JSON.stringify(encoded))
  assert.ok(recovered.recoveryNote)
  assert.equal(recovered.save.profiles['ranger-1'].nickname, 'Ranger 1')
  assert.equal(recovered.save.profiles['ranger-1'].coins, 0)
  assert.equal(recovered.save.profiles['ranger-3'].activeAttempt?.missionId, save.profiles['ranger-3'].activeAttempt?.missionId)
})

test('mission rotation keeps an unused variant for the next replay', () => {
  const history = [
    {
      missionId: 'campsite-explorer-1',
      family: 'campsite' as const,
      band: 'explorer' as const,
      skillTags: [],
      attempts: 1,
      hintsUsed: 0,
      outcome: 'built' as const,
      at: 1,
    },
  ]
  const next = pickMission('campsite', 'explorer', history, 'campsite-explorer-1')
  assert.equal(next.id, 'campsite-explorer-2')
})

function replaceCoins(save: ReturnType<typeof freshSave>, id: 'ranger-1', coins: number) {
  const next = structuredClone(save)
  next.profiles[id].coins = coins
  return next
}

function startAndAccept(save: ReturnType<typeof freshSave>, id: 'ranger-1', family: 'campsite' | 'trail' | 'lookout') {
  let next = startChallenge(save, id, family).save
  const mission = MISSIONS.find((item) => item.id === next.profiles[id].activeAttempt?.missionId)
  assert.ok(mission)
  next = submitPlan(next, id, mission!.knownSolution, 'project').save
  return next
}

function finishPark(save: ReturnType<typeof freshSave>, id: 'ranger-1') {
  let next = save
  for (const family of ['campsite', 'trail', 'lookout'] as const) {
    next = collectSupplyBundle(next, id, 'bundle-meadow').save
    next = startAndAccept(next, id, family)
    const built = confirmBuild(next, id, 50)
    assert.equal(built.error, null, family)
    next = built.save
  }
  return next
}

function wrongPlan(mission: (typeof MISSIONS)[number]) {
  if (mission.family === 'campsite') {
    const first = mission.parameters.groups[0]!.id
    return { kind: 'campsite' as const, counts: { [first]: mission.parameters.tokenCount } }
  }
  if (mission.family === 'trail') {
    const closed = mission.parameters.segments.find((segment) => segment.closed)
    return { kind: 'trail' as const, segmentIds: [closed!.id] }
  }
  const habitat = mission.parameters.cells.find((cell) => cell.kind === 'habitat')
  return {
    kind: 'lookout' as const,
    placements: [{ facilityId: mission.parameters.requiredIds[0]!, cellId: habitat!.id }],
  }
}

function simplePaths(params: TrailParams): string[][] {
  const paths: string[][] = []
  const open = params.segments.filter((segment) => !segment.closed)
  const walk = (node: string, usedSegments: Set<string>, usedNodes: Set<string>, path: string[]) => {
    if (node === params.goal && path.length > 0) {
      paths.push([...path])
      return
    }
    for (const segment of open) {
      if (usedSegments.has(segment.id)) continue
      if (segment.from !== node && segment.to !== node) continue
      const next = segment.from === node ? segment.to : segment.from
      if (usedNodes.has(next)) continue
      usedSegments.add(segment.id)
      usedNodes.add(next)
      path.push(segment.id)
      walk(next, usedSegments, usedNodes, path)
      path.pop()
      usedNodes.delete(next)
      usedSegments.delete(segment.id)
    }
  }
  walk(params.start, new Set(), new Set([params.start]), [])
  return paths
}

function distanceOf(params: TrailParams, path: string[]): number {
  const byId = new Map(params.segments.map((segment) => [segment.id, segment]))
  return path.reduce((sum, id) => sum + (byId.get(id)?.distance ?? 0), 0)
}

function candidateLayouts(mission: LookoutMission): LookoutPlan[] {
  const cells = mission.parameters.cells.filter((cell) => cell.kind === 'safe' || cell.kind === 'trail')
  const choices = mission.parameters.chooseOneOf ?? [null]
  const plans: LookoutPlan[] = []
  for (const choice of choices) {
    const facilities = choice ? [...mission.parameters.requiredIds, choice] : [...mission.parameters.requiredIds]
    const assign = (index: number, used: Set<string>, placements: LookoutPlan['placements']) => {
      if (index === facilities.length) {
        plans.push({ kind: 'lookout', placements: placements.map((placement) => ({ ...placement })) })
        return
      }
      for (const cell of cells) {
        if (used.has(cell.id)) continue
        used.add(cell.id)
        placements.push({ facilityId: facilities[index]!, cellId: cell.id })
        assign(index + 1, used, placements)
        placements.pop()
        used.delete(cell.id)
      }
    }
    assign(0, new Set(), [])
  }
  return plans
}
