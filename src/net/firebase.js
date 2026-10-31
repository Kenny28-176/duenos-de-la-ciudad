// El transporte con Firebase Realtime Database, para jugar por internet. Es el mismo «transporte» que el resto de la red
// (src/net/memoria.js, src/net/http.js): el tablero y los celulares no notan la diferencia.
//
//   const transporte = await crearTransporteFirebase({ config, clave: 'duenos:firebase-celular' });
//
// Habla con Firebase por su API web (REST), sin la biblioteca de Firebase: no hay código de terceros que descargar ni que
// mantener al día, y pesa unos pocos KB.
//
// - **Quién es** (transporte.uid): el inicio de sesión anónimo de Firebase (Identity Toolkit, «accounts:signUp»). El token dura una
//   hora y se renueva solo; la sesión (uid y token de renovación) se guarda en el navegador, así un celular que recarga la página
//   sigue siendo el mismo jugador. Las reglas de seguridad (database.rules.json) se fían de ese uid, no de lo que diga el celular.
// - **Escribir**: PUT, PATCH (varias rutas de golpe, en la raíz) y DELETE, con «print=silent» (Firebase no devuelve lo escrito y no se
//   gasta descarga). Las escrituras salen de una en una y en orden, y se reintentan si falla la red: todas se pueden repetir sin
//   riesgo, porque «empujar» inventa aquí la clave nueva (ordenada por la hora, como las de Firebase) y escribe con PUT.
// - **Escuchar**: eventos del servidor (EventSource): «put», «patch», «keep-alive» (cada 30 s), «cancel» y «auth_revoked». Cada
//   escucha guarda una copia de lo que hay en su ruta y le aplica cada cambio; lo que llega seguido se entrega de una vez.
// - Firebase devuelve como lista un objeto con claves numéricas (con huecos null): aquí se deshace, para que todo llegue igual
//   que desde la base en memoria (objetos con índices, sin null ni vacíos), que es lo que entiende src/net/codec.js.
import { codificar } from './codec.js';

const URL_CUENTAS = 'https://identitytoolkit.googleapis.com/v1';
const URL_TOKENS = 'https://securetoken.googleapis.com/v1';
const CERRADA = 2; // EventSource.CLOSED: el navegador no volverá a intentarlo solo

const partir = ruta => String(ruta).split('/').filter(Boolean);
const copia = valor => (valor === null || valor === undefined ? null : JSON.parse(JSON.stringify(valor)));

// Lo que llega de Firebase, como lo guarda la base en memoria: las listas pasan a objetos con índices y se quita lo null y lo vacío.
export function normalizar(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'object') return valor;
  const hijos = {};
  for (const [clave, v] of Object.entries(valor)) {
    const hijo = normalizar(v);
    if (hijo !== null) hijos[clave] = hijo;
  }
  return Object.keys(hijos).length ? hijos : null;
}

// Pone un valor (o lo borra, con null) en una ruta de un árbol y limpia los padres que se quedan vacíos, como Firebase.
// El árbol va dentro de una caja ({ v }) para poder cambiar también la raíz.
export function ponerEn(caja, partes, valor) {
  if (!partes.length) { caja.v = valor; return; }
  if (caja.v === null || typeof caja.v !== 'object') {
    if (valor === null) return;
    caja.v = {};
  }
  const camino = [caja.v];
  for (const clave of partes.slice(0, -1)) {
    let hijo = camino.at(-1)[clave];
    if (hijo === null || typeof hijo !== 'object') {
      if (valor === null) return;
      hijo = {};
      camino.at(-1)[clave] = hijo;
    }
    camino.push(hijo);
  }
  if (valor === null) delete camino.at(-1)[partes.at(-1)];
  else camino.at(-1)[partes.at(-1)] = valor;
  for (let k = camino.length - 1; k >= 0; k--) {
    if (Object.keys(camino[k]).length) break;
    if (k === 0) caja.v = null;
    else delete camino[k - 1][partes[k - 1]];
  }
}

// Aplica un evento «put» o «patch» de Firebase a la copia de una escucha. En un «patch», cada clave puede ser una ruta.
export function aplicarEvento(caja, tipo, { path, data }) {
  const base = partir(path ?? '');
  if (tipo === 'put') ponerEn(caja, base, normalizar(data));
  else for (const [clave, valor] of Object.entries(data ?? {})) ponerEn(caja, [...base, ...partir(clave)], normalizar(valor));
}

