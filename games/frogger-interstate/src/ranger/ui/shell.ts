import { LOOKOUT_MISSIONS } from '../content/lookout.ts'
import type { CampsiteParams, LookoutParams, TrailParams } from '../content/types.ts'
import {
  AVATAR_IDS,
  BAND_LABEL,
  DECORATIONS,
  PROFILE_IDS,
  PROJECT_LABEL,
  quarterLabel,
  rankLabel,
} from '../content/world.ts'
import type { ActiveAttempt, Profile, SaveFile } from '../model/profile.ts'
import { PARK_NODE_LIST } from '../presentation/layout.ts'
import { currentHint, openProject, parkComplete } from '../rules/session.ts'
import { trailSelectionTotals } from '../rules/validate.ts'

export type Tone = 'info' | 'good' | 'bad'

export type ShellModel = {
  screen: 'profiles' | 'park'
  parentOpen: boolean
  save: SaveFile
  recoveryNote: string | null
  message: { text: string; tone: Tone } | null
  confirmReset: boolean
  parentProfileId: string
}

type ButtonSpec = {
  action: string
  label: string
  primary?: boolean
  attrs?: Record<string, string>
  pressed?: boolean
}

const FIELD_NOTE = LOOKOUT_MISSIONS[0]?.fieldNote ?? ''

export class RangerShell {
  readonly root: HTMLElement
  readonly stage: HTMLElement
  selectedFacility: string | null = null
  private readonly onAction: (action: string, element: HTMLElement) => void
  private readonly onClick: (event: Event) => void
  private readonly onChange: (event: Event) => void

