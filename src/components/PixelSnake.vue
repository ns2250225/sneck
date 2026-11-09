<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getSnakeSkin } from '@/systems/SkinManager'
import { appData } from '@/stores/settings'

const canvas = ref<HTMLCanvasElement>()
let raf = 0

onMounted(() => {
  const c = canvas.value!
  const g = c.getContext('2d')!
  const cols = 16
  const rows = 7
  const cell = 14
  c.width = cols * cell
  c.height = rows * cell
  const path: [number, number][] = []
  for (let x = 1; x < cols - 1; x++) path.push([x, 1])
  for (let y = 2; y < rows - 1; y++) path.push([cols - 2, y])
  for (let x = cols - 3; x > 0; x--) path.push([x, rows - 2])
  for (let y = rows - 3; y > 1; y--) path.push([1, y])
  const len = 9
  const apple = [Math.floor(cols / 2), Math.floor(rows / 2)]

  const draw = (now: number) => {
    const skin = getSnakeSkin(appData.selectedSkin)
    const step = Math.floor(now / 140)
    g.clearRect(0, 0, c.width, c.height)
    g.fillStyle = '#FF684A'
    const bob = Math.sin(now / 250) > 0 ? 0 : 1
    g.fillRect(apple[0] * cell + 3, apple[1] * cell + 3 + bob, cell - 6, cell - 6)
    g.fillStyle = '#45E66B'
    g.fillRect(apple[0] * cell + cell / 2 - 1, apple[1] * cell + 1 + bob, 3, 3)
    for (let i = len - 1; i >= 0; i--) {
      const [x, y] = path[(step - i + path.length * 10) % path.length]
      const color = i === 0 ? skin.head : skin.body.length ? skin.body[i % skin.body.length] : `hsl(${i * 30}, 90%, 60%)`
      g.fillStyle = skin.outline
      g.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2)
      g.fillStyle = color
      g.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4)
      if (i === 0) {
        g.fillStyle = skin.eye
        g.fillRect(x * cell + 4, y * cell + 4, 2, 2)
        g.fillRect(x * cell + cell - 6, y * cell + 4, 2, 2)
      }
    }
    raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="canvas" class="pixel-snake" />
</template>

<style scoped>
.pixel-snake {
  width: min(78vw, 300px);
  image-rendering: pixelated;
  filter: drop-shadow(0 0 18px rgba(69, 230, 107, 0.35));
}
</style>
