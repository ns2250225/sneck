import { reactive } from 'vue'
import type { GameMode, GameResult } from '@/core/types'
import { appData } from './settings'
import { checkAchievements, getAchievement, achievementRewards, type LiveSnapshot } from '@/systems/AchievementManager'
import { refreshUnlocks } from '@/systems/SkinManager'
import { AudioManager } from '@/systems/AudioManager'

export interface Toast {
  id: number
  kind: 'achievement' | 'unlock' | 'info'
  title: string
  desc: string
  reward?: string[]
}

export const gameStore = reactive({
  selectedMode: 'classic' as GameMode,
  /** True once head pose calibration has been done in this page session. */
  calibratedThisSession: false,
  lastResult: null as GameResult | null,
  toasts: [] as Toast[],
})

let toastId = 1

export function pushToast(t: Omit<Toast, 'id'>) {
  const toast = { ...t, id: toastId++ }
  gameStore.toasts.push(toast)
  window.setTimeout(() => dismissToast(toast.id), t.kind === 'achievement' ? 4200 : 3000)
}

export function dismissToast(id: number) {
  const i = gameStore.toasts.findIndex((t) => t.id === id)
  if (i >= 0) gameStore.toasts.splice(i, 1)
}

function announce(achievementIds: string[]) {
  for (const id of achievementIds) {
    const a = getAchievement(id)
    if (!a) continue
    pushToast({ kind: 'achievement', title: `成就解锁：${a.name}`, desc: a.desc, reward: achievementRewards(id) })
  }
  if (achievementIds.length) AudioManager.play('achievement')
  for (const item of refreshUnlocks(appData)) {
    const label = item.kind === 'snake' ? '蛇皮肤' : item.kind === 'theme' ? '地图主题' : '食物皮肤'
    pushToast({ kind: 'unlock', title: `新${label}已解锁`, desc: item.name })
  }
}

/** Called during play to unlock achievements as soon as their condition is met. */
export function checkLiveAchievements(live: LiveSnapshot) {
  announce(checkAchievements(appData, live))
}

export function recordGame(result: Omit<GameResult, 'isNewBest'>): GameResult {
  const s = appData.statistics
  const isNewBest = result.score > s.bestScore
  s.bestScore = Math.max(s.bestScore, result.score)
  s.totalGames++
  if (appData.settings.trackPlayTime) s.totalPlayTime += Math.round(result.duration)
  s.totalFoods += result.foods
  s.totalNormalFoods += result.normalFoods
  s.maxSnakeLength = Math.max(s.maxSnakeLength, result.length)
  s.totalHeadMoves += result.headMoves
  s.modeCounts[result.mode]++
  s.controlCounts[result.control]++
  s.modeBest[result.mode] = Math.max(s.modeBest[result.mode], result.score)
  appData.sessions.push({
    t: result.endedAt,
    d: appData.settings.trackPlayTime ? Math.round(result.duration) : 0,
    s: result.score,
    m: result.mode,
    c: result.control,
  })

  announce(
    checkAchievements(appData, {
      mode: result.mode,
      score: result.score,
      length: result.length,
      speedLevel: result.maxSpeedLevel,
      elapsedSec: result.duration,
      foods: 0,
      normalFoods: 0,
    }),
  )

  const full: GameResult = { ...result, isNewBest }
  gameStore.lastResult = full
  return full
}
