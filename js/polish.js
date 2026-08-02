/* =====================================================================
   POLISH — microinterações por cima do script.js base (vanilla, sem GSAP)
   1) Lenis: scroll com inércia (mesma lib da referência Aventura Dental)
   2) Anel do cursor com atraso (lerp) — dá "peso" ao mouse
   3) Botões magnéticos
   4) Scramble nos eyebrows ao entrarem na tela
   ===================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1. LENIS ---------- */
  if (!REDUCED && typeof Lenis !== 'undefined') {
    var lenis = new Lenis({ lerp: 0.1 });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    /* âncoras internas passam pelo Lenis pra manter a inércia */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -16 });
        }
      });
    });
  }

  if (!FINE || REDUCED) return;   // daqui pra baixo é só desktop com mouse

  /* ---------- 2. ANEL DO CURSOR ---------- */
  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  var mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });
  window.addEventListener('mousedown', function () { ring.classList.add('is-down'); });
  window.addEventListener('mouseup', function () { ring.classList.remove('is-down'); });

  (function followRing() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(followRing);
  })();

  /* cresce sobre qualquer coisa clicável */
  var HOVERABLE = 'a, button, summary, input, [role="button"], .pkg-card, .log-card, .proj-card, .cs-dot';
  document.addEventListener('mouseover', function (e) {
    ring.classList.toggle('is-hover', !!e.target.closest(HOVERABLE));
  }, { passive: true });

  /* ---------- 3. BOTÕES MAGNÉTICOS ---------- */
  document.querySelectorAll('.btn, .nav-cta, .proj-arrow, .testimonials-arrow').forEach(function (btn) {
    btn.setAttribute('data-magnetic', '');
    var raf = 0;
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      var dx = (e.clientX - r.left - r.width / 2) * 0.28;
      var dy = (e.clientY - r.top - r.height / 2) * 0.28;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
    });
    btn.addEventListener('mouseleave', function () {
      cancelAnimationFrame(raf);
      btn.style.transition = 'transform .45s cubic-bezier(.2, .9, .3, 1.3)';
      btn.style.transform = '';
      setTimeout(function () { btn.style.transition = ''; }, 450);
    });
  });

  /* ---------- 4. SCRAMBLE NOS EYEBROWS ---------- */
  var GLYPHS = '!<>-_\\/[]{}=+*^?#';
  function scramble(el) {
    var finalText = el.textContent;
    var frame = 0;
    var total = Math.max(18, finalText.length * 2);
    (function tick() {
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        out += (frame / total) * finalText.length > i || finalText[i] === ' '
          ? finalText[i]
          : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (++frame <= total) requestAnimationFrame(tick);
      else { el.textContent = finalText; el.classList.add('scrambled'); }
    })();
  }
  var seen = new WeakSet();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && !seen.has(en.target)) {
        seen.add(en.target);
        scramble(en.target);
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.eyebrow').forEach(function (el) { io.observe(el); });
})();
