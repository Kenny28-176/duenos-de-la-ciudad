// Los componentes de la pantalla del tablero, con Preact + htm. Pintan lo que hay en el almacén (almacen.js) y no
// tienen reglas: el motor decide, el reproductor anima y estos componentes solo muestran. Todos los textos salen de los
// diccionarios (t), nunca del código.
import { html, useEffect, useRef, useState } from '../preact.js';
import { t, tn } from '../../i18n/idioma.js';
import { usarAlmacen } from '../usarAlmacen.js';
import { filasBolsa, resumenJugadores } from './vista.js';

const BASE = 'visuales/';

// Una imagen que solo se ve cuando ha cargado (las que aún no existen no enseñan el icono de imagen rota).
function Imagen({ src, clase = '', alt = '' }) {
  const [lista, setLista] = useState(false);
  return html`<img class=${`${clase} ${lista ? 'cargada' : 'por-cargar'}`} src=${src} alt=${alt} onLoad=${() => setLista(true)} onError=${() => setLista(false)} />`;
}

const dinero = cantidad => t('fmt.dinero', { cantidad });
const dineroConSigno = delta => t(delta > 0 ? 'fmt.dinero.mas' : 'fmt.dinero.menos', { cantidad: Math.abs(delta) });

// Un número que sube o baja poco a poco hasta su nuevo valor.
function useNumeroAnimado(objetivo, ms) {
  const [mostrado, setMostrado] = useState(objetivo);
  const ahora = useRef(objetivo);
  useEffect(() => {
    const desde = ahora.current;
    if (desde === objetivo) return undefined;
    const inicio = performance.now();
    let cuadro = 0;
    const paso = marca => {
      const k = Math.min(1, (marca - inicio) / Math.max(1, ms));
      ahora.current = Math.round(desde + (objetivo - desde) * (1 - (1 - k) ** 3));
      setMostrado(ahora.current);
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo]);
  return mostrado;
}

// --- Los dados (cubos en 3D de hueso, con los puntos oscuros) -------------------------------------------------

const PUNTOS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
// Cómo hay que girar el cubo para que la cara de cada valor mire al frente (1 delante, 6 detrás, 3 a la derecha, 4 a la
// izquierda, 2 arriba y 5 abajo) y la vista de tres cuartos con que se ve siempre.
const ORIENTACION = { 1: 'rotateY(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(-90deg)', 4: 'rotateY(90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)' };
const VISTA = 'rotateX(-24deg) rotateY(-30deg)';

function Cara({ valor, clase }) {
  return html`<div class=${`cara ${clase}`}>${PUNTOS[valor].map(celda => html`<i class="punto" style=${{ gridArea: `${Math.ceil(celda / 3)} / ${((celda - 1) % 3) + 1}` }}></i>`)}</div>`;
}

function Dado({ valor, nombreRef }) {
  return html`<div class="dado"><div class="cubo" ref=${nombreRef} style=${{ transform: `${VISTA} ${ORIENTACION[valor]}` }}>
    <${Cara} valor=${1} clase="delante" /><${Cara} valor=${6} clase="detras" /><${Cara} valor=${3} clase="derecha" />
    <${Cara} valor=${4} clase="izquierda" /><${Cara} valor=${2} clase="arriba" /><${Cara} valor=${5} clase="abajo" />
  </div></div>`;
}

function Dados({ dados }) {
  const cubos = useRef([]);
  useEffect(() => {
    if (!dados) return;
    const duracion = 1050 / dados.velocidad;
    dados.valores.forEach((valor, k) => {
      const cubo = cubos.current[k];
      if (!cubo?.animate) return;
      const vueltas = 360 * (2 + k);
      cubo.animate([
        { transform: `${VISTA} rotateX(${-vueltas - 40}deg) rotateY(${vueltas + 70 * (k + 1)}deg) rotateZ(${90 * (k + 1)}deg)` },
        { transform: `${VISTA} ${ORIENTACION[valor]}` },
      ], { duration: duracion, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
      cubo.parentElement.animate([
        { transform: 'translateY(-1.6cqw) scale(1.25)' }, { transform: 'translateY(0.2cqw) scale(1)', offset: 0.7 }, { transform: 'translateY(0) scale(1)' },
      ], { duration: duracion, easing: 'ease-out' });
    });
  }, [dados?.n]);
  if (!dados) return null;
  return html`<div class="dados" data-jugador=${dados.id}>${dados.valores.map((valor, k) => html`<${Dado} key=${k} valor=${valor} nombreRef=${el => { cubos.current[k] = el; }} />`)}</div>`;
}

// --- Cartas, subastas, avisos y final --------------------------------------------------------------------------------

function Carta({ carta, n }) {
  if (!carta) return null;
  const mazo = t(`mazo.${carta.mazo}`);
  return html`<div class=${`carta carta-${carta.mazo}`} key=${n}>
    <div class="cara-carta dorso"><span>${mazo}</span></div>
    <div class="cara-carta frente">
      <header>${mazo}</header>
      <${Imagen} src=${`${BASE}tarjetas/efectos/${carta.imagen}.webp`} clase="efecto" key=${carta.imagen} />
      <p>${t(`carta.${carta.id}`, carta.datos)}</p>
    </div>
  </div>`;
}

function Subasta({ subasta, nombres }) {
  if (!subasta) return null;
  return html`<div class="subasta">
    <header>${t('subasta.titulo')}</header>
    <h3>${t(`casilla.${subasta.casilla}`)}</h3>
    <p class="puja">${subasta.puja ? dinero(subasta.puja) : t('subasta.sin_pujas')}</p>
    ${subasta.ganador ? html`<p class="lider ganador">${t('subasta.gana', { jugador: nombres[subasta.ganador] })}</p>`
      : subasta.desierta ? html`<p class="lider">${t('subasta.desierta')}</p>`
        : subasta.lider ? html`<p class="lider">${t('subasta.lidera', { jugador: nombres[subasta.lider] })}</p>` : null}
    <ol>${subasta.pujas.map(p => html`<li>${nombres[p.id]} · ${dinero(p.cantidad)}</li>`)}</ol>
  </div>`;
}

function Aviso({ aviso }) {
  if (!aviso) return null;
  return html`<div class=${`aviso aviso-${aviso.tipo}`} key=${aviso.clave}>${aviso.texto}</div>`;
}

function Final({ fin, filas, alNueva }) {
  if (!fin) return null;
  const ganador = filas.find(f => f.id === fin.ganador);
  return html`<div class="final">
    <p class="etiqueta">${t(`fin.${fin.motivo}`)}</p>
    <h2>${t('fin.titulo', { jugador: ganador?.nombre ?? '' })}</h2>
    <ol>${[...filas].sort((a, b) => b.patrimonio - a.patrimonio).map(f => html`<li><span>${f.nombre}</span><b>${dinero(f.patrimonio)}</b></li>`)}</ol>
    <button class="boton" onClick=${alNueva}>${t('controles.nueva')}</button>
  </div>`;
}

// --- El panel de la derecha -------------------------------------------------------------------------------------------

function TarjetaJugador({ j, flotantes, velocidad }) {
  const cifra = useNumeroAnimado(j.dinero, 500 / velocidad);
  return html`<li class=${`jugador ${j.turno ? 'turno' : ''} ${j.quebrado ? 'quebrado' : ''}`} style=${{ '--color': j.color }}>
    <span class="ficha-mini"><${Imagen} src=${`${BASE}fichas/piezas/${j.ficha}.webp`} /></span>
    <span class="datos">
      <span class="nombre">${j.nombre}</span>
      <span class="estados">
        ${j.estados.map(e => html`<${Imagen} src=${`${BASE}tablero/marcadores/${e}.svg`} clase="estado" alt=${t(`estado.${e}`)} key=${e} />`)}
        ${j.activa ? html`<span class=${`habilidad ${j.activa.lista ? 'lista' : 'enfriando'}`} title=${t(`habilidad.${j.activa.id}`)}>
          <${Imagen} src=${`${BASE}botones/habilidades/activas/${j.activa.id}.webp`} clase="insignia" />
          <span class="nombre-habilidad">${t(`habilidad.${j.activa.id}`)}</span>
          <span class="turnos">${j.activa.lista ? '' : tn('habilidad.turnos', j.activa.enfriamiento)}</span></span>` : null}
      </span>
    </span>
    <span class="dinero"><b class="cifra">${dinero(cifra)}</b><span class="patrimonio">${t('panel.patrimonio')} ${dinero(j.patrimonio)}</span></span>
    ${j.avance === null ? null : html`<span class="barra" title=${t('panel.avance')}><i style=${{ width: `${Math.round(j.avance * 100)}%` }}></i></span>`}
    ${flotantes.map(f => html`<span class=${`flotante ${f.delta > 0 ? 'sube' : 'baja'}`} key=${f.clave}>${dineroConSigno(f.delta)}</span>`)}
  </li>`;
}

function Bolsa({ filas }) {
  if (!filas.length) return null;
  return html`<section class="bolsa"><h3>${t('bolsa.titulo')}</h3>
    <ul>${filas.map(f => html`<li class=${f.rally ? 'rally' : ''} style=${{ '--color': f.color }}>
      <${Imagen} src=${`${BASE}${f.imagen}`} clase="barrio" />
      <span class="nombre">${t(`barrio.${f.barrio}`)}</span>
      <b class=${`precio ${f.tendencia ?? ''}`}>${dinero(f.precio)}<small>${f.tendencia === 'sube' ? '▲' : f.tendencia === 'baja' ? '▼' : ''}</small></b>
    </li>`)}</ul></section>`;
}

function Registro({ lineas }) {
  return html`<section class="registro"><h3>${t('registro.titulo')}</h3>
    <ol>${lineas.slice(-12).map(l => html`<li key=${l.n}>${l.texto}${l.veces > 1 ? html` <b class="veces">×${l.veces}</b>` : ''}</li>`)}</ol></section>`;
}

const VELOCIDADES = [1, 2, 4, 8];

function Controles({ d, acciones }) {
  const [jugadores, setJugadores] = useState(d.jugadores);
  return html`<section class="controles">
    <button class="boton" onClick=${acciones.pausar}>${d.pausado ? t('controles.seguir') : t('controles.pausa')}</button>
    <span class="velocidad" role="group" aria-label=${t('controles.velocidad')}>
      ${VELOCIDADES.map(v => html`<button class=${`boton chico ${d.velocidad === v ? 'activo' : ''}`} onClick=${() => acciones.velocidad(v)}>×${v}</button>`)}
    </span>
    <label class="nueva">${t('controles.jugadores')}
      <select value=${jugadores} onChange=${e => setJugadores(Number(e.target.value))}>${[2, 3, 4, 5, 6, 7, 8].map(n => html`<option value=${n}>${n}</option>`)}</select>
    </label>
    <button class="boton" onClick=${() => acciones.nueva(jugadores)}>${t('controles.nueva')}</button>
    <span class="idioma" role="group">${['es', 'en'].map(l => html`<button class=${`boton chico ${d.idioma === l ? 'activo' : ''}`} onClick=${() => acciones.idioma(l)}>${l.toUpperCase()}</button>`)}</span>
  </section>`;
}

// --- La pantalla entera ---------------------------------------------------------------------------------------------------

export function Pantalla({ almacen, motor, alMontar, acciones }) {
  const d = usarAlmacen(almacen);
  const nombreDeFicha = f => t(`ficha.${f}`);
  const filas = d.estado ? resumenJugadores(motor, d.estado, { dinero: d.dinero, nombreDeFicha }) : [];
  const nombres = Object.fromEntries(filas.map(f => [f.id, f.nombre]));
  const bolsa = d.estado ? filasBolsa(motor, d.estado, d.preciosPrevios) : [];
  return html`<div class="pantalla" data-jugadores=${filas.length}>
    <section class="zona-tablero">
      <div class="caja-tablero">
        <div class="montaje" ref=${alMontar}></div>
        <${Dados} dados=${d.dados} />
        <${Carta} carta=${d.carta} n=${d.cartaN} />
        <${Subasta} subasta=${d.subasta} nombres=${nombres} />
        <${Aviso} aviso=${d.aviso} />
        <${Final} fin=${d.fin} filas=${filas} alNueva=${() => acciones.nueva(d.jugadores)} />
      </div>
    </section>
    <aside class="panel">
      <header class="cabecera">
        <h1>${t('tablero.nombre')}</h1>
        <p>${d.estado ? t('tablero.ronda', { ronda: d.estado.ronda }) : ''}${d.estado?.opciones.meta ? ` · ${t('tablero.meta', { meta: d.estado.opciones.meta })}` : ''}</p>
        <span class="demo">${t('tablero.demo')}</span>
      </header>
      <ul class="jugadores">${filas.map(j => html`<${TarjetaJugador} key=${j.id} j=${j} velocidad=${d.velocidad} flotantes=${d.flotantes.filter(f => f.id === j.id)} />`)}</ul>
      <${Bolsa} filas=${bolsa} />
      <${Registro} lineas=${d.registro} />
      <${Controles} d=${d} acciones=${acciones} />
    </aside>
  </div>`;
}
