// ============================================================
// Code.gs — Google Apps Script Web App Backend
// Paste this entire file into your Apps Script editor.
// Deploy as Web App: Execute as Me, Anyone can access.
// ============================================================

// ─── TIER DEFINITIONS ────────────────────────────────────────
// Default quotas per tier. Stored in tier_quotas sheet;
// these are used only by setupSheets() for initial seeding.
var TIER_DEFAULTS = {
  'Tier 1':        30000,
  'Tier 2':        50000,
  'Tier 3':        70000,
  'Sales Manager': 100000,
  'Sales Director':150000
};

// ─── ENTRY POINTS ────────────────────────────────────────────

function doGet(e) {
  if (!e || !e.parameter) {
    return createResponse({ success: false, error: 'No request parameters. Access this via the deployed Web App URL, not the editor Run button.' });
  }
  const action = e.parameter.action;
  let result;
  try {
    switch (action) {
      case 'getBoard':       result = getBoard(); break;
      case 'getMembers':     result = getMembersHandler(e.parameter.teamId); break;
      case 'getSales':       result = getSalesHandler(parseInt(e.parameter.month), parseInt(e.parameter.year)); break;
      case 'getTeams':       result = getTeamsHandler(); break;
      case 'getQuotas':      result = getQuotasHandler(parseInt(e.parameter.month), parseInt(e.parameter.year)); break;
      case 'getSettings':    result = getSettingsHandler(); break;
      case 'getTierQuotas':       result = getTierQuotasHandler(); break;
      case 'getIncentiveSummary': result = getIncentiveSummary(e.parameter.year || new Date().getFullYear()); break;
      case 'getNewClients':       result = getNewClientsHandler(e.parameter.memberId, e.parameter.year); break;
      default:               result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  return createResponse(result);
}

function doPost(e) {
  if (!e || !e.postData) {
    return createResponse({ success: false, error: 'No POST body. Access this via the deployed Web App URL.' });
  }
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return createResponse({ success: false, error: 'Invalid JSON body' });
  }

  const action  = body.action;
  const payload = body.payload || {};
  let result;
  try {
    switch (action) {
      case 'verifyPin':        result = verifyPin(payload); break;
      case 'logSale':          result = logSale(payload); break;
      case 'addMember':        result = addMember(payload); break;
      case 'editMember':       result = editMember(payload); break;
      case 'deleteMember':     result = deleteMemberHandler(payload.id); break;
      case 'editTeam':         result = editTeam(payload); break;
      case 'updateQuotas':     result = updateQuotas(payload); break;
      case 'updateSettings':   result = updateSettings(payload); break;
      case 'deleteSale':       result = deleteSaleHandler(payload.id); break;
      case 'exportSales':      result = exportSales(payload); break;
      case 'updateTierQuotas': result = updateTierQuotas(payload); break;
      case 'logNewClients':    result = logNewClients(payload); break;
      case 'deleteNewClients': result = deleteNewClients(payload); break;
      default:                 result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  return createResponse(result);
}

function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─── FRANKI HELPERS ──────────────────────────────────────────
// Franki data is encoded in the notes column so no schema change
// is needed. Format: __F:pairId:partnerId:partnerAmount:userNotes

var FRANKI_MARKER = '__F:';
var NC_MARKER     = '__NC__'; // prefix for new-client sales

function encodeFrankiNote(pairId, partnerId, partnerAmount, userNotes) {
  return FRANKI_MARKER + pairId + ':' + String(partnerId) + ':' + parseFloat(partnerAmount) + ':' + (userNotes || '');
}

function parseFrankiNote(notes) {
  var s = String(notes || '');
  if (s.indexOf(FRANKI_MARKER) !== 0) return null;
  var rest  = s.substring(FRANKI_MARKER.length);
  var i1    = rest.indexOf(':');
  var i2    = rest.indexOf(':', i1 + 1);
  var i3    = rest.indexOf(':', i2 + 1);
  if (i1 < 0 || i2 < 0 || i3 < 0) return null;
  return {
    pairId:        rest.substring(0, i1),
    partnerId:     rest.substring(i1 + 1, i2),
    partnerAmount: parseFloat(rest.substring(i2 + 1, i3)) || 0,
    userNotes:     rest.substring(i3 + 1)
  };
}

// ─── CLIENT TYPE HELPERS ─────────────────────────────────────
// New-client sales are marked by prepending NC_MARKER to the notes field.
// Works independently of Franki encoding — the NC_MARKER lives inside the
// userNotes portion of any Franki-encoded note.

function encodeClientTypeNote(isNew, userNotes) {
  return isNew ? NC_MARKER + (userNotes || '') : (userNotes || '');
}

function parseClientTypeNote(notes) {
  var s = String(notes || '');
  if (s.indexOf(NC_MARKER) === 0) {
    return { isNew: true, userNotes: s.substring(NC_MARKER.length) };
  }
  return { isNew: false, userNotes: s };
}

// ─── INCENTIVE CONSTANTS ──────────────────────────────────────

var QUARTERLY_THRESHOLDS = [
  { circle: "Chairman's Circle",  tier: 1, salesUSD: 72000,  clients: 10 },
  { circle: "Chairman's Circle",  tier: 2, salesUSD: 48000,  clients: 9  },
  { circle: "Chairman's Circle",  tier: 3, salesUSD: 30000,  clients: 8  },
  { circle: "President's Circle", tier: 1, salesUSD: 63000,  clients: 9  },
  { circle: "President's Circle", tier: 2, salesUSD: 42000,  clients: 8  },
  { circle: "President's Circle", tier: 3, salesUSD: 26250,  clients: 7  },
  { circle: "Executive Circle",   tier: 1, salesUSD: 51000,  clients: 8  },
  { circle: "Executive Circle",   tier: 2, salesUSD: 34500,  clients: 7  },
  { circle: "Executive Circle",   tier: 3, salesUSD: 21000,  clients: 6  }
];

var YEARLY_THRESHOLDS = [
  { circle: "Chairman's Circle",  tier: 1, salesUSD: 360000, clients: 45 },
  { circle: "Chairman's Circle",  tier: 2, salesUSD: 240000, clients: 40 },
  { circle: "Chairman's Circle",  tier: 3, salesUSD: 150000, clients: 35 },
  { circle: "President's Circle", tier: 1, salesUSD: 288000, clients: 40 },
  { circle: "President's Circle", tier: 2, salesUSD: 192000, clients: 35 },
  { circle: "President's Circle", tier: 3, salesUSD: 120000, clients: 30 },
  { circle: "Executive Circle",   tier: 1, salesUSD: 216000, clients: 35 },
  { circle: "Executive Circle",   tier: 2, salesUSD: 144000, clients: 30 },
  { circle: "Executive Circle",   tier: 3, salesUSD: 90000,  clients: 25 }
];

var QUARTERLY_CASH = {
  "Chairman's Circle":  { 1: 50000, 2: 35000, 3: 20000 },
  "President's Circle": { 1: 35000, 2: 25000, 3: 15000 },
  "Executive Circle":   { 1: 20000, 2: 15000, 3: 10000 }
};

var YEARLY_CASH = {
  "Chairman's Circle":  { 1: 100000, 2: 70000, 3: 40000 },
  "President's Circle": { 1: 70000,  2: 50000, 3: 30000 },
  "Executive Circle":   { 1: 40000,  2: 30000, 3: 20000 }
};

var QUARTERLY_PERKS = [
  'Plaque',
  'Dinner with Executives during awarding',
  'Can bring +1 during awarding dinner',
  'Leisure: 1-night hotel stay during awarding',
  'Leisure: Nustar movie tickets for 2',
  'Wellness: 1.5hrs premium massage for 2'
];

var YEARLY_PERKS_BASE = [
  'Plaque',
  'Dinner with Executives during awarding',
  'Can bring +1 during awarding dinner',
  'Branded jacket',
  'Leisure: Wellness and lifestyle package'
];

var YEARLY_TRAVEL = {
  "Executive Circle":   'Leisure: Local travel for 2 (Palawan, Batanes, or Siargao) — airfare + hotel, 3 nights',
  "President's Circle": 'Leisure: International travel for 2 (Thailand, Vietnam, or Bali) — airfare + hotel, 3 nights',
  "Chairman's Circle":  'Leisure: International travel for 2 (Maldives, Japan, South Korea, Australia, or Kazakhstan) — airfare + hotel, 3 nights'
};

function computeQualification(salesUSD, newClients, periodType) {
  var thresholds = periodType === 'yearly' ? YEARLY_THRESHOLDS : QUARTERLY_THRESHOLDS;
  var cashMap    = periodType === 'yearly' ? YEARLY_CASH       : QUARTERLY_CASH;
  var perksBase  = periodType === 'yearly' ? YEARLY_PERKS_BASE : QUARTERLY_PERKS;
  for (var i = 0; i < thresholds.length; i++) {
    var t = thresholds[i];
    if (salesUSD >= t.salesUSD && newClients >= t.clients) {
      var cash  = (cashMap[t.circle] || {})[t.tier] || 0;
      var perks = perksBase.slice();
      if (periodType === 'yearly') {
        var travel = YEARLY_TRAVEL[t.circle];
        if (travel) perks.push(travel);
        if (t.circle === "Chairman's Circle") perks.push('🚗 GRAND PRIZE: Brand New Electric Car');
      }
      return { circleLevel: t.circle, tier: t.tier, cashIncentive: cash, incentivesList: perks };
    }
  }
  return { circleLevel: null, tier: null, cashIncentive: 0, incentivesList: [] };
}

function getNextThreshold(salesUSD, newClients, periodType) {
  var thresholds = periodType === 'yearly' ? YEARLY_THRESHOLDS : QUARTERLY_THRESHOLDS;
  var qualIdx = -1;
  for (var i = 0; i < thresholds.length; i++) {
    if (salesUSD >= thresholds[i].salesUSD && newClients >= thresholds[i].clients) { qualIdx = i; break; }
  }
  var nextIdx = qualIdx === -1 ? thresholds.length - 1 : qualIdx - 1;
  if (nextIdx < 0) return null;
  var next = thresholds[nextIdx];
  return {
    circle: next.circle, tier: next.tier,
    salesNeededUSD: Math.max(0, next.salesUSD - salesUSD),
    clientsNeeded:  Math.max(0, next.clients  - newClients),
    salesTargetUSD: next.salesUSD,
    clientsTarget:  next.clients
  };
}

function getMonthsInQuarter(q) {
  return [q * 3 - 2, q * 3 - 1, q * 3];
}

// ─── HELPERS ─────────────────────────────────────────────────

function getSheetData(sheetName) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(String);
  return data.slice(1)
    .filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

function appendRow(sheetName, obj) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row     = headers.map(h => (obj[h] !== undefined ? obj[h] : ''));
  sheet.appendRow(row);
}

function updateRowById(sheetName, id, obj) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName(sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idCol   = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      headers.forEach((h, j) => {
        if (obj[h] !== undefined) sheet.getRange(i + 1, j + 1).setValue(obj[h]);
      });
      return true;
    }
  }
  return false;
}

