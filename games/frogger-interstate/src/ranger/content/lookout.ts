import type { CellKind, LookoutCell, LookoutMission, LookoutPlan } from './types.ts'

const badge = 'badge-lookout'
const completion = 'The lookout is open. From here the meadow is easy to see without walking into it.'
const fieldNote =
  'Field note: A lookout lets people watch wildlife from a distance. Animals stay safer when visitors remain on the trail and do not offer food.'

function cell(col: number, row: number, kind: CellKind, label: string): LookoutCell {
  return { id: `r${row}c${col}`, col, row, kind, label }
}

function plan(pairs: [string, string][]): LookoutPlan {
  return {
    kind: 'lookout',
    placements: pairs.map(([facilityId, cellId]) => ({ facilityId, cellId })),
  }
}

const explorerFacilities = [
  { id: 'bench', label: 'Bench', cost: 1 },
  { id: 'sign', label: 'Sign', cost: 1 },
]

const linkedFacilities = [
  { id: 'lookout', label: 'Lookout', cost: 2 },
  { id: 'bench', label: 'Bench', cost: 1 },
]

const budgetFacilities = [
  { id: 'lookout', label: 'Lookout', cost: 3 },
  { id: 'bench', label: 'Bench', cost: 2 },
  { id: 'blind', label: 'Viewing blind', cost: 4 },
]

