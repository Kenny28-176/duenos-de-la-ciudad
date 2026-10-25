// La pestaña «Bolsa» del celular: el precio de la acción de cada barrio, cuántas tengo y los botones para comprar o vender un
// paquete. Comprar solo se puede con la Bolsa abierta (al pasar por la Salida o al caer en la Bolsa o la Agencia).
import { t } from '../../i18n/idioma.js';
import { html } from '../preact.js';
import { Boton, dinero, nombreBarrio } from './comun.js';
import { bolsa } from './vista.js';

export function PestanaBolsa({ c }) {
  const b = bolsa(c.motor, c.s, c.id, c.puede);
  if (!b) return html`<p class="vacio">${t('jugador.bolsa.sin_mercado')}</p>`;
  return html`<div class="bolsa">
    <p class=${`nota ${b.abierta ? 'abierta' : ''}`}>${b.abierta ? t('jugador.bolsa.abierta', { n: b.paquete }) : t('jugador.bolsa.cerrada')}</p>
    ${b.filas.map(f => html`<article key=${f.barrio} class="tarjeta fila-bolsa" style=${{ '--color': f.color }}>
      <div class="info">
        <b class="nombre"><span class="franja"></span>${nombreBarrio(f.barrio)}</b>
        <span class="datos"><b class="precio">${dinero(f.precio)}</b> ${t('jugador.bolsa.por_accion')}</span>
        <small>${t('jugador.bolsa.tienes', { n: f.tengo, maximo: b.maximo })} · ${t('jugador.bolsa.quedan', { n: f.quedan })}</small>
      </div>
      <div class="acciones">
        ${f.comprar !== null ? html`<${Boton} icono="comprar-acciones" texto=${t('jugador.bolsa.comprar', { n: b.paquete })} detalle=${dinero(f.comprar)} desactivado=${c.ocupado} onClick=${() => c.enviar({ type: 'comprarAcciones', barrio: f.barrio, cantidad: b.paquete })} />` : null}
        ${f.vender !== null ? html`<${Boton} icono="vender-acciones" texto=${t('jugador.bolsa.vender', { n: b.paquete })} detalle=${t('fmt.dinero.mas', { cantidad: f.vender })} desactivado=${c.ocupado} onClick=${() => c.enviar({ type: 'venderAcciones', barrio: f.barrio, cantidad: b.paquete })} />` : null}
      </div>
    </article>`)}
  </div>`;
}
