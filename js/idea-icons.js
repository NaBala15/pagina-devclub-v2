/* =====================================================================
   A IDEIA — estilo "Flaticon 3D": formas gordinhas, cores vivas e
   sombreamento suave (nada de wireframe).

   Sobrou uma só: a lâmpada. As outras ferramentas que orbitam a cabeça
   vivem em js/tool-icons.js — esta aqui é o contraponto delas, o único
   símbolo de ideia numa cena chamada "dentro da mente".

   O ícone pode expor userData.tick(t) para animação própria.
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
  /* pulsa como quem tem uma ideia se acendendo */
  g.userData.tick = (t) => {
    glass.material.emissiveIntensity = 0.55 + Math.sin(t * 4) * 0.15;
  };
  return g;
}
