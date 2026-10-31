// La pestaña «Mesa» del celular: todos los jugadores, ordenados por patrimonio, con su dinero, sus propiedades y su estado.
import { t, tn } from '../../i18n/idioma.js';
import { html } from '../preact.js';
import { Barra, Retrato, dinero, nombreFicha } from './comun.js';
import { clasificacion } from './vista.js';

export function PestanaMesa({ c }) {
  const filas = clasificacion(c.motor, c.s, { nombreDeFicha: nombreFicha });
  return html`<ol class="mesa">
    ${filas.map((f, k) => html`<li key=${f.id} class=${`fila-mesa ${f.id === c.id ? 'yo' : ''} ${f.turno ? 'turno' : ''} ${f.quebrado ? 'quebrado' : ''}`.trim()} style=${{ '--color': f.color }}>
      <span class="puesto">${f.quebrado ? '·' : k + 1}</span>
      <${Retrato} ficha=${f.ficha} color=${f.color} pieza />
      <div class="info">
        <b class="nombre">${f.nombre}${f.id === c.id ? html` <small class="tu">${t('jugador.tu')}</small>` : null}${f.turno ? html` <small class="turno-marca">${t('jugador.mesa.turno')}</small>` : null}</b>
        ${f.quebrado
          ? html`<small>${t('jugador.mesa.quebrado')}</small>`
          : html`<small>${t('jugador.mesa.patrimonio', { cantidad: f.patrimonio })} · ${tn('jugador.mesa.propiedades', f.propiedades)}</small>
            ${f.avance !== null ? html`<${Barra} valor=${f.avance} etiqueta=${t('panel.avance')} />` : null}`}
        ${f.estados.length ? html`<small class="estados">${f.estados.map(e => t(`estado.${e}`)).join(' · ')}</small>` : null}
      </div>
      <span class="dinero">${f.quebrado ? '' : dinero(f.dinero)}</span>
    </li>`)}
  </ol>
  <button type="button" class=${`chip ajuste ${c.avisoSonoro ? 'elegida' : ''}`.trim()} aria-pressed=${Boolean(c.avisoSonoro)} onClick=${c.alternarAviso}>${t('jugador.mesa.aviso_sonoro')}</button>`;
}
