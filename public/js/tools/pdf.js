import { h, panel, row, field, btn, input, select, check, fmtBytes, baseName, download, loadImage, canvasBlob, dropzone, fileList, loadPdfLib, loadPdfJs, loadJSZip, status, setStatus, progress, sleep } from '../lib.js';

const ENC_MSG = 'Este PDF tem proteção contra edição. Use a ferramenta "Comprimir PDF": ela consegue abrir e gerar uma cópia sem a trava.';
const isEnc = e => /encrypt/i.test(e?.constructor?.name + ' ' + e?.message);

// "1-3, 7, 9-" → índices (0-based). Aceita "fim"/"last".
export function parseRanges(spec, total) {
  const out = [];
  for (let part of spec.split(/[,;\s]+/).filter(Boolean)) {
    part = part.toLowerCase().replace(/fim|last|ultima|última/g, String(total));
    const m = part.match(/^(\d*)-(\d*)$/) || part.match(/^(\d+)$/);
    if (!m) throw new Error(`Não entendi "${part}". Use algo como 1-3, 7, 10-`);
    let a, b;
    if (m.length === 2) a = b = +m[1];
    else { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : total; }
    if (a < 1 || b < 1 || a > total || b > total) throw new Error(`A página ${a > total || a < 1 ? a : b} não existe (o PDF tem ${total}).`);
    if (a <= b) for (let i = a; i <= b; i++) out.push(i - 1); else for (let i = a; i >= b; i--) out.push(i - 1);
  }
  return out;
}

async function openPdf(PDFLib, file) {
  const buf = await file.arrayBuffer();
  try { return await PDFLib.PDFDocument.load(buf); }
  catch (e) { if (isEnc(e)) throw new Error(ENC_MSG); throw new Error('Não consegui abrir este PDF (arquivo corrompido?).'); }
}

// Painel de saída com lista de arquivos gerados
function outputs() {
  const ul = h('ul', { class: 'files', id: 'results' });
  const made = [];
  const zipBtn = btn('BAIXAR TUDO (ZIP)', async () => {
    const JSZip = await loadJSZip(); const z = new JSZip(); made.forEach(m => z.file(m.name, m.blob));
    download(await z.generateAsync({ type: 'blob' }), 'pdf-partes.zip');
  }, 'g', { id: 'zipBtn', hidden: true });
  const api = {
    el: h('div', null, ul, zipBtn), made,
    reset() { ul.replaceChildren(); made.length = 0; zipBtn.hidden = true; },
    add(blob, name, info = '') {
      made.push({ blob, name });
      ul.append(h('li', null, h('span', { class: 'n', text: name }), h('span', { class: 's', text: fmtBytes(blob.size) + (info ? ' · ' + info : '') }), h('button', { type: 'button', onclick: () => download(blob, name) }, '⬇')));
      zipBtn.hidden = made.length < 2;
    },
  };
  return api;
}
const pdfBlob = bytes => new Blob([bytes], { type: 'application/pdf' });

// Estrutura: um PDF de entrada, mostra nº de páginas, roda uma ação
function single(root, { title = 'PDF', options = [], action, actionLabel = 'GERAR', needPdfLib = true, auto = false }) {
  const st = status(), prog = progress(), outp = outputs();
  let file = null, PDFLib = null, pages = 0;
  const info = h('p', { class: 'note', id: 'info' });
  const run = btn(actionLabel, async () => {
    if (!file) return;
    outp.reset(); run.disabled = true;
    try { setStatus(st, 'Trabalhando…'); await action({ file, PDFLib, pages, st, prog, outp }); if (outp.made.length) setStatus(st, 'Pronto! Baixe abaixo.', 'ok'); }
    catch (e) { setStatus(st, e.message, 'bad'); }
    prog.hide(); run.disabled = false;
  }, 'g', { id: 'goBtn' });
  const dz = dropzone({ accept: 'application/pdf,.pdf', label: 'ESCOLHER PDF', onFiles: async ([f]) => {
    file = f; outp.reset(); info.textContent = ''; setStatus(st, 'Lendo…');
    try {
      if (needPdfLib) { PDFLib = await loadPdfLib(); pages = (await openPdf(PDFLib, f)).getPageCount(); }
      else { const pj = await loadPdfJs(); const d = await pj.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise.catch(e => { if (e.name === 'PasswordException') return null; throw e; }); pages = d ? d.numPages : 0; d?.destroy?.(); }
      info.textContent = `${f.name} · ${fmtBytes(f.size)}${pages ? ' · ' + pages + ' páginas' : ''}`; setStatus(st, '');
      document.dispatchEvent(new CustomEvent('pdfloaded', { detail: { pages } }));
      if (auto) run.click();
    } catch (e) { file = null; setStatus(st, e.message, 'bad'); }
  } });
  root.append(panel(title, dz, info), options.length ? panel('AJUSTES', ...options) : '', panel('RESULTADO', row(run), st, prog, outp.el));
}

