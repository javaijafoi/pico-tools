import { bySlug } from './registry.js';
import { h, toast } from './lib.js';

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
}

async function tool(slug) {
  const meta = bySlug[slug];
  const root = document.getElementById('tool');
  try {
    const mod = await import(`./tools/${meta.group}.js`);
    root.replaceChildren();
    await mod.tools[slug](root, meta);
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
