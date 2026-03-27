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
  level: 1 | 2 | 3 | 4
  animalName: string
  animalKey: 'chicken' | 'frog' | 'dog' | 'cat'
  idleTexture: string
  jumpTexture: string
  vehicleTextures?: Partial<Record<VehicleKind, string>>
}

type PowerKind = 'invincible' | 'heart'
type Bomb = { sprite: Phaser.GameObjects.Image; bornAtMs: number }
type PowerUp = { sprite: Phaser.GameObjects.Image; kind: PowerKind; expireAtMs: number }
type AnimalRiddle = { question: string; answer: string }
type AnimalKey = 'chicken' | 'frog' | 'dog' | 'cat'
const MAX_MAIN_LEVELS = 4

const RIDDLE_BANK: Record<AnimalKey, AnimalRiddle[]> = {
  chicken: [
    { question: 'Why did the chicken cross the road?', answer: 'To get to the other side.' },
    { question: 'Why did the chicken cross the playground?', answer: 'To get to the other slide.' },
    { question: 'Why did the chicken cross the road halfway?', answer: 'It wanted to lay it on the line.' },
    { question: 'Why did the chicken cross the road with a band?', answer: 'To drum up some peck-tacular fans.' },
    { question: 'Why did the chicken cross the road at noon?', answer: 'For an egg-stra sunny stroll.' },
    { question: 'Why did the chicken cross the road twice?', answer: 'It forgot its peck-list.' },
  ],
  frog: [
    { question: 'Why did the frog cross the road?', answer: 'To see what the chicken was doing.' },
    { question: 'Why did the frog hop across the highway?', answer: 'To reach a lily pad on the other side.' },
    { question: 'Why did the frog cross the road in one jump?', answer: 'It did not want to croak in traffic.' },
    { question: 'Why did the frog cross the road at night?', answer: 'To catch the brightest bugs.' },
    { question: 'Why did the frog cross the road during rain?', answer: 'Because every puddle looked like home.' },
    { question: 'Why did the frog cross the road smiling?', answer: 'It heard a toad-ally good joke.' },
  ],
  dog: [
    { question: 'Why did the dog cross the road?', answer: 'To get to the barking lot.' },
    { question: 'Why did the dog cross the road so fast?', answer: 'It smelled treats on the other side.' },
    { question: 'Why did the dog cross the road after the chicken?', answer: 'Someone had to fetch the punchline.' },
    { question: 'Why did the dog cross the road with a leash?', answer: 'It was on a walk of fame.' },
    { question: 'Why did the dog cross the road and back again?', answer: 'It thought the first trip was just practice.' },
    { question: 'Why did the dog cross the road at sunset?', answer: 'To chase one last golden squirrel shadow.' },
  ],
  cat: [
    { question: 'Why did the cat cross the road?', answer: 'To chase the mouse on the other side.' },
    { question: 'Why did the cat cross the road quietly?', answer: 'It was on a stealth mission.' },
    { question: 'Why did the cat cross the road and stare?', answer: 'It wanted to judge both sidewalks.' },
    { question: 'Why did the cat cross the road at midnight?', answer: 'Because moonbeams make the best runways.' },
    { question: 'Why did the cat cross the road with style?', answer: 'Every crossing is a catwalk.' },
    { question: 'Why did the cat cross the road slowly?', answer: 'It was calculating every pounce.' },
  ],
}

