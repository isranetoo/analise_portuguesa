'use strict';

// Dados gerados por coleta_detalhada.py em dados.js (ou embutidos pelo streamlit_app.py).
const DATA = window.__DASHBOARD_DATA__;
if (!DATA) {
  document.querySelector('main').innerHTML = '<p class="empty-data">Dados não encontrados. Execute <code>python coleta_detalhada.py</code> para gerar o arquivo dados.js.</p>';
  throw new Error('dados.js ausente');
}

const CLUB = DATA.config.clube;
const COMPETITION = DATA.config.competicao;
const GROUP_QUALIFIERS = COMPETITION.classificados_por_grupo || 4;
const FEMININE = (CLUB.artigo || 'o') === 'a';
const gendered = (masculine, feminine) => FEMININE ? feminine : masculine;
const clubRef = (capitalize = false) => {
  const article = CLUB.artigo || 'o';
  return `${capitalize ? article.toUpperCase() : article} ${CLUB.nome}`;
};

// ---------- Utilidades ----------
const $ = (id) => document.getElementById(id);
const pct = (n) => `${n.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`;
const decimal = (n) => n.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const formatDate = (date) => {
  const parsed = date ? new Date(`${date}T12:00:00`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {day: '2-digit', month: 'short'}).format(parsed).replace('.', '');
};
const plural = (value, singular, pluralForm) => `${value} ${value === 1 ? singular : pluralForm}`;
const signedNumber = (value) => (value > 0 ? '+' : '') + value;
const score = (a, b) => `${a} <i>×</i> ${b}`;
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const listJoin = (items) => items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items.join('');
const sum = (list, fn) => list.reduce((total, item) => total + fn(item), 0);
const finite = (value) => Number.isFinite(value) ? value : 0;
const resultOf = (gf, ga) => gf > ga ? 'V' : gf < ga ? 'D' : 'E';
const pointsOf = (result) => result === 'V' ? 3 : result === 'E' ? 1 : 0;
const toNumber = (value) => value === '' || value === undefined || value === null ? NaN : Number(value);

function groupBy(list, key) {
  const map = new Map();
  list.forEach(item => {
    if (!map.has(item[key])) map.set(item[key], []);
    map.get(item[key]).push(item);
  });
  return map;
}

// ---------- Dados ----------
function buildMatches(rows) {
  return rows
    .filter(row => row.status === 'finished' && ['V', 'E', 'D'].includes(row.resultado))
    .map((row, index) => {
      const htGf = toNumber(row.gols_1t_clube);
      const htGa = toNumber(row.gols_1t_adversario);
      return {
        id: row.id_jogo,
        round: index + 1,
        date: row.data,
        time: row.hora,
        opponent: row.adversario,
        venue: row.mando,
        gf: row.gols_clube,
        ga: row.gols_adversario,
        htGf, htGa,
        shGf: row.gols_clube - htGf,
        shGa: row.gols_adversario - htGa,
        result: row.resultado,
        points: pointsOf(row.resultado),
        stage: row.etapa,
        phase: row.fase,
        leg: row.rodada,
        stadium: row.estadio,
        city: row.cidade,
        referee: row.arbitro,
        yellows: toNumber(row.amarelos_clube),
        reds: toNumber(row.vermelhos_clube),
        oppYellows: toNumber(row.amarelos_adversario),
        oppReds: toNumber(row.vermelhos_adversario),
        penGf: toNumber(row.penaltis_clube),
        penGa: toNumber(row.penaltis_adversario),
        uf: row.uf,
        sumula: row.sumula_url,
        boletim: row.boletim_url,
        attendance: toNumber(row.publico),
        grossIncome: toNumber(row.renda_bruta),
        netIncome: toNumber(row.renda_liquida),
        lat: toNumber(row.latitude),
        lon: toNumber(row.longitude)
      };
    });
}

function buildGroup(rows) {
  return (rows || []).map(row => ({
    pos: row.posicao, team: row.time, points: row.pontos, games: row.jogos,
    wins: row.vitorias, draws: row.empates, losses: row.derrotas,
    gf: row.gols_pro, ga: row.gols_contra, own: row.clube === 1
  }));
}

const matches = buildMatches(DATA.principal.jogos);
// No início de uma temporada a coleta já traz os jogos agendados, mas nenhum encerrado.
const SEASON_STARTED = matches.length > 0;
const groupName = DATA.principal.grupo_nome;
const groupTable = buildGroup(DATA.principal.grupo);
const goalsByMatch = groupBy(DATA.principal.gols || [], 'id_jogo');
const playersByMatch = groupBy(DATA.principal.atletas || [], 'id_jogo');

// Cadastro dos atletas: nome, foto e camisa mais usada.
const athleteInfo = new Map();
(DATA.principal.atletas || []).forEach(row => {
  const info = athleteInfo.get(row.atleta_id) || {id: row.atleta_id, name: row.atleta, foto: '', goalkeeper: false, shirts: new Map()};
  if (row.foto) info.foto = row.foto;
  info.goalkeeper = info.goalkeeper || row.goleiro === 1;
  if (row.camisa) info.shirts.set(row.camisa, (info.shirts.get(row.camisa) || 0) + 1);
  athleteInfo.set(row.atleta_id, info);
});
const shirtOf = (info) => [...info.shirts].sort((a, b) => b[1] - a[1])[0]?.[0];

function avatar(id, name, size = 'sm') {
  const initials = (name || '?').split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
  const foto = athleteInfo.get(id)?.foto;
  const img = foto ? `<img src="${escapeHtml(foto)}" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="avatar ${size}" data-initials="${escapeHtml(initials)}" aria-hidden="true">${img}</span>`;
}

function athleteLink(id, name) {
  if (!athleteInfo.has(id)) return escapeHtml(name);
  return `<a class="athlete-link" href="#atleta/${encodeURIComponent(id)}" data-page="atleta" data-param="${escapeHtml(id)}">${escapeHtml(name)}</a>`;
}

const PHASE_SHORT = {'1ª fase': '1ª fase', '2ª fase': '2ª fase', '3ª fase': '3ª fase', 'Oitavas de final': 'Oitavas', 'Quartas de final': 'Quartas', 'Semifinal': 'Semifinal', 'Final': 'Final', 'Playoff de acesso': 'Playoff'};
const PHASE_WITH_ARTICLE = {'1ª fase': 'na 1ª fase', '2ª fase': 'na 2ª fase', '3ª fase': 'na 3ª fase', 'Oitavas de final': 'nas oitavas de final', 'Quartas de final': 'nas quartas de final', 'Semifinal': 'na semifinal', 'Final': 'na final', 'Playoff de acesso': 'no playoff de acesso'};
const PHASE_DESTINATION = {'2ª fase': 'à 2ª fase', '3ª fase': 'à 3ª fase', 'Oitavas de final': 'às oitavas', 'Quartas de final': 'às quartas', 'Semifinal': 'à semifinal', 'Final': 'à final', 'Playoff de acesso': 'ao playoff'};

let venueFilter = 'Todos';
let leagueExpanded = false;
let stageFilter = 'Todas';
let squadExpanded = false;
let comparisonCard = null;
const expandedMatches = new Set();

function filteredMatches() {
  return matches.filter(m => (venueFilter === 'Todos' || m.venue === venueFilter) && (stageFilter === 'Todas' || m.stage === stageFilter));
}

function summarize(list) {
  const wins = list.filter(m => m.result === 'V').length;
  const draws = list.filter(m => m.result === 'E').length;
  const losses = list.filter(m => m.result === 'D').length;
  const points = sum(list, m => m.points);
  const gf = sum(list, m => m.gf);
  const ga = sum(list, m => m.ga);
  const max = list.length * 3;
  return {games: list.length, wins, draws, losses, points, gf, ga, max, efficiency: max ? points / max * 100 : 0, ppg: list.length ? points / list.length : 0};
}

// Agrupa os jogos de mata-mata em confrontos de ida e volta.
function getTies(list) {
  const ties = [];
  list.filter(m => m.stage === 'Mata-mata').forEach(match => {
    let tie = ties.find(t => t.phase === match.phase);
    if (!tie) ties.push(tie = {phase: match.phase, opponent: match.opponent, legs: []});
    tie.legs.push(match);
  });
  return ties.map(tie => {
    const gf = sum(tie.legs, m => m.gf);
    const ga = sum(tie.legs, m => m.ga);
    const lastLeg = tie.legs.at(-1);
    const hasPenalties = Number.isFinite(lastLeg.penGf) && Number.isFinite(lastLeg.penGa);
    let status = 'pending';
    if (tie.legs.length >= 2) {
      if (gf !== ga) status = gf > ga ? 'advanced' : 'eliminated';
      else if (hasPenalties) status = lastLeg.penGf > lastLeg.penGa ? 'advanced' : 'eliminated';
    }
    return {...tie, gf, ga, status, hasPenalties, penGf: lastLeg.penGf, penGa: lastLeg.penGa};
  });
}

// Gols-chave: o que garantiu cada vitória e o que garantiu cada vaga no mata-mata.
function computeKeyGoals() {
  const winGoals = new Set();
  const qualifyingGoals = new Set();
  matches.forEach(m => {
    if (m.result !== 'V') return;
    const goal = (goalsByMatch.get(m.id) || []).filter(g => g.equipe === 'clube')[m.ga];
    if (goal) winGoals.add(goal);
  });
  getTies(matches).filter(tie => tie.status === 'advanced' && tie.gf !== tie.ga).forEach(tie => {
    let diff = 0, candidate = null;
    tie.legs.flatMap(leg => goalsByMatch.get(leg.id) || []).forEach(goal => {
      const before = diff;
      diff += goal.equipe === 'clube' ? 1 : -1;
      if (goal.equipe === 'clube' && before <= 0 && diff > 0) candidate = goal;
      if (diff <= 0) candidate = null;
    });
    if (candidate) qualifyingGoals.add(candidate);
  });
  return {winGoals, qualifyingGoals};
}

// The group phase is over once the club played every group game (home and away) or a knockout match exists.
function isGroupPhaseOver(list, table) {
  const own = table.find(team => team.own);
  if (list.some(m => m.stage === 'Mata-mata')) return true;
  return Boolean(own && own.games >= (table.length - 1) * 2);
}

function getOutcome(list, table) {
  const ties = getTies(list);
  const own = table.find(team => team.own);
  if (!ties.length) {
    if (own && own.games && isGroupPhaseOver(list, table) && own.pos > GROUP_QUALIFIERS) return {label: `${gendered('Eliminado', 'Eliminada')} na 1ª fase`, finished: true};
    return {label: 'Em andamento', finished: false};
  }
  const last = ties.at(-1);
  if (last.status === 'eliminated') {
    const label = last.phase === 'Final' ? gendered('Vice-campeão', 'Vice-campeã') : `${gendered('Eliminado', 'Eliminada')} ${PHASE_WITH_ARTICLE[last.phase] || 'no mata-mata'}`;
    return {label, finished: true, phase: last.phase, penalties: last.hasPenalties};
  }
  if (last.status === 'advanced' && last.phase === 'Final') return {label: gendered('Campeão', 'Campeã'), finished: true, phase: last.phase};
  return {label: 'Em andamento', finished: false};
}

const KEY_GOALS = computeKeyGoals();

// ---------- Identidade visual ----------
function applyBranding() {
  const rootStyle = document.documentElement.style;
  if (CLUB.cor_primaria) rootStyle.setProperty('--primary', CLUB.cor_primaria);
  if (CLUB.cor_secundaria) rootStyle.setProperty('--secondary', CLUB.cor_secundaria);
  document.title = `${CLUB.nome} | Painel de desempenho`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CLUB.cor_secundaria || CLUB.cor_primaria);
  $('brandName').textContent = CLUB.nome.toUpperCase();
  $('brandYear').textContent = COMPETITION.ano;
  const logo = $('brandLogo');
  if (CLUB.escudo && !logo.getAttribute('src').startsWith('data:')) logo.setAttribute('src', CLUB.escudo);
  $('favicon')?.setAttribute('href', logo.getAttribute('src'));
  logo.alt = `Escudo ${gendered('do', 'da')} ${CLUB.nome}`;
  $('eyebrow').textContent = `BRASILEIRÃO · ${COMPETITION.nome.toUpperCase()} · ${COMPETITION.ano}`;
  $('subtitle').textContent = `Retrospectiva da campanha ${gendered('do', 'da')} ${CLUB.nome} no campeonato.`;
  $('legendClub').textContent = CLUB.nome;
  $('footerLabel').textContent = `Painel ${CLUB.nome} · ${COMPETITION.nome} ${COMPETITION.ano}`;
}

function setupThemeToggle() {
  const button = $('themeToggle');
  const root = document.documentElement;
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const update = () => {
    const dark = current() === 'dark';
    button.textContent = dark ? '☀' : '☾';
    button.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema escuro');
  };
  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('dashboard-theme', next); } catch (_) { /* armazenamento indisponível */ }
    update();
  });
  update();
  // Sem tema salvo, acompanha a preferência do sistema em tempo real.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    let saved = null;
    try { saved = localStorage.getItem('dashboard-theme'); } catch (_) { /* armazenamento indisponível */ }
    if (saved) return;
    root.dataset.theme = event.matches ? 'dark' : 'light';
    update();
  });
}

