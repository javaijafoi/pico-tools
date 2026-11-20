import { h, panel, row, field, btn, select, check, fmtBytes, baseName, download, loadImage, canvasBlob, dropzone, loadJSZip, status, setStatus, progress } from '../lib.js';

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

function drawTo(img, w, h_, { flatten = false } = {}) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h_));
  const ctx = c.getContext('2d');
  if (flatten) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// Estrutura comum: escolher imagens, processar, listar resultados com download individual e ZIP.
function batch(root, { title, options = [], process, hint, accept = 'image/*' }) {
  const files = [];
  const st = status(), prog = progress();
  const results = h('ul', { class: 'files', id: 'results' });
  const made = []; // {blob,name}
  const zipBtn = btn('BAIXAR TUDO (ZIP)', async () => {
    const JSZip = await loadJSZip(); const z = new JSZip(); made.forEach(m => z.file(m.name, m.blob));
    download(await z.generateAsync({ type: 'blob' }), 'imagens.zip');
  }, 'g', { id: 'zipBtn', hidden: true });
  const go = async () => {
    if (!files.length) return;
    results.replaceChildren(); made.length = 0; zipBtn.hidden = true;
    const used = new Set();
    for (let i = 0; i < files.length; i++) {
      const f = files[i]; setStatus(st, `Processando ${i + 1}/${files.length}: ${f.name}`); prog.set(i / files.length);
      try {
        const img = await loadImage(f);
        const r = await process(img, f);
        img.revokeObjectURL?.();
        let name = r.name; if (used.has(name)) name = baseName(name) + '-' + (i + 1) + name.slice(baseName(name).length); used.add(name);
        made.push({ blob: r.blob, name });
        const url = URL.createObjectURL(r.blob);
        const delta = r.blob.size - f.size;
        results.append(h('li', null, h('img', { src: url, alt: '', style: 'width:44px;height:44px;object-fit:cover;border:2px solid #000;image-rendering:auto' }),
          h('span', { class: 'n', text: name }), h('span', { class: 's', text: `${fmtBytes(f.size)} → ${fmtBytes(r.blob.size)}${r.info ? ' · ' + r.info : ''}` }),
          h('button', { type: 'button', onclick: () => download(r.blob, name) }, '⬇')));
      } catch (e) { results.append(h('li', null, h('span', { class: 'n bad', text: `${f.name}: ${e.message}` }))); }
    }
    prog.hide(); setStatus(st, made.length ? 'Pronto! Baixe abaixo.' : 'Nenhuma imagem processada.', made.length ? 'ok' : 'bad');
    zipBtn.hidden = made.length < 2;
  };
  const list = h('ul', { class: 'files', id: 'filelist' });
  const draw = () => list.replaceChildren(...files.map((f, i) => h('li', null, h('span', { class: 'n', text: f.name }), h('span', { class: 's', text: fmtBytes(f.size) }), h('button', { type: 'button', onclick: () => { files.splice(i, 1); draw(); } }, '✕'))));
  const go_ = btn('PROCESSAR', go, 'g', { id: 'goBtn' });
  const dz = dropzone({ accept, multiple: true, label: 'ESCOLHER IMAGENS', hint: hint || 'ou arraste aqui (várias de uma vez)', onFiles: fs => { files.push(...fs.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name))); draw(); if (files.length) go(); } });
  root.append(panel(title, dz, list), options.length ? panel('AJUSTES', row(...options)) : '', panel('RESULTADO', go_, st, prog, results, row(zipBtn)));
  // reprocessa ao mudar ajustes
  options.forEach(o => o.addEventListener('input', () => { if (files.length) go(); }));
}

