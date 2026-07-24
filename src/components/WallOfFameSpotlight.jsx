import Avatar from './Avatar.jsx'
import QuotaBar from './QuotaBar.jsx'
import { useAutoScroll } from '../hooks/useAutoScroll.js'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function GoldBarIcon({ size = 40 }) {
  return (
    <svg width={size} height={Math.round(size * 0.65)} viewBox="0 0 40 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 22 L10 4 L30 4 L34 22 Z" fill="#EAB308" />
      <path d="M6 22 L34 22 L36 26 L4 26 Z" fill="#A16207" />
      <path d="M10 4 L30 4 L28 8 L12 8 Z" fill="#FDE68A" />
      <line x1="16" y1="4" x2="14" y2="22" stroke="#A16207" strokeWidth="0.8" opacity="0.4" />
      <line x1="24" y1="4" x2="26" y2="22" stroke="#A16207" strokeWidth="0.8" opacity="0.4" />
    </svg>
  )
}

function SilverCoinIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#94A3B8" />
      <circle cx="16" cy="16" r="11" fill="#CBD5E1" />
      <circle cx="16" cy="16" r="8"  fill="#94A3B8" />
      <circle cx="16" cy="14" r="8"  fill="#E2E8F0" opacity="0.25" />
      <circle cx="13" cy="13" r="3"  fill="white" opacity="0.2" />
    </svg>
  )
}

// Podium order: Gold (left, 2nd) → Diamond (center, 1st) → Silver (right, 3rd)
// heightOffset shrinks each column so total height reflects the podium step:
//   Diamond (full) → member-list height = 100% - 140 - heading
//   Gold    (-45px) → member-list height = (100%-45) - 95 - heading  ≈ same
//   Silver  (-80px) → member-list height = (100%-80) - 60 - heading  ≈ same
const TIER_COLS = [
  {
    key:          'gold',
    label:        'Gold Club',
    icon:         null,
    IconComponent: GoldBarIcon,
    threshold:    'PHP 10,000+',
    color:        '#EAB308',
    platformH:    95,
    heightOffset: 45,
  },
  {
    key:          'diamond',
    label:        'Diamond Club',
    icon:         '💎',
    threshold:    'PHP 15,000+',
    color:        '#A855F7',
    platformH:    140,
    heightOffset: 0,
  },
  {
    key:          'silver',
    label:        'Silver Club',
    icon:         null,
    IconComponent: SilverCoinIcon,
    threshold:    'PHP 5,000+',
    color:        '#94A3B8',
    platformH:    60,
    heightOffset: 80,
  },
]

