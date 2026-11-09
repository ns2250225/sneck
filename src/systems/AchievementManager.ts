import type { GameMode } from '@/core/types'
import type { StoredData } from './StorageManager'
import { FOOD_SKINS, MAP_THEMES, SNAKE_SKINS, type UnlockRule } from './SkinManager'

export interface AchievementDef {
  id: string
  name: string
  desc: string
  icon: string
  /** Progress target used for progress bars. */
  target: number
  progress: (data: StoredData, live?: LiveSnapshot) => number
}

export interface LiveSnapshot {
  mode: GameMode
  score: number
  length: number
  speedLevel: number
  elapsedSec: number
  foods: number
  normalFoods: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_game',
    name: '初次出发',
    desc: '完成第一局游戏',
    icon: 'Flag',
    target: 1,
    progress: (d) => d.statistics.totalGames,
  },
  {
    id: 'apple_collector',
    name: '苹果收割机',
    desc: '累计吃掉 10 个普通食物',
    icon: 'Apple',
    target: 10,
    progress: (d, l) => d.statistics.totalNormalFoods + (l?.normalFoods ?? 0),
  },
  {
    id: 'long_snake',
    name: '贪吃蛇',
    desc: '蛇长度达到 20',
    icon: 'Ruler',
    target: 20,
    progress: (d, l) => Math.max(d.statistics.maxSnakeLength, l?.length ?? 0),
  },
  {
    id: 'gourmet',
    name: '美食家',
    desc: '累计吃掉 50 个食物',
    icon: 'UtensilsCrossed',
    target: 50,
    progress: (d, l) => d.statistics.totalFoods + (l?.foods ?? 0),
  },
  {
    id: 'score_500',
    name: '高分玩家',
    desc: '单局获得 500 分',
    icon: 'Trophy',
    target: 500,
    progress: (d, l) => Math.max(d.statistics.bestScore, l?.score ?? 0),
  },
  {
    id: 'score_1000',
    name: '超级玩家',
    desc: '单局获得 1000 分',
    icon: 'Crown',
    target: 1000,
    progress: (d, l) => Math.max(d.statistics.bestScore, l?.score ?? 0),
  },
  {
    id: 'speed_demon',
    name: '速度狂人',
    desc: '达到最高速度等级 5',
    icon: 'Zap',
    target: 5,
    progress: (_d, l) => l?.speedLevel ?? 0,
  },
  {
    id: 'survivor',
    name: '生存大师',
    desc: '单局生存 5 分钟',
    icon: 'Timer',
    target: 300,
    progress: (_d, l) => l?.elapsedSec ?? 0,
  },
  {
    id: 'endless_2000',
    name: '无尽挑战',
    desc: '无尽模式获得 2000 分',
    icon: 'Infinity',
    target: 2000,
    progress: (d, l) => Math.max(d.statistics.modeBest.endless, l?.mode === 'endless' ? l.score : 0),
  },
  {
    id: 'persistent',
    name: '坚持活动',
    desc: '累计完成 10 局游戏',
    icon: 'CalendarCheck',
    target: 10,
    progress: (d) => d.statistics.totalGames,
  },
]

export const getAchievement = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)

export const achievementName = (id: string) => getAchievement(id)?.name ?? id

/** Rewards (skins/themes) that are unlocked by a given achievement. */
export function achievementRewards(id: string): string[] {
  const match = (r: UnlockRule) => r.type === 'achievement' && r.id === id
  return [
    ...SNAKE_SKINS.filter((s) => match(s.unlock)).map((s) => `蛇皮肤「${s.name}」`),
    ...MAP_THEMES.filter((t) => match(t.unlock)).map((t) => `地图「${t.name}」`),
    ...FOOD_SKINS.filter((f) => match(f.unlock)).map((f) => `食物「${f.name}」`),
  ]
}

/** Checks every locked achievement against stored data plus an optional live game snapshot. Mutates `data`. */
export function checkAchievements(data: StoredData, live?: LiveSnapshot): string[] {
  const unlocked: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (data.achievements.includes(a.id)) continue
    if (a.progress(data, live) >= a.target) {
      data.achievements.push(a.id)
      data.achievementDates[a.id] = Date.now()
      unlocked.push(a.id)
    }
  }
  return unlocked
}
