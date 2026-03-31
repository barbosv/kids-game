import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../constants'

export type BonusAnimal = 'chicken' | 'frog' | 'dog' | 'cat'

export class BonusSelectScene extends Phaser.Scene {
  constructor() {
    super('BonusSelectScene')
  }

  private runTimeMs = 0

  create() {
    this.runTimeMs = (this.scene.settings.data as { runTimeMs?: number } | undefined)?.runTimeMs ?? 0
    this.cameras.main.setBackgroundColor('#0f1530')

    this.add
      .text(GAME_WIDTH / 2, 90, 'Bonus Level Unlocked!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)

    this.add
      .text(GAME_WIDTH / 2, 150, 'Choose your animal. You have 30s to collect as many moving items as possible.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#c9d6ff',
      })
      .setOrigin(0.5, 0.5)

    this.createChoice(GAME_WIDTH / 2 - 330, GAME_HEIGHT / 2 + 20, 'Chicken', 'chicken-idle', 'Collect worms', 'chicken')
    this.createChoice(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 + 20, 'Frog', 'frog-idle', 'Collect flies', 'frog')
    this.createChoice(GAME_WIDTH / 2 + 110, GAME_HEIGHT / 2 + 20, 'Dog', 'dog-idle', 'Collect treats', 'dog')
    this.createChoice(GAME_WIDTH / 2 + 330, GAME_HEIGHT / 2 + 20, 'Cat', 'cat-idle', 'Collect mice', 'cat')

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 54, 'Press 1 Chicken, 2 Frog, 3 Dog, 4 Cat, or click a card', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#a6b4e8',
      })
      .setOrigin(0.5, 0.5)

    this.input.keyboard?.once('keydown-ONE', () => this.startBonus('chicken'))
    this.input.keyboard?.once('keydown-TWO', () => this.startBonus('frog'))
    this.input.keyboard?.once('keydown-THREE', () => this.startBonus('dog'))
    this.input.keyboard?.once('keydown-FOUR', () => this.startBonus('cat'))
  }

  private createChoice(
    x: number,
    y: number,
    label: string,
    texture: string,
    objective: string,
    animal: BonusAnimal,
  ) {
    const card = this.add.rectangle(x, y, 170, 250, 0x1b2653, 0.95)
    card.setStrokeStyle(3, 0x5162a8, 0.85)
    card.setInteractive({ useHandCursor: true })
    card.on('pointerdown', () => this.startBonus(animal))

    this.add.image(x, y - 48, texture, 0).setDisplaySize(74, 74)
    this.add
      .text(x, y + 20, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)
    this.add
      .text(x, y + 56, objective, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#9fd7ff',
      })
      .setOrigin(0.5, 0.5)
  }

  private startBonus(animal: BonusAnimal) {
    this.scene.start('BonusScene', { animal, runTimeMs: this.runTimeMs })
  }
}