// ---------- Cabeçalho e indicadores ----------
function renderHeader() {
  $('headerStartDate').textContent = formatDate(matches[0].date);
  $('headerEndDate').textContent = formatDate(matches.at(-1).date);
  $('headerGames').textContent = matches.length;
  $('headerOutcome').textContent = getOutcome(matches, groupTable).label;
}

function describeFilter(count) {
  const parts = [];
  if (venueFilter !== 'Todos') parts.push(venueFilter === 'Casa' ? 'como mandante' : 'como visitante');
  if (stageFilter !== 'Todas') parts.push(stageFilter === 'Grupos' ? 'na fase de grupos' : 'no mata-mata');
  if (!parts.length) return 'Visão geral da campanha';
  return `${plural(count, 'partida', 'partidas')} ${parts.join(' ')}`;
}

function renderSummary(list) {
  const s = summarize(list);
  $('kpiEfficiency').textContent = pct(s.efficiency);
  $('efficiencyMeter').style.width = `${s.efficiency}%`;
  $('efficiencyDetail').textContent = `${s.points} de ${s.max} pontos possíveis`;
  $('kpiWins').textContent = s.wins;
  $('kpiDraws').textContent = s.draws;
  $('kpiLosses').textContent = s.losses;
  $('kpiPpg').textContent = decimal(s.ppg);
  $('ppgMeter').style.width = `${Math.min(s.ppg / 3 * 100, 100)}%`;
  $('kpiGoalDiff').textContent = signedNumber(s.gf - s.ga);
  $('goalsFor').textContent = s.gf;
  $('goalsAgainst').textContent = s.ga;
  $('winsCount').textContent = s.wins;
  $('drawsCount').textContent = s.draws;
  $('lossesCount').textContent = s.losses;
  $('donutEfficiency').textContent = pct(s.efficiency);
  $('winsPercent').textContent = pct(s.games ? s.wins / s.games * 100 : 0);
  $('drawsPercent').textContent = pct(s.games ? s.draws / s.games * 100 : 0);
  $('lossesPercent').textContent = pct(s.games ? s.losses / s.games * 100 : 0);
  $('winRate').textContent = pct(s.games ? s.wins / s.games * 100 : 0);
  $('nonLossRate').textContent = pct(s.games ? (s.wins + s.draws) / s.games * 100 : 0);
  const winDeg = s.games ? s.wins / s.games * 360 : 0;
  const drawDeg = s.games ? s.draws / s.games * 360 : 0;
  $('resultDonut').style.background = `conic-gradient(var(--win) 0 ${winDeg}deg, var(--draw) ${winDeg}deg ${winDeg + drawDeg}deg, var(--loss) ${winDeg + drawDeg}deg 360deg)`;
  $('resultDonut').setAttribute('aria-label', `Resultados: ${plural(s.wins, 'vitória', 'vitórias')}, ${plural(s.draws, 'empate', 'empates')} e ${plural(s.losses, 'derrota', 'derrotas')}; aproveitamento de ${pct(s.efficiency)}`);
  $('filterContext').textContent = describeFilter(s.games);
}

function renderForm(list) {
  const recent = list.slice(-5);
  $('recentForm').innerHTML = recent.map(m => `<i class="${m.result}" title="${escapeHtml(m.opponent)}: ${m.gf} x ${m.ga}">${m.result}</i>`).join('');
  $('recentPoints').textContent = `${sum(recent, m => m.points)}/${recent.length * 3} pts`;
}

