import { h, btn, fmtBytes } from './lib.js';

// Módulos pesados (motores e modelos de IA). Tudo roda no aparelho, mas a ferramenta em si precisa ser baixada
// uma vez. Antes do primeiro download mostramos o tamanho real e o usuário escolhe. A escolha fica salva.
// Tamanhos medidos nos arquivos reais (download, em MB decimais).
export const MODULOS = {
  video: { nome: 'Motor de vídeo e áudio', mb: 9.3, disco: 31, quem: 'comprimir e cortar vídeo, vídeo em GIF, extrair e cortar áudio', re: /@ffmpeg\/core/ },
  ocr: { nome: 'Leitor de texto (OCR)', mb: 4.4, quem: 'extrair texto de imagem e de PDF escaneado', re: /tesseract|tessdata/ },
  'ia-foto': { nome: 'IA de recorte para fotos (rápido)', mb: 100, quem: 'remover fundo de fotos', re: /staticimgly|@imgly|onnxruntime-web@1\.18/, grupo: 'imgly' },
  'ia-foto-max': { nome: 'IA de recorte para fotos (máxima qualidade)', mb: 188, quem: 'remover fundo de fotos com mais detalhe', re: /staticimgly|@imgly|onnxruntime-web@1\.18/, grupo: 'imgly' },
  'ia-anime': { nome: 'IA de recorte para ilustração e anime', mb: 178, quem: 'remover fundo de desenhos, anime e arte digital', re: /isnetis|huggingface|onnxruntime-web@1\.19/ },
};
// Quais módulos cada ferramenta pode pedir.
export const POR_TOOL = {
  'comprimir-video': ['video'], 'cortar-video': ['video'], 'video-para-gif': ['video'], 'extrair-audio': ['video'], 'cortar-audio': ['video'],
  'extrair-texto-imagem': ['ocr'], 'pdf-para-texto': ['ocr'], 'remover-fundo': ['ia-foto', 'ia-foto-max', 'ia-anime'],
};
export const CACHE = 'pico-modelos';
const KEY = 'modulos-ok';
const lerOk = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const gravaOk = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };
export const baixado = id => !!lerOk()[id];
const mbTxt = mb => (mb < 10 ? mb.toFixed(1) : Math.round(mb)).toString().replace('.', ',') + ' MB';
export const tamanho = id => mbTxt(MODULOS[id].mb);

// Pede permissão antes do primeiro download. Devolve true se pode baixar.
const nao = {};
export function garantir(id, { mb } = {}) {
  const m = MODULOS[id]; if (baixado(id)) return Promise.resolve(true);
  if (Date.now() - (nao[id] || 0) < 15000) return Promise.resolve(false); // não repete a pergunta para os outros arquivos do lote
  return new Promise(res => {
    const size = mb ?? m.mb;
    const cel = navigator.connection && (navigator.connection.type === 'cellular' || navigator.connection.saveData);
    const fim = ok => { ov.remove(); document.removeEventListener('keydown', esc); if (ok) { const o = lerOk(); o[id] = Date.now(); gravaOk(o); try { navigator.storage?.persist?.(); } catch {} } if (!ok) nao[id] = Date.now(); res(ok); };
    const esc = e => { if (e.key === 'Escape') fim(false); };
    const ov = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mdT' },
      h('div', { class: 'modal-b' },
        h('h2', { id: 'mdT', text: 'BAIXAR ' + m.nome.toUpperCase() }),
        h('p', { text: 'Esta ferramenta roda 100% no seu aparelho: seus arquivos não são enviados nem baixados de lugar nenhum.' }),
        h('p', { text: `Para isso, o módulo "${m.nome}" precisa ser baixado uma vez (${mbTxt(size)}${m.disco ? `, ocupa cerca de ${m.disco} MB no aparelho` : ''}). Depois fica guardado e funciona até sem internet.` }),
        cel ? h('p', { class: 'warn', text: 'Você parece estar em dados móveis. Se tiver Wi-Fi, melhor esperar.' }) : null,
        h('p', { class: 'note', text: 'Serve para: ' + m.quem + '. Você pode remover os módulos baixados na página inicial, em "Módulos baixados".' }),
        h('div', { class: 'row' }, btn('BAIXAR ' + mbTxt(size), () => fim(true), 'g', { id: 'modSim' }), btn('AGORA NÃO', () => fim(false), '', { id: 'modNao' }))));
    document.addEventListener('keydown', esc); document.body.append(ov); ov.querySelector('#modSim').focus();
  });
}
export const recusou = () => Object.assign(new Error('Download cancelado. Sem o módulo esta ferramenta não funciona; toque de novo quando quiser baixar.'), { recusa: true });

// Remove o que guardamos do módulo (e o aceite, para perguntar de novo).
export async function remover(id) {
  const m = MODULOS[id], o = lerOk();
  const ids = Object.keys(MODULOS).filter(k => MODULOS[k] === m || (m.grupo && MODULOS[k].grupo === m.grupo));
  let n = 0;
  try { const c = await caches.open(CACHE); for (const r of await c.keys()) if (m.re.test(r.url) && await c.delete(r)) n++; } catch {}
  if (id === 'ocr') try { indexedDB.deleteDatabase('keyval-store'); } catch {}
  ids.forEach(k => delete o[k]); gravaOk(o); return n;
}

// Linha de aviso no topo de cada ferramenta.
export function aviso(slug) {
  const ids = POR_TOOL[slug];
  if (!ids) return h('p', { class: 'runlocal', id: 'runlocal', text: '🔒 Roda 100% no seu aparelho. Seus arquivos e textos não são enviados para ninguém.' });
  const txt = ids.length === 1
    ? `Módulo: ${MODULOS[ids[0]].nome} (${tamanho(ids[0])}, baixa uma vez) · ${baixado(ids[0]) ? 'já baixado ✓' : 'ainda não baixado'}.`
    : 'Você escolhe o que baixar: ' + ids.map(i => `${MODULOS[i].nome.replace('IA de recorte para ', '')} ${tamanho(i)}${baixado(i) ? ' ✓' : ''}`).join(' · ') + '.';
  return h('p', { class: 'runlocal', id: 'runlocal' }, '🔒 Roda 100% no seu aparelho: nada é enviado. ', h('span', { text: txt }), ' ', h('a', { href: '/#modulos', text: 'Ver módulos' }));
}

// Painel "Módulos baixados" da página inicial.
export function painel(box) {
  const ul = h('ul', { class: 'mods' }); const info = h('p', { class: 'note', id: 'modInfo' });
  const draw = async () => {
    ul.replaceChildren(...Object.entries(MODULOS).map(([id, m]) => {
      const ok = baixado(id);
      return h('li', {}, h('div', {}, h('b', { text: m.nome }), h('small', { text: `${tamanho(id)} · ${m.quem}` }), h('small', { class: ok ? 'ok' : '', text: ok ? 'Baixado ✓' : 'Não baixado' })),
        ok ? btn('REMOVER', async () => { const n = await remover(id); info.textContent = n ? 'Módulo removido. O espaço foi liberado.' : 'Módulo removido da lista. Se o navegador ainda guardar uma cópia automática, limpe os dados do site nas configurações dele.'; draw(); }, 'r', { 'data-rm': id }) : null);
    }));
    try { const e = await navigator.storage?.estimate?.(); if (e?.usage != null) info.dataset.usage = fmtBytes(e.usage); } catch {}
  };
  box.append(ul, info); draw();
}
