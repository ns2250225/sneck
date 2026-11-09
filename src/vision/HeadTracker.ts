import { markRaw, reactive } from 'vue'
import { CameraManager, classifyCameraError, type CameraDevice, type CameraErrorKind } from './CameraManager'
import { detectFaces, loadFaceDetector } from './FaceDetector'
import { estimateHeadPose, type FaceBox, type HeadPose } from './HeadPoseEstimator'
import { PoseFilter } from './MotionFilter'
import type { CalibrationBaseline } from '@/systems/StorageManager'
import { RollingAverage } from '@/utils/performance'

export type TrackerPhase = 'idle' | 'starting' | 'running' | 'error'

export interface TrackerFrame {
  time: number
  faces: number
  confidence: number
  box: FaceBox | null
  /** Smoothed absolute pose. */
  abs: HeadPose | null
  /** Smoothed pose relative to the calibration baseline, with axis inversion applied. */
  rel: HeadPose | null
}

const PERF_LEVELS = [
  { width: 480, fps: 30 },
  { width: 384, fps: 24 },
  { width: 320, fps: 18 },
  { width: 256, fps: 12 },
] as const

class HeadTrackerImpl {
  private camera: CameraManager | null = null
  private filter = new PoseFilter()
  private canvas = document.createElement('canvas')
  private ctx = this.canvas.getContext('2d', { willReadFrequently: false })
  private rafId: number | null = null
  private lastDetectAt = 0
  private lastVideoTime = -1
  private detectCost = new RollingAverage(20)
  private fpsFrames = 0
  private fpsWindowStart = 0
  private lastPerfChange = 0
  private listeners = new Set<(f: TrackerFrame) => void>()
  private suspended = false

  baseline: CalibrationBaseline | null = null
  invertYaw = false
  invertPitch = false

  state = reactive({
    phase: 'idle' as TrackerPhase,
    modelReady: false,
    cameraReady: false,
    modelLoading: false,
    errorKind: null as CameraErrorKind | 'model' | null,
    errorText: '',
    stream: null as MediaStream | null,
    mirrored: true,
    devices: [] as CameraDevice[],
    activeDeviceId: '',
    detectFps: 0,
    perfLevel: 0,
    frame: {
      time: 0,
      faces: 0,
      confidence: 0,
      box: null,
      abs: null,
      rel: null,
    } as TrackerFrame,
  })

  set smoothing(on: boolean) {
    this.filter.enabled = on
  }

  get isRunning() {
    return this.state.phase === 'running'
  }

  onFrame(cb: (f: TrackerFrame) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Loads the model and opens the camera. Safe to call repeatedly. */
  async start(deviceId?: string): Promise<boolean> {
    if (this.state.phase === 'running' && (!deviceId || deviceId === this.state.activeDeviceId)) return true
    this.state.phase = 'starting'
    this.state.errorKind = null
    this.state.errorText = ''
    this.suspended = false
    if (!this.camera) this.camera = new CameraManager()

    const modelTask = (async () => {
      this.state.modelLoading = true
      try {
        await loadFaceDetector()
        this.state.modelReady = true
      } finally {
        this.state.modelLoading = false
      }
    })()
    modelTask.catch(() => {})

    try {
      const stream = await this.camera.start(deviceId || undefined)
      this.state.stream = markRaw(stream)
      this.state.cameraReady = true
      this.state.activeDeviceId = this.camera.activeDeviceId
      const facing = stream.getVideoTracks()[0]?.getSettings().facingMode
      this.state.mirrored = facing !== 'environment'
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (this.state.phase === 'running' && !this.suspended) {
          this.fail('inUse', '摄像头连接已断开，请检查设备后重试。')
        }
      })
      void this.refreshDevices()
    } catch (err) {
      const e = classifyCameraError(err)
      this.fail(e.kind, e.message)
      return false
    }

    try {
      await modelTask
    } catch {
      this.camera.stop()
      this.state.stream = null
      this.state.cameraReady = false
      this.fail('model', '头部识别模型加载失败，请检查网络后重试，或使用触屏模式。')
      return false
    }

