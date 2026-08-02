/* =====================================================================
   SCANNER DE SEGURANÇA — a formação de Cibersegurança em funcionamento

   Mostra ao visitante o que QUALQUER site já vê sobre ele sem pedir
   permissão. É uma demonstração educativa de pegada digital:
   - roda inteiramente no navegador do visitante;
   - não guarda, não envia e não registra nada em lugar nenhum;
   - a única chamada externa é a consulta de IP (o IP já é entregue a
     todo servidor que você acessa — é assim que a internet funciona).

   Também mostra o que está PROTEGIDO (arquivos, usuário do sistema,
   outras abas): a lição é a diferença entre os dois grupos.
   ===================================================================== */
(function () {
  'use strict';

  var btn = document.getElementById('scanBtn');
  var out = document.getElementById('scanOut');
  if (!btn || !out) return;

  var esc = function (v) {
    return String(v == null ? '—' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var row = function (k, v, cls) {
    return '<span class="scan-row"><span class="scan-k">' + k + '</span>' +
      '<span class="scan-v ' + (cls || '') + '">' + esc(v) + '</span></span>';
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- rede local: WebRTC entrega o IP da sua rede interna ---------- */
  function ipLocal() {
    return new Promise(function (resolve) {
      try {
        if (!window.RTCPeerConnection) return resolve(null);
        var pc = new RTCPeerConnection({ iceServers: [] });
        var achados = [];
        var fim = function () {
          try { pc.close(); } catch (e) {}
          resolve(achados.length ? achados : null);
        };
        pc.createDataChannel('devclub');
        pc.onicecandidate = function (e) {
          if (!e.candidate) return fim();
          var m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9-]+\.local)/i.exec(e.candidate.candidate);
          if (m && achados.indexOf(m[1]) === -1 && m[1] !== '0.0.0.0') achados.push(m[1]);
        };
        pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).catch(fim);
        setTimeout(fim, 1400);
      } catch (e) { resolve(null); }
    });
  }

  function conexao() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return null;
    var partes = [];
    if (c.effectiveType) partes.push(c.effectiveType.toUpperCase());
    if (c.downlink) partes.push('~' + c.downlink + ' Mbps');
    if (c.rtt) partes.push('rtt ' + c.rtt + 'ms');
    return partes.length ? partes.join(' · ') : null;
  }

  /* ---------- leituras locais (nenhuma pede permissão) ---------- */
  function navegador() {
    var ua = navigator.userAgent;
    var nome = 'desconhecido';
    if (/Edg\//.test(ua)) nome = 'Edge';
    else if (/OPR\//.test(ua)) nome = 'Opera';
    else if (/Chrome\//.test(ua)) nome = 'Chrome';
    else if (/Firefox\//.test(ua)) nome = 'Firefox';
    else if (/Safari\//.test(ua)) nome = 'Safari';
    var ver = (ua.match(new RegExp(nome + '\\/(\\d+)')) || [])[1];
    return nome + (ver ? ' ' + ver : '');
  }

  function sistema() {
    var ua = navigator.userAgent;
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad/.test(ua)) return 'iOS';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'desconhecido';
  }

  function placaDeVideo() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      var dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null;
    } catch (e) { return null; }
  }

  /* impressão digital do navegador: o mesmo truque que redes de anúncio
     usam para te reconhecer sem cookie nenhum */
  function impressaoDigital() {
    try {
      var c = document.createElement('canvas');
      c.width = 240; c.height = 44;
      var g = c.getContext('2d');
      g.textBaseline = 'top';
      g.font = '15px "Arial"';
      g.fillStyle = '#f60'; g.fillRect(0, 0, 240, 22);
      g.fillStyle = '#069'; g.fillText('DevClub~scan@' + navigator.language, 2, 3);
      g.fillStyle = 'rgba(102,204,0,.7)'; g.fillText('fingerprint', 4, 20);
      var base = c.toDataURL() + '|' + navigator.userAgent + '|' + screen.width + 'x' +
        screen.height + '|' + new Date().getTimezoneOffset() + '|' +
        (navigator.hardwareConcurrency || 0) + '|' + placaDeVideo();
      var h = 2166136261;
      for (var i = 0; i < base.length; i++) {
        h ^= base.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
    } catch (e) { return null; }
  }

  async function bateria() {
    try {
      if (!navigator.getBattery) return null;
      var b = await navigator.getBattery();
      return Math.round(b.level * 100) + '%' + (b.charging ? ' (carregando)' : '');
    } catch (e) { return null; }
  }

  /* ---------- consulta de IP público + latência real ---------- */
  async function redePublica() {
    var fontes = ['https://ipwho.is/', 'https://ipapi.co/json/'];
    for (var i = 0; i < fontes.length; i++) {
      try {
        var t0 = performance.now();
        var r = await fetch(fontes[i], { cache: 'no-store' });
        var ms = Math.round(performance.now() - t0);
        if (!r.ok) continue;
        var d = await r.json();
        if (d.ip) {
          return {
            ip: d.ip,
            cidade: d.city || d.region || null,
            regiao: d.region || d.region_code || null,
            pais: d.country || d.country_name || null,
            provedor: (d.connection && d.connection.isp) || d.org || null,
            asn: (d.connection && d.connection.asn) ? 'AS' + d.connection.asn : (d.asn || null),
            latencia: ms,
          };
        }
      } catch (e) { /* tenta a próxima */ }
    }
    return null;
  }

  /* ---------- a sequência do terminal ---------- */
  var linhas = [];
  function push(txt) {
    linhas.push(txt);
    out.innerHTML = linhas.join('\n');
    out.scrollTop = out.scrollHeight;
  }

  btn.addEventListener('click', async function () {
    btn.disabled = true;
    btn.textContent = '▸ escaneando…';
    linhas = ['$ ./devclub-scan --alvo=voce --verbose'];
    out.innerHTML = linhas.join('\n');

    push('<span class="d">» varredura passiva · nenhuma permissão solicitada</span>');
    await sleep(450);

    /* 1. rede local */
    push('');
    push('<span class="d">[1/4] rede local ─────────────</span>');
    await sleep(350);
    var locais = await ipLocal();
    if (locais && locais.length) {
      var priv = locais.filter(function (x) { return /^(10\.|192\.168\.|172\.)/.test(x); });
      var mdns = locais.filter(function (x) { return /\.local$/i.test(x); });
      if (priv.length) push(row('IP local', priv[0] + ' (sua rede interna)', 'warn'));
      if (mdns.length) push(row('host mDNS', mdns[0].slice(0, 30) + '…', 'warn'));
      if (!priv.length && !mdns.length) push(row('candidato', locais[0], 'warn'));
      push(row('via', 'WebRTC — vazamento clássico', 'warn'));
    } else {
      push(row('IP local', 'oculto pelo navegador ✓', 'safe'));
    }
    var con = conexao();
    if (con) push(row('conexão', con, 'warn'));
    await sleep(550);

    /* 2. rede pública */
    push('');
    push('<span class="d">[2/4] rede pública ───────────</span>');
    await sleep(350);
    var net = await redePublica();
    if (net) {
      push(row('IP público', net.ip, 'warn'));
      var local = [net.cidade, net.regiao, net.pais].filter(Boolean).join(' · ');
      push(row('localização', local || 'aproximada', 'warn'));
      push(row('provedor', (net.provedor || 'não identificado') + (net.asn ? ' · ' + net.asn : ''), 'warn'));
      push(row('latência', net.latencia + ' ms', 'warn'));
    } else {
      push(row('IP público', 'consulta bloqueada (bom sinal!)', 'safe'));
    }
    push(row('servidor', location.hostname + ' · ' + location.protocol.replace(':', ''),
      location.protocol === 'https:' ? 'safe' : 'warn'));
    await sleep(550);

    /* 3. dispositivo */
    push('');
    push('<span class="d">[3/4] dispositivo ────────────</span>');
    await sleep(350);
    push(row('navegador', navegador(), 'warn'));
    push(row('sistema', sistema(), 'warn'));
    push(row('tela', screen.width + '×' + screen.height + ' · ' + screen.colorDepth + 'bit', 'warn'));
    push(row('fuso horário', Intl.DateTimeFormat().resolvedOptions().timeZone, 'warn'));
    push(row('idioma', navigator.language, 'warn'));
    var extras = [];
    if (navigator.hardwareConcurrency) extras.push(navigator.hardwareConcurrency + ' núcleos');
    if (navigator.deviceMemory) extras.push(navigator.deviceMemory + 'GB RAM');
    if (extras.length) push(row('hardware', extras.join(' · '), 'warn'));
    var gpu = placaDeVideo();
    if (gpu) push(row('placa de vídeo', gpu.replace(/^ANGLE \(/, '').slice(0, 40), 'warn'));
    var bat = await bateria();
    if (bat) push(row('bateria', bat, 'warn'));
    var fp = impressaoDigital();
    if (fp) push(row('sua impressão', '#' + fp + ' (te reconhece sem cookie)', 'warn'));
    await sleep(550);

    /* 4. o que o navegador PROTEGE — a boa notícia e a lição */
    push('');
    push('<span class="d">[4/4] bloqueado pelo navegador ─</span>');
    await sleep(350);
    push(row('arquivos do PC', 'protegido ✓', 'safe'));
    push(row('nome de usuário', 'protegido ✓', 'safe'));
    push(row('outras abas', 'protegido ✓', 'safe'));
    push(row('câmera e mic', 'exige sua permissão ✓', 'safe'));
    await sleep(450);

    push('');
    push('<span class="q">varredura concluída.</span>');
    push('<span class="d">tudo em laranja foi obtido em segundos, sem permissão — ' +
      'por QUALQUER site que você abre.</span>');
    push('<span class="d">em verde: o que o navegador protege. saber a diferença ' +
      'entre os dois é o começo da cibersegurança.</span>');
    push('');
    push('<span class="l">→ é isso que você aprende a explorar (e a defender) na formação.</span>');

    btn.textContent = '✓ teste concluído — rodar de novo';
    btn.disabled = false;
  });
})();
