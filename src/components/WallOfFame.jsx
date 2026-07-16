import Avatar from './Avatar.jsx'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function GoldBarIcon({ size = 18 }) {
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

function SilverCoinIcon({ size = 18 }) {
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

const CATEGORIES = [
  {
    key:       'diamond',
    label:     'Diamond Club',
    icon:      '💎',
    threshold: '≥ PHP 15,000',
    color:     '#A855F7',
    glow:      'rgba(168,85,247,0.35)',
    bg:        'rgba(168,85,247,0.08)',
  },
  {
    key:       'gold',
    label:     'Gold Club',
    icon:      null,
    iconNode:  <GoldBarIcon size={20} />,
    threshold: '≥ PHP 10,000',
    color:     '#EAB308',
    glow:      'rgba(234,179,8,0.35)',
    bg:        'rgba(234,179,8,0.08)',
  },
  {
    key:       'silver',
    label:     'Silver Club',
    icon:      null,
    iconNode:  <SilverCoinIcon size={20} />,
    threshold: '≥ PHP 5,000',
    color:     '#94A3B8',
    glow:      'rgba(148,163,184,0.3)',
    bg:        'rgba(148,163,184,0.06)',
  },
  {
    key:       'highFlyers',
    label:     'High Flyers',
    icon:      '🦅',
    threshold: '100% Quota',
    color:     '#00F5A0',
    glow:      'rgba(0,245,160,0.35)',
    bg:        'rgba(0,245,160,0.08)',
  },
]

function MemberChip({ member, color, currency }) {
  const firstName = member.name.split(' ')[0]
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-inter text-xs"
      style={{
        background:  `${color}15`,
        border:      `1px solid ${color}40`,
        color:       '#E5E7EB',
      }}
      title={`${member.name} — ${fmt(member.total, currency)}`}
    >
      <Avatar photoUrl={member.photo_url} name={member.name} size={18} teamColor={color} />
      <span className="font-semibold truncate max-w-[72px]">{firstName}</span>
      <span className="font-barlow font-bold text-xs" style={{ color }}>{fmt(member.total, currency)}</span>
    </div>
  )
}

export default function WallOfFame({ wallOfFame, currency = 'PHP' }) {
  if (!wallOfFame) return null

  const { prevMonth, prevYear } = wallOfFame
  const monthLabel = `${MONTHS[(prevMonth || 1) - 1]} ${prevYear}`
  const hasAny = CATEGORIES.some(c => (wallOfFame[c.key] || []).length > 0)

  return (
    <div
      className="flex-shrink-0 border-t border-board-border/60 px-4 py-2"
      style={{ background: 'linear-gradient(180deg, #0A0E1A 0%, #0D1220 100%)' }}
    >
      <div className="flex items-stretch gap-3 h-full">
        {/* Month label */}
        <div className="flex flex-col justify-center flex-shrink-0 border-r border-board-border/50 pr-3">
          <div className="font-barlow font-black text-lg text-white leading-tight uppercase tracking-wide">
            Wall of Fame
          </div>
          <div className="font-inter text-xs text-gray-500">{monthLabel}</div>
        </div>

        {/* Categories */}
        <div className="flex-1 grid grid-cols-4 gap-3 min-w-0">
          {CATEGORIES.map(cat => {
            const members = wallOfFame[cat.key] || []
            return (
              <div
                key={cat.key}
                className="flex flex-col gap-1 rounded-lg px-2 py-1.5"
                style={{ background: cat.bg, border: `1px solid ${cat.color}30` }}
              >
                {/* Category header */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="leading-none flex-shrink-0">{cat.iconNode || cat.icon}</span>
                  <div className="min-w-0">
                    <div
                      className="font-barlow font-bold text-sm leading-tight uppercase tracking-wide truncate"
                      style={{ color: cat.color }}
                    >
                      {cat.label}
                    </div>
                    <div className="font-inter text-xs text-gray-600 leading-none">{cat.threshold}</div>
                  </div>
                </div>

                {/* Members */}
                {members.length === 0 ? (
                  <div className="font-inter text-xs text-gray-700 italic">—</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {members.slice(0, 5).map(m => (
                      <MemberChip key={m.id} member={m} color={cat.color} currency={currency} />
                    ))}
                    {members.length > 5 && (
                      <span className="font-inter text-xs text-gray-600 self-center">+{members.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!hasAny && (
          <div className="flex items-center justify-center text-xs text-gray-700 font-inter italic">
            No sales recorded for {monthLabel}
          </div>
        )}
      </div>
    </div>
  )
}
