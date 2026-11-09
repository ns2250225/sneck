<script setup lang="ts">
import { Award, Sparkles, X } from 'lucide-vue-next'
import { dismissToast, gameStore } from '@/stores/game'
</script>

<template>
  <div class="toasts">
    <TransitionGroup name="toast">
      <div
        v-for="t in gameStore.toasts"
        :key="t.id"
        class="toast"
        :class="t.kind"
        @click="dismissToast(t.id)"
      >
        <div class="icon">
          <Award v-if="t.kind === 'achievement'" :size="26" />
          <Sparkles v-else :size="22" />
        </div>
        <div class="body">
          <div class="title">{{ t.title }}</div>
          <div class="desc">{{ t.desc }}</div>
          <div v-if="t.reward?.length" class="reward">奖励：{{ t.reward.join('、') }}</div>
        </div>
        <X :size="16" class="close" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: calc(var(--safe-top) + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 380px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(23, 36, 58, 0.96);
  border: 1px solid rgba(32, 217, 176, 0.4);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}
.toast.achievement {
  border-color: rgba(255, 212, 71, 0.6);
  background: linear-gradient(135deg, rgba(60, 48, 10, 0.96), rgba(23, 36, 58, 0.96));
}
.icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(32, 217, 176, 0.18);
  color: var(--accent);
  flex-shrink: 0;
}
.achievement .icon {
  background: rgba(255, 212, 71, 0.2);
  color: var(--gold);
  animation: spin-in 0.8s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.body {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 800;
  font-size: 15px;
}
.desc {
  font-size: 13px;
  color: var(--muted);
}
.reward {
  margin-top: 2px;
  font-size: 12px;
  color: var(--gold);
}
.close {
  color: var(--muted);
}
.toast-enter-active {
  animation: toast-in 0.45s cubic-bezier(0.2, 1.3, 0.4, 1);
}
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-24px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes spin-in {
  from {
    transform: rotate(-180deg) scale(0.3);
  }
  to {
    transform: none;
  }
}
</style>
