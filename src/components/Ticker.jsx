function timeAgo(timestamp) {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function fmt(amount, currency = 'PHP') {
  return `${currency} ${Number(amount).toLocaleString()}`
}

export default function Ticker({ sales = [], currency = 'PHP' }) {
  if (!sales.length) return null

  // DOUBLED items + translateX(-50%) keyframe = seamless loop.
  // Tripling breaks the loop point (would need -33.3%).
  const items    = [...sales, ...sales]
  const duration = Math.max(30, sales.length * 5)

  return (
    <div className="relative overflow-hidden h-full flex items-center">
      <div
        className="flex gap-10 whitespace-nowrap"
        style={{ animation: `ticker ${duration}s linear infinite` }}
      >
        {items.map((s, i) => (
          <span
            key={`${s.id}-${i}`}
            className="inline-flex items-center gap-2 font-inter text-sm"
          >
            <span className="text-base">🎉</span>
            <span className="font-semibold text-white">{s.memberName}</span>
            <span className="text-gray-600">—</span>
            <span className="text-neon-green font-bold">{fmt(s.amount, currency)}</span>
            <span className="text-gray-600 text-xs">{timeAgo(s.timestamp)}</span>
            <span className="text-board-border/50 ml-4">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
