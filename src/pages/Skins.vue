<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, Lock } from 'lucide-vue-next'
import SkinPreview from '@/components/SkinPreview.vue'
import { FOOD_SKINS, MAP_THEMES, SNAKE_SKINS, describeRule } from '@/systems/SkinManager'
import { achievementName } from '@/systems/AchievementManager'
import { appData } from '@/stores/settings'
import { AudioManager } from '@/systems/AudioManager'

const router = useRouter()
const tab = ref<'snake' | 'theme' | 'food'>('snake')

const items = computed(() => {
  if (tab.value === 'snake') {
    return SNAKE_SKINS.map((s) => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      unlocked: appData.unlockedSkins.includes(s.id),
      selected: appData.selectedSkin === s.id,
      rule: describeRule(s.unlock, achievementName),
      preview: { skinId: s.id, themeId: appData.selectedTheme, foodSkinId: appData.selectedFoodSkin },
    }))
  }
  if (tab.value === 'theme') {
    return MAP_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
      desc: '',
      unlocked: appData.unlockedThemes.includes(t.id),
      selected: appData.selectedTheme === t.id,
      rule: describeRule(t.unlock, achievementName),
      preview: { skinId: appData.selectedSkin, themeId: t.id, foodSkinId: appData.selectedFoodSkin },
    }))
  }
  return FOOD_SKINS.map((f) => ({
    id: f.id,
    name: f.name,
    desc: '替换普通食物外观',
    unlocked: appData.unlockedFoodSkins.includes(f.id),
    selected: appData.selectedFoodSkin === f.id,
    rule: describeRule(f.unlock, achievementName),
    preview: { skinId: appData.selectedSkin, themeId: appData.selectedTheme, foodSkinId: f.id },
  }))
})

const unlockedCount = computed(
  () => appData.unlockedSkins.length + appData.unlockedThemes.length + appData.unlockedFoodSkins.length,
)
const total = SNAKE_SKINS.length + MAP_THEMES.length + FOOD_SKINS.length

function choose(id: string, unlocked: boolean) {
  if (!unlocked) return
  AudioManager.play('click')
  if (tab.value === 'snake') appData.selectedSkin = id
  else if (tab.value === 'theme') appData.selectedTheme = id
  else appData.selectedFoodSkin = id
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" aria-label="返回" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1>皮肤与主题</h1>
      <span class="badge">{{ unlockedCount }}/{{ total }}</span>
    </header>

    <div class="tabs">
      <button :class="{ on: tab === 'snake' }" @click="tab = 'snake'">蛇皮肤</button>
      <button :class="{ on: tab === 'theme' }" @click="tab = 'theme'">地图主题</button>
      <button :class="{ on: tab === 'food' }" @click="tab = 'food'">食物皮肤</button>
    </div>

    <div class="page-body">
      <div class="grid">
        <button
          v-for="it in items"
          :key="`${tab}-${it.id}`"
          class="card item"
          :class="{ locked: !it.unlocked, selected: it.selected }"
          @click="choose(it.id, it.unlocked)"
        >
          <div class="preview">
            <SkinPreview v-bind="it.preview" :animate="it.selected" :width="140" />
            <div v-if="!it.unlocked" class="lock"><Lock :size="22" /></div>
            <div v-if="it.selected" class="check"><Check :size="14" /></div>
          </div>
          <div class="name">{{ it.name }}</div>
          <div class="rule muted">{{ it.unlocked ? it.desc || '已解锁' : it.rule }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--panel);
  margin-bottom: 12px;
  flex-shrink: 0;
}
.tabs button {
  flex: 1;
  min-height: 40px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  color: var(--muted);
}
.tabs button.on {
  background: var(--accent);
  color: #062a22;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.item {
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  transition: border-color 0.2s, transform 0.12s;
}
.item:active {
  transform: scale(0.98);
}
.item.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}
.preview {
  position: relative;
}
.locked .preview {
  filter: grayscale(0.9) brightness(0.55);
}
.lock {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.check {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: #062a22;
  display: flex;
  align-items: center;
  justify-content: center;
}
.name {
  font-weight: 800;
  font-size: 14px;
}
.rule {
  font-size: 11px;
  line-height: 1.4;
}
</style>