export const tools = {
  'converter-imagem'(root) {
    const fmt = select([['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], { id: 'fmt' });
    const q = h('input', { type: 'range', id: 'q', min: 40, max: 100, value: 90 });
    batch(root, {
      title: 'IMAGENS', options: [field('Converter para', fmt), field('Qualidade (JPG/WebP)', q)],
      process: async (img, f) => { const type = fmt.value; const c = drawTo(img, img.naturalWidth, img.naturalHeight, { flatten: type === 'image/jpeg' }); const blob = await canvasBlob(c, type, +q.value / 100); if (!blob || blob.type !== type) throw new Error('Este navegador não gera ' + EXT[type].toUpperCase()); return { blob, name: baseName(f.name) + '.' + EXT[type], info: `${c.width}×${c.height}` }; },
    });
  },

  'comprimir-imagem'(root) {
    const q = h('input', { type: 'range', id: 'q', min: 10, max: 95, value: 70 });
    const mx = h('input', { type: 'number', id: 'max', min: 0, placeholder: 'sem limite', value: '' });
    batch(root, {
      title: 'IMAGENS', options: [field('Qualidade (menor = mais leve)', q), field('Lado máximo em px (opcional)', mx)],
      process: async (img, f) => {
        let w = img.naturalWidth, h_ = img.naturalHeight; const m = +mx.value;
        if (m > 0 && Math.max(w, h_) > m) { const k = m / Math.max(w, h_); w *= k; h_ *= k; }
        const png = f.type === 'image/png';
        let type = png ? 'image/webp' : 'image/jpeg';
        if (png && !/\.png$/i.test(f.name)) type = 'image/jpeg';
        // PNG vira WebP (mantém transparência); JPG segue JPG
        const c = drawTo(img, w, h_, { flatten: type === 'image/jpeg' });
        let blob = await canvasBlob(c, type, +q.value / 100);
        if (!blob || blob.type !== type) { type = 'image/jpeg'; blob = await canvasBlob(drawTo(img, w, h_, { flatten: true }), type, +q.value / 100); }
        if (blob.size >= f.size && !(m > 0)) blob = f; // não piora
        return { blob, name: baseName(f.name) + (blob === f ? '' : '-leve') + '.' + (blob === f ? (f.name.split('.').pop()) : EXT[type]), info: blob === f ? 'já estava leve' : `-${Math.round((1 - blob.size / f.size) * 100)}%` };
      },
    });
  },

  'redimensionar-imagem'(root) {
    const mode = select([['px', 'Largura em pixels'], ['pct', 'Porcentagem'], ['box', 'Caber em caixa LxA']], { id: 'mode' });
    const a = h('input', { type: 'number', id: 'a', value: 1280, min: 1 }), b = h('input', { type: 'number', id: 'b', value: 720, min: 1 });
    const fmt = select([['keep', 'Manter formato'], ['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], { id: 'fmt' });
    const la = field('Largura / % / caixa L', a), lb = field('Altura (só no modo caixa)', b);
    batch(root, {
      title: 'IMAGENS', options: [field('Modo', mode), la, lb, field('Formato', fmt)],
      process: async (img, f) => {
        const W = img.naturalWidth, H = img.naturalHeight; let w, h_;
        if (mode.value === 'px') { w = +a.value || W; h_ = H * w / W; }
        else if (mode.value === 'pct') { const k = (+a.value || 100) / 100; w = W * k; h_ = H * k; }
        else { const k = Math.min((+a.value || W) / W, (+b.value || H) / H); w = W * k; h_ = H * k; }
        let type = fmt.value === 'keep' ? (EXT[f.type] ? f.type : 'image/png') : fmt.value;
        const c = drawTo(img, w, h_, { flatten: type === 'image/jpeg' });
        const blob = await canvasBlob(c, type, 0.92);
        return { blob, name: baseName(f.name) + `-${c.width}x${c.height}.` + EXT[blob.type || type], info: `${c.width}×${c.height}` };
      },
    });
  },

  'remover-metadados-imagem'(root) {
    batch(root, {
      title: 'FOTOS', options: [],
      hint: 'A foto é redesenhada do zero, o que apaga GPS, modelo da câmera e data.',
      process: async (img, f) => {
        const type = f.type === 'image/png' ? 'image/png' : f.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const c = drawTo(img, img.naturalWidth, img.naturalHeight, { flatten: type === 'image/jpeg' });
        const blob = await canvasBlob(c, type, 0.95);
        return { blob, name: baseName(f.name) + '-limpa.' + EXT[blob.type || type], info: 'sem metadados' };
      },
    });
    root.append(h('p', { class: 'note', style: 'color:var(--lgray)', text: 'Dica: confira no seu celular (detalhes da foto) que a localização sumiu. Se você enviar a foto por apps como WhatsApp, eles já removem boa parte desses dados, mas outros canais não.' }));
  },
};
