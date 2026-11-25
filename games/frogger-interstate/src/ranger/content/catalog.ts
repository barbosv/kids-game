import { CAMPSITE_MISSIONS } from './campsite.ts'
import { LOOKOUT_MISSIONS } from './lookout.ts'
import { TRAIL_MISSIONS } from './trail.ts'
import type { Band, Family, Mission } from './types.ts'

export const MISSIONS: Mission[] = [...CAMPSITE_MISSIONS, ...TRAIL_MISSIONS, ...LOOKOUT_MISSIONS]

export function missionsFor(family: Family, band: Band): Mission[] {
  return MISSIONS.filter((mission) => mission.family === family && mission.band === band)
}

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((mission) => mission.id === id)
}
