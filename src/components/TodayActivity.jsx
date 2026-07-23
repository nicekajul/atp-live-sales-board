import Avatar from './Avatar.jsx'
import { TIER_COLORS } from '../constants/tiers.js'

function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function fmtTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function TierBadge({ tier }) {
  if (!tier) return null
  const color = TIER_COLORS[tier] || '#6B7280'
  const short = tier === 'Sales Manager'  ? 'SM'
               : tier === 'Sales Director' ? 'SD'
               : tier.replace('Tier ', 'T')
  return (
    <span
      className="inline-block font-barlow font-bold px-1.5 py-0.5 rounded leading-none"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55`, fontSize: 11 }}
    >
      {short}
    </span>
  )
}

export default function TodayActivity({
  members, teams, salesToday = [], memberTotalsToday, currency,
}) {
  const now       = new Date()
  const dateLabel = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const todayTotal = salesToday.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
  const saleCount  = salesToday.length

  // Per-member aggregates from salesToday
  const memberData = {}
  salesToday.forEach(s => {
    const mid = String(s.member_id)
    if (!memberData[mid]) memberData[mid] = { count: 0, lastTs: null }
    memberData[mid].count++
    if (!memberData[mid].lastTs || new Date(s.timestamp) > new Date(memberData[mid].lastTs)) {
      memberData[mid].lastTs = s.timestamp
    }
  })

  const soldMembers = members
    .map(m => ({
      ...m,
      total:  memberTotalsToday[m.id] || 0,
      count:  memberData[String(m.id)]?.count  || 0,
      lastTs: memberData[String(m.id)]?.lastTs || null,
      team:   teams.find(t => String(t.id) === String(m.team_id)),
    }))
    .filter(m => m.total > 0)
    .sort((a, b) => b.total - a.total)

  const noSale = members
    .filter(m => !(memberTotalsToday[m.id] > 0))
    .map(m => ({ ...m, team: teams.find(t => String(t.id) === String(m.team_id)) }))

  return (
    <div className="h-full flex flex-col px-5 py-3 gap-3 animate-view-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="font-barlow font-bold text-2xl text-white tracking-wide leading-none">
              TODAY'S SALES ACTIVITY
            </div>
            <div className="font-inter text-sm text-gray-500">{dateLabel}</div>
          </div>
        </div>

        <div className="text-right">
          <div
            className="font-barlow font-bold text-2xl leading-none tabular-nums"
            style={{ color: '#F97316' }}
          >
            {fmt(todayTotal, currency)}
          </div>
          <div className="font-inter text-sm text-gray-500 mt-0.5">
            {saleCount} sale{saleCount !== 1 ? 's' : ''} logged today
          </div>
        </div>
      </div>

      <div className="h-px flex-shrink-0 bg-board-border/60" />

      {/* Content */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Sold today */}
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
          <div className="font-barlow font-bold text-sm text-gray-500 uppercase tracking-widest flex-shrink-0">
            ✅ Sold Today ({soldMembers.length})
          </div>

          {soldMembers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-700">
              <div className="text-5xl">🚀</div>
              <div className="font-barlow font-bold text-xl">Day is still young!</div>
              <div className="font-inter text-sm">Log the first sale to get things moving.</div>
            </div>
          ) : (() => {
            const twoCol = soldMembers.length > 6
            return (
              <div className={twoCol ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                {soldMembers.map((m, i) => {
                  const color = m.team?.color || '#6B7280'
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{
                        background: `${color}10`,
                        border:     `1px solid ${color}35`,
                      }}
                    >
                      {/* Rank */}
                      <div className="font-barlow font-semibold text-lg text-gray-500 w-6 text-center flex-shrink-0">
                        #{i + 1}
                      </div>

                      <Avatar photoUrl={m.photo_url} name={m.name} size={52} teamColor={color} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-barlow font-semibold text-base text-white leading-tight">{m.name}</span>
                          <TierBadge tier={m.tier} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: color }}
                          />
                          <span className="font-inter text-xs text-gray-600 truncate">{m.team?.name || ''}</span>
                          {!twoCol && (
                            <span className="font-inter text-xs text-gray-700">
                              · {m.count} sale{m.count > 1 ? 's' : ''}
                              {m.lastTs ? ` · last at ${fmtTime(m.lastTs)}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="font-barlow font-bold flex-shrink-0 tabular-nums"
                        style={{ color, fontSize: twoCol ? 20 : 30 }}
                      >
                        {fmt(m.total, currency)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Yet to sell */}
        {noSale.length > 0 && (
          <div
            className="w-52 flex-shrink-0 flex flex-col gap-2 border-l border-board-border/50 pl-4"
          >
            <div className="font-barlow font-bold text-sm text-gray-600 uppercase tracking-widest flex-shrink-0">
              ⏳ Yet to Sell ({noSale.length})
            </div>
            <div className="space-y-1.5 overflow-y-auto min-h-0">
              {noSale.map(m => {
                const color = m.team?.color || '#6B7280'
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 opacity-45"
                    style={{ border: '1px solid #1E2A45', background: '#0B0F1E' }}
                  >
                    <Avatar photoUrl={m.photo_url} name={m.name} size={30} teamColor={color} />
                    <div className="flex-1 min-w-0">
                      <div className="font-inter text-sm text-gray-400 truncate">{m.name}</div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span className="font-inter text-xs text-gray-600 truncate">{m.team?.name || ''}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
