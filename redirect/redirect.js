// Sends visitors of the old GitHub Pages address to the new site, keeping the page, the
// "?lang=en" parameter and the "#…" part (shared results and comparison links live there).
(function () {
  var NEW_SITE = 'https://compara29n.vercel.app/';
  var OLD_BASE = '/spanish-elections-2026/';
  function target(loc) {
    var p = loc.pathname;
    p = p.indexOf(OLD_BASE) === 0 ? p.slice(OLD_BASE.length) : p.replace(/^\//, '');
    p = p.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
    return NEW_SITE + p + loc.search + loc.hash;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { target: target };
  else location.replace(target(location));
})();
