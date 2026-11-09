<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import SettingsPanel from '@/components/SettingsPanel.vue'

const router = useRouter()
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" aria-label="返回" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1>游戏设置</h1>
    </header>
    <div class="page-body">
      <SettingsPanel />
    </div>
  </div>
</template>
