import Phaser from 'phaser'
import type { ProjectId } from '../content/types.ts'
import { HAT_COLORS, type ParkSnapshot, type ParkVisitor } from '../presentation/snapshot.ts'
import { PARK_EDGES, PARK_NODES, isParkNode, pathBetween, type ParkNodeId } from '../presentation/layout.ts'

export type ParkHooks = {
  onDestination?: (nodeId: ParkNodeId) => void
  onArrived?: (nodeId: ParkNodeId, bundleId?: string) => void
}

export class ParkScene extends Phaser.Scene {
  private hooks: ParkHooks = {}
  private ranger!: Phaser.GameObjects.Image
  private rangerNode: ParkNodeId = 'gate'
  private moveGen = 0
  private pendingBundle: string | undefined
  private effects!: Phaser.GameObjects.Container
  private visitors = new Map<string, Phaser.GameObjects.Image>()
  private visitorNodes = new Map<string, ParkNodeId>()
  private bundleIcons = new Map<string, Phaser.GameObjects.Image>()
  private highlight!: Phaser.GameObjects.Ellipse
  private campsiteBuilt!: Phaser.GameObjects.Container
  private campsiteBare!: Phaser.GameObjects.Container
  private bridge!: Phaser.GameObjects.Container
  private gap!: Phaser.GameObjects.Container
  private tower!: Phaser.GameObjects.Container
  private towerBare!: Phaser.GameObjects.Container
  private wildlife!: Phaser.GameObjects.Container
  private flowers!: Phaser.GameObjects.Container
  private banner!: Phaser.GameObjects.Image
  private birdhouse!: Phaser.GameObjects.Container
  private built: Record<ProjectId, boolean> = { campsite: false, trail: false, lookout: false }

  constructor() {
    super('ParkScene')
  }

  setHooks(hooks: ParkHooks): void {
    this.hooks = hooks
  }

