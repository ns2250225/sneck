<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-vue-next'
import type { Direction } from '@/core/types'
import { THRESHOLDS } from '@/vision/HeadController'
import type { Sensitivity } from '@/systems/StorageManager'

const props = withDefaults(
  defineProps<{
    yaw: number
    pitch: number
    sensitivity: Sensitivity
    pointing: Direction | null
    passed?: Partial<Record<Direction, boolean>>
    active?: boolean
    size?: number
  }>(),
  { passed: () => ({}), active: true, size: 150 },
)

const range = computed(() => {
  const th = THRESHOLDS[props.sensitivity]
  return { yaw: th.yaw * 2.2, pitch: th.pitch * 2.2 }
})

const dot = computed(() => {
  const x = Math.max(-1, Math.min(1, props.yaw / range.value.yaw))
  const y = Math.max(-1, Math.min(1, -props.pitch / range.value.pitch))
  return { left: `${50 + x * 50}%`, top: `${50 + y * 50}%` }
})

const zone = computed(() => {
  const th = THRESHOLDS[props.sensitivity]
  const w = (th.yaw / range.value.yaw) * 100
  const h = (th.pitch / range.value.pitch) * 100
  return { width: `${w}%`, height: `${h}%` }
})

const dirs = [
  { d: 'up', icon: ArrowUp, label: '抬头' },
  { d: 'left', icon: ArrowLeft, label: '左转' },
  { d: 'right', icon: ArrowRight, label: '右转' },
  { d: 'down', icon: ArrowDown, label: '低头' },
] as const
</script>

<template>
  <div class="indicator" :style="{ '--size': `${size}px` }" :class="{ inactive: !active }">
    <div
      v-for="item in dirs"
      :key="item.d"
      class="dir"
      :class="[item.d, { lit: pointing === item.d, passed: passed[item.d] }]"
    >
      <component :is="item.icon" :size="18" />
      <span>{{ item.label }}</span>
    </div>
    <div class="pad">
      <div class="zone" :style="zone" />
      <div class="cross h" />
      <div class="cross v" />
      <div class="dot" :style="dot" />
    </div>
  </div>
</template>

<style scoped>
.indicator {
  position: relative;
  width: calc(var(--size) + 96px);
  height: calc(var(--size) + 72px);
  display: grid;
  grid-template-areas:
    '. up .'
    'left pad right'
    '. down .';
  grid-template-columns: 48px var(--size) 48px;
  grid-template-rows: 36px var(--size) 36px;
  align-items: center;
  justify-items: center;
}
.inactive {
  opacity: 0.5;
}
.pad {
  grid-area: pad;
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--line);
  overflow: hidden;
}
.zone {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 1px dashed rgba(32, 217, 176, 0.5);
  border-radius: 8px;
  background: rgba(32, 217, 176, 0.06);
}
.cross {
  position: absolute;
  background: rgba(255, 255, 255, 0.08);
}
.cross.h {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
}
.cross.v {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}
.dot {
  position: absolute;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  background: var(--snake);
  box-shadow: 0 0 12px var(--snake);
  transition: left 0.06s linear, top 0.06s linear;
}
.dir {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  color: var(--muted);
  transition: color 0.15s, transform 0.15s;
}
.dir.left,
.dir.right {
  gap: 2px;
}
.dir.up {
  grid-area: up;
  flex-direction: row;
  gap: 4px;
}
.dir.down {
  grid-area: down;
  flex-direction: row;
  gap: 4px;
}
.dir.left {
  grid-area: left;
}
.dir.right {
  grid-area: right;
}
.dir.passed {
  color: var(--snake);
}
.dir.lit {
  color: var(--gold);
  transform: scale(1.2);
}
</style>
