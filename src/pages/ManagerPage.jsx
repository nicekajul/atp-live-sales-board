import { useState, useEffect, useCallback } from 'react'
import { api }          from '../api/sheets.js'
import PinGate          from '../components/PinGate.jsx'
import CelebrationPopup from '../components/CelebrationPopup.jsx'
import QuotaBar         from '../components/QuotaBar.jsx'
import Avatar           from '../components/Avatar.jsx'
import { TIERS, TIER_COLORS, TIER_DEFAULT_QUOTAS } from '../constants/tiers.js'

// ─── Utilities ───────────────────────────────────────────────
function fmt(n, currency = 'PHP') {
  return `${currency} ${Number(n || 0).toLocaleString()}`
}

function timeStr(ts) {
  try {
    return new Date(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return ts }
}

// ─── Shared UI components ────────────────────────────────────

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 font-barlow font-bold text-sm transition-all duration-200 whitespace-nowrap rounded-lg"
      style={{
        background: active ? '#00F5A022' : 'transparent',
        color:      active ? '#00F5A0'   : '#6B7280',
        border:     active ? '1px solid #00F5A044' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

function Card({ children, className = '' }) {
  return <div className={`board-card p-4 ${className}`}>{children}</div>
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-500 font-inter uppercase tracking-wide">{label}</label>}
      <input
        {...props}
        className="bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
      />
    </div>
  )
}

function Btn({ children, onClick, loading, variant = 'primary', className = '', disabled, type = 'button' }) {
  const styles = {
    primary: { background: '#00F5A022', borderColor: '#00F5A066', color: '#00F5A0' },
    danger:  { background: '#EF444422', borderColor: '#EF444466', color: '#EF4444' },
    ghost:   { background: 'transparent', borderColor: '#1E2A45',  color: '#9CA3AF' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-4 py-2 rounded-lg border font-barlow font-bold text-sm transition-all duration-200 disabled:opacity-40 active:scale-95 ${className}`}
      style={styles[variant]}
    >
      {loading
        ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin align-middle" />
        : children}
    </button>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function TierBadge({ tier, size = 'sm' }) {
  if (!tier) return null
  const color = TIER_COLORS[tier] || '#6B7280'
  return (
    <span
      className="inline-block font-barlow font-bold px-2 py-0.5 rounded-full leading-none"
      style={{
        background: `${color}22`,
        color,
        border:     `1px solid ${color}55`,
        fontSize:   size === 'sm' ? 11 : 13,
      }}
    >
      {tier}
    </span>
  )
}

// ─── Agent picker sub-component (used in Franki form) ───────

function AgentPicker({ label, accentColor, teams, members, selTeam, selMember, amount, onTeam, onMember, onAmount, currency, exclude }) {
  const teamMembers = selTeam
    ? members.filter(m => String(m.team_id) === String(selTeam.id) && m.id !== exclude)
    : []

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <div
        className="font-barlow font-black text-sm uppercase tracking-widest px-2 py-1 rounded-lg text-center"
        style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}40` }}
      >
        {label}
      </div>

      {/* Team picker */}
      <div>
        <div className="text-xs text-gray-600 font-inter uppercase tracking-wide mb-1.5">Team</div>
        <div className="flex flex-col gap-1.5">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => { onTeam(team); onMember(null) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border font-barlow font-bold text-xs transition-all active:scale-95"
              style={{
                borderColor: selTeam?.id === team.id ? team.color : '#1E2A45',
                background:  selTeam?.id === team.id ? `${team.color}22` : '#0F1629',
                color:       selTeam?.id === team.id ? team.color : '#6B7280',
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: team.color }} />
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {/* Member picker */}
      {selTeam && (
        <div>
          <div className="text-xs text-gray-600 font-inter uppercase tracking-wide mb-1.5">Agent</div>
          <div className="flex flex-col gap-1.5">
            {teamMembers.map(m => (
              <button
                key={m.id}
                onClick={() => onMember(m)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all active:scale-95 text-left"
                style={{
                  borderColor: selMember?.id === m.id ? selTeam.color : '#1E2A45',
                  background:  selMember?.id === m.id ? `${selTeam.color}18` : '#0F1629',
                  boxShadow:   selMember?.id === m.id ? `0 0 10px ${selTeam.color}28` : 'none',
                }}
              >
                <Avatar photoUrl={m.photo_url} name={m.name} size={30} teamColor={selTeam.color} />
                <div className="min-w-0">
                  <div className="font-inter font-semibold text-xs truncate"
                    style={{ color: selMember?.id === m.id ? selTeam.color : '#E5E7EB' }}>
                    {m.name}
                  </div>
                  {m.tier && <TierBadge tier={m.tier} size="xs" />}
                </div>
              </button>
            ))}
            {teamMembers.length === 0 && (
              <div className="text-gray-700 font-inter text-xs italic pl-2">No available members</div>
            )}
          </div>
        </div>
      )}

      {/* Amount */}
      {selMember && (
        <div>
          <div className="text-xs text-gray-600 font-inter uppercase tracking-wide mb-1.5">Amount ({currency})</div>
          <div className="flex items-center gap-1.5 bg-board-card border border-board-border rounded-xl px-3 focus-within:border-neon-green/50 transition-colors">
            <span className="text-gray-500 font-barlow text-base">{currency}</span>
            <input
              type="number" min="0" step="100"
              value={amount}
              onChange={e => onAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-white font-barlow font-black text-2xl py-2.5 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {[1000,2500,5000,10000,25000].map(q => (
              <button key={q} onClick={() => onAmount(q)}
                className="px-2 py-0.5 rounded border border-board-border text-gray-400 font-inter text-xs hover:border-neon-green/40 hover:text-neon-green transition-colors">
                +{q.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Client Type Toggle ──────────────────────────────────────

function ClientTypeToggle({ value, onChange }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide font-inter mb-2">Client Type</div>
      <div className="flex rounded-xl overflow-hidden border border-board-border">
        {[
          { key: 'existing', label: '👤 Existing Client', color: '#6B7280' },
          { key: 'new',      label: '🌟 New Client',      color: '#00F5A0' },
        ].map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="flex-1 py-2.5 font-barlow font-bold text-sm transition-all duration-200"
            style={{
              background: value === opt.key ? `${opt.color}18` : 'transparent',
              color:      value === opt.key ? opt.color         : '#4B5563',
              borderRight: opt.key === 'existing' ? '1px solid #1E2A45' : 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Tab 1: Log Sale ─────────────────────────────────────────

function LogSaleTab({ teams, members, currency }) {
  const [saleType, setSaleType] = useState('solo') // 'solo' | 'franki'

  // Solo state
  const [selTeam,   setSelTeam]   = useState(null)
  const [selMember, setSelMember] = useState(null)
  const [amount,    setAmount]    = useState('')

  // Franki state — agent 1
  const [f1Team,   setF1Team]   = useState(null)
  const [f1Member, setF1Member] = useState(null)
  const [f1Amount, setF1Amount] = useState('')

  // Franki state — agent 2
  const [f2Team,   setF2Team]   = useState(null)
  const [f2Member, setF2Member] = useState(null)
  const [f2Amount, setF2Amount] = useState('')

  const [notes,       setNotes]       = useState('')
  const [clientType,  setClientType]  = useState('existing') // 'existing' | 'new'
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [lastSale,    setLastSale]    = useState(null) // { id, frankiId? }
  const [undoTimer,   setUndoTimer]   = useState(null)
  const [celebration, setCelebration] = useState(null)

  const teamMembers = selTeam ? members.filter(m => String(m.team_id) === String(selTeam.id)) : []

  const resetSolo   = () => { setSelTeam(null); setSelMember(null); setAmount(''); setNotes(''); setClientType('existing'); setError('') }
  const resetFranki = () => { setF1Team(null); setF1Member(null); setF1Amount(''); setF2Team(null); setF2Member(null); setF2Amount(''); setNotes(''); setClientType('existing'); setError('') }

  // ── Solo submit ──────────────────────────────────────────────────────────
  const handleSoloSubmit = async () => {
    if (!selMember) { setError('Select a team member'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.logSale({ member_id: selMember.id, amount: amt, notes, client_type: clientType })
      if (!res.success) { setError(res.error || 'Failed to log sale'); return }

      const timerId = setTimeout(() => setLastSale(null), 30000)
      setLastSale({ id: res.data.sale?.id })
      setUndoTimer(timerId)

      const { memberSnapshot, individualQuotaJustHit, teamQuotaJustHit, siteQuotaJustHit } = res.data
      setCelebration({ memberSnapshot, frankiSnapshot: null, individualQuotaJustHit, frankiQuotaJustHit: false, teamQuotaJustHit, siteQuotaJustHit, teamColor: selTeam?.color || '#00F5A0' })
      resetSolo()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── Franki submit ────────────────────────────────────────────────────────
  const handleFrankiSubmit = async () => {
    if (!f1Member || !f2Member)           { setError('Select both agents'); return }
    if (f1Member.id === f2Member.id)      { setError('Select two different agents'); return }
    const amt1 = parseFloat(f1Amount), amt2 = parseFloat(f2Amount)
    if (!amt1 || amt1 <= 0) { setError('Enter a valid amount for Agent 1'); return }
    if (!amt2 || amt2 <= 0) { setError('Enter a valid amount for Agent 2'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.logSale({
        member_id: f1Member.id, amount: amt1, notes,
        is_franki: true,
        franki_member_id: f2Member.id, franki_amount: amt2,
        client_type: clientType,
      })
      if (!res.success) { setError(res.error || 'Failed to log sale'); return }

      const timerId = setTimeout(() => setLastSale(null), 30000)
      setLastSale({ id: res.data.sale?.id, frankiId: res.data.frankiSale?.id })
      setUndoTimer(timerId)

      const { memberSnapshot, frankiSnapshot, individualQuotaJustHit, frankiQuotaJustHit, teamQuotaJustHit, siteQuotaJustHit } = res.data
      setCelebration({ memberSnapshot, frankiSnapshot, individualQuotaJustHit, frankiQuotaJustHit, teamQuotaJustHit, siteQuotaJustHit, teamColor: f1Team?.color || '#00F5A0' })
      resetFranki()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── Undo ─────────────────────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!lastSale) return
    clearTimeout(undoTimer)
    setLastSale(null)
    try {
      await api.deleteSale(lastSale.id)
      if (lastSale.frankiId) await api.deleteSale(lastSale.frankiId)
    } catch {}
  }

  const frankiReady = f1Member && f2Member && f1Member.id !== f2Member.id && parseFloat(f1Amount) > 0 && parseFloat(f2Amount) > 0

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Sale type toggle */}
      <div className="flex rounded-xl overflow-hidden border border-board-border">
        {[
          { key: 'solo',   label: '💰 Solo Sale',   color: '#00F5A0' },
          { key: 'franki', label: '🤝 Franki Sale',  color: '#A855F7' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => { setSaleType(opt.key); setError('') }}
            className="flex-1 py-3 font-barlow font-black text-base transition-all duration-200"
            style={{
              background: saleType === opt.key ? `${opt.color}18` : 'transparent',
              color:      saleType === opt.key ? opt.color         : '#4B5563',
              borderRight: opt.key === 'solo' ? '1px solid #1E2A45' : 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── SOLO FORM ── */}
      {saleType === 'solo' && (
        <>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-inter mb-2">Select Team</div>
            <div className="grid grid-cols-3 gap-2">
              {teams.map(team => (
                <button key={team.id}
                  onClick={() => { setSelTeam(team); setSelMember(null) }}
                  className="p-3 rounded-xl border font-barlow font-bold text-sm transition-all duration-200 active:scale-95"
                  style={{
                    borderColor: selTeam?.id === team.id ? team.color : '#1E2A45',
                    background:  selTeam?.id === team.id ? `${team.color}22` : '#0F1629',
                    color:       selTeam?.id === team.id ? team.color : '#9CA3AF',
                    boxShadow:   selTeam?.id === team.id ? `0 0 12px ${team.color}44` : 'none',
                  }}
                >
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: team.color }} />
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          {selTeam && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-inter mb-2">Select Member</div>
              <div className="grid grid-cols-2 gap-2">
                {teamMembers.map(m => (
                  <button key={m.id} onClick={() => setSelMember(m)}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 active:scale-95 text-left"
                    style={{
                      borderColor: selMember?.id === m.id ? selTeam.color : '#1E2A45',
                      background:  selMember?.id === m.id ? `${selTeam.color}18` : '#0F1629',
                      boxShadow:   selMember?.id === m.id ? `0 0 10px ${selTeam.color}33` : 'none',
                    }}
                  >
                    <Avatar photoUrl={m.photo_url} name={m.name} size={36} teamColor={selTeam.color} />
                    <div className="min-w-0">
                      <div className="font-inter font-semibold text-sm truncate"
                        style={{ color: selMember?.id === m.id ? selTeam.color : '#E5E7EB' }}>
                        {m.name}
                      </div>
                      {m.tier && <TierBadge tier={m.tier} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selMember && (
            <>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-inter mb-2">Sale Amount ({currency})</div>
                <div className="flex items-center gap-2 bg-board-card border border-board-border rounded-xl px-4 focus-within:border-neon-green/50 transition-colors">
                  <span className="text-gray-500 font-barlow text-xl">{currency}</span>
                  <input type="number" min="0" step="100"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-white font-barlow font-black text-3xl py-3 focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleSoloSubmit()}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[1000,2500,5000,10000,25000,50000].map(q => (
                    <button key={q} onClick={() => setAmount(q)}
                      className="px-3 py-1 rounded-lg border border-board-border text-gray-400 font-inter text-xs hover:border-neon-green/40 hover:text-neon-green transition-colors">
                      +{q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <ClientTypeToggle value={clientType} onChange={setClientType} />
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-inter mb-2">Notes (optional)</div>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Deal notes, referral source…"
                  className="w-full bg-board-card border border-board-border rounded-xl px-4 py-2 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50"
                />
              </div>
            </>
          )}

          {error && <p className="text-red-400 font-inter text-sm">{error}</p>}

          {selMember && (
            <button onClick={handleSoloSubmit} disabled={loading}
              className="w-full py-4 rounded-xl font-barlow font-black text-2xl transition-all duration-200 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00F5A022, #00C47E22)', border: '2px solid #00F5A077', color: '#00F5A0', boxShadow: '0 0 20px rgba(0,245,160,0.2)' }}
            >
              {loading
                ? <span className="inline-block w-6 h-6 border-2 border-neon-green border-t-transparent rounded-full animate-spin align-middle" />
                : 'LOG SALE 🎉'
              }
            </button>
          )}
        </>
      )}

      {/* ── FRANKI FORM ── */}
      {saleType === 'franki' && (
        <>
          <div
            className="text-center py-2 px-4 rounded-xl font-inter text-xs text-gray-500"
            style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}
          >
            A Franki sale credits <strong className="text-purple-400">two agents</strong> with separate individual amounts for the same deal.
          </div>

          <div className="flex gap-4 items-start">
            <AgentPicker
              label="AGENT 1"
              accentColor="#00F5A0"
              teams={teams} members={members}
              selTeam={f1Team} selMember={f1Member} amount={f1Amount}
              onTeam={setF1Team} onMember={setF1Member} onAmount={setF1Amount}
              currency={currency}
              exclude={f2Member?.id}
            />

            {/* Divider */}
            <div className="flex flex-col items-center justify-start pt-10 flex-shrink-0 gap-2">
              <div className="h-16 w-px bg-board-border" />
              <span className="text-2xl select-none">🤝</span>
              <div className="h-16 w-px bg-board-border" />
            </div>

            <AgentPicker
              label="AGENT 2"
              accentColor="#A855F7"
              teams={teams} members={members}
              selTeam={f2Team} selMember={f2Member} amount={f2Amount}
              onTeam={setF2Team} onMember={setF2Member} onAmount={setF2Amount}
              currency={currency}
              exclude={f1Member?.id}
            />
          </div>

          {/* Combined preview */}
          {frankiReady && (
            <div className="rounded-xl p-3 space-y-1.5"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}
            >
              <div className="font-barlow font-bold text-sm text-purple-400 text-center">Combined Franki Sale</div>
              <div className="flex justify-between font-inter text-sm">
                <span className="text-gray-400">{f1Member?.name}</span>
                <span className="text-neon-green font-bold">{currency} {Number(f1Amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-inter text-sm">
                <span className="text-gray-400">{f2Member?.name}</span>
                <span className="text-purple-400 font-bold">{currency} {Number(f2Amount).toLocaleString()}</span>
              </div>
              <div className="h-px bg-board-border" />
              <div className="flex justify-between font-barlow font-black text-base">
                <span className="text-gray-300">Total</span>
                <span className="text-white">{currency} {(parseFloat(f1Amount) + parseFloat(f2Amount)).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Client type + Notes */}
          <ClientTypeToggle value={clientType} onChange={setClientType} />
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-inter mb-2">Notes (optional)</div>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Deal notes, referral source…"
              className="w-full bg-board-card border border-board-border rounded-xl px-4 py-2 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50"
            />
          </div>

          {error && <p className="text-red-400 font-inter text-sm">{error}</p>}

          <button onClick={handleFrankiSubmit} disabled={loading || !frankiReady}
            className="w-full py-4 rounded-xl font-barlow font-black text-2xl transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.06))', border: '2px solid rgba(168,85,247,0.5)', color: '#A855F7', boxShadow: '0 0 20px rgba(168,85,247,0.15)' }}
          >
            {loading
              ? <span className="inline-block w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin align-middle" />
              : 'LOG FRANKI SALE 🤝'
            }
          </button>
        </>
      )}

      {/* Undo bar */}
      {lastSale && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
          <span className="font-inter text-sm text-yellow-400 flex-1">
            {lastSale.frankiId ? 'Franki sale logged (2 entries).' : 'Sale logged.'} Undo within 30s?
          </span>
          <button onClick={handleUndo}
            className="px-3 py-1 rounded-lg border border-yellow-500/50 text-yellow-400 font-barlow font-bold text-sm hover:bg-yellow-500/20">
            UNDO
          </button>
        </div>
      )}

      {celebration && (
        <CelebrationPopup
          celebration={celebration}
          teamColor={celebration.teamColor}
          currency={currency}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </div>
  )
}

// ─── Tab 2: Members ──────────────────────────────────────────

function MembersTab({ teams, members, tierQuotas, onRefresh }) {
  const [showForm,  setShowForm]  = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const emptyForm = { name: '', team_id: teams[0]?.id || '', photo_url: '', quota_individual: '', tier: '' }
  const [form, setForm] = useState(emptyForm)

  const startAdd = () => {
    setForm({ ...emptyForm, team_id: teams[0]?.id || '' })
    setEditingId(null)
    setShowForm(true)
  }

  const startEdit = (m) => {
    setForm({
      name:             m.name,
      team_id:          m.team_id,
      photo_url:        m.photo_url        || '',
      quota_individual: String(m.quota_individual || ''),
      tier:             m.tier             || '',
    })
    setEditingId(m.id)
    setShowForm(true)
  }

  const handleTierChange = (tier) => {
    const defaultQ = tierQuotas[tier] || TIER_DEFAULT_QUOTAS[tier] || 0
    setForm(f => ({
      ...f,
      tier,
      quota_individual: defaultQ ? String(defaultQ) : f.quota_individual,
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      if (editingId) {
        await api.editMember({ id: editingId, ...form })
      } else {
        await api.addMember(form)
      }
      setShowForm(false)
      onRefresh()
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this member?')) return
    await api.deleteMember(id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="font-barlow font-bold text-xl text-white">{members.length} Members</div>
        <Btn onClick={startAdd}>+ Add Member</Btn>
      </div>

      {showForm && (
        <Card className="space-y-3">
          <div className="font-barlow font-bold text-lg text-neon-green">
            {editingId ? 'Edit Member' : 'New Member'}
          </div>
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />

          {/* Team */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Team</label>
            <select
              value={form.team_id}
              onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}
              className="bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50"
            >
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Tier */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Tier</label>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map(t => {
                const color   = TIER_COLORS[t]
                const active  = form.tier === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTierChange(t)}
                    className="py-2 px-1 rounded-lg border font-barlow text-xs font-bold transition-all duration-150 text-center leading-tight"
                    style={{
                      borderColor: active ? color : '#1E2A45',
                      background:  active ? `${color}22` : '#0F1629',
                      color:       active ? color : '#6B7280',
                    }}
                  >
                    {t}
                    <div className="text-xs font-inter font-normal opacity-70 mt-0.5">
                      {fmt(tierQuotas[t] || TIER_DEFAULT_QUOTAS[t])}
                    </div>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tier: '' }))}
                className="py-2 px-1 rounded-lg border font-barlow text-xs font-bold transition-all duration-150"
                style={{
                  borderColor: !form.tier ? '#6B7280' : '#1E2A45',
                  background:  !form.tier ? '#6B728022' : '#0F1629',
                  color:       !form.tier ? '#9CA3AF' : '#6B7280',
                }}
              >
                No Tier
              </button>
            </div>
          </div>

          <Input
            label={`Individual Quota Override (leave blank to use tier default: ${fmt(tierQuotas[form.tier] || TIER_DEFAULT_QUOTAS[form.tier] || 0)})`}
            type="number"
            value={form.quota_individual}
            onChange={e => setForm(f => ({ ...f, quota_individual: e.target.value }))}
            placeholder="0 = use tier default"
          />
          <Input label="Photo URL" value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://i.pravatar.cc/150?u=name" />

          <div className="flex gap-2">
            <Btn onClick={handleSave} loading={loading}>Save</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {teams.map(team => {
        const teamMembers = members.filter(m => String(m.team_id) === String(team.id))
        return (
          <div key={team.id}>
            <div className="font-barlow font-bold text-sm uppercase tracking-widest mb-2" style={{ color: team.color }}>
              {team.name} ({teamMembers.length})
            </div>
            <div className="space-y-2">
              {teamMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-board-border bg-board-card">
                  <Avatar photoUrl={m.photo_url} name={m.name} size={36} teamColor={team.color} />
                  <div className="flex-1 min-w-0">
                    <div className="font-inter font-semibold text-sm text-white truncate">{m.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.tier && <TierBadge tier={m.tier} />}
                      <span className="font-inter text-xs text-gray-600">
                        Quota: {fmt(m.quota_individual > 0 ? m.quota_individual : (tierQuotas[m.tier] || 0))}
                        {!m.quota_individual && m.tier ? ' (tier default)' : ''}
                      </span>
                    </div>
                  </div>
                  <Btn variant="ghost" onClick={() => startEdit(m)} className="text-xs px-2 py-1">Edit</Btn>
                  <Btn variant="danger" onClick={() => handleDelete(m.id)} className="text-xs px-2 py-1">×</Btn>
                </div>
              ))}
              {!teamMembers.length && <div className="text-gray-700 font-inter text-sm italic pl-2">No members</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab 3: Teams ────────────────────────────────────────────

function TeamsTab({ teams, quotas, month, year, onRefresh }) {
  const [editId,  setEditId]  = useState(null)
  const [form,    setForm]    = useState({})
  const [loading, setLoading] = useState(false)

  const startEdit = (team) => {
    const q = quotas.find(q => String(q.team_id) === String(team.id))
    setForm({ name: team.name, color: team.color, team_quota: q?.team_quota || 0 })
    setEditId(team.id)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.editTeam({ id: editId, name: form.name, color: form.color })
      if (form.team_quota !== undefined) {
        await api.updateQuotas({ month, year, team_quotas: { [editId]: parseFloat(form.team_quota) || 0 } })
      }
      setEditId(null)
      onRefresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 max-w-lg">
      {teams.map(team => (
        <Card key={team.id}>
          {editId === team.id ? (
            <div className="space-y-3">
              <Input label="Team Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Team Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="flex-1 bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>
              <Input label="Monthly Team Quota (PHP)" type="number" value={form.team_quota} onChange={e => setForm(f => ({ ...f, team_quota: e.target.value }))} />
              <div className="flex gap-2">
                <Btn onClick={handleSave} loading={loading}>Save</Btn>
                <Btn variant="ghost" onClick={() => setEditId(null)}>Cancel</Btn>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: team.color, boxShadow: `0 0 8px ${team.color}66` }} />
              <div className="flex-1">
                <div className="font-barlow font-bold text-lg text-white">{team.name}</div>
                <div className="text-xs text-gray-500">Quota: {fmt(quotas.find(q => String(q.team_id) === String(team.id))?.team_quota)}</div>
              </div>
              <Btn variant="ghost" onClick={() => startEdit(team)}>Edit</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// ─── Tab 4: Quotas & Settings ────────────────────────────────

function SettingsTab({ teams, members, quotas, settings, tierQuotas, month, year, onRefresh }) {
  const [siteQuota,    setSiteQuota]    = useState('')
  const [siteName,     setSiteName]     = useState(settings.site_name || '')
  const [currency,     setCurrency]     = useState(settings.currency  || 'PHP')
  const [usdRate,      setUsdRate]      = useState(settings.usd_to_php_rate || '56.00')
  const [activeQ,      setActiveQ]      = useState(settings.active_quarter || String(Math.ceil((new Date().getMonth() + 1) / 3)))
  const [activeYear,   setActiveYear]   = useState(settings.active_year || String(new Date().getFullYear()))
  const [pinCurrent,   setPinCurrent]   = useState('')
  const [pinNew,       setPinNew]       = useState('')
  const [pinConfirm,   setPinConfirm]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [msg,          setMsg]          = useState('')
  const [pinMsg,       setPinMsg]       = useState('')
  const [incentiveMsg, setIncentiveMsg] = useState('')
  const [tierForm,     setTierForm]     = useState(() => {
    const obj = {}
    TIERS.forEach(t => { obj[t] = String(tierQuotas[t] || TIER_DEFAULT_QUOTAS[t] || '') })
    return obj
  })
  const [tierMsg,      setTierMsg]      = useState('')
  const [memberQuotas, setMemberQuotas] = useState(() => {
    const obj = {}
    members.forEach(m => { obj[m.id] = String(m.quota_individual || '') })
    return obj
  })

  const currentSiteQuota = quotas[0]?.site_quota || 0

  const handleSaveSettings = async () => {
    setLoading(true); setMsg('')
    try {
      const payload = { site_name: siteName, currency }
      if (siteQuota) {
        const teamQ = {}
        teams.forEach(t => { const q = quotas.find(q => String(q.team_id) === String(t.id)); teamQ[t.id] = q?.team_quota || 0 })
        await api.updateQuotas({ month, year, team_quotas: teamQ, site_quota: parseFloat(siteQuota) })
      }
      await api.updateSettings(payload)
      setMsg('Settings saved!')
      onRefresh()
    } finally { setLoading(false) }
  }

  const handleSaveIndividualQuotas = async () => {
    setLoading(true)
    try {
      await api.updateQuotas({ month, year, member_quotas: memberQuotas })
      setMsg('Individual quotas updated!')
      onRefresh()
    } finally { setLoading(false) }
  }

  const handleSaveTierQuotas = async () => {
    setLoading(true); setTierMsg('')
    try {
      const payload = {}
      TIERS.forEach(t => { payload[t] = parseFloat(tierForm[t]) || 0 })
      await api.updateTierQuotas({ tier_quotas: payload })
      setTierMsg('Tier quotas saved! Members without an individual override will use these values.')
      onRefresh()
    } finally { setLoading(false) }
  }

  const handleChangePin = async () => {
    setPinMsg('')
    if (pinNew !== pinConfirm)           { setPinMsg('New PINs do not match'); return }
    if (!/^\d{4}$/.test(pinNew))         { setPinMsg('PIN must be exactly 4 digits'); return }
    setLoading(true)
    try {
      const verify = await api.verifyPin(pinCurrent)
      if (!verify.data?.valid) { setPinMsg('Current PIN is incorrect'); setLoading(false); return }
      await api.updateSettings({ manager_pin: pinNew })
      setPinMsg('PIN changed successfully!')
      setPinCurrent(''); setPinNew(''); setPinConfirm('')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Tier Quotas */}
      <Card className="space-y-3">
        <div>
          <div className="font-barlow font-bold text-lg text-neon-green">Tier Quotas</div>
          <div className="text-xs text-gray-500 font-inter mt-0.5">
            Default monthly quota per tier. Members without an individual override inherit this.
          </div>
        </div>
        {TIERS.map(tier => {
          const color = TIER_COLORS[tier]
          return (
            <div key={tier} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-36 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="font-inter text-sm font-semibold" style={{ color }}>{tier}</span>
              </div>
              <input
                type="number"
                value={tierForm[tier] || ''}
                onChange={e => setTierForm(f => ({ ...f, [tier]: e.target.value }))}
                className="flex-1 bg-board-bg border border-board-border rounded-lg px-3 py-1.5 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50 text-right"
                placeholder={String(TIER_DEFAULT_QUOTAS[tier])}
              />
            </div>
          )
        })}
        {tierMsg && <p className="text-neon-green font-inter text-xs">{tierMsg}</p>}
        <Btn onClick={handleSaveTierQuotas} loading={loading}>Save Tier Quotas</Btn>
      </Card>

      {/* Individual quota overrides */}
      <Card className="space-y-3">
        <div>
          <div className="font-barlow font-bold text-lg text-neon-green">Individual Quota Overrides</div>
          <div className="text-xs text-gray-500 font-inter mt-0.5">Set 0 to use the member's tier default quota.</div>
        </div>
        {members.map(m => {
          const team    = teams.find(t => String(t.id) === String(m.team_id))
          const tierQ   = tierQuotas[m.tier] || TIER_DEFAULT_QUOTAS[m.tier] || 0
          return (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar photoUrl={m.photo_url} name={m.name} size={28} teamColor={team?.color} />
              <div className="flex-1 min-w-0">
                <div className="font-inter text-sm text-white truncate">{m.name}</div>
                {m.tier && <div className="text-xs" style={{ color: TIER_COLORS[m.tier] }}>{m.tier}</div>}
              </div>
              <div className="text-xs text-gray-700 text-right whitespace-nowrap">
                default {fmt(tierQ)}
              </div>
              <input
                type="number"
                value={memberQuotas[m.id] || ''}
                onChange={e => setMemberQuotas(q => ({ ...q, [m.id]: e.target.value }))}
                placeholder="0"
                className="w-28 bg-board-bg border border-board-border rounded-lg px-2 py-1 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50 text-right"
              />
            </div>
          )
        })}
        {msg && <p className="text-neon-green font-inter text-sm">{msg}</p>}
        <Btn onClick={handleSaveIndividualQuotas} loading={loading}>Save Individual Quotas</Btn>
      </Card>

      {/* General settings */}
      <Card className="space-y-3">
        <div className="font-barlow font-bold text-lg text-neon-green">General</div>
        <Input label="Site Name" value={siteName} onChange={e => setSiteName(e.target.value)} />
        <Input label="Currency Symbol" value={currency} onChange={e => setCurrency(e.target.value)} placeholder="PHP" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Monthly Site Quota (current: {fmt(currentSiteQuota)})
          </label>
          <input
            type="number"
            value={siteQuota}
            onChange={e => setSiteQuota(e.target.value)}
            placeholder="Leave blank to keep current"
            className="bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none focus:border-neon-green/50"
          />
        </div>
        {msg && <p className="text-neon-green font-inter text-sm">{msg}</p>}
        <Btn onClick={handleSaveSettings} loading={loading}>Save Settings</Btn>
      </Card>

      {/* Change PIN */}
      <Card className="space-y-3">
        <div className="font-barlow font-bold text-lg text-neon-green">Change Manager PIN</div>
        <Input label="Current PIN" type="password" value={pinCurrent} onChange={e => setPinCurrent(e.target.value)} maxLength={4} />
        <Input label="New PIN (4 digits)" type="password" value={pinNew} onChange={e => setPinNew(e.target.value)} maxLength={4} />
        <Input label="Confirm New PIN" type="password" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} maxLength={4} />
        {pinMsg && <p className={`font-inter text-sm ${pinMsg.includes('success') ? 'text-neon-green' : 'text-red-400'}`}>{pinMsg}</p>}
        <Btn onClick={handleChangePin} loading={loading}>Change PIN</Btn>
      </Card>

      {/* Incentive Settings */}
      <Card className="space-y-3">
        <div className="font-barlow font-bold text-lg text-amber-400">🏆 Incentive Settings</div>
        <div className="font-inter text-xs text-gray-600">
          Controls the Awards Tracker qualification thresholds. Sales are divided by the USD rate to compare against USD targets.
        </div>
        <Input
          label="USD to PHP Conversion Rate (e.g. 56.00)"
          type="number" step="0.01" min="1"
          value={usdRate}
          onChange={e => setUsdRate(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Active Quarter</label>
          <select
            value={activeQ}
            onChange={e => setActiveQ(e.target.value)}
            className="bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
          >
            {['1','2','3','4'].map(q => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </div>
        <Input
          label="Active Year"
          type="number" min="2020"
          value={activeYear}
          onChange={e => setActiveYear(e.target.value)}
        />
        {incentiveMsg && <p className="text-neon-green font-inter text-sm">{incentiveMsg}</p>}
        <Btn
          onClick={async () => {
            setIncentiveMsg('')
            await api.updateSettings({ usd_to_php_rate: usdRate, active_quarter: activeQ, active_year: activeYear })
            setIncentiveMsg('Incentive settings saved!')
            onRefresh()
          }}
        >
          Save Incentive Settings
        </Btn>
      </Card>
    </div>
  )
}

// ─── Tab 5: Sales Log ────────────────────────────────────────

function SalesLogTab({ teams, members, currency }) {
  const now = new Date()
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [sales,      setSales]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [filterTeam,   setFilterTeam]   = useState('')
  const [filterMem,    setFilterMem]    = useState('')
  const [filterTier,   setFilterTier]   = useState('')
  const [filterClient, setFilterClient] = useState('') // '' | 'new' | 'existing'

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const loadSales = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getSales(month, year)
      if (res.success) setSales(res.data)
    } finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { loadSales() }, [loadSales])

  const handleDelete = async (id) => {
    if (!isCurrentMonth || !window.confirm('Delete this sale?')) return
    await api.deleteSale(id)
    loadSales()
  }

  const handleExport = async () => {
    const res = await api.exportSales(month, year)
    if (!res.success) return
    const blob = new Blob([res.data.csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `sales_${year}_${String(month).padStart(2,'0')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = sales.filter(s => {
    const member  = members.find(m => String(m.id) === String(s.member_id))
    if (filterTeam && member && String(member.team_id) !== filterTeam) return false
    if (filterMem  && String(s.member_id) !== filterMem)               return false
    if (filterTier && member && member.tier !== filterTier)             return false
    if (filterClient === 'new'      && !s.is_new_client)  return false
    if (filterClient === 'existing' &&  s.is_new_client)  return false
    return true
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const total = filtered.reduce((s, x) => s + parseFloat(x.amount || 0), 0)

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthOpts = []
  for (let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
    for (let m = 12; m >= 1; m--) {
      if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) continue
      monthOpts.push({ m, y, label: `${MONTHS[m-1]} ${y}` })
    }
  }

  const filteredMembers = members.filter(m => {
    if (filterTeam && String(m.team_id) !== filterTeam) return false
    if (filterTier && m.tier !== filterTier)             return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={`${month}-${year}`}
          onChange={e => { const [m,y] = e.target.value.split('-'); setMonth(+m); setYear(+y) }}
          className="bg-board-card border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
        >
          {monthOpts.map(o => <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>{o.label}</option>)}
        </select>

        <select
          value={filterTeam}
          onChange={e => { setFilterTeam(e.target.value); setFilterMem('') }}
          className="bg-board-card border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
        >
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select
          value={filterTier}
          onChange={e => { setFilterTier(e.target.value); setFilterMem('') }}
          className="bg-board-card border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
        >
          <option value="">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="bg-board-card border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
        >
          <option value="">All Clients</option>
          <option value="new">🌟 New Only</option>
          <option value="existing">👤 Existing Only</option>
        </select>

        <select
          value={filterMem}
          onChange={e => setFilterMem(e.target.value)}
          className="bg-board-card border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
        >
          <option value="">All Members</option>
          {filteredMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <Btn variant="ghost" onClick={handleExport} className="ml-auto">↓ Export CSV</Btn>
      </div>

      <div className="font-inter text-sm text-gray-500">
        {filtered.length} sales · Total: <span className="text-neon-green font-semibold">{fmt(total, currency)}</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-board-border">
          <table className="w-full font-inter text-sm">
            <thead>
              <tr className="border-b border-board-border bg-board-card">
                {['Time','Member','Tier','Team','Amount','Notes','Client','Type'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
                {isCurrentMonth && <th className="px-3 py-2 w-8" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const member    = members.find(m => String(m.id) === String(s.member_id))
                const team      = member ? teams.find(t => String(t.id) === String(member.team_id)) : null
                const tierColor = member?.tier ? TIER_COLORS[member.tier] : '#6B7280'
                const isFranki  = s.is_franki === 'true' || s.is_franki === true
                return (
                  <tr key={s.id} className={`border-b border-board-border/50 ${i % 2 === 0 ? 'bg-board-bg' : 'bg-board-card/40'}`}
                    style={isFranki ? { borderLeft: '2px solid rgba(168,85,247,0.5)' } : {}}>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap text-xs">{timeStr(s.timestamp)}</td>
                    <td className="px-3 py-2 text-white font-medium">{member?.name || '—'}</td>
                    <td className="px-3 py-2">
                      {member?.tier && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${tierColor}22`, color: tierColor }}>
                          {member.tier}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {team && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${team.color}22`, color: team.color }}>
                          {team.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-neon-green font-semibold whitespace-nowrap">{fmt(s.amount, currency)}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[100px]">{s.notes || '—'}</td>
                    <td className="px-3 py-2">
                      {(s.is_new_client === true || s.is_new_client === 'true')
                        ? <span className="text-xs px-1.5 py-0.5 rounded-full font-barlow font-bold" style={{ background: 'rgba(0,245,160,0.12)', color: '#00F5A0' }}>🌟 New</span>
                        : <span className="text-xs text-gray-600">👤 Existing</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      {isFranki
                        ? <span className="text-xs px-1.5 py-0.5 rounded-full font-barlow font-bold" style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>🤝 Franki</span>
                        : <span className="text-xs text-gray-700">Solo</span>
                      }
                    </td>
                    {isCurrentMonth && (
                      <td className="px-3 py-2">
                        <button onClick={() => handleDelete(s.id)} className="text-gray-700 hover:text-red-400 transition-colors">🗑</button>
                      </td>
                    )}
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-700">No sales found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab 6: New Clients ──────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function NewClientsTab({ teams, members }) {
  const now    = new Date()
  const [selTeam,   setSelTeam]   = useState(null)
  const [selMember, setSelMember] = useState(null)
  const [month,     setMonth]     = useState(now.getMonth() + 1)
  const [year,      setYear]      = useState(now.getFullYear())
  const [count,     setCount]     = useState('')
  const [notes,     setNotes]     = useState('')
  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')

  const teamMembers = selTeam ? members.filter(m => String(m.team_id) === String(selTeam.id)) : []

  const loadRows = useCallback(async () => {
    const res = await api.getNewClients(null, year)
    if (res.success) setRows(res.data)
  }, [year])

  useEffect(() => { loadRows() }, [loadRows])

  const handleSubmit = async () => {
    if (!selMember) { setMsg('Select a member first'); return }
    const c = parseInt(count)
    if (!c || c < 0) { setMsg('Enter a valid client count'); return }
    setLoading(true); setMsg('')
    try {
      const res = await api.logNewClients({ member_id: selMember.id, month, year, client_count: c, notes })
      if (!res.success) { setMsg(res.error || 'Failed'); return }
      setMsg(res.data.updated ? 'Updated!' : 'Saved!')
      setCount(''); setNotes('')
      loadRows()
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    await api.deleteNewClients(id)
    loadRows()
  }

  const displayRows = rows.slice().sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.month - a.month
  })

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card className="space-y-4">
        <div className="font-barlow font-bold text-lg text-neon-green">Log New Clients</div>

        {/* Team picker */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Team</div>
          <div className="flex flex-wrap gap-2">
            {teams.map(t => (
              <button key={t.id} onClick={() => { setSelTeam(t); setSelMember(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-barlow font-bold text-sm transition-all"
                style={{
                  borderColor: selTeam?.id === t.id ? t.color : '#1E2A45',
                  background:  selTeam?.id === t.id ? `${t.color}22` : 'transparent',
                  color:       selTeam?.id === t.id ? t.color : '#6B7280',
                }}>
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Member picker */}
        {selTeam && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Agent</div>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(m => (
                <button key={m.id} onClick={() => setSelMember(m)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-inter"
                  style={{
                    borderColor: selMember?.id === m.id ? selTeam.color : '#1E2A45',
                    background:  selMember?.id === m.id ? `${selTeam.color}18` : 'transparent',
                    color:       selMember?.id === m.id ? selTeam.color : '#9CA3AF',
                  }}>
                  <Avatar photoUrl={m.photo_url} name={m.name} size={22} teamColor={selTeam.color} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Month / Year / Count */}
        {selMember && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Month</label>
                <select
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value))}
                  className="bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white font-inter text-sm focus:outline-none"
                >
                  {MONTH_NAMES.map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
                </select>
              </div>
              <Input label="Year" type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
            </div>
            <Input label="New Client Count" type="number" min="0" value={count} onChange={e => setCount(e.target.value)} placeholder="e.g. 3" />
            <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            {msg && <p className={`font-inter text-sm ${msg.includes('!') ? 'text-neon-green' : 'text-red-400'}`}>{msg}</p>}
            <Btn onClick={handleSubmit} loading={loading}>Save New Clients</Btn>
          </>
        )}
      </Card>

      {/* Log table */}
      <Card className="space-y-2">
        <div className="font-barlow font-bold text-base text-neon-green">Client Log — {year}</div>
        {displayRows.length === 0 ? (
          <div className="text-gray-700 font-inter text-sm italic py-4 text-center">No entries for {year}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-inter text-xs">
              <thead>
                <tr className="border-b border-board-border text-gray-500">
                  <th className="px-2 py-2 text-left">Agent</th>
                  <th className="px-2 py-2 text-left">Month</th>
                  <th className="px-2 py-2 text-right">Clients</th>
                  <th className="px-2 py-2 text-left">Notes</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {displayRows.map(r => {
                  const m  = members.find(x => String(x.id) === String(r.member_id))
                  const t  = m ? teams.find(x => String(x.id) === String(m.team_id)) : null
                  return (
                    <tr key={r.id} className="border-b border-board-border/40 hover:bg-white/5">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <Avatar photoUrl={m?.photo_url} name={m?.name || '?'} size={20} teamColor={t?.color || '#888'} />
                          <span className="text-white">{m?.name || r.member_id}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-400">{MONTH_NAMES[(r.month||1)-1]} {r.year}</td>
                      <td className="px-2 py-2 text-right font-bold text-white">{r.client_count}</td>
                      <td className="px-2 py-2 text-gray-500 max-w-[120px] truncate">{r.notes}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => handleDelete(r.id)} className="text-gray-700 hover:text-red-400 transition-colors">🗑</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Main ManagerPage ─────────────────────────────────────────

const TABS = ['Log Sale', 'Members', 'Teams', 'Quotas & Settings', 'Sales Log', '👥 New Clients']

export default function ManagerPage() {
  const isAuthed = sessionStorage.getItem('manager_auth') === '1'

  const [authed,      setAuthed]      = useState(isAuthed)
  const [tab,         setTab]         = useState(0)
  const [teams,       setTeams]       = useState([])
  const [members,     setMembers]     = useState([])
  const [quotas,      setQuotas]      = useState([])
  const [settings,    setSettings]    = useState({})
  const [tierQuotas,  setTierQuotas]  = useState({})
  const [loading,     setLoading]     = useState(false)

  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [tr, mr, qr, sr, tqr] = await Promise.all([
        api.getTeams(),
        api.getMembers(),
        api.getQuotas(month, year),
        api.getSettings(),
        api.getTierQuotas(),
      ])
      if (tr.success)  setTeams(tr.data)
      if (mr.success)  setMembers(mr.data)
      if (qr.success)  setQuotas(qr.data)
      if (sr.success)  setSettings(sr.data)
      if (tqr.success) setTierQuotas(tqr.data)
    } finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { if (authed) loadAll() }, [authed, loadAll])

  if (!authed) return <PinGate onUnlock={() => setAuthed(true)} />

  const currency = settings.currency  || 'PHP'
  const siteName = settings.site_name || 'Sales Floor'

  return (
    <div className="min-h-screen bg-board-bg font-inter">
      <header className="sticky top-0 z-30 bg-board-bg/95 backdrop-blur border-b border-board-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <div className="font-barlow font-black text-xl text-neon-green">{siteName.toUpperCase()}</div>
            <div className="text-xs text-gray-600">Manager Panel</div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('manager_auth'); setAuthed(false) }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Lock 🔒
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
          {TABS.map((t, i) => (
            <TabButton key={t} label={t} active={tab === i} onClick={() => setTab(i)} />
          ))}
        </div>

        {loading ? <Spinner /> : (
          <>
            {tab === 0 && <LogSaleTab teams={teams} members={members} currency={currency} />}
            {tab === 1 && <MembersTab teams={teams} members={members} tierQuotas={tierQuotas} onRefresh={loadAll} />}
            {tab === 2 && <TeamsTab   teams={teams} quotas={quotas} month={month} year={year} onRefresh={loadAll} />}
            {tab === 3 && (
              <SettingsTab
                teams={teams} members={members} quotas={quotas}
                settings={settings} tierQuotas={tierQuotas}
                month={month} year={year} onRefresh={loadAll}
              />
            )}
            {tab === 4 && <SalesLogTab teams={teams} members={members} currency={currency} />}
            {tab === 5 && <NewClientsTab teams={teams} members={members} />}
          </>
        )}
      </div>
    </div>
  )
}
