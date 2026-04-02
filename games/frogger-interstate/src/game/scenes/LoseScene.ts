import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../constants'

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((ms % 1000) / 10)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

export class LoseScene extends Phaser.Scene {
  constructor() {
    super('LoseScene')
  }

  create(data?: { runTimeMs?: number }) {
    const runTimeMs = data?.runTimeMs ?? 0

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'Game Over - Out of Lives', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: '#ffe7e7',
      })
      .setOrigin(0.5, 0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, `Final time: ${formatTime(runTimeMs)}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '24px',
        color: '#ffd9d9',
      })
      .setOrigin(0.5, 0.5)

    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'Tap or press Enter to choose mode and play again', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffc2c2',
      })
      .setOrigin(0.5, 0.5)

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('ModeSelectScene'))
    this.input.once('pointerdown', () => this.scene.start('ModeSelectScene'))

    title.setDepth(10)
    sub.setDepth(10)
  }
}

