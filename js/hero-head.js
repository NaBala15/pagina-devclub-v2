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
import { dotTexture, gradientColor, removeMouthInterior } from './intro-head.js';

const palco = document.getElementById('heroHead');
const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* menos partículas que a intro (16k): aqui a cabeça ocupa metade da tela,
   e o hero divide a GPU com o campo de partículas do fundo */
const COUNT = 13000;
const ALTURA = 1.6;          // altura da cabeça no mundo
const GIRO_MAX_Y = 0.62;     // ~36° pros lados
const GIRO_MAX_X = 0.34;     // ~19° pra cima/baixo
const MACIEZ = 0.075;        // quanto ela persegue o alvo a cada quadro

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
    }

    if (pontos) {
      const pos = geo.attributes.position;
      const base = pontos.userData.base;
      const fase = pontos.userData.fase;
      /* cada ponto pulsa na própria fase: a superfície "respira" */
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        const w = Math.sin(t * 1.6 + fase[i]) * 0.005;
        pos.array[j] = base[j] + w;
        pos.array[j + 1] = base[j + 1] + w;
        pos.array[j + 2] = base[j + 2] + w;
      }
      pos.needsUpdate = true;
    }
    renderer.render(cena, camera);
  }

  /* ---------- monta as partículas a partir do modelo ---------- */
  function montar(amostraGeo) {
    const amostrador = new MeshSurfaceSampler(new THREE.Mesh(amostraGeo)).build();
    const base = new Float32Array(COUNT * 3);
    const cores = new Float32Array(COUNT * 3);
    const fase = new Float32Array(COUNT);
    const p = new THREE.Vector3();
    const cor = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      amostrador.sample(p);
      base[i * 3] = p.x; base[i * 3 + 1] = p.y; base[i * 3 + 2] = p.z;
      fase[i] = Math.random() * Math.PI * 2;
      gradientColor((p.y + ALTURA / 2) / ALTURA, cor);
      cores[i * 3] = cor.r; cores[i * 3 + 1] = cor.g; cores[i * 3 + 2] = cor.b;
    }

    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));

    mat = new THREE.PointsMaterial({
      size: 0.021,
      map: dotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.92,
    });

    pontos = new THREE.Points(geo, mat);
    pontos.userData.base = base;
    pontos.userData.fase = fase;
    grupo.add(pontos);

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
      removeMouthInterior(g, true);            // sem a arcada dentária por dentro

      /* normaliza: centro na origem, altura conhecida */
      g.computeBoundingBox();
      const tam = new THREE.Vector3(); g.boundingBox.getSize(tam);
      const centro = new THREE.Vector3(); g.boundingBox.getCenter(centro);
      g.translate(-centro.x, -centro.y, -centro.z);
      const escala = ALTURA / tam.y;
      g.scale(escala, escala, escala);

      montar(g);
    }, undefined, function () { /* sem modelo, o hero segue sem ela */ });
  } catch (e) { /* idem */ }

  /* Gancho de desenvolvimento, no mesmo espírito do debugCapture da intro:
     desenha um quadro fora do laço e informa pra onde ela está olhando.
     Serve pra ajustar os ângulos ao vivo e pra testar com o rAF parado. */
  window.HeroHead = {
    pronta: function () { return !!pontos; },
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
