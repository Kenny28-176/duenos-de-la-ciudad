// La pantalla de la partida en el celular: arriba mi dinero y mi patrimonio, en medio lo que estoy mirando (mis calles, la
// Bolsa, los tratos o la mesa), y abajo los botones de lo que puedo hacer ahora, que son los que dice el tablero.
import { t, tn } from '../../i18n/idioma.js';
import { html, useState } from '../preact.js';
import { PestanaBolsa } from './bolsa.js';
import { Barra, Boton, Icono, Retrato, dinero, nombreBarrio, nombreCasilla, nombreDe, nombreFicha } from './comun.js';
import { PestanaMesa } from './mesa.js';
import { PestanaCalles } from './propiedades.js';
import { PanelSubasta } from './subasta.js';
import { PestanaTratos } from './tratos.js';
import { accionDeHabilidad, cartera, habilidadActiva, situacion, tratos } from './vista.js';

const PESTANAS = [
  ['calles', 'construir', 'botones/acciones'],
  ['bolsa', 'acciones', 'interfaz/iconos'],
  ['tratos', 'tratos', 'botones/acciones'],
  ['mesa', 'meta', 'interfaz/iconos'],
];

export function Partida({ d, motor, acciones }) {
  const { estado: s, vista, miId: id } = d.datos;
  const puede = vista.puede ?? {};
  const [pestana, setPestana] = useState('calles');
  const c = { motor, s, id, puede, enviar: acciones.enviar, ocupado: d.pendiente };
  const recibidos = tratos(s, id, puede).filter(tr => tr.recibido).length;
  const contenido = { calles: PestanaCalles, bolsa: PestanaBolsa, tratos: PestanaTratos, mesa: PestanaMesa }[pestana];
  return html`<div class="partida" style=${{ '--color': motor.ctx.fichas[s.jugadores[id].ficha].color }}>
    <${Cabecera} c=${c} />
    <${Situacion} c=${c} />
    <main class="contenido" aria-live="polite">
      ${s.subasta ? html`<${PanelSubasta} c=${c} />` : html`<${contenido} c=${c} />`}
    </main>
    ${s.subasta ? null : html`<${Dock} c=${c} />`}
    ${s.subasta ? null : html`<nav class="pestanas">
      ${PESTANAS.map(([clave, icono, grupo]) => html`<button type="button" key=${clave} class=${pestana === clave ? 'activa' : ''} aria-current=${pestana === clave ? 'page' : null} onClick=${() => setPestana(clave)}>
        <${Icono} nombre=${icono} grupo=${grupo} /><span>${t(`jugador.pestana.${clave}`)}</span>
        ${clave === 'tratos' && recibidos ? html`<b class="globo">${recibidos}</b>` : null}
      </button>`)}
    </nav>`}
  </div>`;
}

// Mi ficha, mi dinero y mi patrimonio con lo que falta para la meta.
function Cabecera({ c }) {
  const { s, id, motor } = c;
  const yo = s.jugadores[id];
  const cartera_ = cartera(motor, s, id);
  const estados = [yo.calabozo && 'retenido', yo.marcado && 'marcado', yo.pierdeTurno && 'pierde-turno'].filter(Boolean);
  return html`<header class="cabecera">
    <${Retrato} ficha=${yo.ficha} color=${motor.ctx.fichas[yo.ficha].color} />
    <div class="quien">
      <b class="nombre">${yo.nombre}</b>
      <small>${nombreFicha(yo.ficha)} · ${t('jugador.estas_en', { casilla: nombreCasilla(yo.casilla) })}</small>
      ${estados.length ? html`<small class="estados">${estados.map(e => t(`estado.${e}`)).join(' · ')}</small>` : null}
    </div>
    <div class="caja-dinero">
      <b class="dinero-grande">${dinero(cartera_.dinero)}</b>
      <small>${t('jugador.patrimonio', { cantidad: cartera_.patrimonio })}</small>
    </div>
    ${cartera_.avance !== null ? html`<div class="avance">
      <${Barra} valor=${cartera_.avance} etiqueta=${t('panel.avance')} />
      <small>${t('jugador.meta', { porcentaje: Math.round(cartera_.avance * 100), meta: cartera_.meta })}</small>
    </div>` : null}
  </header>`;
}

