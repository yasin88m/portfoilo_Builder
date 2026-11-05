import test from 'node:test';
import assert from 'node:assert/strict';
import { initLandingMotion } from '../public/motion.js';

test('hero grid stays hidden until hover, clears a space around the pointer, and fades on exit', t => {
  const handlers = {};
  const frames = [];
  const visible = [];
  const context = {
    setTransform() {},
    clearRect() { visible.length = 0; },
    beginPath() {},
    arc(x, y) { visible.push({ x, y, opacity: this.globalAlpha }); },
    fill() {}
  };
  const canvas = { getContext: () => context, setAttribute() {} };
  const hero = {
    querySelector: () => null,
    prepend(element) { assert.equal(element, canvas); },
    addEventListener(name, handler) { handlers[name] = handler; },
    getBoundingClientRect: () => ({ left: 40, top: 80, width: 900, height: 500 })
  };
  const globals = {
    document: { querySelector: () => hero, createElement: () => canvas },
    window: { devicePixelRatio: 2, addEventListener() {} },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: callback => frames.push(callback)
  };
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { delete globalThis[name]; });
  }
  initLandingMotion();
  let time = 16;
  function tick() {
    frames.shift()?.(time);
    time += 16;
  }
  tick();
  assert.equal(canvas.className, 'hero-dot-field');
  assert.equal(visible.length, 0);
  assert.equal(frames.length, 0);

  handlers.pointermove({ pointerType: 'touch', clientX: 340, clientY: 320 });
  assert.equal(frames.length, 0);
  handlers.pointermove({ pointerType: 'mouse', clientX: 340, clientY: 320 });
  for (let index = 0; index < 45; index++) tick();
  assert.ok(visible.length > 30);
  assert.ok(visible.every(dot => {
    const distance = Math.hypot(dot.x - 300, dot.y - 240);
    return distance > 27 && distance < 136;
  }));

  const peak = Math.max(...visible.map(dot => dot.opacity));
  handlers.pointerleave();
  tick();
  assert.ok(visible.length > 0);
  assert.ok(Math.max(...visible.map(dot => dot.opacity)) < peak);
  for (let index = 0; index < 60; index++) tick();
  assert.equal(visible.length, 0);
  assert.equal(frames.length, 0);
});
