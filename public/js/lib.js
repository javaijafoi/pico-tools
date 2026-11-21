// Helpers compartilhados. Tudo roda no navegador, nada é enviado a servidor.
export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else if (k === 'checked') e.checked = !!v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

export const panel = (title, ...kids) => h('section', { class: 'panel' }, title ? h('h2', { text: title }) : null, ...kids);
export const row = (...kids) => h('div', { class: 'row' }, ...kids);
export const field = (label, input) => h('label', { class: 'f' }, h('span', { text: label }), input);
export const btn = (text, onclick, cls = '', extra = {}) => h('button', { type: 'button', class: 'btn ' + cls, onclick, ...extra }, text);
export const input = (props = {}) => h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', ...props });
export const area = (props = {}) => h('textarea', { spellcheck: 'false', ...props });
export const select = (opts, props = {}) => h('select', props, opts.map(o => Array.isArray(o) ? h('option', { value: o[0], text: o[1] }) : h('option', { value: o, text: o })));
export const check = (label, checked, onchange, id) => { const i = h('input', { type: 'checkbox', checked, onchange, id }); return h('label', { class: 'chk' }, i, label); };
export const out = (id, cls = '') => h('div', { class: 'out ' + cls, id, 'aria-live': 'polite' });

let toastT;
export function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast', text: msg, role: 'status' });
  document.body.append(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), 1600);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = h('textarea', { style: 'position:fixed;opacity:0' }); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
  toast('COPIADO!');
}
export const copyBtn = (getText, label = 'COPIAR') => btn(label, () => copyText(typeof getText === 'function' ? getText() : getText), 'g');

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const textBlob = (s, type = 'text/plain') => new Blob([s], { type: type + ';charset=utf-8' });

export function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1).replace('.', ',') + ' KB';
  return (n / 1048576).toFixed(2).replace('.', ',') + ' MB';
}
export const baseName = n => n.replace(/\.[^.]+$/, '');
export const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtBRL = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Seleção de arquivos (clique, toque ou arrastar). onFiles(File[])
export function dropzone({ accept, multiple = false, label = 'TOQUE PARA ESCOLHER', hint = '', onFiles, id = 'file' }) {
  const inp = h('input', { type: 'file', id, accept, multiple: multiple || null });
  const box = h('label', { class: 'drop' }, h('span', { class: 'px', text: label }), hint || (multiple ? 'ou arraste os arquivos aqui' : 'ou arraste o arquivo aqui'), inp);
  inp.addEventListener('change', () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('over'); }));
  box.addEventListener('drop', e => { const fs = [...e.dataTransfer.files]; if (fs.length) onFiles(multiple ? fs : [fs[0]]); });
  return box;
}

// Lista de arquivos reordenável
export function fileList(files, onChange, { reorder = true } = {}) {
  const ul = h('ul', { class: 'files', id: 'filelist' });
  const draw = () => {
    ul.replaceChildren(...files.map((f, i) => h('li', null,
      /^image\//.test(f.type) ? h('img', { src: f._url ??= URL.createObjectURL(f), alt: '', class: 'mini' }) : null,
      h('span', { class: 'n', text: f.name }), h('span', { class: 's', text: fmtBytes(f.size) }),
      reorder ? h('button', { type: 'button', 'aria-label': 'subir', onclick: () => { if (i > 0) { [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); onChange?.(); } } }, '▲') : null,
      reorder ? h('button', { type: 'button', 'aria-label': 'descer', onclick: () => { if (i < files.length - 1) { [files[i + 1], files[i]] = [files[i], files[i + 1]]; draw(); onChange?.(); } } }, '▼') : null,
      h('button', { type: 'button', 'aria-label': 'remover', onclick: () => { files.splice(i, 1); draw(); onChange?.(); } }, '✕'))));
  };
  draw();
  ul.redraw = draw;
  return ul;
}

export const status = () => h('div', { class: 'status', id: 'status', role: 'status', 'aria-live': 'polite' });
export function setStatus(el, msg, cls = '') { el.className = 'status ' + cls; el.textContent = msg; }
export function progress() { const i = h('i'); const p = h('div', { class: 'prog', hidden: true }, i); p.set = v => { p.hidden = false; i.style.width = Math.round(v * 100) + '%'; }; p.hide = () => { p.hidden = true; }; return p; }

