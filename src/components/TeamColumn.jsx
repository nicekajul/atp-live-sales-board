import { useEffect, useRef } from 'react'
import QuotaBar from './QuotaBar.jsx'
import Avatar   from './Avatar.jsx'
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
      className="inline-block text-xs font-barlow font-bold px-1.5 py-0.5 rounded leading-none"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55`, fontSize: 10 }}
    >
      {short}
    </span>
  )
}

const CIRCLE_BADGE = {
  "Chairman's Circle":  { abbrev: 'CC', color: '#F59E0B' },
  "President's Circle": { abbrev: 'PC', color: '#06B6D4' },
  "Executive Circle":   { abbrev: 'EC', color: '#F97316' },
}

function IncentiveBadge({ level }) {
  if (!level?.circle) return null
  const cfg = CIRCLE_BADGE[level.circle]
  if (!cfg) return null
  return (
    <span
      className="inline-block font-barlow font-bold leading-none px-1 py-0.5 rounded"
      style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}55`, fontSize: 9 }}
    >
      {cfg.abbrev}
    </span>
  )
}

function MemberCard({ m, rank, accentColor, memberTotals, memberTotalsToday, memberQuotas,
                      memberStreaks, memberIncentiveLevels, currency, viewMode }) {
  const total    = viewMode === 'daily' ? (memberTotalsToday[m.id] || 0) : (memberTotals[m.id] || 0)
  const quota    = memberQuotas[m.id] || 0
  const pct      = quota > 0 ? Math.min(999, Math.round((total / quota) * 100)) : null
  const quotaHit = quota > 0 && total >= quota
  const streak   = memberStreaks[m.id] || 0

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}35` }}
    >
      <div className="flex items-center gap-2.5">
        {/* Rank */}
        <div className="font-barlow font-black text-lg text-gray-600 w-6 text-center flex-shrink-0">
          #{rank + 1}
        </div>

        <Avatar photoUrl={m.photo_url} name={m.name} size={42} teamColor={accentColor} />

        <div className="flex-1 min-w-0">
          <div className="font-barlow font-semibold text-base text-white leading-tight truncate">{m.name}</div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <TierBadge tier={m.tier} />
            <IncentiveBadge level={memberIncentiveLevels?.[m.id]} />
            {quotaHit && <span className="text-xs leading-none">🔥</span>}
            {streak >= 3 && <span className="text-xs leading-none" title={`${streak}-day streak`}>⚡</span>}
          </div>
        </div>

        {/* Amount — right side, team color */}
        <div
          className="font-barlow font-bold text-xl flex-shrink-0 tabular-nums"
          style={{ color: accentColor }}
        >
          {fmt(total, currency)}
        </div>
      </div>

      {quota > 0 && (
        <div className="flex items-center gap-1.5 pl-14 mt-1.5">
          <div className="flex-1">
            <QuotaBar current={total} quota={quota} color={accentColor} size="sm" showLabel={false} currency={currency} />
          </div>
          <span className="font-barlow font-bold text-xs whitespace-nowrap" style={{ color: accentColor }}>{pct}%</span>
        </div>
      )}
    </div>
  )
}

export default function TeamColumn({
  team, rank,
  subTeams,       // array of sub-team objects (empty for non-parent teams)
  directMembers,  // members directly in this team (e.g. manager)
  allMembers,     // all members (for looking up sub-team members)
  memberTotals, memberTotalsToday,
  memberQuotas, teamTotal, teamTotalToday, teamQuota,
  subTeamTotals, subTeamTotalsToday, subTeamQuotas,
  memberStreaks, currency, viewMode, memberIncentiveLevels,
}) {
  const color   = team.color || '#00F5A0'
  const isFirst = rank === 0

  const teamDisplayTotal = viewMode === 'daily' ? teamTotalToday : teamTotal
  const pct = teamQuota > 0 ? Math.min(100, (teamDisplayTotal / teamQuota) * 100) : 0

  // Build per-sub-team member lists sorted by total
  const subSections = (subTeams || []).map(st => {
    const stColor   = st.color || color
    const stTotal   = viewMode === 'daily' ? (subTeamTotalsToday?.[st.id] || 0) : (subTeamTotals?.[st.id] || 0)
    const stQuota   = subTeamQuotas?.[st.id] || 0
    const stPct     = stQuota > 0 ? Math.min(100, (stTotal / stQuota) * 100) : 0
    const allSt = (allMembers || [])
      .filter(m => String(m.team_id) === String(st.id))
      .map(m => ({ ...m, _total: viewMode === 'daily' ? (memberTotalsToday[m.id] || 0) : (memberTotals[m.id] || 0) }))
      .sort((a, b) => b._total - a._total)
    const sellers    = allSt.filter(m => m._total > 0)
    const yetToSell  = allSt.filter(m => m._total === 0)

    return { st, stColor, stTotal, stQuota, stPct, sellers, yetToSell }
  })

  // Direct members (e.g. manager) sorted by total
  const sortedDirect = (directMembers || [])
    .map(m => ({ ...m, _total: viewMode === 'daily' ? (memberTotalsToday[m.id] || 0) : (memberTotals[m.id] || 0) }))
    .sort((a, b) => b._total - a._total)

  // Compute YTS list up-front so we can use its length as auto-scroll dep
  const allYetToSell = [
    ...subSections.flatMap(({ yetToSell, stColor, st }) =>
      yetToSell.map(m => ({ ...m, _stColor: stColor, _stName: st.name }))
    ),
    ...sortedDirect
      .filter(m => m._total === 0)
      .map(m => ({ ...m, _stColor: color, _stName: team.name })),
  ]

  const totalSellers = subSections.reduce((n, s) => n + s.sellers.length, 0) + sortedDirect.filter(m => m._total > 0).length
  const sellersScrollRef = useAutoScroll(totalSellers)
  const ytsScrollRef     = useAutoScroll(allYetToSell.length)

  const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
  const RANK_LABELS = ['#1', '#2', '#3']

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden border relative"
      style={{
        borderColor: isFirst ? `${color}80` : '#1E2A45',
        background:  '#0B0F1E',
        boxShadow:   'none',
      }}
    >
      {/* ── Parent team header ── */}
      <div
        className="px-3 py-1.5 relative flex-shrink-0"
        style={{
          background:   `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
          borderBottom: `1px solid ${color}55`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="font-barlow font-bold text-base tracking-wide flex-1 min-w-0 truncate" style={{ color }}>
            {team.name.toUpperCase()}
          </div>
          <div className="font-barlow font-bold text-2xl tabular-nums flex-shrink-0" style={{ color }}>
            {fmt(teamDisplayTotal, currency)}
          </div>
          <div
            className="font-barlow font-bold text-sm px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: `${color}22`,
              color:      RANK_COLORS[rank] || color,
              border:     `1px solid ${(RANK_COLORS[rank] || color)}55`,
            }}
          >
            {RANK_LABELS[rank] || `#${rank + 1}`}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1">
            <QuotaBar current={teamDisplayTotal} quota={teamQuota} color={color} size="sm" showLabel={false} currency={currency} />
          </div>
          <span className="font-barlow font-bold text-xs flex-shrink-0" style={{ color: `${color}99` }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex-1 min-h-0 flex gap-2 px-2 py-2">

        {/* Left: sellers grouped by sub-team */}
        <div ref={sellersScrollRef} className="flex-1 min-w-0 overflow-y-auto space-y-3 pr-1">
          {subSections.map(({ st, stColor, stTotal, stQuota, stPct, sellers }) => (
            <div key={st.id}>
              {/* Sub-team header */}
              <div
                className="flex items-center justify-between px-2 py-1 rounded-lg mb-1.5"
                style={{ background: `${stColor}12`, borderLeft: `3px solid ${stColor}` }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stColor }} />
                  <span className="font-barlow font-bold text-xs tracking-wide" style={{ color: stColor }}>
                    {st.name.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-12">
                    <QuotaBar current={stTotal} quota={stQuota} color={stColor} size="sm" showLabel={false} currency={currency} />
                  </div>
                  <span className="font-barlow font-bold text-xs whitespace-nowrap" style={{ color: stColor }}>
                    {stPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Seller cards */}
              <div className="space-y-1.5">
                {sellers.length === 0 ? (
                  <div className="text-center font-inter text-xs text-gray-700 italic py-2">No sales yet</div>
                ) : sellers.map((m, i) => (
                  <MemberCard
                    key={m.id} m={m} rank={i} accentColor={stColor}
                    memberTotals={memberTotals} memberTotalsToday={memberTotalsToday}
                    memberQuotas={memberQuotas} memberStreaks={memberStreaks}
                    memberIncentiveLevels={memberIncentiveLevels}
                    currency={currency} viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Manager */}
          {sortedDirect.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 py-0.5 mb-1.5">
                <div className="flex-1 h-px" style={{ background: `${color}30` }} />
                <span className="font-inter text-xs text-gray-600 uppercase tracking-widest whitespace-nowrap">Manager</span>
                <div className="flex-1 h-px" style={{ background: `${color}30` }} />
              </div>
              <div className="space-y-1.5">
                {sortedDirect.map((m, i) => (
                  <MemberCard
                    key={m.id} m={m} rank={i} accentColor={color}
                    memberTotals={memberTotals} memberTotalsToday={memberTotalsToday}
                    memberQuotas={memberQuotas} memberStreaks={memberStreaks}
                    memberIncentiveLevels={memberIncentiveLevels}
                    currency={currency} viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Yet to Sell — sub-team members + direct members with zero total */}
        {allYetToSell.length > 0 && (
          <div className="w-32 flex-shrink-0 min-h-0 flex flex-col border-l border-gray-800 pl-2">
            <div className="flex items-center gap-1 mb-2 flex-shrink-0">
              <span className="font-inter text-xs text-gray-700 uppercase tracking-widest whitespace-nowrap">
                ⏳ YTS
              </span>
              <span className="font-barlow font-bold text-xs text-gray-700">({allYetToSell.length})</span>
            </div>
            <div ref={ytsScrollRef} className="flex-1 overflow-y-auto space-y-1.5">
              {allYetToSell.map(m => (
                <div
                  key={m.id}
                  className="rounded-xl px-2 py-2 opacity-50"
                  style={{ background: '#1E2A4510', border: '1px solid #1E2A4530' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m._stColor }} />
                    <Avatar photoUrl={m.photo_url} name={m.name} size={22} teamColor={m._stColor} />
                    <span className="font-barlow font-bold text-xs text-gray-500 truncate">
                      {m.name.split(' ')[0]}
                    </span>
                  </div>
                  <div className="font-inter text-xs text-gray-700 pl-5 truncate">{m._stName}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
