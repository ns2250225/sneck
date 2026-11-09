import type { HeadPose } from './HeadPoseEstimator'

class LowPass {
  private y: number | null = null
  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y
    return this.y
  }
  get last() {
    return this.y
  }
  reset() {
    this.y = null
  }
}

/** One Euro Filter: low jitter when still, low lag when moving. */
export class OneEuroFilter {
  private x = new LowPass()
  private dx = new LowPass()
  private lastTime: number | null = null

  constructor(
    private minCutoff = 1.0,
    private beta = 0.02,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  filter(value: number, timeMs: number): number {
    const dt = this.lastTime === null ? 1 / 30 : Math.max(1e-3, (timeMs - this.lastTime) / 1000)
    this.lastTime = timeMs
    const prev = this.x.last
    const deriv = prev === null ? 0 : (value - prev) / dt
    const edx = this.dx.filter(deriv, this.alpha(this.dCutoff, dt))
    const cutoff = this.minCutoff + this.beta * Math.abs(edx)
    return this.x.filter(value, this.alpha(cutoff, dt))
  }

  reset() {
    this.x.reset()
    this.dx.reset()
    this.lastTime = null
  }
}

export class EmaFilter {
  private y: number | null = null
  constructor(private alpha = 0.5) {}
  filter(value: number): number {
    this.y = this.y === null ? value : this.alpha * value + (1 - this.alpha) * this.y
    return this.y
  }
  reset() {
    this.y = null
  }
}

export class PoseFilter {
  enabled = true
  private yaw = new OneEuroFilter(1.2, 0.03)
  private pitch = new OneEuroFilter(1.2, 0.03)
  private roll = new OneEuroFilter(1.0, 0.02)
  /** Very light EMA applied even when smoothing is off to remove single-frame spikes. */
  private rawYaw = new EmaFilter(0.85)
  private rawPitch = new EmaFilter(0.85)

  filter(p: HeadPose, timeMs: number): HeadPose {
    if (!this.enabled) {
      return { yaw: this.rawYaw.filter(p.yaw), pitch: this.rawPitch.filter(p.pitch), roll: p.roll }
    }
    return {
      yaw: this.yaw.filter(p.yaw, timeMs),
      pitch: this.pitch.filter(p.pitch, timeMs),
      roll: this.roll.filter(p.roll, timeMs),
    }
  }

  reset() {
    this.yaw.reset()
    this.pitch.reset()
    this.roll.reset()
    this.rawYaw.reset()
    this.rawPitch.reset()
  }
}
