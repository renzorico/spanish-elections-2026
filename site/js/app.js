// 29N · UI controller. All state lives in memory only: nothing is written to browser
// storage, cookies or any server. Network requests: bundle.json, logo credits and the
// site's own reference pages and images.
import { STRINGS } from './i18n.js';
import { computeMatch, sortByAgreement, shuffle, cryptoRandom, DEFAULT_WEIGHT } from './match.js';
import { REPO_URL, applyLang, fetchReference, renderCoverage } from './reference.js';
import { TOPIC_STYLE, TOPIC_SHORT, topicIcon, topicVars } from './topics.js';
import { SITE_URL, reportPdf, sharePdf, sharePng, parseQr } from './report.js';
import { encodeRestore, decodeRestore } from './restore.js';

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
  showAll: false,
  openWeights: new Set(), // topics whose statements are listed on the weights screen
  notice: null, // one-off message on the results screen (restored link)
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
  const hash = location.hash;
  history.replaceState({ step: 'home' }, '', location.href.split('#')[0]);
  if (!applyRestore(hash)) render();
}

// "Return to my results" link from the full report: the data lives only in the URL
// fragment (#r=…), which browsers never send to the server.
function applyRestore(hash) {
  if (!hash.startsWith('#r=')) return false;
  const r = decodeRestore(hash.slice(3), state.data);
  if (r) {
    Object.assign(state, { answers: r.answers, weights: r.weights, province: r.province, ref: null, editing: false });
    go('results', { notice: 'restored' });
  } else {
    state.ref = null;
    go('home', { notice: 'restoreInvalid' });
  }
  return true;
}
window.addEventListener('hashchange', () => {
  if (state.data && location.hash.startsWith('#r=')) applyRestore(location.hash);
});

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
  if (!('notice' in rest)) state.notice = null;
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
  const count = days > 0 ? `<b>${days}</b><span>${esc(t('daysTo')(days))}</span>` : days === 0 ? `<span>${esc(t('electionToday'))}</span>` : `<span>${esc(t('electionPast'))}</span>`;
  const nStatements = state.data.statements.length;
  const tiles = state.data.topics
    .map((tp) => {
      const n = state.data.statements.filter((s) => s.topic === tp.id).length;
      return `<div class="tile" style="${topicVars(tp.id)}">${topicIcon(tp.id)}<span class="tl"><span class="tl-long">${esc(loc(tp.label))}</span><span class="tl-short">${esc(loc(TOPIC_SHORT[tp.id]))}</span><small>${n}</small></span></div>`;
    })
    .join('');
  const sample = statementById('viv-limite-alquiler') || state.data.statements[0];
  const labels = t('answers');
  const notice = state.notice === 'restoreInvalid' ? `<p class="note" role="status">${esc(t('restoreInvalid'))}</p>` : '';
  return `
  <div class="wrap-wide">
    ${notice}
    <section class="hero">
      <div class="hero-copy">
        <p class="countdown">${count}</p>
        <h1 class="display" data-focus>${esc(t('heroTitle'))}</h1>
        <p class="lead">${esc(t('heroLead'))}</p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-big" data-act="start">${esc(t('start'))} ${ICON.arrowR}</button>
          <span class="hero-meta">${esc(t('heroMinutes'))}</span>
        </div>
        <dl class="facts">${t('heroFacts').map(([n, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(n)}</dd></div>`).join('')}</dl>
        <p class="hero-note">${esc(t('heroNote'))}</p>
      </div>
      <div class="hero-art">
        <div class="mosaic" aria-hidden="true">
          <div class="tile big ink"><strong>${nStatements}</strong><span>${esc(t('tileStatements'))}</span></div>
          ${tiles}
          <div class="tile ink"><strong>${state.data.parties.length}</strong><span>${esc(t('tileParties'))}</span></div>
        </div>
        <div class="sample" style="${topicVars(sample.topic)}">
          <span class="sample-label">${topicIcon(sample.topic)} ${esc(loc(topicById(sample.topic).label))} · ${esc(t('sampleLabel'))}</span>
          <p class="sample-q">${esc(loc(sample.text))}</p>
          <div class="sample-scale" role="group" aria-label="${esc(t('sampleNote'))}">${[-2, -1, 0, 1, 2].map((v, i) => `<button type="button" data-sample="${v}" aria-pressed="false" aria-label="${esc(labels[i])}"></button>`).join('')}</div>
          <div class="sample-ends" aria-hidden="true"><span>${esc(labels[0])}</span><span>${esc(labels[4])}</span></div>
          <p class="sample-note" aria-live="polite">${esc(t('sampleNote'))}</p>
        </div>
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

