/* =====================================================================
   ÍCONES 3D DAS IDEIAS — estilo "Flaticon 3D": formas gordinhas,
   cores vivas e sombreamento suave (nada de wireframe).
   Paleta: azul, amarelo, laranja, violeta, branco — com toques lime.
   Cada ícone pode expor userData.tick(t) para animação própria.
   ===================================================================== */

import * as THREE from 'three';

/* material "massinha": cor viva, superfície suave, leve auto-brilho
   pra não sumir contra o fundo escuro */
function clay(color, { rough = 0.38, glow = 0.18, metal = 0 } = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal,
    emissive: color, emissiveIntensity: glow,
  });
}

/* GLOBO: bola azul + meridianos/paralelos claros + continentes lime */
export function createGlobeIcon() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.155, 28, 20), clay('#3b82f6'));
  g.add(ball);

  const ringMat = clay('#dce9ff', { glow: 0.25 });
  const mer = new THREE.Mesh(new THREE.TorusGeometry(0.157, 0.011, 8, 48), ringMat);
  const eq = new THREE.Mesh(new THREE.TorusGeometry(0.157, 0.011, 8, 48), ringMat);
  eq.rotation.x = Math.PI / 2;
  g.add(mer, eq);

  /* "continentes": calotas achatadas lime espalhadas */
  const landMat = clay('#7ed957', { glow: 0.12 });
  [[0.5, 0.5], [-0.6, 0.2], [0.1, -0.55], [-0.3, 0.75], [0.75, -0.15]].forEach(([u, v]) => {
    const land = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), landMat);
    const dir = new THREE.Vector3(u, v, 1 - Math.abs(u) * 0.5).normalize();
    land.position.copy(dir).multiplyScalar(0.135);
    land.scale.set(1, 1, 0.35);
    land.lookAt(dir.clone().multiplyScalar(2));
    g.add(land);
  });
  return g;
}

/* LÂMPADA: vidro amarelo brilhante + rosca metálica com gomos */
export function createBulbIcon() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 24, 18),
    clay('#ffd43b', { glow: 0.55, rough: 0.25 })
  );
  glass.position.y = 0.065;
  glass.scale.y = 1.08;

  /* pescoço afunilando pro soquete */
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.062, 0.05, 16),
    clay('#ffd43b', { glow: 0.35, rough: 0.3 })
  );
  neck.position.y = -0.055;

  const metalMat = clay('#cfd6e0', { rough: 0.3, metal: 0.7, glow: 0.06 });
  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.026, 16), metalMat);
  s1.position.y = -0.095;
  const s2 = s1.clone(); s2.position.y = -0.128; s2.scale.setScalar(0.94);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), clay('#9aa4b5', { metal: 0.6, glow: 0.05 }));
  tip.position.y = -0.155;

  g.add(glass, neck, s1, s2, tip);
  g.userData.tick = (t) => {
    glass.material.emissiveIntensity = 0.55 + Math.sin(t * 4) * 0.15;
  };
  return g;
}

/* ENGRENAGEM: laranja, gordinha, dentes arredondados (extrusão com bevel) */
export function createGearIcon() {
  const TEETH = 9, R = 0.16, r = 0.12;
  const shape = new THREE.Shape();
  const steps = TEETH * 4;
  for (let i = 0; i <= steps; i++) {
    const seg = i % 4;
    const rad = seg < 2 ? R : r;
    const a = (i / steps) * Math.PI * 2;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.055, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 3,
  });
  geo.translate(0, 0, -0.03);
  const gear = new THREE.Mesh(geo, clay('#ff9f43'));
  const g = new THREE.Group();
  g.add(gear);
  g.userData.tick = (t) => { gear.rotation.z = t * 0.9; };
  return g;
}

/* "?": tubo violeta gordinho + ponto */
export function createQuestionIcon() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.085, 0.075, 0),
    new THREE.Vector3(-0.05, 0.155, 0),
    new THREE.Vector3(0.03, 0.18, 0),
    new THREE.Vector3(0.09, 0.10, 0),
    new THREE.Vector3(0.058, 0.012, 0),
    new THREE.Vector3(0.0, -0.025, 0),
    new THREE.Vector3(0.0, -0.08, 0),
  ]);
  const mat = clay('#8b6cff');
  const hook = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.034, 12), mat);
  /* pontas arredondadas */
  const cap1 = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), mat);
  cap1.position.copy(curve.getPoint(0));
  const cap2 = cap1.clone();
  cap2.position.copy(curve.getPoint(1));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), mat);
  dot.position.y = -0.165;
  const g = new THREE.Group();
  g.add(hook, cap1, cap2, dot);
  return g;
}

/* ENVELOPE: corpo branco-creme + aba azul em "V" (nas duas faces) */
export function createEnvelopeIcon() {
  const g = new THREE.Group();
  const W = 0.34, H = 0.235, D = 0.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), clay('#f2f4f8', { glow: 0.1 }));
  g.add(body);

  const flapMat = clay('#4a7dff', { glow: 0.2 });
  const flapLen = Math.hypot(W / 2, H * 0.56);
  for (const side of [1, -1]) {
    for (const dir of [1, -1]) {
      const flap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, flapLen, 10), flapMat);
      const from = new THREE.Vector3(dir * (-W / 2 + 0.01), H / 2 - 0.008, side * (D / 2 + 0.008));
      const to = new THREE.Vector3(0, -0.02, side * (D / 2 + 0.008));
      const mid = from.clone().lerp(to, 0.5);
      flap.position.copy(mid);
      flap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
        to.clone().sub(from).normalize());
      g.add(flap);
    }
  }
  return g;
}
