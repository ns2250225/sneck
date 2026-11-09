<script setup lang="ts">
import { computed } from 'vue'
import { Camera, Hand, Loader2, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-vue-next'
import { HeadTracker } from '@/vision/HeadTracker'
import { isIOS, isWeChat } from '@/utils/device'

const emit = defineEmits<{ start: []; useTouch: []; back: [] }>()

const t = HeadTracker.state

const loadingText = computed(() => {
  if (!t.cameraReady) return '正在开启摄像头…'
  if (!t.modelReady) return '正在加载头部识别模型…'
  return '准备就绪'
})

const deniedHelp = computed(() => {
  if (isWeChat) return '微信内置浏览器可能限制摄像头，可点击右上角「…」选择在浏览器中打开。'
  if (isIOS) return 'iPhone：打开「设置 → Safari 浏览器 → 相机」，选择「允许」，然后刷新页面。'
  return '点击地址栏左侧的锁形图标，将「摄像头」权限设为允许，然后重试。'
})
</script>

<template>
  <div class="setup card">
    <template v-if="t.phase === 'starting'">
      <Loader2 :size="44" class="spin accent" />
      <h2>{{ loadingText }}</h2>
      <div class="steps">
        <span :class="{ done: t.cameraReady }">摄像头 {{ t.cameraReady ? '✓' : '…' }}</span>
        <span :class="{ done: t.modelReady }">识别模型 {{ t.modelReady ? '✓' : '…' }}</span>
      </div>
      <p class="muted">首次加载模型可能需要几秒钟</p>
    </template>

    <template v-else-if="t.phase === 'error'">
      <TriangleAlert :size="44" class="warn" />
      <h2>{{ t.errorKind === 'model' ? '模型加载失败' : '无法使用摄像头' }}</h2>
      <p class="msg">{{ t.errorText }}</p>
      <p v-if="t.errorKind === 'denied'" class="muted help">{{ deniedHelp }}</p>
      <div class="actions">
        <button class="btn btn-primary btn-block" @click="emit('start')"><RefreshCw :size="18" /> 重试</button>
        <button class="btn btn-block" @click="emit('useTouch')"><Hand :size="18" /> 使用触屏控制</button>
      </div>
    </template>

    <template v-else>
      <div class="cam-icon"><Camera :size="40" /></div>
      <h2>开启摄像头</h2>
      <p class="msg">开启摄像头，让我们用头部动作控制贪吃蛇！摄像头画面只在你的设备本地处理，不会上传。</p>
      <div class="privacy"><ShieldCheck :size="16" /> 不保存人脸图像 · 不做身份识别 · 可随时关闭</div>
      <div class="actions">
        <button class="btn btn-primary btn-block" @click="emit('start')"><Camera :size="18" /> 开启摄像头</button>
        <button class="btn btn-block" @click="emit('useTouch')"><Hand :size="18" /> 不开启，使用触屏控制</button>
        <button class="btn btn-ghost btn-block btn-sm" @click="emit('back')">返回</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.setup {
  width: min(100%, 420px);
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 28px 22px;
}
h2 {
  margin: 0;
  font-size: 20px;
}
.msg {
  margin: 0;
  line-height: 1.6;
  font-size: 15px;
}
.help {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}
.cam-icon {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: rgba(32, 217, 176, 0.15);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: float 2.4s ease-in-out infinite;
}
.privacy {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--snake);
}
.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.steps {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--muted);
}
.steps .done {
  color: var(--snake);
}
.accent {
  color: var(--accent);
}
.warn {
  color: var(--gold);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
