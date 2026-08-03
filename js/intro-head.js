/* =====================================================================
   INTRO "DENTRO DA MENTE" — cabeça de partículas (Three.js)

   Storyboard (rascunho no papel do Jeff):
     1. Partículas voam e formam uma cabeça de perfil, pensando
     2. Ideias orbitam a cabeça (laptop, mundo, lâmpada, engrenagem, ?)
     3. O olho acende com o reflexo de uma tela de código
     4. A cabeça vira de frente pra câmera
     5. A câmera mergulha DENTRO do olho → flash → entra na página

   Integração: js/script.js chama window.HeadIntro.run(onDone) quando o
   PRESS START é dispensado. Se WebGL/modelo falharem, isReady() devolve
   false e o script.js cai no fallback (code morph da V1).
   ===================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { gradientColor, dotTexture, removeMouthInterior } from 'head-shared';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createDevLaptopIconModel } from './laptop-icon.js';
import { createGlobeIcon, createBulbIcon, createGearIcon, createQuestionIcon, createEnvelopeIcon } from './idea-icons.js';

const LIME = new THREE.Color('#c6ff3d');
const CYAN = new THREE.Color('#4fe0ff');


/* Quantidade de partículas da cabeça (equilíbrio visual x performance) */
const COUNT = 16000;

/* A posição do olho agora é AUTOMÁTICA: o modelo facecap tem os globos
   oculares como meshes separados — usamos o centro do olho direito. */

/* layout da cena: cabeça abaixo do centro pra sobrar teto pros ícones */
const HEAD_H = 1.55;       // altura normalizada da cabeça (modelo facecap é só cabeça)
const HEAD_Y = -0.15;      // deslocamento vertical do grupo da cabeça
const ORBIT_Y = 0.84;      // altura da órbita das ideias (mundo)
const ORBIT_R = 1.04;      // raio da órbita
const CAM_Y = 0;           // altura base da câmera

/* Roteiro da cena — tempos em segundos */
const T = {
  FORM_END: 2.2,     // partículas terminam de formar a cabeça
  ICONS_IN: 1.6,     // ideias começam a aparecer
  EYE_ON: 3.0,       // olho/reflexo acende
  TURN_START: 4.6,   // cabeça começa a virar de frente
  TURN_END: 6.2,
  DIVE_START: 6.4,   // câmera mergulha no olho
  DIVE_END: 8.2,
  FLASH: 7.9,        // flash final começa um pouco antes do fim
};

const clamp01 = v => Math.min(Math.max(v, 0), 1);
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
/* progresso local de uma janela [a,b] do roteiro */
const phase = (now, a, b) => clamp01((now - a) / (b - a));

/* ---------------------------------------------------------------------
   TEXTURAS DESENHADAS EM CANVAS (sem assets externos)
   --------------------------------------------------------------------- */