  constructor(root: HTMLElement, onAction: (action: string, element: HTMLElement) => void) {
    this.root = root
    this.onAction = onAction
    root.className = 'ranger-app'
    root.innerHTML = `
      <div id="recovery"></div>
      <div id="profile-screen"></div>
      <div id="park-screen" hidden>
        <header id="status" class="status-strip"></header>
        <div class="ranger-body">
          <section id="mission" class="mission-panel"></section>
          <div id="park-stage" class="park-stage"></div>
          <section id="challenge" class="challenge-dock"></section>
          <nav id="destinations" class="destination-list" aria-label="Walk to a place"></nav>
        </div>
      </div>
      <div id="parent-screen" class="parent-panel" hidden></div>
    `
    this.stage = root.querySelector('#park-stage') as HTMLElement
    this.onClick = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('[data-action]')
      if (!(button instanceof HTMLElement) || !this.root.contains(button)) return
      if (button instanceof HTMLInputElement || button instanceof HTMLSelectElement) return
      this.onAction(button.dataset.action ?? '', button)
    }
    this.onChange = (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const action = target.dataset.action
      if (!action) return
      this.onAction(action, target)
    }
    root.addEventListener('click', this.onClick)
    root.addEventListener('change', this.onChange)
  }

  destroy(): void {
    this.root.removeEventListener('click', this.onClick)
    this.root.removeEventListener('change', this.onChange)
  }

  render(model: ShellModel): void {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.focusKey : undefined
    const profile = model.save.profiles[model.save.activeProfileId]
    const parent = namedProfile(model.save, model.parentProfileId)
    const attempt = shownAttempt(profile)
    this.root.dataset.screen = model.screen
    this.root.dataset.panel = model.parentOpen ? 'parent' : model.screen
    this.root.dataset.profileId = profile.id
    this.root.dataset.band = profile.band
    this.root.dataset.missionId = attempt?.missionId ?? ''
    this.root.dataset.missionBand = attempt?.band ?? ''
    this.root.dataset.phase = phaseOf(profile, model.screen)
    this.root.dataset.supplies = String(profile.supplies)
    this.root.dataset.coins = String(profile.coins)
    this.root.dataset.intro = profile.intro
    this.root.dataset.campsite = profile.projects.campsite
    this.root.dataset.trail = profile.projects.trail
    this.root.dataset.lookout = profile.projects.lookout
    this.root.dataset.badges = profile.badges.join(',')
    this.root.dataset.decorations = profile.decorations.join(',')
    this.root.dataset.hints = String(attempt?.hintsUsed ?? 0)
    const recovery = this.root.querySelector('#recovery') as HTMLElement
    const profiles = this.root.querySelector('#profile-screen') as HTMLElement
    const park = this.root.querySelector('#park-screen') as HTMLElement
    const parentEl = this.root.querySelector('#parent-screen') as HTMLElement
    recovery.innerHTML = model.recoveryNote
      ? `<div class="recovery" role="status"><p>${esc(model.recoveryNote)}</p><button type="button" class="secondary" data-action="dismiss-recovery" data-focus-key="dismiss-recovery">OK</button></div>`
      : ''
    profiles.hidden = model.screen !== 'profiles'
    park.hidden = model.screen !== 'park'
    parentEl.hidden = !model.parentOpen
    if (model.screen === 'profiles') profiles.innerHTML = this.profileHtml(model)
    if (model.screen === 'park') {
      ;(this.root.querySelector('#status') as HTMLElement).innerHTML = this.statusHtml(profile)
      ;(this.root.querySelector('#mission') as HTMLElement).innerHTML = this.missionHtml(profile, model.message)
      ;(this.root.querySelector('#challenge') as HTMLElement).innerHTML = this.challengeHtml(profile)
      ;(this.root.querySelector('#destinations') as HTMLElement).innerHTML = this.destinationHtml()
    }
    if (model.parentOpen) parentEl.innerHTML = this.parentHtml(model, parent)
    if (focus) {
      const next = this.root.querySelector(`[data-focus-key="${cssEscape(focus)}"]`)
      if (next instanceof HTMLElement) next.focus()
    }
  }

  private profileHtml(model: ShellModel): string {
    const cards = PROFILE_IDS.map((id) => {
      const profile = model.save.profiles[id]
      const hats = AVATAR_IDS.map(
        (avatar) =>
          `<button type="button" data-action="set-avatar" data-profile-id="${id}" data-avatar="${avatar}" data-focus-key="avatar:${id}:${avatar}" aria-pressed="${profile.avatarId === avatar}" aria-label="${avatar} hat"><span class="hat hat-${avatar}"></span></button>`,
      ).join('')
      return `<article class="profile-card">
        <span class="hat hat-${profile.avatarId}" aria-hidden="true"></span>
        <label>Nickname
          <input data-action="rename" data-profile-id="${id}" data-focus-key="nick:${id}" value="${esc(profile.nickname)}" maxlength="16" />
        </label>
        <div class="avatar-choices">${hats}</div>
        <p class="level-note">Starting level: ${esc(BAND_LABEL[profile.band] ?? profile.band)}. This is a level, not a grade.</p>
        <button type="button" class="action" data-action="enter" data-profile-id="${id}" data-focus-key="enter:${id}">Play as ${esc(profile.nickname)}</button>
      </article>`
    }).join('')
    return `<div class="story-banner" aria-hidden="true"><span class="story-sun"></span><span class="story-hill"></span><span class="story-cabin"></span></div>
      <p class="chapter">The morning after the windstorm</p>
      <h1>Ranger Park</h1>
      <p>A big friendly wind crossed the park last night. It flattened the tents, pulled the planks off the creek bridge, and sent the deer up the far hill to wait. This morning Ava, Noah, and Lila are at the gate with their bedrolls. Pick a ranger. Each child keeps a separate park, and together you open this one again.</p>
      <div class="profile-grid">${cards}</div>
      <button type="button" class="secondary" data-action="open-parent" data-focus-key="open-parent">Grown-ups</button>`
  }

  private statusHtml(profile: Profile): string {
    const open = openProject(profile)
    const project = parkComplete(profile) ? 'Park open' : PROJECT_LABEL[open ?? 'campsite']
    return `<span>Supplies <strong>${profile.supplies}</strong></span>
      <span>Coins <strong>${profile.coins}</strong></span>
      <span>Rank <strong>${esc(rankLabel(profile.badges.length))}</strong></span>
      <span>Badges <strong>${esc(badgeNames(profile.badges))}</strong></span>
      <span>Project <strong>${esc(project ?? '')}</strong></span>
      <button type="button" data-action="mute" data-focus-key="mute" aria-pressed="${profile.mute}">${profile.mute ? 'Sound off' : 'Sound on'}</button>
      <button type="button" data-action="open-parent" data-focus-key="open-parent-park">Grown-ups</button>
      <button type="button" data-action="switch-profile" data-focus-key="switch-profile">Switch ranger</button>`
  }

  private missionHtml(profile: Profile, message: ShellModel['message']): string {
    const buttons = missionButtons(profile)
    const attempt = shownAttempt(profile)
    const hint = currentHint(attempt)
    const feedback = message
      ? `<p class="feedback" data-feedback data-tone="${message.tone}" aria-live="polite">${esc(message.text)}</p>`
      : `<p class="feedback" data-feedback data-tone="info" aria-live="polite"></p>`
    const hintHtml = hint ? `<p class="hint" data-hint>${esc(hint.text)}</p>` : ''
    return `<p class="chapter">Field journal</p>
      <h1>${esc(missionTitle(profile))}</h1>
      <p>${esc(missionText(profile))}</p>
      ${hintHtml}
      ${feedback}
      <div class="button-row">${buttons.map(renderButton).join('')}</div>`
  }

  private challengeHtml(profile: Profile): string {
    const replay = profile.replay && profile.replay.stage !== 'ready' ? profile.replay : null
    const projectId = openProject(profile)
    const projectLive =
      !replay && projectId && (profile.projects[projectId] === 'challenging' || profile.projects[projectId] === 'planValid')
    const attempt = replay?.attempt ?? (projectLive ? profile.activeAttempt : null)
    if (!attempt) return ''
    const hintIds = new Set(currentHint(attempt)?.highlightIds ?? [])
    const target = replay ? 'replay' : 'project'
    if (attempt.family === 'campsite') return campsiteHtml(attempt, attempt.parameters as CampsiteParams, hintIds, target)
    if (attempt.family === 'trail') return trailHtml(attempt, attempt.parameters as TrailParams, hintIds, target)
    return lookoutHtml(attempt, attempt.parameters as LookoutParams, hintIds, this.selectedFacility, target)
  }

  private destinationHtml(): string {
    return PARK_NODE_LIST.map(
      (node) =>
        `<button type="button" data-action="walk" data-node="${node.id}" data-focus-key="walk:${node.id}">${esc(node.label)}</button>`,
    ).join('')
  }

  private parentHtml(model: ShellModel, profile: Profile): string {
    const options = (['explorer', 'trailblazer', 'pathfinder'] as const)
      .map((band) => `<option value="${band}" ${profile.band === band ? 'selected' : ''}>${BAND_LABEL[band]}</option>`)
      .join('')
    const rangerOptions = PROFILE_IDS.map((id) => {
      const person = model.save.profiles[id]
      return `<option value="${id}" ${profile.id === id ? 'selected' : ''}>${esc(person.nickname)}</option>`
    }).join('')
    const history = profile.skillHistory
      .slice(-8)
      .reverse()
      .map(
        (record) =>
          `<li class="history-item"><strong>${esc(PROJECT_LABEL[record.family] ?? record.family)}</strong> · ${esc(BAND_LABEL[record.band] ?? record.band)} · ${esc(record.outcome)}<br />Skills: ${esc(record.skillTags.join(', ') || 'none')}<br />Attempts: ${record.attempts}. Hints: ${record.hintsUsed}.</li>`,
      )
      .join('')
    const built = (['campsite', 'trail', 'lookout'] as const)
      .map((id) => `<li>${esc(PROJECT_LABEL[id] ?? id)}: ${profile.projects[id] === 'built' ? 'completed' : 'not completed'}</li>`)
      .join('')
    const reset = model.confirmReset
      ? `<button type="button" class="action" data-action="confirm-reset" data-focus-key="confirm-reset">Yes, reset only ${esc(profile.nickname)}</button>`
      : `<button type="button" data-action="ask-reset" data-focus-key="ask-reset">Reset this ranger's park</button>`
    return `<h2>Grown-ups</h2>
      <p>This is a progress record, not a mastery score. Retrying does not remove badges.</p>
      <label>Ranger
        <select data-action="parent-profile" data-focus-key="parent-profile">${rangerOptions}</select>
      </label>
      <p><strong>${esc(profile.nickname)}</strong> · current level ${esc(BAND_LABEL[profile.band] ?? profile.band)}</p>
      <label>Level for the next challenge
        <select data-action="set-band" data-focus-key="band">${options}</select>
      </label>
      <p class="level-note">A level change waits for the next challenge. Restart only if you want a new one now.</p>
      <button type="button" data-action="restart-attempt" data-focus-key="restart-attempt">Restart the current challenge</button>
      <h3>Projects</h3>
      <ul>${built}</ul>
      <h3>Recent practice</h3>
      <ul>${history || '<li>No challenges recorded yet.</li>'}</ul>
      ${reset}
      <button type="button" data-action="close-parent" data-focus-key="close-parent">Back</button>`
  }
}