// Una línea que dice qué está pasando.
function Situacion({ c }) {
  const { s, id } = c;
  const sit = situacion(s, id);
  let texto;
  switch (sit.tipo) {
    case 'subasta': texto = t('jugador.situacion.subasta'); break;
    case 'deuda-mia':
      texto = sit.deuda.acreedor === 'banco'
        ? t('jugador.situacion.deuda_banco', { cantidad: sit.deuda.cantidad })
        : t('jugador.situacion.deuda_mia', { cantidad: sit.deuda.cantidad, acreedor: nombreDe(s, sit.deuda.acreedor) });
      break;
    case 'deuda-ajena': texto = t('jugador.situacion.deuda_ajena', { jugador: nombreDe(s, sit.quien) }); break;
    case 'mi-turno':
      texto = sit.compra != null ? t('jugador.situacion.mi_compra', { casilla: nombreCasilla(sit.compra) })
        : sit.fase === 'inicio' ? t('jugador.situacion.mi_tirada')
          : t('jugador.situacion.mi_gestion');
      break;
    case 'turno-ajeno':
      texto = sit.compra != null ? t('jugador.situacion.ajena_compra', { jugador: nombreDe(s, sit.quien), casilla: nombreCasilla(sit.compra) })
        : t('jugador.situacion.turno_de', { jugador: nombreDe(s, sit.quien) });
      break;
    default: texto = '';
  }
  const dados = sit.tipo === 'mi-turno' || sit.tipo === 'turno-ajeno' ? s.turno?.dados : null;
  return html`<div class=${`situacion sit-${sit.tipo}`}>
    <span>${texto}</span>
    ${dados ? html`<span class="dados-ultimos">${dados.join(' + ')} = ${dados.reduce((x, y) => x + y, 0)}</span>` : null}
  </div>`;
}

// Los botones de lo que puedo hacer ahora mismo, abajo del todo.
function Dock({ c }) {
  const { s, id, puede, motor, ocupado, enviar } = c;
  const yo = s.jugadores[id];
  const [rindiendo, setRindiendo] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const hab = habilidadActiva(puede);
  const enfriamiento = motor.ficha(s, id)?.activa ? yo.hab.enfriamiento : 0;

  if (yo.quebrado) return html`<footer class="dock"><p class="nota">${t('jugador.dock.quebrado')}</p></footer>`;

  const filas = [];
  // Decidir la compra de la calle donde se cayó.
  if (puede.noComprar) {
    const i = s.turno.compra;
    filas.push(html`<div class="compra" key="compra">
      <p class="que-compras"><b>${nombreCasilla(i)}</b> <small>${t('jugador.dock.cuesta', { cantidad: motor.ctx.casillas[i].precio })}</small></p>
      <div class="botones">
        ${puede.comprar !== undefined
          ? html`<${Boton} icono="comprar" tipo="principal" texto=${t('jugador.dock.comprar')} detalle=${dinero(puede.comprar)} desactivado=${ocupado} onClick=${() => enviar({ type: 'comprar' })} />`
          : html`<p class="nota">${t('jugador.dock.no_alcanza')}</p>`}
        <${Boton} icono=${s.opciones.subastas ? 'subastar' : 'pasar'} texto=${s.opciones.subastas ? t('jugador.dock.subastar') : t('jugador.dock.no_comprar')} desactivado=${ocupado} onClick=${() => enviar({ type: 'noComprar' })} />
      </div>
    </div>`);
  }
  // Tirar los dados (y, si estoy en el Calabozo, las maneras de salir).
  if (puede.tirar) {
    filas.push(html`<div class="botones" key="tirar">
      <${Boton} icono="tirar-dados" tipo="principal" texto=${t(yo.calabozo ? 'jugador.dock.tirar_calabozo' : 'jugador.dock.tirar')} desactivado=${ocupado} onClick=${() => enviar({ type: 'tirar' })} />
    </div>`);
  }
  if (puede.pagarFianza || puede.usarSalvoconducto) {
    filas.push(html`<div class="botones" key="calabozo">
      ${puede.pagarFianza ? html`<${Boton} icono="pagar-fianza" texto=${t('jugador.dock.fianza')} detalle=${dinero(puede.pagarFianza)} desactivado=${ocupado} onClick=${() => enviar({ type: 'pagarFianza' })} />` : null}
      ${puede.usarSalvoconducto ? html`<${Boton} icono="salvoconducto" texto=${t('jugador.dock.salvoconducto')} desactivado=${ocupado} onClick=${() => enviar({ type: 'usarSalvoconducto' })} />` : null}
    </div>`);
  }
  if (puede.terminarTurno) {
    filas.push(html`<div class="botones" key="terminar">
      <${Boton} icono="terminar-turno" tipo="principal" texto=${t('jugador.dock.terminar')} desactivado=${ocupado} onClick=${() => enviar({ type: 'terminarTurno' })} />
    </div>`);
  }
  // La habilidad de la ficha.
  if (hab) {
    const usar = valor => { setEligiendo(false); enviar(accionDeHabilidad(hab, valor)); };
    filas.push(html`<div class="habilidad" key="habilidad">
      ${eligiendo ? html`<${EleccionDeHabilidad} c=${c} hab=${hab} usar=${usar} cerrar=${() => setEligiendo(false)} />`
        : html`<${Boton} icono="usar-habilidad" texto=${t(`habilidad.${hab.id}`)} desactivado=${ocupado} onClick=${() => (hab.eleccion ? setEligiendo(true) : usar())} />`}
    </div>`);
  } else if (s.opciones.habilidades && enfriamiento > 0) {
    filas.push(html`<p class="nota" key="enfriando"><${Icono} nombre="usar-habilidad" /> ${t(`habilidad.${motor.ficha(s, id).activa.id}`)}: ${tn('habilidad.turnos', enfriamiento)}</p>`);
  }
  // Una deuda que no puedo pagar: la bancarrota.
  if (puede.declararBancarrota) {
    filas.push(html`<div class="botones" key="bancarrota">
      ${rindiendo
        ? html`<${Boton} icono="bancarrota" tipo="peligro" texto=${t('jugador.dock.seguro')} desactivado=${ocupado} onClick=${() => { setRindiendo(false); enviar({ type: 'declararBancarrota' }); }} />
          <${Boton} icono="volver" texto=${t('jugador.dock.cancelar')} onClick=${() => setRindiendo(false)} />`
        : html`<${Boton} icono="bancarrota" tipo="suave" texto=${t('jugador.dock.bancarrota')} onClick=${() => setRindiendo(true)} />`}
    </div>`);
  }
  if (!filas.length) {
    filas.push(html`<p class="nota espera" key="espera">${ocupado ? t('jugador.dock.esperando_tablero') : t('jugador.dock.espera', { jugador: nombreDe(s, s.turno?.id) })}</p>`);
  } else if (ocupado) {
    filas.push(html`<p class="nota espera" key="ocupado">${t('jugador.dock.esperando_tablero')}</p>`);
  }
  return html`<footer class="dock">${filas}</footer>`;
}

