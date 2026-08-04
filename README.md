# DevClub — a escola dentro da mente de um dev

> Página conceito criada para o concurso da vaga Full Stack do DevClub.
> A ideia: em vez de *falar* sobre a escola, colocar o visitante **dentro da
> mente de quem aprende a programar** — e deixar a página provar, na prática,
> o que a escola ensina.

![Prévia da página](assets/og-devclub.jpg)

## O conceito

A visita começa com uma intro 3D: **34 mil partículas** se organizam numa cabeça
humana, as ferramentas do ofício orbitam ao redor (HTML, CSS, JavaScript,
terminal, Three.js e uma lâmpada), um dos olhos acende com o reflexo da própria
página — e a câmera mergulha pelo olho para dentro da mente.

Do outro lado do corte, as partículas que sobram entram pelas **bordas da tela**
e se juntam num **cérebro** de 40 mil pontos, com uma teia de sinapses correndo
de ponta a ponta do topo da página. Ele gira no arraste, troca de paleta no
clique e se desfaz quando você começa a rolar. Daí em diante o site inteiro
acontece "lá dentro": o fundo de partículas continua o mesmo universo da intro.

## Destaques

| Seção | O que tem de vivo |
|---|---|
| Intro 3D | cabeça de partículas com Three.js, olho-tela, mergulho de câmera, grão de filme |
| Cérebro do hero | 40 mil partículas com geometria **gerada por código** (nenhum modelo baixado), arrastável, 3 paletas no clique, desmonta na rolagem |
| Plataforma | editor com abas que digita código sozinho, terminal e preview |
| Mentorias | sala de vídeochamada com 4 vídeos em loop e botões funcionais (sair, mudo, câmera, ampliar, pausar) |
| História | linha do tempo 2009→hoje com imagem fixa que troca conforme o scroll |
| Formações | deck navegável; a de Cibersegurança é um **scanner interativo** que mostra ao visitante os dados que o navegador entrega (e o que fica protegido) |
| Faixa de trilhas | 15 formações/trilhas em esteira contínua |
| Além do código | recrutadora, terapeuta, agentes de IA, suporte 7 dias |
| Alunos | leque de depoimentos com física de cartas (porte de um componente React para JS puro + GSAP) |
| Projetos | deck arrastável com autoplay e molduras de navegador |
| Empresas | muro de logos em dois sentidos, com contraste calculado por marca |
| Tutores | trilho arrastável; clicar no card revela a bio |
| Diploma | chega dentro de uma **carta lacrada**: o lacre de cera racha, a aba abre e o certificado sobe — desenhado 100% em CSS, com tilt 3D |
| Tema | claro/escuro com um interruptor discreto; as "telas" continuam escuras nos dois temas, como ferramentas de dev de verdade |

## Stack

- **HTML + CSS + JavaScript puros** — sem framework, sem build, sem dependência para instalar
- [Three.js](https://threejs.org/) r185 (via CDN, importmap) na intro 3D e no cérebro
- [GSAP](https://gsap.com/) 3.12 (via CDN) no leque de depoimentos
- [Lenis](https://lenis.darkroom.engineering/) 1.1 (via CDN) na rolagem suave
- Fontes self-hosted (Sora, Inter, JetBrains Mono, Great Vibes)

### Geometria por código, não baixada

O cérebro do hero não usa modelo 3D. A superfície é um elipsoide com o raio
modulado por ruído de valor, e três detalhes fazem ele ser reconhecido:

- os **giros** vêm de ruído com o domínio esticado no eixo da cabeça — ruído
  igual nos três eixos vira textura de coral, não circunvolução;
- os **sulcos** só aparecem porque a amostragem os esvazia: deslocar a
  superfície não basta, tem que faltar partícula no fundo da dobra;
- a **fissura de Sylvius** tem máscara frontal, senão dá a volta e abre um
  segundo entalhe na nuca.

Custo: **0 KB de asset** — contra alguns MB de um modelo anatômico de banco.

## Rodando localmente

Qualquer servidor estático serve:

```bash
python -m http.server 4173
```

Depois abra `http://localhost:4173`. Atalho útil: `?nointro` pula a intro 3D.

## Estrutura

```
index.html          página única
css/                v2.css (base) · intro-head.css · polish.css · theme.css
js/
  intro-head.js     a intro 3D
  head-shared.js    degradê, sprite do ponto e corte da boca (intro + hero)
  head-skin.js      pele de pedra e luzes neon da cabeça
  tool-icons.js     ícones das ferramentas que orbitam (SVG extrudado)
  idea-icons.js     a lâmpada
  hero-cerebro.js   o cérebro do hero
  cerebro-geo.js    a geometria do cérebro, escrita à mão
  v2.js             interações da página
  fan.js            leque de depoimentos
  scanner.js        scanner de cibersegurança
  theme.js          tema claro/escuro
assets/             fontes, logos SVG, vídeos, imagens e o modelo da cabeça
```

Os módulos 3D compartilham peças por **importmap** (`head-shared`, `head-skin`,
`cerebro-geo`). O motivo é prático: importar pelo caminho relativo com o `?v=`
de cache em um arquivo e sem ele em outro cria **duas instâncias** do mesmo
módulo — no nosso caso isso fazia o modelo ser baixado e processado duas vezes.
O apelido mantém o cache-busting num lugar só.

## Acessibilidade e performance

- Contraste **WCAG AA** verificado por medição nos dois temas (inclusive por marca no muro de logos)
- `prefers-reduced-motion` respeitado: intro, esteiras e vídeos viram versões estáticas
- Vídeos da sala de mentoria recomprimidos de 35,5 MB para **1,4 MB** (H.264 + faststart), com play/pause automático conforme a visibilidade
- Imagens em WebP, dimensionadas pelo tamanho em que aparecem de fato na tela (2× para retina): de 13,8 MB para **1,8 MB**
- **A página inteira carrega em ~3 MB**, intro 3D e vídeos incluídos
- Contagem de partículas cai pela metade em máquinas de até 4 núcleos
- Nada anima em segundo plano: cada bloco 3D só desenha quando está na tela
- Navegação por teclado nos carrosséis e botões com `aria-label`/`aria-pressed`

## Transparência

Esta é uma **página conceito**: números, história, depoimentos e tutores são
ilustrativos; os retratos e vídeos foram gerados por IA; as marcas citadas
aparecem apenas de forma ilustrativa. O scanner de segurança roda inteiro no
navegador do visitante — nada é salvo nem enviado a lugar nenhum.

---

Desenvolvido por **JeffDev** · construído com [Claude Code](https://claude.com/claude-code)