function namedProfile(save: SaveFile, id: string): Profile {
  if (id === 'ranger-1' || id === 'ranger-2' || id === 'ranger-3') return save.profiles[id]
  return save.profiles[save.activeProfileId]
}

function shownAttempt(profile: Profile): ActiveAttempt | null {
  if (profile.replay && profile.replay.stage !== 'ready') return profile.replay.attempt
  const open = openProject(profile)
  if (!open) return profile.replay?.attempt ?? null
  if (profile.projects[open] === 'challenging' || profile.projects[open] === 'planValid') return profile.activeAttempt
  return profile.activeAttempt?.family === open ? profile.activeAttempt : null
}

function phaseOf(profile: Profile, screen: string): string {
  if (screen !== 'park') return screen
  if (profile.replay && profile.replay.stage !== 'ready') return profile.replay.stage
  if (parkComplete(profile)) return 'complete'
  if (profile.intro !== 'play') return profile.intro
  const open = openProject(profile)
  return open ? profile.projects[open] : 'complete'
}

function missionTitle(profile: Profile): string {
  if (profile.replay && profile.replay.stage !== 'ready') return 'One more story'
  if (parkComplete(profile)) return 'The park is open'
  if (profile.intro === 'welcome') return 'Chapter 1 · At the gate'
  if (profile.intro === 'collect') return 'Chapter 2 · The lost crate'
  const open = openProject(profile)
  if (open === 'campsite') return 'Chapter 3 · Tents for three'
  if (open === 'trail') return 'Chapter 4 · A way across'
  if (open === 'lookout') return 'Chapter 5 · Deer hill'
  return 'Ranger Park'
}

