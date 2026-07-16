import Avatar from './Avatar.jsx'

const CIRCLE_COLORS = {
  "Chairman's Circle":  '#F59E0B',
  "President's Circle": '#06B6D4',
  "Executive Circle":   '#F97316',
}
const CIRCLE_ABBREV = {
  "Chairman's Circle":  'CC',
  "President's Circle": 'PC',
  "Executive Circle":   'EC',
}

// Visual podium order: index 0 = 2nd (left), 1 = 1st (centre), 2 = 3rd (right)
const PODIUM_SLOTS = [
  { rank: 2, medal: '🥈', metalColor: '#C0C0C0', glow: 'rgba(192,192,192,0.5)', platformH: 130, avatarSize: 96,  nameSize: 'text-3xl' },
  { rank: 1, medal: '🥇', metalColor: '#FFD700', glow: 'rgba(255,215,0,0.65)',  platformH: 160, avatarSize: 136, nameSize: 'text-5xl' },
  { rank: 3, medal: '🥉', metalColor: '#CD7F32', glow: 'rgba(205,127,50,0.45)', platformH: 90,  avatarSize: 82,  nameSize: 'text-2xl' },
]

function sortScore(member, isYearly) {
  const data = isYearly ? member.yearly : member.activeQData
  if (!data?.circle) return 0
  const cs = { "Chairman's Circle": 30, "President's Circle": 20, "Executive Circle": 10 }
  return (cs[data.circle] || 0) + (4 - (data.tier || 4))
}

function CircleBadge({ circle, tier, size = 'sm' }) {
  if (!circle) return (
    <span
      className={`inline-block font-barlow font-bold rounded-full whitespace-nowrap ${size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'}`}
      style={{ background: '#1F2D45', color: '#4B5563', border: '1px solid #1E2A45' }}
    >
      —
    </span>
  )
  const color = CIRCLE_COLORS[circle] || '#888'
  return (
    <span
      className={`inline-block font-barlow font-bold whitespace-nowrap rounded-full ${size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {CIRCLE_ABBREV[circle]} T{tier}
    </span>
  )
}

function DualBar({ salesUSD, salesTarget, clients, clientsTarget, color }) {
  const sp = salesTarget > 0 ? Math.min(100, (salesUSD / salesTarget) * 100) : 100
  const cp = clientsTarget > 0 ? Math.min(100, (clients / clientsTarget) * 100) : 100
  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center gap-1.5">
        <span className="font-inter text-xs text-gray-600 w-3 flex-shrink-0">$</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sp}%`, background: color }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-inter text-xs text-gray-600 w-3 flex-shrink-0">👥</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cp}%`, background: color }} />
        </div>
      </div>
    </div>
  )
}

function fmt(n)    { return `₱${Number(n || 0).toLocaleString()}` }
function fmtUSD(n) { return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }

