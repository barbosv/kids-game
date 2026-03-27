export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

// Classic Frogger-style vertical progression:
// - Bottom lane is the frog's starting "safe" zone
// - Top lane is the "home" reunite zone
// - Middle lane is a safe median
// - Everything else is road traffic
export const LANE_COUNT = 9
export const HOME_LANE_INDEX = 0
export const MEDIAN_LANE_INDEX = Math.floor(LANE_COUNT / 2)
export const START_LANE_INDEX = LANE_COUNT - 1

export const LANE_HEIGHT = GAME_HEIGHT / LANE_COUNT

export const FROG_X = GAME_WIDTH / 2
export const FROG_WIDTH = 34
export const FROG_HEIGHT = 34
export const HORIZONTAL_STEP_PX = 56
export const FROG_JUMP_DURATION_MS = 230
export const FROG_JUMP_ARC_PX = 28
export const MAX_LIVES = 3
export const MAX_TOTAL_LIVES = 5

export const VEHICLE_SPAWN_BUFFER_PX = 80

export type VehicleKind = 'car' | 'bus' | 'truck'

export const VEHICLE_SPECS: Record<
  VehicleKind,
  { width: number; height: number; baseSpeedPxPerSec: number; spawnWeight: number }
> = {
  car: { width: 34, height: 28, baseSpeedPxPerSec: 72, spawnWeight: 0.72 },
  bus: { width: 64, height: 28, baseSpeedPxPerSec: 52, spawnWeight: 0.16 },
  truck: { width: 82, height: 30, baseSpeedPxPerSec: 44, spawnWeight: 0.12 },
}

export const DIFFICULTY_RAMP_EVERY_MS = 55000
export const MAX_DIFFICULTY_MULTIPLIER = 1.65

export const BASE_SPAWN_INTERVAL_MS = 1650
export const MIN_SPAWN_INTERVAL_MS = 720

export const FROG_SHEET_FRAME_WIDTH = 64
export const FROG_SHEET_FRAME_HEIGHT = 64

export const SCORE_TEXT_COLOR = '#e7e7ff'

export const INVISIBILITY_DURATION_MS = 6000
export const HEART_POWERUP_CHANCE = 0.4
export const POWER_SPAWN_MIN_MS = 3600
export const POWER_SPAWN_MAX_MS = 7200

export const BONUS_UNLOCK_TIME_MS = 20000

