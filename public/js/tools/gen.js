import { h, panel, row, field, btn, input, area, select, check, out, copyBtn, copyText, download, textBlob, canvasBlob, rand, shuffle, ROOT, fmtNum } from '../lib.js';

const $ = id => document.getElementById(id);

/* ---------- CPF / CNPJ ---------- */
const cpfDv = d => { // d: array de 9 ou 10 dígitos
  let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * (d.length + 1 - i);
  const r = (s * 10) % 11; return r === 10 ? 0 : r;
};
export const cpfValid = str => {
  const s = str.replace(/\D/g, ''); if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  const d = [...s].map(Number);
  return cpfDv(d.slice(0, 9)) === d[9] && cpfDv(d.slice(0, 10)) === d[10];
};
const cnpjVal = c => c.charCodeAt(0) - 48; // vale para 0-9 e A-Z (novo CNPJ alfanumérico)
const cnpjDv = (chars) => {
  const w = chars.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0; for (let i = 0; i < chars.length; i++) s += cnpjVal(chars[i]) * w[i];
  const r = s % 11; return r < 2 ? 0 : 11 - r;
};
export const cnpjValid = str => {
  const s = str.toUpperCase().replace(/[^0-9A-Z]/g, ''); if (s.length !== 14 || !/^[0-9A-Z]{12}\d{2}$/.test(s) || /^(.)\1{13}$/.test(s)) return false;
  const c = [...s];
  return cnpjDv(c.slice(0, 12)) === +c[12] && cnpjDv(c.slice(0, 13)) === +c[13];
};
const maskCpf = s => s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const maskCnpj = s => s.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
const UF9 = { RS: 0, DF: 1, GO: 1, MS: 1, MT: 1, TO: 1, AC: 2, AM: 2, AP: 2, PA: 2, RO: 2, RR: 2, CE: 3, MA: 3, PI: 3, AL: 4, PB: 4, PE: 4, RN: 4, BA: 5, SE: 5, MG: 6, ES: 7, RJ: 7, SP: 8, PR: 9, SC: 9 };
export function genCpf(uf) {
  for (;;) {
    const d = Array.from({ length: 9 }, () => rand(10));
    if (uf && UF9[uf] != null) d[8] = UF9[uf];
    if (d.every(x => x === d[0])) continue;
    d.push(cpfDv(d)); d.push(cpfDv(d));
    return d.join('');
  }
}
const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function genCnpj({ alpha = false, filial = true } = {}) {
  const pool = alpha ? ALNUM : '0123456789';
  for (;;) {
    const c = Array.from({ length: 8 }, () => pool[rand(pool.length)]);
    const f = filial ? ['0', '0', '0', '1'] : Array.from({ length: 4 }, () => pool[rand(pool.length)]);
    const all = [...c, ...f];
    if (all.every(x => x === all[0])) continue;
    all.push(String(cnpjDv(all))); all.push(String(cnpjDv(all)));
    return all.join('');
  }
}

function listGen(root, { options, gen, label }) {
  const qty = h('input', { type: 'number', id: 'qty', value: 5, min: 1, max: 500 });
  const mask = check('Com pontuação', true, () => {}, 'mask');
  const o = out('out', '');
  const run = () => {
    const n = Math.max(1, Math.min(500, +qty.value || 1));
    o.textContent = Array.from({ length: n }, () => gen(mask.querySelector('input').checked)).join('\n');
  };
  root.append(panel(label, row(field('Quantidade', qty), ...options), mask, row(btn('GERAR', run, 'g'), copyBtn(() => o.textContent), btn('BAIXAR .TXT', () => download(textBlob(o.textContent), label.toLowerCase().replace(/\s/g, '-') + '.txt'), 'w'))), panel('RESULTADO', o), h('p', { class: 'note', style: 'color:var(--lgray)', text: 'Números fictícios com dígitos verificadores válidos, só para testes. Não use em cadastros reais.' }));
  run();
}

/* ---------- Senha ---------- */
const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%&*()-_=+[]{};:,.?/' };

/* ---------- QR ---------- */
async function loadQr() {
  const m = await import(ROOT + 'vendor/qrcode.mjs');
  const qrcode = m.default; qrcode.stringToBytes = s => Array.from(new TextEncoder().encode(s));
  return qrcode;
}

