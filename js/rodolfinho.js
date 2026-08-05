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

  /* ---------- a entrada ---------- */
  function entrar() {
    if (apareceu) return;
    apareceu = true;
    palco.hidden = false;
    palco.classList.add('is-entrando');

    depois(REDUZIDO ? 300 : 2600, () => {
      palco.classList.remove('is-entrando');
      palco.classList.add('is-parado');
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
      palco.classList.remove('is-parado');
      palco.classList.add('is-saindo');
      fala.classList.remove('is-on');
      depois(2800, () => { palco.hidden = true; });
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
        palco.classList.remove('is-parado');
        palco.classList.add('is-saindo');
        fala.classList.remove('is-on');
        depois(2800, () => { palco.hidden = true; });
      });
    });
  }

  function restaurar() {
    limpar();
    raiz.classList.remove('rodo-nu', 'rodo-html', 'rodo-js');
    folhas.forEach(l => { l.disabled = false; });
    obra.hidden = true;
    vazio.hidden = true;
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
    get _passo() { return passo; },
  };
})();
