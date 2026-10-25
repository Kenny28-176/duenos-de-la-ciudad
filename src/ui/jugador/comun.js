// Piezas que se repiten en las pantallas del celular: iconos, dinero, botones, barras y los nombres traducidos.
import { t } from '../../i18n/idioma.js';
import { BASE, Imagen } from '../imagen.js';
import { html } from '../preact.js';
import { nombreMostrado } from '../tablero/vista.js';

// Un icono de la interfaz (public/visuales/botones/acciones o interfaz/iconos). Son dibujos de una sola línea que toman el
// color del texto: se pintan como máscara, no como <img> (que los dejaría negros).
export function Icono({ nombre, grupo = 'botones/acciones', clase = '' }) {
  return html`<span class=${`icono ${clase}`} aria-hidden="true" style=${{ '--icono': `url(${BASE}${grupo}/${nombre}.svg)` }}></span>`;
}

export const dinero = cantidad => t('fmt.dinero', { cantidad });

export const nombreFicha = ficha => t(`ficha.${ficha}`);
export const nombreCasilla = i => t(`casilla.${i}`);
export const nombreBarrio = barrio => t(`barrio.${barrio}`);

// El nombre que se muestra de un jugador (los bots se llaman como su ficha).
export const nombreDe = (s, id) => nombreMostrado(s.jugadores[id], nombreFicha);

// El retrato de una ficha (grande) o su pieza (pequeña), en un recuadro con su color.
export function Retrato({ ficha, color, pieza = false, clase = '' }) {
  if (!ficha) return html`<span class=${`retrato vacio ${clase}`}>?</span>`;
  return html`<span class=${`retrato ${pieza ? 'pieza' : ''} ${clase}`} style=${{ '--color': color }}>
    <${Imagen} src=${`${BASE}fichas/${pieza ? 'piezas' : 'retratos'}/${ficha}.webp`} clase="imagen-ficha" />
  </span>`;
}

// Un botón con su icono, su texto y, si hace falta, una cifra al lado (lo que cuesta o lo que se cobra).
//   tipo: '' | 'principal' (la acción de siempre) | 'peligro' (no se puede deshacer) | 'suave'
export function Boton({ icono, texto, detalle, onClick, desactivado = false, tipo = '', clase = '' }) {
  return html`<button type="button" class=${`boton ${tipo} ${clase}`.trim()} disabled=${desactivado} onClick=${onClick}>
    ${icono ? html`<${Icono} nombre=${icono} />` : null}
    <span class="texto-boton">${texto}</span>
    ${detalle ? html`<small class="detalle-boton">${detalle}</small>` : null}
  </button>`;
}

// Una barra de avance (de 0 a 1).
export function Barra({ valor, etiqueta }) {
  const porcentaje = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return html`<div class="barra" role="progressbar" aria-label=${etiqueta} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${porcentaje}>
    <span style=${{ width: `${porcentaje}%` }}></span>
  </div>`;
}

// Las casas de una calle (de 1 a 4) o su torre (5), con las imágenes del tablero.
export function Edificios({ nivel }) {
  if (!nivel) return null;
  if (nivel >= 5) return html`<span class="edificios"><${Imagen} src=${`${BASE}tablero/edificios/torre.webp`} clase="edificio torre" alt=${t('jugador.torre')} /></span>`;
  return html`<span class="edificios">${Array.from({ length: nivel }, (_, k) => html`<${Imagen} key=${k} src=${`${BASE}tablero/edificios/casa.webp`} clase="edificio" alt="" />`)}</span>`;
}
