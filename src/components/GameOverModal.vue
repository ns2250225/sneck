<script setup lang="ts">
import { computed } from 'vue'
import { Coffee, Home, Layers, RotateCcw, Sparkles } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { MODES, type GameResult } from '@/core/types'
import { formatDuration } from '@/utils/helpers'

const props = defineProps<{ show: boolean; result: GameResult | null; best: number }>()
const emit = defineEmits<{ restart: []; modes: []; home: [] }>()

const reasonText = computed(() => {
  switch (props.result?.reason) {
    case 'wall':
      return '撞到了边界'
    case 'self':
      return '撞到了自己'
    case 'obstacle':
      return '撞到了障碍物'
    case 'timeout':
      return '时间到！'
    default:
      return '游戏结束'
  }
})
</script>

<template>
  <BaseModal :show="show">
    <div v-if="result" class="over">
      <div class="title pixel">{{ result.reason === 'timeout' ? "TIME'S UP" : 'GAME OVER' }}</div>
      <div class="reason muted">{{ MODES[result.mode].name }} · {{ reasonText }}</div>

      <div class="score-box">
        <div v-if="result.isNewBest" class="new-best"><Sparkles :size="14" /> 新纪录！</div>
        <div class="score pixel">{{ result.score }}</div>
        <div class="muted small">最高分 {{ best }}</div>
      </div>

      <div class="stats">
        <div>
          <b>{{ result.length }}</b><span>蛇长度</span>
        </div>
        <div>
          <b>{{ result.foods }}</b><span>吃掉食物</span>
        </div>
        <div>
          <b>{{ formatDuration(result.duration) }}</b><span>游戏时长</span>
        </div>
        <div v-if="result.control === 'head'">
          <b>{{ result.headMoves }}</b><span>头部动作</span>
        </div>
        <div v-if="result.mode === 'obstacle'">
          <b>{{ result.level }}</b><span>到达关卡</span>
        </div>
        <div>
          <b>Lv{{ result.maxSpeedLevel }}</b><span>最高速度</span>
        </div>
      </div>

      <div class="rest">
        <Coffee :size="20" />
        <span>休息一下吧！放松身体，眺望远方，让眼睛和颈部都休息一下。</span>
      </div>

      <div class="actions">
        <button class="btn btn-primary btn-block" @click="emit('restart')"><RotateCcw :size="18" /> 再来一局</button>
        <div class="row">
          <button class="btn" @click="emit('modes')"><Layers :size="18" /> 换模式</button>
          <button class="btn" @click="emit('home')"><Home :size="18" /> 首页</button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.over {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.title {
  font-size: 30px;
  color: var(--food);
  text-shadow: 3px 3px 0 #7a2414;
}
.reason {
  font-size: 14px;
  margin-top: -6px;
}
.score-box {
  position: relative;
  padding: 10px 0;
}
.new-best {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 99px;
  background: var(--gold);
  color: #3a2a00;
  font-weight: 800;
  font-size: 13px;
  animation: pop-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.score {
  font-size: 54px;
  color: var(--snake);
  line-height: 1.1;
}
.small {
  font-size: 13px;
}
.stats {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stats div {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stats b {
  font-size: 15px;
}
.stats span {
  font-size: 11px;
  color: var(--muted);
}
.rest {
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(32, 217, 176, 0.1);
  color: #bff5e8;
  font-size: 13px;
  line-height: 1.5;
}
.rest svg {
  flex-shrink: 0;
  color: var(--accent);
}
.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
