/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'board-bg':     '#0A0E1A',
        'board-card':   '#0F1629',
        'board-border': '#1E2A45',
        'neon-green':   '#00F5A0',
        'neon-dim':     '#00C47E',
      },
      fontFamily: {
        barlow: ['"Barlow Condensed"', 'sans-serif'],
        inter:  ['Inter', 'sans-serif'],
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%':      { opacity: 0.4, transform: 'scale(0.85)' },
        },
        'glow-green': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0,245,160,0.35)' },
          '50%':      { boxShadow: '0 0 40px rgba(0,245,160,0.75), 0 0 80px rgba(0,245,160,0.25)' },
        },
        'glow-team': {
          '0%, 100%': { boxShadow: 'var(--team-glow-sm)' },
          '50%':      { boxShadow: 'var(--team-glow-lg)' },
        },
        'gold-shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'slide-down': {
          '0%':   { opacity: 0, transform: 'translateY(-24px) scale(0.92)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'scale-in': {
          '0%':   { opacity: 0, transform: 'scale(0.6)' },
          '60%':  { transform: 'scale(1.08)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'ticker': {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'screen-flash': {
          '0%,100%': { opacity: 0 },
          '10%,90%': { opacity: 0.12 },
          '50%':     { opacity: 0.25 },
        },
        'count-up': {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'ring-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 4px rgba(0,245,160,0.6), 0 0 30px rgba(0,245,160,0.3)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(0,245,160,0.2), 0 0 60px rgba(0,245,160,0.5)' },
        },
        'view-enter': {
          '0%':   { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'confetti': {
          '0%':   { opacity: 0, transform: 'translateY(-10px) scale(0.5) rotate(0deg)' },
          '20%':  { opacity: 1 },
          '80%':  { opacity: 0.8 },
          '100%': { opacity: 0, transform: 'translateY(120px) scale(1.2) rotate(360deg)' },
        },
        'gold-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245,158,11,0.4)' },
          '50%':      { boxShadow: '0 0 24px rgba(245,158,11,0.8), 0 0 48px rgba(245,158,11,0.3)' },
        },
        // ── Celebration popup animations ─────────────────────────────────────
        'ring-expand': {
          '0%':   { transform: 'scale(1)',   opacity: '0.7' },
          '100%': { transform: 'scale(2.8)', opacity: '0'   },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(22px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'slam-top': {
          '0%':  { transform: 'translateY(-60px) scale(0.85)', opacity: '0' },
          '65%': { transform: 'translateY(5px)   scale(1.04)', opacity: '1' },
          '100%':{ transform: 'translateY(0)     scale(1)',    opacity: '1' },
        },
        'screen-shake': {
          '0%,100%': { transform: 'translate(0,0)' },
          '20%':     { transform: 'translate(-7px, 2px)' },
          '40%':     { transform: 'translate(7px,-2px)' },
          '60%':     { transform: 'translate(-4px, 1px)' },
          '80%':     { transform: 'translate(4px,-1px)' },
        },
        'float-up': {
          '0%':   { transform: 'translateY(0) scale(1)',     opacity: '0.75' },
          '100%': { transform: 'translateY(-110px) scale(0.2)', opacity: '0'   },
        },
        'stripe-sweep': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)'  },
        },
        'spotlight-breathe': {
          '0%,100%': { opacity: '0.45', transform: 'scale(1)'    },
          '50%':     { opacity: '0.9',  transform: 'scale(1.07)' },
        },
        'zoom-dramatic': {
          '0%':  { transform: 'scale(0.2)',  opacity: '0' },
          '65%': { transform: 'scale(1.1)',  opacity: '1' },
          '100%':{ transform: 'scale(1)',    opacity: '1' },
        },
        't5-pulse': {
          '0%,100%': { boxShadow: '0 0 80px rgba(255,215,0,0.35), 0 0 160px rgba(255,215,0,0.1)' },
          '50%':     { boxShadow: '0 0 120px rgba(255,215,0,0.55), 0 0 240px rgba(255,215,0,0.2)' },
        },
        'car-enter': {
          '0%':   { transform: 'translateX(120%) scale(0.8)', opacity: '0' },
          '70%':  { transform: 'translateX(-4%)  scale(1.04)', opacity: '1' },
          '100%': { transform: 'translateX(0)    scale(1)',   opacity: '1' },
        },
        'team-pulse': {
          '0%,100%': { opacity: '0' },
          '10%,90%': { opacity: '0.06' },
          '50%':     { opacity: '0.14' },
        },
      },
      animation: {
        'live-pulse':         'live-pulse 1.5s ease-in-out infinite',
        'glow-green':         'glow-green 2.5s ease-in-out infinite',
        'gold-shimmer':       'gold-shimmer 2s linear infinite',
        'slide-down':         'slide-down 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'scale-in':           'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'ticker':             'ticker 35s linear infinite',
        'float':              'float 3s ease-in-out infinite',
        'screen-flash':       'screen-flash 0.8s ease-in-out',
        'count-up':           'count-up 0.4s ease-out forwards',
        'ring-pulse':         'ring-pulse 2s ease-in-out infinite',
        'view-enter':         'view-enter 0.45s ease-out forwards',
        'fade-in':            'fade-in 0.35s ease-out forwards',
        'confetti':           'confetti 2.5s ease-out forwards',
        'gold-pulse':         'gold-pulse 1.8s ease-in-out infinite',
        'ring-expand':        'ring-expand 2.2s ease-out infinite',
        'slide-up':           'slide-up 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'slam-top':           'slam-top 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'screen-shake':       'screen-shake 0.55s ease-in-out',
        'float-up':           'float-up 2.2s ease-out infinite',
        'stripe-sweep':       'stripe-sweep 1.6s ease-in-out infinite',
        'spotlight-breathe':  'spotlight-breathe 2s ease-in-out infinite',
        'zoom-dramatic':      'zoom-dramatic 0.85s cubic-bezier(0.34,1.56,0.64,1) forwards',
        't5-pulse':           't5-pulse 2.5s ease-in-out infinite',
        'car-enter':          'car-enter 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'team-pulse':         'team-pulse 1s ease-in-out',
      },
    },
  },
  plugins: [],
}
