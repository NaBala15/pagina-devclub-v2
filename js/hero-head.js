/* =====================================================================
   CABEÇA DE PARTÍCULAS DO HERO

   A mesma cabeça da intro, agora parada no lado direito do hero e viva:
   ela acompanha o mouse. É o elo entre a abertura ("você entrou pela
   mente dela") e o corpo da página ("e ela continua aqui, olhando").

   Reaproveita o degradê, o sprite do ponto e o corte da boca da intro —
   e o próprio arquivo .glb, que o navegador já tem em cache.
   ===================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { dotTexture, gradientColor } from 'head-shared';

const palco = document.getElementById('heroHead');
const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* menos partículas que a intro (34k): aqui a cabeça ocupa metade da tela,
   e o hero divide a GPU com o campo de partículas do fundo */
const COUNT = 18000;
const ALTURA = 1.6;          // altura da cabeça no mundo
const GIRO_MAX_Y = 0.62;     // ~36° pros lados
const GIRO_MAX_X = 0.34;     // ~19° pra cima/baixo
const MACIEZ = 0.075;        // quanto ela persegue o alvo a cada quadro
const TAM_PONTO = 0.023;     // tamanho do sprite de cada partícula

/* ---------------------------------------------------------------------
   PODA DA GEOMETRIA INTERNA

   O scan facecap traz a bolsa oral inteira modelada dentro do crânio: uma
   caixa retangular com a arcada dentária dentro dela. Como as partículas
   são amostradas na superfície, essa boca por dentro aparecia flutuando no
   meio do rosto.

   Recortar por caixa de coordenadas (o removeMouthInterior, que a intro
   ainda usa no sólido) não resolve aqui: ele só derruba o triângulo com os
   TRÊS vértices dentro da caixa, e a borda de triângulos parciais que sobra
   projeta como um retângulo — trocava um artefato por outro.

   O teste abaixo é geométrico e não depende de saber onde a boca está:
   projeta as partículas numa grade em seis direções (±x, ±y, ±z) e marca as
   que estão na casca externa de alguma delas. Uma partícula que tem cabeça
   na frente nas SEIS direções está enterrada — sai. Na medição, isso é 9,3%
   das amostras, e leva junto arcada, bolsa oral e fundo de narina.
   --------------------------------------------------------------------- */
const CELULA = 0.022;   // lado da célula da grade, no espaço normalizado
const FOLGA = 0.018;    // a superfície tem espessura dentro de uma célula
const GRADE = 128;      // 128² células cobre a cabeça inteira com folga

function podarInterior(P, total) {
  const meio = GRADE >> 1;
  const exposto = new Uint8Array(total);
  const casca = new Float32Array(GRADE * GRADE);
  /* pares (eixoA, eixoB, profundidade, sentido) — as seis vistas ortogonais */
  const vistas = [[0,1,2,1], [0,1,2,-1], [0,2,1,1], [0,2,1,-1], [1,2,0,1], [1,2,0,-1]];
  const cel = v => Math.min(GRADE - 1, Math.max(0, Math.round(v / CELULA) + meio));

  for (let e = 0; e < vistas.length; e++) {
    const a = vistas[e][0], b = vistas[e][1], d = vistas[e][2], sinal = vistas[e][3];
    casca.fill(-Infinity);
    for (let i = 0; i < total; i++) {
      const k = cel(P[i * 3 + a]) * GRADE + cel(P[i * 3 + b]);
      const v = P[i * 3 + d] * sinal;
      if (v > casca[k]) casca[k] = v;
    }
    for (let i = 0; i < total; i++) {
      if (exposto[i]) continue;                 // já salvo por outra vista
      const k = cel(P[i * 3 + a]) * GRADE + cel(P[i * 3 + b]);
      if (P[i * 3 + d] * sinal >= casca[k] - FOLGA) exposto[i] = 1;
    }
  }
  return exposto;
}

if (palco) iniciar();

