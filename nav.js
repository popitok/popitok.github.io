// As the page scrolls, the fixed nav's blurred backdrop fades in so text passing under it stays readable.
(() => {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const update = () => {
    nav.classList.toggle('is-scrolled', scrollY > 8);
    nav.style.setProperty('--nav-fade', Math.min(1, scrollY / 120).toFixed(3));   // full blur after 120px
  };
  update();
  addEventListener('scroll', update, { passive: true });
})();

// Phones: the menu hides behind a "more" button and drops down as a card when tapped.
(() => {
  const nav = document.querySelector('.nav');
  const btn = nav && nav.querySelector('.more');
  if (!btn) return;
  const setOpen = open => {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', e => { e.stopPropagation(); setOpen(!nav.classList.contains('is-open')); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  nav.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  addEventListener('resize', () => { if (innerWidth > 600) setOpen(false); });
})();
