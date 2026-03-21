/* CamoGoal — app.js */

// ─── State ────────────────────────────────────────────────────────────────────
let currentView   = 'scores';
let currentLeague = 'all';
let currentStatus = 'all';
let currentDate   = 0;
let currentSeason = 2025;
let searchQuery   = '';
let expandedLeagues = {};
let liveMinutes   = {};
let tickerInterval = null;
let countdownInterval = null;
let favorites = new Set(JSON.parse(localStorage.getItem('cg_favorites') || '[]'));
let searchHistory = JSON.parse(localStorage.getItem('cg_search_history') || '[]');
let currentModalMatch = null; // for share

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.documentElement.classList.add('dark');
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.documentElement.classList.remove('dark');

  MATCHES.forEach(m => {
    if (m.status === 'live') liveMinutes[m.id] = m.minute;
  });

  showSkeleton();

  if (typeof initAPI === 'function') {
    await initAPI();
    MATCHES.forEach(m => {
      if (m.status === 'live') liveMinutes[m.id] = m.minute;
    });
    if (typeof startAPIRefresh === 'function') startAPIRefresh();
  }

  renderAll();
  startLiveTicker();
  startCountdownTicker();
  setupSearch();
  setupPullToRefresh();
  updateThemeIcon();
});

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll() {
  renderDateTabs();
  renderView();
  updateNavActive();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function showSkeleton() {
  const container = document.getElementById('matches-container');
  if (!container) return;
  const skRow = () => `
    <div class="skeleton-row">
      <div style="display:flex;align-items:center;gap:10px;flex:1">
        <div class="skeleton" style="width:32px;height:32px;border-radius:50%;flex-shrink:0"></div>
        <div class="skeleton" style="width:110px;height:12px"></div>
      </div>
      <div class="skeleton" style="width:72px;height:22px;border-radius:8px"></div>
      <div style="display:flex;align-items:center;gap:10px;flex:1;justify-content:flex-end">
        <div class="skeleton" style="width:110px;height:12px"></div>
        <div class="skeleton" style="width:32px;height:32px;border-radius:50%;flex-shrink:0"></div>
      </div>
    </div>`;
  container.innerHTML = Array(3).fill(0).map(() => `
    <div class="league-group mb-4">
      <div style="padding:12px 16px;display:flex;align-items:center;gap:12px">
        <div class="skeleton" style="width:28px;height:28px;border-radius:50%;flex-shrink:0"></div>
        <div class="skeleton" style="width:140px;height:13px"></div>
      </div>
      ${skRow()}${skRow()}
    </div>`).join('');
}

function renderView() {
  ['scores','standings','fixtures','stats'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle('hidden', v !== currentView);
  });
  if (currentView === 'scores')    renderMatches();
  if (currentView === 'standings') renderStandings();
  if (currentView === 'fixtures')  renderFixtures();
  if (currentView === 'stats')     renderStats();
}

// ─── Date Tabs ────────────────────────────────────────────────────────────────
function renderDateTabs() {
  const container = document.getElementById('date-tabs');
  if (!container) return;
  const days = [
    { offset: -2, label: fmtDay(-2) },
    { offset: -1, label: 'Dün' },
    { offset:  0, label: 'Bugün' },
    { offset:  1, label: 'Yarın' },
    { offset:  2, label: fmtDay(2) },
  ];
  container.innerHTML = days.map(d => `
    <button class="date-tab ${currentDate === d.offset ? 'active' : ''}"
            onclick="setDate(${d.offset})">${d.label}</button>
  `).join('');
}

