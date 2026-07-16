// EffectsEngine — self-hosted canvas for fireworks + coin rain,
// canvas-confetti for burst effects, inline siren flash div.
// Mount once; call runTier() / stop() per popup.

import confetti from 'canvas-confetti'

// ── Color palettes ────────────────────────────────────────────────────────────
const PAL = {
  RAINBOW:  ['#FF6B6B','#FFD700','#00F5A0','#4ECDC4','#45B7D1','#A855F7','#F97316','#EC4899'],
  GOLD:     ['#FFD700','#FFA500','#FFE4B5','#FFFACD','#F5DEB3'],
  SITE:     ['#FFD700','#FFA500','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD'],
  CHAIRMNS: ['#FFD700','#E8E8E8','#C084FC','#FFFACD'],
  team:     (c) => [c, '#ffffff', '#FFD700', c],
  pick:     (arr) => arr[Math.floor(Math.random() * arr.length)],
}

// ── Firework Rocket ───────────────────────────────────────────────────────────
class Rocket {
  constructor({ x, targetX, targetY, color = '#FFD700', particleCount = 80, palette }) {
    this.x          = x
    this.y          = window.innerHeight + 10
    this.targetX    = targetX
    this.targetY    = targetY
    this.color      = color
    this.pCount     = particleCount
    this.palette    = palette || [color, '#ffffff', color]
    this.trail      = []

    const dx   = targetX - x
    const dy   = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const spd  = 9 + Math.random() * 5
    this.vx    = (dx / dist) * spd
    this.vy    = (dy / dist) * spd
  }

  // returns true while still flying, false when it should explode
  update() {
    this.trail.unshift({ x: this.x, y: this.y })
    if (this.trail.length > 8) this.trail.pop()
    this.x += this.vx
    this.y += this.vy
    return this.y > this.targetY   // vy is negative (going up)
  }

  draw(ctx) {
    ctx.save()
    for (let i = 0; i < this.trail.length; i++) {
      const a = (1 - i / this.trail.length) * 0.85
      const r = 3 * (1 - i / this.trail.length)
      ctx.globalAlpha = a
      ctx.fillStyle   = this.color
      ctx.beginPath()
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle   = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── Explosion Particle ────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color, trailLen = 6) {
    const angle   = Math.random() * Math.PI * 2
    const speed   = 1.5 + Math.random() * 6
    this.x        = x;       this.y        = y
    this.vx       = Math.cos(angle) * speed
    this.vy       = Math.sin(angle) * speed
    this.color    = color
    this.alpha    = 1
    this.decay    = 0.012 + Math.random() * 0.010
    this.gravity  = 0.07
    this.friction = 0.97
    this.size     = 1.5 + Math.random() * 2.5
    this.trail    = [{ x, y }]
    this.tLen     = trailLen
  }

  update() {
    this.trail.unshift({ x: this.x, y: this.y })
    if (this.trail.length > this.tLen) this.trail.pop()
    this.vx  *= this.friction
    this.vy  *= this.friction
    this.vy  += this.gravity
    this.x   += this.vx
    this.y   += this.vy
    this.alpha -= this.decay
    return this.alpha > 0.02
  }

  draw(ctx) {
    ctx.save()
    ctx.lineCap = 'round'
    for (let i = 1; i < this.trail.length; i++) {
      const a = (this.alpha / this.trail.length) * (this.trail.length - i)
      ctx.globalAlpha = Math.max(0, a)
      ctx.strokeStyle = this.color
      ctx.lineWidth   = this.size * (1 - i / this.trail.length)
      ctx.beginPath()
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y)
      ctx.lineTo(this.trail[i].x,     this.trail[i].y)
      ctx.stroke()
    }
    ctx.globalAlpha = Math.max(0, this.alpha)
    ctx.fillStyle   = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── Spinning Coin ─────────────────────────────────────────────────────────────
class Coin {
  constructor(canvas) {
    this._cv = canvas
    this._spawn(true)
  }

  _spawn(staggerY = false) {
    const cw        = this._cv.width
    const ch        = this._cv.height
    this.x          = Math.random() * cw
    this.y          = staggerY ? -Math.random() * ch : -(10 + Math.random() * 20)
    this.vy         = 2 + Math.random() * 3
    this.driftX     = (Math.random() - 0.5) * 0.4
    this.wobbleAmt  = 1.2 + Math.random() * 1.5
    this.wobbleFreq = 0.02 + Math.random() * 0.02
    this.wobbleOff  = Math.random() * Math.PI * 2
    this.size       = 8 + Math.random() * 12
    this.rot        = Math.random() * Math.PI * 2
    this.rotSpd     = (Math.random() - 0.5) * 0.13
    this.alpha      = 1
    this.frame      = 0
    this.active     = true
  }

  update() {
    if (!this.active) return
    this.frame++
    this.y   += this.vy
    this.x   += this.driftX + Math.sin(this.wobbleOff + this.frame * this.wobbleFreq) * this.wobbleAmt
    this.rot += this.rotSpd
    const fadeStart = this._cv.height * 0.8
    this.alpha = this.y > fadeStart
      ? Math.max(0, 1 - (this.y - fadeStart) / (this._cv.height * 0.22))
      : 1
    if (this.y > this._cv.height + this.size) this._spawn(false)
  }

  draw(ctx) {
    if (!this.active) return
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rot)

    // 3D squish illusion
    const sq = Math.abs(Math.cos(this.rot * 2))
    ctx.scale(sq, 1)

    const g = ctx.createRadialGradient(-this.size * 0.3, -this.size * 0.3, 0, 0, 0, this.size)
    g.addColorStop(0, '#FFE566')
    g.addColorStop(0.5, '#FFD700')
    g.addColorStop(1, '#B8860B')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#B8860B'
    ctx.lineWidth   = 1
    ctx.stroke()

    if (sq > 0.25) {
      ctx.globalAlpha = this.alpha * sq
      ctx.fillStyle   = '#7B5800'
      ctx.font        = `bold ${Math.round(this.size * 0.85)}px sans-serif`
      ctx.textAlign   = 'center'
      ctx.textBaseline= 'middle'
      ctx.fillText('$', 0, 0)
    }
    ctx.restore()
  }
}

// Coin pool sizes per intensity
const COIN_CFG = {
  light:     20,
  heavy:     50,
  legendary: 100,
}

// ── EffectsEngine ─────────────────────────────────────────────────────────────
class EffectsEngine {
  constructor() {
    this._canvas    = null
    this._ctx       = null
    this._sirenEl   = null
    this._rafId     = null
    this._running   = false
    this._rockets   = []
    this._particles = []
    this._coins     = []
    this._timers    = []   // all setTimeout / setInterval IDs
    this._fwIntId   = null
    this._mount()
  }

