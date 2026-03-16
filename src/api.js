/* globals MATCHES, TEAMS, STANDINGS, TOP_SCORERS, renderMatches, renderStandings, renderStats */
/* GoalPulse — api.js
 * API-Football (RapidAPI) entegrasyon katmanı.
 * app.js'i değiştirmeden MATCHES, TEAMS, STANDINGS, TOP_SCORERS globallerini günceller.
 * API key yoksa veya hata olursa data.js'deki dummy veri devrede kalır.
 */

// ─── Yapılandırma ─────────────────────────────────────────────────────────────
const API_KEY = '9537eda8443bad1eb63aaf14e2fd5323';   // dashboard.api-football.com'dan aldığın key
const BASE_URL = 'https://v3.football.api-sports.io';
const HEADERS = {
  'x-apisports-key': API_KEY,
};
const SEASON = 2025;  // 2025-26 sezonu (bugün 2026-03-16, aktif sezon 2025)

// ─── Lig Haritası ─────────────────────────────────────────────────────────────
const LEAGUE_MAP = {
  superlig: { apiId: 203, name: 'Süper Lig', country: 'Türkiye', flag: '🇹🇷' },
  premier: { apiId: 39, name: 'Premier League', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  laliga: { apiId: 140, name: 'La Liga', country: 'İspanya', flag: '🇪🇸' },
  ucl: { apiId: 2, name: 'Şampiyonlar Ligi', country: 'UEFA', flag: '🌍' },
  bundesliga: { apiId: 78, name: 'Bundesliga', country: 'Almanya', flag: '🇩🇪' },
  seriea: { apiId: 135, name: 'Serie A', country: 'İtalya', flag: '🇮🇹' },
};

// API lig ID → uygulama lig anahtarı ters haritası
const API_ID_TO_KEY = Object.fromEntries(
  Object.entries(LEAGUE_MAP).map(([key, val]) => [val.apiId, key])
);

// ─── Temel Fetch ──────────────────────────────────────────────────────────────
async function apiFetch(endpoint) {
  if (!API_KEY || API_KEY === 'BURAYA_API_KEY' || API_KEY.length < 20) throw new Error('API key girilmemiş');
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API ${res.status}: ${endpoint}`);
  return res.json();
}

// ─── Mapping: Takım ───────────────────────────────────────────────────────────
// Dinamik team key üretir (team_<id>) ve global TEAMS objesine kaydeder
function mapTeam(apiTeam) {
  const key = `team_${apiTeam.id}`;
  if (!TEAMS[key]) {
    TEAMS[key] = {
      id: key,
      name: apiTeam.name,
      shortName: apiTeam.name.slice(0, 3).toUpperCase(),
      logo: apiTeam.logo,
      color: '#ffffff',
    };
  }
  return key;
}

// ─── Mapping: Maç Durumu ──────────────────────────────────────────────────────
function mapStatus(shortCode) {
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(shortCode)) return 'live';
  if (['FT', 'AET', 'PEN'].includes(shortCode)) return 'finished';
  return 'upcoming';
}

// ─── Mapping: Fixture → MATCHES formatı ──────────────────────────────────────
function mapFixture(f) {
  const leagueKey = API_ID_TO_KEY[f.league.id];
  if (!leagueKey) return null;

  const homeKey = mapTeam(f.teams.home);
  const awayKey = mapTeam(f.teams.away);
  const status = mapStatus(f.fixture.status.short);

  const kickoffDate = new Date(f.fixture.date);
  const kickoff = kickoffDate.toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit',
  });

  return {
    id: f.fixture.id,
    league: leagueKey,
    status,
    minute: f.fixture.status.elapsed || 0,
    kickoff,
    home: homeKey,
    away: awayKey,
    score: {
      home: f.goals.home,
      away: f.goals.away,
    },
    stats: {},
    events: [],
  };
}

// ─── Mapping: İstatistikler ───────────────────────────────────────────────────
function mapStats(apiStats) {
  // apiStats: [{team:{id}, statistics:[{type, value}]}, ...]
  if (!apiStats || apiStats.length < 2) return {};

  const get = (teamIdx, type) => {
    const stat = apiStats[teamIdx]?.statistics?.find(s => s.type === type);
    const val = stat?.value;
    return typeof val === 'string' && val.endsWith('%')
      ? parseFloat(val)
      : (val || 0);
  };

  return {
    possession: [get(0, 'Ball Possession'), get(1, 'Ball Possession')],
    shots: [get(0, 'Total Shots'), get(1, 'Total Shots')],
    shotsOnTarget: [get(0, 'Shots on Goal'), get(1, 'Shots on Goal')],
    corners: [get(0, 'Corner Kicks'), get(1, 'Corner Kicks')],
    fouls: [get(0, 'Fouls'), get(1, 'Fouls')],
    yellowCards: [get(0, 'Yellow Cards'), get(1, 'Yellow Cards')],
    redCards: [get(0, 'Red Cards'), get(1, 'Red Cards')],
  };
}

// ─── Mapping: Olaylar ─────────────────────────────────────────────────────────
function mapEvents(apiEvents, homeApiId) {
  if (!apiEvents) return [];
  const typeMap = {
    'Goal': 'goal',
    'Own Goal': 'ownGoal',
    'Penalty': 'penalty',
    'Yellow Card': 'yellowCard',
    'Red Card': 'redCard',
    'subst': 'sub',
    'Substitution': 'sub',
  };
  return apiEvents
    .filter(ev => ev.type !== 'Var')
    .map(ev => ({
      minute: ev.time.elapsed,
      type: typeMap[ev.detail] || typeMap[ev.type] || 'goal',
      team: `team_${ev.team.id}`,
      player: ev.player?.name || '',
      assist: ev.assist?.name || undefined,
    }));
}

// ─── Mapping: Puan Durumu Satırı ──────────────────────────────────────────────
function mapStanding(row) {
  const teamKey = mapTeam(row.team);
  const formStr = row.form || '';
  const form = formStr.split('').filter(c => ['W', 'D', 'L'].includes(c)).slice(-5);
  return {
    pos: row.rank,
    team: teamKey,
    played: row.all.played,
    won: row.all.win,
    drawn: row.all.draw,
    lost: row.all.lose,
    gf: row.all.goals.for,
    ga: row.all.goals.against,
    gd: row.goalsDiff,
    pts: row.points,
    form,
  };
}

// ─── Mapping: Gol Krallığı Satırı ────────────────────────────────────────────
function mapScorer(scorer, rank) {
  const teamKey = mapTeam(scorer.statistics[0].team);
  return {
    rank,
    player: scorer.player.name,
    team: teamKey,
    goals: scorer.statistics[0].goals.total || 0,
    assists: scorer.statistics[0].goals.assists || 0,
    apps: scorer.statistics[0].games.appearences || 0,
  };
}

// ─── Cache Yardımcıları ───────────────────────────────────────────────────────
function cacheSet(key, data, ttlMs) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, exp: Date.now() + ttlMs }));
  } catch (_) {}
}
function cacheGet(key) {
  try {
    const item = JSON.parse(localStorage.getItem(key));
    if (item && item.exp > Date.now()) return item.data;
    localStorage.removeItem(key);
  } catch (_) {}
  return null;
}

// ─── Fetch: Tarihe Göre Maçlar (tek istek — tüm ligler) ──────────────────────
async function fetchMatchesByDate(dateStr) {
  const cacheKey = `gp_fixtures_${dateStr}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    // Cache'den takım verilerini de geri yükle
    if (cached.teams) Object.assign(TEAMS, cached.teams);
    return cached.matches;
  }

  const data = await apiFetch(`/fixtures?date=${dateStr}`);
  const matches = (data.response || [])
    .map(mapFixture)
    .filter(Boolean);

  // Bu maçlara ait takım objelerini cache'e ekle
  const teamKeys = new Set(matches.flatMap(m => [m.home, m.away]));
  const teams = {};
  teamKeys.forEach(k => { if (TEAMS[k]) teams[k] = TEAMS[k]; });

  const isToday = dateStr === new Date().toISOString().split('T')[0];
  cacheSet(cacheKey, { matches, teams }, isToday ? 5 * 60 * 1000 : 60 * 60 * 1000);
  return matches;
}

