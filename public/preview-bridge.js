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

  function syncChildren(current, next) {
    for (let index = 0; index < next.childNodes.length; index++) {
      const incoming = next.childNodes[index];
      const existing = current.childNodes[index];
      if (!existing) current.append(incoming.cloneNode(true));
      else if (existing.isEqualNode(incoming)) continue;
      else if (existing.nodeType !== incoming.nodeType || existing.nodeName !== incoming.nodeName) {
        existing.replaceWith(incoming.cloneNode(true));
      } else if (existing.nodeType === 1) {
        for (const attribute of [...existing.attributes]) {
          if (!incoming.hasAttribute(attribute.name)) existing.removeAttribute(attribute.name);
        }
        for (const attribute of incoming.attributes) {
          if (existing.getAttribute(attribute.name) !== attribute.value) {
            existing.setAttribute(attribute.name, attribute.value);
          }
        }
        syncChildren(existing, incoming);
      } else {
        existing.nodeValue = incoming.nodeValue;
      }
    }
    while (current.childNodes.length > next.childNodes.length) current.lastChild.remove();
  }

  function updateView(view) {
    if (typeof view.stylesheet === 'string') document.querySelector('#portfolio-style').textContent = view.stylesheet;
    if (typeof view.className === 'string') document.body.className = view.className;
    if (typeof view.style === 'string') document.body.setAttribute('style', view.style);
    if (typeof view.markup === 'string') {
      const template = document.createElement('template');
      template.innerHTML = view.markup;
      syncChildren(document.body, template.content);
    }
    apply();
  }

  addEventListener('message', event => {
    if (event.source !== parent) return;
    if (event.data?.type === 'portfolio:hello') {
      // A port stays attached to this document even if a link navigates the iframe.
      const channel = new MessageChannel();
      channel.port1.onmessage = message => {
        if (message.data?.type === 'portfolio:update') updateView(message.data);
      };
      parent.postMessage({ type: 'portfolio:ready' }, '*', [channel.port2]);
    }
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
  addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (link && !link.getAttribute('href').startsWith('#')) event.preventDefault();
  });
  document.currentScript?.remove();
})();
