import { useState, useEffect, useRef, useMemo } from 'react'
import { useBoard, useSecondsSince } from '../hooks/useBoard.js'
import { api }                   from '../api/sheets.js'
import TeamColumn                from '../components/TeamColumn.jsx'
import TeamSpotlight             from '../components/TeamSpotlight.jsx'
import IndividualStandings       from '../components/IndividualStandings.jsx'
import TodayActivity             from '../components/TodayActivity.jsx'
import WallOfFameSpotlight       from '../components/WallOfFameSpotlight.jsx'
import AwardsTracker             from '../components/AwardsTracker.jsx'
import IncentiveDetailModal      from '../components/IncentiveDetailModal.jsx'
import IncentiveCelebrationPopup from '../components/IncentiveCelebrationPopup.jsx'
import QuotaBar                  from '../components/QuotaBar.jsx'
import Ticker                    from '../components/Ticker.jsx'
import HallOfFame                from '../components/HallOfFame.jsx'
import WallOfFame                from '../components/WallOfFame.jsx'
import CelebrationPopup          from '../components/CelebrationPopup.jsx'

// Persists the last-seen sale ID across SPA navigation without sessionStorage type coercion issues
let _lastSeenSaleId = null

// ── Cycle view definitions ──────────────────────────────────────────────────
const CYCLE_VIEWS = [
  { id: 'main',        label: 'LIVE BOARD',     icon: '📊', color: '#00F5A0', duration: 18 },
  { id: 'team-0',      label: null,             icon: '●',  color: null,      duration: 12, teamIdx: 0 },
  { id: 'team-2',      label: null,             icon: '●',  color: null,      duration: 9,  teamIdx: 2 },
  { id: 'team-3',      label: null,             icon: '●',  color: null,      duration: 9,  teamIdx: 3 },
  { id: 'team-1',      label: null,             icon: '●',  color: null,      duration: 12, teamIdx: 1 },
  { id: 'team-4',      label: null,             icon: '●',  color: null,      duration: 9,  teamIdx: 4 },
  { id: 'individual',  label: 'TOP AGENTS',     icon: '🏆', color: '#EAB308', duration: 12 },
  { id: 'walloffame',  label: 'WALL OF FAME',   icon: '⭐', color: '#A855F7', duration: 12 },
  { id: 'today',       label: "TODAY'S SALES",  icon: '⚡', color: '#F97316', duration: 10 },
  { id: 'awards-quarterly', label: 'QUARTERLY AWARDS', icon: '🏅', color: '#F59E0B', duration: 15, manual: true },
  { id: 'awards-yearly',    label: 'YEARLY AWARDS',    icon: '🚗', color: '#F59E0B', duration: 15, manual: true },
]

// ── Helpers ─────────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function MilestoneToast({ message, color }) {
  return (
    <div
      className="fixed top-20 right-5 z-40 px-5 py-2.5 rounded-xl font-barlow font-bold text-base animate-slide-down shadow-2xl max-w-[260px] text-right"
      style={{ background: `${color}22`, border: `1px solid ${color}88`, color }}
    >
      {message}
    </div>
  )
}

