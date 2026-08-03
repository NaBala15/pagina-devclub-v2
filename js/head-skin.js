/* =====================================================================
   PELE DE PEDRA SOB LUZ NEON

   A cor não vem de um degradê pintado nos vértices: vem das LUZES.
   É assim que a referência funciona — uma escultura de pedra sob
   holofotes magenta, ciano, violeta e âmbar. A pedra só devolve o que
   recebe, então o tom da pele muda conforme a cabeça gira.

   Superfície lisa e polida: sem trincas, sem craquelê.
   ===================================================================== */

import * as THREE from 'three';

/* ---------------------------------------------------------------------
   MATERIAL — pedra polida. A cor virá das luzes.
   --------------------------------------------------------------------- */
export function peleDePedra() {
  return new THREE.MeshStandardMaterial({
    /* pedra de tom médio, não mármore branco: com branco a luz satura e a
       cena vira pastel — a cor precisa nascer dos holofotes, não da pedra */
    color: '#8f8697',
    roughness: 0.36,
    metalness: 0.30,            // um verniz: é o que faz o neon escorregar na superfície
    transparent: true,
    opacity: 0,
  });
}

/* ---------------------------------------------------------------------
   HOLOFOTES NEON — luzes de ponto, que caem com a distância e por isso
   pintam a cabeça sem lavar os ícones que orbitam mais longe.

   Intensidades calibradas olhando o resultado: as primeiras (26/20/14/11)
   saturavam a pedra e a cabeça virava algodão-doce pastel.
   --------------------------------------------------------------------- */
export function luzesNeon() {
  const grupo = new THREE.Group();

  const magenta = new THREE.PointLight('#ff2f9c', 5.8, 6, 2);
  magenta.position.set(-1.15, 0.75, 1.25);

  const ciano = new THREE.PointLight('#2fd8ff', 4.4, 6, 2);
  ciano.position.set(1.35, 0.1, 0.75);

  const violeta = new THREE.PointLight('#8b5cff', 3.1, 6, 2);
  violeta.position.set(0.2, 1.35, -0.55);

  /* âmbar por baixo: é o que aquece o queixo, como na referência */
  const ambar = new THREE.PointLight('#ff8a2b', 2.4, 5, 2);
  ambar.position.set(-0.35, -0.95, 0.7);

  grupo.add(magenta, ciano, violeta, ambar);
  grupo.userData.luzes = { magenta, ciano, violeta, ambar };
  return grupo;
}
