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
  { name: 'dpmo-exportar', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo|Load example/, /^Exportar$/] },
  // «De dónde sale» cada valor: la ventana con la fórmula y los números.
  { name: 'explica-dpu', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^DPU/], full: true },
  { name: 'explica-dpo', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^DPO/], full: true },
  { name: 'explica-dpmo', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^[\d.]+\s*DPMO/], full: true },
  { name: 'explica-z', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^Z del proceso/], full: true },
  { name: 'explica-sigma', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^Nivel sigma/], full: true },
  { name: 'explica-rendimiento', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^Rendimiento/], full: true },
  { name: 'explica-rty', hash: '#/herramientas/fpy', click: [/Cargar ejemplo/, /^RTY/], full: true },
  { name: 'explica-oculta', hash: '#/herramientas/fpy', click: [/Cargar ejemplo/, /^[\d,]+ %\s*Fábrica oculta/], full: true },
  { name: 'explica-paso', hash: '#/herramientas/fpy', click: [/Cargar ejemplo/, /^Paso 1/], full: true },
  { name: 'takt-vacia', hash: '#/herramientas/takt', full: true },
  { name: 'takt-ejemplo', hash: '#/herramientas/takt', click: /Cargar ejemplo/, full: true },
  { name: 'takt-resultado', hash: '#/herramientas/takt', click: /Cargar ejemplo/, scrollTo: '2 · ' },
  { name: 'explica-takt', hash: '#/herramientas/takt', click: [/Cargar ejemplo/, /^Takt/], full: true },
  { name: 'explica-minimo', hash: '#/herramientas/takt', click: [/Cargar ejemplo/, /^Mínimo de estaciones/], full: true },
  { name: 'explica-eficiencia', hash: '#/herramientas/takt', click: [/Cargar ejemplo/, /^Eficiencia del balanceo/], full: true },
  { name: 'explica-capacidad', hash: '#/herramientas/takt', click: [/Cargar ejemplo/, /^Capacidad/], full: true },
  { name: 'oee-vacia', hash: '#/herramientas/oee', full: true },
  { name: 'oee-resultado', hash: '#/herramientas/oee', click: /Cargar ejemplo/, scrollTo: '2 · ' },
  { name: 'explica-oee', hash: '#/herramientas/oee', click: [/Cargar ejemplo/, /^OEE/], full: true },
  { name: 'explica-rendimiento-oee', hash: '#/herramientas/oee', click: [/Cargar ejemplo/, /^Rendimiento/], full: true },
  { name: 'explica-velocidad', hash: '#/herramientas/oee', click: [/Cargar ejemplo/, /Pérdida por velocidad/], full: true },
  { name: 'kanban-vacia', hash: '#/herramientas/kanban', full: true },
  { name: 'kanban-resultado', hash: '#/herramientas/kanban', click: /Cargar ejemplo/, scrollTo: '2 · ' },
  { name: 'explica-kanban', hash: '#/herramientas/kanban', click: [/Cargar ejemplo/, /^Tarjetas/], full: true },
  { name: 'roi-vacia', hash: '#/herramientas/roi', full: true },
  { name: 'roi-resultado', hash: '#/herramientas/roi', click: /Cargar ejemplo/, scrollTo: '2 · ' },
  { name: 'roi-por-unidad', hash: '#/herramientas/roi', click: [/Cargar ejemplo/, /^Unidades$/], full: true, only: 'light' },
  { name: 'roi-por-anio', hash: '#/herramientas/roi', click: /^Distinto cada año$/, full: true },
  { name: 'explica-payback', hash: '#/herramientas/roi', click: [/Cargar ejemplo/, /^Payback/], full: true },
  { name: 'fpy-vacia', hash: '#/herramientas/fpy', full: true },
  { name: 'fpy-ejemplo', hash: '#/herramientas/fpy', click: /Cargar ejemplo|Load example/, full: true },
  { name: 'fpy-resultado', hash: '#/herramientas/fpy', click: /Cargar ejemplo|Load example/, scrollTo: '2 · ' },
  { name: 'fpy-importar', hash: '#/herramientas/fpy', click: /^Importar$/ },
  {
    name: 'fpy-importar-vista',
    hash: '#/herramientas/fpy',
    click: /^Importar$/,
    fill: ['[role="dialog"] textarea', 'Paso\tEntran\tBuenas a la 1.ª\nSoldadura por ola de la placa base\t1.200\t1.150\nInspección\t1.150\t1.100\nTotal\t2.350\tn/d\nEmbalaje\t1.100\t1.098\n'],
    then: /^Leer lo pegado$/,
    full: true,
  },
  // Proyectos: los datos se quedan en el navegador entre capturas, así que van encadenadas.
  { name: 'proyecto-nuevo', hash: '#/proyectos/nuevo', full: true },
  { name: 'proyecto-creado', hash: '#/proyectos/nuevo', fill: ['main input', 'Rechazo línea 3'], then: /^Crear proyecto$/, only: 'light' },
  { name: 'dpmo-guardar', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^Guardar en un proyecto$/], full: true },
  { name: 'dpmo-guardado', hash: '#/herramientas/dpmo', click: [/Cargar ejemplo/, /^Guardar en un proyecto$/], then: /^Guardar$/ },
  // Una segunda medición (FPY) en el mismo proyecto, para poder filtrar.
  { name: 'fpy-guardado', hash: '#/herramientas/fpy', click: [/Cargar ejemplo/, /^Guardar en un proyecto$/], then: /^Guardar$/, only: 'light' },
  {
    name: 'hito-nuevo',
    hash: '#/proyectos',
    click: [/Rechazo línea 3/, /^Añadir hito$/],
    fill: ['[role="dialog"] input', 'Implantación 5S en la llenadora'],
    full: true,
    only: 'light',
  },
  {
    name: 'hito-guardado',
    hash: '#/proyectos',
    click: [/Rechazo línea 3/, /^Añadir hito$/],
    fill: ['[role="dialog"] input', 'Cambio de turno: estándar de arranque nuevo en la etiquetadora'],
    then: /^Guardar$/,
    full: true,
    only: 'light',
  },
  { name: 'filtrar', hash: '#/proyectos', click: [/Rechazo línea 3/, /^Filtrar y ordenar/], full: true },
  {
    name: 'filtrado',
    hash: '#/proyectos',
    click: [/Rechazo línea 3/, /^Filtrar y ordenar/],
    fill: ['[role="dialog"] select', 'fpy'],
    then: /^Ver /,
  },
  { name: 'proyecto-editar', hash: '#/proyectos', click: [/Rechazo línea 3/, { label: /^Editar proyecto$/ }], full: true },
  { name: 'medicion-editar', hash: '#/proyectos', click: [/Rechazo línea 3/, /DPMO y nivel sigma/, { label: /^Editar información$/ }], full: true },
  // Historial de versiones del proyecto: vacío, con una versión guardada a mano y su detalle.
  { name: 'historial-vacio', hash: '#/proyectos', click: [/Rechazo línea 3/, { label: /^Historial de versiones$/ }], full: true, only: 'light' },
  { name: 'historial', hash: '#/proyectos', click: [/Rechazo línea 3/, { label: /^Historial de versiones$/ }, /^Guardar versión ahora$/], full: true },
  { name: 'historial-version', hash: '#/proyectos', click: [/Rechazo línea 3/, { label: /^Historial de versiones$/ }, /Guardada por ti/], full: true },
  // Un proyecto 5S: las fases con los nombres más largos.
  {
    name: 'proyecto-5s',
    hash: '#/proyectos/nuevo',
    fill: ['main input', 'Orden almacén'],
    then: [/^Implantación 5S/, /^Crear proyecto$/, /^4S/],
    only: 'light',
  },
  { name: 'proyectos-lista', hash: '#/proyectos' },
  { name: 'proyecto-mediciones', hash: '#/proyectos', click: /Rechazo línea 3/, full: true },
  { name: 'medicion', hash: '#/proyectos', click: [/Rechazo línea 3/, /DPMO y nivel sigma/], full: true },
  { name: 'referencia', hash: '#/referencia' },
  { name: 'referencia-guia', hash: '#/referencia', click: [/^Guía de uso/, /^Cómo es cada herramienta/] },
  { name: 'referencia-glosario', hash: '#/referencia', click: /^Glosario/ },
  { name: 'referencia-abierta', hash: '#/referencia', click: [/^Glosario/, /^DMAIC/] },
  { name: 'referencia-glosario-entero', hash: '#/referencia', click: /^Glosario/, full: true, only: 'light' },
  { name: 'ajustes', hash: '#/ajustes', full: true },
  { name: 'datos', hash: '#/ajustes/datos', full: true },
  { name: 'datos-descargada', hash: '#/ajustes/datos', click: /^Descargar copia$/, full: true, only: 'light' },
  { name: 'prueba-google', hash: '#/prueba-google', full: true },
  { name: 'capturar', hash: '#/proyectos', click: /^(Capturar|Capture)$/, byLabel: true },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--lang=es-ES'] });
