// Phone size follows the window (1 at 1440x900) and never lets the phone's bottom edge fit on screen.
(() => {
  const stage = document.querySelector('.stage');
  if (!stage) return;
  const PHONE_H = 667, BELOW_FOLD = 60;   // the phone always runs at least this far past the bottom edge
  const fit = () => {
    stage.style.marginTop = '';   // measure from the stylesheet's value, not from the last run
    // follow whichever is tighter, the window's height or its width
    const fitsBoth = Math.min(innerHeight / 900, innerWidth / 1440);
    // background logo keeps its own scale (unchanged when the phone size is tuned)
    let ls = Math.min(1.5, Math.max(0.78, fitsBoth * 1.12));   // bubble runs a little larger than the window ratio
    let s = Math.min(1.3, Math.max(0.6, fitsBoth * 0.78));   // desktop/tablet phone: 0.78 at 1440x900
    const isPhone = innerWidth <= 600;
    // phones: the phone is shown large, close to the screen width (tablets keep the desktop rule)
    if (isPhone) s = ls = Math.min(1.3, innerWidth * 0.50 / 318);   // phones: bubble matches the phone scale
    const stageTop = stage.getBoundingClientRect().top;
    if (isPhone) {
      // phones: keep the size and lower the phone instead, so its bottom still runs past the fold
      const want = innerHeight + BELOW_FOLD - PHONE_H * s;
      if (want > stageTop) stage.style.marginTop =
        (parseFloat(getComputedStyle(stage).marginTop) + want - stageTop) + 'px';
    } else {
      // keep the bottom of the phone off-screen whatever the window size
      s = Math.min(1.6, Math.max(s, (innerHeight - stageTop + BELOW_FOLD) / PHONE_H));
      // tablets: the bubble would bottom out at its minimum while the phone grows, so tie it to the phone
      if (innerWidth <= 860) ls = Math.min(1.5, s * 1.3);
    }
    stage.style.setProperty('--s', s.toFixed(3));
    stage.style.setProperty('--ls', ls.toFixed(3));
    window.popiPhoneScale = s;
    window.dispatchEvent(new Event('popi:phonescale'));
  };
  fit();
  addEventListener('resize', fit);
})();

// Mouse parallax: the phone follows the cursor in 3D, the background logo drifts the other way.
(() => {
  const phone = document.querySelector('.phone');
  if (!phone) return;
  const bgLogo = document.querySelector('.bg-logo');
  const glare = document.querySelector('.glare');

  // Body thickness: stacked slices behind the front face.
  const DEPTH = 14;
  for (let i = DEPTH; i >= 1; i--) {
    const s = document.createElement('div');
    s.className = 'phone__layer' + (i === DEPTH ? ' phone__layer--back' : '');
    s.style.transform = `translateZ(${-i}px)`;
    phone.insertBefore(s, phone.firstChild);
  }
  phone.querySelector('.phone__front').style.transform = 'translateZ(0.5px)';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  let tx = 0, ty = 0;   // target, -1..1 from the viewport centre
  let x = 0, y = 0;     // eased value
  let pointerActive = false;
  let lastMove = -Infinity;
  let fw = 0;           // float weight: 0 while the mouse moves, eases to 1 when it rests
  let held = { y: 0, x: 0, rz: 0, rx: 0, ry: 0, sc: 0, by: 0, br: 0 };   // float pose frozen at the moment the mouse starts moving
  let wasResting = true;

  // phone-width screens (600px and below, same line as the size rule) only float, never follow the cursor
  const followsCursor = () => innerWidth > 600;

  if (fine && !reduce) {
    window.addEventListener('pointermove', e => {
      if (!followsCursor() || e.pointerType === 'touch' || e.pointerType === 'pen') return;   // fingers never steer the phone
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      pointerActive = true;
      lastMove = performance.now();
    });
    document.documentElement.addEventListener('pointerleave', () => { tx = 0; ty = 0; pointerActive = false; });
  }

  const tick = t => {
    if (!followsCursor()) { tx = 0; ty = 0; pointerActive = false; }
    x += (tx - x) * 0.35;
    y += (ty - y) * 0.35;

    // zero gravity: after 1.2s without mouse movement (or on touch screens) the phone drifts
    const resting = !pointerActive || t - lastMove > 1200;
    // two sines with unrelated periods per axis, so the drift never settles into an obvious loop
    const live = {
      y: Math.sin(t / 1500) * 9,                                                // bob up and down, px (1.5s)
      x: Math.sin(t / 3000 + 0.5) * 5 + Math.sin(t / 4300 + 2.1) * 2,          // drift sideways, px
      // roll (three.js sense: + = counter-clockwise). The page tilts the phone 6° counter-clockwise via CSS;
      // while floating, cancel that (-0.105 rad) and sway gently, up to ~4° left or right
      rz: -0.105 + Math.sin(t / 2400) * 0.045 + Math.sin(t / 3700 + 1.3) * 0.022,
      rx: Math.sin(t / 2800 + 1) * 0.03 + Math.sin(t / 4100 + 0.4) * 0.016,    // pitch
      ry: Math.sin(t / 3300 + 2) * 0.09 + Math.sin(t / 4600) * 0.045,          // turn left/right, up to ~8°
      sc: 0,
      // background bubble: smaller and out of step with the phone
      by: Math.sin(t / 2000 + 1.7) * 6,
      br: Math.sin(t / 2900 + 0.6) * 0.8,
    };
    const blend = () => Object.fromEntries(Object.keys(live).map(k => [k, held[k] + (live[k] - held[k]) * fw]));
    if (wasResting && !resting) {
      // the mouse just started moving: keep whatever angle the phone is floating at and tilt from there
      held = blend();
      fw = 0;
    }
    wasResting = resting;
    if (resting) fw += (1 - fw) * 0.015;      // drift back into the float slowly, starting from the held pose
    const float = blend();

    window.popiParallax = { x, y, float };   // read by phone3d.js

    phone.style.transform =
      `translate3d(${x * 14 + float.x}px, ${y * 8 - float.y}px, 0) scale(${1 + float.sc}) rotateY(${x * 22 + float.ry * 57.3}deg) rotateX(${-y * 14 - float.rx * 57.3}deg) rotateZ(${-float.rz * 57.3}deg)`;   // CSS + is clockwise, the opposite of three.js
    if (bgLogo) {
      const by = float.by, br = float.br;   // held along with the phone when the mouse starts moving
      bgLogo.style.transform =
        `translate(calc(-50% + ${-x * 24}px), calc(-50% + ${-y * 12 - by}px)) rotate(${br}deg)`;
    }
    if (glare) {
      glare.style.setProperty('--gx', `${50 - x * 45}%`);
      glare.style.setProperty('--gy', `${35 - y * 35}%`);
    }
    requestAnimationFrame(tick);
  };
  if (!reduce) requestAnimationFrame(tick);
})();
