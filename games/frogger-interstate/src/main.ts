import Phaser from 'phaser'
import { BonusScene } from './game/scenes/BonusScene'
import { BonusSelectScene } from './game/scenes/BonusSelectScene'
import { BootScene } from './game/scenes/BootScene'
import { GameScene } from './game/scenes/GameScene'
import { LoseScene } from './game/scenes/LoseScene'
import { ModeSelectScene } from './game/scenes/ModeSelectScene'
import { WinScene } from './game/scenes/WinScene'

const rootEl = document.getElementById('app')
if (!rootEl) throw new Error('Missing #app element')

const selectedGame = new URLSearchParams(window.location.search).get('game')

if (selectedGame === 'frogger') {
  document.title = 'Frogger Interstate'
  await import('./style.css')
  rootEl.dataset.game = 'frogger'
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: rootEl,
    width: 960,
    height: 540,
    backgroundColor: '#0b1020',
    render: { antialias: true, pixelArt: false },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, ModeSelectScene, GameScene, WinScene, LoseScene, BonusSelectScene, BonusScene],
  }
  const game = new Phaser.Game(config)
  const watchScenes = () => {
    const names = game.scene.getScenes(true).map((scene) => scene.scene.key)
    rootEl.dataset.scenes = names.join(' ')
  }
  const timer = window.setInterval(watchScenes, 200)
  game.events.on('ready', watchScenes)
  game.events.once(Phaser.Core.Events.DESTROY, () => window.clearInterval(timer))
} else {
  document.title = 'Ranger Park'
  const { mountRangerPark } = await import('./ranger/mount.ts')
  mountRangerPark(rootEl)
}
