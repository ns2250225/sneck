import type { GameEngine } from './GameEngine'
import type { Direction, FoodType } from './types'
import type { FoodSkinId, MapTheme, SnakeSkin } from '@/systems/SkinManager'

type Sprite = string[]

const PALETTE: Record<string, string> = {
  r: '#FF684A',
  R: '#D9412A',
  w: '#FFFFFF',
  W: '#FFE3D9',
  g: '#6B3A1E',
  l: '#45E66B',
  L: '#2FB84F',
  y: '#FFE066',
  Y: '#FFD447',
  o: '#E8A33A',
  b: '#4AA8FF',
  B: '#1E6FD9',
  c: '#B8F5FF',
  p: '#B05CFF',
  P: '#7A2FD1',
  k: '#1A1A1A',
  m: '#FF5FA2',
  n: '#FFB3D1',
}

const SPRITES: Record<string, Sprite> = {
  apple: ['...g....', '...gl...', '.rrgrrr.', 'rrWrrrrr', 'rWrrrrrr', 'rrrrrrrR', '.rrrrrR.', '..rRRR..'],
  banana: ['......g.', '.....yy.', '....yyo.', '...yyyo.', '..yyyyo.', 'yyyyyo..', 'oyyyo...', '.ooo....'],
  cherry: ['.....ll.', '....gl..', '...g.g..', '..g...g.', '.rr..rr.', 'rWrrrWrr', 'rrrRrrrR', '.rR..rR.'],
  watermelon: ['........', 'rrrrrrrr', 'rkrrrkrr', 'rrrkrrrk', '.rrrrrr.', '.WWWWWW.', '..LLLL..', '........'],
  grape: ['...gl...', '...g.ll.', '.pp.pp..', 'pwppPpp.', '.pppppP.', '..ppPp..', '..pPp...', '...p....'],
  candy: ['........', 'm......m', 'mm.nn.mm', 'mnnwnnnm', 'mnnnnnnm', 'mm.nn.mm', 'm......m', '........'],
  star: ['...YY...', '...YY...', 'YYYwYYYY', '.YYYYYY.', '..YYYY..', '.YYoYYY.', 'YYo..oYY', 'Y......Y'],
  energy: ['..bbbb..', '.bwcbbb.', 'bwcbbbbb', 'bcbbbbbb', 'bbbbbbBb', 'bbbbbbBb', '.bbbBBB.', '..bBBB..'],
  lightning: ['....YYY.', '...YYY..', '..YYY...', '.YYYYYY.', '...YYY..', '..YYY...', '.YY.....', 'Y.......'],
  special: ['...gl...', '..pppp..', '.pwpppp.', 'pwppppPp', 'ppppppPp', 'pppppPPp', '.ppPPPp.', '..pppp..'],
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

interface FloatText {
  x: number
  y: number
  text: string
  color: string
  life: number
}

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private cell = 0
  private cols = 20
  private rows = 20
  private dpr = 1
  private bgCache: HTMLCanvasElement | null = null
  private bgKey = ''
  private spriteCache = new Map<string, HTMLCanvasElement>()
  private particles: Particle[] = []
  private texts: FloatText[] = []
  private flash: { dir: Direction; life: number } | null = null
  private lastFrame = performance.now()
  private shake = 0
  private lastEngine: GameEngine | null = null

  theme!: MapTheme
  skin!: SnakeSkin
  foodSkin: FoodSkinId = 'apple'
  showGrid = true

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  get cellSize() {
    return this.cell
  }

  /** Fits the board inside the given CSS box, keeping square cells. */
  resize(maxW: number, maxH: number, cols: number, rows: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cell = Math.max(6, Math.floor(Math.min(maxW / cols, maxH / rows)))
    // Assigning canvas.width clears the bitmap, so skip layout jitter that doesn't change the board size.
    if (cell === this.cell && cols === this.cols && rows === this.rows && dpr === this.dpr && this.canvas.width > 0) return
    this.cols = cols
    this.rows = rows
    this.dpr = dpr
    this.cell = cell
    const w = this.cell * cols
    const h = this.cell * rows
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.ctx.imageSmoothingEnabled = false
    this.bgKey = ''
    this.spriteCache.clear()
    // Redraw right away so the cleared canvas is never presented as a blank frame.
    if (this.lastEngine) this.render(this.lastEngine, performance.now())
  }

  burst(gx: number, gy: number, color: string, count = 14) {
    const cx = (gx + 0.5) * this.cell
    const cy = (gy + 0.5) * this.cell
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = (0.04 + Math.random() * 0.12) * this.cell
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 400 + Math.random() * 300,
        color,
        size: Math.max(2, this.cell * (0.15 + Math.random() * 0.15)),
      })
    }
    if (this.particles.length > 300) this.particles.splice(0, this.particles.length - 300)
  }

  floatText(gx: number, gy: number, text: string, color = '#FFFFFF') {
    this.texts.push({ x: (gx + 0.5) * this.cell, y: gy * this.cell, text, color, life: 0 })
  }

  flashDirection(dir: Direction) {
    this.flash = { dir, life: 0 }
  }

  shakeScreen(amount = 6) {
    this.shake = amount
  }

  render(engine: GameEngine, now: number) {
    this.lastEngine = engine
    const dt = Math.min(64, now - this.lastFrame)
    this.lastFrame = now
    const ctx = this.ctx
    const W = this.cell * this.cols
    const H = this.cell * this.rows

    ctx.save()
    if (this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake)
      this.shake *= 0.86
    } else {
      this.shake = 0
    }

    ctx.drawImage(this.background(), 0, 0, W, H)
    this.drawBorder(engine.map.wrap, W, H, now)
    this.drawObstacles(engine)
    this.drawFoods(engine, now)
    this.drawSnake(engine, now)
    this.updateParticles(dt)
    this.drawFlash(dt, engine)
    ctx.restore()
  }

  private background(): HTMLCanvasElement {
    const key = `${this.theme.id}|${this.cell}|${this.cols}|${this.rows}|${this.showGrid}|${this.dpr}`
    if (this.bgCache && key === this.bgKey) return this.bgCache
    const c = this.bgCache ?? document.createElement('canvas')
    const W = this.cell * this.cols
    const H = this.cell * this.rows
    c.width = Math.round(W * this.dpr)
    c.height = Math.round(H * this.dpr)
    const g = c.getContext('2d')!
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const t = this.theme
    const cs = this.cell

    g.fillStyle = t.bg
    g.fillRect(0, 0, W, H)
    g.fillStyle = t.bg2
    for (let y = 0; y < this.rows; y++) {
      for (let x = (y % 2); x < this.cols; x += 2) g.fillRect(x * cs, y * cs, cs, cs)
    }

    const rand = seeded(this.cols * 31 + this.rows * 17 + t.id.length * 101)
    const count = Math.floor((this.cols * this.rows) / 12)
    const px = Math.max(1, Math.floor(cs / 8))
    for (let i = 0; i < count; i++) {
      const x = rand() * W
      const y = rand() * H
      switch (t.deco) {
        case 'grass':
          g.fillStyle = 'rgba(69,230,107,0.10)'
          g.fillRect(x, y, px, px * 3)
          g.fillRect(x + px * 2, y + px, px, px * 2)
          break
        case 'stars': {
          g.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.5})`
          const s = rand() < 0.15 ? px * 2 : px
          g.fillRect(x, y, s, s)
          break
        }
        case 'forest':
          if (i % 4 === 0) {
            g.fillStyle = 'rgba(69,180,90,0.10)'
            g.fillRect(x, y, px * 4, px * 3)
            g.fillRect(x + px, y - px * 2, px * 2, px * 2)
            g.fillStyle = 'rgba(120,80,40,0.12)'
            g.fillRect(x + px * 1.5, y + px * 3, px, px * 2)
          }
          break
        case 'snow':
          g.fillStyle = 'rgba(255,255,255,0.18)'
          g.fillRect(x, y, px, px)
          if (i % 5 === 0) {
            g.fillRect(x - px, y, px * 3, px * 0.6)
            g.fillRect(x, y - px, px * 0.6, px * 3)
          }
          break
        case 'neon':
          if (i % 6 === 0) {
            g.fillStyle = i % 12 === 0 ? 'rgba(79,123,255,0.10)' : 'rgba(255,79,216,0.08)'
            g.fillRect(x, y, cs * 2, px)
          }
          break
        case 'retro':
          break
      }
    }

    if (this.showGrid) {
      g.strokeStyle = t.grid
      g.lineWidth = 1
      g.beginPath()
      for (let x = 0; x <= this.cols; x++) {
        g.moveTo(x * cs + 0.5, 0)
        g.lineTo(x * cs + 0.5, H)
      }
      for (let y = 0; y <= this.rows; y++) {
        g.moveTo(0, y * cs + 0.5)
        g.lineTo(W, y * cs + 0.5)
      }
      g.stroke()
    }

    if (t.deco === 'retro') {
      g.fillStyle = 'rgba(0,0,0,0.25)'
      for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1)
    }

    this.bgCache = c
    this.bgKey = key
    return c
  }

  private drawBorder(wrap: boolean, W: number, H: number, now: number) {
    const ctx = this.ctx
    ctx.save()
    ctx.lineWidth = 2
    if (wrap) {
      ctx.setLineDash([this.cell * 0.6, this.cell * 0.4])
      ctx.lineDashOffset = -(now / 40) % this.cell
      ctx.strokeStyle = 'rgba(32,217,176,0.55)'
    } else {
      ctx.strokeStyle = this.theme.wallEdge
    }
    ctx.strokeRect(1, 1, W - 2, H - 2)
    ctx.restore()
  }

  private drawObstacles(engine: GameEngine) {
    const ctx = this.ctx
    const cs = this.cell
    const inset = Math.max(1, cs * 0.08)
    for (const o of engine.map.obstacles) {
      const x = o.x * cs
      const y = o.y * cs
      ctx.fillStyle = this.theme.wall
      ctx.fillRect(x + inset * 0.5, y + inset * 0.5, cs - inset, cs - inset)
      ctx.fillStyle = this.theme.wallEdge
      ctx.fillRect(x + inset * 0.5, y + inset * 0.5, cs - inset, inset)
      ctx.fillRect(x + inset * 0.5, y + inset * 0.5, inset, cs - inset)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(x + inset * 0.5, y + cs - inset * 1.5, cs - inset, inset)
    }
  }

  private sprite(key: string): HTMLCanvasElement {
    const size = Math.round(this.cell * this.dpr)
    const cacheKey = `${key}|${size}`
    const cached = this.spriteCache.get(cacheKey)
    if (cached) return cached
    const rows = SPRITES[key] ?? SPRITES.apple
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const g = c.getContext('2d')!
    const n = rows.length
    const px = size / n
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x]
        if (ch === '.' || ch === ' ') continue
        g.fillStyle = PALETTE[ch] ?? '#FFFFFF'
        g.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px))
      }
    }
    this.spriteCache.set(cacheKey, c)
    return c
  }

  private foodSpriteKey(type: FoodType): string {
    if (type === 'apple') return this.foodSkin
    return type
  }

  private drawFoods(engine: GameEngine, now: number) {
    const ctx = this.ctx
    const cs = this.cell
    for (const f of engine.food.foods) {
      const age = engine.elapsed - f.spawnedAt
      const remaining = f.expiresAt === null ? Infinity : f.expiresAt - engine.elapsed
      const fading = remaining < 2000
      const pop = Math.min(1, age / 200)
      const bob = Math.sin(now / 250 + f.id) * 0.06
      const special = f.type !== 'apple' && f.type !== 'banana'
      const scale = (0.86 + bob) * pop
      const size = cs * scale
      const cx = (f.x + 0.5) * cs
      const cy = (f.y + 0.5) * cs
      if (special) {
        const pulse = 0.35 + 0.25 * Math.sin(now / 180)
        ctx.fillStyle = f.type === 'star' || f.type === 'lightning' ? `rgba(255,212,71,${pulse})` : f.type === 'energy' ? `rgba(74,168,255,${pulse})` : `rgba(176,92,255,${pulse})`
        ctx.beginPath()
        ctx.arc(cx, cy, cs * 0.75, 0, Math.PI * 2)
        ctx.fill()
      }
      if (fading) ctx.globalAlpha = 0.45 + 0.35 * Math.cos(now / 160)
      ctx.drawImage(this.sprite(this.foodSpriteKey(f.type)), cx - size / 2, cy - size / 2, size, size)
      ctx.globalAlpha = 1
    }
  }

  private segmentColor(i: number, n: number, now: number): string {
    const s = this.skin
    switch (s.pattern) {
      case 'rainbow':
        return `hsl(${(i * 22 - now / 8) % 360}, 90%, 60%)`
      case 'flame': {
        const flick = Math.floor(now / 90 + i) % s.body.length
        return s.body[(i + flick) % s.body.length]
      }
      case 'gold': {
        const shimmer = (Math.sin(i * 0.6 - now / 160) + 1) / 2
        return shimmer > 0.85 ? '#FFF6C8' : s.body[i % 2]
      }
      case 'neon': {
        const t = n > 1 ? i / (n - 1) : 0
        return t < 0.5 ? s.body[0] : s.body[1]
      }
      default:
        return s.body[i % s.body.length]
    }
  }

  private drawSnake(engine: GameEngine, now: number) {
    const ctx = this.ctx
    const cs = this.cell
    const body = engine.snake.body
    const n = body.length
    const ghost = engine.effects.has('ghost')
    const s = this.skin
    const pad = Math.max(1, cs * 0.1)

    ctx.save()
    if (ghost) ctx.globalAlpha = 0.45 + 0.2 * Math.sin(now / 100)

    if (s.glow) {
      ctx.fillStyle = hexToRgba(s.glow, 0.18)
      for (let i = 0; i < n; i += 1) {
        const p = body[i]
        ctx.fillRect(p.x * cs - pad, p.y * cs - pad, cs + pad * 2, cs + pad * 2)
      }
    }

    for (let i = n - 1; i >= 0; i--) {
      const p = body[i]
      const x = p.x * cs
      const y = p.y * cs
      const isHead = i === 0
      const tailShrink = i === n - 1 && n > 2 ? cs * 0.08 : 0
      const color = isHead ? s.head : this.segmentColor(i, n, now)
      const inset = pad + tailShrink

      ctx.fillStyle = s.outline
      ctx.fillRect(x + inset - 1, y + inset - 1, cs - inset * 2 + 2, cs - inset * 2 + 2)
      ctx.fillStyle = color
      ctx.fillRect(x + inset, y + inset, cs - inset * 2, cs - inset * 2)

      // Bridge to the next segment so the body looks continuous (skipped across wrap edges).
      if (i < n - 1) {
        const q = body[i + 1]
        const dx = q.x - p.x
        const dy = q.y - p.y
        if (Math.abs(dx) + Math.abs(dy) === 1) {
          ctx.fillStyle = color
          const bx = dx > 0 ? x + cs - inset : dx < 0 ? x - inset : x + inset
          const by = dy > 0 ? y + cs - inset : dy < 0 ? y - inset : y + inset
          const bw = dx !== 0 ? inset * 2 : cs - inset * 2
          const bh = dy !== 0 ? inset * 2 : cs - inset * 2
          ctx.fillRect(bx, by, bw, bh)
        }
      }

      if (!isHead) this.drawPattern(i, x, y, inset, now)
    }

    this.drawHead(engine.snake.head.x * cs, engine.snake.head.y * cs, engine.snake.direction, pad, now)
    ctx.restore()
  }

  private drawPattern(i: number, x: number, y: number, inset: number, now: number) {
    const ctx = this.ctx
    const cs = this.cell
    const px = Math.max(1, cs / 8)
    const s = this.skin
    switch (s.pattern) {
      case 'plain':
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(x + inset, y + inset, cs - inset * 2, px)
        break
      case 'frost':
        if (i % 3 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.fillRect(x + cs / 2 - px / 2, y + cs / 2 - px * 1.5, px, px * 3)
          ctx.fillRect(x + cs / 2 - px * 1.5, y + cs / 2 - px / 2, px * 3, px)
        }
        break
      case 'flame':
        if (Math.floor(now / 120 + i) % 3 === 0) {
          ctx.fillStyle = '#FFD447'
          ctx.fillRect(x + cs / 2 - px, y + inset, px * 2, px * 2)
        }
        break
      case 'mech':
        ctx.fillStyle = s.glow ?? '#20D9B0'
        ctx.fillRect(x + inset, y + cs / 2 - px / 2, cs - inset * 2, px)
        ctx.fillStyle = '#2B3445'
        ctx.fillRect(x + inset + px, y + inset + px, px, px)
        ctx.fillRect(x + cs - inset - px * 2, y + cs - inset - px * 2, px, px)
        break
      case 'dragon':
        ctx.fillStyle = '#FFD447'
        if (i % 2 === 0) {
          ctx.fillRect(x + cs / 2 - px, y + inset + px, px * 2, px)
          ctx.fillRect(x + cs / 2 - px * 2, y + inset + px * 2, px, px)
          ctx.fillRect(x + cs / 2 + px, y + inset + px * 2, px, px)
        }
        break
      case 'gold':
      case 'neon':
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(x + inset, y + inset, px * 2, px * 2)
        break
      case 'rainbow':
        break
    }
  }

  private drawHead(x: number, y: number, dir: Direction, pad: number, now: number) {
    const ctx = this.ctx
    const cs = this.cell
    const s = this.skin
    const px = Math.max(1, cs / 8)
    const blink = Math.floor(now / 2600) !== Math.floor((now + 140) / 2600)
    const eye = Math.max(2, px * 1.6)
    let e1: [number, number], e2: [number, number], tongue: [number, number, number, number]
    const near = pad + px * 1.2
    const far = cs - pad - px * 1.2 - eye
    const front = { right: cs - pad - eye - px * 0.6, left: pad + px * 0.6, down: cs - pad - eye - px * 0.6, up: pad + px * 0.6 }
    switch (dir) {
      case 'right':
        e1 = [front.right, near]
        e2 = [front.right, far]
        tongue = [cs - pad, cs / 2 - px / 2, px * 2, px]
        break
      case 'left':
        e1 = [front.left, near]
        e2 = [front.left, far]
        tongue = [pad - px * 2, cs / 2 - px / 2, px * 2, px]
        break
      case 'down':
        e1 = [near, front.down]
        e2 = [far, front.down]
        tongue = [cs / 2 - px / 2, cs - pad, px, px * 2]
        break
      default:
        e1 = [near, front.up]
        e2 = [far, front.up]
        tongue = [cs / 2 - px / 2, pad - px * 2, px, px * 2]
    }

    if (s.pattern === 'dragon') {
      ctx.fillStyle = '#FFD447'
      const horn = px * 1.5
      if (dir === 'left' || dir === 'right') {
        const hx = dir === 'right' ? x + pad : x + cs - pad - horn
        ctx.fillRect(hx, y + pad - horn, horn, horn)
        ctx.fillRect(hx, y + cs - pad, horn, horn)
      } else {
        const hy = dir === 'down' ? y + pad : y + cs - pad - horn
        ctx.fillRect(x + pad - horn, hy, horn, horn)
        ctx.fillRect(x + cs - pad, hy, horn, horn)
      }
    }

    if (Math.floor(now / 400) % 3 === 0) {
      ctx.fillStyle = '#FF4A6B'
      ctx.fillRect(x + tongue[0], y + tongue[1], tongue[2], tongue[3])
    }

    ctx.fillStyle = s.eye
    if (blink) {
      ctx.fillRect(x + e1[0], y + e1[1] + eye / 2 - px / 2, eye, Math.max(1, px * 0.6))
      ctx.fillRect(x + e2[0], y + e2[1] + eye / 2 - px / 2, eye, Math.max(1, px * 0.6))
    } else {
      ctx.fillRect(x + e1[0], y + e1[1], eye, eye)
      ctx.fillRect(x + e2[0], y + e2[1], eye, eye)
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      const hl = Math.max(1, eye * 0.35)
      ctx.fillRect(x + e1[0], y + e1[1], hl, hl)
      ctx.fillRect(x + e2[0], y + e2[1], hl, hl)
    }
  }

  private updateParticles(dt: number) {
    const ctx = this.ctx
    this.particles = this.particles.filter((p) => (p.life += dt) < p.max)
    for (const p of this.particles) {
      p.x += p.vx * (dt / 16)
      p.y += p.vy * (dt / 16)
      p.vy += 0.01 * this.cell * (dt / 16)
      ctx.globalAlpha = 1 - p.life / p.max
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1

    this.texts = this.texts.filter((t) => (t.life += dt) < 900)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${Math.max(11, this.cell * 0.8)}px "Press Start 2P", ui-monospace, monospace`
    for (const t of this.texts) {
      const k = t.life / 900
      ctx.globalAlpha = 1 - k
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillText(t.text, t.x + 1, t.y - k * this.cell * 2 + 1)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y - k * this.cell * 2)
    }
    ctx.globalAlpha = 1
  }

  /** Small arrow just ahead of the snake head confirming a recognized turn. */
  private drawFlash(dt: number, engine: GameEngine) {
    if (!this.flash) return
    this.flash.life += dt
    const k = this.flash.life / 400
    if (k >= 1) {
      this.flash = null
      return
    }
    const ctx = this.ctx
    const cs = this.cell
    const head = engine.snake.head
    const v = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] }[this.flash.dir]
    const dist = 1.2 + k * 0.6
    const cx = (head.x + 0.5 + v[0] * dist) * cs
    const cy = (head.y + 0.5 + v[1] * dist) * cs
    const size = cs * 0.55
    ctx.save()
    ctx.globalAlpha = 0.8 * (1 - k)
    ctx.translate(cx, cy)
    ctx.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.flash.dir])
    ctx.fillStyle = '#20D9B0'
    ctx.beginPath()
    ctx.moveTo(size, 0)
    ctx.lineTo(-size * 0.6, -size * 0.8)
    ctx.lineTo(-size * 0.2, 0)
    ctx.lineTo(-size * 0.6, size * 0.8)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

export function drawSpritePreview(canvas: HTMLCanvasElement, key: string) {
  const rows = SPRITES[key] ?? SPRITES.apple
  const g = canvas.getContext('2d')!
  const n = rows.length
  const px = canvas.width / n
  g.clearRect(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x]
      if (ch === '.') continue
      g.fillStyle = PALETTE[ch] ?? '#FFFFFF'
      g.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px))
    }
  }
}
