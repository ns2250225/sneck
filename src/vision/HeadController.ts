import type { Direction } from '@/core/types'
import type { Sensitivity } from '@/systems/StorageManager'

export type HeadStatus = 'ok' | 'noFace' | 'multiFace' | 'lowConfidence' | 'tooFar' | 'paused'

export const HEAD_STATUS_TEXT: Record<HeadStatus, string> = {
  ok: '正常',
  noFace: '未检测到人脸',
  multiFace: '检测到多张人脸',
  lowConfidence: '识别不稳定',
  tooFar: '动作幅度过大',
  paused: '已暂停',
}

export const HEAD_STATUS_HINT: Record<HeadStatus, string> = {
  ok: '',
  noFace: '请正对摄像头，调整位置让脸部出现在画面中',
  multiFace: '请保持画面中只有一个人',
  lowConfidence: '请靠近一些或改善光线，让脸部完整出现在画面中',
  tooFar: '动作幅度有点大，回到自然姿势吧，小幅转动即可',
  paused: '',
}

export const THRESHOLDS: Record<Sensitivity, { yaw: number; pitch: number }> = {
  low: { yaw: 20, pitch: 16 },
  medium: { yaw: 15, pitch: 12 },
  high: { yaw: 10, pitch: 8 },
}

/** Beyond these relative angles the controller stops issuing commands and asks for a natural posture. */
const MAX_YAW = 42
const MAX_PITCH = 34
const NEUTRAL_RATIO = 0.5
const SWITCH_COOLDOWN_MS = 180
const REPEAT_COOLDOWN_MS = 450
/** Confidence hysteresis: drop below LOW to lose tracking, rise above HIGH to regain it. */
const CONFIDENCE_LOW = 0.4
const CONFIDENCE_HIGH = 0.5

export interface HeadInput {
  faces: number
  confidence: number
  /** Pose relative to the calibrated baseline. */
  yaw: number
  pitch: number
}

export interface HeadControlState {
  status: HeadStatus
  /** Direction the head currently points to (beyond threshold), regardless of whether it was sent. */
  pointing: Direction | null
  /** Normalized strength along each axis (1 = threshold). */
  yawRatio: number
  pitchRatio: number
}

/**
 * Converts relative head pose into discrete direction commands with hysteresis,
 * neutral-zone reset, cooldowns and reverse-direction protection.
 */
export class HeadController {
  sensitivity: Sensitivity = 'medium'
  enabled = true
  onCommand: ((dir: Direction) => void) | null = null
  /** Returns true when the direction would reverse the snake (and must be ignored). */
  isReverse: ((dir: Direction) => boolean) | null = null

  private latched: Direction | null = null
  private lastCommandAt = -Infinity
  private lastCommandDir: Direction | null = null

  state: HeadControlState = { status: 'noFace', pointing: null, yawRatio: 0, pitchRatio: 0 }

  reset() {
    this.latched = null
    this.lastCommandDir = null
    this.lastCommandAt = -Infinity
  }

  classify(yaw: number, pitch: number): { dir: Direction | null; yawRatio: number; pitchRatio: number; strength: number } {
    const th = THRESHOLDS[this.sensitivity]
    const yawRatio = yaw / th.yaw
    const pitchRatio = pitch / th.pitch
    const horizontal = Math.abs(yawRatio) >= Math.abs(pitchRatio)
    const strength = Math.max(Math.abs(yawRatio), Math.abs(pitchRatio))
    let dir: Direction | null = null
    if (strength >= 1) {
      dir = horizontal ? (yawRatio < 0 ? 'left' : 'right') : pitchRatio > 0 ? 'up' : 'down'
    }
    return { dir, yawRatio, pitchRatio, strength }
  }

  update(input: HeadInput | null, now: number): HeadControlState {
    if (!this.enabled) {
      this.state = { ...this.state, status: 'paused', pointing: null }
      return this.state
    }
    if (!input || input.faces === 0) return this.setIdle('noFace')
    if (input.faces > 1) return this.setIdle('multiFace')
    const wasTracking = this.state.status === 'ok' || this.state.status === 'tooFar'
    if (input.confidence < (wasTracking ? CONFIDENCE_LOW : CONFIDENCE_HIGH)) return this.setIdle('lowConfidence')

    const { dir, yawRatio, pitchRatio, strength } = this.classify(input.yaw, input.pitch)

    if (Math.abs(input.yaw) > MAX_YAW || Math.abs(input.pitch) > MAX_PITCH) {
      this.latched = null
      this.state = { status: 'tooFar', pointing: null, yawRatio, pitchRatio }
      return this.state
    }

    if (strength < NEUTRAL_RATIO) {
      this.latched = null
    } else if (dir && dir !== this.latched) {
      const sinceLast = now - this.lastCommandAt
      const cooldown = dir === this.lastCommandDir ? REPEAT_COOLDOWN_MS : SWITCH_COOLDOWN_MS
      if (sinceLast >= cooldown) {
        this.latched = dir
        if (!this.isReverse?.(dir)) {
          this.lastCommandAt = now
          this.lastCommandDir = dir
          this.onCommand?.(dir)
        }
      }
    }

    this.state = { status: 'ok', pointing: dir, yawRatio, pitchRatio }
    return this.state
  }

  private setIdle(status: HeadStatus): HeadControlState {
    this.latched = null
    this.state = { status, pointing: null, yawRatio: 0, pitchRatio: 0 }
    return this.state
  }
}
