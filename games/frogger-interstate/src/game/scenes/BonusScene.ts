import Phaser from 'phaser'
import {
  FROG_HEIGHT,
  FROG_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  HORIZONTAL_STEP_PX,
  LANE_COUNT,
  START_LANE_INDEX,
} from '../constants'
import { Frog } from '../domain/Frog'
import type { BonusAnimal } from './BonusSelectScene'

type ItemConfig = {
  label: string
  texture: string
  idleTexture: string
  jumpTexture: string
}

type MovingItem = { sprite: Phaser.GameObjects.Image; vx: number }

export class BonusScene extends Phaser.Scene {
  constructor() {
    super('BonusScene')
  }

  private animal: Frog | null = null
  private animalSprite: Phaser.GameObjects.Image | null = null
  private items: MovingItem[] = []
  private startMs = 0
  private done = false
  private hud: Phaser.GameObjects.Text | null = null
  private score = 0
  private readonly bonusDurationMs = 30000
  private timerStarted = false
  private runTimeMs = 0
  private trex: Phaser.GameObjects.Image | null = null
  private lastTrexHitAtMs = -99999
  private itemConfig: ItemConfig = {
    label: 'flies',
    texture: 'item-fly',
    idleTexture: 'frog-idle',
    jumpTexture: 'frog-jump',
  }
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null
  private keys: {
    w: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
    space: Phaser.Input.Keyboard.Key
  } | null = null

  create(data?: { animal?: BonusAnimal; runTimeMs?: number }) {
    const animal = data?.animal ?? 'frog'
    this.runTimeMs = data?.runTimeMs ?? 0
    this.itemConfig = this.getItemConfig(animal)

    this.cameras.main.setBackgroundColor('#0f1a38')
    this.done = false
    this.startMs = this.time.now
    this.score = 0
    this.timerStarted = false
    this.drawArena()

    this.animal = new Frog(GAME_WIDTH / 2, START_LANE_INDEX)
    this.animalSprite = this.add
      .image(GAME_WIDTH / 2, this.laneToY(START_LANE_INDEX), this.itemConfig.idleTexture, 0)
      .setDisplaySize(FROG_WIDTH, FROG_HEIGHT)
      .setDepth(6)

    this.trex = this.add
      .image(GAME_WIDTH - 70, this.laneToY(START_LANE_INDEX - 1), 'enemy-trex')
      .setDisplaySize(76, 62)
      .setDepth(5)

    this.spawnItems(10)

    this.hud = this.add
      .text(12, 12, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '16px',
        color: '#e8ecff',
      })
      .setDepth(10)

