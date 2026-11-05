export function initBuilderScroll() {
  const frame = document.querySelector('#preview');
  const panel = document.querySelector('.preview-panel');
  if (!frame || !panel) return;

  const desktop = matchMedia('(min-width:901px)');
  const expanded = () => panel.classList.contains('fullscreen');
  function updateMode() {
    frame.contentWindow?.postMessage({
      type: 'portfolio:mode',
      expanded: expanded(),
      containScroll: desktop.matches || expanded()
    }, '*');
  }

  frame.addEventListener('load', updateMode);
  desktop.addEventListener('change', updateMode);
  new MutationObserver(updateMode).observe(panel, { attributes: true, attributeFilter: ['class'] });
  addEventListener('message', event => {
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type === 'portfolio:ready') updateMode();
    if (event.data?.type === 'portfolio:close' && expanded()) {
      document.querySelector('#fullscreen')?.click();
    }
  });
  panel.addEventListener('wheel', event => {
    if ((!desktop.matches && !expanded()) || event.ctrlKey || !event.deltaY) return;
    event.preventDefault();
    const factor = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? frame.clientHeight : 1;
    const scale = frame.getBoundingClientRect().height / frame.clientHeight || 1;
    frame.contentWindow?.postMessage({ type: 'portfolio:local-scroll', delta: event.deltaY * factor / scale }, '*');
  }, { passive: false });
  updateMode();
}
