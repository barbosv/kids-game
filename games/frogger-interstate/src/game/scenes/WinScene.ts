import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../constants'
import type { GameMode } from './ModeSelectScene'

type ScoreRecord = { name: string; timeMs: number }
const sessionScores: ScoreRecord[] = []
type BonusScoreRecord = { name: string; score: number; animal: string }
const bonusSessionScores: BonusScoreRecord[] = []

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((ms % 1000) / 10)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

export class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene')
  }

  private isNameEntryOpen = false
  private readonly maxNameLength = 32

  create(data?: {
    runTimeMs?: number
    bonusUnlocked?: boolean
    bonusScore?: number
    bonusAnimal?: string
    animalName?: string
    gameMode?: GameMode
  }) {
    const runTimeMs = data?.runTimeMs ?? 0
    const bonusUnlocked = data?.bonusUnlocked ?? false
    const bonusScore = data?.bonusScore
    const bonusAnimal = data?.bonusAnimal ?? 'bonus'
    const gameMode = data?.gameMode ?? 'crossing'
    this.launchConfetti()

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 80, GAME_HEIGHT - 80, 0x0b1230, 0.72).setStrokeStyle(2, 0x4f67a8, 0.7).setDepth(4)

    const title = this.add
      .text(GAME_WIDTH / 2, 72, 'Congratulations Winner!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)

    const timing = this.add
      .text(GAME_WIDTH / 2, 110, `Run Complete - Total Time ${formatTime(runTimeMs)}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '20px',
        color: '#d7e2ff',
      })
      .setOrigin(0.5, 0.5)

    this.add.rectangle(200, 168, 250, 56, 0x1a2550, 0.9).setStrokeStyle(1, 0x4d62a3, 0.7).setDepth(6)
    this.add.rectangle(480, 168, 250, 56, 0x1a2550, 0.9).setStrokeStyle(1, 0x4d62a3, 0.7).setDepth(6)
    this.add.rectangle(760, 168, 250, 56, 0x1a2550, 0.9).setStrokeStyle(1, 0x4d62a3, 0.7).setDepth(6)

    const recentRun = this.add
      .text(200, 168, `Most Recent\n${formatTime(runTimeMs)}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: '#fef3c7',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0.5)

    const best = this.add
      .text(480, 168, 'Best Time\nnone', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: '#b4f0ff',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0.5)

    const scoreCount = this.add
      .text(760, 168, 'Session Scores\n0', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: '#b3ffd4',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0.5)

    this.add.rectangle(280, 322, 420, 220, 0x131d43, 0.92).setStrokeStyle(1, 0x4d62a3, 0.7).setDepth(6)
    this.add.rectangle(680, 322, 420, 220, 0x131d43, 0.92).setStrokeStyle(1, 0x4d62a3, 0.7).setDepth(6)

    const recentScores = this.add
      .text(280, 316, 'Top Times\nnone yet', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: '#d0ecff',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0.5)

    const bonusText = this.add
      .text(
        680,
        316,
        'Top Bonus Scores\nnone yet',
        {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '13px',
          color: '#ffd9a6',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5, 0.5)

    const restart = this.add
      .text(GAME_WIDTH / 2 - 140, GAME_HEIGHT - 88, 'Restart', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#d8ffe0',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })

    const finish = this.add
      .text(GAME_WIDTH / 2 + 140, GAME_HEIGHT - 88, 'Finish Game', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffd3d3',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })

    const bonus = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 130, bonusUnlocked ? 'Play Bonus Level' : '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: bonusUnlocked ? '#fef08a' : '#8f9abf',
      })
      .setOrigin(0.5, 0.5)
    if (!bonusUnlocked) bonus.setVisible(false)

    const hint = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 50,
        bonusUnlocked ? 'Press R restart, F finish, B bonus' : 'Press R restart or F finish',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#b8c2ff',
        },
      )
      .setOrigin(0.5, 0.5)

    let saved = false
    const saveRunAndMaybeBonus = (name: string) => {
      if (saved) return
      saved = true
      if (runTimeMs > 0) sessionScores.push({ name, timeMs: runTimeMs })
      if (typeof bonusScore === 'number') {
        bonusSessionScores.push({ name, score: bonusScore, animal: bonusAnimal })
      }
      refreshScoreTexts(name)
    }
    const refreshScoreTexts = (recentName?: string) => {
      const sortedScores = [...sessionScores].sort((a, b) => a.timeMs - b.timeMs)
      const bestRecord = sortedScores[0] ?? null
      const topScores = sortedScores
        .slice(0, 5)
        .map((r, i) => `#${i + 1} ${r.name} - ${formatTime(r.timeMs)}`)
        .join('\n')
      recentScores.setText(topScores ? `Top Times\n${topScores}` : 'Top Times\nnone yet')
      const bonusTop = [...bonusSessionScores]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((s, i) => `#${i + 1} ${s.name} - ${s.score} (${s.animal})`)
        .join('\n')
      bonusText.setText(bonusTop ? `Top Bonus Scores\n${bonusTop}` : 'Top Bonus Scores\nnone yet')
      recentRun.setText(
        `Most Recent\n${recentName ?? 'Current Run'} - ${formatTime(runTimeMs)}${typeof bonusScore === 'number' ? ` Bonus ${bonusScore}` : ''}`,
      )
      best.setText(`Best Time\n${bestRecord ? `${bestRecord.name} - ${formatTime(bestRecord.timeMs)}` : 'none'}`)
      scoreCount.setText(`Session Scores\n${sessionScores.length}`)
    }
    refreshScoreTexts()
    const ensureSaved = (afterSave: () => void) => {
      if (saved) {
        afterSave()
        return
      }
      this.openNameEntry((name) => {
        saveRunAndMaybeBonus(name)
        afterSave()
      })
    }

    if (!bonusUnlocked || typeof bonusScore === 'number') {
      ensureSaved(() => {})
    }

    const doRestart = () => {
      if (this.isNameEntryOpen) return
      ensureSaved(() => {
        this.scene.start('ModeSelectScene')
      })
    }
    const doBonus = () => {
      if (this.isNameEntryOpen) return
      this.scene.start('BonusSelectScene', { runTimeMs, gameMode })
    }
    const doFinish = () => {
      if (this.isNameEntryOpen) return
      ensureSaved(() => {
        restart.disableInteractive()
        finish.disableInteractive()
        bonus.disableInteractive()
        hint.setText('Game finished. Close tab or press R to play again.')
      })
    }

    restart.on('pointerdown', doRestart)
    finish.on('pointerdown', doFinish)
    if (bonusUnlocked) {
      bonus.setInteractive({ useHandCursor: true })
      bonus.on('pointerdown', doBonus)
      this.input.keyboard?.on('keydown-B', doBonus)
    }
    this.input.keyboard?.on('keydown-ENTER', doFinish)
    this.input.keyboard?.on('keydown-R', doRestart)
    this.input.keyboard?.on('keydown-F', doFinish)

    title.setDepth(10)
    timing.setDepth(10)
    best.setDepth(10)
    scoreCount.setDepth(10)
    recentScores.setDepth(10)
    bonusText.setDepth(10)
    recentRun.setDepth(10)
    restart.setDepth(10)
    finish.setDepth(10)
    bonus.setDepth(10)
    hint.setDepth(10)
  }

  private launchConfetti() {
    const colors = [0xf43f5e, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0xeab308]
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(12, GAME_WIDTH - 12)
      const y = Phaser.Math.Between(-120, -8)
      const size = Phaser.Math.Between(4, 10)
      const piece = this.add.rectangle(x, y, size, size * 0.55, colors[Phaser.Math.Between(0, colors.length - 1)], 0.95)
      piece.setAngle(Phaser.Math.Between(0, 360)).setDepth(6)
      this.tweens.add({
        targets: piece,
        y: GAME_HEIGHT + Phaser.Math.Between(20, 140),
        x: x + Phaser.Math.Between(-70, 70),
        angle: piece.angle + Phaser.Math.Between(220, 760),
        alpha: { from: 1, to: 0.3 },
        duration: Phaser.Math.Between(1800, 3400),
        delay: Phaser.Math.Between(0, 900),
        ease: 'Cubic.easeIn',
        onComplete: () => piece.destroy(),
      })
    }
  }

  private openNameEntry(onSubmit: (name: string) => void) {
    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 180, 190, 0x0b1230, 0.94)
      .setStrokeStyle(2, 0x5c6fb5, 0.8)
      .setDepth(40)
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 48, 'Enter your name', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(41)
    let current = ''
    const input = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '_', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '30px',
        color: '#bfe6ff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(41)
    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 46, 'Type and press Enter', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#aab8e8',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(41)

    const render = () => {
      input.setText(current || '_')
    }
    render()

    const finish = () => {
      this.input.keyboard?.off('keydown', keyHandler)
      overlay.destroy()
      title.destroy()
      input.destroy()
      sub.destroy()
      this.isNameEntryOpen = false
      const name = current.trim() || 'Player'
      onSubmit(name.slice(0, this.maxNameLength))
    }
    this.isNameEntryOpen = true
    const keyHandler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Enter') {
        finish()
        return
      }
      if (event.key === 'Backspace') {
        current = current.slice(0, -1)
        render()
        return
      }
      if (
        event.key.length === 1 &&
        /^[a-zA-Z0-9 _-]$/.test(event.key) &&
        current.length < this.maxNameLength
      ) {
        current += event.key
        render()
      }
    }
    this.input.keyboard?.on('keydown', keyHandler)
  }
}