// Sin descargas de verdad: la captura «datos-descargada» pulsa «Descargar copia»
// y, si no, el archivo acabaría en la carpeta Descargas del ordenador.
await (await browser.target().createCDPSession()).send('Browser.setDownloadBehavior', { behavior: 'deny' });
const problems = [];
for (const mode of ['light', 'dark']) {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es' });
  await page.setViewport({ width, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
  for (const s of SHOTS) {
    // Capturas que cambian datos y solo deben hacerse una vez (por ejemplo, crear el proyecto).
    if (s.only && s.only !== mode) continue;
    // Página nueva en cada captura: sin datos ni desplazamiento de la anterior.
    await page.goto('about:blank');
    await page.goto(base + s.hash, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    // Cambiar solo la almohadilla no recarga la página: empezar siempre arriba.
    await page.evaluate(() => window.scrollTo(0, 0));
    // Uno o varios toques seguidos (por ejemplo, «Cargar ejemplo» y después «Exportar»);
    // con «fill», se escribe un texto en un campo y siguen los toques de «then».
    const clicks = [...(s.click ? [s.click].flat() : []), ...(s.fill ? [{ fill: s.fill }] : []), ...(s.then ? [s.then].flat() : [])];
    for (const click of clicks) {
      if (click.fill) {
        await page.evaluate(([selector, text]) => {
          const el = document.querySelector(selector);
          const proto =
            el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, click.fill);
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      // {label: /…/} toca un botón solo con icono por su nombre accesible.
      const re = click.label ?? click;
      const ok = await page.evaluate(
        (src, byLabel) => {
          const re = new RegExp(src);
          const el = [...document.querySelectorAll('button, label')].find((b) =>
            re.test(byLabel ? b.getAttribute('aria-label') ?? '' : b.textContent?.trim() ?? ''),
          );
          el?.click();
          return Boolean(el);
        },
        re.source,
        Boolean(s.byLabel || click.label),
      );
      if (!ok) problems.push(`${mode}/${s.name}: no encontré el botón ${re}`);
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
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) dialog.scrollTop = dialog.scrollHeight;
      });
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({ path: `${outDir}/${s.name}-${mode}-final.png` });
    }
  }
  await page.close();
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(problems.length ? `Problemas:\n- ${problems.join('\n- ')}` : 'Sin problemas detectados.');
