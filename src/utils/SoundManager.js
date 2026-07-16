// SoundManager — Howler.js (file-based) with Web Audio API procedural fallback.
// Files live in /public/sounds/. Missing files silently fall back to synth.
// Preload all sounds at app startup via soundManager.loadAll().

import { Howl, Howler } from 'howler'

const SOUND_KEY = 'salesboard_sound'

// All sound files. Keys are the identifiers passed to play() / stop() / after().
const SOUND_FILES = {
  'sale-regular':      '/sounds/sale-regular.mp3',
  'sale-executive':    '/sounds/sale-executive.mp3',
  'quota-individual':  '/sounds/quota-individual.mp3',
  'quota-subteam':     '/sounds/quota-subteam.mp3',
  'quota-mainteam':    '/sounds/quota-mainteam.wav',
  'quota-site':        '/sounds/quota-site.wav',
  'circle-executive':  '/sounds/circle-executive.wav',
  'circle-presidents': '/sounds/circle-presidents.wav',
  'circle-chairmans':  '/sounds/circle-chairmans.wav',
  'electric-car':      '/sounds/electric-car.wav',
  'coin-collect':      '/sounds/coin-collect.wav',
  'siren-alert':       '/sounds/siren-alert.wav',
  'countdown-tick':    '/sounds/countdown-tick.wav',
  'firework-burst':    '/sounds/firework-burst.wav',
}

// ── Web Audio fallback ────────────────────────────────────────────────────────
let _ctx           = null
let _resumePromise = null   // the promise from the user-gesture resume() call

// Pre-warm the AudioContext on the very first user gesture.
// We STORE the resume() promise so _getCtx() can await it even after
// the gesture call stack has ended — Chrome requires resume() to be CALLED
// during a gesture, but the promise can be awaited anywhere.
function _setupUnlock() {
  const handler = () => {
    try {
      if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (_ctx.state === 'suspended') _resumePromise = _ctx.resume().catch(() => {})
    } catch {}
    document.removeEventListener('click',      handler)
    document.removeEventListener('touchstart', handler)
    document.removeEventListener('keydown',    handler)
  }
  document.addEventListener('click',      handler, { passive: true })
  document.addEventListener('touchstart', handler, { passive: true })
  document.addEventListener('keydown',    handler, { passive: true })
}
_setupUnlock()

async function _getCtx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  // Await the gesture-initiated resume if one is pending
  if (_resumePromise) {
    try { await _resumePromise } catch {}
    _resumePromise = null
  }
  // If still suspended (no gesture yet), try anyway — may fail outside gesture
  if (_ctx.state === 'suspended') {
    try { await _ctx.resume() } catch {}
  }
  return _ctx.state === 'running' ? _ctx : null
}

async function _procedural(key, vol = 1) {
  const ctx = await _getCtx()
  if (!ctx) return

  const master = ctx.createGain()
  master.gain.value = Math.min(vol, 1) * 0.75
  master.connect(ctx.destination)

  const note = (freq, t, dur, v = 0.28, wave = 'sine') => {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    osc.connect(g); g.connect(master)
    const now = ctx.currentTime
    g.gain.setValueAtTime(0, now + t)
    g.gain.linearRampToValueAtTime(v, now + t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, now + t + dur)
    osc.start(now + t); osc.stop(now + t + dur + 0.05)
  }

  switch (key) {
    case 'quota-site':
      note(261,.00,1.0,.22,'sawtooth'); note(392,.00,1.0,.22,'sawtooth')
      note(523,.00,1.0,.28,'sawtooth'); note(659,.18,1.0,.28,'sawtooth')
      note(784,.35,1.2,.32,'sawtooth'); note(1047,.55,1.8,.38,'sine')
      note(1319,.75,1.5,.30,'sine');    note(1568,.95,1.2,.24,'sine')
      break
    case 'quota-mainteam':
      note(392,.00,.55,.25,'square'); note(523,.12,.55,.28,'square')
      note(659,.24,.55,.30,'sine');   note(784,.36,.65,.33,'sine')
      note(1047,.55,1.10,.38,'sine')
      break
    case 'quota-subteam':
      note(392,.00,.65,.25,'square'); note(523,.09,.65,.28,'square')
      note(659,.18,.65,.30,'sine');   note(880,.30,.80,.32,'sine')
      note(1047,.45,1.0,.35,'sine')
      break
    case 'quota-individual':
      [523,659,784,988,1047,1319].forEach((f,i) => note(f, i*.10, .65, .28, 'sine'))
      break
    case 'siren-alert':
      note(880,.00,.15,.30,'sawtooth'); note(440,.15,.15,.30,'sawtooth')
      note(880,.30,.15,.30,'sawtooth'); note(440,.45,.15,.30,'sawtooth')
      break
    case 'coin-collect':
      [1047,1319,1568,2093].forEach((f,i) => note(f, i*.04, .20, .20, 'sine'))
      break
    case 'firework-burst':
      note(200,.00,.05,.40,'sawtooth'); note(150,.02,.08,.30,'sawtooth')
      note(100,.04,.12,.20,'sawtooth')
      break
    case 'countdown-tick':
      note(880, 0, .04, .12, 'sine')
      break
    case 'circle-chairmans':
      // Triumphant multi-chord fanfare
      note(523,.00,.8,.28,'sine'); note(659,.00,.8,.28,'sine'); note(784,.00,.8,.28,'sine')
      note(1047,.20,1.0,.32,'sine'); note(1319,.35,1.0,.30,'sine'); note(1568,.50,1.2,.28,'sine')
      note(2093,.70,1.5,.35,'sine')
      break
    case 'circle-presidents':
      note(392,.00,.7,.26,'sine'); note(523,.00,.7,.26,'sine'); note(659,.00,.7,.26,'sine')
      note(784,.18,.9,.30,'sine'); note(1047,.35,1.1,.32,'sine'); note(1319,.55,1.2,.28,'sine')
      break
    case 'circle-executive':
    case 'sale-executive':
      [392,523,659].forEach((f,i) => note(f, i*.12, .55, .24, 'sine'))
      ;[523,659,784].forEach((f,i) => note(f, i*.12+.06, .55, .24, 'triangle'))
      note(1047,.48,1.0,.32,'sine'); note(1319,.65,.8,.26,'sine')
      break
    case 'electric-car':
      // Rising electric whine
      note(220,.00,.3,.20,'sawtooth'); note(440,.10,.3,.22,'sawtooth')
      note(880,.20,.4,.24,'sawtooth'); note(1760,.32,.6,.26,'sine')
      note(2200,.55,.8,.22,'sine')
      break
    default: // sale-regular
      [523,659,784,1047].forEach((f,i) => note(f, i*.12, .50, .25, 'sine'))
  }
}

