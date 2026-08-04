/* =====================================================================
   PEÇAS COMPARTILHADAS DA CABEÇA

   Usadas pela intro (js/intro-head.js) e pelo cérebro do hero
   (js/hero-cerebro.js, que consome o dotTexture). Ficam aqui, e não dentro
   da intro, porque um módulo com efeito colateral no topo (a intro carrega
   o .glb assim que é avaliada) não pode ser importado por outro sem rodar
   de novo.

   O apelido "head-shared" vem do importmap do index.html — é lá que mora
   o ?v= de cache, num lugar só.
   ===================================================================== */

import * as THREE from 'three';

/* Degradê da cabeça: topo ciano → rosto azul → pescoço roxo/magenta */
const GRAD_STOPS = [
  { t: 0.0, c: new THREE.Color('#b44fd9') },   // base do pescoço: magenta-roxo
  { t: 0.35, c: new THREE.Color('#7a4be0') },  // queixo: violeta
  { t: 0.7, c: new THREE.Color('#3b57e6') },   // rosto: azul
  { t: 1.0, c: new THREE.Color('#35d6e8') },   // topo do crânio: ciano
];

export function gradientColor(t, out) {
  for (let i = 1; i < GRAD_STOPS.length; i++) {
    if (t <= GRAD_STOPS[i].t) {
      const a = GRAD_STOPS[i - 1], b = GRAD_STOPS[i];
      return out.copy(a.c).lerp(b.c, (t - a.t) / (b.t - a.t));
    }
  }
  return out.copy(GRAD_STOPS[GRAD_STOPS.length - 1].c);
}

/* ponto redondo com halo — sprite de cada partícula */
export function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* O scan facecap tem o interior da boca (arcada dentária) modelado dentro
   do crânio. Remove os triângulos totalmente dentro dessa região — caixa
   em coordenadas de mundo do modelo, atrás dos lábios, sem tocar o rosto. */
export function removeMouthInterior(geo, wide = false) {
  const p = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return;
  /* wide=false: só a arcada (caixa mínima — segura pro SÓLIDO, não toca lábios)
     wide=true: boca interna completa (pras PARTÍCULAS, remove o aglomerado
     denso de superfícies dobradas; nicks minúsculos são invisíveis em pontos) */
  const inside = wide
    ? (i) => {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        return Math.abs(x) < 0.34 && y > -0.54 && y < -0.22 && z > 0.05 && z < 0.66;
      }
    : (i) => {
        /* sólido: profundidade do corte varia com |x| — fundo no centro
           (alcança os dentes frontais), raso nos cantos (poupa os lábios) */
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const ax = Math.abs(x);
        if (ax >= 0.30 || y <= -0.50 || y >= -0.26 || z <= 0.08) return false;
        const zMax = 0.66 - (ax / 0.30) * 0.18;
        return z < zMax;
      };
  const keep = [];
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
    if (inside(a) && inside(b) && inside(c)) continue;
    keep.push(a, b, c);
  }
  geo.setIndex(keep);
}
