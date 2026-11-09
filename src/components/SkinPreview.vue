<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GameEngine } from '@/core/GameEngine'
import { Renderer } from '@/core/Renderer'
import { Snake } from '@/core/Snake'
import { getFoodSkin, getMapTheme, getSnakeSkin } from '@/systems/SkinManager'

const props = withDefaults(
  defineProps<{ skinId: string; themeId: string; foodSkinId: string; animate?: boolean; width?: number }>(),
  { animate: false, width: 150 },
)

const canvas = ref<HTMLCanvasElement>()
const COLS = 8
const ROWS = 3
let renderer: Renderer | null = null
let raf = 0

const engine = new GameEngine({ mode: 'classic', cols: COLS, rows: ROWS, baseSpeed: 3, autoSpeed: false })
engine.snake = new Snake({ x: 4, y: 1 }, 'right', 5)
engine.food.foods = [{ id: 1, type: 'apple', x: 6, y: 1, spawnedAt: -1000, expiresAt: null }]

function draw(now: number) {
  renderer?.render(engine, now)
  if (props.animate) raf = requestAnimationFrame(draw)
}

function apply() {
  if (!renderer) return
  renderer.theme = getMapTheme(props.themeId)
  renderer.skin = getSnakeSkin(props.skinId)
  renderer.foodSkin = getFoodSkin(props.foodSkinId).id
  cancelAnimationFrame(raf)
  draw(performance.now())
}

onMounted(() => {
  renderer = new Renderer(canvas.value!)
  renderer.resize(props.width, props.width, COLS, ROWS)
  apply()
})

onBeforeUnmount(() => cancelAnimationFrame(raf))

watch(() => [props.skinId, props.themeId, props.foodSkinId, props.animate], apply)
</script>

<template>
  <canvas ref="canvas" class="skin-preview" />
</template>

<style scoped>
.skin-preview {
  display: block;
  border-radius: 8px;
  image-rendering: pixelated;
}
</style>
