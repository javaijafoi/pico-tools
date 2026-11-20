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

  // Remove o fundo com um modelo de IA que roda no aparelho (baixa ~40 MB uma vez e fica em cache).
  'remover-fundo'(root) {
    const bg = select([['none', 'Transparente (PNG)'], ['#ffffff', 'Branco'], ['#000000', 'Preto'], ['custom', 'Outra cor…']], { id: 'bg' });
    const col = h('input', { type: 'color', id: 'col', value: '#00e436', hidden: true });
    bg.addEventListener('change', () => { col.hidden = bg.value !== 'custom'; });
    let lib; const cuts = new WeakMap(); // o recorte por IA é a parte lenta: guarda por arquivo e só refaz o fundo ao mudar a cor
    batch(root, {
      title: 'FOTOS', hint: 'pessoas, produtos, animais… ou arraste aqui', options: [field('Fundo', bg), col],
      process: async (img, f) => {
        lib ??= await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
        let cut = cuts.get(f);
        if (!cut) { cut = await lib.removeBackground(f, { model: 'isnet_fp16', output: { format: 'image/png' } }); cuts.set(f, cut); }
        const fill = bg.value === 'custom' ? col.value : bg.value;
        if (fill === 'none') return { blob: cut, name: baseName(f.name) + '-sem-fundo.png' };
        const im = await loadImage(cut); const c = drawTo(im, im.naturalWidth, im.naturalHeight);
        const ctx = c.getContext('2d'); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = fill; ctx.fillRect(0, 0, c.width, c.height);
        return { blob: await canvasBlob(c, 'image/png'), name: baseName(f.name) + '-sem-fundo.png' };
      },
    });
    root.append(h('p', { class: 'note', style: 'color:var(--lgray)', text: 'Na primeira vez o modelo de IA (~40 MB) é baixado e guardado no aparelho. A foto em si nunca sai daqui.' }));
  },

  // Recorte com proporções prontas para redes sociais: arraste a área e use o zoom.
  'recortar-imagem'(root) {
    const PRESETS = [['1', '1:1 · Perfil e feed quadrado'], ['0.8', '4:5 · Feed do Instagram'], ['0.5625', '9:16 · Stories, Reels e TikTok'], ['1.7778', '16:9 · YouTube e capa'], ['1.5', '3:2 · Foto clássica'], ['1.91', '1,91:1 · Link no Facebook e LinkedIn'], ['3', '3:1 · Capa do X/Twitter'], ['0.75', '3:4 · Retrato']];
    const preset = select(PRESETS, { id: 'preset' });
    const zoom = h('input', { type: 'range', id: 'zoom', min: 10, max: 100, value: 100 });
    const outw = select([['0', 'Tamanho original do recorte'], ['1080', 'Largura 1080 px'], ['720', 'Largura 720 px']], { id: 'outw' });
    const fmt = select([['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], { id: 'fmt' });
    const st = status(); const cv = h('canvas', { id: 'cv', style: 'width:100%;max-width:420px;touch-action:none;background:#000;display:block;margin:8px auto' });
    const results = h('ul', { class: 'files', id: 'results' });
    let img = null, file = null, cx = 0, cy = 0; // centro do recorte em px da imagem
    const dims = () => { const r = +preset.value; let w = Math.min(img.naturalWidth, img.naturalHeight * r); let h_ = w / r; const k = zoom.value / 100; return [w * k, h_ * k]; };
    const clamp = () => { const [w, h_] = dims(); cx = Math.min(Math.max(cx, w / 2), img.naturalWidth - w / 2); cy = Math.min(Math.max(cy, h_ / 2), img.naturalHeight - h_ / 2); };
    const draw = () => {
      if (!img) return; clamp(); const [w, h_] = dims(); const W = 420, k = W / img.naturalWidth; cv.width = W; cv.height = Math.round(img.naturalHeight * k);
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, cv.width, cv.height); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, cv.width, cv.height);
      const x = (cx - w / 2) * k, y = (cy - h_ / 2) * k; c.drawImage(img, cx - w / 2, cy - h_ / 2, w, h_, x, y, w * k, h_ * k); c.strokeStyle = '#ffec27'; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, w * k - 3, h_ * k - 3);
    };
    let drag = null;
    cv.addEventListener('pointerdown', e => { if (!img) return; cv.setPointerCapture(e.pointerId); drag = [e.clientX, e.clientY, cx, cy]; });
    cv.addEventListener('pointermove', e => { if (!drag) return; const k = img.naturalWidth / cv.getBoundingClientRect().width; cx = drag[2] + (e.clientX - drag[0]) * k; cy = drag[3] + (e.clientY - drag[1]) * k; draw(); });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { drag = null; }));
    [preset, zoom].forEach(el => el.addEventListener('input', draw));
    const goBtn = btn('RECORTAR', async () => {
      if (!img) return setStatus(st, 'Escolha uma imagem primeiro.', 'bad');
      const [w, h_] = dims(); const ow = +outw.value ? Math.min(+outw.value, Math.round(w)) : Math.round(w); const oh = Math.round(ow * h_ / w);
      const c = document.createElement('canvas'); c.width = ow; c.height = oh; const x = c.getContext('2d'); if (fmt.value === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, ow, oh); } x.imageSmoothingQuality = 'high';
      x.drawImage(img, cx - w / 2, cy - h_ / 2, w, h_, 0, 0, ow, oh);
      const blob = await canvasBlob(c, fmt.value, 0.92); const name = baseName(file.name) + `-${ow}x${oh}.` + EXT[blob.type || fmt.value];
      results.replaceChildren(h('li', null, h('img', { src: URL.createObjectURL(blob), alt: '', style: 'width:44px;height:44px;object-fit:cover;border:2px solid #000' }), h('span', { class: 'n', text: name }), h('span', { class: 's', text: `${ow}×${oh} · ${fmtBytes(blob.size)}` }), h('button', { type: 'button', id: 'dl', onclick: () => download(blob, name) }, '⬇')));
      setStatus(st, 'Pronto! Baixe abaixo.', 'ok');
    }, 'g', { id: 'goBtn' });
    const dz = dropzone({ accept: 'image/*', label: 'ESCOLHER IMAGEM', onFiles: async fs => { file = fs[0]; try { img = await loadImage(file); cx = img.naturalWidth / 2; cy = img.naturalHeight / 2; zoom.value = 100; draw(); setStatus(st, 'Arraste a área amarela para escolher o enquadramento.'); } catch (e) { setStatus(st, e.message, 'bad'); } } });
    root.append(panel('IMAGEM', dz, cv), panel('AJUSTES', row(field('Proporção', preset), field('Zoom do recorte', zoom)), row(field('Saída', outw), field('Formato', fmt))), panel('RESULTADO', goBtn, st, results));
  },
};