// ─── Fetch: Canlı Maçlar ──────────────────────────────────────────────────────
async function fetchLiveMatches() {
  const data = await apiFetch('/fixtures?live=all');
  return (data.response || [])
    .map(mapFixture)
    .filter(Boolean);
}

// ─── Fetch: Maç İstatistikleri ────────────────────────────────────────────────
async function fetchMatchStats(fixtureId) {
  const data = await apiFetch(`/fixtures/statistics?fixture=${fixtureId}`);
  return mapStats(data.response);
}

// ─── Fetch: Maç Olayları ──────────────────────────────────────────────────────
async function fetchMatchEvents(fixtureId) {
  const data = await apiFetch(`/fixtures/events?fixture=${fixtureId}`);
  return mapEvents(data.response);
}

// ─── Fetch: Puan Durumu (Tüm Ligler) — lazy, 1 saat cache ───────────────────
let standingsFetching = false;
async function fetchStandings() {
  const cached = cacheGet('gp_standings');
  if (cached) return cached;
  if (standingsFetching) return null;
  standingsFetching = true;

  const entries = Object.entries(LEAGUE_MAP);
  const promises = entries.map(([key, l]) =>
    apiFetch(`/standings?league=${l.apiId}&season=${SEASON}`)
      .then(data => ({ key, data }))
      .catch(() => null)
  );
  const results = await Promise.all(promises);
  const standings = {};
  results.forEach(r => {
    if (!r) return;
    const rows = r.data.response?.[0]?.league?.standings?.[0];
    if (rows) standings[r.key] = rows.map(mapStanding);
  });

  standingsFetching = false;
  if (Object.keys(standings).length) cacheSet('gp_standings', standings, 60 * 60 * 1000);
  return standings;
}