export const tools = {
  'juntar-pdf'(root) {
    const files = []; const st = status(), prog = progress(), outp = outputs();
    const list = fileList(files, () => { go.disabled = files.length < 2; });
    const go = btn('JUNTAR', async () => {
      outp.reset(); go.disabled = true;
      try {
        const PDFLib = await loadPdfLib(); const merged = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          setStatus(st, `Juntando ${i + 1}/${files.length}: ${files[i].name}`); prog.set(i / files.length); await sleep(0);
          let src; try { src = await openPdf(PDFLib, files[i]); } catch (e) { throw new Error(files[i].name + ': ' + e.message); }
          (await merged.copyPages(src, src.getPageIndices())).forEach(p => merged.addPage(p));
        }
        outp.add(pdfBlob(await merged.save()), 'juntado.pdf', merged.getPageCount() + ' páginas'); setStatus(st, 'Pronto!', 'ok');
      } catch (e) { setStatus(st, e.message, 'bad'); }
      prog.hide(); go.disabled = files.length < 2;
    }, 'g', { id: 'goBtn', disabled: true });
    root.append(panel('PDFs (use ▲▼ para ordenar)', dropzone({ accept: 'application/pdf,.pdf', multiple: true, label: 'ESCOLHER PDFs', onFiles: fs => { files.push(...fs); list.redraw(); go.disabled = files.length < 2; } }), list), panel('RESULTADO', row(go), st, prog, outp.el));
  },

  'dividir-pdf'(root) {
    const mode = select([['ranges', 'Por intervalos (1-3, 4-6…)'], ['every', 'A cada N páginas'], ['each', 'Uma página por arquivo']], { id: 'mode' });
    const spec = input({ id: 'spec', placeholder: 'ex.: 1-3, 4-10, 11-', value: '' });
    const n = h('input', { type: 'number', id: 'n', value: 10, min: 1 });
    const fSpec = field('Intervalos (cada vírgula vira um arquivo)', spec), fN = field('Páginas por arquivo', n);
    const sync = () => { fSpec.hidden = mode.value !== 'ranges'; fN.hidden = mode.value !== 'every'; }; mode.addEventListener('change', sync); sync();
    single(root, {
      options: [row(field('Como dividir', mode), fSpec, fN)], actionLabel: 'DIVIDIR',
      action: async ({ file, PDFLib, pages, prog, outp }) => {
        const src = await openPdf(PDFLib, file); const base = baseName(file.name); let groups = [];
        if (mode.value === 'each') groups = Array.from({ length: pages }, (_, i) => [i]);
        else if (mode.value === 'every') { const k = Math.max(1, +n.value || 1); for (let i = 0; i < pages; i += k) groups.push(Array.from({ length: Math.min(k, pages - i) }, (_, j) => i + j)); }
        else { if (!spec.value.trim()) throw new Error('Informe os intervalos, por exemplo: 1-3, 4-10.'); groups = spec.value.split(',').map(s => s.trim()).filter(Boolean).map(s => parseRanges(s, pages)); }
        const w = String(groups.length).length;
        for (let i = 0; i < groups.length; i++) {
          prog.set(i / groups.length); await sleep(0);
          const d = await PDFLib.PDFDocument.create(); (await d.copyPages(src, groups[i])).forEach(p => d.addPage(p));
          const a = groups[i][0] + 1, b = groups[i][groups[i].length - 1] + 1;
          outp.add(pdfBlob(await d.save()), `${base}-parte-${String(i + 1).padStart(w, '0')}.pdf`, a === b ? `pág. ${a}` : `págs. ${a}-${b}`);
        }
      },
    });
  },

  'girar-pdf'(root) {
    const ang = select([['90', '90° horário'], ['180', '180°'], ['270', '90° anti-horário']], { id: 'ang' });
    const spec = input({ id: 'spec', placeholder: 'vazio = todas. Ex.: 1-3, 5' });
    single(root, {
      options: [row(field('Girar', ang), field('Páginas (opcional)', spec))], actionLabel: 'GIRAR',
      action: async ({ file, PDFLib, pages, outp }) => {
        const d = await openPdf(PDFLib, file); const idx = spec.value.trim() ? parseRanges(spec.value, pages) : d.getPageIndices();
        for (const i of new Set(idx)) { const p = d.getPage(i); p.setRotation(PDFLib.degrees((p.getRotation().angle + +ang.value) % 360)); }
        outp.add(pdfBlob(await d.save()), baseName(file.name) + '-girado.pdf', `${new Set(idx).size} página(s)`);
      },
    });
  },

  'comprimir-pdf'(root) {
    const mode = select([['raster', 'Máxima: vira imagem (perde texto selecionável)'], ['light', 'Leve: mantém texto, ganho pequeno']], { id: 'mode' });
    const dpi = select([['72', '72 dpi (menor)'], ['100', '100 dpi'], ['150', '150 dpi (melhor)']], { id: 'dpi' }); dpi.value = '100';
    const q = h('input', { type: 'range', id: 'q', min: 30, max: 90, value: 60 });
    const pw = input({ id: 'pw', placeholder: 'só se o PDF pedir senha para abrir', type: 'password' });
    single(root, {
      needPdfLib: false, actionLabel: 'COMPRIMIR',
      options: [row(field('Modo', mode), field('Resolução', dpi), field('Qualidade JPEG', q)), row(field('Senha para abrir (opcional)', pw))],
      action: async ({ file, st, prog, outp }) => {
        const PDFLib = await loadPdfLib(); const buf = await file.arrayBuffer();
        if (mode.value === 'light') {
          let d; try { d = await PDFLib.PDFDocument.load(buf); } catch (e) { if (isEnc(e)) throw new Error('Este PDF é protegido: use o modo "Máxima", que consegue abri-lo.'); throw e; }
          d.setTitle(''); d.setAuthor(''); d.setProducer(''); d.setCreator('');
          const bytes = await d.save({ useObjectStreams: true });
          outp.add(pdfBlob(bytes), baseName(file.name) + '-leve.pdf', bytes.length < file.size ? `-${Math.round((1 - bytes.length / file.size) * 100)}%` : 'sem ganho'); return;
        }
        const pj = await loadPdfJs();
        let doc; try { doc = await pj.getDocument({ data: new Uint8Array(buf), password: pw.value || undefined }).promise; } catch (e) { throw new Error(e.name === 'PasswordException' ? 'Este PDF pede senha para abrir. Digite no campo de senha.' : 'Não consegui abrir este PDF.'); }
        const out = await PDFLib.PDFDocument.create(); const scale = +dpi.value / 72; const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: false });
        for (let i = 1; i <= doc.numPages; i++) {
          setStatus(st, `Página ${i} de ${doc.numPages}…`); prog.set((i - 1) / doc.numPages); await sleep(0);
          const page = await doc.getPage(i); const vp1 = page.getViewport({ scale: 1 }); const vp = page.getViewport({ scale });
          canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise; page.cleanup();
          const jpg = await canvasBlob(canvas, 'image/jpeg', +q.value / 100); const img = await out.embedJpg(await jpg.arrayBuffer());
          const p = out.addPage([vp1.width, vp1.height]); p.drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
        }
        canvas.width = canvas.height = 1; doc.destroy();
        const bytes = await out.save();
        if (bytes.length < file.size) { outp.add(pdfBlob(bytes), baseName(file.name) + '-comprimido.pdf', `-${Math.round((1 - bytes.length / file.size) * 100)}%`); return; }
        // Virar imagem só piora PDFs de texto: nesse caso entrega a versão leve (se ganhar algo) ou o próprio arquivo.
        try {
          const d = await PDFLib.PDFDocument.load(buf); d.setTitle(''); d.setAuthor(''); d.setProducer(''); d.setCreator('');
          const lb = await d.save({ useObjectStreams: true });
          if (lb.length < file.size) { outp.add(pdfBlob(lb), baseName(file.name) + '-leve.pdf', `-${Math.round((1 - lb.length / file.size) * 100)}% · já era leve, mantive o texto`); return; }
        } catch {}
        outp.add(file, file.name, 'já estava leve: sem ganho, mantive o original');
      },
    });
  },

  'imagem-para-pdf'(root) {
    const files = []; const st = status(), prog = progress(), outp = outputs();
    const size = select([['a4', 'A4'], ['letter', 'Carta'], ['fit', 'Do tamanho da imagem']], { id: 'size' });
    const orient = select([['auto', 'Automática'], ['p', 'Retrato'], ['l', 'Paisagem']], { id: 'orient' });
    const margin = select([['0', 'Sem margem'], ['24', 'Pequena'], ['48', 'Média']], { id: 'margin' }); margin.value = '24';
    const list = fileList(files, () => { go.disabled = !files.length; });
    const go = btn('CRIAR PDF', async () => {
      outp.reset(); go.disabled = true;
      try {
        const PDFLib = await loadPdfLib(); const d = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          setStatus(st, `Imagem ${i + 1}/${files.length}`); prog.set(i / files.length); await sleep(0);
          const f = files[i]; let emb;
          const bytes = await f.arrayBuffer();
          if (f.type === 'image/jpeg') emb = await d.embedJpg(bytes);
          else if (f.type === 'image/png') emb = await d.embedPng(bytes);
          else { const img = await loadImage(f); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0); emb = await d.embedJpg(await (await canvasBlob(c, 'image/jpeg', 0.92)).arrayBuffer()); }
          const m = +margin.value; let W, H;
          if (size.value === 'fit') { W = emb.width + m * 2; H = emb.height + m * 2; }
          else { [W, H] = size.value === 'a4' ? [595.28, 841.89] : [612, 792]; const land = orient.value === 'l' || (orient.value === 'auto' && emb.width > emb.height); if (land) [W, H] = [H, W]; }
          const page = d.addPage([W, H]); const k = Math.min((W - m * 2) / emb.width, (H - m * 2) / emb.height); const w = emb.width * k, h_ = emb.height * k;
          page.drawImage(emb, { x: (W - w) / 2, y: (H - h_) / 2, width: w, height: h_ });
        }
        outp.add(pdfBlob(await d.save()), 'imagens.pdf', files.length + ' página(s)'); setStatus(st, 'Pronto!', 'ok');
      } catch (e) { setStatus(st, 'Erro: ' + e.message, 'bad'); }
      prog.hide(); go.disabled = !files.length;
    }, 'g', { id: 'goBtn', disabled: true });
    root.append(panel('IMAGENS (ordem = ordem das páginas)', dropzone({ accept: 'image/*', multiple: true, label: 'ESCOLHER IMAGENS', onFiles: fs => { files.push(...fs.filter(f => f.type.startsWith('image/'))); list.redraw(); go.disabled = !files.length; } }), list), panel('AJUSTES', row(field('Página', size), field('Orientação', orient), field('Margem', margin))), panel('RESULTADO', row(go), st, prog, outp.el));
  },

  'pdf-para-imagem'(root) {
    const fmt = select([['png', 'PNG'], ['jpg', 'JPG']], { id: 'fmt' });
    const dpi = select([['72', '72 dpi (tela)'], ['120', '120 dpi'], ['150', '150 dpi'], ['200', '200 dpi'], ['300', '300 dpi (impressão)']], { id: 'dpi' }); dpi.value = '120';
    const spec = input({ id: 'spec', placeholder: 'vazio = todas. Ex.: 1-3, 8' });
    const pw = input({ id: 'pw', type: 'password', placeholder: 'se o PDF pedir' });
    const thumbs = h('div', { class: 'thumbs', id: 'thumbs' });
    single(root, {
      needPdfLib: false, actionLabel: 'CONVERTER',
      options: [row(field('Formato', fmt), field('Resolução', dpi), field('Páginas', spec), field('Senha', pw))],
      action: async ({ file, st, prog, outp }) => {
        thumbs.replaceChildren(); const pj = await loadPdfJs(); let doc;
        try { doc = await pj.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password: pw.value || undefined }).promise; } catch (e) { throw new Error(e.name === 'PasswordException' ? 'Este PDF pede senha para abrir.' : 'Não consegui abrir este PDF.'); }
        const idx = spec.value.trim() ? parseRanges(spec.value, doc.numPages) : Array.from({ length: doc.numPages }, (_, i) => i);
        const scale = +dpi.value / 72; const c = document.createElement('canvas'); const ctx = c.getContext('2d'); const base = baseName(file.name); const w = String(doc.numPages).length;
        for (let k = 0; k < idx.length; k++) {
          setStatus(st, `Página ${idx[k] + 1} (${k + 1}/${idx.length})`); prog.set(k / idx.length); await sleep(0);
          const page = await doc.getPage(idx[k] + 1); const vp = page.getViewport({ scale }); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); await page.render({ canvasContext: ctx, viewport: vp }).promise; page.cleanup();
          const blob = await canvasBlob(c, fmt.value === 'png' ? 'image/png' : 'image/jpeg', 0.92);
          const name = `${base}-p${String(idx[k] + 1).padStart(w, '0')}.${fmt.value}`; outp.add(blob, name, `${c.width}×${c.height}`);
          if (k < 12) thumbs.append(h('figure', null, h('img', { src: URL.createObjectURL(blob), alt: 'página ' + (idx[k] + 1) }), 'pág. ' + (idx[k] + 1)));
        }
        doc.destroy();
      },
    });
    root.append(panel('PRÉVIA', thumbs));
  },

  'extrair-paginas-pdf'(root) {
    const spec = input({ id: 'spec', placeholder: 'ex.: 1-3, 7, 5   (a ordem digitada vale)' });
    const mode = select([['keep', 'Manter só estas páginas (na ordem digitada)'], ['drop', 'Remover estas páginas']], { id: 'mode' });
    const hintEl = h('p', { class: 'note', id: 'hint' });
    document.addEventListener('pdfloaded', e => { hintEl.textContent = `O PDF tem ${e.detail.pages} páginas. Dica: "3-" vai da 3 até o fim; "fim" é a última; "5-2" inverte.`; });
    single(root, {
      options: [row(field('O que fazer', mode), field('Páginas', spec)), hintEl], actionLabel: 'GERAR PDF',
      action: async ({ file, PDFLib, pages, outp }) => {
        if (!spec.value.trim()) throw new Error('Informe as páginas, por exemplo: 1-3, 7.');
        const src = await openPdf(PDFLib, file); let idx = parseRanges(spec.value, pages);
        if (mode.value === 'drop') { const s = new Set(idx); idx = src.getPageIndices().filter(i => !s.has(i)); if (!idx.length) throw new Error('Isso removeria todas as páginas.'); }
        const d = await PDFLib.PDFDocument.create(); (await d.copyPages(src, idx)).forEach(p => d.addPage(p));
        outp.add(pdfBlob(await d.save()), baseName(file.name) + '-editado.pdf', idx.length + ' página(s)');
      },
    });
  },

  'numerar-paginas-pdf'(root) {
    const what = select([['num', 'Numerar páginas'], ['mark', 'Marca d’água de texto'], ['both', 'As duas coisas']], { id: 'what' });
    const fmt = select([['n', '1, 2, 3…'], ['nt', '1 / 10'], ['pg', 'Página 1 de 10']], { id: 'fmt' });
    const pos = select([['bc', 'Embaixo, centro'], ['br', 'Embaixo, direita'], ['bl', 'Embaixo, esquerda'], ['tc', 'Em cima, centro'], ['tr', 'Em cima, direita']], { id: 'pos' });
    const start = h('input', { type: 'number', id: 'start', value: 1 });
    const text = input({ id: 'text', value: 'CONFIDENCIAL' });
    const op = h('input', { type: 'range', id: 'op', min: 5, max: 60, value: 20 });
    single(root, {
      options: [row(field('Aplicar', what)), row(field('Formato do número', fmt), field('Posição', pos), field('Começar em', start)), row(field('Texto da marca d’água', text), field('Opacidade', op))], actionLabel: 'APLICAR',
      action: async ({ file, PDFLib, pages, outp }) => {
        const d = await openPdf(PDFLib, file); const font = await d.embedFont(PDFLib.StandardFonts.Helvetica); const bold = await d.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const { rgb, degrees } = PDFLib; const doNum = what.value !== 'mark', doMark = what.value !== 'num';
        try {
          d.getPages().forEach((p, i) => {
            const { width: W, height: H } = p.getSize();
            if (doNum) {
              const n = (+start.value || 1) + i, tot = pages + (+start.value || 1) - 1;
              const s = fmt.value === 'n' ? String(n) : fmt.value === 'nt' ? `${n} / ${tot}` : `Página ${n} de ${tot}`;
              const sz = 10, tw = font.widthOfTextAtSize(s, sz); const [v, hh] = pos.value;
              p.drawText(s, { x: hh === 'c' ? (W - tw) / 2 : hh === 'r' ? W - tw - 28 : 28, y: v === 'b' ? 20 : H - 28, size: sz, font, color: rgb(0.1, 0.1, 0.1) });
            }
            if (doMark && text.value.trim()) {
              const t = text.value.trim(); const sz = Math.min(90, (Math.min(W, H) * 0.9) / (t.length * 0.62)); const tw = bold.widthOfTextAtSize(t, sz);
              const a = Math.atan2(H, W) * 0.75; const cx = W / 2, cy = H / 2;
              p.drawText(t, { x: cx - (tw / 2) * Math.cos(a), y: cy - (tw / 2) * Math.sin(a) - sz * 0.3, size: sz, font: bold, color: rgb(0.5, 0.5, 0.5), opacity: +op.value / 100, rotate: degrees(a * 180 / Math.PI) });
            }
          });
        } catch (e) { throw new Error('Algum caractere do texto não é suportado (use letras latinas, números e acentos comuns).'); }
        outp.add(pdfBlob(await d.save()), baseName(file.name) + '-marcado.pdf', pages + ' páginas');
      },
    });
  },
};
