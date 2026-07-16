import { useState, useEffect } from 'react'
import Avatar from './Avatar.jsx'

const ROTATE_MS = 5000

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
  { key: 'diamond',   label: 'Diamond Club', color: '#A855F7', icon: '💎' },
  { key: 'gold',      label: 'Gold Club',    color: '#EAB308', IconComponent: GoldBarIcon },
  { key: 'silver',    label: 'Silver Club',  color: '#94A3B8', IconComponent: SilverCoinIcon },
  { key: 'highFlyers',label: 'High Flyers',  color: '#00F5A0', icon: '🦅' },
]

export default function HallOfFame({ wallOfFame, currency = 'PHP' }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive(i => (i + 1) % CATEGORIES.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  if (!wallOfFame) return (
    <div className="flex items-center h-full px-4">
      <span className="text-xs font-barlow tracking-widest text-gray-600 uppercase">Wall of Fame</span>
    </div>
  )

  const cat     = CATEGORIES[active]
  const members = wallOfFame[cat.key] || []
  const { IconComponent, icon, color, label } = cat

  return (
    <div className="flex items-center gap-3 h-full px-4 overflow-hidden">
      {/* Label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="leading-none flex items-center">
          {IconComponent ? <IconComponent size={16} /> : <span className="text-base leading-none">{icon}</span>}
        </span>
        <span
          className="font-barlow font-bold text-xs uppercase tracking-wide whitespace-nowrap"
          style={{ color }}
        >
          {label}
        </span>
      </div>

      <div className="w-px h-4 bg-gray-800 flex-shrink-0" />

      {/* Members */}
      {members.length === 0 ? (
        <span className="font-inter text-xs text-gray-700 italic">No members yet</span>
      ) : (
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          {members.slice(0, 6).map(m => (
            <div key={m.id} className="flex items-center gap-1 flex-shrink-0">
              <Avatar photoUrl={m.photo_url} name={m.name} size={22} teamColor={color} />
              <span className="font-inter text-xs text-gray-300 whitespace-nowrap">
                {m.name.split(' ')[0]}
              </span>
            </div>
          ))}
          {members.length > 6 && (
            <span className="font-inter text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
              +{members.length - 6}
            </span>
          )}
        </div>
      )}

      {/* Category dots */}
      <div className="flex gap-1 flex-shrink-0 ml-auto">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.key}
            onClick={() => setActive(i)}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{ background: i === active ? c.color : '#1E2A45' }}
          />
        ))}
      </div>
    </div>
  )
}
