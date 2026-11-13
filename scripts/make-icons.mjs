// Genera el icono provisional (barras de Pareto con su línea acumulada) en los
// tamaños que pide Android, con el Chrome instalado en el equipo.
// Uso: node scripts/make-icons.mjs [ruta-a-chrome]
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.argv[2] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function svg({ rounded, inset }) {
  // inset: escala del dibujo (los iconos "maskable" necesitan margen de seguridad).
  const s = inset;
  const o = (512 * (1 - s)) / 2;
  const g = (x, y) => `${o + x * s},${o + y * s}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A87A4E"/><stop offset="1" stop-color="#7A512E"/></linearGradient></defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#g)"/>
  <g fill="#F4EEE4">
    <rect x="${o + 120 * s}" y="${o + 196 * s}" width="${76 * s}" height="${200 * s}" rx="${12 * s}"/>
    <rect x="${o + 218 * s}" y="${o + 266 * s}" width="${76 * s}" height="${130 * s}" rx="${12 * s}" opacity=".85"/>
    <rect x="${o + 316 * s}" y="${o + 320 * s}" width="${76 * s}" height="${76 * s}" rx="${12 * s}" opacity=".7"/>
  </g>
  <polyline points="${g(158, 160)} ${g(256, 124)} ${g(354, 108)}" fill="none" stroke="#F4EEE4" stroke-width="${16 * s}" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#F4EEE4"><circle cx="${o + 158 * s}" cy="${o + 160 * s}" r="${18 * s}"/><circle cx="${o + 256 * s}" cy="${o + 124 * s}" r="${18 * s}"/><circle cx="${o + 354 * s}" cy="${o + 108 * s}" r="${18 * s}"/></g>
</svg>`;
}

const out = 'public/icons';
mkdirSync(out, { recursive: true });
writeFileSync('public/favicon.svg', svg({ rounded: true, inset: 1 }));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const shots = [
  ['icon-192.png', 192, { rounded: true, inset: 1 }],
  ['icon-512.png', 512, { rounded: true, inset: 1 }],
  ['maskable-512.png', 512, { rounded: false, inset: 0.8 }],
  ['apple-touch-icon.png', 180, { rounded: false, inset: 0.86 }],
];
for (const [name, size, opts] of shots) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(opts).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `${out}/${name}`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log('Iconos generados en', out);
