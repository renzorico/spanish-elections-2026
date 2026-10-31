// UI controller. All state lives in memory only: nothing is written to browser
// storage, cookies or any server. The only network request is bundle.json.
import { STRINGS } from './i18n.js';
import { computeMatch, sortByAgreement, shuffle, cryptoRandom, DEFAULT_WEIGHT } from './match.js';
import { REPO_URL, applyLang, fetchReference, renderCoverage } from './reference.js';

const app = document.getElementById('app');
const state = {
  lang: initialLang(),
  data: null,
  step: 'intro', // intro | province | question | weights | results
  province: '',
  statementOrder: [],
  partyOrder: [],
  idx: 0,
  answers: {},
  weights: {},
  excludeLow: false,
  sortByMatch: false,
  showAll: false,
  editing: false, // reviewing from the results: Continue and Back return there
  autoAdvance: true, // pointer/touch choices move on by themselves (announced beside the answers); keyboard never does
  ref: null, // 'eleccion' | 'metodologia' while a reference page is shown inside the app
  refReturnFocus: null,
};
let lastPointer = -Infinity;
let lastKey = -Infinity;

function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'es') return q;
  return 'es';
}

const t = (key) => STRINGS[state.lang][key];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const loc = (obj) => (obj ? obj[state.lang] || obj.es || '' : '');
const pct = (x) => `${Math.round(x * 100)} %`;
const locNote = (n) => (!n ? '' : typeof n === 'string' ? n : n[state.lang] || n.es || '');
const hasAnswers = () => Object.values(state.answers).some((v) => v !== null && v !== undefined);
const reportUrl = (partyName, sid, statementText) =>
  `${REPO_URL}/issues/new?title=${encodeURIComponent(`Corrección: ${partyName} · ${sid}`)}&body=${encodeURIComponent(`Partido: ${partyName}\nAfirmación: ${sid} — ${statementText}\n\n¿Qué es incorrecto o qué fuente mejor existe? (enlace, fecha y cita)\n`)}`;

// ---------- data
async function load() {
  app.innerHTML = `<p role="status">${esc(t('loading'))}</p>`;
  try {
    const res = await fetch('data/bundle.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
  } catch (e) {
    app.innerHTML = `<p role="alert">${esc(t('loadError'))}</p>`;
    return;
  }
  // Randomise once per visit: statement order and party order.
  state.statementOrder = shuffle(state.data.statements.map((s) => s.id), cryptoRandom);
  state.partyOrder = shuffle(state.data.parties.map((p) => p.id), cryptoRandom);
  for (const tp of state.data.topics) state.weights[tp.id] = DEFAULT_WEIGHT;
  render();
}

// ---------- helpers
const statementById = (id) => state.data.statements.find((s) => s.id === id);
const topicById = (id) => state.data.topics.find((x) => x.id === id);
const partyById = (id) => state.data.parties.find((p) => p.id === id);

function partiesInProvince() {
  const c = state.data.candidacies;
  if (!state.province || !c || !c.by_province?.[state.province]) return null;
  return new Set(c.by_province[state.province]);
}

function go(step, focusSel = 'h1, h2') {
  state.step = step;
  render();
  const el = app.querySelector(focusSel);
  if (el) {
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: false });
  }
  window.scrollTo({ top: 0 });
}

// ---------- views
function viewIntro() {
  const e = state.data.election;
  return `
  <section class="card intro">
    <h1>${esc(t('appTitle'))}</h1>
    <p class="lead">${esc(t('introLead'))}</p>
    <p><strong>${esc(t('introNoAdvice'))}</strong></p>
    <details class="explainer">
      <summary>${esc(t('explainerTitle'))}</summary>
      <ol>${t('explainer').map((li) => `<li>${esc(li)}</li>`).join('')}</ol>
      <p><a href="eleccion.html${state.lang === 'en' ? '?lang=en' : ''}">${esc(t('election'))} →</a></p>
    </details>
    <p class="meta"><time datetime="${e.date}">29/11/2026</time> · <a href="${esc(e.decree.url)}" rel="noopener">BOE ${esc(e.decree.boe_date)}</a></p>
    <div class="actions"><button class="primary" data-act="start">${esc(t('start'))}</button></div>
  </section>`;
}