/* "reflexo" do olho: telinha com código rolando, redesenhada a cada frame */
function makeCodeScreen() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const TOKENS = ['const', 'dev = ', '=>', 'if(', 'for(', '{ }', 'let ', 'return',
    '</>', 'fn()', '0x2F', '===', '!== ', '.map', 'async', 'await', '&&', '[i]'];
  const lines = Array.from({ length: 10 }, () =>
    Array.from({ length: 4 }, () => TOKENS[(Math.random() * TOKENS.length) | 0]).join(' '));
  let scroll = 0;

  function draw() {
    g.fillStyle = 'rgba(3,8,4,0.92)';
    g.fillRect(0, 0, 256, 160);
    g.font = '13px monospace';
    scroll += 0.35;
    for (let i = 0; i < lines.length; i++) {
      const y = ((i * 18 - scroll) % 180 + 180) % 180 - 10;
      g.fillStyle = i % 3 === 0 ? 'rgba(79,224,255,0.85)' : 'rgba(198,255,61,0.85)';
      g.fillText(lines[i], 8, y);
    }
    /* brilho de "vidro" do olho */
    const gl = g.createRadialGradient(128, 80, 10, 128, 80, 150);
    gl.addColorStop(0, 'rgba(255,255,255,0.10)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, 256, 160);
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

/* "reflexo da PÁGINA": miniatura da própria página DevClub rolando devagar —
   navbar fixa, título hero, botão CTA, console de stats e cards */
function makePageScreen() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let scroll = 0;

  function draw() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#06070b';
    g.fillRect(0, 0, 256, 256);
    /* conteúdo em 0.78x: mais página cabe na janela visível do olho */
    g.setTransform(0.78, 0, 0, 0.78, 28, 4);
    scroll += 0.25;
    const CONTENT_H = 380;                       // altura virtual da "página"
    const off = -(scroll % CONTENT_H);

    const line = (x, y, w, h, color) => {
      const yy = y + off < -20 ? y + off + CONTENT_H : y + off;
      g.fillStyle = color;
      g.fillRect(x, yy + 34, w, h);
    };

    /* hero */
    g.textAlign = 'left';
    const text = (t, x, y, font, color) => {
      const yy = y + off < -20 ? y + off + CONTENT_H : y + off;
      g.font = font; g.fillStyle = color;
      g.fillText(t, x, yy + 34);
    };
    text('Ideias viram', 18, 40, 'bold 21px sans-serif', '#e8edef');
    text('código.', 18, 66, 'bold 21px sans-serif', '#c6ff3d');
    text('Pessoas viram devs.', 18, 92, 'bold 19px sans-serif', '#e8edef');
    /* CTA pill */
    const yy = 110 + off < -20 ? 110 + off + CONTENT_H : 110 + off;
    g.fillStyle = '#c6ff3d';
    g.beginPath(); g.roundRect(18, yy + 34, 110, 24, 12); g.fill();
    g.font = 'bold 12px monospace'; g.fillStyle = '#05060a';
    g.fillText('Ver formações →', 24, yy + 50);
    /* console de stats */
    line(18, 152, 220, 58, '#101315');
    text('$ devclub --stats', 26, 168, '11px monospace', '#8a969c');
    text('42.300+  89%  340+', 26, 190, 'bold 15px monospace', '#c6ff3d');
    /* cards de formações */
    line(18, 228, 104, 64, '#14171c');
    line(134, 228, 104, 64, '#14171c');
    text('@devclub/', 26, 248, '10px monospace', '#4fe0ff');
    text('fullstack', 26, 262, 'bold 11px monospace', '#c6ff3d');
    text('@devclub/', 142, 248, '10px monospace', '#4fe0ff');
    text('frontend', 142, 262, 'bold 11px monospace', '#c6ff3d');
    /* faixa de marquee */
    line(0, 316, 256, 22, '#0b0d0f');
    text('iFood · Nubank · Stone · Magalu', 14, 331, '10px monospace', '#8a969c');

    /* navbar FIXA por cima */
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(5,6,10,0.92)';
    g.fillRect(0, 0, 256, 26);
    g.font = 'bold 13px monospace'; g.fillStyle = '#c6ff3d';
    g.fillText('>DevClub', 10, 18);
    g.fillStyle = '#8a969c'; g.font = '9px monospace';
    g.fillText('mente  formacoes  jornada', 100, 17);

    /* brilho de vidro do olho */
    const gl = g.createRadialGradient(128, 128, 20, 128, 128, 200);
    gl.addColorStop(0, 'rgba(255,255,255,0.10)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, 256, 256);
    tex.needsUpdate = true;
  }
  draw();
  return { tex, draw };
}

/* ---------------------------------------------------------------------
   MONTAGEM DA CENA
   --------------------------------------------------------------------- */
let state = null;   // preenchido quando o modelo carrega
let failed = false;

function buildScene(headGeometry, sampleGeometry, eyeCenterWorld, eyeRadiusWorld) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 50);
  camera.position.set(0, CAM_Y, 3.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.className = 'head-intro-canvas';

  /* --- normaliza a GEOMETRIA: centro na origem, altura HEAD_H --- */
  headGeometry.computeBoundingBox();
  const bb = headGeometry.boundingBox;
  const size = new THREE.Vector3(); bb.getSize(size);
  const center = new THREE.Vector3(); bb.getCenter(center);
  const scale = HEAD_H / size.y;
  headGeometry.translate(-center.x, -center.y, -center.z);
  headGeometry.scale(scale, scale, scale);
  headGeometry.computeVertexNormals();
  sampleGeometry.translate(-center.x, -center.y, -center.z);
  sampleGeometry.scale(scale, scale, scale);

  /* olho no espaço normalizado (vem direto do mesh do globo ocular);
     raio reduzido: a íris brilhante é menor que o globo anatômico */
  const eyePos = eyeCenterWorld.clone().sub(center).multiplyScalar(scale);
  /* raio ANATÔMICO: o globo precisa preencher a cavidade vazada do modelo */
  const eyeR = Math.min(Math.max(eyeRadiusWorld * scale * 0.95, 0.05), 0.12);

  /* --- amostra pontos uniformes na superfície (geometria já normalizada) --- */
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(sampleGeometry)).build();
  const target = new Float32Array(COUNT * 3);
  const start = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const jitter = new Float32Array(COUNT);      // fase do "respirar" de cada ponto
  const p = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    sampler.sample(p);
    target[i * 3] = p.x; target[i * 3 + 1] = p.y; target[i * 3 + 2] = p.z;

    /* nasce numa casca esférica ao redor (vai convergir pra cabeça) */
    const r = 2.6 + Math.random() * 2.4;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    start[i * 3] = r * Math.sin(ph) * Math.cos(th);
    start[i * 3 + 1] = r * Math.cos(ph);
    start[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    jitter[i] = Math.random() * Math.PI * 2;

    /* cada partícula já voa na cor do degradê do seu destino */
    gradientColor((p.y + HEAD_H / 2) / HEAD_H, tint);
    colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(start.slice(), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.014,
    map: dotTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);

  const head = new THREE.Group();
  head.add(points);
  head.rotation.y = -1.15;            // começa de perfil (como no rascunho)
  head.position.y = HEAD_Y;           // desce a cabeça pro centro visual da tela
  scene.add(head);

  /* --- CABEÇA SÓLIDA (referência do Jeff): superfície lisa com degradê.
     As partículas convergem e se "condensam" nela via crossfade. --- */
  const vCount = headGeometry.attributes.position.count;
  const solidColors = new Float32Array(vCount * 3);
  const pa2 = headGeometry.attributes.position;
  for (let i = 0; i < vCount; i++) {
    gradientColor((pa2.getY(i) + HEAD_H / 2) / HEAD_H, tint);
    solidColors[i * 3] = tint.r; solidColors[i * 3 + 1] = tint.g; solidColors[i * 3 + 2] = tint.b;
  }
  headGeometry.setAttribute('color', new THREE.BufferAttribute(solidColors, 3));
  const solidMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.5, metalness: 0.0,
    transparent: true, opacity: 0,
  });
  const solid = new THREE.Mesh(headGeometry, solidMat);
  head.add(solid);

  /* CONTORNO: uma casca por dentro-fora (BackSide) um pouco maior que o
     rosto. Como só a parte de trás é desenhada, sobra exatamente a borda —
     e o additive faz essa borda virar luz. É o "rim light" das referências,
     sem precisar de shader próprio. */
  const rimMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    /* a cor vai acima de 1 de propósito: as cores do degradê sozinhas ficam
       abaixo do limiar do bloom e a borda não acenderia. toneMapped:false
       deixa esses valores passarem inteiros até o pós-processamento. */
    toneMapped: false,
  });
  rimMat.color.setRGB(3, 3, 3);
  const rim = new THREE.Mesh(headGeometry, rimMat);
  rim.scale.setScalar(1.045);   // colada: a partir de ~1.10 descola da cabeça
  head.add(rim);

  /* luzes de estúdio pro degradê ler como na referência */
  const keyLight = new THREE.DirectionalLight('#ffffff', 1.6);
  keyLight.position.set(-1.5, 2.2, 2.6);
  const fillLight = new THREE.HemisphereLight('#9fb4ff', '#2a1140', 0.7);
  scene.add(keyLight, fillLight);

  /* --- OLHO DIREITO: esfera com o reflexo da PRÓPRIA PÁGINA rolando --- */
  const screen = makePageScreen();
  const eyeMat = new THREE.MeshBasicMaterial({
    map: screen.tex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 24, 16), eyeMat);
  eye.position.copy(eyePos);
  eye.rotation.y = Math.PI;                      // hero da página de frente (validado visualmente)
  eye.scale.x = -1;                              // espelha: texto lê correto por fora
  head.add(eye);

  /* --- OLHO ESQUERDO: esfera com reflexo só de CÓDIGO --- */
  const codeScreen = makeCodeScreen();
  codeScreen.tex.wrapS = THREE.RepeatWrapping;
  codeScreen.tex.repeat.x = 2;
  const leftEyeMat = new THREE.MeshBasicMaterial({
    map: codeScreen.tex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 24, 16), leftEyeMat);
  leftEye.position.set(-eyePos.x, eyePos.y, eyePos.z);
  leftEye.rotation.y = Math.PI;
  leftEye.scale.x = -1;
  head.add(leftEye);

  /* halos: depthTest OFF pra atravessar a cabeça sólida —
     os olhos "acendem por dentro" mesmo com o rosto de perfil */
  const haloMat = new THREE.SpriteMaterial({
    map: dotTexture(), color: LIME, transparent: true, opacity: 0,
    depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(eyeR * 5);
  halo.position.copy(eyePos);
  const halo2 = new THREE.Sprite(haloMat.clone());
  halo2.scale.setScalar(eyeR * 3.5);
  halo2.position.copy(leftEye.position);
  head.add(halo, halo2);
  const halo2Mat = halo2.material;

  /* --- ideias orbitando: TODOS os ícones em 3D de verdade ---
     laptop (pipeline img2threejs) + globo, lâmpada, engrenagem e "?" procedurais */
  const laptop = createDevLaptopIconModel();
  laptop.userData.baseScale = 0.34;
  const builders = [createGlobeIcon, createBulbIcon, createGearIcon, createQuestionIcon, createEnvelopeIcon];
  const icons = [laptop, ...builders.map(b => {
    const g = b();
    g.userData.baseScale = 1.0;
    return g;
  })];
  icons.forEach((g, i) => {
    g.userData.angle = (i / icons.length) * Math.PI * 2;
    g.userData.spin = 0.6 + (i % 3) * 0.25;      // cada um gira num ritmo
    g.scale.setScalar(0.001);                    // nasce invisível, cresce na fase das ideias
    scene.add(g);
  });

  /* luz dedicada pros ícones reagirem (as partículas são additive e não precisam) */
  const iconLight = new THREE.DirectionalLight('#e8f0ff', 1.4);
  iconLight.position.set(2, 3, 2.5);
  scene.add(iconLight, new THREE.AmbientLight('#334', 0.6));

  /* --- BLOOM: o brilho vaza dos pontos claros ---
     É a diferença entre "gradiente chapado" e neon. O OutputPass no fim
     devolve o espaço de cor certo (senão a cena sai lavada). */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  /* valores calibrados na tela: com limiar baixo (0.18) o rosto inteiro
     passava do corte e a cabeça virava um borrão branco. Em 0.84 só os
     olhos e a borda de luz acendem — o resto do degradê fica limpo. */
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.55,   // força
    0.50,   // raio do halo
    0.84    // limiar: só o que já é quase branco acende
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return { scene, camera, renderer, composer, bloom, head, points, geo, start, target, jitter, eye, eyeMat, leftEyeMat, halo, haloMat, halo2Mat, screen, codeScreen, icons, mat, solid, solidMat, rimMat };
}


/* ---------------------------------------------------------------------
   CARREGAMENTO (começa já no load da página, antes do PRESS START sair)
   --------------------------------------------------------------------- */
try {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    'assets/3d/head2.glb',
    (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const meshes = [];
      gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
      if (!meshes.length) { failed = true; return; }

      /* cabeça = mesh com mais vértices; olho direito = mesh restante com maior X */
      const headMesh = meshes.reduce((a, b) =>
        b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a);
      const others = meshes.filter(m => m !== headMesh);
      const boxOf = (m) => new THREE.Box3().setFromObject(m);
      let eyeCenter = null, eyeRadius = 0.1;
      if (others.length) {
        const eyeMesh = others.reduce((a, b) =>
          boxOf(b).getCenter(new THREE.Vector3()).x > boxOf(a).getCenter(new THREE.Vector3()).x ? b : a);
        const ebb = boxOf(eyeMesh);
        eyeCenter = ebb.getCenter(new THREE.Vector3());
        const es = ebb.getSize(new THREE.Vector3());
        eyeRadius = Math.max(es.x, es.y, es.z) * 0.5 * 0.9;
      }

      /* Extrai posições via getX/getY/getZ (o meshopt entrega atributos
         intercalados/quantizados, que quebrariam o MeshSurfaceSampler),
         e "assa" a transformação de mundo na geometria plana. */
      const src = headMesh.geometry;
      const pa = src.attributes.position;
      const flat = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) {
        flat[i * 3] = pa.getX(i);
        flat[i * 3 + 1] = pa.getY(i);
        flat[i * 3 + 2] = pa.getZ(i);
      }
      const headGeo = new THREE.BufferGeometry();
      headGeo.setAttribute('position', new THREE.BufferAttribute(flat, 3));
      if (src.index) headGeo.setIndex(src.index.clone());
      headGeo.applyMatrix4(headMesh.matrixWorld);
      const sampleGeo = headGeo.clone();
      removeMouthInterior(sampleGeo, true);    // partículas: boca interna toda fora
      removeMouthInterior(headGeo, false);     // sólido: só a arcada
      if (!eyeCenter) eyeCenter = new THREE.Vector3(0.34, 0.26, 0.23);

      try { state = buildScene(headGeo, sampleGeo, eyeCenter, eyeRadius); }
      catch (e) { console.warn('[HeadIntro] WebGL indisponível:', e); failed = true; }
    },
    undefined,
    (err) => { console.warn('[HeadIntro] modelo não carregou:', err); failed = true; }
  );
} catch (e) { failed = true; }

