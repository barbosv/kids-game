import type { TrailMission, TrailSegment } from './types.ts'

const badge = 'badge-trail'
const completion = 'The crossing is open. Visitors can follow the route you checked and reach the next part of the park.'

function mission(
  partial: Omit<TrailMission, 'family' | 'badgeId' | 'completionText' | 'fieldNote' | 'supplyCost'>,
): TrailMission {
  return {
    ...partial,
    family: 'trail',
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote: null,
  }
}

function seg(
  id: string,
  from: string,
  to: string,
  cost: number,
  distance: number,
  label: string,
  closed = false,
): TrailSegment {
  return { id, from, to, cost, distance, label, ...(closed ? { closed: true } : {}) }
}

export const TRAIL_MISSIONS: TrailMission[] = [
  mission({
    id: 'trail-explorer-1',
    band: 'explorer',
    skillTags: ['addition-within-20', 'route-comparison'],
    instructions:
      'Add the supply costs along a route from the gate to the bridge. The budget is 6 supplies. Do not use the closed trail.',
    hintSteps: [
      {
        text: 'The mud slope is closed. Compare the two open routes by adding their costs.',
        highlightIds: ['mud'],
      },
      {
        text: 'Meadow path is 2 and Bridge path is 3. 2 + 3 = 5, which is inside the budget of 6.',
        highlightIds: ['meadow', 'bridge'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Gate',
      goalLabel: 'Bridge',
      budget: 6,
      showDistance: false,
      segments: [
        seg('meadow', 'start', 'meadow', 2, 2, 'Meadow path'),
        seg('bridge', 'meadow', 'goal', 3, 2, 'Bridge path'),
        seg('ridge', 'start', 'ridge', 4, 3, 'Ridge path'),
        seg('stone', 'ridge', 'goal', 4, 3, 'Stone path'),
        seg('mud', 'start', 'goal', 1, 1, 'Mud slope', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['meadow', 'bridge'] },
  }),
  mission({
    id: 'trail-explorer-2',
    band: 'explorer',
    skillTags: ['addition-within-20', 'route-comparison'],
    instructions:
      'Add the supply costs from the gate to the overlook. The budget is 10 supplies. Do not use the closed trail.',
    hintSteps: [
      { text: 'Skip the fog path. It is marked closed.', highlightIds: ['fog'] },
      {
        text: 'Lake path 3 plus Dock path 4 is 7. Pine path 5 plus Steps 4 is 9. Both fit under 10.',
        highlightIds: ['lake', 'dock'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Gate',
      goalLabel: 'Overlook',
      budget: 10,
      showDistance: false,
      segments: [
        seg('lake', 'start', 'lake', 3, 3, 'Lake path'),
        seg('dock', 'lake', 'goal', 4, 2, 'Dock path'),
        seg('pine', 'start', 'pine', 5, 4, 'Pine path'),
        seg('steps', 'pine', 'goal', 4, 2, 'Pine steps'),
        seg('fog', 'start', 'goal', 2, 2, 'Fog path', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['lake', 'dock'] },
  }),
  mission({
    id: 'trail-explorer-3',
    band: 'explorer',
    skillTags: ['addition-within-20', 'route-comparison'],
    instructions:
      'Add the supply costs from the gate to the ford. The budget is 12 supplies. Do not use the closed trail.',
    hintSteps: [
      { text: 'The bog is closed, even though its number looks small.', highlightIds: ['bog'] },
      {
        text: 'Hill 2 plus Switchback 9 is 11. Creek 6 plus Stones 6 is 12. A route of 12 uses the whole budget and still counts.',
        highlightIds: ['hill', 'switchback'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Gate',
      goalLabel: 'Ford',
      budget: 12,
      showDistance: false,
      segments: [
        seg('creek', 'start', 'creek', 6, 4, 'Creek path'),
        seg('stones', 'creek', 'goal', 6, 3, 'Stepping stones'),
        seg('hill', 'start', 'hill', 2, 2, 'Hill path'),
        seg('switchback', 'hill', 'goal', 9, 5, 'Switchback'),
        seg('bog', 'start', 'goal', 1, 1, 'Bog shortcut', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['hill', 'switchback'] },
  }),
  mission({
    id: 'trail-trailblazer-1',
    band: 'trailblazer',
    skillTags: ['compare-totals', 'two-constraints'],
    instructions:
      'Reach the gate using at most 10 supplies and at most 3 trail parts. Closed trails cannot be used.',
    hintSteps: [
      {
        text: 'Check two things: the supply total and how many parts you selected.',
        highlightIds: ['pine-goal', 'fallen'],
      },
      {
        text: 'Oak link is 3 and Oak gate is 6. That is 9 supplies and 2 parts, inside both limits.',
        highlightIds: ['oak-link', 'oak-gate'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Trailhead',
      goalLabel: 'Gate',
      budget: 10,
      maxSteps: 3,
      showDistance: false,
      segments: [
        seg('pine-link', 'start', 'pine', 4, 2, 'Pine link'),
        seg('pine-goal', 'pine', 'goal', 8, 2, 'Pine climb'),
        seg('oak-link', 'start', 'oak', 3, 3, 'Oak link'),
        seg('oak-gate', 'oak', 'goal', 6, 3, 'Oak gate'),
        seg('oak-rock', 'oak', 'rock', 3, 2, 'Oak rock'),
        seg('rock-gate', 'rock', 'goal', 3, 2, 'Rock gate'),
        seg('start-rock', 'start', 'rock', 1, 2, 'Rock link'),
        seg('rock-oak', 'rock', 'oak', 1, 2, 'Rock oak'),
        seg('oak-pine', 'oak', 'pine', 1, 2, 'Oak pine'),
        seg('fallen', 'start', 'goal', 1, 1, 'Fallen log', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['oak-link', 'oak-gate'] },
  }),
  mission({
    id: 'trail-trailblazer-2',
    band: 'trailblazer',
    skillTags: ['compare-totals', 'two-constraints'],
    instructions:
      'Reach the shelter using at most 9 supplies and at most 3 trail parts. Closed trails cannot be used.',
    hintSteps: [
      { text: 'A two-part route can still cost too much. Add before you submit.', highlightIds: ['spur'] },
      {
        text: 'Fern is 2, Moss is 2, and Shelter is 3. 2 + 2 + 3 = 7, with 3 parts.',
        highlightIds: ['fern', 'moss', 'shelter'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Trailhead',
      goalLabel: 'Shelter',
      budget: 9,
      maxSteps: 3,
      showDistance: false,
      segments: [
        seg('spur', 'start', 'high', 5, 2, 'High spur'),
        seg('high-shelter', 'high', 'goal', 6, 2, 'High shelter'),
        seg('fern', 'start', 'fern', 2, 2, 'Fern path'),
        seg('moss', 'fern', 'moss', 2, 2, 'Moss path'),
        seg('shelter', 'moss', 'goal', 3, 2, 'Shelter path'),
        seg('fern-goal', 'fern', 'goal', 4, 3, 'Fern shortcut'),
        seg('loop-a', 'start', 'low', 1, 2, 'Low loop'),
        seg('loop-b', 'low', 'fern', 1, 2, 'Low fern'),
        seg('loop-c', 'fern', 'high', 1, 2, 'Fern high'),
        seg('loop-d', 'high', 'goal', 1, 2, 'High finish'),
        seg('washout', 'start', 'goal', 2, 1, 'Washout', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['fern', 'moss', 'shelter'] },
  }),
  mission({
    id: 'trail-trailblazer-3',
    band: 'trailblazer',
    skillTags: ['compare-totals', 'two-constraints'],
    instructions:
      'Reach the kiosk using at most 8 supplies and at most 2 trail parts. Closed trails cannot be used.',
    hintSteps: [
      {
        text: 'Three cheap parts can break the part limit even when the sum looks small.',
        highlightIds: ['a', 'b', 'c'],
      },
      {
        text: 'Boardwalk is 3 and Kiosk ramp is 4. 3 + 4 = 7 supplies and 2 parts.',
        highlightIds: ['boardwalk', 'ramp'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Trailhead',
      goalLabel: 'Kiosk',
      budget: 8,
      maxSteps: 2,
      showDistance: false,
      segments: [
        seg('boardwalk', 'start', 'board', 3, 3, 'Boardwalk'),
        seg('ramp', 'board', 'goal', 4, 2, 'Kiosk ramp'),
        seg('cliff', 'start', 'cliff', 5, 2, 'Cliff edge'),
        seg('cliff-kiosk', 'cliff', 'goal', 5, 2, 'Cliff stairs'),
        seg('a', 'start', 'a', 2, 2, 'Pebble 1'),
        seg('b', 'a', 'b', 2, 2, 'Pebble 2'),
        seg('c', 'b', 'goal', 2, 2, 'Pebble 3'),
        seg('slide', 'start', 'goal', 1, 1, 'Rock slide', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['boardwalk', 'ramp'] },
  }),
  mission({
    id: 'trail-pathfinder-1',
    band: 'pathfinder',
    skillTags: ['budget-tradeoff', 'distance-versus-cost'],
    instructions:
      'Reach the gate using at most 6 supplies. A shorter walk can cost more supplies. Do not use the closed trail.',
    hintSteps: [
      {
        text: 'Compare walking distance and supply cost separately. The budget counts supplies, not steps.',
        highlightIds: ['cliff-steps', 'cliff-stairs'],
      },
      {
        text: 'The cliff route is the short walk and costs 11 supplies. Valley, bend, and gate cost 2 + 2 + 1 = 5.',
        highlightIds: ['valley', 'bend', 'gate'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Trailhead',
      goalLabel: 'Gate',
      budget: 6,
      showDistance: true,
      segments: [
        seg('cliff-steps', 'start', 'cliff', 6, 2, 'Cliff steps'),
        seg('cliff-stairs', 'cliff', 'goal', 5, 2, 'Cliff stairs'),
        seg('valley', 'start', 'valley', 2, 4, 'Valley path'),
        seg('bend', 'valley', 'bend', 2, 3, 'Valley bend'),
        seg('gate', 'bend', 'goal', 1, 3, 'Gate path'),
        seg('valley-gate', 'valley', 'goal', 4, 5, 'Valley direct'),
        seg('wash', 'start', 'goal', 1, 1, 'Closed wash', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['valley', 'bend', 'gate'] },
  }),
  mission({
    id: 'trail-pathfinder-2',
    band: 'pathfinder',
    skillTags: ['budget-tradeoff', 'distance-versus-cost'],
    instructions:
      'Reach the blind using at most 7 supplies. A shorter walk can cost more supplies. Do not use the closed trail.',
    hintSteps: [
      { text: 'The ledge looks short. Add its supply costs before choosing it.', highlightIds: ['ledge', 'ledge-blind'] },
      {
        text: 'Orchard 2, fence 2, and blind 2 use 6 supplies. The ledge route costs 12.',
        highlightIds: ['orchard', 'fence', 'blind'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Trailhead',
      goalLabel: 'Blind',
      budget: 7,
      showDistance: true,
      segments: [
        seg('ledge', 'start', 'ledge', 7, 2, 'Ledge'),
        seg('ledge-blind', 'ledge', 'goal', 5, 2, 'Ledge blind'),
        seg('orchard', 'start', 'orchard', 2, 4, 'Orchard'),
        seg('fence', 'orchard', 'fence', 2, 3, 'Fence'),
        seg('blind', 'fence', 'goal', 2, 3, 'Blind path'),
        seg('orchard-blind', 'orchard', 'goal', 4, 6, 'Orchard direct'),
        seg('ice', 'start', 'goal', 1, 1, 'Icy cut', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['orchard', 'fence', 'blind'] },
  }),
  mission({
    id: 'trail-pathfinder-3',
    band: 'pathfinder',
    skillTags: ['budget-tradeoff', 'distance-versus-cost'],
    instructions:
      'Reach the post using at most 5 supplies. A shorter walk can cost more supplies. Do not use the closed trail.',
    hintSteps: [
      { text: 'Short ridge sections can be expensive. Read the supply number, not only the distance.', highlightIds: ['ridge-a', 'ridge-b'] },
      {
        text: 'Creek 1, alder 1, and post 2 use 4 supplies. The ridge route costs 9.',
        highlightIds: ['creek', 'alder', 'post'],
      },
    ],
    parameters: {
      start: 'start',
      goal: 'goal',
      startLabel: 'Trailhead',
      goalLabel: 'Post',
      budget: 5,
      showDistance: true,
      segments: [
        seg('ridge-a', 'start', 'ridge', 4, 1, 'Ridge start'),
        seg('ridge-b', 'ridge', 'goal', 5, 1, 'Ridge post'),
        seg('creek', 'start', 'creek', 1, 3, 'Creek'),
        seg('alder', 'creek', 'alder', 1, 3, 'Alder'),
        seg('post', 'alder', 'goal', 2, 3, 'Post path'),
        seg('creek-post', 'creek', 'goal', 3, 5, 'Creek direct'),
        seg('thorn', 'start', 'goal', 1, 1, 'Thorn cut', true),
      ],
    },
    knownSolution: { kind: 'trail', segmentIds: ['creek', 'alder', 'post'] },
  }),
]
