export default function QuotaBar({ current = 0, quota = 0, color = '#00F5A0', size = 'md', showLabel = true, currency = 'PHP' }) {
  const pct    = quota > 0 ? Math.min(100, (current / quota) * 100) : 0
  const hit    = pct >= 100
  const height = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4', xl: 'h-5' }[size] || 'h-2.5'

  const fmt = (n) => `${currency} ${Number(n).toLocaleString()}`

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-gray-400 font-inter">{fmt(current)}</span>
          <span
            className="text-xs font-semibold font-inter"
            style={{ color: hit ? color : '#9CA3AF' }}
          >
            {pct.toFixed(1)}%{hit && ' ✓'}
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-800/60 rounded-full overflow-hidden ${height}`}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width:      `${pct}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            boxShadow:  'none',
          }}
        />
      </div>
      {showLabel && quota > 0 && (
        <div className="text-right mt-0.5">
          <span className="text-xs text-gray-600 font-inter">/ {fmt(quota)}</span>
        </div>
      )}
    </div>
  )
}
