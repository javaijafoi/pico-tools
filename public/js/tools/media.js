import { h, panel, row, field, btn, select, fmtBytes, baseName, download, dropzone, status, setStatus, progress, loadFFmpeg, parseTime, fmtTime } from '../lib.js';

// Estrutura comum: escolher um arquivo de vídeo/áudio, ajustar, rodar o ffmpeg no navegador, baixar.
function job(root, { kind, title, options = [], run, trim = false, hint }) {
  let file = null, dur = 0;
  const st = status(), prog = progress();
  const media = h(kind === 'audio' ? 'audio' : 'video', { controls: true, playsinline: true, preload: 'metadata', hidden: true, id: 'preview', style: 'width:100%;max-height:260px;margin-top:8px;background:#000' });
  const info = h('div', { class: 'status', id: 'info' });
  const tIn = h('input', { type: 'text', id: 'ini', value: '0:00', inputmode: 'decimal', autocomplete: 'off' });
  const tOut = h('input', { type: 'text', id: 'fim', value: '', placeholder: 'fim', inputmode: 'decimal', autocomplete: 'off' });
  const trimRow = trim ? row(field('Início (m:ss ou segundos)', tIn), field('Fim', tOut)) : null;
  const result = h('div', { id: 'results' });
  const goBtn = btn('PROCESSAR', async () => {
    if (!file) return setStatus(st, 'Escolha um arquivo primeiro.', 'bad');
    let t0 = 0, t1 = dur;
    if (trim) {
      t0 = parseTime(tIn.value || '0'); t1 = tOut.value.trim() ? parseTime(tOut.value) : dur;
      if (isNaN(t0) || isNaN(t1)) return setStatus(st, 'Tempo inválido. Use 1:30 ou 90.', 'bad');
      if (dur && t1 > dur) t1 = dur;
      if (t1 <= t0) return setStatus(st, 'O fim precisa ser maior que o início.', 'bad');
    }
    goBtn.disabled = true; result.replaceChildren(); prog.set(0);
    try {
      const ff = await loadFFmpeg(m => setStatus(st, m));
      const onProg = ({ progress: p }) => { if (p >= 0 && p <= 1) prog.set(p); };
      ff.on('progress', onProg);
      const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, 'bin'])[1].toLowerCase();
      const inName = 'in.' + ext;
      setStatus(st, 'Processando no seu aparelho… pode demorar com arquivos grandes.');
      await ff.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
      const { args, outName, mime } = run({ inName, t0, t1, dur, file });
      let code = await ff.exec(args);
      ff.off('progress', onProg);
      if (code !== 0) throw new Error('o ffmpeg não conseguiu processar este arquivo');
      const data = await ff.readFile(outName);
      await ff.deleteFile(inName).catch(() => {}); await ff.deleteFile(outName).catch(() => {});
      const blob = new Blob([data], { type: mime }); const name = baseName(file.name) + '-' + outName;
      const url = URL.createObjectURL(blob);
      const out = h(kind === 'audio' || /^audio/.test(mime) ? 'audio' : /^image/.test(mime) ? 'img' : 'video', { src: url, controls: true, style: 'width:100%;max-height:260px;margin-top:8px' });
      result.replaceChildren(out, h('ul', { class: 'files' }, h('li', null, h('span', { class: 'n', text: name }), h('span', { class: 's', text: `${fmtBytes(file.size)} → ${fmtBytes(blob.size)}` }), h('button', { type: 'button', id: 'dl', onclick: () => download(blob, name) }, '⬇'))));
      prog.hide(); setStatus(st, 'Pronto! Baixe abaixo.', 'ok');
    } catch (e) { prog.hide(); setStatus(st, e.recusa ? e.message : 'Erro: ' + e.message, 'bad'); }
    goBtn.disabled = false;
  }, 'g', { id: 'goBtn' });
  const pick = f => {
    file = f; media.hidden = false; media.src = URL.createObjectURL(f);
    media.onloadedmetadata = () => { dur = isFinite(media.duration) ? media.duration : 0; info.textContent = `${f.name} · ${fmtBytes(f.size)}${dur ? ' · ' + fmtTime(dur) : ''}`; if (trim && !tOut.value) tOut.value = dur ? dur.toFixed(1) : ''; };
    media.onerror = () => { info.textContent = `${f.name} · ${fmtBytes(f.size)} (prévia indisponível, mas dá para tentar)`; };
    if (f.size > 1.5 * 1024 ** 3) setStatus(st, 'Arquivo muito grande: o navegador pode ficar sem memória.', 'bad');
  };
  const dz = dropzone({ accept: kind === 'audio' ? 'audio/*,video/*' : 'video/*', label: kind === 'audio' ? 'ESCOLHER ÁUDIO' : 'ESCOLHER VÍDEO', hint, onFiles: fs => pick(fs[0]) });
  root.append(panel(title, dz, info, media), options.length || trim ? panel('AJUSTES', trimRow, options.length ? row(...options) : null) : '', panel('RESULTADO', goBtn, st, prog, result));
}

