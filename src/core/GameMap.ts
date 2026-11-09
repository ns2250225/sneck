import type { Point } from './types'
import { pointKey, randInt } from '@/utils/helpers'

export class GameMap {
  readonly cols: number
  readonly rows: number
  readonly wrap: boolean
  obstacles: Point[] = []
  private obstacleSet = new Set<number>()

  constructor(cols: number, rows: number, wrap: boolean) {
    this.cols = cols
    this.rows = rows
    this.wrap = wrap
  }

  inBounds(p: Point): boolean {
    return p.x >= 0 && p.y >= 0 && p.x < this.cols && p.y < this.rows
  }

  wrapPoint(p: Point): Point {
    return {
      x: (p.x + this.cols) % this.cols,
      y: (p.y + this.rows) % this.rows,
    }
  }

  isObstacle(p: Point): boolean {
    return this.obstacleSet.has(pointKey(p.x, p.y))
  }

  clearObstacles() {
    this.obstacles = []
    this.obstacleSet.clear()
  }

  /** Generates random wall pieces (lines and L-shapes), never inside `blocked` cells. */
  generateObstacles(pieceCount: number, blocked: Set<number>) {
    this.clearObstacles()
    const margin = 1
    let attempts = 0
    let placed = 0
    while (placed < pieceCount && attempts < pieceCount * 60) {
      attempts++
      const shape = this.randomShape()
      const ox = randInt(margin, this.cols - 1 - margin)
      const oy = randInt(margin, this.rows - 1 - margin)
      const cells = shape.map((c) => ({ x: ox + c.x, y: oy + c.y }))
      const valid = cells.every(
        (c) =>
          c.x >= margin &&
          c.y >= margin &&
          c.x < this.cols - margin &&
          c.y < this.rows - margin &&
          !blocked.has(pointKey(c.x, c.y)) &&
          !this.hasObstacleNear(c),
      )
      if (!valid) continue
      for (const c of cells) {
        this.obstacles.push(c)
        this.obstacleSet.add(pointKey(c.x, c.y))
      }
      placed++
    }
  }

  private hasObstacleNear(p: Point): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.obstacleSet.has(pointKey(p.x + dx, p.y + dy))) return true
      }
    }
    return false
  }

  private randomShape(): Point[] {
    const len = randInt(2, 5)
    const kind = randInt(0, 3)
    const cells: Point[] = []
    if (kind === 0) {
      for (let i = 0; i < len; i++) cells.push({ x: i, y: 0 })
    } else if (kind === 1) {
      for (let i = 0; i < len; i++) cells.push({ x: 0, y: i })
    } else if (kind === 2) {
      for (let i = 0; i < len; i++) cells.push({ x: i, y: 0 })
      for (let i = 1; i < Math.max(2, len - 1); i++) cells.push({ x: 0, y: i })
    } else {
      cells.push({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })
    }
    return cells
  }
}
