import './style.css'
import Phaser from 'phaser'
import { BonusScene } from './game/scenes/BonusScene'
import { BonusSelectScene } from './game/scenes/BonusSelectScene'
import { BootScene } from './game/scenes/BootScene'
import { GameScene } from './game/scenes/GameScene'
import { LoseScene } from './game/scenes/LoseScene'
import { WinScene } from './game/scenes/WinScene'

const rootEl = document.getElementById('app')
if (!rootEl) throw new Error('Missing #app element')

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: rootEl,
  width: 960,
  height: 540,
  backgroundColor: '#0b1020',
  render: { antialias: true, pixelArt: false },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, GameScene, WinScene, LoseScene, BonusSelectScene, BonusScene],
}

new Phaser.Game(config)