function deleteRowById(sheetName, id) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName(sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idCol   = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function generateId() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000));
}

function toDateStr(ts) {
  try { return new Date(ts).toDateString(); } catch (e) { return ''; }
}

function formatTimestamp(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'M/d/yyyy h:mm a');
}

// ─── GET HANDLERS ────────────────────────────────────────────

function getTeamsHandler() {
  return { success: true, data: getSheetData('teams') };
}

function getMembersHandler(teamId) {
  let members = getSheetData('members');
  if (teamId) members = members.filter(m => String(m.team_id) === String(teamId));
  return { success: true, data: members };
}

function getSalesHandler(month, year) {
  var sales = getSheetData('sales');
  if (month && year) {
    sales = sales.filter(function(s) { return parseInt(s.month) === month && parseInt(s.year) === year; });
  }
  // Expose Franki + client-type metadata; clean notes for display
  sales = sales.map(function(s) {
    var fi       = parseFrankiNote(s.notes);
    var rawNotes = fi ? fi.userNotes : String(s.notes || '');
    var ct       = parseClientTypeNote(rawNotes);
    var result   = Object.assign({}, s, { notes: ct.userNotes, is_new_client: ct.isNew });
    if (fi) result = Object.assign(result, { is_franki: true, franki_pair_id: fi.pairId });
    return result;
  });
  return { success: true, data: sales };
}

function getQuotasHandler(month, year) {
  let quotas = getSheetData('quotas');
  if (month && year) {
    quotas = quotas.filter(q => parseInt(q.month) === month && parseInt(q.year) === year);
  }
  return { success: true, data: quotas };
}

