// Only injected into the builder preview; never exported with the user's website.
(() => {
  if (window.parent === window) return;
  let ratio = 0;
  let expanded = false;
  let nativeScroll = true;

  function apply() {
    if (!nativeScroll) {
      const range = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      window.scrollTo(0, range * ratio);
    }
  }

  addEventListener('message', event => {
    if (event.source !== parent) return;
    if (event.data?.type === 'portfolio:mode') {
      expanded = event.data.expanded === true;
      nativeScroll = expanded || event.data.nativeScroll === true;
    }
    if (event.data?.type === 'portfolio:scroll' && !nativeScroll && Number.isFinite(event.data.ratio)) {
      ratio = Math.max(0, Math.min(1, event.data.ratio));
      apply();
    }
  });

  addEventListener('wheel', event => {
    if (event.ctrlKey || nativeScroll) return;
    event.preventDefault();
    parent.postMessage({ type: 'portfolio:wheel', delta: event.deltaY, mode: event.deltaMode }, '*');
  }, { passive: false });

  addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {
      parent.postMessage({ type: 'portfolio:close' }, '*');
      return;
    }
    if (nativeScroll || event.target?.closest?.('a, button, input, select, textarea, [contenteditable]')) return;
    const delta = { ArrowDown: 60, ArrowUp: -60, PageDown: innerHeight * .8, PageUp: -innerHeight * .8, ' ': innerHeight * .8 }[event.key];
    if (!delta) return;
    event.preventDefault();
    parent.postMessage({ type: 'portfolio:wheel', delta, mode: 0 }, '*');
  });
  new ResizeObserver(apply).observe(document.documentElement);
  parent.postMessage({ type: 'portfolio:ready' }, '*');
})();