function missionText(profile: Profile): string {
  const replay = profile.replay
  if (replay && replay.stage !== 'ready') {
    const ready = replay.stage === 'planValid' ? ' This plan works. The park you already built stays built.' : ''
    return `The campers want to practice that job again. ${replay.attempt.instructions}${ready}`
  }
  if (parkComplete(profile)) {
    return `Lanterns glow over the tents, the creek bridge holds, and the deer have come back to the far meadow. Ava, Noah, and Lila stay on the trail to watch. ${FIELD_NOTE}`
  }
  if (profile.intro === 'welcome') {
    return 'Ava, Noah, and Lila waited under the pines with muddy boots and hopeful faces. Welcome them so they know a ranger is here.'
  }
  if (profile.intro === 'collect') {
    return 'The wind rolled the supply crate into the meadow. Walk over and bring it back. The tents cannot rise without it.'
  }
  const open = openProject(profile)
  const attempt = profile.activeAttempt
  if (!open || !attempt || profile.projects[open] === 'ready') {
    if (open === 'campsite') return 'The campsite is a tumble of pegs and flat canvas. Ava, Noah, and Lila each need a tent. Plan the supplies, then the camp can come to life.'
    if (open === 'trail') return 'The storm pulled the planks off the creek. The muddy shortcut is closed. Find a safe way across before anyone tries to jump the water.'
    return 'You can hear the deer on the far hill. Walking into their meadow would send them away. Plan a lookout on safe ground so the campers can watch from the trail.'
  }
  const why =
    open === 'campsite'
      ? 'Give every camper the supplies their tent needs. '
      : open === 'trail'
        ? 'Pick a route the campers can really walk. '
        : 'Keep the deer meadow clear and connect the lookout to the trail. '
  if (profile.projects[open] === 'planValid') {
    return `${why}${attempt.instructions} The plan works. Building uses ${attempt.supplyCost} supplies.`
  }
  return `${why}${attempt.instructions}`
}

