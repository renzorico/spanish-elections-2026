// Shared helpers for the reference pages ("Cómo se vota", "Metodología").
// Used both by the standalone pages (page.js) and by the app, which shows these pages
// inside the same document so that answers in memory are never lost (audit D-001).

export const REPO_URL = 'https://github.com/renzorico/spanish-elections-2026';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Show only the elements written in `lang` inside `root`, and fix language-dependent links. */
export function applyLang(root, lang) {
  for (const el of root.querySelectorAll('[data-lang]')) el.hidden = el.dataset.lang !== lang;
  for (const a of root.querySelectorAll('[data-href-lang]')) a.href = a.dataset.hrefLang + (lang === 'en' ? '?lang=en' : '');
}

const MSG = {
  es: {
    error: 'No se han podido cargar los datos.',
    retry: 'Reintentar',
    loading: 'Cargando…',
    pick: 'Elige una provincia',
    seats: (n) => (n === 1 ? 'diputado' : 'diputados'),
    elects: (name) => `${name} elige`,
    lists: (n, t) => `${n} de los ${t} partidos analizados presentan lista aquí.`,
    eff: (pct) => `Para lograr un escaño suele hacer falta en torno al ${pct} % de los votos (umbral efectivo aproximado; el mínimo legal es el 3 %).`,
    range: 'De 1 diputado (Ceuta y Melilla) a 38 (Madrid).',
    seatsAria: (n) => `${n} escaños`,
    cov: { high: 'Alta', medium: 'Media', low: 'Baja', none: 'Sin posición clara', party: 'Partido', of: (n) => `de ${n}`, pending: 'Programa 2026 pendiente', published: 'Programa 2026 publicado' },
    generated: (d, n) => `Datos generados el ${d} · ${n} afirmaciones por partido.`,
  },
  en: {
    error: 'Could not load the data.',
    retry: 'Retry',
    loading: 'Loading…',
    pick: 'Choose a province',
    seats: (n) => (n === 1 ? 'deputy' : 'deputies'),
    elects: (name) => `${name} elects`,
    lists: (n, t) => `${n} of the ${t} parties analysed have a list here.`,
    eff: (pct) => `Winning a seat usually takes around ${pct}% of the vote (approximate effective threshold; the legal minimum is 3%).`,
    range: 'From 1 deputy (Ceuta and Melilla) to 38 (Madrid).',
    seatsAria: (n) => `${n} seats`,
    cov: { high: 'High', medium: 'Medium', low: 'Low', none: 'No clear position', party: 'Party', of: (n) => `of ${n}`, pending: '2026 program pending', published: '2026 program published' },
    generated: (d, n) => `Data generated on ${d} · ${n} statements per party.`,
  },
};

