// Comprueba la app publicada: carga, instala el modo sin conexión y vuelve a
// abrirla sin red (simula el modo avión del móvil).
// Uso: node scripts/check-live.mjs <url> <carpeta-salida> [ruta-a-chrome]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'https://pasqualebf.github.io/gemba-kit/';
const outDir = process.argv[3] ?? 'screens-live';
const CHROME = process.argv[4] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--lang=es-ES'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const results = [];

await page.goto(url, { waitUntil: 'networkidle0' });
results.push(['carga en línea', Boolean(await page.$('main h1'))]);

const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
  if (!href) return null;
  const r = await fetch(href);
  return r.ok ? r.json() : null;
});
results.push(['manifiesto de instalación con iconos', Boolean(manifest?.icons?.length >= 2)]);

// Espera a que el service worker controle la página y haya precargado todo.
const swReady = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return Boolean(reg.active);
});
results.push(['modo sin conexión instalado', swReady]);
await page.reload({ waitUntil: 'networkidle0' });

await page.setOfflineMode(true);
await page.goto(url + '#/herramientas/muestra', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('main h1', { timeout: 10000 }).catch(() => {});
const offlineOk = await page.evaluate(() => document.querySelector('main h1')?.textContent ?? '');
results.push([`abre sin red (título: «${offlineOk}»)`, offlineOk.length > 0]);
await page.screenshot({ path: `${outDir}/sin-red.png` });

await browser.close();
for (const [name, ok] of results) console.log(`${ok ? 'OK ' : 'FALLA'} ${name}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
