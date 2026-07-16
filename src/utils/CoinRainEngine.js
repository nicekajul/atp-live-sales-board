const INTENSITY = {
  light:     { max: 15,  spawnMs: 200 },
  heavy:     { max: 40,  spawnMs: 100 },
  legendary: { max: 80,  spawnMs: 50  },
}

class Coin {
  constructor() { this.alive = false }

  init(w) {
    this.x     = Math.random() * w
    this.y     = -30
    this.r     = 8 + Math.random() * 14
    this.vy    = 2 + Math.random() * 3
    this.vx    = (Math.random() - 0.5) * 0.8
    this.rot   = Math.random() * Math.PI * 2
    this.rotV  = (Math.random() - 0.5) * 0.10
    this.wob   = 0
    this.wobV  = 0.05 + Math.random() * 0.05
    this.alpha = 1
    this.alive = true
  }

  update(h) {
    this.wob += this.wobV
    this.x   += this.vx + Math.sin(this.wob) * 0.5
    this.y   += this.vy
    this.rot += this.rotV
    if (this.y > h * 0.75) {
      this.alpha = Math.max(0, 1 - (this.y - h * 0.75) / (h * 0.25))
    }
    if (this.y > h + 40 || this.alpha <= 0) this.alive = false
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rot)
    ctx.globalAlpha = this.alpha

    // Squeeze on x-axis to simulate spin
    const squeeze = 0.15 + 0.85 * Math.abs(Math.cos(this.rot * 2))
    const rx = this.r * squeeze
    const ry = this.r

    const grd = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 0, 0, 0, ry)
    grd.addColorStop(0,   '#FFF176')
    grd.addColorStop(0.4, '#FFD700')
    grd.addColorStop(0.8, '#FFA500')
    grd.addColorStop(1,   '#B8860B')

    ctx.beginPath()
    ctx.ellipse(0, 0, Math.max(1, rx), ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()
    ctx.strokeStyle = '#B8860B'
    ctx.lineWidth = 1
    ctx.stroke()

    if (rx > 5) {
      ctx.fillStyle = '#A16207'
      ctx.font = `bold ${Math.floor(ry * 0.9)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('$', 0, 0)
    }
    ctx.restore()
  }
}

export class CoinRainEngine {
  constructor(canvas) {
    this.canvas  = canvas
    this.ctx     = canvas.getContext('2d')
    this.pool    = Array.from({ length: 100 }, () => new Coin())
    this.poolIdx = 0
    this.active  = []
    this.animId  = null
    this.spawnId = null
    this._cfg    = INTENSITY.light
    this._onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', this._onResize)
    this._onResize()
  }

  _getCoin() {
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.poolIdx + i) % this.pool.length
      if (!this.pool[idx].alive) { this.poolIdx = idx + 1; return this.pool[idx] }
    }
    return this.pool[this.poolIdx++ % this.pool.length]
  }

  _spawn() {
    const live = this.active.filter(c => c.alive).length
    if (live >= this._cfg.max) return
    const c = this._getCoin()
    c.init(this.canvas.width)
    this.active.push(c)
  }

  start(intensity = 'light') {
    this._cfg = INTENSITY[intensity] || INTENSITY.light
    this.stop()
    this._spawn()
    this.spawnId = setInterval(() => this._spawn(), this._cfg.spawnMs)
    this._loop()
  }

  stop() {
    if (this.spawnId) { clearInterval(this.spawnId); this.spawnId = null }
    if (this.animId)  { cancelAnimationFrame(this.animId); this.animId = null }
    this.active = []
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  _loop() {
    this.animId = requestAnimationFrame(() => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      const h = this.canvas.height
      this.active = this.active.filter(c => {
        c.update(h)
        if (!c.alive) return false
        c.draw(this.ctx)
        return true
      })
      if (this.spawnId || this.active.length > 0) this._loop()
      else this.animId = null
    })
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
  }
}