// Claves nuevas como las de Firebase: 8 caracteres de la hora y 12 al azar, que se ordenan por orden de creación.
const ALFABETO = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
export function creadorDeClaves({ reloj = () => Date.now(), azar = globalThis.crypto } = {}) {
  let ultimaHora = -1;
  let ultimoAzar = [];
  return () => {
    let hora = reloj();
    const mismaHora = hora === ultimaHora;
    ultimaHora = hora;
    let prefijo = '';
    for (let k = 0; k < 8; k++) { prefijo = ALFABETO[hora % 64] + prefijo; hora = Math.floor(hora / 64); }
    if (mismaHora) {
      // En el mismo milisegundo, la siguiente clave es la anterior más uno: así siguen en orden.
      let k = 11;
      while (k >= 0 && ultimoAzar[k] === 63) ultimoAzar[k--] = 0;
      if (k >= 0) ultimoAzar[k]++;
    } else {
      const bytes = new Uint8Array(12);
      if (typeof azar?.getRandomValues === 'function') azar.getRandomValues(bytes);
      else for (let k = 0; k < 12; k++) bytes[k] = Math.floor(Math.random() * 256);
      ultimoAzar = [...bytes].map(b => b % 64);
    }
    return prefijo + ultimoAzar.map(n => ALFABETO[n]).join('');
  };
}

// Un error de Firebase con su código HTTP (los de la red, sin código, son de fetch).
class ErrorDeFirebase extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}
const esRechazo = error => error instanceof ErrorDeFirebase && error.estado >= 400 && error.estado < 500;

