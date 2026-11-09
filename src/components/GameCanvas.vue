<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Renderer } from '@/core/Renderer'
import type { Direction } from '@/core/types'
import { getFoodSkin, getMapTheme, getSnakeSkin } from '@/systems/SkinManager'

const props = defineProps<{
  cols: number
  rows: number
  themeId: string
  skinId: string
  foodSkinId: string
  showGrid: boolean
}>()

const emit = defineEmits<{ swipe: [dir: Direction]; tap: [] }>()

const wrap = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
let renderer: Renderer | null = null
let observer: ResizeObserver | null = null

function applyLook() {
  if (!renderer) return
  renderer.theme = getMapTheme(props.themeId)
  renderer.skin = getSnakeSkin(props.skinId)
  renderer.foodSkin = getFoodSkin(props.foodSkinId).id
  renderer.showGrid = props.showGrid
}

function fit() {
  if (!renderer || !wrap.value) return
  const r = wrap.value.getBoundingClientRect()
  if (r.width < 10 || r.height < 10) return
  renderer.resize(r.width, r.height, props.cols, props.rows)
}

onMounted(() => {
  renderer = new Renderer(canvas.value!)
  applyLook()
  fit()
  observer = new ResizeObserver(() => fit())
  observer.observe(wrap.value!)
})

onBeforeUnmount(() => observer?.disconnect())

watch(() => [props.themeId, props.skinId, props.foodSkinId, props.showGrid], applyLook)
watch(() => [props.cols, props.rows], fit)

let start: { x: number; y: number; t: number } | null = null

function onPointerDown(e: PointerEvent) {
  start = { x: e.clientX, y: e.clientY, t: performance.now() }
}

function onPointerMove(e: PointerEvent) {
  if (!start) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Math.hypot(dx, dy) < 24) return
  emit('swipe', Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  start = { x: e.clientX, y: e.clientY, t: performance.now() }
}

function onPointerUp(e: PointerEvent) {
  if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8 && performance.now() - start.t < 250) emit('tap')
  start = null
}

defineExpose({
  get renderer() {
    return renderer
  },
  fit,
})
</script>

<template>
  <div
    ref="wrap"
    class="board-wrap"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="start = null"
  >
    <canvas ref="canvas" class="board" />
    <slot />
  </div>
</template>

<style scoped>
.board-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}
.board {
  display: block;
  border-radius: 6px;
  image-rendering: pixelated;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.04), 0 12px 40px rgba(0, 0, 0, 0.45);
}
</style>
