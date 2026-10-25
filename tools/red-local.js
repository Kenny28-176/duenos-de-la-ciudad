// El relé de la red local: hace de buzón en la laptop cuando se juega por la wifi de casa sin Firebase. Guarda la base de datos
// en memoria (src/net/memoria.js) y responde al transporte HTTP de los navegadores (src/net/http.js):
//
//   POST /red/op                      { uid, op: 'set'|'update'|'remove'|'get'|'empujar', ruta, valor, cambios }
//   GET  /red/escuchar?uid=&tipo=&ruta=   conexión larga con eventos «data: …» ({k:'valor',v} o {k:'hijo',c,v}; el primero, {k:'listo'})
//   GET  /red/info                    { ok, direcciones: ['http://192.168.1.20:8080'] }: dónde encontrar la laptop en la wifi
//                                     (también sirve para saber si hay relé: las páginas lo piden antes de ofrecer jugar)
//
// Lo usa tools/serve.js. No tiene seguridad (es para casa y desarrollo) y lo que guarda se pierde al apagarlo.
import { networkInterfaces } from 'node:os';
import { crearBaseDeDatos } from '../src/net/memoria.js';

const leerCuerpo = req => new Promise((listo, ko) => {
  const trozos = [];
  req.on('data', t => { trozos.push(t); if (Buffer.concat(trozos).length > 1_000_000) ko(new Error('demasiado grande')); });
  req.on('end', () => listo(Buffer.concat(trozos).toString('utf8')));
  req.on('error', ko);
});

// Los adaptadores que no son la red de casa (máquinas virtuales, contenedores, VPN…): un celular no llega por ellos.
const VIRTUAL = /vethernet|virtualbox|vmware|vmnet|vboxnet|hyper-v|wsl|docker|podman|veth|virbr|br-|tailscale|zerotier|hamachi|wireguard|vpn|bluetooth|loopback|utun|tun\d|tap\d/i;

// Las direcciones por las que los celulares pueden llegar a esta laptop (http://IP:puerto), la más probable primero: los
// adaptadores reales antes que los virtuales (si solo hay virtuales, esos) y, entre ellos, 192.168…, 10… y 172.16…
// «interfaces» es lo que da os.networkInterfaces().
export function direccionesDeLaRed(interfaces, puerto) {
  const rango = ip => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  const todas = Object.entries(interfaces).flatMap(([nombre, lista]) => (lista ?? [])
    .filter(i => i.family === 'IPv4' && !i.internal).map(i => ({ ip: i.address, virtual: VIRTUAL.test(nombre) })));
  const reales = todas.filter(d => !d.virtual);
  return (reales.length ? reales : todas).sort((x, y) => rango(x.ip) - rango(y.ip)).map(d => `http://${d.ip}:${puerto}`);
}

export function crearRelay() {
  const base = crearBaseDeDatos();
  const transportes = new Map();
  const de = uid => {
    if (!transportes.has(uid)) transportes.set(uid, base.conectar(uid));
    return transportes.get(uid);
  };

  return {
    base,
    // Atiende la petición si es de la red; devuelve true si lo era.
    async manejar(req, res) {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/red/op' && req.method === 'POST') {
        let peticion;
        try {
          peticion = JSON.parse(await leerCuerpo(req));
          const t = de(String(peticion.uid ?? ''));
          if (!peticion.uid) throw new Error('falta uid');
          const respuesta = { ok: true };
          switch (peticion.op) {
            case 'set': await t.set(peticion.ruta, peticion.valor ?? null); break;
            case 'update': await t.update(peticion.cambios ?? {}); break;
            case 'remove': await t.remove(peticion.ruta); break;
            case 'get': respuesta.valor = await t.get(peticion.ruta); break;
            case 'empujar': respuesta.clave = await t.empujar(peticion.ruta, peticion.valor); break;
            default: throw new Error(`operación desconocida: ${peticion.op}`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(respuesta));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: error.message }));
        }
        return true;
      }
      if (url.pathname === '/red/info' && req.method === 'GET') {
        const direcciones = direccionesDeLaRed(networkInterfaces(), req.socket.localPort);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }).end(JSON.stringify({ ok: true, direcciones }));
        return true;
      }
      if (url.pathname === '/red/escuchar' && req.method === 'GET') {
        const uid = url.searchParams.get('uid');
        const ruta = url.searchParams.get('ruta');
        const tipo = url.searchParams.get('tipo');
        if (!uid || !ruta || !['valor', 'hijos'].includes(tipo)) {
          res.writeHead(400).end('petición no válida');
          return true;
        }
        // El formato es el de los eventos del servidor («data: …» y una línea en blanco), pero se manda como «text/plain» y con
        // «nosniff»: con «text/event-stream» Chrome no entregaba la respuesta a fetch() hasta tener un segundo trozo (el primer
        // mensaje tardaba varios segundos), y con «text/plain» sí, en cuanto salen las cabeceras. El relleno y el aviso inicial
        // son por otros navegadores y por los intermediarios que retienen los primeros bytes de una conexión larga.
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Content-Type-Options': 'nosniff',
          'X-Accel-Buffering': 'no',
          Connection: 'keep-alive',
        });
        res.flushHeaders();
        res.write(`: ${' '.repeat(2048)}\n\ndata: ${JSON.stringify({ k: 'listo' })}\n\n`);
        const t = de(uid);
        const enviar = evento => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(evento)}\n\n`); };
        const dejar = tipo === 'valor' ? t.escuchar(ruta, v => enviar({ k: 'valor', v })) : t.escucharHijos(ruta, (c, v) => enviar({ k: 'hijo', c, v }));
        // Un latido para que ningún intermediario cierre la conexión por estar callada.
        const latido = setInterval(() => { if (!res.writableEnded) res.write(': latido\n\n'); }, 15000);
        req.on('close', () => { dejar(); clearInterval(latido); });
        return true;
      }
      return false;
    },
  };
}