  // ── DOM lifecycle ──────────────────────────────────────────────────────────

  _mount() {
    // Full-screen canvas for fireworks + coins (above popup overlay)
    const canvas = document.createElement('canvas')
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100vw', 'height:100vh',
      'pointer-events:none', `z-index:9999`,
    ].join(';')
    this._resize(canvas)
    document.body.appendChild(canvas)
    this._canvas = canvas
    this._ctx    = canvas.getContext('2d')

    this._onResize = () => this._resize(canvas)
    window.addEventListener('resize', this._onResize)

    // Siren flash div (below popup overlay)
    const siren = document.createElement('div')
    siren.style.cssText = [
      'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:99',
      'background:transparent', 'transition:background 150ms ease',
    ].join(';')
    document.body.appendChild(siren)
    this._sirenEl = siren
  }

  _resize(canvas) {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
    this._canvas?.remove()
    this._sirenEl?.remove()
    this._canvas = null
    this._ctx    = null
    this._sirenEl= null
  }

  // ── RAF loop ───────────────────────────────────────────────────────────────

  _startLoop() {
    if (this._running) return
    this._running = true
    const tick = () => {
      if (!this._running) return
      this._tick()
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  _stopLoop() {
    this._running = false
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null }
    this._ctx?.clearRect(0, 0, this._canvas?.width ?? 0, this._canvas?.height ?? 0)
  }

  _tick() {
    const ctx = this._ctx
    if (!ctx || !this._canvas) return
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)

    // Rockets — update; explode when target reached
    const live = []
    for (const r of this._rockets) {
      if (r.update()) {
        r.draw(ctx)
        live.push(r)
      } else {
        this._explode(r.x, r.y, r.palette, r.pCount)
      }
    }
    this._rockets = live

    // Particles
    this._particles = this._particles.filter(p => {
      const alive = p.update()
      if (alive) p.draw(ctx)
      return alive
    })

    // Coins
    for (const c of this._coins) { c.update(); c.draw(ctx) }

    // Auto-stop when canvas is empty and no interval is running
    if (!this._rockets.length && !this._particles.length &&
        !this._coins.length   && !this._fwIntId) {
      this._stopLoop()
    }
  }

