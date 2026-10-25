// Mando a distancia de Chrome (sin dependencias) para ver las pantallas de verdad: abre una página en un navegador sin
// ventana, recoge los errores de la consola y hace capturas. Adaptado de Aldeanos vs Lobos.
//
//   const nav = await iniciarNavegador();
//   const pestana = await nav.abrir('http://localhost:8080/public/tablero.html', { ancho: 1280, alto: 800 });
//   await pestana.esperarSelector('.tablero');
//   await pestana.captura('tablero.png');
//   console.log(nav.errores);          // errores de JavaScript, de consola o de red que haya habido
//   nav.cerrar();
//
// Con CHROME=ruta se elige otro navegador; con PUERTO_CHROME, otro puerto de depuración.
// nav.errores recoge los errores de JavaScript y de consola; nav.red, las peticiones que fallaron (un archivo que no existe).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const espera = ms => new Promise(r => setTimeout(r, ms));

// El Chrome (o Chromium) que haya en este ordenador, o null si no hay ninguno.
export function buscarChrome() {
  return [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find(ruta => ruta && existsSync(ruta)) ?? null;
}

export async function iniciarNavegador({ puerto: puertoPorDefecto = 9333, capturas = join(tmpdir(), 'duenos-capturas') } = {}) {
  const puerto = Number(process.env.PUERTO_CHROME) || puertoPorDefecto;
  mkdirSync(capturas, { recursive: true });
  const chrome = spawn(buscarChrome() ?? 'chrome', [
    '--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${join(tmpdir(), `duenos-chrome-${puerto}`)}`,
    '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars',
    ...(process.env.CI ? ['--no-sandbox', '--disable-gpu'] : []),
  ], { stdio: 'ignore' });

  let salida = null;
  chrome.once('exit', codigo => { salida = codigo; });
  chrome.once('error', e => { salida = e.message; });
  let ws;
  // Chrome puede tardar en arrancar, sobre todo la primera vez: se espera hasta 30 s.
  for (let i = 0; i < 100 && !ws && salida === null; i++) {
    try {
      const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${puerto}/json/version`)).json();
      ws = new WebSocket(webSocketDebuggerUrl);
    } catch { await espera(300); }
  }
  if (!ws) throw new Error(salida === null ? `Chrome no abrió el puerto de depuración ${puerto} en 30 s` : `Chrome no arrancó (${salida}). ¿Está bien la ruta en CHROME?`);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let n = 0;
  const pendientes = new Map();
  const errores = [];
  const red = [];
  const direcciones = new Map(); // requestId → url, para decir qué petición falló
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pendientes.has(m.id)) {
      const { ok, ko } = pendientes.get(m.id);
      pendientes.delete(m.id);
      m.error ? ko(new Error(m.error.message)) : ok(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') {
      errores.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errores.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    } else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      red.push(`HTTP ${m.params.response.status}: ${m.params.response.url}`);
    } else if (m.method === 'Network.requestWillBeSent') {
      direcciones.set(m.params.requestId, m.params.request.url);
    } else if (m.method === 'Network.loadingFailed' && !m.params.canceled && m.params.errorText !== 'net::ERR_ABORTED') {
      red.push(`Fallo de red (${m.params.errorText}): ${direcciones.get(m.params.requestId) ?? m.params.requestId}`);
    }
  });
  const cdp = (method, params = {}, sessionId) => new Promise((ok, ko) => {
    const id = ++n;
    pendientes.set(id, { ok, ko });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  // idioma: el del navegador de prueba (es o en). medios: preferencias a simular, p. ej. { 'prefers-reduced-motion': 'reduce' }.
  async function abrir(url, { ancho = 1280, alto = 800, idioma = 'es', medios = null } = {}) {
    const { browserContextId } = await cdp('Target.createBrowserContext');
    const { targetId } = await cdp('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
    await cdp('Runtime.enable', {}, sessionId);
    await cdp('Page.enable', {}, sessionId);
    await cdp('Network.enable', {}, sessionId);
    await cdp('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp('Emulation.setLocaleOverride', { locale: idioma === 'en' ? 'en-US' : 'es-ES' }, sessionId).catch(() => {});
    await cdp('Network.setExtraHTTPHeaders', { headers: { 'Accept-Language': idioma === 'en' ? 'en-US' : 'es-ES' } }, sessionId);
    if (medios) {
      await cdp('Emulation.setEmulatedMedia', { features: Object.entries(medios).map(([name, value]) => ({ name, value })) }, sessionId);
    }
    await cdp('Page.navigate', { url }, sessionId);
    return {
      async eval(fn, ...args) {
        const r = await cdp('Runtime.evaluate', {
          expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true,
        }, sessionId);
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        return r.result.value;
      },
      async esperarSelector(selector, ms = 30000, cuantos = 1) {
        const fin = Date.now() + ms;
        while (Date.now() < fin) {
          if ((await this.eval((s, c) => document.querySelectorAll(s).length >= c, selector, cuantos).catch(() => false))) return;
          await espera(150);
        }
        const html = await this.eval(() => document.body.innerHTML.slice(0, 1200)).catch(e => String(e));
        throw new Error(`No apareció ${cuantos}× «${selector}». Errores: ${errores.join(' | ') || 'ninguno'}\n${html}`);
      },
      async captura(archivo) {
        const { data } = await cdp('Page.captureScreenshot', { format: 'png' }, sessionId);
        const ruta = join(capturas, archivo);
        writeFileSync(ruta, Buffer.from(data, 'base64'));
        return ruta;
      },
    };
  }

  // Cierra la conexión y el navegador. Los scripts fijan process.exitCode y dejan que Node termine solo.
  return { abrir, errores, red, capturas, cerrar: () => { try { ws.close(); } catch { /* ya cerrada */ } chrome.kill(); } };
}
