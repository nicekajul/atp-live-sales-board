import { useState } from 'react'

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function Avatar({ photoUrl, name = '', size = 40, teamColor = '#00F5A0', className = '' }) {
  const [imgError, setImgError] = useState(false)

  const baseStyle = {
    width:        size,
    height:       size,
    minWidth:     size,
    borderRadius: '50%',
    flexShrink:   0,
  }

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={className}
        style={{
          ...baseStyle,
          objectFit:   'cover',
          border:      `2px solid ${teamColor}88`,
        }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center font-barlow font-bold ${className}`}
      style={{
        ...baseStyle,
        fontSize:   size * 0.35,
        background: `${teamColor}22`,
        border:     `2px solid ${teamColor}55`,
        color:      teamColor,
      }}
    >
      {initials(name)}
    </div>
  )
}
