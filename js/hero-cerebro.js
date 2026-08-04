/* =====================================================================
   CÉREBRO DE PARTÍCULAS DO HERO

   Fecha o arco que a intro abre. A intro termina mergulhando no olho e
   caindo dentro da cabeça; aqui, do outro lado do corte, as partículas
   que sobraram se juntam e formam o cérebro. É o "você está dentro da
   mente de um dev" deixando de ser legenda e virando imagem.

   O que ele faz:
     . MONTA quando a intro entrega a página (evento heroreveal)
     . GIRA no arrasto, com inércia ao soltar
     . TROCA de paleta no clique
     . SE DESFAZ na rolagem, e as partículas caem
     . PULSA, com sinapses correndo pela teia de linhas em volta

   A geometria vem de js/cerebro-geo.js, escrita à mão — nenhum modelo 3D
   baixado. O apelido "cerebro-geo" vem do importmap, que é onde mora o
   ?v= de cache (importar pelo caminho relativo criaria um SEGUNDO módulo,
   com a geometria gerada duas vezes).
   ===================================================================== */

import * as THREE from 'three';
import { dotTexture } from 'head-shared';
import { ponto, normal, pesoGiro, pontoCerebelo, pontoTronco } from 'cerebro-geo';

const palco = document.getElementById('heroCerebro');
const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

const FRACOS = (navigator.hardwareConcurrency || 8) <= 4;
const COUNT = FRACOS ? 16000 : 26000;
const NOS = 130;              // nós da teia em volta
const PULSOS = 70;            // sinapses correndo pelas linhas
const MACIEZ = 0.07;
const TAM_PONTO = 0.020;

/* As paletas do clique. A primeira é a da referência (magenta/ciano); a
   segunda é o RGB puro; a terceira é a da própria página. Cada uma são
   três luzes, porque uma luz só achata — é o contraste entre elas que dá
   volume a uma nuvem de pontos. */
const PALETAS = [
  { nome: 'neural',   a: [1.00, 0.16, 0.62], b: [0.18, 0.85, 1.00], c: [0.45, 0.25, 0.95] },
  { nome: 'rgb',      a: [1.00, 0.12, 0.12], b: [0.12, 1.00, 0.22], c: [0.20, 0.35, 1.00] },
  { nome: 'devclub',  a: [0.78, 1.00, 0.24], b: [0.55, 0.36, 1.00], c: [0.13, 0.90, 0.80] },
];

if (palco) iniciar();

