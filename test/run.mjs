// Testes no navegador (Playwright). Uso: node test/run.mjs [filtro]
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TOOLS } from '../public/js/registry.js';

const ROOT = new URL('../public/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
}).listen(0);
const BASE = process.env.BASE_URL || `http://localhost:${srv.address().port}`;

const TMP = '/tmp/pico-tools-test'; mkdirSync(TMP, { recursive: true });
async function mkPdf(name, pages, label) {
  const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) { const p = d.addPage([300, 400]); p.drawText(`${label} pagina ${i}`, { x: 30, y: 200, size: 18, font: f }); }
  const path = join(TMP, name); writeFileSync(path, await d.save()); return path;
}
const A = await mkPdf('a.pdf', 5, 'A'), B = await mkPdf('b.pdf', 3, 'B');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, hasTouch: true });
let pass = 0, fail = 0; const fails = [];
const only = process.argv[2];
const PER = 150000;

async function test(slug, fn) {
  if (only && !slug.includes(only)) return;
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  try {
    await page.goto(`${BASE}/${slug}/`); await page.waitForSelector('#tool .panel h2:not(:has-text("CARREGANDO"))', { timeout: 8000 });
    await fn(page);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 2) throw new Error('overflow horizontal ' + ov + 'px');
    if (errs.length) throw new Error('erros no console: ' + errs.join(' | '));
    pass++; console.log('✔', slug);
  } catch (e) { fail++; fails.push(slug); console.log('✘', slug, '→', e.message.split('\n')[0]); try { await page.screenshot({ path: `${TMP}/fail-${slug}.png`, fullPage: true }); } catch {} }
  await page.close();
}
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} esperado ${JSON.stringify(b)} mas veio ${JSON.stringify(a)}`); };
const has = (a, b, m = '') => { if (!String(a).includes(b)) throw new Error(`${m} esperado conter ${JSON.stringify(b)}, veio ${JSON.stringify(String(a).slice(0, 200))}`); };
const txt = (p, sel) => p.$eval(sel, e => e.innerText ?? e.textContent);
async function dl(page, click) { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]); const path = await d.path(); return { name: d.suggestedFilename(), buf: readFileSync(path) }; }

// ---------- TEXTO ----------
await test('contador-de-palavras', async p => { await p.fill('#in', 'Olá mundo. Isto é um teste!\n\nSegundo parágrafo aqui.'); eq(await txt(p, '[data-k=palavras] b'), '9'); eq(await txt(p, '[data-k=parágrafos] b'), '2'); eq(await txt(p, '[data-k=frases] b'), '3'); });
await test('inverter-texto', async p => { await p.fill('#in', 'abc def'); eq(await txt(p, '#out'), 'fed cba'); await p.selectOption('#mode', 'words'); eq(await txt(p, '#out'), 'def abc'); await p.selectOption('#mode', 'each'); eq(await txt(p, '#out'), 'cba fed'); });
await test('maiusculas-minusculas', async p => { await p.fill('#in', 'olá mundo cruel'); await p.selectOption('#mode', 'upper'); eq(await txt(p, '#out'), 'OLÁ MUNDO CRUEL'); await p.selectOption('#mode', 'title'); eq(await txt(p, '#out'), 'Olá Mundo Cruel'); await p.selectOption('#mode', 'camel'); eq(await txt(p, '#out'), 'olaMundoCruel'); await p.selectOption('#mode', 'snake'); eq(await txt(p, '#out'), 'ola_mundo_cruel'); await p.selectOption('#mode', 'sentence'); eq(await txt(p, '#out'), 'Olá mundo cruel'); });
await test('remover-acentos', async p => { await p.fill('#in', 'Ação é coração! Você já?'); eq(await txt(p, '#out'), 'Acao e coracao! Voce ja?'); await p.check('#slug'); eq(await txt(p, '#out'), 'acao-e-coracao-voce-ja'); });
await test('remover-linhas-duplicadas', async p => { await p.fill('#in', 'b\na\nB\nc\na\n\n'); await p.selectOption('#mode', 'az'); eq(await txt(p, '#out'), 'a\nb\nc'); await p.selectOption('#mode', 'keep'); eq(await txt(p, '#out'), 'b\na\nc'); });
await test('comparar-textos', async p => { await p.fill('#a', 'um\ndois\ntres'); await p.fill('#b', 'um\nDOIS\ntres\nquatro'); has(await txt(p, '#sum'), '2 linha(s) adicionada(s), 1 removida(s)'); });
await test('lorem-ipsum', async p => { has(await txt(p, '#out'), 'Lorem ipsum'); await p.selectOption('#unit', 'w'); await p.fill('#qty', '10'); await p.click('text=GERAR'); eq((await txt(p, '#out')).trim().split(/\s+/).length, 10); });
await test('numero-por-extenso', async p => {
  const t = async (v, m, e) => { await p.selectOption('#mode', m); await p.fill('#val', v); eq(await txt(p, '#out'), e, v); };
  await t('1250,75', 'brl', 'mil duzentos e cinquenta reais e setenta e cinco centavos');
  await t('1', 'brl', 'um real'); await t('0,01', 'brl', 'um centavo'); await t('1000000', 'brl', 'um milhão de reais');
  await t('100', 'num', 'cem'); await t('101', 'num', 'cento e um'); await t('2025', 'num', 'dois mil e vinte e cinco'); await t('1500000', 'num', 'um milhão e quinhentos mil'); await t('1001', 'num', 'mil e um'); await t('3,14', 'num', 'três vírgula um quatro'); await t('2100200', 'num', 'dois milhões, cem mil e duzentos'); await t('999999', 'num', 'novecentos e noventa e nove mil novecentos e noventa e nove');
});

// ---------- GERADORES ----------
const cpfOk = s => { s = s.replace(/\D/g, ''); const d = [...s].map(Number); const dv = (a) => { let t = 0; a.forEach((x, i) => t += x * (a.length + 1 - i)); const r = t * 10 % 11; return r === 10 ? 0 : r; }; return s.length === 11 && dv(d.slice(0, 9)) === d[9] && dv(d.slice(0, 10)) === d[10]; };
await test('gerador-de-cpf', async p => { await p.fill('#qty', '50'); await p.click('text=GERAR'); const l = (await txt(p, '#out')).split('\n'); eq(l.length, 50); if (!l.every(x => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(x) && cpfOk(x))) throw new Error('CPF inválido gerado'); await p.selectOption('#uf', 'SP'); await p.click('text=GERAR'); if (!(await txt(p, '#out')).split('\n').every(x => x.replace(/\D/g, '')[8] === '8')) throw new Error('UF SP deveria dar 9º dígito 8'); });
await test('gerador-de-cnpj', async p => { await p.fill('#qty', '30'); await p.click('text=GERAR'); const l = (await txt(p, '#out')).split('\n'); if (!l.every(x => /^\d{2}\.\d{3}\.\d{3}\/0001-\d{2}$/.test(x))) throw new Error('formato'); await p.check('#alpha'); await p.click('text=GERAR'); const l2 = (await txt(p, '#out')).split('\n'); if (!l2.every(x => /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/0001-\d{2}$/.test(x))) throw new Error('formato alfa'); if (!l2.some(x => /[A-Z]/.test(x.slice(0, 15)))) throw new Error('nenhuma letra'); });
await test('validador-cpf-cnpj', async p => {
  const v = async (s) => { await p.fill('#doc', s); return txt(p, '#res'); };
  has(await v('529.982.247-25'), 'CPF VÁLIDO'); has(await v('529.982.247-24'), 'CPF INVÁLIDO'); has(await v('111.111.111-11'), 'INVÁLIDO');
  has(await v('11.222.333/0001-81'), 'CNPJ VÁLIDO'); has(await v('11.222.333/0001-80'), 'CNPJ INVÁLIDO'); has(await v('12.ABC.345/01DE-35'), 'CNPJ VÁLIDO'); has(await v('123'), 'Tamanho inválido');
});
await test('gerador-de-senha', async p => { eq((await txt(p, '#out')).length, 16); await p.evaluate(() => { const l = document.getElementById('len'); l.value = 40; l.dispatchEvent(new Event('input')); }); eq((await txt(p, '#out')).length, 40); for (const k of ['lower', 'upper', 'symbols']) await p.uncheck('#o-' + k); if (!/^\d{40}$/.test(await txt(p, '#out'))) throw new Error('só dígitos esperado'); });
await test('gerador-de-uuid', async p => { const l = (await txt(p, '#out')).split('\n'); eq(l.length, 5); if (!l.every(x => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x))) throw new Error('uuid v4 inválido'); });
await test('sorteador', async p => {
  await p.fill('#names', 'Ana\nBia\nCris\nDi'); await p.fill('#nqty', '2'); await p.click('#drawBtn'); eq((await txt(p, '#nout')).split('\n').length, 2);
  await p.click('#splitBtn'); eq((await txt(p, '#tout')).split('\n').length, 2);
  await p.fill('#min', '1'); await p.fill('#max', '5'); await p.fill('#cnt', '5'); await p.click('#numBtn'); eq((await txt(p, '#numout')).split(/\s+/).join(','), '1,2,3,4,5');
  await p.fill('#cnt', '9'); await p.click('#numBtn'); has(await txt(p, '#numout'), 'Só existem 5');
  await p.click('#rollBtn'); has(await txt(p, '#dout'), '='); await p.click('#coinBtn'); if (!/CARA|COROA/.test(await txt(p, '#cout'))) throw new Error('moeda');
});
await test('gerador-de-qr-code', async p => {
  const w = await p.$eval('#qrcanvas', c => c.width); if (w < 100) throw new Error('canvas pequeno ' + w);
  const dark = await p.$eval('#qrcanvas', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 50) n++; return n; }); if (dark < 500) throw new Error('QR vazio');
  const f = await dl(p, () => p.click('#dlpng')); eq(f.buf.slice(1, 4).toString(), 'PNG'); const s = await dl(p, () => p.click('#dlsvg')); has(s.buf.toString(), '<svg');
  await p.selectOption('#type', 'wifi'); await p.fill('#ssid', 'MinhaRede'); await p.fill('#wpw', 'segredo123'); has(await txt(p, '#qrnote'), 'módulos');
  await p.selectOption('#type', 'text'); await p.fill('#text', 'olá ✓ ' + 'x'.repeat(300)); has(await txt(p, '#qrnote'), 'módulos');
});
await test('gerador-de-dados-fake', async p => { eq((await txt(p, '#out')).split('\n').length, 5); await p.selectOption('#fmt', 'json'); const j = JSON.parse(await txt(p, '#out')); eq(j.length, 5); if (!cpfOk(j[0].cpf)) throw new Error('cpf'); });

// ---------- IMAGEM ----------
async function mkImg(page, type = 'image/jpeg', w = 800, h = 600, name = 'foto.jpg') {
  const b64 = await page.evaluate(async ([type, w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f00'); g.addColorStop(1, '#00f'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i * 7},80%,50%)`; x.fillRect((i * 37) % w, (i * 53) % h, 20, 20); } return c.toDataURL(type, 0.95).split(',')[1]; }, [type, w, h]);
  const path = join(TMP, name); writeFileSync(path, Buffer.from(b64, 'base64')); return path;
}
const imgInfo = async (page, buf, type) => page.evaluate(async ([b64, type]) => { const i = new Image(); i.src = `data:${type};base64,${b64}`; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, [buf.toString('base64'), type]);
await test('converter-imagem', async p => { const img = await mkImg(p, 'image/jpeg', 800, 600, 'foto.jpg'); await p.selectOption('#fmt', 'image/png'); await p.setInputFiles('#file', img); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); eq(f.name, 'foto.png'); eq(f.buf.slice(1, 4).toString(), 'PNG'); await p.selectOption('#fmt', 'image/webp'); await p.waitForFunction(() => document.querySelector('#results .n')?.textContent === 'foto.webp'); });
await test('comprimir-imagem', async p => { const img = await mkImg(p, 'image/jpeg', 1600, 1200, 'grande.jpg'); await p.setInputFiles('#file', img); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); const orig = readFileSync(img).length; if (f.buf.length >= orig) throw new Error(`não comprimiu ${f.buf.length} >= ${orig}`); });
await test('redimensionar-imagem', async p => { const img = await mkImg(p, 'image/png', 800, 600, 'r.png'); await p.fill('#a', '400'); await p.setInputFiles('#file', img); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); const [w, h] = await imgInfo(p, f.buf, 'image/png'); eq(w + 'x' + h, '400x300'); });
await test('remover-metadados-imagem', async p => { const img = await mkImg(p, 'image/jpeg', 300, 200, 'm.jpg'); await p.setInputFiles('#file', img); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); eq(f.name, 'm-limpa.jpg'); eq(f.buf[0], 0xFF); });

