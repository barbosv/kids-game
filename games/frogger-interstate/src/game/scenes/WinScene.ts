import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, MAX_LIVES } from '../constants'

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
  }) {
    const runTimeMs = data?.runTimeMs ?? 0
    const bonusUnlocked = data?.bonusUnlocked ?? false
    const bonusScore = data?.bonusScore
    const bonusAnimal = data?.bonusAnimal ?? 'bonus'
    const animalName = (data?.animalName ?? 'animal').toLowerCase()
    const sortedScores = [...sessionScores].sort((a, b) => a.timeMs - b.timeMs)
    const bestRecord = sortedScores[0] ?? null

    const title = this.add
      .text(GAME_WIDTH / 2, 110, 'Congratulations Winner!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '46px',
        color: '#f5f7ff',
      })
      .setOrigin(0.5, 0.5)

    const result = this.add
      .text(
        GAME_WIDTH / 2,
        165,
        `Why did the ${animalName} cross the road?`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '31px',
          color: '#c8d3ff',
        },
      )
      .setOrigin(0.5, 0.5)

    const timing = this.add
      .text(GAME_WIDTH / 2, 198, `You finished all levels in ${formatTime(runTimeMs)}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '20px',
        color: '#d7e2ff',
      })
      .setOrigin(0.5, 0.5)

    const best = this.add
      .text(
        GAME_WIDTH / 2,
        228,
        `Best Time: ${bestRecord ? `${bestRecord.name} - ${formatTime(bestRecord.timeMs)}` : 'none'}`,
        {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '18px',
          color: '#b4f0ff',
        },
      )
      .setOrigin(0.5, 0.5)

    const scoreCount = this.add
      .text(GAME_WIDTH / 2, 252, `Scores saved this session: ${sessionScores.length}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '16px',
        color: '#b3ffd4',
      })
      .setOrigin(0.5, 0.5)

    const topScores = sortedScores
      .slice(0, 5)
      .map((r, i) => `#${i + 1} ${r.name} - ${formatTime(r.timeMs)}`)
      .join('\n')
    const recentScores = this.add
      .text(GAME_WIDTH / 2, 300, `Top Scores\n${topScores}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        color: '#d0ecff',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0.5)

    const bonusTop = [...bonusSessionScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s, i) => `#${i + 1} ${s.name} - ${s.score} (${s.animal})`)
      .join('\n')
    const bonusText = this.add
      .text(
        GAME_WIDTH / 2,
        364,
        bonusTop ? `Top Bonus Scores\n${bonusTop}` : 'Top Bonus Scores\nnone yet',
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
      .text(GAME_WIDTH / 2 - 130, GAME_HEIGHT - 90, 'Restart', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#d8ffe0',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })

    const finish = this.add
      .text(GAME_WIDTH / 2 + 130, GAME_HEIGHT - 90, 'Finish Game', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#ffd3d3',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })

    const bonus = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 130, bonusUnlocked ? 'Bonus Level' : 'Bonus Locked <25s needed', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: bonusUnlocked ? '#fef08a' : '#8f9abf',
      })
      .setOrigin(0.5, 0.5)

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
    }
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
        this.scene.start('GameScene', {
          level: 1,
          accumulatedMs: 0,
          livesRemaining: MAX_LIVES,
          timerStarted: false,
        })
      })
    }
    const doBonus = () => {
      if (this.isNameEntryOpen) return
      this.scene.start('BonusSelectScene', { runTimeMs })
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
    result.setDepth(10)
    timing.setDepth(10)
    best.setDepth(10)
    scoreCount.setDepth(10)
    recentScores.setDepth(10)
    bonusText.setDepth(10)
    restart.setDepth(10)
    finish.setDepth(10)
    bonus.setDepth(10)
    hint.setDepth(10)
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

