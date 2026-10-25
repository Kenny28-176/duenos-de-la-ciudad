// Herramienta para calcular la relación de contraste WCAG 2.1 entre colores de fondo y texto.
// Se usa para asegurar la accesibilidad visual de barrios y fichas.
import { cargarDatos } from '../src/data/cargar.js';

export const TEXTO_OSCURO = '#23262B';
export const TEXTO_CLARO = '#EFEAE0';

/**
 * Convierte un código hexadecimal '#RRGGBB' en componentes sRGB normalizados [0, 1].
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexASrgb(hex) {
  const limpio = hex.replace(/^#/, '');
  const r = parseInt(limpio.slice(0, 2), 16) / 255;
  const g = parseInt(limpio.slice(2, 4), 16) / 255;
  const b = parseInt(limpio.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * Calcula la luminancia relativa según la especificación WCAG 2.1.
 * @param {string} hex
 * @returns {number}
 */
export function luminanciaRelativa(hex) {
  const [r, g, b] = hexASrgb(hex);
  const aLineal = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b);
}

/**
 * Calcula la relación de contraste WCAG entre dos colores hexadecimales (rango 1:1 a 21:1).
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
export function calcularContraste(hex1, hex2) {
  const l1 = luminanciaRelativa(hex1);
  const l2 = luminanciaRelativa(hex2);
  const masClaro = Math.max(l1, l2);
  const masOscuro = Math.min(l1, l2);
  const ratio = (masClaro + 0.05) / (masOscuro + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evalúa el nivel WCAG de un ratio de contraste.
 * @param {number} ratio
 * @returns {'normal' | 'grande' | 'insuficiente'}
 */
export function nivelContraste(ratio) {
  if (ratio >= 4.5) return 'normal';
  if (ratio >= 3.0) return 'grande';
  return 'insuficiente';
}

/**
 * Analiza una lista de elementos con color ({ tipo, id, nombre, color }).
 * @param {{ tipo: string, id: string, nombre: string, color: string }[]} elementos
 * @param {string} [textoOscuro=TEXTO_OSCURO]
 * @param {string} [textoClaro=TEXTO_CLARO]
 */
export function analizarColores(elementos, textoOscuro = TEXTO_OSCURO, textoClaro = TEXTO_CLARO) {
  return elementos.map(item => {
    const contrasteOscuro = calcularContraste(item.color, textoOscuro);
    const contrasteClaro = calcularContraste(item.color, textoClaro);
    const recomendado = contrasteOscuro >= contrasteClaro ? 'oscuro' : 'claro';
    const mejorContraste = Math.max(contrasteOscuro, contrasteClaro);
    const nivel = nivelContraste(mejorContraste);

    return {
      tipo: item.tipo,
      id: item.id,
      nombre: item.nombre,
      color: item.color,
      contrasteOscuro,
      contrasteClaro,
      recomendado,
      mejorContraste,
      nivel,
    };
  });
}

// Ejecución como script CLI
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const datos = await cargarDatos();
  const elementos = [
    ...datos.tablero.barrios.map(b => ({ tipo: 'Barrio', id: b.id, nombre: b.nombre, color: b.color })),
    ...datos.fichas.fichas.map(f => ({ tipo: 'Ficha', id: f.id, nombre: f.nombre, color: f.color })),
  ];

  const resultados = analizarColores(elementos);

  console.log('| Tipo | Elemento | Color | Contraste Oscuro (#23262B) | Contraste Claro (#EFEAE0) | Recomendado | Nivel WCAG |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of resultados) {
    const nivelTexto = r.nivel === 'normal' ? '≥ 4.5:1 (normal)' : (r.nivel === 'grande' ? '≥ 3.0:1 (grande/negrita)' : '< 3.0:1 (insuficiente)');
    console.log(
      `| ${r.tipo} | ${r.nombre} | \`${r.color}\` | ${r.contrasteOscuro.toFixed(2)}:1 | ${r.contrasteClaro.toFixed(2)}:1 | ${r.recomendado} | ${nivelTexto} |`,
    );
  }
}
