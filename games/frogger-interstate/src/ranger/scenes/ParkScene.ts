import Phaser from 'phaser'
import type { ProjectId } from '../content/types.ts'
import { HAT_COLORS, type ParkSnapshot, type ParkVisitor } from '../presentation/snapshot.ts'
import { PARK_EDGES, PARK_NODES, isParkNode, pathBetween, type ParkNodeId } from '../presentation/layout.ts'

export type ParkHooks = {
  onDestination?: (nodeId: ParkNodeId) => void
  onArrived?: (nodeId: ParkNodeId, bundleId?: string) => void
}

const DEPTH = {
  sky: 0,
  land: 1,
  path: 2,
  water: 3,
  tree: 4,
  scatter: 5,
  structure: 6,
  decor: 8,
  person: 12,
  label: 30,
  bubble: 36,
  fx: 40,
}

const CHEER: Record<ProjectId, string> = {
  campsite: 'Tents up!',
  trail: 'The bridge holds!',
  lookout: 'The deer return!',
}

type Butterfly = {
  body: Phaser.GameObjects.Container
  wing: Phaser.GameObjects.Graphics
  x: number
  y: number
}

export class ParkScene extends Phaser.Scene {
  private hooks: ParkHooks = {}
  private ranger!: Phaser.GameObjects.Container
  private rangerSprite!: Phaser.GameObjects.Image
  private rangerNode: ParkNodeId = 'gate'
  private moveGen = 0
  private pendingBundle: string | undefined
  private effects!: Phaser.GameObjects.Container
  private visitors = new Map<string, Phaser.GameObjects.Container>()
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
  private banner!: Phaser.GameObjects.Container
  private birdhouse!: Phaser.GameObjects.Container
  private stormMess!: Phaser.GameObjects.Container
  private bedrolls!: Phaser.GameObjects.Container
  private speech!: Phaser.GameObjects.Container
  private speechBg!: Phaser.GameObjects.Graphics
  private speechText!: Phaser.GameObjects.Text
  private clouds: Phaser.GameObjects.Container[] = []
  private leaves: Phaser.GameObjects.Ellipse[] = []
  private ripples: Phaser.GameObjects.Ellipse[] = []
  private flames: Phaser.GameObjects.Ellipse[] = []
  private lanterns: Phaser.GameObjects.Arc[] = []
  private smoke: Phaser.GameObjects.Arc[] = []
  private deerSprites: Phaser.GameObjects.Container[] = []
  private bird!: Phaser.GameObjects.Container
  private songbirds: Phaser.GameObjects.Container[] = []
  private butterflies: Butterfly[] = []
  private sunHalo!: Phaser.GameObjects.Arc
  private chimney = { x: 286, y: 208 }
  private built: Record<ProjectId, boolean> = { campsite: false, trail: false, lookout: false }

  constructor() {
    super('ParkScene')
  }

  setHooks(hooks: ParkHooks): void {
    this.hooks = hooks
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#8ecff5')
    this.paintPeople()
    this.drawSky()
    this.drawLand()
    this.drawPaths()
    this.drawCreek()
    this.drawTrees()
    this.drawCabin()
    this.drawGate()
    this.stormMess = this.drawStormMess()
    this.bedrolls = this.drawBedrolls()
    this.campsiteBare = this.drawTents(false)
    this.campsiteBuilt = this.drawTents(true)
    this.gap = this.drawBridge(false)
    this.bridge = this.drawBridge(true)
    this.towerBare = this.drawTower(false)
    this.tower = this.drawTower(true)
    this.wildlife = this.drawWildlife()
    this.flowers = this.drawFlowers()
    this.banner = this.drawBanner()
    this.birdhouse = this.drawBirdhouse()
    this.campsiteBuilt.setVisible(false)
    this.bridge.setVisible(false)
    this.tower.setVisible(false)
    this.paintHotspots()
    this.rangerSprite = this.add.image(0, 0, 'ranger-pine').setOrigin(0.5, 1)
    this.ranger = this.add.container(PARK_NODES.gate.x, PARK_NODES.gate.y, [this.rangerSprite]).setScale(0.82).setDepth(DEPTH.person)
    this.effects = this.add.container(0, 0).setDepth(DEPTH.fx)
    this.highlight = this.add
      .ellipse(PARK_NODES.gate.x, PARK_NODES.gate.y + 4, 86, 28, 0xfff3bf, 0.01)
      .setStrokeStyle(4, 0xc47b12, 0.95)
      .setDepth(DEPTH.scatter)
    this.speechBg = this.add.graphics()
    this.speechText = this.add
      .text(0, 0, '', {
        fontFamily: 'Georgia, Palatino, serif',
        fontSize: '18px',
        color: '#1c2a22',
        align: 'center',
        wordWrap: { width: 210 },
      })
      .setOrigin(0.5, 1)
    this.speech = this.add.container(0, 0, [this.speechBg, this.speechText]).setDepth(DEPTH.bubble).setVisible(false)
    this.startAmbience()
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
    this.built = { ...snapshot.built }
    for (const visitor of this.visitors.values()) visitor.destroy()
    this.visitors.clear()
    this.visitorNodes.clear()
    if (this.ranger) this.ranger.setPosition(PARK_NODES.gate.x, PARK_NODES.gate.y)
    this.rangerSprite?.setPosition(0, 0).setFlipX(false)
    this.sync(snapshot)
    this.startAmbience()
  }

