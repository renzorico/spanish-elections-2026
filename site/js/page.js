// Shared script for the static content pages: language toggle and, on the
// methodology page, a data-coverage table built from bundle.json.
const params = new URLSearchParams(location.search);
let lang = params.get('lang') === 'en' ? 'en' : 'es';

function apply() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-lang]')) el.hidden = el.dataset.lang !== lang;
  const btn = document.getElementById('lang');
  if (btn) {
    btn.textContent = lang === 'es' ? 'English' : 'Español';
    btn.lang = lang === 'es' ? 'en' : 'es';
  }
  for (const a of document.querySelectorAll('[data-href-lang]')) a.href = a.dataset.hrefLang + (lang === 'en' ? '?lang=en' : '');
  const title = document.querySelector(`[data-title-${lang}]`);
  if (title) document.title = title.getAttribute(`data-title-${lang}`);
}

document.getElementById('lang')?.addEventListener('click', () => {
  lang = lang === 'es' ? 'en' : 'es';
  const url = new URL(location.href);
  if (lang === 'en') url.searchParams.set('lang', 'en');
  else url.searchParams.delete('lang');
  history.replaceState(null, '', url);
  apply();
});
apply();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const cov = document.getElementById('coverage');
if (cov) {
  fetch('data/bundle.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((b) => {
      // Alphabetical order here (a reference table, not a result).
      const parties = [...b.parties].sort((x, y) => x.name.localeCompare(y.name, 'es'));
      const rows = parties
        .map((p) => {
          const c = p.coverage || {};
          const prog = p.program_2026?.status === 'published'
            ? `<a href="${esc(p.program_2026.url)}" rel="noopener">2026 ✓</a>`
            : '<span data-lang="es">pendiente</span><span data-lang="en">pending</span>';
          return `<tr><th scope="row">${esc(p.name)}</th><td>${c.coded ?? 0}</td><td>${c.high ?? 0}</td><td>${c.medium ?? 0}</td><td>${c.low ?? 0}</td><td>${c.no_clear_position ?? 0}</td><td>${prog}</td></tr>`;
        })
        .join('');
      cov.innerHTML = `<div class="table-wrap"><table>
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
      apply();
    })
    .catch(() => {
      cov.textContent = '—';
    });
}
