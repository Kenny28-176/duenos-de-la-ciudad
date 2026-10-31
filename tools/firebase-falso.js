// Una imitación de Firebase para probar el modo «por internet» sin el proyecto de verdad: Realtime Database por su API REST (con los
// eventos del servidor) y el inicio de sesión anónimo. La usan las pruebas, y se puede abrir a mano:
//
//   node tools/firebase-falso.js [--puerto 9100]
//   y en el navegador: http://localhost:8080/public/tablero.html?red=firebase&firebase=http://127.0.0.1:9100
//
// Se porta como Firebase en lo que usa el juego:
//   - aplica las reglas de database.rules.json (tools/reglas-firebase.js) con el uid de cada token;
//   - guarda como Firebase (sin null ni vacíos; las listas, como objetos con índices) y devuelve como Firebase: un objeto con
//     claves numéricas más bien seguidas sale como lista, con huecos null;
//   - escuchar es un GET con «Accept: text/event-stream»: un «put» con lo que hay y luego «put» y «patch» con cada cambio (un update
//     de varias rutas llega en un solo «patch»), «keep-alive», «cancel» si se pierde el permiso y «auth_revoked» al caducar el token;
//   - los tokens caducan (por defecto, a la hora) y se renuevan con el de renovación;
//   - responde con CORS, para que lo usen páginas de otro origen.
// Lo que no imita: prioridades, consultas (orderBy…), reglas con funciones que no usamos, ni los límites de tamaño.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { codificar } from '../src/net/codec.js';
import { leerReglas, puedeLeer, revisarEscritura } from './reglas-firebase.js';

const partir = ruta => String(ruta ?? '').split('/').filter(Boolean);
const esObjeto = valor => valor !== null && typeof valor === 'object';
const leer = (arbol, partes) => partes.reduce((nodo, clave) => (esObjeto(nodo) ? nodo[clave] ?? null : null), arbol ?? null);
const copia = valor => (valor === null || valor === undefined ? null : JSON.parse(JSON.stringify(valor)));
const empiezaPor = (largo, corto) => corto.length <= largo.length && corto.every((clave, k) => clave === largo[k]);
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Escribe (o borra, con null) en un árbol y quita los padres que se quedan vacíos. Devuelve el árbol nuevo (la raíz puede cambiar).
function escribir(arbol, partes, valor) {
  if (!partes.length) return valor;
  const raiz = esObjeto(arbol) ? arbol : {};
  const camino = [raiz];
  for (const clave of partes.slice(0, -1)) {
    let hijo = camino.at(-1)[clave];
    if (!esObjeto(hijo)) {
      if (valor === null) return esObjeto(arbol) ? arbol : null;
      hijo = {};
      camino.at(-1)[clave] = hijo;
    }
    camino.push(hijo);
  }
  if (valor === null) delete camino.at(-1)[partes.at(-1)];
  else camino.at(-1)[partes.at(-1)] = valor;
  for (let k = camino.length - 1; k > 0; k--) {
    if (Object.keys(camino[k]).length) break;
    delete camino[k - 1][partes[k - 1]];
  }
  return Object.keys(raiz).length ? raiz : null;
}

// Como lo devuelve Firebase: un objeto cuyas claves son todas números y que tiene más de la mitad de los huecos de 0 al mayor
// ocupados sale como una lista (con null en los huecos).
export function comoLoDevuelveFirebase(valor) {
  if (!esObjeto(valor)) return valor;
  const claves = Object.keys(valor);
  const salida = Object.fromEntries(claves.map(clave => [clave, comoLoDevuelveFirebase(valor[clave])]));
  if (!claves.length || !claves.every(clave => /^(0|[1-9]\d{0,8})$/.test(clave))) return salida;
  const mayor = Math.max(...claves.map(Number));
  if (claves.length * 2 <= mayor + 1) return salida;
  return Array.from({ length: mayor + 1 }, (_, k) => salida[k] ?? null);
}

