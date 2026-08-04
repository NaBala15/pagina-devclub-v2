/* =====================================================================
   GEOMETRIA DO CÉREBRO — gerada por código, sem modelo 3D

   Um cérebro anatômico de banco de modelos pesa alguns MB e vem com
   licença atrelada. Em densidade de partículas nada disso aparece: o que
   o olho lê é a silhueta, a fissura que separa os hemisférios e o
   desenho dos giros. Isso dá pra escrever — e custa 0 KB de asset.

   As proporções seguem a referência clássica de "raio-X" que o usuário
   mandou (perfil azul de vidro, H/W ~0.70): lobo frontal arredondado,
   fissura de Sylvius subindo em diagonal pra trás, lobo temporal como um
   polegar embaixo dela, occipital redondo, cerebelo de estrias finas
   ENCAIXADO embaixo e atrás, e o tronco descendo inclinado pra trás.

   A superfície é um elipsoide com o raio modulado por:
     . os GIROS, cristas ALONGADAS de ruído com o domínio esticado no
       eixo frente-fundo (ruído isotrópico vira coral, não circunvolução);
     . a FISSURA LONGITUDINAL, o sulco fundo que separa os hemisférios;
     . a FISSURA LATERAL (de Sylvius), que destaca o lobo temporal.
   O cerebelo e o tronco entram como peças separadas, porque não são
   deformação do mesmo corpo — são outros corpos encostados nele.
   ===================================================================== */

/* eixos: X = frente/trás (+x é a FRENTE), Y = cima/baixo, Z = lado a lado.
   RY é maior que a proporção final (~0.70 de H/W medido na referência)
   porque as fissuras e o achatamento da base comem altura — 0.78 aqui é
   o que devolve ~0.70 na silhueta renderizada, conferido por medição. */
const RX = 1.00, RY = 0.78, RZ = 0.72;

/* ---------- ruído de valor 3D ----------
   Não dá pra fazer giros convincentes com senoides puras: elas se repetem
   e o olho pega o padrão. Ruído com interpolação suave quebra isso.
   Hash inteiro em vez de Math.random: o mesmo ponto devolve sempre o
   mesmo valor, que é o que faz dele um campo e não barulho. */
