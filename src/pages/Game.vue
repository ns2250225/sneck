<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Coffee, Crosshair, Hand, Home, Play, RotateCcw, ScanFace, Settings as SettingsIcon } from 'lucide-vue-next'
import GameCanvas from '@/components/GameCanvas.vue'
import CameraPreview from '@/components/CameraPreview.vue'
import ScorePanel from '@/components/ScorePanel.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import VirtualJoystick from '@/components/VirtualJoystick.vue'
import GameOverModal from '@/components/GameOverModal.vue'
import BaseModal from '@/components/BaseModal.vue'
import CameraSetup from '@/components/CameraSetup.vue'
import CalibrationView from '@/components/CalibrationView.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import { GameEngine, type EatEvent, type EndReason, type SpecialOutcome } from '@/core/GameEngine'
import { FOOD_INFO } from '@/core/Food'
import { MODES, type ActiveControl, type Direction, type EffectType, type GameMode, type GameResult, type GameStatus } from '@/core/types'
import { appData, settings } from '@/stores/settings'
import { checkLiveAchievements, gameStore, pushToast, recordGame } from '@/stores/game'
import { AudioManager } from '@/systems/AudioManager'
import { ReminderManager, type Reminder } from '@/systems/ReminderManager'
import { HeadTracker, type TrackerFrame } from '@/vision/HeadTracker'
import { HeadController, HEAD_STATUS_HINT, type HeadStatus } from '@/vision/HeadController'
import { CameraManager } from '@/vision/CameraManager'
import type { CalibrationBaseline } from '@/systems/StorageManager'
import { getGridSize, isLandscape, vibrate } from '@/utils/device'
import { FpsMeter } from '@/utils/performance'

type Phase = 'setup' | 'calibrating' | 'countdown' | 'playing' | 'paused' | 'over'

const route = useRoute()
const router = useRouter()

const modeParam = String(route.params.mode) as GameMode
const mode: GameMode = modeParam in MODES ? modeParam : 'classic'
gameStore.selectedMode = mode

const phase = ref<Phase>('setup')
const status = computed<GameStatus>(() => {
  switch (phase.value) {
    case 'setup':
      return 'CAMERA_INITIALIZING'
    case 'calibrating':
      return 'CALIBRATING'
    case 'countdown':
      return 'READY'
    case 'playing':
      return 'PLAYING'
    case 'paused':
      return 'PAUSED'
    default:
      return 'GAME_OVER'
  }
})
const activeControl = ref<ActiveControl>(settings.controlMode === 'touch' ? 'touch' : 'head')
const tracker = HeadTracker.state
const grid = reactive(getGridSize())
const landscape = ref(isLandscape())
const countdown = ref(0)
const pauseReason = ref('')
const showPauseSettings = ref(false)
const reminder = ref<Reminder | null>(null)
const restBanner = ref('')
const levelBanner = ref('')
const previewExpanded = ref(false)
const result = ref<GameResult | null>(null)
const fps = ref(0)
const headStatus = ref<HeadStatus>('noFace')
const headPointing = ref<Direction | null>(null)

const hud = reactive({
  score: 0,
  length: 3,
  speedLevel: settings.gameSpeed,
  time: 0,
  countdown: null as number | null,
  level: null as number | null,
  direction: 'right' as Direction,
  effects: [] as { type: EffectType; label: string; remaining: number }[],
})

const EFFECT_LABEL: Record<EffectType, string> = { slow: '减速', fast: '加速', double: '双倍', ghost: '穿身' }
const SPECIAL_TEXT: Record<SpecialOutcome, string> = {
  double: '双倍得分！',
  ghost: '穿越自身！',
  shrink: '身体缩短！',
  slow: '减速！',
  fast: '加速！',
  bonus: '额外 +50！',
}

