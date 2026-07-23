import PodiumStage from './PodiumStage.jsx'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function IndividualStandings({
  members, teams, memberTotals, memberTotalsToday, memberQuotas, currency, viewMode,
}) {
  const now   = new Date()
  const label = `${MONTHS[now.getMonth()]} ${now.getFullYear()} — ${viewMode === 'daily' ? "TODAY'S STANDINGS" : 'MONTH TO DATE'}`

  const entries = [...members]
    .map(m => {
      const team = teams.find(t => String(t.id) === String(m.team_id))
      return {
        id:        m.id,
        name:      m.name,
        photo_url: m.photo_url,
        total:     viewMode === 'daily' ? (memberTotalsToday[m.id] || 0) : (memberTotals[m.id] || 0),
        teamColor: team?.color || '#6B7280',
        teamName:  team?.name  || '',
        tier:      m.tier || '',
        quota:     memberQuotas[m.id] || 0,
      }
    })
    .sort((a, b) => b.total - a.total)

  return (
    <div className="h-full flex flex-col px-5 py-3 gap-3 animate-view-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-2 h-12 rounded-full flex-shrink-0" style={{ background: '#EAB308' }} />
          <div>
            <div className="font-barlow font-bold text-5xl tracking-wide uppercase leading-none" style={{ color: '#EAB308' }}>
              TOP AGENTS
            </div>
            <div className="font-inter text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        </div>
        <div className="font-inter text-sm text-gray-600">
          {entries.length} agents ranked
        </div>
      </div>

      <div className="h-px flex-shrink-0 bg-board-border/60" />

      {/* Podium */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PodiumStage
          entries={entries}
          currency={currency}
          othersTitle="ALSO RANKED"
        />
      </div>
    </div>
  )
}
