// Script for the standalone reference pages (election explainer, methodology):
// language toggle and the data-coverage table on the methodology page.
import { applyLang, renderCoverage } from './reference.js';

const params = new URLSearchParams(location.search);
let lang = params.get('lang') === 'en' ? 'en' : 'es';

function apply() {
  document.documentElement.lang = lang;
  applyLang(document, lang);
  const btn = document.getElementById('lang');
  if (btn) {
    btn.textContent = lang === 'es' ? 'EN' : 'ES';
    btn.setAttribute('aria-label', lang === 'es' ? 'English version' : 'Versión en español');
    btn.lang = lang === 'es' ? 'en' : 'es';
  }
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
  const cov = document.getElementById('coverage');
  if (cov?.querySelector('table, [role=alert]')) renderCoverage(cov, lang, apply);
});
apply();

const cov = document.getElementById('coverage');
if (cov) renderCoverage(cov, lang, apply);
