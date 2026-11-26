import { h, panel, row, field, btn, select, area, fmtBytes, baseName, download, textBlob, copyBtn, dropzone, status, setStatus, progress, loadScript, loadPdfJs, canvasBlob, sleep } from '../lib.js';

// OCR com Tesseract (WebAssembly). O motor e o idioma (~4 a 5 MB no total) baixam de um CDN público na primeira vez
// e ficam em cache; a imagem ou o PDF nunca saem do aparelho.
const CDN = 'https://cdn.jsdelivr.net/';
let tess;
const loadTess = () => tess ??= loadScript(CDN + 'npm/tesseract.js@5.1.1/dist/tesseract.min.js').then(() => window.Tesseract);
async function worker(lang, onProgress) {
  const T = await loadTess();
  return T.createWorker(lang.split('+'), 1, { langPath: CDN + 'gh/naptha/tessdata@gh-pages/4.0.0_fast', logger: m => onProgress?.(m) });
}
// Baixa o motor e o idioma sem ler nada (usado pelo botão BAIXAR do painel de módulos).
export async function preparar(lang = 'por+eng', onProgress) { const w = await worker(lang, m => { if (m.progress != null) onProgress?.(m.progress); }); await w.terminate(); }
const LANGS = [['por+eng', 'Português e inglês'], ['por', 'Só português'], ['eng', 'Só inglês'], ['spa+eng', 'Espanhol e inglês']];

function ui(root, { title, accept, label, hint, run }) {
  const lang = select(LANGS, { id: 'lang' }); const st = status(), prog = progress();
  const out = area({ id: 'out', rows: 12, placeholder: 'O texto reconhecido aparece aqui.', style: 'width:100%' });
  let file = null;
  const go = btn('EXTRAIR TEXTO', async () => {
    if (!file) return setStatus(st, 'Escolha um arquivo primeiro.', 'bad');
    go.disabled = true; out.value = ''; prog.set(0);
    try {
      const M = await import('../modulos.js'); const mb = 1.4 + 0.04 + lang.value.split('+').reduce((a, l) => a + ({ por: 1.0, eng: 2.0, spa: 1.1 }[l] || 1.5), 0);
      if (!await M.garantir('ocr', { mb: Math.round(mb * 10) / 10 })) throw M.recusou();
      setStatus(st, 'Preparando o leitor de texto (só na primeira vez baixa uns ' + Math.round(mb) + ' MB)…');
      const w = await worker(lang.value, m => { if (m.status === 'recognizing text') prog.set(m.progress); });
      setStatus(st, 'Lendo…');
      const text = await run(file, w, (msg, p) => { setStatus(st, msg); if (p != null) prog.set(p); });
      await w.terminate(); out.value = text.trim(); prog.hide();
      setStatus(st, out.value ? `Pronto! ${out.value.split(/\s+/).length} palavras.` : 'Não encontrei texto nesse arquivo.', out.value ? 'ok' : 'bad');
    } catch (e) { prog.hide(); setStatus(st, e.recusa ? e.message : 'Erro: ' + e.message, 'bad'); }
    go.disabled = false;
  }, 'g', { id: 'goBtn' });
  const info = h('div', { class: 'status', id: 'info' });
  const dz = dropzone({ accept, label, hint, onFiles: fs => { file = fs[0]; info.textContent = `${file.name} · ${fmtBytes(file.size)}`; if (/^image/.test(file.type)) { const i = h('img', { src: URL.createObjectURL(file), alt: '', style: 'max-width:100%;max-height:200px;margin-top:8px;display:block' }); info.append(i); } } });
  root.append(panel(title, dz, info), panel('AJUSTES', row(field('Idioma do texto', lang))), panel('RESULTADO', go, st, prog, out, row(copyBtn(() => out.value), btn('BAIXAR .TXT', () => out.value && download(textBlob(out.value), baseName(file?.name || 'texto') + '.txt'), '', { id: 'dl' }))));
}

export const tools = {
  'extrair-texto-imagem'(root) {
    ui(root, { title: 'IMAGEM', accept: 'image/*', label: 'ESCOLHER IMAGEM', hint: 'print, foto de documento, placa, cartaz…',
      run: async (f, w) => { const r = await w.recognize(f); return r.data.text; } });
  },
  'pdf-para-texto'(root) {
    ui(root, { title: 'PDF', accept: 'application/pdf,.pdf', label: 'ESCOLHER PDF', hint: 'serve para PDF escaneado (que é só imagem)',
      run: async (f, w, say) => {
        const pj = await loadPdfJs(); const doc = await pj.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; const parts = [];
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        for (let i = 1; i <= doc.numPages; i++) {
          say(`Lendo página ${i} de ${doc.numPages}…`, (i - 1) / doc.numPages); await sleep(0);
          const page = await doc.getPage(i); const vp = page.getViewport({ scale: 2 }); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise; page.cleanup();
          const r = await w.recognize(await canvasBlob(c, 'image/png')); parts.push(doc.numPages > 1 ? `--- Página ${i} ---\n${r.data.text}` : r.data.text);
        }
        c.width = c.height = 1; doc.destroy(); return parts.join('\n');
      } });
  },
};
