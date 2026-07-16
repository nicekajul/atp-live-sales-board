import confetti from 'canvas-confetti'

const isMobile = () => window.innerWidth < 768
const scale    = (n) => isMobile() ? Math.round(n * 0.5) : n

export const burst = {
  light(color = '#00F5A0') {
    confetti({
      particleCount: scale(80), spread: 60,
      colors: [color, '#FFFFFF', '#FFD700'],
      origin: { y: 0.3 }, gravity: 0.8, scalar: 0.9,
    })
  },

  medium(color = '#00F5A0') {
    confetti({
      particleCount: scale(150), spread: 90,
      colors: ['#F59E0B', '#FFFFFF', '#E11D48', '#2563EB'],
      startVelocity: 40, origin: { y: 0.4 },
      shapes: ['square', 'circle'],
    })
  },

  heavy(color = '#00F5A0') {
    const cols = [color, '#FFFFFF', '#FFD700']
    confetti({ particleCount: scale(100), angle:  60, spread: 55, origin: { x: 0 }, colors: cols })
    confetti({ particleCount: scale(100), angle: 120, spread: 55, origin: { x: 1 }, colors: cols })
  },

  epic(color = '#00F5A0') {
    const cols = [color, '#FFD700', '#FFFFFF', '#FFA500']
    let n = 0
    const fire = () => {
      confetti({
        particleCount: scale(55), spread: 340, startVelocity: 30, ticks: 200,
        colors: cols, shapes: ['square', 'circle', 'star'],
        origin: { x: 0.1 + Math.random() * 0.8, y: Math.random() * 0.5 },
      })
      if (++n < 14) setTimeout(fire, 350)
    }
    fire()
  },

  legendary() {
    const cols = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8']
    const origins = [{ x:0.5,y:0.5 },{ x:0,y:0 },{ x:1,y:0 },{ x:0,y:1 },{ x:1,y:1 }]
    let n = 0
    const fire = () => {
      origins.forEach(origin =>
        confetti({ particleCount: scale(40), spread: 360, startVelocity: 55, ticks: 300, colors: cols, shapes: ['square','circle','star'], origin })
      )
      if (++n < 18) setTimeout(fire, 400)
    }
    fire()
  },

  gold() {
    confetti({
      particleCount: scale(120), spread: 80,
      colors: ['#FFD700', '#FFA500', '#FFE4B5', '#FFFACD'],
      shapes: ['circle', 'star'], scalar: 1.2, origin: { y: 0.35 },
    })
  },

  franki(c1 = '#00F5A0', c2 = '#FFD700') {
    const cols = [c1, c2, '#FFFFFF', '#FFD700']
    confetti({ particleCount: scale(70), spread: 90, angle:  60, colors: cols, origin: { x: 0.15, y: 0.5 }, gravity: 0.75 })
    confetti({ particleCount: scale(70), spread: 90, angle: 120, colors: cols, origin: { x: 0.85, y: 0.5 }, gravity: 0.75 })
  },
}

// Sustained trickle — call repeatedly
export const sustain = {
  regular(color = '#00F5A0') {
    confetti({ particleCount: scale(10), spread: 65, colors: [color,'#FFFFFF'], origin: { x: 0.4 + Math.random()*0.2, y: 0.2 }, gravity: 0.7 })
  },
  team(color) {
    confetti({ particleCount: scale(18), spread: 90, colors: [color,'#FFFFFF','#FFD700'], origin: { x: 0.3 + Math.random()*0.4, y: 0.15 }, gravity: 0.65 })
  },
  site() {
    confetti({ particleCount: scale(25), spread: 80, angle:  65, colors: ['#FFD700','#FFA500','#FFFFFF'], origin: { x: 0, y: 0.6 }, gravity: 0.7 })
    confetti({ particleCount: scale(25), spread: 80, angle: 115, colors: ['#FFD700','#FFA500','#FFFFFF'], origin: { x: 1, y: 0.6 }, gravity: 0.7 })
  },
}
