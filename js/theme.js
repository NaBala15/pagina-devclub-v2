/* =====================================================================
   TEMA CLARO/ESCURO
   Carregado no <head> (antes do CSS pintar) para não haver piscada de
   tema errado ao abrir a página.

   Ordem de decisão: escolha salva > preferência do sistema > escuro.
   ===================================================================== */
(function () {
  'use strict';

  var CHAVE = 'devclub-tema';
  var raiz = document.documentElement;

  function aplicar(tema) {
    raiz.setAttribute('data-theme', tema);
  }

  var salvo = null;
  try { salvo = localStorage.getItem(CHAVE); } catch (e) { /* modo privado */ }
  var prefereClaro = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: light)').matches;
  aplicar(salvo || (prefereClaro ? 'light' : 'dark'));

  /* liga o botão assim que ele existir no DOM */
  function ligarBotao() {
    var cb = document.getElementById('temaSwitch');
    if (!cb) return;
    cb.checked = raiz.getAttribute('data-theme') === 'light';
    cb.addEventListener('change', function () {
      var tema = cb.checked ? 'light' : 'dark';
      aplicar(tema);
      try { localStorage.setItem(CHAVE, tema); } catch (e) {}
      /* avisa quem desenha em canvas (partículas do fundo) */
      window.dispatchEvent(new CustomEvent('temachange', { detail: tema }));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ligarBotao);
  } else {
    ligarBotao();
  }

  /* quem nunca escolheu manualmente acompanha o sistema */
  if (!salvo && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
      var tema = e.matches ? 'light' : 'dark';
      aplicar(tema);
      var cb = document.getElementById('temaSwitch');
      if (cb) cb.checked = e.matches;
      window.dispatchEvent(new CustomEvent('temachange', { detail: tema }));
    });
  }
})();