function viewProvince() {
  const opts = [...state.data.provinces]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((p) => `<option value="${esc(p.id)}" ${state.province === p.id ? 'selected' : ''}>${esc(p.name)}</option>`)
    .join('');
  return `
  <section class="card">
    <h2>${esc(t('provinceTitle'))}</h2>
    <p class="help" id="prov-help">${esc(t('provinceHelp'))}</p>
    <label class="visually-hidden" for="prov">${esc(t('provinceTitle'))}</label>
    <select id="prov" aria-describedby="prov-help">
      <option value="">${esc(t('provinceAll'))}</option>
      ${opts}
    </select>
    <div class="actions">
      <button data-act="to-intro">${esc(t('back'))}</button>
      <button class="primary" data-act="province-next">${esc(t('continue'))}</button>
    </div>
  </section>`;
}

function viewQuestion() {
  const n = state.statementOrder.length;
  const s = statementById(state.statementOrder[state.idx]);
  const current = state.answers[s.id];
  const answered = current !== null && current !== undefined;
  const labels = t('answers');
  const radios = [-2, -1, 0, 1, 2]
    .map(
      (v, i) => `
      <label class="answer">
        <input type="radio" name="answer" value="${v}" ${current === v ? 'checked' : ''}>
        <span>${esc(labels[i])}</span>
      </label>`,
    )
    .join('');
  return `
  <section class="card question">
    <div class="progress" aria-hidden="true"><div style="width:${(state.idx / n) * 100}%"></div></div>
    <p class="meta" aria-live="polite">${esc(t('questionOf')(state.idx + 1, n))} · ${esc(t('topic'))}: ${esc(loc(topicById(s.topic).label))}</p>
    <h2 id="q-text">${esc(loc(s.text))}</h2>
    <details class="context"><summary>${esc(t('moreContext'))}</summary><p>${esc(loc(s.context))}</p></details>
    <fieldset aria-labelledby="q-text">
      <legend class="visually-hidden">${esc(t('answerLegend'))}</legend>
      <div class="answers">${radios}</div>
    </fieldset>
    <label class="auto"><input type="checkbox" data-toggle="autoAdvance" ${state.autoAdvance ? 'checked' : ''}> ${esc(t('autoAdvance'))}</label>
    <p class="visually-hidden" role="status" id="saved">${answered ? esc(t('savedAnswer')(labels[current + 2])) : ''}</p>
    <div class="actions">
      <button data-act="q-back">${esc(t('back'))}</button>
      ${state.editing ? `<button data-act="back-to-results">${esc(t('backToResults'))}</button>` : ''}
      <button class="link" data-act="q-skip">${esc(t('skipQuestion'))}</button>
      <button class="primary" data-act="q-next" id="q-next" ${answered ? '' : 'disabled'}>${esc(t('continue'))}</button>
    </div>
  </section>`;
}

function viewWeights() {
  const labels = t('weightLabels');
  const rows = shuffleStableTopics()
    .map((tp) => {
      const w = state.weights[tp.id];
      return `
      <fieldset class="weight">
        <legend>${esc(loc(tp.label))}</legend>
        <div class="seg">
          ${[0, 1, 2, 3]
            .map(
              (v) => `<label><input type="radio" name="w-${esc(tp.id)}" value="${v}" ${w === v ? 'checked' : ''} data-topic="${esc(tp.id)}"><span>${esc(labels[v])}</span></label>`,
            )
            .join('')}
        </div>
      </fieldset>`;
    })
    .join('');
  return `
  <section class="card">
    <h2>${esc(t('weightsTitle'))}</h2>
    <p class="help">${esc(t('weightsHelp'))}</p>
    ${rows}
    <div class="actions">
      ${state.editing ? `<button data-act="back-to-results">${esc(t('backToResults'))}</button>` : `<button data-act="w-back">${esc(t('back'))}</button>`}
      <button class="primary" data-act="results">${esc(t('seeResults'))}</button>
    </div>
  </section>`;
}

// Topics shown in the order their first statement appeared (already randomised).
function shuffleStableTopics() {
  const seen = [];
  for (const id of state.statementOrder) {
    const tp = statementById(id).topic;
    if (!seen.includes(tp)) seen.push(tp);
  }
  return seen.map(topicById);
}

