import Phaser from 'phaser'
import { VEHICLE_SPECS, type VehicleKind } from '../constants'

export class Vehicle {
  readonly kind: VehicleKind
  readonly laneIndex: number
  readonly direction: 1 | -1
  readonly speedPxPerSec: number

  readonly width: number
  readonly height: number

  private readonly scene: Phaser.Scene
  readonly sprite: Phaser.GameObjects.Image

  private readonly textureKey: string

  constructor(params: {
    scene: Phaser.Scene
    kind: VehicleKind
    laneIndex: number
    direction: 1 | -1
    x: number
    y: number
    speedPxPerSec: number
    textureByKind?: Partial<Record<VehicleKind, string>>
  }) {
    this.scene = params.scene
    this.kind = params.kind
    this.laneIndex = params.laneIndex
    this.direction = params.direction
    this.speedPxPerSec = params.speedPxPerSec

    this.width = VEHICLE_SPECS[params.kind].width
    this.height = VEHICLE_SPECS[params.kind].height

    const defaultTextureByKind: Record<VehicleKind, string> = {
      car: 'vehicle-car',
      bus: 'vehicle-bus',
      truck: 'vehicle-truck',
    }
    this.textureKey = params.textureByKind?.[params.kind] ?? defaultTextureByKind[params.kind]

    // Represent each lane vehicle with a texture, scaled to the lane hitbox size.
    this.sprite = this.scene.add.image(params.x, params.y, this.textureKey).setOrigin(0.5, 0.5)
    this.sprite.setDisplaySize(this.width, this.height)
  }

  update(deltaSec: number) {
    this.sprite.x += this.direction * this.speedPxPerSec * deltaSec
  }

  isOffscreen(gameWidth: number): boolean {
    const margin = 20
    if (this.direction === 1) return this.sprite.x - this.width / 2 > gameWidth + margin
    return this.sprite.x + this.width / 2 < -margin
  }

  getRect() {
    const left = this.sprite.x - this.width / 2
    const top = this.sprite.y - this.height / 2
    return { left, right: left + this.width, top, bottom: top + this.height }
  }

  destroy() {
    this.sprite.destroy()
  }
}