function getSettingsHandler() {
  const rows     = getSheetData('settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return { success: true, data: settings };
}

function getTierQuotasHandler() {
  const rows = getSheetData('tier_quotas');
  const obj  = {};
  rows.forEach(r => { obj[r.tier] = parseFloat(r.quota) || 0; });
  return { success: true, data: obj };
}

// ─── BOARD ───────────────────────────────────────────────────

function getBoard() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const today = now.toDateString();

  const teams           = getSheetData('teams');
  const members         = getSheetData('members');
  const rankableMembers = members.filter(function(m) { return String(m.is_executive) !== 'true'; });
  const allSales        = getSheetData('sales');
  const quotaRows   = getSheetData('quotas');
  const settingRows = getSheetData('settings');
  const tierRows       = getSheetData('tier_quotas');
  const newClientsRows = getSheetData('new_clients');

  const settings = {};
  settingRows.forEach(r => { settings[r.key] = r.value; });

  const tierQuotas = {};
  tierRows.forEach(r => { tierQuotas[r.tier] = parseFloat(r.quota) || 0; });

  const salesMTD   = allSales.filter(s => parseInt(s.month) === month && parseInt(s.year) === year);
  const salesToday = salesMTD.filter(s => toDateStr(s.timestamp) === today);

  const currentQuotas = quotaRows.filter(q => parseInt(q.month) === month && parseInt(q.year) === year);

  // Totals
  const teamTotals        = {};
  const teamTotalsToday   = {};
  const memberTotals      = {};
  const memberTotalsToday = {};

  teams.forEach(t   => { teamTotals[t.id]   = 0; teamTotalsToday[t.id]   = 0; });
  members.forEach(m => { memberTotals[m.id] = 0; memberTotalsToday[m.id] = 0; });

  salesMTD.forEach(s => {
    const amt    = parseFloat(s.amount) || 0;
    const member = members.find(m => String(m.id) === String(s.member_id));
    memberTotals[s.member_id] = (memberTotals[s.member_id] || 0) + amt;
    if (member) teamTotals[member.team_id] = (teamTotals[member.team_id] || 0) + amt;
  });

  salesToday.forEach(s => {
    const amt    = parseFloat(s.amount) || 0;
    const member = members.find(m => String(m.id) === String(s.member_id));
    memberTotalsToday[s.member_id] = (memberTotalsToday[s.member_id] || 0) + amt;
    if (member) teamTotalsToday[member.team_id] = (teamTotalsToday[member.team_id] || 0) + amt;
  });

  const siteTotal = salesMTD.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  // Roll sub-team totals up into their parent teams
  teams.forEach(t => {
    if (t.parent_team_id) {
      teamTotals[t.parent_team_id]      = (teamTotals[t.parent_team_id]      || 0) + (teamTotals[t.id]      || 0);
      teamTotalsToday[t.parent_team_id] = (teamTotalsToday[t.parent_team_id] || 0) + (teamTotalsToday[t.id] || 0);
    }
  });

  // Team & member quotas
  const teamQuotas   = {};
  const memberQuotas = {};
  let   siteQuota    = 0;
  currentQuotas.forEach(q => {
    teamQuotas[q.team_id] = parseFloat(q.team_quota) || 0;
    siteQuota             = parseFloat(q.site_quota)  || 0;
  });
  // Effective member quota: quota_individual if set, else fall back to tier quota
  members.forEach(m => {
    const individual = parseFloat(m.quota_individual) || 0;
    const fromTier   = m.tier ? (tierQuotas[m.tier] || 0) : 0;
    memberQuotas[m.id] = individual > 0 ? individual : fromTier;
  });

  // Recent sales — detect Franki pairs via notes encoding, merge into one entry each
  var sorted    = salesMTD.slice().sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  var seenPairs = {};
  var merged    = [];
  sorted.forEach(function(s) {
    var fi = parseFrankiNote(s.notes);
    if (fi) {
      if (seenPairs[fi.pairId]) return; // skip the second row of the same Franki pair
      var partner = null;
      for (var i = 0; i < sorted.length; i++) {
        var pfi = parseFrankiNote(sorted[i].notes);
        if (pfi && pfi.pairId === fi.pairId && sorted[i].id !== s.id) { partner = sorted[i]; break; }
      }
      seenPairs[fi.pairId] = true;
      merged.push({ id: s.id, member_id: s.member_id, amount: s.amount, timestamp: s.timestamp,
                    month: s.month, year: s.year, _fi: fi, _partner: partner });
    } else {
      merged.push(s);
    }
  });

  var recentSales = merged.slice(0, 10).map(function(s) {
    var member = members.filter(function(m) { return String(m.id) === String(s.member_id); })[0] || null;
    var team   = member ? (teams.filter(function(t) { return String(t.id) === String(member.team_id); })[0] || null) : null;
    var rawNotesB = s._fi ? s._fi.userNotes : String(s.notes || '');
    var ctB       = parseClientTypeNote(rawNotesB);
    var base   = {
      id:           s.id,
      member_id:    s.member_id,
      amount:       s.amount,
      timestamp:    s.timestamp,
      month:        s.month,
      year:         s.year,
      notes:        ctB.userNotes,
      is_new_client: ctB.isNew,
      memberName: member ? member.name : 'Unknown',
      memberTier: member ? member.tier : '',
      teamName:   team   ? team.name   : '',
      teamColor:  team   ? team.color  : '#888'
    };
    if (s._fi) {
      var partnerId = s._fi.partnerId;
      var pm = members.filter(function(m) { return String(m.id) === String(partnerId); })[0] || null;
      var pt = pm ? (teams.filter(function(t) { return String(t.id) === String(pm.team_id); })[0] || null) : null;
      base.is_franki          = true;
      base.franki_member_id   = partnerId;
      base.franki_member_name = pm ? pm.name  : 'Unknown';
      base.franki_amount      = s._fi.partnerAmount;
      base.franki_team_color  = pt ? pt.color : '#888';
    }
    return base;
  });

  // Top performers (executives excluded)
  let topToday = null, topTodayAmt = 0;
  let topMTD   = null, topMTDAmt   = 0;
  rankableMembers.forEach(m => {
    const td  = memberTotalsToday[m.id] || 0;
    const mtd = memberTotals[m.id]      || 0;
    if (td  > topTodayAmt) { topTodayAmt = td;  topToday = { ...m, todayTotal: td }; }
    if (mtd > topMTDAmt)   { topMTDAmt   = mtd; topMTD   = { ...m, mtdTotal:   mtd }; }
  });

  // Streaks
  const memberStreaks = {};
  members.forEach(m => {
    const days = [...new Set(
      allSales.filter(s => String(s.member_id) === String(m.id)).map(s => toDateStr(s.timestamp))
    )].sort((a, b) => new Date(b) - new Date(a));
    if (!days.length || days[0] !== today) { memberStreaks[m.id] = 0; return; }
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
      if (Math.round(diff) === 1) streak++;
      else break;
    }
    memberStreaks[m.id] = streak;
  });

  const quotaHitCount = members.filter(m => {
    const q = memberQuotas[m.id] || 0;
    return q > 0 && (memberTotals[m.id] || 0) >= q;
  }).length;

  // ── Previous Month Wall of Fame ──────────────────────────────
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevSales = allSales.filter(s => parseInt(s.month) === prevMonth && parseInt(s.year) === prevYear);

  const prevMemberTotals = {};
  members.forEach(m => { prevMemberTotals[m.id] = 0; });
  prevSales.forEach(s => {
    prevMemberTotals[s.member_id] = (prevMemberTotals[s.member_id] || 0) + (parseFloat(s.amount) || 0);
  });

  const wallOfFame = { prevMonth, prevYear, diamond: [], gold: [], silver: [], highFlyers: [] };
  rankableMembers.forEach(m => {
    const total = prevMemberTotals[m.id] || 0;
    if (total === 0) return;
    const quota = memberQuotas[m.id] || 0;
    const team  = teams.find(t => String(t.id) === String(m.team_id));
    const entry = {
      id: m.id, name: m.name, photo_url: m.photo_url, tier: m.tier || '', total,
      teamName: team ? team.name : '', teamColor: team ? team.color : '#888'
    };
    // Diamond/Gold/Silver are mutually exclusive — highest level wins
    if      (total >= 15000) wallOfFame.diamond.push(entry);
    else if (total >= 10000) wallOfFame.gold.push(entry);
    else if (total >= 5000)  wallOfFame.silver.push(entry);
    // High Flyers: hit 100% of their quota — independent of amount tier
    if (quota > 0 && total >= quota) wallOfFame.highFlyers.push(entry);
  });
  ['diamond', 'gold', 'silver', 'highFlyers'].forEach(k => wallOfFame[k].sort((a, b) => b.total - a.total));

  // ── Quarterly incentive levels for member badges ─────────────────────────────
  var usdRate      = parseFloat(settings.usd_to_php_rate) || 56;
  var currentQuarter = Math.ceil(month / 3);
  var qMonths      = getMonthsInQuarter(currentQuarter);
  var memberQtrTotals  = {};
  var memberQtrClients = {};
  members.forEach(function(m) { memberQtrTotals[m.id] = 0; memberQtrClients[m.id] = 0; });
  allSales.filter(function(s) {
    return parseInt(s.year) === year && qMonths.indexOf(parseInt(s.month)) >= 0;
  }).forEach(function(s) {
    memberQtrTotals[s.member_id] = (memberQtrTotals[s.member_id] || 0) + (parseFloat(s.amount) || 0);
  });
  newClientsRows.filter(function(c) {
    return parseInt(c.year) === year && qMonths.indexOf(parseInt(c.month)) >= 0;
  }).forEach(function(c) {
    memberQtrClients[c.member_id] = (memberQtrClients[c.member_id] || 0) + (parseInt(c.client_count) || 0);
  });
  var memberIncentiveLevels = {};
  rankableMembers.forEach(function(m) {
    var qUSD = (memberQtrTotals[m.id] || 0) / usdRate;
    var qCli = memberQtrClients[m.id] || 0;
    var qual = computeQualification(qUSD, qCli, 'quarterly');
    if (qual.circleLevel) {
      memberIncentiveLevels[m.id] = {
        circle: qual.circleLevel, tier: qual.tier,
        cashIncentive: qual.cashIncentive, incentivesList: qual.incentivesList
      };
    }
  });

  return {
    success: true,
    data: {
      teams, members, salesMTD, salesToday,
      teamTotals, teamTotalsToday, memberTotals, memberTotalsToday,
      siteTotal, teamQuotas, memberQuotas, siteQuota, tierQuotas,
      recentSales, topPerformerToday: topToday, topPerformerMTD: topMTD,
      settings, month, year, memberStreaks, quotaHitCount, wallOfFame,
      currentQuarter, memberQtrTotals, memberQtrClients, memberIncentiveLevels
    }
  };
}

// ─── POST HANDLERS ───────────────────────────────────────────

function verifyPin(payload) {
  const submitted = String(payload.pin);
  const props     = PropertiesService.getScriptProperties();
  let   stored    = props.getProperty('manager_pin');
  if (!stored) {
    const rows = getSheetData('settings');
    const row  = rows.find(r => r.key === 'manager_pin');
    stored     = row ? String(row.value) : '1234';
  }
  return { success: true, data: { valid: submitted === stored } };
}