function fmtDay(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

async function setDate(offset) {
  currentDate = offset;
  renderDateTabs();
  if (typeof fetchMatchesByDate === 'function') {
    const d = new Date(); d.setDate(d.getDate() + offset);
    const fetched = await fetchMatchesByDate(d.toISOString().split('T')[0]).catch(() => null);
    if (fetched && fetched.length) MATCHES = fetched;
  }
  renderMatches();
}

// ─── Filtered Matches ─────────────────────────────────────────────────────────
function getFilteredMatches() {
  let list = [...MATCHES];
  if (currentDate < 0) list = list.filter(m => m.status === 'finished');
  else if (currentDate > 0) list = list.filter(m => m.status === 'upcoming');

  if (currentLeague !== 'all') list = list.filter(m => m.league === currentLeague);
  if (currentStatus === 'favorites') {
    list = list.filter(m => favorites.has(m.home) || favorites.has(m.away));
  } else if (currentStatus !== 'all') {
    list = list.filter(m => m.status === currentStatus);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(m =>
      TEAMS[m.home].name.toLowerCase().includes(q) ||
      TEAMS[m.away].name.toLowerCase().includes(q) ||
      LEAGUES[m.league].name.toLowerCase().includes(q)
    );
  }
  return list;
}

// ─── Render Matches ───────────────────────────────────────────────────────────
function renderMatches() {
  const container = document.getElementById('matches-container');
  if (!container) return;
  const matches = getFilteredMatches();

  if (!matches.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="56" height="56" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="opacity:.2;margin-bottom:14px">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p style="font-size:16px;font-weight:600">Maç bulunamadı</p>
        <p style="font-size:13px;margin-top:6px;opacity:.7">Filtreleri değiştirmeyi deneyin</p>
      </div>`;
    return;
  }

  const grouped = {};
  matches.forEach(m => { (grouped[m.league] = grouped[m.league] || []).push(m); });

  const leagueOrder = Object.keys(grouped).sort((a, b) => {
    const aL = grouped[a].some(m => m.status === 'live') ? -1 : 0;
    const bL = grouped[b].some(m => m.status === 'live') ? -1 : 0;
    return aL - bL;
  });

  container.innerHTML = leagueOrder.map(lid => renderLeagueGroup(lid, grouped[lid])).join('');
}

function renderLeagueGroup(lid, matches) {
  const league = LEAGUES[lid];
  const isExpanded = expandedLeagues[lid] !== false;
  const liveCount = matches.filter(m => m.status === 'live').length;

  return `
    <div class="league-group mb-4">
      <div class="league-group-header flex items-center justify-between px-4 py-3"
           onclick="toggleLeague('${lid}')">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:20px;line-height:1">${league.flag}</span>
          <div>
            <p style="font-size:13px;font-weight:700;color:var(--text-1)">${league.name}</p>
            <p style="font-size:11px;color:var(--text-5);margin-top:1px">${league.country}</p>
          </div>
          ${liveCount ? `
            <span class="live-badge">
              <span class="live-dot" style="width:6px;height:6px;background:#4ade80;border-radius:50%;display:inline-block"></span>
              ${liveCount} CANLI
            </span>` : ''}
        </div>
        <svg style="width:16px;height:16px;color:var(--text-6);transition:transform .2s;${isExpanded ? 'transform:rotate(180deg)' : ''}"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <div id="league-${lid}" ${isExpanded ? '' : 'style="display:none"'}>
        ${matches.map((m, i) => renderMatchRow(m, i)).join('')}
      </div>
    </div>`;
}

function renderMatchRow(match) {
  const home = TEAMS[match.home] || { name: match.home, shortName: '?', logo: '' };
  const away = TEAMS[match.away] || { name: match.away, shortName: '?', logo: '' };
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const isFinished = match.status === 'finished';
  const minute = liveMinutes[match.id] || match.minute;
  const homeFav = favorites.has(match.home);
  const awayFav = favorites.has(match.away);

  let scoreHtml;
  if (isFinished) {
    const hw = match.score.home > match.score.away;
    const aw = match.score.away > match.score.home;
    scoreHtml = `<p class="score-num" style="font-size:26px;font-weight:900">
      <span style="color:${hw ? '#4ade80' : aw ? '#f87171' : 'var(--score-color)'}">${match.score.home}</span>
      <span style="color:var(--score-sep);font-weight:300;margin:0 4px">:</span>
      <span style="color:${aw ? '#4ade80' : hw ? '#f87171' : 'var(--score-color)'}">${match.score.away}</span>
    </p>
    <p style="font-size:10px;color:var(--text-7);margin-top:2px">BİTTİ</p>`;
  } else if (isLive) {
    scoreHtml = `<p class="score-num" style="font-size:26px;font-weight:900;color:var(--score-color)">
      ${match.score.home}<span style="color:var(--score-sep);font-weight:300;margin:0 4px">:</span>${match.score.away}
    </p>
    <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:2px">
      <span class="live-dot" style="width:5px;height:5px;background:#4ade80;border-radius:50%;display:inline-block;flex-shrink:0"></span>
      <span id="minute-${match.id}" style="font-size:11px;font-weight:700;color:#4ade80">${minute}'</span>
    </div>`;
  }

  const centerBlock = isUpcoming
    ? `<div style="text-align:center;min-width:70px">
         <p style="font-size:17px;font-weight:700;color:var(--text-2);letter-spacing:-.01em">${match.kickoff}</p>
         <p class="countdown-timer" id="cd-${match.id}">…</p>
       </div>`
    : `<div style="text-align:center;min-width:80px">${scoreHtml}</div>`;

  const homeBold = isLive && match.score.home > match.score.away;
  const awayBold = isLive && match.score.away > match.score.home;

  return `
    <div class="match-card league-match-row ${isLive ? 'match-card-live' : ''} px-4 py-3.5"
         data-match-id="${match.id}"
         onclick="openModal(${match.id})">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <div class="team-logo">
            <img src="${home.logo}" alt="${home.shortName}"
                 onerror="this.parentElement.innerHTML='<span style=font-size:11px;font-weight:800;color:var(--text-2)>${home.shortName}</span>'">
          </div>
          <span style="font-size:13px;font-weight:${homeBold ? '700' : '500'};
                       color:${homeBold ? 'var(--score-color)' : 'var(--text-2)'};
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${home.name}</span>
        </div>
        ${centerBlock}
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;justify-content:flex-end">
          <span style="font-size:13px;font-weight:${awayBold ? '700' : '500'};
                       color:${awayBold ? 'var(--score-color)' : 'var(--text-2)'};
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right">${away.name}</span>
          <div class="team-logo">
            <img src="${away.logo}" alt="${away.shortName}"
                 onerror="this.parentElement.innerHTML='<span style=font-size:11px;font-weight:800;color:var(--text-2)>${away.shortName}</span>'">
          </div>
          <button class="fav-btn" onclick="toggleFavorite(event,'${match.home}','${match.away}')" title="Favorile">
            <svg fill="${homeFav || awayFav ? '#facc15' : 'none'}" stroke="${homeFav || awayFav ? '#facc15' : 'var(--text-6)'}" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`;
}

// ─── Toggle League ────────────────────────────────────────────────────────────
function toggleLeague(lid) {
  expandedLeagues[lid] = expandedLeagues[lid] === false ? true : false;
  const el = document.getElementById(`league-${lid}`);
  if (el) el.style.display = expandedLeagues[lid] === false ? 'none' : '';
}

// ─── Favorites ────────────────────────────────────────────────────────────────
function toggleFavorite(e, homeId, awayId) {
  e.stopPropagation();
  [homeId, awayId].forEach(id => {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
  });
  localStorage.setItem('cg_favorites', JSON.stringify([...favorites]));
  renderMatches();
}

// ─── Modal ────────────────────────────────────────────────────────────────────
async function openModal(matchId) {
  const match = MATCHES.find(m => m.id === matchId);
  if (!match) return;
  currentModalMatch = match;
  const home = TEAMS[match.home] || { name: match.home, shortName: '?', logo: '' };
  const away = TEAMS[match.away] || { name: match.away, shortName: '?', logo: '' };
  const league = LEAGUES[match.league];
  const isLive = match.status === 'live';
  const minute = liveMinutes[match.id] || match.minute;

  document.getElementById('modal-league').textContent = `${league.flag} ${league.name}`;
  document.getElementById('modal-home-name').textContent = home.name;
  document.getElementById('modal-away-name').textContent = away.name;

  const hLogo = document.getElementById('modal-home-logo');
  const aLogo = document.getElementById('modal-away-logo');
  hLogo.src = home.logo;
  aLogo.src = away.logo;
  hLogo.onerror = () => { hLogo.style.display='none'; };
  aLogo.onerror = () => { aLogo.style.display='none'; };

  if (match.status === 'upcoming') {
    document.getElementById('modal-score').innerHTML = `
      <div style="text-align:center">
        <p style="font-size:36px;font-weight:800;color:var(--text-2)">${match.kickoff}</p>
        <p style="font-size:12px;color:var(--text-6);margin-top:4px">BAŞLAMADI</p>
      </div>`;
  } else {
    document.getElementById('modal-score').innerHTML = `
      <div style="text-align:center">
        <p class="score-num" style="font-size:44px;font-weight:900;color:var(--score-color)">
          ${match.score.home}
          <span style="font-size:32px;color:var(--score-sep);font-weight:300;margin:0 8px">:</span>
          ${match.score.away}
        </p>
        ${isLive
          ? `<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px">
               <span class="live-ring" style="width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block;flex-shrink:0"></span>
               <span style="font-size:12px;font-weight:700;color:#4ade80;letter-spacing:.05em">CANLI · ${minute}'</span>
             </div>`
          : `<p style="font-size:12px;color:var(--text-6);margin-top:4px">MAÇ BİTTİ</p>`}
      </div>`;
  }

  showModalTab('events');
  renderModalEvents(match, home, away);
  renderModalStats(match);

  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Modal açıkken API'den güncel stats + events çek
  if (match.status !== 'upcoming' && typeof fetchMatchStats === 'function') {
    const [statsRes, eventsRes] = await Promise.allSettled([
      fetchMatchStats(match.id),
      fetchMatchEvents(match.id),
    ]);
    if (statsRes.status  === 'fulfilled') match.stats  = statsRes.value;
    if (eventsRes.status === 'fulfilled') match.events = eventsRes.value;
    renderModalEvents(match, home, away);
    renderModalStats(match);
  }
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
}

function showModalTab(tab) {
  ['events','stats','h2h'].forEach(t => {
    document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tab);
    const p = document.getElementById(`tab-${t}`);
    if (p) p.style.display = t === tab ? '' : 'none';
  });
  if (tab === 'h2h' && currentModalMatch) loadH2H(currentModalMatch);
}

function renderModalEvents(match, home, away) {
  const el = document.getElementById('tab-events');
  if (!el) return;
  if (!match.events?.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 0;color:var(--text-7);font-size:14px">Henüz olay yok</div>`;
    return;
  }
  const icons = {
    goal: '⚽', yellowCard: '🟨', redCard: '🟥',
    ownGoal: '⚽', penalty: '⚽', sub: '🔄',
  };
  const colors = {
    goal: '#4ade80', yellowCard: '#facc15', redCard: '#f87171',
    ownGoal: '#fb923c', penalty: '#4ade80', sub: 'var(--text-4)',
  };

  const sorted = [...match.events].sort((a,b) => a.minute - b.minute);
  el.innerHTML = `<div style="padding:8px 0">` +
    sorted.map(ev => {
      const isHome = ev.team === match.home;
      const icon = icons[ev.type] || '•';
      const col  = colors[ev.type] || 'var(--text-8)';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 20px;
                    flex-direction:${isHome ? 'row' : 'row-reverse'}">
          <span style="font-size:10px;font-weight:700;color:var(--text-6);
                       width:28px;text-align:center;flex-shrink:0">${ev.minute}'</span>
          <span style="font-size:18px;flex-shrink:0">${icon}</span>
          <div style="flex:1;min-width:0;${isHome ? '' : 'text-align:right'}">
            <p style="font-size:13px;font-weight:600;color:var(--text-1)">${ev.player}</p>
            ${ev.assist ? `<p style="font-size:11px;color:var(--text-5);margin-top:1px">Asist: ${ev.assist}</p>` : ''}
          </div>
        </div>`;
    }).join('') + `</div>`;
}

function renderModalStats(match) {
  const el = document.getElementById('tab-stats');
  if (!el) return;
  if (!match.stats || !Object.keys(match.stats).length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 0;color:var(--text-7);font-size:14px">İstatistik yok</div>`;
    return;
  }
  const rows = [
    { label: 'Top Hakimiyeti', key: 'possession', pct: true },
    { label: 'Şut', key: 'shots' },
    { label: 'İsabetli Şut', key: 'shotsOnTarget' },
    { label: 'Korner', key: 'corners' },
    { label: 'Faul', key: 'fouls' },
    { label: 'Sarı Kart', key: 'yellowCards' },
    { label: 'Kırmızı Kart', key: 'redCards' },
  ];
  el.innerHTML = `
    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:18px">
      ${rows.map(row => {
        const val = match.stats[row.key];
        if (val === undefined) return '';
        const [h,a] = Array.isArray(val) ? val : [val, val];
        const total = (h + a) || 1;
        const hPct = Math.round(h / total * 100);
        const aPct = 100 - hPct;
        return `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:7px">
              <span style="font-size:13px;font-weight:700;color:var(--text-1)">${h}${row.pct?'%':''}</span>
              <span style="font-size:11px;font-weight:600;color:var(--text-5);text-transform:uppercase;letter-spacing:.04em">${row.label}</span>
              <span style="font-size:13px;font-weight:700;color:var(--text-1)">${a}${row.pct?'%':''}</span>
            </div>
            <div class="stat-bar-track">
              <div class="stat-bar-home" style="width:${hPct}%"></div>
              <div class="stat-bar-away" style="width:${aPct}%"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─── Standings ────────────────────────────────────────────────────────────────
function setStandingsSeason(year) {
  currentSeason = year;
  if (typeof setAPISeason === 'function') setAPISeason(year);
  // STANDINGS'i temizle, yeni sezon verisi gelsin
  Object.keys(STANDINGS).forEach(k => delete STANDINGS[k]);
  renderStandings();
  if (typeof loadStandingsIfNeeded === 'function') loadStandingsIfNeeded(year);
}

function renderStandings() {
  const container = document.getElementById('standings-container');
  if (!container) return;

  // ── Sezon Seçici ────────────────────────────────────────────────────────────
  const seasons = [2025, 2024, 2023, 2022, 2021, 2020];
  const seasonSelector = `
    <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:14px;gap:10px">
      <span style="font-size:12px;font-weight:600;color:var(--text-5)">Sezon</span>
      <div style="position:relative">
        <select onchange="setStandingsSeason(+this.value)"
                style="appearance:none;-webkit-appearance:none;
                       background:var(--bg-surface);border:1px solid var(--border);
                       color:var(--text-1);border-radius:10px;
                       padding:7px 32px 7px 14px;font-size:13px;font-weight:600;
                       cursor:pointer;outline:none;transition:all .18s">
          ${seasons.map(y => `
            <option value="${y}" ${y === currentSeason ? 'selected' : ''}>
              ${y}/${String(y + 1).slice(2)}
            </option>`).join('')}
        </select>
        <svg style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                    width:12px;height:12px;color:var(--text-5);pointer-events:none"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>`;

  const leagues = currentLeague === 'all' ? Object.keys(STANDINGS) : [currentLeague].filter(l => STANDINGS[l]);

  if (!leagues.length) {
    container.innerHTML = seasonSelector + `
      <div class="empty-state">
        <p style="font-size:28px;margin-bottom:10px">📊</p>
        <p>${currentSeason}/${currentSeason + 1} sezonu puan durumu yükleniyor…</p>
      </div>`;
    return;
  }

  container.innerHTML = seasonSelector + leagues.map(lid => {
    const league = LEAGUES[lid];
    const rows = STANDINGS[lid];
    if (!league || !rows) return '';
    return `
      <div class="league-group mb-5">
        <div class="league-group-header flex items-center gap-3 px-4 py-3">
          <span style="font-size:20px">${league.flag}</span>
          <h3 style="font-size:13px;font-weight:700;color:var(--text-1)">${league.name}</h3>
          <span style="font-size:11px;color:var(--text-6);margin-left:auto">${league.country}</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="color:var(--text-6);font-size:10px;text-transform:uppercase;letter-spacing:.04em">
                <th style="padding:8px 16px;text-align:left;width:32px">#</th>
                <th style="padding:8px 16px;text-align:left">Takım</th>
                <th style="padding:8px 8px;text-align:center">O</th>
                <th style="padding:8px 8px;text-align:center">G</th>
                <th style="padding:8px 8px;text-align:center">B</th>
                <th style="padding:8px 8px;text-align:center">M</th>
                <th style="padding:8px 8px;text-align:center">AG</th>
                <th style="padding:8px 8px;text-align:center;font-weight:700;color:var(--text-8)">P</th>
                <th style="padding:8px 12px 8px 4px;text-align:center">Form</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, i) => {
                const team = TEAMS[row.team];
                const dotCls = i === 0 ? 'pos-ucl' : i <= 1 ? 'pos-ucl' : i >= rows.length-1 ? 'pos-rel' : '';
                return `
                  <tr style="border-top:1px solid var(--border-3);transition:background .15s"
                      onmouseover="this.style.background='var(--bg-row-hover)'"
                      onmouseout="this.style.background=''">
                    <td style="padding:10px 16px;text-align:center">
                      <div style="display:flex;align-items:center;gap:6px">
                        <span class="pos-dot ${dotCls}"></span>
                        <span style="font-size:12px;font-weight:700;color:var(--text-4)">${row.pos}</span>
                      </div>
                    </td>
                    <td style="padding:10px 16px">
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="team-logo" style="width:24px;height:24px">
                          <img src="${team?.logo||''}" alt="" style="width:16px;height:16px;object-fit:contain"
                               onerror="this.style.display='none'">
                        </div>
                        <span style="font-weight:500;color:var(--text-team)">${team?.name||row.team}</span>
                      </div>
                    </td>
                    <td style="padding:10px 8px;text-align:center;color:var(--text-8)">${row.played}</td>
                    <td style="padding:10px 8px;text-align:center;color:var(--text-8)">${row.won}</td>
                    <td style="padding:10px 8px;text-align:center;color:var(--text-8)">${row.drawn}</td>
                    <td style="padding:10px 8px;text-align:center;color:var(--text-8)">${row.lost}</td>
                    <td style="padding:10px 8px;text-align:center;color:var(--text-4);font-size:11px">
                      ${row.gd > 0 ? '+' : ''}${row.gd}
                    </td>
                    <td style="padding:10px 8px;text-align:center;font-size:14px;font-weight:800;color:var(--score-color)">${row.pts}</td>
                    <td style="padding:10px 12px 10px 4px">
                      <div style="display:flex;gap:2px;justify-content:center">
                        ${row.form.map(f => `<span class="form-badge form-${f}">${f}</span>`).join('')}
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function renderFixtures() {
  const container = document.getElementById('fixtures-container');
  if (!container) return;
  let matches = MATCHES.filter(m => m.status === 'upcoming');
  if (currentLeague !== 'all') matches = matches.filter(m => m.league === currentLeague);

  if (!matches.length) {
    container.innerHTML = `<div class="empty-state"><p>Yaklaşan maç bulunamadı</p></div>`;
    return;
  }

  const grouped = {};
  matches.forEach(m => { (grouped[m.league] = grouped[m.league] || []).push(m); });
  container.innerHTML = Object.keys(grouped).map(lid => `
    <div class="league-group mb-4">
      <div class="league-group-header flex items-center gap-3 px-4 py-3">
        <span style="font-size:20px">${LEAGUES[lid].flag}</span>
        <h3 style="font-size:13px;font-weight:700;color:var(--text-1)">${LEAGUES[lid].name}</h3>
      </div>
      ${grouped[lid].map((m,i) => renderMatchRow(m,i)).join('')}
    </div>`).join('');
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;
  const leagues = currentLeague === 'all' ? Object.keys(TOP_SCORERS) : [currentLeague].filter(l => TOP_SCORERS[l]);

  container.innerHTML = leagues.map(lid => {
    const league = LEAGUES[lid];
    const scorers = TOP_SCORERS[lid];
    if (!league || !scorers) return '';
    return `
      <div class="league-group mb-5">
        <div class="league-group-header flex items-center gap-3 px-4 py-3">
          <span style="font-size:20px">${league.flag}</span>
          <h3 style="font-size:13px;font-weight:700;color:var(--text-1)">${league.name}</h3>
          <span style="font-size:11px;color:var(--text-6);margin-left:auto">Gol Krallığı</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="color:var(--text-6);font-size:10px;text-transform:uppercase;letter-spacing:.04em">
                <th style="padding:8px 16px;text-align:left;width:32px">#</th>
                <th style="padding:8px 16px;text-align:left">Oyuncu</th>
                <th style="padding:8px 16px;text-align:left">Takım</th>
                <th style="padding:8px 12px;text-align:center">MAÇ</th>
                <th style="padding:8px 12px;text-align:center;color:#4ade80">GOL</th>
                <th style="padding:8px 12px;text-align:center">ASİST</th>
              </tr>
            </thead>
            <tbody>
              ${scorers.map(s => {
                const team = TEAMS[s.team];
                const rankColor = s.rank === 1 ? '#fbbf24' : s.rank === 2 ? '#94a3b8' : s.rank === 3 ? '#b45309' : 'var(--text-6)';
                return `
                  <tr style="border-top:1px solid var(--border-3)"
                      onmouseover="this.style.background='var(--bg-row-hover)'"
                      onmouseout="this.style.background=''">
                    <td style="padding:12px 16px;text-align:center;font-size:13px;font-weight:800;color:${rankColor}">${s.rank}</td>
                    <td style="padding:12px 16px;font-weight:600;color:var(--text-team)">${s.player}</td>
                    <td style="padding:12px 16px">
                      <div style="display:flex;align-items:center;gap:7px">
                        <div class="team-logo" style="width:22px;height:22px">
                          <img src="${team?.logo||''}" alt="" style="width:14px;height:14px;object-fit:contain"
                               onerror="this.style.display='none'">
                        </div>
                        <span style="color:var(--text-3)">${team?.name||s.team}</span>
                      </div>
                    </td>
                    <td style="padding:12px;text-align:center;color:var(--text-4)">${s.apps}</td>
                    <td style="padding:12px;text-align:center;font-size:16px;font-weight:900;color:#4ade80">${s.goals}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-4)">${s.assists}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function setView(view) {
  currentView = view;
  renderAll();
  if (view === 'standings' && typeof loadStandingsIfNeeded === 'function') loadStandingsIfNeeded(currentSeason);
  if (view === 'stats'     && typeof loadScorersIfNeeded    === 'function') loadScorersIfNeeded(currentSeason);
}

function updateNavActive() {
  document.querySelectorAll('[data-view]').forEach(el => {
    const isActive = el.dataset.view === currentView;
    if (el.classList.contains('nav-tab')) el.classList.toggle('active', isActive);
    if (el.classList.contains('bnav-btn')) el.classList.toggle('active', isActive);
  });
}

// ─── League Filter ────────────────────────────────────────────────────────────
function setLeague(league) {
  currentLeague = league;
  document.querySelectorAll('.pill-league').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.league === league);
  });
  renderView();
}

// ─── Status Filter ────────────────────────────────────────────────────────────
function setStatus(status) {
  currentStatus = status;
  document.querySelectorAll('.pill-status').forEach(btn => {
    const a = btn.dataset.status === status;
    btn.classList.toggle('active', a);
    btn.classList.toggle('active-live', status === 'live' && a);
  });
  renderMatches();
}

// ─── Search ───────────────────────────────────────────────────────────────────
function setupSearch() {
  document.querySelectorAll('.js-search').forEach(inp => {
    inp.addEventListener('focus', () => showSearchHistory(inp));
    inp.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      hideSearchHistory();
      renderMatches();
    });
    inp.addEventListener('blur', () => setTimeout(hideSearchHistory, 200));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchQuery) {
        saveSearchHistory(searchQuery);
        hideSearchHistory();
      }
    });
  });
}

