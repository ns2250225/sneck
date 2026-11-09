import type { Direction } from '@/core/types'
import type { CalibrationBaseline } from '@/systems/StorageManager'
import type { HeadPose } from './HeadPoseEstimator'

const HOLD_MS = 2000
const STILL_TOLERANCE = 6

/** Collects a steady neutral pose for ~2 seconds and produces a baseline. */
export class NeutralCalibration {
  private samples: HeadPose[] = []
  private startedAt: number | null = null
  baseline: CalibrationBaseline | null = null

  get done() {
    return this.baseline !== null
  }

  reset() {
    this.samples = []
    this.startedAt = null
    this.baseline = null
  }

  /** Returns progress 0..1. Movement or losing the face restarts the hold. */
  update(pose: HeadPose | null, now: number): number {
    if (this.baseline) return 1
    if (!pose) {
      this.samples = []
      this.startedAt = null
      return 0
    }
    if (this.samples.length) {
      const mean = average(this.samples)
      if (Math.abs(pose.yaw - mean.yaw) > STILL_TOLERANCE || Math.abs(pose.pitch - mean.pitch) > STILL_TOLERANCE) {
        this.samples = []
        this.startedAt = null
      }
    }
    if (this.startedAt === null) this.startedAt = now
    this.samples.push(pose)
    const progress = Math.min(1, (now - this.startedAt) / HOLD_MS)
    if (progress >= 1 && this.samples.length >= 5) this.baseline = median(this.samples)
    return progress
  }
}

/** Tracks which of the four directions the player has demonstrated after neutral calibration. */
export class DirectionTest {
  passed: Record<Direction, boolean> = { up: false, down: false, left: false, right: false }

  mark(dir: Direction | null) {
    if (dir) this.passed[dir] = true
  }

  get done() {
    return Object.values(this.passed).every(Boolean)
  }

  reset() {
    this.passed = { up: false, down: false, left: false, right: false }
  }
}

function average(arr: HeadPose[]): HeadPose {
  const s = arr.reduce((a, p) => ({ yaw: a.yaw + p.yaw, pitch: a.pitch + p.pitch, roll: a.roll + p.roll }), {
    yaw: 0,
    pitch: 0,
    roll: 0,
  })
  return { yaw: s.yaw / arr.length, pitch: s.pitch / arr.length, roll: s.roll / arr.length }
}

function median(arr: HeadPose[]): CalibrationBaseline {
  const m = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }
  return { yaw: m(arr.map((p) => p.yaw)), pitch: m(arr.map((p) => p.pitch)), roll: m(arr.map((p) => p.roll)) }
}