    if (this.suspended) return false
    this.state.phase = 'running'
    this.filter.reset()
    this.detectCost.clear()
    this.lastVideoTime = -1
    this.fpsWindowStart = performance.now()
    this.fpsFrames = 0
    this.loop()
    return true
  }

  private fail(kind: CameraErrorKind | 'model', text: string) {
    this.stopLoop()
    this.state.phase = 'error'
    this.state.errorKind = kind
    this.state.errorText = text
  }

  async refreshDevices() {
    try {
      this.state.devices = await CameraManager.listDevices()
    } catch {
      this.state.devices = []
    }
  }

  async switchDevice(deviceId: string) {
    this.stop()
    return this.start(deviceId)
  }

  /** Releases the camera and stops inference. */
  stop() {
    this.suspended = true
    this.stopLoop()
    this.camera?.stop()
    this.state.stream = null
    this.state.cameraReady = false
    this.state.phase = 'idle'
    this.state.detectFps = 0
    this.state.frame = { time: 0, faces: 0, confidence: 0, box: null, abs: null, rel: null }
  }

  private stopLoop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  resetFilter() {
    this.filter.reset()
  }

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop)
    const now = performance.now()
    const level = PERF_LEVELS[this.state.perfLevel]
    if (now - this.lastDetectAt < 1000 / level.fps - 2) return
    const video = this.camera?.video
    if (!video || video.readyState < 2 || video.videoWidth === 0) return
    if (video.currentTime === this.lastVideoTime) return
    this.lastVideoTime = video.currentTime
    this.lastDetectAt = now
    this.process(video, now, level.width)
  }

  private process(video: HTMLVideoElement, now: number, width: number) {
    const vw = video.videoWidth
    const vh = video.videoHeight
    const w = Math.min(width, vw)
    const h = Math.round((w * vh) / vw)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    if (!this.ctx) return
    this.ctx.drawImage(video, 0, 0, w, h)

    const t0 = performance.now()
    let result
    try {
      result = detectFaces(this.canvas, now)
    } catch (err) {
      console.warn('[HeadTracker] detect failed', err)
      return
    }
    const cost = performance.now() - t0
    this.adaptPerformance(cost, now)

    const faces = result?.faceLandmarks?.length ?? 0
    let frame: TrackerFrame = { time: now, faces, confidence: 0, box: null, abs: null, rel: null }
    if (faces >= 1 && result) {
      const est = estimateHeadPose(result.faceLandmarks[0], vw, vh)
      if (est) {
        const abs = this.filter.filter(est.pose, now)
        frame = { ...frame, confidence: est.confidence, box: est.box, abs, rel: this.relative(abs) }
      }
    } else {
      this.filter.reset()
    }

    this.state.frame = frame
    this.fpsFrames++
    if (now - this.fpsWindowStart >= 1000) {
      this.state.detectFps = Math.round((this.fpsFrames * 1000) / (now - this.fpsWindowStart))
      this.fpsFrames = 0
      this.fpsWindowStart = now
    }
    for (const cb of this.listeners) cb(frame)
  }

  relative(abs: HeadPose): HeadPose {
    const b = this.baseline ?? { yaw: 0, pitch: 0, roll: 0 }
    const yaw = (abs.yaw - b.yaw) * (this.invertYaw ? -1 : 1)
    const pitch = (abs.pitch - b.pitch) * (this.invertPitch ? -1 : 1)
    return { yaw, pitch, roll: abs.roll - b.roll }
  }

  /** Lowers inference resolution / rate on slow devices, raises it again when there is headroom. */
  private adaptPerformance(cost: number, now: number) {
    const avg = this.detectCost.push(cost)
    if (this.detectCost.count < 10 || now - this.lastPerfChange < 2500) return
    const level = this.state.perfLevel
    const budget = 1000 / PERF_LEVELS[level].fps
    if ((avg > budget * 0.75 || avg > 45) && level < PERF_LEVELS.length - 1) {
      this.state.perfLevel = level + 1
      this.lastPerfChange = now
      this.detectCost.clear()
    } else if (avg < 14 && level > 0 && now - this.lastPerfChange > 8000) {
      this.state.perfLevel = level - 1
      this.lastPerfChange = now
      this.detectCost.clear()
    }
  }
}

export const HeadTracker = new HeadTrackerImpl()