// Carrega scripts de vendor sob demanda
const loaded = {};
export function loadScript(src) {
  return loaded[src] ??= new Promise((res, rej) => { const s = h('script', { src }); s.onload = res; s.onerror = () => rej(new Error('Falha ao carregar ' + src)); document.head.append(s); });
}
export const ROOT = new URL('../', import.meta.url).href;
export const loadPdfLib = async () => { await loadScript(ROOT + 'vendor/pdf-lib.min.js'); return window.PDFLib; };
export const loadJSZip = async () => { await loadScript(ROOT + 'vendor/jszip.min.js'); return window.JSZip; };
export async function loadPdfJs() {
  const m = await import(ROOT + 'vendor/pdf.min.mjs');
  m.GlobalWorkerOptions.workerSrc = ROOT + 'vendor/pdf.worker.min.mjs';
  return m;
}

// Miniatura da 1ª página de um PDF (File/Blob). Devolve um <canvas> ou null se não der (PDF protegido, por exemplo).
export async function pdfThumb(blob, width = 150) {
  try {
    const pj = await loadPdfJs(); const doc = await pj.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; const page = await doc.getPage(1);
    const v1 = page.getViewport({ scale: 1 }); const vp = page.getViewport({ scale: width / v1.width }); const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); await page.render({ canvasContext: ctx, viewport: vp }).promise; doc.destroy(); c.className = 'thumb'; return c;
  } catch { return null; }
}
export const readFile = f => f.arrayBuffer();
export const loadImage = file => new Promise((res, rej) => {
  const url = URL.createObjectURL(file); const img = new Image();
  img.onload = () => { img.revokeObjectURL = () => URL.revokeObjectURL(url); res(img); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não consegui abrir esta imagem')); };
  img.src = url;
});
export const canvasBlob = (c, type = 'image/png', q) => new Promise(res => c.toBlob(res, type, q));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const rand = n => { const a = new Uint32Array(1); const lim = 4294967296 - (4294967296 % n); let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim); return x % n; };
export function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ffmpeg.wasm (vídeo e áudio). O wrapper vem do próprio site; o núcleo (~30 MB) baixa uma vez de um CDN
// público e fica em cache. O arquivo do usuário nunca sai do aparelho.
const FF_CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/';
let ffPromise;
async function blobUrl(url, type) {
  const cache = await caches.open('pico-modelos').catch(() => null); let r = await cache?.match(url);
  if (!r) { const net = await fetch(url); if (!net.ok) throw new Error('Falha ao baixar o motor de vídeo'); try { await cache?.put(url, net.clone()); } catch {} r = net; }
  return URL.createObjectURL(new Blob([await r.arrayBuffer()], { type }));
}
export function loadFFmpeg(onStep) {
  return ffPromise ??= (async () => {
    const M = await import('./modulos.js'); if (!await M.garantir('video')) throw M.recusou();
    await loadScript(ROOT + 'vendor/ffmpeg.js');
    const ff = new window.FFmpegWASM.FFmpeg();
    onStep?.('Baixando o motor de vídeo (só na primeira vez, ~9 MB)…');
    const [coreURL, wasmURL] = await Promise.all([blobUrl(FF_CORE + 'ffmpeg-core.js', 'text/javascript'), blobUrl(FF_CORE + 'ffmpeg-core.wasm', 'application/wasm')]);
    await ff.load({ coreURL, wasmURL });
    return ff;
  })().catch(e => { ffPromise = null; throw e; });
}
// "1:30", "90", "0:01:30.5" → segundos
export function parseTime(s) {
  s = String(s).trim().replace(',', '.'); if (!s) return NaN;
  const p = s.split(':').map(Number); if (p.some(x => isNaN(x) || x < 0) || p.length > 3) return NaN;
  return p.reduce((a, x) => a * 60 + x, 0);
}
export function fmtTime(sec) { sec = Math.max(0, sec); const m = Math.floor(sec / 60), s = sec - m * 60; return m + ':' + s.toFixed(1).padStart(4, '0'); }