function viewResults() {
  const d = state.data;
  const answeredCount = Object.values(state.answers).filter((v) => v !== null && v !== undefined).length;
  const inProv = partiesInProvince();
  const visible = state.partyOrder.filter((id) => state.showAll || !inProv || inProv.has(id)).map(partyById);

  let results = computeMatch({
    statements: d.statements,
    topics: d.topics,
    parties: visible,
    positions: d.positions,
    answers: state.answers,
    weights: state.weights,
    options: { excludeLowConfidence: state.excludeLow },
  });
  if (state.sortByMatch) results = sortByAgreement(results);

  const notice =
    inProv && d.candidacies
      ? `<p class="notice">${esc(t('provinceNotice')(d.candidacies.status))}${
          loc(d.candidacies.notes?.[state.province]) ? `<br>${esc(loc(d.candidacies.notes[state.province]))}` : ''
        }</p>`
      : '';
  const cards = answeredCount === 0 ? `<p class="notice">${esc(t('resultsNoAnswers'))}</p>` : results.map((r) => viewPartyResult(r, inProv)).join('');

  return `
  <section class="results">
    <div class="card">
      <h2>${esc(t('resultsTitle'))}</h2>
      <p>${esc(t('resultsIntro'))}</p>
      ${notice}
      <div class="toggles">
        <label><input type="checkbox" data-toggle="sortByMatch" ${state.sortByMatch ? 'checked' : ''}> ${esc(t('sortToggle'))}</label>
        <label><input type="checkbox" data-toggle="excludeLow" ${state.excludeLow ? 'checked' : ''}> ${esc(t('lowToggle'))}</label>
        ${inProv ? `<label><input type="checkbox" data-toggle="showAll" ${state.showAll ? 'checked' : ''}> ${esc(t('showAllToggle'))}</label>` : ''}
      </div>
    </div>
    <ul class="party-list">${cards}</ul>
    <div class="actions card">
      <button data-act="edit-answers">${esc(t('editAnswers'))}</button>
      <button data-act="edit-weights">${esc(t('editWeights'))}</button>
      <button data-act="restart">${esc(t('restart'))}</button>
    </div>
  </section>`;
}

function bar(value, label) {
  if (value === null) return `<span class="na">${esc(t('na'))}</span>`;
  return `<span class="bar" role="img" aria-label="${esc(label)}: ${pct(value)}"><span style="width:${value * 100}%"></span></span><span class="num">${pct(value)}</span>`;
}

function viewPartyResult(r, inProv) {
  const p = partyById(r.party);
  const prog = p.program_2026?.status === 'published' ? t('programPublished') : t('programPending');
  const notHere = inProv && !inProv.has(p.id) ? `<span class="badge">${esc(t('notInProvince'))}</span>` : '';
  const cand = state.data.candidacies;
  const listName = inProv && inProv.has(p.id) ? cand?.list_names?.[state.province]?.[p.id] : null;
  const isMember = inProv && (cand?.coalition_member?.[state.province] || []).includes(p.id);
  const ballot = listName
    ? `<p class="meta">${esc(t('ballotName'))}: «${esc(listName)}»</p>${isMember ? `<p class="notice small">${esc(t('coalitionNotice'))}</p>` : ''}`
    : '';
  const topicRows = shuffleStableTopics()
    .map((tp) => {
      const tr = r.topics.find((x) => x.topic === tp.id);
      if (!tr || tr.answered === 0) return '';
      return `<tr><th scope="row">${esc(loc(tp.label))}${tr.weight !== 1 ? ` <small>(×${tr.weight})</small>` : ''}<small class="cov">${esc(t('coverageShort')(tr.n, tr.answered))}</small></th><td>${bar(tr.agreement, loc(tp.label))}</td></tr>`;
    })
    .join('');
  const stmtRows = state.statementOrder
    .map((sid) => viewStatementDetail(sid, p))
    .join('');
  return `
  <li class="card party">
    <h3>${esc(p.name)} <small>${esc(p.full_name_2026)}</small></h3>
    <p class="badges"><span class="badge">${esc(prog)}</span>${notHere}</p>
    ${ballot}
    <p class="overall">${esc(t('overall'))}: ${r.overall === null ? `<em>${esc(t('noScore'))}</em>` : bar(r.overall, t('overall'))}</p>
    <p class="meta">${esc(t('coverage')(r.coverage.withPosition, r.coverage.answered))}</p>
    ${r.limitedData ? `<p class="notice small">${esc(t('limitedData'))}</p>` : ''}
    <details>
      <summary>${esc(t('details'))}</summary>
      <table class="topics"><caption>${esc(t('byTopic'))}</caption><thead><tr><th scope="col">${esc(t('topicCol'))}</th><th scope="col">${esc(t('agreementCol'))}</th></tr></thead><tbody>${topicRows}</tbody></table>
      <p class="meta">${esc(t('coverageExplain'))}</p>
      <ul class="stmts">${stmtRows}</ul>
      ${loc(p.notes) ? `<p class="meta">${esc(loc(p.notes))}</p>` : ''}
    </details>
  </li>`;
}

