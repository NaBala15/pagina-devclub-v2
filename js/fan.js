/* =====================================================================
   LEQUE DE DEPOIMENTOS — porte do componente React "card-fan-carousel"
   para JS puro + GSAP (este projeto é vanilla: não há React/Tailwind).

   A geometria, os easings e a lógica de ciclagem são os mesmos do
   original: 7 cartas visíveis, a central em destaque, entrada elástica,
   e as vizinhas "abrindo caminho" quando o mouse pousa numa carta.
   ===================================================================== */
(function () {
  'use strict';

  var wrap = document.getElementById('fan');
  var layout = document.getElementById('fanLayout');
  if (!wrap || !layout) return;
  /* rede de segurança: sem GSAP (CDN bloqueado, offline...) os depoimentos
     ainda precisam aparecer — viram uma grade legível em vez de sumir */
  if (typeof gsap === 'undefined') { wrap.classList.add('is-static'); return; }

  var cards = Array.prototype.slice.call(layout.querySelectorAll('.fan-card'));
  var dots = Array.prototype.slice.call(wrap.querySelectorAll('.fan-dot'));
  var total = cards.length;
  if (!total) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) { wrap.classList.add('is-static'); return; }   // vira grade simples

  var MAX_VISIBLE = 7;
  var HALF = 3;
  var FAN = [
    { rot: -21, scale: 0.7756, x: -30, y: 7.3, z: 1 },
    { rot: -14, scale: 0.8498, x: -22, y: 4.0, z: 2 },
    { rot: -7,  scale: 0.9346, x: -11, y: 1.3, z: 3 },
    { rot: 0,   scale: 1.0,    x: 0,   y: 0.0, z: 10 },
    { rot: 7,   scale: 0.9346, x: 11,  y: 1.3, z: 3 },
    { rot: 14,  scale: 0.8498, x: 22,  y: 4.0, z: 2 },
    { rot: 21,  scale: 0.7756, x: 30,  y: 7.3, z: 1 },
  ];

  var paginado = total > MAX_VISIBLE;
  var slots = paginado ? MAX_VISIBLE : total;
  var centro = paginado ? HALF : total >> 1;

  var animando = false;
  var jaEntrou = false;
  var visiveisAntes = {};
  var mapaAtual = {};
  var slotEmFoco = null;
  var timerSaida = null;

  /* escalas responsivas — mesmas faixas do componente original */
  function multX() {
    var w = window.innerWidth;
    if (w < 480) return 0.28;
    if (w < 640) return 0.38;
    if (w < 768) return 0.5;
    if (w < 1024) return 0.75;
    return 1.0;
  }
  function multY() {
    var w = window.innerWidth;
    /* mesmas alturas do clamp do .fan-layout no CSS (24/28/30/37/42rem) */
    var ideal = w < 480 ? 368 : w < 640 ? 400 : w < 768 ? 440 : w < 1024 ? 480 : 512;
    var disponivel = window.innerHeight * 0.7;
    return disponivel >= ideal ? 1 : disponivel / ideal;
  }

  /* posição de cada encaixe (interpola quando há menos cartas que encaixes) */
  function config(slot) {
    if (slots >= MAX_VISIBLE) return FAN[slot];
    var meio = slots >> 1;
    var d = slots > 1 ? (slot - meio) / meio : 0;
    var ad = Math.abs(d);
    return { rot: d * 21, scale: 1 - 0.2244 * ad * ad, x: d * 30, y: ad * ad * 7.3, z: 10 - Math.abs(slot - meio) };
  }

  function mapaVisivel(c) {
    var m = {};
    if (!paginado) { for (var i = 0; i < total; i++) m[i] = i; return m; }
    for (var s = 0; s < MAX_VISIBLE; s++) {
      m[((c + s - HALF) % total + total) % total] = s;
    }
    return m;
  }

  /* ---------- desenha o leque ---------- */
  function render(direcao, primeiraVez) {
    var mapa = mapaVisivel(centro);
    var mx = multX(), my = multY();
    var visiveis = Object.keys(mapa).length;
    var prontas = 0;

    if (primeiraVez) animando = true;

    function feito() {
      if (++prontas >= visiveis) {
        animando = false;
        if (primeiraVez) jaEntrou = true;
      }
    }

    cards.forEach(function (card, i) {
      var slot = mapa[i];
      var estavaVisivel = !!visiveisAntes[i];

      if (slot !== undefined) {
        var c = config(slot);
        var alvo = {
          x: (c.x * mx) + 'rem', y: (c.y * my) + 'rem',
          rotation: c.rot, scale: c.scale, opacity: 1, zIndex: c.z,
        };
        if (primeiraVez) {
          gsap.set(card, { x: 0, y: (12 * my) + 'rem', rotation: 0, scale: 0.5, opacity: 0 });
          gsap.to(card, Object.assign({}, alvo, {
            duration: 1.2, ease: 'elastic.out(1.05,.78)', delay: 0.2 + slot * 0.06, onComplete: feito }));
        } else if (!estavaVisivel) {
          var entraX = direcao === 'right' ? 40 : -40;
          gsap.set(card, { x: entraX + 'rem', y: (c.y * my) + 'rem',
            rotation: direcao === 'right' ? 30 : -30, scale: 0.5, opacity: 0 });
          gsap.to(card, Object.assign({}, alvo, { duration: 0.6, ease: 'power2.out', onComplete: feito }));
        } else {
          gsap.to(card, Object.assign({}, alvo, { duration: 0.5, ease: 'power2.out', onComplete: feito }));
        }
      } else if (estavaVisivel) {
        var saiX = direcao === 'right' ? -40 : 40;
        gsap.to(card, { x: saiX + 'rem', opacity: 0, scale: 0.5,
          rotation: direcao === 'right' ? -30 : 30, duration: 0.4, ease: 'power2.in', zIndex: 0 });
      } else if (primeiraVez) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });

    visiveisAntes = {};
    Object.keys(mapa).forEach(function (k) { visiveisAntes[k] = true; });
    mapaAtual = mapa;

    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === centro); });
    cards.forEach(function (card, i) { card.classList.toggle('is-center', mapa[i] === (slots >> 1)); });
  }

  /* ---------- hover: a carta sobe e as vizinhas abrem espaço ---------- */
  function layoutHover(slotHover) {
    var mx = multX(), my = multY();
    var meio = slots >> 1;

    cards.forEach(function (card, i) {
      var slot = mapaAtual[i];
      if (slot === undefined) return;
      var base = config(slot);
      var tx = base.x * mx, ty = base.y * my, rot = base.rot, sc = base.scale, atraso = 0;

      if (slotHover !== null) {
        var dist = Math.abs(slot - slotHover);
        atraso = dist * 0.02;
        if (slot === slotHover) {
          ty -= 2.5 * my;
          sc *= 1.08;
        } else {
          var norm = meio > 0 ? (slot - meio) / meio : 0;
          var empurrao = 8 * (1 - Math.abs(norm)) * (1 + 0.2 * Math.max(0, 3 - dist));
          if (slot < slotHover) { tx -= empurrao * mx; rot -= 3 / (dist + 1); }
          else { tx += empurrao * mx; rot += 3 / (dist + 1); }
          if (slot === slots - 1 && slotHover < meio) ty -= 1 * my;
          if (slot === 0 && slotHover > meio) ty -= 1 * my;
        }
      } else {
        atraso = Math.abs(slot - meio) * 0.02;
      }

      gsap.to(card, { x: tx + 'rem', y: ty + 'rem', rotation: rot, scale: sc,
        duration: 0.5, delay: atraso, ease: 'elastic.out(1,.75)', overwrite: 'auto' });
      gsap.set(card, { zIndex: base.z });
    });
  }

  cards.forEach(function (card, i) {
    card.addEventListener('mouseenter', function () {
      if (animando) return;
      var slot = mapaAtual[i];
      if (slot === undefined) return;
      if (timerSaida) { clearTimeout(timerSaida); timerSaida = null; }
      if (slotEmFoco !== slot) { slotEmFoco = slot; layoutHover(slot); }
    });
    /* clicar numa carta lateral traz ela pro centro */
    card.addEventListener('click', function () {
      var slot = mapaAtual[i];
      if (slot === undefined || slot === (slots >> 1) || animando) return;
      irPara(i);
    });
  });

  layout.addEventListener('mouseleave', function () {
    if (animando) return;
    if (timerSaida) clearTimeout(timerSaida);
    timerSaida = setTimeout(function () { slotEmFoco = null; layoutHover(null); }, 50);
  });

  /* ---------- navegação ---------- */
  function ciclar(direcao) {
    if (animando || !paginado) return;
    animando = true;
    slotEmFoco = null;
    centro = direcao === 'right' ? (centro + 1) % total : (centro - 1 + total) % total;
    render(direcao, false);
  }
  function irPara(i) {
    if (animando || i === centro) return;
    /* caminho mais curto no círculo */
    var frente = (i - centro + total) % total;
    ciclar(frente <= total / 2 ? 'right' : 'left');
  }

  document.getElementById('fanPrev').addEventListener('click', function () { ciclar('left'); });
  document.getElementById('fanNext').addEventListener('click', function () { ciclar('right'); });
  dots.forEach(function (d) {
    d.addEventListener('click', function () { irPara(parseInt(d.getAttribute('data-go'), 10)); });
  });

  window.addEventListener('resize', function () {
    if (!animando) layoutHover(slotEmFoco);
  });

  /* ---------- monta quando a seção aparece (entrada elástica visível) ----------
     Três gatilhos independentes para nunca ficar invisível: observer,
     checagem no scroll e checagem no carregamento. */
  var montou = false;
  function montar() {
    if (montou) return;
    montou = true;
    render(null, true);
  }
  function estaVisivel() {
    var r = wrap.getBoundingClientRect();
    return r.top < window.innerHeight * 0.85 && r.bottom > 0;
  }

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { montar(); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(wrap);
  }
  window.addEventListener('scroll', function aoRolar() {
    if (estaVisivel()) { montar(); window.removeEventListener('scroll', aoRolar); }
  }, { passive: true });
  if (estaVisivel()) montar();
})();
