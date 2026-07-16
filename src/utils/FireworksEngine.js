const RAINBOW = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8']
const GOLD    = ['#FFD700','#FFA500','#FFE4B5','#FFFACD','#FFFFFF']
const CHRMNS  = ['#FFD700','#E5E4E2','#9B59B6','#FFFFFF']

function teamPalette(color) { return [color,'#FFFFFF','#FFD700','#FFA500'] }

// Object-pooled particle
class Particle {
  constructor() { this.alive = false }

  init(x, y, color, vx, vy) {
    this.x = x; this.y = y; this.color = color
    this.vx = vx; this.vy = vy; this.alpha = 1
    this.trail = []; this.alive = true
  }

  update() {
    this.trail.push({ x: this.x, y: this.y, a: this.alpha })
    if (this.trail.length > 8) this.trail.shift()
    this.vx *= 0.97; this.vy *= 0.97
    this.vy += 0.08
    this.x += this.vx; this.y += this.vy
    this.alpha -= 0.016
    if (this.alpha <= 0) this.alive = false
  }

  draw(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i]
      const a = (i / this.trail.length) * p.a * 0.5
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = this.color
      ctx.globalAlpha = a
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.globalAlpha = this.alpha
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

class Rocket {
  constructor(x, targetY, color) {
    this.x = x; this.y = window.innerHeight
    this.targetY = targetY; this.color = color
    this.vy = (targetY - window.innerHeight) / 38
    this.trail = []; this.alive = true; this.exploded = false
    this.palette = null; this.particleCount = 80
  }

  update() {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 10) this.trail.shift()
    this.y += this.vy
    if (this.y <= this.targetY) { this.exploded = true; this.alive = false }
  }

  draw(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i]
      const a = (i / this.trail.length) * 0.6
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = this.color
      ctx.globalAlpha = a
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
  }
}

export class FireworksEngine {
  constructor(canvas) {
    this.canvas  = canvas
    this.ctx     = canvas.getContext('2d')
    this.pool    = Array.from({ length: 600 }, () => new Particle())
    this.poolIdx = 0
    this.active  = []   // active particles
    this.rockets = []
    this.animId  = null
    this.intId   = null
    this._onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', this._onResize)
    this._onResize()
  }

  _particle() {
    // Find a dead particle in pool
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.poolIdx + i) % this.pool.length
      if (!this.pool[idx].alive) {
        this.poolIdx = idx + 1
        return this.pool[idx]
      }
    }
    // Pool exhausted — reuse oldest
    const p = this.pool[this.poolIdx % this.pool.length]
    this.poolIdx++
    return p
  }

  _explode(x, y, palette, count = 80) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3
      const speed = 2 + Math.random() * 4
      const color = palette[Math.floor(Math.random() * palette.length)]
      const p = this._particle()
      p.init(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed)
      this.active.push(p)
    }
  }

  launch(opts = {}) {
    const isMobile = window.innerWidth < 768
    if (isMobile) return  // disabled on mobile per spec

    const x       = opts.x ?? (window.innerWidth * (0.15 + Math.random() * 0.7))
    const y       = opts.y ?? (window.innerHeight * (0.08 + Math.random() * 0.45))
    const palette = opts.palette ?? RAINBOW
    const color   = palette[Math.floor(Math.random() * palette.length)]
    const r       = new Rocket(x, y, color)
    r.palette       = palette
    r.particleCount = opts.particleCount ?? (isMobile ? 40 : 80)
    this.rockets.push(r)
    this._ensureLoop()
  }

  burst(count, staggerMs = 300, opts = {}) {
    for (let i = 0; i < count; i++) setTimeout(() => this.launch(opts), i * staggerMs)
  }

  continuous(ms = 800, opts = {}) {
    this.stopContinuous()
    this.launch(opts)
    this.intId = setInterval(() => this.launch(opts), ms)
  }

  stopContinuous() {
    if (this.intId) { clearInterval(this.intId); this.intId = null }
  }

  stop() {
    this.stopContinuous()
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
    this.active  = []
    this.rockets = []
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  _ensureLoop() {
    if (this.animId) return
    this._loop()
  }

  _loop() {
    this.animId = requestAnimationFrame(() => {
      // Fading trail background
      this.ctx.fillStyle = 'rgba(0,0,0,0.18)'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

      // Rockets
      this.rockets = this.rockets.filter(r => {
        r.update()
        if (r.exploded) {
          this._explode(r.x, r.y, r.palette, r.particleCount)
          return false
        }
        r.draw(this.ctx)
        return true
      })

      // Particles
      this.active = this.active.filter(p => {
        p.update()
        if (!p.alive) return false
        p.draw(this.ctx)
        return true
      })

      const busy = this.rockets.length > 0 || this.active.length > 0 || this.intId
      if (busy) { this._loop() }
      else {
        this.animId = null
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
    })
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
  }

  // Palette presets exposed
  static palettes = { RAINBOW, GOLD, CHRMNS, team: teamPalette }
}
