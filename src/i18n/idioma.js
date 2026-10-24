// Manejo del idioma en el navegador: carga de partes, persistencia y eventos de cambio.
import {
  IDIOMAS,
  IDIOMA_BASE,
  traducir,
  traducirN,
  elegirIdioma,
  unirDiccionarios,
} from './traducir.js';

const CLAVE_ALMACENAMIENTO = 'duenos:idioma';
const PARTES = ['juego', 'narrador', 'errores', 'interfaz'];

let idiomaActivo = IDIOMA_BASE;
let diccionarioActivo = {};
let diccionarioBase = {};
const cacheDiccionarios = new Map();
const oyentes = new Set();

/**
 * Lee o guarda la preferencia de idioma en localStorage bajo la clave 'duenos:idioma'.
 * @param {string} [nuevoIdioma] - Si se proporciona, guarda el valor. Si no, devuelve el valor guardado.
 * @returns {string} El idioma guardado o cadena vacía si no existe.
 */
export function recordarIdioma(nuevoIdioma) {
  try {
    if (typeof localStorage === 'undefined') return '';
    if (nuevoIdioma) {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, nuevoIdioma);
      return nuevoIdioma;
    }
    return localStorage.getItem(CLAVE_ALMACENAMIENTO) || '';
  } catch {
    return '';
  }
}

/**
 * Carga una de las partes de un idioma (juego, narrador, errores, interfaz).
 * @param {string} idioma
 * @param {string} parte
 * @param {URL} [base]
 * @returns {Promise<object>}
 */
async function cargarParte(idioma, parte, base = new URL('./', import.meta.url)) {
  const url = new URL(`${idioma}/${parte}.json`, base);
  if (url.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(url, 'utf8'));
  }
  const respuesta = await fetch(url);
  return respuesta.json();
}

/**
 * Carga las cuatro partes de un idioma y las une.
 * @param {string} idioma
 * @param {URL} [base]
 * @returns {Promise<object>}
 */
async function cargarIdiomaCompleto(idioma, base) {
  if (cacheDiccionarios.has(idioma)) {
    return cacheDiccionarios.get(idioma);
  }
  const contenidos = await Promise.all(PARTES.map(parte => cargarParte(idioma, parte, base)));
  const unido = unirDiccionarios(...contenidos);
  cacheDiccionarios.set(idioma, unido);
  return unido;
}

/**
 * Cambia el idioma activo, cargando sus diccionarios si aún no están en memoria.
 *
 * @param {string} nuevoIdioma
 * @param {object} [opciones]
 * @param {boolean} [opciones.persistir=true]
 * @param {URL} [opciones.base]
 * @param {object} [opciones.diccionarios] - Diccionarios provistos en memoria para pruebas.
 * @returns {Promise<{ idioma: string, t: Function, tn: Function }>}
 */
export async function usarIdioma(nuevoIdioma, { persistir = true, base, diccionarios } = {}) {
  const normalizado = nuevoIdioma in IDIOMAS ? nuevoIdioma : IDIOMA_BASE;

  if (diccionarios) {
    diccionarioBase = diccionarios[IDIOMA_BASE] ?? {};
    diccionarioActivo = diccionarios[normalizado] ?? diccionarioBase;
    cacheDiccionarios.set(IDIOMA_BASE, diccionarioBase);
    cacheDiccionarios.set(normalizado, diccionarioActivo);
  } else {
    // Asegurar que el idioma base está cargado
    if (!cacheDiccionarios.has(IDIOMA_BASE)) {
      diccionarioBase = await cargarIdiomaCompleto(IDIOMA_BASE, base);
    } else {
      diccionarioBase = cacheDiccionarios.get(IDIOMA_BASE);
    }

    if (normalizado === IDIOMA_BASE) {
      diccionarioActivo = diccionarioBase;
    } else {
      diccionarioActivo = await cargarIdiomaCompleto(normalizado, base);
    }
  }

  const cambio = idiomaActivo !== normalizado;
  idiomaActivo = normalizado;

  if (persistir) {
    recordarIdioma(normalizado);
  }

  if (cambio) {
    for (const fn of oyentes) {
      try {
        fn(idiomaActivo);
      } catch (err) {
        // Evitar que el fallo de un oyente interrumpa a los demás
      }
    }
  }

  return { idioma: idiomaActivo, t, tn };
}

/**
 * Inicializa el sistema de idiomas detectando la configuración adecuada.
 *
 * @param {object} [opciones]
 * @param {string} [opciones.idioma]
 * @param {boolean} [opciones.persistir=true]
 * @param {URL} [opciones.base]
 * @param {object} [opciones.diccionarios]
 * @returns {Promise<{ idioma: string, t: Function, tn: Function }>}
 */
export async function iniciarIdioma({ idioma, persistir = true, base, diccionarios } = {}) {
  const guardado = recordarIdioma();
  const navegador = typeof navigator !== 'undefined' ? navigator.language : undefined;
  const seleccionado = idioma ?? elegirIdioma({ guardado, navegador });
  return usarIdioma(seleccionado, { persistir, base, diccionarios });
}

/**
 * Traduce una clave usando el diccionario activo.
 *
 * @param {string} clave
 * @param {object} [params={}]
 * @param {object} [opciones={}]
 * @returns {string}
 */
export function t(clave, params = {}, opciones = {}) {
  return traducir(diccionarioActivo, diccionarioBase, clave, params, {
    idioma: idiomaActivo,
    ...opciones,
  });
}

/**
 * Traduce una clave con soporte plural (.uno / .otros) usando el diccionario activo.
 *
 * @param {string} clave
 * @param {number} n
 * @param {object} [params={}]
 * @param {object} [opciones={}]
 * @returns {string}
 */
export function tn(clave, n, params = {}, opciones = {}) {
  return traducirN(diccionarioActivo, diccionarioBase, clave, n, params, {
    idioma: idiomaActivo,
    ...opciones,
  });
}

/**
 * Comprueba si una clave existe en el diccionario activo o en el de base.
 *
 * @param {string} clave
 * @returns {boolean}
 */
export function existe(clave) {
  return Boolean(diccionarioActivo?.[clave] ?? diccionarioBase?.[clave]);
}

/**
 * Registra una función que se invocará cada vez que cambie el idioma activo.
 *
 * @param {Function} fn
 * @returns {Function} Función para cancelar la suscripción.
 */
export function alCambiarIdioma(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/**
 * Devuelve el código del idioma activo ('es' o 'en').
 *
 * @returns {string}
 */
export function idiomaActual() {
  return idiomaActivo;
}
