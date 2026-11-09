export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export type GameMode = 'classic' | 'timed' | 'obstacle' | 'endless'

export type ControlMode = 'head' | 'touch' | 'auto'

export type ActiveControl = 'head' | 'touch'

export type GameStatus = 'READY' | 'CAMERA_INITIALIZING' | 'CALIBRATING' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'

export type FoodType = 'apple' | 'banana' | 'star' | 'energy' | 'lightning' | 'special'

export type EffectType = 'slow' | 'fast' | 'double' | 'ghost'

export const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const DIRECTION_LABELS: Record<Direction, string> = {
  up: '向上',
  down: '向下',
  left: '向左',
  right: '向右',
}

export interface ModeInfo {
  id: GameMode
  name: string
  desc: string
  rules: string[]
  wrap: boolean
}

export const MODES: Record<GameMode, ModeInfo> = {
  classic: {
    id: 'classic',
    name: '经典模式',
    desc: '经典玩法，撞墙或撞到自己即结束',
    rules: ['地图固定，食物随机生成', '碰到边界或自身则游戏结束', '分数越高速度越快'],
    wrap: false,
  },
  timed: {
    id: 'timed',
    name: '限时模式',
    desc: '120 秒内获得尽可能高的分数',
    rules: ['默认 120 秒倒计时', '食物持续刷新，可穿越边界', '撞到自身立即结束'],
    wrap: true,
  },
  obstacle: {
    id: 'obstacle',
    name: '障碍模式',
    desc: '躲避障碍物，逐关挑战',
    rules: ['地图随机生成障碍', '蛇不能穿过障碍和边界', '每吃 8 个食物进入下一关，障碍增多'],
    wrap: false,
  },
  endless: {
    id: 'endless',
    name: '无尽模式',
    desc: '边界可穿越，持续挑战最高分',
    rules: ['从一侧离开地图后从另一侧出现', '不断吃食物增长', '只有撞到自己才会结束'],
    wrap: true,
  },
}

export const SPEED_INTERVALS = [250, 200, 160, 130, 100] as const

export const SPEED_LABELS = ['非常慢', '慢速', '普通', '快速', '高速'] as const

export interface GameResult {
  mode: GameMode
  score: number
  length: number
  duration: number
  foods: number
  normalFoods: number
  maxSpeedLevel: number
  level: number
  reason: 'wall' | 'self' | 'obstacle' | 'timeout' | 'quit'
  control: ActiveControl
  headMoves: number
  isNewBest: boolean
  endedAt: number
}
