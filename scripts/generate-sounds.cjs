// generate-sounds.js
// Run with:  node scripts/generate-sounds.js
// Writes all 14 WAV sound files to public/sounds/
// No external dependencies — pure Node.js Buffer + Math.

const fs   = require('fs')
const path = require('path')

const SR = 44100   // 44.1 kHz mono 16-bit

// ── WAV header ────────────────────────────────────────────────────────────────
function wavHeader(pcmLen) {
  const b = Buffer.alloc(44)
  b.write('RIFF', 0)
  b.writeUInt32LE(pcmLen + 36, 4)
  b.write('WAVE', 8)
  b.write('fmt ', 12)
  b.writeUInt32LE(16, 16)          // chunk size
  b.writeUInt16LE(1, 20)           // PCM
  b.writeUInt16LE(1, 22)           // mono
  b.writeUInt32LE(SR, 24)
  b.writeUInt32LE(SR * 2, 28)      // byte rate
  b.writeUInt16LE(2, 32)           // block align
  b.writeUInt16LE(16, 34)          // bits per sample
  b.write('data', 36)
  b.writeUInt32LE(pcmLen, 40)
  return b
}

// ── Oscillator ────────────────────────────────────────────────────────────────
function osc(type, freq, t) {
  const p = 2 * Math.PI * freq * t
  switch (type) {
    case 'sawtooth': return 2 * (t * freq - Math.floor(t * freq + 0.5))
    case 'square':   return Math.sin(p) >= 0 ? 1 : -1
    case 'triangle': return (2 / Math.PI) * Math.asin(Math.sin(p))
    default:         return Math.sin(p)
  }
}

// ── Render notes to PCM ───────────────────────────────────────────────────────
// notes = [{ freq, start, dur, amp, wave }]  (start/dur in seconds)
function makePCM(notes, totalSec) {
  const len = Math.ceil(totalSec * SR)
  const mix = new Float32Array(len)

  for (const nd of notes) {
    const s0  = Math.floor(nd.start * SR)
    const ns  = Math.ceil(nd.dur * SR)
    const atk = Math.floor(0.025 * SR)   // 25 ms attack

    for (let i = 0; i < ns; i++) {
      const idx = s0 + i
      if (idx >= len) break
      const t   = i / SR
      // ADSR-lite: quick attack, exponential release
      const env = (i < atk ? i / atk : 1) * Math.exp(-4.5 * i / ns)
      mix[idx] += osc(nd.wave || 'sine', nd.freq, t) * (nd.amp ?? 0.28) * env
    }
  }

  // Normalise to 0.82 peak
  let pk = 0
  for (let i = 0; i < len; i++) if (Math.abs(mix[i]) > pk) pk = Math.abs(mix[i])
  const sc = pk > 0 ? 0.82 / pk : 1

  const pcm = Buffer.alloc(len * 2)
  for (let i = 0; i < len; i++) {
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i] * sc)) * 32767), i * 2)
  }
  return pcm
}

const n = (freq, start, dur, amp = 0.28, wave = 'sine') =>
  ({ freq, start, dur, amp, wave })

