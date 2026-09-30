// Dados de reserva: mantêm o painel funcional quando o CSV não pode ser carregado (ex.: file://).
// [data, adversário, mando, gols pró, gols contra, gols pró 1T, gols contra 1T, etapa, fase, rodada, estádio, amarelos, vermelhos]
const FALLBACK_MATCHES = [
  ['2026-04-04','Portuguesa-RJ','Fora',1,1,1,1,'Grupos','1ª fase','R1','Luso Brasileiro',4,0],
  ['2026-04-11','Pouso Alegre','Casa',3,0,1,0,'Grupos','1ª fase','R2','Canindé',4,0],
  ['2026-04-18','America-RJ','Fora',1,1,1,0,'Grupos','1ª fase','R3','Giulite Coutinho',2,0],
  ['2026-04-25','Água Santa','Fora',1,0,1,0,'Grupos','1ª fase','R4','Jardim Inamar',6,0],
  ['2026-05-02','Madureira','Casa',2,1,2,0,'Grupos','1ª fase','R5','Canindé',2,0],
  ['2026-05-09','Madureira','Fora',0,1,0,0,'Grupos','1ª fase','R6','Aniceto Moscoso',1,0],
  ['2026-05-16','Água Santa','Casa',0,0,0,0,'Grupos','1ª fase','R7','Canindé',0,0],
  ['2026-05-23','America-RJ','Casa',4,1,2,1,'Grupos','1ª fase','R8','Canindé',3,0],
  ['2026-05-30','Pouso Alegre','Fora',2,1,0,1,'Grupos','1ª fase','R9','Manduzão',3,0],
  ['2026-06-06','Portuguesa-RJ','Casa',2,0,0,0,'Grupos','1ª fase','R10','Canindé',3,0],
  ['2026-06-20','Sampaio Corrêa-RJ','Fora',1,1,0,0,'Mata-mata','2ª fase','Ida','Lourival Gomes',5,0],
  ['2026-06-27','Sampaio Corrêa-RJ','Casa',1,0,0,0,'Mata-mata','2ª fase','Volta','Canindé',2,0],
  ['2026-07-04','Marcílio Dias','Fora',1,1,1,1,'Mata-mata','3ª fase','Ida','Hercílio Luz',6,0],
  ['2026-07-11','Marcílio Dias','Casa',2,0,1,0,'Mata-mata','3ª fase','Volta','Canindé',2,0],
  ['2026-07-18','Uberlândia','Fora',0,2,0,1,'Mata-mata','Oitavas de final','Ida','Parque do Sabiá',3,1],
  ['2026-07-25','Uberlândia','Casa',1,0,0,0,'Mata-mata','Oitavas de final','Volta','Canindé',2,0]
];
// [posição, time, pontos, jogos, vitórias, empates, derrotas, gols pró, gols contra, é a Portuguesa]
const FALLBACK_GROUP = [
  [1,'Portuguesa',21,10,6,3,1,16,6,1],
  [2,'Água Santa',17,10,5,2,3,16,8,0],
  [3,'Portuguesa-RJ',14,10,3,5,2,14,9,0],
  [4,'America-RJ',12,10,3,3,4,11,21,0],
  [5,'Madureira',11,10,3,2,5,11,16,0],
  [6,'Pouso Alegre',7,10,2,1,7,6,14,0]
];
const FALLBACK_GROUP_NAME = 'A13';
// Na Série D 2026, os quatro primeiros de cada grupo avançam à 2ª fase.
const GROUP_QUALIFIERS = 4;

const resultOf = (gf, ga) => gf > ga ? 'V' : gf < ga ? 'D' : 'E';
const pointsOf = (result) => result === 'V' ? 3 : result === 'E' ? 1 : 0;
const toNumber = (value) => value === '' || value === undefined || value === null ? NaN : Number(value);

function buildMatch(data, index) {
  const result = data.result || resultOf(data.gf, data.ga);
  return {
    ...data,
    round: index + 1,
    result,
    points: pointsOf(result),
    shGf: data.gf - data.htGf,
    shGa: data.ga - data.htGa
  };
}