const lastRiddleIndexByAnimal: Partial<Record<AnimalKey, number>> = {}

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

  private level = 1 as 1 | 2 | 3 | 4
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
    this.level = Phaser.Math.Clamp(data?.level ?? 1, 1, MAX_MAIN_LEVELS) as 1 | 2 | 3 | 4
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
        `Level ${this.level}/${MAX_MAIN_LEVELS} (${this.levelConfig.animalName})   Lives ${this.livesRemaining}   Time ${(totalElapsedMs / 1000).toFixed(1)}s   Traffic x${difficultyMultiplier.toFixed(2)}   Power ${activePower}`,
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
    const base =
      this.level === 1 ? 3300 : this.level === 2 ? 2800 : this.level === 3 ? 2000 : 1450
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

    this.hasEnded = true
    const animalName = this.levelConfig.animalName
    const riddle = this.getCrossingRiddle(animalName)
    const clickBlocker = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35)
      .setDepth(49)
      .setInteractive()
    const card = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 160, 220, 0x0b1230, 0.95)
      .setStrokeStyle(2, 0x5c6fb5, 0.85)
      .setDepth(50)
    const question = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 42, riddle.question, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '33px',
        color: '#f5f7ff',
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(51)
    const answer = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, riddle.answer, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '25px',
        align: 'center',
        color: '#b8c2ff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(51)
      .setVisible(false)
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 76, 'Click or press Enter to reveal answer', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '19px',
        color: '#d7e2ff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(51)

    let revealed = false
    const cleanup = () => {
      clickBlocker.destroy()
      card.destroy()
      question.destroy()
      answer.destroy()
      hint.destroy()
      this.input.keyboard?.off('keydown-ENTER', onAdvance)
    }
    const goNext = () => {
      if (this.level < MAX_MAIN_LEVELS) {
        this.scene.start('GameScene', {
          level: (this.level + 1) as 1 | 2 | 3 | 4,
          accumulatedMs: totalElapsedMs,
          livesRemaining: this.livesRemaining,
          timerStarted: true,
        })
        return
      }
      this.scene.start('WinScene', {
        runTimeMs: totalElapsedMs,
        bonusUnlocked: totalElapsedMs <= BONUS_UNLOCK_TIME_MS,
        animalName,
      })
    }
    const onAdvance = () => {
      if (!revealed) {
        revealed = true
        answer.setVisible(true)
        hint.setText('Click or press Enter to continue')
        return
      }
      cleanup()
      goNext()
    }
    clickBlocker.on('pointerdown', onAdvance)
    this.input.keyboard?.on('keydown-ENTER', onAdvance)
  }

  private getCrossingRiddle(animalName: string): AnimalRiddle {
    const lower = animalName.toLowerCase() as AnimalKey
    const bank = RIDDLE_BANK[lower] ?? [{ question: `Why did the ${lower} cross the road?`, answer: 'To get to the other side.' }]
    if (bank.length === 1) return bank[0]
    const last = lastRiddleIndexByAnimal[lower] ?? -1
    let idx = Phaser.Math.Between(0, bank.length - 1)
    if (idx === last) idx = (idx + 1 + Phaser.Math.Between(0, bank.length - 2)) % bank.length
    lastRiddleIndexByAnimal[lower] = idx
    return bank[idx]
  }

  private getLevelConfig(level: number): LevelConfig {
    if (level === 1) {
      return {
        level: 1,
        animalName: 'Chicken',
        animalKey: 'chicken',
        idleTexture: 'chicken-idle',
        jumpTexture: 'chicken-jump',
        vehicleTextures: {
          car: 'street-car',
          bus: 'street-bus',
          truck: 'street-truck',
        },
      }
    }
    if (level === 2) {
      return {
        level: 2,
        animalName: 'Frog',
        animalKey: 'frog',
        idleTexture: 'frog-idle',
        jumpTexture: 'frog-jump',
        vehicleTextures: {
          car: 'street-car',
          bus: 'street-bus',
          truck: 'street-truck',
        },
      }
    }
    if (level === 3) {
      return {
        level: 3,
        animalName: 'Dog',
        animalKey: 'dog',
        idleTexture: 'dog-idle',
        jumpTexture: 'dog-jump',
        vehicleTextures: {
          car: 'ship-small',
          bus: 'ship-medium',
          truck: 'ship-large',
        },
      }
    }
    if (level === 4) {
      return {
        level: 4,
        animalName: 'Cat',
        animalKey: 'cat',
        idleTexture: 'cat-idle',
        jumpTexture: 'cat-jump',
        vehicleTextures: {
          car: 'train-small',
          bus: 'train-medium',
          truck: 'train-large',
        },
      }
    }
    return {
      level: 1,
      animalName: 'Chicken',
      animalKey: 'chicken',
      idleTexture: 'chicken-idle',
      jumpTexture: 'chicken-jump',
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

