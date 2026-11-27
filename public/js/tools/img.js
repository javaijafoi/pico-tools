import { h, panel, row, field, btn, select, check, fmtBytes, baseName, download, loadImage, canvasBlob, dlBtn, dropzone, loadJSZip, status, setStatus, progress } from '../lib.js';

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
function batch(root, { title, options = [], process, hint, accept = 'image/*', manual = false }) {
  const files = [];
  const st = status(), prog = progress();
  const results = h('ul', { class: 'files', id: 'results' });
  const made = []; // {blob,name}
  const zipBtn = btn('BAIXAR TUDO (ZIP)', async () => {
    const JSZip = await loadJSZip(); const z = new JSZip(); made.forEach(m => z.file(m.name, m.blob));
    download(await z.generateAsync({ type: 'blob' }), 'imagens.zip');
  }, 'g', { id: 'zipBtn', hidden: true });
  const go = async () => {
    if (!files.length) return setStatus(st, 'Escolha uma imagem primeiro.', 'bad');
    results.replaceChildren(); made.length = 0; zipBtn.hidden = true;
    const used = new Set();
    for (let i = 0; i < files.length; i++) {
      const f = files[i]; setStatus(st, `Processando ${i + 1}/${files.length}: ${f.name}`); if (files.length > 1) prog.set(i / files.length); else prog.busy();
      try {
        const img = await loadImage(f);
        const r = await process(img, f);
        img.revokeObjectURL?.();
        let name = r.name; if (used.has(name)) name = baseName(name) + '-' + (i + 1) + name.slice(baseName(name).length); used.add(name);
        made.push({ blob: r.blob, name });
        const url = URL.createObjectURL(r.blob);
        const delta = r.blob.size - f.size;
        const before = URL.createObjectURL(f); const fig = (cap, src) => h('figure', null, h('a', { href: src, target: '_blank', rel: 'noopener', 'aria-label': 'abrir ' + cap }, h('img', { src, alt: cap })), h('figcaption', { text: cap }));
        results.append(h('li', { class: 'res' }, h('div', { class: 'rh' }, h('span', { class: 'n', text: name }), h('span', { class: 's', text: `${fmtBytes(f.size)} → ${fmtBytes(r.blob.size)}${r.info ? ' · ' + r.info : ''}` }),
          ), h('div', { class: 'cmp' }, fig('ANTES', before), fig('DEPOIS', url)), h('div', { class: 'dl-row' }, dlBtn(r.blob, name))));
      } catch (e) { results.append(h('li', null, h('span', { class: 'n bad', text: `${f.name}: ${e.message}` }))); }
    }
    prog.hide(); setStatus(st, made.length ? 'Pronto! Baixe abaixo.' : 'Nenhuma imagem processada.', made.length ? 'ok' : 'bad');
    zipBtn.hidden = made.length < 2;
  };
  const list = h('ul', { class: 'files', id: 'filelist' });
  const draw = () => list.replaceChildren(...files.map((f, i) => h('li', null, h('img', { src: f._url ??= URL.createObjectURL(f), alt: '', class: 'mini' }), h('span', { class: 'n', text: f.name }), h('span', { class: 's', text: fmtBytes(f.size) }), h('button', { type: 'button', onclick: () => { files.splice(i, 1); draw(); } }, '✕'))));
  const go_ = btn('PROCESSAR', go, 'g', { id: 'goBtn' });
  const dz = dropzone({ accept, multiple: true, label: 'ESCOLHER IMAGENS', hint: hint || 'ou arraste aqui (várias de uma vez)', onFiles: fs => { files.push(...fs.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name))); draw(); if (files.length && !manual) go(); else if (files.length) setStatus(st, 'Imagem escolhida. Confira o tipo de imagem em AJUSTES e toque em PROCESSAR.'); } });
  root.append(panel(title, dz, list), options.length ? panel('AJUSTES', row(...options)) : '', panel('RESULTADO', go_, st, prog, results, row(zipBtn)));
  // reprocessa ao mudar ajustes
  if (!manual) options.forEach(o => o.addEventListener('input', () => { if (files.length) go(); }));
  return { prog, st };
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

  // Remove o fundo com IA no aparelho. Três modos: foto (rápido), foto (máxima qualidade) e ilustração/anime.
  // Cada modo gera uma máscara (alfa); o resultado é sempre "original × máscara", o que permite retocar com pincel.
  'remover-fundo'(root) {
    const modo = select([['foto', 'Foto (rápido)'], ['foto-max', 'Foto (máxima qualidade)'], ['anime', 'Ilustração / anime']], { id: 'modo' });
    const bg = select([['none', 'Transparente (PNG)'], ['#ffffff', 'Branco'], ['#000000', 'Preto'], ['custom', 'Outra cor…']], { id: 'bg' });
    const col = h('input', { type: 'color', id: 'col', value: '#00e436', hidden: true });
    bg.addEventListener('change', () => { col.hidden = bg.value !== 'custom'; });
    const msg = h('div', { class: 'status', id: 'modelmsg' });
    const say = (t, c = '') => { msg.className = 'status ' + c; msg.textContent = t; if (ui && t) { ui.st.className = 'status ' + c; ui.st.textContent = t; } }; // mostra também perto do botão PROCESSAR
    const IMGLY = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';
    const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/';
    const ANIME = 'https://huggingface.co/skytnt/anime-seg/resolve/main/isnetis.onnx';
    let lib, session; const states = new WeakMap(); // arquivo → { modo → { orig, mask } }

    // Etapa com cronômetro: barra animada, segundos passando e estimativa, para nunca parecer travado.
    let tick = null, ui = null;
    const fim = () => { clearInterval(tick); say(''); };
    const fase = (txt, est) => { clearInterval(tick); const t0 = Date.now(); ui?.prog.busy(); const draw = () => say(`${txt}… ${Math.round((Date.now() - t0) / 1000)} s (costuma levar ${est}). Pode demorar, a página continua funcionando.`); draw(); tick = setInterval(draw, 1000); };
    const cvs = (w, h_) => { const c = document.createElement('canvas'); c.width = w; c.height = h_; return c; };
    // Baixa o modelo com barra de progresso e guarda no cache do navegador (só baixa uma vez).
    async function fetchModel(url) {
      const cache = await caches.open('pico-modelos').catch(() => null); let r = await cache?.match(url);
      if (!r) {
        const net = await fetch(url); if (!net.ok) throw new Error('Não consegui baixar o modelo de ilustração.');
        const total = +net.headers.get('content-length') || 176069933, rd = net.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; const pc = Math.min(99, Math.round(got / total * 100)); ui?.prog.set(pc / 100); say(`Baixando o modelo (só na primeira vez): ${pc}% de ${Math.round(total / 1e6)} MB`); }
        const blob = new Blob(parts, { type: 'application/octet-stream' }); try { await cache?.put(url, new Response(blob)); } catch {} return blob.arrayBuffer();
      }
      return r.arrayBuffer();
    }
    async function animeMask(orig) {
      if (!session) {
        await new Promise((ok, no) => { if (window.ort) return ok(); const s = h('script', { src: ORT + 'ort.min.js' }); s.onload = ok; s.onerror = () => no(new Error('Falha ao carregar o motor de IA')); document.head.append(s); });
        window.ort.env.wasm.wasmPaths = ORT; window.ort.env.wasm.numThreads = 1; window.ort.env.wasm.proxy = true; // proxy: a IA roda num worker e a página não trava
        const buf = await fetchModel(ANIME); fase('Preparando o modelo', '10 a 30 s'); session = await window.ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
      }
      fase('Recortando a ilustração', '20 a 60 s');
      const S = 1024, W = orig.width, H = orig.height, k = Math.min(S / W, S / H), w = Math.round(W * k), h_ = Math.round(H * k), px = Math.floor((S - w) / 2), py = Math.floor((S - h_) / 2);
      const inC = cvs(S, S), ic = inC.getContext('2d', { willReadFrequently: true }); ic.fillStyle = '#000'; ic.fillRect(0, 0, S, S); ic.imageSmoothingQuality = 'high'; ic.drawImage(orig, px, py, w, h_);
      const d = ic.getImageData(0, 0, S, S).data, f = new Float32Array(3 * S * S);
      for (let i = 0; i < S * S; i++) { f[i] = d[i * 4] / 255; f[S * S + i] = d[i * 4 + 1] / 255; f[2 * S * S + i] = d[i * 4 + 2] / 255; }
      await new Promise(r => setTimeout(r, 30));
      const out = await session.run({ img: new window.ort.Tensor('float32', f, [1, 3, S, S]) }); const m = out.mask.data;
      const mc = cvs(S, S), mx = mc.getContext('2d'), id = mx.createImageData(S, S);
      for (let i = 0; i < S * S; i++) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.max(0, Math.min(255, (m[i] - 0.1) / 0.8 * 255)); } mx.putImageData(id, 0, 0); // curva leve acima: limpa o fiapo de fundo nas bordas
      const mask = cvs(W, H), c = mask.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(mc, px, py, w, h_, 0, 0, W, H); return mask;
    }
    async function photoMask(file, orig, model) {
      lib ??= await import(IMGLY); say('Preparando…'); ui?.prog.busy(); let rec = false; const por = {};
      const cut = await lib.removeBackground(file, { model, output: { format: 'image/png' }, progress: (k, c, t) => {
        if (/^fetch/.test(k)) { por[k] = [c, t]; let a = 0, b = 0; for (const [x, y] of Object.values(por)) { a += x; b += y; } if (b) { ui?.prog.set(a / b); say(`Baixando o modelo (só na primeira vez): ${Math.min(99, Math.round(a / b * 100))}%`); } }
        else if (!rec) { rec = true; fase('Recortando a foto', '5 a 20 s'); } } });
      const im = await loadImage(cut); const mask = cvs(orig.width, orig.height), c = mask.getContext('2d'); c.drawImage(im, 0, 0, mask.width, mask.height);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, mask.width, mask.height); return mask;
    }
    const compose = (st, fill) => { const c = cvs(st.orig.width, st.orig.height), x = c.getContext('2d'); x.drawImage(st.orig, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(st.mask, 0, 0);
      if (fill !== 'none') { x.globalCompositeOperation = 'destination-over'; x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height); } return c; };

    const editor = { files: [], sel: null }; let refresh = () => {};
    ui = batch(root, { manual: true, // só processa ao apertar PROCESSAR, para dar tempo de escolher o tipo de imagem
      title: 'IMAGENS', hint: 'pessoas, produtos, animais, desenhos… ou arraste aqui', options: [field('Tipo de imagem', modo), field('Fundo', bg), col],
      process: async (img, f) => {
        let per = states.get(f); if (!per) states.set(f, per = {});
        let st = per[modo.value];
        if (!st) {
          const M = await import('../modulos.js'); const mid = modo.value === 'anime' ? 'ia-anime' : modo.value === 'foto-max' ? 'ia-foto-max' : 'ia-foto';
          if (!await M.garantir(mid)) throw M.recusou();
          const orig = cvs(img.naturalWidth, img.naturalHeight); orig.getContext('2d').drawImage(img, 0, 0);
          let mask; try { mask = modo.value === 'anime' ? await animeMask(orig) : await photoMask(f, orig, modo.value === 'foto-max' ? 'isnet' : 'isnet_fp16'); } catch (e) { fim(); throw e; }
          st = per[modo.value] = { orig, mask, file: f }; fim();
        }
        if (!editor.files.includes(st)) editor.files.push(st); editor.sel ??= st; refresh();
        const fill = bg.value === 'custom' ? col.value : bg.value; const c = compose(st, fill);
        return { blob: await canvasBlob(c, 'image/png'), name: baseName(f.name) + '-sem-fundo.png' };
      },
    });
    root.insertBefore(panel('MODELO DE IA', msg, h('p', { class: 'note', style: 'color:#444', text: 'Você escolhe o que baixar, uma vez só: Foto (rápido) ~100 MB, Foto (máxima qualidade) ~188 MB, Ilustração / anime ~178 MB (melhor no PC). Para desenhos, anime e arte digital use "Ilustração / anime". Depois fica guardado no aparelho e a imagem nunca sai daqui.' })), root.children[1]);

    // ---- Retoque com pincel ----
    const pick = select([], { id: 'rsel' }), mode = select([['add', 'Restaurar (traz de volta)'], ['del', 'Apagar (tira)']], { id: 'rmode' });
    const size = h('input', { type: 'range', id: 'rsize', min: 4, max: 120, value: 28 });
    const cv = h('canvas', { id: 'rcv', style: 'width:100%;max-width:420px;touch-action:none;display:block;margin:8px auto;border:3px solid #000;background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/16px 16px' });
    const undos = []; let down = null;
    const rp = panel('RETOCAR COM PINCEL', h('p', { class: 'note', style: 'color:#444', text: 'Pintou errado ou faltou um pedaço? Restaure ou apague passando o dedo (ou o mouse) sobre a imagem. Depois toque em APLICAR.' }),
      row(field('Imagem', pick), field('Pincel', mode), field('Tamanho do pincel', size)), cv);
    rp.hidden = true; root.append(rp);
    const cur = () => editor.sel;
    const redraw = () => { const st = cur(); if (!st) return; const W = 420, k = W / st.orig.width; cv.width = W; cv.height = Math.max(1, Math.round(st.orig.height * k)); const c = cv.getContext('2d');
      const t = cvs(cv.width, cv.height), x = t.getContext('2d'); x.drawImage(st.orig, 0, 0, t.width, t.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(st.mask, 0, 0, t.width, t.height); c.drawImage(t, 0, 0); };
    refresh = () => { rp.hidden = !editor.files.length; pick.replaceChildren(...editor.files.map((st, i) => h('option', { value: i, text: st.file.name }))); const i = editor.files.indexOf(editor.sel); pick.value = String(Math.max(0, i)); redraw(); };
    pick.addEventListener('change', () => { editor.sel = editor.files[+pick.value]; undos.length = 0; redraw(); });
    const pos = e => { const r = cv.getBoundingClientRect(), st = cur(); return [(e.clientX - r.left) / r.width * st.orig.width, (e.clientY - r.top) / r.height * st.orig.height]; };
    const stroke = (a, b) => { const st = cur(), c = st.mask.getContext('2d'); c.save(); c.globalCompositeOperation = mode.value === 'add' ? 'source-over' : 'destination-out'; c.strokeStyle = c.fillStyle = '#fff'; c.lineCap = c.lineJoin = 'round'; c.lineWidth = +size.value * st.orig.width / 420; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.restore(); };
    cv.addEventListener('pointerdown', e => { const st = cur(); if (!st) return; cv.setPointerCapture(e.pointerId); const snap = cvs(st.mask.width, st.mask.height); snap.getContext('2d').drawImage(st.mask, 0, 0); undos.push(snap); if (undos.length > 8) undos.shift(); down = pos(e); stroke(down, down); redraw(); });
    cv.addEventListener('pointermove', e => { if (!down) return; const p = pos(e); stroke(down, p); down = p; redraw(); });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { down = null; }));
    rp.append(row(btn('DESFAZER', () => { const st = cur(), u = undos.pop(); if (!st || !u) return; const c = st.mask.getContext('2d'); c.clearRect(0, 0, st.mask.width, st.mask.height); c.drawImage(u, 0, 0); redraw(); }, '', { id: 'rundo' }), btn('APLICAR RETOQUE', () => bg.dispatchEvent(new Event('input')), 'g', { id: 'rapply' })));
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
      results.replaceChildren(h('li', { class: 'res' }, h('div', { class: 'rh' }, h('span', { class: 'n', text: name }), h('span', { class: 's', text: `${ow}×${oh} · ${fmtBytes(blob.size)}` }), ), h('div', { class: 'cmp one' }, h('figure', null, h('img', { src: URL.createObjectURL(blob), alt: 'resultado' }), h('figcaption', { text: 'RESULTADO' }))), h('div', { class: 'dl-row' }, dlBtn(blob, name, { id: 'dl' }))));
      setStatus(st, 'Pronto! Baixe abaixo.', 'ok');
    }, 'g', { id: 'goBtn' });
    const dz = dropzone({ accept: 'image/*', label: 'ESCOLHER IMAGEM', onFiles: async fs => { file = fs[0]; try { img = await loadImage(file); cx = img.naturalWidth / 2; cy = img.naturalHeight / 2; zoom.value = 100; draw(); setStatus(st, 'Arraste a área amarela para escolher o enquadramento.'); } catch (e) { setStatus(st, e.message, 'bad'); } } });
    root.append(panel('IMAGEM', dz, cv), panel('AJUSTES', row(field('Proporção', preset), field('Zoom do recorte', zoom)), row(field('Saída', outw), field('Formato', fmt))), panel('RESULTADO', goBtn, st, results));
  },
};