export default function AwardsTracker({ incentiveSummary, view = 'quarterly', onSelectMember }) {
  if (!incentiveSummary) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 animate-view-enter">
        <div className="text-4xl">🏆</div>
        <div className="font-barlow font-bold text-xl text-gray-500">AWARDS TRACKER</div>
        <div className="font-inter text-sm text-gray-700">Loading incentive data…</div>
      </div>
    )
  }

  const { members = [], year, activeQuarter, usdRate } = incentiveSummary
  const isYearly    = view === 'yearly'
  const periodLabel = isYearly ? `${year} ANNUAL` : `Q${activeQuarter} ${year} QUARTERLY`

  const sorted      = [...members].sort((a, b) => sortScore(b, isYearly) - sortScore(a, isYearly))
  const top3        = sorted.slice(0, 3)
  const rest        = sorted.slice(3)
  const elecMembers = members.filter(m => m.yearly?.isElectricCar)

  // Remap to visual slots: [2nd, 1st, 3rd]
  const slotEntries = [top3[1] || null, top3[0] || null, top3[2] || null]

  return (
    <div className="h-full flex flex-col px-5 py-3 gap-3 animate-view-enter">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{isYearly ? '🚗' : '🏅'}</span>
          <div>
            <div
              className="font-barlow font-bold text-4xl text-white tracking-wide leading-none"
              style={{}}
            >
              {isYearly ? 'YEARLY AWARDS' : 'QUARTERLY AWARDS'}
            </div>
            <div className="font-inter text-sm text-gray-500">{periodLabel} · ₱{usdRate}/USD</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          {Object.entries(CIRCLE_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="font-inter text-xs text-gray-500">{CIRCLE_ABBREV[name]} = {name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px flex-shrink-0 bg-board-border/60" />

      {/* ── Main: podium + side panel ── */}
      <div className="flex-1 min-h-0 flex gap-4">

        {/* Podium — fills all remaining width */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0">

          {/* Three equal-width slots spanning full left side */}
          <div className="flex-1 min-h-0 flex items-stretch gap-3 px-3">
            {PODIUM_SLOTS.map((slot, si) => {
              const entry  = slotEntries[si]
              const data   = entry ? (isYearly ? entry.yearly : entry.activeQData) : null
              const circle = data?.circle
              const color  = circle ? (CIRCLE_COLORS[circle] || slot.metalColor) : slot.metalColor
              const next   = data?.nextThreshold

              return (
                <div key={slot.rank} className="flex-1 min-w-0 flex flex-col items-center">

                  {/* Card area — content pinned to bottom, clips if tight */}
                  <div className="flex-1 min-h-0 flex flex-col justify-end items-center overflow-hidden w-full pb-2 px-2">

                    {entry ? (
                      <>
                        {/* Avatar */}
                        <div
                          className="rounded-full flex-shrink-0 cursor-pointer"
                          style={{
                            padding:    slot.rank === 1 ? 6 : 4,
                            background: `${color}28`,
                            boxShadow:  'none',
                          }}
                          onClick={() => onSelectMember(entry)}
                        >
                          <Avatar photoUrl={entry.photo_url} name={entry.name} size={slot.avatarSize} teamColor={circle ? color : entry.teamColor} />
                        </div>

                        {/* Name + team */}
                        <div className="text-center mt-3 w-full flex-shrink-0 space-y-1.5">
                          <div
                            className={`font-barlow font-bold ${slot.nameSize} text-white leading-tight`}
                            style={{}}
                          >
                            {entry.name}
                          </div>
                          {entry.teamName && (
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.teamColor }} />
                              <span className="font-inter text-sm text-gray-400 truncate">{entry.teamName}</span>
                            </div>
                          )}
                        </div>

                        {/* Circle badge */}
                        <div className="mt-2 flex-shrink-0">
                          <CircleBadge circle={circle} tier={data?.tier} size="lg" />
                        </div>

                        {/* Cash incentive */}
                        {circle && (
                          <div
                            className={`font-barlow font-bold leading-none mt-2 flex-shrink-0 tabular-nums ${slot.rank === 1 ? 'text-4xl' : 'text-3xl'}`}
                            style={{ color }}
                          >
                            {fmt(data?.cashIncentive)}
                          </div>
                        )}

                        {/* Dual progress bars */}
                        {next && (
                          <div className="w-full px-4 mt-3 flex-shrink-0">
                            <DualBar
                              salesUSD={data?.salesUSD || 0}
                              salesTarget={next.salesTargetUSD}
                              clients={data?.clients || 0}
                              clientsTarget={next.clientsTarget}
                              color={color}
                            />
                          </div>
                        )}
                        {!next && circle && (
                          <div className="font-barlow font-bold text-sm mt-2 flex-shrink-0" style={{ color }}>🏆 MAX LEVEL</div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-15 pb-2">
                        <div className="rounded-full bg-gray-800" style={{ width: slot.avatarSize, height: slot.avatarSize }} />
                        <div className="font-barlow font-bold text-gray-700 text-2xl">—</div>
                      </div>
                    )}
                  </div>

                  {/* Platform — fixed height, pinned to bottom */}
                  <div
                    className="w-full rounded-t-xl flex-shrink-0 flex flex-col items-center justify-center"
                    style={{
                      height:       slot.platformH,
                      background:   isYearly && slot.rank === 1
                        ? 'linear-gradient(180deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.04) 100%)'
                        : entry && circle
                          ? `linear-gradient(180deg, ${color}30 0%, ${color}0A 100%)`
                          : 'rgba(30,42,69,0.25)',
                      border:       isYearly && slot.rank === 1
                        ? '2px solid rgba(245,158,11,0.5)'
                        : `2px solid ${entry && circle ? `${color}55` : '#1E2A4515'}`,
                      borderBottom: 'none',
                      boxShadow:    'none',
                    }}
                  >
                    {isYearly && slot.rank === 1 ? (
                      /* BYD Grand Prize showcase */
                      <div className="flex flex-col items-center gap-2 px-4 w-full">
                        <span
                          className="font-barlow font-bold select-none leading-none"
                          style={{ color: 'rgba(245,158,11,0.2)', fontSize: 88 }}
                        >
                          #1
                        </span>
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/e/e2/BYD_Auto_2022_logo.svg"
                          alt="BYD"
                          style={{ height: 38, filter: 'brightness(0) invert(1)' }}
                        />
                        <div
                          className="font-barlow font-bold text-xl uppercase tracking-widest leading-none text-amber-400"
                          style={{}}
                        >
                          GRAND PRIZE
                        </div>
                        <div className="w-12 h-px" style={{ background: 'rgba(245,158,11,0.4)' }} />
                        {elecMembers.length > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="font-barlow font-bold text-xs text-amber-500 uppercase tracking-wide">🔥 On Track</div>
                            {elecMembers.map(m => (
                              <div key={m.id} className="font-barlow font-bold text-sm text-white">{m.name}</div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span
                        className="font-barlow font-bold select-none leading-none"
                        style={{
                          color:    entry && circle ? `${color}38` : '#1E2A4540',
                          fontSize: slot.rank === 1 ? 88 : 64,
                        }}
                      >
                        #{slot.rank}
                      </span>
                    )}
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

        {/* ── Side panel: rest of agents ── */}
        {rest.length > 0 && (
          <div className="w-80 flex-shrink-0 border-l border-board-border pl-4 min-h-0 flex flex-col gap-3 pt-4">
            <div className="font-barlow font-bold text-base text-gray-500 uppercase tracking-widest flex-shrink-0">
              ALSO RANKED <span className="text-gray-700 text-sm">({rest.length})</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {rest.map((entry, i) => {
                const data   = isYearly ? entry.yearly : entry.activeQData
                const circle = data?.circle
                const color  = circle ? (CIRCLE_COLORS[circle] || '#6B7280') : '#6B7280'
                const next   = data?.nextThreshold
                const sp     = next
                  ? Math.min(100, ((data?.salesUSD || 0) / next.salesTargetUSD) * 100)
                  : (circle ? 100 : 0)

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl px-3 py-3 cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      background: circle ? `${color}0C` : '#0B0F1E',
                      border:     `1px solid ${circle ? `${color}28` : '#1E2A45'}`,
                    }}
                    onClick={() => onSelectMember(entry)}
                  >
                    {/* Row 1: rank + avatar + name/team + badge */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="font-barlow font-semibold text-base text-gray-500 w-5 text-center flex-shrink-0">
                        {i + 4}
                      </span>
                      <Avatar
                        photoUrl={entry.photo_url}
                        name={entry.name}
                        size={40}
                        teamColor={circle ? color : entry.teamColor}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-barlow font-bold text-base text-white leading-tight">{entry.name}</div>
                        {entry.teamName && (
                          <div className="font-inter text-xs text-gray-500">{entry.teamName}</div>
                        )}
                      </div>
                      <CircleBadge circle={circle} tier={data?.tier} />
                    </div>

                    {/* Row 2: progress bar toward next threshold */}
                    {next && (
                      <div className="flex items-center gap-2 pl-8 mb-0.5">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
                          <div className="h-full rounded-full" style={{ width: `${sp}%`, background: color }} />
                        </div>
                        <div className="font-barlow font-bold text-xs whitespace-nowrap" style={{ color }}>
                          {Math.round(sp)}%
                        </div>
                      </div>
                    )}
                    {!next && circle && (
                      <div className="pl-8 mb-0.5">
                        <span className="font-barlow font-bold text-xs" style={{ color }}>🏆 MAX LEVEL</span>
                      </div>
                    )}

                    {/* Row 3: cash incentive or sales USD */}
                    <div
                      className="text-right font-barlow font-bold text-sm mt-0.5"
                      style={{ color: circle ? color : '#4B5563' }}
                    >
                      {circle ? fmt(data?.cashIncentive) : fmtUSD(data?.salesUSD || 0)}
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
