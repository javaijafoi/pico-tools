import { chromium } from 'playwright';
const b = await chromium.launch();
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const d = await b.newContext({ viewport: { width: 1280, height: 800 } });
const go = async (ctx, url, out, full = false) => { const p = await ctx.newPage(); await p.goto('http://localhost:4173' + url); await p.waitForTimeout(700); await p.screenshot({ path: out, fullPage: full }); await p.close(); };
await go(m, '/', '/tmp/h-m.png'); await go(d, '/', '/tmp/h-d.png'); await go(m, '/juntar-pdf/', '/tmp/t-m.png'); await go(d, '/gerador-de-qr-code/', '/tmp/t-d.png');
await b.close();
