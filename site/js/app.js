// 29N · UI controller. All state lives in memory only: nothing is written to browser
// storage, cookies or any server. Network requests: bundle.json, logo credits and the
// site's own reference pages and images.
import { STRINGS } from './i18n.js';
import { computeMatch, sortByAgreement, shuffle, cryptoRandom, DEFAULT_WEIGHT } from './match.js';
import { REPO_URL, applyLang, fetchReference, renderCoverage } from './reference.js';
import { TOPIC_STYLE, topicIcon, topicIconDataUrl, topicVars } from './topics.js';
import { drawCard, prepareCardData, downloadPdf, shareImage } from './share.js';

const app = document.getElementById('app');
// Topic weights (option B chosen by the owner): less ×0.5, same ×1, more ×2.
const WEIGHT_LEVELS = [0.5, 1, 2];
const IMPORTANT = 2;
const MONO = { pp: 'PP', psoe: 'PSOE', vox: 'VOX', 'frente-amplio': 'FA', podemos: 'POD', erc: 'ERC', junts: 'JxC', 'eh-bildu': 'EHB', pnv: 'PNV', bng: 'BNG', cc: 'CC', compromis: 'COM', salf: 'SALF' };

const state = {
  lang: initialLang(),
  data: null,
  logos: {},
  step: 'home', // home | province | question | weights | results | party
  province: '',
  statementOrder: [],
  partyOrder: [],
  topicOrder: [],
  idx: 0,
  answers: {},
  weights: {},
  open: null, // 'simple' | 'context' | null: which explainer is open on the current question
  excludeLow: false,
  sortByMatch: false,
  showAll: false,
  editing: false,
  autoAdvance: true,
  partyId: null,
  ref: null,
  refFocused: false,
};
let lastPointer = -Infinity;
let lastKey = -Infinity;

function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  return q === 'en' ? 'en' : 'es';
}

// ---------- helpers
const t = (key) => STRINGS[state.lang][key];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const loc = (obj) => (!obj ? '' : typeof obj === 'string' ? obj : obj[state.lang] || obj.es || '');
const pct = (x) => `${Math.round(x * 100)}%`;
const statementById = (id) => state.data.statements.find((s) => s.id === id);
const topicById = (id) => state.data.topics.find((x) => x.id === id);
const partyById = (id) => state.data.parties.find((p) => p.id === id);
const hasAnswers = () => Object.values(state.answers).some((v) => v !== null && v !== undefined);
const answeredCount = () => Object.values(state.answers).filter((v) => v !== null && v !== undefined).length;
const ICON = {
  arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1.3 1.8 1.4 2.9h5.2c.1-1.1.6-2.1 1.4-2.9A6 6 0 0 0 12 3z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  partial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 10c2.3-2 4.7-2 7 0s4.7 2 7 0M5 15c2.3-2 4.7-2 7 0s4.7 2 7 0"/></svg>',
  q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3M12 17.5v.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/></svg>',
};

function logoHtml(p, cls = 'plogo') {
  const l = state.logos[p.id];
  if (l) return `<span class="${cls}"><img src="img/parties/${esc(l)}" alt="" loading="lazy"></span>`;
  const m = MONO[p.id] || p.name.slice(0, 3);
  return `<span class="${cls} mono" style="font-size:${m.length > 3 ? '.78rem' : '.95rem'}" aria-hidden="true">${esc(m)}</span>`;
}

function candidacies() {
  return state.data.candidacies;
}
function partiesInProvince(prov = state.province) {
  const c = candidacies();
  if (!prov || !c?.by_province?.[prov]) return null;
  return new Set(c.by_province[prov]);
}
function provinceName(id) {
  return state.data.provinces.find((p) => p.id === id)?.name || '';
}

