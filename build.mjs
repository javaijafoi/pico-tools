// Gera as páginas estáticas (home + uma por ferramenta), sitemap, llms.txt, manifest e service worker.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TOOLS, CATS, SITE } from './public/js/registry.js';
process.chdir('public');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PERSON = { '@type': 'Person', '@id': 'https://javaijafoi.dev/#peter', name: 'Peter Mac', alternateName: 'javaijafoi', url: 'https://javaijafoi.dev', sameAs: ['https://github.com/javaijafoi'] };
const BUILD = createHash('sha1').update(readFileSync('js/registry.js')).update(String(Date.now())).digest('hex').slice(0, 8);
const ld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

const head = ({ title, desc, url, extra = '' }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Peter Mac (javaijafoi)">
<meta name="theme-color" content="#1d2b53">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Pico Multitool"><meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/vt323.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/style.css">
${extra}
</head>`;

const footer = `<footer>
<p>PICO MULTITOOL · tudo roda no seu aparelho, nada é enviado</p>
<p>feito por <a href="https://javaijafoi.dev">Peter Mac (javaijafoi)</a> · <a href="https://github.com/javaijafoi/pico-tools">código no GitHub</a> · MIT</p>
</footer>`;

const card = t => `<li class="card-li" data-cat="${t.cat}" data-s="${esc(t.name + ' ' + t.desc + ' ' + t.kw)}"><a class="card" href="/${t.slug}/" style="--c:${CATS[t.cat].color}"><span class="tag">${CATS[t.cat].name}</span><span class="ic" aria-hidden="true">${t.icon}</span><span class="nm">${esc(t.name)}</span><span class="ds">${esc(t.desc)}</span></a></li>`;
const topbar = `<header class="top"><a class="logo" href="/">PICO<b>TOOLS</b></a><span class="meta">${TOOLS.length} FERRAMENTAS<br>100% LOCAL</span></header>`;

const out = (path, data) => { const dir = path.split('/').slice(0, -1).join('/'); if (dir) mkdirSync(dir, { recursive: true }); writeFileSync(path, data); };

// HOME
const homeDesc = `${TOOLS.length} ferramentas grátis que rodam no seu navegador: remover fundo de imagem, comprimir imagem e vídeo, cortar vídeo e áudio, juntar e dividir PDF, QR Code e mais. Sem upload, funciona no celular.`;
out('index.html', head({
  title: `Pico Multitool · ${TOOLS.length} ferramentas grátis que rodam no seu aparelho`, desc: homeDesc, url: SITE + '/',
  extra: ld({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'Pico Multitool', description: homeDesc, inLanguage: 'pt-BR', author: { '@id': PERSON['@id'] } },
    PERSON,
    { '@type': 'ItemList', name: 'Ferramentas do Pico Multitool', itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/${t.slug}/`, name: t.name })) },
  ] }),
}) + `
<body><div class="wrap">
${topbar}
<section class="hero"><h1>FERRAMENTAS ÚTEIS,<br>NO SEU APARELHO</h1><p>Imagem, vídeo, áudio, PDF, texto e calculadoras. Abre no celular ou no PC e nada sobe para servidor nenhum.</p>
<div class="badges"><span class="chip">SEM UPLOAD</span><span class="chip y">FUNCIONA OFFLINE</span><span class="chip p">GRÁTIS · SEM CADASTRO</span></div></section>
<main>
<label class="sr" for="q">Buscar ferramenta</label>
<input id="q" class="search" type="search" placeholder="Buscar: pdf, cpf, qr code…" autocomplete="off">
<div class="cats" role="group" aria-label="Categorias"><button class="cat" data-cat="all" aria-pressed="true">TODAS</button>${Object.entries(CATS).map(([k, c]) => `<button class="cat" data-cat="${k}" aria-pressed="false">${c.name}</button>`).join('')}</div>
<ul class="grid" id="grid">${TOOLS.map(card).join('')}</ul>
<p class="empty" id="empty" hidden>Nenhuma ferramenta encontrada. Tente "pdf", "imagem" ou "cpf".</p>
</main>
<section class="panel" id="pedido"><h2>PEÇA SUA TOOL</h2><p class="lead">Faltou alguma ferramenta? Conte o que você precisa. Eu leio os pedidos e vou criando as mais pedidas.</p>
<form id="pedidoForm" autocomplete="off"><label class="f"><span>O que você quer que a ferramenta faça?</span><textarea id="pedTxt" maxlength="500" rows="3" required minlength="5" placeholder="Ex.: juntar vídeos, remover áudio de vídeo…"></textarea></label>
<label class="f"><span>Contato (opcional, se quiser aviso quando ficar pronta)</span><input type="text" id="pedCont" maxlength="100" placeholder="e-mail ou @usuario"></label>
<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Não preencha<input type="text" id="pedIsca" tabindex="-1" autocomplete="off"></label></div>
<div class="row"><button type="submit" class="btn g" id="pedBtn">ENVIAR PEDIDO</button></div><div class="status" id="pedSt" role="status" aria-live="polite"></div></form></section>
<section class="panel" id="modulos"><h2>MÓDULOS BAIXADOS</h2><p class="lead">Tudo roda no seu aparelho, mas algumas ferramentas (vídeo, OCR, remover fundo) precisam baixar um módulo uma vez. Aqui você vê o que já baixou e remove o que não quer guardar.</p><div id="modBox"></div></section>
<section class="seo"><h2>COMO FUNCIONA</h2><p>Cada ferramenta roda dentro do navegador, com JavaScript. Seus arquivos e textos ficam no aparelho: não existe servidor recebendo PDFs, fotos ou senhas. Depois da primeira visita, as ferramentas continuam funcionando sem internet.</p></section>
${footer}
</div><script type="module" src="/js/app.js"></script></body></html>
`);