// ── Sound definitions ─────────────────────────────────────────────────────────
const SOUNDS = {

  'sale-regular': {
    dur: 1.2,
    notes: [
      n(523,  0.00, 0.50, 0.25),
      n(659,  0.12, 0.50, 0.25),
      n(784,  0.24, 0.50, 0.25),
      n(1047, 0.36, 0.65, 0.30),
    ],
  },

  'sale-executive': {
    dur: 2.2,
    notes: [
      n(392,  0.00, 0.55, 0.24),            n(523,  0.06, 0.55, 0.24, 'triangle'),
      n(523,  0.12, 0.55, 0.24),            n(659,  0.18, 0.55, 0.24, 'triangle'),
      n(659,  0.24, 0.55, 0.24),            n(784,  0.30, 0.55, 0.24, 'triangle'),
      n(1047, 0.48, 1.00, 0.32),
      n(1319, 0.65, 0.80, 0.26),
    ],
  },

  'quota-individual': {
    dur: 2.2,
    notes: [
      n(523,  0.00, 0.65, 0.28),
      n(659,  0.10, 0.65, 0.28),
      n(784,  0.20, 0.65, 0.28),
      n(988,  0.30, 0.65, 0.28),
      n(1047, 0.40, 0.80, 0.30),
      n(1319, 0.55, 1.40, 0.34),
    ],
  },

  'quota-subteam': {
    dur: 2.5,
    notes: [
      n(392,  0.00, 0.65, 0.25, 'square'),
      n(523,  0.09, 0.65, 0.28, 'square'),
      n(659,  0.18, 0.65, 0.30),
      n(880,  0.30, 0.80, 0.32),
      n(1047, 0.45, 1.40, 0.36),
    ],
  },

  'quota-mainteam': {
    dur: 3.0,
    notes: [
      n(392,  0.00, 0.55, 0.25, 'square'),
      n(523,  0.12, 0.55, 0.28, 'square'),
      n(659,  0.24, 0.55, 0.30),
      n(784,  0.36, 0.65, 0.33),
      n(1047, 0.55, 1.70, 0.40),
    ],
  },

  'quota-site': {
    dur: 4.5,
    notes: [
      n(261,  0.00, 1.0, 0.22, 'sawtooth'),
      n(392,  0.00, 1.0, 0.22, 'sawtooth'),
      n(523,  0.00, 1.0, 0.28, 'sawtooth'),
      n(659,  0.18, 1.0, 0.28, 'sawtooth'),
      n(784,  0.35, 1.2, 0.32, 'sawtooth'),
      n(1047, 0.55, 2.0, 0.38),
      n(1319, 0.75, 1.8, 0.32),
      n(1568, 0.95, 1.5, 0.26),
      n(2093, 1.20, 2.5, 0.30),
    ],
  },

  'circle-executive': {
    dur: 2.2,
    notes: [
      n(392,  0.00, 0.55, 0.24),
      n(523,  0.12, 0.55, 0.24, 'triangle'),
      n(523,  0.24, 0.55, 0.24),
      n(659,  0.36, 0.55, 0.24),
      n(1047, 0.48, 1.20, 0.34),
    ],
  },

  'circle-presidents': {
    dur: 3.0,
    notes: [
      n(392,  0.00, 0.70, 0.26),
      n(523,  0.00, 0.70, 0.26),
      n(659,  0.00, 0.70, 0.26),
      n(784,  0.18, 0.90, 0.30),
      n(1047, 0.35, 1.10, 0.33),
      n(1319, 0.55, 1.50, 0.30),
    ],
  },

  'circle-chairmans': {
    dur: 4.0,
    notes: [
      n(523,  0.00, 0.80, 0.28),
      n(659,  0.00, 0.80, 0.28),
      n(784,  0.00, 0.80, 0.28),
      n(1047, 0.20, 1.00, 0.32),
      n(1319, 0.35, 1.00, 0.30),
      n(1568, 0.50, 1.20, 0.28),
      n(2093, 0.70, 2.20, 0.36),
    ],
  },

  'electric-car': {
    dur: 2.5,
    notes: [
      n(220,  0.00, 0.30, 0.20, 'sawtooth'),
      n(440,  0.10, 0.30, 0.22, 'sawtooth'),
      n(880,  0.20, 0.40, 0.24, 'sawtooth'),
      n(1760, 0.32, 0.60, 0.26),
      n(2200, 0.55, 1.20, 0.24),
    ],
  },

  'coin-collect': {
    dur: 0.65,
    notes: [
      n(1047, 0.00, 0.20, 0.22),
      n(1319, 0.04, 0.20, 0.22),
      n(1568, 0.08, 0.22, 0.22),
      n(2093, 0.13, 0.28, 0.22),
    ],
  },

  'siren-alert': {
    dur: 1.1,
    notes: [
      n(880, 0.00, 0.15, 0.32, 'sawtooth'),
      n(440, 0.16, 0.15, 0.32, 'sawtooth'),
      n(880, 0.32, 0.15, 0.32, 'sawtooth'),
      n(440, 0.48, 0.15, 0.32, 'sawtooth'),
    ],
  },

  'countdown-tick': {
    dur: 0.18,
    notes: [n(880, 0, 0.05, 0.14)],
  },

  'firework-burst': {
    dur: 0.55,
    notes: [
      n(200, 0.00, 0.06, 0.42, 'sawtooth'),
      n(150, 0.02, 0.09, 0.32, 'sawtooth'),
      n(100, 0.04, 0.14, 0.22, 'sawtooth'),
    ],
  },
}

// ── Write files ───────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'sounds')
fs.mkdirSync(outDir, { recursive: true })

let total = 0
for (const [key, def] of Object.entries(SOUNDS)) {
  const pcm  = makePCM(def.notes, def.dur)
  const file = Buffer.concat([wavHeader(pcm.length), pcm])
  fs.writeFileSync(path.join(outDir, `${key}.wav`), file)
  total += file.length
  console.log(`  ✓  ${key}.wav   (${(file.length / 1024).toFixed(0)} KB)`)
}
console.log(`\n${Object.keys(SOUNDS).length} files · ${(total / 1024).toFixed(0)} KB total → public/sounds/`)
