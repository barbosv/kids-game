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
import type { GameMode } from './ModeSelectScene'

type ItemConfig = {
  label: string
  texture: string
  idleTexture: string
  jumpTexture: string
}

type MovingItem = { sprite: Phaser.GameObjects.Image; vx: number }
type MovingLog = { sprite: Phaser.GameObjects.Image; lane: number; vx: number }
type MovingTraffic = { sprite: Phaser.GameObjects.Image; lane: number; vx: number }
type FallingBomb = { sprite: Phaser.GameObjects.Image; vy: number }
type PowerStar = { sprite: Phaser.GameObjects.Image; bornAtMs: number }

export class BonusScene extends Phaser.Scene {
  constructor() {
    super('BonusScene')
  }

  private animal: Frog | null = null
  private animalSprite: Phaser.GameObjects.Image | null = null
  private items: MovingItem[] = []
  private logs: MovingLog[] = []
  private traffic: MovingTraffic[] = []
  private bombs: FallingBomb[] = []
  private stars: PowerStar[] = []
  private startMs = 0
  private done = false
  private hud: Phaser.GameObjects.Text | null = null
  private banner: Phaser.GameObjects.Text | null = null
  private score = 0
  private readonly bonusDurationMs = 45000
  private timerStarted = false
  private runTimeMs = 0
  private gameMode: GameMode = 'crossing'
  private selectedAnimal: BonusAnimal = 'frog'
  private bonusStage: 1 | 2 = 1
  private trex: Phaser.GameObjects.Image | null = null
  private chest: Phaser.GameObjects.Image | null = null
  private chestSpawnedAtMs = 0
  private nextChestSpawnMs = 0
  private trexImmunityCharges = 0
  private lastTrexHitAtMs = -99999
  private lives = 3
  private invincibleUntilMs = 0
  private damageCooldownUntilMs = 0
  private waterGraceUntilMs = 0
  private nextBombSpawnMs = 0
  private nextStarSpawnMs = 0
  private targetScore = 45
  private readonly stageOneUnlockScore = 25
  private speedFactor = 1
  private readonly riverLanes = [3, 5]
  private readonly roadLanes = [1, 2, 6, 7]
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
  private onWindowKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]'))
    ) {
      return
    }
    const code = event.code
    const key = event.key
    if (code === 'ArrowUp' || key === 'ArrowUp' || code === 'KeyW' || key === 'w' || key === 'W' || code === 'Space') {
      event.preventDefault()
      this.tryStep(-1)
      return
    }
    if (code === 'ArrowDown' || key === 'ArrowDown' || code === 'KeyS' || key === 's' || key === 'S') {
      event.preventDefault()
      this.tryStep(1)
      return
    }
    if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'A') {
      event.preventDefault()
      this.trySideways(-1)
      return
    }
    if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'D') {
      event.preventDefault()
      this.trySideways(1)
    }
  }

  create(data?: {
    animal?: BonusAnimal
    runTimeMs?: number
    gameMode?: GameMode
    bonusStage?: 1 | 2
    livesRemaining?: number
  }) {
    const animal = data?.animal ?? 'frog'
    this.selectedAnimal = animal
    this.runTimeMs = data?.runTimeMs ?? 0
    this.gameMode = data?.gameMode ?? 'crossing'
    this.bonusStage = data?.bonusStage ?? 1
    this.itemConfig = this.getItemConfig(animal)

    this.cameras.main.setBackgroundColor('#0f1a38')
    this.done = false
    this.startMs = this.time.now
    this.score = 0
    this.lives = data?.livesRemaining ?? 3
    this.invincibleUntilMs = 0
    this.damageCooldownUntilMs = 0
    this.waterGraceUntilMs = this.time.now + 900
    this.targetScore = this.bonusStage === 1 ? this.stageOneUnlockScore : 45
    this.speedFactor = this.bonusStage === 1 ? 0.62 : 0.52
    this.timerStarted = false
    this.trexImmunityCharges = 0
    this.nextChestSpawnMs = this.time.now + Phaser.Math.Between(2600, 5400)
    this.nextBombSpawnMs = this.time.now + (this.bonusStage === 1 ? 1400 : 1800)
    this.nextStarSpawnMs = this.time.now + Phaser.Math.Between(3800, 6600)
    this.chestSpawnedAtMs = 0
    this.chest?.destroy()
    this.chest = null
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

    this.initLogsAndTraffic()
    this.spawnItems(12)

    this.hud = this.add
      .text(12, 44, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '16px',
        color: '#e8ecff',
      })
      .setDepth(10)

    this.banner = this.add
      .text(GAME_WIDTH / 2, 18, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '21px',
        color: '#b7caff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(10)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'Logs + Traffic mix: land on logs, avoid vehicles, bombs, and T-Rex', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#aebbe6',
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
    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0')
      this.game.canvas.focus()
    }
    window.addEventListener('keydown', this.onWindowKeyDown, true)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.onWindowKeyDown, true)
    })

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

    this.updateLogs(dtSec)
    this.updateTraffic(dtSec)
    this.updateBombs(dtSec, nowMs)
    this.updateStars(nowMs)

    if (!this.animal.isJumping) this.resolveWaterAndLogCarry(dtSec, nowMs)
    this.handleTrafficCollision(nowMs)

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
      if (this.score < this.targetScore) this.spawnItems(1)
    }

    this.updateTrex(dtSec, nowMs)
    this.updateChest(nowMs)

    const elapsedMs = this.timerStarted ? nowMs - this.startMs : 0
    const timeLeftMs = Math.max(0, this.bonusDurationMs - elapsedMs)
    if (this.hud) {
      const inv = nowMs < this.invincibleUntilMs ? `Inv ${(Math.max(0, this.invincibleUntilMs - nowMs) / 1000).toFixed(1)}s` : 'Inv 0.0s'
      this.hud.setText(`Lives ${this.lives}   Score ${this.score}/${this.targetScore}   Shield ${this.trexImmunityCharges}   ${inv}   Time ${(timeLeftMs / 1000).toFixed(1)}s`)
    }
    if (this.banner) {
      this.banner.setText(
        this.bonusStage === 1
          ? `Bonus Level 1: collect ${this.stageOneUnlockScore}+ ${this.itemConfig.label} to unlock Level 2`
          : `Bonus Level 2: slower pace - collect up to ${this.targetScore} before time ends`,
      )
    }

    if (this.score >= this.targetScore) {
      if (this.bonusStage === 1) {
        this.done = true
        this.showStageTransition(this.selectedAnimal)
        return
      }
      this.done = true
      this.showComplete(true)
      return
    }
    if (elapsedMs >= this.bonusDurationMs) {
      this.done = true
      this.showComplete(false)
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
      const lanes = [1, 2, 3, 4, 5, 6, 7]
      const lane = lanes[Phaser.Math.Between(0, lanes.length - 1)]
      const x = 36 + Math.random() * (GAME_WIDTH - 72)
      const y = this.laneToY(lane)
      const item = this.add.image(x, y, this.itemConfig.texture).setDisplaySize(24, 24).setDepth(5)
      const speed = 70 + Math.random() * 80
      const vx = Math.random() < 0.5 ? -speed : speed
      this.items.push({ sprite: item, vx })
    }
  }

  private showComplete(won: boolean) {
    this.trex?.destroy()
    this.trex = null
    this.chest?.destroy()
    this.chest = null
    this.logs.forEach((l) => l.sprite.destroy())
    this.traffic.forEach((t) => t.sprite.destroy())
    this.bombs.forEach((b) => b.sprite.destroy())
    this.stars.forEach((s) => s.sprite.destroy())
    this.logs = []
    this.traffic = []
    this.bombs = []
    this.stars = []
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 180, 240, 0x0d142c, 0.92)
      .setStrokeStyle(3, 0x526bb6, 0.8)
      .setDepth(15)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 36, won ? `Bonus Victory! Score: ${this.score}` : `Bonus Over! Score: ${this.score}`, {
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
        gameMode: this.gameMode,
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
    if (animal === 'chicken') {
      return {
        label: 'worms',
        texture: 'item-worm',
        idleTexture: 'chicken-idle',
        jumpTexture: 'chicken-jump',
      }
    }
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
      const baseSpeed = this.timerStarted ? 70 : 46
      const speed = baseSpeed * this.speedFactor
      const step = Math.min(dist, speed * dtSec)
      this.trex.x += (dx / dist) * step
      this.trex.y += (dy / dist) * step
      if (Math.abs(dx) > 2) this.trex.setFlipX(dx < 0)
    }

    const hitCooldownMs = 900
    if (nowMs - this.lastTrexHitAtMs < hitCooldownMs) return
    if (nowMs < this.damageCooldownUntilMs) return
    if (!this.intersects(this.animal.getRect(), this.getSpriteRect(this.trex))) return
    this.lastTrexHitAtMs = nowMs
    if (nowMs < this.invincibleUntilMs) return
    if (this.trexImmunityCharges > 0) {
      this.trexImmunityCharges -= 1
      this.tweens.add({
        targets: this.animalSprite,
        alpha: 0.55,
        duration: 60,
        yoyo: true,
        repeat: 3,
      })
      return
    }
    this.loseLife(nowMs)
  }

  private updateChest(nowMs: number) {
    if (!this.animal) return
    if (!this.chest && nowMs >= this.nextChestSpawnMs) {
      const lane = Phaser.Math.Between(1, LANE_COUNT - 2)
      const x = Phaser.Math.Between(34, GAME_WIDTH - 34)
      this.chest = this.add.image(x, this.laneToY(lane), 'bonus-chest').setDisplaySize(30, 30).setDepth(6)
      this.chestSpawnedAtMs = nowMs
    }
    if (!this.chest) return
    if (this.intersects(this.animal.getRect(), this.getSpriteRect(this.chest))) {
      this.trexImmunityCharges += 1
      this.chest.destroy()
      this.chest = null
      this.chestSpawnedAtMs = 0
      this.nextChestSpawnMs = nowMs + Phaser.Math.Between(7000, 11500)
      return
    }
    // Re-roll stale chest so bonus field keeps moving.
    if (nowMs - this.chestSpawnedAtMs > 9000) {
      this.chest.destroy()
      this.chest = null
      this.chestSpawnedAtMs = 0
      this.nextChestSpawnMs = nowMs + Phaser.Math.Between(2800, 5600)
    }
  }

  private initLogsAndTraffic() {
    this.logs = []
    this.traffic = []
    const colors = [0x8b5a2b, 0xb45309, 0xa16213, 0x6b4f36]
    for (const lane of this.riverLanes) {
      const dir = lane % 2 === 0 ? 1 : -1
      const count = 2
      for (let i = 0; i < count; i++) {
        const w = [90, 130, 170][Phaser.Math.Between(0, 2)]
        const h = 22
        const key = this.makeLogTexture(w, h, colors[Phaser.Math.Between(0, colors.length - 1)])
        const x = (i / count) * GAME_WIDTH + Phaser.Math.Between(0, 120)
        const sprite = this.add.image(x % GAME_WIDTH, this.laneToY(lane), key).setDisplaySize(w, h).setDepth(5)
        const speed = (26 + Phaser.Math.Between(0, 16)) * this.speedFactor
        this.logs.push({ sprite, lane, vx: dir * speed })
      }
    }
    const trafficTextures = ['street-car', 'street-bus', 'street-truck', 'train-small', 'train-medium', 'train-large']
    for (const lane of this.roadLanes) {
      const dir = lane % 2 === 0 ? 1 : -1
      const count = 2
      for (let i = 0; i < count; i++) {
        const key = trafficTextures[Phaser.Math.Between(0, trafficTextures.length - 1)]
        const x = (i / count) * GAME_WIDTH + Phaser.Math.Between(0, 130)
        const sprite = this.add.image(x % GAME_WIDTH, this.laneToY(lane), key).setDepth(5)
        const size = key.includes('train')
          ? { w: key.includes('large') ? 92 : key.includes('medium') ? 70 : 44, h: key.includes('large') ? 34 : key.includes('medium') ? 30 : 28 }
          : key.includes('truck')
            ? { w: 92, h: 34 }
            : key.includes('bus')
              ? { w: 70, h: 30 }
              : { w: 44, h: 28 }
        sprite.setDisplaySize(size.w, size.h)
        const speed = (54 + Phaser.Math.Between(0, 24)) * this.speedFactor
        this.traffic.push({ sprite, lane, vx: dir * speed })
      }
    }
  }

  private updateLogs(dtSec: number) {
    const mult = 1
    for (const log of this.logs) {
      log.sprite.x += log.vx * mult * dtSec
      const wrap = log.sprite.displayWidth / 2 + 22
      if (log.vx > 0 && log.sprite.x - wrap > GAME_WIDTH) log.sprite.x = -wrap
      if (log.vx < 0 && log.sprite.x + wrap < 0) log.sprite.x = GAME_WIDTH + wrap
    }
  }

  private updateTraffic(dtSec: number) {
    const mult = 1
    for (const car of this.traffic) {
      car.sprite.x += car.vx * mult * dtSec
      const wrap = car.sprite.displayWidth / 2 + 24
      if (car.vx > 0 && car.sprite.x - wrap > GAME_WIDTH) car.sprite.x = -wrap
      if (car.vx < 0 && car.sprite.x + wrap < 0) car.sprite.x = GAME_WIDTH + wrap
    }
  }

  private resolveWaterAndLogCarry(dtSec: number, nowMs: number) {
    if (!this.animal || nowMs < this.damageCooldownUntilMs) return
    if (!this.riverLanes.includes(this.animal.laneIndex)) return
    const frogRect = this.animal.getRect()
    const log = this.logs.find((l) => l.lane === this.animal!.laneIndex && this.intersects(frogRect, this.getSpriteRect(l.sprite)))
    if (!log) {
      if (nowMs <= this.waterGraceUntilMs) return
      if (nowMs >= this.invincibleUntilMs) this.loseLife(nowMs)
      return
    }
    this.waterGraceUntilMs = nowMs + 260
    this.animal.x += log.vx * dtSec
    const minX = FROG_WIDTH / 2
    const maxX = GAME_WIDTH - FROG_WIDTH / 2
    if (this.animal.x < minX || this.animal.x > maxX) {
      if (nowMs >= this.invincibleUntilMs) this.loseLife(nowMs)
      return
    }
    this.animal.x = Math.max(minX, Math.min(maxX, this.animal.x))
  }

  private handleTrafficCollision(nowMs: number) {
    if (!this.animal || this.animal.isJumping || nowMs < this.damageCooldownUntilMs) return
    if (nowMs < this.invincibleUntilMs) return
    if (!this.roadLanes.includes(this.animal.laneIndex)) return
    const frogRect = this.animal.getRect()
    for (const car of this.traffic) {
      if (car.lane !== this.animal.laneIndex) continue
      if (!this.intersects(frogRect, this.getSpriteRect(car.sprite))) continue
      this.loseLife(nowMs)
      return
    }
  }

  private updateBombs(dtSec: number, nowMs: number) {
    if (nowMs >= this.nextBombSpawnMs) {
      const x = Phaser.Math.Between(24, GAME_WIDTH - 24)
      const sprite = this.add.image(x, -18, 'hazard-bomb').setDisplaySize(28, 28).setDepth(6)
      const vy = (this.bonusStage === 1 ? 120 : 105) + Phaser.Math.Between(0, this.bonusStage === 1 ? 55 : 35)
      this.bombs.push({ sprite, vy })
      this.nextBombSpawnMs = nowMs + Phaser.Math.Between(this.bonusStage === 1 ? 1000 : 1300, this.bonusStage === 1 ? 1800 : 2300)
    }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i]
      bomb.sprite.y += bomb.vy * dtSec
      if (bomb.sprite.y > GAME_HEIGHT + 24) {
        bomb.sprite.destroy()
        this.bombs.splice(i, 1)
        continue
      }
      if (!this.animal) continue
      const bombRect = this.getSpriteRect(bomb.sprite)

      // Player damage only on direct bomb-to-player contact.
      if (this.intersects(this.animal.getRect(), bombRect)) {
        this.explodeBombEffect(bomb.sprite.x, bomb.sprite.y)
        bomb.sprite.destroy()
        this.bombs.splice(i, 1)
        if (nowMs >= this.invincibleUntilMs) this.loseLife(nowMs)
        continue
      }

      // Bombs can hit world entities without harming player.
      const hitsLog = this.logs.some((log) => this.intersects(bombRect, this.getSpriteRect(log.sprite)))
      const hitsTraffic = this.traffic.some((car) => this.intersects(bombRect, this.getSpriteRect(car.sprite)))
      const hitsTrex = this.trex ? this.intersects(bombRect, this.getSpriteRect(this.trex)) : false
      const hitsChest = this.chest ? this.intersects(bombRect, this.getSpriteRect(this.chest)) : false
      if (hitsLog || hitsTraffic || hitsTrex || hitsChest) {
        this.explodeBombEffect(bomb.sprite.x, bomb.sprite.y)
        bomb.sprite.destroy()
        this.bombs.splice(i, 1)
        continue
      }
    }
  }

  private explodeBombEffect(x: number, y: number) {
    const blast = this.add.circle(x, y, 6, 0xff914d, 0.9).setDepth(12)
    this.tweens.add({
      targets: blast,
      radius: 42,
      alpha: 0,
      duration: 220,
      onComplete: () => blast.destroy(),
    })
  }

  private updateStars(nowMs: number) {
    if (nowMs >= this.nextStarSpawnMs) {
      const lane = Phaser.Math.Between(1, LANE_COUNT - 2)
      const x = Phaser.Math.Between(24, GAME_WIDTH - 24)
      const sprite = this.add.image(x, this.laneToY(lane), 'power-invincible').setDisplaySize(26, 26).setDepth(6)
      this.stars.push({ sprite, bornAtMs: nowMs })
      this.nextStarSpawnMs = nowMs + Phaser.Math.Between(this.bonusStage === 1 ? 4400 : 3600, this.bonusStage === 1 ? 7600 : 6200)
    }
    if (!this.animal) return
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i]
      if (nowMs - star.bornAtMs > 6500) {
        star.sprite.destroy()
        this.stars.splice(i, 1)
        continue
      }
      if (!this.intersects(this.animal.getRect(), this.getSpriteRect(star.sprite))) continue
      this.invincibleUntilMs = Math.max(this.invincibleUntilMs, nowMs + 5000)
      star.sprite.destroy()
      this.stars.splice(i, 1)
    }
  }

  private loseLife(nowMs: number) {
    if (!this.animalSprite || this.done) return
    this.lives -= 1
    this.damageCooldownUntilMs = nowMs + 900
    this.waterGraceUntilMs = nowMs + 900
    this.cameras.main.shake(110, 0.005)
    this.tweens.add({
      targets: this.animalSprite,
      alpha: 0.25,
      duration: 70,
      yoyo: true,
      repeat: 3,
    })
    if (this.lives <= 0) {
      this.done = true
      this.scene.start('LoseScene', { runTimeMs: this.runTimeMs })
    }
  }

  private showStageTransition(animal: BonusAnimal) {
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 200, 220, 0x0d142c, 0.95)
      .setStrokeStyle(3, 0x526bb6, 0.8)
      .setDepth(20)
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 42, 'Bonus Level 2 Unlocked!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#fef08a',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(21)
    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 6, 'You collected 25+ items. Stage 2 is now open.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '21px',
        color: '#dbeafe',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(21)
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 46, 'Press Enter or tap to continue', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#b7caff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(21)
    const go = () => {
      panel.destroy()
      title.destroy()
      sub.destroy()
      hint.destroy()
      this.scene.start('BonusScene', {
        animal,
        runTimeMs: this.runTimeMs,
        gameMode: this.gameMode,
        bonusStage: 2,
        livesRemaining: this.lives,
      })
    }
    this.input.keyboard?.once('keydown-ENTER', go)
    this.input.once('pointerdown', go)
  }

  private makeLogTexture(width: number, height: number, color: number): string {
    const key = `bonus-log-${width}x${height}-${color.toString(16)}`
    if (this.textures.exists(key)) return key
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillRoundedRect(0, 0, width, height, 8)
    g.fillStyle(0x3f2a1d, 0.34)
    g.fillEllipse(width * 0.18, height * 0.5, 12, 9)
    g.fillEllipse(width * 0.82, height * 0.5, 12, 9)
    g.lineStyle(2, 0x2b1d13, 0.6)
    g.strokeRoundedRect(0, 0, width, height, 8)
    g.generateTexture(key, width, height)
    g.destroy()
    return key
  }
}

