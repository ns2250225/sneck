export class FpsMeter {
  private frames = 0
  private last = performance.now()
  fps = 0

  tick(now = performance.now()): number {
    this.frames++
    const elapsed = now - this.last
    if (elapsed >= 500) {
      this.fps = Math.round((this.frames * 1000) / elapsed)
      this.frames = 0
      this.last = now
    }
    return this.fps
  }

  reset() {
    this.frames = 0
    this.last = performance.now()
    this.fps = 0
  }
}

export class RollingAverage {
  private values: number[] = []
  constructor(private size = 30) {}

  push(v: number): number {
    this.values.push(v)
    if (this.values.length > this.size) this.values.shift()
    return this.value
  }

  get value(): number {
    if (!this.values.length) return 0
    return this.values.reduce((a, b) => a + b, 0) / this.values.length
  }

  get count(): number {
    return this.values.length
  }

  clear() {
    this.values = []
  }
}
