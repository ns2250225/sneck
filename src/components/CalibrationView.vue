<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowLeftRight, ArrowUpDown, Check, Hand, RotateCcw } from 'lucide-vue-next'
import CameraPreview from './CameraPreview.vue'
import HeadPoseIndicator from './HeadPoseIndicator.vue'
import { HeadTracker, type TrackerFrame } from '@/vision/HeadTracker'
import { DirectionTest, NeutralCalibration } from '@/vision/Calibration'
import { HeadController, HEAD_STATUS_HINT, type HeadStatus } from '@/vision/HeadController'
import { settings } from '@/stores/settings'
import type { CalibrationBaseline } from '@/systems/StorageManager'
import type { Direction } from '@/core/types'
import { AudioManager } from '@/systems/AudioManager'

const emit = defineEmits<{ done: [baseline: CalibrationBaseline]; useTouch: [] }>()

const t = HeadTracker.state
const step = ref<'neutral' | 'test' | 'finished'>('neutral')
const progress = ref(0)
const status = ref<HeadStatus>('noFace')
const pointing = ref<Direction | null>(null)
const rel = reactive({ yaw: 0, pitch: 0, roll: 0 })
const passed = reactive<Record<Direction, boolean>>({ up: false, down: false, left: false, right: false })

const neutral = new NeutralCalibration()
const test = new DirectionTest()
const classifier = new HeadController()
let baseline: CalibrationBaseline | null = null
let finishTimer: number | null = null

const passedCount = computed(() => Object.values(passed).filter(Boolean).length)

function onFrame(f: TrackerFrame) {
  const now = f.time
  classifier.sensitivity = settings.sensitivity
  let s: HeadStatus = 'ok'
  if (f.faces === 0) s = 'noFace'
  else if (f.faces > 1) s = 'multiFace'
  else if (f.confidence < 0.45) s = 'lowConfidence'
  status.value = s

  if (step.value === 'neutral') {
    const usable = s === 'ok' && f.abs ? f.abs : null
    const before = progress.value
    progress.value = neutral.update(usable, now)
    if (f.abs) Object.assign(rel, f.abs)
    if (Math.floor(before * 3) < Math.floor(progress.value * 3) && progress.value < 1) AudioManager.play('countdown')
    if (neutral.baseline) {
      baseline = neutral.baseline
      HeadTracker.baseline = baseline
      step.value = 'test'
      AudioManager.play('levelup')
    }
    return
  }

  if (step.value === 'test' && f.abs) {
    const r = HeadTracker.relative(f.abs)
    Object.assign(rel, r)
    if (s !== 'ok') {
      pointing.value = null
      return
    }
    const res = classifier.update({ faces: f.faces, confidence: f.confidence, yaw: r.yaw, pitch: r.pitch }, now)
    status.value = res.status
    pointing.value = res.pointing
    if (res.pointing && !passed[res.pointing]) {
      passed[res.pointing] = true
      test.mark(res.pointing)
      AudioManager.play('eat')
    }
    if (test.done && finishTimer === null) {
      finishTimer = window.setTimeout(finish, 600)
    }
  }
}

function finish() {
  if (!baseline) return
  step.value = 'finished'
  emit('done', baseline)
}

function restart() {
  neutral.reset()
  test.reset()
  Object.assign(passed, { up: false, down: false, left: false, right: false })
  progress.value = 0
  step.value = 'neutral'
  baseline = null
  if (finishTimer !== null) clearTimeout(finishTimer)
  finishTimer = null
  HeadTracker.resetFilter()
}

function invert(axis: 'yaw' | 'pitch') {
  if (axis === 'yaw') {
    settings.invertYaw = !settings.invertYaw
    HeadTracker.invertYaw = settings.invertYaw
    passed.left = passed.right = false
    test.passed.left = test.passed.right = false
  } else {
    settings.invertPitch = !settings.invertPitch
    HeadTracker.invertPitch = settings.invertPitch
    passed.up = passed.down = false
    test.passed.up = test.passed.down = false
  }
}

