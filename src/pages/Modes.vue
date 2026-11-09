<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Clock, Hand, Infinity as InfinityIcon, Play, ScanFace, Shield, Sparkles, Trophy } from 'lucide-vue-next'
import { MODES, type GameMode } from '@/core/types'
import { appData, settings } from '@/stores/settings'
import { gameStore } from '@/stores/game'
import { AudioManager } from '@/systems/AudioManager'

const router = useRouter()

const icons = { classic: Sparkles, timed: Clock, obstacle: Shield, endless: InfinityIcon }

const modeList = Object.values(MODES)

function select(mode: GameMode) {
  AudioManager.play('click')
  gameStore.selectedMode = mode
}

function start() {
  AudioManager.unlock()
  AudioManager.play('click')
  router.push(`/game/${gameStore.selectedMode}`)
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" aria-label="返回" @click="router.push('/')"><ArrowLeft :size="20" /></button>
      <h1>选择游戏模式</h1>
    </header>

    <div class="page-body">
      <button
        v-for="m in modeList"
        :key="m.id"
        class="mode card"
        :class="{ active: gameStore.selectedMode === m.id }"
        @click="select(m.id)"
      >
        <div class="mode-icon"><component :is="icons[m.id]" :size="26" /></div>
        <div class="mode-info">
          <div class="mode-name">{{ m.name }}</div>
          <div class="muted mode-desc">{{ m.desc }}</div>
          <ul v-if="gameStore.selectedMode === m.id" class="rules">
            <li v-for="r in m.rules" :key="r">
              {{ m.id === 'timed' && r.startsWith('默认') ? `倒计时 ${settings.timedDuration} 秒` : r }}
            </li>
          </ul>
        </div>
        <div class="mode-best">
          <Trophy :size="14" />
          <span class="pixel">{{ appData.statistics.modeBest[m.id] }}</span>
        </div>
      </button>

      <div class="section-title">控制方式</div>
      <div class="control-switch">
        <button :class="{ on: settings.controlMode === 'head' }" @click="settings.controlMode = 'head'">
          <ScanFace :size="20" /> 头部控制
        </button>
        <button :class="{ on: settings.controlMode === 'touch' }" @click="settings.controlMode = 'touch'">
          <Hand :size="20" /> 触屏控制
        </button>
        <button :class="{ on: settings.controlMode === 'auto' }" @click="settings.controlMode = 'auto'">
          <Sparkles :size="20" /> 自动
        </button>
      </div>
      <p class="muted hint">
        <template v-if="settings.controlMode === 'head'">需要开启前置摄像头，通过转头、抬头、低头控制方向。</template>
        <template v-else-if="settings.controlMode === 'touch'">使用屏幕方向键或滑动手势控制，无需摄像头。</template>
        <template v-else>优先使用头部控制，摄像头不可用时自动切换为触屏控制。</template>
      </p>
    </div>

    <button class="btn btn-primary btn-block go" @click="start">
      <Play :size="20" fill="currentColor" /> 开始 {{ MODES[gameStore.selectedMode].name }}
    </button>
  </div>
</template>

<style scoped>
.mode {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  text-align: left;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
}
.mode:active {
  transform: scale(0.99);
}
.mode.active {
  border-color: var(--accent);
  background: linear-gradient(135deg, rgba(32, 217, 176, 0.14), var(--panel));
}
.mode-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(69, 230, 107, 0.12);
  color: var(--snake);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.active .mode-icon {
  background: var(--accent);
  color: #062a22;
}
.mode-info {
  flex: 1;
  min-width: 0;
}
.mode-name {
  font-weight: 800;
  font-size: 17px;
}
.mode-desc {
  font-size: 13px;
  margin-top: 2px;
}
.rules {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: #cfd8e8;
  line-height: 1.7;
}
.mode-best {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--gold);
  font-size: 14px;
}
.control-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.control-switch button {
  min-height: 52px;
  border-radius: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 700;
}
.control-switch button.on {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(32, 217, 176, 0.1);
}
.hint {
  font-size: 13px;
  margin: 0 4px;
}
.go {
  min-height: 56px;
  font-size: 18px;
  flex-shrink: 0;
}
</style>
