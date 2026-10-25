import type { CampsiteMission, CampsiteParams } from './types.ts'
import { quarterLabel } from './world.ts'

const badge = 'badge-campsite'
const completion =
  'The campsite is open. Campers can unpack because every tent has the supplies it needs.'

function fill(
  id: string,
  groups: CampsiteParams['groups'],
  tokenCount: number,
  instructions: string,
  hint: string,
): CampsiteMission {
  const counts: Record<string, number> = {}
  for (const group of groups) counts[group.id] = group.need
  return {
    id,
    family: 'campsite',
    band: 'explorer',
    skillTags: ['count', 'add-subtract-within-20'],
    instructions,
    hintSteps: [
      {
        text: 'Each tent shows empty slots. Fill a slot by placing one supply token.',
        highlightIds: groups.map((group) => group.id),
      },
      { text: hint, highlightIds: [groups[0]?.id ?? ''] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote: null,
    parameters: { mode: 'fill', groups, tokenCount, showNeed: true },
    knownSolution: { kind: 'campsite', counts },
  }
}

function share(
  id: string,
  labels: string[],
  tokenCount: number,
): CampsiteMission {
  const each = tokenCount / labels.length
  const groups = labels.map((label, index) => ({
    id: `camp-${index + 1}`,
    label,
    need: each,
  }))
  const counts: Record<string, number> = {}
  for (const group of groups) counts[group.id] = each
  return {
    id,
    family: 'campsite',
    band: 'trailblazer',
    skillTags: ['equal-share', 'multiplication', 'exact-division'],
    instructions: `Share all ${tokenCount} supply bundles equally among ${labels.length} campsites. Each campsite needs the same number, and every bundle is used.`,
    hintSteps: [
      {
        text: 'Start by giving one bundle to each campsite, then repeat.',
        highlightIds: groups.map((group) => group.id),
      },
      {
        text: `${tokenCount} bundles ÷ ${labels.length} campsites = ${each} bundles each.`,
        highlightIds: groups.map((group) => group.id),
      },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote: null,
    parameters: { mode: 'share', groups, tokenCount, showNeed: false },
    knownSolution: { kind: 'campsite', counts },
  }
}

function fractions(
  id: string,
  groups: CampsiteParams['groups'],
  tokenCount: number,
  budget: number,
): CampsiteMission {
  const counts: Record<string, number> = {}
  for (const group of groups) counts[group.id] = group.need
  const needs = groups
    .map((group) => `${group.label} needs ${quarterLabel(group.need)} bundle`)
    .join('. ')
  return {
    id,
    family: 'campsite',
    band: 'pathfinder',
    skillTags: ['fractions', 'quarters', 'budget'],
    instructions: `Each token is 1/4 of a bundle. ${needs}. Use at most ${budget} quarter pieces.`,
    hintSteps: [
      {
        text: '1/2 bundle is 2 quarter pieces. 3/4 bundle is 3 quarter pieces. 1 bundle is 4 quarter pieces.',
        highlightIds: groups.map((group) => group.id),
      },
      {
        text: `Place only the quarters each tent asks for, then count the pieces. The plan must stay at or under ${budget}.`,
        highlightIds: groups.map((group) => group.id),
      },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote: null,
    parameters: { mode: 'fractions', groups, tokenCount, budget, showNeed: true },
    knownSolution: { kind: 'campsite', counts },
  }
}

export const CAMPSITE_MISSIONS: CampsiteMission[] = [
  fill(
    'campsite-explorer-1',
    [
      { id: 'oak', label: 'Oak tent', need: 2 },
      { id: 'pine', label: 'Pine tent', need: 3 },
      { id: 'cedar', label: 'Cedar tent', need: 1 },
    ],
    6,
    'Fill each tent with the supply tokens its slots show. Oak has 2 slots, Pine has 3, and Cedar has 1.',
    'Oak still needs enough tokens to match its 2 slots. Count what is already there, then add or take away.',
  ),
  fill(
    'campsite-explorer-2',
    [
      { id: 'maple', label: 'Maple tent', need: 4 },
      { id: 'birch', label: 'Birch tent', need: 4 },
    ],
    8,
    'Fill each tent. Maple has 4 slots and Birch has 4 slots.',
    'If a tent has too many tokens, move one back to the pile and count again.',
  ),
  fill(
    'campsite-explorer-3',
    [
      { id: 'north', label: 'North tent', need: 5 },
      { id: 'south', label: 'South tent', need: 3 },
      { id: 'gate', label: 'Gate tent', need: 2 },
    ],
    10,
    'Fill each tent. North has 5 slots, South has 3, and Gate has 2.',
    'Add the slots: 5 + 3 + 2 = 10. That uses the whole pile when every slot is filled.',
  ),
  share('campsite-trailblazer-1', ['Oak campsite', 'Pine campsite', 'Cedar campsite'], 12),
  share('campsite-trailblazer-2', ['North', 'East', 'South', 'West'], 8),
  share('campsite-trailblazer-3', ['Meadow', 'Ridge', 'Creekside'], 15),
  fractions(
    'campsite-pathfinder-1',
    [
      { id: 'oak', label: 'Oak tent', need: 2 },
      { id: 'pine', label: 'Pine tent', need: 3 },
    ],
    8,
    6,
  ),
  fractions(
    'campsite-pathfinder-2',
    [
      { id: 'lantern', label: 'Lantern box', need: 4 },
      { id: 'water', label: 'Water crate', need: 2 },
      { id: 'snack', label: 'Snack tin', need: 1 },
    ],
    10,
    8,
  ),
  fractions(
    'campsite-pathfinder-3',
    [
      { id: 'tent-a', label: 'Tent A', need: 3 },
      { id: 'tent-b', label: 'Tent B', need: 3 },
      { id: 'tent-c', label: 'Tent C', need: 2 },
    ],
    10,
    8,
  ),
]
