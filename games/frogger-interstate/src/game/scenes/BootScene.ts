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
    this.ensureChickenTexture()
    this.ensureFrogTexture()
    this.ensureDogTexture()
    this.ensureCatTexture()
    this.ensureStreetVehicleTextures()
    this.ensureSpaceshipTextures()
    this.ensureTrainTextures()
    this.ensureBombTexture()
    this.ensurePowerTexture()
    this.ensureHeartTexture()
    this.ensureCollectibleTextures()
    this.ensureBonusChestTexture()
    this.ensureTrexTexture()
    this.ensureGoalTexture()
    this.ensureMomTexture()

    this.scene.start('ModeSelectScene')
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

  private ensureChickenTexture() {
    if (this.textures.exists('chicken-idle') && this.textures.exists('chicken-jump')) return
    const g = this.add.graphics()
    // Stylized chicken inspired by public-domain sprite references.
    g.fillStyle(0xfff6d6, 1)
    g.fillEllipse(32, 38, 38, 30)
    g.fillCircle(24, 22, 11)
    g.fillStyle(0xff9f43, 1)
    g.fillTriangle(34, 22, 45, 26, 34, 30)
    g.fillStyle(0xee5a5a, 1)
    g.fillCircle(22, 11, 3)
    g.fillCircle(26, 12, 3)
    g.fillCircle(24, 9, 3)
    g.fillStyle(0x1f2937, 1)
    g.fillCircle(27, 21, 1.8)
    g.fillStyle(0xf4c542, 1)
    g.fillRect(27, 49, 3, 10)
    g.fillRect(34, 49, 3, 10)
    g.lineStyle(2, 0x1f2937, 0.45)
    g.strokeEllipse(32, 38, 38, 30)
    g.generateTexture('chicken-idle', 64, 64)

    // Slightly lifted variant for jump.
    g.clear()
    g.fillStyle(0xfff6d6, 1)
    g.fillEllipse(32, 34, 38, 30)
    g.fillCircle(24, 18, 11)
    g.fillStyle(0xff9f43, 1)
    g.fillTriangle(34, 18, 45, 22, 34, 26)
    g.fillStyle(0xee5a5a, 1)
    g.fillCircle(22, 7, 3)
    g.fillCircle(26, 8, 3)
    g.fillCircle(24, 5, 3)
    g.fillStyle(0x1f2937, 1)
    g.fillCircle(27, 17, 1.8)
    g.fillStyle(0xf4c542, 1)
    g.fillRect(27, 47, 3, 9)
    g.fillRect(34, 47, 3, 9)
    g.lineStyle(2, 0x1f2937, 0.45)
    g.strokeEllipse(32, 34, 38, 30)
    g.generateTexture('chicken-jump', 64, 64)
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

  private ensureStreetVehicleTextures() {
    if (this.textures.exists('street-car') && this.textures.exists('street-bus') && this.textures.exists('street-truck')) return
    const makeCar = (key: string, w: number, h: number, body: number, roof: number, accent: number) => {
      const g = this.add.graphics()
      g.fillStyle(body, 1)
      g.fillRoundedRect(2, h * 0.38, w - 4, h * 0.45, 7)
      g.fillStyle(roof, 1)
      g.fillRoundedRect(w * 0.22, h * 0.2, w * 0.5, h * 0.26, 6)
      g.fillStyle(0xdbeafe, 0.95)
      g.fillRoundedRect(w * 0.27, h * 0.24, w * 0.18, h * 0.16, 2)
      g.fillRoundedRect(w * 0.51, h * 0.24, w * 0.18, h * 0.16, 2)
      g.fillStyle(accent, 0.95)
      g.fillRect(6, h * 0.56, w - 12, 3)
      g.fillStyle(0x111827, 1)
      g.fillCircle(w * 0.26, h * 0.86, h * 0.11)
      g.fillCircle(w * 0.74, h * 0.86, h * 0.11)
      g.fillStyle(0xe5e7eb, 0.8)
      g.fillCircle(w * 0.26, h * 0.86, h * 0.05)
      g.fillCircle(w * 0.74, h * 0.86, h * 0.05)
      g.lineStyle(2, 0x0f172a, 0.6)
      g.strokeRoundedRect(2, h * 0.38, w - 4, h * 0.45, 7)
      g.generateTexture(key, w, h)
      g.destroy()
    }
    makeCar('street-car', 44, 28, 0xef4444, 0xdc2626, 0xfca5a5)
    makeCar('street-bus', 70, 30, 0x2563eb, 0x1d4ed8, 0x93c5fd)
    makeCar('street-truck', 92, 34, 0xf59e0b, 0xd97706, 0xfcd34d)
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

  private ensureTrainTextures() {
    if (this.textures.exists('train-small') && this.textures.exists('train-medium') && this.textures.exists('train-large')) return
    const makeTrain = (
      key: string,
      w: number,
      h: number,
      body: number,
      stripe: number,
    ) => {
      const g = this.add.graphics()
      g.fillStyle(body, 1)
      g.fillRoundedRect(2, h * 0.2, w - 4, h * 0.62, 6)
      g.fillStyle(stripe, 0.95)
      g.fillRect(6, h * 0.42, w - 12, 4)
      g.fillStyle(0xdbeafe, 0.95)
      g.fillRoundedRect(8, h * 0.26, w * 0.18, h * 0.18, 2)
      g.fillRoundedRect(w * 0.31, h * 0.26, w * 0.18, h * 0.18, 2)
      g.fillRoundedRect(w * 0.54, h * 0.26, w * 0.18, h * 0.18, 2)
      g.fillStyle(0x111827, 1)
      g.fillCircle(w * 0.24, h * 0.86, h * 0.1)
      g.fillCircle(w * 0.5, h * 0.86, h * 0.1)
      g.fillCircle(w * 0.76, h * 0.86, h * 0.1)
      g.lineStyle(2, 0x0f172a, 0.7)
      g.strokeRoundedRect(2, h * 0.2, w - 4, h * 0.62, 6)
      g.generateTexture(key, w, h)
      g.destroy()
    }
    makeTrain('train-small', 44, 28, 0x64748b, 0x38bdf8)
    makeTrain('train-medium', 70, 30, 0x475569, 0xf43f5e)
    makeTrain('train-large', 92, 34, 0x334155, 0xf59e0b)
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
    if (!this.textures.exists('item-worm')) {
      const g = this.add.graphics()
      g.fillStyle(0xec4899, 1)
      g.fillEllipse(7, 16, 10, 8)
      g.fillEllipse(13, 14, 10, 8)
      g.fillEllipse(19, 17, 10, 8)
      g.fillEllipse(25, 15, 10, 8)
      g.fillStyle(0xf9a8d4, 0.95)
      g.fillCircle(6, 15, 2)
      g.fillCircle(24, 14, 2)
      g.lineStyle(1.5, 0xbe185d, 0.85)
      g.beginPath()
      g.moveTo(2, 17)
      g.lineTo(29, 16)
      g.strokePath()
      g.generateTexture('item-worm', 32, 32)
      g.destroy()
    }
  }

  private ensureBonusChestTexture() {
    if (this.textures.exists('bonus-chest')) return
    const g = this.add.graphics()
    g.fillStyle(0x8b5a2b, 1)
    g.fillRoundedRect(2, 10, 28, 20, 4)
    g.fillStyle(0xb45309, 1)
    g.fillRoundedRect(2, 6, 28, 8, 4)
    g.fillStyle(0xfbbf24, 0.95)
    g.fillRect(14, 6, 4, 24)
    g.fillRect(2, 16, 28, 3)
    g.fillStyle(0x111827, 1)
    g.fillCircle(16, 18, 2)
    g.lineStyle(2, 0x5b3b1a, 0.8)
    g.strokeRoundedRect(2, 10, 28, 20, 4)
    g.generateTexture('bonus-chest', 32, 32)
    g.destroy()
  }

  private ensureTrexTexture() {
    if (this.textures.exists('enemy-trex')) return
    const g = this.add.graphics()
    // Cartoon T-Rex for bonus chase mode.
    g.fillStyle(0x4b7f3f, 1)
    g.fillRoundedRect(8, 22, 72, 34, 12)
    g.fillRoundedRect(48, 8, 34, 24, 10)
    g.fillRoundedRect(18, 50, 11, 20, 4)
    g.fillRoundedRect(42, 50, 11, 20, 4)
    g.fillRoundedRect(50, 32, 9, 10, 3)
    g.fillRoundedRect(58, 34, 9, 9, 3)
    g.fillTriangle(8, 37, 0, 32, 8, 27)
    g.fillTriangle(8, 46, 0, 52, 8, 56)
    g.fillStyle(0x2b4a22, 1)
    g.fillRect(52, 21, 16, 4)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(72, 16, 4)
    g.fillStyle(0x111827, 1)
    g.fillCircle(73, 16, 2)
    g.lineStyle(2, 0x1f3320, 0.8)
    g.strokeRoundedRect(8, 22, 72, 34, 12)
    g.strokeRoundedRect(48, 8, 34, 24, 10)
    g.generateTexture('enemy-trex', 96, 80)
    g.destroy()
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

