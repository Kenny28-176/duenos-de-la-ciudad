// Elige cómo se habla la red en este navegador y da la identidad de cada dispositivo.
//   - «local»: el servidor de desarrollo de la laptop (node tools/serve.js) hace de buzón por la wifi, sin Firebase.
//   - «firebase»: la base de datos de Firebase (cuando el proyecto esté configurado; llegará con src/net/firebase.js).
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

// ¿Se puede jugar con celulares desde esta página? Devuelve { modo, direcciones } o null.
export async function redDisponible({ peticion = (...a) => fetch(...a) } = {}) {
  try {
    const respuesta = await peticion('/red/info', { cache: 'no-store' });
    if (!respuesta.ok) return null;
    const { ok, direcciones } = await respuesta.json();
    return ok ? { modo: 'local', direcciones: direcciones ?? [] } : null;
  } catch {
    return null;
  }
}

export function conectar(modo, uid) {
  if (modo === 'local') return crearTransporteHttp({ uid });
  throw new Error(`Modo de red desconocido: ${modo}`);
}
