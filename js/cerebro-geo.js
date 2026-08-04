/* =====================================================================
   GEOMETRIA DO CÉREBRO — gerada por código, sem modelo 3D

   Um cérebro anatômico de banco de modelos pesa alguns MB e vem com
   licença atrelada. Em densidade de partículas nada disso aparece: o que
   o olho lê é a silhueta, a fissura que separa os hemisférios e o
   desenho dos giros. Isso dá pra escrever — e custa 0 KB de asset.

   A superfície é um elipsoide (comprido no eixo X, achatado no Y) com o
   raio modulado por três coisas:
     . os GIROS, as circunvoluções, feitos de ruído em bandas estreitas;
     . a FISSURA LONGITUDINAL, o sulco fundo que separa os hemisférios;
     . a FISSURA LATERAL (de Sylvius), que destaca o lobo temporal.
   O cerebelo e o tronco entram como peças separadas, porque não são
   deformação do mesmo corpo — são outros corpos encostados nele.
   ===================================================================== */

/* eixos: X = frente/trás, Y = cima/baixo, Z = lado a lado */
const RX = 1.00, RY = 0.70, RZ = 0.76;

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

/* Giros: duas oitavas de ruído somadas viram o argumento de um seno, e
   1-|sen| transforma as cristas em VALES ESTREITOS. É o perfil certo: no
   cérebro real a massa é contínua e os sulcos é que são finos.

   A frequência é baixa de propósito. Na primeira tentativa usei 3.05/7.10
   e o resultado virou chuvisco: em densidade de partículas, dobra fina não
   lê como dobra, lê como ruído. Dobras largas e fundas é que desenham. */
function trama(x, y, z) {
  const n1 = ruido(x * 1.95, y * 1.95, z * 1.95);
  const n2 = ruido(x * 4.20 + 31.7, y * 4.20, z * 4.20);
  return Math.sin((n1 * 2.55 + n2 * 0.85) * Math.PI * 3.1);
}
function giros(x, y, z) {
  return (1 - Math.abs(trama(x, y, z))) * 0.078;
}

/* Peso de amostragem: perto de 0 no fundo do sulco, 1 na crista do giro.
   Deslocar o raio sozinho não bastava — o sulco só aparece de verdade
   quando também FALTA partícula nele. Quem amostra usa isto por rejeição. */
export function pesoGiro(x, y, z) {
  const t = Math.abs(trama(x, y, z));
  return 0.12 + 0.88 * Math.pow(1 - t, 0.55);
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

  /* FISSURA LATERAL (de Sylvius) — a mais importante pra silhueta. É ela
     que destaca o lobo temporal, aquele "polegar" que desce na frente e
     dá ao cérebro de perfil o formato de luva de boxe em vez de ovo.
     Corre da frente-baixo pro fundo-meio, na face de fora.

     Vale um cuidado que me custou uma tentativa: num objeto convexo visto
     de lado, o CONTORNO nasce onde a normal é perpendicular à vista — ou
     seja, na linha média (uz≈0), não na face lateral. Condicionar a
     fissura a |uz| alto deixava a silhueta de perfil um ovo liso, porque a
     linha média não recebia nada. Por isso o piso de 0.5 abaixo. */
  const forcaLado = 0.5 + 0.5 * Math.min(1, Math.abs(uz) * 1.7);
  const curva = uy + 0.08 + ux * 0.30;
  r -= 0.150 * Math.exp(-(curva * 4.6) * (curva * 4.6)) * forcaLado;

  /* polo temporal: o "polegar" que desce à frente, abaixo da fissura */
  const dt = (uy + 0.55) * 2.8;
  const temporal = Math.exp(-dt * dt) * Math.max(0, 0.35 + ux * 0.90);
  r += 0.145 * temporal;

  /* de perfil o cérebro é uma gota: frontal mais estreito, occipital cheio */
  r *= 1 + 0.075 * ux - 0.060 * ux * ux;

  /* achata a base só no miolo — nas laterais o temporal continua descendo */
  const noMeio = 1 - Math.min(1, Math.abs(uz) * 1.7);
  if (uy < -0.42) r -= (Math.abs(uy) - 0.42) * 0.34 * (0.35 + 0.65 * noMeio);

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
   Bola achatada atrás e embaixo, com estrias FINAS e paralelas — o
   cerebelo tem textura de folha dobrada, bem diferente dos giros largos
   do cérebro. É esse contraste que faz a peça ser reconhecida. */
export const CEREBELO = { cx: -0.60, cy: -0.44, cz: 0, rx: 0.27, ry: 0.19, rz: 0.36 };

export function pontoCerebelo(ux, uy, uz, out) {
  /* estrias horizontais e finas — o cerebelo tem textura de folha dobrada,
     o oposto dos giros largos do cérebro. É esse contraste que faz a peça
     ser reconhecida como cerebelo e não como um caroço solto. */
  const estrias = 1 + 0.070 * (1 - Math.abs(Math.sin(uy * Math.PI * 9.0)));
  out.set(
    CEREBELO.cx + ux * CEREBELO.rx * estrias,
    CEREBELO.cy + uy * CEREBELO.ry * estrias,
    CEREBELO.cz + uz * CEREBELO.rz * estrias
  );
  return out;
}

/* ---------- tronco encefálico ----------
   Tubo curto que desce do centro-baixo, afinando. Fecha a silhueta por
   baixo: sem ele o cérebro parece flutuar cortado.
   Na primeira versão ficou fino e comprido demais e lia como um palito —
   agora é mais curto e mais grosso, que é a proporção real. */
export function pontoTronco(t, ang, out) {
  const r = 0.135 * (1 - t * 0.30);
  const cx = -0.26 + t * 0.10;
  const cy = -0.44 - t * 0.30;
  out.set(cx + Math.cos(ang) * r, cy, Math.sin(ang) * r * 1.05);
  return out;
}