// ---------- PDF ----------
const pageCount = async (buf) => (await PDFDocument.load(buf)).getPageCount();
await test('juntar-pdf', async p => { await p.setInputFiles('#file', [A, B]); await p.click('#goBtn'); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); eq(await pageCount(f.buf), 8); });
await test('dividir-pdf', async p => { await p.setInputFiles('#file', A); await p.waitForFunction(() => document.getElementById('info').textContent.includes('5 páginas')); await p.selectOption('#mode', 'every'); await p.fill('#n', '2'); await p.click('#goBtn'); await p.waitForFunction(() => document.querySelectorAll('#results li').length === 3); const z = await dl(p, () => p.click('#zipBtn')); eq(z.buf.slice(0, 2).toString(), 'PK');
  await p.selectOption('#mode', 'ranges'); await p.fill('#spec', '1-2, 5'); await p.click('#goBtn'); await p.waitForFunction(() => document.querySelectorAll('#results li').length === 2); const f = await dl(p, () => p.click('#results li:nth-child(1) button')); eq(await pageCount(f.buf), 2); });
await test('girar-pdf', async p => { await p.setInputFiles('#file', A); await p.waitForFunction(() => document.getElementById('info').textContent.includes('5 páginas')); await p.fill('#spec', '1'); await p.click('#goBtn'); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); const d = await PDFDocument.load(f.buf); eq(d.getPage(0).getRotation().angle, 90); eq(d.getPage(1).getRotation().angle, 0); });
await test('comprimir-pdf', async p => { await p.setInputFiles('#file', A); await p.waitForFunction(() => document.getElementById('info').textContent.includes('5')); await p.click('#goBtn'); await p.waitForSelector('#results li button', { timeout: 30000 }); const f = await dl(p, () => p.click('#results li button')); eq(await pageCount(f.buf), 5); await p.selectOption('#mode', 'light'); await p.click('#goBtn'); await p.waitForFunction(() => document.querySelectorAll('#results li').length === 1); });
await test('imagem-para-pdf', async p => { const i1 = await mkImg(p, 'image/jpeg', 400, 300, 'i1.jpg'), i2 = await mkImg(p, 'image/png', 300, 500, 'i2.png'), i3 = await mkImg(p, 'image/webp', 300, 300, 'i3.webp'); await p.setInputFiles('#file', [i1, i2, i3]); await p.click('#goBtn'); await p.waitForSelector('#results li button', { timeout: 20000 }); const f = await dl(p, () => p.click('#results li button')); eq(await pageCount(f.buf), 3); });
await test('pdf-para-imagem', async p => { await p.setInputFiles('#file', A); await p.waitForFunction(() => document.getElementById('info').textContent.includes('5')); await p.fill('#spec', '1-2'); await p.click('#goBtn'); await p.waitForFunction(() => document.querySelectorAll('#results li').length === 2, null, { timeout: 30000 }); const f = await dl(p, () => p.click('#results li button')); eq(f.buf.slice(1, 4).toString(), 'PNG'); const [w] = await imgInfo(p, f.buf, 'image/png'); if (w < 400) throw new Error('largura ' + w); eq(await p.$$eval('#thumbs img', l => l.length), 2); });
await test('extrair-paginas-pdf', async p => { await p.setInputFiles('#file', A); await p.waitForFunction(() => document.getElementById('hint').textContent.includes('5 páginas')); await p.fill('#spec', '5, 1-2'); await p.click('#goBtn'); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); eq(await pageCount(f.buf), 3); await p.selectOption('#mode', 'drop'); await p.fill('#spec', '1-3'); await p.click('#goBtn'); await p.waitForFunction(() => /2 página/.test(document.querySelector('#results .s')?.textContent || '')); await p.fill('#spec', '9'); await p.click('#goBtn'); await p.waitForFunction(() => /não existe/.test(document.getElementById('status').textContent)); });
await test('numerar-paginas-pdf', async p => { await p.setInputFiles('#file', A); await p.waitForFunction(() => document.getElementById('info').textContent.includes('5')); await p.selectOption('#what', 'both'); await p.click('#goBtn'); await p.waitForSelector('#results li button'); const f = await dl(p, () => p.click('#results li button')); eq(await pageCount(f.buf), 5); if (f.buf.length < readFileSync(A).length) throw new Error('não adicionou conteúdo'); });