  _explode(x, y, palette, count = 80) {
    const colors = palette || PAL.GOLD
    for (let i = 0; i < count; i++) {
      this._particles.push(new Particle(x, y, PAL.pick(colors)))
    }
  }

  // ── Timer helpers ──────────────────────────────────────────────────────────

  _after(ms, fn) {
    const id = setTimeout(() => { this._timers = this._timers.filter(t => t !== id); fn() }, ms)
    this._timers.push(id)
    return id
  }

  _every(ms, fn) {
    fn()
    const id = setInterval(fn, ms)
    this._timers.push(id)
    return id
  }

  _clearTimers() {
    for (const id of this._timers) { clearTimeout(id); clearInterval(id) }
    this._timers = []
    if (this._fwIntId) { clearInterval(this._fwIntId); this._fwIntId = null }
  }

  // ── Fireworks API ──────────────────────────────────────────────────────────

  launchFirework(opts = {}) {
    const cw = this._canvas?.width  || window.innerWidth
    const ch = this._canvas?.height || window.innerHeight
    const palette = opts.palette || PAL.GOLD
    const color   = opts.color   || PAL.pick(palette)
    const rocket  = new Rocket({
      x:             opts.x ?? (cw * 0.1 + Math.random() * cw * 0.8),
      targetX:       opts.targetX ?? (cw * 0.15 + Math.random() * cw * 0.7),
      targetY:       opts.targetY ?? (ch * 0.08 + Math.random() * ch * 0.45),
      color,
      palette,
      particleCount: opts.particleCount ?? 85,
    })
    this._rockets.push(rocket)
    this._startLoop()
  }

  launchBurst(count = 4, staggerMs = 300, opts = {}) {
    for (let i = 0; i < count; i++) {
      this._after(i * staggerMs, () => this.launchFirework(opts))
    }
  }

  startContinuousFireworks(intervalMs = 800, opts = {}) {
    this.launchFirework(opts)
    this._fwIntId = setInterval(() => this.launchFirework(opts), intervalMs)
  }

  stopFireworks() {
    if (this._fwIntId) { clearInterval(this._fwIntId); this._fwIntId = null }
    this._rockets = []
  }

  // ── Coin rain API ──────────────────────────────────────────────────────────

  startCoins(intensity = 'light') {
    const count = COIN_CFG[intensity] ?? COIN_CFG.light
    this._coins = Array.from({ length: count }, () => new Coin(this._canvas))
    this._startLoop()
  }

  stopCoins() { this._coins = [] }

  // ── Confetti presets ───────────────────────────────────────────────────────

