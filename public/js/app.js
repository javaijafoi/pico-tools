import { bySlug } from './registry.js';
import { h, toast } from './lib.js';
import { aviso, painel } from './modulos.js';

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function home() {
  const q = document.getElementById('q');
  const cards = [...document.querySelectorAll('.card-li')];
  const cats = [...document.querySelectorAll('.cat')];
  const empty = document.getElementById('empty');
  let cat = 'all';
  const apply = () => {
    const t = norm(q.value.trim());
    let n = 0;
    for (const li of cards) {
      const ok = (cat === 'all' || li.dataset.cat === cat) && (!t || norm(li.dataset.s).includes(t));
      li.hidden = !ok; if (ok) n++;
    }
    empty.hidden = n > 0;
  };
  q.addEventListener('input', apply);
  cats.forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat;
    cats.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  }));
  apply();
  pedido();
  const mb = document.getElementById('modBox'); if (mb) painel(mb);
}

// "Peça sua tool": grava o pedido por uma função do Supabase que só aceita inserir (ninguém lê daqui).
// Proteções: texto de 5 a 500 caracteres, campo-isca para robôs, intervalo de 60 s e no máx. 3 pedidos por dia
// neste aparelho; no banco há limite global por hora/dia e pedidos repetidos são ignorados.
const SB = 'https://xhncsuemwfybihpxzvfj.supabase.co', SB_KEY = 'sb_publishable_MJ29j25WCA42QkQedXvJew_2yrxz-2I';
function pedido() {
  const f = document.getElementById('pedidoForm'); if (!f) return;
  const st = document.getElementById('pedSt'), btn = document.getElementById('pedBtn');
  const say = (m, c = '') => { st.className = 'status ' + c; st.textContent = m; };
  const hist = () => { try { return JSON.parse(localStorage.getItem('pedidos') || '[]').filter(t => Date.now() - t < 864e5); } catch { return []; } };
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = document.getElementById('pedTxt').value.trim(), h_ = hist();
    if (txt.length < 5) return say('Conte um pouco mais (mínimo 5 letras).', 'bad');
    if (h_.length && Date.now() - h_[h_.length - 1] < 60000) return say('Calma! Espere 1 minuto para mandar outro.', 'bad');
    if (h_.length >= 3) return say('Você já mandou 3 pedidos hoje. Volte amanhã!', 'bad');
    btn.disabled = true; say('Enviando…');
    try {
      const r = await fetch(SB + '/rest/v1/rpc/multitool_pedir', { method: 'POST', headers: { apikey: SB_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ p_texto: txt, p_contato: document.getElementById('pedCont').value.trim() || null, p_isca: document.getElementById('pedIsca').value }) });
      const res = r.ok ? await r.json() : null;
      if (res === 'ok') { try { localStorage.setItem('pedidos', JSON.stringify([...h_, Date.now()])); } catch {} f.reset(); say('Pedido recebido! Obrigado.', 'ok'); }
      else if (res === 'limite') say('Recebi pedidos demais agora. Tente de novo mais tarde.', 'bad');
      else say('Não consegui enviar. Tente de novo em instantes.', 'bad');
    } catch { say('Sem conexão. Tente de novo.', 'bad'); }
    btn.disabled = false;
  });
}

async function tool(slug) {
  const meta = bySlug[slug];
  const root = document.getElementById('tool');
  try {
    const mod = await import(`./tools/${meta.group}.js`);
    root.replaceChildren();
    await mod.tools[slug](root, meta);
    root.prepend(aviso(slug));
  } catch (e) {
    console.error(e);
    root.replaceChildren(h('div', { class: 'panel' }, h('h2', { text: 'ERRO' }), 'Não consegui carregar esta ferramenta: ' + e.message));
  }
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url).pathname).catch(() => {});
}
const slug = document.body.dataset.tool;
if (slug) tool(slug); else home();

// Convite para salvar nos favoritos: instalar (Android e Chrome), adicionar à tela de início (iPhone) ou favoritar (PC).
// Aparece uma vez, some ao tocar em qualquer botão e só volta depois de 30 dias.
(function favorito() {
  const KEY = 'fav-aviso';
  try { if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return; const t = +localStorage.getItem(KEY); if (t && Date.now() - t < 30 * 864e5) return; } catch { return; }
  let ev = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), touch = matchMedia('(pointer:coarse)').matches;
  setTimeout(() => {
    if (document.querySelector('.fav')) return;
    const close = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch {} bar.remove(); };
    const msg = ev ? 'Quer guardar o Pico Multitool no seu aparelho?' : ios ? 'Guarde nos favoritos: toque em Compartilhar e depois em "Adicionar à Tela de Início".' : touch ? 'Guarde nos favoritos: abra o menu do navegador e escolha "Adicionar à tela inicial".' : 'Guarde nos favoritos: aperte Ctrl+D (ou ⌘+D no Mac).';
    const bar = h('div', { class: 'fav', role: 'dialog', 'aria-label': 'Salvar nos favoritos' }, h('p', { text: '⭐ ' + msg }),
      h('div', { class: 'fav-b' }, ev ? h('button', { type: 'button', class: 'btn g', id: 'favSim', onclick: async () => { const e = ev; ev = null; close(); try { await e.prompt(); } catch {} } }, 'SALVAR') : null,
        h('button', { type: 'button', class: 'btn', id: 'favNao', onclick: close }, ev ? 'AGORA NÃO' : 'OK')));
    document.body.append(bar);
  }, 4000);
})();
