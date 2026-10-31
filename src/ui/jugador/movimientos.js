// «Mis movimientos»: la lista de los últimos movimientos de dinero del jugador (de dónde le entró o a dónde le salió cada peso) y el aviso
// breve que sale junto a su dinero cuando llega uno nuevo. El tablero los publica en la vista de cada celular (src/net/anfitrion.js) y
// vista.js (movimientos) los ordena; aquí solo se cuentan con palabras, en el idioma del celular.
import { t } from '../../i18n/idioma.js';
import { MAX_MOVIMIENTOS } from '../../net/protocolo.js';
import { html } from '../preact.js';
import { Boton, nombreDe } from './comun.js';

// Cómo se cuenta un movimiento: su motivo («Alquiler») y, si es con otro jugador, «de Ana» o «a Ana». «m» sale de vista.movimientos().
export function textoDeMovimiento(m, s) {
  return {
    motivo: t(`motivo.${m.motivo}`),
    otro: m.otro ? t(m.signo > 0 ? 'jugador.movimientos.de' : 'jugador.movimientos.a', { jugador: nombreDe(s, m.otro) }) : '',
    importe: t(m.signo > 0 ? 'fmt.dinero.mas' : 'fmt.dinero.menos', { cantidad: m.cantidad }),
  };
}

// La hoja con todos los movimientos, que se abre al tocar el dinero de la cabecera.
export function PanelMovimientos({ s, lista, cerrar }) {
  return html`<div class="movimientos" role="dialog" aria-modal="true" aria-labelledby="movimientos-titulo">
    <h2 id="movimientos-titulo">${t('jugador.movimientos.titulo')}</h2>
    ${lista.length
      ? html`<ol>${lista.map(m => {
        const x = textoDeMovimiento(m, s);
        return html`<li key=${m.n} class=${m.signo > 0 ? 'entra' : 'sale'}>
          <span class="que"><b>${x.motivo}</b>${x.otro ? html`<small>${x.otro}</small>` : null}</span>
          <b class="importe">${x.importe}</b>
        </li>`;
      })}</ol>
      <p class="nota">${t('jugador.movimientos.nota', { n: MAX_MOVIMIENTOS })}</p>`
      : html`<p class="vacio">${t('jugador.movimientos.vacio')}</p>`}
    <${Boton} tipo="principal" texto=${t('jugador.movimientos.cerrar')} onClick=${cerrar} />
  </div>`;
}

// El aviso breve junto al dinero: lo que acaba de entrar o salir (hasta tres movimientos, el más nuevo arriba).
export function AvisoDeDinero({ aviso }) {
  if (!aviso) return null;
  return html`<div class="toast-dinero" role="status" key=${aviso.n}>
    ${aviso.filas.map(f => html`<p class=${f.signo > 0 ? 'entra' : 'sale'}><b>${f.importe}</b> <span>${f.motivo}${f.otro ? ` · ${f.otro}` : ''}</span></p>`)}
  </div>`;
}