let matches = FALLBACK_MATCHES.map((m, i) => buildMatch({
  date: m[0], opponent: m[1], venue: m[2], gf: m[3], ga: m[4], htGf: m[5], htGa: m[6],
  stage: m[7], phase: m[8], leg: m[9], stadium: m[10], yellows: m[11], reds: m[12],
  penGf: NaN, penGa: NaN
}, i));
let groupName = FALLBACK_GROUP_NAME;
let groupTable = FALLBACK_GROUP.map(g => ({pos: g[0], team: g[1], points: g[2], games: g[3], wins: g[4], draws: g[5], losses: g[6], gf: g[7], ga: g[8], own: g[9] === 1}));

const $ = (id) => document.getElementById(id);
const pct = (n) => `${n.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`;
const decimal = (n) => n.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const formatDate = (date) => new Intl.DateTimeFormat('pt-BR', {day: '2-digit', month: 'short'}).format(new Date(`${date}T12:00:00`)).replace('.', '');
const plural = (value, singular, pluralForm) => `${value} ${value === 1 ? singular : pluralForm}`;
const signedNumber = (value) => (value > 0 ? '+' : '') + value;
const score = (a, b) => `${a} <i>×</i> ${b}`;
let activeFilter = 'Todos';

const PHASE_SHORT = {'1ª fase': '1ª fase', '2ª fase': '2ª fase', '3ª fase': '3ª fase', 'Oitavas de final': 'Oitavas', 'Quartas de final': 'Quartas', 'Semifinal': 'Semifinal', 'Final': 'Final'};
const PHASE_WITH_ARTICLE = {'1ª fase': 'na 1ª fase', '2ª fase': 'na 2ª fase', '3ª fase': 'na 3ª fase', 'Oitavas de final': 'nas oitavas de final', 'Quartas de final': 'nas quartas de final', 'Semifinal': 'na semifinal', 'Final': 'na final'};
const PHASE_DESTINATION = {'2ª fase': 'à 2ª fase', '3ª fase': 'à 3ª fase', 'Oitavas de final': 'às oitavas', 'Quartas de final': 'às quartas', 'Semifinal': 'à semifinal', 'Final': 'à final'};
const listJoin = (items) => items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items.join('');

function summarize(list) {
  const wins = list.filter(m => m.result === 'V').length;
  const draws = list.filter(m => m.result === 'E').length;
  const losses = list.filter(m => m.result === 'D').length;
  const points = list.reduce((sum, m) => sum + m.points, 0);
  const gf = list.reduce((sum, m) => sum + m.gf, 0);
  const ga = list.reduce((sum, m) => sum + m.ga, 0);
  const max = list.length * 3;
  return { games: list.length, wins, draws, losses, points, gf, ga, max, efficiency: max ? points / max * 100 : 0, ppg: list.length ? points / list.length : 0 };
}

