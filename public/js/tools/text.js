import { h, panel, row, field, btn, area, select, check, out, copyBtn, copyText, fmtNum, fmtBRL, shuffle, rand } from '../lib.js';

const $ = id => document.getElementById(id);

// Caixa de texto de entrada + saída ao vivo
function live(root, { placeholder = 'Cole ou digite o texto aqui…', controls = [], transform, outLabel = 'RESULTADO', big = false }) {
  const inp = area({ id: 'in', placeholder, rows: 6, class: 'mono' });
  const o = out('out', big ? 'big' : '');
  const run = () => { try { o.textContent = transform(inp.value); } catch (e) { o.textContent = 'Erro: ' + e.message; } };
  inp.addEventListener('input', run);
  controls.forEach(c => c.addEventListener?.('input', run));
  root.append(panel('TEXTO', inp, controls.length ? row(...controls) : ''), panel(outLabel, o, row(copyBtn(() => o.textContent), btn('LIMPAR', () => { inp.value = ''; run(); inp.focus(); }, 'w'))));
  run();
  return { inp, o, run };
}

const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = s => (s.match(/[\p{L}\p{N}'’-]+/gu) || []);

export const tools = {
  'contador-de-palavras'(root) {
    const inp = area({ id: 'in', placeholder: 'Cole ou digite o texto aqui…', rows: 9, class: 'mono' });
    const grid = h('div', { class: 'stats', id: 'stats' });
    const calc = () => {
      const t = inp.value;
      const w = words(t).length;
      const vals = [
        ['palavras', w], ['caracteres', t.length], ['sem espaços', t.replace(/\s/g, '').length],
        ['frases', (t.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).filter(x => x.trim()).length],
        ['parágrafos', t.split(/\n\s*\n/).filter(x => x.trim()).length],
        ['linhas', t ? t.split('\n').length : 0],
        ['leitura', w ? (w / 200 < 1 ? '< 1 min' : Math.ceil(w / 200) + ' min') : '0'],
        ['fala', w ? (w / 130 < 1 ? '< 1 min' : Math.ceil(w / 130) + ' min') : '0'],
      ];
      grid.replaceChildren(...vals.map(([l, v]) => h('div', { class: 'stat', 'data-k': l }, h('b', { text: String(v) }), h('span', { text: l }))));
    };
    inp.addEventListener('input', calc); calc();
    root.append(panel('TEXTO', inp, row(btn('LIMPAR', () => { inp.value = ''; calc(); }, 'w'))), panel('NÚMEROS', grid), h('p', { class: 'note', style: 'color:var(--lgray)', text: 'Leitura a 200 palavras por minuto; fala a 130.' }));
  },

  'inverter-texto'(root) {
    const mode = select([['chars', 'Letra por letra (olá → álo)'], ['words', 'Ordem das palavras'], ['lines', 'Ordem das linhas'], ['each', 'Cada palavra espelhada']], { id: 'mode' });
    live(root, {
      controls: [field('Modo', mode)],
      transform: t => {
        const m = mode.value;
        if (m === 'chars') return [...t].reverse().join('');
        if (m === 'words') return t.split('\n').map(l => l.split(/(\s+)/).filter(x => x !== '').reverse().join('')).join('\n');
        if (m === 'lines') return t.split('\n').reverse().join('\n');
        return t.replace(/\S+/g, w => [...w].reverse().join(''));
      },
    });
  },

  'maiusculas-minusculas'(root) {
    const mode = select([['upper', 'MAIÚSCULAS'], ['lower', 'minúsculas'], ['title', 'Título (Cada Palavra)'], ['sentence', 'Frase (primeira letra)'], ['camel', 'camelCase'], ['pascal', 'PascalCase'], ['snake', 'snake_case'], ['kebab', 'kebab-case'], ['const', 'CONSTANT_CASE'], ['alt', 'aLtErNaDo']], { id: 'mode' });
    const toWords = t => strip(t).replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean).map(x => x.toLowerCase());
    const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
    live(root, {
      controls: [field('Converter para', mode)],
      transform: t => {
        switch (mode.value) {
          case 'upper': return t.toUpperCase();
          case 'lower': return t.toLowerCase();
          case 'title': return t.toLowerCase().replace(/(^|[\s\-(\["'“])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
          case 'sentence': return t.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
          case 'camel': return t.split('\n').map(l => { const w = toWords(l); return w[0] ? w[0] + w.slice(1).map(cap).join('') : ''; }).join('\n');
          case 'pascal': return t.split('\n').map(l => toWords(l).map(cap).join('')).join('\n');
          case 'snake': return t.split('\n').map(l => toWords(l).join('_')).join('\n');
          case 'kebab': return t.split('\n').map(l => toWords(l).join('-')).join('\n');
          case 'const': return t.split('\n').map(l => toWords(l).join('_').toUpperCase()).join('\n');
          case 'alt': { let i = 0; return [...t].map(c => /\p{L}/u.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c).join(''); }
        }
      },
    });
  },

  'remover-acentos'(root) {
    const slug = check('Gerar slug (minúsculas-com-hifens)', false, () => {}, 'slug');
    const chk = slug.querySelector('input');
    live(root, {
      controls: [slug],
      transform: t => {
        const s = strip(t).replace(/ß/g, 'ss').replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae').replace(/ø/g, 'o').replace(/Ø/g, 'O');
        if (!chk.checked) return s;
        return t.split('\n').map(l => strip(l).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).join('\n');
      },
    });
    chk.addEventListener('input', () => $('in').dispatchEvent(new Event('input')));
  },

  'remover-linhas-duplicadas'(root) {
    const mode = select([['keep', 'Manter a ordem'], ['az', 'Ordenar A→Z'], ['za', 'Ordenar Z→A'], ['num', 'Ordenar números'], ['len', 'Ordenar por tamanho'], ['rev', 'Inverter ordem'], ['shuf', 'Embaralhar']], { id: 'mode' });
    const dd = check('Remover linhas duplicadas', true, () => {}, 'dd');
    const ci = check('Ignorar maiúsculas/minúsculas', true, () => {}, 'ci');
    const tr = check('Remover linhas vazias e espaços nas pontas', true, () => {}, 'tr');
    const rec = live(root, {
      placeholder: 'Uma linha por item…',
      controls: [field('Ordem', mode), h('div', { class: 'full' }, dd, ci, tr)],
      transform: t => {
        let lines = t.split('\n');
        if (tr.querySelector('input').checked) lines = lines.map(l => l.trim()).filter(Boolean);
        const m = mode.value, cs = !ci.querySelector('input').checked;
        const key = l => cs ? l : l.toLowerCase();
        if (dd.querySelector('input').checked) { const seen = new Set(); lines = lines.filter(l => { const k = key(l); if (seen.has(k)) return false; seen.add(k); return true; }); }
        const coll = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
        if (m === 'az') lines.sort(coll.compare);
        else if (m === 'za') lines.sort((a, b) => coll.compare(b, a));
        else if (m === 'num') lines.sort((a, b) => parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')));
        else if (m === 'len') lines.sort((a, b) => a.length - b.length);
        else if (m === 'rev') lines.reverse();
        else if (m === 'shuf') lines = shuffle(lines);
        return lines.join('\n');
      },
    });
    [mode, ...[dd, ci, tr].map(c => c.querySelector('input'))].forEach(c => c.addEventListener('change', rec.run));
  },

  'comparar-textos'(root) {
    const a = area({ id: 'a', rows: 8, class: 'mono', placeholder: 'Texto original' });
    const b = area({ id: 'b', rows: 8, class: 'mono', placeholder: 'Texto novo' });
    const res = h('div', { class: 'diff', id: 'diff' });
    const sum = h('p', { class: 'status', id: 'sum' });
    const run = () => {
      const A = a.value.split('\n'), B = b.value.split('\n');
      const n = A.length, m = B.length;
      if (n * m > 4e6) { res.replaceChildren(); sum.textContent = 'Textos grandes demais para comparar aqui (máx. ~2000 linhas cada).'; return; }
      const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      const rows = []; let i = 0, j = 0, add = 0, del = 0;
      while (i < n && j < m) {
        if (A[i] === B[j]) { rows.push(['', '  ' + A[i]]); i++; j++; }
        else if (L[i + 1][j] >= L[i][j + 1]) { rows.push(['d', '− ' + A[i]]); i++; del++; }
        else { rows.push(['a', '+ ' + B[j]]); j++; add++; }
      }
      while (i < n) { rows.push(['d', '− ' + A[i++]]); del++; }
      while (j < m) { rows.push(['a', '+ ' + B[j++]]); add++; }
      res.replaceChildren(...rows.map(([c, t]) => h('div', { class: c, text: t })));
      sum.textContent = add || del ? `${add} linha(s) adicionada(s), ${del} removida(s).` : 'Os textos são idênticos.';
    };
    a.addEventListener('input', run); b.addEventListener('input', run);
    root.append(panel('ORIGINAL', a), panel('NOVO', b), panel('DIFERENÇAS', sum, res));
    run();
  },

  'lorem-ipsum'(root) {
    const base = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
    const unit = select([['p', 'parágrafos'], ['s', 'frases'], ['w', 'palavras']], { id: 'unit' });
    const qty = h('input', { type: 'number', id: 'qty', value: 3, min: 1, max: 100 });
    const start = check('Começar com "Lorem ipsum dolor sit amet"', true, () => {}, 'start');
    const o = out('out');
    const word = () => base[rand(base.length)];
    const sentence = () => { const n = 6 + rand(10); const w = Array.from({ length: n }, word); w[0] = w[0][0].toUpperCase() + w[0].slice(1); if (n > 9) w[4 + rand(3)] += ','; return w.join(' ').replace(/,,/g, ',') + '.'; };
    const para = () => Array.from({ length: 3 + rand(4) }, sentence).join(' ');
    const gen = () => {
      const n = Math.max(1, Math.min(100, +qty.value || 1)); let t;
      if (unit.value === 'p') t = Array.from({ length: n }, para).join('\n\n');
      else if (unit.value === 's') t = Array.from({ length: n }, sentence).join(' ');
      else t = Array.from({ length: n }, word).join(' ');
      if (start.querySelector('input').checked) { const lead = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit'; t = unit.value === 'w' ? ('lorem ipsum dolor sit amet consectetur adipiscing elit ' + t).split(' ').slice(0, n).join(' ') : lead + (unit.value === 'p' ? '. ' : '. ') + t.replace(/^[^.]*\.\s*/, ''); }
      o.textContent = t;
    };
    root.append(panel('QUANTO?', row(field('Quantidade', qty), field('Unidade', unit)), start, row(btn('GERAR', gen, 'g'), copyBtn(() => o.textContent))), panel('TEXTO', o));
    gen();
  },

  'numero-por-extenso'(root) {
    const U = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const mil = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões'], ['trilhão', 'trilhões'], ['quatrilhão', 'quatrilhões']];
    const ate999 = n => {
      if (n === 0) return '';
      if (n === 100) return 'cem';
      const c = Math.floor(n / 100), r = n % 100, parts = [];
      if (c) parts.push(C[c]);
      if (r) parts.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' e ' + U[r % 10] : ''));
      return parts.join(' e ');
    };
    const inteiro = (bi) => {
      if (bi === 0n) return 'zero';
      const grupos = []; let n = bi;
      while (n > 0n) { grupos.push(Number(n % 1000n)); n /= 1000n; }
      if (grupos.length > mil.length) throw new Error('Número muito grande');
      const partes = [];
      for (let i = grupos.length - 1; i >= 0; i--) {
        const g = grupos[i]; if (!g) continue;
        if (i === 0) partes.push(ate999(g));
        else if (i === 1) partes.push(g === 1 ? 'mil' : ate999(g) + ' mil');
        else partes.push(ate999(g) + ' ' + mil[i][g === 1 ? 0 : 1]);
      }
      // "e" entre grupos: antes do último grupo se ele for < 100 ou múltiplo de 100; senão vírgula
      let txt = partes[0];
      for (let k = 1; k < partes.length; k++) {
        const ultimo = k === partes.length - 1;
        const g = grupos[0];
        txt += (ultimo && (g < 100 || g % 100 === 0) ? ' e ' : (grupos.length <= 2 ? ' ' : ', ')) + partes[k];
      }
      // de: "um milhão de reais"
      return txt;
    };
    const lastIsRound = bi => bi >= 1000000n && bi % 1000000n === 0n;
    const mode = select([['num', 'Número comum'], ['brl', 'Valor em reais (R$)']], { id: 'mode' });
    const val = h('input', { type: 'text', id: 'val', inputmode: 'decimal', placeholder: 'ex.: 1250,75', value: '1250,75' });
    const o = out('out', 'big');
    const run = () => {
      const raw = val.value.trim().replace(/\s/g, '');
      if (!raw) { o.textContent = ''; return; }
      let s = raw.replace(/^R\$/i, '');
      if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
      if (!/^-?\d+(\.\d+)?$/.test(s)) { o.textContent = 'Digite só números (ex.: 1250,75).'; return; }
      const neg = s.startsWith('-'); if (neg) s = s.slice(1);
      let [i, f = ''] = s.split('.');
      try {
        if (mode.value === 'brl') {
          f = (f + '00').slice(0, 2);
          const bi = BigInt(i), c = Number(f);
          const partes = [];
          if (bi > 0n || c === 0) partes.push(inteiro(bi) + (lastIsRound(bi) ? ' de' : '') + (bi === 1n ? ' real' : ' reais'));
          if (c) partes.push(inteiro(BigInt(c)) + (c === 1 ? ' centavo' : ' centavos'));
          o.textContent = (neg ? 'menos ' : '') + partes.join(' e ');
        } else {
          let t = inteiro(BigInt(i));
          if (f) t += ' vírgula ' + [...f].map(d => U[+d]).join(' ');
          o.textContent = (neg ? 'menos ' : '') + t;
        }
      } catch (e) { o.textContent = e.message; }
    };
    val.addEventListener('input', run); mode.addEventListener('change', run);
    root.append(panel('VALOR', row(field('Tipo', mode), field('Número ou valor', val))), panel('POR EXTENSO', o, row(copyBtn(() => o.textContent))));
    run();
  },
};
