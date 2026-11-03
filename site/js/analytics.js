// Visit counter: Vercel Web Analytics, loaded from our own address (/_vercel/insights/script.js),
// so the page still loads nothing from other sites. It counts page loads, with country and device
// type; no cookies, no profiles, and nothing about the answers.
//
// Before anything is sent, the address is cut down to origin + path, so the part after "#"
// (which carries answers in shared links) and any "?" parameters never leave the page.
// It does nothing while developing locally or on the old GitHub address.

/** Keep only origin + path of the address that goes with a counted event. */
export function cleanEvent(event, loc) {
  return { ...event, url: `${loc.origin}${loc.pathname}` };
}

/** Count only on the live site. */
export function shouldCount(host) {
  return Boolean(host) && host !== 'localhost' && !/^127\./.test(host) && !host.endsWith('.local') && !host.endsWith('.github.io');
}

if (typeof window !== 'undefined' && shouldCount(location.hostname)) {
  // Same queue the official library installs, so calls made before its script loads are kept.
  window.va =
    window.va ||
    function a(...params) {
      (window.vaq = window.vaq || []).push(params);
    };
  window.vam = 'production';
  window.va('beforeSend', (event) => cleanEvent(event, location));
  const script = document.createElement('script');
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  script.dataset.sdkn = '@vercel/analytics';
  script.dataset.sdkv = '1.6.1';
  script.dataset.disableAutoTrack = '1'; // one page view per load: this site changes screens without reloading
  document.head.appendChild(script);
  window.va('pageview', { route: location.pathname, path: location.pathname });
}
