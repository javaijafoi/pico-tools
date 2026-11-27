import { h, panel, row, field, btn, input, select, check, out, copyBtn, fmtNum, fmtBRL, toast } from '../lib.js';

const num = v => { const s = String(v).trim().replace(/\s/g, ''); if (!s) return NaN; return parseFloat(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s); };
const N = (props = {}) => h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', ...props });
const stat = (k, v) => h('div', { class: 'stat', 'data-k': k }, h('b', { text: v }), h('span', { text: k }));

const UNITS = {
  'Comprimento': { base: 'm', u: { 'milímetro (mm)': .001, 'centímetro (cm)': .01, 'metro (m)': 1, 'quilômetro (km)': 1000, 'polegada (in)': .0254, 'pé (ft)': .3048, 'jarda (yd)': .9144, 'milha (mi)': 1609.344, 'milha náutica': 1852 } },
  'Massa': { u: { 'miligrama (mg)': 1e-6, 'grama (g)': .001, 'quilograma (kg)': 1, 'tonelada (t)': 1000, 'onça (oz)': .028349523125, 'libra (lb)': .45359237, 'arroba (@)': 15 } },
  'Volume': { u: { 'mililitro (mL)': .001, 'litro (L)': 1, 'metro cúbico (m³)': 1000, 'xícara (240 mL)': .24, 'colher de sopa (15 mL)': .015, 'colher de chá (5 mL)': .005, 'galão americano': 3.785411784, 'onça fluida (US)': .0295735295625 } },
  'Área': { u: { 'metro² (m²)': 1, 'quilômetro² (km²)': 1e6, 'hectare (ha)': 1e4, 'alqueire paulista': 24200, 'acre': 4046.8564224, 'pé² (ft²)': .09290304 } },
  'Velocidade': { u: { 'm/s': 1, 'km/h': 1 / 3.6, 'mph': .44704, 'nós': .514444 } },
  'Dados': { u: { 'bit': 1 / 8, 'byte (B)': 1, 'KB (1000)': 1e3, 'MB (1000²)': 1e6, 'GB (1000³)': 1e9, 'TB (1000⁴)': 1e12, 'KiB (1024)': 1024, 'MiB (1024²)': 1048576, 'GiB (1024³)': 1073741824 } },
  'Tempo': { u: { 'segundo': 1, 'minuto': 60, 'hora': 3600, 'dia': 86400, 'semana': 604800, 'ano (365 d)': 31536000 } },
  'Temperatura': { temp: true, u: { '°C': 1, '°F': 1, 'K': 1 } },
};
const toC = (v, u) => u === '°C' ? v : u === '°F' ? (v - 32) * 5 / 9 : v - 273.15;
const fromC = (c, u) => u === '°C' ? c : u === '°F' ? c * 9 / 5 + 32 : c + 273.15;
const fmtG = x => { if (!isFinite(x)) return '—'; const a = Math.abs(x); if (a !== 0 && (a >= 1e12 || a < 1e-6)) return x.toExponential(6).replace('.', ','); return Number(x.toPrecision(10)).toLocaleString('pt-BR', { maximumFractionDigits: 10 }); };