function logSale(payload) {
  const { member_id, amount, notes, is_franki, franki_member_id, franki_amount, client_type } = payload;
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const ts    = formatTimestamp(now);

  // Look up member names to store alongside member_id in the sheet
  var allMembers   = getSheetData('members');
  var primaryMember  = allMembers.filter(function(m) { return String(m.id) === String(member_id); })[0]        || null;
  var primaryName    = primaryMember ? primaryMember.name : '';

  // Encode client type into notes before any further encoding
  var encodedNotes = encodeClientTypeNote(client_type === 'new', notes || '');

  if (is_franki && franki_member_id) {
    // ── Franki sale: two rows, linked via encoded notes (no schema change needed)
    var pairId      = generateId();
    var frankiMember = allMembers.filter(function(m) { return String(m.id) === String(franki_member_id); })[0] || null;
    var frankiName   = frankiMember ? frankiMember.name : '';

    var sale1 = {
      id: generateId(), member_id: String(member_id), member_name: primaryName,
      amount: parseFloat(amount),
      notes: encodeFrankiNote(pairId, franki_member_id, franki_amount, encodedNotes),
      timestamp: ts, month: month, year: year
    };
    var sale2 = {
      id: generateId(), member_id: String(franki_member_id), member_name: frankiName,
      amount: parseFloat(franki_amount),
      notes: encodeFrankiNote(pairId, member_id, parseFloat(amount), encodedNotes),
      timestamp: ts, month: month, year: year
    };

    appendRow('sales', sale1);
    appendRow('sales', sale2);
    if (client_type === 'new') {
      autoIncrementNewClient(member_id,        month, year);
      autoIncrementNewClient(franki_member_id, month, year);
    }

    var boardData  = getBoard().data;
    var m1         = boardData.members.filter(function(m) { return String(m.id) === String(member_id); })[0]        || null;
    var m2         = boardData.members.filter(function(m) { return String(m.id) === String(franki_member_id); })[0] || null;
    var t1         = m1 ? (boardData.teams.filter(function(t) { return String(t.id) === String(m1.team_id); })[0] || null) : null;
    var t2         = m2 ? (boardData.teams.filter(function(t) { return String(t.id) === String(m2.team_id); })[0] || null) : null;
    var m1MTD      = boardData.memberTotals[member_id]        || 0;
    var m2MTD      = boardData.memberTotals[franki_member_id] || 0;
    var m1Quota    = boardData.memberQuotas[member_id]        || 0;
    var m2Quota    = boardData.memberQuotas[franki_member_id] || 0;
    var teamMTD    = t1 ? (boardData.teamTotals[t1.id]  || 0) : 0;
    var teamQuota  = t1 ? (boardData.teamQuotas[t1.id]  || 0) : 0;
    var siteTotal  = boardData.siteTotal;
    var siteQuota  = boardData.siteQuota;
    var prevM1     = m1MTD   - parseFloat(amount);
    var prevM2     = m2MTD   - parseFloat(franki_amount);
    var sameTeam   = t1 && t2 && String(t1.id) === String(t2.id);
    var prevTeam   = teamMTD - parseFloat(amount) - (sameTeam ? parseFloat(franki_amount) : 0);
    var prevSite   = siteTotal - parseFloat(amount) - parseFloat(franki_amount);

    // Return clean sale objects (strip encoded notes; surface user notes separately)
    var ctParsed   = parseClientTypeNote(encodedNotes);
    var cleanSale1 = { id: sale1.id, member_id: sale1.member_id, amount: sale1.amount, notes: ctParsed.userNotes, is_new_client: ctParsed.isNew, timestamp: sale1.timestamp, month: sale1.month, year: sale1.year };
    var cleanSale2 = { id: sale2.id, member_id: sale2.member_id, amount: sale2.amount, notes: ctParsed.userNotes, is_new_client: ctParsed.isNew, timestamp: sale2.timestamp, month: sale2.month, year: sale2.year };

    var fUsdRate  = parseFloat((boardData.settings || {}).usd_to_php_rate) || 56;
    var f1QtrNow  = boardData.memberQtrTotals ? (boardData.memberQtrTotals[member_id]        || 0) : 0;
    var f2QtrNow  = boardData.memberQtrTotals ? (boardData.memberQtrTotals[franki_member_id] || 0) : 0;
    var f1QtrCli  = boardData.memberQtrClients ? (boardData.memberQtrClients[member_id]       || 0) : 0;
    var f2QtrCli  = boardData.memberQtrClients ? (boardData.memberQtrClients[franki_member_id]|| 0) : 0;
    var f1QualNow = computeQualification(f1QtrNow / fUsdRate, f1QtrCli, 'quarterly');
    var f1QualBef = computeQualification((f1QtrNow - parseFloat(amount)) / fUsdRate, f1QtrCli, 'quarterly');
    var incentiveUpgrade = { upgraded: false };
    if (f1QualNow.circleLevel && (f1QualNow.circleLevel !== f1QualBef.circleLevel || f1QualNow.tier !== f1QualBef.tier)) {
      incentiveUpgrade = {
        upgraded: true, newCircle: f1QualNow.circleLevel, newTier: f1QualNow.tier,
        cashIncentive: f1QualNow.cashIncentive, incentivesList: f1QualNow.incentivesList,
        memberName: m1 ? m1.name : '', memberPhoto: m1 ? (m1.photo_url || '') : '',
        isElectricCarQualified: false
      };
    }
    var f2QualNow = computeQualification(f2QtrNow / fUsdRate, f2QtrCli, 'quarterly');
    var f2QualBef = computeQualification((f2QtrNow - parseFloat(franki_amount)) / fUsdRate, f2QtrCli, 'quarterly');
    var frankiIncentiveUpgrade = { upgraded: false };
    if (f2QualNow.circleLevel && (f2QualNow.circleLevel !== f2QualBef.circleLevel || f2QualNow.tier !== f2QualBef.tier)) {
      frankiIncentiveUpgrade = {
        upgraded: true, newCircle: f2QualNow.circleLevel, newTier: f2QualNow.tier,
        cashIncentive: f2QualNow.cashIncentive, incentivesList: f2QualNow.incentivesList,
        memberName: m2 ? m2.name : '', memberPhoto: m2 ? (m2.photo_url || '') : '',
        isElectricCarQualified: false
      };
    }

    return {
      success: true,
      data: {
        sale: cleanSale1, frankiSale: cleanSale2,
        board: boardData,
        individualQuotaJustHit: m1Quota > 0 && prevM1 < m1Quota && m1MTD >= m1Quota,
        frankiQuotaJustHit:     m2Quota > 0 && prevM2 < m2Quota && m2MTD >= m2Quota,
        teamQuotaJustHit:       teamQuota > 0 && prevTeam < teamQuota && teamMTD >= teamQuota,
        siteQuotaJustHit:       siteQuota > 0 && prevSite < siteQuota && siteTotal >= siteQuota,
        memberSnapshot: { name: m1 ? m1.name : '', photo_url: m1 ? m1.photo_url : '', tier: m1 ? m1.tier : '', mtdTotal: m1MTD, saleAmount: parseFloat(amount), teamName: t1 ? t1.name : '' },
        frankiSnapshot: { name: m2 ? m2.name : '', photo_url: m2 ? m2.photo_url : '', tier: m2 ? m2.tier : '', mtdTotal: m2MTD, saleAmount: parseFloat(franki_amount), teamName: t2 ? t2.name : '', teamColor: t2 ? t2.color : '#00F5A0' },
        incentiveUpgrade: incentiveUpgrade,
        frankiIncentiveUpgrade: frankiIncentiveUpgrade
      }
    };
  }

  // ── Solo sale ─────────────────────────────────────────────────────────────
  var id   = generateId();
  var sale = {
    id:          id,
    member_id:   String(member_id),
    member_name: primaryName,
    amount:      parseFloat(amount),
    notes:       encodedNotes,
    timestamp:   ts,
    month:       month,
    year:        year
  };
  appendRow('sales', sale);
  if (client_type === 'new') {
    autoIncrementNewClient(member_id, month, year);
  }

  var boardData  = getBoard().data;
  var member     = boardData.members.filter(function(m) { return String(m.id) === String(member_id); })[0] || null;
  var team       = member ? (boardData.teams.filter(function(t) { return String(t.id) === String(member.team_id); })[0] || null) : null;
  var saleAmt    = parseFloat(amount);
  var memberMTD  = boardData.memberTotals[member_id]     || 0;
  var teamMTD    = team ? (boardData.teamTotals[team.id] || 0) : 0;
  var siteTotal  = boardData.siteTotal;
  var memberQuota= boardData.memberQuotas[member_id]     || 0;
  var teamQuota  = team ? (boardData.teamQuotas[team.id] || 0) : 0;
  var siteQuota  = boardData.siteQuota;
  var prevMember = memberMTD - saleAmt;
  var prevTeam   = teamMTD   - saleAmt;
  var prevSite   = siteTotal - saleAmt;

  var soloCT      = parseClientTypeNote(encodedNotes);
  sale.notes      = soloCT.userNotes; // store clean notes for the response

  var soloUsdRate = parseFloat((boardData.settings || {}).usd_to_php_rate) || 56;
  var soloQtrNow  = boardData.memberQtrTotals  ? (boardData.memberQtrTotals[member_id]  || 0) : 0;
  var soloQtrBef  = soloQtrNow - saleAmt;
  var soloQtrCli  = boardData.memberQtrClients ? (boardData.memberQtrClients[member_id] || 0) : 0;
  var soloQualBef = computeQualification(soloQtrBef / soloUsdRate, soloQtrCli, 'quarterly');
  var soloQualNow = computeQualification(soloQtrNow / soloUsdRate, soloQtrCli, 'quarterly');
  var incentiveUpgrade = { upgraded: false };
  if (soloQualNow.circleLevel && (soloQualNow.circleLevel !== soloQualBef.circleLevel || soloQualNow.tier !== soloQualBef.tier)) {
    incentiveUpgrade = {
      upgraded: true, newCircle: soloQualNow.circleLevel, newTier: soloQualNow.tier,
      cashIncentive: soloQualNow.cashIncentive, incentivesList: soloQualNow.incentivesList,
      memberName: member ? member.name : '', memberPhoto: member ? (member.photo_url || '') : '',
      isElectricCarQualified: false
    };
  }

  return {
    success: true,
    data: {
      sale:                   sale,
      board:                  boardData,
      individualQuotaJustHit: memberQuota > 0 && prevMember < memberQuota && memberMTD >= memberQuota,
      frankiQuotaJustHit:     false,
      teamQuotaJustHit:       teamQuota   > 0 && prevTeam   < teamQuota   && teamMTD   >= teamQuota,
      siteQuotaJustHit:       siteQuota   > 0 && prevSite   < siteQuota   && siteTotal >= siteQuota,
      memberSnapshot: { name: member ? member.name : '', photo_url: member ? member.photo_url : '', tier: member ? member.tier : '', mtdTotal: memberMTD, saleAmount: saleAmt, teamName: team ? team.name : '' },
      frankiSnapshot: null,
      incentiveUpgrade: incentiveUpgrade,
      is_new_client: soloCT.isNew
    }
  };
}

