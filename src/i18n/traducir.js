// Módulo de traducción y formateo de textos localizados (funciones puras, sin navegador).

export const IDIOMAS = { es: 'Español', en: 'English' };
export const IDIOMA_BASE = 'es';

const FORMATOS_VALIDOS = new Set(['dinero', 'pct', 'extra', 'menos']);

/**
 * Formatea un número según las reglas del idioma (separador de miles siempre, hasta 2 decimales).
 * @param {number} valor
 * @param {string} idioma
 * @returns {string}
 */
function formatearNumero(valor, idioma) {
  const lang = idioma === 'en' ? 'en' : 'es';
  return new Intl.NumberFormat(lang, {
    useGrouping: 'always',
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formatea un porcentaje según el idioma (hasta 1 decimal, espacio no rompible en español).
 * @param {number} valorPct - Valor en porcentaje (e.g. 5 para 5 %, 0.6 para 0,6 %).
 * @param {string} idioma
 * @returns {string}
 */
function formatearPorcentaje(valorPct, idioma) {
  const lang = idioma === 'en' ? 'en' : 'es';
  const numRedondeado = Math.round(valorPct * 10) / 10;
  const numStr = new Intl.NumberFormat(lang, {
    useGrouping: 'always',
    maximumFractionDigits: 1,
  }).format(numRedondeado);

  return idioma === 'en' ? `${numStr}%` : `${numStr}\u00A0%`;
}

/**
 * Aplica el formato indicado a un valor para insertarlo en un marcador.
 * @param {unknown} valor
 * @param {string|undefined} formato
 * @param {string} idioma
 * @returns {string}
 */
function aplicarFormato(valor, formato, idioma) {
  if (!formato) {
    if (typeof valor === 'number') {
      return formatearNumero(valor, idioma);
    }
    return String(valor);
  }

  if (!FORMATOS_VALIDOS.has(formato)) {
    throw new Error(`Formato desconocido en marcador: "${formato}"`);
  }

  // Si el valor no es un número, se coloca tal cual
  if (typeof valor !== 'number') {
    return String(valor);
  }

  if (formato === 'dinero') {
    const numStr = formatearNumero(Math.abs(valor), idioma);
    return idioma === 'en' ? `$${numStr}` : `${numStr}\u00A0$`;
  }

  if (formato === 'pct') {
    return formatearPorcentaje(Math.abs(valor * 100), idioma);
  }

  if (formato === 'extra') {
    return formatearPorcentaje(Math.abs((valor - 1) * 100), idioma);
  }

  // formato === 'menos'
  return formatearPorcentaje(Math.abs((1 - valor) * 100), idioma);
}

/**
 * Traduce una clave sustituyendo los marcadores {nombre} o {nombre:formato}.
 * Si la clave no está en el diccionario, usa el de base; si tampoco está, devuelve la propia clave.
 *
 * @param {object} diccionario - Diccionario del idioma elegido.
 * @param {object} base - Diccionario base en español.
 * @param {string} clave - Clave del texto (e.g. "barrio.talleres").
 * @param {object} [params={}] - Parámetros para sustituir en los marcadores.
 * @param {object} [opciones={}]
 * @param {string} [opciones.idioma='es'] - Código de idioma para el formateo numérico.
 * @param {number} [opciones.variante=0] - Índice de la variante cuando el texto es una lista.
 * @returns {string}
 */
export function traducir(diccionario, base, clave, params = {}, { idioma = 'es', variante = 0 } = {}) {
  let texto = diccionario?.[clave] ?? base?.[clave];

  if (texto === undefined || texto === null) {
    return clave;
  }

  if (Array.isArray(texto)) {
    if (texto.length === 0) return clave;
    const idx = ((variante % texto.length) + texto.length) % texto.length;
    texto = texto[idx];
  }

  if (typeof texto !== 'string') {
    return String(texto);
  }

  return texto.replace(/\{([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?\}/g, (coincidencia, nombre, formato) => {
    const valor = params[nombre];
    if (valor === undefined || valor === null) {
      return '';
    }
    return aplicarFormato(valor, formato, idioma);
  });
}

/**
 * Traduce una clave con soporte para formas plurales (.uno y .otros).
 *
 * @param {object} diccionario
 * @param {object} base
 * @param {string} clave
 * @param {number} n
 * @param {object} [params={}]
 * @param {object} [opciones={}]
 * @returns {string}
 */
export function traducirN(diccionario, base, clave, n, params = {}, opciones = {}) {
  const sufijo = n === 1 ? 'uno' : 'otros';
  const clavePlural = `${clave}.${sufijo}`;
  const existePlural = Boolean(diccionario?.[clavePlural] ?? base?.[clavePlural]);
  const claveFinal = existePlural ? clavePlural : clave;
  return traducir(diccionario, base, claveFinal, { n, ...params }, opciones);
}

/**
 * Determina el idioma que se debe usar evaluando parámetro de URL, almacenamiento y navegador.
 *
 * @param {object} [opciones]
 * @param {string|object} [opciones.parametro]
 * @param {string} [opciones.guardado]
 * @param {string|string[]} [opciones.navegador]
 * @returns {string} 'es' o 'en'
 */
export function elegirIdioma({ parametro, guardado, navegador } = {}) {
  const normalizar = valor => {
    if (!valor || typeof valor !== 'string') return null;
    const limpio = valor.trim().toLowerCase();
    if (limpio.startsWith('en')) return 'en';
    if (limpio.startsWith('es')) return 'es';
    return null;
  };

  // 1. Parámetro explícito (string o URLSearchParams)
  if (parametro) {
    if (typeof parametro === 'string') {
      const match = normalizar(parametro);
      if (match) return match;
    } else if (typeof parametro.get === 'function') {
      const match = normalizar(parametro.get('lang') ?? parametro.get('idioma'));
      if (match) return match;
    } else if (parametro.lang || parametro.idioma) {
      const match = normalizar(parametro.lang ?? parametro.idioma);
      if (match) return match;
    }
  }

  // 2. Almacenamiento guardado
  if (guardado) {
    const match = normalizar(guardado);
    if (match) return match;
  }

  // 3. Idioma(s) del navegador
  if (navegador) {
    if (Array.isArray(navegador)) {
      for (const item of navegador) {
        const match = normalizar(item);
        if (match) return match;
      }
    } else if (typeof navegador === 'string') {
      const match = normalizar(navegador);
      if (match) return match;
    }
  }

  return IDIOMA_BASE;
}

/**
 * Une una lista de nombres con comas y la conjunción indicada.
 *
 * @param {string[]} nombres
 * @param {string} [conjuncion='y']
 * @returns {string}
 */
export function listaDeNombres(nombres, conjuncion = 'y') {
  if (!Array.isArray(nombres) || nombres.length === 0) {
    return '';
  }
  if (nombres.length === 1) {
    return String(nombres[0]);
  }
  if (nombres.length === 2) {
    return `${nombres[0]} ${conjuncion} ${nombres[1]}`;
  }
  return `${nombres.slice(0, -1).join(', ')} ${conjuncion} ${nombres[nombres.length - 1]}`;
}

/**
 * Une las cuatro partes de un idioma y lanza un error si alguna clave está repetida.
 *
 * @param {...object} partes
 * @returns {object}
 */
export function unirDiccionarios(...partes) {
  const resultado = {};
  for (const parte of partes) {
    if (!parte) continue;
    for (const [clave, valor] of Object.entries(parte)) {
      if (Object.prototype.hasOwnProperty.call(resultado, clave)) {
        throw new Error(`Clave repetida en el diccionario: "${clave}"`);
      }
      resultado[clave] = valor;
    }
  }
  return resultado;
}
