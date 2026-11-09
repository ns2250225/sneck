<script setup lang="ts">
import { Clock, Gauge, Ruler, Trophy } from 'lucide-vue-next'
import { formatTime } from '@/utils/helpers'

defineProps<{
  score: number
  best: number
  length: number
  speedLevel: number
  time: number
  countdown: number | null
  level?: number | null
  compact?: boolean
}>()
</script>

<template>
  <div class="score-panel" :class="{ compact }">
    <div class="main">
      <div class="cell">
        <div class="label">SCORE</div>
        <div class="value pixel score">{{ score }}</div>
      </div>
      <div class="cell">
        <div class="label"><Trophy :size="11" /> BEST</div>
        <div class="value pixel best">{{ Math.max(best, score) }}</div>
      </div>
    </div>
    <div class="meta">
      <span title="蛇长度"><Ruler :size="13" /> {{ length }}</span>
      <span title="速度等级"><Gauge :size="13" /> Lv{{ Math.floor(speedLevel) }}</span>
      <span title="时间" :class="{ urgent: countdown !== null && countdown <= 10 }">
        <Clock :size="13" /> {{ countdown !== null ? formatTime(countdown) : formatTime(time) }}
      </span>
      <span v-if="level" class="lvl">第 {{ level }} 关</span>
    </div>
  </div>
</template>

<style scoped>
.score-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.main {
  display: flex;
  gap: 18px;
}
.label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 3px;
}
.value {
  font-variant-numeric: tabular-nums;
  font-size: 26px;
  line-height: 1.1;
}
.compact .value {
  font-size: 22px;
}
.score {
  color: var(--snake);
}
.best {
  color: var(--gold);
}
.meta {
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
  height: 18px;
  gap: 4px 12px;
  font-size: 13px;
  color: #cfd8e8;
}
.meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.urgent {
  color: var(--danger);
  font-weight: 800;
  animation: pulse-dot 0.8s infinite;
}
.lvl {
  color: var(--accent);
  font-weight: 700;
}
</style>