const canvasRef = ref<InstanceType<typeof GameCanvas>>()
const controller = markRaw(new HeadController())
const fpsMeter = new FpsMeter()
let rafId = 0
let lastTime = performance.now()
let countdownTimer: number | null = null
let headMoves = 0
let lostSince: number | null = null
let lastLiveCheck = 0
let lastEffectsUpdate = 0
let cameraSuspended = false
let offFrame: (() => void) | null = null
let bannerTimer: number | null = null
let levelTimer: number | null = null
let engine: GameEngine = createEngine()

function createEngine(): GameEngine {
  Object.assign(grid, getGridSize())
  const e = markRaw(
    new GameEngine({
      mode,
      cols: grid.cols,
      rows: grid.rows,
      baseSpeed: settings.gameSpeed,
      autoSpeed: settings.autoSpeed,
      timeLimitSec: settings.timedDuration,
    }),
  )
  e.events = {
    onEat: handleEat,
    onGameOver: handleGameOver,
    onLevelUp: (level) => {
      AudioManager.play('levelup')
      showLevelBanner(`第 ${level} 关`)
    },
    onSpeedChange: (level) => {
      const r = canvasRef.value?.renderer
      r?.floatText(e.snake.head.x, e.snake.head.y - 1, `速度 Lv${level}`, '#20D9B0')
    },
  }
  headMoves = 0
  return e
}

function showLevelBanner(text: string) {
  levelBanner.value = text
  if (levelTimer !== null) clearTimeout(levelTimer)
  levelTimer = window.setTimeout(() => (levelBanner.value = ''), 1600)
}

function handleEat(e: EatEvent) {
  const r = canvasRef.value?.renderer
  const info = FOOD_INFO[e.food.type]
  r?.burst(e.food.x, e.food.y, info.color, e.food.type === 'apple' ? 12 : 22)
  r?.floatText(e.food.x, e.food.y, `+${e.points}`, e.food.type === 'apple' ? '#FFFFFF' : '#FFD447')
  if (e.combo >= 3) r?.floatText(e.food.x, e.food.y + 1.4, `连击 x${e.combo}`, '#20D9B0')
  if (e.special) {
    r?.floatText(e.food.x, e.food.y - 1.2, SPECIAL_TEXT[e.special], '#C79BFF')
    AudioManager.play('special')
  } else if (e.food.type === 'apple' || e.food.type === 'banana') {
    AudioManager.play('eat')
  } else {
    AudioManager.play('bonus')
  }
  if (settings.vibration) vibrate(e.food.type === 'apple' ? 15 : 35)
}

function handleGameOver(reason: EndReason) {
  phase.value = 'over'
  AudioManager.stopMusic()
  AudioManager.play('gameover')
  if (settings.vibration) vibrate([60, 40, 120])
  canvasRef.value?.renderer?.shakeScreen(8)
  result.value = recordGame({
    mode,
    score: engine.score,
    length: engine.snake.length,
    duration: engine.elapsed / 1000,
    foods: engine.foodsEaten,
    normalFoods: engine.normalEaten,
    maxSpeedLevel: Math.floor(engine.maxSpeedLevel),
    level: engine.level,
    reason,
    control: activeControl.value,
    headMoves,
    endedAt: Date.now(),
  })
}

// ---------- flow ----------

async function init() {
  if (settings.controlMode === 'touch') {
    activeControl.value = 'touch'
    startCountdown()
    return
  }
  activeControl.value = 'head'
  phase.value = 'setup'
  const perm = await CameraManager.permissionState()
  if (perm === 'granted' || settings.controlMode === 'auto' || HeadTracker.isRunning) await startCamera()
}

async function startCamera() {
  phase.value = 'setup'
  const ok = await HeadTracker.start(settings.cameraDeviceId)
  if (!ok) {
    if (settings.controlMode === 'auto' && tracker.phase === 'error') {
      pushToast({ kind: 'info', title: '已切换为触屏控制', desc: tracker.errorText })
      useTouch()
    }
    return
  }
  afterCamera()
}

function afterCamera() {
  const needCalibration = !appData.calibration || (settings.autoCalibrate && !gameStore.calibratedThisSession)
  if (needCalibration) {
    phase.value = 'calibrating'
  } else {
    HeadTracker.baseline = { ...appData.calibration! }
    startCountdown()
  }
}

