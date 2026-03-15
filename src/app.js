/* GoalPulse — app.js */

// ─── State ────────────────────────────────────────────────────────────────────
let currentView   = 'scores';
let currentLeague = 'all';
let currentStatus = 'all';
let currentDate   = 0;
let searchQuery   = '';
let expandedLeagues = {};
let liveMinutes   = {};
let tickerInterval = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Dark mode default
  document.documentElement.classList.add('dark');
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.documentElement.classList.remove('dark');

  MATCHES.forEach(m => {
    if (m.status === 'live') liveMinutes[m.id] = m.minute;
  });

  renderAll();
  startLiveTicker();
  setupSearch();
  updateThemeIcon();
});

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll() {
  renderDateTabs();
  renderView();
  updateNavActive();
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

function setDate(offset) {
  currentDate = offset;
  renderDateTabs();
  renderMatches();
}

// ─── Filtered Matches ─────────────────────────────────────────────────────────
function getFilteredMatches() {
  let list = [...MATCHES];
  if (currentDate < 0) list = list.filter(m => m.status === 'finished');
  else if (currentDate > 0) list = list.filter(m => m.status === 'upcoming');

  if (currentLeague !== 'all') list = list.filter(m => m.league === currentLeague);
  if (currentStatus !== 'all') list = list.filter(m => m.status === currentStatus);

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
        <p style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.3)">Maç bulunamadı</p>
        <p style="font-size:13px;margin-top:6px;color:rgba(255,255,255,0.18)">Filtreleri değiştirmeyi deneyin</p>
      </div>`;
    return;
  }

  // Group by league, live first
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
            <p style="font-size:13px;font-weight:700;color:#f1f5f9">${league.name}</p>
            <p style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:1px">${league.country}</p>
          </div>
          ${liveCount ? `
            <span class="live-badge">
              <span class="live-dot" style="width:6px;height:6px;background:#4ade80;border-radius:50%;display:inline-block"></span>
              ${liveCount} CANLI
            </span>` : ''}
        </div>
        <svg style="width:16px;height:16px;color:rgba(255,255,255,0.3);transition:transform .2s;${isExpanded ? 'transform:rotate(180deg)' : ''}"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <div id="league-${lid}" ${isExpanded ? '' : 'style="display:none"'}>
        ${matches.map((m, i) => renderMatchRow(m, i)).join('')}
      </div>
    </div>`;
}

