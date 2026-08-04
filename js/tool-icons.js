/* =====================================================================
   ÍCONES DAS FERRAMENTAS — o que orbita a mente de um dev

   Trocam os símbolos genéricos por aquilo que esta página realmente usa:
   HTML5, CSS3, JavaScript, o terminal e o próprio Three.js — que aqui é
   desenhado pela biblioteca que ele representa.

   Os contornos dos logos vêm embutidos como caminho SVG, e não de
   arquivo: assim não há requisição de rede nem espera assíncrona no meio
   da montagem da cena. Cada um é extrudado com bisel, para manter o
   acabamento gordinho dos ícones antigos.
   ===================================================================== */

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

/* mesma "argila" dos ícones de ideia: fosca, com um respiro de brilho */
function argila(cor, { rough = 0.36, glow = 0.16, metal = 0 } = {}) {
  return new THREE.MeshStandardMaterial({
    color: cor, roughness: rough, metalness: metal,
    emissive: cor, emissiveIntensity: glow,
  });
}

/* ---------------------------------------------------------------------
   Extruda um caminho SVG (24x24, como os do Simple Icons) num sólido
   com bisel, centrado na origem e normalizado pra caber na órbita.
   --------------------------------------------------------------------- */
function extrudarLogo(caminhoD, material, { alturaAlvo = 0.3, profundidade = 2.6 } = {}) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
              '<path d="' + caminhoD + '"/></svg>';
  const dados = new SVGLoader().parse(svg);

  const formas = [];
  dados.paths.forEach(p => SVGLoader.createShapes(p).forEach(f => formas.push(f)));

  const geo = new THREE.ExtrudeGeometry(formas, {
    depth: profundidade,
    bevelEnabled: true,
    bevelThickness: 0.55,
    bevelSize: 0.42,
    bevelSegments: 3,
    curveSegments: 10,
  });

  /* o eixo Y do SVG cresce pra baixo: inverte pra não sair de cabeça pra baixo */
  geo.scale(1, -1, 1);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const tam = bb.max.clone().sub(bb.min);
  geo.center();
  geo.scale(alturaAlvo / tam.y, alturaAlvo / tam.y, alturaAlvo / tam.y);
  geo.computeVertexNormals();

  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, material));
  /* logo chapado: quem for animar deve balançá-lo de frente, não girar */
  g.userData.plano = true;
  return g;
}

/* --------------------------- os três da web --------------------------- */
const D_HTML5 = 'M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z';
const D_CSS3 = 'M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z';
const D_JS = 'M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z';

export function createHtml5Icon() {
  return extrudarLogo(D_HTML5, argila('#e34f26'), { alturaAlvo: 0.31 });
}
export function createCssIcon() {
  return extrudarLogo(D_CSS3, argila('#1572b6'), { alturaAlvo: 0.31 });
}
export function createJsIcon() {
  /* o amarelo do JS é claro demais pra emitir luz: baixa o brilho próprio */
  return extrudarLogo(D_JS, argila('#f7df1e', { glow: 0.08 }), { alturaAlvo: 0.28 });
}

/* --------------------------- terminal >_ --------------------------- */
export function createTerminalIcon() {
  const g = new THREE.Group();

  /* a janelinha: caixa escura com a barra de título por cima */
  const corpo = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.25, 0.055),
    argila('#12141f', { rough: 0.5, glow: 0.02 })
  );
  g.add(corpo);

  const barra = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.062, 0.058),
    argila('#2a2f45', { rough: 0.5, glow: 0.03 })
  );
  barra.position.y = 0.094;
  g.add(barra);

  /* os três pontinhos da janela */
  const cores = ['#ff5f57', '#febc2e', '#28c840'];
  cores.forEach((c, i) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), argila(c, { glow: 0.3 }));
    p.position.set(-0.13 + i * 0.032, 0.094, 0.032);
    g.add(p);
  });

  /* o prompt: o mesmo >_ que abre o nome da marca */
  const lime = argila('#c6ff3d', { glow: 0.55 });
  const braco = (rot, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.026, 0.026), lime);
    m.position.set(-0.075, y, 0.032);
    m.rotation.z = rot;
    return m;
  };
  /* o vértice do ">" aponta pra DIREITA: o braço de cima desce e o de
     baixo sobe. Invertido, vira "<" — e a marca é >DevClub. */
  g.add(braco(-0.72, 0.018), braco(0.72, -0.032));

  const sub = new THREE.Mesh(new THREE.BoxGeometry(0.097, 0.025, 0.026), lime);
  sub.position.set(0.055, -0.05, 0.032);
  g.add(sub);

  g.userData.plano = true;    // é uma janela: só faz sentido vista de frente
  return g;
}

/* --------------------------- three.js --------------------------- */
export function createThreeIcon() {
  const g = new THREE.Group();

  /* um sólido geométrico lê "3D" na hora — mais que a marca da
     biblioteca, que quase ninguém reconhece fora do meio */
  const geo = new THREE.OctahedronGeometry(0.17, 0);
  const solido = new THREE.Mesh(
    geo,
    argila('#f2f4f8', { rough: 0.28, glow: 0.12, metal: 0.35 })
  );
  g.add(solido);

  /* as arestas acesas: é o vocabulário do wireframe */
  const arestas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: '#35d6e8' })
  );
  arestas.scale.setScalar(1.02);
  g.add(arestas);

  /* os vértices marcados, como pontos de controle */
  const pos = geo.attributes.position;
  const vistos = new Set();
  for (let i = 0; i < pos.count; i++) {
    const chave = [pos.getX(i), pos.getY(i), pos.getZ(i)].map(v => v.toFixed(2)).join();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const v = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 6),
      argila('#8b6cff', { glow: 0.5 })
    );
    v.position.set(pos.getX(i) * 1.02, pos.getY(i) * 1.02, pos.getZ(i) * 1.02);
    g.add(v);
  }

  return g;
}
