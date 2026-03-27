import Phaser from 'phaser'
import { FROG_HEIGHT, FROG_SHEET_FRAME_HEIGHT, FROG_SHEET_FRAME_WIDTH, FROG_WIDTH } from '../constants'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    // Frog sheets are 256x128 => 4x2 of 64x64 frames.
    this.load.spritesheet('frog-jump', '/assets/opengameart/frog/PlayerSprite0_3.png', {
      frameWidth: FROG_SHEET_FRAME_WIDTH,
      frameHeight: FROG_SHEET_FRAME_HEIGHT,
    })
    this.load.spritesheet('frog-idle', '/assets/opengameart/frog/PlayerSprite1.png', {
      frameWidth: FROG_SHEET_FRAME_WIDTH,
      frameHeight: FROG_SHEET_FRAME_HEIGHT,
    })

    // Kenney Racing Pack (CC0): use a single asphalt tile + representative vehicles.
    this.load.image('road-tile', '/assets/kenney-racing-pack/PNG/Tiles/Asphalt%20road/road_asphalt01.png')
    this.load.image('vehicle-car', '/assets/kenney-racing-pack/PNG/Cars/car_red_1.png')
    this.load.image('vehicle-bus', '/assets/kenney-racing-pack/PNG/Cars/car_yellow_small_1.png')
    this.load.image('vehicle-truck', '/assets/kenney-racing-pack/PNG/Cars/car_green_5.png')
  }

  create() {
    // Placeholder textures so gameplay renders even before we wire CC0 assets.
    this.ensureFrogTexture()
    this.ensureDogTexture()
    this.ensureCatTexture()
    this.ensureSpaceshipTextures()
    this.ensureBombTexture()
    this.ensurePowerTexture()
    this.ensureHeartTexture()
    this.ensureCollectibleTextures()
    this.ensureGoalTexture()
    this.ensureMomTexture()

    this.scene.start('GameScene')
  }

  private ensureFrogTexture() {
    if (this.textures.exists('frog-jump') && this.textures.exists('frog-idle')) return
    const g = this.add.graphics()
    g.fillStyle(0x32d36a, 1)
    g.fillRoundedRect(0, 0, FROG_WIDTH, FROG_HEIGHT, 10)
    g.lineStyle(2, 0x0b1020, 0.8)
    g.strokeRoundedRect(0, 0, FROG_WIDTH, FROG_HEIGHT, 10)
    g.fillStyle(0x0b1020, 1)
    g.fillCircle(12, 14, 3)
    g.fillCircle(22, 14, 3)
    g.generateTexture('frog-idle', FROG_WIDTH, FROG_HEIGHT)
    g.generateTexture('frog-jump', FROG_WIDTH, FROG_HEIGHT)
    g.destroy()
  }

  private ensureDogTexture() {
    if (this.textures.exists('dog-jump') && this.textures.exists('dog-idle')) return
    const g = this.add.graphics()
    g.fillStyle(0x6b3b1f, 1)
    g.fillEllipse(15, 28, 14, 28)
    g.fillEllipse(49, 28, 14, 28)
    g.fillStyle(0xd39a6a, 1)
    g.fillRoundedRect(10, 10, 44, 44, 14)
    g.fillStyle(0xf2d4b2, 1)
    g.fillEllipse(32, 36, 26, 18)
    g.fillStyle(0x1b0f08, 1)
    g.fillCircle(24, 28, 2.5)
    g.fillCircle(40, 28, 2.5)
    g.fillCircle(32, 34, 3.5)
    g.lineStyle(2, 0x1b0f08, 1)
    g.lineBetween(32, 36, 32, 42)
    g.fillStyle(0xff6ea8, 1)
    g.fillEllipse(32, 46, 8, 10)
    g.lineStyle(2, 0x0b1020, 0.5)
    g.strokeRoundedRect(10, 10, 44, 44, 14)
    g.generateTexture('dog-idle', 64, 64)
    g.generateTexture('dog-jump', 64, 64)
    g.destroy()
  }

  private ensureCatTexture() {
    if (this.textures.exists('cat-idle') && this.textures.exists('cat-jump')) return
    const g = this.add.graphics()
    g.fillStyle(0xffa34d, 1)
    g.fillTriangle(14, 16, 24, 4, 28, 18)
    g.fillTriangle(50, 16, 40, 4, 36, 18)
    g.fillRoundedRect(10, 12, 44, 42, 14)
    g.fillStyle(0xffd8b5, 1)
    g.fillEllipse(32, 36, 22, 16)
    g.fillStyle(0x25120a, 1)
    g.fillEllipse(24, 28, 4, 6)
    g.fillEllipse(40, 28, 4, 6)
    g.fillStyle(0xff6b88, 1)
    g.fillTriangle(32, 34, 28, 40, 36, 40)
    g.lineStyle(1.8, 0x25120a, 1)
    g.lineBetween(28, 39, 18, 36)
    g.lineBetween(28, 40, 17, 41)
    g.lineBetween(36, 39, 46, 36)
    g.lineBetween(36, 40, 47, 41)
    g.lineStyle(2, 0x0b1020, 0.5)
    g.strokeRoundedRect(10, 12, 44, 42, 14)
    g.generateTexture('cat-idle', 64, 64)
    g.generateTexture('cat-jump', 64, 64)
    g.destroy()
  }

  private ensureSpaceshipTextures() {
    if (this.textures.exists('ship-small') && this.textures.exists('ship-medium') && this.textures.exists('ship-large')) return
    const makeShip = (key: string, w: number, h: number, body: number) => {
      const g = this.add.graphics()
      g.fillStyle(body, 1)
      g.fillRoundedRect(6, h * 0.35, w - 12, h * 0.35, 8)
      g.fillStyle(0xd5efff, 0.95)
      g.fillEllipse(w * 0.5, h * 0.4, w * 0.32, h * 0.25)
      g.fillStyle(0x9e5bff, 0.9)
      g.fillTriangle(w * 0.18, h * 0.62, w * 0.1, h * 0.88, w * 0.28, h * 0.62)
      g.fillTriangle(w * 0.82, h * 0.62, w * 0.9, h * 0.88, w * 0.72, h * 0.62)
      g.lineStyle(2, 0x101827, 0.65)
      g.strokeRoundedRect(6, h * 0.35, w - 12, h * 0.35, 8)
      g.generateTexture(key, w, h)
      g.destroy()
    }
    makeShip('ship-small', 44, 28, 0x6ef0ff)
    makeShip('ship-medium', 70, 30, 0xffd166)
    makeShip('ship-large', 92, 34, 0xff6ea8)
  }

  private ensureBombTexture() {
    if (this.textures.exists('hazard-bomb')) return
    const g = this.add.graphics()
    g.fillStyle(0x1f2937, 1)
    g.fillCircle(16, 18, 11)
    g.fillStyle(0x111827, 1)
    g.fillCircle(13, 15, 3)
    g.fillStyle(0x4b5563, 1)
    g.fillRect(14, 5, 4, 6)
    g.lineStyle(2, 0xf59e0b, 1)
    g.beginPath()
    g.moveTo(16, 5)
    g.lineTo(22, 1)
    g.strokePath()
    g.fillStyle(0xfbbf24, 1)
    g.fillCircle(23, 1, 2)
    g.generateTexture('hazard-bomb', 32, 32)
    g.destroy()
  }

  private ensurePowerTexture() {
    if (this.textures.exists('power-invincible')) return
    const g = this.add.graphics()
    g.fillStyle(0xffd84a, 1)
    g.beginPath()
    g.moveTo(16, 2)
    g.lineTo(20, 12)
    g.lineTo(30, 12)
    g.lineTo(22, 18)
    g.lineTo(25, 29)
    g.lineTo(16, 22)
    g.lineTo(7, 29)
    g.lineTo(10, 18)
    g.lineTo(2, 12)
    g.lineTo(12, 12)
    g.closePath()
    g.fillPath()
    g.lineStyle(2, 0xfff7c5, 0.95)
    g.strokePath()
    g.generateTexture('power-invincible', 32, 32)
    g.destroy()
  }

  private ensureHeartTexture() {
    if (this.textures.exists('power-heart')) return
    const g = this.add.graphics()
    g.fillStyle(0xff5a7a, 1)
    g.fillCircle(12, 11, 8)
    g.fillCircle(20, 11, 8)
    g.fillTriangle(4, 14, 28, 14, 16, 29)
    g.lineStyle(2, 0xffd6de, 0.9)
    g.strokeCircle(12, 11, 8)
    g.strokeCircle(20, 11, 8)
    g.generateTexture('power-heart', 32, 32)
    g.destroy()
  }

  private ensureCollectibleTextures() {
    if (!this.textures.exists('item-fly')) {
      const g = this.add.graphics()
      g.fillStyle(0x111827, 1)
      g.fillEllipse(16, 18, 8, 10)
      g.fillStyle(0xbfe8ff, 0.85)
      g.fillEllipse(11, 14, 8, 5)
      g.fillEllipse(21, 14, 8, 5)
      g.generateTexture('item-fly', 32, 32)
      g.destroy()
    }
    if (!this.textures.exists('item-treat')) {
      const g = this.add.graphics()
      g.fillStyle(0xf1f5f9, 1)
      g.fillCircle(8, 12, 4)
      g.fillCircle(8, 20, 4)
      g.fillCircle(24, 12, 4)
      g.fillCircle(24, 20, 4)
      g.fillRoundedRect(8, 12, 16, 8, 3)
      g.generateTexture('item-treat', 32, 32)
      g.destroy()
    }
    if (!this.textures.exists('item-mouse')) {
      const g = this.add.graphics()
      g.fillStyle(0x9ca3af, 1)
      g.fillEllipse(16, 18, 18, 12)
      g.fillCircle(10, 13, 3)
      g.fillCircle(16, 13, 3)
      g.fillStyle(0x111827, 1)
      g.fillCircle(20, 18, 1.8)
      g.lineStyle(2, 0xf472b6, 0.9)
      g.beginPath()
      g.moveTo(7, 20)
      g.lineTo(4, 24)
      g.lineTo(2, 30)
      g.strokePath()
      g.generateTexture('item-mouse', 32, 32)
      g.destroy()
    }
  }

  private ensureGoalTexture() {
    if (this.textures.exists('goal')) return

    const g = this.add.graphics()
    g.fillStyle(0x7c3aed, 0.25)
    g.fillCircle(20, 20, 20)
    g.fillStyle(0x7c3aed, 1)
    g.fillCircle(20, 20, 10)
    g.lineStyle(3, 0xefeaff, 0.9)
    g.strokeCircle(20, 20, 18)
    g.generateTexture('goal', 40, 40)
    g.destroy()
  }

  private ensureMomTexture() {
    if (this.textures.exists('mom-frog')) return
    const g = this.add.graphics()
    g.fillStyle(0x2fbf68, 1)
    g.fillRoundedRect(14, 22, 100, 78, 24)
    g.fillCircle(40, 35, 20)
    g.fillCircle(88, 35, 20)
    g.fillStyle(0x0b1020, 1)
    g.fillCircle(40, 35, 5)
    g.fillCircle(88, 35, 5)
    g.fillStyle(0xff6bb0, 1)
    g.fillTriangle(52, 12, 42, 28, 58, 28)
    g.fillTriangle(76, 12, 70, 28, 86, 28)
    g.fillCircle(64, 24, 6)
    g.lineStyle(3, 0x0b1020, 0.6)
    g.strokeRoundedRect(14, 22, 100, 78, 24)
    g.generateTexture('mom-frog', 128, 128)
    g.destroy()
  }
}

