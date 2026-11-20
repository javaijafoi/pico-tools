import { h, panel, row, field, btn, input, area, select, check, out, copyBtn, copyText, dropzone, download, textBlob, fmtBytes, toast } from '../lib.js';

const $ = id => document.getElementById(id);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64enc = bytes => { let s = ''; const c = 0x8000; for (let i = 0; i < bytes.length; i += c) s += String.fromCharCode.apply(null, bytes.subarray(i, i + c)); return btoa(s); };
const b64dec = str => { const s = atob(str.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const pad = n => String(n).padStart(2, '0');

function sortKeys(v) { if (Array.isArray(v)) return v.map(sortKeys); if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])); return v; }

export function hexToRgb(s) { let m = s.trim().replace(/^#/, ''); if (m.length === 3) m = [...m].map(c => c + c).join(''); if (!/^[0-9a-f]{6}$/i.test(m)) return null; return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)); }
export function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)]; }
export function hslToRgb([hh, s, l]) { s /= 100; l /= 100; const k = n => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map(x => Math.round(x * 255)); }
const toHex = rgb => '#' + rgb.map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('').toUpperCase();

export const tools = {
  'formatador-json'(root) {
    const inp = area({ id: 'in', rows: 10, class: 'mono', placeholder: '{"nome":"Peter","itens":[1,2,3]}' });
    const o = out('out'), st = h('p', { class: 'status', id: 'st' }); const ind = select([['2', '2 espaços'], ['4', '4 espaços'], ['t', 'Tab']], { id: 'ind' }); const sk = check('Ordenar chaves', false, () => {}, 'sk');
    const run = mode => {
      if (!inp.value.trim()) { o.textContent = ''; st.textContent = ''; return; }
      try {
        let v = JSON.parse(inp.value); if (sk.querySelector('input').checked) v = sortKeys(v);
        o.textContent = mode === 'min' ? JSON.stringify(v) : JSON.stringify(v, null, ind.value === 't' ? '\t' : +ind.value);
        st.className = 'status ok'; st.textContent = 'JSON válido ✔';
      } catch (e) {
        const m = /position (\d+)/.exec(e.message); let where = '';
        if (m) { const p = +m[1], before = inp.value.slice(0, p); where = ` (linha ${before.split('\n').length}, coluna ${p - before.lastIndexOf('\n')})`; }
        st.className = 'status bad'; st.textContent = 'JSON inválido: ' + e.message + where; o.textContent = '';
      }
    };
    root.append(panel('JSON', inp, row(field('Indentação', ind), sk), row(btn('FORMATAR', () => run('fmt'), 'g', { id: 'fmtBtn' }), btn('MINIFICAR', () => run('min'), 'b', { id: 'minBtn' }), btn('LIMPAR', () => { inp.value = ''; run(); }, 'w'))), panel('RESULTADO', st, o, row(copyBtn(() => o.textContent))));
    inp.addEventListener('input', () => run('fmt'));
  },

  'base64'(root) {
    const inp = area({ id: 'in', rows: 6, class: 'mono', placeholder: 'Texto ou Base64' }), o = out('out'), st = h('p', { class: 'status', id: 'st' });
    const urlsafe = check('Formato URL-safe (- e _)', false, () => {}, 'url');
    const enc = () => { try { let s = b64enc(new TextEncoder().encode(inp.value)); if (urlsafe.querySelector('input').checked) s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); o.textContent = s; st.textContent = ''; } catch (e) { st.className = 'status bad'; st.textContent = e.message; } };
    const dec = () => { try { o.textContent = new TextDecoder('utf-8', { fatal: true }).decode(b64dec(inp.value)); st.textContent = ''; } catch { st.className = 'status bad'; st.textContent = 'Base64 inválido (ou não é texto UTF-8).'; o.textContent = ''; } };
    const fileOut = out('fout'), fst = h('p', { class: 'status', id: 'fst' }); let lastB64 = '';
    root.append(panel('TEXTO', inp, urlsafe, row(btn('CODIFICAR →', enc, 'g', { id: 'encBtn' }), btn('← DECODIFICAR', dec, 'b', { id: 'decBtn' }))), panel('RESULTADO', st, o, row(copyBtn(() => o.textContent))),
      panel('ARQUIVO PARA BASE64', dropzone({ label: 'ESCOLHER ARQUIVO', accept: '*/*', onFiles: async ([f]) => { const bytes = new Uint8Array(await f.arrayBuffer()); lastB64 = b64enc(bytes); fst.textContent = `${f.name}: ${fmtBytes(f.size)} → ${fmtBytes(lastB64.length)} em Base64`; fileOut.textContent = lastB64.length > 20000 ? lastB64.slice(0, 20000) + '… (cortado na tela; use COPIAR para pegar tudo)' : lastB64; } }), fst, fileOut, row(copyBtn(() => lastB64, 'COPIAR TUDO'), btn('BAIXAR .TXT', () => lastB64 && download(textBlob(lastB64), 'base64.txt'), 'w'))));
  },

  'codificar-url'(root) {
    const inp = area({ id: 'in', rows: 4, class: 'mono', placeholder: 'https://exemplo.com/busca?q=olá mundo&x=1' }), o = out('out'), tbl = h('div', { class: 'out', id: 'params', style: 'font-size:20px' });
    const full = check('Preservar : / ? & = # (URL inteira)', false, () => {}, 'full');
    const enc = () => { o.textContent = full.querySelector('input').checked ? encodeURI(inp.value) : encodeURIComponent(inp.value); params(); };
    const dec = () => { try { o.textContent = decodeURIComponent(inp.value.replace(/\+/g, ' ')); } catch { o.textContent = 'Sequência % inválida.'; } params(); };
    const params = () => { try { const u = new URL(inp.value.trim()); const e = [...u.searchParams.entries()]; tbl.textContent = e.length ? e.map(([k, v]) => `${k} = ${v}`).join('\n') : 'Sem parâmetros.'; } catch { tbl.textContent = ''; } };
    inp.addEventListener('input', params);
    root.append(panel('TEXTO OU URL', inp, full, row(btn('CODIFICAR', enc, 'g', { id: 'encBtn' }), btn('DECODIFICAR', dec, 'b', { id: 'decBtn' }))), panel('RESULTADO', o, row(copyBtn(() => o.textContent))), panel('PARÂMETROS DA URL', tbl));
  },

  'gerador-de-hash'(root) {
    const inp = area({ id: 'in', rows: 4, class: 'mono', placeholder: 'Texto para calcular o hash' }); const o = h('div', { class: 'out', id: 'out', style: 'font-size:20px' });
    const ALG = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    const show = async data => { const lines = []; for (const a of ALG) lines.push(a.padEnd(8) + ': ' + hex(await crypto.subtle.digest(a, data))); o.textContent = lines.join('\n'); };
    const run = () => show(new TextEncoder().encode(inp.value)); inp.addEventListener('input', run);
    const cmp = input({ id: 'cmp', placeholder: 'Cole um hash para comparar' }), cres = h('p', { class: 'status', id: 'cres' });
    cmp.addEventListener('input', () => { const t = cmp.value.trim().toLowerCase(); if (!t) { cres.textContent = ''; return; } const hit = o.textContent.split('\n').find(l => l.split(': ')[1] === t); cres.className = 'status ' + (hit ? 'ok' : 'bad'); cres.textContent = hit ? `Confere com ${hit.split(':')[0].trim()} ✔` : 'Não confere com nenhum.'; });
    root.append(panel('TEXTO', inp), panel('ARQUIVO', dropzone({ label: 'ESCOLHER ARQUIVO', accept: '*/*', onFiles: async ([f]) => { o.textContent = 'Calculando…'; await show(await f.arrayBuffer()); toast(f.name); } })), panel('HASHES', o, row(copyBtn(() => o.textContent)), field('Comparar', cmp), cres));
    run();
  },

  'conversor-de-cores'(root) {
    const pick = h('input', { type: 'color', id: 'pick', value: '#ff77a8' }), hx = input({ id: 'hex', value: '#FF77A8' }), rgb = input({ id: 'rgb', value: '255, 119, 168' }), hsl = input({ id: 'hsl', value: '340, 100%, 73%' });
    const sw = h('div', { class: 'swatch', id: 'sw' }), css = h('div', { class: 'out', id: 'css', style: 'font-size:20px' });
    const set = (r, src) => {
      if (!r) return; const [R, G, B] = r; sw.style.background = toHex(r); const H = rgbToHsl(r);
      if (src !== 'pick') pick.value = toHex(r).toLowerCase(); if (src !== 'hex') hx.value = toHex(r); if (src !== 'rgb') rgb.value = `${R}, ${G}, ${B}`; if (src !== 'hsl') hsl.value = `${H[0]}, ${H[1]}%, ${H[2]}%`;
      css.textContent = `${toHex(r)}\nrgb(${R}, ${G}, ${B})\nhsl(${H[0]}, ${H[1]}%, ${H[2]}%)`;
    };
    pick.addEventListener('input', () => set(hexToRgb(pick.value), 'pick')); hx.addEventListener('input', () => set(hexToRgb(hx.value), 'hex'));
    rgb.addEventListener('input', () => { const m = rgb.value.match(/\d+/g); if (m && m.length >= 3) set(m.slice(0, 3).map(Number).map(x => Math.min(255, x)), 'rgb'); });
    hsl.addEventListener('input', () => { const m = hsl.value.match(/-?\d+(\.\d+)?/g); if (m && m.length >= 3) set(hslToRgb(m.slice(0, 3).map(Number)), 'hsl'); });
    root.append(panel('COR', sw, row(field('Seletor', pick), field('HEX', hx)), row(field('RGB', rgb), field('HSL', hsl))), panel('CSS', css, row(copyBtn(() => css.textContent))));
    set(hexToRgb('#ff77a8'));
  },

  'conversor-de-timestamp'(root) {
    const ts = input({ id: 'ts', value: String(Math.floor(Date.now() / 1000)), inputmode: 'numeric' }), o = h('div', { class: 'out', id: 'out' });
    const dt = h('input', { type: 'datetime-local', id: 'dt', step: 1 }), o2 = h('div', { class: 'out', id: 'out2' });
    const ft = d => `Local:  ${d.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })}\nUTC:    ${d.toISOString()}\nSegundos: ${Math.floor(d / 1000)}\nMilissegundos: ${d.getTime()}`;
    const run = () => { const raw = ts.value.trim(); if (!/^-?\d+$/.test(raw)) { o.textContent = raw ? 'Digite só números.' : ''; return; } let n = +raw; const ms = Math.abs(n) > 1e11 ? n : n * 1000; const d = new Date(ms); o.textContent = isNaN(d) ? 'Valor fora do intervalo.' : (Math.abs(n) > 1e11 ? '(lido como milissegundos)\n' : '(lido como segundos)\n') + ft(d); };
    const run2 = () => { if (!dt.value) { o2.textContent = ''; return; } o2.textContent = ft(new Date(dt.value)); };
    const now = new Date(); dt.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    ts.addEventListener('input', run); dt.addEventListener('input', run2);
    root.append(panel('TIMESTAMP → DATA', field('Unix timestamp (s ou ms)', ts), row(btn('AGORA', () => { ts.value = Math.floor(Date.now() / 1000); run(); }, 'g')), o), panel('DATA → TIMESTAMP', field('Data e hora locais', dt), o2));
    run(); run2();
  },

  'testador-regex'(root) {
    const re = input({ id: 're', placeholder: 'expressão, ex.: (\\d{3})-(\\d{4})', value: '(\\w+)@(\\w+)\\.com' }), fl = input({ id: 'flags', value: 'g', style: 'max-width:100px' });
    const txt = area({ id: 'in', rows: 6, class: 'mono', value: 'contato: ana@exemplo.com, bruno@teste.com' }), rep = input({ id: 'rep', placeholder: 'substituir por, ex.: $1 em $2' });
    const hl = h('div', { class: 'out', id: 'hl', style: 'color:#fff' }), info = h('div', { class: 'out', id: 'info', style: 'font-size:20px;margin-top:8px' }), rout = h('div', { class: 'out', id: 'rout', style: 'margin-top:8px' });
    const run = () => {
      hl.replaceChildren(); info.textContent = ''; rout.textContent = '';
      if (!re.value) { hl.textContent = txt.value; return; }
      let r; try { r = new RegExp(re.value, fl.value.includes('g') ? fl.value : fl.value + 'g'); } catch (e) { hl.textContent = 'Expressão inválida: ' + e.message; return; }
      const t = txt.value; let last = 0, n = 0; const lines = [];
      for (const m of t.matchAll(r)) { if (m[0] === '' ) { r.lastIndex++; continue; } if (n++ > 2000) break; hl.append(t.slice(last, m.index), h('mark', { style: 'background:var(--yellow);color:#000' }, m[0])); last = m.index + m[0].length; lines.push(`#${n} @${m.index}: "${m[0]}"` + (m.length > 1 ? '  grupos: ' + m.slice(1).map(g => g === undefined ? '∅' : `"${g}"`).join(', ') : '')); }
      hl.append(t.slice(last)); info.textContent = n ? lines.join('\n') : 'Nenhuma correspondência.';
      if (rep.value) { try { rout.textContent = t.replace(new RegExp(re.value, fl.value), rep.value); } catch {} }
    };
    [re, fl, txt, rep].forEach(e => e.addEventListener('input', run));
    root.append(panel('EXPRESSÃO', row(field('Regex', re), field('Flags (g i m s u)', fl))), panel('TEXTO DE TESTE', txt), panel('CORRESPONDÊNCIAS', hl, info), panel('SUBSTITUIÇÃO', field('Substituir por', rep), rout));
    run();
  },
};
