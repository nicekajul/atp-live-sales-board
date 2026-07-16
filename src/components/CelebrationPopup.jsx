import { useEffect, useRef, useState, useMemo } from 'react'
import Avatar            from './Avatar.jsx'
import { effectsEngine } from '../utils/EffectsEngine.js'
import { soundManager }  from '../utils/SoundManager.js'
import { TIER_COLORS }   from '../constants/tiers.js'

// ── Inject popup-specific keyframes once at module load ───────────────────────
// These are used via inline `style={{ animation }}` with custom delays,
// so Tailwind's JIT won't emit them — we add them manually.
;(function injectKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('popup-kf')) return
  const s = document.createElement('style')
  s.id = 'popup-kf'
  s.textContent = `
    @keyframes popup-ring-expand {
      0%   { transform:scale(1);   opacity:.7 }
      100% { transform:scale(2.8); opacity:0  }
    }
    @keyframes popup-slide-up {
      from { transform:translateY(22px); opacity:0 }
      to   { transform:translateY(0);   opacity:1 }
    }
    @keyframes popup-slam-top {
      0%   { transform:translateY(-60px) scale(.85); opacity:0 }
      65%  { transform:translateY(5px)  scale(1.04); opacity:1 }
      100% { transform:translateY(0)    scale(1);   opacity:1 }
    }
    @keyframes popup-shake {
      0%,100% { transform:translate(0,0) }
      20%     { transform:translate(-7px,2px) }
      40%     { transform:translate(7px,-2px) }
      60%     { transform:translate(-4px,1px) }
      80%     { transform:translate(4px,-1px) }
    }
    @keyframes popup-float-up {
      0%   { transform:translateY(0) scale(1);    opacity:.75 }
      100% { transform:translateY(-110px) scale(.2); opacity:0   }
    }
    @keyframes popup-stripe {
      from { transform:translateX(-100%) }
      to   { transform:translateX(300%)  }
    }
    @keyframes popup-spotlight {
      0%,100% { opacity:.45; transform:scale(1)    }
      50%     { opacity:.9;  transform:scale(1.07) }
    }
    @keyframes popup-zoom {
      0%   { transform:scale(.2);  opacity:0 }
      65%  { transform:scale(1.1); opacity:1 }
      100% { transform:scale(1);   opacity:1 }
    }
    @keyframes popup-t5 {
      0%,100% { box-shadow:0 0 80px rgba(255,215,0,.35),0 0 160px rgba(255,215,0,.1) }
      50%     { box-shadow:0 0 120px rgba(255,215,0,.55),0 0 240px rgba(255,215,0,.2) }
    }
    @keyframes popup-team-pulse {
      0%,100% { opacity:0 }
      10%,90% { opacity:.06 }
      50%     { opacity:.14 }
    }
    @keyframes popup-scale-in {
      0%   { opacity:0; transform:scale(.6) }
      60%  { transform:scale(1.08) }
      100% { opacity:1; transform:scale(1) }
    }
    @keyframes popup-car-enter {
      0%   { transform:translateX(120%) scale(.8); opacity:0 }
      70%  { transform:translateX(-4%) scale(1.04); opacity:1 }
      100% { transform:translateX(0) scale(1); opacity:1 }
    }
    @keyframes popup-shake-loop {
      0%,100% { transform:translate(0,0) rotate(0deg) }
      15%     { transform:translate(-5px,2px) rotate(-0.3deg) }
      30%     { transform:translate(5px,-2px) rotate(0.3deg) }
      45%     { transform:translate(-3px,1px) rotate(-0.2deg) }
      60%     { transform:translate(3px,-1px) rotate(0.2deg) }
      75%     { transform:translate(-2px,1px) rotate(0deg) }
    }
  `
  document.head.appendChild(s)
})()

const SOUND_KEY    = 'salesboard_sound'
const BASE_SECS    = 12
const T5_PHASE1_MS = 1500   // blackout → reveal
const T5_PHASE2_MS = 3000   // reveal → celebration (countdown starts here too)
const T5_DELAY_MS  = T5_PHASE2_MS