function onCalibrated(b: CalibrationBaseline) {
  appData.calibration = { ...b }
  gameStore.calibratedThisSession = true
  HeadTracker.baseline = { ...b }
  startCountdown()
}

function useTouch() {
  HeadTracker.stop()
  activeControl.value = 'touch'
  previewExpanded.value = false
  if (phase.value === 'setup' || phase.value === 'calibrating') startCountdown()
}

function switchControl() {
  if (phase.value === 'over') return
  if (activeControl.value === 'head') {
    useTouch()
    pushToast({ kind: 'info', title: '已切换为触屏控制', desc: '摄像头已关闭' })
    return
  }
  pause()
  activeControl.value = 'head'
  void startCamera()
}

function startCountdown() {
  clearCountdown()
  showPauseSettings.value = false
  phase.value = 'countdown'
  countdown.value = 3
  AudioManager.play('countdown')
  countdownTimer = window.setInterval(() => {
    countdown.value--
    if (countdown.value > 0) {
      AudioManager.play('countdown')
    } else {
      clearCountdown()
      AudioManager.play('go')
      begin()
    }
  }, 800)
}

function clearCountdown() {
  if (countdownTimer !== null) clearInterval(countdownTimer)
  countdownTimer = null
}

function begin() {
  if (engine.state === 'ready') {
    ReminderManager.startGame()
    engine.start()
  } else {
    engine.resume()
  }
  controller.reset()
  lostSince = null
  phase.value = 'playing'
  lastTime = performance.now()
  AudioManager.startMusic()
}

function pause(reason = '') {
  if (phase.value === 'playing' || phase.value === 'countdown') {
    clearCountdown()
    engine.pause()
    phase.value = 'paused'
    pauseReason.value = reason
    AudioManager.stopMusic()
  }
}

function resume() {
  if (phase.value !== 'paused') return
  reminder.value = null
  if (activeControl.value === 'head' && !HeadTracker.isRunning) {
    void startCamera()
    return
  }
  startCountdown()
}

function togglePause() {
  if (phase.value === 'playing' || phase.value === 'countdown') pause()
  else if (phase.value === 'paused' && !reminder.value) resume()
}

function restart() {
  clearCountdown()
  result.value = null
  reminder.value = null
  engine = createEngine()
  canvasRef.value?.fit()
  if (activeControl.value === 'head' && !HeadTracker.isRunning) {
    void startCamera()
    return
  }
  startCountdown()
}

function recalibrate() {
  showPauseSettings.value = false
  if (!HeadTracker.isRunning) {
    activeControl.value = 'head'
    void startCamera()
    return
  }
  phase.value = 'calibrating'
}

function quitToRest() {
  ReminderManager.takeBreak()
  reminder.value = null
  if (engine.state === 'paused' || engine.state === 'playing') engine.endGame('quit')
}

function disableReminders() {
  settings.restReminder = false
  resume()
}

function leave(path: string) {
  router.push(path)
}

// ---------- input ----------

function manualDirection(dir: Direction) {
  if (phase.value !== 'playing') return
  engine.setDirection(dir)
}

function onKey(e: KeyboardEvent) {
  const map: Record<string, Direction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right',
    W: 'up',
    S: 'down',
    A: 'left',
    D: 'right',
  }
  if (map[e.key]) {
    e.preventDefault()
    manualDirection(map[e.key])
  } else if (e.key === ' ' || e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    e.preventDefault()
    togglePause()
  }
}

controller.onCommand = (dir) => {
  if (!engine.setDirection(dir)) return
  headMoves++
  if (settings.recognitionFeedback) {
    canvasRef.value?.renderer?.flashDirection(dir)
    AudioManager.play('turn')
  }
}
controller.isReverse = (dir) => engine.isReverse(dir)

