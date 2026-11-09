<script setup lang="ts">
import { onMounted } from 'vue'
import ToastLayer from './components/ToastLayer.vue'
import { AudioManager } from './systems/AudioManager'

onMounted(() => {
  const unlock = () => AudioManager.unlock()
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
})
</script>

<template>
  <RouterView />
  <ToastLayer />
</template>