// ─── Fetch: Gol Krallığı (Tüm Ligler) — lazy, 1 saat cache ──────────────────
let scorersFetching = false;
async function fetchTopScorers() {
  const cached = cacheGet('gp_topscorers');
  if (cached) return cached;
  if (scorersFetching) return null;
  scorersFetching = true;

  const entries = Object.entries(LEAGUE_MAP);
  const promises = entries.map(([key, l]) =>
    apiFetch(`/players/topscorers?league=${l.apiId}&season=${SEASON}`)
      .then(data => ({ key, data }))
      .catch(() => null)
  );
  const results = await Promise.all(promises);
  const scorers = {};
  results.forEach(r => {
    if (!r) return;
    const list = r.data.response || [];
    if (list.length) scorers[r.key] = list.map((s, i) => mapScorer(s, i + 1));
  });

  scorersFetching = false;
  if (Object.keys(scorers).length) cacheSet('gp_topscorers', scorers, 60 * 60 * 1000);
  return scorers;
}

// ─── Master Init — sadece fixtures (1 istek) ─────────────────────────────────
async function initAPI() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const matches = await fetchMatchesByDate(today);
    if (matches && matches.length) {
      MATCHES = matches;
      console.log(`✅ GoalPulse API: ${MATCHES.length} maç yüklendi`);
    } else {
      console.warn('⚠️ API: Bugün için maç bulunamadı, dummy veri aktif');
    }
  } catch (e) {
    console.warn('⚠️ API bağlantısı kurulamadı, dummy veri devrede:', e.message);
  }
}

// ─── Lazy View Init — standings/scorers sekmeye tıklanınca yükle ──────────────
async function loadStandingsIfNeeded() {
  if (typeof fetchStandings !== 'function') return;
  const data = await fetchStandings().catch(() => null);
  if (data && Object.keys(data).length) {
    Object.assign(STANDINGS, data);
    if (typeof renderStandings === 'function') renderStandings();
  }
}

async function loadScorersIfNeeded() {
  if (typeof fetchTopScorers !== 'function') return;
  const data = await fetchTopScorers().catch(() => null);
  if (data && Object.keys(data).length) {
    Object.assign(TOP_SCORERS, data);
    if (typeof renderStats === 'function') renderStats();
  }
}

// ─── Otomatik Yenileme (Canlı Maçlar — 30s) ──────────────────────────────────
function startAPIRefresh() {
  setInterval(async () => {
    const live = await fetchLiveMatches().catch(() => null);
    if (!live || !live.length) return;

    live.forEach(m => {
      const idx = MATCHES.findIndex(x => x.id === m.id);
      if (idx >= 0) MATCHES[idx] = { ...MATCHES[idx], ...m };
      else MATCHES.push(m);
    });

    if (typeof renderMatches === 'function') renderMatches();
  }, 30000);
}
