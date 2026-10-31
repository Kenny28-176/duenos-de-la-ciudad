// El vestíbulo del tablero: antes de empezar una partida con celulares. Enseña el código de la sala y su QR, los jugadores
// que van entrando, las opciones de la partida y los botones para añadir bots y empezar. Todos los textos salen de los
// diccionarios; los jugadores que van entrando salen del estado que publica el anfitrión.
import { MAX_JUGADORES, MIN_JUGADORES } from '../../engine/contexto.js';
import { t } from '../../i18n/idioma.js';
import { BASE, Imagen } from '../imagen.js';
import { html, useState } from '../preact.js';
import { svgDeQr } from '../qr.js';
import { nombreMostrado } from './vista.js';

const METAS = [['corta', 7000], ['normal', 10000], ['larga', 14000], ['ninguna', null]];
const TIEMPOS = [null, 45, 60, 90]; // minutos de la partida (null = sin límite)

// Las opciones que se eligen aquí, con lo que tenía la sala (si es una revancha, las de la partida anterior) o, si no, lo normal.
const CLAVES = ['meta', 'mercado', 'habilidades', 'subastas', 'limiteMinutos'];
const iniciales = previas => ({
  meta: 10000, mercado: true, habilidades: true, subastas: true, limiteMinutos: null,
  ...Object.fromEntries(CLAVES.filter(k => previas && k in previas).map(k => [k, previas[k]])),
});

// colores(ficha) da el color de una ficha.
export function Vestibulo({ sala, estado, acciones, colores }) {
  const [opciones, setOpciones] = useState(() => iniciales(estado?.opciones));
  if (!sala || !estado) return null;
  const jugadores = estado.ids.map(id => estado.jugadores[id]);
  const faltan = Math.max(0, MIN_JUGADORES - jugadores.length);
  const cambiar = parche => setOpciones(o => ({ ...o, ...parche }));
  const interruptor = (clave, texto) => html`<label class="interruptor"><input type="checkbox" checked=${opciones[clave]} onChange=${e => cambiar({ [clave]: e.target.checked })} /> ${texto}</label>`;
  return html`<div class="vestibulo">
    <div class="vestibulo-izquierda">
      <div class="qr" dangerouslySetInnerHTML=${{ __html: svgDeQr(sala.url) }}></div>
      <p class="etiqueta">${t('sala.codigo')}</p>
      <b class="codigo">${sala.codigo}</b>
    </div>
    <div class="vestibulo-derecha">
      <h2>${t('sala.titulo')}</h2>
      <p class="ayuda">${t('sala.escanea', { direccion: sala.direccion })}</p>
      ${sala.sinRed ? html`<p class="aviso-local">${t('sala.sin_wifi')}</p>` : null}
      ${sala.otras?.length ? html`<p class="ayuda otras-direcciones">${t('sala.otras', { direcciones: sala.otras.join(' · ') })}</p>` : null}
      <h3>${t('sala.jugadores', { n: jugadores.length, max: MAX_JUGADORES })}</h3>
      <ul class=${`lista-jugadores ${jugadores.length <= 4 ? 'una-columna' : ''}`.trim()}>
        ${jugadores.length === 0 ? html`<li class="vacio">${t('sala.esperando')}</li>` : null}
        ${jugadores.map(j => html`<li key=${j.id} style=${{ '--color': j.ficha ? colores(j.ficha) : 'var(--piedra)' }}>
          ${j.ficha ? html`<${Imagen} src=${`${BASE}fichas/piezas/${j.ficha}.webp`} clase="pieza" />` : html`<span class="pieza vacia">?</span>`}
          <span class="nombre">${nombreMostrado(j, f => t(`ficha.${f}`))}</span>
          ${j.bot ? html`<small class="etiqueta-bot">${t('sala.bot')}</small>` : null}
          ${j.ficha ? null : html`<small class="eligiendo">${t('sala.eligiendo')}</small>`}
          <button type="button" class="quitar" title=${t('sala.quitar', { jugador: nombreMostrado(j, f => t(`ficha.${f}`)) })} aria-label=${t('sala.quitar', { jugador: nombreMostrado(j, f => t(`ficha.${f}`)) })}
            onClick=${() => acciones.quitarJugador(j.id)}>×</button>
        </li>`)}
      </ul>
      <div class="opciones">
        <h3>${t('sala.opciones')}</h3>
        <label class="meta">${t('sala.meta')}
          <select value=${String(opciones.meta)} onChange=${e => cambiar({ meta: e.target.value === 'null' ? null : Number(e.target.value) })}>
            ${METAS.map(([nombre, meta]) => html`<option value=${String(meta)}>${t(`sala.meta.${nombre}`, { meta })}</option>`)}
          </select>
        </label>
        <label class="meta">${t('sala.tiempo')}
          <select value=${String(opciones.limiteMinutos)} onChange=${e => cambiar({ limiteMinutos: e.target.value === 'null' ? null : Number(e.target.value) })}>
            ${TIEMPOS.map(minutos => html`<option value=${String(minutos)}>${minutos === null ? t('sala.tiempo.ninguno') : t('sala.tiempo.minutos', { n: minutos })}</option>`)}
          </select>
        </label>
        ${interruptor('mercado', t('sala.mercado'))}
        ${interruptor('habilidades', t('sala.habilidades'))}
        ${interruptor('subastas', t('sala.subastas'))}
      </div>
      <div class="botones-vestibulo">
        <button class="boton" disabled=${jugadores.length >= MAX_JUGADORES} onClick=${acciones.anadirBot}>${t('sala.anadir_bot')}</button>
        <button class="boton principal" disabled=${faltan > 0} onClick=${() => acciones.empezar(opciones)}>${t('sala.empezar')}</button>
        <button class="boton" onClick=${acciones.cerrarSala}>${t('controles.cerrar_sala')}</button>
      </div>
      ${faltan > 0 ? html`<p class="faltan">${t('sala.faltan', { n: MIN_JUGADORES })}</p>` : null}
    </div>
  </div>`;
}
