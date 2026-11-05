export function initBuilderScroll() {
  const frame = document.querySelector('#preview');
  const editor = document.querySelector('.editor');
  const panel = document.querySelector('.preview-panel');
  if (!frame || !editor || !panel) return;

  const viewport = frame.closest('.frame-wrap');
  const mobile = matchMedia('(max-width:900px), (pointer: coarse)');
  let raf = 0;

  function mode() {
    const expanded = panel.classList.contains('fullscreen');
    return { type: 'portfolio:mode', expanded, nativeScroll: expanded || mobile.matches || viewport.classList.contains('mobile') };
  }

  function sync() {
    raf = 0;
    const state = mode();
    frame.contentWindow?.postMessage(state, '*');
    if (state.nativeScroll) return;

    const bounds = editor.getBoundingClientRect();
    const range = Math.max(240, bounds.height - innerHeight + 50);
    const ratio = Math.max(0, Math.min(1, (20 - bounds.top) / range));
    frame.contentWindow?.postMessage({ type: 'portfolio:scroll', ratio }, '*');
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(sync);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  mobile.addEventListener('change', schedule);
  frame.addEventListener('load', schedule);
  addEventListener('message', event => {
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type === 'portfolio:close' && mode().expanded) {
      document.querySelector('#fullscreen')?.click();
      return;
    }
    if (event.data?.type === 'portfolio:ready') schedule();
    if (event.data?.type !== 'portfolio:wheel' || !Number.isFinite(event.data.delta) || mode().nativeScroll) return;
    const factor = event.data.mode === 1 ? 18 : event.data.mode === 2 ? innerHeight : 1;
    scrollBy({ top: Math.max(-innerHeight, Math.min(innerHeight, event.data.delta * factor)), behavior: 'instant' });
  });
  new ResizeObserver(schedule).observe(editor);
  const observer = new MutationObserver(schedule);
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  observer.observe(viewport, { attributes: true, attributeFilter: ['class'] });
  schedule();
}