function addMember(payload) {
  const id = generateId();
  const member = {
    id,
    team_id:          String(payload.team_id),
    name:             payload.name,
    photo_url:        payload.photo_url       || '',
    quota_individual: parseFloat(payload.quota_individual) || 0,
    tier:             payload.tier            || ''
  };
  appendRow('members', member);
  return { success: true, data: member };
}

function editMember(payload) {
  updateRowById('members', payload.id, {
    team_id:          String(payload.team_id),
    name:             payload.name,
    photo_url:        payload.photo_url       || '',
    quota_individual: parseFloat(payload.quota_individual) || 0,
    tier:             payload.tier            || ''
  });
  return { success: true, data: payload };
}

function deleteMemberHandler(id) {
  deleteRowById('members', id);
  return { success: true };
}

function editTeam(payload) {
  updateRowById('teams', payload.id, { name: payload.name, color: payload.color });
  return { success: true, data: payload };
}

function updateQuotas(payload) {
  const { month, year, team_quotas, site_quota, member_quotas } = payload;

  if (team_quotas) {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sheet   = ss.getSheetByName('quotas');
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(String);

    Object.entries(team_quotas).forEach(([teamId, teamQuota]) => {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        const r = {};
        headers.forEach((h, j) => { r[h] = data[i][j]; });
        if (parseInt(r.month) === parseInt(month) && parseInt(r.year) === parseInt(year) && String(r.team_id) === String(teamId)) {
          sheet.getRange(i + 1, headers.indexOf('team_quota') + 1).setValue(parseFloat(teamQuota) || 0);
          if (site_quota !== undefined) sheet.getRange(i + 1, headers.indexOf('site_quota') + 1).setValue(parseFloat(site_quota) || 0);
          found = true; break;
        }
      }
      if (!found) {
        appendRow('quotas', { month: parseInt(month), year: parseInt(year), team_id: String(teamId), team_quota: parseFloat(teamQuota) || 0, site_quota: parseFloat(site_quota) || 0 });
      }
    });
  }

  if (member_quotas) {
    Object.entries(member_quotas).forEach(([memberId, quota]) => {
      updateRowById('members', memberId, { quota_individual: parseFloat(quota) || 0 });
    });
  }

  return { success: true };
}

function updateTierQuotas(payload) {
  // payload: { tier_quotas: { 'Tier 1': 30000, 'Tier 2': 50000, ... } }
  const tierQuotas = payload.tier_quotas || {};
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const sheet      = ss.getSheetByName('tier_quotas');
  if (!sheet) return { success: false, error: 'tier_quotas sheet not found' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const tierCol = headers.indexOf('tier');
  const quotaCol= headers.indexOf('quota');

  Object.entries(tierQuotas).forEach(([tier, quota]) => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][tierCol]) === tier) {
        sheet.getRange(i + 1, quotaCol + 1).setValue(parseFloat(quota) || 0);
        found = true; break;
      }
    }
    if (!found) sheet.appendRow([tier, parseFloat(quota) || 0]);
  });

  return { success: true };
}

function updateSettings(payload) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName('settings');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const keyCol  = headers.indexOf('key');
  const valCol  = headers.indexOf('value');

  Object.entries(payload).forEach(([key, value]) => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyCol]) === key) {
        sheet.getRange(i + 1, valCol + 1).setValue(value);
        found = true; break;
      }
    }
    if (!found) sheet.appendRow([key, value]);
    if (key === 'manager_pin') {
      PropertiesService.getScriptProperties().setProperty('manager_pin', String(value));
    }
  });
  return { success: true };
}

function deleteSaleHandler(id) {
  deleteRowById('sales', id);
  return { success: true };
}