// ---------- Gráfico de evolução ----------
function renderChart() {
  const w = 700, h = 285, pad = {l: 36, r: 16, t: 26, b: 32};
  let acc = 0;
  const points = matches.map(m => ({x: m.round, y: (acc += m.points), match: m}));
  const pace = matches.length * 1.5;
  const maxY = Math.max(10, Math.ceil(Math.max(points.at(-1).y, pace) / 10) * 10);
  const xAt = (round) => pad.l + (round - 1) / Math.max(matches.length - 1, 1) * (w - pad.l - pad.r);
  const yAt = (value) => h - pad.b - value / maxY * (h - pad.t - pad.b);
  const actualPath = points.map((p, i) => `${i ? 'L' : 'M'} ${xAt(p.x).toFixed(1)} ${yAt(p.y).toFixed(1)}`).join(' ');
  const grid = [0, .25, .5, .75, 1].map(f => {
    const y = yAt(maxY * f);
    return `<line class="chart-grid" x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}"/><text class="chart-label" x="0" y="${y + 4}">${Math.round(maxY * f)}</text>`;
  }).join('');
  const area = `${actualPath} L ${xAt(points.at(-1).x)} ${h - pad.b} L ${xAt(points[0].x)} ${h - pad.b} Z`;
  const step = matches.length <= 20 ? 1 : 2;
  const ticks = matches.filter(m => (m.round - 1) % step === 0 || m.round === matches.length)
    .map(m => `<text class="chart-label" x="${xAt(m.round)}" y="${h - 7}" text-anchor="middle">J${m.round}</text>`).join('');
  const firstKnockout = matches.find(m => m.stage === 'Mata-mata');
  let divider = '';
  if (firstKnockout && firstKnockout.round > 1) {
    const x = (xAt(firstKnockout.round - 1) + xAt(firstKnockout.round)) / 2;
    divider = `<line class="chart-divider" x1="${x}" y1="${pad.t - 14}" x2="${x}" y2="${h - pad.b}"/>
      <text class="chart-stage-label" x="${x - 8}" y="${pad.t - 16}" text-anchor="end">FASE DE GRUPOS</text>
      <text class="chart-stage-label" x="${x + 8}" y="${pad.t - 16}">MATA-MATA</text>`;
  }
  const last = points.at(-1);
  $('pointsChart').innerHTML = `<svg viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop class="chart-area-top" offset="0"/><stop class="chart-area-bottom" offset="1"/></linearGradient></defs>
    ${grid}${divider}<path class="chart-pace" d="M ${xAt(1)} ${yAt(1.5)} L ${xAt(matches.length)} ${yAt(pace)}"/>
    <path d="${area}" fill="url(#areaFill)"/><path class="chart-line" d="${actualPath}"/>
    ${points.map((p, i) => `<circle class="chart-dot ${i === points.length - 1 ? 'last' : ''}" data-index="${i}" cx="${xAt(p.x)}" cy="${yAt(p.y)}" r="${i === points.length - 1 ? 5 : 2.6}"/>`).join('')}
    ${ticks}
    <g class="chart-badge" transform="translate(${xAt(last.x) - 45},${yAt(last.y) + 9})"><rect width="51" height="26" rx="8"/><text x="25.5" y="17" text-anchor="middle">${last.y} pts</text></g>
    <g class="chart-pace-badge" transform="translate(${xAt(matches.length) - 111},${yAt(pace) - 33})"><rect width="59" height="22" rx="7"/><text x="29.5" y="15" text-anchor="middle">${pace.toLocaleString('pt-BR')} pts</text></g>
    ${points.map((p, i) => `<circle class="chart-hit" data-index="${i}" cx="${xAt(p.x)}" cy="${yAt(p.y)}" r="12" tabindex="0" role="button" aria-label="Jogo ${p.x}: ${escapeHtml(p.match.opponent)}, ${p.match.gf} a ${p.match.ga}, ${p.y} pontos acumulados"/>`).join('')}
  </svg><div class="chart-tooltip" id="chartTooltip" hidden></div>`;

  const wrap = $('pointsChart');
  const tooltip = $('chartTooltip');
  const show = (circle) => {
    const index = Number(circle.dataset.index);
    const {match: m, y} = points[index];
    const penalties = Number.isFinite(m.penGf) ? ` · pênaltis ${m.penGf}–${m.penGa}` : '';
    tooltip.innerHTML = `<span>J${m.round} · ${escapeHtml(m.phase)} · ${escapeHtml(m.leg)}</span>
      <b>${escapeHtml(CLUB.nome)} ${m.gf} × ${m.ga} ${escapeHtml(m.opponent)}</b>
      <small>${m.venue === 'Casa' ? 'Em casa' : 'Fora'} · ${formatDate(m.date)}${penalties}</small>
      <small>${y} pts acumulados (+${m.points})</small>`;
    tooltip.hidden = false;
    const wrapRect = wrap.getBoundingClientRect();
    const rect = circle.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - wrapRect.left, half), wrapRect.width - half);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${rect.top + rect.height / 2 - wrapRect.top}px`;
    wrap.querySelectorAll('.chart-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.index === circle.dataset.index));
  };
  const hide = () => {
    tooltip.hidden = true;
    wrap.querySelectorAll('.chart-dot.active').forEach(dot => dot.classList.remove('active'));
  };
  // Touch: the browser fires pointerleave right after pointerup, so a tap toggles the tooltip instead.
  let lastTouchAt = 0;
  const recentTouch = () => Date.now() - lastTouchAt < 600;
  wrap.querySelectorAll('.chart-hit').forEach(circle => {
    let wasOpen = false;
    circle.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') show(circle); });
    circle.addEventListener('focus', () => { if (!recentTouch()) show(circle); });
    circle.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hide(); });
    circle.addEventListener('blur', () => { if (!recentTouch()) hide(); });
    circle.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      lastTouchAt = Date.now();
      wasOpen = !tooltip.hidden && circle.classList.contains('shown');
    });
    circle.addEventListener('pointerup', e => {
      if (e.pointerType !== 'touch') return;
      lastTouchAt = Date.now();
      wrap.querySelectorAll('.chart-hit.shown').forEach(c => c.classList.remove('shown'));
      if (wasOpen) hide();
      else { show(circle); circle.classList.add('shown'); }
    });
  });
  if (!wrap.dataset.touchOutside) {
    wrap.dataset.touchOutside = '1';
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || e.target.closest?.('.chart-hit')) return;
      const tip = $('chartTooltip');
      if (tip) tip.hidden = true;
      wrap.querySelectorAll('.chart-dot.active').forEach(dot => dot.classList.remove('active'));
      wrap.querySelectorAll('.chart-hit.shown').forEach(c => c.classList.remove('shown'));
    });
  }

  const full = summarize(matches);
  const delta = full.points - pace;
  $('chartCurrentPoints').textContent = `${full.points} pts`;
  $('chartPacePoints').textContent = `${pace.toLocaleString('pt-BR')} pts`;
  $('chartGap').textContent = `${delta > 0 ? '+' : ''}${delta.toLocaleString('pt-BR')} pts`;
  $('chartGapCard').classList.toggle('positive', delta >= 0);
  $('chartInsight').innerHTML = `Em ${plural(matches.length, 'jogo', 'jogos')}, ${clubRef()} ficou <b>${plural(Math.abs(delta), 'ponto', 'pontos')} ${delta >= 0 ? 'acima' : 'abaixo'}</b> do ritmo de 50% de aproveitamento. ` +
    'No mata-mata os pontos não valem classificação; aqui eles medem o rendimento em cada partida. Passe o mouse ou toque nos pontos para ver cada jogo.';
}

// ---------- Mando de campo ----------
function mostCommon(values) {
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function renderVenue() {
  const home = summarize(matches.filter(m => m.venue === 'Casa'));
  const away = summarize(matches.filter(m => m.venue === 'Fora'));
  const homeStadium = escapeHtml(mostCommon(matches.filter(m => m.venue === 'Casa').map(m => m.stadium)) || 'estádio');
  const card = (name, subtitle, icon, s, cls = '') => `<article class="venue-card ${cls}">
      <div class="venue-card-head"><div><i>${icon}</i><span><b>${name}</b><small>${subtitle}</small></span></div><strong>${pct(s.efficiency)}</strong></div>
      <div class="venue-progress"><i style="width:${s.efficiency}%"></i></div>
      <div class="venue-stats">
        <div><span>Pontos</span><b>${s.points}</b></div>
        <div><span>Por jogo</span><b>${decimal(s.ppg)}</b></div>
        <div><span>Saldo</span><b>${signedNumber(s.gf - s.ga)}</b></div>
      </div>
      <div class="venue-record"><span><b>${s.wins}</b> ${s.wins === 1 ? 'vitória' : 'vitórias'}</span><span><b>${s.draws}</b> ${s.draws === 1 ? 'empate' : 'empates'}</span><span><b>${s.losses}</b> ${s.losses === 1 ? 'derrota' : 'derrotas'}</span></div>
    </article>`;
  const totalPoints = home.points + away.points;
  const homeShare = totalPoints ? home.points / totalPoints * 100 : 0;
  $('venueComparison').innerHTML = `
    <div class="venue-cards">${card('Em casa', `No ${homeStadium}`, 'C', home)}${card('Como visitante', `Fora do ${homeStadium}`, 'F', away, 'away')}</div>
    <div class="venue-deep-dive">
      <div>
        <div class="venue-detail-head"><span>ORIGEM DOS ${totalPoints} PONTOS</span><b>${pct(homeShare)} em casa</b></div>
        <div class="split-points"><i style="width:${homeShare}%"></i><i style="width:${100 - homeShare}%"></i></div>
        <div class="split-labels"><span><b>${home.points}</b> casa</span><span><b>${away.points}</b> fora</span></div>
      </div>
      <div>
        <div class="venue-detail-head"><span>BALANÇO DE GOLS</span><b>${home.gf + away.gf} marcados</b></div>
        <div class="goal-balance-rows">
          <span><i class="home-dot"></i>Casa <b>${home.gf} pró · ${home.ga} contra</b></span>
          <span><i></i>Fora <b>${away.gf} pró · ${away.ga} contra</b></span>
        </div>
      </div>
    </div>`;
  const better = home.efficiency >= away.efficiency ? ['em casa', home, away] : ['fora de casa', away, home];
  const effDiff = Math.abs(better[1].efficiency - better[2].efficiency);
  if (effDiff === 0) {
    $('venueInsight').innerHTML = `<span>LEITURA DO MANDO</span><p>O aproveitamento é igual em casa e fora.</p>`;
  } else {
    $('venueInsight').innerHTML = `<span>LEITURA DO MANDO</span><p>${clubRef(true)} rende melhor <b>${better[0]}</b>: são <strong>${effDiff.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} p.p.</strong> de diferença.</p>`;
  }
}

// ---------- Trajetória ----------
function legDescription(match) {
  const kind = {V: 'vitória', E: 'empate', D: 'derrota'}[match.result];
  return `${kind} ${match.venue === 'Casa' ? 'em casa' : 'fora'} (${match.gf} × ${match.ga})`;
}

function winsPhrase(s) {
  if (!s.games) return 'nenhum jogo';
  return `${s.wins === 0 ? 'nenhuma vitória' : plural(s.wins, 'vitória', 'vitórias')} em ${plural(s.games, 'jogo', 'jogos')}`;
}

function renderJourney() {
  const own = groupTable.find(team => team.own);
  const groupMatches = matches.filter(m => m.stage === 'Grupos');
  const groupSummary = summarize(groupMatches);
  const ties = getTies(matches);
  const statusLabel = {advanced: gendered('CLASSIFICADO', 'CLASSIFICADA'), eliminated: gendered('ELIMINADO', 'ELIMINADA'), pending: 'EM DISPUTA'};
  const cards = [];

  if (groupMatches.length) {
    const groupStatus = !isGroupPhaseOver(matches, groupTable) ? 'pending' : (own && own.pos <= GROUP_QUALIFIERS ? 'advanced' : 'eliminated');
    const rows = groupTable.map(team => `<tr class="${team.own ? 'own' : ''} ${team.pos <= GROUP_QUALIFIERS ? 'qualified' : ''}">
      <td>${team.pos}</td><td>${escapeHtml(team.team)}</td><td>${team.points}</td><td>${team.games}</td><td>${signedNumber(team.gf - team.ga)}</td>
    </tr>`).join('');
    cards.push(`<article class="journey-card group-card">
      <div class="journey-card-head"><span>1ª fase · Grupo ${escapeHtml(groupName)}</span><i>${own ? `${own.pos}º` : '—'}</i></div>
      <div class="journey-value"><strong>${groupSummary.points} pts</strong><em class="tag ${groupStatus}">${statusLabel[groupStatus]}</em></div>
      <div class="journey-facts">
        <div><span>Campanha</span><b>${groupSummary.wins}V ${groupSummary.draws}E ${groupSummary.losses}D</b></div>
        <div><span>Aproveitamento</span><b>${pct(groupSummary.efficiency)}</b></div>
      </div>
      <table class="group-table">
        <thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>SG</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Os ${GROUP_QUALIFIERS} primeiros avançam ao mata-mata.</p>
    </article>`);
  }

  ties.forEach(tie => {
    const icon = {advanced: '✓', eliminated: '×', pending: '…'}[tie.status];
    const legs = tie.legs.map(leg => `<div class="tie-leg ${leg.result}">
      <span>${escapeHtml(leg.leg)} · ${leg.venue}</span><b>${score(leg.gf, leg.ga)}</b><small>${formatDate(leg.date)} · ${escapeHtml(leg.stadium)}</small>
    </div>`).join('');
    const penalties = tie.hasPenalties ? ` Nos pênaltis: ${tie.penGf} × ${tie.penGa}.` : '';
    const note = tie.legs.length >= 2
      ? `${legDescription(tie.legs[0]).replace(/^./, c => c.toUpperCase())} e ${legDescription(tie.legs[1])}.${penalties}`
      : 'Confronto em andamento.';
    cards.push(`<article class="journey-card tie-card ${tie.status}">
      <div class="journey-card-head"><span>${escapeHtml(tie.phase)}</span><i>${icon}</i></div>
      <div class="tie-opponent"><small>Adversário</small><b>${escapeHtml(tie.opponent)}</b></div>
      <div class="journey-value"><strong>${score(tie.gf, tie.ga)}</strong><em class="tag ${tie.status}">${statusLabel[tie.status]}</em></div>
      <div class="tie-legs">${legs}</div>
      <p>${note}</p>
    </article>`);
  });
  $('journeyGrid').innerHTML = cards.join('');

  const outcome = getOutcome(matches, groupTable);
  const passed = ties.filter(t => t.status === 'advanced').map(t => t.opponent);
  const lost = ties.find(t => t.status === 'eliminated');
  const groupText = own ? `${own.pos}${gendered('º colocado', 'ª colocada')} do Grupo ${groupName} com ${own.points} pontos` : 'Após a fase de grupos';
  let path = '';
  if (passed.length) path += `, ${clubRef()} passou por ${listJoin(passed)}`;
  if (lost) path += `${passed.length ? ' e' : `, ${clubRef()}`} caiu diante do ${lost.opponent} ${PHASE_WITH_ARTICLE[lost.phase] || 'no mata-mata'}`;
  $('journeySummary').textContent = `${groupText}${path}.`;
  const journeyTitle = outcome.phase && PHASE_DESTINATION[outcome.phase] ? `Do grupo ${PHASE_DESTINATION[outcome.phase]}` : 'Caminho na competição';
  $('journeyTitle').textContent = journeyTitle;
  $('homeJourneyTitle').textContent = journeyTitle;

  const knockout = matches.filter(m => m.stage === 'Mata-mata');
  $('journeyInsight').hidden = !knockout.length;
  if (knockout.length) {
    const home = summarize(knockout.filter(m => m.venue === 'Casa'));
    const away = summarize(knockout.filter(m => m.venue === 'Fora'));
    $('journeyInsight').innerHTML = `<span>LEITURA DO MATA-MATA</span><p>Em casa, foram <b>${winsPhrase(home)}</b>; fora, <b>${winsPhrase(away)}</b> ` +
      `(${plural(away.draws, 'empate', 'empates')} e ${plural(away.losses, 'derrota', 'derrotas')}). ` +
      `No mata-mata, ${clubRef()} marcou <strong>${home.gf + away.gf}</strong> e sofreu <strong>${home.ga + away.ga}</strong>.</p>`;
  }
}

// ---------- Destaques ----------
function renderHighlights() {
  const s = summarize(matches);
  const byMargin = [...matches].sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const bestWin = byMargin.find(m => m.result === 'V');
  const worstLoss = [...byMargin].reverse().find(m => m.result === 'D');
  const scoredIn = matches.filter(m => m.gf > 0).length;
  const cleanSheets = matches.filter(m => m.ga === 0).length;
  const yellows = sum(matches, m => finite(m.yellows));
  const reds = sum(matches, m => finite(m.reds));
  const matchNote = (m) => `J${m.round} · ${m.venue === 'Casa' ? 'em casa' : 'fora'} · ${formatDate(m.date)}`;
  const items = [
    bestWin && {label: 'Maior vitória', value: `${bestWin.gf} × ${bestWin.ga}`, detail: escapeHtml(bestWin.opponent), note: matchNote(bestWin), tone: 'win'},
    worstLoss && {label: 'Derrota mais pesada', value: `${worstLoss.gf} × ${worstLoss.ga}`, detail: escapeHtml(worstLoss.opponent), note: matchNote(worstLoss), tone: 'loss'},
    {label: 'Gols marcados por jogo', value: decimal(s.games ? s.gf / s.games : 0), detail: `${s.gf} gols`, note: `marcou em ${scoredIn} de ${s.games} jogos`},
    {label: 'Gols sofridos por jogo', value: decimal(s.games ? s.ga / s.games : 0), detail: `${s.ga} gols`, note: `${pct(s.games ? cleanSheets / s.games * 100 : 0)} dos jogos sem sofrer gol`},
    {label: 'Cartões', value: `${yellows}`, detail: `amarelos · ${plural(reds, 'vermelho', 'vermelhos')}`, note: `${decimal(s.games ? yellows / s.games : 0)} amarelos por jogo`}
  ].filter(Boolean);
  $('highlightsCount').textContent = plural(s.games, 'jogo', 'jogos');
  $('highlightsList').innerHTML = items.map(item => `<div class="highlight-row ${item.tone || ''}">
    <div><span>${item.label}</span><small>${item.note}</small></div>
    <div><b>${item.value}</b><small>${item.detail}</small></div>
  </div>`).join('');
}

// ---------- Consistência ----------
function longestSequence(predicate) {
  let longest = 0, current = 0;
  matches.forEach(match => {
    current = predicate(match) ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

function roundRange(list) {
  return list.length === 1 ? `J${list[0].round}` : `J${list[0].round}–J${list.at(-1).round}`;
}

function renderPerformance() {
  $('gameStrip').innerHTML = matches.map(match => `<div class="game-tile ${match.result}" title="J${match.round} · ${escapeHtml(match.phase)} ${escapeHtml(match.leg)} · ${escapeHtml(match.opponent)} · ${match.gf} x ${match.ga}">
    <span>J${String(match.round).padStart(2, '0')}</span><strong>${match.result}</strong>
  </div>`).join('');

  const group = matches.filter(m => m.stage === 'Grupos');
  const half = Math.ceil(group.length / 2);
  const periods = [
    {label: 'Grupo · turno', list: group.slice(0, half)},
    {label: 'Grupo · returno', list: group.slice(half)},
    {label: 'Mata-mata', list: matches.filter(m => m.stage === 'Mata-mata')}
  ].filter(period => period.list.length).map(period => ({...period, summary: summarize(period.list)}));
  const best = Math.max(...periods.map(period => period.summary.efficiency));
  $('periodGrid').innerHTML = periods.map(period => `<div class="period-card ${period.summary.efficiency === best ? 'best' : ''}">
    <span>${period.label.toUpperCase()} · ${roundRange(period.list)}</span><strong>${pct(period.summary.efficiency)}</strong>
    <div class="period-meter"><i style="width:${period.summary.efficiency}%"></i></div>
    <small>${period.summary.points} pontos · ${period.summary.wins}V ${period.summary.draws}E ${period.summary.losses}D</small>
  </div>`).join('');

  const cleanSheets = matches.filter(match => match.ga === 0).length;
  const recent = summarize(matches.slice(-5));
  const unbeatenRun = longestSequence(match => match.result !== 'D');
  const winningRun = longestSequence(match => match.result === 'V');
  const items = [
    {value: unbeatenRun, unit: unbeatenRun === 1 ? 'jogo' : 'jogos', eyebrow: 'REGULARIDADE', title: 'Maior sequência invicta', note: 'jogos seguidos sem derrota', tone: 'red'},
    {value: winningRun, unit: winningRun === 1 ? 'jogo' : 'jogos', eyebrow: 'VITÓRIAS', title: 'Maior sequência de vitórias', note: 'vitórias consecutivas', tone: 'green'},
    {value: cleanSheets, unit: `de ${matches.length} jogos`, eyebrow: 'SOLIDEZ DEFENSIVA', title: 'Jogos sem sofrer gol', note: `${pct(cleanSheets / matches.length * 100)} das partidas`, tone: 'dark'},
    {value: recent.points, unit: `de ${recent.games * 3} pontos`, eyebrow: 'RETA FINAL', title: `Últimos ${recent.games} jogos`, note: `${pct(recent.efficiency)} de aproveitamento`, tone: 'gold'}
  ];
  $('streakGrid').innerHTML = items.map(item => `<div class="streak-item ${item.tone}">
    <span class="streak-eyebrow">${item.eyebrow}</span>
    <div class="streak-value"><b>${item.value}</b><small>${item.unit}</small></div>
    <strong>${item.title}</strong>
    <p>${item.note}</p>
  </div>`).join('');
}

// ---------- Antes e depois do intervalo ----------
function setHalfBalance(id, value) {
  const element = $(id);
  element.textContent = signedNumber(value) + ' saldo';
  element.classList.toggle('positive', value > 0);
  element.classList.toggle('negative', value < 0);
}

function renderHalves(list) {
  const valid = list.filter(m => [m.htGf, m.htGa, m.shGf, m.shGa].every(Number.isFinite));
  if (!valid.length) {
    $('halvesInsight').textContent = 'Os placares de intervalo não estão disponíveis para este recorte.';
    return;
  }
  const totals = {htGf: 0, htGa: 0, shGf: 0, shGa: 0, htPoints: 0, finalPoints: 0, improved: 0, worsened: 0};
  valid.forEach(match => {
    const before = pointsOf(resultOf(match.htGf, match.htGa));
    totals.htGf += match.htGf;
    totals.htGa += match.htGa;
    totals.shGf += match.shGf;
    totals.shGa += match.shGa;
    totals.htPoints += before;
    totals.finalPoints += match.points;
    if (match.points > before) totals.improved += 1;
    if (match.points < before) totals.worsened += 1;
  });

  const totalScored = totals.htGf + totals.shGf;
  const maxGoals = Math.max(totals.htGf, totals.htGa, totals.shGf, totals.shGa, 1);
  const pointsSwing = totals.finalPoints - totals.htPoints;
  const unchanged = valid.length - totals.improved - totals.worsened;
  const gameCount = value => plural(value, 'jogo', 'jogos');
  const pointsSwingText = signedNumber(pointsSwing) + (Math.abs(pointsSwing) === 1 ? ' ponto' : ' pontos');
  const compareHalves = (first, second) => first === second ? 'Equilibrado' : first > second ? '1º tempo' : '2º tempo';

  $('firstHalfFor').textContent = totals.htGf;
  $('firstHalfAgainst').textContent = totals.htGa;
  $('secondHalfFor').textContent = totals.shGf;
  $('secondHalfAgainst').textContent = totals.shGa;
  $('firstHalfShare').textContent = pct(totalScored ? totals.htGf / totalScored * 100 : 0);
  $('secondHalfShare').textContent = pct(totalScored ? totals.shGf / totalScored * 100 : 0);
  setHalfBalance('firstHalfBalance', totals.htGf - totals.htGa);
  setHalfBalance('secondHalfBalance', totals.shGf - totals.shGa);
  $('firstForBar').style.width = `${totals.htGf / maxGoals * 100}%`;
  $('firstAgainstBar').style.width = `${totals.htGa / maxGoals * 100}%`;
  $('secondForBar').style.width = `${totals.shGf / maxGoals * 100}%`;
  $('secondAgainstBar').style.width = `${totals.shGa / maxGoals * 100}%`;
  $('productiveHalf').textContent = compareHalves(totals.htGf, totals.shGf);
  $('vulnerableHalf').textContent = compareHalves(totals.htGa, totals.shGa);
  $('improvedResults').innerHTML = `<em class="change-up">${gameCount(totals.improved)} ${totals.improved === 1 ? 'melhorou' : 'melhoraram'}</em>` +
    `<i>•</i><em class="change-down">${gameCount(totals.worsened)} ${totals.worsened === 1 ? 'piorou' : 'pioraram'}</em>`;
  $('unchangedResults').textContent = `${gameCount(unchanged)} ${unchanged === 1 ? 'manteve' : 'mantiveram'} o mesmo resultado`;
  $('pointsSwing').textContent = pointsSwingText;
  $('halvesInsight').innerHTML = `Em <b>${gameCount(totals.improved)}</b>, ${clubRef()} terminou melhor do que estava no intervalo; ` +
    `em <b>${gameCount(totals.worsened)}</b>, terminou pior; e em <b>${gameCount(unchanged)}</b>, manteve a mesma situação. ` +
    `O saldo dessas mudanças foi de <b>${pointsSwingText}</b>.`;
}

// ---------- Gols por faixa de minuto ----------
const MINUTE_BUCKETS = [
  {from: 1, to: 15, label: "1–15'"}, {from: 16, to: 30, label: "16–30'"}, {from: 31, to: 45, label: "31–45+'"},
  {from: 46, to: 60, label: "46–60'"}, {from: 61, to: 75, label: "61–75'"}, {from: 76, to: 90, label: "76–90+'"}
];
const bucketIndex = (minute) => MINUTE_BUCKETS.findIndex(b => Math.max(1, minute) >= b.from && Math.max(1, minute) <= b.to);

function goalsOf(list) {
  return list.flatMap(m => (goalsByMatch.get(m.id) || []).map(goal => ({...goal, match: m})));
}

function renderMinutes(list) {
  const goals = goalsOf(list);
  const counts = minuteCounts(list);
  const max = Math.max(1, ...counts.flatMap(c => [c.for, c.against]));
  $('minutesChart').setAttribute('aria-label', `Gols por faixa de minutos: ${MINUTE_BUCKETS.map((bucket, i) => `${bucket.label}, ${counts[i].for} marcados e ${counts[i].against} sofridos`).join('; ')}`);
  $('minutesChart').innerHTML = MINUTE_BUCKETS.map((bucket, i) => `<div class="minute-col ${i === 3 ? 'half-start' : ''}">
    <div class="minute-bars">
      <div class="for" title="${counts[i].for} marcados entre ${bucket.label}"><b>${counts[i].for}</b><i style="height:${counts[i].for / max * 120}px"></i></div>
      <div class="against" title="${counts[i].against} sofridos entre ${bucket.label}"><b>${counts[i].against}</b><i style="height:${counts[i].against / max * 120}px"></i></div>
    </div>
    <span>${bucket.label}</span>
  </div>`).join('');

  const topIndex = (key) => counts.reduce((best, c, i) => c[key] > counts[best][key] ? i : best, 0);
  const bestFor = topIndex('for');
  const worstAgainst = topIndex('against');
  const lastBucket = counts.at(-1);

  // Primeiro gol de cada partida.
  const opened = {games: [], conceded: [], goalless: 0};
  list.forEach(m => {
    const first = (goalsByMatch.get(m.id) || [])[0];
    if (!first) opened.goalless += 1;
    else opened[first.equipe === 'clube' ? 'games' : 'conceded'].push(m);
  });
  const record = (games) => { const s = summarize(games); return `${s.wins}V ${s.draws}E ${s.losses}D`; };

  $('minutesStats').innerHTML = `
    <div><span>Faixa mais produtiva</span><b>${counts[bestFor].for ? MINUTE_BUCKETS[bestFor].label : '—'}</b><small>${plural(counts[bestFor].for, 'gol marcado', 'gols marcados')}</small></div>
    <div><span>Faixa mais vulnerável</span><b>${counts[worstAgainst].against ? MINUTE_BUCKETS[worstAgainst].label : '—'}</b><small>${plural(counts[worstAgainst].against, 'gol sofrido', 'gols sofridos')}</small></div>
    <div><span>Reta final (76–90+')</span><b>${lastBucket.for} × ${lastBucket.against}</b><small>gols marcados × sofridos</small></div>
    <div><span>Abriu o placar</span><b>${opened.games.length} de ${list.length}</b><small>${opened.games.length ? `nesses jogos: ${record(opened.games)}` : 'nenhum jogo'}</small></div>`;

  if (!goals.length) {
    $('minutesInsight').textContent = 'Não há gols registrados neste recorte.';
    return;
  }
  const openedSummary = summarize(opened.games);
  const concededSummary = summarize(opened.conceded);
  const comeback = concededSummary.wins + concededSummary.draws;
  $('minutesInsight').innerHTML = `${clubRef(true)} marcou primeiro em <b>${plural(opened.games.length, 'jogo', 'jogos')}</b> e somou <b>${openedSummary.points} de ${openedSummary.max} pontos</b> neles. ` +
    (opened.conceded.length
      ? `Quando saiu atrás (${plural(opened.conceded.length, 'jogo', 'jogos')}), buscou o empate ou a virada em <b>${comeback}</b>. `
      : 'Não saiu atrás no placar em nenhum jogo deste recorte. ') +
    (opened.goalless ? `${plural(opened.goalless, 'jogo terminou', 'jogos terminaram')} sem gols.` : '');
}

// ---------- Artilharia ----------
function scorerStats(list) {
  const players = new Map();
  let ownGoalsFor = 0;
  list.forEach(m => {
    (goalsByMatch.get(m.id) || []).filter(goal => goal.equipe === 'clube').forEach(goal => {
      if (goal.tipo === 'Contra') { ownGoalsFor += 1; return; }
      if (!players.has(goal.atleta_id)) players.set(goal.atleta_id, {id: goal.atleta_id, name: goal.atleta, goals: 0, group: 0, knockout: 0, penalty: 0, freeKick: 0, decisive: 0, qualifying: 0});
      const player = players.get(goal.atleta_id);
      player.goals += 1;
      player[m.stage === 'Grupos' ? 'group' : 'knockout'] += 1;
      if (goal.tipo === 'Pênalti') player.penalty += 1;
      if (goal.tipo === 'Falta') player.freeKick += 1;
      if (KEY_GOALS.winGoals.has(goal)) player.decisive += 1;
      if (KEY_GOALS.qualifyingGoals.has(goal)) player.qualifying += 1;
    });
  });
  const ranking = [...players.values()].sort((a, b) => b.goals - a.goals || b.decisive - a.decisive || a.name.localeCompare(b.name, 'pt-BR'));
  return {ranking, ownGoalsFor};
}

function renderScorers(list) {
  const {ranking, ownGoalsFor} = scorerStats(list);
  const total = sum(ranking, p => p.goals) + ownGoalsFor;
  $('scorersCount').textContent = `${plural(total, 'gol', 'gols')} · ${plural(ranking.length, 'autor', 'autores')}`;
  if (!ranking.length) {
    $('scorerList').innerHTML = '<p class="empty-state">Nenhum gol neste recorte.</p>';
    $('scorerChips').innerHTML = '';
    return;
  }
  const max = ranking[0].goals;
  const TOP = 12;
  let rank = 0, previous = null;
  $('scorerList').innerHTML = ranking.slice(0, TOP).map((p, index) => {
    if (p.goals !== previous) { rank = index + 1; previous = p.goals; }
    const details = [
      p.group && `${p.group} na fase de grupos`,
      p.knockout && `${p.knockout} no mata-mata`,
      p.penalty && `${p.penalty} de pênalti`,
      p.freeKick && `${p.freeKick} de falta`,
      p.decisive && plural(p.decisive, 'decisivo', 'decisivos'),
      p.qualifying && plural(p.qualifying, 'valeu vaga', 'valeram vaga')
    ].filter(Boolean).join(' · ');
    return `<div class="scorer-row ${rank === 1 ? 'leader' : ''}">
      <em>${rank}º</em>
      <div class="scorer-main">${avatar(p.id, p.name)}<div><strong>${athleteLink(p.id, p.name)}</strong><small>${details}</small><div class="scorer-bar"><i style="width:${p.goals / max * 100}%"></i></div></div></div>
      <b>${p.goals}</b>
    </div>`;
  }).join('');
  const decisiveTotal = sum(ranking, p => p.decisive);
  const qualifyingTotal = sum(ranking, p => p.qualifying);
  const others = ranking.slice(TOP);
  $('scorerChips').innerHTML = [
    others.length ? `<span class="chip">Também marcaram: ${others.map(p => `${athleteLink(p.id, p.name)} <b>${p.goals}</b>`).join(', ')}</span>` : '',
    `<span class="chip"><b>${decisiveTotal}</b> ${decisiveTotal === 1 ? 'gol decisivo' : 'gols decisivos'}: os que garantiram vitórias</span>`,
    qualifyingTotal ? `<span class="chip"><b>${qualifyingTotal}</b> ${qualifyingTotal === 1 ? 'gol garantiu' : 'gols garantiram'} vaga no mata-mata</span>` : '',
    ownGoalsFor ? `<span class="chip"><b>${ownGoalsFor}</b> ${ownGoalsFor === 1 ? 'gol contra' : 'gols contra'} a favor</span>` : ''
  ].join('');
}

// ---------- Disciplina ----------
function renderDiscipline(list) {
  const yellows = sum(list, m => finite(m.yellows));
  const oppYellows = sum(list, m => finite(m.oppYellows));
  const reds = sum(list, m => finite(m.reds));
  const oppReds = sum(list, m => finite(m.oppReds));
  const bar = (label, own, opp, cls = '') => {
    const total = own + opp;
    const share = total ? own / total * 100 : 50;
    return `<div>
      <div class="compare-bar-head"><span>${label}: <b>${own}</b> ${escapeHtml(CLUB.nome)}</span><span>Adversários <b>${opp}</b></span></div>
      <div class="compare-bar ${cls}"><i style="width:${share}%"></i><i style="width:${100 - share}%"></i></div>
    </div>`;
  };
  $('disciplineBars').innerHTML = bar('Amarelos', yellows, oppYellows) + bar('Vermelhos', reds, oppReds, 'red');

  const withRed = list.filter(m => finite(m.reds) > 0);
  const mostCards = [...list].sort((a, b) => (finite(b.yellows) + finite(b.reds)) - (finite(a.yellows) + finite(a.reds)))[0];
  const players = squadStats(list);
  const booked = players.filter(p => p.yellows || p.reds).sort((a, b) => (b.reds * 2 + b.yellows) - (a.reds * 2 + a.yellows) || a.name.localeCompare(b.name, 'pt-BR'));
  $('disciplineStats').innerHTML = `
    <div><span>Amarelos por jogo</span><b>${decimal(list.length ? yellows / list.length : 0)}</b><small>adversários: ${decimal(list.length ? oppYellows / list.length : 0)}</small></div>
    <div><span>Jogos com expulsão</span><b>${withRed.length}</b><small>${withRed.map(m => escapeHtml(m.opponent)).join(', ') || 'nenhum'}</small></div>
    <div><span>Jogo com mais cartões</span><b>${mostCards ? finite(mostCards.yellows) + finite(mostCards.reds) : 0}</b><small>${mostCards ? `${escapeHtml(mostCards.opponent)} · J${mostCards.round}` : '—'}</small></div>
    <div><span>Mais advertido</span><b>${booked[0] ? escapeHtml(booked[0].name) : '—'}</b><small>${booked[0] ? `${plural(booked[0].yellows, 'amarelo', 'amarelos')}${booked[0].reds ? ` · ${plural(booked[0].reds, 'vermelho', 'vermelhos')}` : ''}` : ''}</small></div>`;
  $('disciplineChips').innerHTML = booked.slice(0, 8).map(p => `<span class="chip">${athleteLink(p.id, p.name)} ${cardIcons(p.yellows, p.reds)}</span>`).join('');
}

function cardIcons(yellows, reds) {
  return `${yellows ? `<span class="card-dot yellow" aria-hidden="true"></span><b>${yellows}</b>` : ''}${reds ? ` <span class="card-dot red" aria-hidden="true"></span><b>${reds}</b>` : ''}`;
}

// ---------- Elenco ----------
function squadStats(list) {
  const players = new Map();
  list.forEach(m => (playersByMatch.get(m.id) || []).forEach(row => {
    if (!players.has(row.atleta_id)) players.set(row.atleta_id, {id: row.atleta_id, name: row.atleta, goalkeeper: row.goleiro === 1, games: 0, starts: 0, minutes: 0, goals: 0, yellows: 0, reds: 0});
    const player = players.get(row.atleta_id);
    player.games += 1;
    player.starts += row.titular;
    player.minutes += row.minutos;
    player.goals += row.gols;
    player.yellows += row.amarelos;
    player.reds += row.vermelhos;
  }));
  return [...players.values()].sort((a, b) => b.minutes - a.minutes || b.games - a.games || a.name.localeCompare(b.name, 'pt-BR'));
}

function renderSquad(list) {
  const players = squadStats(list);
  if (!players.length) {
    $('squadSummary').innerHTML = '';
    $('baseEleven').innerHTML = '<span class="chip">Escalações indisponíveis neste recorte.</span>';
    $('squadBody').innerHTML = '';
    $('squadToggle').hidden = true;
    return;
  }
  const possible = list.length * 90;
  const starters = players.filter(p => p.starts > 0);
  const substitutions = sum(players, p => p.games - p.starts);
  const topMinutes = players[0];
  const keepers = players.filter(p => p.goalkeeper && p.games);
  $('squadSummary').innerHTML = `
    <div><span>Atletas utilizados</span><b>${players.length}</b><small>${plural(starters.length, 'foi titular', 'foram titulares')} ao menos uma vez</small></div>
    <div><span>Mais minutos</span><b>${escapeHtml(topMinutes.name)}</b><small>${topMinutes.minutes.toLocaleString('pt-BR')} min · ${pct(possible ? topMinutes.minutes / possible * 100 : 0)} do tempo possível</small></div>
    <div><span>Entradas vindas do banco</span><b>${substitutions}</b><small>${decimal(list.length ? substitutions / list.length : 0)} por jogo</small></div>
    <div><span>Goleiros utilizados</span><b>${keepers.length}</b><small>${keepers.map(p => escapeHtml(p.name)).join(', ') || '—'}</small></div>`;

  const base = [...players].sort((a, b) => b.starts - a.starts || b.minutes - a.minutes).slice(0, 11);
  $('baseEleven').innerHTML = base.map(p => `<span class="chip">${athleteLink(p.id, p.name)} <b>${p.starts}</b></span>`).join('');

  const visible = squadExpanded ? players : players.slice(0, 12);
  $('squadBody').innerHTML = visible.map(p => {
    const share = possible ? p.minutes / possible * 100 : 0;
    return `<tr>
      <td><div class="squad-name">${avatar(p.id, p.name)}${athleteLink(p.id, p.name)}${p.goalkeeper ? '<small>GOL</small>' : ''}</div></td>
      <td>${p.games}</td>
      <td>${p.starts}</td>
      <td><div class="minutes-meter"><i><b style="width:${share}%"></b></i><small>${p.minutes}'</small></div></td>
      <td>${p.goals || '—'}</td>
      <td>${cardIcons(p.yellows, p.reds) || '—'}</td>
    </tr>`;
  }).join('');
  $('squadToggle').hidden = players.length <= 12;
  $('squadToggle').textContent = squadExpanded ? 'Mostrar menos' : `Mostrar todos (${players.length})`;
}

// ---------- Adversários ----------
function renderOpponents() {
  const byOpponent = new Map();
  matches.forEach(m => {
    if (!byOpponent.has(m.opponent)) byOpponent.set(m.opponent, []);
    byOpponent.get(m.opponent).push(m);
  });
  const entries = [...byOpponent].map(([name, list]) => ({name, list, s: summarize(list), phases: [...new Set(list.map(m => PHASE_SHORT[m.phase] || m.phase))]}));
  $('opponentGrid').innerHTML = entries.map(({name, list, s, phases}) => {
    const tone = s.wins > s.losses ? 'better' : s.wins < s.losses ? 'worse' : 'even';
    return `<article class="opponent-card ${tone}">
      <header><div><b>${escapeHtml(name)}</b><small>${phases.join(' · ')}</small></div><strong>${score(s.gf, s.ga)}</strong></header>
      <div class="opponent-results">${list.map(m => `<span class="${m.result}" title="${escapeHtml(m.phase)} ${escapeHtml(m.leg)} · ${formatDate(m.date)}">${m.venue === 'Casa' ? 'C' : 'F'} ${m.gf}×${m.ga}</span>`).join('')}</div>
      <footer><span><b>${s.points}</b> de ${s.max} pts</span><span>${s.wins}V ${s.draws}E ${s.losses}D</span></footer>
    </article>`;
  }).join('');
  const unbeaten = entries.filter(e => !e.s.losses).length;
  const lostTo = entries.filter(e => e.s.losses).map(e => e.name);
  $('opponentsSummary').textContent = `${plural(entries.length, 'adversário diferente', 'adversários diferentes')}. ${clubRef(true)} ficou ${gendered('invicto', 'invicta')} contra ${unbeaten} deles` +
    (lostTo.length ? `; as derrotas foram para ${listJoin(lostTo)}.` : '.');
}

// ---------- Comparação com a temporada anterior ----------
function renderComparison() {
  const previousData = DATA.comparacao;
  if (!previousData || !previousData.jogos?.length) return;
  const previous = {year: previousData.ano, matches: buildMatches(previousData.jogos), group: buildGroup(previousData.grupo)};
  const current = {year: COMPETITION.ano, matches, group: groupTable};
  [previous, current].forEach(season => {
    season.s = summarize(season.matches);
    season.home = summarize(season.matches.filter(m => m.venue === 'Casa'));
    season.away = summarize(season.matches.filter(m => m.venue === 'Fora'));
    season.own = season.group.find(team => team.own);
    season.outcome = getOutcome(season.matches, season.group);
  });

  const metrics = [
    {label: 'Jogos disputados', value: x => x.s.games, format: v => v},
    {label: 'Pontos', value: x => x.s.points, format: v => v},
    {label: 'Aproveitamento', value: x => x.s.efficiency, format: pct, delta: d => `${d > 0 ? '+' : ''}${d.toLocaleString('pt-BR', {maximumFractionDigits: 1})} p.p.`, better: 1},
    {label: 'Campanha', value: x => `${x.s.wins}V ${x.s.draws}E ${x.s.losses}D`, format: v => v},
    {label: 'Gols marcados por jogo', value: x => x.s.games ? x.s.gf / x.s.games : 0, format: decimal, delta: d => `${d > 0 ? '+' : ''}${decimal(d)}`, better: 1},
    {label: 'Gols sofridos por jogo', value: x => x.s.games ? x.s.ga / x.s.games : 0, format: decimal, delta: d => `${d > 0 ? '+' : ''}${decimal(d)}`, better: -1},
    {label: 'Saldo de gols', value: x => x.s.gf - x.s.ga, format: signedNumber},
    {label: 'Aproveitamento em casa', value: x => x.home.efficiency, format: pct, delta: d => `${d > 0 ? '+' : ''}${d.toLocaleString('pt-BR', {maximumFractionDigits: 1})} p.p.`, better: 1},
    {label: 'Aproveitamento fora', value: x => x.away.efficiency, format: pct, delta: d => `${d > 0 ? '+' : ''}${d.toLocaleString('pt-BR', {maximumFractionDigits: 1})} p.p.`, better: 1},
    {label: 'Posição no grupo', value: x => x.own ? `${x.own.pos}º de ${x.group.length}` : '—', format: v => v},
    {label: 'Desfecho', value: x => x.outcome.label + (x.outcome.penalties ? ' (pênaltis)' : ''), format: v => v}
  ];
  $('comparisonHead').innerHTML = `<tr><th>Indicador</th><th>${previous.year}</th><th class="current">${current.year}</th></tr>`;
  $('comparisonBody').innerHTML = metrics.map(metric => {
    const before = metric.value(previous);
    const after = metric.value(current);
    let tag = '';
    if (metric.delta && typeof after === 'number') {
      const diff = after - before;
      if (Math.abs(diff) > 1e-9) {
        const improved = diff * metric.better > 0;
        tag = `<em class="tag ${improved ? 'better' : 'worse'}">${metric.delta(diff)}</em>`;
      }
    }
    return `<tr><td>${metric.label}</td><td>${metric.format(before)}</td><td class="current"><b>${metric.format(after)}</b>${tag}</td></tr>`;
  }).join('');

  const label = `${previous.year} × ${current.year}`;
  $('comparisonTitle').textContent = label;
  $('navComparison').textContent = label;
  $('navComparison').hidden = false;
  document.querySelector('.page[data-page="comparacao"]').dataset.title = label;
  PAGES.find(page => page.id === 'comparacao').title = label;
  comparisonCard = {title: label, stat: `Aproveitamento ${pct(previous.s.efficiency)} → ${pct(current.s.efficiency)}`};
  const direction = current.s.efficiency >= previous.s.efficiency ? 'subiu' : 'caiu';
  $('comparisonSummary').textContent = `Em ${previous.year}: ${previous.outcome.label.toLowerCase()}${previous.outcome.penalties ? ' nos pênaltis' : ''}. ` +
    `Em ${current.year}: ${current.outcome.label.toLowerCase()}. O aproveitamento ${direction} de ${pct(previous.s.efficiency)} para ${pct(current.s.efficiency)}.`;
}

// ---------- Tabela de jogos ----------
function matchDetails(m) {
  const goals = goalsByMatch.get(m.id) || [];
  const players = playersByMatch.get(m.id) || [];
  const goalItems = goals.map(goal => {
    const kind = goal.tipo !== 'Normal' ? ` <small>(${goal.tipo.toLowerCase()})</small>` : '';
    const team = goal.equipe === 'clube' ? CLUB.nome : m.opponent;
    const name = goal.equipe === 'clube' && goal.tipo !== 'Contra' ? athleteLink(goal.atleta_id, goal.atleta) : escapeHtml(goal.atleta);
    const tags = [
      KEY_GOALS.winGoals.has(goal) && '<em class="tag better">gol da vitória</em>',
      KEY_GOALS.qualifyingGoals.has(goal) && '<em class="tag better">gol da vaga</em>'
    ].filter(Boolean).join(' ');
    return `<li class="${goal.equipe === 'clube' ? '' : 'against'}"><span>${goal.minuto_jogo}' ${name}${kind} ${tags}</span><small>${escapeHtml(team)}</small></li>`;
  }).join('') || '<li><span>Sem gols</span></li>';
  const starters = players.filter(p => p.titular).map(p => athleteLink(p.atleta_id, p.atleta));
  const subs = players.filter(p => !p.titular).map(p => `${athleteLink(p.atleta_id, p.atleta)} (${p.minuto_entrada}')`);
  const booked = players.filter(p => p.amarelos || p.vermelhos).map(p => `${athleteLink(p.atleta_id, p.atleta)} ${cardIcons(p.amarelos, p.vermelhos)}`);
  const documents = [
    m.sumula && `<a href="${escapeHtml(m.sumula)}" target="_blank" rel="noopener">Súmula (PDF)</a>`,
    m.boletim && `<a href="${escapeHtml(m.boletim)}" target="_blank" rel="noopener">Boletim financeiro</a>`
  ].filter(Boolean).join(' · ');
  const attendance = Number.isFinite(m.attendance) ? `<br>Público: <b>${m.attendance.toLocaleString('pt-BR')}</b>${Number.isFinite(m.grossIncome) ? ` · renda ${money(m.grossIncome)}` : ''}` : '';
  const halfTime = Number.isFinite(m.htGf) ? `${m.htGf} × ${m.htGa}` : '—';
  const penalties = Number.isFinite(m.penGf) ? `<br>Pênaltis: <b>${m.penGf} × ${m.penGa}</b>` : '';
  return `<div class="match-details">
    <div><h3>Gols</h3><ul>${goalItems}</ul></div>
    <div><h3>Escalação</h3><p><b>Titulares:</b> ${starters.join(', ') || '—'}<br><b>Entraram:</b> ${subs.join(', ') || '—'}<br><b>Cartões:</b> ${booked.join(', ') || '—'}</p></div>
    <div><h3>Informações</h3><p>Intervalo: <b>${halfTime}</b>${penalties}<br>${escapeHtml(m.stadium)}${m.city ? ` · ${escapeHtml(m.city)}` : ''}<br>${formatDate(m.date)} · ${escapeHtml(m.time)}<br>Árbitro: ${escapeHtml(m.referee || '—')}<br>Cartões: ${finite(m.yellows)} amarelos, ${finite(m.reds)} vermelhos (adversário: ${finite(m.oppYellows)} e ${finite(m.oppReds)})${attendance}${documents ? `<br>${documents}` : ''}</p></div>
  </div>`;
}

