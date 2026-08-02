/* =====================================================================
   createDevLaptopIconModel — laptop 3D procedural (ícone da intro)

   Origem: pipeline img2threejs (spec validado em laptop3d/spec.json,
   blockout aprovado em review). Passes finais (grade de teclas em grid,
   tela emissiva com código, arestas neon, iluminação) terminados à mão
   porque o scaffold do gerador só suporta repetição radial, não grid.

   Hierarquia runtime (contrato do spec):
     root (Group)
     ├─ base-slab + keyboard-well + keyGrid (InstancedMesh 14x6) + trackpad
     └─ lid-pivot (hinge, rotation.x abre/fecha)
        ├─ lid-slab
        ├─ screen-panel (CanvasTexture com código rolando)
        └─ webcam-dot
   root.userData.tick(t) — flutuação + flicker da tela
   root.userData.lidPivot — canal de animação da tampa
   ===================================================================== */

import * as THREE from 'three';

const LIME = '#c6ff3d';

/* tela de código: canvas redesenhado a cada tick (mesma técnica do olho da intro) */
function makeCodeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const TOKENS = ['const', 'dev', '=>', 'if(', '{ }', 'let', 'return', '</>', 'fn()', '===', '.map', 'async'];
  const lines = Array.from({ length: 9 }, () =>
    Array.from({ length: 3 }, () => TOKENS[(Math.random() * TOKENS.length) | 0]).join(' '));
  let scroll = 0;
  tex.userData.draw = () => {
    g.fillStyle = '#06110a';
    g.fillRect(0, 0, 256, 160);
    g.font = '14px monospace';
    scroll += 0.4;
    for (let i = 0; i < lines.length; i++) {
      const y = ((i * 19 - scroll) % 175 + 175) % 175 - 8;
      g.fillStyle = i % 3 === 0 ? 'rgba(79,224,255,0.9)' : 'rgba(198,255,61,0.9)';
      g.fillText(lines[i], 10, y);
    }
    tex.needsUpdate = true;
  };
  tex.userData.draw();
  return tex;
}

/* contorno neon: EdgesGeometry por cima do sólido */
function limeEdges(geometry, opacity = 0.9) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity })
  );
}

export function createDevLaptopIconModel() {
  const root = new THREE.Group();
  root.name = 'Dev Laptop Icon';

  /* materiais do spec (PBR ancorado na extração da referência: satin metal) */
  const graphite = new THREE.MeshStandardMaterial({
    color: '#46507a', metalness: 0.35, roughness: 0.4,
    emissive: '#46507a', emissiveIntensity: 0.12,
  });
  const keyPlastic = new THREE.MeshStandardMaterial({
    color: '#1b2033', metalness: 0.0, roughness: 0.85,
  });
  const codeTex = makeCodeTexture();
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#000000', emissive: '#ffffff', emissiveMap: codeTex,
    emissiveIntensity: 1.5, roughness: 0.15, metalness: 0,
  });

  /* ---- base ---- */
  const baseGeo = new THREE.BoxGeometry(1.0, 0.045, 0.68);
  const base = new THREE.Mesh(baseGeo, graphite);
  base.name = 'base-slab';
  base.position.set(0, 0.0225, 0);
  base.add(limeEdges(baseGeo));
  root.add(base);

  const well = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.008, 0.40), keyPlastic);
  well.name = 'keyboard-well';
  well.position.set(0, 0.049, -0.06);
  root.add(well);

  /* grade de teclas 14x6 — um único draw call */
  const COLS = 14, ROWS = 6;
  const keyGeo = new THREE.BoxGeometry(0.05, 0.008, 0.05);
  const keys = new THREE.InstancedMesh(keyGeo, keyPlastic, COLS * ROWS);
  keys.name = 'keyGrid';
  const m4 = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const x = (col - (COLS - 1) / 2) * 0.058;
      const z = -0.06 + (r - (ROWS - 1) / 2) * 0.058;
      m4.setPosition(x, 0.057, z);
      keys.setMatrixAt(i++, m4);
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  root.add(keys);

  const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.006, 0.22), graphite);
  trackpad.name = 'trackpad';
  trackpad.position.set(0, 0.048, 0.21);
  root.add(trackpad);

  /* ---- tampa no hinge ---- */
  const lidPivot = new THREE.Group();
  lidPivot.name = 'lid-pivot';
  lidPivot.position.set(0, 0.045, -0.34);
  lidPivot.rotation.x = 0.35;               // ~110° aberto (0 = tampa vertical)
  root.add(lidPivot);

  const lidGeo = new THREE.BoxGeometry(1.0, 0.62, 0.028);
  const lid = new THREE.Mesh(lidGeo, graphite);
  lid.name = 'lid-slab';
  lid.position.set(0, 0.31, 0);
  lid.add(limeEdges(lidGeo));
  lidPivot.add(lid);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.56), screenMat);
  screen.name = 'screen-panel';
  screen.position.set(0, 0.31, 0.0155);
  lidPivot.add(screen);

  const webcam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 12), keyPlastic);
  webcam.name = 'webcam-dot';
  webcam.rotation.x = Math.PI / 2;
  webcam.position.set(0, 0.585, 0.017);
  lidPivot.add(webcam);

  /* ---- contrato de runtime ---- */
  root.userData.lidPivot = lidPivot;
  root.userData.tick = (t) => {
    root.position.y = Math.sin(t * 1.4) * 0.02;               // flutuação sutil
    screenMat.emissiveIntensity = 1.35 + Math.sin(t * 9) * 0.15; // flicker da tela
    codeTex.userData.draw();
  };
  return root;
}