function viewStatementDetail(sid, p) {
  const s = statementById(sid);
  const pos = state.data.positions[p.id]?.[sid];
  const u = state.answers[sid];
  const userLabel = u === null || u === undefined ? t('skipped') : t('answers')[u + 2];
  const stance = pos ? t('stance')[pos.stance] : t('stance').no_clear_position;
  const conf = pos?.confidence ? ` (${t('confidence')[pos.confidence]})` : '';
  const sources = (pos?.sources || [])
    .map(
      (src) =>
        `<li><a href="${esc(src.url)}" rel="noopener noreferrer" target="_blank">${esc(src.title || src.url)}</a>${src.publisher ? ` — ${esc(src.publisher)}` : ''}${src.date ? `, <time>${esc(src.date)}</time>` : ''}${src.page ? `, ${esc(src.page)}` : ''}${src.quote ? `<blockquote lang="${esc(src.lang || 'es')}">${esc(src.quote)}</blockquote>` : ''}</li>`,
    )
    .join('');
  const votes = (pos?.vote_refs || [])
    .map((id) => state.data.votes[id])
    .filter(Boolean)
    .map((v) => {
      const tl = v.by_party?.[p.id];
      const tally = tl ? ` — ${tl.yes} ${t('voteYes')}, ${tl.no} ${t('voteNo')}, ${tl.abstain} ${t('voteAbs')}` : '';
      return `<li><a href="${esc(v.url)}" rel="noopener noreferrer" target="_blank" lang="es">${esc(v.title)}</a> (<time>${esc(v.date)}</time>)${v.relation === 'related' ? ` · ${esc(t('relatedVote'))}` : ''}${esc(tally)}${locNote(v.note) ? `<br><small>${esc(locNote(v.note))}</small>` : ''}</li>`;
    })
    .join('');
  return `
  <li>
    <p class="stmt">${esc(loc(s.text))}</p>
    <dl class="cmp">
      <div><dt>${esc(t('you'))}</dt><dd>${esc(userLabel)}</dd></div>
      <div><dt>${esc(p.name)}</dt><dd class="stance-${esc(pos?.stance || 'no_clear_position')}">${esc(stance)}${esc(conf)}</dd></div>
    </dl>
    ${locNote(pos?.note) ? `<p class="meta">${esc(locNote(pos.note))}</p>` : ''}
    ${
      sources || votes
        ? `<details class="src"><summary>${esc(t('evidence')[pos?.evidence_type || 'none'])} · ${esc(t('sources'))}</summary>
            ${votes ? `<p class="meta">${esc(t('votesTitle'))}</p><ul>${votes}</ul>` : ''}
            <ul>${sources}</ul></details>`
        : ''
    }
    <p class="meta"><a href="${esc(reportUrl(p.name, sid, loc(s.text)))}" rel="noopener noreferrer" target="_blank">${esc(t('reportError'))}</a></p>
  </li>`;
}

// ---------- render & events
function render() {
  document.documentElement.lang = state.lang;
  document.title = t('appTitle');
  const langBtn = document.getElementById('lang');
  if (langBtn) {
    langBtn.textContent = t('langSwitch');
    langBtn.lang = t('langSwitchCode');
  }
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-href-lang]')) {
    el.href = el.dataset.hrefLang + (state.lang === 'en' ? '?lang=en' : '');
  }
  if (!state.data) return;
  if (state.ref) {
    renderReference();
    return;
  }
  const views = { intro: viewIntro, province: viewProvince, question: viewQuestion, weights: viewWeights, results: viewResults };
  app.innerHTML = views[state.step]();
}

// ---------- reference pages shown inside the app (answers stay in memory: audit D-001)
const refCache = {};
async function renderReference() {
  const name = state.ref;
  app.innerHTML = `<section class="card prose" id="ref"><p><button type="button" data-act="close-ref">${esc(t('backToTool'))}</button></p><div id="ref-body"><p role="status">${esc(t('loading'))}</p></div></section>`;
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
  applyLang(body, state.lang);
  const cov = body.querySelector('#coverage');
  if (cov) renderCoverage(cov, state.lang, () => applyLang(body, state.lang));
  const h1 = body.querySelector('h1:not([hidden])') || body.querySelector('h1');
  if (h1 && !state.refFocused) {
    h1.setAttribute('tabindex', '-1');
    h1.focus();
  }
  state.refFocused = true;
}

function openRef(name) {
  state.refReturnFocus = document.activeElement;
  state.ref = name;
  state.refFocused = false;
  history.pushState({ ref: name }, '', `#${name}`);
  render();
  window.scrollTo({ top: 0 });
}

function closeRef() {
  if (history.state?.ref) history.back();
  else showStep();
}