export const LOOKOUT_MISSIONS: LookoutMission[] = [
  {
    id: 'lookout-explorer-1',
    family: 'lookout',
    band: 'explorer',
    skillTags: ['spatial-rules', 'habitat'],
    instructions:
      'Place the bench and the sign on cells marked Safe. Leave every Habitat and Water cell empty.',
    hintSteps: [
      { text: 'Protected cells say Habitat or Water. Buildings do not go there.', highlightIds: ['r1c0', 'r0c2'] },
      { text: 'Safe A and Safe B are both open. Put one building on each.', highlightIds: ['r0c0', 'r0c1'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 3,
      rows: 3,
      facilities: explorerFacilities,
      requiredIds: ['bench', 'sign'],
      requireTrailLink: false,
      cells: [
        cell(0, 0, 'safe', 'Safe A'),
        cell(1, 0, 'safe', 'Safe B'),
        cell(2, 0, 'water', 'Water'),
        cell(0, 1, 'habitat', 'Habitat — protected'),
        cell(1, 1, 'safe', 'Safe C'),
        cell(2, 1, 'safe', 'Safe D'),
        cell(0, 2, 'safe', 'Safe E'),
        cell(1, 2, 'habitat', 'Habitat — protected'),
        cell(2, 2, 'water', 'Water'),
      ],
    },
    knownSolution: plan([
      ['bench', 'r0c0'],
      ['sign', 'r0c1'],
    ]),
  },
  {
    id: 'lookout-explorer-2',
    family: 'lookout',
    band: 'explorer',
    skillTags: ['spatial-rules', 'habitat'],
    instructions:
      'Place the bench and the sign on cells marked Safe. Leave every Habitat and Water cell empty.',
    hintSteps: [
      { text: 'The river cells are Water. The nest cells are Habitat.', highlightIds: ['r0c0', 'r1c1'] },
      { text: 'Clearing and Knoll can each hold one building.', highlightIds: ['r0c1', 'r0c2'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 3,
      rows: 3,
      facilities: explorerFacilities,
      requiredIds: ['bench', 'sign'],
      requireTrailLink: false,
      cells: [
        cell(0, 0, 'water', 'Water'),
        cell(1, 0, 'safe', 'Clearing'),
        cell(2, 0, 'safe', 'Knoll'),
        cell(0, 1, 'safe', 'Picnic'),
        cell(1, 1, 'habitat', 'Habitat — protected'),
        cell(2, 1, 'water', 'Water'),
        cell(0, 2, 'habitat', 'Habitat — protected'),
        cell(1, 2, 'safe', 'Grove'),
        cell(2, 2, 'safe', 'Edge'),
      ],
    },
    knownSolution: plan([
      ['bench', 'r0c1'],
      ['sign', 'r0c2'],
    ]),
  },
  {
    id: 'lookout-explorer-3',
    family: 'lookout',
    band: 'explorer',
    skillTags: ['spatial-rules', 'habitat'],
    instructions:
      'Place the bench and the sign on cells marked Safe. Leave every Habitat and Water cell empty.',
    hintSteps: [
      { text: 'Read the word on the cell, not only its color.', highlightIds: ['r1c2', 'r2c0'] },
      { text: 'Post and Ledge are safe and different cells.', highlightIds: ['r0c0', 'r1c0'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 3,
      rows: 3,
      facilities: explorerFacilities,
      requiredIds: ['bench', 'sign'],
      requireTrailLink: false,
      cells: [
        cell(0, 0, 'safe', 'Post'),
        cell(1, 0, 'habitat', 'Habitat — protected'),
        cell(2, 0, 'safe', 'Shade'),
        cell(0, 1, 'safe', 'Ledge'),
        cell(1, 1, 'safe', 'Flat'),
        cell(2, 1, 'water', 'Water'),
        cell(0, 2, 'water', 'Water'),
        cell(1, 2, 'safe', 'Turn'),
        cell(2, 2, 'habitat', 'Habitat — protected'),
      ],
    },
    knownSolution: plan([
      ['bench', 'r0c0'],
      ['sign', 'r1c0'],
    ]),
  },
  {
    id: 'lookout-trailblazer-1',
    family: 'lookout',
    band: 'trailblazer',
    skillTags: ['trail-connection', 'habitat-buffer'],
    instructions:
      'Place the lookout and the bench on Safe or Trail cells. Stay off Habitat, Water, and Buffer cells. At least one building must sit on the trail or on a cell that shares a side with the trail.',
    hintSteps: [
      { text: 'Buffer cells are the wildlife gap. They stay empty, like habitat and water.', highlightIds: ['r0c1', 'r1c0'] },
      { text: 'Trail West touches the trail. Overlook shares a side with Trail Fork.', highlightIds: ['r2c0', 'r2c3'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 4,
      rows: 3,
      facilities: linkedFacilities,
      requiredIds: ['lookout', 'bench'],
      requireTrailLink: true,
      cells: [
        cell(0, 0, 'habitat', 'Habitat — protected'),
        cell(1, 0, 'buffer', 'Buffer'),
        cell(2, 0, 'safe', 'Far meadow'),
        cell(3, 0, 'safe', 'Far knoll'),
        cell(0, 1, 'buffer', 'Buffer'),
        cell(1, 1, 'buffer', 'Buffer'),
        cell(2, 1, 'buffer', 'Buffer'),
        cell(3, 1, 'safe', 'Mid field'),
        cell(0, 2, 'trail', 'Trail West'),
        cell(1, 2, 'trail', 'Trail Middle'),
        cell(2, 2, 'trail', 'Trail Fork'),
        cell(3, 2, 'safe', 'Overlook'),
      ],
    },
    knownSolution: plan([
      ['lookout', 'r2c0'],
      ['bench', 'r2c3'],
    ]),
  },
  {
    id: 'lookout-trailblazer-2',
    family: 'lookout',
    band: 'trailblazer',
    skillTags: ['trail-connection', 'habitat-buffer'],
    instructions:
      'Place the lookout and the bench on Safe or Trail cells. Stay off Habitat, Water, and Buffer cells. At least one building must sit on the trail or on a cell that shares a side with the trail.',
    hintSteps: [
      { text: 'The nest has a buffer beside it. Do not cover those marked cells.', highlightIds: ['r0c2', 'r1c2'] },
      { text: 'A building on Trail South is connected. Spur also shares a side with the trail.', highlightIds: ['r2c1', 'r2c0'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 4,
      rows: 3,
      facilities: linkedFacilities,
      requiredIds: ['lookout', 'bench'],
      requireTrailLink: true,
      cells: [
        cell(0, 0, 'safe', 'Quiet A'),
        cell(1, 0, 'safe', 'Quiet B'),
        cell(2, 0, 'habitat', 'Habitat — protected'),
        cell(3, 0, 'water', 'Water'),
        cell(0, 1, 'safe', 'Quiet C'),
        cell(1, 1, 'buffer', 'Buffer'),
        cell(2, 1, 'buffer', 'Buffer'),
        cell(3, 1, 'buffer', 'Buffer'),
        cell(0, 2, 'safe', 'Spur'),
        cell(1, 2, 'trail', 'Trail South'),
        cell(2, 2, 'trail', 'Trail East'),
        cell(3, 2, 'trail', 'Trail End'),
      ],
    },
    knownSolution: plan([
      ['lookout', 'r2c1'],
      ['bench', 'r2c0'],
    ]),
  },
  {
    id: 'lookout-trailblazer-3',
    family: 'lookout',
    band: 'trailblazer',
    skillTags: ['trail-connection', 'habitat-buffer'],
    instructions:
      'Place the lookout and the bench on Safe or Trail cells. Stay off Habitat, Water, and Buffer cells. At least one building must sit on the trail or on a cell that shares a side with the trail.',
    hintSteps: [
      { text: 'Habitat and its buffer are marked. Safe cells farther away are still the wrong choice if nothing touches the trail.', highlightIds: ['r0c0', 'r0c1'] },
      { text: 'Put the lookout on a Trail cell, then set the bench on a neighboring Safe cell such as Bend.', highlightIds: ['r1c1', 'r1c2'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 4,
      rows: 3,
      facilities: linkedFacilities,
      requiredIds: ['lookout', 'bench'],
      requireTrailLink: true,
      cells: [
        cell(0, 0, 'habitat', 'Habitat — protected'),
        cell(1, 0, 'buffer', 'Buffer'),
        cell(2, 0, 'safe', 'North A'),
        cell(3, 0, 'safe', 'North B'),
        cell(0, 1, 'buffer', 'Buffer'),
        cell(1, 1, 'trail', 'Trail Bend'),
        cell(2, 1, 'safe', 'Bend side'),
        cell(3, 1, 'water', 'Water'),
        cell(0, 2, 'safe', 'South A'),
        cell(1, 2, 'trail', 'Trail Low'),
        cell(2, 2, 'buffer', 'Buffer'),
        cell(3, 2, 'habitat', 'Habitat — protected'),
      ],
    },
    knownSolution: plan([
      ['lookout', 'r1c1'],
      ['bench', 'r1c2'],
    ]),
  },
  {
    id: 'lookout-pathfinder-1',
    family: 'lookout',
    band: 'pathfinder',
    skillTags: ['conservation', 'space-budget'],
    instructions:
      'Place the lookout and one visitor spot. The bench uses 2 space and the viewing blind uses 4. The lookout uses 3. Stay within 6 space. Stay off Habitat, Water, and Buffer cells, and keep a building on or beside the trail.',
    hintSteps: [
      { text: 'Add the space costs. 3 + 4 is more than 6. 3 + 2 fits.', highlightIds: ['bench', 'blind'] },
      { text: 'The far meadow does not touch the trail. Trail West and Overlook do.', highlightIds: ['r2c0', 'r2c3'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 4,
      rows: 3,
      facilities: budgetFacilities,
      requiredIds: ['lookout'],
      chooseOneOf: ['bench', 'blind'],
      requireTrailLink: true,
      maxBudget: 6,
      cells: [
        cell(0, 0, 'habitat', 'Habitat — protected'),
        cell(1, 0, 'buffer', 'Buffer'),
        cell(2, 0, 'safe', 'Far meadow'),
        cell(3, 0, 'safe', 'Far knoll'),
        cell(0, 1, 'buffer', 'Buffer'),
        cell(1, 1, 'buffer', 'Buffer'),
        cell(2, 1, 'buffer', 'Buffer'),
        cell(3, 1, 'safe', 'Mid field'),
        cell(0, 2, 'trail', 'Trail West'),
        cell(1, 2, 'trail', 'Trail Middle'),
        cell(2, 2, 'trail', 'Trail Fork'),
        cell(3, 2, 'safe', 'Overlook'),
      ],
    },
    knownSolution: plan([
      ['lookout', 'r2c0'],
      ['bench', 'r2c3'],
    ]),
  },
  {
    id: 'lookout-pathfinder-2',
    family: 'lookout',
    band: 'pathfinder',
    skillTags: ['conservation', 'space-budget'],
    instructions:
      'Place the lookout and one visitor spot. The bench uses 2 space and the viewing blind uses 4. The lookout uses 3. Stay within 5 space. Stay off Habitat, Water, and Buffer cells, and keep a building on or beside the trail.',
    hintSteps: [
      { text: 'A limit of 5 cannot hold the lookout plus the blind: 3 + 4 = 7.', highlightIds: ['blind'] },
      { text: 'Lookout on Trail South and bench on Spur uses 3 + 2 = 5 space and touches the trail.', highlightIds: ['r2c1', 'r2c0'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 4,
      rows: 3,
      facilities: budgetFacilities,
      requiredIds: ['lookout'],
      chooseOneOf: ['bench', 'blind'],
      requireTrailLink: true,
      maxBudget: 5,
      cells: [
        cell(0, 0, 'safe', 'Quiet A'),
        cell(1, 0, 'safe', 'Quiet B'),
        cell(2, 0, 'habitat', 'Habitat — protected'),
        cell(3, 0, 'water', 'Water'),
        cell(0, 1, 'safe', 'Quiet C'),
        cell(1, 1, 'buffer', 'Buffer'),
        cell(2, 1, 'buffer', 'Buffer'),
        cell(3, 1, 'buffer', 'Buffer'),
        cell(0, 2, 'safe', 'Spur'),
        cell(1, 2, 'trail', 'Trail South'),
        cell(2, 2, 'trail', 'Trail East'),
        cell(3, 2, 'trail', 'Trail End'),
      ],
    },
    knownSolution: plan([
      ['lookout', 'r2c1'],
      ['bench', 'r2c0'],
    ]),
  },
  {
    id: 'lookout-pathfinder-3',
    family: 'lookout',
    band: 'pathfinder',
    skillTags: ['conservation', 'space-budget'],
    instructions:
      'Place the lookout and one visitor spot. The bench uses 2 space and the viewing blind uses 4. The lookout uses 3. Stay within 6 space. Stay off Habitat, Water, and Buffer cells, and keep a building on or beside the trail.',
    hintSteps: [
      { text: 'Compare 3 + 2 with 3 + 4 before you place the visitor spot.', highlightIds: ['bench', 'blind'] },
      { text: 'Trail Bend shares the trail. Bend side shares a side with Trail Bend.', highlightIds: ['r1c1', 'r1c2'] },
    ],
    supplyCost: 3,
    badgeId: badge,
    completionText: completion,
    fieldNote,
    parameters: {
      columns: 4,
      rows: 3,
      facilities: budgetFacilities,
      requiredIds: ['lookout'],
      chooseOneOf: ['bench', 'blind'],
      requireTrailLink: true,
      maxBudget: 6,
      cells: [
        cell(0, 0, 'habitat', 'Habitat — protected'),
        cell(1, 0, 'buffer', 'Buffer'),
        cell(2, 0, 'safe', 'North A'),
        cell(3, 0, 'safe', 'North B'),
        cell(0, 1, 'buffer', 'Buffer'),
        cell(1, 1, 'trail', 'Trail Bend'),
        cell(2, 1, 'safe', 'Bend side'),
        cell(3, 1, 'water', 'Water'),
        cell(0, 2, 'safe', 'South A'),
        cell(1, 2, 'trail', 'Trail Low'),
        cell(2, 2, 'buffer', 'Buffer'),
        cell(3, 2, 'habitat', 'Habitat — protected'),
      ],
    },
    knownSolution: plan([
      ['lookout', 'r1c1'],
      ['bench', 'r1c2'],
    ]),
  },
]