// Cycles between Top Today and each team's % of quota in the bottom-left slot
function BottomLeftStats({ board, viewMode, currency }) {
  const [idx, setIdx] = useState(0)

  const items = useMemo(() => {
    const list = []
    if (board?.topPerformerToday) {
      list.push({
        icon: '⭐', label: 'TOP TODAY',
        primary: board.topPerformerToday.name,
        secondary: `${currency} ${Number(board.topPerformerToday.todayTotal || 0).toLocaleString()}`,
        color: '#00F5A0',
      })
    } else {
      list.push({ icon: '⭐', label: 'TOP TODAY', primary: 'No sales yet today', color: '#4B5563' })
    }
    ;(board?.teams || []).filter(t => String(t.hidden) !== 'true').forEach(team => {
      const total = viewMode === 'daily'
        ? (board.teamTotalsToday?.[team.id] || 0)
        : (board.teamTotals?.[team.id] || 0)
      const quota = board.teamQuotas?.[team.id] || 0
      const pct   = quota > 0 ? `${((total / quota) * 100).toFixed(1)}% of quota` : '—'
      list.push({ icon: '●', label: team.name.toUpperCase(), primary: pct, color: team.color })
    })
    return list
  }, [board, viewMode, currency])

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 4000)
    return () => clearInterval(id)
  }, [items.length])

  const cur = items[idx % Math.max(1, items.length)]
  if (!cur) return null

  return (
    <div key={idx} className="flex items-center gap-2 px-4 overflow-hidden h-full animate-fade-in">
      <span className="font-barlow font-bold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: cur.color }}>
        {cur.icon} {cur.label}
      </span>
      <span className="font-barlow font-bold text-sm text-white truncate">{cur.primary}</span>
      {cur.secondary && (
        <span className="font-barlow font-bold text-sm whitespace-nowrap flex-shrink-0" style={{ color: cur.color }}>
          {cur.secondary}
        </span>
      )}
    </div>
  )
}

