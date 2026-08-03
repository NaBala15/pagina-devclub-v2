/* =====================================================================
   RAIO-X TÉRMICO — o visual da referência 6

   Três peças que a nossa cabeça não tinha:
   1. um material de raio-X: a superfície fica transparente no meio e
      acende nas bordas (Fresnel), como uma radiografia;
   2. um cérebro, gerado em código (o .glb é só a pele, não tem miolo);
   3. uma coluna cervical, empilhada vértebra por vértebra.

   A cor vem de um mapa térmico: rosto em ciano/verde, crânio em
   magenta/vermelho, nuca e coluna em laranja — como na foto.
   ===================================================================== */

import * as THREE from 'three';

/* ---------------------------------------------------------------------
   MAPA TÉRMICO
   --------------------------------------------------------------------- */
const TERMICO = [
  { t: 0.00, c: new THREE.Color('#00e5ff') },   // frente do rosto: ciano
  { t: 0.18, c: new THREE.Color('#28ff9b') },   // maçã do rosto: verde
  { t: 0.38, c: new THREE.Color('#3b6bff') },   // meio do crânio: azul
  { t: 0.58, c: new THREE.Color('#b13cff') },   // violeta
  { t: 0.76, c: new THREE.Color('#ff2fb0') },   // magenta
  { t: 0.90, c: new THREE.Color('#ff3b3b') },   // vermelho
  { t: 1.00, c: new THREE.Color('#ff9d00') },   // nuca e coluna: laranja
];

export function thermalColor(t, out) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < TERMICO.length; i++) {
    if (t <= TERMICO[i].t) {
      const a = TERMICO[i - 1], b = TERMICO[i];
      return out.copy(a.c).lerp(b.c, (t - a.t) / (b.t - a.t));
    }
  }
  return out.copy(TERMICO[TERMICO.length - 1].c);
}

/* rampa como textura 1D: o shader lê a cor pelo eixo frente→trás */
export function thermalRamp() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  TERMICO.forEach(p => grad.addColorStop(p.t, '#' + p.c.getHexString()));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------------------------------------------------------------
   MATERIAL DE RAIO-X
   O miolo some e a borda acende: é o Fresnel, o mesmo fenômeno que faz a
   beirada de uma bolha de sabão brilhar. Aditivo, então camadas
   sobrepostas somam luz — o que dá a sensação de ver através.
   --------------------------------------------------------------------- */
export function xrayMaterial({ rampa, eixo = 'z', min = -0.8, max = 0.8,
                               poder = 2.1, brilho = 2.6, opacidade = 0 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,          // deixa passar do limiar do bloom
    uniforms: {
      uRampa: { value: rampa },
      uMin: { value: min },
      uMax: { value: max },
      uPoder: { value: poder },
      uBrilho: { value: brilho },
      uOpacidade: { value: opacidade },
      uEixo: { value: eixo === 'y' ? 1 : (eixo === 'x' ? 0 : 2) },
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vViewW;
      varying vec3 vPos;
      void main() {
        vec4 mundo = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewW = normalize(cameraPosition - mundo.xyz);
        vPos = position;
        gl_Position = projectionMatrix * viewMatrix * mundo;
      }
    `,
    fragmentShader: `
      uniform sampler2D uRampa;
      uniform float uMin, uMax, uPoder, uBrilho, uOpacidade;
      uniform int uEixo;
      varying vec3 vNormalW;
      varying vec3 vViewW;
      varying vec3 vPos;
      void main() {
        // Fresnel: 0 de frente (some), 1 de raspão (acende)
        float f = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewW)));
        f = pow(clamp(f, 0.0, 1.0), uPoder);

        float eixo = uEixo == 0 ? vPos.x : (uEixo == 1 ? vPos.y : vPos.z);
        float t = clamp((eixo - uMin) / (uMax - uMin), 0.0, 1.0);
        vec3 cor = texture2D(uRampa, vec2(t, 0.5)).rgb;

        float a = f * uOpacidade;
        gl_FragColor = vec4(cor * f * uBrilho, a);
      }
    `,
  });
}

/* ---------------------------------------------------------------------
   CÉREBRO — o .glb é só a pele, então o miolo é gerado aqui.
   Uma esfera achatada nas proporções do encéfalo, com a superfície
   deslocada por ruído: são os giros e sulcos. Um vinco fundo no plano
   sagital separa os dois hemisférios, como no de verdade.
   --------------------------------------------------------------------- */
function ruido3D(x, y, z) {
  // ruído de valor barato: hash + suavização. Suficiente pra enrugar.
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
function ruidoSuave(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  let r = 0;
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1; j++) for (let k = 0; k <= 1; k++) {
    const peso = (i ? u : 1 - u) * (j ? v : 1 - v) * (k ? w : 1 - w);
    r += ruido3D(xi + i, yi + j, zi + k) * peso;
  }
  return r;
}

export function fazCerebro(material) {
  const geo = new THREE.SphereGeometry(1, 96, 72);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    /* proporção do encéfalo: mais comprido que alto, achatado embaixo */
    v.x *= 0.74; v.y *= 0.62; v.z *= 0.92;
    if (v.y < 0) v.y *= 0.72;                     // base plana (tronco)

    /* giros e sulcos: duas oitavas de ruído deslocando a superfície */
    const n1 = ruidoSuave(v.x * 7.5 + 11, v.y * 7.5 + 5, v.z * 7.5 + 3);
    const n2 = ruidoSuave(v.x * 15 + 2, v.y * 15 + 9, v.z * 15 + 7);
    const enruga = (n1 - 0.5) * 0.115 + (n2 - 0.5) * 0.055;

    /* vinco sagital: separa os hemisférios */
    const fissura = Math.exp(-Math.pow(v.x / 0.055, 2)) * 0.09;

    const n = v.clone().normalize();
    v.addScaledVector(n, enruga - fissura);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const cerebro = new THREE.Mesh(geo, material);
  cerebro.scale.setScalar(0.60);   // preenche a calota, como na referência
  return cerebro;
}

/* ---------------------------------------------------------------------
   COLUNA CERVICAL — vértebras empilhadas descendo pela nuca, com o
   canal medular no meio. Na foto é a parte mais quente (laranja).
   --------------------------------------------------------------------- */
export function fazColuna(material) {
  const grupo = new THREE.Group();
  /* o modelo tem o pescoço curto: uma coluna longa demais fica pendurada
     no vazio, abaixo de onde a pele termina */
  const N = 9;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const corpo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075 + t * 0.035, 0.08 + t * 0.035, 0.05, 14, 1, true),
      material
    );
    /* a cervical é levemente curvada: desce e avança */
    corpo.position.set(0, -t * 0.60, -0.02 - Math.sin(t * 1.5) * 0.07);
    corpo.rotation.x = -0.14 * t;
    grupo.add(corpo);

    /* processo espinhoso: a "aleta" atrás de cada vértebra, discreta */
    const espinha = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.075, 6, 1, true),
      material
    );
    espinha.position.set(0, corpo.position.y - 0.012, corpo.position.z - 0.085);
    espinha.rotation.x = Math.PI / 2 + 0.55;
    grupo.add(espinha);
  }
  return grupo;
}
