import type { StoredData } from './StorageManager'

export type UnlockRule =
  | { type: 'default' }
  | { type: 'achievement'; id: string }
  | { type: 'bestScore'; value: number }
  | { type: 'totalGames'; value: number }
  | { type: 'totalFoods'; value: number }

export type SnakePattern = 'plain' | 'flame' | 'frost' | 'rainbow' | 'mech' | 'gold' | 'neon' | 'dragon'

export interface SnakeSkin {
  id: string
  name: string
  desc: string
  unlock: UnlockRule
  head: string
  body: string[]
  outline: string
  eye: string
  pattern: SnakePattern
  glow?: string
}

export interface MapTheme {
  id: string
  name: string
  unlock: UnlockRule
  bg: string
  bg2: string
  grid: string
  wall: string
  wallEdge: string
  deco: 'grass' | 'neon' | 'stars' | 'forest' | 'snow' | 'retro'
}

export type FoodSkinId = 'apple' | 'banana' | 'cherry' | 'watermelon' | 'grape' | 'candy'

export interface FoodSkin {
  id: FoodSkinId
  name: string
  unlock: UnlockRule
}

export const SNAKE_SKINS: SnakeSkin[] = [
  {
    id: 'classic',
    name: '经典绿色蛇',
    desc: '最初的伙伴',
    unlock: { type: 'default' },
    head: '#6DFF8E',
    body: ['#45E66B', '#38CC5B'],
    outline: '#1F8A3A',
    eye: '#101827',
    pattern: 'plain',
  },
  {
    id: 'neon',
    name: '霓虹蛇',
    desc: '夜色中的光',
    unlock: { type: 'achievement', id: 'first_game' },
    head: '#FF4FD8',
    body: ['#C84BFF', '#4F7BFF'],
    outline: '#3A1A66',
    eye: '#FFFFFF',
    pattern: 'neon',
    glow: '#FF4FD8',
  },
  {
    id: 'fire',
    name: '像素火焰蛇',
    desc: '燃烧吧！',
    unlock: { type: 'bestScore', value: 300 },
    head: '#FFD447',
    body: ['#FF8A3D', '#FF5A36', '#E63B2E'],
    outline: '#8A1E12',
    eye: '#2A0A05',
    pattern: 'flame',
  },
  {
    id: 'ice',
    name: '蓝色冰霜蛇',
    desc: '冷静而优雅',
    unlock: { type: 'achievement', id: 'apple_collector' },
    head: '#D9F6FF',
    body: ['#7FD8FF', '#4AA8FF'],
    outline: '#1D5A99',
    eye: '#0D2440',
    pattern: 'frost',
  },
  {
    id: 'rainbow',
    name: '彩虹蛇',
    desc: '七彩缤纷',
    unlock: { type: 'achievement', id: 'long_snake' },
    head: '#FFFFFF',
    body: [],
    outline: '#333355',
    eye: '#101827',
    pattern: 'rainbow',
  },
  {
    id: 'mech',
    name: '机械科技蛇',
    desc: '来自未来的机械体',
    unlock: { type: 'achievement', id: 'score_500' },
    head: '#C8D2E0',
    body: ['#8D99AE', '#6C7A91'],
    outline: '#2B3445',
    eye: '#20D9B0',
    pattern: 'mech',
    glow: '#20D9B0',
  },
  {
    id: 'gold',
    name: '黄金蛇',
    desc: '闪耀的荣誉',
    unlock: { type: 'achievement', id: 'score_1000' },
    head: '#FFF1A8',
    body: ['#FFD447', '#E8B020'],
    outline: '#8A6408',
    eye: '#3A2A00',
    pattern: 'gold',
    glow: '#FFD447',
  },
  {
    id: 'dragon',
    name: '中国龙蛇',
    desc: '龙腾四海',
    unlock: { type: 'achievement', id: 'endless_2000' },
    head: '#FF3B3B',
    body: ['#E62E2E', '#C41E1E'],
    outline: '#FFD447',
    eye: '#FFD447',
    pattern: 'dragon',
  },
]