/* ---------------------------------------------------------------------
   EXECUÇÃO DA SEQUÊNCIA
   --------------------------------------------------------------------- */
/* garante canvas com tamanho válido (página pode ter carregado em aba oculta) */
function ensureRendererSize(renderer, camera, composer) {
  const W = Math.max(innerWidth, 640);
  const H = Math.max(innerHeight, 480);
  if (renderer.domElement.width === 0 || renderer.domElement.height === 0 ||
      Math.abs(renderer.domElement.clientWidth - W) > 2) {
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(W, H);      // o bloom tem alvos próprios
  }
}

function run(onDone) {
  const { scene, camera, renderer, composer, head, geo, start, target, jitter, eye, eyeMat, leftEyeMat, haloMat, halo2Mat, screen, codeScreen, icons, mat, solidMat, rimMat } = state;

  ensureRendererSize(renderer, camera, composer);
  document.body.appendChild(renderer.domElement);

  /* flash de saída + botão de pular */
  const flash = document.createElement('div');
  flash.className = 'head-intro-flash';
  document.body.appendChild(flash);

  const skip = document.createElement('button');
  skip.className = 'head-intro-skip';
  skip.type = 'button';
  skip.textContent = 'pular [esc]';
  document.body.appendChild(skip);

  const pos = geo.getAttribute('position');
  /* tempo SIMULADO: avança só quando um frame renderiza (máx 50ms por frame).
     Assim a intro não "pula pro fim" se a aba carregar em segundo plano. */
  let simNow = 0;
  let lastMs = performance.now();
  let rafId = 0;
  let finished = false;

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', onResize);

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(rafId);
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey);
    flash.style.opacity = '1';
    /* deixa o flash cobrir, revela a página por baixo, e limpa tudo */
    setTimeout(() => {
      onDone();
      flash.style.opacity = '0';
      renderer.domElement.remove();
      skip.remove();
      setTimeout(() => flash.remove(), 700);
      renderer.dispose();
      geo.dispose(); mat.dispose();
    }, 260);
  }
  const onKey = (e) => { if (e.key === 'Escape') finish(); };
  addEventListener('keydown', onKey);
  skip.addEventListener('click', finish);

  const eyeWorld = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function frame(nowMs) {
    if (finished) return;
    simNow += Math.min((nowMs - lastMs) / 1000, 0.05);
    lastMs = nowMs;
    const now = simNow;

    /* cintilação: com bloom, variar o tamanho do ponto vira brilho pulsando */
    mat.size = 0.014 + Math.sin(now * 1.9) * 0.0022;

    /* 1. partículas convergem pra cabeça (+ respiração sutil depois) */
    const form = easeOut(phase(now, 0, T.FORM_END));
    const breathe = Math.min(1, form) * 0.006;
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3;
      const wob = Math.sin(now * 2 + jitter[i]) * breathe;
      pos.array[j]     = start[j]     + (target[j]     - start[j])     * form + wob;
      pos.array[j + 1] = start[j + 1] + (target[j + 1] - start[j + 1]) * form + wob;
      pos.array[j + 2] = start[j + 2] + (target[j + 2] - start[j + 2]) * form;
    }
    pos.needsUpdate = true;

    /* 1b. partículas se CONDENSAM na cabeça sólida com degradê */
    const solidIn = easeInOut(phase(now, T.FORM_END, T.FORM_END + 1.0));
    solidMat.opacity = solidIn; rimMat.opacity = (solidIn) * 0.85;
    mat.opacity = 1 - solidIn * 0.94;   // resta um brilho sutil de partículas

    /* 2. ideias orbitam em 3D; quando a cabeça vira, são ABSORVIDAS —
       a mente "concluiu a ideia" e elas mergulham pro crânio */
    const iconsIn = easeOut(phase(now, T.ICONS_IN, T.ICONS_IN + 1));
    const absorb = easeIn(phase(now, T.TURN_START, T.TURN_START + 1.0));
    icons.forEach((g, i) => {
      if (g.userData.tick) g.userData.tick(now);   // tick primeiro: o position.set abaixo manda
      const a = g.userData.angle + now * 0.55;
      const px = Math.cos(a) * ORBIT_R;
      const py = ORBIT_Y + (i % 2) * 0.11 + Math.sin(now * 1.4 + i) * 0.08;
      const pz = Math.sin(a) * ORBIT_R * 0.42;
      g.position.set(px * (1 - absorb), py + (HEAD_Y + 0.32 - py) * absorb, pz * (1 - absorb));
      g.rotation.y = now * g.userData.spin + absorb * 6;    // acelera o giro ao entrar
      g.scale.setScalar(Math.max(g.userData.baseScale * iconsIn * (1 - absorb), 0.001));
    });

    /* 3. olhos acendem: direito = reflexo da página; esquerdo = só código */
    screen.draw();
    codeScreen.draw();
    const eyeOn = easeOut(phase(now, T.EYE_ON, T.EYE_ON + 1.2));
    const dive = easeInOut(phase(now, T.DIVE_START, T.DIVE_END));
    /* base escura junto com a cabeça sólida (tapa a cavidade), brilho no EYE_ON */
    eyeMat.opacity = Math.max(solidIn * 0.15, eyeOn * (0.7 + dive * 0.3));
    leftEyeMat.opacity = Math.max(solidIn * 0.15, eyeOn * 0.75);
    haloMat.opacity = eyeOn * 0.35 * (1 - dive);    // halos somem no mergulho
    halo2Mat.opacity = eyeOn * 0.22 * (1 - dive);
    /* reta final do mergulho: a cabeça se dissolve em partículas —
       nada do interior (orelha, etc.) aparece quando a câmera entra */
    const melt = clamp01((dive - 0.62) / 0.26);
    if (melt > 0) {
      solidMat.opacity = solidIn * (1 - melt); rimMat.opacity = (solidIn * (1 - melt)) * 0.85;
      mat.opacity = 0.06 + melt * 0.5;              // partículas voltam a brilhar
    }

    /* 4. cabeça vira de frente */
    const turn = easeInOut(phase(now, T.TURN_START, T.TURN_END));
    head.rotation.y = -1.15 * (1 - turn);

    /* 5. câmera mergulha PRA DENTRO do globo ocular — pan lateral e mira
       progressivos, sincronizados com o zoom (sem "puxada" no início) */
    if (dive > 0) {
      head.localToWorld(eyeWorld.copy(eye.position));
      const lat = easeIn(dive);                     // lateral acompanha o zoom
      camera.position.x = eyeWorld.x * lat;
      camera.position.y = CAM_Y + (eyeWorld.y - CAM_Y) * lat;
      camera.position.z = 3.6 + (eyeWorld.z + 0.04 - 3.6) * easeIn(dive);
      lookTarget.copy(eyeWorld).multiplyScalar(dive);  // mira desliza do centro ao olho
      camera.lookAt(lookTarget);
    }
    if (now >= T.FLASH) flash.style.opacity = String(phase(now, T.FLASH, T.DIVE_END));
    if (now >= T.DIVE_END + 0.05) { finish(); return; }

    composer.render();
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
}

