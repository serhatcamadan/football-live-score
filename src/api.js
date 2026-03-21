/* globals MATCHES, TEAMS, STANDINGS, TOP_SCORERS, renderMatches, renderStandings, renderStats */
/* CamoGoal — api.js
 * API-Football (RapidAPI) entegrasyon katmanı.
 * app.js'i değiştirmeden MATCHES, TEAMS, STANDINGS, TOP_SCORERS globallerini günceller.
 * API key yoksa veya hata olursa data.js'deki dummy veri devrede kalır.
 */

// ─── Yapılandırma ─────────────────────────────────────────────────────────────
// API key bu dosyada YOK — Netlify Function proxy üzerinden güvenli çağrı yapılır.
// Lokal geliştirme: netlify dev komutunu kullan (APISPORTS_KEY=... netlify dev)
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROXY_URL = IS_LOCAL ? 'http://localhost:8888/api' : '/api';
let SEASON = 2025;

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

// ─── Temel Fetch (proxy üzerinden) ────────────────────────────────────────────
async function apiFetch(endpoint) {
  // endpoint'i ve query string'i ayır
  const [path, qs] = endpoint.split('?');
  const params = new URLSearchParams(qs || '');
  params.set('endpoint', path);
  const res = await fetch(`${PROXY_URL}?${params.toString()}`);
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
      apiId: apiTeam.id,
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

// ─── Fetch: Puan Durumu — lazy, season parametreli, cache per-season ─────────
let standingsFetching = false;
let scorersFetching   = false;

function setAPISeason(year) {
  SEASON = year;
  standingsFetching = false;
  scorersFetching   = false;
}

async function fetchStandings(season) {
  const s = season || SEASON;
  const cacheKey = `gp_v2_standings_${s}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  if (standingsFetching) return null;
  standingsFetching = true;

  const entries = Object.entries(LEAGUE_MAP);
  const promises = entries.map(([key, l]) =>
    apiFetch(`/standings?league=${l.apiId}&season=${s}`)
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
  // Geçmiş sezonlar uzun süre (24s), aktif sezon 1 saat cache
  const ttl = s === SEASON ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  if (Object.keys(standings).length) cacheSet(cacheKey, standings, ttl);
  return standings;
}

// ─── Fetch: Gol Krallığı — lazy, season parametreli, cache per-season ────────
async function fetchTopScorers(season) {
  const s = season || SEASON;
  const cacheKey = `gp_v2_topscorers_${s}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  if (scorersFetching) return null;
  scorersFetching = true;

  const entries = Object.entries(LEAGUE_MAP);
  const promises = entries.map(([key, l]) =>
    apiFetch(`/players/topscorers?league=${l.apiId}&season=${s}`)
      .then(data => ({ key, data }))
      .catch(() => null)
  );
  const results = await Promise.all(promises);
  const scorers = {};
  results.forEach(r => {
    if (!r) return;
    const list = r.data.response || [];
    if (list.length) scorers[r.key] = list.map((s2, i) => mapScorer(s2, i + 1));
  });

  scorersFetching = false;
  const ttl = s === SEASON ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  if (Object.keys(scorers).length) cacheSet(cacheKey, scorers, ttl);
  return scorers;
}

// ─── Master Init — sadece fixtures (1 istek) ─────────────────────────────────
async function initAPI() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const matches = await fetchMatchesByDate(today);
    if (matches && matches.length) {
      MATCHES = matches;
      console.log(`✅ CamoGoal API: ${MATCHES.length} maç yüklendi`);
    } else {
      console.warn('⚠️ API: Bugün için maç bulunamadı, dummy veri aktif');
    }
  } catch (e) {
    console.warn('⚠️ API bağlantısı kurulamadı, dummy veri devrede:', e.message);
  }
}

// ─── Lazy View Init — standings/scorers sekmeye tıklanınca veya sezon değişince
async function loadStandingsIfNeeded(season) {
  const data = await fetchStandings(season).catch(() => null);
  if (data && Object.keys(data).length) {
    // Mevcut standings'i temizle, yeni sezonun verisini yaz
    Object.keys(STANDINGS).forEach(k => delete STANDINGS[k]);
    Object.assign(STANDINGS, data);
    if (typeof renderStandings === 'function') renderStandings();
  }
}

async function loadScorersIfNeeded(season) {
  const data = await fetchTopScorers(season).catch(() => null);
  if (data && Object.keys(data).length) {
    Object.keys(TOP_SCORERS).forEach(k => delete TOP_SCORERS[k]);
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
      if (idx >= 0) {
        const prev = MATCHES[idx];
        const scoreChanged =
          prev.score.home !== m.score.home ||
          prev.score.away !== m.score.away;
        MATCHES[idx] = { ...prev, ...m };
        if (scoreChanged) {
          const card = document.querySelector(`[data-match-id="${m.id}"]`);
          if (card) {
            card.classList.add('goal-flash');
            setTimeout(() => card.classList.remove('goal-flash'), 1500);
          }
        }
      } else {
        MATCHES.push(m);
      }
    });

    if (typeof renderMatches === 'function') renderMatches();
  }, 30000);
}

// ─── H2H ──────────────────────────────────────────────────────────────────────
async function fetchH2H(homeKey, awayKey) {
  const homeTeam = TEAMS[homeKey];
  const awayTeam = TEAMS[awayKey];
  if (!homeTeam?.apiId || !awayTeam?.apiId) return [];
  const data = await apiFetch(`/fixtures/headtohead?h2h=${homeTeam.apiId}-${awayTeam.apiId}&last=5`);
  return (data.response || []).map(f => mapFixture(f)).filter(Boolean);
}