function matchesSearch(m, term) {
  if (!term) return true;
  const names = [m.opponent, ...(playersByMatch.get(m.id) || []).map(p => p.atleta), ...(goalsByMatch.get(m.id) || []).map(g => g.atleta)];
  return names.some(name => (name || '').toLocaleLowerCase('pt-BR').includes(term));
}

function renderTable(list) {
  let accumulated = 0;
  const accumulatedByRound = new Map(matches.map(m => [m.round, (accumulated += m.points)]));
  const term = $('matchSearch').value.trim().toLocaleLowerCase('pt-BR');
  const visible = list.filter(m => matchesSearch(m, term));
  const resultName = {V: 'Vitória', E: 'Empate', D: 'Derrota'};
  $('matchesBody').innerHTML = visible.map(m => {
    const open = expandedMatches.has(m.id);
    const penalties = Number.isFinite(m.penGf) ? `<em>pên. ${m.penGf}–${m.penGa}</em>` : '';
    return `<tr class="match-row row-${m.result}" data-id="${m.id}">
      <td><button type="button" class="row-toggle" aria-expanded="${open}" aria-controls="details-${m.id}" aria-label="Detalhes do jogo ${m.round}">›</button></td>
      <td><span class="round-number">${String(m.round).padStart(2, '0')}</span></td>
      <td class="date-cell">${formatDate(m.date)}</td>
      <td><div class="phase-cell"><b>${escapeHtml(PHASE_SHORT[m.phase] || m.phase)}</b><span>${escapeHtml(m.leg)}</span></div></td>
      <td><div class="fixture"><span>${escapeHtml(CLUB.nome)}</span><strong>${score(m.gf, m.ga)}</strong><span>${escapeHtml(m.opponent)}</span>${penalties}</div></td>
      <td><span class="venue-tag ${m.venue.toLowerCase()}">${m.venue}</span></td>
      <td><div class="result-cell"><span class="badge ${m.result}">${m.result}</span><b>${resultName[m.result]}</b></div></td>
      <td><span class="points-pill ${m.result}">+${m.points}</span></td>
      <td><div class="accumulated"><b>${accumulatedByRound.get(m.round)}</b><span>pts</span></div></td>
    </tr>
    <tr class="details-row" id="details-${m.id}" ${open ? '' : 'hidden'}><td colspan="9">${open ? matchDetails(m) : ''}</td></tr>`;
  }).join('');
  $('emptyState').hidden = visible.length > 0;
}

