const APP_VERSION = '1.0.0-dummy';

const LEAGUES = {
  superlig:   { id: 'superlig',   name: 'Süper Lig',          country: 'Türkiye',  apiId: 203, flag: '🇹🇷', logo: 'https://upload.wikimedia.org/wikipedia/tr/thumb/8/85/S%C3%BCper_Lig_logo.svg/200px-S%C3%BCper_Lig_logo.svg.png' },
  premier:    { id: 'premier',    name: 'Premier League',      country: 'İngiltere', apiId: 39,  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/200px-Premier_League_Logo.svg.png' },
  laliga:     { id: 'laliga',     name: 'La Liga',             country: 'İspanya',  apiId: 140, flag: '🇪🇸', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_EA_Sports_2023_Vertical_Logo.svg/200px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png' },
  ucl:        { id: 'ucl',        name: 'Şampiyonlar Ligi',    country: 'Avrupa',   apiId: 2,   flag: '🌍', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/UEFA_Champions_League_logo_2.svg/200px-UEFA_Champions_League_logo_2.svg.png' },
  bundesliga: { id: 'bundesliga', name: 'Bundesliga',          country: 'Almanya',  apiId: 78,  flag: '🇩🇪', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/200px-Bundesliga_logo_%282017%29.svg.png' },
  seriea:     { id: 'seriea',     name: 'Serie A',             country: 'İtalya',   apiId: 135, flag: '🇮🇹', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Serie_A_logo_%282019%29.svg/200px-Serie_A_logo_%282019%29.svg.png' },
};

const TEAMS = {
  // Süper Lig
  galatasaray:  { id: 'galatasaray',  name: 'Galatasaray',      shortName: 'GS',  color: '#FF6200', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Galatasaray_Sports_Club_Logo.svg/200px-Galatasaray_Sports_Club_Logo.svg.png' },
  fenerbahce:   { id: 'fenerbahce',   name: 'Fenerbahçe',       shortName: 'FB',  color: '#003399', logo: 'https://upload.wikimedia.org/wikipedia/tr/thumb/8/8b/Fenerbah%C3%A7e_FC.svg/200px-Fenerbah%C3%A7e_FC.svg.png' },
  besiktas:     { id: 'besiktas',     name: 'Beşiktaş',         shortName: 'BJK', color: '#000000', logo: 'https://upload.wikimedia.org/wikipedia/tr/thumb/f/f2/Besiktas_logo.svg/200px-Besiktas_logo.svg.png' },
  trabzonspor:  { id: 'trabzonspor',  name: 'Trabzonspor',      shortName: 'TS',  color: '#770000', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Trabzonspor_logo.svg/200px-Trabzonspor_logo.svg.png' },
  // Premier League
  mancity:      { id: 'mancity',      name: 'Manchester City',  shortName: 'MCI', color: '#6CABDD', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png' },
  arsenal:      { id: 'arsenal',      name: 'Arsenal',          shortName: 'ARS', color: '#EF0107', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/200px-Arsenal_FC.svg.png' },
  liverpool:    { id: 'liverpool',    name: 'Liverpool',        shortName: 'LIV', color: '#C8102E', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png' },
  chelsea:      { id: 'chelsea',      name: 'Chelsea',          shortName: 'CHE', color: '#034694', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/200px-Chelsea_FC.svg.png' },
  // La Liga
  realmadrid:   { id: 'realmadrid',   name: 'Real Madrid',      shortName: 'RMA', color: '#FEBE10', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/200px-Real_Madrid_CF.svg.png' },
  barcelona:    { id: 'barcelona',    name: 'Barcelona',        shortName: 'BAR', color: '#A50044', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/200px-FC_Barcelona_%28crest%29.svg.png' },
  atletico:     { id: 'atletico',     name: 'Atletico Madrid',  shortName: 'ATM', color: '#CB3524', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/200px-Atletico_Madrid_2017_logo.svg.png' },
  sevilla:      { id: 'sevilla',      name: 'Sevilla',          shortName: 'SEV', color: '#D4021D', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Sevilla_FC_logo.svg/200px-Sevilla_FC_logo.svg.png' },
  // UCL
  psg:          { id: 'psg',          name: 'Paris S-G',        shortName: 'PSG', color: '#003170', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/200px-Paris_Saint-Germain_F.C..svg.png' },
  dortmund:     { id: 'dortmund',     name: 'Borussia Dortmund',shortName: 'BVB', color: '#FDE100', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png' },
  intermilan:   { id: 'intermilan',   name: 'Inter Milan',      shortName: 'INT', color: '#010E80', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/200px-FC_Internazionale_Milano_2021.svg.png' },
  benfica:      { id: 'benfica',      name: 'Benfica',          shortName: 'BEN', color: '#C41E3A', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/S.L._Benfica_logo.svg/200px-S.L._Benfica_logo.svg.png' },
  // Bundesliga
  bayernmunich: { id: 'bayernmunich', name: 'Bayern München',   shortName: 'FCB', color: '#DC052D', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg/200px-FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg.png' },
  leverkusen:   { id: 'leverkusen',   name: 'Bayer Leverkusen', shortName: 'LEV', color: '#E32221', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/59/Bayer_04_Leverkusen_logo.svg/200px-Bayer_04_Leverkusen_logo.svg.png' },
  stuttgard:    { id: 'stuttgard',    name: 'VfB Stuttgart',    shortName: 'STU', color: '#E32221', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/VfB_Stuttgart_1893_Logo.svg/200px-VfB_Stuttgart_1893_Logo.svg.png' },
  dortmund2:    { id: 'dortmund2',    name: 'Borussia Dortmund',shortName: 'BVB', color: '#FDE100', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png' },
  // Serie A
  juventus:     { id: 'juventus',     name: 'Juventus',         shortName: 'JUV', color: '#000000', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Juventus_FC_2017_icon_%28black%29.svg/200px-Juventus_FC_2017_icon_%28black%29.svg.png' },
  acmilan:      { id: 'acmilan',      name: 'AC Milan',         shortName: 'MIL', color: '#FB090B', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/200px-Logo_of_AC_Milan.svg.png' },
  napoli:       { id: 'napoli',       name: 'Napoli',           shortName: 'NAP', color: '#087DC2', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/SSC_Napoli.svg/200px-SSC_Napoli.svg.png' },
  asroma:       { id: 'asroma',       name: 'AS Roma',          shortName: 'ROM', color: '#9B1316', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/AS_Roma_logo_%282017%29.svg/200px-AS_Roma_logo_%282017%29.svg.png' },
};

const MATCHES = [
  // --- LIVE ---
  {
    id: 1, league: 'superlig', status: 'live', minute: 67,
    home: 'galatasaray', away: 'fenerbahce',
    score: { home: 2, away: 1 },
    stats: { possession: [58, 42], shots: [12, 8], shotsOnTarget: [5, 3], corners: [6, 3], fouls: [10, 14], yellowCards: [2, 3], redCards: [0, 0] },
    events: [
      { minute: 14, type: 'goal', team: 'galatasaray', player: 'Osimhen', assist: 'Mertens' },
      { minute: 33, type: 'yellowCard', team: 'fenerbahce', player: 'İrfan Can' },
      { minute: 51, type: 'goal', team: 'fenerbahce', player: 'Dzeko' },
      { minute: 62, type: 'goal', team: 'galatasaray', player: 'Mertens', assist: 'Zaha' },
    ]
  },
  {
    id: 2, league: 'premier', status: 'live', minute: 38,
    home: 'arsenal', away: 'mancity',
    score: { home: 1, away: 1 },
    stats: { possession: [45, 55], shots: [9, 14], shotsOnTarget: [4, 6], corners: [4, 7], fouls: [12, 9], yellowCards: [1, 2], redCards: [0, 0] },
    events: [
      { minute: 22, type: 'goal', team: 'arsenal', player: 'Saka', assist: 'Ødegaard' },
      { minute: 31, type: 'goal', team: 'mancity', player: 'Haaland' },
    ]
  },
  {
    id: 3, league: 'ucl', status: 'live', minute: 82,
    home: 'realmadrid', away: 'psg',
    score: { home: 3, away: 1 },
    stats: { possession: [52, 48], shots: [18, 10], shotsOnTarget: [8, 4], corners: [9, 4], fouls: [8, 11], yellowCards: [2, 3], redCards: [0, 1] },
    events: [
      { minute: 9, type: 'goal', team: 'realmadrid', player: 'Vinicius Jr', assist: 'Bellingham' },
      { minute: 27, type: 'goal', team: 'psg', player: 'Mbappé' },
      { minute: 55, type: 'goal', team: 'realmadrid', player: 'Bellingham' },
      { minute: 71, type: 'redCard', team: 'psg', player: 'Marquinhos' },
      { minute: 78, type: 'goal', team: 'realmadrid', player: 'Rodrygo', assist: 'Vinicius Jr' },
    ]
  },
  // --- FINISHED ---
  {
    id: 4, league: 'superlig', status: 'finished',
    home: 'besiktas', away: 'trabzonspor',
    score: { home: 1, away: 1 },
    stats: { possession: [50, 50], shots: [10, 9], shotsOnTarget: [3, 4], corners: [5, 5], fouls: [13, 12], yellowCards: [2, 2], redCards: [0, 0] },
    events: [
      { minute: 35, type: 'goal', team: 'besiktas', player: 'Semih Kılıçsoy' },
      { minute: 78, type: 'goal', team: 'trabzonspor', player: 'Trezeguet', assist: 'Bakasetas' },
    ]
  },
  {
    id: 5, league: 'premier', status: 'finished',
    home: 'liverpool', away: 'chelsea',
    score: { home: 2, away: 0 },
    stats: { possession: [62, 38], shots: [16, 7], shotsOnTarget: [7, 2], corners: [8, 2], fouls: [9, 15], yellowCards: [1, 4], redCards: [0, 0] },
    events: [
      { minute: 28, type: 'goal', team: 'liverpool', player: 'Salah', assist: 'Díaz' },
      { minute: 66, type: 'yellowCard', team: 'chelsea', player: 'Enzo Fernández' },
      { minute: 74, type: 'goal', team: 'liverpool', player: 'Núñez' },
    ]
  },
  {
    id: 6, league: 'laliga', status: 'finished',
    home: 'barcelona', away: 'atletico',
    score: { home: 2, away: 2 },
    stats: { possession: [60, 40], shots: [20, 11], shotsOnTarget: [7, 5], corners: [11, 4], fouls: [10, 18], yellowCards: [3, 5], redCards: [0, 0] },
    events: [
      { minute: 12, type: 'goal', team: 'barcelona', player: 'Lewandowski' },
      { minute: 40, type: 'goal', team: 'atletico', player: 'Griezmann' },
      { minute: 57, type: 'goal', team: 'barcelona', player: 'Pedri', assist: 'Yamal' },
      { minute: 88, type: 'goal', team: 'atletico', player: 'Morata', assist: 'Koke' },
    ]
  },
  {
    id: 7, league: 'bundesliga', status: 'finished',
    home: 'bayernmunich', away: 'leverkusen',
    score: { home: 3, away: 2 },
    stats: { possession: [55, 45], shots: [21, 15], shotsOnTarget: [9, 7], corners: [10, 6], fouls: [11, 13], yellowCards: [2, 3], redCards: [0, 0] },
    events: [
      { minute: 8,  type: 'goal', team: 'bayernmunich', player: 'Kane', assist: 'Müller' },
      { minute: 23, type: 'goal', team: 'leverkusen', player: 'Wirtz', assist: 'Grimaldo' },
      { minute: 44, type: 'goal', team: 'bayernmunich', player: 'Müller' },
      { minute: 60, type: 'goal', team: 'leverkusen', player: 'Boniface' },
      { minute: 87, type: 'goal', team: 'bayernmunich', player: 'Kane' },
    ]
  },
  {
    id: 8, league: 'seriea', status: 'finished',
    home: 'intermilan', away: 'juventus',
    score: { home: 1, away: 0 },
    stats: { possession: [53, 47], shots: [13, 9], shotsOnTarget: [5, 3], corners: [7, 4], fouls: [14, 11], yellowCards: [3, 2], redCards: [0, 0] },
    events: [
      { minute: 55, type: 'goal', team: 'intermilan', player: 'Lautaro Martínez', assist: 'Çalhanoğlu' },
      { minute: 72, type: 'yellowCard', team: 'juventus', player: 'Bremer' },
    ]
  },
  {
    id: 9, league: 'ucl', status: 'finished',
    home: 'dortmund', away: 'benfica',
    score: { home: 2, away: 1 },
    stats: { possession: [51, 49], shots: [14, 12], shotsOnTarget: [6, 5], corners: [8, 5], fouls: [10, 12], yellowCards: [2, 3], redCards: [0, 0] },
    events: [
      { minute: 19, type: 'goal', team: 'dortmund', player: 'Adeyemi', assist: 'Brandt' },
      { minute: 48, type: 'goal', team: 'benfica', player: 'Di María' },
      { minute: 77, type: 'goal', team: 'dortmund', player: 'Füllkrug' },
    ]
  },
  // --- UPCOMING ---
  {
    id: 10, league: 'superlig', status: 'upcoming', kickoff: '20:00',
    home: 'galatasaray', away: 'besiktas',
    score: { home: null, away: null },
    stats: {}, events: []
  },
  {
    id: 11, league: 'premier', status: 'upcoming', kickoff: '18:30',
    home: 'mancity', away: 'chelsea',
    score: { home: null, away: null },
    stats: {}, events: []
  },
  {
    id: 12, league: 'laliga', status: 'upcoming', kickoff: '21:00',
    home: 'realmadrid', away: 'sevilla',
    score: { home: null, away: null },
    stats: {}, events: []
  },
  {
    id: 13, league: 'bundesliga', status: 'upcoming', kickoff: '15:30',
    home: 'stuttgard', away: 'bayernmunich',
    score: { home: null, away: null },
    stats: {}, events: []
  },
  {
    id: 14, league: 'seriea', status: 'upcoming', kickoff: '19:45',
    home: 'acmilan', away: 'napoli',
    score: { home: null, away: null },
    stats: {}, events: []
  },
  {
    id: 15, league: 'ucl', status: 'upcoming', kickoff: '21:00',
    home: 'intermilan', away: 'arsenal',
    score: { home: null, away: null },
    stats: {}, events: []
  },
];

const STANDINGS = {
  superlig: [
    { pos: 1, team: 'galatasaray', played: 28, won: 20, drawn: 5, lost: 3, gf: 68, ga: 28, gd: 40, pts: 65, form: ['W','W','D','W','W'] },
    { pos: 2, team: 'fenerbahce',  played: 28, won: 18, drawn: 6, lost: 4, gf: 60, ga: 32, gd: 28, pts: 60, form: ['W','L','W','W','D'] },
    { pos: 3, team: 'besiktas',    played: 28, won: 14, drawn: 8, lost: 6, gf: 48, ga: 40, gd: 8,  pts: 50, form: ['D','W','D','L','W'] },
    { pos: 4, team: 'trabzonspor', played: 28, won: 12, drawn: 9, lost: 7, gf: 42, ga: 38, gd: 4,  pts: 45, form: ['L','D','W','D','D'] },
  ],
  premier: [
    { pos: 1, team: 'mancity',   played: 30, won: 22, drawn: 4, lost: 4, gf: 72, ga: 30, gd: 42, pts: 70, form: ['W','W','W','D','W'] },
    { pos: 2, team: 'arsenal',   played: 30, won: 21, drawn: 4, lost: 5, gf: 64, ga: 28, gd: 36, pts: 67, form: ['W','D','W','W','L'] },
    { pos: 3, team: 'liverpool', played: 30, won: 19, drawn: 6, lost: 5, gf: 70, ga: 38, gd: 32, pts: 63, form: ['W','W','D','W','W'] },
    { pos: 4, team: 'chelsea',   played: 30, won: 16, drawn: 5, lost: 9, gf: 55, ga: 42, gd: 13, pts: 53, form: ['L','W','L','D','W'] },
  ],
  laliga: [
    { pos: 1, team: 'realmadrid', played: 29, won: 22, drawn: 4, lost: 3, gf: 78, ga: 25, gd: 53, pts: 70, form: ['W','W','W','W','W'] },
    { pos: 2, team: 'barcelona',  played: 29, won: 20, drawn: 5, lost: 4, gf: 72, ga: 32, gd: 40, pts: 65, form: ['D','W','W','D','W'] },
    { pos: 3, team: 'atletico',   played: 29, won: 17, drawn: 7, lost: 5, gf: 55, ga: 33, gd: 22, pts: 58, form: ['W','D','L','W','D'] },
    { pos: 4, team: 'sevilla',    played: 29, won: 12, drawn: 8, lost: 9, gf: 42, ga: 45, gd: -3, pts: 44, form: ['L','W','D','L','W'] },
  ],
  ucl: [
    { pos: 1, team: 'realmadrid', played: 8, won: 6, drawn: 1, lost: 1, gf: 22, ga: 8,  gd: 14, pts: 19, form: ['W','W','W','D','W'] },
    { pos: 2, team: 'mancity',    played: 8, won: 5, drawn: 2, lost: 1, gf: 18, ga: 10, gd: 8,  pts: 17, form: ['W','D','W','W','D'] },
    { pos: 3, team: 'arsenal',    played: 8, won: 5, drawn: 1, lost: 2, gf: 15, ga: 11, gd: 4,  pts: 16, form: ['W','W','L','W','D'] },
    { pos: 4, team: 'dortmund',   played: 8, won: 4, drawn: 2, lost: 2, gf: 14, ga: 12, gd: 2,  pts: 14, form: ['D','W','L','W','W'] },
  ],
  bundesliga: [
    { pos: 1, team: 'bayernmunich', played: 27, won: 19, drawn: 4, lost: 4, gf: 72, ga: 30, gd: 42, pts: 61, form: ['W','W','L','W','W'] },
    { pos: 2, team: 'leverkusen',   played: 27, won: 18, drawn: 5, lost: 4, gf: 65, ga: 28, gd: 37, pts: 59, form: ['W','W','W','D','W'] },
    { pos: 3, team: 'stuttgard',    played: 27, won: 15, drawn: 4, lost: 8, gf: 52, ga: 40, gd: 12, pts: 49, form: ['L','W','W','D','L'] },
    { pos: 4, team: 'dortmund2',    played: 27, won: 13, drawn: 6, lost: 8, gf: 48, ga: 42, gd: 6,  pts: 45, form: ['D','L','W','W','D'] },
  ],
  seriea: [
    { pos: 1, team: 'intermilan', played: 29, won: 21, drawn: 5, lost: 3, gf: 68, ga: 28, gd: 40, pts: 68, form: ['W','W','W','D','W'] },
    { pos: 2, team: 'juventus',   played: 29, won: 18, drawn: 7, lost: 4, gf: 56, ga: 32, gd: 24, pts: 61, form: ['W','D','W','L','W'] },
    { pos: 3, team: 'acmilan',    played: 29, won: 16, drawn: 6, lost: 7, gf: 54, ga: 40, gd: 14, pts: 54, form: ['D','W','L','W','W'] },
    { pos: 4, team: 'napoli',     played: 29, won: 14, drawn: 8, lost: 7, gf: 50, ga: 42, gd: 8,  pts: 50, form: ['W','W','D','L','D'] },
  ],
};

const TOP_SCORERS = {
  superlig: [
    { rank: 1, player: 'Victor Osimhen',   team: 'galatasaray',  goals: 22, assists: 8, apps: 26 },
    { rank: 2, player: 'Dušan Tadić',      team: 'fenerbahce',   goals: 16, assists: 12, apps: 28 },
    { rank: 3, player: 'Semih Kılıçsoy',   team: 'besiktas',     goals: 14, assists: 5, apps: 25 },
    { rank: 4, player: 'Bakasetas',        team: 'trabzonspor',  goals: 11, assists: 7, apps: 27 },
  ],
  premier: [
    { rank: 1, player: 'Erling Haaland',   team: 'mancity',   goals: 28, assists: 6, apps: 30 },
    { rank: 2, player: 'Mohamed Salah',    team: 'liverpool',  goals: 22, assists: 14, apps: 29 },
    { rank: 3, player: 'Bukayo Saka',      team: 'arsenal',   goals: 18, assists: 11, apps: 30 },
    { rank: 4, player: 'Cole Palmer',      team: 'chelsea',   goals: 16, assists: 10, apps: 28 },
  ],
  laliga: [
    { rank: 1, player: 'Kylian Mbappé',    team: 'realmadrid', goals: 26, assists: 9, apps: 28 },
    { rank: 2, player: 'Robert Lewandowski',team: 'barcelona', goals: 24, assists: 6, apps: 27 },
    { rank: 3, player: 'Antoine Griezmann',team: 'atletico',  goals: 18, assists: 10, apps: 29 },
    { rank: 4, player: 'Álvaro Morata',    team: 'atletico',  goals: 14, assists: 8, apps: 29 },
  ],
  ucl: [
    { rank: 1, player: 'Kylian Mbappé',    team: 'realmadrid', goals: 8,  assists: 3, apps: 8 },
    { rank: 2, player: 'Erling Haaland',   team: 'mancity',    goals: 7,  assists: 2, apps: 8 },
    { rank: 3, player: 'Jude Bellingham',  team: 'realmadrid', goals: 6,  assists: 5, apps: 8 },
    { rank: 4, player: 'Bukayo Saka',      team: 'arsenal',    goals: 5,  assists: 4, apps: 8 },
  ],
  bundesliga: [
    { rank: 1, player: 'Harry Kane',       team: 'bayernmunich', goals: 30, assists: 10, apps: 27 },
    { rank: 2, player: 'Florian Wirtz',    team: 'leverkusen',   goals: 18, assists: 16, apps: 27 },
    { rank: 3, player: 'Victor Boniface',  team: 'leverkusen',   goals: 16, assists: 7, apps: 25 },
    { rank: 4, player: 'Karim Adeyemi',    team: 'dortmund',     goals: 13, assists: 5, apps: 26 },
  ],
  seriea: [
    { rank: 1, player: 'Lautaro Martínez', team: 'intermilan', goals: 24, assists: 8, apps: 28 },
    { rank: 2, player: 'Dusan Vlahovic',   team: 'juventus',   goals: 18, assists: 4, apps: 27 },
    { rank: 3, player: 'Olivier Giroud',   team: 'acmilan',    goals: 14, assists: 6, apps: 26 },
    { rank: 4, player: 'Victor Osimhen',   team: 'napoli',     goals: 12, assists: 5, apps: 20 },
  ],
};
