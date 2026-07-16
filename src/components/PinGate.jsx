import { useState } from 'react'
import { api } from '../api/sheets.js'

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']

export default function PinGate({ onUnlock }) {
  const [pin,     setPin]     = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleKey = async (k) => {
    if (loading) return
    if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (k === '✓') {
      if (pin.length < 4) { setError('Enter 4-digit PIN'); return }
      setLoading(true)
      try {
        const res = await api.verifyPin(pin)
        if (res.success && res.data.valid) {
          sessionStorage.setItem('manager_auth', '1')
          onUnlock()
        } else {
          setError('Incorrect PIN')
          setPin('')
        }
      } catch { setError('Connection error') } finally { setLoading(false) }
      return
    }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    setError('')
    if (next.length === 4) {
      // Auto-submit on 4th digit
      setLoading(true)
      try {
        const res = await api.verifyPin(next)
        if (res.success && res.data.valid) {
          sessionStorage.setItem('manager_auth', '1')
          onUnlock()
        } else {
          setError('Incorrect PIN')
          setPin('')
        }
      } catch { setError('Connection error') } finally { setLoading(false) }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-board-bg px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="font-barlow font-black text-5xl text-neon tracking-tight mb-1">
          SALES FLOOR
        </div>
        <div className="font-inter text-gray-500 text-sm tracking-widest uppercase">
          Manager Access
        </div>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-6">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="w-5 h-5 rounded-full border-2 transition-all duration-200"
            style={{
              borderColor: i < pin.length ? '#00F5A0' : '#1E2A45',
              background:  i < pin.length ? '#00F5A0' : 'transparent',
              boxShadow:   'none',
            }}
          />
        ))}
      </div>

      {/* Error */}
      <div className="h-6 mb-4">
        {error && <p className="text-red-400 font-inter text-sm animate-slide-down">{error}</p>}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((k) => {
          const isConfirm  = k === '✓'
          const isDelete   = k === '⌫'
          const isDisabled = loading || (isConfirm && pin.length < 4)
          return (
            <button
              key={k}
              onClick={() => handleKey(k)}
              disabled={isDisabled}
              className="
                h-16 rounded-xl font-barlow font-bold text-2xl
                transition-all duration-150 active:scale-95
                border
                disabled:opacity-40
              "
              style={{
                background:  isConfirm ? '#00F5A022' : isDelete ? '#1E2A45' : '#0F1629',
                borderColor: isConfirm ? '#00F5A077' : '#1E2A45',
                color:       isConfirm ? '#00F5A0'   : '#E5E7EB',
                boxShadow:   'none',
              }}
            >
              {loading && isConfirm ? (
                <div className="w-5 h-5 border-2 border-neon-green border-t-transparent rounded-full animate-spin mx-auto" />
              ) : k}
            </button>
          )
        })}
      </div>
    </div>
  )
}
