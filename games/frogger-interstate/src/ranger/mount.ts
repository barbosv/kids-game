import Phaser from 'phaser'
import './ui/ranger.css'
import { ParkAudio } from './audio.ts'
import { BUNDLES } from './content/world.ts'
import type { Band, CampsiteParams, CampsitePlan, Family, LookoutParams, LookoutPlan, TrailPlan } from './content/types.ts'
import { loadGame, persistGame } from './persistence/save.ts'
import { isParkNode, type ParkNodeId } from './presentation/layout.ts'
import { parkSnapshot } from './presentation/snapshot.ts'
import {
  buyDecoration,
  collectSupplyBundle,
  confirmBuild,
  confirmReplay,
  leaveChallenge,
  renameProfile,
  resetProfile,
  restartActiveAttempt,
  resumeReplay,
  setActiveProfile,
  setAvatar,
  setBand,
  setMute,
  startChallenge,
  startReplay,
  submitPlan,
  updateDraft,
  useHint,
  welcomeAvailable,
} from './rules/session.ts'
import { ParkScene } from './scenes/ParkScene.ts'
import { RangerShell, type ShellModel, type Tone } from './ui/shell.ts'
import type { SaveFile } from './model/profile.ts'

export function mountRangerPark(root: HTMLElement): () => void {
  const parsed = loadGame(localStorage)
  let save = parsed.save
  let recoveryNote = parsed.recoveryNote
  if (recoveryNote) persistGame(localStorage, save)
  let screen: ShellModel['screen'] = 'profiles'
  let parentOpen = false
  let parentProfileId: string = save.activeProfileId
  let confirmReset = false
  let message: ShellModel['message'] = null
  let game: Phaser.Game | null = null
  let scene: ParkScene | null = null
  let pendingWalk: ParkNodeId | null = null
  const audio = new ParkAudio()
  const shell = new RangerShell(root, (action, element) => {
    audio.unlock()
    handle(action, element)
  })
  const onResize = () => game?.scale.refresh()
  window.addEventListener('resize', onResize)
  root.addEventListener('pointerdown', () => audio.unlock())
  root.addEventListener('keydown', () => audio.unlock())

  const render = () => {
    audio.muted = save.profiles[save.activeProfileId].mute
    shell.render({
      screen,
      parentOpen,
      save,
      recoveryNote,
      message,
      confirmReset,
      parentProfileId,
    })
  }

  const commit = (next: SaveFile, flash?: { text: string; tone: Tone } | null) => {
    save = next
    persistGame(localStorage, save)
    if (flash !== undefined) message = flash
    if (scene && screen === 'park') scene.sync(parkSnapshot(save.profiles[save.activeProfileId]))
    render()
  }

  const ensureGame = () => {
    if (game) {
      scene?.reset(parkSnapshot(save.profiles[save.activeProfileId]))
      return
    }
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: shell.stage,
      width: 960,
      height: 540,
      backgroundColor: '#9ecf8a',
      banner: false,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [ParkScene],
    })
    game.events.once('ready', () => {
      const found = game?.scene.getScene('ParkScene')
      if (!(found instanceof ParkScene)) return
      scene = found
      scene.setHooks({
        onDestination: (nodeId) => walk(nodeId),
        onArrived: (nodeId, bundleId) => {
          if (!bundleId) return
          const result = collectSupplyBundle(save, save.activeProfileId, bundleId)
          if (result.gained > 0) {
            scene?.celebrate(nodeId)
            audio.play('collect')
            commit(result.save, { text: `Collected ${result.gained} supplies.`, tone: 'good' })
            return
          }
          commit(result.save)
        },
      })
      scene.reset(parkSnapshot(save.profiles[save.activeProfileId]))
      const queued = pendingWalk
      pendingWalk = null
      if (queued) walk(queued)
      window.requestAnimationFrame(() => game?.scale.refresh())
    })
  }

  const destroyGame = () => {
    scene = null
    game?.destroy(true)
    game = null
  }

  const walk = (nodeId: ParkNodeId) => {
    if (!scene) {
      pendingWalk = nodeId
      return
    }
    const bundle = BUNDLES.find((item) => item.nodeId === nodeId)
    const profile = save.profiles[save.activeProfileId]
    const available = bundle ? !profile.collectedBundleIds.includes(bundle.id) : false
    scene?.walkTo(nodeId, available ? bundle?.id : undefined)
  }

  const handle = (action: string, element: HTMLElement) => {
    const id = save.activeProfileId
    const target = element.dataset.target === 'replay' ? 'replay' : 'project'
    if (action === 'dismiss-recovery') {
      recoveryNote = null
      render()
      return
    }
    if (action === 'open-parent') {
      parentOpen = true
      parentProfileId = screen === 'park' ? id : parentProfileId
      confirmReset = false
      render()
      return
    }
    if (action === 'close-parent') {
      parentOpen = false
      confirmReset = false
      render()
      return
    }
    if (action === 'parent-profile') {
      if (element instanceof HTMLSelectElement) parentProfileId = element.value
      confirmReset = false
      render()
      return
    }
    if (action === 'switch-profile') {
      screen = 'profiles'
      parentOpen = false
      destroyGame()
      render()
      return
    }
    if (action === 'enter') {
      const profileId = element.dataset.profileId
      if (!profileId) return
      const next = setActiveProfile(save, profileId)
      if (next.error) return
      save = next.save
      persistGame(localStorage, save)
      screen = 'park'
      parentOpen = false
      message = null
      shell.selectedFacility = null
      render()
      ensureGame()
      return
    }
    if (action === 'rename') {
      if (!(element instanceof HTMLInputElement)) return
      const result = renameProfile(save, element.dataset.profileId ?? '', element.value)
      commit(result.save, result.error ? { text: result.error, tone: 'bad' } : null)
      return
    }
    if (action === 'set-avatar') {
      const result = setAvatar(save, element.dataset.profileId ?? '', element.dataset.avatar ?? '')
      commit(result.save, result.error ? { text: result.error, tone: 'bad' } : null)
      return
    }
    if (action === 'set-band') {
      if (!(element instanceof HTMLSelectElement)) return
      const result = setBand(save, parentProfileId, element.value as Band)
      commit(result.save, {
        text: result.error ?? 'The next challenge will use this level. The current challenge stays until you restart it.',
        tone: result.error ? 'bad' : 'info',
      })
      return
    }
    if (action === 'restart-attempt') {
      const result = restartActiveAttempt(save, parentProfileId)
      shell.selectedFacility = null
      commit(result.save, { text: result.error ?? 'The current challenge was restarted. Badges stay.', tone: result.error ? 'bad' : 'info' })
      return
    }
    if (action === 'ask-reset') {
      confirmReset = true
      render()
      return
    }
    if (action === 'confirm-reset') {
      const result = resetProfile(save, parentProfileId)
      confirmReset = false
      shell.selectedFacility = null
      commit(result.save, { text: 'That ranger’s park was reset. The other parks are still here.', tone: 'info' })
      if (parentProfileId === save.activeProfileId) scene?.reset(parkSnapshot(save.profiles[save.activeProfileId]))
      return
    }
    if (action === 'mute') {
      const profile = save.profiles[id]
      commit(setMute(save, id, !profile.mute).save, null)
      return
    }
    if (action === 'welcome') {
      const result = welcomeAvailable(save, id)
      audio.play(result.gained > 0 ? 'ok' : 'no')
      commit(result.save, {
        text: result.gained > 0 ? `Welcomed the campers. They left ${result.gained} coins.` : 'The campers are already welcomed.',
        tone: result.gained > 0 ? 'good' : 'info',
      })
      return
    }
    if (action === 'walk') {
      const node = element.dataset.node ?? ''
      if (!isParkNode(node)) return
      walk(node)
      return
    }
    if (action === 'start-challenge') {
      const family = element.dataset.family as Family
      const result = startChallenge(save, id, family)
      shell.selectedFacility = null
      if (result.error) {
        commit(result.save, { text: result.error, tone: 'bad' })
        return
      }
      commit(result.save, null)
      const node = family === 'trail' ? 'crossing' : family
      if (isParkNode(node)) walk(node)
      return
    }
    if (action === 'place' || action === 'remove') {
      placeToken(action, element.dataset.group ?? '', target)
      return
    }
    if (action === 'toggle-segment') {
      toggleSegment(element.dataset.segment ?? '', target)
      return
    }
    if (action === 'clear-route') {
      const attempt = target === 'replay' ? save.profiles[id].replay?.attempt : save.profiles[id].activeAttempt
      if (!attempt) return
      commit(updateDraft(save, id, { kind: 'trail', segmentIds: [] }, target).save, null)
      return
    }
    if (action === 'select-facility') {
      shell.selectedFacility = element.dataset.facility ?? null
      render()
      return
    }
    if (action === 'place-cell') {
      placeFacility(element.dataset.cell ?? '', target)
      return
    }
    if (action === 'clear-layout') {
      commit(updateDraft(save, id, { kind: 'lookout', placements: [] }, target).save, null)
      return
    }
    if (action === 'check') {
      const attempt = target === 'replay' ? save.profiles[id].replay?.attempt : save.profiles[id].activeAttempt
      if (!attempt) return
      const result = submitPlan(save, id, attempt.draft, target)
      audio.play(result.result === 'valid' ? 'ok' : 'no')
      commit(result.save, {
        text: result.reason ?? 'The plan works. You can build it when you are ready.',
        tone: result.result === 'valid' ? 'good' : 'bad',
      })
      return
    }
    if (action === 'hint') {
      const result = useHint(save, id, target)
      commit(result.save, result.error ? { text: result.error, tone: 'bad' } : null)
      return
    }
    if (action === 'leave') {
      const result = leaveChallenge(save, id, target)
      commit(result.save, { text: 'The plan is saved, and no supplies were spent.', tone: 'info' })
      return
    }
    if (action === 'build') {
      const attemptText = save.profiles[id].activeAttempt?.completionText
      const result = confirmBuild(save, id)
      if (result.error) {
        audio.play('no')
        commit(result.save, { text: result.error, tone: 'bad' })
        return
      }
      audio.play('build')
      commit(result.save, { text: attemptText ?? 'The project is built.', tone: 'good' })
      return
    }
    if (action === 'start-replay') {
      const family = element.dataset.family as Family
      const result = startReplay(save, id, family)
      shell.selectedFacility = null
      commit(result.save, result.error ? { text: result.error, tone: 'bad' } : null)
      return
    }
    if (action === 'resume-replay') {
      commit(resumeReplay(save, id).save, null)
      return
    }
    if (action === 'finish-replay') {
      const result = confirmReplay(save, id)
      if (result.error) {
        audio.play('no')
        commit(result.save, { text: result.error, tone: 'bad' })
        return
      }
      audio.play('ok')
      commit(result.save, { text: `Replay complete. You earned ${result.gained} coins.`, tone: 'good' })
      return
    }
    if (action === 'buy') {
      const result = buyDecoration(save, id, element.dataset.decoration ?? '')
      audio.play(result.error ? 'no' : 'ok')
      commit(result.save, { text: result.error ?? 'The decoration is in the park.', tone: result.error ? 'bad' : 'good' })
    }
  }

  const placeToken = (action: 'place' | 'remove', groupId: string, target: 'project' | 'replay') => {
    const id = save.activeProfileId
    const attempt = target === 'replay' ? save.profiles[id].replay?.attempt : save.profiles[id].activeAttempt
    if (!attempt || attempt.family !== 'campsite' || attempt.draft.kind !== 'campsite') return
    const params = attempt.parameters as CampsiteParams
    const counts = { ...attempt.draft.counts }
    const used = params.groups.reduce((sum, group) => sum + (counts[group.id] ?? 0), 0)
    if (action === 'place') {
      if (used >= params.tokenCount) {
        commit(save, { text: 'The pile is empty. Take one back if you want to move it.', tone: 'bad' })
        return
      }
      counts[groupId] = (counts[groupId] ?? 0) + 1
    } else {
      counts[groupId] = Math.max(0, (counts[groupId] ?? 0) - 1)
    }
    const plan: CampsitePlan = { kind: 'campsite', counts }
    commit(updateDraft(save, id, plan, target).save, null)
  }

  const toggleSegment = (segmentId: string, target: 'project' | 'replay') => {
    const id = save.activeProfileId
    const attempt = target === 'replay' ? save.profiles[id].replay?.attempt : save.profiles[id].activeAttempt
    if (!attempt || attempt.draft.kind !== 'trail') return
    const segmentIds = [...attempt.draft.segmentIds]
    const index = segmentIds.indexOf(segmentId)
    if (index >= 0) segmentIds.splice(index, 1)
    else segmentIds.push(segmentId)
    const plan: TrailPlan = { kind: 'trail', segmentIds }
    commit(updateDraft(save, id, plan, target).save, null)
  }

  const placeFacility = (cellId: string, target: 'project' | 'replay') => {
    const id = save.activeProfileId
    const attempt = target === 'replay' ? save.profiles[id].replay?.attempt : save.profiles[id].activeAttempt
    if (!attempt || attempt.draft.kind !== 'lookout') return
    const facilityId = shell.selectedFacility
    if (!facilityId) {
      commit(save, { text: 'Choose a building, then choose a cell.', tone: 'info' })
      return
    }
    const params = attempt.parameters as LookoutParams
    if (!params.cells.some((cell) => cell.id === cellId)) return
    const placements = attempt.draft.placements.filter((placement) => placement.facilityId !== facilityId && placement.cellId !== cellId)
    placements.push({ facilityId, cellId })
    const plan: LookoutPlan = { kind: 'lookout', placements }
    commit(updateDraft(save, id, plan, target).save, null)
  }

  render()

  return () => {
    window.removeEventListener('resize', onResize)
    destroyGame()
    shell.destroy()
  }
}
