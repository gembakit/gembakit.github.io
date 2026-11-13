// Capturas de pantalla de la app compilada a ancho de móvil, en claro y oscuro,
// para revisar que nada se corta ni se monta encima de otra cosa.
// Uso: npm run build && node scripts/screens.mjs <carpeta-salida> [ancho] [ruta-a-chrome]
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';

const outDir = process.argv[2] ?? 'screens';
const width = Number(process.argv[3] ?? 360);
const CHROME = process.argv[4] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(outDir, { recursive: true });

const server = await preview({ preview: { port: 4317, strictPort: true }, logLevel: 'silent' });
const base = 'http://localhost:4317/';

const SHOTS = [
  { name: 'proyectos', hash: '#/proyectos' },
  { name: 'herramientas', hash: '#/herramientas' },
  { name: 'dpmo-vacia', hash: '#/herramientas/dpmo' },
  { name: 'dpmo-ejemplo', hash: '#/herramientas/dpmo', click: /Cargar ejemplo|Load example/, full: true },
  { name: 'dpmo-resultado', hash: '#/herramientas/dpmo', click: /Cargar ejemplo|Load example/, scrollTo: '2 · ' },
  { name: 'dpmo-guia', hash: '#/herramientas/dpmo', click: /^Cómo usarla/ },
  { name: 'referencia', hash: '#/referencia' },
  { name: 'referencia-abierta', hash: '#/referencia', click: /^DMAIC/ },
  { name: 'referencia-guia', hash: '#/referencia', click: /^Cómo es cada herramienta/ },
  { name: 'referencia-glosario', hash: '#/referencia', full: true },
  { name: 'ajustes', hash: '#/ajustes', full: true },
  { name: 'prueba-google', hash: '#/prueba-google', full: true },
  { name: 'capturar', hash: '#/proyectos', click: /^(Capturar|Capture)$/, byLabel: true },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--lang=es-ES'] });
const problems = [];
for (const mode of ['light', 'dark']) {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es' });
  await page.setViewport({ width, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
  for (const s of SHOTS) {
    // Página nueva en cada captura: sin datos ni desplazamiento de la anterior.
    await page.goto('about:blank');
    await page.goto(base + s.hash, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    // Cambiar solo la almohadilla no recarga la página: empezar siempre arriba.
    await page.evaluate(() => window.scrollTo(0, 0));
    if (s.click) {
      const ok = await page.evaluate(
        (src, byLabel) => {
          const re = new RegExp(src);
          const el = [...document.querySelectorAll('button')].find((b) =>
            re.test(byLabel ? b.getAttribute('aria-label') ?? '' : b.textContent?.trim() ?? ''),
          );
          el?.click();
          return Boolean(el);
        },
        s.click.source,
        Boolean(s.byLabel),
      );
      if (!ok) problems.push(`${mode}/${s.name}: no encontré el botón ${s.click}`);
      await new Promise((r) => setTimeout(r, 400));
    }
    // Llevar a la vista un bloque intermedio (por su título) para revisarlo.
    if (s.scrollTo) {
      const ok = await page.evaluate((text) => {
        const el = [...document.querySelectorAll('h2')].find((h) => h.textContent?.trim().startsWith(text));
        el?.scrollIntoView({ block: 'start' });
        window.scrollBy(0, -12);
        return Boolean(el);
      }, s.scrollTo);
      if (!ok) problems.push(`${mode}/${s.name}: no encontré el bloque «${s.scrollTo}»`);
      await new Promise((r) => setTimeout(r, 200));
    }
    // Comprobaciones automáticas: nada más ancho que la pantalla y ningún texto recortado.
    const issues = await page.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`la página es más ancha que la pantalla (${document.documentElement.scrollWidth}px)`);
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (!el.childElementCount && el.textContent?.trim() && cs.overflow !== 'visible' && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow === 'ellipsis') {
          out.push(`texto recortado: «${el.textContent.trim().slice(0, 40)}»`);
        }
      }
      return out;
    });
    for (const i of issues) problems.push(`${mode}/${s.name}: ${i}`);
    await page.screenshot({ path: `${outDir}/${s.name}-${mode}.png` });
    if (s.full) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({ path: `${outDir}/${s.name}-${mode}-final.png` });
    }
  }
  await page.close();
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(problems.length ? `Problemas:\n- ${problems.join('\n- ')}` : 'Sin problemas detectados.');
