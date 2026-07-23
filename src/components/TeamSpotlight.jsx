import { useEffect, useRef } from 'react'
import QuotaBar    from './QuotaBar.jsx'
import Avatar      from './Avatar.jsx'
import PodiumStage from './PodiumStage.jsx'

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

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

export default function TeamSpotlight({
  team, allTeams, members, subTeams = [], allMembers = [],
  memberTotals, memberTotalsToday,
  memberQuotas, teamTotal, teamTotalToday, teamQuota,
  subTeamTotals = {}, subTeamTotalsToday = {},
  subTeamQuotas = {},
  teamTotals = {}, teamTotalsToday = {},
  currency, viewMode,
}) {
  if (!team) return null

  const color        = team.color || '#00F5A0'
  const displayTotal = viewMode === 'daily' ? teamTotalToday : teamTotal
  const pct          = teamQuota > 0 ? Math.min(100, (displayTotal / teamQuota) * 100) : 0

  // Rank this team vs its peers (passed via allTeams)
  const teamRanks = [...allTeams].sort((a, b) => {
    const ta = viewMode === 'daily' ? (teamTotalsToday[a.id] || 0) : (teamTotals[a.id] || 0)
    const tb = viewMode === 'daily' ? (teamTotalsToday[b.id] || 0) : (teamTotals[b.id] || 0)
    return tb - ta
  })
  const teamRank = teamRanks.findIndex(t => String(t.id) === String(team.id))

  // Build sorted podium entries from all spotlight members
  const allEntries = [...members]
    .map(m => {
      const memberTeam = allMembers.length
        ? (subTeams.find(st => String(st.id) === String(m.team_id)) || null)
        : null
      return {
        id:        m.id,
        name:      m.name,
        photo_url: m.photo_url,
        total:     viewMode === 'daily' ? (memberTotalsToday[m.id] || 0) : (memberTotals[m.id] || 0),
        teamColor: memberTeam?.color || color,
        teamName:  memberTeam?.name  || team.name,
        tier:      m.tier || '',
        quota:     memberQuotas[m.id] || 0,
      }
    })
    .sort((a, b) => b.total - a.total)

  const entries     = allEntries.filter(e => e.total > 0)
  const yetToSell   = allEntries.filter(e => e.total === 0)

  // Sub-team side panel (shown for parent teams only)
  const hasSubTeams = subTeams.length > 0
  const subTeamsScrollRef = useAutoScroll(subTeams.length)
  const sidePanel = hasSubTeams ? (
    <div ref={subTeamsScrollRef} className="flex flex-col gap-3 h-full overflow-y-auto pt-4 pr-1">
      <div className="font-barlow font-bold text-sm text-gray-500 uppercase tracking-widest flex-shrink-0">
        Sub-Teams
      </div>
      {subTeams.map(st => {
        const stColor   = st.color || color
        const stTotal   = viewMode === 'daily' ? (subTeamTotalsToday[st.id] || 0) : (subTeamTotals[st.id] || 0)
        const stQuota   = subTeamQuotas[st.id] || 0
        const stPct     = stQuota > 0 ? Math.min(100, (stTotal / stQuota) * 100) : 0
        const stMembers = allMembers.filter(m => String(m.team_id) === String(st.id))
        const topMember = [...stMembers]
          .map(m => ({ ...m, _total: viewMode === 'daily' ? (memberTotalsToday[m.id] || 0) : (memberTotals[m.id] || 0) }))
          .sort((a, b) => b._total - a._total)[0]

        return (
          <div
            key={st.id}
            className="rounded-xl px-3 py-3 flex-shrink-0"
            style={{ background: `${stColor}0C`, border: `1px solid ${stColor}30` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stColor }} />
                <span className="font-barlow font-bold text-sm tracking-wide" style={{ color: stColor }}>
                  {st.name.toUpperCase()}
                </span>
              </div>
              <span className="font-barlow font-bold text-sm" style={{ color: stColor }}>
                {fmt(stTotal, currency)}
              </span>
            </div>
            <QuotaBar current={stTotal} quota={stQuota} color={stColor} size="sm" showLabel={false} currency={currency} />
            <div className="flex justify-between mt-1">
              <span className="font-inter text-xs text-gray-600">{stMembers.length} agents</span>
              <span className="font-barlow font-bold text-xs" style={{ color: stColor }}>{stPct.toFixed(1)}%</span>
            </div>
            {topMember && (
              <div className="mt-2 flex items-center gap-1.5">
                <Avatar photoUrl={topMember.photo_url} name={topMember.name} size={20} teamColor={stColor} />
                <span className="font-inter text-xs text-gray-400 flex-1 truncate">{topMember.name}</span>
                <span className="font-barlow font-bold text-xs whitespace-nowrap" style={{ color: stColor }}>
                  {fmt(topMember._total, currency)}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  ) : null

  return (
    <div
      className="h-full flex flex-col px-5 py-3 gap-3 animate-view-enter"
      style={{ background: `linear-gradient(135deg, ${color}0C 0%, #0A0E1A 60%)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-2 h-12 rounded-full flex-shrink-0" style={{ background: color }} />
          <div>
            <div
              className="font-barlow font-bold text-5xl tracking-wide uppercase leading-none"
              style={{ color }}
            >
              {team.name}
            </div>
            <div className="font-inter text-sm text-gray-500 mt-0.5">
              TEAM SPOTLIGHT — {viewMode === 'daily' ? "TODAY'S PERFORMANCE" : 'MONTH TO DATE'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-barlow font-bold text-3xl leading-none tabular-nums" style={{ color }}>
              {fmt(displayTotal, currency)}
            </div>
            <div className="w-48 mt-1">
              <QuotaBar current={displayTotal} quota={teamQuota} color={color} size="md" showLabel={false} currency={currency} />
            </div>
            <div className="font-inter text-xs text-gray-500 text-right mt-0.5">
              {pct.toFixed(1)}% of {fmt(teamQuota, currency)}
            </div>
          </div>

          <div
            className="font-barlow font-bold text-5xl px-4 py-2 rounded-xl"
            style={{
              color:      RANK_COLORS[teamRank] || color,
              background: `${RANK_COLORS[teamRank] || color}18`,
              border:     `2px solid ${RANK_COLORS[teamRank] || color}50`,
            }}
          >
            #{teamRank + 1}
          </div>
        </div>
      </div>

      <div className="h-px flex-shrink-0" style={{ background: `${color}30` }} />

      {/* Podium */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PodiumStage
          entries={entries}
          currency={currency}
          othersTitle="ALSO RANKED"
          sidePanel={sidePanel}
          yetToSell={yetToSell}
        />
      </div>
    </div>
  )
}
