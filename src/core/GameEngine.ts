import { GameMap } from './GameMap'
import { Snake } from './Snake'
import { FoodManager, FOOD_INFO, type FoodItem } from './Food'
import { checkCollision, type CollisionKind } from './Collision'
import {
  MODES,
  OPPOSITE,
  SPEED_INTERVALS,
  type Direction,
  type EffectType,
  type GameMode,
  type Point,
} from './types'
import { clamp, pick, pointKey } from '@/utils/helpers'

export type EngineState = 'ready' | 'playing' | 'paused' | 'over'

export type EndReason = Exclude<CollisionKind, 'none'> | 'timeout' | 'quit'

export type SpecialOutcome = 'double' | 'ghost' | 'shrink' | 'slow' | 'fast' | 'bonus'

export interface EngineOptions {
  mode: GameMode
  cols: number
  rows: number
  baseSpeed: number
  autoSpeed: boolean
  timeLimitSec?: number
}

export interface EatEvent {
  food: FoodItem
  points: number
  combo: number
  special?: SpecialOutcome
}

export interface EngineEvents {
  onEat?: (e: EatEvent) => void
  onGameOver?: (reason: EndReason) => void
  onLevelUp?: (level: number) => void
  onSpeedChange?: (level: number) => void
  onStep?: () => void
  onTurn?: (dir: Direction) => void
}

export const EFFECT_DURATION: Record<EffectType, number> = {
  slow: 5000,
  fast: 5000,
  double: 10000,
  ghost: 6000,
}

const FOODS_PER_LEVEL = 8
const COMBO_WINDOW = 3000

export class GameEngine {
  readonly options: EngineOptions
  map: GameMap
  snake!: Snake
  food: FoodManager
  state: EngineState = 'ready'
  events: EngineEvents = {}

  score = 0
  foodsEaten = 0
  normalEaten = 0
  /** Play time in ms, frozen while paused. Used as the engine clock. */
  elapsed = 0
  level = 1
  speedLevel: number
  maxSpeedLevel: number
  combo = 0
  maxCombo = 0
  overReason: EndReason | null = null
  effects = new Map<EffectType, number>()

  private accumulator = 0
  private inputQueue: Direction[] = []
  private lastEatAt = -Infinity

  constructor(options: EngineOptions) {
    this.options = options
    this.map = new GameMap(options.cols, options.rows, MODES[options.mode].wrap)
    this.food = new FoodManager(options.cols, options.rows, {
      regularCount: options.mode === 'timed' ? 3 : 1,
      regularLifetime: options.mode === 'timed' ? 9000 : null,
      specialChancePerSecond: options.mode === 'timed' ? 0.18 : 0.08,
    })
    this.speedLevel = options.baseSpeed
    this.maxSpeedLevel = options.baseSpeed
    this.reset()
  }

  reset() {
    const { cols, rows } = this.options
    const start = { x: Math.floor(cols / 2) - 2, y: Math.floor(rows / 2) }
    this.snake = new Snake(start, 'right', 3)
    this.score = 0
    this.foodsEaten = 0
    this.normalEaten = 0
    this.elapsed = 0
    this.level = 1
    this.combo = 0
    this.maxCombo = 0
    this.speedLevel = this.options.baseSpeed
    this.maxSpeedLevel = this.options.baseSpeed
    this.overReason = null
    this.effects.clear()
    this.accumulator = 0
    this.inputQueue = []
    this.lastEatAt = -Infinity
    this.food.reset()
    this.map.clearObstacles()
    if (this.options.mode === 'obstacle') this.buildObstacles()
    this.food.update(0, 0, (p) => this.isBlocked(p))
    this.state = 'ready'
  }

  get timeLimitMs(): number | null {
    return this.options.mode === 'timed' ? (this.options.timeLimitSec ?? 120) * 1000 : null
  }

  get remainingMs(): number | null {
    const limit = this.timeLimitMs
    return limit === null ? null : Math.max(0, limit - this.elapsed)
  }

  get currentDirection(): Direction {
    return this.inputQueue.length ? this.inputQueue[this.inputQueue.length - 1] : this.snake.direction
  }

  get moveInterval(): number {
    const lvl = clamp(this.speedLevel, 1, 5)
    const lo = Math.floor(lvl)
    const hi = Math.min(5, lo + 1)
    const t = lvl - lo
    let interval = SPEED_INTERVALS[lo - 1] * (1 - t) + SPEED_INTERVALS[hi - 1] * t
    if (this.effects.has('slow')) interval *= 1.5
    if (this.effects.has('fast')) interval *= 0.7
    return interval
  }

  start() {
    if (this.state === 'ready' || this.state === 'paused') this.state = 'playing'
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused'
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing'
  }

