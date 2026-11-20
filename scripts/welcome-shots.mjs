// Capturas de la bienvenida en teléfono, tableta y ordenador (inicio y «Conectar con Google»),
// en claro y oscuro, y aviso si algo se sale a lo ancho.
// Uso: npm run build && node scripts/welcome-shots.mjs <carpeta-salida> [ruta-a-chrome]
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';

const outDir = process.argv[2] ?? 'screens';
const CHROME = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(outDir, { recursive: true });
const server = await preview({ preview: { port: 4318, strictPort: true }, logLevel: 'silent' });

const SIZES = [
  { name: 'tel320', width: 320, height: 640, mobile: true },
  { name: 'tel390', width: 390, height: 844, mobile: true },
  { name: 'tableta', width: 820, height: 1180, mobile: true },
  { name: 'pc1366', width: 1366, height: 768, mobile: false },
  { name: 'pc1920', width: 1920, height: 1080, mobile: false },
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--lang=es-ES'] });
let problems = 0;
for (const s of SIZES) {
  for (const mode of ['light', 'dark']) {
    const page = await browser.newPage();
    await page.setViewport({ width: s.width, height: s.height, deviceScaleFactor: s.mobile ? 2 : 1, isMobile: s.mobile, hasTouch: s.mobile });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
    await page.goto('http://localhost:4318/#/bienvenida', { waitUntil: 'networkidle0' });
    await wait(2600);
    const shot = async (step) => {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 0) {
        problems++;
        console.log(`${s.name} ${mode} ${step}: se sale ${over} px a lo ancho`);
      }
      await page.screenshot({ path: `${outDir}/${s.name}-${mode}-${step}.png`, fullPage: s.mobile });
    };
    await shot('inicio');
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find((b) => /^(Conectar con Google|Connect with Google)$/.test(b.textContent.trim()))?.click(),
    );
    await wait(900);
    await shot('conectar');
    await page.close();
  }
}
await browser.close();
await server.close();
console.log(problems ? `${problems} problemas` : 'Sin problemas detectados.');
