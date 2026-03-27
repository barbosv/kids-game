import Phaser from 'phaser'
import {
  BONUS_UNLOCK_TIME_MS,
  DIFFICULTY_RAMP_EVERY_MS,
  FROG_HEIGHT,
  FROG_WIDTH,
  FROG_X,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEART_POWERUP_CHANCE,
  HOME_LANE_INDEX,
  HORIZONTAL_STEP_PX,
  INVISIBILITY_DURATION_MS,
  LANE_COUNT,
  LANE_HEIGHT,
  MAX_DIFFICULTY_MULTIPLIER,
  MAX_LIVES,
  MAX_TOTAL_LIVES,
  POWER_SPAWN_MAX_MS,
  POWER_SPAWN_MIN_MS,
  START_LANE_INDEX,
  type VehicleKind,
} from '../constants'
import { Frog } from '../domain/Frog'
import { Lane } from '../domain/Lane'
import { CollisionSystem } from '../systems/CollisionSystem'
import { SpawnerSystem } from '../systems/SpawnerSystem'

type LevelConfig = {
  level: 1 | 2 | 3
  animalName: string
  idleTexture: string
  jumpTexture: string
  vehicleTextures?: Partial<Record<VehicleKind, string>>
}

type PowerKind = 'invincible' | 'heart'
type Bomb = { sprite: Phaser.GameObjects.Image; bornAtMs: number }
type PowerUp = { sprite: Phaser.GameObjects.Image; kind: PowerKind; expireAtMs: number }

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  private lanes: Lane[] = []
  private animal: Frog | null = null
  private animalSprite: Phaser.GameObjects.Image | null = null
  private levelConfig: LevelConfig = this.getLevelConfig(1)

  private spawner: SpawnerSystem | null = null
  private collision: CollisionSystem | null = null

  private level = 1 as 1 | 2 | 3
  private accumulatedMs = 0
  private levelStartMs = 0
  private timerStarted = false
  private livesRemaining = MAX_LIVES
  private hasEnded = false
  private invincibleUntilMs = 0
  private lastInputAtMs = 0
  private lastKeyMoveAtMs = 0

  private bombs: Bomb[] = []
  private nextBombSpawnMs = 0

  private powerUps: PowerUp[] = []
  private nextPowerSpawnMs = 0
  private invincibleAura: Phaser.GameObjects.Arc | null = null
  private invincibleAuraTween: Phaser.Tweens.Tween | null = null

  private uiText: Phaser.GameObjects.Text | null = null
  private levelIntroText: Phaser.GameObjects.Text | null = null

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
    const nowMs = this.time.now
    if (nowMs - this.lastInputAtMs < 120) return
    const code = event.code
    const key = event.key
    if (code === 'ArrowUp' || key === 'ArrowUp' || code === 'KeyW' || key === 'w' || key === 'W' || code === 'Space') {
      event.preventDefault()
      this.tryStep(-1)
      this.lastInputAtMs = nowMs
      return
    }
    if (code === 'ArrowDown' || key === 'ArrowDown' || code === 'KeyS' || key === 's' || key === 'S') {
      event.preventDefault()
      this.tryStep(1)
      this.lastInputAtMs = nowMs
      return
    }
    if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'A') {
      event.preventDefault()
      this.trySideways(-1)
      this.lastInputAtMs = nowMs
      return
    }
    if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'D') {
      event.preventDefault()
      this.trySideways(1)
      this.lastInputAtMs = nowMs
    }
  }

  create(data?: {
    level?: number
    accumulatedMs?: number
    livesRemaining?: number
    timerStarted?: boolean
  }) {
    this.hasEnded = false
    this.level = (data?.level ?? 1) as 1 | 2 | 3
    this.levelConfig = this.getLevelConfig(this.level)
    this.accumulatedMs = data?.accumulatedMs ?? 0
    this.livesRemaining = data?.livesRemaining ?? MAX_LIVES
    this.timerStarted = data?.timerStarted ?? false
    this.levelStartMs = this.time.now
    this.invincibleUntilMs = 0
    this.lastInputAtMs = 0

    this.cameras.main.setBackgroundColor('#0b1020')
    this.lanes = Array.from({ length: LANE_COUNT }, (_, i) => new Lane(i))
    this.createBoard()

    this.animal = new Frog(FROG_X, START_LANE_INDEX)
    this.animalSprite = this.add
      .image(FROG_X, this.lanes[START_LANE_INDEX].y, this.levelConfig.idleTexture, 0)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(FROG_WIDTH, FROG_HEIGHT)
      .setDepth(8)

    this.spawner = new SpawnerSystem({
      scene: this,
      lanes: this.lanes,
      gameWidth: GAME_WIDTH,
      textureByKind: this.levelConfig.vehicleTextures,
    })
    this.collision = new CollisionSystem()

    this.uiText = this.add
      .text(12, 10, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '15px',
        color: '#e7e7ff',
      })
      .setDepth(20)

    this.add
      .text(
        12,
        34,
        'Move: Arrow keys or WASD | Up/Down to move lanes | Left/Right for sideways dodge',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#b8c2ff',
        },
      )
      .setDepth(20)

    this.levelIntroText = this.add
      .text(
        GAME_WIDTH / 2,
        70,
        `Level ${this.level}: ${this.levelConfig.animalName} crossing`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '34px',
          color: '#f5f7ff',
          backgroundColor: '#00000066',
          padding: { left: 14, right: 14, top: 8, bottom: 8 },
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(30)
    this.time.delayedCall(1400, () => this.levelIntroText?.destroy())

    this.invincibleAura = this.add.circle(FROG_X, this.lanes[START_LANE_INDEX].y, 24, 0xfff4a3, 0.2)
    this.invincibleAura.setDepth(7).setVisible(false)
    this.invincibleAuraTween = this.tweens.add({
      targets: this.invincibleAura,
      alpha: { from: 0.12, to: 0.32 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    })
    this.invincibleAuraTween.pause()

    this.scheduleNextPowerSpawn(this.time.now)
    this.scheduleNextBombSpawn(this.time.now)

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
      if (this.hasEnded) return
      if (pointer.x < GAME_WIDTH / 3) this.trySideways(-1)
      else if (pointer.x > (GAME_WIDTH / 3) * 2) this.trySideways(1)
      else if (pointer.y < GAME_HEIGHT / 2) this.tryStep(-1)
      else this.tryStep(1)
    })

    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0')
      this.game.canvas.focus()
    }
    window.addEventListener('keydown', this.onWindowKeyDown, true)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.onWindowKeyDown, true)
    })
  }

  update(_time: number, delta: number) {
    if (this.hasEnded || !this.animal || !this.animalSprite || !this.spawner || !this.collision) return
    const nowMs = this.time.now
    this.handleKeyboardInput(nowMs)

    const levelElapsedMs = this.timerStarted ? nowMs - this.levelStartMs : 0
    const totalElapsedMs = this.accumulatedMs + levelElapsedMs
    const difficultyMultiplier = Math.min(MAX_DIFFICULTY_MULTIPLIER, 1 + totalElapsedMs / DIFFICULTY_RAMP_EVERY_MS)

    this.spawner.update({ deltaMs: delta, difficultyMultiplier })

    const landed = this.animal.update(nowMs)
    this.animalSprite.x = this.animal.x
    this.animalSprite.y = this.animal.y
    this.animalSprite.setTexture(
      this.animal.isJumping ? this.levelConfig.jumpTexture : this.levelConfig.idleTexture,
      0,
    )
    this.animalSprite.setDisplaySize(FROG_WIDTH, FROG_HEIGHT)

    const isInvincible = nowMs < this.invincibleUntilMs
    if (this.invincibleAura) {
      this.invincibleAura.x = this.animal.x
      this.invincibleAura.y = this.animal.y
      this.invincibleAura.setVisible(isInvincible)
      if (isInvincible) this.invincibleAuraTween?.resume()
      else this.invincibleAuraTween?.pause()
    }

    this.updatePowerUps(nowMs)
    this.updateBombs(nowMs)

    if (!isInvincible && this.collision.hasFrogCollision({ frog: this.animal, vehicles: this.spawner.getVehicles() })) {
      this.consumeLife(totalElapsedMs)
      return
    }

    if (landed && this.animal.laneIndex === HOME_LANE_INDEX) {
      this.advanceLevelOrWin(totalElapsedMs)
      return
    }

    if (this.uiText) {
      const activePower = isInvincible
        ? `Invincible ${(Math.max(0, this.invincibleUntilMs - nowMs) / 1000).toFixed(1)}s`
        : 'None'
      this.uiText.setText(
        `Level ${this.level}/3 (${this.levelConfig.animalName})   Lives ${this.livesRemaining}   Time ${(totalElapsedMs / 1000).toFixed(1)}s   Traffic x${difficultyMultiplier.toFixed(2)}   Power ${activePower}`,
      )
    }
  }

  private handleKeyboardInput(nowMs: number) {
    if (!this.cursors || !this.keys) return
    if (nowMs - this.lastKeyMoveAtMs < 130) return
    let moved = false
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      this.tryStep(-1)
      moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.tryStep(1)
      moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      this.trySideways(-1)
      moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      this.trySideways(1)
      moved = true
    }
    if (moved) this.lastKeyMoveAtMs = nowMs
  }

  private createBoard() {
    const g = this.add.graphics()
    const hasRoadTile = this.textures.exists('road-tile')
    for (const lane of this.lanes) {
      const laneTop = lane.y - LANE_HEIGHT / 2
      if (lane.isRoad && hasRoadTile) {
        this.add.tileSprite(0, laneTop, GAME_WIDTH, LANE_HEIGHT, 'road-tile').setOrigin(0, 0).setAlpha(1)
      } else {
        g.fillStyle(0x16213e, 1)
        g.fillRect(0, laneTop, GAME_WIDTH, LANE_HEIGHT)
      }
      if (lane.isRoad) {
        g.fillStyle(0xa0abff, 0.16)
        for (let x = 70; x < GAME_WIDTH; x += 84) g.fillRect(x, lane.y - 3, 26, 3)
      } else {
        g.fillStyle(0x2f7d32, lane.index === HOME_LANE_INDEX || lane.index === START_LANE_INDEX ? 0.22 : 0.3)
        g.fillRect(0, laneTop, GAME_WIDTH, LANE_HEIGHT)
      }
    }
    g.lineStyle(3, 0x0b1020, 0.9)
    g.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  private tryStep(direction: -1 | 1) {
    if (!this.animal || this.hasEnded) return
    const targetLane = this.animal.laneIndex + direction
    if (targetLane < 0 || targetLane >= LANE_COUNT) return
    const ok = this.animal.requestMove(targetLane, this.animal.x, this.time.now)
    if (!ok) return
    if (!this.timerStarted) {
      this.timerStarted = true
      this.levelStartMs = this.time.now
    }
  }

  private trySideways(direction: -1 | 1) {
    if (!this.animal || this.hasEnded) return
    const minX = FROG_WIDTH / 2
    const maxX = GAME_WIDTH - FROG_WIDTH / 2
    const targetX = Math.max(minX, Math.min(maxX, this.animal.x + direction * HORIZONTAL_STEP_PX))
    const ok = this.animal.requestMove(this.animal.laneIndex, targetX, this.time.now)
    if (!ok) return
    if (!this.timerStarted) {
      this.timerStarted = true
      this.levelStartMs = this.time.now
    }
  }

  private scheduleNextPowerSpawn(nowMs: number) {
    this.nextPowerSpawnMs = nowMs + Phaser.Math.Between(POWER_SPAWN_MIN_MS, POWER_SPAWN_MAX_MS)
  }

  private updatePowerUps(nowMs: number) {
    if (!this.animal) return
    if (nowMs >= this.nextPowerSpawnMs) {
      const roadLanes = this.lanes.filter((l) => l.isRoad)
      const lane = roadLanes[Phaser.Math.Between(0, roadLanes.length - 1)]
      const x = Phaser.Math.Between(32, GAME_WIDTH - 32)
      const isHeart = Math.random() < HEART_POWERUP_CHANCE
      const kind: PowerKind = isHeart ? 'heart' : 'invincible'
      const texture = isHeart ? 'power-heart' : 'power-invincible'
      const sprite = this.add.image(x, lane.y, texture).setDisplaySize(28, 28).setDepth(6)
      this.powerUps.push({ sprite, kind, expireAtMs: nowMs + 7000 })
      this.scheduleNextPowerSpawn(nowMs)
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i]
      if (nowMs > p.expireAtMs) {
        p.sprite.destroy()
        this.powerUps.splice(i, 1)
        continue
      }
      if (this.intersects(this.animal.getRect(), this.getSpriteRect(p.sprite))) {
        if (p.kind === 'invincible') {
          this.invincibleUntilMs = Math.max(this.invincibleUntilMs, nowMs + INVISIBILITY_DURATION_MS)
        } else {
          this.livesRemaining = Math.min(MAX_TOTAL_LIVES, this.livesRemaining + 1)
        }
        p.sprite.destroy()
        this.powerUps.splice(i, 1)
      }
    }
  }

  private scheduleNextBombSpawn(nowMs: number) {
    const base = this.level === 1 ? 2800 : this.level === 2 ? 2000 : 1450
    this.nextBombSpawnMs = nowMs + base + Phaser.Math.Between(300, 900)
  }

  private updateBombs(nowMs: number) {
    if (!this.animal) return
    if (nowMs >= this.nextBombSpawnMs) {
      this.spawnBomb(nowMs)
      this.scheduleNextBombSpawn(nowMs)
    }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i]
      if (nowMs - b.bornAtMs > 3200) {
        b.sprite.destroy()
        this.bombs.splice(i, 1)
        continue
      }
      if (nowMs >= this.invincibleUntilMs && this.intersects(this.animal.getRect(), this.getSpriteRect(b.sprite))) {
        this.explodeBomb(b.sprite.x, b.sprite.y)
        b.sprite.destroy()
        this.bombs.splice(i, 1)
        const totalElapsedMs = this.accumulatedMs + (this.timerStarted ? nowMs - this.levelStartMs : 0)
        this.consumeLife(totalElapsedMs)
        return
      }
    }
  }

  private spawnBomb(nowMs: number) {
    const roadLanes = this.lanes.filter((l) => l.isRoad)
    const lane = roadLanes[Phaser.Math.Between(0, roadLanes.length - 1)]
    const x = Phaser.Math.Between(24, GAME_WIDTH - 24)
    const sprite = this.add.image(x, lane.y, 'hazard-bomb').setDisplaySize(28, 28).setDepth(6)
    this.bombs.push({ sprite, bornAtMs: nowMs })
  }

  private explodeBomb(x: number, y: number) {
    const blast = this.add.circle(x, y, 6, 0xff914d, 0.9).setDepth(12)
    this.tweens.add({
      targets: blast,
      radius: 46,
      alpha: 0,
      duration: 260,
      onComplete: () => blast.destroy(),
    })
  }

  private consumeLife(totalElapsedMs: number) {
    if (this.hasEnded) return
    this.livesRemaining -= 1
    if (this.livesRemaining <= 0) {
      this.hasEnded = true
      this.scene.start('LoseScene', { runTimeMs: totalElapsedMs })
      return
    }
    this.hasEnded = true
    this.scene.restart({
      level: this.level,
      accumulatedMs: totalElapsedMs,
      livesRemaining: this.livesRemaining,
      timerStarted: true,
    })
  }

  private advanceLevelOrWin(totalElapsedMs: number) {
    if (this.hasEnded) return
    if (this.level < 3) {
      this.hasEnded = true
      this.scene.start('GameScene', {
        level: (this.level + 1) as 1 | 2 | 3,
        accumulatedMs: totalElapsedMs,
        livesRemaining: this.livesRemaining,
        timerStarted: true,
      })
      return
    }
    this.hasEnded = true
    this.scene.start('WinScene', {
      runTimeMs: totalElapsedMs,
      bonusUnlocked: totalElapsedMs <= BONUS_UNLOCK_TIME_MS,
    })
  }

  private getLevelConfig(level: number): LevelConfig {
    if (level === 2) {
      return {
        level: 2,
        animalName: 'Dog',
        idleTexture: 'dog-idle',
        jumpTexture: 'dog-jump',
        vehicleTextures: {
          car: 'ship-small',
          bus: 'ship-medium',
          truck: 'ship-large',
        },
      }
    }
    if (level === 3) {
      return {
        level: 3,
        animalName: 'Cat',
        idleTexture: 'cat-idle',
        jumpTexture: 'cat-jump',
      }
    }
    return {
      level: 1,
      animalName: 'Frog',
      idleTexture: 'frog-idle',
      jumpTexture: 'frog-jump',
    }
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
}

