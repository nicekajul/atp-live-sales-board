import { useEffect, useRef, useState } from 'react'
import Avatar            from './Avatar.jsx'
import { effectsEngine } from '../utils/EffectsEngine.js'
import { soundManager }  from '../utils/SoundManager.js'

const THEMES = {
  "Chairman's Circle": {
    color:   '#F59E0B',
    glow:    'rgba(245,158,11,0.6)',
    label:   '👑 CHAIRMAN\'S CIRCLE',
    icon:    '👑',
    bg:      'linear-gradient(150deg,#1A0F00,#0A0E1A)',
    glowBg:  'radial-gradient(ellipse at center, rgba(245,158,11,0.2) 0%, transparent 65%)',
    tier:    'chairmans',
  },
  "President's Circle": {
    color:   '#06B6D4',
    glow:    'rgba(6,182,212,0.6)',
    label:   '🏅 PRESIDENT\'S CIRCLE',
    icon:    '🏅',
    bg:      'linear-gradient(150deg,#001820,#0A0E1A)',
    glowBg:  'radial-gradient(ellipse at center, rgba(6,182,212,0.18) 0%, transparent 65%)',
    tier:    'presidents',
  },
  "Executive Circle": {
    color:   '#F97316',
    glow:    'rgba(249,115,22,0.6)',
    label:   '🎖 EXECUTIVE CIRCLE',
    icon:    '🎖',
    bg:      'linear-gradient(150deg,#180800,#0A0E1A)',
    glowBg:  'radial-gradient(ellipse at center, rgba(249,115,22,0.15) 0%, transparent 65%)',
    tier:    'executive-circle',
  },
}

const AUTO_DISMISS_MS = 12000
const CAR_DELAY_MS    = 1500  // how long after popup opens to slide car in

export default function IncentiveCelebrationPopup({ upgrade, onDismiss }) {
  const timerRef   = useRef(null)
  const [showCar,  setShowCar]  = useState(false)
  const [carGold,  setCarGold]  = useState(false)
  const [countdown, setCountdown] = useState(Math.round(AUTO_DISMISS_MS / 1000))
  const countRef   = useRef(null)

  useEffect(() => {
    if (!upgrade?.upgraded) return

    const theme = THEMES[upgrade.newCircle] || THEMES['Executive Circle']

    // Visual + sound effects
    effectsEngine.stop()
    soundManager.stopAll()
    effectsEngine.runTier(theme.tier, { teamColor: theme.color })

    const snd =
      upgrade.newCircle === "Chairman's Circle"  ? 'circle-chairmans'
      : upgrade.newCircle === "President's Circle" ? 'circle-presidents'
      : 'circle-executive'
    soundManager.play(snd)

    // Electric car sequence (Chairman's only)
    if (upgrade.isElectricCarQualified) {
      setTimeout(() => {
        setShowCar(true)
        soundManager.play('electric-car')
      }, CAR_DELAY_MS)
      setTimeout(() => setCarGold(true),  CAR_DELAY_MS + 800)
    }

    // Countdown + auto-dismiss
    let rem = Math.round(AUTO_DISMISS_MS / 1000)
    countRef.current = setInterval(() => {
      rem--; setCountdown(rem)
      if (rem <= 0) { clearInterval(countRef.current); onDismiss() }
    }, 1000)

    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(countRef.current)
      effectsEngine.stop()
      soundManager.stopAll(400)
    }
  }, [upgrade]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!upgrade?.upgraded) return null

  const theme   = THEMES[upgrade.newCircle] || THEMES['Executive Circle']
  const { color, glow, label, bg, glowBg } = theme
  const isElec  = upgrade.isElectricCarQualified
  const tierStr = upgrade.newTier ? `TIER ${upgrade.newTier}` : ''

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 110 }}
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background:  bg,
          border:      `2px solid ${color}55`,
          boxShadow:   `0 0 80px ${glow}, 0 0 40px ${glow}55, 0 30px 70px rgba(0,0,0,0.8)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Bg glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: glowBg }} />

        {/* Gold flash overlay for car sequence */}
        {carGold && (
          <div className="absolute inset-0 animate-screen-flash pointer-events-none rounded-2xl"
            style={{ background: `${color}40`, zIndex: 2 }} />
        )}

        <div className="relative px-8 py-8 text-center flex flex-col items-center gap-5">
          {/* Circle label */}
          <div style={{ animation: 'popup-slam-top 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div className="font-barlow font-black text-5xl leading-none"
              style={{ color, textShadow: `0 0 30px ${glow}` }}>
              {label}
            </div>
            {tierStr && (
              <div className="font-barlow font-black text-2xl tracking-widest mt-1" style={{ color: `${color}BB` }}>
                {tierStr}
              </div>
            )}
          </div>

          {/* Agent */}
          {(upgrade.memberPhoto || upgrade.memberName) && (
            <div className="flex flex-col items-center gap-2"
              style={{ animation: 'popup-slide-up 0.4s ease-out 0.2s both' }}>
              <div style={{ padding: 5, borderRadius: '50%', background: `${color}22`, boxShadow: `0 0 30px ${glow}` }}>
                <Avatar photoUrl={upgrade.memberPhoto} name={upgrade.memberName} size={80} teamColor={color} />
              </div>
              <div className="font-barlow font-black text-3xl text-white">{upgrade.memberName}</div>
              <div className="font-barlow font-bold text-lg" style={{ color }}>HAS JUST QUALIFIED!</div>
            </div>
          )}

          {/* Cash incentive */}
          {upgrade.cashIncentive > 0 && (
            <div className="px-6 py-3 rounded-xl font-barlow font-black text-3xl"
              style={{
                background: `${color}18`,
                color,
                border:     `2px solid ${color}45`,
                animation:  'popup-slide-up 0.4s ease-out 0.35s both',
                textShadow: `0 0 20px ${glow}`,
              }}>
              ₱{Number(upgrade.cashIncentive).toLocaleString()} INCENTIVE!
            </div>
          )}

          {/* Perks */}
          {upgrade.incentivesList?.length > 0 && (
            <div className="w-full text-left space-y-1.5"
              style={{ animation: 'popup-slide-up 0.4s ease-out 0.45s both' }}>
              {upgrade.incentivesList.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 font-inter text-sm text-gray-400">
                  <span className="flex-shrink-0" style={{ color }}>✓</span>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          )}

          {/* Electric car — slides in from the right */}
          {isElec && (
            <div className="w-full"
              style={{ animation: showCar ? 'popup-car-enter 0.9s cubic-bezier(0.34,1.56,0.64,1) both' : undefined, opacity: showCar ? 1 : 0 }}>
              <div className="py-4 px-6 rounded-xl text-center"
                style={{ background: '#F59E0B18', border: '2px solid #F59E0B55' }}>
                <div className="text-5xl mb-2">🚗</div>
                <div className="font-barlow font-black text-2xl text-amber-400 animate-pulse">
                  ELECTRIC CAR AWARD!
                </div>
                {upgrade.memberName && (
                  <div className="font-barlow font-black text-xl text-white mt-1">
                    CONGRATULATIONS {upgrade.memberName.toUpperCase()}!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Countdown + dismiss */}
          <div className="w-full flex flex-col items-center gap-3 mt-1">
            <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / (AUTO_DISMISS_MS / 1000)) * 100}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
            </div>
            <button
              onClick={onDismiss}
              className="font-barlow font-bold text-base px-8 py-2 rounded-xl transition-all hover:opacity-80"
              style={{ background: `${color}18`, color, border: `1px solid ${color}45` }}>
              AMAZING! ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
