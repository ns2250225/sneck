import type { FoodType, Point } from './types'
import { pointKey, weightedPick } from '@/utils/helpers'

export interface FoodInfo {
  type: FoodType
  name: string
  score: number
  grow: number
  /** Lifetime in ms for special foods; null = permanent. */
  lifetime: number | null
  effect: string
  color: string
}

export const FOOD_INFO: Record<FoodType, FoodInfo> = {
  apple: { type: 'apple', name: '普通苹果', score: 10, grow: 1, lifetime: null, effect: '蛇增长 1 格', color: '#FF684A' },
  banana: { type: 'banana', name: '香蕉', score: 20, grow: 2, lifetime: null, effect: '蛇增长 2 格', color: '#FFE066' },
  star: { type: 'star', name: '金色星星', score: 50, grow: 1, lifetime: 7000, effect: '蛇增长 1 格', color: '#FFD447' },
  energy: { type: 'energy', name: '蓝色能量球', score: 30, grow: 1, lifetime: 8000, effect: '短暂减速', color: '#4AA8FF' },
  lightning: { type: 'lightning', name: '闪电食物', score: 40, grow: 1, lifetime: 8000, effect: '短暂加速', color: '#B8F5FF' },
  special: { type: 'special', name: '特殊果实', score: 100, grow: 1, lifetime: 6000, effect: '随机特殊效果', color: '#B05CFF' },
}

const SPECIAL_WEIGHTS: { item: FoodType; weight: number }[] = [
  { item: 'star', weight: 34 },
  { item: 'energy', weight: 24 },
  { item: 'lightning', weight: 24 },
  { item: 'special', weight: 18 },
]

export interface FoodItem extends Point {
  id: number
  type: FoodType
  spawnedAt: number
  expiresAt: number | null
}

export interface FoodSpawnOptions {
  /** Number of regular foods kept on the board. */
  regularCount: number
  /** Regular foods relocate after this many ms (timed mode refresh); null = never. */
  regularLifetime: number | null
  /** Chance per second to spawn a special food when none is present. */
  specialChancePerSecond: number
}

export class FoodManager {
  foods: FoodItem[] = []
  private nextId = 1

  constructor(
    private cols: number,
    private rows: number,
    public options: FoodSpawnOptions,
  ) {}

  reset() {
    this.foods = []
  }

  get regularFoods() {
    return this.foods.filter((f) => f.type === 'apple' || f.type === 'banana')
  }

  get specialFood() {
    return this.foods.find((f) => f.type !== 'apple' && f.type !== 'banana')
  }

  at(p: Point): FoodItem | undefined {
    return this.foods.find((f) => f.x === p.x && f.y === p.y)
  }

  remove(food: FoodItem) {
    this.foods = this.foods.filter((f) => f.id !== food.id)
  }

  /** Keeps the board populated and expires timed foods. `isBlocked` reports cells foods cannot use. */
  update(now: number, dtMs: number, isBlocked: (p: Point) => boolean) {
    this.foods = this.foods.filter((f) => f.expiresAt === null || f.expiresAt > now)

    while (this.regularFoods.length < this.options.regularCount) {
      const type: FoodType = Math.random() < 0.2 ? 'banana' : 'apple'
      if (!this.spawn(type, now, isBlocked)) break
    }

    if (!this.specialFood && Math.random() < this.options.specialChancePerSecond * (dtMs / 1000)) {
      this.spawn(weightedPick(SPECIAL_WEIGHTS), now, isBlocked)
    }
  }

  spawn(type: FoodType, now: number, isBlocked: (p: Point) => boolean): FoodItem | null {
    const cell = this.findFreeCell(isBlocked)
    if (!cell) return null
    const info = FOOD_INFO[type]
    const isRegular = type === 'apple' || type === 'banana'
    const lifetime = isRegular ? this.options.regularLifetime : info.lifetime
    const food: FoodItem = {
      id: this.nextId++,
      type,
      x: cell.x,
      y: cell.y,
      spawnedAt: now,
      expiresAt: lifetime === null ? null : now + lifetime,
    }
    this.foods.push(food)
    return food
  }

  private findFreeCell(isBlocked: (p: Point) => boolean): Point | null {
    const occupied = new Set(this.foods.map((f) => pointKey(f.x, f.y)))
    for (let i = 0; i < 80; i++) {
      const p = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) }
      if (!occupied.has(pointKey(p.x, p.y)) && !isBlocked(p)) return p
    }
    const free: Point[] = []
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const p = { x, y }
        if (!occupied.has(pointKey(x, y)) && !isBlocked(p)) free.push(p)
      }
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null
  }
}
