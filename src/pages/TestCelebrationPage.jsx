import { useState } from 'react'
import CelebrationPopup        from '../components/CelebrationPopup.jsx'
import IncentiveCelebrationPopup from '../components/IncentiveCelebrationPopup.jsx'

const SAMPLE_MEMBER = {
  name:       'Juan dela Cruz',
  photo_url:  '',
  mtdTotal:   185000,
  saleAmount: 25000,
  teamName:   'Stan Team',
  quota:      150000,
  tier:       'Tier 3',
}

const SUB_TEAM_MEMBERS = [
  { id: 1, name: 'Juan dela Cruz',  photo_url: '', team_id: '3' },
  { id: 2, name: 'Maria Santos',    photo_url: '', team_id: '3' },
  { id: 3, name: 'Pedro Reyes',     photo_url: '', team_id: '3' },
  { id: 4, name: 'Ana Bautista',    photo_url: '', team_id: '3' },
  { id: 5, name: 'Carlos Mendoza',  photo_url: '', team_id: '3' },
]

const TIERS = [
  {
    label: 'T1 — Regular Sale',
    color: '#00F5A0',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER },
      teamColor: '#00F5A0',
    },
  },
  {
    label: 'T2 — Individual Quota',
    color: '#FFD700',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER, saleAmount: 30000, mtdTotal: 160000 },
      teamColor: '#00F5A0',
      individualQuotaJustHit: true,
    },
  },
  {
    label: 'T3 — Sub-Team Quota',
    color: '#F97316',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER, saleAmount: 40000 },
      teamColor: '#F97316',
      subTeamQuotaJustHit: true,
      subTeamName: 'Stan Team',
      subTeamQuota: 500000,
      subTeamTotal: 512000,
      subTeamMembers: SUB_TEAM_MEMBERS,
    },
  },
  {
    label: 'T4 — Main Team Quota',
    color: '#EC4899',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER, teamName: 'Scarlette Team', saleAmount: 55000 },
      teamColor: '#EC4899',
      mainTeamQuotaJustHit: true,
      mainTeamName: 'Scarlette',
      mainTeamQuota: 1200000,
      mainTeamTotal: 1215000,
    },
  },
  {
    label: 'T5 — Site Quota',
    color: '#FFD700',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER, saleAmount: 80000, mtdTotal: 220000 },
      teamColor: '#00F5A0',
      siteQuotaJustHit: true,
      siteQuotaAmount: 3000000,
      siteTotal: 3045000,
    },
  },
  {
    label: 'Executive — Solo',
    color: '#FFD700',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER, name: 'Maria Santos', saleAmount: 95000 },
      teamColor: '#A855F7',
      frankiSnapshot: null,
    },
  },
  {
    label: 'Executive — Franki',
    color: '#FFD700',
    data: {
      memberSnapshot: { ...SAMPLE_MEMBER, name: 'Maria Santos', saleAmount: 60000, teamName: 'Stan Team' },
      teamColor: '#A855F7',
      frankiSnapshot: {
        name:       'Pedro Reyes',
        photo_url:  '',
        saleAmount: 55000,
        mtdTotal:   190000,
        teamName:   'Rebecca Team',
        teamColor:  '#06B6D4',
      },
    },
  },
]

const INCENTIVES = [
  {
    label: "Chairman's Circle",
    data: {
      upgraded: true,
      newCircle: "Chairman's Circle",
      newTier: 5,
      memberName: 'Juan dela Cruz',
      memberPhoto: '',
      cashIncentive: 25000,
      isElectricCarQualified: true,
      incentivesList: [
        'Electric Car Award',
        '₱25,000 Cash Incentive',
        'International Trip Package',
        'Recognition at Annual Gala',
      ],
    },
  },
  {
    label: "President's Circle",
    data: {
      upgraded: true,
      newCircle: "President's Circle",
      newTier: 4,
      memberName: 'Maria Santos',
      memberPhoto: '',
      cashIncentive: 15000,
      isElectricCarQualified: false,
      incentivesList: [
        '₱15,000 Cash Incentive',
        'Domestic Trip Package',
        'Recognition Plaque',
      ],
    },
  },
  {
    label: 'Executive Circle',
    data: {
      upgraded: true,
      newCircle: 'Executive Circle',
      newTier: 3,
      memberName: 'Pedro Reyes',
      memberPhoto: '',
      cashIncentive: 8000,
      isElectricCarQualified: false,
      incentivesList: [
        '₱8,000 Cash Incentive',
        'Special Recognition',
      ],
    },
  },
]

export default function TestCelebrationPage() {
  const [active,    setActive]    = useState(null)   // { celebration, teamColor }
  const [incentive, setIncentive] = useState(null)

  const fire = (t) => setActive({ celebration: t.data, teamColor: t.color })
  const fireIncentive = (i) => setIncentive(i.data)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-inter">
      <h1 className="text-2xl font-bold font-barlow mb-2 text-neon-green tracking-widest">
        CELEBRATION POPUP TEST
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Click any button to trigger that celebration tier. Click the popup or wait for it to auto-dismiss.
      </p>

      <section className="mb-10">
        <h2 className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-4">Sale Celebrations</h2>
        <div className="flex flex-wrap gap-3">
          {TIERS.map((t, i) => (
            <button key={i}
              onClick={() => fire(t)}
              className="px-5 py-2.5 rounded-xl font-barlow font-bold text-sm uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
              style={{ background: `${t.color}18`, color: t.color, border: `1.5px solid ${t.color}55`, boxShadow: `0 0 12px ${t.color}20` }}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-4">Incentive Circle Awards</h2>
        <div className="flex flex-wrap gap-3">
          {INCENTIVES.map((inc, i) => (
            <button key={i}
              onClick={() => fireIncentive(inc)}
              className="px-5 py-2.5 rounded-xl font-barlow font-bold text-sm uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
              style={{ background: '#F59E0B18', color: '#F59E0B', border: '1.5px solid #F59E0B55' }}>
              {inc.label}
            </button>
          ))}
        </div>
      </section>

      {active && (
        <CelebrationPopup
          celebration={active.celebration}
          teamColor={active.teamColor}
          currency="PHP"
          onDismiss={() => setActive(null)}
        />
      )}

      {incentive && (
        <IncentiveCelebrationPopup
          upgrade={incentive}
          onDismiss={() => setIncentive(null)}
        />
      )}
    </div>
  )
}
