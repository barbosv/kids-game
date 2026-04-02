import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, MAX_LIVES } from '../constants'

export type GameMode = 'crossing' | 'logs'

export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelectScene')
  }

  private selectedMode: GameMode = 'crossing'
  private crossingCard: Phaser.GameObjects.Rectangle | null = null
  private logsCard: Phaser.GameObjects.Rectangle | null = null

  create() {
    this.cameras.main.setBackgroundColor('#0c1433')

    this.add
      .text(GAME_WIDTH / 2, 82, 'Choose Your Game', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)

    this.add
      .text(GAME_WIDTH / 2, 130, 'Select a mode to begin', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '21px',
        color: '#b6c5f3',
      })
      .setOrigin(0.5, 0.5)

    this.crossingCard = this.createModeCard(
      GAME_WIDTH / 2 - 230,
      GAME_HEIGHT / 2 + 20,
      'Animal Crossing',
      'Dodge traffic and cross lanes',
      'chicken-idle',
      'crossing',
    )
    this.logsCard = this.createModeCard(
      GAME_WIDTH / 2 + 230,
      GAME_HEIGHT / 2 + 20,
      'Jumping Logs',
      'Cross river by riding moving logs',
      'frog-idle',
      'logs',
    )
    this.applySelectionStyle()

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 52, 'Press 1/2 or Left/Right then Enter, or click a card', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#a6b4e8',
      })
      .setOrigin(0.5, 0.5)

    this.input.keyboard?.once('keydown-ONE', () => this.startMode('crossing'))
    this.input.keyboard?.once('keydown-TWO', () => this.startMode('logs'))
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.selectedMode = 'crossing'
      this.applySelectionStyle()
    })
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.selectedMode = 'logs'
      this.applySelectionStyle()
    })
    this.input.keyboard?.on('keydown-ENTER', () => this.startMode(this.selectedMode))

    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0')
      this.game.canvas.focus()
    }
  }

  private createModeCard(
    x: number,
    y: number,
    title: string,
    subtitle: string,
    texture: string,
    mode: GameMode,
  ) {
    const card = this.add.rectangle(x, y, 330, 260, 0x1b2653, 0.95)
    card.setStrokeStyle(3, 0x5162a8, 0.85)
    card.setInteractive({ useHandCursor: true })
    card.on('pointerover', () => {
      this.selectedMode = mode
      this.applySelectionStyle()
    })
    card.on('pointerdown', () => this.startMode(mode))

    this.add.image(x, y - 48, texture, 0).setDisplaySize(86, 86)
    this.add
      .text(x, y + 38, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)
    this.add
      .text(x, y + 80, subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#9fd7ff',
        align: 'center',
      })
      .setOrigin(0.5, 0.5)

    return card
  }

  private startMode(mode: GameMode) {
    this.scene.start('GameScene', {
      gameMode: mode,
      level: 1,
      accumulatedMs: 0,
      livesRemaining: MAX_LIVES,
      timerStarted: false,
    })
  }

  private applySelectionStyle() {
    const selected = 0xf8fafc
    const normal = 0x5162a8
    if (this.crossingCard) {
      this.crossingCard.setStrokeStyle(4, this.selectedMode === 'crossing' ? selected : normal, 0.95)
    }
    if (this.logsCard) {
      this.logsCard.setStrokeStyle(4, this.selectedMode === 'logs' ? selected : normal, 0.95)
    }
  }
}

