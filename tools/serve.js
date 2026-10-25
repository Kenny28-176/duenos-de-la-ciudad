// Servidor estático para probar en casa: node tools/serve.js [puerto]
// Sirve la web (la portada, public/ y src/) y muestra la dirección para abrirla desde los celulares (misma wifi). Escucha en toda la
// red, así que solo sirve lo que la web necesita: nada de .git, PLAN.md, Documentos/ ni el resto de la carpeta del proyecto.
// Ojo: por http en la red local la pantalla puede apagarse (Wake Lock exige https).
// También se puede importar (crearServidor) desde las pruebas, que así pueden apagarlo para simular un corte de red.
// Adaptado de Aldeanos vs Lobos.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearRelay } from './red-local.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
// Lo único de la carpeta del proyecto que se sirve (lo mismo que se publica en la web: construir-sitio.js).
const SERVIDO = new Set(['index.html', 'public', 'src']);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg',
};

// Devuelve un servidor http (sin arrancar) que sirve los archivos de `raiz` y, en /red, el relé de la red local (tools/red-local.js):
// el buzón por el que el tablero y los celulares se hablan por la wifi sin Firebase.
export function crearServidor(raiz = RAIZ) {
  const relay = crearRelay();
  const servidor = createServer(async (req, res) => {
    if (await relay.manejar(req, res)) return;
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = normalize(join(raiz, ruta));
    if (!archivo.startsWith(normalize(raiz))) { res.writeHead(403).end(); return; }
    // Solo la portada y las carpetas de la web; lo demás (el repositorio, el plan, el material de referencia) no sale de la laptop.
    const primero = archivo.slice(normalize(raiz).length).split(/[\\/]/).find(parte => parte !== '');
    if (!SERVIDO.has(primero)) { res.writeHead(404).end('No encontrado'); return; }
    try {
      const datos = await readFile(archivo);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(datos);
    } catch {
      res.writeHead(404).end('No encontrado');
    }
  });
  servidor.relay = relay;
  return servidor;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.argv[2] ?? 8080);
  crearServidor().listen(puerto, '0.0.0.0', () => {
    console.log(`Tablero (laptop/tablet):  http://localhost:${puerto}/public/`);
    for (const ifs of Object.values(networkInterfaces())) {
      for (const i of ifs ?? []) {
        if (i.family === 'IPv4' && !i.internal) console.log(`Celulares:                http://${i.address}:${puerto}/public/`);
      }
    }
  });
}