export const MAP_THEMES: MapTheme[] = [
  {
    id: 'grass',
    name: '经典草地',
    unlock: { type: 'default' },
    bg: '#17243A',
    bg2: '#1B2B44',
    grid: 'rgba(69,230,107,0.08)',
    wall: '#5B6B86',
    wallEdge: '#8FA0BD',
    deco: 'grass',
  },
  {
    id: 'neon',
    name: '夜间霓虹',
    unlock: { type: 'achievement', id: 'first_game' },
    bg: '#0D0B1E',
    bg2: '#130F2B',
    grid: 'rgba(255,79,216,0.14)',
    wall: '#3B2B7A',
    wallEdge: '#FF4FD8',
    deco: 'neon',
  },
  {
    id: 'space',
    name: '星空宇宙',
    unlock: { type: 'bestScore', value: 200 },
    bg: '#060A1A',
    bg2: '#0B1230',
    grid: 'rgba(140,170,255,0.07)',
    wall: '#4A3F7A',
    wallEdge: '#A99BFF',
    deco: 'stars',
  },
  {
    id: 'forest',
    name: '森林',
    unlock: { type: 'achievement', id: 'gourmet' },
    bg: '#102619',
    bg2: '#14301F',
    grid: 'rgba(180,255,170,0.07)',
    wall: '#5C3D22',
    wallEdge: '#8C6239',
    deco: 'forest',
  },
  {
    id: 'snow',
    name: '冰雪世界',
    unlock: { type: 'achievement', id: 'survivor' },
    bg: '#1C3350',
    bg2: '#22405F',
    grid: 'rgba(255,255,255,0.09)',
    wall: '#9CC9E8',
    wallEdge: '#E8F7FF',
    deco: 'snow',
  },
  {
    id: 'retro',
    name: '复古街机',
    unlock: { type: 'achievement', id: 'persistent' },
    bg: '#0A0A0A',
    bg2: '#111111',
    grid: 'rgba(32,217,176,0.12)',
    wall: '#20D9B0',
    wallEdge: '#9DFFE9',
    deco: 'retro',
  },
]

export const FOOD_SKINS: FoodSkin[] = [
  { id: 'apple', name: '苹果', unlock: { type: 'default' } },
  { id: 'cherry', name: '樱桃', unlock: { type: 'achievement', id: 'first_game' } },
  { id: 'banana', name: '香蕉', unlock: { type: 'bestScore', value: 100 } },
  { id: 'grape', name: '葡萄', unlock: { type: 'totalGames', value: 5 } },
  { id: 'watermelon', name: '西瓜', unlock: { type: 'achievement', id: 'speed_demon' } },
  { id: 'candy', name: '糖果', unlock: { type: 'totalFoods', value: 200 } },
]

export function isRuleMet(rule: UnlockRule, data: StoredData): boolean {
  switch (rule.type) {
    case 'default':
      return true
    case 'achievement':
      return data.achievements.includes(rule.id)
    case 'bestScore':
      return data.statistics.bestScore >= rule.value
    case 'totalGames':
      return data.statistics.totalGames >= rule.value
    case 'totalFoods':
      return data.statistics.totalFoods >= rule.value
  }
}

export function describeRule(rule: UnlockRule, achievementName: (id: string) => string): string {
  switch (rule.type) {
    case 'default':
      return '默认解锁'
    case 'achievement':
      return `达成成就「${achievementName(rule.id)}」`
    case 'bestScore':
      return `最高分达到 ${rule.value}`
    case 'totalGames':
      return `累计完成 ${rule.value} 局`
    case 'totalFoods':
      return `累计吃掉 ${rule.value} 个食物`
  }
}

export interface UnlockedItem {
  kind: 'snake' | 'theme' | 'food'
  id: string
  name: string
}

/** Unlocks every item whose rule is now satisfied. Returns newly unlocked items. Mutates `data`. */
export function refreshUnlocks(data: StoredData): UnlockedItem[] {
  const fresh: UnlockedItem[] = []
  for (const s of SNAKE_SKINS) {
    if (!data.unlockedSkins.includes(s.id) && isRuleMet(s.unlock, data)) {
      data.unlockedSkins.push(s.id)
      fresh.push({ kind: 'snake', id: s.id, name: s.name })
    }
  }
  for (const t of MAP_THEMES) {
    if (!data.unlockedThemes.includes(t.id) && isRuleMet(t.unlock, data)) {
      data.unlockedThemes.push(t.id)
      fresh.push({ kind: 'theme', id: t.id, name: t.name })
    }
  }
  for (const f of FOOD_SKINS) {
    if (!data.unlockedFoodSkins.includes(f.id) && isRuleMet(f.unlock, data)) {
      data.unlockedFoodSkins.push(f.id)
      fresh.push({ kind: 'food', id: f.id, name: f.name })
    }
  }
  return fresh
}

export const getSnakeSkin = (id: string) => SNAKE_SKINS.find((s) => s.id === id) ?? SNAKE_SKINS[0]
export const getMapTheme = (id: string) => MAP_THEMES.find((t) => t.id === id) ?? MAP_THEMES[0]
export const getFoodSkin = (id: string) => FOOD_SKINS.find((f) => f.id === id) ?? FOOD_SKINS[0]