// ---------- CALCULADORAS ----------
await test('calculadora-imc', async p => { await p.fill('#peso', '80'); await p.fill('#altura', '180'); has(await txt(p, '#res'), '24,7'); has(await txt(p, '#cls'), 'Peso normal'); await p.fill('#peso', '100'); has(await txt(p, '#cls'), 'Obesidade grau I'); });
await test('juros-compostos', async p => { await p.fill('#c0', '1000'); await p.fill('#pm', '0'); await p.fill('#tx', '10'); await p.selectOption('#txu', 'a'); await p.fill('#per', '2'); await p.selectOption('#peru', 'a'); has(await txt(p, '#res'), '1.210,00'); });
await test('porcentagem', async p => { eq(await txt(p, '#p1o'), '30'); eq(await txt(p, '#p2o'), '25%'); eq(await txt(p, '#p3o'), '220'); eq(await txt(p, '#p4o'), '180'); eq(await txt(p, '#p5o'), '25%'); });
await test('conversor-de-unidades', async p => { await p.fill('#val', '1'); await p.selectOption('#from', 'quilômetro (km)'); await p.selectOption('#to', 'milha (mi)'); has(await txt(p, '#res'), '0,621371'); await p.selectOption('#cat', 'Temperatura'); await p.fill('#val', '100'); await p.selectOption('#from', '°C'); await p.selectOption('#to', '°F'); has(await txt(p, '#res'), '212'); });
await test('diferenca-entre-datas', async p => { await p.fill('#d1', '2024-01-01'); await p.fill('#d2', '2024-03-01'); eq(await txt(p, '[data-k=dias] b'), '60'); await p.fill('#born', '2000-01-01'); has(await txt(p, '#age'), 'anos'); });
await test('cronometro', async p => { await p.click('#swStart'); await p.waitForTimeout(400); const t = await txt(p, '#sw'); if (t === '00:00.00') throw new Error('não andou'); await p.click('#swLap'); has(await txt(p, '#laps'), '#1'); await p.click('#swReset'); eq(await txt(p, '#sw'), '00:00.00'); await p.fill('#tmin', '0'); await p.fill('#tsec', '2'); await p.click('#tStart'); await p.waitForFunction(() => document.getElementById('tm').textContent === '00:00', null, { timeout: 4000 }); });