// Agrupa os jogos de mata-mata em confrontos de ida e volta.
function getTies() {
  const ties = [];
  matches.filter(m => m.stage === 'Mata-mata').forEach(match => {
    let tie = ties.find(t => t.phase === match.phase);
    if (!tie) ties.push(tie = {phase: match.phase, opponent: match.opponent, legs: []});
    tie.legs.push(match);
  });
  return ties.map(tie => {
    const gf = tie.legs.reduce((sum, m) => sum + m.gf, 0);
    const ga = tie.legs.reduce((sum, m) => sum + m.ga, 0);
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

function getOutcome() {
  const ties = getTies();
  const own = groupTable.find(team => team.own);
  if (!ties.length) {
    if (own && own.games && own.pos > GROUP_QUALIFIERS) return {label: 'Eliminada na 1ª fase', finished: true};
    return {label: 'Em andamento', finished: false};
  }
  const last = ties.at(-1);
  if (last.status === 'eliminated') {
    const label = last.phase === 'Final' ? 'Vice-campeã' : `Eliminada ${PHASE_WITH_ARTICLE[last.phase] || 'no mata-mata'}`;
    return {label, finished: true, phase: last.phase};
  }
  if (last.status === 'advanced' && last.phase === 'Final') return {label: 'Campeã', finished: true};
  return {label: 'Em andamento', finished: false};
}

function renderHeader() {
  $('headerStartDate').textContent = formatDate(matches[0].date);
  $('headerEndDate').textContent = formatDate(matches.at(-1).date);
  $('headerGames').textContent = matches.length;
  $('headerOutcome').textContent = getOutcome().label;
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
  $('resultDonut').style.background = `conic-gradient(var(--green) 0 ${winDeg}deg, var(--gold) ${winDeg}deg ${winDeg + drawDeg}deg, #b9b6b0 ${winDeg + drawDeg}deg 360deg)`;
  $('filterContext').textContent = activeFilter === 'Todos' ? 'Visão geral da campanha' : `${s.games} partidas como ${activeFilter === 'Casa' ? 'mandante' : 'visitante'}`;
}

function renderChart(list) {
  if (!list.length) return;
  const w = 700, h = 285, pad = {l: 36, r: 16, t: 26, b: 32};
  let acc = 0;
  const points = list.map(m => ({x: m.round, y: (acc += m.points)}));
  const pace = matches.length * 1.5;
  const maxY = Math.max(10, Math.ceil(Math.max(points.at(-1).y, pace) / 10) * 10);
  const xAt = (round) => pad.l + (round - 1) / Math.max(matches.length - 1, 1) * (w - pad.l - pad.r);
  const yAt = (value) => h - pad.b - value / maxY * (h - pad.t - pad.b);
  const actualPath = points.map((p, i) => `${i ? 'L' : 'M'} ${xAt(p.x).toFixed(1)} ${yAt(p.y).toFixed(1)}`).join(' ');
  const pacePath = `M ${xAt(1)} ${yAt(1.5)} L ${xAt(matches.length)} ${yAt(pace)}`;
  const grid = [0, .25, .5, .75, 1].map(f => {
    const y = yAt(maxY * f), val = Math.round(maxY * f);
    return `<line x1="${pad.l}" y1="${y}" x2="${w-pad.r}" y2="${y}" stroke="#e4ded4" stroke-width="1"/><text x="0" y="${y+4}" fill="#89847c" font-size="10">${val}</text>`;
  }).join('');
  const area = `${actualPath} L ${xAt(points.at(-1).x)} ${h-pad.b} L ${xAt(points[0].x)} ${h-pad.b} Z`;
  const step = matches.length <= 20 ? 1 : 2;
  const ticks = matches.filter(m => (m.round - 1) % step === 0 || m.round === matches.length)
    .map(m => `<text x="${xAt(m.round)}" y="${h-7}" text-anchor="middle" fill="#89847c" font-size="10">J${m.round}</text>`).join('');
  const firstKnockout = matches.find(m => m.stage === 'Mata-mata');
  const stageDivider = firstKnockout && firstKnockout.round > 1 ? (() => {
    const x = (xAt(firstKnockout.round - 1) + xAt(firstKnockout.round)) / 2;
    return `<line x1="${x}" y1="${pad.t - 14}" x2="${x}" y2="${h - pad.b}" stroke="#c9c5bd" stroke-width="1" stroke-dasharray="3 4"/>
      <text x="${x - 8}" y="${pad.t - 16}" text-anchor="end" fill="#89847c" font-size="9" font-weight="800" letter-spacing="1">FASE DE GRUPOS</text>
      <text x="${x + 8}" y="${pad.t - 16}" fill="#89847c" font-size="9" font-weight="800" letter-spacing="1">MATA-MATA</text>`;
  })() : '';
  $('pointsChart').innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e31e27" stop-opacity=".16"/><stop offset="1" stop-color="#e31e27" stop-opacity="0"/></linearGradient></defs>
    ${grid}${stageDivider}<path d="${pacePath}" fill="none" stroke="#a9a39a" stroke-width="2" stroke-dasharray="6 7"/>
    <path d="${area}" fill="url(#areaFill)"/><path d="${actualPath}" fill="none" stroke="#e31e27" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p,i) => `<circle cx="${xAt(p.x)}" cy="${yAt(p.y)}" r="${i===points.length-1?5:2.4}" fill="${i===points.length-1?'#fff':'#e31e27'}" stroke="#e31e27" stroke-width="${i===points.length-1?3:0}"><title>Jogo ${p.x}: ${p.y} pontos</title></circle>`).join('')}
    ${ticks}
    <g transform="translate(${xAt(points.at(-1).x)-45},${yAt(points.at(-1).y)+9})"><rect width="51" height="26" rx="8" fill="#e31e27"/><text x="25.5" y="17" fill="white" text-anchor="middle" font-size="11" font-weight="800">${points.at(-1).y} pts</text></g>
    <g transform="translate(${xAt(matches.length)-111},${yAt(pace)-33})"><rect width="59" height="22" rx="7" fill="#fff" stroke="#aaa6a0"/><text x="29.5" y="15" fill="#77736d" text-anchor="middle" font-size="9" font-weight="700">${pace.toLocaleString('pt-BR')} pts</text></g>
  </svg>`;
  const full = summarize(matches);
  const delta = full.points - pace;
  $('chartCurrentPoints').textContent = `${full.points} pts`;
  $('chartPacePoints').textContent = `${pace.toLocaleString('pt-BR')} pts`;
  $('chartGap').textContent = `${delta > 0 ? '+' : ''}${delta.toLocaleString('pt-BR')} pts`;
  $('chartGapCard').classList.toggle('positive', delta >= 0);
  $('chartInsight').innerHTML = `Em ${plural(matches.length, 'jogo', 'jogos')}, a Portuguesa ficou <b>${plural(Math.abs(delta), 'ponto', 'pontos')} ${delta >= 0 ? 'acima' : 'abaixo'}</b> do ritmo de 50% de aproveitamento. ` +
    'No mata-mata os pontos não valem classificação; aqui eles medem o rendimento em cada partida.';
}

function renderForm(list) {
  const recent = list.slice(-5);
  $('recentForm').innerHTML = recent.map(m => `<i class="${m.result}" title="${m.opponent}: ${m.gf} x ${m.ga}">${m.result}</i>`).join('');
  const points = recent.reduce((s,m) => s + m.points, 0);
  $('recentPoints').textContent = `${points}/${recent.length * 3} pts`;
}

function mostCommon(values) {
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function renderVenue() {
  const home = summarize(matches.filter(m => m.venue === 'Casa'));
  const away = summarize(matches.filter(m => m.venue === 'Fora'));
  const homeStadium = mostCommon(matches.filter(m => m.venue === 'Casa').map(m => m.stadium)) || 'casa';
  const card = (name, subtitle, icon, s, cls='') => {
    const goalDiff = s.gf - s.ga;
    return `<article class="venue-card ${cls}">
      <div class="venue-card-head"><div><i>${icon}</i><span><b>${name}</b><small>${subtitle}</small></span></div><strong>${pct(s.efficiency)}</strong></div>
      <div class="venue-progress"><i style="width:${s.efficiency}%"></i></div>
      <div class="venue-stats">
        <div><span>Pontos</span><b>${s.points}</b></div>
        <div><span>Por jogo</span><b>${decimal(s.ppg)}</b></div>
        <div><span>Saldo</span><b>${signedNumber(goalDiff)}</b></div>
      </div>
      <div class="venue-record"><span><b>${s.wins}</b> ${s.wins === 1 ? 'vitória' : 'vitórias'}</span><span><b>${s.draws}</b> ${s.draws === 1 ? 'empate' : 'empates'}</span><span><b>${s.losses}</b> ${s.losses === 1 ? 'derrota' : 'derrotas'}</span></div>
    </article>`;
  };
  const totalPoints = home.points + away.points;
  const homeShare = totalPoints ? home.points / totalPoints * 100 : 0;
  const awayShare = 100 - homeShare;
  $('venueComparison').innerHTML = `
    <div class="venue-cards">${card('Em casa', `No ${homeStadium}`, 'C', home)}${card('Como visitante', `Fora do ${homeStadium}`, 'F', away, 'away')}</div>
    <div class="venue-deep-dive">
      <div class="points-origin">
        <div class="venue-detail-head"><span>ORIGEM DOS ${totalPoints} PONTOS</span><b>${pct(homeShare)} em casa</b></div>
        <div class="split-points"><i style="width:${homeShare}%"></i><i style="width:${awayShare}%"></i></div>
        <div class="split-labels"><span><b>${home.points}</b> casa</span><span><b>${away.points}</b> fora</span></div>
      </div>
      <div class="goal-balance">
        <div class="venue-detail-head"><span>BALANÇO DE GOLS</span><b>${home.gf + away.gf} marcados</b></div>
        <div class="goal-balance-rows">
          <span><i class="home-dot"></i>Casa <b>${home.gf} pró · ${home.ga} contra</b></span>
          <span><i></i>Fora <b>${away.gf} pró · ${away.ga} contra</b></span>
        </div>
      </div>
    </div>`;
  const better = home.efficiency >= away.efficiency ? ['em casa', home, away] : ['fora de casa', away, home];
  $('venueInsight').innerHTML = `<span>LEITURA DO MANDO</span><p>A Portuguesa rende melhor <b>${better[0]}</b>: são <strong>${pct(Math.abs(better[1].efficiency - better[2].efficiency))}</strong> pontos percentuais de diferença.</p>`;
}

function legDescription(match) {
  const kind = {V: 'vitória', E: 'empate', D: 'derrota'}[match.result];
  return `${kind} ${match.venue === 'Casa' ? 'em casa' : 'fora'} (${match.gf} × ${match.ga})`;
}

function winsPhrase(summary) {
  if (!summary.games) return 'nenhum jogo';
  const wins = summary.wins === 0 ? 'nenhuma vitória' : plural(summary.wins, 'vitória', 'vitórias');
  return `${wins} em ${plural(summary.games, 'jogo', 'jogos')}`;
}

function renderJourney() {
  const own = groupTable.find(team => team.own);
  const groupMatches = matches.filter(m => m.stage === 'Grupos');
  const groupSummary = summarize(groupMatches);
  const ties = getTies();
  const cards = [];

  if (groupMatches.length) {
    const qualified = own ? own.pos <= GROUP_QUALIFIERS : false;
    const rows = groupTable.map(team => `<tr class="${team.own ? 'own' : ''} ${team.pos <= GROUP_QUALIFIERS ? 'qualified' : ''}">
      <td>${team.pos}</td><td>${team.team}</td><td>${team.points}</td><td>${team.games}</td><td>${signedNumber(team.gf - team.ga)}</td>
    </tr>`).join('');
    cards.push(`<article class="journey-card group-card">
      <div class="journey-card-head"><span>1ª fase · Grupo ${groupName}</span><i>${own ? `${own.pos}º` : '—'}</i></div>
      <div class="journey-value"><strong>${groupSummary.points} pts</strong><em class="${qualified ? 'advanced' : 'eliminated'}">${qualified ? 'CLASSIFICADA' : 'ELIMINADA'}</em></div>
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
    const label = {advanced: 'CLASSIFICADA', eliminated: 'ELIMINADA', pending: 'EM DISPUTA'}[tie.status];
    const icon = {advanced: '✓', eliminated: '×', pending: '…'}[tie.status];
    const legs = tie.legs.map(leg => `<div class="tie-leg ${leg.result}">
      <span>${leg.leg} · ${leg.venue}</span><b>${score(leg.gf, leg.ga)}</b><small>${formatDate(leg.date)} · ${leg.stadium}</small>
    </div>`).join('');
    const penalties = tie.hasPenalties ? ` Nos pênaltis: ${tie.penGf} × ${tie.penGa}.` : '';
    const note = tie.legs.length >= 2
      ? `${legDescription(tie.legs[0]).replace(/^./, c => c.toUpperCase())} e ${legDescription(tie.legs[1])}.${penalties}`
      : 'Confronto em andamento.';
    cards.push(`<article class="journey-card tie-card ${tie.status}">
      <div class="journey-card-head"><span>${tie.phase}</span><i>${icon}</i></div>
      <div class="tie-opponent"><small>Adversário</small><b>${tie.opponent}</b></div>
      <div class="journey-value"><strong>${score(tie.gf, tie.ga)}</strong><em class="${tie.status}">${label}</em></div>
      <div class="tie-legs">${legs}</div>
      <p>${note}</p>
    </article>`);
  });
  $('journeyGrid').innerHTML = cards.join('');

  const outcome = getOutcome();
  const passed = ties.filter(t => t.status === 'advanced').map(t => t.opponent);
  const lost = ties.find(t => t.status === 'eliminated');
  const groupText = own ? `${own.pos}ª colocada do Grupo ${groupName} com ${own.points} pontos` : 'Após a fase de grupos';
  let path = '';
  if (passed.length) path += `, a Portuguesa passou por ${listJoin(passed)}`;
  if (lost) path += `${passed.length ? ' e' : ', a Portuguesa'} caiu diante do ${lost.opponent} ${PHASE_WITH_ARTICLE[lost.phase] || 'no mata-mata'}`;
  $('journeySummary').textContent = `${groupText}${path}.`;
  $('journeyTitle').textContent = outcome.phase && PHASE_DESTINATION[outcome.phase] ? `Do grupo ${PHASE_DESTINATION[outcome.phase]}` : 'Caminho na competição';

  const knockout = matches.filter(m => m.stage === 'Mata-mata');
  if (knockout.length) {
    const home = summarize(knockout.filter(m => m.venue === 'Casa'));
    const away = summarize(knockout.filter(m => m.venue === 'Fora'));
    $('journeyInsight').hidden = false;
    $('journeyInsight').innerHTML = `<span>LEITURA DO MATA-MATA</span><p>Em casa, foram <b>${winsPhrase(home)}</b>; fora, <b>${winsPhrase(away)}</b> ` +
      `(${away.draws} ${away.draws === 1 ? 'empate' : 'empates'} e ${away.losses} ${away.losses === 1 ? 'derrota' : 'derrotas'}). ` +
      `No agregado do mata-mata, a Portuguesa marcou <strong>${home.gf + away.gf}</strong> e sofreu <strong>${home.ga + away.ga}</strong>.</p>`;
  } else {
    $('journeyInsight').hidden = true;
  }
}

