/* =====================================================================
   RODOLFINHO 3D — geometria escrita a partir da referência

   Reconstrução por código de uma caricatura 3D, no mesmo espírito do
   cérebro e da cabeça da intro: nenhum modelo baixado.

   As PROPORÇÕES não são estimadas — foram medidas na silhueta da
   referência (recorte de 820px):
     3.90 cabeças de altura (humano real tem ~7.5)
     cabeça = 25.6% da altura · linha do ombro em 33.2%
     marcos do rosto, em fração da cabeça: cabelo 0.229 · óculos 0.514
     · boca 0.857
   Errar essa razão descaracteriza mais do que errar qualquer detalhe:
   é a cabeça grande sobre corpo curto que faz a leitura de caricatura.

   Quadro: Y pra cima, pés em y=0, topo do cabelo em y=1. O chamador
   escala pro tamanho que quiser.

   O que NÃO veio da referência (uma vista só, de frente, braços
   cruzados) e portanto é invenção coerente, não cópia:
     . costas e nuca — espelhadas, e ele VAI mostrá-las ao virar
     . palma e dedos — a mão é volume único com encaixe na palma;
       dedo separado não lê no tamanho em que ele aparece
     . a dobra da perna — a referência é pose parada
   ===================================================================== */

import * as THREE from 'three';

/* ---------- alturas medidas ---------- */
const H_CABECA = 0.256;
const Y_QUEIXO = 1 - H_CABECA;          // 0.744
const Y_OMBRO = 1 - 0.332;              // 0.668
const Y_QUADRIL = 0.435;
const Y_JOELHO = 0.235;
const Y_TORNOZELO = 0.045;
const MEIA_OMBRO = 0.167;
const MEIA_CABECA = 0.098;

const rosto = f => 1 - H_CABECA * f;    // fração da cabeça -> y absoluto
const Y_CABELO = rosto(0.229);
const Y_OLHOS = rosto(0.514);
const Y_NARIZ = rosto(0.70);
const Y_BOCA = rosto(0.857);

/* ---------- materiais ----------
   As cores saíram de amostragem na referência, não de gosto. */
function materiais() {
  const M = (cor, rough, extra) => new THREE.MeshPhysicalMaterial(
    Object.assign({ color: cor, roughness: rough, metalness: 0 }, extra || {}));
  return {
    pele: M('#c98a5e', 0.42, { clearcoat: 0.28, clearcoatRoughness: 0.45, sheen: 0.25, sheenColor: '#e8b48a' }),
    cabelo: M('#141116', 0.62, { clearcoat: 0.35, clearcoatRoughness: 0.5 }),
    /* sheen é o que separa lã de plástico: o tecido acende na borda */
    blazer: M('#4a4d55', 0.86, { sheen: 0.5, sheenColor: '#6a6e78' }),
    camiseta: M('#131316', 0.94),
    calca: M('#151519', 0.90),
    tenis: M('#101014', 0.78, { clearcoat: 0.2 }),
    sola: M('#f0ece4', 0.70),
    armacao: M('#0a0a0c', 0.30, { clearcoat: 0.7, clearcoatRoughness: 0.15 }),
    lente: M('#9fd8e8', 0.12, { transmission: 0.7, ior: 1.5, thickness: 0.01,
      transparent: true, opacity: 0.4 }),
    dentes: M('#f6f4ef', 0.28, { clearcoat: 0.5 }),
    olho: M('#f2f0ec', 0.25, { clearcoat: 0.6 }),
    iris: M('#3a2416', 0.22, { clearcoat: 0.8 }),
    boca: M('#5a2530', 0.60),
  };
}

/* peça: malha nomeada, com pivô no ponto de rotação da junta.
   O pivô é um Group; a malha entra deslocada dentro dele. Sem isso a
   coxa giraria em torno do próprio centro em vez do quadril. */
