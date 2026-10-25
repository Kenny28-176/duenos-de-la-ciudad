// La pestaña «Tratos» del celular: los que me proponen (para aceptarlos o rechazarlos), los que propuse yo y el constructor para
// proponer uno nuevo a otro jugador. Los tratos los comprueba el motor al proponerlos y otra vez al aceptarlos.
import { t, tn } from '../../i18n/idioma.js';
import { html, useEffect, useState } from '../preact.js';
import { Boton, Retrato, dinero, nombreBarrio, nombreCasilla, nombreDe } from './comun.js';
import { PARTE_VACIA, parteDeTrato, parteVacia, propiedadesTratables, rivales, tratos } from './vista.js';

// El color de una propiedad: el de su barrio (o el de la piedra, si es un transporte o un servicio).
const colorDe = (motor, i) => {
  const casilla = motor.ctx.casillas[i];
  return casilla.tipo === 'calle' ? motor.ctx.barrios[casilla.barrio].color : 'var(--piedra)';
};

export function PestanaTratos({ c }) {
  const [creando, setCreando] = useState(false);
  const lista = tratos(c.s, c.id, c.puede);
  if (creando) return html`<${ConstructorDeTrato} c=${c} cerrar=${() => setCreando(false)} />`;
  return html`<div class="tratos">
    ${c.puede.proponerTrato ? html`<${Boton} icono="tratos" texto=${t('jugador.tratos.proponer')} desactivado=${c.ocupado} onClick=${() => setCreando(true)} />` : null}
    ${lista.length === 0 ? html`<p class="vacio">${t('jugador.tratos.vacio')}</p>` : lista.map(tr => html`<${Trato} key=${tr.id} tr=${tr} c=${c} />`)}
  </div>`;
}

// Lo que se da o se recibe en un trato, como lista.
function Parte({ parte, c }) {
  const filas = [];
  if (parte.dinero) filas.push(html`<li key="dinero" class="dinero">${dinero(parte.dinero)}</li>`);
  for (const i of parte.propiedades ?? []) filas.push(html`<li key=${`p${i}`} class="propiedad" style=${{ '--color': colorDe(c.motor, i) }}>${nombreCasilla(i)}</li>`);
  for (const [barrio, n] of Object.entries(parte.acciones ?? {})) filas.push(html`<li key=${`a${barrio}`}>${t('jugador.tratos.acciones', { n, barrio: nombreBarrio(barrio) })}</li>`);
  if (parte.salvoconductos) filas.push(html`<li key="salvoconductos">${tn('jugador.tratos.salvoconductos', parte.salvoconductos)}</li>`);
  return filas.length ? html`<ul class="lista-trato">${filas}</ul>` : html`<p class="nada">${t('jugador.tratos.nada')}</p>`;
}

function Trato({ tr, c }) {
  const otro = nombreDe(c.s, tr.con);
  return html`<article class=${`trato ${tr.recibido ? 'recibido' : ''}`}>
    <h3>${tr.recibido ? t('jugador.tratos.te_propone', { jugador: otro }) : t('jugador.tratos.propusiste', { jugador: otro })}</h3>
    <div class="mitades">
      <div><h4>${t('jugador.tratos.tu_das')}</h4><${Parte} parte=${tr.doy} c=${c} /></div>
      <div><h4>${t('jugador.tratos.tu_recibes')}</h4><${Parte} parte=${tr.recibo} c=${c} /></div>
    </div>
    <div class="botones">
      ${tr.recibido ? html`<${Boton} icono="aceptar" tipo="principal" texto=${t('jugador.tratos.aceptar')} desactivado=${c.ocupado || !tr.puedeAceptar} onClick=${() => c.enviar({ type: 'aceptarTrato', trato: tr.id })} />` : null}
      <${Boton} icono="rechazar" texto=${tr.recibido ? t('jugador.tratos.rechazar') : t('jugador.tratos.cancelar')} desactivado=${c.ocupado} onClick=${() => c.enviar({ type: 'rechazarTrato', trato: tr.id })} />
    </div>
    ${tr.recibido && !tr.puedeAceptar ? html`<p class="nota">${t('jugador.tratos.no_se_puede')}</p>` : null}
  </article>`;
}

// --- Proponer un trato --------------------------------------------------------------------------------------------------

function Contador({ etiqueta, valor, maximo, paso = 1, cambiar }) {
  return html`<div class="contador">
    <span>${etiqueta}</span>
    <button type="button" aria-label="−" disabled=${valor <= 0} onClick=${() => cambiar(Math.max(0, valor - paso))}>−</button>
    <b>${valor}</b>
    <button type="button" aria-label="+" disabled=${valor >= maximo} onClick=${() => cambiar(Math.min(maximo, valor + paso))}>+</button>
  </div>`;
}