function toggleMatch(id) {
  const detailsRow = $(`details-${id}`);
  const button = document.querySelector(`.match-row[data-id="${id}"] .row-toggle`);
  const m = matches.find(match => match.id === id);
  const open = !expandedMatches.has(id);
  if (open) expandedMatches.add(id); else expandedMatches.delete(id);
  detailsRow.hidden = !open;
  detailsRow.firstElementChild.innerHTML = open ? matchDetails(m) : '';
  button.setAttribute('aria-expanded', open);
}

// ---------- Início (resumo) ----------
function minuteCounts(list) {
  const counts = MINUTE_BUCKETS.map(() => ({for: 0, against: 0}));
  goalsOf(list).forEach(goal => {
    const index = bucketIndex(goal.minuto_jogo);
    if (index >= 0) counts[index][goal.equipe === 'clube' ? 'for' : 'against'] += 1;
  });
  return counts;
}

function renderHome() {
  const s = summarize(matches);
  const home = summarize(matches.filter(m => m.venue === 'Casa'));
  const away = summarize(matches.filter(m => m.venue === 'Fora'));
  const topScorer = scorerStats(matches).ranking[0];
  const outcome = getOutcome(matches, groupTable);

  const tiles = [
    {label: 'Aproveitamento', value: pct(s.efficiency), note: `${s.points} de ${s.max} pontos`},
    {label: 'Campanha', value: `${s.wins}V ${s.draws}E ${s.losses}D`, note: plural(s.games, 'jogo', 'jogos')},
    {label: 'Gols', value: score(s.gf, s.ga), note: `saldo ${signedNumber(s.gf - s.ga)}`},
    topScorer && {label: 'Artilheiro', value: escapeHtml(topScorer.name), note: plural(topScorer.goals, 'gol', 'gols')},
    {label: 'Em casa', value: pct(home.efficiency), note: `fora: ${pct(away.efficiency)}`}
  ].filter(Boolean);
  $('homeKpis').innerHTML = tiles.map(tile => `<article class="home-kpi"><span>${tile.label}</span><b>${tile.value}</b><small>${tile.note}</small></article>`).join('');

  const own = groupTable.find(team => team.own);
  const groupSummary = summarize(matches.filter(m => m.stage === 'Grupos'));
  const steps = [];
  if (groupSummary.games) {
    const groupStatus = !isGroupPhaseOver(matches, groupTable) ? 'pending' : (own && own.pos > GROUP_QUALIFIERS ? 'eliminated' : 'advanced');
    steps.push(`<li class="step ${groupStatus}"><span>1ª fase</span><b>Grupo ${escapeHtml(groupName)}${own ? ` · ${own.pos}º` : ''}</b><small>${groupSummary.points} pts · ${groupSummary.wins}V ${groupSummary.draws}E ${groupSummary.losses}D</small></li>`);
  }
  getTies(matches).forEach(tie => {
    const penalties = tie.hasPenalties ? ` (pên. ${tie.penGf}–${tie.penGa})` : '';
    steps.push(`<li class="step ${tie.status}"><span>${escapeHtml(tie.phase)}</span><b>${escapeHtml(tie.opponent)}</b><small>${tie.gf} × ${tie.ga} no agregado${penalties}</small></li>`);
  });
  $('homeJourney').innerHTML = steps.join('');

  $('homeLastMatches').innerHTML = matches.slice(-5).reverse().map(m => `<a class="last-match row-${m.result}" href="#jogos" data-page="jogos">
    <span class="badge ${m.result}">${m.result}</span>
    <div><b>${escapeHtml(CLUB.nome)} ${m.gf} × ${m.ga} ${escapeHtml(m.opponent)}</b><small>${formatDate(m.date)} · ${escapeHtml(PHASE_SHORT[m.phase] || m.phase)} ${escapeHtml(m.leg)} · ${m.venue === 'Casa' ? 'em casa' : 'fora'}</small></div>
  </a>`).join('');

  const counts = minuteCounts(matches);
  const best = counts.reduce((top, c, i) => c.for > counts[top].for ? i : top, 0);
  const players = squadStats(matches).length;
  const cards = [
    {page: 'trajetoria', title: 'Trajetória', stat: outcome.label, text: 'Grupo, confrontos do mata-mata e retrospecto contra cada adversário.'},
    {page: 'desempenho', title: 'Desempenho', stat: `${pct(home.efficiency)} em casa`, text: 'Evolução dos pontos, resultados, mando de campo e consistência.'},
    {page: 'gols', title: 'Gols', stat: `Mais gols entre ${MINUTE_BUCKETS[best].label}`, text: 'Artilharia, gols por faixa de minuto e antes e depois do intervalo.'},
    {page: 'elenco', title: 'Elenco', stat: `${players} atletas utilizados`, text: 'Time-base, titularidades, minutos jogados e cartões.'},
    {page: 'jogos', title: 'Jogos', stat: plural(s.games, 'partida', 'partidas'), text: 'Tabela completa com gols, escalação e arbitragem de cada jogo.'}
  ];
  const leagueOwn = (DATA.principal.classificacao_geral || []).find(row => row.clube === 1);
  if (leagueOwn) cards.push({page: 'serie-d', title: COMPETITION.nome, stat: `${leagueOwn.posicao}º de ${DATA.principal.classificacao_geral.length} na classificação geral`, text: `Indicadores comparados à média dos clubes da ${COMPETITION.nome} e classificação geral.`});
  const homeAttendance = matches.filter(m => m.venue === 'Casa' && Number.isFinite(m.attendance));
  if (homeAttendance.length) cards.push({page: 'estadios', title: 'Público e viagens', stat: `${Math.round(sum(homeAttendance, m => m.attendance) / homeAttendance.length).toLocaleString('pt-BR')} torcedores por jogo em casa`, text: 'Público e renda de cada jogo e mapa das viagens da campanha.'});
  if (comparisonCard) cards.push({page: 'comparacao', ...comparisonCard, text: 'Comparação de aproveitamento, gols e desfecho com a temporada anterior.'});
  $('homeCards').innerHTML = cards.map(card => `<a class="page-card" href="#${card.page}" data-page="${card.page}">
    <span>${escapeHtml(card.title)}</span><b>${escapeHtml(card.stat)}</b><p>${card.text}</p><em>Abrir →</em>
  </a>`).join('');
}