    this.add
      .text(GAME_WIDTH / 2, 24, `Bonus: Collect ${this.itemConfig.label} in 30s while T-Rex chases you!`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#b7caff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(10)

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      }) as unknown as {
        w: Phaser.Input.Keyboard.Key
        a: Phaser.Input.Keyboard.Key
        s: Phaser.Input.Keyboard.Key
        d: Phaser.Input.Keyboard.Key
        space: Phaser.Input.Keyboard.Key
      }
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.done) return
      if (pointer.x < GAME_WIDTH / 3) this.trySideways(-1)
      else if (pointer.x > (GAME_WIDTH / 3) * 2) this.trySideways(1)
      else if (pointer.y < GAME_HEIGHT / 2) this.tryStep(-1)
      else this.tryStep(1)
    })
  }

  update() {
    if (this.done || !this.animal || !this.animalSprite) return

    const nowMs = this.time.now
    this.handleKeys()

    const dtSec = this.game.loop.delta / 1000
    this.animal.update(nowMs)
    this.animalSprite.x = this.animal.x
    this.animalSprite.y = this.animal.y
    this.animalSprite.setTexture(
      this.animal.isJumping ? this.itemConfig.jumpTexture : this.itemConfig.idleTexture,
      0,
    )
    this.animalSprite.setDisplaySize(FROG_WIDTH, FROG_HEIGHT)

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      item.sprite.x += item.vx * dtSec
      if (item.sprite.x < 20) {
        item.sprite.x = 20
        item.vx *= -1
      } else if (item.sprite.x > GAME_WIDTH - 20) {
        item.sprite.x = GAME_WIDTH - 20
        item.vx *= -1
      }
      if (!this.intersects(this.animal.getRect(), this.getSpriteRect(item.sprite))) continue
      item.sprite.destroy()
      this.items.splice(i, 1)
      this.score += 1
      this.spawnItems(1)
    }

    this.updateTrex(dtSec, nowMs)

    const elapsedMs = this.timerStarted ? nowMs - this.startMs : 0
    const timeLeftMs = Math.max(0, this.bonusDurationMs - elapsedMs)
    if (this.hud) {
      this.hud.setText(`Time left: ${(timeLeftMs / 1000).toFixed(1)}s   Score: ${this.score}   Danger: T-Rex`)
    }

    if (elapsedMs >= this.bonusDurationMs) {
      this.done = true
      this.showComplete()
    }
  }

  private drawArena() {
    const g = this.add.graphics()
    g.fillStyle(0x1a2446, 1)
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    g.lineStyle(2, 0x465890, 0.8)
    for (let i = 0; i <= LANE_COUNT; i++) {
      const y = (GAME_HEIGHT / LANE_COUNT) * i
      g.lineBetween(0, y, GAME_WIDTH, y)
    }
    g.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4)
  }

  private spawnItems(count: number) {
    for (let i = 0; i < count; i++) {
      const lane = Math.floor(Math.random() * (LANE_COUNT - 1))
      const x = 36 + Math.random() * (GAME_WIDTH - 72)
      const y = this.laneToY(lane)
      const item = this.add.image(x, y, this.itemConfig.texture).setDisplaySize(24, 24).setDepth(5)
      const speed = 70 + Math.random() * 80
      const vx = Math.random() < 0.5 ? -speed : speed
      this.items.push({ sprite: item, vx })
    }
  }

  private showComplete() {
    this.trex?.destroy()
    this.trex = null
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 180, 240, 0x0d142c, 0.92)
      .setStrokeStyle(3, 0x526bb6, 0.8)
      .setDepth(15)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 36, `Bonus Complete! Score: ${this.score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 36, 'Press Enter or tap to continue', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#c4d0ff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20)

    const go = () =>
      this.scene.start('WinScene', {
        runTimeMs: this.runTimeMs,
        bonusScore: this.score,
        bonusAnimal: this.itemConfig.label,
      })
    this.input.keyboard?.once('keydown-ENTER', go)
    this.input.once('pointerdown', go)
  }

  private laneToY(lane: number): number {
    return (lane + 0.5) * (GAME_HEIGHT / LANE_COUNT)
  }

  private getSpriteRect(sprite: Phaser.GameObjects.Image) {
    const left = sprite.x - sprite.displayWidth / 2
    const top = sprite.y - sprite.displayHeight / 2
    return { left, right: left + sprite.displayWidth, top, bottom: top + sprite.displayHeight }
  }

  private intersects(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number },
  ) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  }

  private tryStep(direction: -1 | 1) {
    if (!this.animal) return
    const target = this.animal.laneIndex + direction
    if (target < 0 || target >= LANE_COUNT) return
    const ok = this.animal.requestMove(target, this.animal.x, this.time.now)
    if (ok && !this.timerStarted) {
      this.timerStarted = true
      this.startMs = this.time.now
    }
  }

  private trySideways(direction: -1 | 1) {
    if (!this.animal) return
    const minX = FROG_WIDTH / 2
    const maxX = GAME_WIDTH - FROG_WIDTH / 2
    const targetX = Math.max(minX, Math.min(maxX, this.animal.x + direction * HORIZONTAL_STEP_PX))
    const ok = this.animal.requestMove(this.animal.laneIndex, targetX, this.time.now)
    if (ok && !this.timerStarted) {
      this.timerStarted = true
      this.startMs = this.time.now
    }
  }

  private handleKeys() {
    if (!this.cursors || !this.keys) return
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      this.tryStep(-1)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.tryStep(1)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      this.trySideways(-1)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      this.trySideways(1)
    }
  }

  private getItemConfig(animal: BonusAnimal): ItemConfig {
    if (animal === 'dog') {
      return {
        label: 'treats',
        texture: 'item-treat',
        idleTexture: 'dog-idle',
        jumpTexture: 'dog-jump',
      }
    }
    if (animal === 'cat') {
      return {
        label: 'mice',
        texture: 'item-mouse',
        idleTexture: 'cat-idle',
        jumpTexture: 'cat-jump',
      }
    }
    return {
      label: 'flies',
      texture: 'item-fly',
      idleTexture: 'frog-idle',
      jumpTexture: 'frog-jump',
    }
  }

  private updateTrex(dtSec: number, nowMs: number) {
    if (!this.trex || !this.animal || !this.animalSprite) return
    const dx = this.animal.x - this.trex.x
    const dy = this.animal.y - this.trex.y
    const dist = Math.hypot(dx, dy)
    if (dist > 0.001) {
      const speed = this.timerStarted ? 84 : 58
      const step = Math.min(dist, speed * dtSec)
      this.trex.x += (dx / dist) * step
      this.trex.y += (dy / dist) * step
      if (Math.abs(dx) > 2) this.trex.setFlipX(dx < 0)
    }

    const hitCooldownMs = 900
    if (nowMs - this.lastTrexHitAtMs < hitCooldownMs) return
    if (!this.intersects(this.animal.getRect(), this.getSpriteRect(this.trex))) return
    this.lastTrexHitAtMs = nowMs
    this.score = Math.max(0, this.score - 2)
    this.cameras.main.shake(90, 0.004)
    this.tweens.add({
      targets: this.animalSprite,
      alpha: 0.35,
      duration: 70,
      yoyo: true,
      repeat: 2,
    })
  }
}