let off: (() => void) | null = null
onMounted(() => {
  HeadTracker.invertYaw = settings.invertYaw
  HeadTracker.invertPitch = settings.invertPitch
  off = HeadTracker.onFrame(onFrame)
})
onBeforeUnmount(() => {
  off?.()
  if (finishTimer !== null) clearTimeout(finishTimer)
})
</script>

<template>
  <div class="calib">
    <div class="head">
      <h2>{{ step === 'neutral' ? '头部姿态校准' : '方向动作测试' }}</h2>
      <p class="muted">
        <template v-if="step === 'neutral'">坐直或自然站立，正视摄像头，保持自然头部姿势约 2 秒</template>
        <template v-else>依次做出小幅动作：左转、右转、抬头、低头（{{ passedCount }}/4）</template>
      </p>
    </div>

    <div class="stage">
      <div class="cam">
        <CameraPreview
          :stream="t.stream"
          :mirrored="t.mirrored"
          :box="t.frame.box"
          :status="status"
          :direction="pointing"
          expanded
          :show-toggle="false"
        />
        <div class="angles">
          <span>Yaw {{ rel.yaw.toFixed(0) }}°</span>
          <span>Pitch {{ rel.pitch.toFixed(0) }}°</span>
          <span>Roll {{ rel.roll.toFixed(0) }}°</span>
        </div>
      </div>
      <HeadPoseIndicator
        :yaw="rel.yaw"
        :pitch="rel.pitch"
        :sensitivity="settings.sensitivity"
        :pointing="pointing"
        :passed="passed"
        :active="step === 'test'"
        :size="120"
      />
    </div>

    <div v-if="status !== 'ok'" class="hint">{{ HEAD_STATUS_HINT[status] }}</div>

    <div v-if="step === 'neutral'" class="progress-box">
      <div class="progress"><i :style="{ width: `${progress * 100}%` }" /></div>
      <span class="muted">{{ Math.round(progress * 100) }}%</span>
    </div>

    <div v-else class="test-tools">
      <div class="checks">
        <span v-for="d in (['left', 'right', 'up', 'down'] as const)" :key="d" :class="{ ok: passed[d] }">
          <Check v-if="passed[d]" :size="14" />{{ { left: '左转', right: '右转', up: '抬头', down: '低头' }[d] }}
        </span>
      </div>
      <p class="muted small">只需小幅、缓慢的自然动作即可，不要快速甩头。方向反了？</p>
      <div class="row">
        <button class="btn btn-sm" @click="invert('yaw')"><ArrowLeftRight :size="16" /> 反转左右</button>
        <button class="btn btn-sm" @click="invert('pitch')"><ArrowUpDown :size="16" /> 反转上下</button>
      </div>
    </div>

    <div class="row footer">
      <button class="btn btn-sm btn-ghost" @click="restart"><RotateCcw :size="16" /> 重新校准</button>
      <button v-if="step === 'test'" class="btn btn-sm" @click="finish">跳过测试</button>
      <button class="btn btn-sm btn-ghost" @click="emit('useTouch')"><Hand :size="16" /> 触屏控制</button>
    </div>
  </div>
</template>

<style scoped>
.calib {
  width: min(100%, 560px);
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.head h2 {
  margin: 0 0 4px;
  font-size: 20px;
}
.head p {
  margin: 0;
  font-size: 14px;
}
.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
}
.cam {
  width: min(100%, 260px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.angles {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-family: var(--pixel-font);
  color: var(--muted);
}
.hint {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 212, 71, 0.12);
  color: var(--gold);
  font-size: 13px;
}
.progress-box {
  width: min(100%, 320px);
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-box .progress {
  flex: 1;
  height: 12px;
}
.test-tools {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.checks {
  display: flex;
  gap: 8px;
}
.checks span {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 13px;
  color: var(--muted);
}
.checks span.ok {
  background: rgba(69, 230, 107, 0.15);
  color: var(--snake);
}
.small {
  font-size: 12px;
  margin: 0;
}
.row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.footer {
  margin-top: 4px;
}
@media (orientation: landscape) and (max-height: 560px) {
  .cam {
    width: 200px;
  }
}
</style>
