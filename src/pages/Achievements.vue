<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Apple,
  ArrowLeft,
  Award,
  CalendarCheck,
  Crown,
  Flag,
  Infinity as InfinityIcon,
  Lock,
  Ruler,
  Timer,
  Trophy,
  UtensilsCrossed,
  Zap,
} from 'lucide-vue-next'
import { ACHIEVEMENTS, achievementRewards } from '@/systems/AchievementManager'
import { appData } from '@/stores/settings'

const router = useRouter()

const list = computed(() =>
  ACHIEVEMENTS.map((a) => {
    const unlocked = appData.achievements.includes(a.id)
    const value = unlocked ? a.target : Math.min(a.target, a.progress(appData))
    const date = appData.achievementDates[a.id]
    return {
      ...a,
      unlocked,
      value,
      pct: (value / a.target) * 100,
      rewards: achievementRewards(a.id),
      date: date ? new Date(date).toLocaleDateString() : '',
      // Single-game achievements show no cumulative progress until reached.
      showProgress: !['speed_demon', 'survivor'].includes(a.id),
    }
  }),
)

const done = computed(() => appData.achievements.length)

const ICONS: Record<string, unknown> = {
  Flag,
  Apple,
  Ruler,
  UtensilsCrossed,
  Trophy,
  Crown,
  Zap,
  Timer,
  Infinity: InfinityIcon,
  CalendarCheck,
}

function icon(name: string) {
  return ICONS[name] ?? Award
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" aria-label="返回" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1>成就</h1>
      <span class="badge">{{ done }}/{{ ACHIEVEMENTS.length }}</span>
    </header>
    <div class="page-body">
      <div class="card summary">
        <div>完成进度</div>
        <div class="progress"><i :style="{ width: `${(done / ACHIEVEMENTS.length) * 100}%` }" /></div>
      </div>
      <div v-for="a in list" :key="a.id" class="card ach" :class="{ unlocked: a.unlocked }">
        <div class="ach-icon">
          <component :is="a.unlocked ? icon(a.icon) : Lock" :size="24" />
        </div>
        <div class="info">
          <div class="name">{{ a.name }}</div>
          <div class="desc muted">{{ a.desc }}</div>
          <div v-if="!a.unlocked && a.showProgress" class="prog">
            <div class="progress"><i :style="{ width: `${a.pct}%` }" /></div>
            <span class="muted">{{ Math.floor(a.value) }}/{{ a.target }}</span>
          </div>
          <div v-if="a.rewards.length" class="reward">奖励：{{ a.rewards.join('、') }}</div>
          <div v-if="a.unlocked && a.date" class="date muted">{{ a.date }} 达成</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 700;
}
.ach {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  opacity: 0.75;
}
.ach.unlocked {
  opacity: 1;
  border-color: rgba(255, 212, 71, 0.4);
  background: linear-gradient(135deg, rgba(255, 212, 71, 0.08), var(--panel));
}
.ach-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
  flex-shrink: 0;
}
.unlocked .ach-icon {
  background: rgba(255, 212, 71, 0.18);
  color: var(--gold);
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.name {
  font-weight: 800;
}
.desc {
  font-size: 13px;
}
.prog {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.prog .progress {
  flex: 1;
}
.reward {
  font-size: 12px;
  color: var(--gold);
}
.date {
  font-size: 11px;
}
</style>