// Lo que hay que elegir antes de usar la habilidad: un barrio, una calle, un rival o una cantidad.
function EleccionDeHabilidad({ c, hab, usar, cerrar }) {
  const { s, motor } = c;
  const [cantidad, setCantidad] = useState(10);
  const opcion = (clave, texto, valor, color) => html`<button type="button" key=${clave} class="chip" style=${{ '--color': color ?? 'var(--piedra)' }} disabled=${c.ocupado} onClick=${() => usar(valor)}>${texto}</button>`;
  const colorDe = i => (motor.ctx.casillas[i].tipo === 'calle' ? motor.ctx.barrios[motor.ctx.casillas[i].barrio].color : null);
  const activa = motor.ficha(s, c.id).activa;
  return html`<div class="eleccion">
    <h4>${t(`habilidad.${hab.id}`)}</h4>
    <p class="nota">${t(`habilidad.${hab.id}.texto`, activa)}</p>
    <div class="opciones-habilidad">
      ${hab.eleccion === 'barrio' ? hab.barrios.map(b => opcion(b, nombreBarrio(b), b, motor.ctx.barrios[b].color)) : null}
      ${hab.eleccion === 'casilla' ? hab.casillas.map(i => opcion(i, nombreCasilla(i), i, colorDe(i))) : null}
      ${hab.eleccion === 'objetivo' ? hab.objetivos.map(k => opcion(k, nombreDe(s, k), k, motor.ctx.fichas[s.jugadores[k].ficha].color)) : null}
      ${hab.eleccion === 'cantidad' ? html`<div class="contador">
        <button type="button" aria-label="−" disabled=${cantidad <= 10} onClick=${() => setCantidad(Math.max(10, cantidad - 10))}>−</button>
        <b>${dinero(cantidad)}</b>
        <button type="button" aria-label="+" disabled=${cantidad >= hab.maximo} onClick=${() => setCantidad(Math.min(hab.maximo, cantidad + 10))}>+</button>
        <${Boton} icono="usar-habilidad" tipo="principal" texto=${t('jugador.dock.pedir')} desactivado=${c.ocupado} onClick=${() => usar(cantidad)} />
      </div>` : null}
    </div>
    <${Boton} icono="volver" texto=${t('jugador.dock.cancelar')} onClick=${cerrar} />
  </div>`;
}