function junta(nome, pai, pivo) {
  const g = new THREE.Group();
  g.name = nome;
  g.position.set(pivo[0], pivo[1], pivo[2]);
  pai.add(g);
  return g;
}
function pecaEm(g, geo, mat, desl, nome) {
  const m = new THREE.Mesh(geo, mat);
  m.name = nome;
  m.position.set(desl[0], desl[1], desl[2]);
  m.castShadow = true;
  g.add(m);
  return m;
}

const esfera = (rx, ry, rz, s) => {
  const g = new THREE.SphereGeometry(1, s || 26, (s || 26) * 0.75);
  g.scale(rx, ry, rz);
  return g;
};
const capsula = (r, alt, s) => new THREE.CapsuleGeometry(r, Math.max(0.001, alt - r * 2), 4, s || 18);
const caixa = (x, y, z, r) => new THREE.BoxGeometry(x, y, z, 2, 2, 2)
  .translate(0, 0, 0);

/* estampa DevClub_ desenhada em canvas — sem arquivo de imagem */
function estampaDevClub() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#131316'; g.fillRect(0, 0, 512, 256);
  g.font = 'bold 92px Inter, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f4f6f8';
  g.fillText('DevClub', 246, 128);
  const larg = g.measureText('DevClub').width;
  g.fillStyle = '#c6ff3d';                      // o underscore é lime
  g.fillRect(246 + larg / 2 + 8, 158, 42, 12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function criarRodolfinho() {
  const mat = materiais();
  const raiz = new THREE.Group();
  raiz.name = 'rodolfinho';

  /* ---------- quadril: topo da cadeia que anda ---------- */
  const quadril = junta('quadril', raiz, [0, Y_QUADRIL, 0]);
  pecaEm(quadril, esfera(0.132, 0.085, 0.10), mat.calca, [0, 0, 0], 'quadril-massa');

  /* ---------- torso ---------- */
  const torso = junta('torso', quadril, [0, 0, 0]);
  const altTorso = Y_OMBRO - Y_QUADRIL;
  pecaEm(torso, capsula(0.135, altTorso + 0.12), mat.camiseta, [0, altTorso / 2, 0], 'torso-camiseta');
  const peito = pecaEm(torso, esfera(0.112, 0.10, 0.032), mat.camiseta,
    [0, altTorso * 0.60, 0.098], 'peito-estampa');
  peito.material = new THREE.MeshPhysicalMaterial({
    map: estampaDevClub(), roughness: 0.94, metalness: 0,
  });

  /* Blazer: uma CASCA em volta do torso, aberta na frente — não duas
     bolas laterais. A primeira tentativa usou dois elipsoides largos e a
     silhueta medida estourou pra 0.363 da altura contra 0.333 da
     referência: o casaco virava ombro. Casca fina segura a largura. */
  const lapela = esfera(0.052, 0.155, 0.070);
  pecaEm(torso, lapela, mat.blazer, [-0.088, altTorso * 0.55, 0.040], 'blazer-esq');
  pecaEm(torso, lapela, mat.blazer, [0.088, altTorso * 0.55, 0.040], 'blazer-dir');
  pecaEm(torso, esfera(0.140, 0.150, 0.070), mat.blazer,
    [0, altTorso * 0.55, -0.048], 'blazer-costas');
  /* os flancos fecham a casca sem alargar a frente */
  [-1, 1].forEach(s => pecaEm(torso, esfera(0.030, 0.150, 0.090), mat.blazer,
    [s * 0.128, altTorso * 0.54, -0.010], 'blazer-flanco-' + (s < 0 ? 'esq' : 'dir')));
  /* abas de bolso */
  [-1, 1].forEach(s => pecaEm(torso, caixa(0.055, 0.018, 0.012), mat.blazer,
    [s * 0.108, altTorso * 0.18, 0.082], 'aba-bolso-' + (s < 0 ? 'esq' : 'dir')));

  /* ---------- pescoço e cabeça ---------- */
  const pescoco = junta('pescoco', torso, [0, altTorso, 0]);
  pecaEm(pescoco, capsula(0.042, 0.085), mat.pele, [0, 0.02, 0], 'pescoco-massa');

  const cabeca = junta('cabeca', pescoco, [0, 0.055, 0]);
  const yc = (Y_QUEIXO + 1) / 2 - Y_QUEIXO - 0.055;   // centro da cabeça, local
  pecaEm(cabeca, esfera(MEIA_CABECA, H_CABECA / 2, MEIA_CABECA * 0.95, 30), mat.pele, [0, yc, 0.004], 'cranio');

  const L = y => y - Y_QUEIXO - 0.055;   // y absoluto -> local da cabeça

  /* cabelo crespo: aglomerado de esferas, não uma casca lisa.
     Uma calota só leria como capacete; o volume irregular é o cabelo. */
  const cabelo = new THREE.Group(); cabelo.name = 'cabelo';
  cabeca.add(cabelo);
  pecaEm(cabelo, esfera(MEIA_CABECA * 1.08, 0.070, MEIA_CABECA * 1.04, 24), mat.cabelo,
    [0, L(Y_CABELO) + 0.030, -0.004], 'cabelo-massa');
  const tufo = esfera(0.036, 0.032, 0.034, 14);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = MEIA_CABECA * (0.62 + 0.30 * Math.abs(Math.sin(i * 2.3)));
    pecaEm(cabelo, tufo, mat.cabelo,
      [Math.cos(a) * r, L(Y_CABELO) + 0.040 + Math.sin(i * 1.7) * 0.016, Math.sin(a) * r * 0.92 - 0.004],
      'tufo-' + i);
  }

  [-1, 1].forEach(s => {
    const lado = s < 0 ? 'esq' : 'dir';
    pecaEm(cabeca, esfera(0.011, 0.024, 0.015), mat.pele,
      [s * MEIA_CABECA * 0.97, L(Y_OLHOS) - 0.012, 0], 'orelha-' + lado);
    pecaEm(cabeca, caixa(0.044, 0.015, 0.014), mat.cabelo,
      [s * 0.034, L(Y_OLHOS) + 0.026, 0.082], 'sobrancelha-' + lado);
    pecaEm(cabeca, esfera(0.013, 0.014, 0.008), mat.olho,
      [s * 0.032, L(Y_OLHOS), 0.078], 'olho-' + lado);
    pecaEm(cabeca, esfera(0.007, 0.0075, 0.004), mat.iris,
      [s * 0.032, L(Y_OLHOS), 0.086], 'iris-' + lado);
    /* óculos: o traço que mais identifica o rosto */
    const aro = new THREE.TorusGeometry(0.036, 0.0090, 8, 4);   // 4 lados = retangular
    const m = pecaEm(cabeca, aro, mat.armacao, [s * 0.034, L(Y_OLHOS), 0.086], 'aro-' + lado);
    m.rotation.z = Math.PI / 4;
    m.scale.set(1.26, 0.94, 1);
    pecaEm(cabeca, caixa(0.008, 0.007, 0.072), mat.armacao,
      [s * 0.078, L(Y_OLHOS) + 0.004, 0.040], 'haste-' + lado);
    pecaEm(cabeca, esfera(0.031, 0.025, 0.002), mat.lente,
      [s * 0.034, L(Y_OLHOS), 0.084], 'lente-' + lado);
  });
  pecaEm(cabeca, caixa(0.024, 0.007, 0.008), mat.armacao, [0, L(Y_OLHOS) + 0.005, 0.089], 'ponte');
  pecaEm(cabeca, esfera(0.015, 0.016, 0.015), mat.pele, [0, L(Y_NARIZ), 0.090], 'nariz');
  pecaEm(cabeca, esfera(0.036, 0.019, 0.014), mat.boca, [0, L(Y_BOCA), 0.078], 'boca');
  pecaEm(cabeca, caixa(0.056, 0.016, 0.010), mat.dentes, [0, L(Y_BOCA) + 0.005, 0.084], 'dentes');

  /* ---------- braços: cadeia com encaixe na palma ---------- */
  const maos = {};
  [-1, 1].forEach(s => {
    const lado = s < 0 ? 'esq' : 'dir';
    const ombro = junta('ombro-' + lado, torso, [s * MEIA_OMBRO, altTorso - 0.012, 0]);
    pecaEm(ombro, esfera(0.040, 0.038, 0.040), mat.blazer, [0, 0, 0], 'ombro-massa-' + lado);

    const braco = junta('braco-' + lado, ombro, [0, 0, 0]);
    pecaEm(braco, capsula(0.031, 0.135), mat.blazer, [s * 0.010, -0.075, 0], 'braco-' + lado);

    const antebraco = junta('antebraco-' + lado, braco, [s * 0.012, -0.148, 0]);
    pecaEm(antebraco, capsula(0.028, 0.125), mat.blazer, [0, -0.062, 0], 'antebraco-' + lado);
    /* dois botões no punho de cada manga */
    for (let b = 0; b < 2; b++) {
      pecaEm(antebraco, esfera(0.005, 0.005, 0.003), mat.armacao,
        [s * 0.026, -0.100 - b * 0.016, 0.006], 'botao-' + lado + b);
    }

    const mao = junta('mao-' + lado, antebraco, [0, -0.128, 0]);
    pecaEm(mao, esfera(0.026, 0.029, 0.020), mat.pele, [0, -0.014, 0.004], 'mao-' + lado);
    /* encaixe do objeto: fica na PALMA, um pouco à frente */
    const soquete = new THREE.Group();
    soquete.name = 'socket-' + lado;
    soquete.position.set(0, -0.020, 0.026);
    mao.add(soquete);
    maos[lado] = soquete;
  });

  /* ---------- pernas ---------- */
  [-1, 1].forEach(s => {
    const lado = s < 0 ? 'esq' : 'dir';
    const coxa = junta('coxa-' + lado, quadril, [s * 0.058, -0.010, 0]);
    pecaEm(coxa, capsula(0.039, Y_QUADRIL - Y_JOELHO), mat.calca,
      [0, -(Y_QUADRIL - Y_JOELHO) / 2, 0], 'coxa-' + lado);

    const canela = junta('canela-' + lado, coxa, [0, -(Y_QUADRIL - Y_JOELHO), 0]);
    pecaEm(canela, capsula(0.033, Y_JOELHO - Y_TORNOZELO), mat.calca,
      [0, -(Y_JOELHO - Y_TORNOZELO) / 2, 0], 'canela-' + lado);

    const pe = junta('pe-' + lado, canela, [0, -(Y_JOELHO - Y_TORNOZELO), 0]);
    pecaEm(pe, esfera(0.041, 0.026, 0.072), mat.tenis, [0, 0.004, 0.026], 'tenis-' + lado);
    pecaEm(pe, esfera(0.043, 0.010, 0.075), mat.sola, [0, -0.018, 0.026], 'sola-' + lado);
    /* cadarços */
    for (let c = 0; c < 4; c++) {
      pecaEm(pe, caixa(0.026, 0.004, 0.005), mat.sola,
        [0, 0.020 - c * 0.002, 0.030 + c * 0.016], 'cadarco-' + lado + c);
    }
  });

  /* ---------- o que o runtime precisa pra animar ---------- */
  const j = n => raiz.getObjectByName(n);
  raiz.userData.sculptRuntime = {
    versao: 1,
    alturaUnitaria: 1,
    juntas: {
      quadril: j('quadril'), torso: j('torso'), pescoco: j('pescoco'), cabeca: j('cabeca'),
      coxaEsq: j('coxa-esq'), coxaDir: j('coxa-dir'),
      canelaEsq: j('canela-esq'), canelaDir: j('canela-dir'),
      peEsq: j('pe-esq'), peDir: j('pe-dir'),
      ombroEsq: j('ombro-esq'), ombroDir: j('ombro-dir'),
      bracoEsq: j('braco-esq'), bracoDir: j('braco-dir'),
      antebracoEsq: j('antebraco-esq'), antebracoDir: j('antebraco-dir'),
      maoEsq: j('mao-esq'), maoDir: j('mao-dir'),
    },
    sockets: { esq: maos.esq, dir: maos.dir },
    materiais: mat,
  };
  return raiz;
}