function exportSales(payload) {
  const month = payload && payload.month ? parseInt(payload.month) : new Date().getMonth() + 1;
  const year  = payload && payload.year  ? parseInt(payload.year)  : new Date().getFullYear();

  const sales   = getSheetData('sales').filter(s => parseInt(s.month) === month && parseInt(s.year) === year);
  const members = getSheetData('members');
  const teams   = getSheetData('teams');

  var rows = [['Date', 'Member', 'Tier', 'Team', 'Amount', 'Notes', 'Sale Type', 'Client Type']];
  sales.slice().sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); }).forEach(function(s) {
    var member  = members.filter(function(m) { return String(m.id) === String(s.member_id); })[0] || null;
    var team    = member ? (teams.filter(function(t) { return String(t.id) === String(member.team_id); })[0] || null) : null;
    var fi        = parseFrankiNote(s.notes);
    var rawNotes  = fi ? fi.userNotes : String(s.notes || '');
    var ct        = parseClientTypeNote(rawNotes);
    var saleType  = fi ? 'Franki' : (s.is_franki === 'true' ? 'Franki' : 'Solo');
    rows.push([
      new Date(s.timestamp).toLocaleString(),
      member ? member.name : '',
      member ? (member.tier || '') : '',
      team   ? team.name   : '',
      s.amount,
      ct.userNotes,
      saleType,
      ct.isNew ? 'New Client' : 'Existing Client'
    ]);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return { success: true, data: { csv, month, year } };
}

// ─── INCENTIVE HANDLERS ──────────────────────────────────────

function getIncentiveSummary(year) {
  var members     = getSheetData('members');
  var teams       = getSheetData('teams');
  var allSales    = getSheetData('sales');
  var allClients  = getSheetData('new_clients');
  var settingRows = getSheetData('settings');

  var settings = {};
  settingRows.forEach(function(r) { settings[r.key] = r.value; });
  var usdRate = parseFloat(settings.usd_to_php_rate) || 56;
  var activeQ = parseInt(settings.active_quarter) || Math.ceil((new Date().getMonth() + 1) / 3);

  var yr         = parseInt(year);
  var yearSales  = allSales.filter(function(s)  { return parseInt(s.year) === yr; });
  var yearCli    = allClients.filter(function(c) { return parseInt(c.year) === yr; });

  var rankableMembers = members.filter(function(m) { return String(m.is_executive) !== 'true'; });
  var memberData = rankableMembers.map(function(m) {
    var team = teams.filter(function(t) { return String(t.id) === String(m.team_id); })[0] || null;

    var yearPHP = 0;
    yearSales.filter(function(s) { return String(s.member_id) === String(m.id); })
      .forEach(function(s) { yearPHP += parseFloat(s.amount) || 0; });
    var yearCliCount = 0;
    yearCli.filter(function(c) { return String(c.member_id) === String(m.id); })
      .forEach(function(c) { yearCliCount += parseInt(c.client_count) || 0; });
    var yearUSD  = yearPHP / usdRate;
    var yearQual = computeQualification(yearUSD, yearCliCount, 'yearly');
    var yearNext = getNextThreshold(yearUSD, yearCliCount, 'yearly');

    var quarters = {};
    for (var q = 1; q <= 4; q++) {
      var qMths = getMonthsInQuarter(q);
      var qPHP  = 0;
      yearSales.filter(function(s) {
        return String(s.member_id) === String(m.id) && qMths.indexOf(parseInt(s.month)) >= 0;
      }).forEach(function(s) { qPHP += parseFloat(s.amount) || 0; });
      var qCli = 0;
      yearCli.filter(function(c) {
        return String(c.member_id) === String(m.id) && qMths.indexOf(parseInt(c.month)) >= 0;
      }).forEach(function(c) { qCli += parseInt(c.client_count) || 0; });
      var qUSD  = qPHP / usdRate;
      var qQual = computeQualification(qUSD, qCli, 'quarterly');
      var qNext = getNextThreshold(qUSD, qCli, 'quarterly');
      quarters['Q' + q] = {
        salesPHP: qPHP, salesUSD: qUSD, clients: qCli,
        circle: qQual.circleLevel, tier: qQual.tier,
        cashIncentive: qQual.cashIncentive, incentivesList: qQual.incentivesList,
        nextThreshold: qNext
      };
    }

    return {
      id: m.id, name: m.name, photo_url: m.photo_url || '',
      teamId: m.team_id, teamName: team ? team.name : '', teamColor: team ? team.color : '#888',
      memberTier: m.tier || '',
      yearly: {
        salesPHP: yearPHP, salesUSD: yearUSD, clients: yearCliCount,
        circle: yearQual.circleLevel, tier: yearQual.tier,
        cashIncentive: yearQual.cashIncentive, incentivesList: yearQual.incentivesList,
        isElectricCar: yearQual.circleLevel === "Chairman's Circle",
        nextThreshold: yearNext
      },
      quarters: quarters,
      activeQuarter: 'Q' + activeQ,
      activeQData: quarters['Q' + activeQ] || quarters['Q1']
    };
  });

  return { success: true, data: { members: memberData, year: yr, activeQuarter: activeQ, usdRate: usdRate } };
}

function getNewClientsHandler(memberId, year) {
  var rows = getSheetData('new_clients');
  if (memberId) rows = rows.filter(function(r) { return String(r.member_id) === String(memberId); });
  if (year)     rows = rows.filter(function(r) { return parseInt(r.year) === parseInt(year); });
  return { success: true, data: rows };
}

function autoIncrementNewClient(memberId, month, year) {
  var existing = getSheetData('new_clients');
  for (var i = 0; i < existing.length; i++) {
    var r = existing[i];
    if (String(r.member_id) === String(memberId) && parseInt(r.month) === month && parseInt(r.year) === year) {
      updateRowById('new_clients', r.id, { client_count: (parseInt(r.client_count) || 0) + 1 });
      return;
    }
  }
  appendRow('new_clients', {
    id: generateId(), member_id: String(memberId),
    month: month, year: year, quarter: Math.ceil(month / 3),
    client_count: 1, notes: ''
  });
}

function logNewClients(payload) {
  var member_id    = payload.member_id;
  var month        = parseInt(payload.month);
  var year         = parseInt(payload.year);
  var client_count = parseInt(payload.client_count) || 0;
  var notes        = payload.notes || '';

  var existing = getSheetData('new_clients');
  var match    = null;
  for (var i = 0; i < existing.length; i++) {
    var r = existing[i];
    if (String(r.member_id) === String(member_id) && parseInt(r.month) === month && parseInt(r.year) === year) {
      match = r; break;
    }
  }
  if (match) {
    updateRowById('new_clients', match.id, { client_count: client_count, notes: notes });
    return { success: true, data: { id: match.id, updated: true } };
  }
  var id = generateId();
  appendRow('new_clients', {
    id: id, member_id: String(member_id),
    month: month, year: year, quarter: Math.ceil(month / 3),
    client_count: client_count, notes: notes
  });
  return { success: true, data: { id: id, updated: false } };
}

function deleteNewClients(payload) {
  deleteRowById('new_clients', payload.id);
  return { success: true };
}

// ─── SEED DATA ───────────────────────────────────────────────
// Run seedData() ONCE from the Apps Script editor (Run menu).
// Clears teams + members and populates real roster.
// Sales, new_clients, quotas, and settings are preserved/updated.

function seedData() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var now   = new Date();
  var month = now.getMonth() + 1;
  var year  = now.getFullYear();

  // ── Teams (id | name | color | hidden | parent_team_id) ───
  // Order matters: board.teams[0]=Scarlette, [1]=Michael,
  // [2]=Stan, [3]=Rebecca, [4]=Ron, [5]=Leadership
  var teamsSheet = ss.getSheetByName('teams') || ss.insertSheet('teams');
  teamsSheet.clearContents();
  teamsSheet.getRange(1, 1, 1, 5).setValues([['id', 'name', 'color', 'hidden', 'parent_team_id']]);
  [
    ['1', 'Team Scarlette', '#F97316', '',     ''  ],  // parent – orange
    ['2', 'Team Michael',   '#3B82F6', '',     ''  ],  // parent – blue
    ['3', 'Team Stan',      '#818CF8', '',     '1' ],  // child of Scarlette – indigo
    ['4', 'Team Rebecca',   '#EC4899', '',     '1' ],  // child of Scarlette – pink
    ['5', 'Team Ron',       '#10B981', '',     '2' ],  // child of Michael   – emerald
    ['6', 'Executives',     '#94A3B8', 'true', ''  ],  // hidden – execs
  ].forEach(function(r) { teamsSheet.appendRow(r); });

  // ── Members (id | team_id | name | photo_url | quota_individual | tier | is_executive) ──
  var membersSheet = ss.getSheetByName('members') || ss.insertSheet('members');
  membersSheet.clearContents();
  membersSheet.getRange(1, 1, 1, 7).setValues(
    [['id', 'team_id', 'name', 'photo_url', 'quota_individual', 'tier', 'is_executive']]
  );
  function ph(name) {
    return 'https://i.pravatar.cc/150?u=' + name.toLowerCase().replace(/\s+/g, '');
  }
  [
    // ── Team Scarlette (direct: manager) ──────────────────────
    ['401', '1', 'Scarlette Williams', ph('Scarlette Williams'), 12000, 'Sales Manager', ''],
    // ── Team Stan (sub of Scarlette) ──────────────────────────
    ['101', '3', 'Stan Gomez',        ph('Stan Gomez'),        0, 'Tier 1', ''],
    ['102', '3', 'Lily Oliver',       ph('Lily Oliver'),       0, 'Tier 1', ''],
    ['103', '3', 'Jake Edwards',      ph('Jake Edwards'),      0, 'Tier 1', ''],
    ['104', '3', 'Vivian White',      ph('Vivian White'),      0, 'Tier 3', ''],
    ['105', '3', 'Sarah Ortiz',       ph('Sarah Ortiz'),       0, 'Tier 3', ''],
    ['106', '3', 'Debbie Gonzalez',   ph('Debbie Gonzalez'),   0, 'Tier 3', ''],
    ['107', '3', 'George Blackwood',  ph('George Blackwood'),  0, 'Tier 3', ''],
    ['108', '3', 'Gab Thomas',        ph('Gab Thomas'),        0, 'Tier 3', ''],
    // ── Team Rebecca (sub of Scarlette) ───────────────────────
    ['201', '4', 'Rebecca Alvarez',   ph('Rebecca Alvarez'),   0, 'Tier 1', ''],
    ['202', '4', 'Jon Reyes',         ph('Jon Reyes'),         0, 'Tier 1', ''],
    ['203', '4', 'Pearl Anderson',    ph('Pearl Anderson'),    0, 'Tier 1', ''],
    ['204', '4', 'Chris Cortez',      ph('Chris Cortez'),      0, 'Tier 3', ''],
    ['205', '4', 'Sofia Martinez',    ph('Sofia Martinez'),    0, 'Tier 3', ''],
    ['206', '4', 'John Sotto',        ph('John Sotto'),        0, 'Tier 3', ''],
    ['207', '4', 'David Leonard',     ph('David Leonard'),     0, 'Tier 3', ''],
    ['208', '4', 'Jaxon Alvarez',     ph('Jaxon Alvarez'),     0, 'Tier 3', ''],
    // ── Team Michael (direct: manager) ────────────────────────
    ['402', '2', 'Michael Knecht',    ph('Michael Knecht'),    12000, 'Sales Manager', ''],
    // ── Team Ron (sub of Michael) ─────────────────────────────
    ['301', '5', 'Ron Anderson',      ph('Ron Anderson'),      0, 'Tier 1', ''],
    ['302', '5', 'Liza Davis',        ph('Liza Davis'),        0, 'Tier 2', ''],
    ['303', '5', 'Jam Medina',        ph('Jam Medina'),        0, 'Tier 3', ''],
    ['304', '5', 'Tracy Gold',        ph('Tracy Gold'),        0, 'Tier 3', ''],
    ['305', '5', 'Jeric Smith',       ph('Jeric Smith'),       0, 'Tier 3', ''],
    ['306', '5', 'Dylan Anderson',    ph('Dylan Anderson'),    0, 'Tier 3', ''],
    ['307', '5', 'Grey Ross',         ph('Grey Ross'),         0, 'Tier 3', ''],
    ['308', '5', 'Raven Hayes',       ph('Raven Hayes'),       0, 'Tier 3', ''],
    ['309', '5', 'Bret Benette',      ph('Bret Benette'),      0, 'Tier 3', ''],
    // ── Leadership — hidden (executives, is_executive = true) ─
    ['403', '6', 'Mon Carter',         ph('Mon Carter'),         0, 'CEO',                  'true'],
    ['404', '6', 'Frank Johnson',      ph('Frank Johnson'),      0, 'CFO',                  'true'],
    ['405', '6', 'Jay Miller',         ph('Jay Miller'),         0, 'Sales Director',       'true'],
    ['406', '6', 'Morgan Ellis',       ph('Morgan Ellis'),       0, 'Asst. Sales Director', 'true'],
  ].forEach(function(r) { membersSheet.appendRow(r); });

  // ── Tier Quotas ────────────────────────────────────────────
  var tierSheet = ss.getSheetByName('tier_quotas') || ss.insertSheet('tier_quotas');
  tierSheet.clearContents();
  tierSheet.getRange(1, 1, 1, 2).setValues([['tier', 'quota']]);
  [
    ['Tier 1',               8000],
    ['Tier 2',               7000],
    ['Tier 3',               6000],
    ['Sales Manager',        12000],
    ['Sales Director',       0],
    ['CEO',                  0],
    ['CFO',                  0],
    ['Asst. Sales Director', 0],
  ].forEach(function(r) { tierSheet.appendRow(r); });

  // ── Quotas for current month ───────────────────────────────
  // parent: Scarlette $155K, Michael $80K
  // sub:    Stan $55K, Rebecca $55K, Ron $55K
  // site:   $250K
  var quotasSheet = ss.getSheetByName('quotas') || ss.insertSheet('quotas');
  var qData    = quotasSheet.getDataRange().getValues();
  var qHeaders = qData[0].map(String);
  var mCol     = qHeaders.indexOf('month');
  var yCol     = qHeaders.indexOf('year');
  for (var i = qData.length - 1; i >= 1; i--) {
    if (parseInt(qData[i][mCol]) === month && parseInt(qData[i][yCol]) === year) {
      quotasSheet.deleteRow(i + 1);
    }
  }
  quotasSheet.appendRow([month, year, '1', 155000, 250000]);  // Team Scarlette
  quotasSheet.appendRow([month, year, '2',  80000, 250000]);  // Team Michael
  quotasSheet.appendRow([month, year, '3',  55000, 250000]);  // Team Stan
  quotasSheet.appendRow([month, year, '4',  55000, 250000]);  // Team Rebecca
  quotasSheet.appendRow([month, year, '5',  55000, 250000]);  // Team Ron

  // ── Settings ──────────────────────────────────────────────
  updateSettings({ site_name: 'ATP Sales Floor', currency: 'PHP' });

  Logger.log('seedData complete: 6 teams (2 parent, 3 sub, 1 hidden), 31 members');
}