function saveSearchHistory(query) {
  searchHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
  localStorage.setItem('cg_search_history', JSON.stringify(searchHistory));
}

function showSearchHistory(inp) {
  if (!searchHistory.length || inp.value) return;
  let drop = document.getElementById('search-history-drop');
  if (!drop) {
    drop = document.createElement('div');
    drop.id = 'search-history-drop';
    drop.className = 'search-history-drop';
    inp.parentElement.style.position = 'relative';
    inp.parentElement.appendChild(drop);
  }
  drop.innerHTML = searchHistory.map(q => `
    <div class="search-history-item" onmousedown="applySearch('${q.replace(/'/g, "\\'")}')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      ${q}
    </div>`).join('');
  drop.style.display = 'block';
}

function hideSearchHistory() {
  const drop = document.getElementById('search-history-drop');
  if (drop) drop.style.display = 'none';
}

function applySearch(query) {
  searchQuery = query;
  document.querySelectorAll('.js-search').forEach(inp => inp.value = query);
  renderMatches();
  hideSearchHistory();
}

// ─── Dark Mode ────────────────────────────────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}
function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  const isDark = document.documentElement.classList.contains('dark');
  icon.innerHTML = isDark
    ? `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
    : `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
}

// ─── Countdown Ticker ─────────────────────────────────────────────────────────
function startCountdownTicker() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    MATCHES.forEach(m => {
      if (m.status !== 'upcoming' || !m.kickoff) return;
      const el = document.getElementById(`cd-${m.id}`);
      if (!el) return;
      const [h, mn] = m.kickoff.split(':').map(Number);
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() + currentDate);
      matchDate.setHours(h, mn, 0, 0);
      const diff = matchDate - Date.now();
      if (diff <= 0) { el.textContent = 'Başlıyor'; return; }
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      el.textContent = hh > 0
        ? `${hh}s ${String(mm).padStart(2,'0')}d kaldı`
        : `${mm}d ${String(ss).padStart(2,'0')}s kaldı`;
    });
  }, 1000);
}