const q = (id, opts) => select(opts, { id });

export const tools = {
  'comprimir-video'(root) {
    const lvl = q('lvl', [['28', 'Equilibrado (bem menor)'], ['32', 'Bem leve (menor ainda)'], ['23', 'Alta qualidade']]);
    const res = q('res', [['0', 'Manter tamanho'], ['1080', 'Até 1080p'], ['720', 'Até 720p'], ['480', 'Até 480p']]);
    job(root, { kind: 'video', title: 'VÍDEO', options: [field('Qualidade', lvl), field('Resolução', res)],
      run: ({ inName }) => ({ outName: 'leve.mp4', mime: 'video/mp4', args: ['-i', inName, ...(+res.value ? ['-vf', `scale=-2:'min(${res.value},ih)'`] : ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2']), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', lvl.value, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'leve.mp4'] }) });
  },
  'cortar-video'(root) {
    const mode = q('mode', [['copy', 'Rápido (sem recodificar, corte aproximado)'], ['exact', 'Preciso (recodifica, mais lento)']]);
    job(root, { kind: 'video', title: 'VÍDEO', trim: true, options: [field('Modo', mode)],
      run: ({ inName, t0, t1, file }) => { const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, 'mp4'])[1].toLowerCase(); const o = mode.value === 'copy' ? 'corte.' + ext : 'corte.mp4';
        return { outName: o, mime: 'video/' + (o.endsWith('mp4') ? 'mp4' : ext), args: mode.value === 'copy' ? ['-ss', String(t0), '-to', String(t1), '-i', inName, '-c', 'copy', '-avoid_negative_ts', 'make_zero', o] : ['-ss', String(t0), '-to', String(t1), '-i', inName, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', o] }; } });
  },
  'video-para-gif'(root) {
    const fps = q('fps', [['10', '10 quadros/s'], ['15', '15 quadros/s'], ['6', '6 quadros/s (mais leve)']]);
    const w = q('w', [['480', '480 px de largura'], ['320', '320 px (mais leve)'], ['640', '640 px']]);
    job(root, { kind: 'video', title: 'VÍDEO', trim: true, hint: 'use trechos curtos (até 15 s)', options: [field('Fluidez', fps), field('Largura', w)],
      run: ({ inName, t0, t1 }) => ({ outName: 'animacao.gif', mime: 'image/gif', args: ['-ss', String(t0), '-to', String(Math.min(t1, t0 + 30)), '-i', inName, '-vf', `fps=${fps.value},scale=${w.value}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`, '-loop', '0', 'animacao.gif'] }) });
  },
  'extrair-audio'(root) {
    const fmt = q('fmt', [['mp3', 'MP3'], ['wav', 'WAV (sem perda)'], ['m4a', 'M4A (AAC)']]);
    job(root, { kind: 'video', title: 'VÍDEO', options: [field('Formato', fmt)],
      run: ({ inName }) => { const f = fmt.value; const o = 'audio.' + f; const codec = f === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', '192k'] : f === 'm4a' ? ['-c:a', 'aac', '-b:a', '192k'] : [];
        return { outName: o, mime: f === 'mp3' ? 'audio/mpeg' : f === 'wav' ? 'audio/wav' : 'audio/mp4', args: ['-i', inName, '-vn', ...codec, o] }; } });
  },
  'cortar-audio'(root) {
    const fmt = q('fmt', [['mp3', 'MP3'], ['wav', 'WAV (sem perda)'], ['m4a', 'M4A (AAC)']]);
    job(root, { kind: 'audio', title: 'ÁUDIO', trim: true, options: [field('Salvar como', fmt)],
      run: ({ inName, t0, t1 }) => { const f = fmt.value; const o = 'corte.' + f; const codec = f === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', '192k'] : f === 'm4a' ? ['-c:a', 'aac', '-b:a', '192k'] : [];
        return { outName: o, mime: f === 'mp3' ? 'audio/mpeg' : f === 'wav' ? 'audio/wav' : 'audio/mp4', args: ['-ss', String(t0), '-to', String(t1), '-i', inName, '-vn', ...codec, o] }; } });
  },
};
