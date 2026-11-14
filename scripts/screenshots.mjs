// Captura pantallas de la demo (móvil y escritorio) en docs/screenshots/*.webp
// usando Edge/Chrome en modo headless vía DevTools Protocol. Sin dependencias.
//
// Uso:
//   npm run build && npx vite preview --port 4173 &
//   node scripts/screenshots.mjs [http://localhost:4173]
//
// Variable BROWSER para indicar otro navegador (ruta al ejecutable).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = resolve('docs/screenshots');
const PORT = 9333;

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const browserPath = CANDIDATES.find((p) => existsSync(p));
if (!browserPath) throw new Error('No se encontró Edge/Chrome. Defina BROWSER=/ruta/al/navegador');

const SHOTS = [
  { name: 'login', path: '/login', auth: false },
  { name: 'dashboard', path: '/', wait: 'Ingresos y gastos, últimos 6 meses' },
  { name: 'movimientos', path: '/movimientos', wait: 'Neto' },
  { name: 'registro-rapido', path: '/registro-rapido', wait: '¿De qué?' },
  { name: 'cuentas', path: '/cuentas', wait: 'Total pendiente' },
  { name: 'tasas', path: '/tasas', wait: 'Historial' },
  { name: 'nomina', path: '/nomina', wait: 'Nómina de' },
  { name: 'reportes', path: '/reportes', wait: 'Descargar PDF' },
];
const VIEWPORTS = [
  { suffix: 'movil', width: 390, height: 844, mobile: true, scale: 2 },
  { suffix: 'escritorio', width: 1366, height: 900, mobile: false, scale: 1 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), 'nc-shots-'));
  const proc = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--lang=es-CU',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    let version;
    for (let i = 0; i < 50 && !version; i++) {
      try {
        version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      } catch {
        await sleep(200);
      }
    }
    const target = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
    ).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r, { once: true }));

    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    const send = (method, params = {}) =>
      new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, (m) =>
          m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result),
        );
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    const evaluate = async (expression) =>
      (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))
        .result.value;
    const waitFor = async (expression, timeout = 20000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await evaluate(expression)) return true;
        await sleep(250);
      }
      throw new Error(`Tiempo agotado esperando: ${expression}`);
    };
    const go = async (path) => {
      await send('Page.navigate', { url: BASE + path });
      await sleep(400);
      await waitFor('document.readyState === "complete"');
    };

    await send('Page.enable');
    await send('Runtime.enable');

    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.scale,
        mobile: vp.mobile,
      });

      // Sesión limpia y login con las credenciales demo precargadas.
      await go('/login');
      await evaluate('localStorage.clear(), true');
      await go('/login');
      for (const shot of SHOTS) {
        if (shot.auth !== false) continue;
        await waitFor(`document.body.innerText.includes('admin@demo.cu')`);
        await sleep(300);
        await capture(shot.name, vp.suffix);
      }
      await evaluate(`document.querySelector('form button[type="submit"]').click(), true`);
      await waitFor(`location.pathname === '/'`);

      for (const shot of SHOTS) {
        if (shot.auth === false) continue;
        await go(shot.path);
        await waitFor(`document.body.innerText.includes(${JSON.stringify(shot.wait)})`);
        // Espera a que desaparezcan los esqueletos de carga y se dibujen los gráficos.
        await waitFor(`!document.querySelector('[aria-busy="true"], .animate-pulse')`).catch(
          () => {},
        );
        await sleep(900);
        await capture(shot.name, vp.suffix);
      }
    }

    async function capture(name, suffix) {
      const { data } = await send('Page.captureScreenshot', {
        format: 'webp',
        quality: 80,
        captureBeyondViewport: false,
      });
      const file = join(OUT, `${name}-${suffix}.webp`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.info('✓', file);
    }

    ws.close();
  } finally {
    proc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