function MemberRow({ member, color, currency, rank }) {
  return (
    <div
      className="rounded-xl overflow-hidden flex items-stretch"
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}
    >
      {/* Avatar — fills full card height */}
      <div className="flex-shrink-0 p-2">
        <Avatar photoUrl={member.photo_url} name={member.name} size={68} teamColor={color} />
      </div>

      {/* Info — rank, name, team, amount */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-2.5 pr-3 pl-1">
        <div className="min-w-0">
          <div className="font-barlow font-bold text-base text-white leading-tight truncate">
            {member.name}
          </div>
          {member.teamName && (
            <div className="font-inter text-xs text-gray-500 truncate">{member.teamName}</div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-barlow font-black text-sm" style={{ color: `${color}60` }}>
            #{rank}
          </span>
          <span className="font-barlow font-bold text-sm" style={{ color }}>
            {fmt(member.total, currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

function TierColumn({ cat, members, currency }) {
  const { color, label, icon, IconComponent, threshold, platformH, heightOffset } = cat

  return (
    <div className="flex-1 min-w-0 flex flex-col"
      style={{ height: `calc(100% - ${heightOffset}px)` }}>
      {/* Category heading */}
      <div className="flex-shrink-0 text-center mb-3 px-2">
        <div className="flex justify-center mb-1 leading-none">
          {IconComponent ? <IconComponent size={40} /> : <span className="text-4xl">{icon}</span>}
        </div>
        <div
          className="font-barlow font-black text-2xl uppercase leading-tight"
          style={{ color }}
        >
          {label}
        </div>
        <div className="font-inter text-xs text-gray-600 mt-0.5">{threshold}</div>
      </div>

      {/* Member list — fills available height */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 mb-3" style={{ minHeight: 0 }}>
        {members.length === 0 ? (
          <div className="text-center text-gray-700 italic font-inter text-sm py-6">
            No members this month
          </div>
        ) : (
          members.map((m, i) => (
            <MemberRow key={m.id} member={m} color={color} currency={currency} rank={i + 1} />
          ))
        )}
      </div>

      {/* Platform */}
      <div
        className="flex-shrink-0 w-full flex items-center justify-center rounded-t-xl"
        style={{
          height:       platformH,
          background:   members.length
            ? `linear-gradient(180deg, ${color}28 0%, ${color}08 100%)`
            : 'rgba(30,42,69,0.2)',
          border:       `2px solid ${color}${members.length ? '55' : '18'}`,
          borderBottom: 'none',
        }}
      >
        <span className="leading-none select-none opacity-50">
          {IconComponent ? <IconComponent size={44} /> : <span className="text-5xl">{icon}</span>}
        </span>
      </div>
    </div>
  )
}

function HighFlyersPanel({ members, currency }) {
  const scrollRef = useAutoScroll(members.length)

  return (
    <div className="flex flex-col min-h-0 h-full pt-4">
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">🦅</span>
          <div>
            <div className="font-barlow font-black text-xl text-neon-green leading-tight uppercase">
              High Flyers
            </div>
            <div className="font-inter text-xs text-gray-600">Reached 100% quota</div>
          </div>
        </div>
        <div className="h-px bg-neon-green/20 mt-2" />
      </div>

      {/* List */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {members.length === 0 ? (
          <div className="text-center text-gray-700 italic font-inter text-sm py-6">
            No members this month
          </div>
        ) : (
          members.map((m, i) => {
            const pct    = m.quota > 0 ? Math.round((m.total / m.quota) * 100) : null
            const color  = '#00F5A0'
            return (
              <div
                key={m.id}
                className="rounded-xl px-3 py-3"
                style={{ background: 'rgba(0,245,160,0.06)', border: '1px solid rgba(0,245,160,0.25)' }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="font-barlow font-black text-base text-gray-500 w-5 text-center">{i + 1}</span>
                  <Avatar photoUrl={m.photo_url} name={m.name} size={40} teamColor={color} />
                  <div className="flex-1 min-w-0">
                    <div className="font-barlow font-bold text-base text-white truncate">{m.name}</div>
                    {m.teamName && (
                      <div className="font-inter text-xs text-gray-500 truncate">{m.teamName}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-8">
                  <div className="flex-1">
                    <QuotaBar
                      current={m.total}
                      quota={m.quota || m.total}
                      color={color}
                      size="sm"
                      showLabel={false}
                      currency={currency}
                    />
                  </div>
                  <div className="font-barlow font-bold text-sm whitespace-nowrap" style={{ color }}>
                    {pct !== null ? `${pct}%` : ''}
                  </div>
                </div>
                <div className="text-right font-barlow font-bold text-sm mt-0.5" style={{ color }}>
                  {fmt(m.total, currency)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function WallOfFameSpotlight({ wallOfFame, currency = 'PHP' }) {
  if (!wallOfFame) {
    return (
      <div className="h-full flex items-center justify-center text-gray-700 font-inter italic animate-view-enter">
        No Wall of Fame data available yet.
      </div>
    )
  }

  const { prevMonth, prevYear } = wallOfFame
  const monthLabel = `${MONTHS[(prevMonth || 1) - 1]} ${prevYear}`
  const highFlyers = wallOfFame.highFlyers || []

  const totalHonored = (wallOfFame.diamond?.length || 0)
                     + (wallOfFame.gold?.length    || 0)
                     + (wallOfFame.silver?.length  || 0)

  return (
    <div className="h-full flex flex-col px-5 py-3 gap-3 animate-view-enter">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: '#A855F7' }} />
          <div>
            <div className="font-barlow font-bold text-3xl tracking-wide uppercase leading-none" style={{ color: '#A855F7' }}>
              WALL OF FAME
            </div>
            <div className="font-inter text-sm text-gray-500 mt-0.5">{monthLabel} CHAMPIONS</div>
          </div>
        </div>
        <div className="font-inter text-sm text-gray-600">
          {totalHonored} honored · {highFlyers.length} high flyer{highFlyers.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="h-px flex-shrink-0 bg-board-border/60" />

      {/* Main: 3 tier columns + High Flyers sidebar */}
      <div className="flex-1 min-h-0 flex gap-4">

        {/* Tier columns — items-end so columns bottom-align, creating podium step effect */}
        <div className="flex-1 min-w-0 flex items-end gap-4" style={{ minHeight: 0 }}>
          {TIER_COLS.map(cat => (
            <TierColumn
              key={cat.key}
              cat={cat}
              members={wallOfFame[cat.key] || []}
              currency={currency}
            />
          ))}
        </div>

        {/* Stage floor spanning all 3 tier columns — rendered as part of each column via flex */}
        {/* High Flyers sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-board-border pl-4 min-h-0">
          <HighFlyersPanel members={highFlyers} currency={currency} />
        </div>
      </div>

      {/* Shared stage floor below all three columns */}
      <div
        className="flex-shrink-0 mx-0 h-4 rounded-sm"
        style={{ background: 'linear-gradient(90deg, #111827 0%, #1F2D45 40%, #263350 50%, #1F2D45 60%, #111827 100%)' }}
      />

    </div>
  )
}