function missionButtons(profile: Profile): ButtonSpec[] {
  const replay = profile.replay
  if (replay && replay.stage !== 'ready') {
    const buttons: ButtonSpec[] = [
      { action: 'check', label: 'Check my plan', primary: replay.stage !== 'planValid', attrs: { target: 'replay' } },
      { action: 'hint', label: 'Hint', attrs: { target: 'replay' } },
      { action: 'leave', label: 'Leave for now', attrs: { target: 'replay' } },
    ]
    if (replay.stage === 'planValid') buttons.unshift({ action: 'finish-replay', label: 'Finish this replay', primary: true })
    return buttons
  }
  if (parkComplete(profile)) {
    const buttons: ButtonSpec[] = []
    if (replay?.stage === 'ready') buttons.push({ action: 'resume-replay', label: 'Continue the replay', primary: true })
    buttons.push(
      { action: 'start-replay', label: 'Try another campsite plan', attrs: { family: 'campsite' } },
      { action: 'start-replay', label: 'Try another route', attrs: { family: 'trail' } },
      { action: 'start-replay', label: 'Try another lookout', attrs: { family: 'lookout' } },
    )
    for (const item of DECORATIONS) {
      const owned = profile.decorations.includes(item.id)
      buttons.push({
        action: 'buy',
        label: owned ? `${item.name} added` : `Add ${item.name} (${item.cost} coins)`,
        attrs: { decoration: item.id },
      })
    }
    return buttons
  }
  if (profile.intro === 'welcome') return [{ action: 'welcome', label: 'Welcome Ava, Noah, and Lila', primary: true }]
  if (profile.intro === 'collect') return [{ action: 'walk', label: 'Fetch the meadow crate', primary: true, attrs: { node: 'meadow' } }]
  const open = openProject(profile)
  if (!open) return []
  if (profile.projects[open] === 'ready' || !profile.activeAttempt) {
    const label = open === 'campsite' ? 'Sort the tent supplies' : open === 'trail' ? 'Find a way across' : 'Plan the lookout'
    return [{ action: 'start-challenge', label, primary: true, attrs: { family: open } }]
  }
  const buttons: ButtonSpec[] = [
    { action: 'check', label: 'Check my plan', primary: profile.projects[open] !== 'planValid', attrs: { target: 'project' } },
    { action: 'hint', label: 'Hint', attrs: { target: 'project' } },
    { action: 'leave', label: 'Leave for now', attrs: { target: 'project' } },
  ]
  if (profile.projects[open] === 'planValid') {
    const buildLabel = open === 'campsite' ? 'Raise the tents' : open === 'trail' ? 'Lay the bridge' : 'Open the lookout'
    buttons.unshift({ action: 'build', label: buildLabel, primary: true })
  }
  return buttons
}

function campsiteHtml(attempt: ActiveAttempt, params: CampsiteParams, hintIds: Set<string>, target: string): string {
  const draft = attempt.draft.kind === 'campsite' ? attempt.draft.counts : {}
  const used = params.groups.reduce((sum, group) => sum + (draft[group.id] ?? 0), 0)
  const groups = params.groups
    .map((group) => {
      const count = draft[group.id] ?? 0
      const need =
        params.mode === 'share'
          ? ''
          : params.mode === 'fractions'
            ? `<p>Needs ${esc(quarterLabel(group.need))} bundle.</p>`
            : `<p>${slots(group.need, count)} ${group.need} ${group.need === 1 ? 'slot' : 'slots'}</p>`
      return `<div class="group ${hintIds.has(group.id) ? 'is-highlighted' : ''}" data-group-id="${esc(group.id)}">
        <h2>${esc(group.label)}</h2>
        ${need}
        <p>Placed: ${count}</p>
        <div class="button-row">
          <button type="button" data-action="place" data-target="${target}" data-group="${esc(group.id)}" data-focus-key="place:${esc(group.id)}">Place one in ${esc(group.label)}</button>
          <button type="button" data-action="remove" data-target="${target}" data-group="${esc(group.id)}" data-focus-key="remove:${esc(group.id)}">Take one back</button>
        </div>
      </div>`
    })
    .join('')
  const unit = params.mode === 'fractions' ? 'quarter pieces' : 'tokens'
  return `<h2>Supplies</h2><p>Pile: ${params.tokenCount - used} ${unit} left.</p>${groups}`
}

function slots(need: number, placed: number): string {
  const marks = []
  for (let index = 0; index < need; index += 1) {
    marks.push(`<span class="slot ${index < placed ? 'is-filled' : ''}"></span>`)
  }
  return `<span class="slots" aria-hidden="true">${marks.join('')}</span>`
}