function renderMatchRow(match, idx) {
  const home = TEAMS[match.home];
  const away = TEAMS[match.away];
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const minute = liveMinutes[match.id] || match.minute;

  const centerBlock = isUpcoming
    ? `<div style="text-align:center;min-width:70px">
         <p style="font-size:17px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:-.01em">${match.kickoff}</p>
         <p style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px">BAŞLAMADI</p>
       </div>`
    : `<div style="text-align:center;min-width:80px">
         <p class="score-num" style="font-size:26px;font-weight:900;color:#f8fafc">
           ${match.score.home}<span style="color:rgba(255,255,255,0.2);font-weight:300;margin:0 4px">:</span>${match.score.away}
         </p>
         ${isLive
           ? `<div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:2px">
                <span class="live-dot" style="width:5px;height:5px;background:#4ade80;border-radius:50%;display:inline-block;flex-shrink:0"></span>
                <span id="minute-${match.id}" style="font-size:11px;font-weight:700;color:#4ade80">${minute}'</span>
              </div>`
           : `<p style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px">BİTTİ</p>`}
       </div>`;

  return `
    <div class="match-card league-match-row ${isLive ? 'match-card-live' : ''} px-4 py-3.5"
         onclick="openModal(${match.id})">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <!-- Home -->
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <div class="team-logo">
            <img src="${home.logo}" alt="${home.shortName}"
                 onerror="this.parentElement.innerHTML='<span style=font-size:11px;font-weight:800;color:rgba(255,255,255,0.6)>${home.shortName}</span>'">
          </div>
          <span style="font-size:13px;font-weight:${isLive && match.score.home > match.score.away ? '700' : '500'};
                       color:${isLive && match.score.home > match.score.away ? '#f8fafc' : 'rgba(255,255,255,0.75)'};
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${home.name}</span>
        </div>
        <!-- Center -->
        ${centerBlock}
        <!-- Away -->
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;justify-content:flex-end">
          <span style="font-size:13px;font-weight:${isLive && match.score.away > match.score.home ? '700' : '500'};
                       color:${isLive && match.score.away > match.score.home ? '#f8fafc' : 'rgba(255,255,255,0.75)'};
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right">${away.name}</span>
          <div class="team-logo">
            <img src="${away.logo}" alt="${away.shortName}"
                 onerror="this.parentElement.innerHTML='<span style=font-size:11px;font-weight:800;color:rgba(255,255,255,0.6)>${away.shortName}</span>'">
          </div>
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

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(matchId) {
  const match = MATCHES.find(m => m.id === matchId);
  if (!match) return;
  const home = TEAMS[match.home];
  const away = TEAMS[match.away];
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
        <p style="font-size:36px;font-weight:800;color:rgba(255,255,255,0.6)">${match.kickoff}</p>
        <p style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:4px">BAŞLAMADI</p>
      </div>`;
  } else {
    document.getElementById('modal-score').innerHTML = `
      <div style="text-align:center">
        <p class="score-num" style="font-size:44px;font-weight:900;color:#f8fafc">
          ${match.score.home}
          <span style="font-size:32px;color:rgba(255,255,255,0.15);font-weight:300;margin:0 8px">:</span>
          ${match.score.away}
        </p>
        ${isLive
          ? `<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px">
               <span class="live-ring" style="width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block;flex-shrink:0"></span>
               <span style="font-size:12px;font-weight:700;color:#4ade80;letter-spacing:.05em">CANLI · ${minute}'</span>
             </div>`
          : `<p style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:4px">MAÇ BİTTİ</p>`}
      </div>`;
  }

  showModalTab('events');
  renderModalEvents(match, home, away);
  renderModalStats(match);

  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
}

function showModalTab(tab) {
  ['events','stats'].forEach(t => {
    document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tab);
    const p = document.getElementById(`tab-${t}`);
    if (p) p.style.display = t === tab ? '' : 'none';
  });
}

function renderModalEvents(match, home, away) {
  const el = document.getElementById('tab-events');
  if (!el) return;
  if (!match.events?.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 0;color:rgba(255,255,255,0.25);font-size:14px">Henüz olay yok</div>`;
    return;
  }
  const icons = {
    goal: '⚽', yellowCard: '🟨', redCard: '🟥',
    ownGoal: '⚽', penalty: '⚽', sub: '🔄',
  };
  const colors = {
    goal: '#4ade80', yellowCard: '#facc15', redCard: '#f87171',
    ownGoal: '#fb923c', penalty: '#4ade80', sub: 'rgba(255,255,255,0.4)',
  };

  const sorted = [...match.events].sort((a,b) => a.minute - b.minute);
  el.innerHTML = `<div style="padding:8px 0">` +
    sorted.map(ev => {
      const isHome = ev.team === match.home;
      const icon = icons[ev.type] || '•';
      const col  = colors[ev.type] || 'rgba(255,255,255,0.5)';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 20px;
                    flex-direction:${isHome ? 'row' : 'row-reverse'}">
          <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);
                       width:28px;text-align:center;flex-shrink:0">${ev.minute}'</span>
          <span style="font-size:18px;flex-shrink:0">${icon}</span>
          <div style="flex:1;min-width:0;${isHome ? '' : 'text-align:right'}">
            <p style="font-size:13px;font-weight:600;color:#f1f5f9">${ev.player}</p>
            ${ev.assist ? `<p style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:1px">Asist: ${ev.assist}</p>` : ''}
          </div>
        </div>`;
    }).join('') + `</div>`;
}

function renderModalStats(match) {
  const el = document.getElementById('tab-stats');
  if (!el) return;
  if (!match.stats || !Object.keys(match.stats).length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 0;color:rgba(255,255,255,0.25);font-size:14px">İstatistik yok</div>`;
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
              <span style="font-size:13px;font-weight:700;color:#f1f5f9">${h}${row.pct?'%':''}</span>
              <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.04em">${row.label}</span>
              <span style="font-size:13px;font-weight:700;color:#f1f5f9">${a}${row.pct?'%':''}</span>
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
function renderStandings() {
  const container = document.getElementById('standings-container');
  if (!container) return;
  const leagues = currentLeague === 'all' ? Object.keys(STANDINGS) : [currentLeague].filter(l => STANDINGS[l]);

  if (!leagues.length) {
    container.innerHTML = `<div class="empty-state"><p>Bu lig için puan durumu yok</p></div>`;
    return;
  }

  container.innerHTML = leagues.map(lid => {
    const league = LEAGUES[lid];
    const rows = STANDINGS[lid];
    if (!league || !rows) return '';
    return `
      <div class="league-group mb-5">
        <div class="league-group-header flex items-center gap-3 px-4 py-3">
          <span style="font-size:20px">${league.flag}</span>
          <h3 style="font-size:13px;font-weight:700;color:#f1f5f9">${league.name}</h3>
          <span style="font-size:11px;color:rgba(255,255,255,0.3);margin-left:auto">${league.country}</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:.04em">
                <th style="padding:8px 16px;text-align:left;width:32px">#</th>
                <th style="padding:8px 16px;text-align:left">Takım</th>
                <th style="padding:8px 8px;text-align:center">O</th>
                <th style="padding:8px 8px;text-align:center">G</th>
                <th style="padding:8px 8px;text-align:center">B</th>
                <th style="padding:8px 8px;text-align:center">M</th>
                <th style="padding:8px 8px;text-align:center">AG</th>
                <th style="padding:8px 8px;text-align:center;font-weight:700;color:rgba(255,255,255,0.5)">P</th>
                <th style="padding:8px 12px 8px 4px;text-align:center">Form</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, i) => {
                const team = TEAMS[row.team];
                const dotCls = i === 0 ? 'pos-ucl' : i <= 1 ? 'pos-ucl' : i >= rows.length-1 ? 'pos-rel' : '';
                return `
                  <tr style="border-top:1px solid rgba(255,255,255,0.05);transition:background .15s"
                      onmouseover="this.style.background='rgba(255,255,255,0.04)'"
                      onmouseout="this.style.background=''">
                    <td style="padding:10px 16px;text-align:center">
                      <div style="display:flex;align-items:center;gap:6px">
                        <span class="pos-dot ${dotCls}"></span>
                        <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.4)">${row.pos}</span>
                      </div>
                    </td>
                    <td style="padding:10px 16px">
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="team-logo" style="width:24px;height:24px">
                          <img src="${team?.logo||''}" alt="" style="width:16px;height:16px;object-fit:contain"
                               onerror="this.style.display='none'">
                        </div>
                        <span style="font-weight:500;color:#e2e8f0">${team?.name||row.team}</span>
                      </div>
                    </td>
                    <td style="padding:10px 8px;text-align:center;color:rgba(255,255,255,0.5)">${row.played}</td>
                    <td style="padding:10px 8px;text-align:center;color:rgba(255,255,255,0.5)">${row.won}</td>
                    <td style="padding:10px 8px;text-align:center;color:rgba(255,255,255,0.5)">${row.drawn}</td>
                    <td style="padding:10px 8px;text-align:center;color:rgba(255,255,255,0.5)">${row.lost}</td>
                    <td style="padding:10px 8px;text-align:center;color:rgba(255,255,255,0.4);font-size:11px">
                      ${row.gd > 0 ? '+' : ''}${row.gd}
                    </td>
                    <td style="padding:10px 8px;text-align:center;font-size:14px;font-weight:800;color:#f8fafc">${row.pts}</td>
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
        <h3 style="font-size:13px;font-weight:700;color:#f1f5f9">${LEAGUES[lid].name}</h3>
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
          <h3 style="font-size:13px;font-weight:700;color:#f1f5f9">${league.name}</h3>
          <span style="font-size:11px;color:rgba(255,255,255,0.3);margin-left:auto">Gol Krallığı</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:.04em">
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
                const rankColor = s.rank === 1 ? '#fbbf24' : s.rank === 2 ? '#94a3b8' : s.rank === 3 ? '#b45309' : 'rgba(255,255,255,0.3)';
                return `
                  <tr style="border-top:1px solid rgba(255,255,255,0.05)"
                      onmouseover="this.style.background='rgba(255,255,255,0.04)'"
                      onmouseout="this.style.background=''">
                    <td style="padding:12px 16px;text-align:center;font-size:13px;font-weight:800;color:${rankColor}">${s.rank}</td>
                    <td style="padding:12px 16px;font-weight:600;color:#e2e8f0">${s.player}</td>
                    <td style="padding:12px 16px">
                      <div style="display:flex;align-items:center;gap:7px">
                        <div class="team-logo" style="width:22px;height:22px">
                          <img src="${team?.logo||''}" alt="" style="width:14px;height:14px;object-fit:contain"
                               onerror="this.style.display='none'">
                        </div>
                        <span style="color:rgba(255,255,255,0.45)">${team?.name||s.team}</span>
                      </div>
                    </td>
                    <td style="padding:12px;text-align:center;color:rgba(255,255,255,0.4)">${s.apps}</td>
                    <td style="padding:12px;text-align:center;font-size:16px;font-weight:900;color:#4ade80">${s.goals}</td>
                    <td style="padding:12px;text-align:center;color:rgba(255,255,255,0.4)">${s.assists}</td>
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
}

function updateNavActive() {
  document.querySelectorAll('[data-view]').forEach(el => {
    const isActive = el.dataset.view === currentView;
    if (el.classList.contains('nav-tab')) {
      el.classList.toggle('active', isActive);
    }
    if (el.classList.contains('bnav-btn')) {
      el.classList.toggle('active', isActive);
    }
  });
}

// ─── League Filter ────────────────────────────────────────────────────────────
function setLeague(league) {
  currentLeague = league;
  document.querySelectorAll('.pill-league').forEach(btn => {
    const a = btn.dataset.league === league;
    btn.classList.toggle('active', a);
  });
  renderView();
}

// ─── Status Filter ────────────────────────────────────────────────────────────
function setStatus(status) {
  currentStatus = status;
  document.querySelectorAll('.pill-status').forEach(btn => {
    const a = btn.dataset.status === status;
    btn.classList.toggle('active', a);
    if (status === 'live' && a) {
      btn.classList.add('active-live');
    } else {
      btn.classList.remove('active-live');
    }
  });
  renderMatches();
}

// ─── Search ───────────────────────────────────────────────────────────────────
function setupSearch() {
  document.querySelectorAll('.js-search').forEach(inp => {
    inp.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      renderMatches();
    });
  });
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

// ─── Keyboard ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