function onTrackerFrame(f: TrackerFrame) {
  if (activeControl.value !== 'head') return
  const input = f.rel ? { faces: f.faces, confidence: f.confidence, yaw: f.rel.yaw, pitch: f.rel.pitch } : { faces: f.faces, confidence: f.confidence, yaw: 0, pitch: 0 }
  if (phase.value === 'playing') {
    controller.enabled = true
    const st = controller.update(f.faces ? input : null, f.time)
    headStatus.value = st.status
    headPointing.value = st.pointing
    const lost = st.status === 'noFace' || st.status === 'multiFace' || st.status === 'lowConfidence'
    if (lost) {
      lostSince ??= f.time
      if (f.time - lostSince > 2500) {
        pause(`${HEAD_STATUS_HINT[st.status]}。头部控制已暂停，调整好后点击继续。`)
        AudioManager.play('warn')
      }
    } else {
      lostSince = null
    }
    updateWarnBanner(st.status, f.time)
  } else {
    warnBanner.value = ''
    warnState = { status: 'ok', since: 0 }
    headStatus.value = f.faces === 0 ? 'noFace' : f.faces > 1 ? 'multiFace' : f.confidence < 0.45 ? 'lowConfidence' : 'ok'
    headPointing.value = f.rel && headStatus.value === 'ok' ? controller.classify(f.rel.yaw, f.rel.pitch).dir : null
  }
}

// ---------- loop ----------

function frame(now: number) {
  rafId = requestAnimationFrame(frame)
  const dt = now - lastTime
  lastTime = now
  fps.value = fpsMeter.tick(now)

  if (phase.value === 'playing') {
    engine.update(dt)
    if (phase.value === 'playing') {
      const r = ReminderManager.tick(Math.min(dt, 250), settings)
      if (r) handleReminder(r)
      if (now - lastLiveCheck > 1000) {
        lastLiveCheck = now
        checkLiveAchievements({
          mode,
          score: engine.score,
          length: engine.snake.length,
          speedLevel: Math.floor(engine.speedLevel),
          elapsedSec: engine.elapsed / 1000,
          foods: engine.foodsEaten,
          normalFoods: engine.normalEaten,
        })
      }
    }
  }

  canvasRef.value?.renderer?.render(engine, now)
  updateHud(now)
}

function updateHud(now: number) {
  hud.score = engine.score
  hud.length = engine.snake.length
  hud.speedLevel = engine.speedLevel
  hud.time = Math.floor(engine.elapsed / 1000)
  const remaining = engine.remainingMs
  hud.countdown = remaining === null ? null : Math.ceil(remaining / 1000)
  hud.level = mode === 'obstacle' ? engine.level : null
  hud.direction = engine.currentDirection
  if (now - lastEffectsUpdate > 250) {
    lastEffectsUpdate = now
    hud.effects = [...engine.effects].map(([type, remaining]) => ({ type, label: EFFECT_LABEL[type], remaining }))
  }
}

function handleReminder(r: Reminder) {
  AudioManager.play('warn')
  if (r.kind === 'rest') {
    restBanner.value = r.message
    if (bannerTimer !== null) clearTimeout(bannerTimer)
    bannerTimer = window.setTimeout(() => (restBanner.value = ''), 8000)
    return
  }
  pause()
  reminder.value = r
}

// ---------- lifecycle ----------

function onVisibility() {
  if (document.hidden) {
    if (phase.value === 'playing' || phase.value === 'countdown') pause('页面切换到后台，游戏已自动暂停。')
    if (HeadTracker.isRunning || tracker.phase === 'starting') {
      HeadTracker.stop()
      cameraSuspended = true
    }
  } else if (cameraSuspended) {
    cameraSuspended = false
    if (activeControl.value !== 'head') return
    if (phase.value === 'setup' || phase.value === 'calibrating') {
      void startCamera()
    } else {
      void HeadTracker.start(settings.cameraDeviceId)
    }
  }
}

function onResize() {
  landscape.value = isLandscape()
}