// ── Utilities ──────────────────────────────────────────────────────────────────
function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function useSound() {
  const [on, setOn] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off')
  const toggle = () => setOn(v => {
    const next = !v
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
    return next
  })
  return [on, toggle]
}

function getTier(cel) {
  if (!cel) return 1
  if (cel.frankiSnapshot)                                return 'executive'
  if (cel.siteQuotaJustHit)                             return 5
  if (cel.mainTeamQuotaJustHit || cel.teamQuotaJustHit) return 4
  if (cel.subTeamQuotaJustHit)                          return 3
  if (cel.individualQuotaJustHit)                       return 2
  return 1
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function CountUp({ to, currency = 'PHP', duration = 550 }) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const start = performance.now()
    const tick  = now => {
      const p = Math.min((now - start) / duration, 1)
      const e = 1 - (1 - p) ** 3
      setVal(Math.round(to * e))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [to, duration])
  return <>{currency} {Number(val).toLocaleString()}</>
}

function TierBadge({ tier }) {
  if (!tier) return null
  const color = TIER_COLORS[tier] || '#6B7280'
  const short = tier === 'Sales Manager'        ? 'SM'
              : tier === 'Sales Director'       ? 'SD'
              : tier === 'Asst. Sales Director' ? 'ASD'
              : tier === 'CEO'                  ? 'CEO'
              : tier === 'CFO'                  ? 'CFO'
              : tier.replace('Tier ', 'T')
  return (
    <span className="inline-block font-barlow font-bold px-2 py-0.5 rounded leading-none text-xs"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {short}
    </span>
  )
}

function Bar({ secs, total, color }) {
  return (
    <div className="w-full mt-auto pt-3">
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${(secs / total) * 100}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="text-center text-xs text-gray-700 mt-1 font-inter">
        tap to dismiss · {secs}s
      </div>
    </div>
  )
}

// Photo with glow ring, optional ring pulse, optional expanding ripple rings
function RingAvatar({ photo_url, name, size, color, rings = 0, pulse = false, ripple = false }) {
  const pad  = Math.max(5, Math.round(size * 0.055))
  const glow = size * 0.38
  return (
    <div className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size + (pad + glow) * 2, height: size + (pad + glow) * 2 }}>
      {/* Expanding rings behind photo */}
      {ripple && Array.from({ length: rings }, (_, i) => (
        <div key={i} className="absolute rounded-full border-2 pointer-events-none"
          style={{
            borderColor: color,
            inset:       0,
            animation:   `popup-ring-expand 2.2s ease-out ${i * 0.55}s infinite`,
            opacity:     0,
          }}
        />
      ))}
      {/* Glow ring + photo */}
      <div style={{
        padding:      pad,
        borderRadius: '50%',
        background:   `${color}24`,
        boxShadow:    `0 0 ${glow}px ${color}70, 0 0 ${glow * 0.4}px ${color}45`,
        animation:    pulse ? 'gold-pulse 2s ease-in-out infinite' : undefined,
      }}>
        <Avatar photoUrl={photo_url} name={name} size={size} teamColor={color} />
      </div>
    </div>
  )
}

