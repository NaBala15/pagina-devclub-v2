/* =====================================================================
   DevClub V2 — "DENTRO DA MENTE" · comportamento do corpo da página
   1) Cola da intro 3D          2) Reveals        3) Contadores
   4) Linha das sinapses        5) Partículas     6) Tilt 3D
   7) Janela dev (abas + digitação)   8) Reunião viva   9) História (scroll)
   ===================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. COLA DA INTRO ---------- */
  var veil = $('#introVeil');
  function revealHero() {
    $$('.hero-el').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 120 + i * 130);
    });
  }
  function removeVeil() {
    if (!veil) return;
    veil.classList.add('is-leaving');
    setTimeout(function () { veil.remove(); }, 500);
  }
  if (location.search.indexOf('nointro') !== -1 || REDUCED) {
    removeVeil(); revealHero();
  } else {
    var t0 = performance.now();
    (function waitIntro() {
      if (window.HeadIntro && window.HeadIntro.isReady()) {
        window.HeadIntro.run(revealHero);
        removeVeil();
      } else if (performance.now() - t0 > 6000) {
        removeVeil(); revealHero();
      } else {
        setTimeout(waitIntro, 100);
      }
    })();
  }

  /* ---------- 2. REVEALS ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- 3. CONTADORES ---------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var done = false;
    var cio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || done) return;
      done = true; cio.disconnect();
      var start = performance.now();
      (function tick(now) {
        var t = Math.min((now - start) / 1600, 1);
        el.textContent = Math.floor(target * (1 - Math.pow(1 - t, 3))).toLocaleString('pt-BR') + suffix;
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    }, { threshold: 0.5 });
    cio.observe(el);
  });

  /* ---------- 4. JORNADA: liga os cards com linhas tracejadas ---------- */
  var jboard = $('#jboard');
  var jlines = $('#jlines');
  if (jboard && jlines) {
    var jcards = $$('.jcard', jboard);

    function desenharLinhas() {
      if (window.matchMedia('(max-width: 760px)').matches) { jlines.innerHTML = ''; return; }
      var base = jboard.getBoundingClientRect();
      if (!base.width) return;
      jlines.setAttribute('viewBox', '0 0 ' + base.width + ' ' + base.height);
      var d = '';
      for (var i = 0; i < jcards.length - 1; i++) {
        var a = jcards[i].getBoundingClientRect();
        var b = jcards[i + 1].getBoundingClientRect();
        var paraDireita = b.left > a.left;
        /* sai pela lateral virada ao próximo card e entra pela lateral oposta */
        var x1 = (paraDireita ? a.right : a.left) - base.left;
        var y1 = a.bottom - base.top - a.height * 0.28;
        var x2 = (paraDireita ? b.left : b.right) - base.left;
        var y2 = b.top - base.top + b.height * 0.3;
        var cx = (x1 + x2) / 2;
        var cy = (y1 + y2) / 2 + (paraDireita ? 26 : -26);
        d += '<path d="M' + x1 + ' ' + y1 + ' Q' + cx + ' ' + cy + ' ' + x2 + ' ' + y2 + '"/>';
      }
      jlines.innerHTML = d;
    }

    desenharLinhas();
    window.addEventListener('resize', desenharLinhas);
    window.addEventListener('load', desenharLinhas);
    /* redesenha quando os cards terminam de entrar (posições finais) */
    setTimeout(desenharLinhas, 900);
    setTimeout(desenharLinhas, 2000);
  }

  /* ---------- 5. CAMPO DE PARTÍCULAS ---------- */
  var field = $('#mindField');
  if (field && !REDUCED) {
    var ctx = field.getContext('2d');
    /* no tema claro as partículas neon sumiriam no branco:
       tons mais escuros e menos opacos */
    var PALETAS = {
      dark:  ['#35d6e8', '#8b6cff', '#b44fd9', '#c6ff3d'],
      light: ['#0e91ad', '#6d3ce0', '#a52fbe', '#42690e'],
    };
    function temaAtual() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
    var COLORS = PALETAS[temaAtual()];
    var alphaBase = temaAtual() === 'light' ? 0.16 : 0.25;
    window.addEventListener('temachange', function (e) {
      var t = e.detail === 'light' ? 'light' : 'dark';
      COLORS = PALETAS[t];
      alphaBase = t === 'light' ? 0.16 : 0.25;
      pts.forEach(function (p) { p.c = COLORS[(Math.random() * 4) | 0]; });
    });
    var pts = [], W, H;
    var resize = function () { W = field.width = innerWidth; H = field.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (var i = 0; i < 110; i++) {
      pts.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6,
        s: 0.00008 + Math.random() * 0.00022, c: COLORS[(Math.random() * 4) | 0],
        tw: Math.random() * Math.PI * 2 });
    }
    (function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.y -= p.s;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.globalAlpha = alphaBase + Math.sin(t * 0.0012 + p.tw) * 0.18;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })(0);
  }

  /* ---------- 6. TILT 3D ---------- */
  if (FINE && !REDUCED) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-py * 7) + 'deg) rotateY(' + (px * 9) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .5s cubic-bezier(.2,.9,.3,1.2)';
        card.style.transform = '';
        setTimeout(function () { card.style.transition = ''; }, 500);
      });
    });
  }

  /* ---------- 7. JANELA DEV: abas + digitação ---------- */
  var devwin = $('#devwin');
  if (devwin) {
    /* abas */
    $$('.devtab', devwin).forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.devtab', devwin).forEach(function (t) { t.classList.remove('is-on'); });
        $$('.devpane', devwin).forEach(function (p) { p.classList.remove('is-on'); });
        tab.classList.add('is-on');
        $('.devpane[data-pane="' + tab.getAttribute('data-tab') + '"]', devwin).classList.add('is-on');
      });
    });

    /* editor: digita o código, colore a linha ao completar, e recomeça */
    var CODE_LINES = [
      { raw: "// desafio da semana: seu primeiro portfolio", html: "<span class='cm'>// desafio da semana: seu primeiro portfólio</span>" },
      { raw: "import { criarPagina } from '@devclub/kit';", html: "<span class='kw'>import</span> { <span class='fn'>criarPagina</span> } <span class='kw'>from</span> <span class='str'>'@devclub/kit'</span>;" },
      { raw: "", html: "" },
      { raw: "const aluno = {", html: "<span class='kw'>const</span> aluno = {" },
      { raw: "  nome: 'Marina',", html: "  nome: <span class='str'>'Marina'</span>," },
      { raw: "  meta: 'primeira vaga em tech',", html: "  meta: <span class='str'>'primeira vaga em tech'</span>," },
      { raw: "};", html: "};" },
      { raw: "", html: "" },
      { raw: "criarPagina(aluno).publicar();", html: "<span class='fn'>criarPagina</span>(aluno).<span class='fn'>publicar</span>();" },
    ];
    var codeEl = $('#codeArea');
    if (codeEl && !REDUCED) {
      var li = 0, ci = 0, doneHtml = '';
      (function typeCode() {
        if (li >= CODE_LINES.length) {
          setTimeout(function () { li = 0; ci = 0; doneHtml = ''; typeCode(); }, 5200);
          return;
        }
        var line = CODE_LINES[li];
        if (ci <= line.raw.length) {
          codeEl.innerHTML = doneHtml + line.raw.slice(0, ci) + "<span class='cursor'></span>";
          ci += 1;
          setTimeout(typeCode, line.raw ? 34 : 120);
        } else {
          doneHtml += line.html + "\n";
          codeEl.innerHTML = doneHtml + "<span class='cursor'></span>";
          li += 1; ci = 0;
          setTimeout(typeCode, 260);
        }
      })();
    } else if (codeEl) {
      codeEl.innerHTML = CODE_LINES.map(function (l) { return l.html; }).join('\n');
    }

    /* terminal: roda comandos em loop */
    var TERM_LINES = [
      "$ npm run entregar-projeto",
      "<span class='dim'>» rodando testes…</span>",
      "✓ 12 testes passando",
      "<span class='dim'>» build de produção…</span>",
      "✓ deploy: https://meu-projeto.devclub.app",
      "★ feedback do tutor: aprovado! bora pro próximo módulo",
    ];
    var termEl = $('#termArea');
    if (termEl && !REDUCED) {
      var ti = 0;
      (function typeTerm() {
        if (ti >= TERM_LINES.length) {
          setTimeout(function () { ti = 0; termEl.innerHTML = ''; typeTerm(); }, 4800);
          return;
        }
        termEl.innerHTML += TERM_LINES[ti] + "\n";
        ti += 1;
        setTimeout(typeTerm, ti === 1 ? 900 : 650);
      })();
    } else if (termEl) {
      termEl.innerHTML = TERM_LINES.join('\n');
    }
  }

  /* ---------- CONTROLE DA SALA ----------
     Estado compartilhado entre os vídeos (8b), as legendas (8) e os botões
     da barra (8c). Enquanto "congelada" ou "encerrada", nada volta a tocar
     sozinho por rolagem — senão o botão de pausar seria desfeito no primeiro
     scroll. */
  var salaCtrl = { congelada: false, encerrada: false, itens: [] };
  salaCtrl.parada = function () { return salaCtrl.congelada || salaCtrl.encerrada; };

  /* ---------- 8. REUNIÃO VIVA: legendas + quem está falando ---------- */
  var meet = $('#meet');
  if (meet && !REDUCED) {
    var CAPTIONS = [
      '"Compartilha a tela e roda o teste de novo — agora repara no console."',
      '"Boa, Marina! Esse erro é clássico: faltou o await na linha 12."',
      '"Quem mais quer mostrar o projeto hoje? Pode abrir o mic."',
      '"Semana que vem: simulação de entrevista. Tragam o currículo!"',
    ];
    var capEl = $('#meetCaption');
    var thumbs = $$('.meet-thumb', meet);
    var idx = 0;
    setInterval(function () {
      if (salaCtrl.parada()) return;
      idx = (idx + 1) % CAPTIONS.length;
      capEl.style.opacity = '0';
      setTimeout(function () {
        capEl.textContent = CAPTIONS[idx];
        capEl.style.opacity = '1';
      }, 350);
      thumbs.forEach(function (t) { t.classList.remove('is-speaking'); });
      if (idx % 2 === 1) {
        thumbs[(idx / 2) | 0].classList.add('is-speaking');
      }
    }, 4600);
  }

  /* ---------- 8b. VÍDEOS DA MENTORIA: mudos, em loop, só quando visíveis ----------
     Os arquivos ainda têm trilha de áudio, então o silêncio não pode depender
     só do atributo `muted` (o menu do navegador deixaria reativar o som):
     qualquer tentativa de mudar o volume é desfeita aqui. */
  $$('.meet-video').forEach(function (video) {
    function silenciar() {
      if (!video.muted || video.volume !== 0) {
        video.muted = true;
        video.volume = 0;
      }
    }
    silenciar();
    video.addEventListener('volumechange', silenciar);

    /* Não há `autoplay` no HTML de propósito: quem chama o play é o
       ajustar() logo abaixo, que só toca o que está na tela. Com movimento
       reduzido nem isso acontece — fica o poster, que é a foto do tutor. */
    if (REDUCED) return;

    /* Fora da tela o vídeo pausa: nada de gastar bateria à toa.
       O IntersectionObserver resolve isso, mas ele é a única peça aqui que
       pode não disparar (aba em segundo plano, ambiente de teste). Como o
       pedido é "loop infinito", a rolagem serve de segunda opinião — assim
       o pior caso é o vídeo continuar tocando, nunca ficar travado parado. */
    var tocandoAgora = null;
    function ajustar() {
      /* botão de pausar / saiu da chamada mandam mais que a rolagem */
      if (salaCtrl.parada()) {
        if (!video.paused) video.pause();
        tocandoAgora = null;          // ao voltar, reavalia do zero
        return;
      }
      var r = video.getBoundingClientRect();
      var visivel = r.bottom > 0 && r.top < (window.innerHeight || 0);
      if (visivel === tocandoAgora) return;
      tocandoAgora = visivel;
      if (visivel) {
        var pr = video.play();
        /* se o play for recusado (aba sem permissão, arquivo ainda chegando),
           zera a marca: sem isso o vídeo ficaria registrado como "tocando" e
           nenhuma rolagem seguinte tentaria de novo — ficava no poster pra
           sempre. Com preload="none" essa é a única chance de ele começar. */
        if (pr && pr.catch) pr.catch(function () { tocandoAgora = null; });
      } else {
        video.pause();
      }
    }
    new IntersectionObserver(ajustar, { threshold: 0.1 }).observe(video);

    /* limitador por tempo (nada de rAF: em aba de fundo ele congela e o
       vídeo ficaria parado pra sempre). O disparo atrasado garante que a
       última parada da rolagem também seja avaliada. */
    var ultimo = 0, atrasado = null;
    function pedirAjuste() {
      var agora = Date.now();
      if (agora - ultimo >= 120) { ultimo = agora; atrasado = null; ajustar(); return; }
      if (atrasado) return;
      atrasado = setTimeout(function () {
        atrasado = null; ultimo = Date.now(); ajustar();
      }, 120);
    }
    window.addEventListener('scroll', pedirAjuste, { passive: true });
    window.addEventListener('resize', pedirAjuste);
    ajustar();

    salaCtrl.itens.push({
      el: video,
      reavaliar: function () { tocandoAgora = null; ajustar(); },
      voltarAoComeco: function () { try { video.currentTime = 0; } catch (e) {} },
    });
  });

  /* ---------- 8c. BOTÕES DA SALA ----------
     A barra deixa de ser enfeite: cada botão faz o que promete. */
  var salaEl = $('#meet');
  if (salaEl) {
    var avisoEl = $('#meetAviso', salaEl);
    var fimEl = $('#meetFim', salaEl);
    var botoes = {};
    $$('[data-acao]', salaEl).forEach(function (b) { botoes[b.getAttribute('data-acao')] = b; });
    var limpaAviso = null;

    function avisar(texto, segundos) {
      if (limpaAviso) { clearTimeout(limpaAviso); limpaAviso = null; }
      if (!texto) { avisoEl.hidden = true; avisoEl.textContent = ''; return; }
      avisoEl.textContent = texto;
      avisoEl.hidden = false;
      if (segundos) limpaAviso = setTimeout(function () { avisar(null); }, segundos * 1000);
    }
    function reavaliarTodos() {
      salaCtrl.itens.forEach(function (i) { i.reavaliar(); });
    }
    function marcar(botao, ligado) {
      botao.classList.toggle('is-off', ligado);
      botao.setAttribute('aria-pressed', ligado ? 'true' : 'false');
    }

    /* --- monitor: congela a sala --- */
    if (botoes.pausar) botoes.pausar.addEventListener('click', function () {
      salaCtrl.congelada = !salaCtrl.congelada;
      marcar(botoes.pausar, salaCtrl.congelada);
      salaEl.classList.toggle('is-pausada', salaCtrl.congelada);
      botoes.pausar.setAttribute('aria-label',
        salaCtrl.congelada ? 'retomar os vídeos da sala' : 'pausar os vídeos da sala');
      reavaliarTodos();
      avisar(salaCtrl.congelada ? 'vídeos pausados' : null, salaCtrl.congelada ? 0 : 0);
    });

    /* --- microfone: só aparência, não há áudio nenhum na página --- */
    var micDesligado = false;
    if (botoes.mic) botoes.mic.addEventListener('click', function () {
      micDesligado = !micDesligado;
      marcar(botoes.mic, micDesligado);
      botoes.mic.setAttribute('aria-label',
        micDesligado ? 'ligar o microfone' : 'desligar o microfone');
      avisar(micDesligado ? 'seu microfone está desligado' : null);
    });

    /* --- câmera: pede de verdade e devolve na hora ---
       O navegador mostra o próprio pedido de permissão. Se a pessoa aceitar,
       as trilhas são encerradas imediatamente: nada é exibido, gravado nem
       enviado — a luz da webcam nem chega a ficar acesa. Depois disso a sala
       diz o que é verdade: não dá pra conectar, isto aqui é uma demonstração. */
    var camPedida = false;
    function camNaoConectada() {
      marcar(botoes.camera, true);
      botoes.camera.setAttribute('aria-label', 'câmera não conectada');
      avisar('câmera não conectada · esta sala é uma demonstração', 6);
      camPedida = false;
    }
    if (botoes.camera) botoes.camera.addEventListener('click', function () {
      if (camPedida) return;
      camPedida = true;
      avisar('procurando sua câmera…');
      var md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) { setTimeout(camNaoConectada, 700); return; }
      md.getUserMedia({ video: true, audio: false }).then(function (fluxo) {
        fluxo.getTracks().forEach(function (t) { t.stop(); });   // devolve na hora
        setTimeout(camNaoConectada, 500);
      }).catch(function () {
        setTimeout(camNaoConectada, 300);
      });
    });

    /* --- ampliar: quem apresenta ocupa a sala, os outros viram selo --- */
    var ampliado = false;
    if (botoes.ampliar) botoes.ampliar.addEventListener('click', function () {
      ampliado = !ampliado;
      marcar(botoes.ampliar, ampliado);
      salaEl.classList.toggle('is-ampliado', ampliado);
      botoes.ampliar.setAttribute('aria-label',
        ampliado ? 'voltar ao tamanho normal' : 'ampliar o vídeo de quem apresenta');
      /* as miniaturas mudaram de tamanho e lugar: reavalia depois da transição */
      setTimeout(reavaliarTodos, 380);
    });

    /* --- vermelho: sai da chamada --- */
    if (botoes.sair) botoes.sair.addEventListener('click', function () {
      salaCtrl.encerrada = true;
      salaEl.classList.add('is-fora');
      reavaliarTodos();
      salaCtrl.itens.forEach(function (i) { i.voltarAoComeco(); });
      avisar(null);
      fimEl.hidden = false;
      var voltar = $('[data-acao="voltar"]', fimEl);
      if (voltar) voltar.focus();
    });

    /* --- entrar de novo: tudo volta ao estado inicial --- */
    if (botoes.voltar) botoes.voltar.addEventListener('click', function () {
      salaCtrl.encerrada = false;
      salaCtrl.congelada = false;
      micDesligado = false;
      ampliado = false;
      salaEl.classList.remove('is-fora', 'is-pausada', 'is-ampliado');
      fimEl.hidden = true;
      ['pausar', 'mic', 'camera', 'ampliar'].forEach(function (k) {
        if (botoes[k]) marcar(botoes[k], false);
      });
      avisar(null);
      reavaliarTodos();
      if (botoes.sair) botoes.sair.focus();
    });
  }

  /* ---------- 9b. DECK DE FORMAÇÕES (painéis pareados) ---------- */
  var fdeck = $('#fdeck');
  if (fdeck) {
    var pairs = $$('.fpair', fdeck);
    var fdots = $$('.fdot', fdeck);
    var fnameEl = $('#fname');
    var NOMES = ['Full Stack', 'Front-end', 'Cibersegurança', 'Back-end', 'IA & Dados'];
    var fn = pairs.length;
    var fpos = 0, fgoal = 0;
    var mobile = window.matchMedia('(max-width: 720px)').matches;

    function renderF() {
      for (var i = 0; i < fn; i++) {
        var d = i - fpos;
        var ad = Math.abs(d);
        if (!mobile) {
          pairs[i].style.transform =
            'translateX(-50%) translateX(' + (d * 66) + '%) rotateY(' + (d * -16) +
            'deg) translateZ(' + (-ad * 240) + 'px) scale(' + Math.max(1 - ad * 0.06, 0.72) + ')';
          pairs[i].style.opacity = ad > 2.4 ? 0 : String(1 - ad * 0.32);
          pairs[i].style.zIndex = String(100 - Math.round(ad * 10));
          pairs[i].style.pointerEvents = ad > 2.4 ? 'none' : 'auto';
        }
        pairs[i].classList.toggle('is-on', Math.round(fpos) === i);
      }
      var on = Math.round(Math.min(Math.max(fpos, 0), fn - 1));
      fdots.forEach(function (dt, i) { dt.classList.toggle('is-on', i === on); });
      if (fnameEl && fnameEl.textContent !== NOMES[on]) {
        fnameEl.classList.add('is-swap');
        setTimeout(function () {
          fnameEl.textContent = NOMES[on];
          fnameEl.classList.remove('is-swap');
        }, 180);
      }

    }

    (function fLoop() {
      if (Math.abs(fgoal - fpos) > 0.001) { fpos += (fgoal - fpos) * 0.12; renderF(); }
      requestAnimationFrame(fLoop);
    })();

    var goF = function (i) { fgoal = Math.min(Math.max(i, 0), fn - 1); };
    $('#fprev').addEventListener('click', function () { goF(Math.round(fgoal) - 1); });
    $('#fnext').addEventListener('click', function () { goF(Math.round(fgoal) + 1); });
    fdots.forEach(function (dt) {
      dt.addEventListener('click', function () { goF(parseInt(dt.getAttribute('data-go'), 10)); });
    });
    /* clicar num painel lateral traz ele pro centro */
    pairs.forEach(function (pr, i) {
      var trazPraFrente = function (e) {
        if (Math.round(fgoal) === i) return;   // já é o central: deixa interagir
        e.preventDefault();
        e.stopPropagation();
        goF(i);
      };
      pr.addEventListener('click', trazPraFrente);
      pr.addEventListener('touchend', trazPraFrente, { passive: false });
    });
    /* abre direto na Cibersegurança quando a seção entra na tela (é a estrela) */
    var fio = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { goF(2); fio.disconnect(); }
    }, { threshold: 0.35 });
    fio.observe(fdeck);

    renderF();
  }

  /* ---------- 9c. TUTORES: trilho arrastável + card que abre a bio ---------- */
  var trilho = $('#tutRail');
  if (trilho) {
    var tutCards = $$('.tut-card', trilho);
    var setaAnt = $('.tut-prev');
    var setaProx = $('.tut-next');

    /* --- arrastar com o mouse (e com o dedo, via scroll nativo) --- */
    var arrastando = false, xInicial = 0, scrollInicial = 0, arrastou = false;

    /* IMPORTANTE: o modo arrasto só começa depois que o mouse anda de fato.
       Se marcássemos o arrasto já no apertar do botão (com captura de
       ponteiro e pointer-events:none nos cards), um clique simples viraria
       alvo do trilho e o card nunca abriria. */
    function mover(e) {
      if (!arrastando) return;
      var dx = e.clientX - xInicial;
      if (!arrastou && Math.abs(dx) > 5) {
        arrastou = true;
        trilho.classList.add('is-drag');          // só agora vira arrasto
      }
      if (arrastou) trilho.scrollLeft = scrollInicial - dx;
    }
    function soltar() {
      if (!arrastando) return;
      arrastando = false;
      trilho.classList.remove('is-drag');
      window.removeEventListener('pointermove', mover);
      /* solta a trava do clique logo depois, pra não engolir o próximo */
      setTimeout(function () { arrastou = false; }, 60);
      atualizarSetas();
    }
    trilho.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;      // no toque o scroll nativo resolve
      arrastando = true; arrastou = false;
      xInicial = e.clientX;
      scrollInicial = trilho.scrollLeft;
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar, { once: true });
      window.addEventListener('pointercancel', soltar, { once: true });
    });

    /* --- clicar no card abre a bio (um aberto por vez) --- */
    /* Se o card aberto estiver encostado numa ponta, ele fica por baixo da
       seta e com a bio difícil de ler. Aqui o trilho desliza o mínimo
       necessário: o primeiro anda pra direita, o último pra esquerda. */
    function garantirVisivel(card) {
      var margem = 58;
      var rt = trilho.getBoundingClientRect();
      var r = card.getBoundingClientRect();
      var destino = null;
      if (r.left < rt.left + margem) {
        destino = trilho.scrollLeft - ((rt.left + margem) - r.left);
      } else if (r.right > rt.right - margem) {
        destino = trilho.scrollLeft + (r.right - (rt.right - margem));
      }
      if (destino === null) return;
      destino = Math.max(0, Math.min(destino, trilho.scrollWidth - trilho.clientWidth));
      var antes = trilho.scrollLeft;
      trilho.scrollTo({ left: destino, behavior: 'smooth' });
      setTimeout(function () {
        if (trilho.scrollLeft === antes) trilho.scrollLeft = destino;   // garante o movimento
        atualizarSetas();
      }, 380);
    }

    function alternar(card) {
      var abrindo = !card.classList.contains('is-open');
      tutCards.forEach(function (c) {
        c.classList.remove('is-open');
        c.setAttribute('aria-expanded', 'false');
      });
      if (abrindo) {
        card.classList.add('is-open');
        card.setAttribute('aria-expanded', 'true');
        garantirVisivel(card);
      }
    }
    tutCards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (arrastou) return;                     // era arrasto, não clique
        alternar(card);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(card); }
      });
    });

    /* --- setas --- */
    function passo() {
      return (tutCards[0] ? tutCards[0].offsetWidth : 240) + 18;
    }
    function atualizarSetas() {
      if (!setaAnt || !setaProx) return;
      var max = trilho.scrollWidth - trilho.clientWidth - 2;
      setaAnt.disabled = trilho.scrollLeft <= 2;
      setaProx.disabled = trilho.scrollLeft >= max;
    }
    /* rola suave; se o navegador ignorar (preferência de sistema, versão
       antiga), garante o movimento de forma instantânea */
    function rolar(delta) {
      var antes = trilho.scrollLeft;
      trilho.scrollBy({ left: delta, behavior: 'smooth' });
      setTimeout(function () {
        if (trilho.scrollLeft === antes) trilho.scrollLeft = antes + delta;
        atualizarSetas();   // não depende do evento de rolagem chegar
      }, 380);
    }
    if (setaAnt && setaProx) {
      setaAnt.addEventListener('click', function () { rolar(-passo()); });
      setaProx.addEventListener('click', function () { rolar(passo()); });
      trilho.addEventListener('scroll', atualizarSetas, { passive: true });
      window.addEventListener('resize', atualizarSetas);
      atualizarSetas();
    }
  }

  /* ---------- 9d. ALÉM DO CÓDIGO: o scroll vertical empurra o trilho de lado ----------
     Nada de rAF nem de roubar a roda do mouse: o driver lê a posição da
     pista a cada evento de scroll (que já chega no ritmo dos frames) e
     traduz o progresso vertical em deslocamento horizontal. */
  var alemPista = $('#alemPista');
  if (alemPista && !REDUCED) {
    var alemPalco = $('#alemPalco');
    var alemTrack = $('#alemTrack');
    var alemBarra = $('#alemBarra');
    var alemCards = $$('.perk', alemTrack);
    var alemMobile = window.matchMedia('(max-width: 760px)');

    function limparAlem() {
      alemTrack.style.transform = '';
      alemCards.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; });
    }

    function moverAlem() {
      if (alemMobile.matches) return;         // celular: scroll nativo cuida
      var r = alemPista.getBoundingClientRect();
      var percurso = r.height - window.innerHeight;
      if (percurso <= 0) return;
      var p = Math.min(1, Math.max(0, -r.top / percurso));
      var sobra = alemTrack.scrollWidth - alemPalco.clientWidth;
      alemTrack.style.transform = 'translate3d(' + (-p * sobra) + 'px,0,0)';
      alemBarra.style.width = (p * 100).toFixed(2) + '%';

      /* foco: o card mais perto do centro da tela fica inteiro; os outros
         recuam um pouco — dá profundidade sem esconder ninguém */
      var centro = window.innerWidth / 2;
      alemCards.forEach(function (card) {
        var b = card.getBoundingClientRect();
        var dist = Math.abs(b.left + b.width / 2 - centro) / centro;
        var perto = Math.max(0, 1 - Math.min(dist, 1));
        card.style.opacity = (0.55 + 0.45 * Math.min(1, perto * 1.7)).toFixed(3);
        card.style.transform = 'scale(' + (0.93 + 0.07 * Math.min(1, perto * 1.5)).toFixed(4) + ')';
      });
    }

    window.addEventListener('scroll', moverAlem, { passive: true });
    window.addEventListener('resize', moverAlem);
    if (alemMobile.addEventListener) {
      alemMobile.addEventListener('change', function (e) {
        if (e.matches) limparAlem(); else moverAlem();
      });
    }
    window.addEventListener('load', moverAlem);
    moverAlem();
  }

  /* ---------- 9e. PERGAMINHO: quebrar o selo desenrola o diploma ----------
     Sequência por setTimeout (não por transitionend: transição congelada
     em aba oculta nunca dispararia o evento e o diploma ficaria preso). */
  var pergEl = $('#perg');
  var dipEnvelope = $('#dipEnvelope');
  if (pergEl && dipEnvelope) {
    var pergSelo = $('#pergSelo');

    /* o selo gruda no nó do laço: mede o marcador #pgNo dentro do SVG.
       Assim a âncora sobrevive a qualquer largura de tela. */
    function ancorarSelo() {
      var marca = $('#pgNo', pergEl);
      var arte = $('.perg-arte', pergEl);
      if (!marca || !arte) return;
      var m = marca.getBoundingClientRect();
      var a = arte.getBoundingClientRect();
      if (!a.width) return;
      pergSelo.style.left = ((m.left + m.width / 2 - a.left) / a.width * 100).toFixed(2) + '%';
      pergSelo.style.top = ((m.top + m.height / 2 - a.top) / a.height * 100).toFixed(2) + '%';
    }
    ancorarSelo();
    window.addEventListener('resize', ancorarSelo);
    window.addEventListener('load', ancorarSelo);

    /* linha do tempo sincronizada (fases sobrepostas, não em fila):
       0ms cera estilhaça · 120ms laço se desata · 400ms papel desenrola */
    var abrindo = false;
    function abrirDiploma() {
      if (abrindo) return;
      abrindo = true;
      var rapido = REDUCED;
      pergSelo.classList.add('is-quebrando');
      setTimeout(function () { pergEl.classList.add('is-desatando'); }, rapido ? 0 : 120);
      setTimeout(function () {
        dipEnvelope.classList.add('is-aberto');
        pergEl.classList.add('is-sumindo');
      }, rapido ? 0 : 400);
      setTimeout(function () {
        pergEl.hidden = true;
        var dip = $('.dip', dipEnvelope);
        dip.setAttribute('tabindex', '-1');
        dip.focus({ preventScroll: true });
      }, rapido ? 50 : 1500);
    }
    pergSelo.addEventListener('click', abrirDiploma);
  }

  /* ---------- 10. DECK DE PROJETOS: arrasta, auto-avança, navega ---------- */
  var deck = $('#deck');
  if (deck) {
    var cards = $$('.proj', deck);
    var dots = $$('.ddot');
    var n = cards.length;
    var pos = 0;          // posição contínua (índice fracionário)
    var goal = 0;         // alvo do easing
    var dragging = false, startX = 0, startPos = 0, moved = false;

    function renderDeck() {
      for (var i = 0; i < n; i++) {
        var d = i - pos;
        var ad = Math.abs(d);
        cards[i].style.transform =
          'translate(-50%, -50%) translateX(' + (d * 58) + '%) rotateY(' + (d * -13) +
          'deg) translateZ(' + (-ad * 190) + 'px) scale(' + Math.max(1 - ad * 0.055, 0.7) + ')';
        cards[i].style.opacity = ad > 2.4 ? 0 : String(1 - ad * 0.34);
        cards[i].style.zIndex = String(100 - Math.round(ad * 10));
        cards[i].classList.toggle('is-on', Math.round(pos) === i);
      }
      var on = Math.round(Math.min(Math.max(pos, 0), n - 1));
      dots.forEach(function (dt, i) { dt.classList.toggle('is-on', i === on); });
    }

    (function deckLoop() {
      if (!dragging) pos += (goal - pos) * 0.11;
      renderDeck();
      requestAnimationFrame(deckLoop);
    })();

    deck.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      startX = e.clientX; startPos = pos;
      deck.classList.add('is-drag');
      try { deck.setPointerCapture(e.pointerId); } catch (err) { /* eventos sintéticos */ }
    });
    deck.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      pos = Math.min(Math.max(startPos - (dx / deck.offsetWidth) * 1.9, -0.35), n - 0.65);
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      deck.classList.remove('is-drag');
      var dx = e.clientX - startX;
      var base = Math.round(startPos);
      if (dx < -60) goal = Math.min(base + 1, n - 1);
      else if (dx > 60) goal = Math.max(base - 1, 0);
      else goal = Math.round(Math.min(Math.max(pos, 0), n - 1));
      restartAuto();
    }
    deck.addEventListener('pointerup', endDrag);
    deck.addEventListener('pointercancel', endDrag);

    dots.forEach(function (dt) {
      dt.addEventListener('click', function () {
        goal = parseInt(dt.getAttribute('data-go'), 10);
        restartAuto();
      });
    });

    /* As capturas têm alturas bem diferentes (de 1080 a 3295px). Com uma
       duração fixa, as mais altas rolariam rápido demais — então o tempo
       é calculado pela distância, mantendo a mesma sensação de leitura. */
    function ritmoDaRolagem() {
      cards.forEach(function (card) {
        var img = card.querySelector('.proj-page');
        var view = card.querySelector('.proj-view');
        if (!img || !view || !img.complete) return;
        var distancia = img.offsetHeight - view.offsetHeight;
        if (distancia <= 0) { img.style.animation = 'none'; return; }
        var segundos = Math.max(12, Math.min(distancia / 62, 34));
        img.style.animationDuration = segundos + 's';
      });
    }

    /* rede de segurança: ao chegar perto da seção, força o carregamento
       das capturas (o lazy nativo cuida do resto) */
    var imagensProntas = false;
    function garantirImagens() {
      if (imagensProntas) return;
      var r = deck.getBoundingClientRect();
      if (r.top > window.innerHeight * 1.6 || r.bottom < 0) return;
      imagensProntas = true;
      var faltando = cards.length;
      cards.forEach(function (card) {
        var img = card.querySelector('.proj-page');
        if (!img) { faltando--; return; }
        img.loading = 'eager';
        if (img.complete) { if (--faltando === 0) ritmoDaRolagem(); }
        else img.addEventListener('load', function () {
          if (--faltando === 0) ritmoDaRolagem();
        }, { once: true });
      });
    }
    window.addEventListener('scroll', garantirImagens, { passive: true });
    window.addEventListener('resize', ritmoDaRolagem);
    garantirImagens();

    /* auto-avanço (pausa com o mouse em cima e com aba oculta) */
    var autoTimer = null;
    function restartAuto() {
      if (REDUCED) return;
      clearInterval(autoTimer);
      autoTimer = setInterval(function () {
        if (dragging || document.hidden) return;
        goal = (Math.round(goal) + 1) % n;
      }, 6500);
    }
    deck.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
    deck.addEventListener('mouseleave', restartAuto);
    restartAuto();
    renderDeck();
  }

  /* ---------- 9. HISTÓRIA: passo ativo controla a imagem ---------- */
  var steps = $$('.story-step');
  var imgs = $$('.story-img');
  var yearEl = $('#storyYear');
  var YEARS = ['2009', '2015', '2020', '2026'];
  if (steps.length && imgs.length) {
    var current = 0;
    var onStory = function () {
      var mid = window.innerHeight * 0.5;
      var best = 0, bestDist = Infinity;
      steps.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (best !== current) {
        current = best;
        steps.forEach(function (s, i) { s.classList.toggle('is-on', i === best); });
        imgs.forEach(function (im, i) { im.classList.toggle('is-on', i === best); });
        if (yearEl) yearEl.textContent = YEARS[best];
      }
    };
    steps[0].classList.add('is-on');
    window.addEventListener('scroll', onStory, { passive: true });
    onStory();
  }
})();
