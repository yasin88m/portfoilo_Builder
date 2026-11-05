const spacing = 15;
const revealRadius = 135;
const clearRadius = 33;

export function initLandingMotion() {
  const hero = document.querySelector('.landing-hero');
  if (!hero || hero.querySelector('.hero-dot-field')) return;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  canvas.className = 'hero-dot-field';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);

  const dots = new Map();
  let pointer = null;
  let frame = 0;
  let previousTime = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function revealNearbyDots() {
    const firstColumn = Math.max(0, Math.ceil((pointer.x - revealRadius) / spacing));
    const firstRow = Math.max(0, Math.ceil((pointer.y - revealRadius) / spacing));
    const lastColumn = Math.floor(Math.min(width, pointer.x + revealRadius) / spacing);
    const lastRow = Math.floor(Math.min(height, pointer.y + revealRadius) / spacing);

    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const x = column * spacing;
        const y = row * spacing;
        const key = row + ':' + column;
        if (Math.hypot(x - pointer.x, y - pointer.y) < revealRadius && !dots.has(key)) {
          dots.set(key, { x, y, offsetX: 0, offsetY: 0, opacity: 0 });
        }
      }
    }
  }

  function draw(time) {
    frame = 0;
    const elapsed = previousTime ? Math.min(time - previousTime, 50) : 16;
    previousTime = time;
    const movement = 1 - Math.exp(-elapsed / 48);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#b986ff';

    let settling = false;
    if (pointer) revealNearbyDots();
    for (const [key, dot] of dots) {
      let opacity = 0;
      let offsetX = 0;
      let offsetY = 0;
      if (pointer) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const proximity = Math.max(0, 1 - distance / revealRadius);
        const push = clearRadius * proximity ** 2;
        opacity = 0.88 * proximity ** 0.8;
        offsetX = distance ? push * dx / distance : push;
        offsetY = distance ? push * dy / distance : 0;
      }

      const fade = 1 - Math.exp(-elapsed / (opacity > dot.opacity ? 60 : 115));
      dot.opacity += (opacity - dot.opacity) * fade;
      dot.offsetX += (offsetX - dot.offsetX) * movement;
      dot.offsetY += (offsetY - dot.offsetY) * movement;
      if (opacity === 0 && dot.opacity < 0.005) {
        dots.delete(key);
        continue;
      }

      settling ||= Math.abs(dot.opacity - opacity) > 0.004
        || Math.abs(dot.offsetX - offsetX) > 0.05
        || Math.abs(dot.offsetY - offsetY) > 0.05;
      const x = dot.x + dot.offsetX;
      const y = dot.y + dot.offsetY;
      // Feather the edge of the clear space while the grid catches up to the pointer.
      const edge = pointer ? Math.min(1, Math.max(0, (Math.hypot(x - pointer.x, y - pointer.y) - 27) / 9)) : 1;
      if (!edge) continue;
      context.globalAlpha = dot.opacity * edge;
      context.beginPath();
      context.arc(x, y, 1.35, 0, 2 * Math.PI);
      context.fill();
    }

    if (settling || (!pointer && dots.size)) schedule();
    else previousTime = 0;
  }

  function leave() {
    pointer = null;
    if (dots.size) schedule();
  }

  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    schedule();
  });
  hero.addEventListener('pointerleave', leave);
  hero.addEventListener('pointercancel', leave);
  window.addEventListener('scroll', leave, { passive: true });
  new ResizeObserver(resize).observe(hero);
  resize();
}