function iniciar() {
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  camera.position.set(0, 0, 2.86);   // perto: a cabeça ocupa mais o palco

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return;                                   // sem WebGL: o hero segue sem ela
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  palco.appendChild(renderer.domElement);

  const grupo = new THREE.Group();
  cena.add(grupo);

  let pontos = null, geo = null, mat = null;
  let alvoRotY = 0, alvoRotX = 0;
  /* a lâmpada mora no espaço da câmera: ela vem do lado onde o mouse está,
     então o rosto acende do lado pra onde a cabeça se vira */
  let luzAlvoX = 0, luzAlvoY = 0;
  const luzAgora = new THREE.Vector3(0, 0, 1);
  let rodando = false, visivel = false, liberado = false;
  let rafId = 0;
  const relogio = new THREE.Clock();

  /* ---------- tamanho: acompanha a coluna do hero ---------- */
  function medir() {
    const l = palco.clientWidth || 1;
    const a = palco.clientHeight || 1;
    renderer.setSize(l, a, false);
    camera.aspect = l / a;
    camera.updateProjectionMatrix();
    /* o sprite do ponto encolhe com a distância. É a mesma conta que o
       PointsMaterial faz por dentro: metade da altura do buffer de desenho
       (já com o devicePixelRatio embutido). */
    if (mat) mat.uniforms.escala.value = renderer.domElement.height * 0.5;
  }
  medir();
  if (window.ResizeObserver) new ResizeObserver(medir).observe(palco);
  else addEventListener('resize', medir);

  /* ---------- para onde ela olha ---------- */
  if (!REDUZIDO) {
    addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;   // no toque ela fica no repouso
      const mx = (e.clientX / innerWidth) * 2 - 1;
      const my = (e.clientY / innerHeight) * 2 - 1;
      /* rotação +Y aponta o rosto pra +X (direita); +X aponta pra baixo */
      alvoRotY = mx * GIRO_MAX_Y;
      alvoRotX = my * GIRO_MAX_X;
      luzAlvoX = mx;                           // tela: y cresce pra baixo
      luzAlvoY = -my;                          // câmera: y cresce pra cima
    }, { passive: true });

    /* mouse fora da janela: ela volta a encarar de frente */
    addEventListener('pointerleave', function () { alvoRotY = alvoRotX = 0; }, { passive: true });
    document.addEventListener('mouseleave', function () { alvoRotY = alvoRotX = 0; });
  }

  /* ---------- só desenha quando está na tela ---------- */
  function avaliar() {
    const r = palco.getBoundingClientRect();
    const naTela = r.bottom > 0 && r.top < (innerHeight || 0);
    if (naTela === visivel) return;
    visivel = naTela;
    if (visivel) ligar(); else desligar();
  }
  function ligar() {
    if (rodando || !pontos || !liberado || !visivel) return;
    rodando = true;
    relogio.getDelta();                        // descarta o intervalo parado
    quadro();
  }
  function desligar() {
    rodando = false;
    cancelAnimationFrame(rafId);
  }
  /* IntersectionObserver + rolagem: se um falhar, o outro segura
     (mesma dupla usada nos vídeos da sala de mentoria) */
  new IntersectionObserver(avaliar, { threshold: 0.01 }).observe(palco);
  var ultimo = 0;
  addEventListener('scroll', function () {
    var agora = Date.now();
    if (agora - ultimo < 120) return;
    ultimo = agora; avaliar();
  }, { passive: true });
  addEventListener('resize', avaliar);

  /* ---------- o laço ---------- */
  function quadro() {
    if (!rodando) return;
    rafId = requestAnimationFrame(quadro);
    const t = relogio.getElapsedTime();

    if (REDUZIDO) {
      grupo.rotation.set(0, 0, 0);
    } else {
      /* respiro leve por cima do alvo: viva mesmo com o mouse parado */
      const respiroY = Math.sin(t * 0.55) * 0.05;
      const respiroX = Math.sin(t * 0.42 + 1.3) * 0.03;
      grupo.rotation.y += ((alvoRotY + respiroY) - grupo.rotation.y) * MACIEZ;
      grupo.rotation.x += ((alvoRotX + respiroX) - grupo.rotation.x) * MACIEZ;
      grupo.position.y = Math.sin(t * 0.7) * 0.025;      // flutua devagar

      /* a lâmpada persegue o mouse mais devagar que o giro: a luz "arrasta"
         atrás do movimento, que é como uma luz de estúdio se comporta */
      if (mat) {
        luzAgora.x += (luzAlvoX - luzAgora.x) * 0.045;
        luzAgora.y += (luzAlvoY - luzAgora.y) * 0.045;
        luzAgora.z = 0.85;
        mat.uniforms.luz.value.copy(luzAgora);
      }
    }

    if (pontos) {
      const pos = geo.attributes.position;
      const base = pontos.userData.base;
      const nrm = pontos.userData.normais;
      const fase = pontos.userData.fase;
      const n = pontos.userData.n;
      /* cada ponto pulsa na própria fase, agora ao longo da PRÓPRIA NORMAL:
         a superfície infla e desincha em vez de escorregar na diagonal */
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        const w = Math.sin(t * 1.6 + fase[i]) * 0.006;
        pos.array[j] = base[j] + nrm[j] * w;
        pos.array[j + 1] = base[j + 1] + nrm[j + 1] * w;
        pos.array[j + 2] = base[j + 2] + nrm[j + 2] * w;
      }
      pos.needsUpdate = true;
    }
    renderer.render(cena, camera);
  }

  /* ---------- monta as partículas a partir do modelo ---------- */
  function montar(amostraGeo) {
    const amostrador = new MeshSurfaceSampler(new THREE.Mesh(amostraGeo)).build();
    /* amostra com sobra: a poda leva ~9% (a boca por dentro) e ainda assim
       precisamos de COUNT partículas na casca */
    const BRUTO = Math.round(COUNT * 1.25);
    const bruto = new Float32Array(BRUTO * 3);
    const brutoN = new Float32Array(BRUTO * 3);
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const cor = new THREE.Color();

    for (let i = 0; i < BRUTO; i++) {
      amostrador.sample(p, n);                 // a normal vem junto: é ela que sombreia
      bruto[i * 3] = p.x; bruto[i * 3 + 1] = p.y; bruto[i * 3 + 2] = p.z;
      brutoN[i * 3] = n.x; brutoN[i * 3 + 1] = n.y; brutoN[i * 3 + 2] = n.z;
    }

    const exposto = podarInterior(bruto, BRUTO);
    let sobrando = 0;
    for (let i = 0; i < BRUTO; i++) if (exposto[i]) sobrando++;
    const USADOS = Math.min(COUNT, sobrando);

    const base = new Float32Array(USADOS * 3);
    const normais = new Float32Array(USADOS * 3);
    const cores = new Float32Array(USADOS * 3);
    const fase = new Float32Array(USADOS);
    let k = 0;
    for (let i = 0; i < BRUTO && k < USADOS; i++) {
      if (!exposto[i]) continue;
      base[k * 3] = bruto[i * 3]; base[k * 3 + 1] = bruto[i * 3 + 1]; base[k * 3 + 2] = bruto[i * 3 + 2];
      normais[k * 3] = brutoN[i * 3]; normais[k * 3 + 1] = brutoN[i * 3 + 1]; normais[k * 3 + 2] = brutoN[i * 3 + 2];
      fase[k] = Math.random() * Math.PI * 2;
      gradientColor((base[k * 3 + 1] + ALTURA / 2) / ALTURA, cor);
      cores[k * 3] = cor.r; cores[k * 3 + 1] = cor.g; cores[k * 3 + 2] = cor.b;
      k++;
    }

    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normais, 3));
    geo.setAttribute('tinta', new THREE.BufferAttribute(cores, 3));

    /* Antes era PointsMaterial puro: aditivo sem sombreamento nenhum. O
       problema é que o aditivo empilha justamente no contorno, onde as
       partículas se veem em ângulo rasante — o contorno estourava e o miolo
       do rosto ficava ralo, então ela lia como um ovo oco.
       Aqui cada partícula sabe pra onde sua superfície aponta:
         . encara a câmera  -> acende (o rosto ganha volume)
         . fica de perfil    -> realce de borda (o contorno segue brilhando)
         . mais a "lâmpada", uma luz que acompanha o mouse junto com o giro */
    mat = new THREE.ShaderMaterial({
      uniforms: {
        mapa: { value: dotTexture() },
        tamanho: { value: TAM_PONTO },
        escala: { value: 400 },          // metade da altura do buffer; medir() ajusta
        opacidade: { value: 1.0 },
        luz: { value: new THREE.Vector3(0, 0, 1) },
        /* (ambiente, frente, borda, lâmpada).
           Os números são altos porque o sombreamento APAGA a metade de trás
           da cabeça — que no aditivo puro atravessava e inflava o brilho de
           graça. Medido contra o material antigo no mesmo quadro: cobertura
           17,8% contra 17,9% dele, com mais luz (19,3 contra 16,8) e nenhum
           pixel estourado. É o que devolve o nível sem perder a direção. */
        pesos: { value: new THREE.Vector4(0.45, 3.60, 1.60, 1.10) },
      },
      vertexShader: [
        'attribute vec3 tinta;',
        'uniform float tamanho;',
        'uniform float escala;',
        'uniform vec3 luz;',
        'uniform vec4 pesos;',
        'varying vec3 vCor;',
        'varying float vBrilho;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vec3 nv = normalize(normalMatrix * normal);',
        '  vec3 olho = normalize(-mv.xyz);',
        '  float frente = max(dot(nv, olho), 0.0);',
        '  float borda = pow(1.0 - abs(dot(nv, olho)), 3.0);',
        '  float lampada = max(dot(nv, normalize(luz)), 0.0);',
        '  vBrilho = pesos.x + pesos.y * frente + pesos.z * borda + pesos.w * lampada;',
        '  vCor = tinta;',
        '  gl_PointSize = tamanho * (escala / -mv.z);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D mapa;',
        'uniform float opacidade;',
        'varying vec3 vCor;',
        'varying float vBrilho;',
        'void main() {',
        '  float a = texture2D(mapa, gl_PointCoord).a;',
        '  if (a < 0.02) discard;',
        '  gl_FragColor = vec4(vCor * vBrilho, a * opacidade);',
        '}',
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    pontos = new THREE.Points(geo, mat);
    pontos.userData.base = base;
    pontos.userData.normais = normais;
    pontos.userData.fase = fase;
    pontos.userData.n = USADOS;
    grupo.add(pontos);
    medir();                                   // acerta a escala do ponto

    /* a entrada suave é do CSS: #heroHead é um .hero-el e ganha o mesmo
       fade dos outros elementos do hero. Fazer isso aqui com um rAF
       próprio deixaria a cabeça invisível se o laço não rodasse. */

    avaliar();
    ligar();
  }

  /* ---------- carrega o modelo (cache do navegador: a intro já baixou) ---------- */
  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('assets/3d/head2.glb', function (gltf) {
      gltf.scene.updateMatrixWorld(true);
      const malhas = [];
      gltf.scene.traverse(o => { if (o.isMesh) malhas.push(o); });
      if (!malhas.length) return;

      const cabeca = malhas.reduce((a, b) =>
        b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a);

      /* posições via getX/getY/getZ: o meshopt entrega atributos
         intercalados, que quebrariam o MeshSurfaceSampler */
      const src = cabeca.geometry;
      const pa = src.attributes.position;
      const plano = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) {
        plano[i * 3] = pa.getX(i);
        plano[i * 3 + 1] = pa.getY(i);
        plano[i * 3 + 2] = pa.getZ(i);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(plano, 3));
      if (src.index) g.setIndex(src.index.clone());
      g.applyMatrix4(cabeca.matrixWorld);
      /* a boca por dentro sai depois, na poda por oclusão (podarInterior),
         que trabalha sobre as partículas já amostradas */

      /* normaliza: centro na origem, altura conhecida */
      g.computeBoundingBox();
      const tam = new THREE.Vector3(); g.boundingBox.getSize(tam);
      const centro = new THREE.Vector3(); g.boundingBox.getCenter(centro);
      g.translate(-centro.x, -centro.y, -centro.z);
      const escala = ALTURA / tam.y;
      g.scale(escala, escala, escala);
      g.computeVertexNormals();                // o sombreamento depende delas

      montar(g);
    }, undefined, function () { /* sem modelo, o hero segue sem ela */ });
  } catch (e) { /* idem */ }

  /* Gancho de desenvolvimento, no mesmo espírito do debugCapture da intro:
     desenha um quadro fora do laço e informa pra onde ela está olhando.
     Serve pra ajustar os ângulos ao vivo e pra testar com o rAF parado. */
  window.HeroHead = {
    pronta: function () { return !!pontos; },
    get _pontos() { return pontos; },          // dev: ajuste fino ao vivo
    get _mat() { return mat; },
    mirar: function (mx, my, passos) {
      alvoRotY = mx * GIRO_MAX_Y;
      alvoRotX = my * GIRO_MAX_X;
      for (var i = 0; i < (passos || 60); i++) {
        grupo.rotation.y += (alvoRotY - grupo.rotation.y) * MACIEZ;
        grupo.rotation.x += (alvoRotX - grupo.rotation.x) * MACIEZ;
      }
      if (renderer && pontos) renderer.render(cena, camera);
      return {
        alvo: { y: +alvoRotY.toFixed(3), x: +alvoRotX.toFixed(3) },
        atual: { y: +grupo.rotation.y.toFixed(3), x: +grupo.rotation.x.toFixed(3) },
        particulas: pontos ? COUNT : 0,
      };
    },
  };

  /* ---------- só começa depois que o hero aparece ---------- */
  addEventListener('heroreveal', function () {
    liberado = true;
    avaliar();
    ligar();
  }, { once: true });

  /* rede de segurança: se o evento não vier (falha na intro), libera sozinha */
  setTimeout(function () { if (!liberado) { liberado = true; avaliar(); ligar(); } }, 7000);
}
