import type { ProjectId } from '../content/types.ts'
import { BUNDLES, type AvatarId } from '../content/world.ts'
import type { Profile } from '../model/profile.ts'
import { openProject } from '../rules/session.ts'
import type { ParkNodeId } from './layout.ts'

export const HAT_COLORS: Record<AvatarId, number> = {
  pine: 0x2f6b45,
  river: 0x2a6f97,
  sunset: 0xd46a3a,
  stone: 0x6b6258,
}

export type ParkVisitor = {
  id: string
  nodeId: ParkNodeId
  shirt: number
}

export type ParkSnapshot = {
  avatarId: AvatarId
  built: Record<ProjectId, boolean>
  bundles: { id: string; nodeId: ParkNodeId; available: boolean }[]
  visitors: ParkVisitor[]
  decorations: string[]
  showWildlife: boolean
  focusNodeId: ParkNodeId | null
}

const SHIRTS = [0xe07a5f, 0x3d5a80, 0x81b29a, 0xf2cc8f, 0x6d597a]

export function focusNode(profile: Profile): ParkNodeId | null {
  if (profile.intro === 'welcome') return 'gate'
  if (profile.intro === 'collect') return 'meadow'
  const open = openProject(profile)
  if (open === 'campsite') return 'campsite'
  if (open === 'trail') return 'crossing'
  if (open === 'lookout') return 'lookout'
  return 'lookout'
}

export function parkSnapshot(profile: Profile): ParkSnapshot {
  const built = {
    campsite: profile.projects.campsite === 'built',
    trail: profile.projects.trail === 'built',
    lookout: profile.projects.lookout === 'built',
  }
  const visitors: ParkVisitor[] = []
  const add = (id: string, nodeId: ParkNodeId, index: number) => {
    visitors.push({ id, nodeId, shirt: SHIRTS[index] ?? SHIRTS[0]! })
  }
  const welcomed = profile.intro !== 'welcome'
  add('visitor-1', built.campsite ? 'campsite' : welcomed ? 'center' : 'gate', 0)
  add('visitor-2', built.campsite ? 'campsite' : welcomed ? 'center' : 'gate', 1)
  if (built.trail) add('visitor-3', 'lookout', 2)
  else add('visitor-3', welcomed ? 'center' : 'gate', 2)
  if (built.campsite) add('visitor-4', 'campsite', 3)
  if (built.trail) add('visitor-5', built.lookout ? 'lookout' : 'crossing', 4)
  return {
    avatarId: profile.avatarId,
    built,
    bundles: BUNDLES.map((bundle) => ({
      id: bundle.id,
      nodeId: bundle.nodeId as ParkNodeId,
      available: !profile.collectedBundleIds.includes(bundle.id),
    })),
    visitors,
    decorations: [...profile.decorations],
    showWildlife: built.lookout,
    focusNodeId: focusNode(profile),
  }
}