let bundlePromise = null;
function loadBundle() {
  bundlePromise ||= fetch('data/bundle.json', { cache: 'no-cache' }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
  bundlePromise.catch(() => {
    bundlePromise = null;
  });
  return bundlePromise;
}

/** Fetch a reference page and return the HTML of its <main> content, minus the page chrome. */
export async function fetchReference(name) {
  const res = await fetch(`${name}.html`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const main = doc.querySelector('main');
  if (!main) throw new Error('no <main> in reference page');
  return { html: main.innerHTML, title: doc.title };
}

const langOf = (el) => el.closest('[data-lang]')?.dataset.lang || document.documentElement.lang || 'es';

/** Fill every data widget inside `root` ([data-seats], [data-coverage]) and wire the contents list. */
export async function enhanceReference(root) {
  wireToc(root);
  const widgets = [...root.querySelectorAll('[data-seats], [data-coverage]')];
  if (!widgets.length) return;
  for (const el of widgets) el.innerHTML = `<p class="ref-meta" role="status">${esc(MSG[langOf(el)].loading)}</p>`;
  let b;
  try {
    b = await loadBundle();
  } catch {
    for (const el of widgets) {
      const m = MSG[langOf(el)];
      el.innerHTML = `<p role="alert">${esc(m.error)} <button type="button" class="btn btn-quiet" data-retry>${esc(m.retry)}</button></p>`;
      el.querySelector('[data-retry]').addEventListener('click', () => enhanceReference(root));
    }
    return;
  }
  for (const el of root.querySelectorAll('[data-seats]')) renderSeats(el, b, langOf(el));
  for (const el of root.querySelectorAll('[data-coverage]')) renderCoverage(el, b, langOf(el));
}

// ---------- seats per constituency (election page)
function renderSeats(el, b, lang) {
  const m = MSG[lang];
  const provs = [...b.provinces].sort((x, y) => x.name.localeCompare(y.name, 'es'));
  const id = `seat-sel-${lang}`;
  el.innerHTML = `
    <label class="vh" for="${id}">${esc(m.pick)}</label>
    <select class="select" id="${id}"><option value="">${esc(m.pick)}</option>${provs.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select>
    <div class="seats-out" aria-live="polite"><p class="ref-meta">${esc(m.range)}</p></div>`;
  const out = el.querySelector('.seats-out');
  el.querySelector('select').addEventListener('change', (e) => {
    const p = b.provinces.find((x) => x.id === e.target.value);
    if (!p) {
      out.innerHTML = `<p class="ref-meta">${esc(m.range)}</p>`;
      return;
    }
    const n = p.seats_congreso_2026;
    const lists = b.candidacies?.by_province?.[p.id]?.length;
    // Lijphart's approximation of the effective threshold, bounded below by the legal 3 %.
    const eff = Math.max(3, 75 / (n + 1));
    const effTxt = eff >= 10 ? Math.round(eff) : Math.round(eff * 10) / 10;
    out.innerHTML = `
      <p class="seats-big"><span>${esc(m.elects(p.name))}</span> <b>${n}</b> <span>${esc(m.seats(n))}</span></p>
      <div class="seat-dots" role="img" aria-label="${esc(m.seatsAria(n))}">${'<i></i>'.repeat(n)}</div>
      ${lists ? `<p class="ref-meta">${esc(m.lists(lists, b.parties.length))}</p>` : ''}
      <p class="ref-meta">${esc(m.eff(lang === 'es' ? String(effTxt).replace('.', ',') : effTxt))}</p>`;
  });
}

// ---------- data coverage by party (methodology page)
function renderCoverage(el, b, lang) {
  const m = MSG[lang].cov;
  const total = b.statements.length;
  // Alphabetical order (a reference table, not a result).
  const parties = [...b.parties].sort((x, y) => x.name.localeCompare(y.name, 'es'));
  const seg = (cls, n) => (n ? `<i class="${cls}" style="flex:${n}"></i>` : '');
  const rows = parties
    .map((p) => {
      const c = p.coverage || {};
      const label = `${p.name}: ${m.high} ${c.high ?? 0}, ${m.medium} ${c.medium ?? 0}, ${m.low} ${c.low ?? 0}, ${m.none} ${c.no_clear_position ?? 0}`;
      return `<tr>
        <th scope="row">${esc(p.name)}</th>
        <td class="cov-bar-cell"><span class="cov-bar" role="img" aria-label="${esc(label)}">${seg('hi', c.high)}${seg('md', c.medium)}${seg('lo', c.low)}${seg('no', c.no_clear_position)}</span></td>
        <td class="num">${c.coded ?? 0}<span class="ref-meta"> ${esc(m.of(total))}</span></td>
        <td class="prog">${p.program_2026?.status === 'published' ? `<a href="${esc(p.program_2026.url)}" rel="noopener">${esc(m.published)}</a>` : `<span class="ref-meta">${esc(m.pending)}</span>`}</td>
      </tr>`;
    })
    .join('');
  el.innerHTML = `
    <ul class="cov-legend">
      <li><i class="hi"></i>${esc(m.high)}</li><li><i class="md"></i>${esc(m.medium)}</li><li><i class="lo"></i>${esc(m.low)}</li><li><i class="no"></i>${esc(m.none)}</li>
    </ul>
    <div class="table-wrap"><table class="cov-table"><thead><tr><th scope="col">${esc(m.party)}</th><th scope="col"><span class="vh">${lang === 'es' ? 'Confianza de las posiciones' : 'Confidence of positions'}</span></th><th scope="col" class="num">${lang === 'es' ? 'Con posición' : 'With position'}</th><th scope="col"><span class="vh">${lang === 'es' ? 'Programa 2026' : '2026 program'}</span></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="ref-meta">${esc(MSG[lang].generated(b.generated_on, total))}</p>`;
}

// ---------- contents list: smooth in-page jumps without touching the URL (the app uses
// history entries for its screens) and a marker on the section being read.
function wireToc(root) {
  for (const a of root.querySelectorAll('a[href^="#"]')) {
    if (a.dataset.wired) continue;
    a.dataset.wired = '1';
    a.addEventListener('click', (e) => {
      const target = root.querySelector(a.getAttribute('href').replace(/^#/, '#'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      const h = target.matches('h2, h3') ? target : target.querySelector('h2, h3');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus({ preventScroll: true });
      }
    });
  }
  if (!('IntersectionObserver' in window)) return;
  for (const toc of root.querySelectorAll('.ref-toc')) {
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          for (const a of links) a.removeAttribute('aria-current');
          map.get(en.target.id)?.setAttribute('aria-current', 'true');
        }
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    for (const id of map.keys()) {
      const sec = root.querySelector(`#${CSS.escape(id)}`);
      if (sec) io.observe(sec);
    }
  }
}
