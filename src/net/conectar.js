// Elige cómo se habla la red en este navegador y da la identidad de cada dispositivo.
//   - «local»: el servidor de desarrollo de la laptop (node tools/serve.js) hace de buzón por la wifi, sin Firebase.
//   - «firebase»: la base de datos de Firebase (src/net/firebase.js), para jugar por internet desde la web publicada.
import { crearTransporteFirebase } from './firebase.js';
import { configuracionFirebase } from './firebase-config.js';
import { crearTransporteHttp } from './http.js';

// Un identificador al azar. crypto.randomUUID solo existe en páginas seguras (https o localhost), y los celulares entran por
// http://192.168.…, así que si falta se usan bytes al azar (getRandomValues sí está en todas partes).
function identificadorAlAzar(azar) {
  if (typeof azar?.randomUUID === 'function') return azar.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof azar?.getRandomValues === 'function') azar.getRandomValues(bytes);
  else for (let k = 0; k < bytes.length; k++) bytes[k] = Math.floor(Math.random() * 256);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Una identidad que se guarda en el navegador (como el inicio de sesión anónimo de Firebase): así un celular que recarga la
// página sigue siendo el mismo jugador. Si el navegador no deja guardar nada, la identidad dura lo que dure la página.
export function identidad(prefijo, clave = 'duenos:uid', { almacen, azar = globalThis.crypto } = {}) {
  // Con el almacenamiento bloqueado, hasta nombrar localStorage puede lanzar un error: por eso se busca aquí dentro.
  let guardado = almacen;
  if (guardado === undefined) {
    try { guardado = globalThis.localStorage; } catch { guardado = null; }
  }
  let uid = null;
  try {
    uid = guardado?.getItem(clave) ?? null;
  } catch { /* sin almacenamiento */ }
  if (uid) return uid;
  uid = `${prefijo}-${identificadorAlAzar(azar)}`;
  try {
    guardado?.setItem(clave, uid);
  } catch { /* sin almacenamiento */ }
  return uid;
}

const parametrosDeLaPagina = () => new URLSearchParams(globalThis.location?.search ?? '');
const enLaLaptop = servidor => ['localhost', '127.0.0.1', '[::1]'].includes(servidor);

// ¿Hay relé local detrás de esta página? Devuelve las direcciones de la laptop en la wifi, o null.
async function releLocal(peticion) {
  try {
    const respuesta = await peticion('/red/info', { cache: 'no-store' });
    if (!respuesta.ok) return null;
    const { ok, direcciones } = await respuesta.json();
    return ok ? { direcciones: direcciones ?? [] } : null;
  } catch {
    return null;
  }
}

// ¿Se puede jugar con celulares desde esta página, y cómo? Devuelve { modo, direcciones, config? } o null:
//   - «local» si la página la sirve la laptop (node tools/serve.js), que hace de buzón por la wifi;
//   - si no (la web publicada), «firebase», cuando el proyecto de Firebase está configurado (src/net/firebase-config.js).
// Para probar: con ?red=firebase se usa Firebase aunque haya relé, y con ?firebase=http://127.0.0.1:9100 (solo en una página abierta
// desde la propia laptop) la imitación de Firebase (tools/firebase-falso.js) en vez del proyecto de verdad.
export async function redDisponible({
  peticion = (...a) => fetch(...a), parametros = parametrosDeLaPagina(), config = configuracionFirebase,
  servidor = globalThis.location?.hostname ?? '',
} = {}) {
  const local = await releLocal(peticion);
  const falso = parametros.get('firebase');
  const proyecto = falso && enLaLaptop(servidor)
    ? { apiKey: 'clave-falsa', databaseURL: falso, urlCuentas: `${falso}/v1`, urlTokens: `${falso}/v1` }
    : config;
  const conFirebase = Boolean(proyecto?.apiKey && proyecto?.databaseURL);
  if (local && !(conFirebase && parametros.get('red') === 'firebase')) return { modo: 'local', direcciones: local.direcciones };
  if (conFirebase) return { modo: 'firebase', config: proyecto, direcciones: local?.direcciones ?? [] };
  return null;
}

// Lo que hay que añadir al enlace de los celulares para que usen la misma red que el tablero (solo al probar Firebase desde la
// laptop: en la web publicada no hace falta nada).
export function parametrosDeRed(parametros = parametrosDeLaPagina()) {
  const extra = new URLSearchParams();
  for (const clave of ['red', 'firebase']) if (parametros.has(clave)) extra.set(clave, parametros.get(clave));
  return extra.toString();
}

// Abre el transporte de este dispositivo. «rol» es 'tablero' o 'celular': cada uno guarda su identidad aparte (en la misma laptop
// pueden estar el tablero y un celular de prueba). Con Firebase, antes inicia la sesión anónima.
export async function conectar(red, rol) {
  if (red.modo === 'local') return crearTransporteHttp({ uid: identidad(rol, rol === 'tablero' ? 'duenos:uid-tablero' : 'duenos:uid') });
  if (red.modo === 'firebase') return crearTransporteFirebase({ config: red.config, clave: `duenos:firebase-${rol}` });
  throw new Error(`Modo de red desconocido: ${red.modo}`);
}