/* =====================================================================
   ANIMAÇÃO — o ciclo de caminhada é senoide nas juntas, não captura

   A referência é uma pose parada: não existe quadro de caminhada nela.
   Então a passada é autoral. O que a faz ler como andar e não como
   bambolear: coxa e canela em CONTRAFASE (o joelho dobra quando a perna
   volta, não quando avança), o braço oposto à perna, e o quadril subindo
   duas vezes por ciclo — o corpo sobe a cada passo, não a cada volta.
   ===================================================================== */
export function andar(rt, t, forca) {
  const f = forca === undefined ? 1 : forca;
  const j = rt.juntas;
  const p = t * 6.2;                       // ~1 passada por segundo
  const sw = Math.sin(p) * 0.62 * f;
  const sw2 = Math.sin(p + Math.PI) * 0.62 * f;

  j.coxaEsq.rotation.x = sw;
  j.coxaDir.rotation.x = sw2;
  /* joelho só dobra pra trás, e no retorno da perna */
  j.canelaEsq.rotation.x = -Math.max(0, Math.sin(p - 0.9)) * 0.95 * f;
  j.canelaDir.rotation.x = -Math.max(0, Math.sin(p - 0.9 + Math.PI)) * 0.95 * f;
  j.peEsq.rotation.x = Math.sin(p + 0.6) * 0.28 * f;
  j.peDir.rotation.x = Math.sin(p + 0.6 + Math.PI) * 0.28 * f;

  j.ombroEsq.rotation.x = sw2 * 0.55;      // braço oposto à perna
  j.ombroDir.rotation.x = sw * 0.55;
  j.antebracoEsq.rotation.x = -0.35 - Math.max(0, sw2) * 0.3;
  j.antebracoDir.rotation.x = -0.35 - Math.max(0, sw) * 0.3;

  /* o corpo sobe DUAS vezes por ciclo: uma por passo */
  j.quadril.position.y = 0.435 + Math.abs(Math.sin(p)) * 0.014 * f;
  j.quadril.rotation.z = Math.sin(p) * 0.035 * f;
  j.torso.rotation.y = Math.sin(p) * 0.09 * f;
  j.cabeca.rotation.y = -Math.sin(p) * 0.05 * f;
}