// La sesión anónima: el uid y el token con el que se habla con la base de datos, que se renueva antes de caducar.
function crearSesion({ apiKey, urlCuentas, urlTokens, peticion, almacen, clave, reloj }) {
  let uid = null;
  let token = null;
  let renovacion = null;
  let caduca = 0;
  let renovando = null;

  const guardar = () => { try { almacen?.setItem(clave, JSON.stringify({ uid, renovacion })); } catch { /* sin almacenamiento */ } };
  const guardada = () => { try { return JSON.parse(almacen?.getItem(clave) ?? 'null'); } catch { return null; } };

  async function pedir(url, opciones) {
    const respuesta = await peticion(url, { method: 'POST', ...opciones });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new ErrorDeFirebase(datos.error?.message ?? `HTTP ${respuesta.status}`, respuesta.status);
    return datos;
  }
  const tomar = (nuevoUid, nuevoToken, nuevaRenovacion, segundos) => {
    uid = nuevoUid;
    token = nuevoToken;
    renovacion = nuevaRenovacion;
    caduca = reloj() + Number(segundos ?? 3600) * 1000;
    guardar();
  };
  async function registrarse() {
    const d = await pedir(`${urlCuentas}/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
    });
    tomar(d.localId, d.idToken, d.refreshToken, d.expiresIn);
  }
  async function refrescar() {
    const d = await pedir(`${urlTokens}/token?key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(renovacion)}`,
    });
    tomar(d.user_id, d.id_token, d.refresh_token, d.expires_in);
  }

  return {
    get uid() { return uid; },
    // Entra con la sesión guardada (el mismo uid de siempre) o, si no hay o ya no vale, con una cuenta anónima nueva. Si lo que
    // falla es la red, no se crea otra cuenta (se perdería el jugador): el error sube.
    async iniciar() {
      const previa = guardada();
      if (previa?.renovacion) {
        uid = previa.uid;
        renovacion = previa.renovacion;
        try {
          await refrescar();
          return;
        } catch (error) {
          if (!esRechazo(error)) throw error;
        }
      }
      await registrarse();
    },
    // El token vigente; si le quedan menos de 5 minutos, uno nuevo.
    async token() {
      if (token && reloj() < caduca - 5 * 60 * 1000) return token;
      return this.renovar();
    },
    renovar() {
      renovando ??= refrescar().finally(() => { renovando = null; });
      return renovando.then(() => token);
    },
  };
}

// config: lo que da la consola de Firebase (apiKey y databaseURL; lo demás no hace falta). urlCuentas y urlTokens solo se cambian
// para probar contra una imitación de Firebase (tools/firebase-falso.js).
export async function crearTransporteFirebase({
  config, clave = 'duenos:firebase', almacen,
  peticion = (...a) => fetch(...a), crearFuente = url => new EventSource(url), reloj = () => Date.now(), azar = globalThis.crypto,
  esperaReintento = 1000, reintentos = 4, silencioMaximo = 75000, revisarCada = 5000, agrupar = 15,
}) {
  if (!config?.apiKey || !config?.databaseURL) throw new Error('Falta la configuración de Firebase (apiKey y databaseURL).');
  if (almacen === undefined) {
    try { almacen = globalThis.localStorage ?? null; } catch { almacen = null; }
  }
  const base = String(config.databaseURL).replace(/\/+$/, '');
  const sesion = crearSesion({
    apiKey: config.apiKey, urlCuentas: config.urlCuentas ?? URL_CUENTAS, urlTokens: config.urlTokens ?? URL_TOKENS,
    peticion, almacen, clave, reloj,
  });
  await sesion.iniciar();
  const claveNueva = creadorDeClaves({ reloj, azar });
  const direccion = (ruta, token, extra = '') => `${base}/${partir(ruta).map(encodeURIComponent).join('/')}.json?auth=${encodeURIComponent(token)}${extra}`;
  const esperar = ms => new Promise(listo => setTimeout(listo, ms));

  // Una petición a la base de datos. Si el token ha caducado (401), se renueva y se repite una vez; si falla la red o Firebase
  // tiene un problema (5xx), se repite con esperas cada vez más largas. Lo demás (permiso denegado, datos no válidos) es un error.
  async function llamar(metodo, ruta, cuerpo, extra = '') {
    let renovado = false;
    for (let intento = 0; ; intento++) {
      try {
        const respuesta = await peticion(direccion(ruta, await sesion.token(), extra), {
          method: metodo, ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
        });
        if (respuesta.ok) return metodo === 'GET' ? await respuesta.json() : null;
        const datos = await respuesta.json().catch(() => ({}));
        const error = new ErrorDeFirebase(datos.error ?? `HTTP ${respuesta.status}`, respuesta.status);
        if (respuesta.status === 401 && !renovado) {
          renovado = true;
          await sesion.renovar();
          intento--;
          continue;
        }
        throw error;
      } catch (error) {
        if (esRechazo(error) || intento >= reintentos) throw error;
        await esperar(esperaReintento * 2 ** intento);
      }
    }
  }

  // Las escrituras, en fila: cada una sale cuando ha terminado la anterior (así llegan en el orden en que se pidieron).
  let fila = Promise.resolve();
  function escribir(metodo, ruta, cuerpo) {
    const hecho = fila.then(() => llamar(metodo, ruta, cuerpo, '&print=silent'));
    fila = hecho.catch(() => {});
    return hecho;
  }
  const guardar = (ruta, valor) => {
    const arbol = codificar(valor);
    return arbol === undefined ? escribir('DELETE', ruta) : escribir('PUT', ruta, arbol);
  };

  // --- Escuchar -------------------------------------------------------------------------------------------------------------

  const parar = new Set();
  const cortar = new Set();
  let enLinea = false;
  let escuchas = 0;
  let vivas = 0;
  const oyentesDeConexion = new Set();
  function revisarConexion() {
    const ahora = escuchas > 0 && vivas === escuchas;
    if (ahora === enLinea) return;
    enLinea = ahora;
    for (const oyente of oyentesDeConexion) oyente(enLinea);
  }

  function suscribir(tipo, ruta, cb) {
    let activa = true;
    let fuente = null;
    let viva = false;
    let sabida = false; // ¿ha llegado ya el valor inicial de esta conexión?
    let ultimoDato = reloj();
    let fallos = 0;
    let relojEntrega = null;
    let relojReintento = null;
    const caja = { v: null };
    let entregado; // el último valor entregado (en texto), para no repetirlo
    const vistos = new Set();

    const ponerViva = si => {
      if (si === viva) return;
      viva = si;
      vivas += si ? 1 : -1;
      revisarConexion();
    };

    function entregar() {
      relojEntrega = null;
      if (!activa) return;
      if (tipo === 'valor') {
        const texto = JSON.stringify(caja.v);
        if (texto === entregado) return;
        entregado = texto;
        cb(copia(caja.v));
        return;
      }
      const hijos = caja.v && typeof caja.v === 'object' ? caja.v : {};
      for (const k of [...vistos]) if (!(k in hijos)) vistos.delete(k);
      for (const k of Object.keys(hijos).sort()) {
        if (vistos.has(k)) continue;
        vistos.add(k);
        cb(k, copia(hijos[k]));
        if (!activa) return;
      }
    }

    const alCambio = tipoDeEvento => evento => {
      ultimoDato = reloj();
      let datos;
      try { datos = JSON.parse(evento.data); } catch { return; }
      aplicarEvento(caja, tipoDeEvento, datos ?? {});
      if (!sabida) {
        sabida = true;
        fallos = 0;
        ponerViva(true);
      }
      relojEntrega ??= setTimeout(entregar, agrupar);
    };

    function cerrarFuente() {
      if (fuente) fuente.close();
      fuente = null;
      sabida = false;
      ponerViva(false);
    }

    // Vuelve a abrir la conexión (después de una espera que crece con cada fallo seguido, salvo si se pide «ya»).
    function reabrir({ renovar = false, ya = false } = {}) {
      if (!activa) return;
      cerrarFuente();
      clearTimeout(relojReintento);
      const espera = ya ? 0 : Math.min(esperaReintento * 2 ** fallos, 15000);
      fallos++;
      relojReintento = setTimeout(async () => {
        if (renovar) { try { await sesion.renovar(); } catch { /* se probará con el token que haya */ } }
        abrir();
      }, espera);
    }

    async function abrir() {
      if (!activa) return;
      let token;
      try {
        token = await sesion.token();
      } catch {
        reabrir();
        return;
      }
      if (!activa) return;
      ultimoDato = reloj();
      const esta = crearFuente(direccion(ruta, token));
      fuente = esta;
      esta.addEventListener('put', alCambio('put'));
      esta.addEventListener('patch', alCambio('patch'));
      esta.addEventListener('keep-alive', () => { ultimoDato = reloj(); });
      // Sin permiso para leer (la regla cambió o la ruta ya no existe para mí): se vuelve a intentar más tarde.
      esta.addEventListener('cancel', () => { if (fuente === esta) reabrir(); });
      // El token ha caducado: se renueva y se vuelve a abrir enseguida.
      esta.addEventListener('auth_revoked', () => { if (fuente === esta) reabrir({ renovar: true, ya: true }); });
      esta.onerror = () => {
        if (fuente !== esta) return;
        // Si el navegador lo vuelve a intentar solo, basta con decir que no hay conexión; si se rinde (un 401, por ejemplo), se
        // vuelve a abrir con un token nuevo.
        if (esta.readyState === CERRADA) reabrir({ renovar: true });
        else { sabida = false; ponerViva(false); }
      };
    }

    // Una conexión que lleva demasiado callada (ni siquiera el keep-alive) está muerta aunque no lo diga: se abre otra.
    const vigilante = setInterval(() => { if (fuente && reloj() - ultimoDato > silencioMaximo) reabrir({ ya: true }); }, revisarCada);
    const forzar = () => reabrir({ ya: true });

    const cerrar = () => {
      if (!activa) return;
      activa = false;
      clearInterval(vigilante);
      clearTimeout(relojEntrega);
      clearTimeout(relojReintento);
      cerrarFuente();
      parar.delete(cerrar);
      cortar.delete(forzar);
      escuchas--;
      revisarConexion();
    };
    parar.add(cerrar);
    cortar.add(forzar);
    escuchas++;
    revisarConexion();
    abrir();
    return cerrar;
  }

  return {
    uid: sesion.uid,
    set: (ruta, valor) => guardar(ruta, valor),
    update(cambios) {
      const cuerpo = Object.fromEntries(Object.entries(cambios).map(([ruta, valor]) => [partir(ruta).join('/'), codificar(valor) ?? null]));
      return Object.keys(cuerpo).length ? escribir('PATCH', '', cuerpo) : Promise.resolve();
    },
    remove: ruta => escribir('DELETE', ruta),
    get: async ruta => normalizar(await llamar('GET', ruta)),
    async empujar(ruta, valor) {
      const nueva = claveNueva();
      await guardar(`${ruta}/${nueva}`, valor);
      return nueva;
    },
    escuchar: (ruta, cb) => suscribir('valor', ruta, cb),
    escucharHijos: (ruta, cb) => suscribir('hijos', ruta, cb),
    enLinea: () => enLinea,
    alCambiarConexion(oyente) {
      oyentesDeConexion.add(oyente);
      return () => oyentesDeConexion.delete(oyente);
    },
    reconectar: () => [...cortar].forEach(forzar => forzar()),
    cerrar: () => [...parar].forEach(cerrar => cerrar()),
  };
}