// ─── Live Ticker ──────────────────────────────────────────────────────────────
function startLiveTicker() {
  clearInterval(tickerInterval);
  tickerInterval = setInterval(() => {
    MATCHES.forEach(m => {
      if (m.status !== 'live') return;
      liveMinutes[m.id] = Math.min((liveMinutes[m.id] || m.minute) + 1, 90);
      const el = document.getElementById(`minute-${m.id}`);
      if (el) el.textContent = `${liveMinutes[m.id]}'`;
    });
  }, 60000);
}

// ─── Pull to Refresh ──────────────────────────────────────────────────────────
function setupPullToRefresh() {
  let startY = 0;
  let triggered = false;
  const bar = document.getElementById('ptr-bar');

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!startY) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 70 && !triggered && currentView === 'scores') {
      triggered = true;
      if (bar) bar.classList.add('active');
    }
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (triggered) {
      if (bar) bar.classList.add('active');
      await setDate(currentDate);
      if (bar) bar.classList.remove('active');
    }
    startY = 0;
    triggered = false;
  });
}

// ─── Share ────────────────────────────────────────────────────────────────────
function shareModal() {
  if (!currentModalMatch) return;
  const m = currentModalMatch;
  const home = TEAMS[m.home] || { name: m.home };
  const away = TEAMS[m.away] || { name: m.away };
  const league = LEAGUES[m.league];
  let text;
  if (m.status === 'upcoming') {
    text = `${home.name} - ${away.name} | ${m.kickoff} | ${league?.name || ''} | CamoGoal`;
  } else {
    text = `${home.name} ${m.score.home}-${m.score.away} ${away.name} | ${league?.name || ''} | CamoGoal`;
  }
  if (navigator.share) {
    navigator.share({ title: 'CamoGoal', text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).then(() => {
      const btn = document.querySelector('.share-btn');
      if (btn) { btn.style.background = 'rgba(74,222,128,.2)'; setTimeout(() => btn.style.background = '', 1500); }
    }).catch(() => {});
  }
}

// ─── H2H ──────────────────────────────────────────────────────────────────────
async function loadH2H(match) {
  const el = document.getElementById('tab-h2h');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text-6);font-size:13px">Yükleniyor…</div>`;
  if (typeof fetchH2H !== 'function') {
    el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text-6);font-size:13px">H2H verisi yok</div>`;
    return;
  }
  try {
    const matches = await fetchH2H(match.home, match.away);
    if (!matches || !matches.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text-6);font-size:13px">Karşılaşma geçmişi bulunamadı</div>`;
      return;
    }
    el.innerHTML = `
      <div style="padding:12px 20px 8px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;font-weight:700;color:var(--text-5);text-transform:uppercase;letter-spacing:.05em">Son ${matches.length} Karşılaşma</span>
      </div>` +
      matches.map(hm => {
        const mHome = TEAMS[hm.home] || { name: hm.home };
        const mAway = TEAMS[hm.away] || { name: hm.away };
        const hw = hm.score.home > hm.score.away;
        const aw = hm.score.away > hm.score.home;
        return `<div class="h2h-row">
          <span style="font-size:12px;color:var(--text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mHome.name}</span>
          <span class="h2h-score-badge">
            <span style="color:${hw?'#4ade80':aw?'#f87171':'var(--text-2)'}">${hm.score.home}</span>
            <span style="color:var(--text-6);margin:0 3px">-</span>
            <span style="color:${aw?'#4ade80':hw?'#f87171':'var(--text-2)'}">${hm.score.away}</span>
          </span>
          <span style="font-size:12px;color:var(--text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">${mAway.name}</span>
        </div>`;
      }).join('');
  } catch(e) {
    el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text-6);font-size:13px">H2H verisi yüklenemedi</div>`;
  }
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