/* ---------- dados fake ---------- */
const NOMES = ['Ana', 'Beatriz', 'Bruno', 'Camila', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kaique', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Thiago', 'Valentina', 'Wesley', 'Yasmin', 'Davi', 'Lucas', 'Mariana', 'Pedro', 'Rita', 'Tânia'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Barbosa', 'Rocha', 'Dias', 'Moreira'];
const RUAS = ['Rua das Flores', 'Avenida Brasil', 'Rua Sete de Setembro', 'Rua XV de Novembro', 'Avenida Paulista', 'Rua do Comércio', 'Alameda Santos', 'Rua da Paz'];
const CIDADES = [['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'], ['Porto Alegre', 'RS'], ['Salvador', 'BA'], ['Recife', 'PE'], ['Fortaleza', 'CE'], ['Brasília', 'DF'], ['Florianópolis', 'SC']];
const noAcc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pick = a => a[rand(a.length)];

export const tools = {
  'gerador-de-cpf'(root) {
    const uf = select([['', 'Qualquer estado'], ...Object.keys(UF9).sort()], { id: 'uf' });
    listGen(root, { label: 'GERADOR DE CPF', options: [field('Estado de origem', uf)], gen: m => { const s = genCpf(uf.value); return m ? maskCpf(s) : s; } });
  },

  'gerador-de-cnpj'(root) {
    const alpha = check('CNPJ alfanumérico (novo formato)', false, () => {}, 'alpha');
    const fil = check('Matriz (filial 0001)', true, () => {}, 'filial');
    listGen(root, { label: 'GERADOR DE CNPJ', options: [h('div', { class: 'full' }, alpha, fil)], gen: m => { const s = genCnpj({ alpha: alpha.querySelector('input').checked, filial: fil.querySelector('input').checked }); return m ? maskCnpj(s) : s; } });
  },

  'validador-cpf-cnpj'(root) {
    const inp = input({ id: 'doc', placeholder: 'Digite um CPF ou CNPJ', inputmode: 'text', style: 'font-size:28px' });
    const res = h('div', { class: 'out big', id: 'res' });
    const run = () => {
      const raw = inp.value.trim(); const s = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (!s) { res.textContent = ''; res.style.color = ''; return; }
      let ok, tipo;
      if (s.length === 11) { tipo = 'CPF'; ok = cpfValid(s); }
      else if (s.length === 14) { tipo = 'CNPJ'; ok = cnpjValid(s); }
      else { res.style.color = 'var(--orange)'; res.textContent = `Tamanho inválido (${s.length}). CPF tem 11 e CNPJ tem 14 caracteres.`; return; }
      res.style.color = ok ? 'var(--lime)' : 'var(--pink)';
      res.textContent = `${tipo} ${ok ? 'VÁLIDO ✔' : 'INVÁLIDO ✘'}\n${tipo === 'CPF' ? maskCpf(s) : maskCnpj(s)}`;
    };
    inp.addEventListener('input', run);
    root.append(panel('DOCUMENTO', inp, h('p', { class: 'note', text: 'A conferência é só matemática dos dígitos verificadores. Não diz se o documento existe de fato.' })), panel('RESULTADO', res));
  },

  'gerador-de-senha'(root) {
    const len = h('input', { type: 'range', id: 'len', min: 6, max: 64, value: 16 });
    const lenOut = h('b', { text: '16' });
    const opts = { lower: check('abc', true, () => {}, 'o-lower'), upper: check('ABC', true, () => {}, 'o-upper'), digits: check('123', true, () => {}, 'o-digits'), symbols: check('#$%', true, () => {}, 'o-symbols') };
    const amb = check('Evitar parecidos (0 O o, 1 l I)', false, () => {}, 'amb');
    const o = out('out', 'big'); const str = h('p', { class: 'status', id: 'str' });
    const gen = () => {
      let pool = Object.entries(opts).filter(([, c]) => c.querySelector('input').checked).map(([k]) => SETS[k]);
      if (!pool.length) { o.textContent = 'Marque ao menos um tipo de caractere.'; str.textContent = ''; return; }
      const amb_ = amb.querySelector('input').checked;
      if (amb_) pool = pool.map(p => p.replace(/[0Oo1lI]/g, ''));
      const all = pool.join(''), n = +len.value;
      const chars = pool.map(p => p[rand(p.length)]);
      while (chars.length < n) chars.push(all[rand(all.length)]);
      o.textContent = shuffle(chars).slice(0, n).join('');
      const bits = Math.round(n * Math.log2(all.length));
      str.textContent = `Força: ${bits < 50 ? 'fraca' : bits < 70 ? 'razoável' : bits < 100 ? 'forte' : 'muito forte'} (~${bits} bits)`;
    };
    len.addEventListener('input', () => { lenOut.textContent = len.value; gen(); });
    Object.values(opts).forEach(c => c.addEventListener('change', gen)); amb.addEventListener('change', gen);
    root.append(panel('OPÇÕES', field('Tamanho: ', h('span', null, lenOut, ' caracteres')), len, row(...Object.values(opts)), amb), panel('SENHA', o, str, row(btn('GERAR OUTRA', gen, 'g'), copyBtn(() => o.textContent))), h('p', { class: 'note', style: 'color:var(--lgray)', text: 'Gerada no seu aparelho com crypto.getRandomValues. Nada é enviado nem salvo.' }));
    gen();
  },

  'gerador-de-uuid'(root) {
    const qty = h('input', { type: 'number', id: 'qty', value: 5, min: 1, max: 500 });
    const up = check('MAIÚSCULAS', false, () => {}, 'up'), nd = check('Sem hífens', false, () => {}, 'nd');
    const o = out('out');
    const uuid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const x = [...b].map(v => v.toString(16).padStart(2, '0')).join(''); return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`; };
    const gen = () => { let l = Array.from({ length: Math.max(1, Math.min(500, +qty.value || 1)) }, uuid); if (up.querySelector('input').checked) l = l.map(s => s.toUpperCase()); if (nd.querySelector('input').checked) l = l.map(s => s.replace(/-/g, '')); o.textContent = l.join('\n'); };
    root.append(panel('UUID v4', row(field('Quantidade', qty), h('div', { class: 'full' }, up, nd)), row(btn('GERAR', gen, 'g'), copyBtn(() => o.textContent))), panel('RESULTADO', o));
    gen();
  },

  'sorteador'(root) {
    // nomes
    const names = area({ id: 'names', rows: 5, placeholder: 'Um nome por linha', class: 'mono' });
    const nQty = h('input', { type: 'number', id: 'nqty', value: 1, min: 1 });
    const nOut = out('nout', 'big');
    const draw = () => { const l = names.value.split('\n').map(s => s.trim()).filter(Boolean); if (!l.length) { nOut.textContent = 'Escreva alguns nomes.'; return; } nOut.textContent = shuffle(l).slice(0, Math.max(1, +nQty.value || 1)).join('\n'); };
    const teams = h('input', { type: 'number', id: 'tcount', value: 2, min: 2 });
    const tOut = out('tout');
    const split = () => {
      const l = shuffle(names.value.split('\n').map(s => s.trim()).filter(Boolean)); const n = Math.max(2, +teams.value || 2);
      if (!l.length) { tOut.textContent = 'Escreva alguns nomes.'; return; }
      const t = Array.from({ length: n }, () => []); l.forEach((x, i) => t[i % n].push(x));
      tOut.textContent = t.map((m, i) => `TIME ${i + 1}: ${m.join(', ')}`).join('\n');
    };
    // números
    const mn = h('input', { type: 'number', id: 'min', value: 1 }), mx = h('input', { type: 'number', id: 'max', value: 60 }), cnt = h('input', { type: 'number', id: 'cnt', value: 6, min: 1 });
    const uniq = check('Sem repetir', true, () => {}, 'uniq'); const numOut = out('numout', 'big');
    const nums = () => {
      let a = Math.floor(+mn.value), b = Math.floor(+mx.value), n = Math.max(1, Math.floor(+cnt.value) || 1);
      if (a > b) [a, b] = [b, a];
      const range = b - a + 1;
      if (uniq.querySelector('input').checked) { if (n > range) { numOut.textContent = `Só existem ${range} números nesse intervalo.`; return; } const set = new Set(); while (set.size < n) set.add(a + rand(range)); numOut.textContent = [...set].sort((x, y) => x - y).join('  '); }
      else numOut.textContent = Array.from({ length: n }, () => a + rand(range)).join('  ');
    };
    // dado e moeda
    const sides = select([4, 6, 8, 10, 12, 20, 100].map(n => [n, 'd' + n]), { id: 'sides' }); sides.value = 6;
    const dq = h('input', { type: 'number', id: 'dq', value: 2, min: 1, max: 50 }); const dOut = out('dout', 'big');
    const roll = () => { const n = Math.max(1, Math.min(50, +dq.value || 1)), s = +sides.value; const r = Array.from({ length: n }, () => 1 + rand(s)); dOut.textContent = r.join(' + ') + (n > 1 ? ' = ' + r.reduce((a, b) => a + b, 0) : ''); };
    const cOut = out('cout', 'big');
    root.append(
      panel('NOMES', names, row(field('Quantos sortear', nQty), btn('SORTEAR', draw, 'g', { id: 'drawBtn' })), nOut, row(field('Dividir em times', teams), btn('DIVIDIR', split, 'b', { id: 'splitBtn' })), tOut),
      panel('NÚMEROS', row(field('De', mn), field('Até', mx), field('Quantos', cnt)), uniq, row(btn('SORTEAR NÚMEROS', nums, 'g', { id: 'numBtn' })), numOut),
      panel('DADOS E MOEDA', row(field('Quantidade', dq), field('Dado', sides), btn('ROLAR', roll, 'g', { id: 'rollBtn' })), dOut, row(btn('CARA OU COROA', () => { cOut.textContent = rand(2) ? 'CARA' : 'COROA'; }, 'y', { id: 'coinBtn' })), cOut),
    );
  },

  async 'gerador-de-qr-code'(root) {
    const qrcode = await loadQr();
    const type = select([['text', 'Texto ou link'], ['wifi', 'Wi-Fi'], ['wa', 'WhatsApp']], { id: 'type' });
    const text = area({ id: 'text', rows: 3, placeholder: 'https://exemplo.com.br', class: 'mono', value: 'https://javaijafoi.vercel.app' });
    const ssid = input({ id: 'ssid', placeholder: 'Nome da rede' }), pw = input({ id: 'wpw', placeholder: 'Senha' }), enc = select([['WPA', 'WPA/WPA2'], ['WEP', 'WEP'], ['nopass', 'Sem senha']], { id: 'enc' });
    const phone = input({ id: 'phone', placeholder: '5511999998888', inputmode: 'tel' }), msg = input({ id: 'wmsg', placeholder: 'Mensagem (opcional)' });
    const ec = select([['L', 'Baixa (L)'], ['M', 'Média (M)'], ['Q', 'Alta (Q)'], ['H', 'Máxima (H)']], { id: 'ec' }); ec.value = 'M';
    const size = h('input', { type: 'number', id: 'size', value: 512, min: 128, max: 2048, step: 64 });
    const fg = h('input', { type: 'color', id: 'fg', value: '#000000' }), bg = h('input', { type: 'color', id: 'bg', value: '#ffffff' });
    const fText = field('Conteúdo', text), fWifi = row(field('Rede', ssid), field('Senha', pw), field('Segurança', enc)), fWa = row(field('Telefone com DDI+DDD', phone), field('Mensagem', msg));
    const canvas = h('canvas', { id: 'qrcanvas' }); const note = h('p', { class: 'status', id: 'qrnote' });
    let svgTxt = '';
    const content = () => {
      if (type.value === 'wifi') { const esc = s => s.replace(/([\\;,:"])/g, '\\$1'); return `WIFI:T:${enc.value};S:${esc(ssid.value)};P:${enc.value === 'nopass' ? '' : esc(pw.value)};;`; }
      if (type.value === 'wa') return `https://wa.me/${phone.value.replace(/\D/g, '')}` + (msg.value ? '?text=' + encodeURIComponent(msg.value) : '');
      return text.value;
    };
    const render = () => {
      fText.hidden = type.value !== 'text'; fWifi.hidden = type.value !== 'wifi'; fWa.hidden = type.value !== 'wa';
      const data = content(); const ctx = canvas.getContext('2d');
      if (!data) { canvas.width = canvas.height = 10; note.textContent = 'Digite algo para gerar o QR Code.'; svgTxt = ''; return; }
      try {
        const q = qrcode(0, ec.value); q.addData(data); q.make();
        const n = q.getModuleCount(), margin = 4, px = Math.max(128, Math.min(2048, +size.value || 512));
        const cell = Math.max(1, Math.floor(px / (n + margin * 2))); const S = cell * (n + margin * 2);
        canvas.width = canvas.height = S; ctx.fillStyle = bg.value; ctx.fillRect(0, 0, S, S); ctx.fillStyle = fg.value;
        let path = '';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) { ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell); path += `M${c + margin},${r + margin}h1v1h-1z`; }
        svgTxt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + margin * 2} ${n + margin * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${bg.value}"/><path d="${path}" fill="${fg.value}"/></svg>`;
        note.textContent = `${n}×${n} módulos · ${S}px`;
      } catch (e) { note.textContent = 'Conteúdo grande demais para um QR Code. Reduza o texto.'; }
    };
    [type, text, ssid, pw, enc, phone, msg, ec, size, fg, bg].forEach(c => c.addEventListener('input', render));
    root.append(panel('CONTEÚDO', field('Tipo', type), fText, fWifi, fWa), panel('APARÊNCIA', row(field('Correção de erro', ec), field('Tamanho (px)', size), field('Cor', fg), field('Fundo', bg))),
      panel('QR CODE', h('div', { class: 'qr' }, canvas), note, row(btn('BAIXAR PNG', async () => download(await canvasBlob(canvas), 'qrcode.png'), 'g', { id: 'dlpng' }), btn('BAIXAR SVG', () => svgTxt && download(textBlob(svgTxt, 'image/svg+xml'), 'qrcode.svg'), 'w', { id: 'dlsvg' }))));
    render();
  },

  'gerador-de-dados-fake'(root) {
    const qty = h('input', { type: 'number', id: 'qty', value: 5, min: 1, max: 200 });
    const fmt = select([['text', 'Texto'], ['json', 'JSON'], ['csv', 'CSV']], { id: 'fmt' });
    const o = out('out');
    const person = () => {
      const nome = pick(NOMES), s1 = pick(SOBRENOMES), s2 = pick(SOBRENOMES); const [cidade, uf] = pick(CIDADES);
      const user = noAcc(nome) + '.' + noAcc(s1) + rand(100);
      const ddd = pick([11, 21, 31, 41, 51, 61, 71, 81, 85, 48]);
      return { nome: `${nome} ${s1} ${s2}`, cpf: maskCpf(genCpf()), email: `${user}@exemplo.com.br`, telefone: `(${ddd}) 9${String(rand(10000)).padStart(4, '0')}-${String(rand(10000)).padStart(4, '0')}`, nascimento: `${String(1 + rand(28)).padStart(2, '0')}/${String(1 + rand(12)).padStart(2, '0')}/${1960 + rand(45)}`, cep: `${String(10000 + rand(89999))}-${String(rand(1000)).padStart(3, '0')}`, endereco: `${pick(RUAS)}, ${1 + rand(2000)}`, cidade, uf };
    };
    const gen = () => {
      const l = Array.from({ length: Math.max(1, Math.min(200, +qty.value || 1)) }, person);
      if (fmt.value === 'json') o.textContent = JSON.stringify(l, null, 2);
      else if (fmt.value === 'csv') o.textContent = [Object.keys(l[0]).join(';'), ...l.map(p => Object.values(p).join(';'))].join('\n');
      else o.textContent = l.map(p => Object.values(p).join(' · ')).join('\n');
    };
    fmt.addEventListener('change', () => gen());
    root.append(panel('DADOS FICTÍCIOS', row(field('Quantidade', qty), field('Formato', fmt)), row(btn('GERAR', gen, 'g'), copyBtn(() => o.textContent))), panel('RESULTADO', o), h('p', { class: 'note', style: 'color:var(--lgray)', text: 'Tudo inventado, só para testes. CPFs com dígitos válidos, e-mails em exemplo.com.br.' }));
    gen();
  },
};
