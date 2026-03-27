import type Phaser from 'phaser'
import { BASE_SPAWN_INTERVAL_MS, MAX_DIFFICULTY_MULTIPLIER, MIN_SPAWN_INTERVAL_MS, VEHICLE_SPECS, VEHICLE_SPAWN_BUFFER_PX, type VehicleKind } from '../constants'
import { Vehicle } from '../entities/Vehicle'
import { Lane } from '../domain/Lane'

export class SpawnerSystem {
  private readonly scene: Phaser.Scene
  private readonly lanes: Lane[]
  private readonly gameWidth: number
  private readonly textureByKind?: Partial<Record<VehicleKind, string>>

  private readonly vehicles: Vehicle[] = []
  private readonly spawnCountdownByLane = new Map<number, number>()

  constructor(params: {
    scene: Phaser.Scene
    lanes: Lane[]
    gameWidth: number
    textureByKind?: Partial<Record<VehicleKind, string>>
  }) {
    this.scene = params.scene
    this.lanes = params.lanes
    this.gameWidth = params.gameWidth
    this.textureByKind = params.textureByKind

    // Highway already has traffic when level starts.
    this.seedInitialTraffic(1)
    for (const lane of this.lanes) {
      if (!lane.isRoad) continue
      this.spawnCountdownByLane.set(lane.index, 900 + Math.random() * 1400)
    }
  }

  getVehicles(): readonly Vehicle[] {
    return this.vehicles
  }

  update(params: { deltaMs: number; difficultyMultiplier: number }) {
    const difficulty = params.difficultyMultiplier

    // Spawn (one lane at a time, to keep Frogger feel readable).
    for (const lane of this.lanes) {
      if (!lane.isRoad) continue
      const remaining = (this.spawnCountdownByLane.get(lane.index) ?? 0) - params.deltaMs
      if (remaining > 0) {
        this.spawnCountdownByLane.set(lane.index, remaining)
        continue
      }

      this.spawnCountdownByLane.set(lane.index, this.nextSpawnIntervalMs(difficulty))
      this.vehicles.push(this.spawnVehicleForLane(lane, difficulty))
    }

    // Move and prune vehicles.
    const deltaSec = params.deltaMs / 1000
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i]
      v.update(deltaSec)
      if (v.isOffscreen(this.gameWidth)) {
        v.destroy()
        this.vehicles.splice(i, 1)
      }
    }
  }

  private nextSpawnIntervalMs(difficultyMultiplier: number): number {
    // Ramp down spawn interval with difficulty (more traffic over time).
    const scaled = BASE_SPAWN_INTERVAL_MS / difficultyMultiplier
    return Math.max(MIN_SPAWN_INTERVAL_MS, scaled * (0.75 + Math.random() * 0.5))
  }

  private chooseKind(difficultyMultiplier: number): VehicleKind {
    const bias = Math.max(0, difficultyMultiplier - 1) / Math.max(0.001, MAX_DIFFICULTY_MULTIPLIER - 1)

    const cars = VEHICLE_SPECS.car.spawnWeight * (1 - 0.2 * bias)
    const buses = VEHICLE_SPECS.bus.spawnWeight * (1 + 0.25 * bias)
    const trucks = VEHICLE_SPECS.truck.spawnWeight * (1 + 0.4 * bias)

    const total = cars + buses + trucks
    let r = Math.random() * total
    if (r < cars) return 'car'
    r -= cars
    if (r < buses) return 'bus'
    return 'truck'
  }

  private seedInitialTraffic(difficultyMultiplier: number) {
    for (const lane of this.lanes) {
      if (!lane.isRoad) continue
      const count = 3 + (Math.random() < 0.45 ? 1 : 0)
      for (let i = 0; i < count; i++) {
        const kind = this.chooseKind(difficultyMultiplier)
        const spec = VEHICLE_SPECS[kind]
        const slot = (i + 0.5) / count
        let x = slot * this.gameWidth + (Math.random() - 0.5) * 72
        const half = spec.width / 2 + 6
        x = Math.max(half, Math.min(this.gameWidth - half, x))
        this.vehicles.push(this.spawnVehicleAt(lane, kind, x, difficultyMultiplier))
      }
    }
  }

  private spawnVehicleForLane(lane: Lane, difficultyMultiplier: number): Vehicle {
    const kind = this.chooseKind(difficultyMultiplier)
    const spec = VEHICLE_SPECS[kind]
    const x =
      lane.direction === 1
        ? -spec.width / 2 - VEHICLE_SPAWN_BUFFER_PX
        : this.gameWidth + spec.width / 2 + VEHICLE_SPAWN_BUFFER_PX
    return this.spawnVehicleAt(lane, kind, x, difficultyMultiplier)
  }

  private spawnVehicleAt(lane: Lane, kind: VehicleKind, x: number, difficultyMultiplier: number): Vehicle {
    const spec = VEHICLE_SPECS[kind]
    const speed = spec.baseSpeedPxPerSec * difficultyMultiplier
    const y = lane.y
    return new Vehicle({
      scene: this.scene,
      kind,
      laneIndex: lane.index,
      direction: lane.direction,
      x,
      y,
      speedPxPerSec: speed,
      textureByKind: this.textureByKind,
    })
  }
}