const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function ymd(a, b) { // a <= b
  let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
  if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const tools = {
  'calculadora-imc'(root) {
    const w = N({ id: 'peso', placeholder: 'kg', value: '70' }), ht = N({ id: 'altura', placeholder: 'cm', value: '170' });
    const res = h('div', { class: 'stats', id: 'res' }), cls = h('div', { class: 'out big', id: 'cls' });
    const run = () => {
      const p = num(w.value); let a = num(ht.value); if (a > 0 && a < 3) a *= 100;
      if (!(p > 0 && a > 50)) { res.replaceChildren(); cls.textContent = 'Digite peso (kg) e altura (cm).'; return; }
      const m = a / 100, imc = p / (m * m);
      const c = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : imc < 35 ? 'Obesidade grau I' : imc < 40 ? 'Obesidade grau II' : 'Obesidade grau III';
      res.replaceChildren(stat('IMC', fmtNum(imc, 1)), stat('faixa saudável', `${fmtNum(18.5 * m * m, 1)}–${fmtNum(24.9 * m * m, 1)} kg`));
      cls.textContent = c;
    };
    [w, ht].forEach(i => i.addEventListener('input', run));
    root.append(panel('SEUS DADOS', row(field('Peso (kg)', w), field('Altura (cm)', ht))), panel('RESULTADO', res, cls, row(copyBtn(() => `IMC ${res.querySelector('b')?.textContent ?? ''} — ${cls.textContent}`, 'COPIAR RESULTADO')), h('p', { class: 'note', text: 'Classificação da OMS para adultos. O IMC é só uma referência e não substitui avaliação médica.' })));
    run();
  },

  'juros-compostos'(root) {
    const c0 = N({ id: 'c0', value: '1000' }), pm = N({ id: 'pm', value: '200' }), tx = N({ id: 'tx', value: '1' });
    const txU = select([['m', '% ao mês'], ['a', '% ao ano']], { id: 'txu' }), per = N({ id: 'per', value: '24' }), perU = select([['m', 'meses'], ['a', 'anos']], { id: 'peru' });
    const res = h('div', { class: 'stats', id: 'res' }), tbl = h('div', { class: 'out', id: 'tbl', style: 'font-size:20px' });
    const run = () => {
      const c = num(c0.value) || 0, a = num(pm.value) || 0, t = num(tx.value);
      let n = Math.round(num(per.value) * (perU.value === 'a' ? 12 : 1));
      if (!(t >= 0) || !(n > 0) || n > 1200) { res.replaceChildren(); tbl.textContent = 'Informe taxa e prazo (até 100 anos).'; return; }
      const i = txU.value === 'a' ? Math.pow(1 + t / 100, 1 / 12) - 1 : t / 100;
      let s = c, inv = c, lines = ['mês   |  investido  |  juros acum.  |  total'];
      for (let k = 1; k <= n; k++) { s = s * (1 + i) + a; inv += a; if (k % 12 === 0 || k === n || n <= 24) lines.push(`${String(k).padStart(4)}  | ${fmtBRL(inv).padStart(12)} | ${fmtBRL(s - inv).padStart(13)} | ${fmtBRL(s)}`); }
      res.replaceChildren(stat('total final', fmtBRL(s)), stat('investido', fmtBRL(inv)), stat('juros', fmtBRL(s - inv)), stat('taxa mensal', fmtNum(i * 100, 4) + '%'));
      tbl.textContent = lines.join('\n');
    };
    [c0, pm, tx, txU, per, perU].forEach(e => e.addEventListener('input', run));
    root.append(panel('SIMULAÇÃO', row(field('Valor inicial (R$)', c0), field('Aporte mensal (R$)', pm)), row(field('Taxa de juros', tx), field('Período da taxa', txU)), row(field('Prazo', per), field('Unidade', perU))), panel('RESULTADO', res, row(copyBtn(() => [...res.querySelectorAll('.stat')].map(e => e.dataset.k + ': ' + e.firstChild.textContent).join('\n'), 'COPIAR RESULTADO'))), panel('MÊS A MÊS', tbl, h('p', { class: 'note', text: 'Simulação simples, sem impostos, inflação ou taxas. Aportes no fim de cada mês.' })));
    run();
  },

  'porcentagem'(root) {
    const block = (title, labelA, labelB, calc, defA, defB, id) => {
      const a = N({ id: id + 'a', value: defA }), b = N({ id: id + 'b', value: defB }), o = h('div', { class: 'out big', id: id + 'o' });
      const run = () => { const x = num(a.value), y = num(b.value); o.textContent = isFinite(x) && isFinite(y) ? calc(x, y) : ''; };
      [a, b].forEach(i => i.addEventListener('input', run)); run();
      return panel(title, row(field(labelA, a), field(labelB, b)), o, row(copyBtn(() => o.textContent, 'COPIAR RESULTADO')));
    };
    root.append(
      block('QUANTO É X% DE Y?', 'X (%)', 'Y', (x, y) => fmtG(x / 100 * y), '15', '200', 'p1'),
      block('X É QUANTOS % DE Y?', 'X', 'Y', (x, y) => y ? fmtG(x / y * 100) + '%' : '—', '30', '120', 'p2'),
      block('AUMENTO DE X% SOBRE Y', 'X (%)', 'Y', (x, y) => fmtG(y * (1 + x / 100)), '10', '200', 'p3'),
      block('DESCONTO DE X% SOBRE Y', 'X (%)', 'Y', (x, y) => fmtG(y * (1 - x / 100)), '10', '200', 'p4'),
      block('VARIAÇÃO DE X PARA Y', 'De', 'Para', (x, y) => x ? fmtG((y - x) / Math.abs(x) * 100) + '%' : '—', '80', '100', 'p5'),
    );
  },

  'conversor-de-unidades'(root) {
    const cat = select(Object.keys(UNITS), { id: 'cat' }), val = N({ id: 'val', value: '1' }), from = select([], { id: 'from' }), to = select([], { id: 'to' });
    const o = h('div', { class: 'out big', id: 'res' }), all = h('div', { class: 'out', id: 'all', style: 'font-size:20px;margin-top:10px' });
    const fill = () => { const keys = Object.keys(UNITS[cat.value].u); [from, to].forEach(s => s.replaceChildren(...keys.map(k => h('option', { value: k, text: k })))); from.value = keys[Math.min(2, keys.length - 1)]; to.value = keys[Math.min(3, keys.length - 1)]; if (cat.value === 'Temperatura') { from.value = '°C'; to.value = '°F'; } run(); };
    const conv = (v, f, t) => { const C = UNITS[cat.value]; if (C.temp) return fromC(toC(v, f), t); return v * C.u[f] / C.u[t]; };
    const run = () => {
      const v = num(val.value); if (!isFinite(v)) { o.textContent = ''; all.textContent = ''; return; }
      o.textContent = `${fmtG(v)} ${from.value}\n= ${fmtG(conv(v, from.value, to.value))} ${to.value}`;
      all.textContent = Object.keys(UNITS[cat.value].u).map(k => `${fmtG(conv(v, from.value, k))} ${k}`).join('\n');
    };
    cat.addEventListener('change', fill); [val, from, to].forEach(e => e.addEventListener('input', run));
    root.append(panel('CONVERTER', field('Grandeza', cat), row(field('Valor', val), field('De', from), field('Para', to)), btn('INVERTER ⇄', () => { [from.value, to.value] = [to.value, from.value]; run(); }, 'w')), panel('RESULTADO', o, all, row(copyBtn(() => o.textContent, 'COPIAR RESULTADO'), copyBtn(() => all.textContent, 'COPIAR TODAS'))));
    fill();
  },

  'diferenca-entre-datas'(root) {
    const today = iso(new Date());
    const d1 = h('input', { type: 'date', id: 'd1', value: today }), d2 = h('input', { type: 'date', id: 'd2', value: iso(new Date(Date.now() + 30 * 864e5)) });
    const res = h('div', { class: 'stats', id: 'res' }), txt = h('div', { class: 'out', id: 'txt' });
    const run = () => {
      if (!d1.value || !d2.value) { res.replaceChildren(); txt.textContent = ''; return; }
      let a = parseDate(d1.value), b = parseDate(d2.value), neg = false; if (a > b) { [a, b] = [b, a]; neg = true; }
      const days = Math.round((b - a) / 864e5), { y, m, d } = ymd(a, b);
      let util = 0; for (let k = 0, t = new Date(a); k < days; k++, t.setDate(t.getDate() + 1)) { const w = t.getDay(); if (w !== 0 && w !== 6) util++; }
      res.replaceChildren(stat('dias', fmtNum(days, 0)), stat('semanas', fmtNum(days / 7, 1)), stat('dias úteis*', fmtNum(util, 0)), stat('horas', fmtNum(days * 24, 0)));
      txt.textContent = `${neg ? 'A segunda data vem antes. ' : ''}${y} ano(s), ${m} mês(es) e ${d} dia(s)\n* segunda a sexta, sem contar feriados.`;
    };
    const born = h('input', { type: 'date', id: 'born', value: '1990-06-15' }), age = h('div', { class: 'out big', id: 'age' });
    const runAge = () => {
      if (!born.value) { age.textContent = ''; return; }
      const b = parseDate(born.value), n = new Date(); n.setHours(0, 0, 0, 0);
      if (b > n) { age.textContent = 'Essa data está no futuro.'; return; }
      const { y, m, d } = ymd(b, n); let nx = new Date(n.getFullYear(), b.getMonth(), b.getDate()); if (nx < n) nx = new Date(n.getFullYear() + 1, b.getMonth(), b.getDate());
      const left = Math.round((nx - n) / 864e5);
      age.textContent = `${y} anos, ${m} meses e ${d} dias\nVividos: ${fmtNum(Math.round((n - b) / 864e5), 0)} dias\nPróximo aniversário: ${left === 0 ? 'é hoje! 🎂' : 'em ' + left + ' dia(s)'}`;
    };
    [d1, d2].forEach(e => e.addEventListener('input', run)); born.addEventListener('input', runAge);
    root.append(panel('ENTRE DUAS DATAS', row(field('De', d1), field('Até', d2)), res, txt, row(copyBtn(() => txt.textContent, 'COPIAR RESULTADO'))), panel('IDADE EXATA', field('Data de nascimento', born), age, row(copyBtn(() => age.textContent, 'COPIAR RESULTADO'))));
    run(); runAge();
  },

  'cronometro'(root) {
    // cronômetro
    const disp = h('div', { class: 'big-timer', id: 'sw' , text: '00:00.00' }); let t0 = 0, acc = 0, raf = 0, running = false; const laps = h('div', { class: 'out', id: 'laps', style: 'font-size:20px' }); const lapList = [];
    const fmt = ms => { const t = Math.floor(ms / 10), cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; };
    const cur = () => acc + (running ? performance.now() - t0 : 0);
    const tick = () => { disp.textContent = fmt(cur()); raf = requestAnimationFrame(tick); };
    const startB = btn('INICIAR', () => { if (running) { acc += performance.now() - t0; running = false; cancelAnimationFrame(raf); disp.textContent = fmt(acc); startB.textContent = 'CONTINUAR'; } else { t0 = performance.now(); running = true; startB.textContent = 'PAUSAR'; tick(); } }, 'g', { id: 'swStart' });
    const lapB = btn('VOLTA', () => { if (!cur()) return; lapList.push(cur()); laps.textContent = lapList.map((v, i) => `#${i + 1}  ${fmt(v)}  (+${fmt(v - (lapList[i - 1] || 0))})`).reverse().join('\n'); }, 'b', { id: 'swLap' });
    const resB = btn('ZERAR', () => { running = false; cancelAnimationFrame(raf); acc = 0; lapList.length = 0; laps.textContent = ''; disp.textContent = '00:00.00'; startB.textContent = 'INICIAR'; }, 'r', { id: 'swReset' });
    // temporizador
    const mm = N({ id: 'tmin', value: '5' }), ss = N({ id: 'tsec', value: '0' }); const tdisp = h('div', { class: 'big-timer', id: 'tm', text: '05:00' });
    let end = 0, ti = 0, tRem = 0, tRun = false;
    const beep = () => { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0, .3, .6, .9].forEach(d => { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + .18); }); } catch {} navigator.vibrate?.([300, 150, 300, 150, 300]); };
    const ft = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.ceil(s) % 60 === 0 && s >= 60 ? 0 : Math.ceil(s) % 60).padStart(2, '0')}`;
    const fmtT = s => { s = Math.max(0, Math.ceil(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    const tStart = btn('INICIAR', () => {
      if (tRun) { tRem = (end - Date.now()) / 1000; clearInterval(ti); tRun = false; tStart.textContent = 'CONTINUAR'; return; }
      if (!tRem) tRem = (num(mm.value) || 0) * 60 + (num(ss.value) || 0); if (tRem <= 0) return;
      end = Date.now() + tRem * 1000; tRun = true; tStart.textContent = 'PAUSAR';
      ti = setInterval(() => { const r = (end - Date.now()) / 1000; if (r <= 0) { clearInterval(ti); tRun = false; tRem = 0; tdisp.textContent = '00:00'; tStart.textContent = 'INICIAR'; tdisp.style.color = 'var(--red)'; beep(); toast('TEMPO!'); } else tdisp.textContent = fmtT(r); }, 200);
    }, 'g', { id: 'tStart' });
    const tReset = btn('ZERAR', () => { clearInterval(ti); tRun = false; tRem = 0; tdisp.style.color = ''; tdisp.textContent = fmtT((num(mm.value) || 0) * 60 + (num(ss.value) || 0)); tStart.textContent = 'INICIAR'; }, 'r', { id: 'tReset' });
    [mm, ss].forEach(e => e.addEventListener('input', () => { if (!tRun) { tRem = 0; tdisp.style.color = ''; tdisp.textContent = fmtT((num(mm.value) || 0) * 60 + (num(ss.value) || 0)); } }));
    const presets = [1, 3, 5, 10, 15, 25, 45].map(m => btn(m + ' min', () => { mm.value = m; ss.value = 0; tReset.click(); }, 'w'));
    root.append(panel('CRONÔMETRO', disp, row(startB, lapB, resB), laps), panel('TEMPORIZADOR', tdisp, row(field('Minutos', mm), field('Segundos', ss)), row(...presets), row(tStart, tReset), h('p', { class: 'note', text: 'Mantenha a tela ligada: navegadores podem pausar abas em segundo plano.' })));
  },
};