// ---------- Páginas ----------
const PAGES = [...document.querySelectorAll('.page')].map(page => ({id: page.dataset.page, title: page.dataset.title, element: page}));
const availablePages = () => PAGES.filter(page => {
  const link = document.querySelector(`#mainNav a[data-page="${page.id}"]`);
  return link && !link.hidden;
});
const pageFromHash = () => decodeURIComponent((location.hash || '#inicio').slice(1));

function renderPager(currentId) {
  const pages = availablePages();
  const index = pages.findIndex(page => page.id === currentId);
  const previous = pages[index - 1];
  const next = pages[index + 1];
  $('pagePager').innerHTML = `
    ${previous ? `<a href="#${previous.id}" data-page="${previous.id}"><small>Anterior</small><b>← ${escapeHtml(previous.title)}</b></a>` : '<span></span>'}
    ${next ? `<a class="next" href="#${next.id}" data-page="${next.id}"><small>Próxima</small><b>${escapeHtml(next.title)} →</b></a>` : '<span></span>'}`;
}

function showPage(id, {push = false, scroll = true} = {}) {
  const [base, param] = id.split('/');
  const isAthlete = base === 'atleta' && athleteInfo.has(param);
  const page = isAthlete ? PAGES.find(p => p.id === 'atleta') : (availablePages().find(p => p.id === base) || PAGES[0]);
  const navId = isAthlete ? 'elenco' : page.id;
  PAGES.forEach(p => { p.element.hidden = p !== page; });
  if (isAthlete) renderAthlete(param);
  if (page.id === 'estadios') ensureTravelMap();
  document.querySelectorAll('#mainNav a').forEach(link => {
    if (link.dataset.page === navId) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // No celular o menu rola na horizontal: mantém a página ativa visível.
  const nav = $('mainNav');
  const activeLink = nav.querySelector('[aria-current="page"]');
  if (activeLink && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
  }
  const slot = page.element.querySelector('.filter-slot');
  const filterRow = $('filterRow');
  filterRow.hidden = !slot;
  if (slot) slot.appendChild(filterRow);
  const title = isAthlete ? athleteInfo.get(param).name : page.title;
  document.title = page.id === 'inicio' ? `${CLUB.nome} | Painel de desempenho` : `${title} · ${CLUB.nome} | Painel de desempenho`;
  if (isAthlete) $('pagePager').innerHTML = '';
  else renderPager(page.id);
  if (push) {
    // Em iframes do Streamlit (about:srcdoc) o histórico pode não estar disponível.
    try { history.pushState(null, '', `#${isAthlete ? `atleta/${encodeURIComponent(param)}` : page.id}`); } catch (_) { /* segue sem alterar o endereço */ }
  }
  if (scroll) window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-page]');
  if (!SEASON_STARTED || !link || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  showPage(link.dataset.param ? `${link.dataset.page}/${link.dataset.param}` : link.dataset.page, {push: true});
});
window.addEventListener('popstate', () => { if (SEASON_STARTED) showPage(pageFromHash()); });
window.addEventListener('hashchange', () => { if (SEASON_STARTED) showPage(pageFromHash()); });

// ---------- Utilidades de exportação e formatação ----------
function money(value) {
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0});
}

