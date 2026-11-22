// Keyboard and mouse state, sampled once per frame by the game loop.
'use strict';
SB.Input = (() => {
  const keys = {};
  const pressed = {};
  const mouse = { x: 640, y: 400, down: false, clicked: false };
  let canvas = null;

  function bind(target) {
    canvas = target;
    addEventListener('keydown', (e) => {
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { keys[e.code] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
    target.addEventListener('mousemove', (e) => {
      const r = target.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (target.width / r.width);
      mouse.y = (e.clientY - r.top) * (target.height / r.height);
    });
    target.addEventListener('mousedown', () => { mouse.down = true; mouse.clicked = true; });
    addEventListener('mouseup', () => { mouse.down = false; });
  }
  function endFrame() { for (const k in pressed) pressed[k] = false; mouse.clicked = false; }
  function down(...codes) { return codes.some((c) => keys[c]); }
  function hit(...codes) { return codes.some((c) => pressed[c]); }
  return { bind, endFrame, down, hit, mouse, keys };
})();