function showStep() {
  state.ref = null;
  render();
  const el = app.querySelector('#q-text, h1, h2');
  if (el) {
    el.setAttribute('tabindex', '-1');
    el.focus();
  }
  window.scrollTo({ top: 0 });
}

window.addEventListener('popstate', (e) => {
  if (e.state?.ref) {
    state.ref = e.state.ref;
    state.refFocused = false;
    render();
  } else if (state.ref) showStep();
});

// Leaving the page would lose the answers; ask first while a questionnaire is in progress.
window.addEventListener('beforeunload', (e) => {
  if (hasAnswers() && state.step !== 'results') {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Header and in-page links to the reference pages open inside the app (modified clicks open normally).
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || !state.data) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const m = url.pathname.match(/\/(eleccion|metodologia)\.html$/);
  if (m) {
    e.preventDefault();
    if (state.ref === m[1]) return;
    openRef(m[1]);
  } else if (state.ref && a.matches('[data-href-lang="./"]')) {
    e.preventDefault();
    closeRef();
  }
});

function saveAnswer(value) {
  state.answers[state.statementOrder[state.idx]] = value;
}

function advance() {
  if (state.idx < state.statementOrder.length - 1) {
    state.idx += 1;
    go('question', '#q-text');
  } else if (state.editing) {
    state.editing = false;
    go('results');
  } else go('weights');
}

app.addEventListener('pointerdown', () => {
  lastPointer = performance.now();
});
document.addEventListener('keydown', () => {
  lastKey = performance.now();
});

app.addEventListener('click', (e) => {
  const radio = e.target.closest('input[name="answer"]');
  if (radio) {
    // A mouse or touch choice moves on by itself (announced next to the answers). Keyboard
    // changes (arrow keys, Space) only save the answer; the user moves on with Continue.
    const byPointer = lastPointer > lastKey && performance.now() - lastPointer < 800;
    if (state.autoAdvance && byPointer) {
      const at = state.idx;
      saveAnswer(Number(radio.value));
      setTimeout(() => {
        if (state.step === 'question' && !state.ref && state.idx === at) advance();
      }, 180);
    }
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'start') go('province');
  else if (act === 'to-intro') go('intro');
  else if (act === 'province-next') {
    state.province = app.querySelector('#prov').value;
    state.idx = 0;
    go('question', '#q-text');
  } else if (act === 'q-back') {
    if (state.idx === 0) go(state.editing ? 'results' : 'province');
    else {
      state.idx -= 1;
      go('question', '#q-text');
    }
    if (state.step === 'results') state.editing = false;
  } else if (act === 'q-next') advance();
  else if (act === 'q-skip') {
    saveAnswer(null);
    advance();
  } else if (act === 'w-back') {
    state.idx = state.statementOrder.length - 1;
    go('question', '#q-text');
  } else if (act === 'back-to-results') {
    state.editing = false;
    go('results');
  } else if (act === 'results') {
    state.editing = false;
    go('results');
  } else if (act === 'edit-answers') {
    state.editing = true;
    state.idx = 0;
    go('question', '#q-text');
  } else if (act === 'edit-weights') {
    state.editing = true;
    go('weights');
  } else if (act === 'close-ref') closeRef();
  else if (act === 'restart') {
    if (hasAnswers() && !confirm(t('confirmRestart'))) return;
    state.answers = {};
    state.idx = 0;
    state.province = '';
    state.editing = false;
    state.sortByMatch = false;
    state.excludeLow = false;
    state.showAll = false;
    state.statementOrder = shuffle(state.statementOrder, cryptoRandom);
    state.partyOrder = shuffle(state.partyOrder, cryptoRandom);
    for (const k of Object.keys(state.weights)) state.weights[k] = DEFAULT_WEIGHT;
    go('intro');
  }
});

app.addEventListener('change', (e) => {
  const el = e.target;
  if (el.name === 'answer') {
    // Selecting an answer only saves it; moving on is explicit (WCAG 3.2.2) unless chosen with a pointer.
    saveAnswer(Number(el.value));
    const next = app.querySelector('#q-next');
    if (next) next.disabled = false;
    const saved = app.querySelector('#saved');
    if (saved) saved.textContent = t('savedAnswer')(t('answers')[Number(el.value) + 2]);
  } else if (el.dataset.toggle === 'autoAdvance') state.autoAdvance = el.checked;
  else if (el.dataset.topic) state.weights[el.dataset.topic] = Number(el.value);
  else if (el.dataset.toggle) {
    state[el.dataset.toggle] = el.checked;
    const sel = `[data-toggle="${el.dataset.toggle}"]`;
    render();
    app.querySelector(sel)?.focus();
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
