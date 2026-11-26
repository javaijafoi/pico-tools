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

// Conexão móvel ou lenta? Só nesse caso perguntamos antes de baixar. No Wi-Fi (ou quando o navegador
// não informa o tipo de conexão) baixa direto, sem pergunta e sem destaque.
export function lenta() {
  const c = navigator.connection; if (!c) return false;
  return !!(c.saveData || c.type === 'cellular' || /^(slow-2g|2g|3g)$/.test(c.effectiveType || ''));
}
const marca = id => { const o = lerOk(); o[id] = Date.now(); gravaOk(o); try { navigator.storage?.persist?.(); } catch {} };

// Antes do primeiro download. Devolve true se pode baixar.
const nao = {};
export function garantir(id, { mb } = {}) {
  const m = MODULOS[id]; if (baixado(id)) return Promise.resolve(true);
  if (!lenta()) { marca(id); return Promise.resolve(true); }
  if (Date.now() - (nao[id] || 0) < 15000) return Promise.resolve(false); // não repete a pergunta para os outros arquivos do lote
  return new Promise(res => {
    const size = mb ?? m.mb;
    const fim = ok => { ov.remove(); document.removeEventListener('keydown', esc); if (ok) marca(id); else nao[id] = Date.now(); res(ok); };
    const esc = e => { if (e.key === 'Escape') fim(false); };
    const ov = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mdT' },
      h('div', { class: 'modal-b' },
        h('h2', { id: 'mdT', text: 'BAIXAR AGORA?' }),
        h('p', { text: `Esta ferramenta precisa baixar "${m.nome}" (${mbTxt(size)}).` }),
        h('p', { text: 'É só desta vez: depois fica salvo no seu aparelho e você nunca mais precisa baixar de novo.' }),
        h('p', { class: 'note', text: 'Você está numa conexão móvel ou lenta, por isso perguntamos. Se preferir, espere o Wi-Fi.' }),
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

// Aviso no topo de cada ferramenta: uma linha discreta, e (só se faltar baixar algo) outra linha separada, ainda mais apagada.
export function aviso(slug) {
  const ids = POR_TOOL[slug];
  const caixa = h('div', { class: 'avisos', id: 'runlocal' }, h('p', { class: 'runlocal', text: '🔒 Roda 100% no seu aparelho: nada é enviado.' }));
  if (!ids || ids.every(baixado)) return caixa;
  const txt = ids.length === 1
    ? `Usa um módulo de ${tamanho(ids[0])}, baixado uma vez e salvo.`
    : 'Usa um módulo baixado uma vez e salvo: ' + ids.map(i => `${MODULOS[i].nome.replace('IA de recorte para ', '')} ${tamanho(i)}`).join(' · ') + '.';
  caixa.append(h('p', { class: 'modnote', text: txt + ' ' }, h('a', { href: '/#modulos', text: 'Ver módulos' })));
  return caixa;
}

// Baixa o módulo agora, sem precisar abrir a ferramenta. onProg(0..1 ou null).
const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/';
const ANIME = 'https://huggingface.co/skytnt/anime-seg/resolve/main/isnetis.onnx';
const FF = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/';
async function pegar(url, fatia, onProg, opcional) {
  try {
    const c = await caches.open(CACHE); if (await c.match(url)) return onProg?.(fatia[1]);
    const r = await fetch(url); if (!r.ok) throw new Error('Falha ao baixar ' + url.split('/').pop());
    const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), partes = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; partes.push(value); got += value.length; if (total) onProg?.(fatia[0] + (fatia[1] - fatia[0]) * Math.min(1, got / total)); }
    await c.put(url, new Response(new Blob(partes), { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream' } })); onProg?.(fatia[1]);
  } catch (e) { if (!opcional) throw e; }
}
export async function baixarManual(id, onProg) {
  const m = MODULOS[id]; if (!m) return;
  if (id === 'video') { await pegar(FF + 'ffmpeg-core.js', [0, .05], onProg); await pegar(FF + 'ffmpeg-core.wasm', [.05, 1], onProg); }
  else if (id === 'ocr') { const O = await import('./tools/ocr.js'); onProg?.(null); await O.preparar('por+eng', p => onProg?.(p)); }
  else if (id === 'ia-anime') {
    await pegar(ORT + 'ort.min.js', [0, .01], onProg); await pegar(ORT + 'ort-wasm-simd-threaded.wasm', [.01, .1], onProg, true); await pegar(ORT + 'ort-wasm-simd-threaded.mjs', [.1, .11], onProg, true);
    await pegar(ANIME, [.11, 1], onProg);
  } else { // IA de fotos (@imgly): a própria biblioteca sabe quais arquivos baixar
    const lib = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm'); onProg?.(null);
    let feito = 0, tudo = 0; const por = {};
    await lib.preload({ model: id === 'ia-foto-max' ? 'isnet' : 'isnet_fp16', progress: (k, cur, tot) => { por[k] = [cur, tot]; feito = 0; tudo = 0; for (const [a, b] of Object.values(por)) { feito += a; tudo += b; } if (tudo) onProg?.(feito / tudo); } });
  }
  marca(id); onProg?.(1);
}

// Painel "Módulos baixados" da página inicial.
export function painel(box) {
  const ul = h('ul', { class: 'mods' }); const info = h('p', { class: 'note', id: 'modInfo' });
  const ocupado = new Set();
  const draw = async () => {
    ul.replaceChildren(...Object.entries(MODULOS).map(([id, m]) => {
      const ok = baixado(id), st = h('small', { class: ok ? 'ok' : '', text: ok ? 'Baixado ✓' : 'Não baixado' });
      const acao = ok
        ? btn('REMOVER', async () => { const n = await remover(id); info.textContent = n ? 'Módulo removido. O espaço foi liberado.' : 'Módulo removido da lista. Se o navegador ainda guardar uma cópia automática, limpe os dados do site nas configurações dele.'; draw(); }, 'r', { 'data-rm': id })
        : btn('BAIXAR', async () => {
          if (ocupado.has(id)) return; ocupado.add(id); acao.disabled = true; st.className = ''; st.textContent = 'Baixando… 0%'; info.textContent = '';
          try { await baixarManual(id, p => { st.textContent = p == null ? 'Baixando…' : `Baixando… ${Math.min(99, Math.round(p * 100))}%`; }); info.textContent = `${m.nome} baixado. Agora fica salvo no aparelho.`; }
          catch (e) { info.textContent = 'Não consegui baixar agora. Confira a conexão e tente de novo.'; console.error(e); }
          ocupado.delete(id); draw();
        }, 'g', { 'data-dl': id });
      return h('li', {}, h('div', {}, h('b', { text: m.nome }), h('small', { text: `${tamanho(id)} · ${m.quem}` }), st), acao);
    }));
    try { const e = await navigator.storage?.estimate?.(); if (e?.usage != null) info.dataset.usage = fmtBytes(e.usage); } catch {}
  };
  box.append(ul, info); draw();
}