// ─── MIGRATION ───────────────────────────────────────────────
// Run migrateAgentNameColumn() once from the Apps Script editor
// to add the member_name column to the sales sheet.

function migrateAgentNameColumn() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName('sales');
  if (!sheet) { SpreadsheetApp.getUi().alert('sales sheet not found'); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  if (headers.indexOf('member_name') >= 0) {
    SpreadsheetApp.getUi().alert('✅ member_name column already exists — no changes needed.');
    return;
  }

  // Insert member_name after member_id (col 2 → new col 3)
  var memberIdCol = headers.indexOf('member_id');
  var insertAfter = memberIdCol >= 0 ? memberIdCol + 2 : headers.length + 1;
  sheet.insertColumnAfter(insertAfter - 1);
  sheet.getRange(1, insertAfter).setValue('member_name');

  // Back-fill existing rows with the agent name from the members sheet
  var members = getSheetData('members');
  var data    = sheet.getDataRange().getValues();
  var newHeaders = data[0].map(String);
  var midCol  = newHeaders.indexOf('member_id')  + 1;
  var mnCol   = newHeaders.indexOf('member_name') + 1;
  for (var i = 1; i < data.length; i++) {
    var mid    = String(data[i][midCol - 1]);
    var member = members.filter(function(m) { return String(m.id) === mid; })[0] || null;
    if (member) sheet.getRange(i + 1, mnCol).setValue(member.name);
  }

  SpreadsheetApp.getUi().alert('✅ Migration complete! member_name column added and back-filled.');
}

// Run migrateFrankiColumns() once from the Apps Script editor
// to add the two new columns needed for Franki sales tracking.

function migrateFrankiColumns() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('sales');
  if (!sheet) { SpreadsheetApp.getUi().alert('sales sheet not found'); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  let added     = 0;

  if (!headers.includes('is_franki')) {
    sheet.getRange(1, headers.length + 1 + added).setValue('is_franki');
    added++;
  }
  if (!headers.includes('franki_pair_id')) {
    sheet.getRange(1, headers.length + 1 + added).setValue('franki_pair_id');
    added++;
  }

  if (added > 0) {
    SpreadsheetApp.getUi().alert(
      '✅ Migration complete!\n\n' +
      'Added ' + added + ' column(s) to the sales sheet: ' +
      (added === 2 ? 'is_franki, franki_pair_id' : (headers.includes('is_franki') ? 'franki_pair_id' : 'is_franki')) + '.\n\n' +
      'Franki sales will now be tracked correctly.'
    );
  } else {
    SpreadsheetApp.getUi().alert('✅ Both columns already exist — no changes needed.');
  }
}

