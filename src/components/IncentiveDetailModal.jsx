import Avatar from './Avatar.jsx'

const CIRCLE_ABBREV = (c) => ({
  "Chairman's Circle":  'CC',
  "President's Circle": 'PC',
  "Executive Circle":   'EC',
})[c] || ''

const CIRCLE_COLORS = {
  "Chairman's Circle":  '#F59E0B',
  "President's Circle": '#06B6D4',
  "Executive Circle":   '#F97316',
}

const CIRCLES_ORDER = ["Chairman's Circle", "President's Circle", "Executive Circle"]

function fmt(n) { return `₱${Number(n || 0).toLocaleString()}` }
function fmtUSD(n) { return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }

function ProgressSection({ label, salesUSD, salesPHP, clients, circle, tier, cashIncentive, nextThreshold, usdRate, periodType }) {
  const color = circle ? (CIRCLE_COLORS[circle] || '#888') : '#4B5563'
  const QUARTERS = ["Chairman's Circle T1","Chairman's Circle T2","Chairman's Circle T3","President's Circle T1","President's Circle T2","President's Circle T3","Executive Circle T1","Executive Circle T2","Executive Circle T3"]

  const salesPct  = nextThreshold ? Math.min(100, (salesUSD  / nextThreshold.salesTargetUSD) * 100) : 100
  const clientPct = nextThreshold ? Math.min(100, (clients    / nextThreshold.clientsTarget)  * 100) : 100

  return (
    <div className="board-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-barlow font-bold text-base text-white">{label}</div>
        {circle ? (
          <div className="flex items-center gap-2">
            <span
              className="font-barlow font-bold text-sm px-3 py-1 rounded-full"
              style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
            >
              {circle} — Tier {tier}
            </span>
          </div>
        ) : (
          <span className="font-inter text-xs text-gray-600 italic">Not yet qualifying</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="font-inter text-xs text-gray-500 mb-0.5">Sales ({periodType === 'yearly' ? 'YTD' : 'Quarter'})</div>
          <div className="font-barlow font-bold text-lg text-white">{fmtUSD(salesUSD)}</div>
          <div className="font-inter text-xs text-gray-600">{fmt(salesPHP)}</div>
        </div>
        <div>
          <div className="font-inter text-xs text-gray-500 mb-0.5">New Clients</div>
          <div className="font-barlow font-bold text-lg text-white">{clients}</div>
        </div>
      </div>

      {nextThreshold && (
        <div className="space-y-1.5">
          <div className="font-inter text-xs text-gray-500">
            Progress to <span style={{ color: CIRCLE_COLORS[nextThreshold.circle] || '#888' }}>{nextThreshold.circle} Tier {nextThreshold.tier}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-inter text-xs text-gray-600 w-6">$</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
              <div className="h-full rounded-full" style={{ width: `${salesPct}%`, background: color }} />
            </div>
            <span className="font-inter text-xs text-gray-500 whitespace-nowrap">
              {fmtUSD(salesUSD)} / {fmtUSD(nextThreshold.salesTargetUSD)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-inter text-xs text-gray-600 w-6">👥</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1E2A45' }}>
              <div className="h-full rounded-full" style={{ width: `${clientPct}%`, background: color }} />
            </div>
            <span className="font-inter text-xs text-gray-500 whitespace-nowrap">
              {clients} / {nextThreshold.clientsTarget} clients
            </span>
          </div>
          <div className="font-inter text-xs" style={{ color }}>
            Need {fmtUSD(nextThreshold.salesNeededUSD)} more + {nextThreshold.clientsNeeded} more clients to reach {nextThreshold.circle} Tier {nextThreshold.tier}
          </div>
        </div>
      )}
      {!nextThreshold && circle && (
        <div className="font-barlow font-bold text-sm text-center py-1" style={{ color }}>
          🏆 MAXIMUM LEVEL ACHIEVED!
        </div>
      )}

      {circle && (
        <div className="border-t border-board-border pt-3 space-y-2">
          <div className="font-barlow font-bold text-sm" style={{ color }}>
            Cash Incentive: {fmt(cashIncentive)}
          </div>
        </div>
      )}
    </div>
  )
}

function PerksList({ items, color }) {
  if (!items || !items.length) return null
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 font-inter text-xs text-gray-400">
          <span style={{ color }} className="flex-shrink-0 mt-0.5">✓</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function IncentiveDetailModal({ member, usdRate, onClose }) {
  if (!member) return null

  const qData   = member.activeQData || {}
  const yData   = member.yearly      || {}
  const qColor  = qData.circle ? (CIRCLE_COLORS[qData.circle] || '#888') : '#4B5563'
  const yColor  = yData.circle ? (CIRCLE_COLORS[yData.circle] || '#888') : '#4B5563'
  const topColor= yData.circle ? yColor : (qData.circle ? qColor : '#00F5A0')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border"
        style={{ background: '#0B0F1E', borderColor: `${topColor}44` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 rounded-t-2xl"
          style={{ background: `linear-gradient(135deg, ${topColor}18 0%, #0B0F1E 100%)`, borderBottom: `1px solid ${topColor}33` }}
        >
          <Avatar photoUrl={member.photo_url} name={member.name} size={48} teamColor={member.teamColor} />
          <div className="flex-1 min-w-0">
            <div className="font-barlow font-black text-xl text-white">{member.name}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-inter text-xs" style={{ color: member.teamColor }}>{member.teamName}</span>
              {member.memberTier && (
                <span className="font-barlow text-xs text-gray-500">{member.memberTier}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Electric car banner */}
          {yData.isElectricCar && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#F59E0B18', border: '1px solid #F59E0B55' }}
            >
              <span className="text-3xl">🚗</span>
              <div>
                <div className="font-barlow font-black text-lg text-amber-400">ELECTRIC CAR QUALIFIED!</div>
                <div className="font-inter text-xs text-amber-600">On track for the grand prize this year</div>
              </div>
            </div>
          )}

          {/* Quarterly breakdown */}
          <div>
            <div className="font-barlow font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">
              Q{member.activeQuarter?.replace('Q','')} Quarterly
            </div>
            <ProgressSection
              label={`${member.activeQuarter} Performance`}
              salesUSD={qData.salesUSD || 0}
              salesPHP={qData.salesPHP || 0}
              clients={qData.clients || 0}
              circle={qData.circle}
              tier={qData.tier}
              cashIncentive={qData.cashIncentive || 0}
              nextThreshold={qData.nextThreshold}
              usdRate={usdRate}
              periodType="quarterly"
            />
            {qData.incentivesList?.length > 0 && (
              <div className="mt-2 px-1">
                <div className="font-inter text-xs text-gray-600 mb-1">Quarterly perks:</div>
                <PerksList items={qData.incentivesList} color={qColor} />
              </div>
            )}
          </div>

          {/* Yearly breakdown */}
          <div>
            <div className="font-barlow font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">
              Annual Performance
            </div>
            <ProgressSection
              label="Year-to-Date"
              salesUSD={yData.salesUSD || 0}
              salesPHP={yData.salesPHP || 0}
              clients={yData.clients || 0}
              circle={yData.circle}
              tier={yData.tier}
              cashIncentive={yData.cashIncentive || 0}
              nextThreshold={yData.nextThreshold}
              usdRate={usdRate}
              periodType="yearly"
            />
            {yData.incentivesList?.length > 0 && (
              <div className="mt-2 px-1">
                <div className="font-inter text-xs text-gray-600 mb-1">Annual perks:</div>
                <PerksList items={yData.incentivesList} color={yColor} />
              </div>
            )}
          </div>

          {/* All quarters summary */}
          <div>
            <div className="font-barlow font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">All Quarters</div>
            <div className="grid grid-cols-4 gap-2">
              {['Q1','Q2','Q3','Q4'].map(q => {
                const qd = member.quarters?.[q] || {}
                const c  = qd.circle
                const col = c ? (CIRCLE_COLORS[c] || '#888') : '#2D3748'
                return (
                  <div
                    key={q}
                    className="rounded-lg p-2 text-center"
                    style={{ background: c ? `${col}15` : '#111827', border: `1px solid ${c ? `${col}44` : '#1E2A45'}` }}
                  >
                    <div className="font-barlow font-bold text-sm" style={{ color: c ? col : '#4B5563' }}>{q}</div>
                    {c ? (
                      <>
                        <div className="font-barlow font-bold text-xs" style={{ color: col }}>
                          {CIRCLE_ABBREV(c)} T{qd.tier}
                        </div>
                        <div className="font-inter text-xs text-gray-600">{fmtUSD(qd.salesUSD)}</div>
                      </>
                    ) : (
                      <div className="font-inter text-xs text-gray-700 italic">—</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
