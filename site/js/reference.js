// Shared helpers for the reference pages (election explainer, methodology).
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
  es: { error: 'No se han podido cargar los datos de cobertura.', retry: 'Reintentar', loading: 'Cargando…' },
  en: { error: 'Could not load the coverage data.', retry: 'Retry', loading: 'Loading…' },
};

/** Fetch JSON, checking the HTTP status. */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

/** Render the per-party data-coverage table into `el` (methodology page). Shows an error with Retry on failure. */
export async function renderCoverage(el, lang, rerender = () => {}) {
  const m = MSG[lang] || MSG.es;
  el.innerHTML = `<p class="meta" role="status">${esc(m.loading)}</p>`;
  let b;
  try {
    b = await fetchJSON('data/bundle.json');
  } catch {
    el.innerHTML = `<p role="alert">${esc(m.error)} <button type="button" data-retry-coverage>${esc(m.retry)}</button></p>`;
    el.querySelector('[data-retry-coverage]').addEventListener('click', () => renderCoverage(el, lang, rerender));
    return;
  }
  // Alphabetical order (a reference table, not a result).
  const parties = [...b.parties].sort((x, y) => x.name.localeCompare(y.name, 'es'));
  const rows = parties
    .map((p) => {
      const c = p.coverage || {};
      const prog =
        p.program_2026?.status === 'published'
          ? `<a href="${esc(p.program_2026.url)}" rel="noopener">2026 ✓</a>`
          : '<span data-lang="es">pendiente</span><span data-lang="en">pending</span>';
      return `<tr><th scope="row">${esc(p.name)}</th><td>${c.coded ?? 0}</td><td>${c.high ?? 0}</td><td>${c.medium ?? 0}</td><td>${c.low ?? 0}</td><td>${c.no_clear_position ?? 0}</td><td>${prog}</td></tr>`;
    })
    .join('');
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th scope="col"><span data-lang="es">Partido</span><span data-lang="en">Party</span></th>
      <th scope="col"><span data-lang="es">Posiciones codificadas</span><span data-lang="en">Coded positions</span></th>
      <th scope="col"><span data-lang="es">Alta</span><span data-lang="en">High</span></th>
      <th scope="col"><span data-lang="es">Media</span><span data-lang="en">Medium</span></th>
      <th scope="col"><span data-lang="es">Baja</span><span data-lang="en">Low</span></th>
      <th scope="col"><span data-lang="es">Sin posición clara</span><span data-lang="en">No clear position</span></th>
      <th scope="col"><span data-lang="es">Programa 2026</span><span data-lang="en">2026 program</span></th>
    </tr></thead><tbody>${rows}</tbody></table></div>
    <p class="meta"><span data-lang="es">Datos generados el</span><span data-lang="en">Data generated on</span> ${esc(b.generated_on)} · ${b.statements.length} <span data-lang="es">afirmaciones</span><span data-lang="en">statements</span>.</p>`;
  applyLang(el, lang);
  rerender();
}