const leerCuerpo = req => new Promise((listo, ko) => {
  const trozos = [];
  req.on('data', t => trozos.push(t));
  req.on('end', () => listo(Buffer.concat(trozos).toString('utf8')));
  req.on('error', ko);
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '600',
};

export function crearFirebaseFalso({ reglas = leerReglas(), apiKey = 'clave-falsa', duracionToken = 3600, keepAlive = 30000 } = {}) {
  let raiz = null;
  let url = null;
  const tokens = new Map(); // token → { uid, caduca }
  const renovaciones = new Map(); // token de renovación → uid
  const escuchas = new Set();
  const registro = []; // lo que se ha pedido: { metodo, ruta, uid, estado }, para las pruebas

  const nuevoUid = () => randomBytes(21).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 28).padEnd(28, 'x');
  function darTokens(uid) {
    const token = `falso.${randomBytes(18).toString('hex')}`;
    const renovacion = `renovar.${randomBytes(18).toString('hex')}`;
    tokens.set(token, { uid, caduca: Date.now() + duracionToken * 1000 });
    renovaciones.set(renovacion, uid);
    return { token, renovacion };
  }

  const responder = (res, estado, cuerpo, cabeceras = {}) => {
    res.writeHead(estado, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...cabeceras });
    res.end(cuerpo === undefined ? undefined : JSON.stringify(cuerpo));
  };

  // El inicio de sesión anónimo (identitytoolkit) y la renovación del token (securetoken).
  async function cuentas(req, res, direccion) {
    if (direccion.searchParams.get('key') !== apiKey) {
      responder(res, 400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } });
      return;
    }
    const cuerpo = await leerCuerpo(req);
    if (direccion.pathname === '/v1/accounts:signUp') {
      const uid = nuevoUid();
      const { token, renovacion } = darTokens(uid);
      responder(res, 200, { kind: 'identitytoolkit#SignupNewUserResponse', idToken: token, refreshToken: renovacion, expiresIn: String(duracionToken), localId: uid });
      return;
    }
    const renovacion = new URLSearchParams(cuerpo).get('refresh_token');
    const uid = renovaciones.get(renovacion);
    if (!uid) {
      responder(res, 400, { error: { code: 400, message: 'INVALID_REFRESH_TOKEN' } });
      return;
    }
    const nuevos = darTokens(uid);
    responder(res, 200, { id_token: nuevos.token, refresh_token: nuevos.renovacion, expires_in: String(duracionToken), user_id: uid, token_type: 'Bearer' });
  }

  // Quién pide: null sin token; un error si el token no vale o ha caducado.
  function quien(direccion) {
    const token = direccion.searchParams.get('auth');
    if (!token) return { auth: null };
    const datos = tokens.get(token);
    if (!datos) return { error: 'Could not parse auth token.' };
    if (Date.now() >= datos.caduca) return { error: 'Auth token is expired' };
    return { auth: { uid: datos.uid, provider: 'anonymous' }, token, caduca: datos.caduca };
  }

  const mandar = (escucha, tipo, datos) => {
    if (!escucha.res.writableEnded) escucha.res.write(`event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`);
  };
  const terminar = escucha => {
    clearInterval(escucha.latido);
    clearTimeout(escucha.caducidad);
    escuchas.delete(escucha);
    if (!escucha.res.writableEnded) escucha.res.end();
  };

  // Avisa a cada escucha de lo que le toca de una escritura (las rutas que han cambiado y la base de antes).
  function avisar(rutas, antes) {
    for (const escucha of [...escuchas]) {
      const suyas = rutas.filter(r => empiezaPor(r, escucha.partes) || empiezaPor(escucha.partes, r));
      if (!suyas.length) continue;
      if (!puedeLeer(reglas, raiz, escucha.partes.join('/'), escucha.auth)) {
        mandar(escucha, 'cancel', null);
        terminar(escucha);
        continue;
      }
      const ahora = leer(raiz, escucha.partes);
      if (iguales(leer(antes, escucha.partes), ahora)) continue;
      // Si se ha escrito encima (o en la misma ruta), va todo; si no, solo lo que ha cambiado por debajo.
      if (suyas.some(r => empiezaPor(escucha.partes, r))) {
        mandar(escucha, 'put', { path: '/', data: comoLoDevuelveFirebase(copia(ahora)) });
        continue;
      }
      const relativas = suyas.map(r => r.slice(escucha.partes.length));
      if (relativas.length === 1) {
        mandar(escucha, 'put', { path: `/${relativas[0].join('/')}`, data: comoLoDevuelveFirebase(copia(leer(raiz, suyas[0]))) });
        continue;
      }
      // Varias rutas a la vez: un «patch» en el antepasado común, con cada ruta que queda por debajo como clave.
      let comun = 0;
      while (relativas.every(r => r.length > comun + 1 && r[comun] === relativas[0][comun])) comun++;
      const datos = Object.fromEntries(relativas.map((r, k) => [r.slice(comun).join('/'), comoLoDevuelveFirebase(copia(leer(raiz, suyas[k])))]));
      mandar(escucha, 'patch', { path: `/${relativas[0].slice(0, comun).join('/')}`, data: datos });
    }
  }

  // Aplica una escritura de una o varias rutas ({ partes, valor }) si las reglas la permiten. Devuelve null o el error.
  function aplicar(cambios, auth) {
    for (const [k, a] of cambios.entries()) {
      for (const b of cambios.slice(k + 1)) {
        if (empiezaPor(a.partes, b.partes) || empiezaPor(b.partes, a.partes)) return { estado: 400, error: 'Invalid data; path overlaps with another path in the update' };
      }
    }
    const antes = copia(raiz);
    let despues = copia(raiz);
    for (const { partes, valor } of cambios) despues = escribir(despues, partes, valor);
    for (const { partes } of cambios) {
      if (revisarEscritura(reglas, antes, despues, partes.join('/'), auth)) return { estado: 401, error: 'Permission denied' };
    }
    raiz = despues;
    avisar(cambios.map(c => c.partes), antes);
    return null;
  }

  async function base(req, res, direccion) {
    const partes = partir(decodeURIComponent(direccion.pathname.replace(/\.json$/, '')));
    const sesion = quien(direccion);
    const apuntar = estado => registro.push({ metodo: req.method, ruta: partes.join('/'), uid: sesion.auth?.uid ?? null, estado });
    if (sesion.error) {
      apuntar(401);
      responder(res, 401, { error: sesion.error });
      return;
    }
    const { auth } = sesion;
    const silencio = direccion.searchParams.get('print') === 'silent';

    if (req.method === 'GET') {
      if (!puedeLeer(reglas, raiz, partes.join('/'), auth)) {
        apuntar(401);
        responder(res, 401, { error: 'Permission denied' });
        return;
      }
      apuntar(200);
      if (!(req.headers.accept ?? '').includes('text/event-stream')) {
        responder(res, 200, comoLoDevuelveFirebase(copia(leer(raiz, partes))));
        return;
      }
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' });
      const escucha = { res, partes, auth, latido: null, caducidad: null };
      escuchas.add(escucha);
      mandar(escucha, 'put', { path: '/', data: comoLoDevuelveFirebase(copia(leer(raiz, partes))) });
      escucha.latido = setInterval(() => mandar(escucha, 'keep-alive', null), keepAlive);
      if (sesion.caduca) {
        escucha.caducidad = setTimeout(() => {
          mandar(escucha, 'auth_revoked', 'credential is no longer valid');
          terminar(escucha);
        }, Math.max(0, sesion.caduca - Date.now()));
      }
      req.on('close', () => terminar(escucha));
      return;
    }

    let cambios;
    try {
      const texto = await leerCuerpo(req);
      const cuerpo = texto ? JSON.parse(texto) : null;
      const guardable = v => codificar(v) ?? null;
      if (req.method === 'PUT') cambios = [{ partes, valor: guardable(cuerpo) }];
      else if (req.method === 'DELETE') cambios = [{ partes, valor: null }];
      else if (req.method === 'PATCH') {
        if (!esObjeto(cuerpo) || Array.isArray(cuerpo)) throw new Error('Invalid data; couldn\'t parse JSON object.');
        cambios = Object.entries(cuerpo).map(([ruta, v]) => ({ partes: [...partes, ...partir(ruta)], valor: guardable(v) }));
      } else if (req.method === 'POST') {
        const clave = `-F${Date.now().toString(36)}${randomBytes(6).toString('hex')}`;
        cambios = [{ partes: [...partes, clave], valor: guardable(cuerpo), clave }];
      } else {
        responder(res, 405, { error: 'Method not allowed' });
        return;
      }
    } catch (error) {
      apuntar(400);
      responder(res, 400, { error: error.message });
      return;
    }
    const fallo = cambios.length ? aplicar(cambios, auth) : null;
    apuntar(fallo?.estado ?? 200);
    if (fallo) {
      responder(res, fallo.estado, { error: fallo.error });
      return;
    }
    if (silencio) responder(res, 204);
    else if (req.method === 'POST') responder(res, 200, { name: cambios[0].clave });
    else responder(res, 200, req.method === 'PATCH' ? Object.fromEntries(cambios.map(c => [c.partes.slice(partes.length).join('/'), c.valor])) : cambios[0].valor);
  }

  const servidor = createServer(async (req, res) => {
    const direccion = new URL(req.url, 'http://x');
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS).end();
        return;
      }
      if (direccion.pathname.startsWith('/v1/')) {
        await cuentas(req, res, direccion);
        return;
      }
      if (direccion.pathname.endsWith('.json')) {
        await base(req, res, direccion);
        return;
      }
      responder(res, 404, { error: 'Not found' });
    } catch (error) {
      if (!res.headersSent) responder(res, 500, { error: error.message });
    }
  });

  return {
    servidor,
    registro,
    // Arranca y devuelve su dirección (http://127.0.0.1:puerto).
    async arrancar(puerto = 0, host = '127.0.0.1') {
      await new Promise(listo => servidor.listen(puerto, host, listo));
      url = `http://${host}:${servidor.address().port}`;
      return url;
    },
    // Lo que hay que darle a src/net/firebase.js para que hable con la imitación.
    config: () => ({ apiKey, databaseURL: url, urlCuentas: `${url}/v1`, urlTokens: `${url}/v1` }),
    // La base de datos entera, como la guarda Firebase.
    datos: () => copia(raiz),
    // Escribe sin pasar por las reglas, como desde la consola de Firebase (para preparar una prueba).
    poner(ruta, valor) {
      const antes = copia(raiz);
      raiz = escribir(copia(raiz), partir(ruta), codificar(valor) ?? null);
      avisar([partir(ruta)], antes);
    },
    escuchasAbiertas: () => escuchas.size,
    // Corta todas las escuchas, como si se cayera la red (los clientes tienen que volver a conectarse solos).
    cortarEscuchas() {
      for (const escucha of [...escuchas]) {
        escuchas.delete(escucha);
        clearInterval(escucha.latido);
        clearTimeout(escucha.caducidad);
        escucha.res.destroy();
      }
    },
    // Hace caducar todos los tokens ahora (las escuchas reciben «auth_revoked»).
    caducarTokens() {
      for (const datos of tokens.values()) datos.caduca = Date.now() - 1;
      for (const escucha of [...escuchas]) {
        mandar(escucha, 'auth_revoked', 'credential is no longer valid');
        terminar(escucha);
      }
    },
    // Hace como si los clientes no pudieran renovar la sesión (la cuenta anónima se ha borrado).
    olvidarCuentas: () => renovaciones.clear(),
    async cerrar() {
      for (const escucha of [...escuchas]) terminar(escucha);
      servidor.closeAllConnections();
      await new Promise(listo => servidor.close(listo));
    },
  };
}

// node tools/firebase-falso.js [--puerto 9100]
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const k = process.argv.indexOf('--puerto');
  const falso = crearFirebaseFalso();
  const url = await falso.arrancar(k > 0 ? Number(process.argv[k + 1]) : 9100);
  console.log(`Imitación de Firebase en ${url} (con las reglas de database.rules.json).`);
  console.log(`Tablero: http://localhost:8080/public/tablero.html?red=firebase&firebase=${url}`);
}
