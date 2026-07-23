const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL

if (!BASE_URL) {
  console.warn('[API] VITE_APPS_SCRIPT_URL is not set. Create a .env file with your Apps Script URL.')
}

const get = (params) =>
  fetch(`${BASE_URL}?${new URLSearchParams({ ...params, _t: Date.now() })}`, {
    redirect: 'follow',
    cache: 'no-store',
  }).then(r => r.json())

const post = (action, payload) =>
  fetch(BASE_URL, {
    method:   'POST',
    redirect: 'follow',
    body:     JSON.stringify({ action, payload }),
  }).then(r => r.json())

export const api = {
  getBoard:         ()            => get({ action: 'getBoard' }),
  getSales:         (month, year) => get({ action: 'getSales', month, year }),
  getMembers:       (teamId)      => get(teamId ? { action: 'getMembers', teamId } : { action: 'getMembers' }),
  getSettings:      ()            => get({ action: 'getSettings' }),
  getTeams:         ()            => get({ action: 'getTeams' }),
  getQuotas:        (month, year) => get({ action: 'getQuotas', month, year }),
  getTierQuotas:        ()               => get({ action: 'getTierQuotas' }),
  getIncentiveSummary:  (year)           => get({ action: 'getIncentiveSummary', year }),
  getNewClients:        (memberId, year) => get(memberId ? { action: 'getNewClients', memberId, year } : { action: 'getNewClients', year }),

  verifyPin:        (pin)         => post('verifyPin',        { pin }),
  logSale:          (payload)     => post('logSale',          payload),
  addMember:        (payload)     => post('addMember',        payload),
  editMember:       (payload)     => post('editMember',       payload),
  deleteMember:     (id)          => post('deleteMember',     { id }),
  editTeam:         (payload)     => post('editTeam',         payload),
  updateQuotas:     (payload)     => post('updateQuotas',     payload),
  updateSettings:   (payload)     => post('updateSettings',   payload),
  deleteSale:       (id)          => post('deleteSale',       { id }),
  exportSales:      (month, year) => post('exportSales',      { month, year }),
  updateTierQuotas: (payload)     => post('updateTierQuotas', payload),
  logNewClients:    (payload)     => post('logNewClients',    payload),
  deleteNewClients: (id)          => post('deleteNewClients', { id }),
}