/* Captura de debug: renderiza um instante da linha do tempo sem rodar a
   animação (a aba em background congela o rAF). eyePos permite testar a
   posição do olho ao vivo antes de fixar a constante EYE. */
function debugCapture(simNow = 3.8, eyePos = null) {
  if (!state) return null;
  const { scene, camera, renderer, composer, head, geo, target, eyeMat, leftEyeMat, eye, halo, haloMat, halo2Mat, screen, codeScreen, icons, mat, solidMat, rimMat } = state;
  ensureRendererSize(renderer, camera, composer);
  const pos = geo.getAttribute('position');
  pos.array.set(target);
  pos.needsUpdate = true;
  const solidInD = easeInOut(phase(simNow, T.FORM_END, T.FORM_END + 1.0));
  solidMat.opacity = solidInD; rimMat.opacity = (solidInD) * 0.85;
  mat.opacity = 1 - solidInD * 0.94;
  if (eyePos) { eye.position.set(...eyePos); halo.position.set(...eyePos); }

  const iconsIn = easeOut(phase(simNow, T.ICONS_IN, T.ICONS_IN + 1));
  const absorbD = easeIn(phase(simNow, T.TURN_START, T.TURN_START + 1.0));
  icons.forEach((g, i) => {
    if (g.userData.tick) g.userData.tick(simNow);
    const a = g.userData.angle + simNow * 0.55;
    const px = Math.cos(a) * ORBIT_R;
    const py = ORBIT_Y + (i % 2) * 0.11 + Math.sin(simNow * 1.4 + i) * 0.08;
    const pz = Math.sin(a) * ORBIT_R * 0.42;
    g.position.set(px * (1 - absorbD), py + (HEAD_Y + 0.32 - py) * absorbD, pz * (1 - absorbD));
    g.rotation.y = simNow * g.userData.spin + absorbD * 6;
    g.scale.setScalar(Math.max(g.userData.baseScale * iconsIn * (1 - absorbD), 0.001));
  });

  screen.draw();
  codeScreen.draw();
  const eyeOnD = easeOut(phase(simNow, T.EYE_ON, T.EYE_ON + 1.2));
  const diveD = easeInOut(phase(simNow, T.DIVE_START, T.DIVE_END));
  eyeMat.opacity = Math.max(solidInD * 0.15, eyeOnD * (0.7 + diveD * 0.3));
  leftEyeMat.opacity = Math.max(solidInD * 0.15, eyeOnD * 0.75);
  haloMat.opacity = eyeOnD * 0.35 * (1 - diveD);
  halo2Mat.opacity = eyeOnD * 0.22 * (1 - diveD);
  const meltD = clamp01((diveD - 0.62) / 0.26);
  if (meltD > 0) {
    solidMat.opacity = solidInD * (1 - meltD); rimMat.opacity = (solidInD * (1 - meltD)) * 0.85;
    mat.opacity = 0.06 + meltD * 0.5;
  }
  const turn = easeInOut(phase(simNow, T.TURN_START, T.TURN_END));
  head.rotation.y = -1.15 * (1 - turn);

  const dive = easeInOut(phase(simNow, T.DIVE_START, T.DIVE_END));
  const eyeWorld = new THREE.Vector3();
  head.localToWorld(eyeWorld.copy(eye.position));
  if (dive > 0) {
    const lat = easeIn(dive);
    camera.position.set(eyeWorld.x * lat, CAM_Y + (eyeWorld.y - CAM_Y) * lat,
      3.6 + (eyeWorld.z + 0.04 - 3.6) * easeIn(dive));
    camera.lookAt(eyeWorld.clone().multiplyScalar(dive));
  } else {
    camera.position.set(0, CAM_Y, 3.6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.85);
}

/* API pública consumida pelo js/script.js */
window.HeadIntro = {
  isReady: () => !!state && !failed,
  run,
  debugCapture,
  get _state() { return state; },   // dev only: ajuste fino ao vivo
};
