// La subasta en el celular: la calle que se subasta, la puja más alta y los botones para pujar o retirarse. La cuenta atrás la
// lleva el tablero; aquí solo se ve lo que hay y se pide lo que el tablero acepta (la puja mínima viene de la vista).
import { t } from '../../i18n/idioma.js';
import { SEGUNDOS_DE_SUBASTA } from '../../net/protocolo.js';
import { html, useState } from '../preact.js';
import { Boton, Icono, dinero, nombreBarrio, nombreCasilla, nombreDe } from './comun.js';
import { opcionesDePuja } from './vista.js';

export function PanelSubasta({ c }) {
  const { s, id, puede, motor } = c;
  const [libre, setLibre] = useState('');
  const sub = s.subasta;
  const casilla = motor.ctx.casillas[sub.casilla];
  const color = casilla.tipo === 'calle' ? motor.ctx.barrios[casilla.barrio].color : 'var(--piedra)';
  const j = s.jugadores[id];
  const participo = sub.activos.includes(id);
  const lidero = sub.lider === id;
  const minima = puede.pujar ?? null;
  const rapidas = minima ? opcionesDePuja(minima, j.dinero, motor.ctx.eco.subasta.incremento) : [];
  const cantidadLibre = Math.floor(Number(libre) || 0);
  const libreValida = minima !== null && cantidadLibre >= minima && cantidadLibre <= j.dinero;
  const pujar = cantidad => c.enviar({ type: 'pujar', cantidad });

  let estado;
  if (lidero) estado = t('jugador.subasta.vas_ganando');
  else if (!participo) estado = t('jugador.subasta.fuera');
  else if (minima === null) estado = t('jugador.subasta.sin_dinero');
  return html`<section class="subasta" style=${{ '--color': color }}>
    <h2><${Icono} nombre="subastar" /> ${t('subasta.titulo')}</h2>
    <div class="calle-subastada">
      <b class="nombre"><span class="franja"></span>${nombreCasilla(sub.casilla)}</b>
      <small>${casilla.tipo === 'calle' ? nombreBarrio(casilla.barrio) : t(`jugador.calles.${casilla.tipo}`)} · ${t('jugador.subasta.vale', { cantidad: casilla.precio })}</small>
    </div>
    <p class="puja-actual">${sub.lider
      ? html`${t('subasta.lidera', { jugador: nombreDe(s, sub.lider) })} <b>${dinero(sub.puja)}</b>`
      : t('subasta.sin_pujas')}</p>
    ${estado ? html`<p class="nota">${estado}</p>` : null}
    ${minima !== null ? html`<div class="pujas">
      <p class="etiqueta">${t('jugador.subasta.pujar')}</p>
      <div class="rapidas">${rapidas.map(cantidad => html`<${Boton} key=${cantidad} icono="pujar" texto=${dinero(cantidad)} tipo=${cantidad === minima ? 'principal' : ''} desactivado=${c.ocupado} onClick=${() => pujar(cantidad)} />`)}</div>
      <form class="puja-libre" onSubmit=${e => { e.preventDefault(); if (libreValida && !c.ocupado) pujar(cantidadLibre); }}>
        <input type="number" inputmode="numeric" min=${minima} max=${j.dinero} step="10" placeholder=${t('jugador.subasta.otra')} value=${libre} onInput=${e => setLibre(e.target.value)} />
        <${Boton} icono="pujar" texto=${t('jugador.subasta.pujar_esa')} desactivado=${c.ocupado || !libreValida} onClick=${() => pujar(cantidadLibre)} />
      </form>
    </div>` : null}
    ${puede.retirarse ? html`<${Boton} icono="pasar" texto=${t('jugador.subasta.retirarme')} desactivado=${c.ocupado} onClick=${() => c.enviar({ type: 'retirarse' })} />` : null}
    <div class="cuenta-subasta" role="img" aria-label=${t('jugador.subasta.cuenta', { n: SEGUNDOS_DE_SUBASTA })} key=${c.n}><span style=${{ animationDuration: `${SEGUNDOS_DE_SUBASTA}s` }}></span></div>
    <p class="nota">${t('jugador.subasta.cuenta', { n: SEGUNDOS_DE_SUBASTA })}</p>
  </section>`;
}