// FERRAMENTAS
for (const t of TOOLS) {
  const url = `${SITE}/${t.slug}/`;
  const title = `${t.name} grátis, online e sem upload · Pico Multitool`;
  const rel = TOOLS.filter(x => x.cat === t.cat && x.slug !== t.slug).slice(0, 4);
  out(`${t.slug}/index.html`, head({ title, desc: `${t.seo} Grátis, sem cadastro e roda no seu aparelho.`, url,
    extra: ld({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebApplication', '@id': url + '#app', url, name: t.name, description: t.seo, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (navegador)', inLanguage: 'pt-BR', browserRequirements: 'Requer JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' }, isPartOf: { '@id': SITE + '/#site' }, author: { '@id': PERSON['@id'] } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Pico Multitool', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: CATS[t.cat].name, item: SITE + '/#' + t.cat }, { '@type': 'ListItem', position: 3, name: t.name, item: url }] },
    ] }) }) + `
<body data-tool="${t.slug}"><div class="wrap">
${topbar}
<nav class="crumb" aria-label="Você está em"><a href="/">PICO MULTITOOL</a> › ${CATS[t.cat].name}</nav>
<div class="tool-h"><span class="ic" aria-hidden="true">${t.icon}</span><h1>${esc(t.name)}</h1></div>
<p class="lead">${esc(t.desc)}</p>
<main id="tool"><div class="panel"><h2>CARREGANDO…</h2><noscript>Esta ferramenta precisa de JavaScript ligado no navegador.</noscript></div></main>
<section class="seo"><h2>SOBRE ESTA FERRAMENTA</h2><p>${esc(t.seo)}</p><p>Tudo é processado no próprio aparelho, no navegador. Nada é enviado para servidores, não há cadastro e depois da primeira visita ela funciona offline.</p></section>
<section class="related"><h2>OUTRAS FERRAMENTAS</h2><ul class="grid">${rel.map(card).join('')}</ul></section>
${footer}
</div><script type="module" src="/js/app.js"></script></body></html>
`);
}

// sitemap, robots, llms
const today = new Date().toISOString().slice(0, 10);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[['/', '1.0'], ...TOOLS.map(t => [`/${t.slug}/`, '0.8'])].map(([p, pr]) => `<url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`);
out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
out('llms.txt', `# Pico Multitool\n\n> ${TOOLS.length} ferramentas gratuitas em português que rodam inteiras no navegador (PDF, imagem, texto, geradores, calculadoras e utilidades de desenvolvedor). Nada é enviado a servidores. Feito por Peter Mac (javaijafoi), em estilo PICO-8. Código aberto (MIT): https://github.com/javaijafoi/pico-tools\n\n${Object.entries(CATS).map(([k, c]) => `## ${c.name}\n${TOOLS.filter(t => t.cat === k).map(t => `- [${t.name}](${SITE}/${t.slug}/): ${t.desc}`).join('\n')}`).join('\n\n')}\n\n## Autor\n- [Portfólio de Peter Mac](https://javaijafoi.dev)\n- [GitHub](https://github.com/javaijafoi)\n`);

out('manifest.webmanifest', JSON.stringify({ name: 'Pico Multitool', short_name: 'Pico Multitool', description: homeDesc, lang: 'pt-BR', start_url: '/', scope: '/', display: 'standalone', background_color: '#1d2b53', theme_color: '#1d2b53', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }], shortcuts: TOOLS.slice(0, 4).map(t => ({ name: t.name, url: `/${t.slug}/` })) }, null, 1));

// service worker: shell em cache, o resto sob demanda
const shell = ['/', '/css/style.css', '/js/app.js', '/js/lib.js', '/js/registry.js', '/fonts/vt323.woff2', '/fonts/ps2p.woff2', '/favicon.svg'];
out('sw.js', `// gerado por build.mjs
const V = 'pico-tools-${BUILD}';
// Motores e modelos (CDN) ficam no cache 'pico-modelos', que sobrevive às novas versões do site.
const MOD = /^https:\\/\\/(staticimgly\\.com\\/|cdn\\.jsdelivr\\.net\\/(npm\\/(@ffmpeg\\/core|@imgly|onnxruntime-web|tesseract\\.js-core)|gh\\/naptha\\/tessdata))/;
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(${JSON.stringify(shell)})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'pico-modelos').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method === 'GET' && MOD.test(r.url) && !r.headers.has('range')) { e.respondWith(caches.open('pico-modelos').then(async c => { const hit = await c.match(r.url); if (hit) return hit; const res = await fetch(r); if (res.status === 200) c.put(r.url, res.clone()).catch(() => {}); return res; })); return; }
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
`);
writeFileSync('version.json', JSON.stringify({ build: BUILD }));
console.log('ok', TOOLS.length, 'ferramentas, build', BUILD);
