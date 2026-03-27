import {
  HOME_LANE_INDEX,
  LANE_HEIGHT,
  MEDIAN_LANE_INDEX,
  START_LANE_INDEX,
} from '../constants'

export type LaneKind = 'safe' | 'road'

export class Lane {
  readonly index: number
  readonly kind: LaneKind
  readonly y: number
  readonly direction: 1 | -1

  constructor(index: number) {
    this.index = index
    this.kind =
      index === HOME_LANE_INDEX ||
      index === START_LANE_INDEX ||
      index === MEDIAN_LANE_INDEX
        ? 'safe'
        : 'road'
    this.y = (index + 0.5) * LANE_HEIGHT
    // Alternate traffic direction like classic Frogger.
    this.direction = index % 2 === 0 ? 1 : -1
  }

  get isRoad(): boolean {
    return this.kind === 'road'
  }
}