function embaralhar(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const suavizar = t => t * t * (3 - 2 * t);

function ruido(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = suavizar(xf), v = suavizar(yf), w = suavizar(zf);
  const c = (i, j, k) => embaralhar(xi + i, yi + j, zi + k);
  const x00 = c(0,0,0) + (c(1,0,0) - c(0,0,0)) * u;
  const x10 = c(0,1,0) + (c(1,1,0) - c(0,1,0)) * u;
  const x01 = c(0,0,1) + (c(1,0,1) - c(0,0,1)) * u;
  const x11 = c(0,1,1) + (c(1,1,1) - c(0,1,1)) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/* Giros: oitavas de ruído viram o argumento de um seno, e 1-|sen|
   transforma as cristas em VALES ESTREITOS — no cérebro real a massa é
   contínua e os sulcos é que são finos.

   Frequência baixa e domínio ESTICADO no eixo x: na referência os giros
   são bandas LARGAS e sinuosas correndo no sentido do comprimento. Dobra
   fina em nuvem de pontos não lê como dobra, lê como chuvisco. */
function trama(x, y, z) {
  const n1 = ruido(x * 0.62, y * 2.30, z * 2.30);
  const n2 = ruido(x * 1.35 + 31.7, y * 4.70, z * 4.70);
  const n3 = ruido(x * 2.90 + 7.1, y * 2.90, z * 2.90);
  return Math.sin((n1 * 2.75 + n2 * 0.62 + n3 * 0.42) * Math.PI * 2.5);
}
function giros(x, y, z) {
  return (1 - Math.abs(trama(x, y, z))) * 0.125;
}

/* Peso de amostragem: perto de 0 no fundo do sulco, 1 na crista do giro.
   Deslocar o raio sozinho não bastava — o sulco só aparece de verdade
   quando também FALTA partícula nele. Quem amostra usa isto por rejeição.
   Piso baixo e expoente alto = sulco realmente vazio, giro realmente
   cheio: é daí que vem a definição. */
export function pesoGiro(x, y, z) {
  const t = Math.abs(trama(x, y, z));
  return 0.06 + 0.94 * Math.pow(1 - t, 1.25);
}

/* Quão perto da CRISTA do giro o ponto está (0..1). Vira brilho por
   partícula: na referência as cristas brilham como linhas de vidro. */
export function nivelCrista(x, y, z) {
  return Math.pow(1 - Math.abs(trama(x, y, z)), 1.5);
}

/* raio relativo da superfície na direção (ux,uy,uz), já normalizada */
export function raio(ux, uy, uz) {
  let r = 1;

  r += giros(ux, uy, uz);

  /* fissura longitudinal: fenda no plano z=0, só na metade de cima —
     embaixo os hemisférios se juntam no corpo caloso */
  const meio = Math.exp(-(uz * 5.4) * (uz * 5.4));
  const emCima = Math.max(0, uy + 0.15);
  r -= 0.150 * meio * emCima;

  /* FISSURA LATERAL (de Sylvius) — a mais importante pra silhueta. Na
     referência ela sobe em diagonal da frente-baixo pro meio-fundo, e é
     ela que separa o lobo temporal (o "polegar") do resto.

     Dois cuidados aprendidos a ferro:
     . num objeto convexo visto de lado o CONTORNO nasce na linha média
       (uz≈0), não na face lateral — daí o piso de 0.5 no forcaLado;
     . sem a JANELA em x a fissura dava a volta e abria um segundo
       entalhe na nuca. Cérebro tem um entalhe só, na frente. */
  const forcaLado = 0.5 + 0.5 * Math.min(1, Math.abs(uz) * 1.7);
  const janela = Math.max(0, Math.min(1, (ux + 0.50) / 0.80))
               * Math.max(0, Math.min(1, (0.88 - ux) / 0.38));
  const curva = uy + 0.215 - 0.30 * ux;      // a diagonal da referência
  r -= 0.340 * Math.exp(-(curva * 6.0) * (curva * 6.0)) * forcaLado * janela;

  /* polo temporal: o "polegar" cheio abaixo da fissura, à frente */
  const dt = (uy + 0.46) * 2.9;
  const temporal = Math.exp(-dt * dt) * Math.max(0, 0.28 + ux * 0.85);
  r += 0.300 * temporal;

  /* na referência frontal e occipital são ambos cheios; só um leve
     estreitamento pra frente pra não virar um oval simétrico */
  r *= 1 - 0.040 * ux - 0.035 * ux * ux;

  /* achata a base só no miolo — nas laterais o temporal continua descendo */
  const noMeio = 1 - Math.min(1, Math.abs(uz) * 1.7);
  if (uy < -0.40) r -= (Math.abs(uy) - 0.40) * 0.30 * (0.35 + 0.65 * noMeio);

  return r;
}

/* ponto da superfície na direção u */
export function ponto(ux, uy, uz, out) {
  const r = raio(ux, uy, uz);
  out.set(ux * RX * r, uy * RY * r, uz * RZ * r);
  return out;
}

/* Normal por diferenças finitas: monta dois vetores tangentes à esfera,
   anda um passo em cada, e o produto vetorial dos deslocamentos dá a
   normal REAL da superfície ondulada — é ela que faz os giros aparecerem
   no sombreado, em vez de a luz correr lisa por cima. */
export function normal(ux, uy, uz, out, a, b, c) {
  const E = 0.020;
  /* tangente qualquer, desde que não seja paralela a u */
  let tx = -uy, ty = ux, tz = 0;
  if (tx * tx + ty * ty < 1e-6) { tx = 0; ty = -uz; tz = uy; }
  const lt = Math.hypot(tx, ty, tz); tx /= lt; ty /= lt; tz /= lt;
  /* segunda tangente = u × t */
  const sx = uy * tz - uz * ty, sy = uz * tx - ux * tz, sz = ux * ty - uy * tx;

  const nor = (x, y, z, alvo) => {
    const l = Math.hypot(x, y, z);
    return ponto(x / l, y / l, z / l, alvo);
  };
  ponto(ux, uy, uz, a);
  nor(ux + tx * E, uy + ty * E, uz + tz * E, b);
  nor(ux + sx * E, uy + sy * E, uz + sz * E, c);

  const p1x = b.x - a.x, p1y = b.y - a.y, p1z = b.z - a.z;
  const p2x = c.x - a.x, p2y = c.y - a.y, p2z = c.z - a.z;
  let nx = p1y * p2z - p1z * p2y;
  let ny = p1z * p2x - p1x * p2z;
  let nz = p1x * p2y - p1y * p2x;
  const ln = Math.hypot(nx, ny, nz) || 1;
  nx /= ln; ny /= ln; nz /= ln;
  /* garante que aponta pra fora */
  if (nx * a.x + ny * a.y + nz * a.z < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return out.set(nx, ny, nz);
}

/* ---------- cerebelo ----------
   Na referência ele fica ENCAIXADO embaixo e atrás do occipital, em
   forma de cunha (o topo achatado onde encosta no cérebro), coberto de
   estrias finas e paralelas — textura de folha dobrada, o oposto dos
   giros largos. É esse contraste que faz a peça ser reconhecida. */
export const CEREBELO = { cx: -0.52, cy: -0.40, cz: 0, rx: 0.34, ry: 0.21, rz: 0.30 };

function estria(uy) {
  return 1 - Math.abs(Math.sin(uy * Math.PI * 10.0));
}

export function pontoCerebelo(ux, uy, uz, out) {
  const e = 1 + 0.060 * estria(uy);
  /* cunha: o topo é achatado, é onde ele encosta no occipital */
  const ry = CEREBELO.ry * (uy > 0 ? 0.72 : 1);
  out.set(
    CEREBELO.cx + ux * CEREBELO.rx * e,
    CEREBELO.cy + uy * ry * e,
    CEREBELO.cz + uz * CEREBELO.rz * e
  );
  return out;
}

/* peso de amostragem das estrias, mesmo princípio do pesoGiro */
export function pesoCerebelo(uy) {
  return 0.10 + 0.90 * Math.pow(estria(uy), 0.8);
}

/* crista das estrias, pro brilho por partícula */
export function nivelEstria(uy) {
  return Math.pow(estria(uy), 1.2);
}

/* Normal REAL do cerebelo, por diferenças finitas. Passar a direção da
   esfera como normal fazia a luz correr lisa por cima e o cerebelo
   virava uma bola branca colada no cérebro, sem textura nenhuma. */
export function normalCerebelo(ux, uy, uz, out, a, b, c) {
  const E = 0.018;
  let tx = -uy, ty = ux, tz = 0;
  if (tx * tx + ty * ty < 1e-6) { tx = 0; ty = -uz; tz = uy; }
  const lt = Math.hypot(tx, ty, tz); tx /= lt; ty /= lt; tz /= lt;
  const sx = uy * tz - uz * ty, sy = uz * tx - ux * tz, sz = ux * ty - uy * tx;
  const nor = (x, y, z, alvo) => {
    const l = Math.hypot(x, y, z);
    return pontoCerebelo(x / l, y / l, z / l, alvo);
  };
  pontoCerebelo(ux, uy, uz, a);
  nor(ux + tx * E, uy + ty * E, uz + tz * E, b);
  nor(ux + sx * E, uy + sy * E, uz + sz * E, c);
  const p1x = b.x - a.x, p1y = b.y - a.y, p1z = b.z - a.z;
  const p2x = c.x - a.x, p2y = c.y - a.y, p2z = c.z - a.z;
  let nx = p1y * p2z - p1z * p2y;
  let ny = p1z * p2x - p1x * p2z;
  let nz = p1x * p2y - p1y * p2x;
  const ln = Math.hypot(nx, ny, nz) || 1;
  nx /= ln; ny /= ln; nz /= ln;
  /* pra fora = pra longe do centro do cerebelo, não da origem da cena */
  if (nx * (a.x - CEREBELO.cx) + ny * (a.y - CEREBELO.cy) + nz * (a.z - CEREBELO.cz) < 0) {
    nx = -nx; ny = -ny; nz = -nz;
  }
  return out.set(nx, ny, nz);
}

/* ---------- tronco encefálico ----------
   Tubo que desce do centro-baixo AFINANDO e INCLINADO pra trás, como na
   referência. Fecha a silhueta por baixo: sem ele o cérebro flutua
   cortado. Fica à frente do cerebelo (cx do cerebelo é -0.52). */
export function pontoTronco(t, ang, out) {
  const r = 0.130 * (1 - t * 0.45);
  const cx = -0.10 - t * 0.22;
  const cy = -0.30 - t * 0.55;
  out.set(cx + Math.cos(ang) * r, cy, Math.sin(ang) * r * 1.05);
  return out;
}