// ─── SETUP & SEED ────────────────────────────────────────────
// Run setupSheets() once from the Apps Script editor to create
// all tabs with headers, tiers, and realistic demo data.

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#00F5A0');
    return sheet;
  }

  // Create sheets
  ensureSheet('members',    ['id', 'team_id', 'name', 'photo_url', 'quota_individual', 'tier']);
  ensureSheet('sales',      ['id', 'member_id', 'member_name', 'amount', 'notes', 'timestamp', 'month', 'year']);
  ensureSheet('teams',      ['id', 'name', 'color']);
  ensureSheet('quotas',     ['month', 'year', 'team_id', 'team_quota', 'site_quota']);
  ensureSheet('settings',   ['key', 'value']);
  ensureSheet('tier_quotas', ['tier', 'quota']);
  ensureSheet('new_clients', ['id', 'member_id', 'month', 'year', 'quarter', 'client_count', 'notes']);

  // ── Teams ──
  const teamsSheet = ss.getSheetByName('teams');
  teamsSheet.appendRow(['1', 'Team Alpha', '#3B82F6']);
  teamsSheet.appendRow(['2', 'Team Beta',  '#F97316']);
  teamsSheet.appendRow(['3', 'Team Gamma', '#A855F7']);

  // ── Settings ──
  const settingsSheet = ss.getSheetByName('settings');
  settingsSheet.appendRow(['manager_pin',    '1234']);
  settingsSheet.appendRow(['site_name',      'Sales Floor']);
  settingsSheet.appendRow(['currency',       'PHP']);
  settingsSheet.appendRow(['usd_to_php_rate','56.00']);
  settingsSheet.appendRow(['active_quarter', String(Math.ceil((new Date().getMonth() + 1) / 3))]);

  // ── Tier Quotas ──
  const tierSheet = ss.getSheetByName('tier_quotas');
  Object.entries(TIER_DEFAULTS).forEach(([tier, quota]) => tierSheet.appendRow([tier, quota]));

  // ── Members (3 teams × 4 members, mixed tiers) ──
  // id | team_id | name | photo_url | quota_individual (0 = use tier quota) | tier
  const members = [
    // Team Alpha
    ['101', '1', 'Maria Santos',    'https://i.pravatar.cc/150?u=mariasantos',   0, 'Tier 2'],
    ['102', '1', 'Juan dela Cruz',  'https://i.pravatar.cc/150?u=juandelacruz', 0, 'Tier 1'],
    ['103', '1', 'Ana Reyes',       'https://i.pravatar.cc/150?u=anareyes',      0, 'Sales Manager'],
    ['104', '1', 'Mark Torres',     'https://i.pravatar.cc/150?u=marktorres',    0, 'Tier 3'],
    // Team Beta
    ['201', '2', 'Carlo Bautista',  'https://i.pravatar.cc/150?u=carlobautista', 0, 'Tier 1'],
    ['202', '2', 'Lea Gomez',       'https://i.pravatar.cc/150?u=leagomez',      0, 'Tier 2'],
    ['203', '2', 'Ryan Flores',     'https://i.pravatar.cc/150?u=ryanflores',    0, 'Tier 3'],
    ['204', '2', 'Nina Villanueva', 'https://i.pravatar.cc/150?u=ninavillanueva',0, 'Sales Manager'],
    // Team Gamma
    ['301', '3', 'Jake Mendoza',    'https://i.pravatar.cc/150?u=jakemendoza',   0, 'Tier 1'],
    ['302', '3', 'Grace Lim',       'https://i.pravatar.cc/150?u=gracelim',      0, 'Tier 2'],
    ['303', '3', 'Tony Aquino',     'https://i.pravatar.cc/150?u=tonyaquino',    0, 'Sales Director'],
    ['304', '3', 'Cris Pascual',    'https://i.pravatar.cc/150?u=crispascual',   0, 'Tier 3'],
  ];
  const membersSheet = ss.getSheetByName('members');
  members.forEach(row => membersSheet.appendRow(row));

  // ── Quotas for current month ──
  // Team quota = sum of member tier quotas per team
  // Alpha: T2(50k)+T1(30k)+SM(100k)+T3(70k) = 250k
  // Beta:  T1(30k)+T2(50k)+T3(70k)+SM(100k) = 250k
  // Gamma: T1(30k)+T2(50k)+SD(150k)+T3(70k) = 300k
  // Site: 800k
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const quotasSheet = ss.getSheetByName('quotas');
  quotasSheet.appendRow([month, year, '1', 250000, 800000]);
  quotasSheet.appendRow([month, year, '2', 250000, 800000]);
  quotasSheet.appendRow([month, year, '3', 300000, 800000]);

  // ── Sales (realistic amounts per tier, spread across this month) ──
  // Sales are spread over days 1..today so the board looks active
  const salesSheet = ss.getSheetByName('sales');
  const dayRange   = now.getDate(); // spread over days elapsed this month

  // [member_id, amount, notes, day_offset_fraction]
  // Targeting ~40-65% of each member's tier quota reached
  const sampleSales = [
    // Maria (Tier 2, Q 50k) → ~28k
    ['101', 9500,  'Corporate account',       0.05],
    ['101', 8200,  'Referral close',          0.30],
    ['101', 10500, 'Online lead',             0.60],
    // Juan (Tier 1, Q 30k) → ~14k
    ['102', 6000,  'Walk-in',                0.10],
    ['102', 8000,  'Bundle deal',            0.55],
    // Ana (Sales Manager, Q 100k) → ~47k
    ['103', 22000, 'Enterprise renewal',      0.08],
    ['103', 25000, 'New partnership',         0.45],
    // Mark (Tier 3, Q 70k) → ~33k
    ['104', 15000, 'Upsell',                  0.15],
    ['104', 18000, 'Key account',             0.50],
    // Carlo (Tier 1, Q 30k) → ~13k
    ['201', 5500,  'Cold call convert',       0.12],
    ['201', 7500,  'Follow-up close',         0.60],
    // Lea (Tier 2, Q 50k) → ~27k
    ['202', 8000,  'Referral',               0.20],
    ['202', 6500,  '',                        0.40],
    ['202', 12500, 'Bundled promo',           0.75],
    // Ryan (Tier 3, Q 70k) → ~36k
    ['203', 16000, 'Annual contract',         0.18],
    ['203', 20000, 'New logo',                0.55],
    // Nina (Sales Manager, Q 100k) → ~55k
    ['204', 18000, 'Government account',      0.10],
    ['204', 22000, 'Strategic partner',       0.40],
    ['204', 15000, 'Upsell existing',         0.70],
    // Jake (Tier 1, Q 30k) → ~12k
    ['301', 12000, 'Retail deal',             0.35],
    // Grace (Tier 2, Q 50k) → ~25k
    ['302', 10000, 'Online campaign close',   0.22],
    ['302', 15000, 'Referral bundle',         0.65],
    // Tony (Sales Director, Q 150k) → ~80k
    ['303', 35000, 'Enterprise expansion',    0.12],
    ['303', 45000, 'Major contract',          0.50],
    // Cris (Tier 3, Q 70k) → ~42k
    ['304', 20000, 'Partnership deal',        0.25],
    ['304', 22000, 'Key account renewal',     0.60],
  ];

  sampleSales.forEach(([memberId, amount, notes, dayFraction], idx) => {
    const day = Math.max(1, Math.min(Math.round(dayFraction * dayRange), dayRange));
    const saleDate = new Date(year, month - 1, day, 9 + (idx % 8), (idx * 13) % 60);
    const saleId   = String(Date.now() + idx * 1000);
    salesSheet.appendRow([saleId, memberId, amount, notes, saleDate.toISOString(), month, year]);
    Utilities.sleep(5);
  });

  // ── Previous Month Sales (for Wall of Fame demo) ──
  // Provides realistic Wall of Fame categories:
  //   Diamond (≥15k): Maria, Juan, Ana, Carlo, Lea, Nina, Jake, Tony
  //   Gold (10k–14.9k): Mark, Grace, Cris
  //   Silver (5k–9.9k): Ryan
  //   High Flyers (100% quota): Juan (T1 Q30k→31k), Carlo (T1 Q30k→32k), Jake (T1 Q30k→30k)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevDaysInMonth = new Date(prevYear, prevMonth, 0).getDate();

  const prevSales = [
    // Maria (Tier 2, Q 50k) → 25k = Diamond
    ['101', 12000, 'Enterprise account',   0.25],
    ['101', 13000, 'Annual renewal',        0.70],
    // Juan (Tier 1, Q 30k) → 31k = Diamond + High Flyer
    ['102', 16000, 'New logo win',          0.30],
    ['102', 15000, 'Partner close',         0.75],
    // Ana (SM, Q 100k) → 40k = Diamond
    ['103', 20000, 'Gov contract',          0.20],
    ['103', 20000, 'Enterprise renewal',    0.65],
    // Mark (Tier 3, Q 70k) → 12k = Gold
    ['104', 12000, 'Account expansion',     0.50],
    // Carlo (Tier 1, Q 30k) → 32k = Diamond + High Flyer
    ['201', 17000, 'Cold call win',         0.28],
    ['201', 15000, 'Referral bundle',       0.72],
    // Lea (Tier 2, Q 50k) → 18k = Diamond
    ['202', 18000, 'Promo campaign close',  0.45],
    // Ryan (Tier 3, Q 70k) → 7k = Silver
    ['203', 7000,  'Small account',         0.55],
    // Nina (SM, Q 100k) → 45k = Diamond
    ['204', 25000, 'Strategic partnership', 0.22],
    ['204', 20000, 'Upsell existing',       0.68],
    // Jake (Tier 1, Q 30k) → 30k = Diamond + High Flyer
    ['301', 30000, 'Key account win',       0.60],
    // Grace (Tier 2, Q 50k) → 8k = Gold
    ['302', 8000,  'New client',            0.40],
    // Tony (SD, Q 150k) → 90k = Diamond
    ['303', 50000, 'Enterprise deal',       0.18],
    ['303', 40000, 'Major contract',        0.55],
    // Cris (Tier 3, Q 70k) → 9k = Gold
    ['304', 9000,  'Mid-market close',      0.48],
  ];

  prevSales.forEach(([memberId, amount, notes, dayFraction], idx) => {
    const day      = Math.max(1, Math.min(Math.round(dayFraction * prevDaysInMonth), prevDaysInMonth));
    const saleDate = new Date(prevYear, prevMonth - 1, day, 8 + (idx % 9), (idx * 17) % 60);
    const saleId   = String(Date.now() + (idx + 100) * 1000);
    salesSheet.appendRow([saleId, memberId, amount, notes, saleDate.toISOString(), prevMonth, prevYear]);
    Utilities.sleep(5);
  });

  SpreadsheetApp.getUi().alert(
    '✅ Setup complete!\n\n' +
    '• 6 sheets created with headers\n' +
    '• 3 teams, 12 members across 5 tiers\n' +
    '• 26 demo sales this month\n' +
    '• 18 previous-month sales (Wall of Fame data)\n' +
    '• Tier quotas configured\n\n' +
    'Next: Deploy → Manage Deployments → Edit → New Version → Deploy\n' +
    'Default PIN: 1234'
  );
}