function trailHtml(attempt: ActiveAttempt, params: TrailParams, hintIds: Set<string>, target: string): string {
  const selected = attempt.draft.kind === 'trail' ? attempt.draft.segmentIds : []
  const totals = trailSelectionTotals(params, selected)
  const route =
    selected.length === 0
      ? 'No trail parts selected yet.'
      : selected
          .map((id, index) => {
            const segment = params.segments.find((item) => item.id === id)
            return `${index + 1}. ${segment?.label ?? id}`
          })
          .join(' ')
  const distance = params.showDistance ? ` Walk length ${totals.distance}.` : ''
  const buttons = params.segments
    .map((segment) => {
      const pressed = selected.includes(segment.id)
      const detail = segment.closed
        ? 'Closed'
        : `${segment.cost} supplies${params.showDistance ? `, distance ${segment.distance}` : ''}`
      return `<button type="button" class="segment ${segment.closed ? 'is-closed' : ''} ${hintIds.has(segment.id) ? 'is-highlighted' : ''}" data-action="toggle-segment" data-target="${target}" data-segment="${esc(segment.id)}" data-focus-key="segment:${esc(segment.id)}" aria-pressed="${pressed}">${esc(segment.label)}. ${esc(detail)}</button>`
    })
    .join('')
  return `<h2>Route</h2>
    <p>${esc(route)} Supplies so far: ${totals.cost}. Budget: ${params.budget}.${distance}</p>
    <div class="button-row">${buttons}</div>
    <button type="button" data-action="clear-route" data-target="${target}" data-focus-key="clear-route">Clear route</button>`
}

function lookoutHtml(
  attempt: ActiveAttempt,
  params: LookoutParams,
  hintIds: Set<string>,
  selectedFacility: string | null,
  target: string,
): string {
  const placements = attempt.draft.kind === 'lookout' ? attempt.draft.placements : []
  const facilities = params.facilities
    .filter((facility) => params.requiredIds.includes(facility.id) || params.chooseOneOf?.includes(facility.id))
    .map((facility) => {
      const cost = params.maxBudget !== undefined ? `, ${facility.cost} space` : ''
      return `<button type="button" class="${hintIds.has(facility.id) ? 'is-highlighted' : ''}" data-action="select-facility" data-target="${target}" data-facility="${esc(facility.id)}" data-focus-key="facility:${esc(facility.id)}" aria-pressed="${selectedFacility === facility.id}">${esc(facility.label)}${esc(cost)}</button>`
    })
    .join('')
  const cells = params.cells
    .map((cell) => {
      const occupant = placements.find((placement) => placement.cellId === cell.id)
      const facility = params.facilities.find((item) => item.id === occupant?.facilityId)
      const kind = cell.kind === 'habitat' ? 'Habitat' : cell.kind === 'buffer' ? 'Buffer' : cell.kind === 'water' ? 'Water' : cell.kind === 'trail' ? 'Trail' : 'Safe'
      return `<button type="button" class="cell-${cell.kind} ${hintIds.has(cell.id) ? 'is-highlighted' : ''}" data-action="place-cell" data-target="${target}" data-cell="${esc(cell.id)}" data-focus-key="cell:${esc(cell.id)}"><span>${kind}</span><span>${esc(cell.label)}</span><span>${facility ? esc(facility.label) : 'Empty'}</span></button>`
    })
    .join('')
  return `<h2>Lookout map</h2>
    <p>Select a building, then choose a cell. Patterns and words mark water, habitat, and buffer.</p>
    <div class="facility-row">${facilities}</div>
    <div class="cell-grid" style="grid-template-columns: repeat(${params.columns}, minmax(44px, 1fr))">${cells}</div>
    <button type="button" data-action="clear-layout" data-target="${target}" data-focus-key="clear-layout">Clear buildings</button>`
}

function badgeNames(badges: string[]): string {
  const names: string[] = []
  if (badges.includes('badge-campsite')) names.push('Campsite')
  if (badges.includes('badge-trail')) names.push('Crossing')
  if (badges.includes('badge-lookout')) names.push('Lookout')
  return names.length > 0 ? names.join(', ') : 'None yet'
}

function renderButton(button: ButtonSpec): string {
  const attrs = Object.entries(button.attrs ?? {})
    .map(([key, value]) => ` data-${key}="${esc(value)}"`)
    .join('')
  const focus = `${button.action}:${Object.values(button.attrs ?? {}).join(':')}`
  const pressed = button.pressed === undefined ? '' : ` aria-pressed="${button.pressed}"`
  return `<button type="button" class="${button.primary ? 'action' : 'secondary'}" data-action="${esc(button.action)}" data-focus-key="${esc(focus)}"${attrs}${pressed}>${esc(button.label)}</button>`
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === '&') return '&amp;'
    if (char === '<') return '&lt;'
    if (char === '>') return '&gt;'
    if (char === '"') return '&quot;'
    return '&#39;'
  })
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
}