const FILE_PREFIX = `${CLUB.nome}_${COMPETITION.slug}_${COMPETITION.ano}`
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const cell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = '﻿' + [headers.join(','), ...rows.map(row => headers.map(h => cell(row[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  const link = Object.assign(document.createElement('a'), {href: url, download: filename});
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Página do atleta ----------
function renderAthlete(id) {
  const info = athleteInfo.get(id);
  const rows = matches.map(m => ({m, row: (playersByMatch.get(m.id) || []).find(r => r.atleta_id === id)}));
  const played = rows.filter(item => item.row);
  const goals = matches.flatMap(m => (goalsByMatch.get(m.id) || []).filter(g => g.atleta_id === id && g.equipe === 'clube' && g.tipo !== 'Contra').map(g => ({...g, match: m, original: g})));
  const minutes = sum(played, item => item.row.minutos);
  const starts = sum(played, item => item.row.titular);
  const yellows = sum(played, item => item.row.amarelos);
  const reds = sum(played, item => item.row.vermelhos);
  const decisive = goals.filter(g => KEY_GOALS.winGoals.has(g.original)).length;
  const qualifying = goals.filter(g => KEY_GOALS.qualifyingGoals.has(g.original)).length;
  const shirt = shirtOf(info);
  const possible = matches.length * 90;
  const record = summarize(played.map(item => item.m));

  $('athleteHeader').innerHTML = `${avatar(id, info.name, 'lg')}
    <div>
      <p class="eyebrow">${escapeHtml(CLUB.nome.toUpperCase())} · ${COMPETITION.nome.toUpperCase()} ${COMPETITION.ano}</p>
      <h1>${escapeHtml(info.name)}</h1>
      <p>${[shirt && `Camisa ${shirt}`, info.goalkeeper && 'Goleiro', `${plural(played.length, 'jogo', 'jogos')} na campanha`].filter(Boolean).join(' · ')}</p>
    </div>`;

  const tiles = [
    {label: 'Jogos', value: `${played.length} de ${matches.length}`, note: `${plural(starts, 'como titular', 'como titular')}`},
    {label: 'Minutos', value: minutes.toLocaleString('pt-BR'), note: `${pct(possible ? minutes / possible * 100 : 0)} do tempo possível`},
    {label: 'Gols', value: goals.length, note: [decisive && plural(decisive, 'decisivo', 'decisivos'), qualifying && plural(qualifying, 'valeu vaga', 'valeram vaga')].filter(Boolean).join(' · ') || (goals.length ? 'nenhum decisivo' : 'sem gols')},
    {label: 'Cartões', value: `${yellows} · ${reds}`, note: 'amarelos · vermelhos'},
    {label: 'Com ele em campo', value: pct(record.efficiency), note: `${record.wins}V ${record.draws}E ${record.losses}D`}
  ];
  $('athleteKpis').innerHTML = tiles.map(tile => `<article class="home-kpi"><span>${tile.label}</span><b>${tile.value}</b><small>${tile.note}</small></article>`).join('');

  $('athleteStrip').innerHTML = rows.map(({m, row}) => {
    const kind = !row ? 'none' : row.titular ? 'starter' : 'sub';
    const label = !row ? 'Não jogou' : row.titular ? `Titular · ${row.minutos}'` : `Entrou aos ${row.minuto_entrada}'`;
    return `<div class="game-tile participation ${kind}" title="J${m.round} · ${escapeHtml(m.opponent)} · ${label}">
      <span>J${String(m.round).padStart(2, '0')}</span><strong>${row ? `${row.minutos}'` : '—'}</strong>
    </div>`;
  }).join('');

  $('athleteMatches').innerHTML = rows.map(({m, row}) => {
    let participation = 'Não jogou';
    if (row && row.titular) participation = row.minuto_saida < 90 ? `Titular, saiu aos ${row.minuto_saida}'` : 'Titular, jogou até o fim';
    else if (row) participation = `Entrou aos ${row.minuto_entrada}'`;
    const matchGoals = goals.filter(g => g.match === m).map(g => `${g.minuto_jogo}'${g.tipo !== 'Normal' ? ` (${g.tipo.toLowerCase()})` : ''}`).join(', ');
    return `<tr class="${row ? '' : 'muted-row'}">
      <td><span class="round-number">${String(m.round).padStart(2, '0')}</span></td>
      <td class="date-cell">${formatDate(m.date)}</td>
      <td><div class="result-cell"><span class="badge ${m.result}">${m.result}</span><b>${escapeHtml(CLUB.nome)} ${m.gf} × ${m.ga} ${escapeHtml(m.opponent)}</b></div></td>
      <td>${participation}</td>
      <td>${row ? `${row.minutos}'` : '—'}</td>
      <td>${matchGoals || '—'}</td>
      <td>${row ? cardIcons(row.amarelos, row.vermelhos) || '—' : '—'}</td>
    </tr>`;
  }).join('');
}

// ---------- Contexto da competição ----------
const LEAGUE_ROWS = DATA.principal.classificacao_geral || [];
const LEAGUE_METRICS = [
  {label: 'Aproveitamento', value: r => r.jogos ? r.pontos / (r.jogos * 3) * 100 : 0, format: pct, better: 1},
  {label: 'Aproveitamento em casa', value: r => r.jogos_casa ? r.pontos_casa / (r.jogos_casa * 3) * 100 : 0, format: pct, better: 1},
  {label: 'Aproveitamento fora', value: r => r.jogos_fora ? r.pontos_fora / (r.jogos_fora * 3) * 100 : 0, format: pct, better: 1},
  {label: 'Gols marcados por jogo', value: r => r.jogos ? r.gols_pro / r.jogos : 0, format: decimal, better: 1},
  {label: 'Gols sofridos por jogo', value: r => r.jogos ? r.gols_contra / r.jogos : 0, format: decimal, better: -1},
  {label: 'Cartões amarelos por jogo', value: r => r.jogos ? r.amarelos / r.jogos : 0, format: decimal, better: -1}
];

function leagueRank(metric, own) {
  const ownValue = metric.value(own);
  return 1 + LEAGUE_ROWS.filter(r => r.jogos && (metric.value(r) - ownValue) * metric.better > 1e-9).length;
}

function renderLeague() {
  const own = LEAGUE_ROWS.find(row => row.clube === 1);
  if (!own) {
    $('navLeague').hidden = true;
    return;
  }
  const total = LEAGUE_ROWS.length;
  const league = DATA.principal.liga || {};
  const pageInfo = PAGES.find(page => page.id === 'serie-d');
  pageInfo.title = COMPETITION.nome;
  pageInfo.element.dataset.title = COMPETITION.nome;
  $('navLeague').textContent = COMPETITION.nome;
  $('leagueTitle').textContent = `${CLUB.nome} na ${COMPETITION.nome} ${COMPETITION.ano}`;
  $('leagueLegendClub').textContent = CLUB.nome;
  const behind = LEAGUE_ROWS.filter(row => row.posicao > own.posicao).length;
  const phase = own.fase_alcancada || '';
  const reach = !phase ? 'sem fase alcançada registrada' : phase === 'Campeão' ? 'com o título' : `com a campanha encerrada ${PHASE_WITH_ARTICLE[phase] || `na ${phase.toLowerCase()}`}`;
  $('leagueSummary').textContent = `${own.posicao}º lugar na classificação geral entre ${total} clubes, ${reach}. ` +
    `${clubRef(true)} ficou à frente de ${pct(behind / Math.max(total - 1, 1) * 100)} dos participantes.`;

  const efficiency = LEAGUE_METRICS[0];
  const avgEfficiency = sum(LEAGUE_ROWS, efficiency.value) / total;
  const tiles = [
    {label: 'Classificação geral', value: `${own.posicao}º de ${total}`, note: phase || '—'},
    {label: 'Aproveitamento', value: pct(efficiency.value(own)), note: `${leagueRank(efficiency, own)}º melhor · média ${pct(avgEfficiency)}`},
    {label: 'Gols por jogo na competição', value: decimal(league.media_gols_jogo || 0), note: `${(league.jogos || 0).toLocaleString('pt-BR')} jogos disputados`},
    {label: 'Vitórias do mandante', value: pct(league.jogos ? league.vitorias_mandante / league.jogos * 100 : 0), note: `empates ${pct(league.jogos ? league.empates / league.jogos * 100 : 0)} · visitante ${pct(league.jogos ? league.vitorias_visitante / league.jogos * 100 : 0)}`}
  ];
  $('leagueKpis').innerHTML = tiles.map(tile => `<article class="home-kpi"><span>${tile.label}</span><b>${tile.value}</b><small>${tile.note}</small></article>`).join('');

  $('leagueMetrics').innerHTML = LEAGUE_METRICS.map(metric => {
    const values = LEAGUE_ROWS.filter(r => r.jogos).map(metric.value);
    if (!values.length) return `<div class="league-metric"><div class="lm-head"><span>${metric.label}</span><b>—</b></div></div>`;
    const min = Math.min(...values), max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const ownValue = metric.value(own);
    const position = (value) => max > min ? (value - min) / (max - min) * 100 : 50;
    const rank = leagueRank(metric, own);
    const good = (ownValue - avg) * metric.better >= 0;
    return `<div class="league-metric">
      <div class="lm-head"><span>${metric.label}${metric.better < 0 ? ' <small>(menor é melhor)</small>' : ''}</span><b>${metric.format(ownValue)}</b><em class="tag ${good ? 'better' : 'worse'}">${rank}º de ${values.length}</em></div>
      <div class="lm-track"><i class="avg" style="left:${position(avg)}%" title="Média: ${metric.format(avg)}"></i><i class="own" style="left:${position(ownValue)}%" title="${escapeHtml(CLUB.nome)}: ${metric.format(ownValue)}"></i></div>
      <div class="lm-scale"><span>${metric.format(min)}</span><span>média ${metric.format(avg)}</span><span>${metric.format(max)}</span></div>
    </div>`;
  }).join('');
  renderLeagueTable();
}

function renderLeagueTable() {
  const own = LEAGUE_ROWS.find(row => row.clube === 1);
  const visible = leagueExpanded ? LEAGUE_ROWS : LEAGUE_ROWS.filter(row => row.posicao <= 16 || row === own);
  $('leagueTable').innerHTML = visible.map(row => `<tr class="${row.clube ? 'own-row' : ''}">
    <td><span class="round-number">${row.posicao}</span></td>
    <td><b>${escapeHtml(row.time)}</b></td>
    <td>${escapeHtml(row.fase_alcancada)}</td>
    <td><b>${row.pontos}</b></td><td>${row.jogos}</td><td>${row.vitorias}</td><td>${row.empates}</td><td>${row.derrotas}</td>
    <td>${signedNumber(row.saldo)}</td>
    <td>${pct(row.jogos ? row.pontos / (row.jogos * 3) * 100 : 0)}</td>
  </tr>`).join('');
  $('leagueToggle').textContent = leagueExpanded ? 'Mostrar menos' : `Mostrar todos (${LEAGUE_ROWS.length})`;
}

// ---------- Banco de reservas ----------
function renderBench(list) {
  const rows = list.flatMap(m => (playersByMatch.get(m.id) || []).map(row => ({...row, match: m})));
  if (!rows.length) {
    $('benchStats').innerHTML = '';
    $('benchSplit').innerHTML = '<p class="empty-state">Escalações indisponíveis neste recorte.</p>';
    $('benchScorers').innerHTML = '';
    return;
  }
  const subs = rows.filter(row => !row.titular);
  const benchKeys = new Set(subs.map(row => `${row.id_jogo}:${row.atleta_id}`));
  const playerGoals = list.flatMap(m => (goalsByMatch.get(m.id) || []).filter(g => g.equipe === 'clube' && g.tipo !== 'Contra'));
  const benchGoals = playerGoals.filter(g => benchKeys.has(`${g.id_jogo}:${g.atleta_id}`));
  const benchKeyGoals = benchGoals.filter(g => KEY_GOALS.winGoals.has(g) || KEY_GOALS.qualifyingGoals.has(g));
  const firstSubs = list.map(m => {
    const minutes = (playersByMatch.get(m.id) || []).filter(row => !row.titular).map(row => row.minuto_entrada);
    return {m, first: minutes.length ? Math.min(...minutes) : null};
  });
  const withSubs = firstSubs.filter(item => item.first !== null);
  const avgFirst = withSubs.length ? sum(withSubs, item => item.first) / withSubs.length : 0;
  const halftime = subs.filter(row => row.minuto_entrada === 45).length;

  $('benchStats').innerHTML = `
    <div><span>Gols de quem saiu do banco</span><b>${benchGoals.length} de ${playerGoals.length}</b><small>${pct(playerGoals.length ? benchGoals.length / playerGoals.length * 100 : 0)} dos gols dos atletas</small></div>
    <div><span>Gols decisivos do banco</span><b>${benchKeyGoals.length}</b><small>garantiram vitória ou vaga</small></div>
    <div><span>Primeira substituição</span><b>${Math.round(avgFirst)}'</b><small>minuto médio</small></div>
    <div><span>Trocas no intervalo</span><b>${halftime}</b><small>${decimal(list.length ? halftime / list.length : 0)} por jogo</small></div>`;

  const early = firstSubs.filter(item => item.first !== null && item.first <= 60).map(item => item.m);
  const late = firstSubs.filter(item => item.first === null || item.first > 60).map(item => item.m);
  const card = (title, subtitle, games) => {
    const s = summarize(games);
    return `<div class="bench-card"><span>${title}</span><b>${games.length ? pct(s.efficiency) : '—'}</b><small>${subtitle} · ${plural(s.games, 'jogo', 'jogos')} · ${s.wins}V ${s.draws}E ${s.losses}D</small></div>`;
  };
  $('benchSplit').innerHTML = card('Mexeu cedo', '1ª troca até os 60 minutos', early) + card('Mexeu tarde', '1ª troca depois dos 60 minutos', late);

  const scorers = new Map();
  benchGoals.forEach(g => scorers.set(g.atleta_id, {name: g.atleta, goals: (scorers.get(g.atleta_id)?.goals || 0) + 1}));
  $('benchScorers').innerHTML = scorers.size
    ? `<span class="chip">Marcaram vindo do banco: ${[...scorers].map(([id, p]) => `${athleteLink(id, p.name)} <b>${p.goals}</b>`).join(', ')}</span>`
    : '<span class="chip">Nenhum gol de reserva neste recorte.</span>';
}

// ---------- Arbitragem ----------
function renderReferees(list) {
  const byReferee = new Map();
  list.forEach(m => {
    const name = m.referee || 'Não informado';
    if (!byReferee.has(name)) byReferee.set(name, []);
    byReferee.get(name).push(m);
  });
  const entries = [...byReferee].map(([name, games]) => ({name, games, s: summarize(games)}))
    .sort((a, b) => b.games.length - a.games.length || b.s.efficiency - a.s.efficiency || a.name.localeCompare(b.name, 'pt-BR'));
  $('refereesBody').innerHTML = entries.map(({name, games, s}) => `<tr>
    <td><b>${escapeHtml(name)}</b></td>
    <td>${games.length}</td>
    <td>${s.wins}V ${s.draws}E ${s.losses}D</td>
    <td>${pct(s.efficiency)}</td>
    <td>${decimal(sum(games, m => finite(m.yellows) + finite(m.reds)) / games.length)} × ${decimal(sum(games, m => finite(m.oppYellows) + finite(m.oppReds)) / games.length)}</td>
    <td><div class="opponent-results">${games.map(m => `<span class="${m.result}" title="J${m.round} · ${escapeHtml(m.opponent)}">J${m.round} ${m.gf}×${m.ga}</span>`).join('')}</div></td>
  </tr>`).join('');
  const states = new Map();
  list.forEach(m => {
    const uf = (m.referee || '').match(/\(([A-Z]{2})\)$/)?.[1];
    if (uf) states.set(uf, (states.get(uf) || 0) + 1);
  });
  const topState = [...states].sort((a, b) => b[1] - a[1])[0];
  $('refereesSummary').textContent = `${plural(entries.length, 'árbitro diferente', 'árbitros diferentes')} em ${plural(list.length, 'jogo', 'jogos')}` +
    (topState ? `; a federação mais frequente foi ${topState[0]} (${plural(topState[1], 'jogo', 'jogos')}).` : '.');
}

// ---------- Público e renda ----------
function renderAttendance() {
  const withData = matches.filter(m => Number.isFinite(m.attendance));
  const home = withData.filter(m => m.venue === 'Casa');
  const missing = matches.length - withData.length;
  const noBoletim = matches.filter(m => !Number.isFinite(m.attendance) && !m.boletim).length;
  const unreadable = missing - noBoletim;
  if (!withData.length) {
    $('attendanceKpis').innerHTML = '';
    $('attendanceChart').innerHTML = '<p class="empty-state">Nenhum boletim financeiro com público disponível.</p>';
    return;
  }
  const biggest = [...withData].sort((a, b) => b.attendance - a.attendance)[0];
  const homeAvg = home.length ? sum(home, m => m.attendance) / home.length : 0;
  const homeGross = sum(home.filter(m => Number.isFinite(m.grossIncome)), m => m.grossIncome);
  const homeNet = home.filter(m => Number.isFinite(m.netIncome));
  const tiles = [
    {label: 'Público em casa', value: sum(home, m => m.attendance).toLocaleString('pt-BR'), note: `${plural(home.length, 'jogo', 'jogos')} com boletim`},
    {label: 'Média em casa', value: Math.round(homeAvg).toLocaleString('pt-BR'), note: 'torcedores por jogo'},
    {label: 'Maior público (casa ou fora)', value: biggest.attendance.toLocaleString('pt-BR'), note: `${escapeHtml(biggest.opponent)} · ${biggest.venue === 'Casa' ? 'em casa' : 'fora'}${biggest.city ? ` (${escapeHtml(biggest.city)})` : ''}`},
    {label: 'Renda bruta em casa', value: money(homeGross), note: `${money(home.length ? homeGross / home.length : 0)} por jogo`},
    homeNet.length && {label: 'Resultado líquido em casa', value: money(sum(homeNet, m => m.netIncome)), note: 'receita menos despesas do jogo'}
  ].filter(Boolean);
  $('attendanceKpis').innerHTML = tiles.map(tile => `<article class="home-kpi"><span>${tile.label}</span><b>${tile.value}</b><small>${tile.note}</small></article>`).join('');

  const max = Math.max(...withData.map(m => m.attendance));
  $('attendanceChart').setAttribute('aria-label', `Público por jogo: ${plural(withData.length, 'jogo com público informado', 'jogos com público informado')} de ${matches.length}; maior público ${biggest.attendance.toLocaleString('pt-BR')} contra ${biggest.opponent}; média em casa ${Math.round(homeAvg).toLocaleString('pt-BR')} torcedores`);
  $('attendanceChart').innerHTML = matches.map(m => {
    const has = Number.isFinite(m.attendance);
    const place = m.venue === 'Casa' ? 'casa' : 'fora';
    const reason = m.boletim ? 'boletim sem dados legíveis' : 'sem boletim';
    const title = `J${m.round} · ${m.opponent} (${place}) · ${has ? `${m.attendance.toLocaleString('pt-BR')} torcedores` : `sem dado: ${reason}`}`;
    const footer = `<span>J${m.round}</span><small>${m.venue === 'Casa' ? 'C' : 'F'}</small>`;
    if (!has) {
      const link = m.boletim ? `<a href="${escapeHtml(m.boletim)}" target="_blank" rel="noopener" title="Abrir o boletim (PDF)">PDF</a>` : '';
      return `<div class="attendance-col no-data" title="${escapeHtml(title)}">
        <em>sem dado<br>${m.boletim ? 'ilegível' : 'sem boletim'}</em>${link}${footer}
      </div>`;
    }
    const height = Math.max(4, m.attendance / max * 160);
    return `<div class="attendance-col" title="${escapeHtml(title)}">
      <b>${m.attendance >= 1000 ? `${(m.attendance / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 1})} mil` : m.attendance}</b>
      <i class="${m.result}" style="height:${height}px"></i>${footer}
    </div>`;
  }).join('');

  const above = home.filter(m => m.attendance >= homeAvg);
  const below = home.filter(m => m.attendance < homeAvg);
  $('attendanceInsight').innerHTML = `A média em casa foi de <b>${Math.round(homeAvg).toLocaleString('pt-BR')} torcedores</b>; o maior público da campanha, entre jogos em casa e fora, foi <b>${biggest.attendance.toLocaleString('pt-BR')}</b>, contra o ${escapeHtml(biggest.opponent)} ${biggest.venue === 'Casa' ? 'em casa' : 'fora'} (${formatDate(biggest.date)}). ` +
    (above.length && below.length ? `Nos jogos em casa com público acima da média, o aproveitamento foi de <b>${pct(summarize(above).efficiency)}</b>; abaixo da média, <b>${pct(summarize(below).efficiency)}</b>.` : '');
  $('attendanceMethod').textContent = 'Público = ingressos vendidos, incluindo gratuidades, segundo os boletins financeiros das federações.' +
    (missing ? ` Sem dado de público em ${plural(missing, 'jogo', 'jogos')}: ${plural(noBoletim, 'sem boletim', 'sem boletim')} e ${plural(unreadable, 'com boletim sem dados legíveis', 'com boletim sem dados legíveis')}.` : '');
}

// ---------- Viagens ----------
const EARTH_RADIUS_KM = 6371;
function distanceKm(a, b) {
  const rad = (deg) => deg * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function travelData() {
  const located = matches.filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lon));
  const homeGame = located.find(m => m.venue === 'Casa' && m.city === mostCommon(located.filter(x => x.venue === 'Casa').map(x => x.city)));
  if (!homeGame) return null;
  const base = {lat: homeGame.lat, lon: homeGame.lon, city: homeGame.city, uf: homeGame.uf};
  const trips = located.filter(m => m.venue === 'Fora').map(m => ({m, km: Math.round(distanceKm(base, m) * 2)}));
  return {base, trips, located};
}

function renderTravelList() {
  const data = travelData();
  if (!data) {
    $('travelSummary').textContent = 'Coordenadas indisponíveis.';
    return;
  }
  const total = sum(data.trips, trip => trip.km);
  const longest = [...data.trips].sort((a, b) => b.km - a.km)[0];
  $('travelSummary').textContent = `${total.toLocaleString('pt-BR')} km percorridos em ${plural(data.trips.length, 'viagem', 'viagens')} a partir de ${data.base.city}` +
    (longest ? `; a mais longa foi até ${longest.m.city} (${longest.km.toLocaleString('pt-BR')} km, ida e volta).` : '.');
  $('travelList').innerHTML = data.trips.map(({m, km}) => `<li class="${m.result}">
    <span class="badge ${m.result}">${m.result}</span>
    <div><b>${escapeHtml(m.city)}/${escapeHtml(m.uf)}</b><small>J${m.round} · ${escapeHtml(m.opponent)} ${m.gf}×${m.ga} · ${escapeHtml(m.stadium)}</small></div>
    <em>${km.toLocaleString('pt-BR')} km</em>
  </li>`).join('');
}

let travelMap = null;
let travelTiles = null;
const tileUrl = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
  : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

function ensureTravelMap() {
  const data = travelData();
  const container = $('travelMap');
  if (!data) return;
  if (!window.L) {
    container.innerHTML = '<p class="empty-state">Mapa indisponível: a biblioteca de mapas não carregou (sem conexão?).</p>';
    return;
  }
  // O Leaflet precisa do contêiner visível para medir o tamanho: cria o mapa na primeira exibição.
  requestAnimationFrame(() => {
    if (!travelMap) {
      const css = getComputedStyle(document.documentElement);
      const color = {V: css.getPropertyValue('--win').trim(), E: css.getPropertyValue('--draw').trim(), D: css.getPropertyValue('--primary').trim()};
      travelMap = L.map(container, {scrollWheelZoom: false, attributionControl: true});
      travelTiles = L.tileLayer(tileUrl(), {maxZoom: 12, attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap'}).addTo(travelMap);
      const byCity = new Map();
      data.trips.forEach(trip => {
        const key = `${trip.m.city}/${trip.m.uf}`;
        if (!byCity.has(key)) byCity.set(key, []);
        byCity.get(key).push(trip);
      });
      byCity.forEach(trips => {
        const {m, km} = trips[0];
        L.polyline([[data.base.lat, data.base.lon], [m.lat, m.lon]], {color: css.getPropertyValue('--loss-strong').trim(), weight: 2, dashArray: '6 6'}).addTo(travelMap);
        const best = trips.some(t => t.m.result === 'V') ? 'V' : trips.some(t => t.m.result === 'E') ? 'E' : 'D';
        L.circleMarker([m.lat, m.lon], {radius: 7 + trips.length * 2, color: '#fff', weight: 2, fillColor: color[best], fillOpacity: .95})
          .bindPopup(`<b>${escapeHtml(m.city)}/${escapeHtml(m.uf)}</b> · ${km.toLocaleString('pt-BR')} km<br>${trips.map(t => `${escapeHtml(t.m.opponent)} ${t.m.gf}×${t.m.ga}`).join('<br>')}`)
          .addTo(travelMap);
      });
      L.circleMarker([data.base.lat, data.base.lon], {radius: 10, color: '#fff', weight: 3, fillColor: css.getPropertyValue('--secondary').trim() || '#0e773e', fillOpacity: 1})
        .bindPopup(`<b>${escapeHtml(data.base.city)}</b> · sede`).addTo(travelMap);
      travelMap.fitBounds(data.located.map(m => [m.lat, m.lon]), {padding: [30, 30]});
    } else {
      travelMap.invalidateSize();
    }
  });
}

$('themeToggle').addEventListener('click', () => { if (travelTiles) travelTiles.setUrl(tileUrl()); });

// ---------- Filtros e eventos ----------
function renderFiltered() {
  const list = filteredMatches();
  renderSummary(list);
  renderForm(list);
  renderHalves(list);
  renderMinutes(list);
  renderScorers(list);
  renderDiscipline(list);
  renderSquad(list);
  renderBench(list);
  renderTable(list);
  renderReferees(list);
}

function setupSegmented(containerId, onChange) {
  const buttons = document.querySelectorAll(`#${containerId} button`);
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    onChange(button.dataset.filter);
    renderFiltered();
  }));
}

setupSegmented('venueFilter', value => { venueFilter = value; });
setupSegmented('stageFilter', value => { stageFilter = value; });
$('matchSearch').addEventListener('input', () => renderTable(filteredMatches()));
$('matchesBody').addEventListener('click', event => {
  const row = event.target.closest('.match-row');
  if (row) toggleMatch(row.dataset.id);
});
$('squadToggle').addEventListener('click', () => {
  squadExpanded = !squadExpanded;
  renderSquad(filteredMatches());
});

$('leagueToggle').addEventListener('click', () => {
  leagueExpanded = !leagueExpanded;
  renderLeagueTable();
});
$('matchesDownload').addEventListener('click', () => {
  const ids = new Set(filteredMatches().map(m => m.id));
  downloadCsv(`${FILE_PREFIX}_jogos.csv`, DATA.principal.jogos.filter(row => ids.has(row.id_jogo)));
});
$('squadDownload').addEventListener('click', () => {
  downloadCsv(`${FILE_PREFIX}_elenco.csv`, squadStats(filteredMatches()).map(p => ({
    atleta: p.name, jogos: p.games, titular: p.starts, minutos: p.minutes, gols: p.goals, amarelos: p.yellows, vermelhos: p.reds
  })));
});

// Sem jogos encerrados não há o que analisar: mostra só o aviso e a data da estreia.
function renderNotStarted() {
  const next = DATA.principal.jogos
    .filter(row => row.status !== 'finished')
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`))[0];
  const debut = next ? ` A estreia será em ${formatDate(next.data)}, contra ${escapeHtml(next.adversario)}.` : '';
  $('mainNav').hidden = true;
  $('filterRow').hidden = true;
  document.querySelector('main').innerHTML = `<p class="empty-data">${escapeHtml(clubRef(true))} ainda não disputou jogos na ${escapeHtml(COMPETITION.nome)} ${COMPETITION.ano}.${debut} O painel será preenchido após o primeiro jogo encerrado.</p>`;
}

applyBranding();
setupThemeToggle();
if (SEASON_STARTED) {
  renderHeader();
  renderChart();
  renderVenue();
  renderJourney();
  renderHighlights();
  renderPerformance();
  renderOpponents();
  renderComparison();
  renderLeague();
  renderAttendance();
  renderTravelList();
  renderHome();
  renderFiltered();
  showPage(pageFromHash(), {scroll: false});
} else {
  renderNotStarted();
}
