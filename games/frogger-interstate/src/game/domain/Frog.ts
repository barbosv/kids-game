import { FROG_HEIGHT, FROG_JUMP_ARC_PX, FROG_JUMP_DURATION_MS, FROG_WIDTH } from '../constants'
import { LANE_HEIGHT } from '../constants'

export class Frog {
  x: number

  laneIndex: number
  y: number
  isJumping = false
  jumpProgress01 = 0

  private jumpStartTimeMs = 0
  private toLaneIndex = 0
  private jumpStartX = 0
  private jumpTargetX = 0
  private jumpStartY = 0
  private jumpTargetY = 0

  constructor(x: number, startLaneIndex: number) {
    this.x = x
    this.laneIndex = startLaneIndex
    this.y = (startLaneIndex + 0.5) * LANE_HEIGHT
  }

  requestMove(targetLaneIndex: number, targetX: number, nowMs: number): boolean {
    if (this.isJumping) return false
    const targetY = (targetLaneIndex + 0.5) * LANE_HEIGHT
    if (targetLaneIndex === this.laneIndex && targetX === this.x) return false
    this.isJumping = true
    this.toLaneIndex = targetLaneIndex
    this.jumpStartTimeMs = nowMs
    this.jumpStartX = this.x
    this.jumpTargetX = targetX
    this.jumpStartY = this.y
    this.jumpTargetY = targetY
    this.jumpProgress01 = 0
    return true
  }

  /**
   * Updates y based on current jump progress.
   * Returns `true` when the frog has landed on the target lane.
   */
  update(nowMs: number): boolean {
    if (!this.isJumping) return false

    const t = (nowMs - this.jumpStartTimeMs) / FROG_JUMP_DURATION_MS
    const clamped = Math.max(0, Math.min(1, t))
    this.jumpProgress01 = clamped

    // Ease-out/in-ish jump curve.
    // This is intentionally simple so collisions feel consistent.
    const eased = clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2

    this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * eased

    // Lerp y and add an arc that peaks mid-jump.
    const yLerp = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * eased
    const arc = Math.sin(Math.PI * clamped) * FROG_JUMP_ARC_PX
    // Jump direction doesn't matter for arc; it always "lifts" during movement.
    this.y = yLerp - arc

    if (clamped >= 1) {
      this.isJumping = false
      this.laneIndex = this.toLaneIndex
      this.x = this.jumpTargetX
      this.y = (this.laneIndex + 0.5) * LANE_HEIGHT
      this.jumpProgress01 = 0
      return true
    }

    return false
  }

  getRect() {
    const left = this.x - FROG_WIDTH / 2
    const top = this.y - FROG_HEIGHT / 2
    return { left, right: left + FROG_WIDTH, top, bottom: top + FROG_HEIGHT }
  }
}

