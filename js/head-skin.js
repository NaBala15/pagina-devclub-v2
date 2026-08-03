/* =====================================================================
   PELE DE PEDRA SOB LUZ NEON

   A cor não vem mais do degradê pintado nos vértices: vem das LUZES.
   É assim que a referência funciona — uma escultura clara, quase branca,
   sob holofotes magenta, ciano e âmbar. A pedra só devolve o que recebe.

   Sobre ela, um craquelê: as microfissuras de um esmalte antigo. Elas
   entram como relevo (sulcos), como brilho (o fundo do sulco é mais liso
   e "molhado") e como um fiozinho de luz quente, bem fraco.
   ===================================================================== */

import * as THREE from 'three';

/* ---------------------------------------------------------------------
   CRAQUELÊ — gerado em código, sem arquivo de imagem
   Cada fissura nasce num ponto e caminha, virando de leve a cada passo e
   às vezes se dividindo. É o mesmo jeito que uma trinca se propaga.
   --------------------------------------------------------------------- */
function desenhaFissuras(g, L, semente) {
  let s = semente;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };

  const caminhar = (x, y, ang, vida, grossura) => {
    g.lineWidth = grossura;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < vida; i++) {
      ang += (rnd() - 0.5) * 0.85;             // vira de leve
      x += Math.cos(ang) * 7;
      y += Math.sin(ang) * 7;
      g.lineTo(x, y);
      /* de vez em quando a trinca se parte em duas */
      if (rnd() < 0.045 && grossura > 0.7 && vida > 8) {
        caminhar(x, y, ang + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd()), (vida * 0.55) | 0, grossura * 0.7);
        g.beginPath();
        g.moveTo(x, y);
      }
    }
    g.stroke();
  };

  for (let i = 0; i < 150; i++) {
    caminhar(rnd() * L, rnd() * L, rnd() * Math.PI * 2, 14 + (rnd() * 26) | 0, 0.8 + rnd() * 1.5);
  }
}

/* devolve as duas versões: fundo claro com fissuras escuras (relevo) e a
   inversa (para o brilho quente que escapa de dentro delas) */
export function craqueleTexturas() {
  const L = 1024;

  const alto = document.createElement('canvas');
  alto.width = alto.height = L;
  const ga = alto.getContext('2d');
  ga.fillStyle = '#ffffff';
  ga.fillRect(0, 0, L, L);
  ga.strokeStyle = 'rgba(30,30,30,.85)';
  ga.lineCap = 'round';
  desenhaFissuras(ga, L, 20090312);

  /* poros: leva a superfície pra longe do plástico */
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * L, y = Math.random() * L;
    ga.fillStyle = 'rgba(0,0,0,' + (0.02 + Math.random() * 0.05) + ')';
    ga.fillRect(x, y, 1.4, 1.4);
  }

  const baixo = document.createElement('canvas');
  baixo.width = baixo.height = L;
  const gb = baixo.getContext('2d');
  gb.fillStyle = '#000000';
  gb.fillRect(0, 0, L, L);
  gb.strokeStyle = 'rgba(255,255,255,.9)';
  gb.lineCap = 'round';
  desenhaFissuras(gb, L, 20090312);          // mesma semente: casam pixel a pixel

  const rel = new THREE.CanvasTexture(alto);
  const bri = new THREE.CanvasTexture(baixo);
  [rel, bri].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.8, 2.8);
    t.anisotropy = 4;
  });
  return { relevo: rel, brilho: bri };
}

/* ---------------------------------------------------------------------
   MATERIAL — pedra clara. A cor virá das luzes.
   --------------------------------------------------------------------- */
export function peleDePedra() {
  const { relevo, brilho } = craqueleTexturas();
  return new THREE.MeshStandardMaterial({
    /* pedra de tom médio, não mármore branco: com branco a luz satura e a
       cena vira pastel — a cor precisa nascer dos holofotes, não da pedra */
    color: '#8f8697',
    roughness: 0.36,
    metalness: 0.30,            // um verniz: é o que faz o neon escorregar na superfície
    bumpMap: relevo,
    bumpScale: 2.0,             // calibrado na tela: visível sem virar textura de réptil
    roughnessMap: relevo,       // fundo da fissura mais liso: fica "molhado"
    emissive: '#ff7a2f',        // âmbar dentro das trincas
    emissiveMap: brilho,
    emissiveIntensity: 0.16,    // discreto, como pedido
    transparent: true,
    opacity: 0,
  });
}

/* ---------------------------------------------------------------------
   HOLOFOTES NEON — luzes de ponto, que caem com a distância e por isso
   pintam a cabeça sem lavar os ícones que orbitam mais longe.
   --------------------------------------------------------------------- */
/* Intensidades calibradas olhando o resultado: as primeiras (26/20/14/11)
   saturavam a pedra e a cabeça virava algodão-doce pastel. */
export function luzesNeon() {
  const grupo = new THREE.Group();

  const magenta = new THREE.PointLight('#ff2f9c', 5.8, 6, 2);
  magenta.position.set(-1.15, 0.75, 1.25);

  const ciano = new THREE.PointLight('#2fd8ff', 4.4, 6, 2);
  ciano.position.set(1.35, 0.1, 0.75);

  const violeta = new THREE.PointLight('#8b5cff', 3.1, 6, 2);
  violeta.position.set(0.2, 1.35, -0.55);

  /* âmbar por baixo: é o que acende as trincas e o queixo na referência */
  const ambar = new THREE.PointLight('#ff8a2b', 2.4, 5, 2);
  ambar.position.set(-0.35, -0.95, 0.7);

  grupo.add(magenta, ciano, violeta, ambar);
  grupo.userData.luzes = { magenta, ciano, violeta, ambar };
  return grupo;
}