// Lo que pone un jugador en el trato: dinero, propiedades, acciones y salvoconductos. Solo se ofrece lo que tiene.
function Editor({ titulo, quien, parte, cambiar, c }) {
  const { motor, s } = c;
  const j = s.jugadores[quien];
  const propiedades = propiedadesTratables(motor, s, quien);
  const paquete = motor.ctx.eco.bolsa.paquete;
  const poner = parche => cambiar({ ...parte, ...parche });
  const alternar = i => poner({ propiedades: parte.propiedades.includes(i) ? parte.propiedades.filter(k => k !== i) : [...parte.propiedades, i] });
  return html`<section class="editor">
    <h4>${titulo}</h4>
    <label class="campo-dinero">
      <span>${t('jugador.tratos.dinero')}</span>
      <input type="number" inputmode="numeric" min="0" max=${j.dinero} step="10" placeholder="0" value=${parte.dinero || ''}
        onInput=${e => poner({ dinero: Math.min(j.dinero, Math.max(0, Math.floor(Number(e.target.value) || 0))) })} />
      <small>${t('jugador.tratos.tiene', { cantidad: dinero(j.dinero) })}</small>
    </label>
    ${propiedades.length ? html`<div class="propiedades-trato">${propiedades.map(i => html`<button type="button" key=${i}
      class=${`chip ${parte.propiedades.includes(i) ? 'elegida' : ''}`} style=${{ '--color': colorDe(motor, i) }} aria-pressed=${parte.propiedades.includes(i)}
      onClick=${() => alternar(i)}>${nombreCasilla(i)}</button>`)}</div>` : null}
    ${Object.entries(j.acciones).map(([barrio, tiene]) => html`<${Contador} key=${barrio} etiqueta=${t('jugador.tratos.acciones_de', { barrio: nombreBarrio(barrio) })}
      valor=${parte.acciones[barrio] ?? 0} maximo=${tiene} paso=${paquete} cambiar=${n => poner({ acciones: { ...parte.acciones, [barrio]: n } })} />`)}
    ${j.salvoconductos > 0 ? html`<${Contador} etiqueta=${t('jugador.tratos.salvoconducto')} valor=${parte.salvoconductos} maximo=${j.salvoconductos} cambiar=${n => poner({ salvoconductos: n })} />` : null}
  </section>`;
}

function ConstructorDeTrato({ c, cerrar }) {
  const { s, id, motor } = c;
  const posibles = rivales(s, id);
  const [para, setPara] = useState(posibles.length === 1 ? posibles[0] : null);
  const [doy, setDoy] = useState(PARTE_VACIA);
  const [pido, setPido] = useState(PARTE_VACIA);
  // Cuando el tablero crea mi trato, se vuelve a la lista: se nota porque aparece uno mío que antes no estaba.
  const [antes] = useState(() => new Set(Object.values(s.tratos).filter(tr => tr.de === id).map(tr => tr.id)));
  const nuevo = Object.values(s.tratos).some(tr => tr.de === id && !antes.has(tr.id));
  useEffect(() => { if (nuevo) cerrar(); }, [nuevo]);

  if (!para) {
    return html`<div class="constructor">
      <h3>${t('jugador.tratos.con_quien')}</h3>
      <ul class="rivales">${posibles.map(k => html`<li key=${k}><button type="button" onClick=${() => setPara(k)}>
        <${Retrato} ficha=${s.jugadores[k].ficha} color=${motor.ctx.fichas[s.jugadores[k].ficha].color} pieza />
        <span class="nombre">${nombreDe(s, k)}</span><small>${dinero(s.jugadores[k].dinero)}</small></button></li>`)}</ul>
      <${Boton} icono="volver" texto=${t('jugador.tratos.volver')} onClick=${cerrar} />
    </div>`;
  }
  const vacio = parteVacia(doy) && parteVacia(pido);
  return html`<div class="constructor">
    <h3>${t('jugador.tratos.trato_con', { jugador: nombreDe(s, para) })}</h3>
    <${Editor} titulo=${t('jugador.tratos.tu_das')} quien=${id} parte=${doy} cambiar=${setDoy} c=${c} />
    <${Editor} titulo=${t('jugador.tratos.tu_pides')} quien=${para} parte=${pido} cambiar=${setPido} c=${c} />
    <div class="botones">
      <${Boton} icono="tratos" tipo="principal" texto=${t('jugador.tratos.enviar')} desactivado=${c.ocupado || vacio}
        onClick=${() => c.enviar({ type: 'proponerTrato', para, ofrece: parteDeTrato(doy), pide: parteDeTrato(pido) })} />
      <${Boton} icono="volver" texto=${t('jugador.tratos.volver')} onClick=${cerrar} />
    </div>
  </div>`;
}