// ---------- DEV ----------
await test('formatador-json', async p => { await p.fill('#in', '{"b":1,"a":[1,2]}'); await p.click('#fmtBtn'); has(await txt(p, '#out'), '  "b": 1'); await p.click('#minBtn'); eq(await txt(p, '#out'), '{"b":1,"a":[1,2]}'); await p.fill('#in', '{"a":}'); has(await txt(p, '#st'), 'inválido'); });
await test('base64', async p => { await p.fill('#in', 'Olá, mundo ✓'); await p.click('#encBtn'); eq(await txt(p, '#out'), 'T2zDoSwgbXVuZG8g4pyT'); await p.fill('#in', 'T2zDoSwgbXVuZG8g4pyT'); await p.click('#decBtn'); eq(await txt(p, '#out'), 'Olá, mundo ✓'); });
await test('codificar-url', async p => { await p.fill('#in', 'olá mundo&x=1'); await p.click('#encBtn'); eq(await txt(p, '#out'), 'ol%C3%A1%20mundo%26x%3D1'); await p.fill('#in', 'https://a.com/?q=oi&n=2'); has(await txt(p, '#params'), 'q = oi'); });
await test('gerador-de-hash', async p => { await p.fill('#in', 'abc'); await p.waitForFunction(() => document.getElementById('out').textContent.includes('SHA-256')); has(await txt(p, '#out'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); has(await txt(p, '#out'), 'a9993e364706816aba3e25717850c26c9cd0d89d'); });
await test('conversor-de-cores', async p => { await p.fill('#hex', '#FF0000'); eq(await p.inputValue('#rgb'), '255, 0, 0'); eq(await p.inputValue('#hsl'), '0, 100%, 50%'); await p.fill('#rgb', '0, 255, 0'); eq(await p.inputValue('#hex'), '#00FF00'); await p.fill('#hsl', '240, 100%, 50%'); eq(await p.inputValue('#hex'), '#0000FF'); });
await test('conversor-de-timestamp', async p => { await p.fill('#ts', '0'); has(await txt(p, '#out'), '1970-01-01T00:00:00.000Z'); await p.fill('#ts', '1700000000000'); has(await txt(p, '#out'), 'milissegundos'); });
await test('testador-regex', async p => { has(await txt(p, '#info'), '"ana@exemplo.com"'); await p.fill('#rep', '$2:$1'); has(await txt(p, '#rout'), 'exemplo:ana'); await p.fill('#re', '(['); has(await txt(p, '#hl'), 'inválida'); });

// ---------- HOME ----------
if (!only || only === 'home') {
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  try {
    await page.goto(BASE + '/'); eq(await page.$$eval('.card-li', l => l.length), TOOLS.length);
    await page.fill('#q', 'pdf'); const n = await page.$$eval('.card-li:not([hidden])', l => l.length); if (n < 6) throw new Error('busca pdf: ' + n);
    await page.fill('#q', 'acucar xyz'); await page.waitForSelector('#empty:not([hidden])'); await page.fill('#q', 'inverter'); eq(await page.$$eval('.card-li:not([hidden])', l => l.length), 1);
    await page.fill('#q', ''); await page.click('.cat[data-cat=gen]'); const g = await page.$$eval('.card-li:not([hidden])', l => l.length); eq(g, TOOLS.filter(t => t.cat === 'gen').length);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 2) throw new Error('overflow ' + ov);
    if (errs.length) throw new Error(errs.join('|')); pass++; console.log('✔ home');
  } catch (e) { fail++; fails.push('home'); console.log('✘ home →', e.message); await page.screenshot({ path: TMP + '/fail-home.png', fullPage: true }); }
}