watch(
  () => settings.sensitivity,
  (v) => (controller.sensitivity = v),
  { immediate: true },
)
watch(
  () => settings.smoothing,
  (v) => (HeadTracker.smoothing = v),
  { immediate: true },
)
watch(
  () => [settings.invertYaw, settings.invertPitch],
  () => {
    HeadTracker.invertYaw = settings.invertYaw
    HeadTracker.invertPitch = settings.invertPitch
  },
  { immediate: true },
)
watch(
  () => settings.cameraDeviceId,
  (id) => {
    if (HeadTracker.isRunning && id !== tracker.activeDeviceId) void HeadTracker.switchDevice(id)
  },
)
watch(
  () => [settings.autoSpeed, settings.gameSpeed],
  () => {
    engine.options.autoSpeed = settings.autoSpeed
  },
)
watch(
  () => tracker.phase,
  (p) => {
    if (p === 'error' && activeControl.value === 'head' && phase.value === 'playing') {
      pause(tracker.errorText)
    }
  },
)

async function switchCamera() {
  const devices = tracker.devices
  if (devices.length < 2) return
  const i = devices.findIndex((d) => d.deviceId === tracker.activeDeviceId)
  const next = devices[(i + 1) % devices.length]
  settings.cameraDeviceId = next.deviceId
}

const warnBanner = ref('')
let warnState: { status: HeadStatus; since: number } = { status: 'ok', since: 0 }

/** Shows the warning only after a status has persisted, so momentary blips don't flash the banner. */
function updateWarnBanner(st: HeadStatus, now: number) {
  if (st !== warnState.status) warnState = { status: st, since: now }
  const held = now - warnState.since
  if (st === 'ok') {
    if (held > 400) warnBanner.value = ''
  } else if (held > 600) {
    warnBanner.value = HEAD_STATUS_HINT[st] ?? ''
  }
}

const lostHint = computed(() => (activeControl.value === 'head' && phase.value === 'playing' ? warnBanner.value : ''))

const showSmallPreview = computed(
  () => activeControl.value === 'head' && settings.cameraPreview && phase.value !== 'setup' && phase.value !== 'calibrating',
)

onMounted(() => {
  offFrame = HeadTracker.onFrame(onTrackerFrame)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  rafId = requestAnimationFrame(frame)
  void init()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearCountdown()
  if (bannerTimer !== null) clearTimeout(bannerTimer)
  if (levelTimer !== null) clearTimeout(levelTimer)
  offFrame?.()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
  AudioManager.stopMusic()
  HeadTracker.stop()
})
</script>

