// Elige cómo se habla la red en este navegador y da la identidad de cada dispositivo.
//   - «local»: el servidor de desarrollo de la laptop (node tools/serve.js) hace de buzón por la wifi, sin Firebase.
//   - «firebase»: la base de datos de Firebase (cuando el proyecto esté configurado; llegará con src/net/firebase.js).
import { crearTransporteHttp } from './http.js';

// Una identidad que se guarda en el navegador (como el inicio de sesión anónimo de Firebase): así un celular que recarga la
// página sigue siendo el mismo jugador.
export function identidad(prefijo, clave = 'duenos:uid') {
  try {
    let uid = localStorage.getItem(clave);
    if (!uid) {
      uid = `${prefijo}-${crypto.randomUUID()}`;
      localStorage.setItem(clave, uid);
    }
    return uid;
  } catch {
    return `${prefijo}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
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
