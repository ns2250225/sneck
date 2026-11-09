<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Info } from 'lucide-vue-next'
import { appData } from '@/stores/settings'
import { ACHIEVEMENTS } from '@/systems/AchievementManager'
import { MODES, type GameMode } from '@/core/types'
import { dayKey, formatDuration, startOfDay, startOfWeek } from '@/utils/helpers'

const router = useRouter()
const s = computed(() => appData.statistics)

const today = computed(() => {
  const from = startOfDay(Date.now())
  return appData.sessions.filter((x) => x.t >= from).length
})

const week = computed(() => {
  const from = startOfWeek(Date.now())
  return appData.sessions.filter((x) => x.t >= from).length
})

const favoriteMode = computed(() => {
  const counts = s.value.modeCounts
  const entries = Object.entries(counts) as [GameMode, number][]
  const top = entries.sort((a, b) => b[1] - a[1])[0]
  return top && top[1] > 0 ? MODES[top[0]].name : '—'
})

const trend = computed(() => {
  const days: { key: string; label: string; seconds: number; games: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    days.push({
      key: dayKey(d.getTime()),
      label: i === 0 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`,
      seconds: 0,
      games: 0,
    })
  }
  const index = new Map(days.map((d, i) => [d.key, i]))
  for (const r of appData.sessions) {
    const i = index.get(dayKey(r.t))
    if (i === undefined) continue
    days[i].seconds += r.d
    days[i].games++
  }
  const max = Math.max(60, ...days.map((d) => d.seconds))
  return days.map((d) => ({ ...d, pct: (d.seconds / max) * 100 }))
})

const achievementPct = computed(() => (appData.achievements.length / ACHIEVEMENTS.length) * 100)

const items = computed(() => [
  { label: '历史最高分', value: s.value.bestScore },
  { label: '累计游戏次数', value: s.value.totalGames },
  { label: '累计游戏时长', value: formatDuration(s.value.totalPlayTime) },
  { label: '累计吃掉食物', value: s.value.totalFoods },
  { label: '最长蛇长度', value: s.value.maxSnakeLength },
  { label: '最常用模式', value: favoriteMode.value },
  { label: '头部控制局数', value: s.value.controlCounts.head },
  { label: '触屏控制局数', value: s.value.controlCounts.touch },
  { label: '累计头部动作', value: s.value.totalHeadMoves },
])
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" aria-label="返回" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1>个人数据统计</h1>
    </header>
    <div class="page-body">
      <div class="top">
        <div class="card big">
          <span class="muted">本日游戏</span>
          <b class="pixel">{{ today }}</b>
          <span class="muted">局</span>
        </div>
        <div class="card big">
          <span class="muted">本周游戏</span>
          <b class="pixel">{{ week }}</b>
          <span class="muted">局</span>
        </div>
        <div class="card big">
          <span class="muted">最高分</span>
          <b class="pixel gold">{{ s.bestScore }}</b>
          <span class="muted">分</span>
        </div>
      </div>

      <div class="section-title">近 7 天游戏时长</div>
      <div class="card chart">
        <div v-for="d in trend" :key="d.key" class="col">
          <div class="val">{{ d.seconds ? Math.round(d.seconds / 60) + 'm' : '' }}</div>
          <div class="bar-wrap"><div class="bar" :style="{ height: `${Math.max(d.pct, d.games ? 4 : 0)}%` }" /></div>
          <div class="lbl">{{ d.label }}</div>
        </div>
      </div>

      <div class="section-title">成就完成进度</div>
      <div class="card ach">
        <div class="progress"><i :style="{ width: `${achievementPct}%` }" /></div>
        <span>{{ appData.achievements.length }}/{{ ACHIEVEMENTS.length }}</span>
      </div>

      <div class="section-title">累计数据</div>
      <div class="card list">
        <div v-for="it in items" :key="it.label" class="row">
          <span class="muted">{{ it.label }}</span>
          <b>{{ it.value }}</b>
        </div>
      </div>

      <div class="section-title">各模式最高分</div>
      <div class="card list">
        <div v-for="m in Object.values(MODES)" :key="m.id" class="row">
          <span class="muted">{{ m.name }}（{{ s.modeCounts[m.id] }} 局）</span>
          <b>{{ s.modeBest[m.id] }}</b>
        </div>
      </div>

      <p class="note muted">
        <Info :size="14" /> 游戏时长和活动次数仅作为游戏统计，不作为颈椎健康评估或治疗效果指标。
      </p>
    </div>
  </div>
</template>

<style scoped>
.top {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.big {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 6px;
  font-size: 12px;
}
.big b {
  font-size: 26px;
  color: var(--snake);
}
.big b.gold {
  color: var(--gold);
}
.chart {
  display: flex;
  gap: 6px;
  height: 170px;
  align-items: stretch;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.val {
  font-size: 10px;
  color: var(--muted);
  height: 14px;
}
.bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar {
  width: 70%;
  max-width: 28px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--snake), var(--accent));
  transition: height 0.3s;
}
.lbl {
  font-size: 11px;
  color: var(--muted);
}
.ach {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ach .progress {
  flex: 1;
}
.list {
  padding: 4px 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 44px;
  font-size: 14px;
}
.row + .row {
  border-top: 1px solid var(--line);
}
.note {
  display: flex;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
  margin: 8px 4px;
}
.note svg {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
