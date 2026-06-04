/** Opens an extension page (privacy.html / help.html) in a new tab. */
function openExtPage(page: string) {
  const hasChrome = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL;
  const url = hasChrome ? chrome.runtime.getURL(page) : `/${page}`;
  if (hasChrome && chrome.tabs?.create) chrome.tabs.create({ url });
  else window.open(url, '_blank', 'noopener');
}

export function AppFooter() {
  return (
    <footer className="mt-auto flex items-center justify-center gap-2 border-t border-line px-4 py-3 text-[11px] text-faint">
      <button onClick={() => openExtPage('help.html')} className="hover:text-primary">
        Help
      </button>
      <span aria-hidden>·</span>
      <button onClick={() => openExtPage('privacy.html')} className="hover:text-primary">
        Privacy
      </button>
      <span aria-hidden>·</span>
      <span>BuyWise v0.1.0</span>
    </footer>
  );
}