function renderHighlights() {
  const s = summarize(matches);
  const byMargin = [...matches].sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const bestWin = byMargin.find(m => m.result === 'V');
  const worstLoss = [...byMargin].reverse().find(m => m.result === 'D');
  const scoredIn = matches.filter(m => m.gf > 0).length;
  const yellows = matches.reduce((sum, m) => sum + (Number.isFinite(m.yellows) ? m.yellows : 0), 0);
  const reds = matches.reduce((sum, m) => sum + (Number.isFinite(m.reds) ? m.reds : 0), 0);
  const hasCards = matches.some(m => Number.isFinite(m.yellows));
  const matchNote = (m) => `J${m.round} · ${m.venue === 'Casa' ? 'em casa' : 'fora'} · ${formatDate(m.date)}`;
  const items = [
    bestWin && {label: 'Maior vitória', value: `${bestWin.gf} × ${bestWin.ga}`, detail: `${bestWin.opponent}`, note: matchNote(bestWin), tone: 'win'},
    worstLoss && {label: 'Derrota mais pesada', value: `${worstLoss.gf} × ${worstLoss.ga}`, detail: `${worstLoss.opponent}`, note: matchNote(worstLoss), tone: 'loss'},
    {label: 'Gols marcados por jogo', value: decimal(s.games ? s.gf / s.games : 0), detail: `${s.gf} gols`, note: `marcou em ${scoredIn} de ${s.games} jogos`},
    {label: 'Gols sofridos por jogo', value: decimal(s.games ? s.ga / s.games : 0), detail: `${s.ga} gols`, note: `${pct(s.games ? (s.games - matches.filter(m => m.ga > 0).length) / s.games * 100 : 0)} dos jogos sem sofrer gol`},
    hasCards && {label: 'Cartões', value: `${yellows}`, detail: `amarelos · ${plural(reds, 'vermelho', 'vermelhos')}`, note: `${decimal(s.games ? yellows / s.games : 0)} amarelos por jogo`}
  ].filter(Boolean);
  $('highlightsCount').textContent = plural(s.games, 'jogo', 'jogos');
  $('highlightsList').innerHTML = items.map(item => `<div class="highlight-row ${item.tone || ''}">
    <div><span>${item.label}</span><small>${item.note}</small></div>
    <div><b>${item.value}</b><small>${item.detail}</small></div>
  </div>`).join('');
}

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
  $('gameStrip').innerHTML = matches.map(match => `<div class="game-tile ${match.result}" title="J${match.round} · ${match.phase} ${match.leg} · ${match.opponent} · ${match.gf} x ${match.ga}">
    <span>J${String(match.round).padStart(2, '0')}</span><strong>${match.result}</strong>
  </div>`).join('');

  const group = matches.filter(m => m.stage === 'Grupos');
  const knockout = matches.filter(m => m.stage === 'Mata-mata');
  const half = Math.ceil(group.length / 2);
  const periods = [
    {label: 'Grupo · turno', list: group.slice(0, half)},
    {label: 'Grupo · returno', list: group.slice(half)},
    {label: 'Mata-mata', list: knockout}
  ].filter(period => period.list.length);
  const periodData = periods.map(period => ({...period, summary: summarize(period.list)}));
  const best = Math.max(...periodData.map(period => period.summary.efficiency));
  $('periodGrid').innerHTML = periodData.map(period => `<div class="period-card ${period.summary.efficiency === best ? 'best' : ''}">
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
  const totals = valid.reduce((acc, match) => {
    acc.htGf += match.htGf;
    acc.htGa += match.htGa;
    acc.shGf += match.shGf;
    acc.shGa += match.shGa;
    acc.htPoints += pointsOf(resultOf(match.htGf, match.htGa));
    acc.finalPoints += match.points;
    const before = pointsOf(resultOf(match.htGf, match.htGa));
    const after = match.points;
    if (after > before) acc.improved += 1;
    if (after < before) acc.worsened += 1;
    return acc;
  }, {htGf: 0, htGa: 0, shGf: 0, shGa: 0, htPoints: 0, finalPoints: 0, improved: 0, worsened: 0});

  const totalScored = totals.htGf + totals.shGf;
  const maxGoals = Math.max(totals.htGf, totals.htGa, totals.shGf, totals.shGa, 1);
  const firstBalance = totals.htGf - totals.htGa;
  const secondBalance = totals.shGf - totals.shGa;
  const pointsSwing = totals.finalPoints - totals.htPoints;
  const unchanged = valid.length - totals.improved - totals.worsened;
  const gameCount = value => plural(value, 'jogo', 'jogos');
  const improvedText = gameCount(totals.improved) + (totals.improved === 1 ? ' melhorou' : ' melhoraram');
  const worsenedText = gameCount(totals.worsened) + (totals.worsened === 1 ? ' piorou' : ' pioraram');
  const unchangedText = gameCount(unchanged) + (unchanged === 1 ? ' manteve' : ' mantiveram');
  const pointsSwingText = signedNumber(pointsSwing) + (Math.abs(pointsSwing) === 1 ? ' ponto' : ' pontos');
  const productive = totals.htGf === totals.shGf ? 'Equilibrado' : totals.htGf > totals.shGf ? '1º tempo' : '2º tempo';
  const vulnerable = totals.htGa === totals.shGa ? 'Equilibrado' : totals.htGa > totals.shGa ? '1º tempo' : '2º tempo';

  $('firstHalfFor').textContent = totals.htGf;
  $('firstHalfAgainst').textContent = totals.htGa;
  $('secondHalfFor').textContent = totals.shGf;
  $('secondHalfAgainst').textContent = totals.shGa;
  $('firstHalfShare').textContent = pct(totalScored ? totals.htGf / totalScored * 100 : 0);
  $('secondHalfShare').textContent = pct(totalScored ? totals.shGf / totalScored * 100 : 0);
  setHalfBalance('firstHalfBalance', firstBalance);
  setHalfBalance('secondHalfBalance', secondBalance);
  $('firstForBar').style.width = (totals.htGf / maxGoals * 100) + '%';
  $('firstAgainstBar').style.width = (totals.htGa / maxGoals * 100) + '%';
  $('secondForBar').style.width = (totals.shGf / maxGoals * 100) + '%';
  $('secondAgainstBar').style.width = (totals.shGa / maxGoals * 100) + '%';
  $('productiveHalf').textContent = productive;
  $('vulnerableHalf').textContent = vulnerable;
  $('improvedResults').innerHTML = '<em class="change-up">' + improvedText + '</em>' +
    '<i>•</i><em class="change-down">' + worsenedText + '</em>';
  $('unchangedResults').textContent = unchangedText + ' o mesmo resultado';
  $('pointsSwing').textContent = pointsSwingText;

  $('halvesInsight').innerHTML = 'Em <b>' + gameCount(totals.improved) + '</b>, a Portuguesa terminou melhor do que estava no intervalo; ' +
    'em <b>' + gameCount(totals.worsened) + '</b>, terminou pior; e em <b>' + gameCount(unchanged) + '</b>, manteve a mesma situação. ' +
    'O saldo dessas mudanças foi de <b>' + pointsSwingText + '</b>.';
}

function renderTable(list) {
  let accumulated = 0;
  const accumulatedByRound = new Map(matches.map(m => [m.round, (accumulated += m.points)]));
  const term = $('matchSearch').value.trim().toLocaleLowerCase('pt-BR');
  const visible = list.filter(m => m.opponent.toLocaleLowerCase('pt-BR').includes(term));
  const resultName = {V: 'Vitória', E: 'Empate', D: 'Derrota'};
  $('matchesBody').innerHTML = visible.map(m => `<tr class="row-${m.result}">
    <td><span class="round-number">${String(m.round).padStart(2,'0')}</span></td><td class="date-cell">${formatDate(m.date)}</td>
    <td><div class="phase-cell"><b>${PHASE_SHORT[m.phase] || m.phase}</b><span>${m.leg}</span></div></td>
    <td><div class="fixture"><span>Portuguesa</span><strong>${m.gf} <i>×</i> ${m.ga}</strong><span>${m.opponent}</span></div></td>
    <td><span class="venue-tag ${m.venue.toLowerCase()}">${m.venue}</span></td>
    <td><div class="result-cell"><span class="badge ${m.result}">${m.result}</span><b>${resultName[m.result]}</b></div></td>
    <td><span class="points-pill ${m.result}">+${m.points}</span></td>
    <td><div class="accumulated"><b>${accumulatedByRound.get(m.round)}</b><span>pts</span></div></td>
  </tr>`).join('');
  $('emptyState').hidden = visible.length > 0;
}

function applyFilter(filter) {
  activeFilter = filter;
  const list = filter === 'Todos' ? matches : matches.filter(m => m.venue === filter);
  renderSummary(list);
  renderForm(list);
  renderHalves(list);
  renderTable(list);
}

document.querySelectorAll('#venueFilter button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('#venueFilter button').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  applyFilter(button.dataset.filter);
}));
$('matchSearch').addEventListener('input', () => applyFilter(activeFilter));

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(header => header.trim().replace(/^﻿/, ''));
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

async function readCsv(embedded, file) {
  if (embedded) return embedded;
  const response = await fetch(file, {cache: 'no-store'});
  return response.ok ? response.text() : '';
}

async function loadCsv() {
  try {
    const [matchesText, groupText] = await Promise.all([
      readCsv(window.__PORTUGUESA_CSV__, 'portuguesa_serie_d_2026_todos_jogos.csv'),
      readCsv(window.__PORTUGUESA_GRUPO_CSV__, 'portuguesa_serie_d_2026_grupo.csv')
    ]);
    const records = matchesText ? parseCsv(matchesText).filter(row => row.status === 'finished' && ['V','E','D'].includes(row.resultado)) : [];
    if (records.length) {
      matches = records.map((row, index) => buildMatch({
        date: row.data,
        opponent: row.adversario,
        venue: row.mando,
        gf: Number(row.gols_portuguesa),
        ga: Number(row.gols_adversario),
        htGf: toNumber(row.gols_1t_portuguesa),
        htGa: toNumber(row.gols_1t_adversario),
        result: row.resultado,
        stage: row.etapa,
        phase: row.fase,
        leg: row.rodada,
        stadium: row.estadio,
        yellows: toNumber(row.amarelos_portuguesa),
        reds: toNumber(row.vermelhos_portuguesa),
        penGf: toNumber(row.penaltis_portuguesa),
        penGa: toNumber(row.penaltis_adversario)
      }, index));
      groupName = records.find(row => row.etapa === 'Grupos')?.grupo || groupName;
    }
    const groupRows = groupText ? parseCsv(groupText) : [];
    if (groupRows.length) {
      groupTable = groupRows.map(row => ({
        pos: Number(row.posicao), team: row.time, points: Number(row.pontos), games: Number(row.jogos),
        wins: Number(row.vitorias), draws: Number(row.empates), losses: Number(row.derrotas),
        gf: Number(row.gols_pro), ga: Number(row.gols_contra), own: row.portuguesa === '1'
      }));
    }
  } catch (_) {
    // Em file://, o navegador bloqueia fetch local; os dados incorporados acima mantêm o painel funcional.
  }
}

function renderAll() {
  renderHeader();
  applyFilter('Todos');
  renderChart(matches);
  renderVenue();
  renderJourney();
  renderHighlights();
  renderPerformance();
}

loadCsv().finally(renderAll);
