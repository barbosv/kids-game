import { BUNDLES, WELCOME_CAP, WELCOME_COIN } from '../content/world.ts'
import type { Profile } from '../model/profile.ts'

export function collectBundle(profile: Profile, bundleId: string): { profile: Profile; gained: number } {
  const bundle = BUNDLES.find((item) => item.id === bundleId)
  if (!bundle) return { profile, gained: 0 }
  if (profile.collectedBundleIds.includes(bundle.id)) return { profile, gained: 0 }
  return {
    gained: bundle.amount,
    profile: {
      ...profile,
      supplies: profile.supplies + bundle.amount,
      collectedBundleIds: [...profile.collectedBundleIds, bundle.id],
    },
  }
}

export function welcomeVisitors(
  profile: Profile,
  visitorIds: readonly string[],
): { profile: Profile; gained: number } {
  const welcomed = [...profile.welcomedVisitorIds]
  let rewards = profile.welcomeRewards
  let gained = 0
  for (const id of visitorIds) {
    if (welcomed.includes(id)) continue
    if (rewards >= WELCOME_CAP) break
    welcomed.push(id)
    rewards += WELCOME_COIN
    gained += WELCOME_COIN
  }
  if (gained === 0) return { profile, gained: 0 }
  return {
    gained,
    profile: {
      ...profile,
      coins: profile.coins + gained,
      welcomedVisitorIds: welcomed,
      welcomeRewards: rewards,
    },
  }
}

export function spendSupplies(profile: Profile, cost: number): { profile: Profile; ok: boolean } {
  if (!Number.isInteger(cost) || cost < 0) return { profile, ok: false }
  if (profile.supplies < cost) return { profile, ok: false }
  return { ok: true, profile: { ...profile, supplies: profile.supplies - cost } }
}

export function spendCoins(profile: Profile, cost: number): { profile: Profile; ok: boolean } {
  if (!Number.isInteger(cost) || cost < 0) return { profile, ok: false }
  if (profile.coins < cost) return { profile, ok: false }
  return { ok: true, profile: { ...profile, coins: profile.coins - cost } }
}