<template>
  <div class="game" :class="{ landscape, touch: activeControl === 'touch' }" :data-status="status">
    <header class="bar">
      <button class="icon-btn sm" aria-label="菜单" @click="phase === 'playing' || phase === 'countdown' ? pause() : leave('/')">
        <ArrowLeft :size="18" />
      </button>
      <div class="brand">
        <span class="pixel logo">NECK SNAKE</span>
        <span class="mode">{{ MODES[mode].name }}</span>
      </div>
      <button
        class="icon-btn sm"
        aria-label="设置"
        @click="
          () => {
            pause()
            if (phase === 'paused') showPauseSettings = true
          }
        "
      >
        <SettingsIcon :size="18" />
      </button>
    </header>

    <section class="hud">
      <ScorePanel
        :score="hud.score"
        :best="appData.statistics.bestScore"
        :length="hud.length"
        :speed-level="hud.speedLevel"
        :time="hud.time"
        :countdown="hud.countdown"
        :level="hud.level"
        :compact="landscape"
      />
      <div v-if="showSmallPreview && !previewExpanded" class="mini-preview">
        <CameraPreview
          :stream="tracker.stream"
          :mirrored="tracker.mirrored"
          :box="tracker.frame.box"
          :status="headStatus"
          :direction="headPointing"
          @toggle="previewExpanded = true"
        />
      </div>
    </section>

    <section v-if="showSmallPreview && previewExpanded" class="big-preview">
      <CameraPreview
        :stream="tracker.stream"
        :mirrored="tracker.mirrored"
        :box="tracker.frame.box"
        :status="headStatus"
        :direction="headPointing"
        expanded
        :can-switch="tracker.devices.length > 1"
        @toggle="previewExpanded = false"
        @switch-camera="switchCamera"
      />
    </section>

    <main class="board-area">
      <GameCanvas
        ref="canvasRef"
        :cols="grid.cols"
        :rows="grid.rows"
        :theme-id="appData.selectedTheme"
        :skin-id="appData.selectedSkin"
        :food-skin-id="appData.selectedFoodSkin"
        :show-grid="settings.showGrid"
        @swipe="manualDirection"
        @tap="phase === 'paused' && !reminder ? resume() : undefined"
      >
        <Transition name="pop">
          <div v-if="phase === 'countdown'" :key="countdown" class="countdown pixel">{{ countdown || 'GO' }}</div>
        </Transition>
        <Transition name="fade">
          <div v-if="levelBanner" class="level-banner pixel">{{ levelBanner }}</div>
        </Transition>
        <Transition name="fade">
          <div v-if="lostHint" class="banner warn">{{ lostHint }}</div>
          <div v-else-if="restBanner" class="banner rest" @click="restBanner = ''"><Coffee :size="16" /> {{ restBanner }}</div>
        </Transition>
        <div v-if="settings.showFps" class="fps">
          FPS {{ fps }}<template v-if="activeControl === 'head'"> · 识别 {{ tracker.detectFps }} · L{{ tracker.perfLevel }}</template>
        </div>
      </GameCanvas>
    </main>

    <footer class="controls" :class="{ 'with-joy': activeControl === 'touch' }">
      <ControlPanel
        :control="activeControl"
        :head-status="headStatus"
        :action="hud.direction"
        :paused="phase === 'paused'"
        :effects="hud.effects"
        @pause="togglePause"
        @switch-control="switchControl"
      />
      <VirtualJoystick v-if="activeControl === 'touch'" :current="hud.direction" :size="landscape ? 140 : 132" @dir="manualDirection" />
    </footer>

    <Transition name="fade">
      <div v-if="phase === 'setup' || phase === 'calibrating'" class="fullscreen">
        <CameraSetup
          v-if="phase === 'setup'"
          @start="startCamera"
          @use-touch="useTouch"
          @back="leave('/modes')"
        />
        <CalibrationView v-else @done="onCalibrated" @use-touch="useTouch" />
      </div>
    </Transition>

    <BaseModal :show="phase === 'paused' && !reminder" :wide="showPauseSettings">
      <div v-if="showPauseSettings" class="pause-settings">
        <div class="ps-head">
          <button class="icon-btn sm" aria-label="返回" @click="showPauseSettings = false"><ArrowLeft :size="18" /></button>
          <h3>游戏设置</h3>
        </div>
        <SettingsPanel in-game @recalibrate="recalibrate" />
      </div>
      <div v-else class="pause-menu">
        <div class="title pixel">PAUSED</div>
        <p v-if="pauseReason" class="reason">{{ pauseReason }}</p>
        <button class="btn btn-primary btn-block" @click="resume"><Play :size="18" fill="currentColor" /> 继续游戏</button>
        <button class="btn btn-block" @click="restart"><RotateCcw :size="18" /> 重新开始</button>
        <button v-if="activeControl === 'head'" class="btn btn-block" @click="recalibrate"><Crosshair :size="18" /> 重新校准</button>
        <button class="btn btn-block" @click="switchControl">
          <template v-if="activeControl === 'head'"><Hand :size="18" /> 切换为触屏控制</template>
          <template v-else><ScanFace :size="18" /> 切换为头部控制</template>
        </button>
        <button class="btn btn-block" @click="showPauseSettings = true"><SettingsIcon :size="18" /> 游戏设置</button>
        <button class="btn btn-ghost btn-block" @click="leave('/')"><Home :size="18" /> 返回首页</button>
      </div>
    </BaseModal>

    <BaseModal :show="!!reminder">
      <div v-if="reminder" class="reminder">
        <Coffee :size="40" class="accent" />
        <h3>{{ reminder.title }}</h3>
        <p>{{ reminder.message }}</p>
        <button class="btn btn-primary btn-block" @click="quitToRest">结束本局，休息一下</button>
        <button class="btn btn-block" @click="resume">继续游戏</button>
        <button class="btn btn-ghost btn-sm" @click="disableReminders">关闭休息提醒</button>
      </div>
    </BaseModal>

    <GameOverModal
      :show="phase === 'over'"
      :result="result"
      :best="appData.statistics.bestScore"
      @restart="restart"
      @modes="leave('/modes')"
      @home="leave('/')"
    />
  </div>
