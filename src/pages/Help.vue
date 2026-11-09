<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, HeartPulse, Keyboard, ShieldCheck, Smartphone } from 'lucide-vue-next'
import { FOOD_INFO } from '@/core/Food'
import { MODES } from '@/core/types'
import { drawSpritePreview } from '@/core/Renderer'

const router = useRouter()
const foods = Object.values(FOOD_INFO)
const canvases = ref<HTMLCanvasElement[]>([])

onMounted(() => {
  canvases.value.forEach((c, i) => {
    c.width = 32
    c.height = 32
    drawSpritePreview(c, foods[i].type)
  })
})

const moves = [
  { icon: ArrowLeft, head: '向左转头', game: '蛇向左移动' },
  { icon: ArrowRight, head: '向右转头', game: '蛇向右移动' },
  { icon: ArrowUp, head: '抬头', game: '蛇向上移动' },
  { icon: ArrowDown, head: '低头', game: '蛇向下移动' },
]
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" aria-label="返回" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1>玩法说明</h1>
    </header>
    <div class="page-body">
      <div class="section-title">头部动作与方向</div>
      <div class="card">
        <div v-for="m in moves" :key="m.head" class="move">
          <div class="mi"><component :is="m.icon" :size="20" /></div>
          <b>{{ m.head }}</b>
          <span class="muted">→ {{ m.game }}</span>
        </div>
        <p class="muted small">
          方向按照你自身的实际左右定义，不受前置摄像头镜像影响。做出动作后回到自然姿势即可，蛇会保持当前方向前进。保持某个姿势不会重复触发。
        </p>
      </div>

      <div class="section-title">开始之前</div>
      <div class="card steps">
        <ol>
          <li>授权前置摄像头（画面只在本地处理）。</li>
          <li>坐直或自然站立，正视摄像头，保持约 2 秒完成校准。</li>
          <li>依次小幅做出左转、右转、抬头、低头完成方向测试。</li>
          <li>倒计时结束后开始游戏。点击右上角预览窗口可展开/收起。</li>
        </ol>
      </div>

      <div class="section-title">其他控制方式</div>
      <div class="card">
        <div class="move">
          <div class="mi"><Smartphone :size="20" /></div>
          <span>触屏：使用屏幕方向键（支持长按），或在游戏区域滑动</span>
        </div>
        <div class="move">
          <div class="mi"><Keyboard :size="20" /></div>
          <span>键盘：方向键 / WASD 控制方向，空格或 Esc 暂停</span>
        </div>
      </div>

      <div class="section-title">食物</div>
      <div class="card foods">
        <div v-for="(f, i) in foods" :key="f.type" class="food">
          <canvas :ref="(el) => (canvases[i] = el as HTMLCanvasElement)" />
          <div>
            <b>{{ f.name }}</b>
            <span class="score">+{{ f.score }}</span>
            <div class="muted small">{{ f.effect }}{{ f.lifetime ? ` · 限时 ${f.lifetime / 1000} 秒` : '' }}</div>
          </div>
        </div>
        <p class="muted small">
          特殊果实会随机触发：双倍得分、穿越自身、身体缩短、减速、加速或额外加分。3 秒内连续吃到食物可获得连击加分。
        </p>
      </div>

      <div class="section-title">游戏模式</div>
      <div class="card">
        <div v-for="m in Object.values(MODES)" :key="m.id" class="mode">
          <b>{{ m.name }}</b>
          <span class="muted small">{{ m.rules.join('；') }}</span>
        </div>
      </div>

      <div class="section-title">健康与安全</div>
      <div class="card safety">
        <div class="move">
          <div class="mi"><HeartPulse :size="20" /></div>
          <span>只需小幅、自然、缓慢的头部动作，不要快速甩头或大幅旋转颈部，也不要长时间保持极限姿势。</span>
        </div>
        <div class="move">
          <div class="mi"><ShieldCheck :size="20" /></div>
          <span>建议每局 2 分钟左右，连续游戏 5 分钟会提醒休息。如出现不适请立即停止。本游戏不替代医疗建议或康复训练。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.move {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 14px;
  line-height: 1.5;
}
.mi {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(32, 217, 176, 0.12);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.small {
  font-size: 12px;
  line-height: 1.6;
}
.steps ol {
  margin: 0;
  padding-left: 20px;
  line-height: 1.9;
  font-size: 14px;
}
.foods {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.food {
  display: flex;
  align-items: center;
  gap: 12px;
}
.food canvas {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}
.score {
  margin-left: 6px;
  color: var(--gold);
  font-weight: 800;
}
.mode {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
}
.mode + .mode {
  border-top: 1px solid var(--line);
}
.safety .move {
  align-items: flex-start;
}
</style>
