import { useEffect, useRef, useState } from 'react'

const GOLD_COLORS = [
  'rgba(255,215,0,0.30)',
  'rgba(255,255,255,0.22)',
  'rgba(255,215,0,0.30)',
]
const SIREN_COLORS = [
  'rgba(220,38,38,0.28)',
  'rgba(37,99,235,0.28)',
  'rgba(220,38,38,0.28)',
]

export default function SirenFlash({ tier, active }) {
  const [bg, setBg]     = useState('transparent')
  const tidRef          = useRef(null)

  useEffect(() => {
    if (!active || tier < 3) { setBg('transparent'); return }

    const colors = tier >= 5 ? GOLD_COLORS : SIREN_COLORS
    let step = 0
    const flash = () => {
      setBg(colors[step % colors.length])
      step++
      if (step < 7) tidRef.current = setTimeout(flash, 190)
      else setBg('transparent')
    }
    flash()
    return () => clearTimeout(tidRef.current)
  }, [active, tier])

  if (bg === 'transparent') return null
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ background: bg, zIndex: 98, transition: 'background 0.18s' }}
    />
  )
}