// ── Cycle nav bar ────────────────────────────────────────────────────────────
function CycleBar({ cycleIdx, cycleProgress, teams, onJump }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 border-b border-board-border/40 bg-board-bg overflow-x-auto">
      {CYCLE_VIEWS.map((v, i) => {
        const team    = v.teamIdx !== undefined ? teams?.[v.teamIdx] : null
        const label   = team ? team.name.toUpperCase() : v.label
        const color   = team ? team.color : v.color
        const active  = i === cycleIdx

        return (
          <button
            key={v.id}
            onClick={() => onJump(i)}
            title={label || ''}
            className="relative flex items-center gap-1.5 px-3 py-1 rounded-lg font-barlow font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all duration-300 overflow-hidden"
            style={{
              background: active ? `${color}20` : 'transparent',
              color:      active ? color : '#4B5563',
              border:     `1px solid ${active ? `${color}50` : 'transparent'}`,
            }}
          >
            {/* Shrinking progress bar on active pill */}
            {active && (
              <div
                className="absolute bottom-0 left-0 h-0.5 transition-none rounded-full"
                style={{ width: `${cycleProgress}%`, background: color }}
              />
            )}
            <span
              className="text-sm leading-none"
              style={{ color: v.icon === '●' && team ? team.color : undefined }}
            >
              {v.icon === '●'
                ? <span style={{ fontSize: 10 }}>●</span>
                : v.icon}
            </span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function BoardPage() {
  const { board, loading, error, lastUpdated, refetch } = useBoard()
  const secAgo        = useSecondsSince(lastUpdated)
  const clock         = useClock()
  const [viewMode,    setViewMode]    = useState('mtd')
  const [celebration, setCelebration] = useState(null)
  const [toasts,      setToasts]      = useState([])

  // Cycle state
  const [cycleIdx,      setCycleIdx]      = useState(0)
  const [cycleProgress, setCycleProgress] = useState(100)
  const [viewKey,       setViewKey]       = useState(0)


  const [incentiveSummary,  setIncentiveSummary]  = useState(null)
  const [incentiveUpgrade,  setIncentiveUpgrade]  = useState(null)
  const [selectedMember,    setSelectedMember]    = useState(null)

  const prevSaleIdRef     = useRef(_lastSeenSaleId)
  const prevBoardRef      = useRef(null)   // holds last known board for quota-crossing diff
  const prevTeamPcts      = useRef({})
  const milestonesSeeded  = useRef(false)  // skip toasts on first board load

  // ── Cycle timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const duration = CYCLE_VIEWS[cycleIdx].duration * 1000
    const start    = Date.now()
    const TICK     = 200

    const id = setInterval(() => {
      const elapsed = Date.now() - start
      setCycleProgress(Math.max(0, 100 - (elapsed / duration) * 100))
      if (elapsed >= duration) {
        clearInterval(id)
        setCycleIdx(i => {
          let next = (i + 1) % CYCLE_VIEWS.length
          while (CYCLE_VIEWS[next].manual) next = (next + 1) % CYCLE_VIEWS.length
          return next
        })
        setCycleProgress(100)
        setViewKey(k => k + 1)
      }
    }, TICK)

    return () => clearInterval(id)
  }, [cycleIdx])

  // ── Incentive summary (separate poll, 30s) ───────────────────────────────
  useEffect(() => {
    const yr = new Date().getFullYear()
    const fetch = () => api.getIncentiveSummary(yr).then(r => { if (r.success) setIncentiveSummary(r.data) })
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  // Manual jump
  function jumpTo(i) {
    setCycleIdx(i)
    setCycleProgress(100)
    setViewKey(k => k + 1)
  }

  // ── New sale + quota-crossing detection ──────────────────────────────────
  useEffect(() => {
    if (!board) return
    const latest = board.recentSales?.[0]

    if (latest && prevSaleIdRef.current && String(latest.id) !== prevSaleIdRef.current) {
      const prev   = prevBoardRef.current
      const member = board.members.find(m => String(m.id) === String(latest.member_id))
      const team   = member ? board.teams.find(t => String(t.id) === String(member.team_id)) : null
      const tid    = member?.team_id

      // Primary agent quota crossing
      const memberQuota          = board.memberQuotas?.[latest.member_id] || 0
      const memberNow            = board.memberTotals?.[latest.member_id] || 0
      const memberBefore         = prev?.memberTotals?.[latest.member_id] || 0
      const individualQuotaJustHit = memberQuota > 0 && memberBefore < memberQuota && memberNow >= memberQuota

      // Franki sale — second agent
      // is_franki arrives as boolean true from getBoard() after pair merging
      let frankiSnapshot      = null
      let frankiQuotaJustHit  = false
      if ((latest.is_franki === true || latest.is_franki === 'true') && latest.franki_member_id) {
        const fid     = String(latest.franki_member_id)
        const fmbr    = board.members.find(m => String(m.id) === fid)
        const fteam   = fmbr ? board.teams.find(t => String(t.id) === String(fmbr.team_id)) : null
        const fNow    = board.memberTotals?.[fid] || 0
        const fBefore = prev?.memberTotals?.[fid] || 0
        const fQuota  = board.memberQuotas?.[fid] || 0
        frankiQuotaJustHit = fQuota > 0 && fBefore < fQuota && fNow >= fQuota
        frankiSnapshot = {
          name:       latest.franki_member_name || fmbr?.name || '',
          photo_url:  fmbr?.photo_url || '',
          mtdTotal:   fNow,
          saleAmount: parseFloat(latest.franki_amount || 0),
          teamName:   fteam?.name || '',
          teamColor:  fteam?.color || latest.franki_team_color || team?.color || '#00F5A0',
        }
      }

      // Sub-team vs main team quota crossing
      const isSubTeam      = !!team?.parent_team_id
      const parentTeam     = isSubTeam ? board.teams.find(t => String(t.id) === String(team.parent_team_id)) : null
      const directTid      = tid
      const parentTid      = parentTeam?.id

      const teamNow        = board.teamTotals?.[directTid]  || 0
      const teamBefore     = prev?.teamTotals?.[directTid]  || 0
      const teamQuota      = board.teamQuotas?.[directTid]  || 0
      const directQuotaHit = teamQuota > 0 && teamBefore < teamQuota && teamNow >= teamQuota

      const parentNow      = parentTid ? (board.teamTotals?.[parentTid]  || 0) : 0
      const parentBefore   = parentTid ? (prev?.teamTotals?.[parentTid]  || 0) : 0
      const parentQuota    = parentTid ? (board.teamQuotas?.[parentTid]  || 0) : 0
      const parentQuotaHit = parentQuota > 0 && parentBefore < parentQuota && parentNow >= parentQuota

      const subTeamQuotaJustHit  = isSubTeam  && directQuotaHit
      const mainTeamQuotaJustHit = isSubTeam  ? parentQuotaHit : directQuotaHit
      const teamQuotaJustHit     = directQuotaHit  // kept for backward compat

      // Site quota crossing
      const siteNow    = board.siteTotal  || 0
      const siteBefore = prev?.siteTotal  || 0
      const siteQuota  = board.siteQuota  || 0
      const siteQuotaJustHit = siteQuota > 0 && siteBefore < siteQuota && siteNow >= siteQuota

      // Sub-team member list for T3 avatar row
      const subTeamMembers = isSubTeam
        ? (board.members || []).filter(m => String(m.team_id) === String(directTid))
        : []

      setCelebration({
        memberSnapshot: {
          name:       latest.memberName || member?.name || '',
          photo_url:  member?.photo_url || '',
          mtdTotal:   memberNow,
          saleAmount: parseFloat(latest.amount),
          teamName:   latest.teamName || team?.name || '',
          quota:      memberQuota,
          tier:       member?.tier || '',
        },
        frankiSnapshot,
        teamColor:          team?.color || '#00F5A0',
        individualQuotaJustHit,
        frankiQuotaJustHit,
        subTeamQuotaJustHit,
        mainTeamQuotaJustHit,
        teamQuotaJustHit,
        siteQuotaJustHit,
        // Enriched data for enhanced popup layouts
        subTeamName:    team?.name || '',
        subTeamTotal:   teamNow,
        subTeamQuota:   teamQuota,
        subTeamMembers,
        mainTeamName:   parentTeam?.name || team?.name || '',
        mainTeamQuota:  parentQuota || teamQuota,
        mainTeamTotal:  parentNow   || teamNow,
        siteQuotaAmount: siteQuota,
        siteTotal:      siteNow,
      })

      // Incentive upgrade detection — compare memberIncentiveLevels before vs after
      const prevLevels = prevBoardRef.current?.memberIncentiveLevels || {}
      const newLevels  = board.memberIncentiveLevels || {}
      const mid        = String(latest.member_id)
      const prevLevel  = prevLevels[mid]
      const newLevel   = newLevels[mid]
      if (newLevel && (!prevLevel || newLevel.circle !== prevLevel.circle || newLevel.tier !== prevLevel.tier)) {
        setIncentiveUpgrade({
          upgraded:              true,
          newCircle:             newLevel.circle,
          newTier:               newLevel.tier,
          cashIncentive:         newLevel.cashIncentive || 0,
          incentivesList:        newLevel.incentivesList || [],
          memberName:            latest.memberName || member?.name || '',
          memberPhoto:           member?.photo_url || '',
          isElectricCarQualified: false,
        })
      }
    }

    if (latest) {
      const sid = String(latest.id)
      prevSaleIdRef.current = sid
      _lastSeenSaleId = sid
    }
    prevBoardRef.current = board
  }, [board])

  // ── Milestone toasts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!board) return
    board.teams.forEach(team => {
      const total = board.teamTotals[team.id] || 0
      const quota = board.teamQuotas[team.id] || 0
      if (!quota) return
      const pct     = (total / quota) * 100
      const prevPct = prevTeamPcts.current[team.id]

      // On the very first load, just seed the baseline — never toast on refresh
      if (!milestonesSeeded.current) {
        prevTeamPcts.current[team.id] = pct
        return
      }

      if      (prevPct < 50 && pct >= 50) setToasts(t => [...t, { id: Date.now(), msg: `🎯 ${team.name} at 50% of quota!`,  color: team.color }])
      else if (prevPct < 75 && pct >= 75) setToasts(t => [...t, { id: Date.now(), msg: `🚀 ${team.name} at 75% of quota!`, color: team.color }])
      prevTeamPcts.current[team.id] = pct
    })
    milestonesSeeded.current = true
  }, [board?.teamTotals])

  useEffect(() => {
    if (!toasts.length) return
    const id = setTimeout(() => setToasts(t => t.slice(1)), 5000)
    return () => clearTimeout(id)
  }, [toasts])

  // ── Derived data ──────────────────────────────────────────────────────────
  const settings  = board?.settings   || {}
  const currency  = settings.currency  || 'PHP'
  const siteName  = settings.site_name || 'Sales Floor'

  const rankedTeams = board
    ? [...board.teams]
        .filter(t => String(t.hidden) !== 'true' && !t.parent_team_id)
        .sort((a, b) =>
          viewMode === 'daily'
            ? (board.teamTotalsToday[b.id] || 0) - (board.teamTotalsToday[a.id] || 0)
            : (board.teamTotals[b.id]      || 0) - (board.teamTotals[a.id]      || 0)
        )
    : []

  const rankableMembers = (board?.members || []).filter(m => String(m.is_executive) !== 'true')

  const siteTotal = viewMode === 'daily'
    ? (board?.salesToday?.reduce((s, x) => s + parseFloat(x.amount || 0), 0) || 0)
    : (board?.siteTotal || 0)
  const siteQuota = board?.siteQuota || 0

  const currentView = CYCLE_VIEWS[cycleIdx]
  const showWallOfFameStrip = currentView.id === 'main' || currentView.id === 'today'

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading && !board) {
    return (
      <div className="min-h-screen bg-board-bg flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin" />
        <div className="font-barlow text-2xl text-gray-500 tracking-widest">LOADING BOARD…</div>
      </div>
    )
  }

  if (error && !board) {
    return (
      <div className="min-h-screen bg-board-bg flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="text-red-400 font-barlow text-3xl">CONNECTION ERROR</div>
        <div className="text-gray-500 font-inter text-sm max-w-md">{error}</div>
        <div className="text-gray-600 font-inter text-xs">Check your VITE_APPS_SCRIPT_URL in .env</div>
        <button
          onClick={refetch}
          className="mt-4 px-6 py-2 border border-neon-green text-neon-green font-barlow text-lg rounded-lg hover:bg-neon-green/10 transition-colors"
        >
          RETRY
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen overflow-hidden bg-board-bg flex flex-col font-inter select-none">
      {toasts[0] && <MilestoneToast message={toasts[0].msg} color={toasts[0].color} />}

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-board-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full bg-neon-green animate-live-pulse"
            style={{ boxShadow: '0 0 8px #00F5A0' }}
          />
          <h1 className="font-barlow font-bold text-3xl tracking-tight text-neon-green">
            {siteName.toUpperCase()}
          </h1>
          <span className="font-barlow font-medium text-xl text-gray-500 tracking-wide">— LIVE SALES BOARD</span>
        </div>

        <div className="flex items-center gap-5 w-[520px] justify-center flex-shrink-0">
          {/* Local time — PH */}
          <div className="flex items-center gap-2 w-[220px] justify-end flex-shrink-0">
            <div className="font-barlow font-black text-xs text-gray-600 uppercase tracking-widest leading-none">🇵🇭<br/>PH</div>
            <div className="text-center">
              <div className="font-barlow font-bold text-3xl text-white tracking-widest tabular-nums">
                {clock.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="font-inter text-xs text-gray-500 whitespace-nowrap">
                {clock.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-board-border flex-shrink-0" />

          {/* EST — US */}
          <div className="flex items-center gap-2 w-[220px] justify-start flex-shrink-0">
            <div className="text-center">
              <div className="font-barlow font-bold text-3xl text-white tracking-widest tabular-nums">
                {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/New_York' })}
              </div>
              <div className="font-inter text-xs text-gray-500 whitespace-nowrap">
                {clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}
              </div>
            </div>
            <div className="font-barlow font-black text-xs text-gray-600 uppercase tracking-widest leading-none text-right">
              🇺🇸<br/>{clock.toLocaleTimeString('en-US', { timeZoneName: 'short', timeZone: 'America/New_York' }).split(' ').pop()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex rounded-lg overflow-hidden border border-board-border">
            {['mtd','daily'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1 font-barlow font-bold text-sm transition-all duration-200"
                style={{
                  background: viewMode === mode ? '#00F5A022' : 'transparent',
                  color:      viewMode === mode ? '#00F5A0'   : '#6B7280',
                }}
              >
                {mode === 'mtd' ? 'MTD' : 'TODAY'}
              </button>
            ))}
          </div>
          <div className="text-right">
            <div className="font-inter text-xs text-gray-600">Updated {secAgo}s ago</div>
            <div className="font-inter text-xs text-gray-700">{board?.quotaHitCount || 0} members hit quota</div>
          </div>
        </div>
      </header>

      {/* ── SITE QUOTA BAR ── */}
      <div className="px-6 py-2 border-b border-board-border/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-barlow font-bold text-xl text-neon-green whitespace-nowrap">SITE MTD</span>
          <span className="font-barlow font-bold text-2xl text-white tabular-nums">{fmt(siteTotal, currency)}</span>
          <div className="flex-1">
            <QuotaBar current={siteTotal} quota={siteQuota} color="#00F5A0" size="lg" showLabel={false} currency={currency} />
          </div>
          <span className="font-barlow text-lg text-gray-500 whitespace-nowrap">/ {fmt(siteQuota, currency)}</span>
        </div>
      </div>

      {/* ── CYCLE NAV BAR ── */}
      <CycleBar
        cycleIdx={cycleIdx}
        cycleProgress={cycleProgress}
        teams={board?.teams || []}
        onJump={jumpTo}
      />

      {/* ── MAIN CYCLING AREA ── */}
      <div key={viewKey} className="flex-1 min-h-0 animate-view-enter overflow-hidden">
        {currentView.id === 'main' && (
          <div className="h-full grid grid-cols-2 gap-3 px-4 py-2">
            {rankedTeams.map((team, rank) => {
              const subTeams = (board?.teams || []).filter(t => String(t.parent_team_id) === String(team.id))
              const directMembers = (board?.members || []).filter(m => String(m.team_id) === String(team.id))
              return (
                <TeamColumn
                  key={team.id}
                  team={team}
                  rank={rank}
                  subTeams={subTeams}
                  directMembers={directMembers}
                  allMembers={board?.members || []}
                  memberTotals={board?.memberTotals || {}}
                  memberTotalsToday={board?.memberTotalsToday || {}}
                  memberQuotas={board?.memberQuotas || {}}
                  teamTotal={board?.teamTotals[team.id] || 0}
                  teamTotalToday={board?.teamTotalsToday[team.id] || 0}
                  teamQuota={board?.teamQuotas[team.id] || 0}
                  subTeamTotals={board?.teamTotals || {}}
                  subTeamTotalsToday={board?.teamTotalsToday || {}}
                  subTeamQuotas={board?.teamQuotas || {}}
                  memberStreaks={board?.memberStreaks || {}}
                  memberIncentiveLevels={board?.memberIncentiveLevels || {}}
                  currency={currency}
                  viewMode={viewMode}
                />
              )
            })}
          </div>
        )}

        {currentView.id.startsWith('team-') && (() => {
          const team = board?.teams?.[currentView.teamIdx]
          if (!team) return null
          const subTeams = (board?.teams || []).filter(t => String(t.parent_team_id) === String(team.id))
          const isParent = subTeams.length > 0

          // Parent: include manager + all sub-team members on podium
          // Sub-team: just its own members
          const spotlightMembers = isParent
            ? (board?.members || []).filter(m => {
                const subIds = subTeams.map(st => String(st.id))
                return String(m.team_id) === String(team.id) || subIds.includes(String(m.team_id))
              })
            : (board?.members || []).filter(m => String(m.team_id) === String(team.id))

          // Rank parent teams among parents; rank sub-teams among siblings
          const competeAgainst = isParent
            ? (board?.teams || []).filter(t => !t.parent_team_id && String(t.hidden) !== 'true')
            : (board?.teams || []).filter(t => String(t.parent_team_id) === String(team.parent_team_id))

          return (
            <TeamSpotlight
              team={team}
              allTeams={competeAgainst}
              members={spotlightMembers}
              subTeams={subTeams}
              allMembers={board?.members || []}
              memberTotals={board?.memberTotals || {}}
              memberTotalsToday={board?.memberTotalsToday || {}}
              memberQuotas={board?.memberQuotas || {}}
              teamTotal={board?.teamTotals[team.id] || 0}
              teamTotalToday={board?.teamTotalsToday[team.id] || 0}
              teamQuota={board?.teamQuotas[team.id] || 0}
              subTeamTotals={board?.teamTotals || {}}
              subTeamTotalsToday={board?.teamTotalsToday || {}}
              subTeamQuotas={board?.teamQuotas || {}}
              teamTotals={board?.teamTotals || {}}
              teamTotalsToday={board?.teamTotalsToday || {}}
              currency={currency}
              viewMode={viewMode}
            />
          )
        })()}

        {currentView.id === 'individual' && (
          <IndividualStandings
            members={rankableMembers}
            teams={board?.teams || []}
            memberTotals={board?.memberTotals || {}}
            memberTotalsToday={board?.memberTotalsToday || {}}
            memberQuotas={board?.memberQuotas || {}}
            currency={currency}
            viewMode={viewMode}
          />
        )}

        {currentView.id === 'walloffame' && (
          <WallOfFameSpotlight
            wallOfFame={board?.wallOfFame}
            currency={currency}
          />
        )}

        {currentView.id === 'today' && (
          <TodayActivity
            members={board?.members || []}
            teams={board?.teams || []}
            salesToday={board?.salesToday || []}
            memberTotalsToday={board?.memberTotalsToday || {}}
            currency={currency}
          />
        )}

        {(currentView.id === 'awards-quarterly' || currentView.id === 'awards-yearly') && (
          <AwardsTracker
            incentiveSummary={incentiveSummary}
            view={currentView.id === 'awards-yearly' ? 'yearly' : 'quarterly'}
            onSelectMember={setSelectedMember}
          />
        )}
      </div>

      {/* ── WALL OF FAME STRIP (live board + today's sales only) ── */}
      {showWallOfFameStrip && (
        <WallOfFame wallOfFame={board?.wallOfFame} currency={currency} />
      )}

      {/* ── BOTTOM BAR ── */}
      <div
        className="flex-shrink-0 border-t border-board-border grid grid-cols-3 gap-0"
        style={{ height: 50 }}
      >
        {/* Left: cycles Top Today ↔ Team % of quota */}
        <div className="border-r border-board-border overflow-hidden">
          <BottomLeftStats board={board} viewMode={viewMode} currency={currency} />
        </div>

        {/* Center: scrolling sales ticker */}
        <div className="overflow-hidden">
          <Ticker sales={board?.recentSales || []} currency={currency} />
        </div>

        {/* Right: MTD hall of fame */}
        <div className="border-l border-board-border">
          <HallOfFame
            wallOfFame={board?.wallOfFame}
            currency={currency}
          />
        </div>
      </div>

      {!celebration && incentiveUpgrade?.upgraded && (
        <IncentiveCelebrationPopup
          upgrade={incentiveUpgrade}
          onDismiss={() => setIncentiveUpgrade(null)}
        />
      )}

      {selectedMember && (
        <IncentiveDetailModal
          member={selectedMember}
          usdRate={parseFloat(board?.settings?.usd_to_php_rate) || 56}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {celebration && (
        <CelebrationPopup
          celebration={celebration}
          teamColor={celebration.teamColor}
          currency={currency}
          onDismiss={() => setCelebration(null)}
        />
      )}

    </div>
  )
}