  create(): void {
    this.drawGround()
    this.drawPaths()
    this.drawPond()
    this.drawTrees()
    this.drawCenter()
    this.campsiteBare = this.drawTents(false)
    this.campsiteBuilt = this.drawTents(true)
    this.gap = this.drawBridge(false).setDepth(2)
    this.bridge = this.drawBridge(true).setDepth(2)
    this.towerBare = this.drawTower(false)
    this.tower = this.drawTower(true)
    this.wildlife = this.drawWildlife()
    this.flowers = this.drawFlowers()
    this.banner = this.add.image(270, 268, this.bannerTexture()).setVisible(false)
    this.birdhouse = this.drawBirdhouse()
    this.paintPeople()
    this.ranger = this.add.image(PARK_NODES.gate.x, PARK_NODES.gate.y, 'ranger-pine').setOrigin(0.5, 1).setDepth(5)
    this.effects = this.add.container(0, 0).setDepth(8)
    this.highlight = this.add.ellipse(PARK_NODES.gate.x, PARK_NODES.gate.y - 8, 78, 36, 0xfff3bf, 0.01).setStrokeStyle(4, 0xc47b12, 0.95).setDepth(4)
    this.pulseHighlight()
    for (const node of Object.values(PARK_NODES)) {
      if (node.bundleId) {
        const icon = this.add.image(node.x + 28, node.y - 34, 'supply-crate').setDepth(4)
        this.bundleIcons.set(node.bundleId, icon)
      }
      const zone = this.add.circle(node.x, node.y - 16, 40, 0xffffff, 0.001).setDepth(6)
      zone.setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => this.hooks.onDestination?.(node.id))
      this.add
        .text(node.x, node.y + 18, node.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#1c2a22',
          backgroundColor: '#fff8ee',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 0)
        .setDepth(6)
    }
    this.game.events.emit('park-ready', this)
  }

  shutdown(): void {
    this.moveGen += 1
    this.tweens.killAll()
    this.hooks = {}
    this.visitors.clear()
    this.visitorNodes.clear()
  }

  reset(snapshot: ParkSnapshot): void {
    this.moveGen += 1
    this.tweens.killAll()
    this.effects?.removeAll(true)
    this.pendingBundle = undefined
    this.rangerNode = 'gate'
    this.built = { campsite: false, trail: false, lookout: false }
    for (const visitor of this.visitors.values()) visitor.destroy()
    this.visitors.clear()
    this.visitorNodes.clear()
    if (this.ranger) {
      this.ranger.setPosition(PARK_NODES.gate.x, PARK_NODES.gate.y)
    }
    this.pulseHighlight()
    this.sync(snapshot)
  }

  private pulseHighlight(): void {
    if (!this.highlight) return
    this.tweens.add({ targets: this.highlight, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 700 })
  }

  sync(snapshot: ParkSnapshot): void {
    if (!this.ranger) return
    this.ranger.setTexture(`ranger-${snapshot.avatarId}`)
    for (const id of ['campsite', 'trail', 'lookout'] as const) {
      if (snapshot.built[id] && !this.built[id]) {
        this.built[id] = true
        const node = id === 'trail' ? 'crossing' : id
        this.burst(PARK_NODES[node].x, PARK_NODES[node].y - 40)
      } else if (!snapshot.built[id]) {
        this.built[id] = false
      }
    }
    this.campsiteBuilt.setVisible(this.built.campsite)
    this.campsiteBare.setVisible(!this.built.campsite)
    this.bridge.setVisible(this.built.trail)
    this.gap.setVisible(!this.built.trail)
    this.tower.setVisible(this.built.lookout)
    this.towerBare.setVisible(!this.built.lookout)
    this.wildlife.setVisible(snapshot.showWildlife)
    this.flowers.setVisible(snapshot.decorations.includes('flowers'))
    this.banner.setVisible(snapshot.decorations.includes('banner'))
    this.birdhouse.setVisible(snapshot.decorations.includes('birdhouse'))
    for (const bundle of snapshot.bundles) {
      this.bundleIcons.get(bundle.id)?.setVisible(bundle.available)
    }
    if (snapshot.focusNodeId) {
      const node = PARK_NODES[snapshot.focusNodeId]
      this.highlight.setPosition(node.x, node.y - 8).setVisible(true)
    } else {
      this.highlight.setVisible(false)
    }
    const seen = new Set<string>()
    snapshot.visitors.forEach((visitor, index) => {
      seen.add(visitor.id)
      this.placeVisitor(visitor, index)
    })
    for (const [id, sprite] of this.visitors) {
      if (seen.has(id)) continue
      sprite.destroy()
      this.visitors.delete(id)
      this.visitorNodes.delete(id)
    }
  }

  walkTo(nodeId: string, bundleId?: string): void {
    if (!isParkNode(nodeId) || !this.ranger) return
    const gen = ++this.moveGen
    this.tweens.killTweensOf(this.ranger)
    this.pendingBundle = bundleId
    const steps = pathBetween(this.rangerNode, nodeId)
    if (steps.length === 0) {
      this.finishWalk(gen, nodeId)
      return
    }
    const step = (index: number) => {
      if (gen !== this.moveGen) return
      const nextId = steps[index]
      if (!nextId) {
        this.finishWalk(gen, nodeId)
        return
      }
      const next = PARK_NODES[nextId]
      this.ranger.setFlipX(next.x < this.ranger.x)
      this.tweens.add({
        targets: this.ranger,
        x: next.x,
        y: next.y,
        duration: 420,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (gen !== this.moveGen) return
          this.rangerNode = nextId
          step(index + 1)
        },
      })
    }
    step(0)
  }

  celebrate(nodeId: string): void {
    if (!isParkNode(nodeId)) return
    const node = PARK_NODES[nodeId]
    this.burst(node.x, node.y - 30)
  }

  private finishWalk(gen: number, nodeId: ParkNodeId): void {
    if (gen !== this.moveGen) return
    this.rangerNode = nodeId
    const bundleId = this.pendingBundle
    this.pendingBundle = undefined
    this.hooks.onArrived?.(nodeId, bundleId)
  }

  private placeVisitor(visitor: ParkVisitor, index: number): void {
    const key = `visitor-${index}`
    let sprite = this.visitors.get(visitor.id)
    if (!sprite) {
      sprite = this.add.image(PARK_NODES.gate.x + index * 18, PARK_NODES.gate.y, key).setOrigin(0.5, 1).setScale(0.78).setDepth(5)
      this.visitors.set(visitor.id, sprite)
    }
    if (this.visitorNodes.get(visitor.id) === visitor.nodeId) return
    this.visitorNodes.set(visitor.id, visitor.nodeId)
    const node = PARK_NODES[visitor.nodeId]
    const offset = (index - 2) * 22
    this.tweens.add({
      targets: sprite,
      x: node.x + offset,
      y: node.y + 6,
      duration: 700,
      ease: 'Sine.easeInOut',
    })
  }

  private burst(x: number, y: number): void {
    if (!this.effects) return
    for (let i = 0; i < 8; i += 1) {
      const dot = this.add.circle(x, y, 5, i % 2 === 0 ? 0xffd166 : 0x2f6b45)
      this.effects.add(dot)
      this.tweens.add({
        targets: dot,
        x: x + Math.cos((Math.PI * 2 * i) / 8) * 46,
        y: y + Math.sin((Math.PI * 2 * i) / 8) * 28,
        alpha: 0,
        duration: 520,
        onComplete: () => dot.destroy(),
      })
    }
  }

  private drawGround(): void {
    this.add.rectangle(480, 180, 960, 360, 0xb9e3f8)
    this.add.ellipse(180, 210, 280, 90, 0x8fd18a)
    this.add.ellipse(520, 190, 420, 120, 0x7bc47a)
    this.add.ellipse(820, 220, 300, 110, 0x69b86a)
    this.add.rectangle(480, 420, 960, 240, 0x8dcc78)
    this.add.ellipse(700, 250, 220, 70, 0x4aa3c7)
  }

  private drawPaths(): void {
    const graphics = this.add.graphics()
    graphics.lineStyle(18, 0xc9a06a, 1)
    for (const [a, b] of PARK_EDGES) {
      graphics.beginPath()
      graphics.moveTo(PARK_NODES[a].x, PARK_NODES[a].y)
      graphics.lineTo(PARK_NODES[b].x, PARK_NODES[b].y)
      graphics.strokePath()
    }
    graphics.lineStyle(6, 0xf3ddb0, 0.9)
    for (const [a, b] of PARK_EDGES) {
      graphics.beginPath()
      graphics.moveTo(PARK_NODES[a].x, PARK_NODES[a].y)
      graphics.lineTo(PARK_NODES[b].x, PARK_NODES[b].y)
      graphics.strokePath()
    }
  }

  private drawPond(): void {
    this.add.ellipse(560, 250, 150, 78, 0x3d8eb8)
    this.add.ellipse(575, 242, 70, 24, 0x8fd0ea, 0.7)
  }

  private drawTrees(): void {
    const spots = [
      [150, 120],
      [230, 90],
      [520, 70],
      [760, 70],
      [80, 250],
      [930, 250],
      [330, 260],
    ]
    for (const [x, y] of spots) {
      this.add.rectangle(x!, y! + 28, 10, 28, 0x8a5a32)
      this.add.circle(x!, y!, 28, 0x2f6b45)
      this.add.circle(x! + 16, y! + 8, 18, 0x3e8a52)
    }
  }

  private drawCenter(): void {
    const g = this.add.graphics()
    g.fillStyle(0xc4554a, 1)
    g.fillTriangle(214, 292, 326, 292, 270, 248)
    g.fillStyle(0xf4e1c1, 1)
    g.fillRoundedRect(224, 292, 92, 58, 4)
    g.lineStyle(3, 0x8a5a32, 1)
    g.strokeRoundedRect(224, 292, 92, 58, 4)
    g.fillStyle(0x6b4a2b, 1)
    g.fillRect(262, 318, 16, 32)
  }

  private drawTents(built: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(400, 150)
    const colors = built ? [0xe07a5f, 0xf2cc8f, 0x81b29a] : [0xd9d3c5, 0xd9d3c5, 0xd9d3c5]
    colors.forEach((color, index) => {
      const x = (index - 1) * 48
      const g = this.add.graphics()
      g.fillStyle(color, 1)
      g.fillTriangle(x, 8, x - 26, 42, x + 26, 42)
      g.lineStyle(3, built ? 0x6b3a2a : 0x6b6258, 1)
      g.strokeTriangle(x, 8, x - 26, 42, x + 26, 42)
      container.add(g)
    })
    return container
  }

  private drawBridge(built: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(560, 248)
    const g = this.add.graphics()
    if (built) {
      g.fillStyle(0x8a5a32, 1)
      g.fillRoundedRect(-40, -8, 80, 16, 4)
      g.lineStyle(3, 0xf3ddb0, 1)
      g.strokeRoundedRect(-40, -8, 80, 16, 4)
    } else {
      g.lineStyle(4, 0x6b6258, 1)
      g.lineBetween(-36, 0, -10, 0)
      g.lineBetween(12, 4, 36, -2)
    }
    container.add(g)
    return container
  }

  private drawTower(built: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(860, 120)
    const g = this.add.graphics()
    g.fillStyle(built ? 0xc4554a : 0xb7b1a6, 1)
    g.fillRect(-16, 0, 32, 48)
    g.fillStyle(built ? 0xf2cc8f : 0xd9d3c5, 1)
    g.fillRect(-22, -8, 44, 12)
    g.fillStyle(0x8a5a32, 1)
    g.fillRect(-3, 20, 6, 28)
    if (built) {
      g.fillStyle(0x203040, 1)
      g.fillCircle(30, 18, 8)
    }
    container.add(g)
    return container
  }

  private drawWildlife(): Phaser.GameObjects.Container {
    const container = this.add.container(760, 78).setVisible(false)
    const g = this.add.graphics()
    g.fillStyle(0x8a5a32, 1)
    g.fillEllipse(0, 10, 36, 16)
    g.fillCircle(16, 0, 8)
    g.fillRect(10, -14, 3, 10)
    g.fillRect(18, -12, 3, 8)
    g.fillRect(-8, 16, 3, 10)
    g.fillRect(6, 16, 3, 10)
    container.add(g)
    return container
  }

  private drawFlowers(): Phaser.GameObjects.Container {
    const container = this.add.container(220, 340).setVisible(false)
    const g = this.add.graphics()
    for (const x of [-16, 0, 16]) {
      g.fillStyle(0xe07a5f, 1)
      g.fillCircle(x, 0, 6)
      g.fillStyle(0xffd166, 1)
      g.fillCircle(x, 0, 2)
    }
    container.add(g)
    return container
  }

  private drawBirdhouse(): Phaser.GameObjects.Container {
    const container = this.add.container(820, 130).setVisible(false)
    const g = this.add.graphics()
    g.fillStyle(0xf4e1c1, 1)
    g.fillRoundedRect(-10, 0, 20, 18, 3)
    g.fillStyle(0xc4554a, 1)
    g.fillTriangle(-14, 0, 14, 0, 0, -12)
    g.fillStyle(0x1c2a22, 1)
    g.fillCircle(0, 8, 2)
    container.add(g)
    return container
  }

  private bannerTexture(): string {
    if (this.textures.exists('park-banner')) return 'park-banner'
    const g = this.add.graphics()
    g.fillStyle(0xf2cc8f, 1)
    g.fillRoundedRect(0, 0, 70, 18, 4)
    g.lineStyle(2, 0xc4554a, 1)
    g.strokeRoundedRect(0, 0, 70, 18, 4)
    g.generateTexture('park-banner', 70, 18)
    g.destroy()
    return 'park-banner'
  }

  private paintPeople(): void {
    this.paintPerson('ranger-pine', HAT_COLORS.pine, 0xf4e1c1)
    this.paintPerson('ranger-river', HAT_COLORS.river, 0xf4e1c1)
    this.paintPerson('ranger-sunset', HAT_COLORS.sunset, 0xf4e1c1)
    this.paintPerson('ranger-stone', HAT_COLORS.stone, 0xf4e1c1)
    this.paintPerson('visitor-0', 0x3d5a80, 0xe07a5f)
    this.paintPerson('visitor-1', 0x6d597a, 0x3d5a80)
    this.paintPerson('visitor-2', 0x2f6b45, 0x81b29a)
    this.paintPerson('visitor-3', 0xc47b12, 0xf2cc8f)
    this.paintPerson('visitor-4', 0x8a5a32, 0x6d597a)
    if (!this.textures.exists('supply-crate')) {
      const g = this.add.graphics()
      g.fillStyle(0xc9a06a, 1)
      g.fillRoundedRect(0, 0, 28, 22, 4)
      g.lineStyle(2, 0x6b3a2a, 1)
      g.strokeRoundedRect(0, 0, 28, 22, 4)
      g.lineBetween(0, 11, 28, 11)
      g.generateTexture('supply-crate', 28, 22)
      g.destroy()
    }
  }

  private paintPerson(key: string, hat: number, shirt: number): void {
    if (this.textures.exists(key)) return
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.15)
    g.fillEllipse(32, 76, 36, 10)
    g.fillStyle(shirt, 1)
    g.fillRoundedRect(18, 36, 28, 30, 8)
    g.fillStyle(0xf3d2b3, 1)
    g.fillCircle(32, 28, 12)
    g.fillStyle(hat, 1)
    g.fillRoundedRect(18, 14, 28, 8, 3)
    g.fillRect(22, 8, 20, 8)
    g.fillStyle(0x1c2a22, 1)
    g.fillCircle(27, 28, 1.6)
    g.fillCircle(37, 28, 1.6)
    g.generateTexture(key, 64, 84)
    g.destroy()
  }
}
