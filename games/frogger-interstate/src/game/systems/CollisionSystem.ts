import type { Frog } from '../domain/Frog'
import type { Vehicle } from '../entities/Vehicle'

function intersects(a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export class CollisionSystem {
  hasFrogCollision(params: { frog: Frog; vehicles: readonly Vehicle[] }): boolean {
    const frogRect = params.frog.getRect()
    for (const v of params.vehicles) {
      const vRect = v.getRect()
      if (intersects(frogRect, vRect)) return true
    }
    return false
  }
}