// ---------- fixed statement height
const stBox = { key: '', h: 0 };
function stBoxStyle() {
  return stBox.h ? `min-height:${stBox.h}px` : '';
}
/** Measure the tallest statement at the current width and language; returns true if it changed. */
function measureStatements() {
  const box = app.querySelector('.st-box');
  if (!box) return false;
  const key = `${box.clientWidth}|${state.lang}|${document.fonts?.status || ''}`;
  if (key === stBox.key) return false;
  const probe = document.createElement('h1');
  probe.className = 'statement';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${box.clientWidth}px;margin:0`;
  box.appendChild(probe);
  let max = 0;
  for (const st of state.data.statements) {
    probe.textContent = loc(st.text);
    max = Math.max(max, probe.getBoundingClientRect().height);
  }
  probe.remove();
  stBox.key = key;
  const changed = Math.ceil(max) !== stBox.h;
  stBox.h = Math.ceil(max);
  box.style.minHeight = `${stBox.h}px`;
  return changed;
}
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => state.step === 'question' && !state.ref && measureStatements(), 120);
});
document.fonts?.ready.then(() => state.step === 'question' && measureStatements());

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
      <!-- The statement box is as tall as the longest statement (measured on this screen),
           so the answer scale stays in the same place on every question. -->
      <div class="st-box" style="${stBoxStyle()}"><h1 class="statement" id="q-text" data-focus>${esc(loc(s.text))}</h1></div>
      <fieldset class="scale" aria-describedby="scale-ends">
        <legend class="vh">${esc(t('answerLegend'))}</legend>
        <div class="scale-track">${stops}</div>
        <div class="scale-ends" id="scale-ends" aria-hidden="true"><span>${esc(labels[0])}</span><span>${esc(labels[2])}</span><span>${esc(labels[4])}</span></div>
        <p class="scale-value" id="scale-value" aria-live="polite">${answered ? esc(labels[cur + 2]) : ''}</p>
      </fieldset>
      <div class="q-tools">
        <div class="explain">
          <button type="button" data-act="toggle-simple" aria-expanded="${simpleOpen}" aria-controls="exp-simple">${ICON.bulb} ${esc(t('simpleBtn'))}</button>
          <button type="button" data-act="toggle-context" aria-expanded="${contextOpen}" aria-controls="exp-context">${ICON.info} ${esc(t('contextBtn'))}</button>
        </div>
        <button type="button" class="btn btn-text noop" data-act="q-skip">${esc(t('noOpinion'))}</button>
      </div>
      <div class="explain-box" id="exp-simple" ${simpleOpen ? '' : 'hidden'}><p>${esc(simpleBody)}<span class="eq">${esc(simpleEq || '')}</span></p></div>
      <div class="explain-box" id="exp-context" ${contextOpen ? '' : 'hidden'}><p>${esc(loc(s.context))}</p></div>
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
      const list = state.statementOrder.filter((sid) => statementById(sid).topic === id);
      const open = state.openWeights.has(id);
      const items = list
        .map((sid) => {
          const u = state.answers[sid];
          const lab = u === null || u === undefined ? t('skipped') : t('answers')[u + 2];
          return `<li><span>${esc(loc(statementById(sid).text))}</span><b>${esc(lab)}</b></li>`;
        })
        .join('');
      return `<li class="wrow" style="${topicVars(id)}">
        <div class="whead">
          <span class="wname">${topicIcon(id)}<span>${esc(loc(tp.label))}
            <button type="button" class="wtoggle" data-wtoggle="${esc(id)}" aria-expanded="${open}" aria-controls="wl-${esc(id)}">${esc(open ? t('weightsHide') : t('weightsShow')(list.length))}</button></span></span>
          <span class="wseg" role="group" aria-label="${esc(loc(tp.label))}">${WEIGHT_LEVELS.map(
            (v, i) => `<button type="button" data-weight-topic="${esc(id)}" data-weight="${v}" aria-pressed="${w === v}">${esc(levels[i])}</button>`,
          ).join('')}</span>
        </div>
        <ul class="wlist" id="wl-${esc(id)}" ${open ? '' : 'hidden'}>${items}</ul>
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

// Results are always sorted by agreement (owner's decision, round 2). Parties with limited
// data go last; ties keep the per-visit random order, so no party is favoured by position.
function currentResults({ forExport = false } = {}) {
  const d = state.data;
  const inProv = partiesInProvince();
  const visible = state.partyOrder.filter((id) => (forExport ? !inProv || inProv.has(id) : state.showAll || !inProv || inProv.has(id))).map(partyById);
  let results = computeMatch({
    statements: d.statements,
    topics: d.topics,
    parties: visible,
    positions: d.positions,
    answers: state.answers,
    weights: state.weights,
    options: { excludeLowConfidence: state.excludeLow },
  });
  results = sortByAgreement(results);
  return { results, inProv };
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
  const notice = state.notice === 'restored' ? `<p class="note" role="status">${esc(t('restored'))}</p>` : '';
  return `
  <div class="wrap-wide">
    ${notice}
    <section class="res-head">
      <h1 class="h2" data-focus>${esc(t('resultsTitle'))}</h1>
      <p class="muted" style="margin:0">${esc(t('resultsLead'))}</p>
      <div class="res-controls">
        <label class="ctl">${esc(t('viewIn'))}
          <select class="select inline" data-control="province" aria-label="${esc(t('viewIn'))}">
            <option value="">${esc(t('allParties'))}</option>${provOpts}
          </select></label>
        <label class="check"><input type="checkbox" data-control="excludeLow" ${state.excludeLow ? 'checked' : ''}> ${esc(t('lowToggle'))}</label>
      </div>
      ${note}
    </section>
    <ul class="pgrid">${cards}</ul>
    ${inProv && hiddenCount ? `<p><label class="check"><input type="checkbox" data-control="showAll" ${state.showAll ? 'checked' : ''}> ${state.lang === 'es' ? `Ver también los ${hiddenCount} partidos que no se presentan en ${esc(provinceName(state.province))}` : `Also show the ${hiddenCount} parties not running in ${esc(provinceName(state.province))}`}</label></p>` : ''}
    ${viewHeatmap(results)}
    <section class="exports" aria-labelledby="exp-h">
      <h2 class="h3" id="exp-h">${esc(t('exportTitle'))}</h2>
      <div class="exp-grid">
        <div class="exp-card">
          <h3>${esc(t('exportSaveTitle'))}</h3>
          <p>${esc(t('exportSaveText'))}</p>
          <button class="btn btn-primary" data-act="pdf-report">${ICON.download} ${esc(t('exportSaveBtn'))}</button>
        </div>
        <div class="exp-card">
          <h3>${esc(t('exportShareTitle'))}</h3>
          <p>${esc(t('exportShareText'))}</p>
          <div class="row">
            <button class="btn btn-primary" data-act="pdf-share">${ICON.download} ${esc(t('exportShareBtn'))}</button>
            <button class="btn btn-quiet" data-act="png-share">${ICON.share} ${esc(t('exportImageBtn'))}</button>
          </div>
        </div>
      </div>
      <p class="tiny" id="share-status" aria-live="polite"></p>
    </section>
    <section class="actions-panel" aria-label="${esc(t('actionsTitle'))}">
      <button class="btn btn-quiet" data-act="edit-answers">${esc(t('editAnswers'))}</button>
      <button class="btn btn-quiet" data-act="edit-weights">${esc(t('editWeights'))}</button>
      <button class="btn btn-text" data-act="restart">${esc(t('restart'))}</button>
    </section>
  </div>`;
}

// Topic map: one diverging bar per party and topic. Centre = half and half; the bar grows
// right with agreement and left with disagreement. Equal columns; angled short headers.
function divCell(v, label) {
  const d = v - 0.5;
  const w = Math.round(Math.abs(d) * 200) / 2; // % of the cell width (max 50)
  const bar = Math.abs(d) < 0.005 ? '<i class="mid"></i>' : d > 0 ? `<i class="ag" style="width:${w}%"></i>` : `<i class="ds" style="width:${w}%"></i>`;
  return `<span class="dv" role="img" aria-label="${esc(label)}" title="${esc(label)}">${bar}</span>`;
}

function viewHeatmap(results) {
  const topics = state.data.topics;
  const cols = topics.map(() => '<col class="c-t">').join('');
  const head = topics
    .map((tp) => `<th scope="col" class="th-t" style="${topicVars(tp.id)}"><span class="th-in"><i class="th-dot"></i>${esc(loc(TOPIC_SHORT[tp.id]) || loc(tp.label))}</span></th>`)
    .join('');
  const row = (r) => {
    const p = partyById(r.party);
    const cells = topics
      .map((tp) => {
        const tr = r.topics.find((x) => x.topic === tp.id);
        const name = loc(tp.label);
        if (!tr || tr.answered === 0) return `<td><span class="dv skip" role="img" aria-label="${esc(`${p.name}, ${name}: ${t('legSkip')}`)}" title="${esc(t('legSkip'))}"></span></td>`;
        if (tr.agreement === null) return `<td><span class="dv na" role="img" aria-label="${esc(`${p.name}, ${name}: ${t('legNone')}`)}" title="${esc(t('legNone'))}"></span></td>`;
        return `<td>${divCell(tr.agreement, t('cellLabel')(p.name, name, Math.round(tr.agreement * 100)))}</td>`;
      })
      .join('');
    return `<tr><th scope="row">${esc(p.name)}</th>${cells}<td class="tm-g">${r.overall === null ? '—' : pct(r.overall)}</td></tr>`;
  };
  const full = results.filter((r) => !r.limitedData);
  const lim = results.filter((r) => r.limitedData);
  const rows = full.map(row).join('') + (lim.length ? `<tr class="tm-sep"><th scope="rowgroup" colspan="${topics.length + 2}">${esc(t('limitedData'))}</th></tr>${lim.map(row).join('')}` : '');
  const legend = [
    ['<span class="dv"><i class="ds" style="width:36%"></i></span>', t('legDis')],
    ['<span class="dv"><i class="mid"></i></span>', t('legMid')],
    ['<span class="dv"><i class="ag" style="width:36%"></i></span>', t('legAgree')],
    ['<span class="dv na"></span>', t('legNone')],
    ['<span class="dv skip"></span>', t('legSkip')],
  ];
  return `
  <section aria-labelledby="map-h" class="tmap-sec">
    <h2 class="h3" id="map-h">${esc(t('mapTitle'))}</h2>
    <p class="small muted tm-how">${esc(t('mapHow'))}</p>
    <p class="tm-swipe" aria-hidden="true">${state.lang === 'es' ? 'Desliza para ver todos los temas' : 'Swipe to see all topics'} →</p>
    <div class="tmap-wrap"><table class="tmap"><colgroup><col class="c-p">${cols}<col class="c-g"></colgroup><thead><tr><th scope="col" class="th-p"><span class="vh">${state.lang === 'es' ? 'Partido' : 'Party'}</span></th>${head}<th scope="col" class="th-g">${state.lang === 'es' ? 'Global' : 'Overall'}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <ul class="tm-legend">${legend.map(([sw, l]) => `<li>${sw}${esc(l)}</li>`).join('')}</ul>
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
  if (state.step === 'question') measureStatements();
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
  const wtog = e.target.closest('[data-wtoggle]');
  if (wtog) {
    const id = wtog.dataset.wtoggle;
    const open = !state.openWeights.has(id);
    if (open) state.openWeights.add(id);
    else state.openWeights.delete(id);
    wtog.setAttribute('aria-expanded', String(open));
    wtog.textContent = open ? t('weightsHide') : t('weightsShow')(state.data.statements.filter((x) => x.topic === id).length);
    app.querySelector(`#wl-${CSS.escape(id)}`).hidden = !open;
    return;
  }
  const sb = e.target.closest('[data-sample]');
  if (sb) {
    for (const x of app.querySelectorAll('[data-sample]')) x.setAttribute('aria-pressed', String(x === sb));
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
  else if (act === 'pdf-report' || act === 'pdf-share' || act === 'png-share') {
    const status = app.querySelector('#share-status');
    btn.disabled = true;
    if (status) status.textContent = t('sharing');
    try {
      const d = await exportData();
      if (act === 'pdf-report') download(new Blob([await reportPdf(d)], { type: 'application/pdf' }), fileName('informe', 'report', 'pdf'));
      else if (act === 'pdf-share') download(new Blob([await sharePdf(d)], { type: 'application/pdf' }), fileName('resumen', 'summary', 'pdf'));
      else await shareImage(await sharePng(d));
      if (status) status.textContent = '';
    } catch (err) {
      console.warn(err);
      if (status) status.textContent = t('loadError');
    } finally {
      btn.disabled = false;
    }
  } else if (act === 'restart') {
    if (hasAnswers() && !confirm(t('confirmRestart'))) return;
    Object.assign(state, { answers: {}, idx: 0, province: '', editing: false, excludeLow: false, showAll: false, partyId: null, notice: null });
    state.openWeights.clear();
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

// ---------- exports (full report PDF; one-page summary PDF/PNG)
function fileName(es, en, ext) {
  return `29N-${state.lang === 'es' ? es : en}.${ext}`;
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function shareImage(blob) {
  const file = new File([blob], fileName('coincidencias', 'matches', 'png'), { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${t('shareText')} ${SITE_URL}` });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  download(blob, file.name);
}

let qrCache = null;
async function exportData() {
  const d = state.data;
  const { results } = currentResults({ forExport: true });
  const inProv = partiesInProvince();
  const visible = d.parties.filter((p) => !inProv || inProv.has(p.id));
  if (!qrCache) {
    try {
      qrCache = parseQr(await (await fetch('img/qr.svg')).text());
    } catch {
      qrCache = null;
    }
  }
  const fmt = (opts) => new Intl.DateTimeFormat(state.lang === 'es' ? 'es-ES' : 'en-GB', { timeZone: 'Europe/Madrid', ...opts }).format(new Date());
  const S = t('report');
  const topics = d.topics.map((tp) => ({ id: tp.id, label: loc(tp.label), short: loc(TOPIC_SHORT[tp.id]) || loc(tp.label), accent: TOPIC_STYLE[tp.id].accent, tint: TOPIC_STYLE[tp.id].tint }));
  const parties = results.map((r) => {
    const p = partyById(r.party);
    const tops = {};
    for (const tr of r.topics) tops[tr.topic] = tr.answered === 0 ? 'skip' : tr.agreement;
    return { id: p.id, name: p.name, mono: MONO[p.id] || p.name.slice(0, 3), pct: r.overall, withPos: r.coverage.withPosition, answeredCount: r.coverage.answered, limited: r.limitedData, topics: tops };
  });
  const answers = [];
  for (const tp of d.topics) {
    for (const st of d.statements.filter((x) => x.topic === tp.id)) {
      const u = state.answers[st.id];
      const by = { agree: [], disagree: [], neutral: [], none: [] };
      for (const p of visible) {
        const stance = d.positions[p.id]?.[st.id]?.stance;
        (by[stance] || by.none).push(p.name);
      }
      answers.push({ topicId: tp.id, text: loc(st.text), answer: u === null || u === undefined ? null : t('answers')[u + 2], favor: by.agree, contra: by.disagree, neutral: by.neutral, none: by.none });
    }
  }
  const restore = `${SITE_URL}${state.lang === 'en' ? '?lang=en' : ''}#r=${encodeRestore({ statements: d.statements, topics: d.topics, answers: state.answers, weights: state.weights, province: state.province })}`;
  const more = d.topics.filter((tp) => state.weights[tp.id] > 1);
  return {
    S,
    lang: state.lang,
    dateLabel: S.generated(fmt({ day: 'numeric', month: 'long', year: 'numeric' })),
    dateShort: fmt({ day: 'numeric', month: 'short', year: 'numeric' }),
    place: state.province ? provinceName(state.province) : t('allParties'),
    answered: answeredCount(),
    total: d.statements.length,
    moreTopics: more.map((tp) => loc(tp.label)),
    moreTopicsFull: more.map((tp) => ({ label: loc(tp.label), accent: TOPIC_STYLE[tp.id].accent, tint: TOPIC_STYLE[tp.id].tint })),
    lessTopics: d.topics.filter((tp) => state.weights[tp.id] < 1).map((tp) => loc(tp.label)),
    topics,
    parties,
    answers,
    restoreUrl: restore,
    siteUrl: SITE_URL,
    siteLabel: SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''),
    qr: qrCache,
  };
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