// ── SoundManager ──────────────────────────────────────────────────────────────
class SoundManager {
  constructor() {
    this._pool    = {}   // key → { howl, ready }
    this._loops   = {}   // key → active Howl sound-id (looping instances)
    this._timers  = []
    this._masterVol = 1
  }

  // ── Preload ───────────────────────────────────────────────────────────────

  load(key, url) {
    if (this._pool[key]) return   // already loaded
    const entry = { howl: null, ready: false }
    this._pool[key] = entry

    entry.howl = new Howl({
      src:         [url],
      preload:     true,
      html5:       true,   // HTML5 Audio — no AudioContext unlock needed
      volume:      this._masterVol,
      onload:      () => { entry.ready = true },
      onloaderror: () => { entry.ready = false },
    })
  }

  loadAll() {
    for (const [key, url] of Object.entries(SOUND_FILES)) {
      this.load(key, url)
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  play(key, options = {}) {
    if (!this.isEnabled()) return null
    const { volume = 1, loop = false, fadeIn = 0 } = options
    const vol = Math.min(volume * this._masterVol, 1)

    const entry = this._pool[key]
    if (entry?.ready) {
      entry.howl.loop(loop)
      // Set correct volume before playing — do NOT pre-set to 0 unless fading in
      if (fadeIn > 0) {
        entry.howl.volume(0)
        const id = entry.howl.play()
        entry.howl.fade(0, vol, fadeIn, id)
        if (loop) this._loops[key] = id
        return id
      }
      entry.howl.volume(vol)
      const id = entry.howl.play()
      if (loop) this._loops[key] = id
      return id
    }

    // Fallback — procedural (no loop support in fallback)
    _procedural(key, vol).catch(() => {})
    return null
  }

  stop(key) {
    const entry = this._pool[key]
    if (entry?.ready) entry.howl.stop()
    delete this._loops[key]
  }

  fadeOut(key, duration = 500) {
    const entry = this._pool[key]
    if (!entry?.ready) { this.stop(key); return }
    const id = this._loops[key]
    const fromVol = id != null ? entry.howl.volume(id) : entry.howl.volume()
    const fade = (id != null)
      ? () => entry.howl.fade(fromVol, 0, duration, id)
      : () => entry.howl.fade(fromVol, 0, duration)
    fade()
    const t = setTimeout(() => this.stop(key), duration + 50)
    this._timers.push(t)
  }

  stopAll(fadeMs = 0) {
    this._timers.forEach(clearTimeout)
    this._timers = []

    if (fadeMs > 0) {
      // Fade out looping sounds, hard-stop one-shots
      const loopKeys = Object.keys(this._loops)
      for (const key of loopKeys) this.fadeOut(key, fadeMs)
      for (const [key, entry] of Object.entries(this._pool)) {
        if (!loopKeys.includes(key) && entry.ready) entry.howl.stop()
      }
    } else {
      for (const entry of Object.values(this._pool)) {
        if (entry.ready) entry.howl.stop()
      }
      this._loops = {}
    }
  }

  // ── Sequence & utilities ──────────────────────────────────────────────────

  after(ms, key, options = {}) {
    const t = setTimeout(() => this.play(key, options), ms)
    this._timers.push(t)
    return t
  }

  playSequence(keys, gaps = []) {
    let delay = 0
    keys.forEach((key, i) => {
      const t = setTimeout(() => this.play(key), delay)
      this._timers.push(t)
      delay += (gaps[i] ?? 500)
    })
  }

  setMasterVolume(v) {
    this._masterVol = Math.max(0, Math.min(1, v))
    Howler.volume(this._masterVol)
  }

  isEnabled() {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  }
}

export const soundManager = new SoundManager()