</template>

<style scoped>
.game {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto 1fr auto;
  grid-template-areas: 'bar' 'hud' 'preview' 'board' 'controls';
  gap: 8px;
  padding: calc(var(--safe-top) + 6px) calc(var(--safe-right) + 12px) calc(var(--safe-bottom) + 10px)
    calc(var(--safe-left) + 12px);
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
}
.bar {
  grid-area: bar;
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-btn.sm {
  width: 38px;
  height: 38px;
}
.brand {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.logo {
  color: var(--snake);
  font-size: 17px;
  white-space: nowrap;
}
.mode {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}
.hud {
  grid-area: hud;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.mini-preview {
  width: 108px;
  flex-shrink: 0;
}
.big-preview {
  grid-area: preview;
  width: min(100%, 300px);
  justify-self: center;
}
.board-area {
  grid-area: board;
  min-height: 0;
  min-width: 0;
}
.controls {
  grid-area: controls;
  display: flex;
  align-items: center;
  gap: 12px;
}
.controls > :first-child {
  flex: 1;
  min-width: 0;
}
.controls.with-joy :deep(.control-panel) {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.landscape {
  grid-template-columns: 1fr minmax(230px, 300px);
  grid-template-rows: auto auto auto 1fr;
  grid-template-areas:
    'board bar'
    'board hud'
    'board preview'
    'board controls';
  max-width: none;
}
.landscape .controls {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
}
.landscape .controls > :first-child {
  flex: 0 0 auto;
}
.landscape .controls :deep(.joystick) {
  align-self: center;
}
.landscape .big-preview {
  width: 100%;
}
.landscape .mini-preview {
  width: 96px;
}
.countdown {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 88px;
  color: var(--gold);
  text-shadow: 4px 4px 0 #8a6408, 0 0 30px rgba(255, 212, 71, 0.6);
  pointer-events: none;
}
.level-banner {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 12px;
  background: rgba(16, 24, 39, 0.85);
  color: var(--accent);
  font-size: 26px;
  pointer-events: none;
}
.banner {
  position: absolute;
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
  width: max-content;
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 24, 39, 0.9);
}
.banner.warn {
  border: 1px solid rgba(255, 212, 71, 0.5);
  color: var(--gold);
  pointer-events: none;
}
.banner.rest {
  border: 1px solid rgba(32, 217, 176, 0.5);
  color: #bff5e8;
}
.fps {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  font-size: 11px;
  font-family: var(--pixel-font);
  pointer-events: none;
}
.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: var(--bg);
  overflow-y: auto;
  display: flex;
  padding: calc(var(--safe-top) + 16px) calc(var(--safe-right) + 16px) calc(var(--safe-bottom) + 16px)
    calc(var(--safe-left) + 16px);
}
.pause-menu,
.reminder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.pause-menu .title {
  font-size: 30px;
  color: var(--accent);
  margin-bottom: 6px;
}
.reason {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--gold);
  line-height: 1.5;
}
.reminder h3 {
  margin: 0;
}
.reminder p {
  margin: 0 0 8px;
  line-height: 1.6;
  color: #cfd8e8;
}
.accent {
  color: var(--accent);
}
.pause-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ps-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ps-head h3 {
  margin: 0;
}
</style>
