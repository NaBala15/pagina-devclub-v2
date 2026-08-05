/* =====================================================================
   RODOLFINHO — o mascote que aparece no fim da página

   Quem chega ao fim da rolagem já viu a página inteira. Aí ele entra
   pela esquerda, se apresenta e oferece duas pílulas: a azul deixa tudo
   como está, a vermelha DESMONTA a página e reconstrói junto com o
   visitante, em três passos — HTML, CSS, JavaScript.

   O truque do desmonte é o mais honesto possível: em vez de simular uma
   página crua, ele DESLIGA os <link rel=stylesheet> de verdade. O que
   sobra na tela é a própria página sem CSS. A única folha que continua
   ligada é a css/rodolfinho.css — se ela caísse junto, o painel de
   reconstrução cairia com ela.
   ===================================================================== */

(function () {
  'use strict';

  const palco = document.getElementById('rodolfinho');
  if (!palco) return;

  const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raiz = document.documentElement;

  const eu = palco.querySelector('.rodo-eu');
  const fala = palco.querySelector('.rodo-fala');
  const pilulas = palco.querySelector('.rodo-pilulas');
  const btAzul = palco.querySelector('.rodo-azul');
  const btVermelho = palco.querySelector('.rodo-vermelho');
  const obra = document.getElementById('rodoObra');
  const vazio = document.getElementById('rodoVazio');

  let apareceu = false;
  let temporizadores = [];

  const depois = (ms, fn) => { temporizadores.push(setTimeout(fn, ms)); };
  const limpar = () => { temporizadores.forEach(clearTimeout); temporizadores = []; };

  /* ---------- máquina de escrever ----------
     Sequência por setTimeout, nunca por transitionend: transição
     congelada (aba oculta) não dispara evento e a fala travaria no meio. */
  const LETRA = 30;          // ms por caractere digitado

  /* Quanto a frase fica parada DEPOIS de terminar de escrever. É aqui que
     estava o problema, não na digitação: 420ms fixos não davam tempo de
     terminar de ler nada. Agora a pausa cresce com o tamanho da frase —
     frase longa fica mais tempo na tela, que é como se lê. */
  function tempoDeLeitura(texto) {
    const limpo = texto.replace(/<[^>]*>/g, '');
    return Math.min(4200, 1300 + limpo.length * 11);
  }

  function escrever(html, aoFim) {
    fala.classList.add('is-on');
    const alvo = html;
    const pausa = tempoDeLeitura(alvo);
    let i = 0;
    const passo = () => {
      /* anda por caractere, mas pula tags inteiras de uma vez pra não
         desenhar "<b" na tela */
      if (alvo[i] === '<') { i = alvo.indexOf('>', i) + 1; }
      else i++;
      fala.innerHTML = alvo.slice(0, i) + '<i class="rodo-cursor">▌</i>';
      if (i < alvo.length) depois(LETRA, passo);
      else { fala.innerHTML = alvo; if (aoFim) depois(pausa, aoFim); }
    };
    /* movimento reduzido: a frase aparece inteira, mas o tempo de leitura
       continua valendo — quem pediu menos animação não pediu menos tempo */
    if (REDUZIDO) { fala.innerHTML = alvo; if (aoFim) depois(pausa, aoFim); }
    else passo();
  }

  /* =====================================================================
     ENTRADA E SAÍDA, o mesmo sistema de partículas nos dois sentidos

     Ele não entra andando nem sai andando: se MONTA de partículas e se
     DESFAZ nelas. É a linguagem do resto da página — uma cabeça se forma
     de partículas na intro, o cérebro se junta no hero e se desfaz na
     rolagem, e agora ele fecha o ciclo.

     Uma função só para os dois sentidos. Duplicar daria dois laços
     idênticos pra manter em sincronia — e neste projeto já vi esse filme:
     foi assim que a câmera da intro ganhou um tranco, com o loop e o
     debugCapture divergindo.

     As partículas saem do PRÓPRIO recorte: cada uma carrega a cor do
     pixel que ela era. Inventar as cores daria uma poeira genérica; ler
     do recorte faz a poeira ser DELE — dá pra ver o cinza do blazer, o
     lime do underscore e a sola branca.
     ===================================================================== */
  let poCanvas = null;

  function poeira(modo, aoFim) {
    const montando = modo === 'montar';
    palco.classList.remove('is-parado');

    if (REDUZIDO || !eu.complete || !eu.naturalWidth) {
      palco.classList.toggle('is-desfazendo', !montando);
      if (montando) palco.classList.add('is-parado');
      depois(700, aoFim);
      return;
    }

    const r = eu.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);

    /* lê o recorte numa resolução reduzida: cada pixel do reduzido vira
       UMA partícula. É o que controla a contagem sem varrer a imagem
       inteira — a ~5 mil ele fica denso e o laço continua barato. */
    const PASSO = 3;
    const lw = Math.max(1, Math.round(r.width / PASSO));
    const lh = Math.max(1, Math.round(r.height / PASSO));
    const leitor = document.createElement('canvas');
    leitor.width = lw; leitor.height = lh;
    const lg = leitor.getContext('2d', { willReadFrequently: true });
    lg.drawImage(eu, 0, 0, lw, lh);

    let dados;
    try { dados = lg.getImageData(0, 0, lw, lh).data; }
    catch (e) {
      palco.classList.toggle('is-desfazendo', !montando);
      if (montando) palco.classList.add('is-parado');
      depois(700, aoFim); return;
    }

    const ps = [];
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const i = (y * lw + x) * 4;
        if (dados[i + 3] < 60) continue;               // fora do recorte
        ps.push({
          x: x * PASSO, y: y * PASSO,
          cor: 'rgb(' + dados[i] + ',' + dados[i + 1] + ',' + dados[i + 2] + ')',
          /* O DESLOCAMENTO é sempre pra ESQUERDA e pra CIMA: é de lá que
             ele vem ao montar, e é pra lá que ele vai ao se desfazer. O
             mesmo vetor serve nos dois sentidos, só muda quem é começo e
             quem é fim — e é isso que faz a entrada e a saída parecerem
             a mesma criatura, não dois efeitos diferentes.
             Ao montar o vetor é MAIOR: ele vem de fora do quadro. */
          vx: montando ? (-150 - Math.random() * 230) : (-18 - Math.random() * 46),
          vy: montando ? (-40 - Math.random() * 150) : (-14 - Math.random() * 52),
          /* atraso pela ALTURA nos dois casos: ele se monta dos pés pra
             cabeça e se desfaz dos pés pra cabeça. O cérebro do hero
             também fecha de baixo pra cima — mesma gramática. */
          atraso: (1 - y / lh) * 0.42 + Math.random() * 0.18,
        });
      }
    }

    if (!poCanvas) {
      poCanvas = document.createElement('canvas');
      poCanvas.className = 'rodo-po';
      palco.appendChild(poCanvas);
    }
    poCanvas.hidden = false;
    /* A caixa cresce pra caber a deriva, e cresce PRO LADO CERTO: as
       partículas sobem e vão pra esquerda, então a folga tem que ficar
       em cima e à esquerda. Folga embaixo não serviria de nada — elas
       seriam cortadas na borda de cima justamente no fim, quando estão
       mais espalhadas. */
    /* a folga acompanha o deslocamento: montando ele vem de mais longe */
    const FOLGA_X = montando ? 420 : 260;
    const FOLGA_Y = montando ? 220 : 220;
    poCanvas.style.left = (r.left - FOLGA_X) + 'px';
    poCanvas.style.top = (r.top - FOLGA_Y) + 'px';
    poCanvas.style.width = (r.width + FOLGA_X) + 'px';
    poCanvas.style.height = (r.height + FOLGA_Y) + 'px';
    poCanvas.width = Math.round((r.width + FOLGA_X) * dpr);
    poCanvas.height = Math.round((r.height + FOLGA_Y) * dpr);
    const g = poCanvas.getContext('2d');
    g.scale(dpr, dpr);

    palco.classList.add('is-desfazendo');       // esconde o <img> nos dois modos

    const DUR = montando ? 2.1 : 1.9;
    const t0 = performance.now();
    const lado = PASSO * 0.9;
    (function quadro(agora) {
      const t = (agora - t0) / 1000;
      g.clearRect(0, 0, poCanvas.width, poCanvas.height);
      let vivos = 0;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const u = (t - p.atraso) / (DUR - p.atraso);
        if (u < 0) {
          /* antes da vez dela: MONTANDO ela ainda não existe; DESFAZENDO
             ela ainda está inteira no lugar */
          if (!montando) {
            g.globalAlpha = 1; g.fillStyle = p.cor;
            g.fillRect(FOLGA_X + p.x, FOLGA_Y + p.y, lado, lado);
          }
          vivos++;
          continue;
        }
        if (u >= 1) { if (montando) vivos++; continue; }
        vivos++;
        /* Montando: o resto do caminho encolhe com (1-u)² — ela chega
           FREANDO e assenta no lugar. Desfazendo: o deslocamento cresce
           com u² — ela sai ACELERANDO. Mesma curva, lida ao contrário; é
           o que dá peso aos dois movimentos. */
        const k = montando ? (1 - u) * (1 - u) : u * u;
        g.globalAlpha = montando ? u : 1 - u;
        g.fillStyle = p.cor;
        g.fillRect(FOLGA_X + p.x + p.vx * k, FOLGA_Y + p.y + p.vy * k, lado, lado);
      }
      g.globalAlpha = 1;
      if (t < DUR + 0.2 && (vivos > 0 || montando)) requestAnimationFrame(quadro);
      else {
        poCanvas.hidden = true;
        palco.classList.remove('is-desfazendo');
        if (montando) palco.classList.add('is-parado');
        if (aoFim) aoFim();
      }
    })(t0);
  }

  const desfazerEmParticulas = aoFim => poeira('desfazer', aoFim);

  /* ---------- a entrada: ele se monta de partículas ---------- */
  function entrar() {
    if (apareceu) return;
    apareceu = true;
    palco.hidden = false;
    /* is-parado põe o <img> no lugar certo; a classe do desmonte (posta
       pela poeira) o mantém invisível enquanto as partículas convergem.
       Sem is-parado o getBoundingClientRect leria a posição de fora da
       tela e a poeira se montaria no lugar errado. */
    palco.classList.add('is-parado');

    poeira('montar', () => {
      escrever('Oi! Eu sou o <b>Rodolfinho</b>. Você acabou de descer a página inteira — ' +
        'mas viu só o lado de fora.', () => {
        escrever('Pronto pra programar de verdade? Vamos fazer um teste.', () => {
          escrever('Você tem <b>dois caminhos</b>.', () => {
            pilulas.classList.add('is-on');
            btVermelho.focus({ preventScroll: true });
          });
        });
      });
    });
  }

  /* ---------- pílula azul: ele desiste de você ---------- */
  function caminhoAzul() {
    limpar();
    pilulas.classList.remove('is-on');
    escrever('Deixa pra lá, então. Vai se virar. 😄', () => {
      fala.classList.remove('is-on');
      depois(320, () => desfazerEmParticulas(() => { palco.hidden = true; }));
    });
  }

  /* =====================================================================
     PÍLULA VERMELHA — desmonta e reconstrói
     ===================================================================== */

  /* as folhas da página, menos a do próprio Rodolfinho */
  const folhas = [].slice.call(
    document.querySelectorAll('link[rel="stylesheet"]')
  ).filter(l => (l.getAttribute('href') || '').indexOf('rodolfinho') === -1);

  const PASSOS = [
    {
      arq: 'index.html',
      diz: 'Primeiro o <b>esqueleto</b>. HTML não é bonito — ele só diz o que cada ' +
           'coisa É: isto é um título, isto é uma seção, isto é um botão.',
      botao: 'aplicar index.html',
      codigo:
        '<span class="c">&lt;!-- o conteúdo, sem nenhuma aparência --&gt;</span>\n' +
        '<span class="t">&lt;section</span> <span class="a">class</span>=<span class="a">"hero"</span><span class="t">&gt;</span>\n' +
        '  <span class="t">&lt;h1&gt;</span>Ideias viram código.<span class="t">&lt;/h1&gt;</span>\n' +
        '  <span class="t">&lt;p&gt;</span>Pessoas viram devs.<span class="t">&lt;/p&gt;</span>\n' +
        '  <span class="t">&lt;a</span> <span class="a">class</span>=<span class="a">"btn"</span><span class="t">&gt;</span>Ver formações<span class="t">&lt;/a&gt;</span>\n' +
        '<span class="t">&lt;/section&gt;</span>',
      aplicar: () => raiz.classList.add('rodo-html'),
    },
    {
      arq: 'style.css',
      diz: 'Agora a <b>pele</b>. O CSS pega esse mesmo HTML e decide cor, ' +
           'tamanho, espaço e ritmo. Nada de conteúdo muda — só a forma.',
      botao: 'aplicar style.css',
      codigo:
        '<span class="a">.hero</span> {\n' +
        '  <span class="t">min-height</span>: 100svh;\n' +
        '  <span class="t">display</span>: flex;\n' +
        '  <span class="t">background</span>: <span class="c">radial-gradient(…)</span>;\n' +
        '}\n' +
        '<span class="a">.btn</span> {\n' +
        '  <span class="t">background</span>: #c6ff3d;\n' +
        '  <span class="t">border-radius</span>: 999px;\n' +
        '}',
      aplicar: () => { folhas.forEach(l => { l.disabled = false; }); },
    },
    {
      arq: 'script.js',
      diz: 'Falta a <b>vida</b>. O JavaScript é o que faz a página responder: ' +
           'o cérebro que gira, o vídeo que pausa, o diploma que abre.',
      botao: 'aplicar script.js',
      codigo:
        '<span class="c">// 40 mil partículas viram um cérebro</span>\n' +
        '<span class="t">const</span> cerebro = <span class="t">new</span> THREE.Points(geo, mat);\n\n' +
        'addEventListener(<span class="a">\'pointermove\'</span>, (e) =&gt; {\n' +
        '  <span class="c">// arrastar gira; soltar mantém a inércia</span>\n' +
        '  giroLivreY += e.movementX * <span class="a">0.006</span>;\n' +
        '});',
      aplicar: () => {
        raiz.classList.add('rodo-js');
        /* os laços 3D nunca pararam — só estavam escondidos. Um resize
           reposiciona tudo pro tamanho real assim que reaparecem. */
        dispatchEvent(new Event('resize'));
      },
    },
  ];

  let passo = 0;

  function montarPasso() {
    const p = PASSOS[passo];
    obra.querySelector('.rodo-obra-arq').textContent = p.arq;
    obra.querySelector('.rodo-obra-passo').textContent = (passo + 1) + '/3';
    obra.querySelector('pre').innerHTML = p.codigo;
    obra.querySelector('.rodo-obra-diz').innerHTML = p.diz;
    obra.querySelector('.rodo-aplicar').textContent = p.botao;
  }

  function aplicarPasso() {
    PASSOS[passo].aplicar();
    passo++;
    if (passo < PASSOS.length) { montarPasso(); return; }

    /* terminou: fecha a obra e ele se despede */
    obra.hidden = true;
    raiz.classList.remove('rodo-nu', 'rodo-html', 'rodo-js');
    folhas.forEach(l => { l.disabled = false; });
    escrever('Pronto. <b>HTML</b>, <b>CSS</b> e <b>JavaScript</b> — é disso que a página ' +
      'inteira é feita. E é isso que você aprende aqui.', () => {
      depois(2600, () => {
        fala.classList.remove('is-on');
        depois(320, () => desfazerEmParticulas(() => { palco.hidden = true; }));
      });
    });
  }

  function restaurar() {
    limpar();
    raiz.classList.remove('rodo-nu', 'rodo-html', 'rodo-js');
    folhas.forEach(l => { l.disabled = false; });
    obra.hidden = true;
    vazio.hidden = true;
    if (poCanvas) poCanvas.hidden = true;
    palco.classList.remove('is-desfazendo', 'is-parado');
    palco.hidden = true;
  }

  function caminhoVermelho() {
    limpar();
    pilulas.classList.remove('is-on');
    fala.classList.remove('is-on');

    depois(420, () => {
      /* o desmonte de verdade: as folhas da página saem do ar */
      raiz.classList.add('rodo-nu');
      folhas.forEach(l => { l.disabled = true; });
      vazio.hidden = false;
      scrollTo(0, 0);

      depois(1400, () => {
        vazio.hidden = true;
        obra.hidden = false;
        passo = 0;
        montarPasso();
        obra.querySelector('.rodo-aplicar').focus({ preventScroll: true });
      });
    });
  }

  btAzul.addEventListener('click', caminhoAzul);
  btVermelho.addEventListener('click', caminhoVermelho);
  obra.querySelector('.rodo-aplicar').addEventListener('click', aplicarPasso);
  obra.querySelector('.rodo-desistir').addEventListener('click', restaurar);
  /* saída de emergência: se algo travar no meio do desmonte, Esc devolve
     a página. Desmontar o site do visitante sem porta de saída seria uma
     brincadeira de mau gosto. */
  addEventListener('keydown', e => { if (e.key === 'Escape') restaurar(); });

  /* ---------- gatilho: chegou ao fim da rolagem ----------
     Quem manda é um IntersectionObserver no RODAPÉ. Ele dispara pela
     posição do elemento, não pela aritmética de scrollY — funciona igual
     com a rolagem suave do Lenis, com barra arrastada, com Ctrl+End ou
     com âncora. O ouvinte de scroll fica como reforço, limitado por
     TEMPO e não por requestAnimationFrame (rAF congela em aba oculta e o
     mascote poderia nunca entrar). */
  const rodape = document.querySelector('.footer');
  if (rodape && window.IntersectionObserver) {
    new IntersectionObserver(function (entradas) {
      if (entradas.some(e => e.isIntersecting)) entrar();
    }, { rootMargin: '0px 0px -40px 0px' }).observe(rodape);
  }

  let ultimo = 0;
  function conferir() {
    const agora = Date.now();
    if (agora - ultimo < 140) return;
    ultimo = agora;
    const fim = document.documentElement.scrollHeight - innerHeight;
    if (fim > 0 && scrollY >= fim - 90) entrar();
  }
  addEventListener('scroll', conferir, { passive: true });
  addEventListener('resize', conferir);

  /* gancho de desenvolvimento, no mesmo espírito do resto da página */
  window.Rodolfinho = {
    entrar: entrar,
    azul: caminhoAzul,
    vermelho: caminhoVermelho,
    aplicar: aplicarPasso,
    restaurar: restaurar,
    desfazer: desfazerEmParticulas,
    get _passo() { return passo; },
  };
})();