  confetti(preset, teamColor = '#00F5A0') {
    const tc = teamColor
    switch (preset) {
      case 'light':
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.3 }, gravity: 0.8, scalar: 0.9,
          colors: [tc, '#ffffff', '#FFD700'] })
        break

      case 'medium':
        confetti({ particleCount: 150, spread: 90, startVelocity: 40, origin: { y: 0.4 },
          shapes: ['square', 'circle'],
          colors: [tc, '#ffffff', '#F59E0B', '#E11D48', '#2563EB'] })
        break

      case 'heavy':
        confetti({ particleCount: 100, angle: 60,  spread: 55, origin: { x: 0 }, colors: [tc, '#ffffff', '#FFD700'] })
        confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 }, colors: [tc, '#ffffff', '#FFD700'] })
        break

      case 'epic': {
        let elapsed = 0
        const fire = () => {
          confetti({ particleCount: 60, spread: 360, startVelocity: 30, ticks: 200,
            shapes: ['square', 'circle', 'star'],
            colors: [tc, '#FFD700', '#ffffff', '#F59E0B'] })
          elapsed += 300
          if (elapsed < 5000) this._after(300, fire)
        }
        fire()
        break
      }

      case 'legendary': {
        const colors  = PAL.SITE
        const origins = [{ x: 0.5, y: 0.5 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
        origins.forEach(origin =>
          confetti({ particleCount: 200, spread: 360, startVelocity: 55, ticks: 300,
            shapes: ['square', 'circle', 'star'], colors, origin }))
        // Sustained bursts every 600ms
        const sustain = () => {
          confetti({ particleCount: 80, spread: 360, startVelocity: 35, ticks: 200, colors })
        }
        this._every(600, sustain)
        break
      }

      case 'gold':
        confetti({ particleCount: 120, spread: 80, scalar: 1.2,
          shapes: ['circle', 'star'],
          colors: ['#FFD700', '#FFA500', '#FFE4B5', '#FFFACD'] })
        break
    }
  }

  // ── Siren flash ────────────────────────────────────────────────────────────

  sirenFlash(tier) {
    const el = this._sirenEl
    if (!el) return
    const sequence = tier >= 5
      ? ['rgba(255,215,0,0.35)', 'rgba(255,255,255,0.28)', 'rgba(255,215,0,0.35)', 'transparent']
      : ['rgba(220,38,38,0.30)', 'rgba(37,99,235,0.28)',   'rgba(220,38,38,0.30)', 'transparent']

    let i = 0
    const flash = () => {
      el.style.background = sequence[i++]
      if (i < sequence.length) this._after(200, flash)
    }
    flash()
  }

  // ── Tier orchestration ─────────────────────────────────────────────────────

  /**
   * runTier(tier, { teamColor, mobile })
   * Fires all visual effects appropriate for the tier.
   * For tier 5, call startT5Phase2() separately when the UI reaches phase 2.
   */
  runTier(tier, { teamColor = '#00F5A0', mobile = false } = {}) {
    const pal = tier === 5         ? PAL.RAINBOW
              : tier === 'executive'? PAL.GOLD
              : PAL.team(teamColor)

    if (tier === 1) {
      // Coin rain to match the coin-collect sound
      this.startCoins('light')

    } else if (tier === 2) {
      // Individual quota — medium confetti + 2 fireworks + light coin rain
      this.confetti('medium', teamColor)
      this.launchBurst(2, 0, { palette: pal, particleCount: 70 })
      this.startCoins('light')

    } else if (tier === 3) {
      // Sub-team quota — side cannons + 4 fireworks + heavy coins + siren
      this.confetti('heavy', teamColor)
      this.launchBurst(4, 300, { palette: pal, particleCount: 90 })
      this.startCoins('heavy')
      this.sirenFlash(3)

    } else if (tier === 4) {
      // Main-team quota — sustained confetti + continuous fireworks + coins + siren x2
      this.confetti('epic', teamColor)
      this.startContinuousFireworks(800, { palette: pal, particleCount: 95 })
      this.startCoins(mobile ? 'light' : 'heavy')
      this.sirenFlash(4)
      this._after(400, () => this.sirenFlash(4))

    } else if (tier === 5) {
      // Site quota — phase 1 just siren; phase 2 via startT5Phase2()
      this.sirenFlash(5)

    } else if (tier === 'executive') {
      // Franki / executive sale — gold burst + 2 fireworks + light coins
      this.confetti('gold', teamColor)
      this.launchBurst(2, 400, { palette: PAL.GOLD, particleCount: 75 })
      this.startCoins('light')

    } else if (tier === 'chairmans') {
      // Chairman's circle — legendary + continuous large fireworks + legendary coins
      this.confetti('legendary', teamColor)
      this.startContinuousFireworks(300, { palette: PAL.CHAIRMNS, particleCount: 120 })
      this.startCoins('legendary')
      this.sirenFlash(5)

    } else if (tier === 'presidents') {
      this.confetti('epic', teamColor)
      this.launchBurst(6, 250, { palette: PAL.GOLD, particleCount: 100 })
      this.startCoins('heavy')
      this.sirenFlash(4)

    } else if (tier === 'executive-circle') {
      this.confetti('gold', teamColor)
      this.launchBurst(3, 300, { palette: PAL.GOLD, particleCount: 80 })
      this.startCoins('light')
    }
  }

  /**
   * Call this when Tier 5 enters phase 2 (the reveal + celebration phase).
   */
  startT5Phase2(mobile = false) {
    this.confetti('legendary')
    this.startContinuousFireworks(mobile ? 550 : 380, { palette: PAL.RAINBOW, particleCount: 110 })
    this.startCoins(mobile ? 'heavy' : 'legendary')
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  stop() {
    this._clearTimers()
    this.stopFireworks()
    this.stopCoins()
    this._particles = []
    this._stopLoop()
    if (this._sirenEl) this._sirenEl.style.background = 'transparent'
  }
}

export const effectsEngine = new EffectsEngine()