/* parado: respiro e um balanço mínimo, pra não virar estátua */
export function parado(rt, t) {
  const j = rt.juntas;
  const r = Math.sin(t * 1.5);
  j.coxaEsq.rotation.x = j.coxaDir.rotation.x = 0;
  j.canelaEsq.rotation.x = j.canelaDir.rotation.x = 0;
  j.peEsq.rotation.x = j.peDir.rotation.x = 0;
  j.quadril.position.y = 0.435 + r * 0.004;
  j.quadril.rotation.z = 0;
  j.torso.rotation.y = Math.sin(t * 0.7) * 0.05;
  j.cabeca.rotation.y = Math.sin(t * 0.55) * 0.10;
  j.cabeca.rotation.x = r * 0.03;
  j.ombroEsq.rotation.x = j.ombroDir.rotation.x = 0.06 + r * 0.02;
  j.antebracoEsq.rotation.x = j.antebracoDir.rotation.x = -0.25;
}

/* oferecer: os dois antebraços sobem e as palmas viram pra cima */
export function oferecer(rt, k) {
  const j = rt.juntas;
  j.ombroEsq.rotation.x = -0.55 * k;
  j.ombroDir.rotation.x = -0.55 * k;
  j.ombroEsq.rotation.z = 0.30 * k;
  j.ombroDir.rotation.z = -0.30 * k;
  j.antebracoEsq.rotation.x = -1.15 * k;
  j.antebracoDir.rotation.x = -1.15 * k;
  j.maoEsq.rotation.x = 0.5 * k;
  j.maoDir.rotation.x = 0.5 * k;
}
