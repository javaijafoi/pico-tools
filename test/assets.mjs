// Gera og.png e ícones do PWA a partir de HTML. Uso: node test/assets.mjs
import { chromium } from 'playwright';
import { writeFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('../public/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = join(ROOT, new URL(q.url, 'http://x').pathname); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(0);
const BASE = `http://localhost:${srv.address().port}`;
const b = await chromium.launch();
const css = `@font-face{font-family:P;src:url(/fonts/ps2p.woff2)}@font-face{font-family:V;src:url(/fonts/vt323.woff2)}*{margin:0;box-sizing:border-box}body{background:#1d2b53;font-family:P}`;
const tiles = ['#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
writeFileSync(ROOT + '_og.html', `<!doctype html><meta charset=utf-8><style>${css}.w{padding:60px;height:630px;position:relative;overflow:hidden}.t{color:#ffec27;font-size:84px;text-shadow:8px 8px 0 #000;line-height:1.3}.t b{color:#ff77a8;font-weight:400}.s{font-family:V;font-size:50px;color:#c2c3c7;margin-top:26px;max-width:860px;line-height:1.1}.g{position:absolute;right:50px;bottom:50px;display:grid;grid-template-columns:repeat(4,70px);gap:12px}.g i{height:70px;box-shadow:inset -8px -8px 0 rgba(0,0,0,.3),inset 8px 8px 0 rgba(255,255,255,.4),0 8px 0 #000}.f{position:absolute;left:60px;bottom:50px;font-size:20px;color:#fff1e8}</style><div class="w"><div class="t">PICO<b>TOOLS</b></div><div class="s">41 ferramentas grátis: PDF, imagem, texto, CPF, QR Code e mais. Tudo roda no seu aparelho.</div><div class="g">${tiles.map(c => `<i style="background:${c}"></i>`).join('')}</div><div class="f">javaijafoi</div></div>`);
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(BASE + '/_og.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
await p.screenshot({ path: ROOT + 'og.png' });
rmSync(ROOT + '_og.html');
for (const n of [192, 512]) {
  const q = await b.newPage({ viewport: { width: n, height: n } });
  await q.setContent(`<style>*{margin:0}body{width:${n}px;height:${n}px;background:#1d2b53;display:grid;place-items:center}svg{width:${n * 0.7}px;image-rendering:pixelated}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#ffec27" d="M3 3h10v3H3z"/><path fill="#ff77a8" d="M3 6h3v8H3z"/><path fill="#fff1e8" d="M7 7h6v2H7z"/><path fill="#00e436" d="M7 10h4v2H7z"/></svg>`);
  await q.screenshot({ path: ROOT + `icon-${n}.png` });
}
await b.close(); srv.close();