function iniciar() {
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  camera.position.set(0, 0, 2.82);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return;                                   // sem WebGL o hero segue sem ele
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  palco.appendChild(renderer.domElement);

  const grupo = new THREE.Group();
  cena.add(grupo);

  let pontos = null, geo = null, mat = null;
  let teia = null, faisca = null, faiscaGeo = null, faiscaMat = null;
  let arestas = null;                          // [ax,ay,az, bx,by,bz] por aresta
  let giroLivreY = 0, giroLivreX = 0;          // o que o arrasto acumulou
  let inerciaY = 0, inerciaX = 0;
  let paleta = 0;
  let montagem = 0;                            // 0 = espalhado, 1 = cérebro formado
  let desmonte = 0;                            // 0 = inteiro, 1 = caiu tudo
  let rodando = false, visivel = false, liberado = false;
  let rafId = 0;
  const relogio = new THREE.Clock();

  /* ---------- tamanho ---------- */
  function medir() {
    const l = palco.clientWidth || 1;
    const a = palco.clientHeight || 1;
    renderer.setSize(l, a, false);
    camera.aspect = l / a;
    camera.updateProjectionMatrix();
    if (mat) mat.uniforms.escala.value = renderer.domElement.height * 0.5;
    if (faiscaMat) faiscaMat.uniforms.escala.value = renderer.domElement.height * 0.5;
  }
  medir();
  if (window.ResizeObserver) new ResizeObserver(medir).observe(palco);
  else addEventListener('resize', medir);

  /* ---------- mouse: arrastar e clicar ----------
     Ele NÃO persegue o cursor: quem manda no giro é o arrasto. O cérebro
     parado tem só o respiro; girar é uma ação de quem visita, não um
     reflexo que acontece sozinho ao mexer o mouse na página. */
  let arrastando = false, arrastouQuanto = 0, ultimoX = 0, ultimoY = 0;

  if (!REDUZIDO) {
    addEventListener('pointermove', function (e) {
      if (!arrastando || e.pointerType === 'touch') return;
      const dx = e.clientX - ultimoX, dy = e.clientY - ultimoY;
      ultimoX = e.clientX; ultimoY = e.clientY;
      arrastouQuanto += Math.abs(dx) + Math.abs(dy);
      giroLivreY += dx * 0.006;
      giroLivreX += dy * 0.004;
      inerciaY = dx * 0.006;                   // guarda pra soltar girando
      inerciaX = dy * 0.004;
    }, { passive: true });

    palco.addEventListener('pointerdown', function (e) {
      arrastando = true; arrastouQuanto = 0;
      ultimoX = e.clientX; ultimoY = e.clientY;
      inerciaY = inerciaX = 0;
      palco.setPointerCapture && palco.setPointerCapture(e.pointerId);
    });
    /* soltar com pouco movimento = clique, e clique troca a paleta.
       O limiar existe porque todo arrasto termina num pointerup: sem ele,
       girar o cérebro trocaria a cor sem querente no fim de cada gesto. */
    addEventListener('pointerup', function () {
      if (!arrastando) return;
      arrastando = false;
      if (arrastouQuanto < 6) trocarPaleta();
    });
  }

  function trocarPaleta() {
    paleta = (paleta + 1) % PALETAS.length;
    aplicarPaleta();
  }
  function aplicarPaleta() {
    if (!mat) return;
    const p = PALETAS[paleta];
    mat.uniforms.corA.value.fromArray(p.a);
    mat.uniforms.corB.value.fromArray(p.b);
    mat.uniforms.corC.value.fromArray(p.c);
    if (faiscaMat) faiscaMat.uniforms.cor.value.fromArray(p.b);
    if (teia) teia.material.color.fromArray(p.c);
  }

  /* ---------- desmonte pela rolagem ---------- */
  function medirRolagem() {
    const r = palco.getBoundingClientRect();
    /* quanto o hero já subiu além do topo, em fração da própria altura */
    const passou = Math.max(0, -r.top + innerHeight * 0.12);
    desmonte = Math.min(1, passou / (r.height * 0.75 || 1));
  }

  /* ---------- só desenha quando está na tela ---------- */
  function avaliar() {
    const r = palco.getBoundingClientRect();
    const naTela = r.bottom > 0 && r.top < (innerHeight || 0);
    if (naTela !== visivel) {
      visivel = naTela;
      if (visivel) ligar(); else desligar();
    }
  }
  function ligar() {
    if (rodando || !pontos || !liberado || !visivel) return;
    rodando = true;
    relogio.getDelta();
    quadro();
  }
  function desligar() { rodando = false; cancelAnimationFrame(rafId); }

  new IntersectionObserver(avaliar, { threshold: 0.01 }).observe(palco);
  var ultimo = 0;
  addEventListener('scroll', function () {
    /* limite por tempo, não por rAF: rAF congela em aba oculta e deixaria
       o desmonte travado no meio do caminho */
    var agora = Date.now();
    if (agora - ultimo < 60) return;
    ultimo = agora; avaliar();
  }, { passive: true });
  addEventListener('resize', avaliar);

  /* ---------- o laço ---------- */
  const eixoLuz = new THREE.Vector3();

  function quadro() {
    if (!rodando) return;
    rafId = requestAnimationFrame(quadro);
    /* ORDEM IMPORTA: getElapsedTime() chama getDelta() por dentro e acumula.
       Chamando elapsed primeiro, o getDelta() seguinte devolvia ~0 e a
       montagem nunca saía do lugar. Pega-se o delta primeiro e lê-se o
       elapsed do próprio relógio, que o getDelta acabou de atualizar. */
    const dt = Math.min(relogio.getDelta(), 0.05);
    const t = relogio.elapsedTime;

    /* o desmonte é medido AQUI, a cada quadro, e não no evento de rolagem:
       lá o limite de 60ms o faria cair em degraus de 16 por segundo */
    medirRolagem();

    if (montagem < 1) montagem = Math.min(1, montagem + dt / 2.4);

    if (REDUZIDO) {
      grupo.rotation.set(0, 0, 0);
    } else {
      if (!arrastando) {
        giroLivreY += inerciaY;                // solta girando e vai parando
        giroLivreX += inerciaX;
        inerciaY *= 0.94; inerciaX *= 0.94;
      }
      /* respiro: o cérebro parado ainda balança de leve, senão parece uma
         imagem congelada esperando alguém arrastar */
      const alvoY = Math.sin(t * 0.5) * 0.045 + giroLivreY;
      const alvoX = Math.sin(t * 0.39 + 1.3) * 0.028 + giroLivreX;
      grupo.rotation.y += (alvoY - grupo.rotation.y) * MACIEZ;
      grupo.rotation.x += (alvoX - grupo.rotation.x) * MACIEZ;
      grupo.position.y = Math.sin(t * 0.66) * 0.022;
    }

    /* pulso global: o cérebro "acende" em ondas lentas */
    if (mat) {
      mat.uniforms.pulso.value = 0.86 + 0.14 * Math.sin(t * 1.15);
      mat.uniforms.opacidade.value = 1 - desmonte * 0.85;
      /* as duas luzes principais ficam OPOSTAS (esquerda e direita) e só a
         da direita deriva um pouco — é o que mantém os dois lados de cores
         diferentes enquanto o cérebro gira */
      eixoLuz.set(0.86, 0.12 + Math.sin(t * 0.23) * 0.18, 0.40).normalize();
      mat.uniforms.dirA.value.set(-0.86, 0.34, 0.36).normalize();
      mat.uniforms.dirB.value.copy(eixoLuz);
      mat.uniforms.dirC.value.set(0.05, -0.78, 0.30).normalize();
    }

    moverParticulas(t);
    moverFaiscas(dt);

    if (teia) teia.material.opacity = (1 - desmonte) * 0.10 * montagem;
    if (faisca) faisca.visible = desmonte < 0.9 && montagem > 0.6;

    renderer.render(cena, camera);
  }

  function moverParticulas(t) {
    const pos = geo.attributes.position;
    const d = pontos.userData;
    const base = d.base, nrm = d.normais, fase = d.fase, atraso = d.atraso,
          origem = d.origem, deriva = d.deriva, n = d.n;
    const arr = pos.array;
    /* queda acelerada: distância cresce com o quadrado, como gravidade */
    const cair = desmonte * desmonte;

    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const w = Math.sin(t * 1.5 + fase[i]) * 0.007;
      let x = base[j] + nrm[j] * w;
      let y = base[j + 1] + nrm[j + 1] * w;
      let z = base[j + 2] + nrm[j + 2] * w;

      /* montagem escalonada: cada partícula tem seu atraso, então o
         cérebro se fecha em onda em vez de tudo chegar no mesmo quadro */
      if (montagem < 1) {
        const e = Math.min(1, Math.max(0, (montagem - atraso[i]) / (1 - atraso[i] + 1e-4)));
        const s = 1 - Math.pow(1 - e, 3);       // chega freando
        x = origem[j] + (x - origem[j]) * s;
        y = origem[j + 1] + (y - origem[j + 1]) * s;
        z = origem[j + 2] + (z - origem[j + 2]) * s;
      }

      if (cair > 0) {
        const v = deriva[i];
        x += v * 0.55 * cair;
        y -= (1.6 + v * 2.4) * cair;
        z += v * 0.30 * cair;
      }

      arr[j] = x; arr[j + 1] = y; arr[j + 2] = z;
    }
    pos.needsUpdate = true;
  }

  /* sinapses: cada faísca percorre uma aresta da teia e, ao chegar no fim,
     salta pra outra aresta — o efeito é de sinal viajando pela rede */
  function moverFaiscas(dt) {
    if (!faisca || !arestas) return;
    const pos = faiscaGeo.attributes.position.array;
    const d = faisca.userData;
    for (let i = 0; i < PULSOS; i++) {
      d.t[i] += d.vel[i] * dt;
      if (d.t[i] >= 1) {
        d.t[i] = 0;
        d.aresta[i] = (Math.random() * (arestas.length / 6)) | 0;
        d.vel[i] = 0.35 + Math.random() * 0.75;
      }
      const e = d.aresta[i] * 6, u = d.t[i];
      pos[i * 3] = arestas[e] + (arestas[e + 3] - arestas[e]) * u;
      pos[i * 3 + 1] = arestas[e + 1] + (arestas[e + 4] - arestas[e + 1]) * u;
      pos[i * 3 + 2] = arestas[e + 2] + (arestas[e + 5] - arestas[e + 2]) * u;
    }
    faiscaGeo.attributes.position.needsUpdate = true;
  }

  /* ================= construção ================= */
  function montar() {
    const p = new THREE.Vector3(), nv = new THREE.Vector3();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

    const base = new Float32Array(COUNT * 3);
    const normais = new Float32Array(COUNT * 3);
    const origem = new Float32Array(COUNT * 3);
    const fase = new Float32Array(COUNT);
    const atraso = new Float32Array(COUNT);
    const deriva = new Float32Array(COUNT);

    const direcao = () => {
      let x, y, z, l;
      do {
        x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1;
        l = Math.hypot(x, y, z);
      } while (l > 1 || l < 1e-4);
      return [x / l, y / l, z / l, l];
    };

    const N_CEREBRO = Math.round(COUNT * 0.76);
    const N_CEREBELO = Math.round(COUNT * 0.17);
    let k = 0, tentativas = 0;

    /* córtex por rejeição: a chance de aceitar cai no fundo do sulco, então
       o sulco fica VAZIO. Deslocar o raio sozinho não desenhava a dobra. */
    while (k < N_CEREBRO && tentativas < N_CEREBRO * 40) {
      tentativas++;
      const [x, y, z] = direcao();
      if (Math.random() > pesoGiro(x, y, z)) continue;
      ponto(x, y, z, p); normal(x, y, z, nv, a, b, c);
      base[k * 3] = p.x; base[k * 3 + 1] = p.y; base[k * 3 + 2] = p.z;
      normais[k * 3] = nv.x; normais[k * 3 + 1] = nv.y; normais[k * 3 + 2] = nv.z;
      k++;
    }
    for (let i = 0; i < N_CEREBELO && k < COUNT; i++) {
      const [x, y, z] = direcao();
      pontoCerebelo(x, y, z, p);
      base[k * 3] = p.x; base[k * 3 + 1] = p.y; base[k * 3 + 2] = p.z;
      normais[k * 3] = x; normais[k * 3 + 1] = y; normais[k * 3 + 2] = z;
      k++;
    }
    while (k < COUNT) {
      const tt = Math.random(), ang = Math.random() * Math.PI * 2;
      pontoTronco(tt, ang, p);
      base[k * 3] = p.x; base[k * 3 + 1] = p.y; base[k * 3 + 2] = p.z;
      normais[k * 3] = Math.cos(ang); normais[k * 3 + 1] = 0; normais[k * 3 + 2] = Math.sin(ang);
      k++;
    }

    for (let i = 0; i < COUNT; i++) {
      fase[i] = Math.random() * Math.PI * 2;
      /* atraso pela ALTURA: o cérebro se fecha de baixo pra cima, o que dá
         leitura de construção em vez de nuvem colapsando */
      const h = (base[i * 3 + 1] + 0.9) / 1.8;
      atraso[i] = Math.min(0.85, Math.max(0, h * 0.55 + Math.random() * 0.28));
      deriva[i] = Math.random() * 2 - 1;
      const [dx, dy, dz] = direcao();
      /* o enxame começa FORA do cérebro mas dentro do quadro: com a câmera
         em 2.82 e 40° de abertura, o campo visível na origem tem raio ~1.0,
         então raio inicial 2.6+ deixava o primeiro segundo em branco */
      const raioIni = 1.5 + Math.random() * 1.3;
      origem[i * 3] = dx * raioIni;
      origem[i * 3 + 1] = dy * raioIni;
      origem[i * 3 + 2] = dz * raioIni;
    }

    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normais, 3));

    const pal = PALETAS[paleta];
    mat = new THREE.ShaderMaterial({
      uniforms: {
        mapa: { value: dotTexture() },
        tamanho: { value: TAM_PONTO },
        escala: { value: 400 },
        opacidade: { value: 1 },
        pulso: { value: 1 },
        corA: { value: new THREE.Vector3().fromArray(pal.a) },
        corB: { value: new THREE.Vector3().fromArray(pal.b) },
        corC: { value: new THREE.Vector3().fromArray(pal.c) },
        dirA: { value: new THREE.Vector3(-0.86, 0.34, 0.36).normalize() },
        dirB: { value: new THREE.Vector3(0.86, 0.12, 0.40).normalize() },
        dirC: { value: new THREE.Vector3(0.05, -0.78, 0.30).normalize() },
      },
      vertexShader: [
        'uniform float tamanho, escala, pulso;',
        'uniform vec3 corA, corB, corC, dirA, dirB, dirC;',
        'varying vec3 vCor;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vec3 nv = normalize(normalMatrix * normal);',
        '  vec3 olho = normalize(-mv.xyz);',
        /* Três luzes de direções diferentes: uma só achataria a nuvem.
           O expoente estreita o lóbulo de cada uma. Sem ele as três se
           somavam em quase toda a superfície e o resultado era BRANCO —
           some o magenta de um lado e o ciano do outro, que é justamente
           o que se quer ver. Luz estreita = cor separada. */
        '  float a = pow(max(dot(nv, dirA), 0.0), 1.7);',
        '  float b = pow(max(dot(nv, dirB), 0.0), 1.7);',
        '  float c = pow(max(dot(nv, dirC), 0.0), 2.2);',
        /* realce de borda: sem ele o contorno some contra o fundo escuro.
           Puxa pra cor da luz que estiver ganhando ali, não pra média das
           duas — média de magenta com ciano é branco de novo. */
        '  float borda = pow(1.0 - abs(dot(nv, olho)), 3.0);',
        '  vec3 dominante = a > b ? corA : corB;',
        '  vec3 luz = corA * a * 1.45 + corB * b * 1.35 + corC * c * 0.45;',
        '  vCor = (luz + borda * 0.60 * dominante + 0.045) * pulso;',
        '  gl_PointSize = tamanho * (escala / -mv.z);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D mapa;',
        'uniform float opacidade;',
        'varying vec3 vCor;',
        'void main() {',
        '  float a = texture2D(mapa, gl_PointCoord).a;',
        '  if (a < 0.02) discard;',
        '  gl_FragColor = vec4(vCor, a * opacidade);',
        '}',
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    pontos = new THREE.Points(geo, mat);
    pontos.userData = { base, normais, origem, fase, atraso, deriva, n: COUNT };
    grupo.add(pontos);

    montarTeia();
    medir();
    avaliar();
    ligar();
  }

  /* ---------- a teia de sinapses em volta ----------
     Nós espalhados numa casca maior que o cérebro, ligados aos vizinhos
     próximos. É a "constelação" da referência: dá profundidade ao redor do
     objeto e é por onde as faíscas correm. */
  function montarTeia() {
    const nos = [];
    for (let i = 0; i < NOS; i++) {
      let x, y, z, l;
      do {
        x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1;
        l = Math.hypot(x, y, z);
      } while (l > 1 || l < 1e-4);
      const r = 1.30 + Math.random() * 0.30;
      nos.push([x / l * r * 1.05, y / l * r * 0.80, z / l * r * 0.95]);
    }

    const linhas = [];
    const LIM = 0.78;
    for (let i = 0; i < nos.length; i++) {
      let ligados = 0;
      for (let j = i + 1; j < nos.length && ligados < 3; j++) {
        const dx = nos[i][0] - nos[j][0], dy = nos[i][1] - nos[j][1], dz = nos[i][2] - nos[j][2];
        if (Math.hypot(dx, dy, dz) > LIM) continue;
        linhas.push(nos[i][0], nos[i][1], nos[i][2], nos[j][0], nos[j][1], nos[j][2]);
        ligados++;
      }
    }
    arestas = new Float32Array(linhas);

    const gl = new THREE.BufferGeometry();
    gl.setAttribute('position', new THREE.BufferAttribute(arestas.slice(), 3));
    teia = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({
      color: new THREE.Color().fromArray(PALETAS[paleta].c),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    grupo.add(teia);

    /* as faíscas */
    const fp = new Float32Array(PULSOS * 3);
    faiscaGeo = new THREE.BufferGeometry();
    faiscaGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    faiscaMat = new THREE.ShaderMaterial({
      uniforms: {
        mapa: { value: dotTexture() },
        escala: { value: 400 },
        cor: { value: new THREE.Vector3().fromArray(PALETAS[paleta].b) },
      },
      vertexShader: [
        'uniform float escala;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = 0.030 * (escala / -mv.z);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D mapa;',
        'uniform vec3 cor;',
        'void main() {',
        '  float a = texture2D(mapa, gl_PointCoord).a;',
        '  if (a < 0.02) discard;',
        '  gl_FragColor = vec4(cor * 1.6, a);',
        '}',
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    faisca = new THREE.Points(faiscaGeo, faiscaMat);
    const total = arestas.length / 6;
    faisca.userData = {
      t: new Float32Array(PULSOS),
      vel: new Float32Array(PULSOS),
      aresta: new Int32Array(PULSOS),
    };
    for (let i = 0; i < PULSOS; i++) {
      faisca.userData.t[i] = Math.random();
      faisca.userData.vel[i] = 0.35 + Math.random() * 0.75;
      faisca.userData.aresta[i] = (Math.random() * total) | 0;
    }
    grupo.add(faisca);
  }

  montar();

  /* gancho de desenvolvimento, no espírito do debugCapture da intro */
  window.HeroCerebro = {
    pronto: function () { return !!pontos; },
    get _pontos() { return pontos; },
    get _mat() { return mat; },
    paleta: function (i) { paleta = ((i | 0) % PALETAS.length + PALETAS.length) % PALETAS.length;
      aplicarPaleta(); return PALETAS[paleta].nome; },
    /* desenha um quadro fora do laço, com a montagem e o desmonte forçados */
    posar: function (m, d, ry, rx) {
      montagem = m; desmonte = d;
      grupo.rotation.set(rx || 0, ry || 0, 0);
      if (mat) { mat.uniforms.opacidade.value = 1 - d * 0.85; mat.uniforms.pulso.value = 1; }
      if (teia) teia.material.opacity = (1 - d) * 0.10 * m;
      if (faisca) faisca.visible = d < 0.9 && m > 0.6;
      moverParticulas(1.0);
      moverFaiscas(0);
      renderer.render(cena, camera);
      return { montagem: m, desmonte: d, particulas: COUNT, arestas: arestas.length / 6 };
    },
  };

  /* ---------- começa quando a intro entrega a página ---------- */
  addEventListener('heroreveal', function () {
    liberado = true; avaliar(); ligar();
  }, { once: true });
  setTimeout(function () { if (!liberado) { liberado = true; avaliar(); ligar(); } }, 7000);
}
