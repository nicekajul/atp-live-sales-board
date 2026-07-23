import { useState, useEffect, useRef } from 'react'
import Avatar   from './Avatar.jsx'
import QuotaBar from './QuotaBar.jsx'
import { TIER_COLORS } from '../constants/tiers.js'

function useAutoScroll(dep) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let pos = 0, paused = false, timer = null, raf

    const tick = () => {
      if (!paused && el.scrollHeight > el.clientHeight) {
        pos += 0.25
        const max = el.scrollHeight - el.clientHeight
        if (pos >= max) {
          pos = max
          paused = true
          timer = setTimeout(() => { pos = 0; el.scrollTop = 0; paused = false }, 1800)
        } else {
          el.scrollTop = pos
        }
      }
      raf = requestAnimationFrame(tick)
    }

    const startTimer = setTimeout(() => { raf = requestAnimationFrame(tick) }, 1000)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(startTimer) }
  }, [dep])
  return ref
}

function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function TierBadge({ tier }) {
  if (!tier) return null
  const color = TIER_COLORS[tier] || '#6B7280'
  const short = tier === 'Sales Manager'        ? 'SM'
               : tier === 'Sales Director'       ? 'SD'
               : tier === 'CEO'                  ? 'CEO'
               : tier === 'CFO'                  ? 'CFO'
               : tier === 'Asst. Sales Director' ? 'ASD'
               : tier.replace('Tier ', 'T')
  return (
    <span
      className="inline-block font-barlow font-bold px-2 py-0.5 rounded leading-none"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55`, fontSize: 13 }}
    >
      {short}
    </span>
  )
}

// Visual podium order: index 0 = 2nd (left), 1 = 1st (centre), 2 = 3rd (right)
// Base sizes are designed for ~520px container height; scale factor shrinks them on smaller screens
const SLOTS = [
  { rank: 2, color: '#C0C0C0', glow: 'rgba(192,192,192,0.5)', platformH: 130, avatarSize: 96,  namePx: 28, amtPx: 26 },
  { rank: 1, color: '#FFD700', glow: 'rgba(255,215,0,0.65)',  platformH: 160, avatarSize: 136, namePx: 40, amtPx: 32 },
  { rank: 3, color: '#CD7F32', glow: 'rgba(205,127,50,0.45)', platformH: 90,  avatarSize: 82,  namePx: 22, amtPx: 22 },
]
const BASE_H = 520 // px height the above values are designed for

function YetToSellPanel({ entries = [] }) {
  const scrollRef = useAutoScroll(entries.length)
  if (!entries.length) return null
  return (
    <div className="flex-shrink-0 pt-3 mt-3 border-t border-board-border/50">
      <div className="font-barlow font-bold text-sm text-gray-600 uppercase tracking-widest mb-2">
        ⏳ Yet to Sell <span className="text-gray-700 text-xs">({entries.length})</span>
      </div>
      <div ref={scrollRef} className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {entries.map(entry => {
          const color = entry.teamColor || '#6B7280'
          return (
            <div
              key={entry.id}
              className="flex items-center gap-2 rounded-lg px-3 py-2 opacity-50"
              style={{ background: '#0B0F1E', border: '1px solid #1E2A45' }}
            >
              <Avatar photoUrl={entry.photo_url} name={entry.name} size={28} teamColor={color} />
              <div className="flex-1 min-w-0">
                <div className="font-barlow font-bold text-xs text-gray-400 truncate">{entry.name}</div>
                {entry.teamName && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="font-inter text-xs text-gray-600 truncate">{entry.teamName}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PodiumStage({ entries = [], currency = 'PHP', othersTitle = 'OTHERS', sidePanel, yetToSell = [] }) {
  // Only show agents who have at least one sale
  const active = entries.filter(e => e.total > 0)
  const top3   = active.slice(0, 3)
  const rest   = active.slice(3)

  // Remap sorted entries to visual slots: [2nd, 1st, 3rd]
  const slotEntries = [top3[1] || null, top3[0] || null, top3[2] || null]

  // Scale all podium sizes proportionally to available height
  const othersScrollRef = useAutoScroll(rest.length)
  const podiumRef = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = podiumRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setScale(Math.min(1, e.contentRect.height / BASE_H))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = (n) => Math.max(1, Math.round(n * scale))

  return (
    <div className="h-full flex gap-4 min-h-0">

      {/* ── PODIUM ─────────────────────────────────────────────── */}
      <div ref={podiumRef} className="flex-1 min-h-0 flex flex-col min-w-0">

        {/* Three equal-width slots */}
        <div className="flex-1 min-h-0 flex items-stretch gap-3 px-3">
          {SLOTS.map((slot, si) => {
            const entry    = slotEntries[si]
            const entColor = entry?.teamColor || slot.color
            const pct      = entry?.quota > 0
              ? Math.min(100, Math.round((entry.total / entry.quota) * 100))
              : null

            return (
              <div key={slot.rank} className="flex-1 min-w-0 flex flex-col items-center">

                {/* Card area — content pinned to bottom, clips if tight */}
                <div className="flex-1 min-h-0 flex flex-col justify-end items-center overflow-hidden w-full pb-2 px-2">
                  {entry ? (
                    <>
                      {/* Avatar with medal glow */}
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{
                          padding:   slot.rank === 1 ? s(6) : s(4),
                          background:`${slot.color}28`,
                        }}
                      >
                        <Avatar
                          photoUrl={entry.photo_url}
                          name={entry.name}
                          size={s(slot.avatarSize)}
                          teamColor={entColor}
                        />
                      </div>

                      {/* Name + team */}
                      <div className="text-center w-full flex-shrink-0 space-y-1" style={{ marginTop: s(12) }}>
                        <div
                          className="font-barlow font-bold text-white leading-tight"
                          style={{ fontSize: s(slot.namePx) }}
                        >
                          {entry.name}
                        </div>
                        {entry.teamName && (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entColor }} />
                            <span className="font-inter text-gray-400 truncate" style={{ fontSize: s(13) }}>{entry.teamName}</span>
                          </div>
                        )}
                      </div>

                      {/* Tier badge */}
                      {entry.tier && (
                        <div className="flex-shrink-0" style={{ marginTop: s(6) }}>
                          <TierBadge tier={entry.tier} />
                        </div>
                      )}

                      {/* MTD / daily total */}
                      <div
                        className="font-barlow font-bold leading-none flex-shrink-0 tabular-nums"
                        style={{ color: entColor, fontSize: s(slot.amtPx), marginTop: s(8) }}
                      >
                        {fmt(entry.total, currency)}
                      </div>

                      {/* Slim quota bar */}
                      {entry.quota > 0 && (
                        <div className="w-full flex-shrink-0" style={{ paddingLeft: s(16), paddingRight: s(16), marginTop: s(10) }}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <QuotaBar
                                current={entry.total}
                                quota={entry.quota}
                                color={entColor}
                                size="sm"
                                showLabel={false}
                                currency={currency}
                              />
                            </div>
                            <span
                              className="font-barlow font-bold whitespace-nowrap flex-shrink-0"
                              style={{ color: entColor, fontSize: s(11) }}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 opacity-15 pb-2">
                      <div className="rounded-full bg-gray-800" style={{ width: s(slot.avatarSize), height: s(slot.avatarSize) }} />
                      <div className="font-barlow font-bold text-gray-700 text-2xl">—</div>
                    </div>
                  )}
                </div>

                {/* Platform — scales with container height */}
                <div
                  className="w-full rounded-t-xl flex-shrink-0 flex items-center justify-center"
                  style={{
                    height:       s(slot.platformH),
                    background:   entry
                      ? `linear-gradient(180deg, ${slot.color}30 0%, ${slot.color}0A 100%)`
                      : 'rgba(30,42,69,0.25)',
                    border:       `2px solid ${slot.color}${entry ? '55' : '15'}`,
                    borderBottom: 'none',
                  }}
                >
                  <span
                    className="font-barlow font-bold select-none leading-none"
                    style={{
                      color:    `${slot.color}${entry ? '38' : '12'}`,
                      fontSize: slot.rank === 1 ? s(80) : s(58),
                    }}
                  >
                    #{slot.rank}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Stage floor */}
        <div
          className="mx-3 h-3 rounded-sm flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #111827 0%, #1F2D45 40%, #263350 50%, #1F2D45 60%, #111827 100%)' }}
        />
      </div>

      {/* ── RIGHT SIDE PANEL ───────────────────────────────────── */}
      {sidePanel ? (
        <div className="w-80 flex-shrink-0 border-l border-board-border pl-4 min-h-0 flex flex-col overflow-y-auto">
          {sidePanel}
          <YetToSellPanel entries={yetToSell} />
        </div>
      ) : (rest.length > 0 || yetToSell.length > 0) && (
        <div className="w-80 flex-shrink-0 border-l border-board-border pl-4 min-h-0 flex flex-col gap-3 pt-4">
          <div className="font-barlow font-bold text-sm text-gray-500 uppercase tracking-widest flex-shrink-0">
            {othersTitle} <span className="text-gray-700 text-xs">({rest.length})</span>
          </div>

          <div ref={othersScrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {rest.map((entry, i) => {
              const color = entry.teamColor || '#6B7280'
              const pct   = entry.quota > 0
                ? Math.min(999, Math.round((entry.total / entry.quota) * 100))
                : null
              return (
                <div
                  key={entry.id}
                  className="rounded-xl px-3 py-2.5"
                  style={{ background: `${color}0C`, border: `1px solid ${color}28` }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-barlow font-black text-sm text-gray-500 w-5 text-center flex-shrink-0">
                      {i + 4}
                    </span>
                    <Avatar photoUrl={entry.photo_url} name={entry.name} size={36} teamColor={color} />
                    <div className="flex-1 min-w-0">
                      <div className="font-barlow font-bold text-sm text-white leading-tight truncate">{entry.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {entry.tier && <TierBadge tier={entry.tier} />}
                        {entry.teamName && (
                          <span className="font-inter text-xs text-gray-500 truncate">{entry.teamName}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-barlow font-bold text-sm whitespace-nowrap flex-shrink-0" style={{ color }}>
                      {fmt(entry.total, currency)}
                    </span>
                  </div>

                  {entry.quota > 0 && (
                    <div className="flex items-center gap-2 pl-7">
                      <div className="flex-1">
                        <QuotaBar current={entry.total} quota={entry.quota} color={color} size="sm" showLabel={false} currency={currency} />
                      </div>
                      {pct !== null && (
                        <span className="font-barlow font-bold text-xs whitespace-nowrap" style={{ color }}>
                          {pct}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <YetToSellPanel entries={yetToSell} />
        </div>
      )}
    </div>
  )
}
