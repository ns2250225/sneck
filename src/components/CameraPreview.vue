<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { SwitchCamera, Maximize2, Minimize2 } from 'lucide-vue-next'
import type { FaceBox } from '@/vision/HeadPoseEstimator'
import { HEAD_STATUS_TEXT, type HeadStatus } from '@/vision/HeadController'
import { DIRECTION_LABELS, type Direction } from '@/core/types'

const props = withDefaults(
  defineProps<{
    stream: MediaStream | null
    mirrored?: boolean
    box?: FaceBox | null
    status: HeadStatus
    direction?: Direction | null
    expanded?: boolean
    canSwitch?: boolean
    showToggle?: boolean
  }>(),
  { mirrored: true, box: null, direction: null, expanded: false, canSwitch: false, showToggle: true },
)

const emit = defineEmits<{ toggle: []; switchCamera: [] }>()

const video = ref<HTMLVideoElement>()

function attach() {
  const v = video.value
  if (!v) return
  if (v.srcObject !== props.stream) v.srcObject = props.stream
  if (props.stream) v.play().catch(() => {})
}

onMounted(attach)
watch(() => props.stream, attach)

const boxStyle = computed(() => {
  const b = props.box
  if (!b) return null
  const padX = b.w * 0.25
  const padY = b.h * 0.2
  const x = props.mirrored ? 1 - (b.x + b.w) - padX : b.x - padX
  return {
    left: `${x * 100}%`,
    top: `${(b.y - padY) * 100}%`,
    width: `${(b.w + padX * 2) * 100}%`,
    height: `${(b.h + padY * 2) * 100}%`,
  }
})

const light = computed(() => {
  if (props.status === 'ok') return 'ok'
  if (props.status === 'tooFar' || props.status === 'lowConfidence') return 'warn'
  if (props.status === 'paused') return 'idle'
  return 'bad'
})
</script>

<template>
  <div class="preview" :class="{ expanded }" @click="emit('toggle')">
    <video ref="video" :class="{ mirrored }" playsinline webkit-playsinline muted autoplay />
    <div v-if="!stream" class="placeholder">摄像头未开启</div>
    <div v-if="boxStyle" class="face-box" :class="light" :style="boxStyle" />
    <div class="status">
      <i class="light" :class="light" />
      <span>{{ HEAD_STATUS_TEXT[status] }}</span>
    </div>
    <div v-if="direction" class="dir">{{ DIRECTION_LABELS[direction] }}</div>
    <div class="tools">
      <button v-if="canSwitch" class="tool" aria-label="切换摄像头" @click.stop="emit('switchCamera')">
        <SwitchCamera :size="14" />
      </button>
      <span v-if="showToggle" class="tool">
        <Minimize2 v-if="expanded" :size="14" />
        <Maximize2 v-else :size="14" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  aspect-ratio: 4 / 3;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: #000;
  border: 2px solid rgba(32, 217, 176, 0.35);
  cursor: pointer;
}
video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
video.mirrored {
  transform: scaleX(-1);
}
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--muted);
}
.face-box {
  position: absolute;
  border: 2px solid var(--snake);
  border-radius: 10px;
  transition: all 0.08s linear;
  pointer-events: none;
}
.face-box.warn {
  border-color: var(--gold);
}
.face-box.bad {
  border-color: var(--danger);
}
.status {
  position: absolute;
  left: 4px;
  bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  font-size: 10px;
  white-space: nowrap;
}
.expanded .status {
  font-size: 12px;
  left: 6px;
  bottom: 6px;
}
.light {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}
.light.ok {
  background: var(--snake);
  box-shadow: 0 0 6px var(--snake);
}
.light.warn {
  background: var(--gold);
  animation: pulse-dot 1s infinite;
}
.light.bad {
  background: var(--danger);
  animation: pulse-dot 0.6s infinite;
}
.dir {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--accent);
  color: #062a22;
  font-size: 10px;
  font-weight: 800;
}
.expanded .dir {
  font-size: 13px;
}
.tools {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
}
.tool {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}
</style>
