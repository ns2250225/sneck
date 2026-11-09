<script setup lang="ts">
import { Hand, Pause, Play, ScanFace } from 'lucide-vue-next'
import { DIRECTION_LABELS, type ActiveControl, type Direction } from '@/core/types'
import { HEAD_STATUS_TEXT, type HeadStatus } from '@/vision/HeadController'

defineProps<{
  control: ActiveControl
  headStatus: HeadStatus
  action: Direction | null
  paused: boolean
  effects: { type: string; label: string; remaining: number }[]
}>()

const emit = defineEmits<{ pause: []; switchControl: [] }>()
</script>

<template>
  <div class="control-panel">
    <div class="status">
      <div class="row">
        <span class="muted">控制方式</span>
        <button class="chip" @click="emit('switchControl')">
          <ScanFace v-if="control === 'head'" :size="14" />
          <Hand v-else :size="14" />
          {{ control === 'head' ? '头部控制' : '触屏控制' }}
        </button>
      </div>
      <div v-if="control === 'head'" class="row">
        <span class="muted">头部识别</span>
        <span :class="headStatus === 'ok' ? 'ok' : 'warn'">{{ HEAD_STATUS_TEXT[headStatus] }}</span>
      </div>
      <div class="row">
        <span class="muted">当前动作</span>
        <span class="action">{{ action ? DIRECTION_LABELS[action] : '—' }}</span>
      </div>
      <div class="effects">
        <span v-for="e in effects" :key="e.type" class="badge effect" :class="e.type">
          {{ e.label }} {{ Math.ceil(e.remaining / 1000) }}s
        </span>
      </div>
    </div>
    <button class="btn pause" :aria-label="paused ? '继续' : '暂停'" @click="emit('pause')">
      <Play v-if="paused" :size="20" fill="currentColor" />
      <Pause v-else :size="20" fill="currentColor" />
      {{ paused ? '继续' : '暂停' }}
    </button>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row .muted {
  width: 56px;
  flex-shrink: 0;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(32, 217, 176, 0.12);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}
.ok {
  color: var(--snake);
  font-weight: 700;
}
.warn {
  color: var(--gold);
  font-weight: 700;
}
.action {
  font-weight: 800;
}
.effects {
  display: flex;
  gap: 4px;
  height: 20px;
  overflow: hidden;
}
.row {
  height: 20px;
  white-space: nowrap;
}
.effect.slow {
  color: #7fd8ff;
}
.effect.fast {
  color: #ffe066;
}
.effect.double {
  color: var(--gold);
}
.effect.ghost {
  color: #c79bff;
}
.pause {
  min-width: 96px;
  flex-shrink: 0;
}
</style>