// ---------- data
async function load() {
  app.innerHTML = `<div class="wrap"><p role="status">${esc(t('loading'))}</p></div>`;
  try {
    const res = await fetch('data/bundle.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
  } catch {
    app.innerHTML = `<div class="wrap"><p role="alert">${esc(t('loadError'))}</p></div>`;
    return;
  }
  try {
    const res = await fetch('img/parties/credits.json', { cache: 'no-cache' });
    if (res.ok) {
      const credits = await res.json();
      for (const [id, c] of Object.entries(credits)) if (c && c.file && !c.missing) state.logos[id] = c.file;
    }
  } catch {
    /* monograms are used when logos are unavailable */
  }
  // Randomise once per visit: statement, party and topic order.
  state.statementOrder = shuffle(state.data.statements.map((s) => s.id), cryptoRandom);
  state.partyOrder = shuffle(state.data.parties.map((p) => p.id), cryptoRandom);
  state.topicOrder = topicOrderFromStatements();
  for (const tp of state.data.topics) state.weights[tp.id] = DEFAULT_WEIGHT;
  history.replaceState({ step: 'home' }, '', location.href.split('#')[0]);
  render();
}

function topicOrderFromStatements() {
  const seen = [];
  for (const id of state.statementOrder) {
    const tp = statementById(id).topic;
    if (!seen.includes(tp)) seen.push(tp);
  }
  return seen;
}

// ---------- navigation (history-aware: the browser Back button steps back through screens)
function go(step, opts = {}) {
  const { fromHistory, ...rest } = opts;
  Object.assign(state, rest);
  state.step = step;
  state.open = null;
  if (!fromHistory) history.pushState({ step, idx: state.idx, partyId: state.partyId }, '', location.href.split('#')[0]);
  render();
  focusMain();
  window.scrollTo({ top: 0 });
}

function focusMain() {
  const el = app.querySelector('[data-focus]') || app.querySelector('h1, h2');
  if (el) {
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
}

window.addEventListener('popstate', (e) => {
  const s = e.state || { step: 'home' };
  if (!state.data) return;
  if (s.ref) {
    state.ref = s.ref;
    state.refFocused = false;
    render();
    return;
  }
  state.ref = null;
  go(s.step || 'home', { idx: s.idx ?? state.idx, partyId: s.partyId ?? state.partyId, fromHistory: true });
});

// ---------- views
function viewHome() {
  const e = state.data.election;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  const days = Math.round((Date.parse(e.date) - Date.parse(today)) / 86400000);
  const count = days > 0 ? `<b>${days}</b>${esc(t('daysLeft')(days))}` : days === 0 ? `<b>!</b>${esc(t('electionToday'))}` : esc(t('electionPast'));
  const tiles = state.data.topics
    .map((tp) => `<div class="tile" style="${topicVars(tp.id)}" title="${esc(loc(tp.label))}">${topicIcon(tp.id)}<span>${esc(loc(tp.label))}</span></div>`)
    .join('');
  const trustIcons = [ICON.shield, ICON.lock, ICON.doc];
  return `
  <div class="wrap-wide">
    <section class="hero">
      <div>
        <p class="countdown">${count}</p>
        <h1 class="display" data-focus>${esc(t('heroTitle'))}</h1>
        <p class="lead">${esc(t('heroLead'))}</p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-big" data-act="start">${esc(t('start'))} ${ICON.arrowR}</button>
          <span class="hero-meta">${esc(t('heroMeta'))}</span>
        </div>
        <ul class="trust">${t('trust').map((x, i) => `<li>${trustIcons[i]}${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="mosaic" aria-hidden="true">
        <div class="tile big ink"><strong>30</strong><span>${state.lang === 'es' ? 'afirmaciones' : 'statements'}</span></div>
        ${tiles}
        <div class="tile ink"><strong>13</strong><span>${state.lang === 'es' ? 'partidos' : 'parties'}</span></div>
      </div>
    </section>
    <section aria-labelledby="how-h">
      <h2 class="h2" id="how-h">${esc(t('howTitle'))}</h2>
      <ol class="how">${t('how').map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol>
      <p class="home-links"><a class="btn btn-quiet" href="eleccion.html">${esc(t('electionLink'))} ${ICON.arrowR}</a></p>
    </section>
  </div>`;
}

function viewProvince() {
  const opts = [...state.data.provinces]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((p) => `<option value="${esc(p.id)}" ${state.province === p.id ? 'selected' : ''}>${esc(p.name)}</option>`)
    .join('');
  const here = partiesInProvince();
  const total = state.data.parties.length;
  return `
  <div class="wrap step-screen">
    <section class="panel stack">
      <h1 class="h2" data-focus>${esc(t('provinceTitle'))}</h1>
      <p class="muted" id="prov-help">${esc(t('provinceHelp'))}</p>
      <label class="vh" for="prov">${esc(t('provincePick'))}</label>
      <select id="prov" class="select" aria-describedby="prov-help prov-count">
        <option value="">${esc(t('provinceAll'))}</option>
        ${opts}
      </select>
      <p class="small muted" id="prov-count" aria-live="polite">${here ? esc(t('partiesHere')(here.size, total)) : ''}</p>
      <div class="row between">
        <button class="btn btn-quiet" data-act="home">${ICON.arrowL} ${esc(t('back'))}</button>
        <button class="btn btn-primary" data-act="province-next">${esc(t('continue'))} ${ICON.arrowR}</button>
      </div>
    </section>
  </div>`;
}

function progressBar() {
  return `<div class="progress" aria-hidden="true">${state.statementOrder
    .map((sid, i) => {
      const s = statementById(sid);
      const done = state.answers[sid] !== undefined && state.answers[sid] !== null;
      const cls = i === state.idx ? 'now' : done ? 'done' : '';
      return `<i class="${cls}" style="${topicVars(s.topic)}"></i>`;
    })
    .join('')}</div>`;
}

function viewQuestion() {
  const n = state.statementOrder.length;
  const s = statementById(state.statementOrder[state.idx]);
  const tp = topicById(s.topic);
  const cur = state.answers[s.id];
  const answered = cur !== null && cur !== undefined;
  const labels = t('answers');
  const stops = [-2, -1, 0, 1, 2]
    .map((v, i) => `<label class="stop" data-v="${v}"><input type="radio" name="answer" value="${v}" ${cur === v ? 'checked' : ''} aria-label="${esc(labels[i])}"><span class="dot"></span></label>`)
    .join('');
  const last = state.idx === n - 1;
  const nextLabel = last ? (state.editing ? t('backToResults') : t('next')) : answered ? t('next') : t('skipNext');
  const simpleOpen = state.open === 'simple';
  const contextOpen = state.open === 'context';
  const simple = loc(s.simple);
  const [simpleBody, simpleEq] = simple.split(/(?=«De acuerdo»|"Agree")/);
  return `
  <div class="wrap step-screen" style="${topicVars(s.topic)}">
    <div class="q-top">
      <span class="q-count">${esc(t('questionOf')(state.idx + 1, n))}</span>
      ${state.editing ? `<button class="btn-text btn" data-act="back-to-results">${esc(t('backToResults'))}</button>` : ''}
    </div>
    ${progressBar()}
    <article class="tcard">
      <span class="tlabel">${topicIcon(tp.id)} ${esc(loc(tp.label))}</span>
      <h1 class="statement" id="q-text" data-focus>${esc(loc(s.text))}</h1>
      <div class="explain">
        <button type="button" data-act="toggle-simple" aria-expanded="${simpleOpen}" aria-controls="exp-simple">${ICON.bulb} ${esc(t('simpleBtn'))}</button>
        <button type="button" data-act="toggle-context" aria-expanded="${contextOpen}" aria-controls="exp-context">${ICON.info} ${esc(t('contextBtn'))}</button>
      </div>
      <div class="explain-box" id="exp-simple" ${simpleOpen ? '' : 'hidden'}><p>${esc(simpleBody)}<span class="eq">${esc(simpleEq || '')}</span></p></div>
      <div class="explain-box" id="exp-context" ${contextOpen ? '' : 'hidden'}><p>${esc(loc(s.context))}</p></div>
      <fieldset class="scale" aria-describedby="scale-ends">
        <legend class="vh">${esc(t('answerLegend'))}</legend>
        <div class="scale-track">${stops}</div>
        <div class="scale-ends" id="scale-ends" aria-hidden="true"><span>${esc(labels[0])}</span><span>${esc(labels[2])}</span><span>${esc(labels[4])}</span></div>
        <p class="scale-value" id="scale-value" aria-live="polite">${answered ? esc(labels[cur + 2]) : ''}</p>
      </fieldset>
      <p class="noop"><button type="button" class="btn btn-text" data-act="q-skip">${esc(t('noOpinion'))}</button></p>
    </article>
    <div class="q-nav">
      <button class="btn btn-quiet" data-act="q-prev">${ICON.arrowL} ${esc(t('prev'))}</button>
      <button class="btn btn-primary" data-act="q-next" id="q-next">${esc(nextLabel)} ${ICON.arrowR}</button>
    </div>
    <p class="q-hint">${
      state.autoAdvance
        ? `${esc(t('autoHint'))} <button type="button" data-act="auto-off">${esc(t('autoOff'))}</button>`
        : `<button type="button" data-act="auto-on">${esc(t('autoOn'))}</button>`
    } <span class="vh">${esc(t('keysHint'))}</span></p>
  </div>`;
}

function viewWeights() {
  const levels = t('weightLevels');
  const more = Object.values(state.weights).filter((w) => w > 1).length;
  const less = Object.values(state.weights).filter((w) => w < 1).length;
  const rows = state.topicOrder
    .map((id) => {
      const tp = topicById(id);
      const w = state.weights[id];
      const n = state.data.statements.filter((s) => s.topic === id).length;
      return `<li class="wrow" style="${topicVars(id)}">
        <span class="wname">${topicIcon(id)}<span>${esc(loc(tp.label))}<small>${esc(t('statementsCount')(n))}</small></span></span>
        <span class="wseg" role="group" aria-label="${esc(loc(tp.label))}">${WEIGHT_LEVELS.map(
          (v, i) => `<button type="button" data-weight-topic="${esc(id)}" data-weight="${v}" aria-pressed="${w === v}">${esc(levels[i])}</button>`,
        ).join('')}</span>
      </li>`;
    })
    .join('');
  return `
  <div class="wrap step-screen">
    <section class="stack">
      <h1 class="h2" data-focus>${esc(t('weightsTitle'))}</h1>
      <p class="muted">${esc(t('weightsHelp'))}</p>
      <ul class="wrows">${rows}</ul>
      <p class="wstatus" id="wstatus" aria-live="polite">${esc(t('weightsSummary')(more, less))}</p>
      <div class="row between" style="margin-top:1.5rem">
        ${state.editing ? `<button class="btn btn-quiet" data-act="back-to-results">${ICON.arrowL} ${esc(t('backToResults'))}</button>` : `<button class="btn btn-quiet" data-act="w-back">${ICON.arrowL} ${esc(t('back'))}</button>`}
        <button class="btn btn-primary btn-big" data-act="results">${esc(t('seeResults'))} ${ICON.arrowR}</button>
      </div>
    </section>
  </div>`;
}

function currentResults({ forCard = false } = {}) {
  const d = state.data;
  const inProv = partiesInProvince();
  const visible = state.partyOrder.filter((id) => (forCard ? !inProv || inProv.has(id) : state.showAll || !inProv || inProv.has(id))).map(partyById);
  let results = computeMatch({
    statements: d.statements,
    topics: d.topics,
    parties: visible,
    positions: d.positions,
    answers: state.answers,
    weights: state.weights,
    options: { excludeLowConfidence: state.excludeLow },
  });
  if (state.sortByMatch || forCard) results = sortByAgreement(results);
  return { results, inProv };
}

function heatColor(v) {
  // neutral ink ramp (never a party or stance colour)
  const a = 0.08 + v * 0.8;
  return `background:color-mix(in srgb, var(--ink) ${Math.round(a * 100)}%, transparent);color:${v > 0.55 ? 'var(--on-ink)' : 'var(--ink)'}`;
}

function viewResults() {
  const d = state.data;
  if (!hasAnswers()) {
    return `<div class="wrap step-screen"><section class="panel stack"><h1 class="h2" data-focus>${esc(t('resultsTitle'))}</h1><p>${esc(t('resultsNoAnswers'))}</p><button class="btn btn-primary" data-act="edit-answers">${esc(t('editAnswers'))}</button></section></div>`;
  }
  const { results, inProv } = currentResults();
  const provOpts = [...d.provinces]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((p) => `<option value="${esc(p.id)}" ${state.province === p.id ? 'selected' : ''}>${esc(p.name)}</option>`)
    .join('');
  const hiddenCount = inProv ? d.parties.length - inProv.size : 0;
  const cards = results
    .map((r) => {
      const p = partyById(r.party);
      const notHere = inProv && !inProv.has(p.id);
      const member = inProv && (candidacies()?.coalition_member?.[state.province] || []).includes(p.id);
      return `<li><button class="pcard ${notHere ? 'dim' : ''}" data-party="${esc(p.id)}" aria-label="${esc(p.name)}: ${r.overall === null ? esc(t('noScore')) : pct(r.overall)} ${esc(t('match'))}. ${esc(t('seeDetail'))}">
        ${logoHtml(p)}
        <span class="pname">${esc(p.name)}${p.full_name_2026 && p.full_name_2026 !== p.name ? `<small>${esc(p.full_name_2026)}</small>` : ''}</span>
        <span class="ppct">${r.overall === null ? '—' : pct(r.overall)}<small>${esc(t('match'))}</small></span>
        <span class="pbar"><span style="width:${r.overall === null ? 0 : r.overall * 100}%"></span></span>
        <span class="pmeta">${esc(t('basedOn')(r.coverage.withPosition, r.coverage.answered))}
          ${r.limitedData ? `<span class="flag">${esc(t('limitedData'))}</span>` : ''}
          ${member ? `<span class="flag">${esc(t('coalition'))}</span>` : ''}
          ${notHere ? `<span class="flag">${esc(t('notInProvince'))}</span>` : ''}
        </span>
      </button></li>`;
    })
    .join('');
  const note = inProv
    ? `<p class="note">${esc(t('candidacyNote')(candidacies().status))}${loc(candidacies().notes?.[state.province]) ? ` ${esc(loc(candidacies().notes[state.province]))}` : ''}</p>`
    : '';
  return `
  <div class="wrap-wide">
    <section class="res-head">
      <h1 class="h2" data-focus>${esc(t('resultsTitle'))}</h1>
      <p class="muted" style="margin:0">${esc(t('resultsLead'))}</p>
      <div class="res-controls">
        <label class="ctl">${esc(t('viewIn'))}
          <select class="select inline" data-control="province" aria-label="${esc(t('viewIn'))}">
            <option value="">${esc(t('allParties'))}</option>${provOpts}
          </select></label>
        <span class="ctl" role="group" aria-label="${esc(t('orderLabel'))}">
          <span class="seg">
            <button type="button" data-order="random" aria-pressed="${!state.sortByMatch}">${esc(t('orderRandom'))}</button>
            <button type="button" data-order="match" aria-pressed="${state.sortByMatch}">${esc(t('orderMatch'))}</button>
          </span>
        </span>
        <label class="check"><input type="checkbox" data-control="excludeLow" ${state.excludeLow ? 'checked' : ''}> ${esc(t('lowToggle'))}</label>
      </div>
      ${note}
    </section>
    <ul class="pgrid">${cards}</ul>
    ${inProv && hiddenCount ? `<p><label class="check"><input type="checkbox" data-control="showAll" ${state.showAll ? 'checked' : ''}> ${state.lang === 'es' ? `Ver también los ${hiddenCount} partidos que no se presentan en ${esc(provinceName(state.province))}` : `Also show the ${hiddenCount} parties not running in ${esc(provinceName(state.province))}`}</label></p>` : ''}
    ${viewHeatmap(results)}
    <section class="actions-panel" aria-label="${esc(t('actionsTitle'))}">
      <div class="share-box">
        <h2>${esc(t('cardTitle'))}</h2>
        <p>${esc(t('cardFoot'))}</p>
        <div class="row">
          <button class="btn btn-primary" data-act="pdf">${ICON.download} ${esc(t('downloadPdf'))}</button>
          <button class="btn" data-act="share">${ICON.share} ${esc(t('shareImage'))}</button>
        </div>
        <p class="tiny" id="share-status" aria-live="polite" style="color:inherit"></p>
      </div>
      <div class="stack">
        <button class="btn btn-quiet" data-act="edit-answers" style="width:100%">${esc(t('editAnswers'))}</button>
        <button class="btn btn-quiet" data-act="edit-weights" style="width:100%">${esc(t('editWeights'))}</button>
        <button class="btn btn-text" data-act="restart" style="width:100%">${esc(t('restart'))}</button>
      </div>
    </section>
  </div>`;
}

function viewHeatmap(results) {
  const topics = state.topicOrder.map(topicById);
  const head = topics.map((tp) => `<th scope="col" style="${topicVars(tp.id)}"><span class="hti">${topicIcon(tp.id)}</span><span class="hlab">${esc(loc(tp.label))}</span></th>`).join('');
  const rows = results
    .map((r) => {
      const p = partyById(r.party);
      const cells = topics
        .map((tp) => {
          const tr = r.topics.find((x) => x.topic === tp.id);
          if (!tr || tr.answered === 0) return '<td><span class="cell na" aria-label="—">·</span></td>';
          if (tr.agreement === null) return `<td><span class="cell na" title="${esc(t('mapEmpty'))}">—<span class="vh">${esc(t('mapEmpty'))}</span></span></td>`;
          return `<td><span class="cell" style="${heatColor(tr.agreement)}">${Math.round(tr.agreement * 100)}</span></td>`;
        })
        .join('');
      return `<tr><th scope="row">${esc(p.name)}</th>${cells}</tr>`;
    })
    .join('');
  const ramp = [0.1, 0.3, 0.5, 0.7, 0.9].map((v) => `<i style="${heatColor(v)}"></i>`).join('');
  return `
  <section aria-labelledby="map-h">
    <div class="section-title"><h2 class="h3" id="map-h">${esc(t('mapTitle'))}</h2><span class="small muted">${esc(t('mapLead'))}</span></div>
    <div class="heat-wrap"><table class="heat"><thead><tr><th scope="col"><span class="vh">Partido</span></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="heat-legend"><span>0%</span><span class="ramp">${ramp}</span><span>100%</span><span>${esc(t('mapLegendDash'))}</span></p>
  </section>`;
}

function verdictOf(a) {
  if (a === null || a === undefined) return { key: 'unknownShort', icon: ICON.q };
  if (a >= 0.75) return { key: 'agreeShort', icon: ICON.check };
  if (a <= 0.25) return { key: 'disagreeShort', icon: ICON.cross };
  return { key: 'partialShort', icon: ICON.partial };
}

function reportUrl(partyName, sid, text) {
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(`Corrección: ${partyName} · ${sid}`)}&body=${encodeURIComponent(`Partido: ${partyName}\nAfirmación: ${sid} — ${text}\n\n¿Qué es incorrecto o qué fuente mejor existe? (enlace, fecha y cita)\n`)}`;
}

function viewParty() {
  const d = state.data;
  const p = partyById(state.partyId);
  if (!p) return viewResults();
  const { results, inProv } = currentResults();
  const order = results.map((r) => r.party);
  const r = computeMatch({ statements: d.statements, topics: d.topics, parties: [p], positions: d.positions, answers: state.answers, weights: state.weights, options: { excludeLowConfidence: state.excludeLow } })[0];
  const i = Math.max(0, order.indexOf(p.id));
  const prevId = order[(i - 1 + order.length) % order.length];
  const nextId = order[(i + 1) % order.length];
  const listName = inProv?.has(p.id) ? candidacies()?.list_names?.[state.province]?.[p.id] : null;
  const member = inProv && (candidacies()?.coalition_member?.[state.province] || []).includes(p.id);
  const topicsHtml = state.topicOrder
    .map((id) => {
      const tr = r.topics.find((x) => x.topic === id);
      const tp = topicById(id);
      const answeredHere = tr && tr.answered > 0;
      const bar = !answeredHere
        ? `<span class="nodata">${esc(t('skipped'))}</span><span class="val na">·</span>`
        : tr.agreement === null
          ? `<span class="nodata">${esc(t('noPosition'))}</span><span class="val na">—</span>`
          : `<span class="track"><span style="width:${tr.agreement * 100}%"></span></span><span class="val">${pct(tr.agreement)}</span>`;
      const rows = state.statementOrder
        .filter((sid) => statementById(sid).topic === id)
        .map((sid) => statementRow(sid, p, r))
        .join('');
      return `<li style="${topicVars(id)}"><details class="tdet"><summary><span class="tname">${topicIcon(id)} ${esc(loc(tp.label))}${tr?.weight > 1 ? ` <span class="wmark" aria-label="${esc(t('important'))}">★</span>` : tr?.weight < 1 ? ` <span class="wmark" aria-label="${esc(t('lessImportant'))}">·½</span>` : ''}</span>${bar}<span class="chev" aria-hidden="true"></span></summary><div class="tdet-body">${rows}</div></details></li>`;
    })
    .join('');
  const navBtns =
    order.length > 1
      ? `<nav class="detail-nav" aria-label="${esc(p.name)}">
      <button class="btn btn-quiet" data-party="${esc(prevId)}">${ICON.arrowL} ${esc(partyById(prevId).name)}</button>
      <button class="btn btn-quiet" data-party="${esc(nextId)}">${esc(partyById(nextId).name)} ${ICON.arrowR}</button>
    </nav>`
      : '';
  return `
  <div class="wrap">
    <p style="margin:1rem 0 0"><button class="btn btn-quiet" data-act="results">${ICON.arrowL} ${esc(t('backToAll'))}</button></p>
    <header class="detail-head">
      ${logoHtml(p)}
      <div><h1 class="h2" data-focus>${esc(p.name)}</h1><p class="small muted" style="margin:.2rem 0 0">${esc(p.full_name_2026)}</p></div>
      <div class="ppct">${r.overall === null ? '—' : pct(r.overall)}<small>${esc(t('match'))}</small></div>
    </header>
    <p class="row small muted" style="gap:.4rem">
      <span class="flag">${esc(p.program_2026?.status === 'published' ? t('programPublished') : t('programPending'))}</span>
      ${r.limitedData ? `<span class="flag">${esc(t('limitedData'))}</span>` : ''}
      <span>${esc(t('basedOn')(r.coverage.withPosition, r.coverage.answered))}</span>
    </p>
    ${r.limitedData ? `<p class="note">${esc(t('limitedDataLong'))}</p>` : ''}
    ${listName ? `<p class="note">${esc(t('ballotName'))}: «${esc(listName)}»${member ? `. ${esc(t('coalitionLong'))}` : ''}</p>` : ''}
    <h2 class="h3" style="margin-top:1.8rem">${esc(t('byTopic'))}</h2>
    <p class="small muted" style="margin:.3rem 0 0">${esc(t('openTopic'))}</p>
    <ul class="tbars">${topicsHtml}</ul>
    ${loc(p.notes) ? `<p class="note" style="margin-top:1.5rem">${esc(loc(p.notes))}</p>` : ''}
    ${navBtns}
  </div>`;
}

function statementRow(sid, p, r) {
  const s = statementById(sid);
  const pos = state.data.positions[p.id]?.[sid];
  const u = state.answers[sid];
  const sr = r.statements.find((x) => x.statement === sid);
  const userLabel = u === null || u === undefined ? t('skipped') : t('answers')[u + 2];
  const stance = t('stance')[pos?.stance || 'no_clear_position'];
  const v = u === null || u === undefined ? null : verdictOf(sr?.agreement);
  const sources = (pos?.sources || [])
    .map(
      (src) =>
        `<li><a href="${esc(src.url)}" rel="noopener noreferrer" target="_blank" lang="${esc(src.lang || 'es')}">${esc(src.title || src.url)}</a>${src.publisher ? ` · ${esc(src.publisher)}` : ''}${src.date ? ` · ${esc(src.date)}` : ''}${src.quote ? `<blockquote lang="${esc(src.lang || 'es')}">${esc(src.quote)}</blockquote>` : ''}</li>`,
    )
    .join('');
  const votes = (pos?.vote_refs || [])
    .map((id) => state.data.votes[id])
    .filter(Boolean)
    .map((vt) => {
      const tl = vt.by_party?.[p.id];
      return `<li><a href="${esc(vt.url)}" rel="noopener noreferrer" target="_blank" lang="es">${esc(vt.title)}</a> · ${esc(vt.date)}${vt.relation === 'related' ? ` · ${esc(t('relatedVote'))}` : ''}${tl ? ` · ${tl.yes} ${esc(t('voteYes'))}, ${tl.no} ${esc(t('voteNo'))}, ${tl.abstain} ${esc(t('voteAbs'))}` : ''}${loc(vt.note) ? `<br><span class="muted">${esc(loc(vt.note))}</span>` : ''}</li>`;
    })
    .join('');
  return `<div class="srow">
    <p class="st">${esc(loc(s.text))}</p>
    <div class="cmp">
      <span class="pill">${esc(t('you'))}: <b>${esc(userLabel)}</b></span>
      <span class="pill">${esc(p.name)}: <b>${esc(stance)}</b></span>
      ${v ? `<span class="verdict">${v.icon} ${esc(t(v.key))}</span>` : ''}
    </div>
    <details>
      <summary>${esc(t('sources'))}${pos?.confidence ? ` · ${esc(t('confidence')[pos.confidence])}` : ''}</summary>
      ${loc(pos?.note) ? `<p class="why">${esc(loc(pos.note))}</p>` : ''}
      <p class="tiny">${esc(t('evidence')[pos?.evidence_type || 'none'])}</p>
      ${votes ? `<p class="tiny">${esc(t('votesTitle'))}</p><ul>${votes}</ul>` : ''}
      ${sources ? `<ul>${sources}</ul>` : ''}
      <p class="tiny"><a href="${esc(reportUrl(p.name, sid, loc(s.text)))}" rel="noopener noreferrer" target="_blank">${esc(t('reportError'))}</a></p>
    </details>
  </div>`;
}

// ---------- reference pages inside the app (answers stay in memory)
const refCache = {};
async function renderReference() {
  const name = state.ref;
  app.innerHTML = `<div class="wrap"><p class="ref-back"><button type="button" class="btn btn-quiet" data-act="close-ref">${ICON.arrowL} ${esc(t('backToTool'))}</button></p><div id="ref-body" class="prose"><p role="status">${esc(t('loading'))}</p></div></div>`;
  try {
    refCache[name] ||= await fetchReference(name);
  } catch {
    if (state.ref !== name) return;
    app.querySelector('#ref-body').innerHTML = `<p role="alert">${esc(t('loadError'))} <a href="${name}.html${state.lang === 'en' ? '?lang=en' : ''}">${esc(t('openStandalone'))}</a></p>`;
    return;
  }
  if (state.ref !== name) return;
  const body = app.querySelector('#ref-body');
  body.innerHTML = refCache[name].html;
  for (const el of body.querySelectorAll('.ref-standalone-only')) el.remove();
  applyLang(body, state.lang);
  const cov = body.querySelector('#coverage');
  if (cov) renderCoverage(cov, state.lang, () => applyLang(body, state.lang));
  if (!state.refFocused) {
    const h1 = body.querySelector('h1:not([hidden])') || body.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus();
    }
  }
  state.refFocused = true;
}

function openRef(name) {
  state.ref = name;
  state.refFocused = false;
  history.pushState({ ref: name }, '', `#${name}`);
  render();
  window.scrollTo({ top: 0 });
}

function closeRef() {
  if (history.state?.ref) history.back();
  else {
    state.ref = null;
    render();
    focusMain();
  }
}

// ---------- render
function render() {
  document.documentElement.lang = state.lang;
  document.title = t('appTitle');
  const langBtn = document.getElementById('lang');
  if (langBtn) {
    langBtn.textContent = t('langSwitch');
    langBtn.lang = t('langSwitchCode');
    langBtn.setAttribute('aria-label', t('langSwitchLabel'));
  }
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  if (!state.data) return;
  if (state.ref) {
    renderReference();
    return;
  }
  const views = { home: viewHome, province: viewProvince, question: viewQuestion, weights: viewWeights, results: viewResults, party: viewParty };
  app.innerHTML = (views[state.step] || viewHome)();
}

// ---------- answering
function saveAnswer(value) {
  state.answers[state.statementOrder[state.idx]] = value;
}

function reflectAnswer() {
  const s = statementById(state.statementOrder[state.idx]);
  const v = state.answers[s.id];
  const val = app.querySelector('#scale-value');
  if (val) val.textContent = v === null || v === undefined ? '' : t('answers')[v + 2];
  const next = app.querySelector('#q-next');
  if (next && state.idx < state.statementOrder.length - 1) next.innerHTML = `${esc(v === null || v === undefined ? t('skipNext') : t('next'))} ${ICON.arrowR}`;
}

function advance() {
  if (state.idx < state.statementOrder.length - 1) go('question', { idx: state.idx + 1 });
  else if (state.editing) go('results', { editing: false });
  else go('weights');
}

function setAnswerByKey(v) {
  const input = app.querySelector(`input[name="answer"][value="${v}"]`);
  if (!input) return;
  input.checked = true;
  saveAnswer(v);
  reflectAnswer();
}

// ---------- events
app.addEventListener('pointerdown', () => {
  lastPointer = performance.now();
});
document.addEventListener('keydown', (e) => {
  lastKey = performance.now();
  if (state.step !== 'question' || state.ref || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'select' || tag === 'textarea' || (tag === 'input' && e.target.type !== 'radio')) return;
  if (/^[1-5]$/.test(e.key)) {
    e.preventDefault();
    setAnswerByKey(Number(e.key) - 3);
  } else if (e.key === 'Enter' && (tag === 'input' || tag === 'body' || tag === 'main' || tag === 'h1')) {
    e.preventDefault();
    advance();
  }
});

app.addEventListener('click', async (e) => {
  const radio = e.target.closest('input[name="answer"]');
  if (radio) {
    // Mouse/touch choices move on by themselves (announced under the question); keyboard
    // choices (arrows, Space, 1–5) only save the answer; the user continues with Next/Enter.
    const byPointer = lastPointer > lastKey && performance.now() - lastPointer < 800;
    saveAnswer(Number(radio.value));
    reflectAnswer();
    if (state.autoAdvance && byPointer) {
      const at = state.idx;
      setTimeout(() => {
        if (state.step === 'question' && !state.ref && state.idx === at) advance();
      }, 260);
    }
    return;
  }
  const wt = e.target.closest('[data-weight-topic]');
  if (wt) {
    const id = wt.dataset.weightTopic;
    state.weights[id] = Number(wt.dataset.weight);
    for (const x of app.querySelectorAll(`[data-weight-topic="${id}"]`)) x.setAttribute('aria-pressed', String(x === wt));
    const more = Object.values(state.weights).filter((w) => w > 1).length;
    const less = Object.values(state.weights).filter((w) => w < 1).length;
    app.querySelector('#wstatus').textContent = t('weightsSummary')(more, less);
    return;
  }
  const party = e.target.closest('[data-party]');
  if (party) {
    go('party', { partyId: party.dataset.party });
    return;
  }
  const ord = e.target.closest('[data-order]');
  if (ord) {
    state.sortByMatch = ord.dataset.order === 'match';
    render();
    app.querySelector(`[data-order="${ord.dataset.order}"]`)?.focus();
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'start') go('province');
  else if (act === 'home') go('home');
  else if (act === 'province-next') {
    state.province = app.querySelector('#prov').value;
    go('question', { idx: 0 });
  } else if (act === 'toggle-simple' || act === 'toggle-context') {
    const which = act === 'toggle-simple' ? 'simple' : 'context';
    state.open = state.open === which ? null : which;
    app.querySelector('#exp-simple').hidden = state.open !== 'simple';
    app.querySelector('#exp-context').hidden = state.open !== 'context';
    for (const b of app.querySelectorAll('.explain button')) b.setAttribute('aria-expanded', String(b.dataset.act === `toggle-${state.open}`));
  } else if (act === 'q-prev') {
    if (state.idx === 0) go(state.editing ? 'results' : 'province', state.editing ? { editing: false } : {});
    else go('question', { idx: state.idx - 1 });
  } else if (act === 'q-next') advance();
  else if (act === 'q-skip') {
    saveAnswer(null);
    advance();
  } else if (act === 'auto-off' || act === 'auto-on') {
    state.autoAdvance = act === 'auto-on';
    render();
    app.querySelector(state.autoAdvance ? '[data-act="auto-off"]' : '[data-act="auto-on"]')?.focus();
  } else if (act === 'w-back') go('question', { idx: state.statementOrder.length - 1 });
  else if (act === 'results' || act === 'back-to-results') go('results', { editing: false });
  else if (act === 'edit-answers') go('question', { editing: true, idx: 0 });
  else if (act === 'edit-weights') go('weights', { editing: true });
  else if (act === 'close-ref') closeRef();
  else if (act === 'pdf' || act === 'share') {
    const status = app.querySelector('#share-status');
    btn.disabled = true;
    if (status) status.textContent = t('sharing');
    try {
      const card = await buildCard();
      if (act === 'pdf') await downloadPdf(card, `${t('cardTitle')} · 29N`);
      else await shareImage(card, t('shareText'));
      if (status) status.textContent = '';
    } catch (err) {
      if (status) status.textContent = t('loadError');
    } finally {
      btn.disabled = false;
    }
  } else if (act === 'restart') {
    if (hasAnswers() && !confirm(t('confirmRestart'))) return;
    Object.assign(state, { answers: {}, idx: 0, province: '', editing: false, sortByMatch: false, excludeLow: false, showAll: false, partyId: null });
    state.statementOrder = shuffle(state.statementOrder, cryptoRandom);
    state.partyOrder = shuffle(state.partyOrder, cryptoRandom);
    state.topicOrder = topicOrderFromStatements();
    for (const k of Object.keys(state.weights)) state.weights[k] = DEFAULT_WEIGHT;
    go('home');
  }
});

app.addEventListener('change', (e) => {
  const el = e.target;
  if (el.name === 'answer') {
    saveAnswer(Number(el.value));
    reflectAnswer();
  } else if (el.id === 'prov') {
    state.province = el.value;
    const here = partiesInProvince();
    app.querySelector('#prov-count').textContent = here ? t('partiesHere')(here.size, state.data.parties.length) : '';
  } else if (el.dataset.control === 'province') {
    state.province = el.value;
    state.showAll = false;
    render();
    app.querySelector('[data-control="province"]')?.focus();
  } else if (el.dataset.control) {
    state[el.dataset.control] = el.checked;
    render();
    app.querySelector(`[data-control="${el.dataset.control}"]`)?.focus();
  }
});

async function buildCard() {
  const { results } = currentResults({ forCard: true });
  const palette = state.data.topics.map((tp) => TOPIC_STYLE[tp.id].accent);
  const keyTopics = state.topicOrder.filter((id) => state.weights[id] > 1);
  const data = await prepareCardData({
    strings: {
      cardTitle: t('cardTitle'),
      cardSubtitle: t('cardSubtitle'),
      cardOrder: t('cardOrder'),
      cardTopics: t('cardTopics'),
      cardNoTopics: t('cardNoTopics'),
      cardWhere: t('cardWhere'),
      cardAnswered: t('cardAnswered'),
      cardLimited: t('cardLimited'),
      cardFoot: t('cardFoot'),
      cardCta: t('cardCta'),
    },
    place: state.province ? provinceName(state.province) : t('allParties'),
    answered: answeredCount(),
    palette,
    parties: results.map((r) => {
      const p = partyById(r.party);
      return { name: p.name, mono: MONO[p.id] || p.name.slice(0, 3), logoSrc: state.logos[p.id] ? `img/parties/${state.logos[p.id]}` : null, pct: r.overall, limited: r.limitedData };
    }),
    topics: keyTopics.map((id) => ({ label: loc(topicById(id).label), accent: TOPIC_STYLE[id].accent, tint: TOPIC_STYLE[id].tint, icon: topicIconDataUrl(id, TOPIC_STYLE[id].accent) })),
  });
  return drawCard(data);
}

// Leaving the page would lose the answers; ask first while a questionnaire is in progress.
window.addEventListener('beforeunload', (e) => {
  if (hasAnswers() && !['results', 'party'].includes(state.step)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Brand link goes home inside the app; reference-page links open inside the app.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!state.data) return;
  const brand = e.target.closest('.brand');
  if (brand) {
    e.preventDefault();
    state.ref = null;
    go('home');
    return;
  }
  const a = e.target.closest('a[href]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const m = url.pathname.match(/\/(eleccion|metodologia)\.html$/);
  if (m) {
    e.preventDefault();
    if (state.ref !== m[1]) openRef(m[1]);
  } else if (state.ref && a.matches('[data-href-lang="./"]')) {
    e.preventDefault();
    closeRef();
  }
});

document.getElementById('lang')?.addEventListener('click', () => {
  state.lang = state.lang === 'es' ? 'en' : 'es';
  const url = new URL(location.href);
  if (state.lang === 'en') url.searchParams.set('lang', 'en');
  else url.searchParams.delete('lang');
  history.replaceState(history.state, '', url);
  render();
});

load();