// ---------- VÍDEO E ÁUDIO (ffmpeg.wasm; baixa o núcleo do CDN) ----------
import { execFileSync } from 'node:child_process';
const MP4 = join(TMP, 'teste.mp4'), WAV = join(TMP, 'teste.wav');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', MP4]);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', WAV]);
const big = { timeout: 120000 };
const runMedia = async (p, file, extra) => { await p.setInputFiles('#file', file); await p.waitForFunction(() => /\d:\d\d/.test(document.getElementById('info').textContent)); if (extra) await extra(); await p.click('#goBtn'); await p.waitForSelector('#dl', big); return dl(p, () => p.click('#dl')); };
await test('comprimir-video', async p => { const f = await runMedia(p, MP4); eq(f.name, 'teste-leve.mp4'); eq(f.buf.slice(4, 8).toString(), 'ftyp'); });
await test('cortar-video', async p => { const f = await runMedia(p, MP4, async () => { await p.selectOption('#mode', 'exact'); await p.fill('#ini', '1'); await p.fill('#fim', '3'); }); eq(f.buf.slice(4, 8).toString(), 'ftyp'); const d = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', '-i', '-'], { input: f.buf }).toString(); if (Math.abs(parseFloat(d) - 2) > 0.5) throw new Error('duração ' + d); });
await test('video-para-gif', async p => { const f = await runMedia(p, MP4, async () => { await p.selectOption('#w', '320'); }); eq(f.buf.slice(0, 3).toString(), 'GIF'); });
await test('extrair-audio', async p => { const f = await runMedia(p, MP4); eq(f.name, 'teste-audio.mp3'); if (f.buf.length < 1000) throw new Error('mp3 vazio'); });
await test('cortar-audio', async p => { const f = await runMedia(p, WAV, async () => { await p.selectOption('#fmt', 'wav'); await p.fill('#ini', '1'); await p.fill('#fim', '2'); }); eq(f.buf.slice(0, 4).toString(), 'RIFF'); if (f.buf.length > readFileSync(WAV).length / 2) throw new Error('não cortou'); });
await test('remover-fundo', async p => { const img = await mkImg(p, 'image/jpeg', 400, 300, 'fundo.jpg'); await p.setInputFiles('#file', img); await p.waitForSelector('#results li', big); await p.waitForSelector('#results li button', big); const f = await dl(p, () => p.click('#results li button')); eq(f.name, 'fundo-sem-fundo.png'); eq(f.buf.slice(1, 4).toString(), 'PNG'); });

// ---------- HOME: peça sua tool (rede simulada) ----------
{ const p = await ctx.newPage(); let body = null;
  await p.route('**/rest/v1/rpc/multitool_pedir', r => { body = r.request().postDataJSON(); r.fulfill({ status: 200, contentType: 'application/json', body: '"ok"' }); });
  try { await p.goto(BASE + '/'); await p.fill('#pedTxt', 'quero juntar vídeos'); await p.click('#pedBtn'); await p.waitForFunction(() => /recebido/.test(document.getElementById('pedSt').textContent));
    eq(body.p_texto, 'quero juntar vídeos'); await p.fill('#pedTxt', 'outro pedido qualquer'); await p.click('#pedBtn'); has(await txt(p, '#pedSt'), 'Espere 1 minuto');
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 2) throw new Error('overflow ' + ov); pass++; console.log('✔ home pedido'); }
  catch (e) { fail++; fails.push('home-pedido'); console.log('✘ home-pedido →', e.message); } await p.close(); }

await browser.close(); srv.close();
console.log(`\n${pass} ok, ${fail} falhas${fails.length ? ': ' + fails.join(', ') : ''}`);
process.exit(fail ? 1 : 0);
