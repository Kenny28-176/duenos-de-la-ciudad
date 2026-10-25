// La pestaña «Calles» del celular: mis propiedades por barrios, con lo que se puede hacer con cada una. Los botones salen de lo
// que el tablero dice que se puede (la vista), con la cifra que luego aplica el motor; fuera de mi turno no hay ninguno.
import { tn, t } from '../../i18n/idioma.js';
import { html } from '../preact.js';
import { Boton, Edificios, Icono, dinero, nombreBarrio, nombreCasilla } from './comun.js';
import { propiedades } from './vista.js';

export function PestanaCalles({ c }) {
  const grupos = propiedades(c.motor, c.s, c.id, c.puede);
  if (!grupos.length) return html`<p class="vacio">${t('jugador.calles.vacio')}</p>`;
  const hayBotones = grupos.some(g => g.items.some(it => it.construir !== null || it.vender !== null || it.hipotecar !== null || it.deshipotecar !== null));
  return html`<div class="calles">
    ${hayBotones ? null : html`<p class="nota">${t('jugador.calles.en_tu_turno')}</p>`}
    ${grupos.map(g => html`<${Grupo} key=${g.barrio ?? g.tipo} g=${g} c=${c} />`)}
  </div>`;
}

function Grupo({ g, c }) {
  const nombre = g.tipo === 'barrio' ? nombreBarrio(g.barrio) : t(`jugador.calles.${g.tipo}`);
  return html`<section class="grupo" style=${{ '--color': g.color ?? 'var(--piedra)' }}>
    <h3><span class="franja"></span>${nombre}<small>${t('jugador.calles.tienes', { n: g.tengo, total: g.total })}</small></h3>
    ${g.tipo === 'barrio' && !g.completo ? html`<p class="nota">${tn('jugador.calles.falta', g.total - g.tengo)}</p>` : null}
    ${g.items.map(it => html`<${Tarjeta} key=${it.casilla} it=${it} c=${c} />`)}
  </section>`;
}

function Tarjeta({ it, c }) {
  const hacer = type => () => c.enviar({ type, casilla: it.casilla });
  const dato = it.hipotecada
    ? html`<span class="marca"><${Icono} grupo="tablero/marcadores" nombre="hipotecada" /> ${t('jugador.calles.hipotecada')}</span>`
    : it.alquiler !== null
      ? t('jugador.calles.alquiler', { cantidad: it.alquiler })
      : t('jugador.calles.dados', { factor: it.factorDados });
  return html`<article class=${`tarjeta ${it.hipotecada ? 'hipotecada' : ''}`}>
    <div class="info">
      <b class="nombre">${nombreCasilla(it.casilla)}</b>
      <span class="datos">${dato}</span>
      <${Edificios} nivel=${it.nivel} />
    </div>
    <div class="acciones">
      ${it.construir !== null ? html`<${Boton} icono="construir" texto=${t(it.nivel >= 4 ? 'jugador.calles.torre' : 'jugador.calles.casa')} detalle=${dinero(it.construir)} desactivado=${c.ocupado} onClick=${hacer('construir')} />` : null}
      ${it.vender !== null ? html`<${Boton} icono="vender-edificio" texto=${t('jugador.calles.vender')} detalle=${t('fmt.dinero.mas', { cantidad: it.vender })} desactivado=${c.ocupado} onClick=${hacer('venderEdificio')} />` : null}
      ${it.hipotecar !== null ? html`<${Boton} icono="hipotecar" texto=${t('jugador.calles.hipotecar')} detalle=${t('fmt.dinero.mas', { cantidad: it.hipotecar })} desactivado=${c.ocupado} onClick=${hacer('hipotecar')} />` : null}
      ${it.deshipotecar !== null ? html`<${Boton} icono="levantar-hipoteca" texto=${t('jugador.calles.levantar')} detalle=${dinero(it.deshipotecar)} desactivado=${c.ocupado} onClick=${hacer('deshipotecar')} />` : null}
    </div>
  </article>`;
}
