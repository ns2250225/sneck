<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Award, BarChart3, CircleHelp, Gamepad2, Palette, Play, Settings, Trophy } from 'lucide-vue-next'
import PixelSnake from '@/components/PixelSnake.vue'
import { appData } from '@/stores/settings'
import { ACHIEVEMENTS } from '@/systems/AchievementManager'
import { AudioManager } from '@/systems/AudioManager'

const router = useRouter()

function go(path: string) {
  AudioManager.play('click')
  router.push(path)
}
</script>

<template>
  <div class="page home">
    <div class="top">
      <button class="icon-btn" aria-label="设置" @click="go('/settings')"><Settings :size="20" /></button>
    </div>

    <div class="hero">
      <div class="logo pixel">NECK<span>SNAKE</span></div>
      <div class="subtitle">颈椎贪吃蛇</div>
      <PixelSnake />
      <div class="best card">
        <Trophy :size="20" class="gold" />
        <span class="muted">最高分</span>
        <strong class="pixel">{{ appData.statistics.bestScore }}</strong>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary btn-block start" @click="go('/modes')">
        <Play :size="22" fill="currentColor" /> 开始游戏
      </button>
      <div class="grid">
        <button class="btn" @click="go('/modes')"><Gamepad2 :size="18" /> 游戏模式</button>
        <button class="btn" @click="go('/skins')"><Palette :size="18" /> 皮肤</button>
        <button class="btn" @click="go('/achievements')">
          <Award :size="18" /> 成就
          <span class="badge">{{ appData.achievements.length }}/{{ ACHIEVEMENTS.length }}</span>
        </button>
        <button class="btn" @click="go('/stats')"><BarChart3 :size="18" /> 统计</button>
        <button class="btn" @click="go('/settings')"><Settings :size="18" /> 设置</button>
        <button class="btn" @click="go('/help')"><CircleHelp :size="18" /> 玩法说明</button>
      </div>
      <p class="note muted">摄像头画面只在本地处理，不会上传 · 无需登录</p>
    </div>
  </div>
</template>

<style scoped>
.home {
  justify-content: space-between;
  overflow-y: auto;
}
.top {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0 16px;
}
.logo {
  font-size: clamp(38px, 12vw, 64px);
  line-height: 0.95;
  text-align: center;
  color: var(--snake);
  text-shadow: 0 0 18px rgba(69, 230, 107, 0.55), 4px 4px 0 #0b5c22;
  display: flex;
  flex-direction: column;
  animation: float 3s ease-in-out infinite;
}
.logo span {
  color: var(--gold);
  text-shadow: 0 0 18px rgba(255, 212, 71, 0.5), 4px 4px 0 #8a6408;
}
.subtitle {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: var(--accent);
}
.best {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 999px;
}
.best strong {
  font-size: 22px;
  color: var(--gold);
}
.gold {
  color: var(--gold);
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.start {
  min-height: 60px;
  font-size: 20px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.grid .btn {
  font-size: 15px;
}
.note {
  text-align: center;
  font-size: 12px;
  margin: 4px 0 0;
}
@media (orientation: landscape) and (max-height: 560px) {
  .home {
    flex-direction: row;
    align-items: center;
    gap: 24px;
    max-width: 900px;
  }
  .top {
    position: absolute;
    right: calc(var(--safe-right) + 16px);
    top: calc(var(--safe-top) + 8px);
  }
  .hero,
  .actions {
    flex: 1;
  }
  .grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
</style>