// Sub-team member avatar row (for T3)
function SubTeamRow({ members = [], color }) {
  if (!members.length) return null
  return (
    <div className="w-full">
      <div className="text-xs font-barlow font-bold text-gray-600 uppercase tracking-widest text-center mb-2">
        The Team
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {members.slice(0, 10).map((m, i) => (
          <div key={m.id || i} className="flex flex-col items-center gap-0.5"
            style={{ animation: `popup-slide-up 0.35s ease-out ${i * 0.07}s both` }}>
            <div className="rounded-full" style={{ border: `2px solid ${color}55`, padding: 2 }}>
              <Avatar photoUrl={m.photo_url} name={m.name} size={32} teamColor={color} />
            </div>
            <span className="text-xs text-gray-500 font-inter">{(m.name || '').split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Animated color stripe (Tier 4)
function ColorStripe({ color }) {
  return (
    <div className="w-full overflow-hidden rounded-full flex-shrink-0"
      style={{ height: 3, background: `${color}18` }}>
      <div className="h-full rounded-full animate-stripe-sweep"
        style={{ width: '35%', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </div>
  )
}

// Champagne bubble particles (Executive)
function ChampagneBubbles({ color = '#FFD700' }) {
  const bubbles = useMemo(() => Array.from({ length: 10 }, () => ({
    left:  10 + Math.random() * 80,
    delay: Math.random() * 3,
    size:  3  + Math.random() * 7,
    dur:   1.8 + Math.random() * 1.5,
  })), [])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: 'inherit' }}>
      {bubbles.map((b, i) => (
        <div key={i} className="absolute bottom-4 rounded-full animate-float-up"
          style={{
            left:             `${b.left}%`,
            width:            b.size, height: b.size,
            background:       `${color}45`,
            border:           `1px solid ${color}70`,
            animationDelay:   `${b.delay}s`,
            animationDuration:`${b.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── TIER CARD BODIES ──────────────────────────────────────────────────────────

function T1Body({ snap, teamColor, currency, countdown }) {
  const c = teamColor
  return <>
    <RingAvatar photo_url={snap.photo_url} name={snap.name} size={120} color={c} rings={1} ripple />
    <div className="text-center animate-slide-down">
      <div className="font-barlow font-black text-4xl text-white leading-tight">{snap.name}</div>
      <div className="font-inter text-sm text-gray-500 mt-0.5">{snap.teamName}</div>
      <div className="mt-1.5"><TierBadge tier={snap.tier} /></div>
    </div>
    <div className="text-center" style={{ animation: 'popup-slam-top 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
      <div className="font-barlow font-black leading-none" style={{ fontSize: 60, color: c, textShadow: `0 0 40px ${c}80` }}>
        +<CountUp to={snap.saleAmount} currency={currency} />
      </div>
      <div className="font-barlow font-bold text-sm mt-1" style={{ color: `${c}88` }}>SALE!</div>
      <div className="font-inter text-xs text-gray-600 mt-1">
        MTD <span className="font-bold text-gray-400">{fmt(snap.mtdTotal, currency)}</span>
      </div>
    </div>
    <Bar secs={countdown} total={BASE_SECS} color={c} />
  </>
}

function T2Body({ snap, teamColor, currency, countdown }) {
  const gold = '#FFD700'
  return <>
    <RingAvatar photo_url={snap.photo_url} name={snap.name} size={130} color={gold} rings={1} pulse ripple />
    <div className="text-center animate-slide-down">
      <div className="font-barlow font-black text-4xl text-white">{snap.name}</div>
      <div className="font-inter text-xs text-gray-500 mt-0.5">{snap.teamName}</div>
      <div className="mt-1"><TierBadge tier={snap.tier} /></div>
    </div>
    <div className="text-center" style={{ animation: 'popup-slam-top 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
      <div className="font-barlow font-black leading-none" style={{ fontSize: 60, color: gold, textShadow: `0 0 40px ${gold}80` }}>
        +<CountUp to={snap.saleAmount} currency={currency} />
      </div>
    </div>
    {/* Quota Crusher banner — slides in after a short delay */}
    <div className="w-full rounded-xl py-3 px-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${gold}15, ${gold}06)`,
        border:     `1px solid ${gold}45`,
        animation:  'popup-slide-up 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.55s both',
      }}>
      <div className="font-barlow font-black text-xl" style={{ color: gold, textShadow: `0 0 18px ${gold}60` }}>
        🏆 QUOTA CRUSHER!
      </div>
      <div className="font-inter text-sm text-gray-400 mt-1">
        {snap.name} hit their personal quota!
      </div>
    </div>
    <div className="font-inter text-xs text-gray-600">
      MTD <span className="font-bold text-gray-400">{fmt(snap.mtdTotal, currency)}</span>
    </div>
    <Bar secs={countdown} total={BASE_SECS} color={gold} />
  </>
}

function T3Body({ snap, teamColor, currency, countdown, celebration }) {
  const c         = teamColor
  const stName    = celebration.subTeamName  || snap.teamName
  const stQuota   = celebration.subTeamQuota || 0
  const stTotal   = celebration.subTeamTotal || snap.mtdTotal
  const members   = celebration.subTeamMembers || []
  return <>
    <RingAvatar photo_url={snap.photo_url} name={snap.name} size={130} color={c} rings={2} ripple />
    <div className="text-center animate-slide-down">
      <div className="font-barlow font-black text-4xl text-white">{snap.name}</div>
      <div className="font-inter text-xs mt-0.5" style={{ color: `${c}99` }}>{snap.teamName}</div>
    </div>
    <div className="text-center" style={{ animation: 'popup-slam-top 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
      <div className="font-barlow font-black leading-none" style={{ fontSize: 56, color: c, textShadow: `0 0 40px ${c}80` }}>
        +<CountUp to={snap.saleAmount} currency={currency} />
      </div>
    </div>
    {/* Sub-team quota banner */}
    <div className="w-full rounded-xl py-3 px-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${c}18, ${c}06)`,
        border:     `1px solid ${c}50`,
        animation:  'popup-slide-up 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.45s both',
      }}>
      <div className="font-barlow font-black text-xl leading-tight" style={{ color: c, textShadow: `0 0 18px ${c}55` }}>
        🔥 SUB TEAM {stName.toUpperCase()} HITS{stQuota > 0 ? ` ${fmt(stQuota, currency)}!` : ' QUOTA!'}
      </div>
    </div>
    {/* Team avatars */}
    <div style={{ animation: 'popup-slide-up 0.45s ease-out 0.7s both' }}>
      <SubTeamRow members={members} color={c} />
    </div>
    <div className="font-inter text-xs text-gray-600">
      MTD <span className="font-bold text-gray-400">{fmt(snap.mtdTotal, currency)}</span>
    </div>
    <Bar secs={countdown} total={BASE_SECS} color={c} />
  </>
}

function T4Body({ snap, teamColor, currency, countdown, celebration }) {
  const c          = teamColor
  const mainName   = celebration.mainTeamName  || snap.teamName
  const mainQuota  = celebration.mainTeamQuota || 0
  const mainTotal  = celebration.mainTeamTotal || 0
  return <>
    {/* Team color pulse overlay */}
    <div className="absolute inset-0 pointer-events-none rounded-2xl animate-team-pulse"
      style={{ background: c, animationFillMode: 'both' }} />
    <RingAvatar photo_url={snap.photo_url} name={snap.name} size={150} color={c} rings={3} ripple />
    <div className="text-center w-full" style={{ animation: 'popup-slam-top 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
      <div className="font-barlow font-black leading-none" style={{ fontSize: 28, color: c, textShadow: `0 0 30px ${c}80` }}>
        💥 TEAM {mainName.toUpperCase()} HITS QUOTA!
      </div>
      {mainQuota > 0 && (
        <div className="font-inter text-sm mt-1" style={{ color: `${c}88` }}>
          {fmt(mainTotal, currency)} / {fmt(mainQuota, currency)}
        </div>
      )}
    </div>
    <ColorStripe color={c} />
    <div className="text-center" style={{ animation: 'popup-slide-up 0.45s ease-out 0.5s both' }}>
      <div className="font-barlow font-black leading-none" style={{ fontSize: 56, color: c, textShadow: `0 0 40px ${c}80` }}>
        +<CountUp to={snap.saleAmount} currency={currency} />
      </div>
      <div className="font-barlow font-black text-2xl text-white mt-1 animate-slide-down">{snap.name}</div>
      <div className="font-inter text-xs text-gray-600 mt-1">
        MTD <span className="font-bold text-gray-400">{fmt(snap.mtdTotal, currency)}</span>
      </div>
    </div>
    <Bar secs={countdown} total={BASE_SECS} color={c} />
  </>
}

// ── TIER 5 — full-screen 3-phase sequence ────────────────────────────────────
function T5FullScreen({ snap, currency, countdown, phase, celebration }) {
  const gold      = '#FFD700'
  const siteQ     = celebration.siteQuotaAmount || 0
  const siteTotal = celebration.siteTotal       || 0

  // Shared ATP logo — horizontal variant
  const ATPHorizontalLogo = ({ width = 480 }) => (
    <img
      src="/logos/atp-horizontal.png"
      alt="Author's Tranquility Press"
      style={{ width, height: 'auto', objectFit: 'contain' }}
    />
  )


  // Phase 0 — BLACKOUT + BUILDUP
  if (phase === 0) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8"
      style={{ background: '#000000', zIndex: 100 }}>
      {/* Spotlight behind logo */}
      <div className="flex items-center justify-center animate-spotlight-breathe"
        style={{ background: 'radial-gradient(circle at center, rgba(255,215,0,0.10) 0%, transparent 65%)', width: 520, height: 220, borderRadius: 24 }}>
        <ATPHorizontalLogo width={420} />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="font-barlow font-bold text-2xl tracking-widest uppercase text-gray-500 text-center animate-fade-in"
          style={{ animationFillMode: 'both' }}>
          The moment we've all been waiting for…
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="rounded-full animate-pulse"
              style={{ width: 8, height: 8, background: '#FFD70060', animationDelay: `${i * 0.25}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  // Phase 1 — THE REVEAL
  if (phase === 1) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 animate-screen-shake"
      style={{ background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.18) 0%, #000 60%)', zIndex: 100 }}>
      <div className="animate-zoom-dramatic">
        <ATPHorizontalLogo width={560} />
      </div>
      <div className="text-center px-8"
        style={{ animation: 'popup-slam-top 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}>
        <div className="font-barlow font-black text-5xl leading-tight"
          style={{ color: gold, textShadow: `0 0 60px ${gold}` }}>
          🌟 WHOLE SITE HITS{siteQ > 0 ? ` ${fmt(siteQ, currency)}!` : ' QUOTA!'} 🌟
        </div>
      </div>
    </div>
  )

  // Phase 2 — CELEBRATION
  // Background layer handles box-shadow pulse; inner layer handles flex centering + shake
  // Keeping them separate ensures transforms don't displace the centered layout
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.12) 0%, #060A16 65%)', zIndex: 100, animation: 'popup-t5 2.5s ease-in-out infinite' }}>

      {/* Content group — shake applies here so it never displaces the centering container */}
      <div className="flex flex-col items-center gap-6 px-8 py-8"
        style={{ animation: 'popup-shake-loop 3s ease-in-out 1s infinite' }}>

        {/* Horizontal logo */}
        <div style={{ animation: 'popup-zoom 0.85s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <ATPHorizontalLogo width={620} />
        </div>

        {/* Site achievement */}
        <div className="text-center" style={{ animation: 'popup-slam-top 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
          <div className="font-barlow font-bold leading-none tabular-nums" style={{ fontSize: 80, color: gold }}>
            {fmt(siteTotal, currency)}
          </div>
          {siteQ > 0 && (
            <div className="font-inter text-base text-gray-400 mt-2">
              Site Quota <span className="font-bold text-gray-200">{fmt(siteQ, currency)}</span>
            </div>
          )}
        </div>

        <div className="max-w-2xl w-full rounded-xl py-4 px-8 text-center"
          style={{ background: `linear-gradient(90deg, #92650020, #FFD70028, #92650020)`, border: '1px solid #FFD70055', animation: 'popup-slide-up 0.5s ease-out 0.4s both' }}>
          <div className="font-barlow font-black text-3xl animate-pulse" style={{ color: gold }}>
            🎊 EVERYONE ON THE FLOOR WINS! 🎊
          </div>
        </div>

        <Bar secs={countdown} total={BASE_SECS} color={gold} />
      </div>
    </div>
  )
}

// ── Executive / Franki ────────────────────────────────────────────────────────
function ExecBody({ snap, frankiSnapshot, teamColor, currency, countdown }) {
  const gold        = '#FFD700'
  const frankiColor = frankiSnapshot?.teamColor || gold
  const isFranki    = !!frankiSnapshot

  const AgentCard = ({ s, color }) => (
    <div className="flex-1 flex flex-col items-center gap-2 px-3 py-4 rounded-xl"
      style={{ background: `${color}0E`, border: `1.5px solid ${color}35` }}>
      <div style={{ padding: 4, borderRadius: '50%', background: `${color}22`, boxShadow: `0 0 20px ${color}60` }}>
        <Avatar photoUrl={s.photo_url} name={s.name} size={80} teamColor={color} />
      </div>
      <div className="font-barlow font-black text-2xl text-white leading-none text-center">{s.name}</div>
      <div className="font-inter text-xs" style={{ color: `${color}88` }}>{s.teamName}</div>
      <div className="font-barlow font-black text-3xl leading-none" style={{ color, textShadow: `0 0 20px ${color}70` }}>
        +{fmt(s.saleAmount, currency)}
      </div>
    </div>
  )

  return <>
    <ChampagneBubbles color={gold} />
    {/* Header */}
    <div className="font-barlow font-black text-xl tracking-widest uppercase animate-fade-in"
      style={{ color: gold, textShadow: `0 0 20px ${gold}60` }}>
      ✨ FRANKI SALES
    </div>
    {isFranki ? (
      <>
        <div className="flex gap-3 w-full mt-1">
          <AgentCard s={snap}          color={teamColor}   />
          <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
            <div className="h-10 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="font-barlow font-black text-xl" style={{ color: '#00F5A0' }}>×</span>
            <div className="h-10 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <AgentCard s={frankiSnapshot} color={frankiColor} />
        </div>
        <div className="text-center" style={{ animation: 'popup-slam-top 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}>
          <div className="font-inter text-xs text-gray-600 uppercase tracking-widest mb-0.5">Combined</div>
          <div className="font-barlow font-black leading-none" style={{ fontSize: 52, color: gold, textShadow: `0 0 40px ${gold}` }}>
            +<CountUp to={(snap.saleAmount || 0) + (frankiSnapshot.saleAmount || 0)} currency={currency} />
          </div>
        </div>
      </>
    ) : (
      <>
        <RingAvatar photo_url={snap.photo_url} name={snap.name} size={120} color={gold} pulse />
        <div className="text-center animate-slide-down">
          <div className="font-barlow font-black text-4xl text-white">{snap.name}</div>
          <div className="font-inter text-xs mt-0.5" style={{ color: `${teamColor}99` }}>{snap.teamName}</div>
        </div>
        <div className="font-barlow font-black leading-none text-center"
          style={{ fontSize: 56, color: gold, textShadow: `0 0 40px ${gold}80`, animation: 'popup-slam-top 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
          +<CountUp to={snap.saleAmount} currency={currency} />
        </div>
      </>
    )}
    <div className="font-inter text-xs text-gray-600">
      MTD <span className="font-bold text-gray-400">{fmt(snap.mtdTotal, currency)}</span>
    </div>
    <Bar secs={countdown} total={BASE_SECS} color={gold} />
  </>
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CelebrationPopup({ celebration, teamColor = '#00F5A0', currency = 'PHP', onDismiss }) {
  const [countdown,  setCountdown]  = useState(BASE_SECS)
  const [t5Phase,    setT5Phase]    = useState(0)
  const [soundOn,    toggleSound]   = useSound()
  const [paused,     setPaused]     = useState(false)
  const countRef  = useRef(null)
  const t5Timers  = useRef([])   // tracked so they're cleared if celebration changes

  const snap  = celebration?.memberSnapshot || {}
  const tier  = getTier(celebration)
  const isT5  = tier === 5
  const gold  = '#FFD700'

  // Per-tier accent color (used for glow, pill, bar)
  const accent =
    tier === 5 || tier === 2 || tier === 'executive' ? gold : teamColor

  // ── Effects + sounds per tier ──────────────────────────────────────────────
  useEffect(() => {
    if (!celebration) return
    const mobile  = window.innerWidth < 768
    effectsEngine.stop()
    soundManager.stopAll()

    // Clear any previous T5 phase timers
    t5Timers.current.forEach(id => clearTimeout(id))
    t5Timers.current = []

    effectsEngine.runTier(tier, { teamColor, mobile })

    // Sounds
    if (tier === 1) {
      soundManager.play('sale-regular')
      soundManager.play('coin-collect', { volume: 0.5 })

    } else if (tier === 2) {
      soundManager.play('quota-individual')
      soundManager.play('coin-collect', { volume: 0.3 })
      soundManager.after(2000, 'siren-alert')

    } else if (tier === 3) {
      soundManager.play('quota-subteam')
      soundManager.play('siren-alert')
      soundManager.play('coin-collect', { loop: true, volume: 0.4 })

    } else if (tier === 4) {
      soundManager.play('quota-mainteam', { loop: true })
      soundManager.play('siren-alert')
      soundManager.after(300,  'siren-alert')
      soundManager.after(500,  'firework-burst')
      soundManager.after(1200, 'firework-burst')
      soundManager.after(1900, 'firework-burst')

    } else if (tier === 5) {
      setT5Phase(0)
      soundManager.play('quota-site', { loop: true })

      const p1 = setTimeout(() => setT5Phase(1), T5_PHASE1_MS)
      const p2 = setTimeout(() => {
        setT5Phase(2)
        effectsEngine.startT5Phase2(mobile)
        soundManager.play('coin-collect', { loop: true, volume: 0.6 })
        for (let i = 0; i < 4; i++) soundManager.after(i * 300, 'siren-alert')
        const fwId = setInterval(() => soundManager.play('firework-burst'), 1500)
        const fwStop = setTimeout(() => clearInterval(fwId), 12000)
        t5Timers.current.push(fwStop)
      }, T5_PHASE2_MS)
      t5Timers.current.push(p1, p2)

    } else if (tier === 'executive') {
      soundManager.play('sale-executive')
      soundManager.play('coin-collect', { volume: 0.4 })
    }

    return () => {
      t5Timers.current.forEach(id => clearTimeout(id))
      t5Timers.current = []
      effectsEngine.stop()
      soundManager.stopAll(400)
    }
  }, [celebration]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown (starts after T5 buildup, immediately for others) ────────────
  useEffect(() => {
    if (!celebration) return
    const delay = isT5 ? T5_DELAY_MS : 0
    setCountdown(BASE_SECS)
    const tid = setTimeout(() => {
      let rem = BASE_SECS
      countRef.current = setInterval(() => {
        if (paused) return
        rem--; setCountdown(rem)
        if (rem <= 0) { clearInterval(countRef.current); onDismiss() }
      }, 1000)
    }, delay)
    return () => { clearTimeout(tid); clearInterval(countRef.current) }
  }, [celebration]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!celebration) return null

  // ── TIER 5: full-screen takeover (no card) ─────────────────────────────────
  if (isT5) return (
    <>
      <T5FullScreen snap={snap} currency={currency} countdown={countdown}
        phase={t5Phase} celebration={celebration} />
      <SoundButton soundOn={soundOn} toggleSound={toggleSound} />
    </>
  )

  // ── Pill label ─────────────────────────────────────────────────────────────
  const pill =
    tier === 'executive' ? '✨ FRANKI SALE!'
    : tier === 4         ? '💥 TEAM QUOTA HIT'
    : tier === 3         ? '🔥 SUB-TEAM QUOTA HIT'
    : tier === 2         ? '🏆 QUOTA ACHIEVED'
    :                      '💰 SALE LOGGED'

  // ── Per-tier card configuration ────────────────────────────────────────────
  const cardBg =
    tier === 'executive' ? 'linear-gradient(150deg,#1A1400,#0F0C00)'
    : tier === 4         ? `linear-gradient(150deg, #0D1428 0%, ${teamColor}0A 100%)`
    : 'linear-gradient(150deg,#0D1428,#080C1C)'

  const glowBg =
    tier === 'executive' ? `radial-gradient(ellipse at 50% 30%, ${gold}1A 0%, transparent 65%)`
    : tier === 4         ? `radial-gradient(ellipse at 50% 20%, ${teamColor}22 0%, transparent 60%)`
    : tier === 3         ? `radial-gradient(ellipse at 50% 30%, ${teamColor}18 0%, transparent 65%)`
    : tier === 2         ? `radial-gradient(ellipse at 50% 30%, ${gold}14 0%, transparent 65%)`
    :                      `radial-gradient(ellipse at 50% 30%, ${teamColor}12 0%, transparent 65%)`

  const cardBorder = `${accent}55`
  const cardShadow = `0 0 100px ${accent}28, 0 0 40px ${accent}14, 0 30px 70px rgba(0,0,0,0.85)`
  const isWide     = tier === 'executive' && !!celebration.frankiSnapshot
  const shake      = tier === 4

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer"
        style={{ background: 'rgba(4,6,15,0.88)', backdropFilter: 'blur(12px)', zIndex: 100 }}
        onClick={onDismiss}
      >
        {/* Card */}
        <div
          className={`relative flex flex-col items-center gap-4 px-8 py-8 rounded-2xl
            ${isWide ? 'max-w-2xl' : 'max-w-md'} w-full mx-4`}
          style={{
            background: cardBg,
            border: `2px solid ${cardBorder}`,
            boxShadow: cardShadow,
            animation: shake
              ? 'popup-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both, popup-shake 0.55s ease-in-out 0.4s both'
              : 'popup-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Background radial glow */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: glowBg }} />

          {/* Pill */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full font-barlow font-black text-sm uppercase tracking-widest whitespace-nowrap shadow-xl"
            style={{ background: accent, color: '#060A16', boxShadow: `0 0 20px ${accent}80` }}>
            {pill}
          </div>

          {/* Tier body */}
          {tier === 1 && <T1Body snap={snap} teamColor={teamColor} currency={currency} countdown={countdown} />}
          {tier === 2 && <T2Body snap={snap} teamColor={teamColor} currency={currency} countdown={countdown} />}
          {tier === 3 && <T3Body snap={snap} teamColor={teamColor} currency={currency} countdown={countdown} celebration={celebration} />}
          {tier === 4 && <T4Body snap={snap} teamColor={teamColor} currency={currency} countdown={countdown} celebration={celebration} />}
          {tier === 'executive' && (
            <ExecBody snap={snap} frankiSnapshot={celebration.frankiSnapshot}
              teamColor={teamColor} currency={currency} countdown={countdown} />
          )}
        </div>

        <SoundButton soundOn={soundOn} toggleSound={toggleSound} />
      </div>
    </>
  )
}

function SoundButton({ soundOn, toggleSound }) {
  return (
    <button
      className="mt-4 px-4 py-1.5 rounded-full text-xs font-inter border border-gray-800 hover:border-gray-600 transition-all"
      style={{ color: soundOn ? '#6B7280' : '#374151', background: 'rgba(255,255,255,0.03)', zIndex: 101 }}
      onClick={e => { e.stopPropagation(); toggleSound() }}
    >
      {soundOn ? '🔊 Sound ON' : '🔇 Sound OFF'}
    </button>
  )
}
