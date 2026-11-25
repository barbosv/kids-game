export const STORAGE_KEY = 'ranger-park-save-v1'
export const SAVE_VERSION = 1

export const WELCOME_CAP = 6
export const WELCOME_COIN = 1
export const REPLAY_COINS = 2
export const PROJECT_SUPPLY_COST = 3

export const PROFILE_IDS = ['ranger-1', 'ranger-2', 'ranger-3'] as const
export type ProfileId = (typeof PROFILE_IDS)[number]

export const AVATAR_IDS = ['pine', 'river', 'sunset', 'stone'] as const
export type AvatarId = (typeof AVATAR_IDS)[number]

export const BUNDLES = [
  { id: 'bundle-meadow', nodeId: 'meadow', amount: 3, label: 'Meadow bundle' },
  { id: 'bundle-ridge', nodeId: 'ridge', amount: 3, label: 'Ridge bundle' },
  { id: 'bundle-creek', nodeId: 'creek', amount: 3, label: 'Creek bundle' },
] as const

export type BundleId = (typeof BUNDLES)[number]['id']

export const VISITORS = [
  { id: 'visitor-1', name: 'Ava', appears: 'start' },
  { id: 'visitor-2', name: 'Noah', appears: 'start' },
  { id: 'visitor-3', name: 'Lila', appears: 'start' },
  { id: 'visitor-4', name: 'Sam', appears: 'campsite' },
  { id: 'visitor-5', name: 'Rae', appears: 'trail' },
] as const

export const DECORATIONS = [
  { id: 'flowers', name: 'Flower boxes', cost: 2 },
  { id: 'banner', name: 'Park banner', cost: 2 },
  { id: 'birdhouse', name: 'Birdhouse', cost: 3 },
] as const

export type DecorationId = (typeof DECORATIONS)[number]['id']

export const BAND_LABEL: Record<string, string> = {
  explorer: 'Explorer',
  trailblazer: 'Trailblazer',
  pathfinder: 'Pathfinder',
}

export const PROJECT_LABEL: Record<string, string> = {
  campsite: 'Campsite',
  trail: 'Trail crossing',
  lookout: 'Wildlife lookout',
}

export function rankLabel(badgeCount: number): string {
  if (badgeCount >= 3) return 'Park Ranger'
  if (badgeCount === 2) return 'Trail Ranger'
  if (badgeCount === 1) return 'Campsite Ranger'
  return 'Seedling Ranger'
}

export function quarterLabel(quarters: number): string {
  const wholes = Math.floor(quarters / 4)
  const rem = quarters % 4
  const fraction = rem === 0 ? '' : rem === 1 ? '1/4' : rem === 2 ? '1/2' : '3/4'
  if (wholes === 0) return fraction || '0'
  if (!fraction) return String(wholes)
  return `${wholes} ${fraction}`
}