  sync(snapshot: ParkSnapshot): void {
    if (!this.rangerSprite) return
    this.rangerSprite.setTexture(`ranger-${snapshot.avatarId}`)
    for (const id of ['campsite', 'trail', 'lookout'] as const) {
      if (snapshot.built[id] && !this.built[id]) {
        this.built[id] = true
        const node = id === 'trail' ? 'crossing' : id
        this.burst(PARK_NODES[node].x, PARK_NODES[node].y - 48)
        this.floatText(PARK_NODES[node].x, PARK_NODES[node].y - 70, CHEER[id])
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
    this.stormMess.setVisible(!this.built.campsite || !this.built.trail)
    this.bedrolls.setVisible(snapshot.showBedrolls)
    for (const bundle of snapshot.bundles) {
      this.bundleIcons.get(bundle.id)?.setVisible(bundle.available)
    }
    if (snapshot.focusNodeId) {
      const node = PARK_NODES[snapshot.focusNodeId]
      this.highlight.setPosition(node.x, node.y + 4).setVisible(true)
    } else {
      this.highlight.setVisible(false)
    }
    if (snapshot.speech) {
      const node = PARK_NODES[snapshot.speech.nodeId]
      this.placeSpeech(snapshot.speech.text, node.x, node.y)
    } else {
      this.speech.setVisible(false)
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
      this.rangerSprite.setFlipX(next.x < this.ranger.x)
      this.tweens.add({
        targets: this.ranger,
        x: next.x,
        y: next.y,
        duration: 420,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.ranger.setDepth(DEPTH.person + this.ranger.y / 80),
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
    this.burst(node.x, node.y - 36)
    this.floatText(node.x, node.y - 60, 'Got it!')
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
      const body = this.add.image(0, 0, key).setOrigin(0.5, 1)
      sprite = this.add.container(PARK_NODES.gate.x + index * 16, PARK_NODES.gate.y, [body]).setScale(0.68).setDepth(DEPTH.person)
      this.visitors.set(visitor.id, sprite)
      this.bob(body, 3, 720 + index * 40)
    }
    if (this.visitorNodes.get(visitor.id) === visitor.nodeId) return
    this.visitorNodes.set(visitor.id, visitor.nodeId)
    const node = PARK_NODES[visitor.nodeId]
    const offset = (index - 1.5) * 36
    this.tweens.killTweensOf(sprite)
    this.tweens.add({
      targets: sprite,
      x: node.x + offset,
      y: node.y + 8,
      duration: 700,
      ease: 'Sine.easeInOut',
      onUpdate: () => sprite.setDepth(DEPTH.person + sprite.y / 80),
    })
  }

  private placeSpeech(text: string, x: number, y: number): void {
    this.speechText.setText(text)
    const width = this.speechText.width + 22
    const height = this.speechText.height + 16
    const top = -height - 8
    this.speechBg.clear()
    this.speechBg.fillStyle(0xfffaf0, 0.97)
    this.speechBg.fillRoundedRect(-width / 2, top, width, height, 14)
    this.speechBg.fillTriangle(-8, -8, 8, -8, 0, 8)
    this.speechBg.lineStyle(3, 0x1f4d34, 1)
    this.speechBg.strokeRoundedRect(-width / 2, top, width, height, 14)
    this.speechText.setPosition(0, -14)
    const bubbleX = x < 180 ? x + 150 : x
    const bubbleY = Math.max(92, y - 132)
    this.speech.setPosition(bubbleX, bubbleY)
    this.speech.setVisible(true)
  }

  private burst(x: number, y: number): void {
    if (!this.effects) return
    const colors = [0xffd166, 0xe07a5f, 0x7dce7a, 0x8fd0f2, 0xfffaf0]
    for (let i = 0; i < 10; i += 1) {
      const dot = this.add.circle(x, y, 6, colors[i % colors.length] ?? 0xffd166)
      this.effects.add(dot)
      this.tweens.add({
        targets: dot,
        x: x + Math.cos((Math.PI * 2 * i) / 10) * 54,
        y: y + Math.sin((Math.PI * 2 * i) / 10) * 36 - 10,
        alpha: 0,
        duration: 620,
        onComplete: () => dot.destroy(),
      })
    }
  }

  private floatText(x: number, y: number, message: string): void {
    if (!this.effects) return
    const label = this.add
      .text(x, y, message, {
        fontFamily: 'Georgia, Palatino, serif',
        fontSize: '28px',
        color: '#fffaf0',
        stroke: '#1f4d34',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
    this.effects.add(label)
    this.tweens.add({
      targets: label,
      y: y - 48,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private startAmbience(): void {
    if (!this.sys?.isActive()) return
    this.highlight?.setScale(1)
    if (this.highlight) {
      this.tweens.add({ targets: this.highlight, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 700 })
    }
    if (this.sunHalo) {
      this.sunHalo.setScale(1)
      this.tweens.add({ targets: this.sunHalo, scale: 1.12, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' })
    }
    for (const cloud of this.clouds) this.driftX(cloud, 22 + cloud.y / 40, -220, 1100)
    for (const leaf of this.leaves) {
      leaf.rotation = 0
      this.driftX(leaf, 16, -40, 1020)
      this.tweens.add({ targets: leaf, rotation: Math.PI * 2, duration: 4200, repeat: -1 })
    }
    for (const ripple of this.ripples) {
      ripple.setScale(1)
      this.tweens.add({
        targets: ripple,
        scaleX: 1.18,
        scaleY: 1.08,
        alpha: 0.05,
        yoyo: true,
        repeat: -1,
        duration: 1500,
        ease: 'Sine.easeInOut',
      })
    }
    this.smoke.forEach((puff, index) => {
      puff.setPosition(this.chimney.x, this.chimney.y)
      puff.setAlpha(0)
      this.tweens.add({
        targets: puff,
        y: this.chimney.y - 46,
        alpha: { from: 0.28, to: 0 },
        duration: 2200,
        delay: index * 700,
        repeat: -1,
        onRepeat: () => puff.setPosition(this.chimney.x + index * 4, this.chimney.y),
      })
    })
    for (const flame of this.flames) {
      flame.setScale(1)
      this.tweens.add({
        targets: flame,
        scaleY: 1.35,
        scaleX: 0.82,
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
    this.lanterns.forEach((lantern, index) => {
      this.tweens.add({ targets: lantern, alpha: 0.45, duration: 520 + index * 90, yoyo: true, repeat: -1 })
    })
    if (this.rangerSprite) {
      this.rangerSprite.y = 0
      this.bob(this.rangerSprite, 4, 680)
    }
    for (const deer of this.deerSprites) {
      this.parkY(deer)
      this.bob(deer, 3, 900)
    }
    if (this.bird) {
      this.parkY(this.bird)
      this.bird.x = 680
      this.tweens.add({ targets: this.bird, x: 940, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      this.bob(this.bird, 10, 680)
    }
    for (const bird of this.songbirds) {
      this.parkY(bird)
      this.driftX(bird, 34, -80, 1040)
      this.bob(bird, 8, 500)
    }
    for (const butterfly of this.butterflies) {
      butterfly.body.setPosition(butterfly.x, butterfly.y)
      butterfly.wing.setScale(1, 1)
      this.tweens.add({
        targets: butterfly.body,
        x: butterfly.x + 70,
        y: butterfly.y - 24,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      this.tweens.add({ targets: butterfly.wing, scaleX: 0.35, duration: 160, yoyo: true, repeat: -1 })
    }
    if (this.banner) {
      this.banner.rotation = 0
      this.tweens.add({ targets: this.banner, rotation: 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    for (const icon of this.bundleIcons.values()) {
      this.parkY(icon)
      this.bob(icon, 6, 800)
    }
  }

  private parkY(target: Phaser.GameObjects.GameObject & { y: number }): void {
    const base = target.getData('baseY')
    if (typeof base === 'number') target.y = base
  }

  private bob(target: Phaser.GameObjects.GameObject & { y: number }, amount: number, duration: number): void {
    const base = target.y
    this.tweens.add({
      targets: target,
      y: base - amount,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private driftX(target: Phaser.GameObjects.GameObject & { x: number }, speed: number, minX: number, maxX: number): void {
    const duration = Math.max(1800, ((maxX - target.x) / speed) * 1000)
    this.tweens.add({
      targets: target,
      x: maxX,
      duration,
      ease: 'Linear',
      onComplete: () => {
        if (!this.sys?.isActive()) return
        target.x = minX
        this.driftX(target, speed, minX, maxX)
      },
    })
  }

  private drawSky(): void {
    this.add.rectangle(480, 140, 960, 280, 0x8ecff5).setDepth(DEPTH.sky)
    this.add.rectangle(480, 230, 960, 80, 0xf6e3b8).setDepth(DEPTH.sky)
    this.sunHalo = this.add.circle(148, 74, 52, 0xffe08a, 0.38).setDepth(DEPTH.sky)
    this.add.circle(148, 74, 28, 0xffd56a).setDepth(DEPTH.sky)
    this.clouds.push(this.cloud(180, 54, 1))
    this.clouds.push(this.cloud(460, 38, 0.85))
    this.clouds.push(this.cloud(760, 64, 1.1))
    const mountains = this.add.graphics().setDepth(DEPTH.sky)
    mountains.fillStyle(0x8eb4d2, 1)
    mountains.fillTriangle(40, 230, 210, 230, 120, 128)
    mountains.fillTriangle(160, 236, 390, 236, 270, 112)
    mountains.fillTriangle(520, 240, 760, 240, 640, 126)
    mountains.fillTriangle(700, 236, 960, 236, 860, 140)
    mountains.fillStyle(0xc5dced, 0.9)
    mountains.fillTriangle(90, 230, 150, 230, 120, 168)
    mountains.fillTriangle(240, 236, 310, 236, 270, 160)
    const leafColors = [0xe07a5f, 0xf2cc8f, 0xc4554a]
    ;[120, 380, 690].forEach((x, index) => {
      const leaf = this.add.ellipse(x, 150 + index * 30, 12, 7, leafColors[index] ?? 0xe07a5f).setDepth(DEPTH.tree)
      this.leaves.push(leaf)
    })
  }

  private cloud(x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const puff = this.add.graphics()
    puff.fillStyle(0xffffff, 0.94)
    puff.fillEllipse(0, 0, 78, 30)
    puff.fillEllipse(-28, 6, 42, 24)
    puff.fillEllipse(30, 8, 48, 24)
    return this.add.container(x, y, [puff]).setDepth(DEPTH.sky).setScale(scale)
  }

  private drawLand(): void {
    const hills = this.add.graphics().setDepth(DEPTH.land)
    hills.fillStyle(0x7eb87a, 1)
    hills.fillEllipse(180, 250, 520, 150)
    hills.fillStyle(0x68b268, 1)
    hills.fillEllipse(560, 270, 640, 170)
    hills.fillEllipse(860, 250, 380, 180)
    this.add.rectangle(480, 390, 960, 340, 0x62b85c).setDepth(DEPTH.land)
    this.add.ellipse(860, 230, 340, 190, 0x8ed18a).setDepth(DEPTH.land)
    this.add.ellipse(880, 196, 210, 100, 0xc6e7ad).setDepth(DEPTH.land)
    const campsite = PARK_NODES.campsite
    this.add.ellipse(campsite.x, campsite.y + 8, 190, 78, 0xc6a15a, 0.55).setDepth(DEPTH.land)
    const grass = this.add.graphics().setDepth(DEPTH.land)
    grass.fillStyle(0x3f8f4e, 1)
    for (let i = 0; i < 14; i += 1) {
      const x = 760 + i * 14
      grass.fillTriangle(x, 214, x + 4, 188, x + 8, 214)
    }
    const flowers = this.add.graphics().setDepth(DEPTH.path)
    const meadow = PARK_NODES.meadow
    ;[0xfffaf0, 0xf2cc8f, 0xe07a5f].forEach((color, index) => {
      flowers.fillStyle(color, 1)
      flowers.fillCircle(meadow.x - 50 + index * 18, meadow.y + 28, 4)
      flowers.fillStyle(0x2f6b45, 1)
      flowers.fillRect(meadow.x - 51 + index * 18, meadow.y + 30, 2, 8)
    })
  }

  private drawPaths(): void {
    const graphics = this.add.graphics().setDepth(DEPTH.path)
    const stroke = (width: number, color: number) => {
      graphics.lineStyle(width, color, 1)
      for (const [a, b] of PARK_EDGES) {
        graphics.beginPath()
        graphics.moveTo(PARK_NODES[a].x, PARK_NODES[a].y)
        graphics.lineTo(PARK_NODES[b].x, PARK_NODES[b].y)
        graphics.strokePath()
      }
    }
    stroke(28, 0xa8743d)
    stroke(16, 0xe6c48a)
    stroke(4, 0xf7e7c6)
  }

  private creekSpot(): { x: number; y: number; rotation: number } {
    const a = PARK_NODES.meadow
    const b = PARK_NODES.crossing
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      rotation: Math.atan2(b.y - a.y, b.x - a.x),
    }
  }

  private drawCreek(): void {
    const spot = this.creekSpot()
    const water = this.add.container(spot.x, spot.y).setDepth(DEPTH.water)
    const g = this.add.graphics()
    g.fillStyle(0x1f6f99, 1)
    g.fillEllipse(0, 8, 210, 78)
    g.fillStyle(0x2f8fbe, 1)
    g.fillEllipse(-8, 4, 150, 48)
    g.fillStyle(0xd7f4ff, 0.45)
    g.fillEllipse(-36, -2, 46, 16)
    g.fillStyle(0x7f8f72, 1)
    g.fillEllipse(-78, 18, 22, 12)
    g.fillEllipse(70, 16, 16, 10)
    water.add(g)
    const ripple = this.add.ellipse(-10, 6, 70, 22, 0xffffff, 0.22)
    water.add(ripple)
    this.ripples.push(ripple)
    this.cattail(spot.x - 108, spot.y + 8)
    this.cattail(spot.x + 96, spot.y + 4)
  }

  private cattail(x: number, y: number): void {
    const g = this.add.graphics().setDepth(DEPTH.scatter)
    g.fillStyle(0x2f6b45, 1)
    g.fillRect(x, y, 3, 26)
    g.fillStyle(0x6b4423, 1)
    g.fillEllipse(x + 1, y - 8, 7, 16)
  }

  private drawTrees(): void {
    const spots: [number, number, number][] = [
      [70, 168, 1.45],
      [188, 112, 1.25],
      [328, 96, 1.35],
      [492, 88, 1.15],
      [700, 78, 1],
      [36, 300, 1.1],
      [24, 455, 0.85],
      [948, 128, 1.15],
      [954, 330, 0.95],
    ]
    for (const [x, y, scale] of spots) this.tree(x, y, scale)
  }

  private tree(x: number, y: number, scale: number): void {
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.12)
    g.fillEllipse(4, 40, 50, 12)
    g.fillStyle(0x7a4e2d, 1)
    g.fillRoundedRect(-6, 8, 14, 32, 4)
    g.fillStyle(0x246b3d, 1)
    g.fillCircle(-16, 6, 20)
    g.fillStyle(0x2f7d45, 1)
    g.fillCircle(14, 2, 24)
    g.fillStyle(0x3e9454, 1)
    g.fillCircle(0, -16, 22)
    g.fillStyle(0xb6e7a8, 0.9)
    g.fillCircle(-6, -22, 7)
    this.add.container(x, y, [g]).setDepth(DEPTH.tree).setScale(scale)
  }

  private drawCabin(): void {
    const x = PARK_NODES.center.x
    const y = PARK_NODES.center.y
    const g = this.add.graphics().setDepth(DEPTH.structure)
    g.fillStyle(0x000000, 0.13)
    g.fillEllipse(x, y + 8, 140, 20)
    g.fillStyle(0xf6e2c4, 1)
    g.fillRoundedRect(x - 54, y - 86, 108, 80, 8)
    g.lineStyle(3, 0xd7b48a, 0.9)
    for (let row = y - 72; row <= y - 20; row += 14) g.lineBetween(x - 48, row, x + 48, row)
    g.fillStyle(0x9fd4ee, 1)
    g.fillRoundedRect(x - 42, y - 62, 22, 18, 3)
    g.lineStyle(3, 0x6b3f2a, 1)
    g.strokeRoundedRect(x - 42, y - 62, 22, 18, 3)
    g.fillStyle(0xffe08a, 0.45)
    g.fillRoundedRect(x - 40, y - 60, 10, 14, 2)
    g.fillStyle(0x6b3f2a, 1)
    g.fillRoundedRect(x - 12, y - 50, 24, 44, 4)
    g.fillStyle(0xf2cc8f, 1)
    g.fillCircle(x + 6, y - 28, 2)
    g.fillStyle(0xc9a06a, 1)
    g.fillRoundedRect(x - 16, y - 8, 32, 8, 2)
    g.fillStyle(0xc4554a, 1)
    g.fillTriangle(x - 70, y - 80, x + 70, y - 80, x, y - 136)
    g.fillStyle(0xa3443b, 1)
    g.fillTriangle(x, y - 136, x + 70, y - 80, x + 8, y - 80)
    g.fillStyle(0x8d6a55, 1)
    g.fillRect(x + 26, y - 128, 16, 40)
    g.fillStyle(0x6b4423, 1)
    g.fillRect(x + 22, y - 132, 24, 8)
    this.chimney = { x: x + 34, y: y - 134 }
    for (let i = 0; i < 3; i += 1) {
      this.smoke.push(this.add.circle(this.chimney.x, this.chimney.y, 7, 0xffffff, 0).setDepth(DEPTH.decor))
    }
    const box = this.add.graphics().setDepth(DEPTH.structure)
    box.fillStyle(0x6b4423, 1)
    box.fillRect(x + 36, y - 18, 22, 12)
    box.fillStyle(0xe07a5f, 1)
    box.fillCircle(x + 42, y - 22, 4)
    box.fillStyle(0xf2cc8f, 1)
    box.fillCircle(x + 50, y - 22, 4)
    box.fillStyle(0x7dce7a, 1)
    box.fillRect(x + 40, y - 16, 2, 8)
  }

  private drawGate(): void {
    const x = PARK_NODES.gate.x
    const y = PARK_NODES.gate.y
    const g = this.add.graphics().setDepth(DEPTH.structure)
    g.fillStyle(0x6b3f2a, 1)
    g.fillRoundedRect(x - 48, y - 170, 12, 174, 3)
    g.fillRoundedRect(x + 36, y - 170, 12, 174, 3)
    g.fillRoundedRect(x - 48, y - 166, 96, 10, 3)
    g.fillStyle(0xf6e2c4, 1)
    g.fillRoundedRect(x - 36, y - 154, 72, 30, 6)
    g.lineStyle(3, 0x6b3f2a, 1)
    g.strokeRoundedRect(x - 36, y - 154, 72, 30, 6)
    const sign = this.add
      .text(x, y - 139, 'Welcome', {
        fontFamily: 'Georgia, Palatino, serif',
        fontSize: '16px',
        color: '#6b3a2a',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.structure)
    sign.setData('gate-sign', true)
  }

  private drawStormMess(): Phaser.GameObjects.Container {
    const g = this.add.graphics()
    const camp = PARK_NODES.campsite
    g.fillStyle(0x8a5a32, 1)
    g.fillRect(camp.x - 70, camp.y + 10, 34, 5)
    g.fillStyle(0xe07a5f, 1)
    g.fillEllipse(camp.x + 60, camp.y + 16, 14, 8)
    g.fillStyle(0xf2cc8f, 1)
    g.fillEllipse(camp.x - 40, camp.y + 20, 12, 7)
    g.fillStyle(0xc4554a, 1)
    g.fillEllipse(PARK_NODES.crossing.x - 40, PARK_NODES.crossing.y + 18, 16, 8)
    return this.add.container(0, 0, [g]).setDepth(DEPTH.scatter)
  }

  private drawBedrolls(): Phaser.GameObjects.Container {
    const x = PARK_NODES.gate.x
    const y = PARK_NODES.gate.y
    const g = this.add.graphics()
    const colors = [0xe07a5f, 0x3d5a80, 0x81b29a]
    colors.forEach((color, index) => {
      const rollX = x + 52 + index * 18
      g.fillStyle(color, 1)
      g.fillRoundedRect(rollX, y - 16, 14, 22, 6)
      g.lineStyle(2, 0xfffaf0, 0.8)
      g.lineBetween(rollX + 2, y - 6, rollX + 12, y - 6)
    })
    return this.add.container(0, 0, [g]).setDepth(DEPTH.structure)
  }

  private drawTents(built: boolean): Phaser.GameObjects.Container {
    const root = this.add.container(PARK_NODES.campsite.x, PARK_NODES.campsite.y).setDepth(DEPTH.structure)
    const colors = [0xe07a5f, 0xf2cc8f, 0x5ea88a]
    colors.forEach((color, index) => {
      const x = (index - 1) * 62
      const g = this.add.graphics()
      if (built) {
        g.fillStyle(0x000000, 0.12)
        g.fillEllipse(x, 6, 60, 14)
        g.fillStyle(color, 1)
        g.fillTriangle(x, -92, x - 34, -2, x + 34, -2)
        g.fillStyle(0x000000, 0.12)
        g.fillTriangle(x + 4, -86, x + 34, -2, x + 6, -2)
        g.fillStyle(0x3a2a1a, 0.55)
        g.fillTriangle(x, -46, x - 10, -2, x + 10, -2)
        g.lineStyle(3, 0x6b3a2a, 1)
        g.strokeTriangle(x, -92, x - 34, -2, x + 34, -2)
        g.fillStyle(0xfffaf0, 1)
        g.fillCircle(x - 28, 2, 3)
        g.fillCircle(x + 28, 2, 3)
      } else {
        g.fillStyle(color, 0.85)
        g.fillEllipse(x, 0, 62, 18)
        g.fillTriangle(x - 8, -16, x - 28, 2, x + 18, 2)
        g.fillStyle(0x8a5a32, 1)
        g.fillRect(x - 26, -2, 24, 4)
        g.fillCircle(x - 30, 6, 3)
        g.fillCircle(x + 28, 6, 3)
        g.lineStyle(2, 0x6b3a2a, 1)
        g.lineBetween(x - 30, 6, x + 22, -4)
      }
      root.add(g)
    })
    if (built) {
      const logs = this.add.graphics()
      logs.fillStyle(0x6b3a2a, 1)
      logs.fillRoundedRect(-16, 2, 32, 6, 2)
      logs.fillRoundedRect(-12, -2, 28, 6, 2)
      const glow = this.add.circle(0, -6, 16, 0xffb703, 0.28)
      const flame = this.add.ellipse(0, -10, 10, 16, 0xff7b2c)
      const core = this.add.ellipse(0, -8, 5, 10, 0xffe08a)
      root.add([logs, glow, flame, core])
      this.flames.push(flame, core)
      ;[-62, 62].forEach((lx) => {
        const post = this.add.graphics()
        post.fillStyle(0x6b3a2a, 1)
        post.fillRect(lx - 2, -34, 4, 32)
        root.add(post)
        const lantern = this.add.circle(lx, -36, 6, 0xffe08a, 0.95)
        root.add(lantern)
        this.lanterns.push(lantern)
      })
    }
    return root
  }

  private drawBridge(built: boolean): Phaser.GameObjects.Container {
    const spot = this.creekSpot()
    const root = this.add.container(spot.x, spot.y).setDepth(DEPTH.structure).setRotation(spot.rotation)
    const g = this.add.graphics()
    if (built) {
      g.fillStyle(0x6b3f2a, 1)
      g.fillRoundedRect(-92, -18, 184, 36, 4)
      g.fillStyle(0xc4894a, 1)
      g.fillRoundedRect(-86, -14, 172, 28, 3)
      g.lineStyle(2, 0x8a5a32, 1)
      for (let plank = -74; plank <= 74; plank += 14) g.lineBetween(plank, -12, plank, 12)
      g.lineStyle(5, 0xf3ddb0, 1)
      g.lineBetween(-84, -18, 84, -18)
      g.lineBetween(-84, 18, 84, 18)
      g.fillStyle(0x6b3f2a, 1)
      g.fillCircle(-84, -18, 5)
      g.fillCircle(84, -18, 5)
      g.fillCircle(-84, 18, 5)
      g.fillCircle(84, 18, 5)
    } else {
      g.fillStyle(0x6b3f2a, 1)
      g.fillRoundedRect(-96, -16, 70, 32, 4)
      g.fillRoundedRect(26, -16, 70, 32, 4)
      g.fillStyle(0xc4894a, 1)
      g.fillRoundedRect(-90, -12, 58, 24, 3)
      g.fillRoundedRect(32, -12, 58, 24, 3)
      g.lineStyle(2, 0x8a5a32, 1)
      g.lineBetween(-78, -12, -78, 12)
      g.lineBetween(-60, -12, -60, 12)
      g.lineBetween(48, -12, 48, 12)
      g.lineBetween(66, -12, 66, 12)
    }
    root.add(g)
    if (!built) {
      const loose = this.add.graphics()
      loose.fillStyle(0xa86b3c, 1)
      loose.fillRoundedRect(-18, -5, 36, 10, 2)
      loose.setRotation(0.5)
      root.add(loose)
    }
    return root
  }

  private drawTower(built: boolean): Phaser.GameObjects.Container {
    const node = PARK_NODES.lookout
    const root = this.add.container(node.x, node.y).setDepth(DEPTH.structure)
    const g = this.add.graphics()
    if (built) {
      g.fillStyle(0x000000, 0.12)
      g.fillEllipse(0, 6, 70, 16)
      g.fillStyle(0x8a5a32, 1)
      g.fillRect(-22, -18, 8, 28)
      g.fillRect(14, -18, 8, 28)
      g.fillStyle(0xc4894a, 1)
      g.fillRoundedRect(-28, -28, 56, 14, 3)
      g.lineStyle(3, 0xf3ddb0, 1)
      g.strokeRoundedRect(-28, -28, 56, 14, 3)
      g.fillStyle(0x6b3f2a, 1)
      g.fillRect(-4, -96, 8, 62)
      g.fillStyle(0xc4554a, 1)
      g.fillTriangle(-30, -88, 30, -88, 0, -128)
      g.fillStyle(0xf2cc8f, 1)
      g.fillRect(4, -112, 16, 10)
      g.fillStyle(0x203040, 1)
      g.fillRoundedRect(18, -22, 16, 10, 2)
      g.fillStyle(0x9fd4ee, 1)
      g.fillCircle(26, -18, 3)
    } else {
      g.fillStyle(0x8a5a32, 1)
      g.fillRoundedRect(-30, -6, 24, 8, 2)
      g.fillRoundedRect(-4, -12, 28, 8, 2)
      g.fillRoundedRect(8, -2, 20, 8, 2)
      g.fillStyle(0xb7b1a6, 1)
      g.fillRect(-2, -28, 6, 24)
    }
    root.add(g)
    return root
  }

  private drawWildlife(): Phaser.GameObjects.Container {
    const root = this.add.container(0, 0).setVisible(false).setDepth(DEPTH.decor)
    const adult = this.deer(900, 168, true, 1.15)
    const fawn = this.deer(930, 190, false, 0.72)
    this.bird = this.drawBird(700, 96)
    root.add([adult, fawn, this.bird])
    this.deerSprites.push(adult, fawn)
    return root
  }

  private deer(x: number, y: number, faceLeft: boolean, scale: number): Phaser.GameObjects.Container {
    const g = this.add.graphics()
    g.fillStyle(0xc4a06a, 1)
    g.fillEllipse(0, 0, 48, 22)
    g.fillRoundedRect(16, -20, 8, 18, 3)
    g.fillEllipse(26, -26, 18, 14)
    g.fillTriangle(18, -32, 22, -44, 28, -32)
    g.fillTriangle(28, -32, 34, -42, 34, -30)
    g.fillStyle(0xa68455, 1)
    g.fillEllipse(34, -24, 10, 7)
    g.fillStyle(0x1c2a22, 1)
    g.fillCircle(28, -28, 1.6)
    g.fillStyle(0xc4a06a, 1)
    g.fillRect(-14, 8, 4, 16)
    g.fillRect(-2, 8, 4, 16)
    g.fillRect(8, 8, 4, 16)
    g.fillRect(16, 6, 4, 14)
    g.fillStyle(0xf4e1c1, 1)
    g.fillCircle(-22, -4, 4)
    g.fillCircle(-4, -2, 2.4)
    g.fillCircle(6, 2, 2)
    const body = this.add.container(x, y, [g])
    body.setData('baseY', y)
    body.setScale(faceLeft ? -scale : scale, scale)
    return body
  }

  private drawBird(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics()
    g.fillStyle(0x3d5a80, 1)
    g.fillEllipse(0, 0, 18, 8)
    g.fillCircle(8, -3, 5)
    g.fillStyle(0xf2cc8f, 1)
    g.fillTriangle(12, -3, 18, -1, 12, 2)
    g.fillStyle(0x1c2a22, 1)
    g.fillCircle(10, -4, 1)
    g.fillStyle(0x3d5a80, 0.85)
    g.fillTriangle(-2, 0, -12, -8, -4, 2)
    const body = this.add.container(x, y, [g])
    body.setData('baseY', y)
    return body
  }

  private drawFlowers(): Phaser.GameObjects.Container {
    const root = this.add.container(0, 0).setVisible(false).setDepth(DEPTH.decor)
    const spots = [
      [190, 430],
      [220, 448],
      [460, 500],
      [500, 488],
    ]
    const colors = [0xe07a5f, 0xf2cc8f, 0xb565d8, 0xfffaf0]
    spots.forEach(([x, y], index) => {
      const g = this.add.graphics()
      g.fillStyle(0x2f6b45, 1)
      g.fillRect(x!, y! - 10, 3, 16)
      g.fillStyle(colors[index] ?? 0xe07a5f, 1)
      g.fillCircle(x!, y! - 14, 7)
      g.fillStyle(0xffd166, 1)
      g.fillCircle(x!, y! - 14, 3)
      root.add(g)
    })
    return root
  }

  private drawBanner(): Phaser.GameObjects.Container {
    const x = PARK_NODES.center.x
    const y = PARK_NODES.center.y - 108
    const g = this.add.graphics()
    g.lineStyle(4, 0x6b3a2a, 1)
    g.lineBetween(-54, 0, 54, 0)
    g.fillStyle(0xe07a5f, 1)
    g.fillTriangle(-40, 2, -6, 2, -24, 28)
    g.fillStyle(0xf2cc8f, 1)
    g.fillTriangle(-6, 2, 28, 2, 10, 28)
    g.fillStyle(0x5ea88a, 1)
    g.fillTriangle(28, 2, 52, 2, 40, 24)
    return this.add.container(x, y, [g]).setVisible(false).setDepth(DEPTH.decor)
  }

  private drawBirdhouse(): Phaser.GameObjects.Container {
    const g = this.add.graphics()
    g.fillStyle(0x6b3a2a, 1)
    g.fillRect(-3, 0, 6, 40)
    g.fillStyle(0xf6e2c4, 1)
    g.fillRoundedRect(-16, -32, 32, 34, 4)
    g.fillStyle(0xc4554a, 1)
    g.fillTriangle(-20, -30, 20, -30, 0, -50)
    g.fillStyle(0x1c2a22, 1)
    g.fillCircle(0, -16, 4)
    g.fillStyle(0xf2cc8f, 1)
    g.fillRect(2, -18, 10, 3)
    return this.add.container(500, 300, [g]).setVisible(false).setDepth(DEPTH.decor)
  }

  private paintHotspots(): void {
    this.songbirds.push(this.drawBird(140, 48).setScale(0.55).setDepth(DEPTH.tree))
    this.songbirds.push(this.drawBird(520, 36).setScale(0.45).setDepth(DEPTH.sky))
    this.butterflies.push(this.butterfly(360, 300, 0xf2cc8f))
    this.butterflies.push(this.butterfly(640, 260, 0xb565d8))
    for (const node of Object.values(PARK_NODES)) {
      if (node.bundleId) {
        const icon = this.add.image(node.x + 42, node.y - 72, 'supply-crate').setDepth(DEPTH.decor)
        icon.setData('baseY', icon.y)
        this.bundleIcons.set(node.bundleId, icon)
      }
      const zone = this.add.circle(node.x, node.y - 28, 46, 0xffffff, 0.001).setDepth(DEPTH.bubble)
      zone.setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => this.hooks.onDestination?.(node.id))
      this.signLabel(node.x, node.y + 22, node.label)
    }
  }

  private butterfly(x: number, y: number, tint: number): Butterfly {
    const wing = this.add.graphics()
    wing.fillStyle(tint, 0.95)
    wing.fillEllipse(-7, 0, 12, 16)
    wing.fillEllipse(7, 0, 12, 16)
    wing.fillStyle(0x243024, 1)
    wing.fillRoundedRect(-1, -7, 3, 14, 1)
    const body = this.add.container(x, y, [wing]).setDepth(DEPTH.person)
    return { body, wing, x, y }
  }

  private signLabel(x: number, y: number, label: string): void {
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Georgia, Palatino, serif',
        fontSize: '15px',
        color: '#3a2a1a',
      })
      .setOrigin(0.5)
    const width = text.width + 16
    const height = text.height + 8
    const plate = this.add.graphics()
    plate.fillStyle(0xfff6e4, 0.95)
    plate.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    plate.lineStyle(2, 0x8a5a32, 1)
    plate.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)
    this.add.container(x, y, [plate, text]).setDepth(DEPTH.label)
  }

  private paintPeople(): void {
    this.paintPerson('ranger-pine', HAT_COLORS.pine, 0xf4e1c1, 0xf3d2b3, 0x5c3b22, true)
    this.paintPerson('ranger-river', HAT_COLORS.river, 0xf4e1c1, 0xe0b090, 0x3a2a1a, true)
    this.paintPerson('ranger-sunset', HAT_COLORS.sunset, 0xf4e1c1, 0xf6d7b0, 0x6b3a22, true)
    this.paintPerson('ranger-stone', HAT_COLORS.stone, 0xf4e1c1, 0xc68642, 0x2a2118, true)
    this.paintPerson('visitor-0', 0x3d5a80, 0xe07a5f, 0xf3d2b3, 0x2a2118, false)
    this.paintPerson('visitor-1', 0x6d597a, 0x3d5a80, 0xe0b090, 0x6b3a22, false)
    this.paintPerson('visitor-2', 0x2f6b45, 0x81b29a, 0x8d5528, 0x1c1a18, false)
    this.paintPerson('visitor-3', 0xc47b12, 0xf2cc8f, 0xf6d7b0, 0xc47b12, false)
    this.paintPerson('visitor-4', 0x8a5a32, 0x6d597a, 0xc68642, 0x2f241c, false)
    if (this.textures.exists('supply-crate')) return
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.15)
    g.fillEllipse(20, 32, 30, 8)
    g.fillStyle(0xc4894a, 1)
    g.fillRoundedRect(4, 6, 32, 24, 4)
    g.fillStyle(0xdbb06a, 1)
    g.fillRect(4, 6, 32, 8)
    g.lineStyle(2, 0x6b3a2a, 1)
    g.strokeRoundedRect(4, 6, 32, 24, 4)
    g.lineBetween(4, 18, 36, 18)
    g.fillStyle(0x2f6b45, 1)
    g.fillCircle(20, 16, 4)
    g.generateTexture('supply-crate', 40, 36)
    g.destroy()
  }

  private paintPerson(key: string, hat: number, shirt: number, skin: number, hair: number, scarf: boolean): void {
    if (this.textures.exists(key)) return
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.16)
    g.fillEllipse(48, 116, 54, 12)
    g.fillStyle(0x3e4c6e, 1)
    g.fillRoundedRect(34, 86, 12, 22, 4)
    g.fillRoundedRect(50, 86, 12, 22, 4)
    g.fillStyle(0x4a3428, 1)
    g.fillRoundedRect(30, 102, 18, 12, 4)
    g.fillRoundedRect(48, 102, 18, 12, 4)
    g.fillStyle(0x6b4423, 1)
    g.fillRoundedRect(22, 64, 14, 26, 5)
    g.fillStyle(0xc47b12, 1)
    g.fillRect(26, 70, 6, 3)
    g.fillStyle(shirt, 1)
    g.fillRoundedRect(28, 60, 40, 34, 12)
    g.fillStyle(skin, 1)
    g.fillRoundedRect(20, 66, 12, 24, 6)
    g.fillRoundedRect(64, 66, 12, 24, 6)
    g.fillCircle(26, 90, 5)
    g.fillCircle(70, 90, 5)
    if (scarf) {
      g.fillStyle(hat, 1)
      g.fillTriangle(40, 62, 56, 62, 48, 76)
    }
    g.fillStyle(hair, 1)
    g.fillCircle(48, 40, 20)
    g.fillStyle(skin, 1)
    g.fillCircle(48, 46, 16)
    g.fillStyle(hair, 1)
    g.fillEllipse(48, 32, 32, 16)
    g.fillStyle(0x1c2a22, 1)
    g.fillCircle(42, 46, 2.2)
    g.fillCircle(54, 46, 2.2)
    g.lineStyle(2, 0xb85c4c, 1)
    g.beginPath()
    g.arc(48, 50, 6, 0.25, Math.PI - 0.25, false)
    g.strokePath()
    g.fillStyle(0xe07a7a, 0.45)
    g.fillCircle(36, 52, 3.5)
    g.fillCircle(60, 52, 3.5)
    g.fillStyle(hat, 1)
    g.fillRoundedRect(28, 26, 40, 9, 3)
    g.fillRoundedRect(34, 10, 28, 18, 7)
    g.fillStyle(0xf2cc8f, 1)
    g.fillRect(34, 24, 28, 4)
    g.generateTexture(key, 96, 124)
    g.destroy()
  }
}