  /** Queues a direction change; reverse and duplicate inputs are rejected. */
  setDirection(dir: Direction): boolean {
    if (this.state !== 'playing' && this.state !== 'ready') return false
    const last = this.currentDirection
    if (dir === last || dir === OPPOSITE[last]) return false
    if (this.inputQueue.length >= 2) return false
    this.inputQueue.push(dir)
    return true
  }

  isReverse(dir: Direction): boolean {
    return dir === OPPOSITE[this.currentDirection]
  }

  update(dtMs: number) {
    if (this.state !== 'playing') return
    const dt = Math.min(dtMs, 250)
    this.elapsed += dt

    for (const [type, remaining] of this.effects) {
      const left = remaining - dt
      if (left <= 0) this.effects.delete(type)
      else this.effects.set(type, left)
    }

    const limit = this.timeLimitMs
    if (limit !== null && this.elapsed >= limit) {
      this.endGame('timeout')
      return
    }

    this.food.update(this.elapsed, dt, (p) => this.isBlocked(p))

    this.accumulator += dt
    let guard = 0
    while (this.accumulator >= this.moveInterval && this.state === 'playing' && guard++ < 5) {
      this.accumulator -= this.moveInterval
      this.step()
    }
  }

  private step() {
    const dir = this.inputQueue.shift() ?? this.snake.direction
    if (dir !== this.snake.direction) this.events.onTurn?.(dir)
    const next = this.snake.nextHead(dir)
    const { point, kind } = checkCollision(this.map, this.snake, next, this.effects.has('ghost'))
    if (kind !== 'none') {
      this.endGame(kind)
      return
    }
    this.snake.moveTo(point, dir)

    const food = this.food.at(point)
    if (food) this.eat(food)
    this.events.onStep?.()
  }

  private eat(food: FoodItem) {
    this.food.remove(food)
    const info = FOOD_INFO[food.type]
    this.combo = this.elapsed - this.lastEatAt <= COMBO_WINDOW ? this.combo + 1 : 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.lastEatAt = this.elapsed

    let points = info.score
    if (this.combo >= 3) points += Math.min(this.combo, 10) * 2
    let special: SpecialOutcome | undefined

    this.snake.grow(info.grow)
    if (food.type === 'energy') this.applyEffect('slow')
    if (food.type === 'lightning') this.applyEffect('fast')
    if (food.type === 'special') {
      special = pick<SpecialOutcome>(['double', 'ghost', 'shrink', 'slow', 'fast', 'bonus'])
      if (special === 'shrink') this.snake.shrink(3)
      else if (special === 'bonus') points += 50
      else this.applyEffect(special)
    }
    if (this.effects.has('double')) points *= 2

    this.score += points
    this.foodsEaten++
    if (food.type === 'apple') this.normalEaten++

    this.events.onEat?.({ food, points, combo: this.combo, special })
    this.updateSpeed()

    if (this.options.mode === 'obstacle' && this.foodsEaten % FOODS_PER_LEVEL === 0) {
      this.level++
      this.buildObstacles()
      this.events.onLevelUp?.(this.level)
    }
  }

  private applyEffect(type: EffectType) {
    if (type === 'slow') this.effects.delete('fast')
    if (type === 'fast') this.effects.delete('slow')
    this.effects.set(type, EFFECT_DURATION[type])
  }

  private updateSpeed() {
    if (!this.options.autoSpeed) return
    const target = Math.min(5, this.options.baseSpeed + Math.floor(this.score / 100) * 0.5)
    if (target !== this.speedLevel) {
      const prevFloor = Math.floor(this.speedLevel)
      this.speedLevel = target
      this.maxSpeedLevel = Math.max(this.maxSpeedLevel, Math.floor(target))
      if (Math.floor(target) !== prevFloor) this.events.onSpeedChange?.(Math.floor(target))
    }
  }

  private buildObstacles() {
    const blocked = new Set<number>()
    const head = this.snake.head
    const dir = this.snake.direction
    for (const s of this.snake.body) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(pointKey(s.x + dx, s.y + dy))
    }
    // Keep a corridor clear in front of the head so a new layout never causes an instant crash.
    for (let i = 1; i <= 6; i++) {
      const p = this.offset(head, dir, i)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(pointKey(p.x + dx, p.y + dy))
    }
    for (const f of this.food.foods) blocked.add(pointKey(f.x, f.y))
    const pieces = Math.min(5 + (this.level - 1) * 3, Math.floor((this.options.cols * this.options.rows) / 30))
    this.map.generateObstacles(pieces, blocked)
  }

  private offset(p: Point, dir: Direction, n: number): Point {
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]
    return { x: p.x + v[0] * n, y: p.y + v[1] * n }
  }

  private isBlocked(p: Point): boolean {
    return this.snake.occupies(p) || this.map.isObstacle(p)
  }

  endGame(reason: EndReason) {
    if (this.state === 'over') return
    this.state = 'over'
    this.overReason = reason
    this.events.onGameOver?.(reason)
  }
}
