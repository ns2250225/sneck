<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-vue-next'
import type { Direction } from '@/core/types'

const props = withDefaults(defineProps<{ current?: Direction | null; size?: number }>(), { current: null, size: 150 })
const emit = defineEmits<{ dir: [dir: Direction] }>()

let holdTimer: number | null = null
let pressed: Direction | null = null

function press(dir: Direction, e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  pressed = dir
  emit('dir', dir)
  clear()
  // Holding a button keeps re-sending it, so a turn blocked by reverse protection applies as soon as it becomes legal.
  holdTimer = window.setInterval(() => {
    if (pressed) emit('dir', pressed)
  }, 90)
}

function release() {
  pressed = null
  clear()
}

function clear() {
  if (holdTimer !== null) clearInterval(holdTimer)
  holdTimer = null
}

onBeforeUnmount(clear)

const buttons = [
  { d: 'up', icon: ArrowUp },
  { d: 'left', icon: ArrowLeft },
  { d: 'right', icon: ArrowRight },
  { d: 'down', icon: ArrowDown },
] as const
</script>

<template>
  <div class="joystick" :style="{ '--s': `${props.size}px` }">
    <button
      v-for="b in buttons"
      :key="b.d"
      class="key"
      :class="[b.d, { active: current === b.d }]"
      :aria-label="b.d"
      @pointerdown.prevent="press(b.d, $event)"
      @pointerup="release"
      @pointercancel="release"
      @lostpointercapture="release"
      @contextmenu.prevent
    >
      <component :is="b.icon" :size="26" />
    </button>
    <div class="center" />
  </div>
</template>

<style scoped>
.joystick {
  position: relative;
  width: var(--s);
  height: var(--s);
  display: grid;
  grid-template-areas:
    '. up .'
    'left center right'
    '. down .';
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  touch-action: none;
}
.key {
  border-radius: 14px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  transition: transform 0.08s, background 0.15s;
}
.key:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
  background: var(--accent);
  color: #062a22;
}
.key.active {
  color: var(--accent);
  border-color: rgba(32, 217, 176, 0.5);
}
.up {
  grid-area: up;
}
.down {
  grid-area: down;
}
.left {
  grid-area: left;
}
.right {
  grid-area: right;
}
.center {
  grid-area: center;
  margin: 18%;
  border-radius: 50%;
  background: rgba(32, 217, 176, 0.25);
  border: 2px solid rgba(32, 217, 176, 0.5);
}
</style>
