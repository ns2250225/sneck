export type SoundName =
  | 'eat'
  | 'bonus'
  | 'special'
  | 'turn'
  | 'gameover'
  | 'achievement'
  | 'levelup'
  | 'click'
  | 'countdown'
  | 'go'
  | 'warn'

type Note = [freq: number, start: number, dur: number, type?: OscillatorType, vol?: number]

const SOUNDS: Record<SoundName, Note[]> = {
  eat: [
    [660, 0, 0.07, 'square', 0.18],
    [990, 0.06, 0.08, 'square', 0.15],
  ],
  bonus: [
    [784, 0, 0.08, 'square', 0.16],
    [988, 0.07, 0.08, 'square', 0.16],
    [1319, 0.14, 0.14, 'square', 0.16],
  ],
  special: [
    [523, 0, 0.09, 'triangle', 0.25],
    [659, 0.08, 0.09, 'triangle', 0.25],
    [784, 0.16, 0.09, 'triangle', 0.25],
    [1047, 0.24, 0.2, 'triangle', 0.25],
  ],
  turn: [[440, 0, 0.03, 'sine', 0.08]],
  gameover: [
    [392, 0, 0.18, 'sawtooth', 0.14],
    [330, 0.17, 0.18, 'sawtooth', 0.14],
    [262, 0.34, 0.4, 'sawtooth', 0.14],
  ],
  achievement: [
    [659, 0, 0.1, 'square', 0.15],
    [784, 0.1, 0.1, 'square', 0.15],
    [1047, 0.2, 0.1, 'square', 0.15],
    [1319, 0.3, 0.3, 'triangle', 0.2],
  ],
  levelup: [
    [440, 0, 0.1, 'square', 0.15],
    [554, 0.1, 0.1, 'square', 0.15],
    [659, 0.2, 0.2, 'square', 0.15],
  ],
  click: [[880, 0, 0.03, 'square', 0.08]],
  countdown: [[523, 0, 0.12, 'square', 0.15]],
  go: [[1047, 0, 0.25, 'square', 0.18]],
  warn: [
    [330, 0, 0.12, 'triangle', 0.15],
    [330, 0.18, 0.12, 'triangle', 0.15],
  ],
}

const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587]
const BASS = [131, 131, 147, 147, 131, 131, 165, 147]

class AudioManagerImpl {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  soundEnabled = true
  musicEnabled = false
  private musicTimer: number | null = null
  private nextNoteTime = 0
  private step = 0

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.6
    this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0.25
    this.musicGain.connect(this.master)
    return this.ctx
  }

  /** Must be called from a user gesture (required by iOS Safari). */
  unlock() {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  play(name: SoundName) {
    if (!this.soundEnabled) return
    const ctx = this.ensure()
    if (!ctx || !this.master || ctx.state !== 'running') return
    const t0 = ctx.currentTime
    for (const [freq, start, dur, type = 'square', vol = 0.15] of SOUNDS[name]) {
      this.tone(freq, t0 + start, dur, type, vol, this.master)
    }
  }

  private tone(freq: number, when: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, when)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  setSound(on: boolean) {
    this.soundEnabled = on
  }

  setMusic(on: boolean) {
    this.musicEnabled = on
    if (!on) this.stopMusic()
  }

  startMusic() {
    if (!this.musicEnabled || this.musicTimer !== null) return
    const ctx = this.ensure()
    if (!ctx) return
    this.nextNoteTime = ctx.currentTime + 0.1
    this.step = 0
    this.musicTimer = window.setInterval(() => this.schedule(), 50)
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx || !this.musicGain || ctx.state !== 'running') return
    const beat = 0.2
    while (this.nextNoteTime < ctx.currentTime + 0.3) {
      const i = this.step
      this.tone(MELODY[i % MELODY.length], this.nextNoteTime, beat * 0.9, 'triangle', 0.12, this.musicGain)
      if (i % 2 === 0) this.tone(BASS[(i / 2) % BASS.length], this.nextNoteTime, beat * 1.8, 'sine', 0.2, this.musicGain)
      this.nextNoteTime += beat
      this.step++
    }
  }
}

export const AudioManager = new AudioManagerImpl()
