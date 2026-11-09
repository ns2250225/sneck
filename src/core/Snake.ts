import { DIRECTION_VECTORS, type Direction, type Point } from './types'

export class Snake {
  body: Point[] = []
  direction: Direction
  private growPending = 0

  constructor(start: Point, direction: Direction, length = 3) {
    this.direction = direction
    const v = DIRECTION_VECTORS[direction]
    for (let i = 0; i < length; i++) {
      this.body.push({ x: start.x - v.x * i, y: start.y - v.y * i })
    }
  }

  get head(): Point {
    return this.body[0]
  }

  get tail(): Point {
    return this.body[this.body.length - 1]
  }

  get length(): number {
    return this.body.length
  }

  get willGrow(): boolean {
    return this.growPending > 0
  }

  nextHead(direction: Direction): Point {
    const v = DIRECTION_VECTORS[direction]
    return { x: this.head.x + v.x, y: this.head.y + v.y }
  }

  moveTo(newHead: Point, direction: Direction) {
    this.direction = direction
    this.body.unshift(newHead)
    if (this.growPending > 0) {
      this.growPending--
    } else {
      this.body.pop()
    }
  }

  grow(n: number) {
    this.growPending += n
  }

  shrink(n: number, minLength = 3) {
    const removable = Math.max(0, this.body.length - minLength)
    const count = Math.min(n, removable)
    this.body.splice(this.body.length - count, count)
    this.growPending = 0
  }

  occupies(p: Point, skipHead = false): boolean {
    for (let i = skipHead ? 1 : 0; i < this.body.length; i++) {
      const s = this.body[i]
      if (s.x === p.x && s.y === p.y) return true
    }
    return false
  }
}
