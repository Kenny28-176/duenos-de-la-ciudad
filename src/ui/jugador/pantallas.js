// Las pantallas del celular que no son la partida: pedir el código y el nombre, conectar, el vestíbulo donde se elige la ficha
// y el final. La partida está en partida.js. Todos los textos salen de los diccionarios (jugador.*).
import { MAX_JUGADORES } from '../../engine/contexto.js';
import { t } from '../../i18n/idioma.js';
import { CODIGO, limpiarCodigo } from '../../net/protocolo.js';
import { html, useEffect, useState } from '../preact.js';
import { usarAlmacen } from '../usarAlmacen.js';
import { Boton, Retrato, dinero, nombreDe, nombreFicha } from './comun.js';
import { Partida } from './partida.js';
import { clasificacion, pantallaActual } from './vista.js';

export function Aplicacion({ almacen, acciones, motor }) {
  const d = usarAlmacen(almacen);
  const pantalla = pantallaActual(d);
  let contenido;
  switch (pantalla) {
    case 'codigo': contenido = html`<${PideCodigo} d=${d} acciones=${acciones} />`; break;
    case 'conectando': contenido = html`<${Conectando} />`; break;
    case 'sin-red': contenido = html`<${Aparte} titulo=${t('jugador.sin_red')} />`; break;
    case 'sin-sala': contenido = html`<${Aparte} titulo=${t('jugador.sin_sala', { codigo: d.codigo })} acciones=${acciones} />`; break;
    case 'cerrada': contenido = html`<${Aparte} titulo=${t('jugador.cerrada')} acciones=${acciones} />`; break;
    case 'empezada': contenido = html`<${Aparte} titulo=${t('jugador.empezada')} acciones=${acciones} />`; break;
    case 'nombre': contenido = html`<${PideNombre} d=${d} acciones=${acciones} />`; break;
    case 'vestibulo': contenido = html`<${Vestibulo} d=${d} motor=${motor} acciones=${acciones} />`; break;
    case 'final': contenido = html`<${Final} d=${d} motor=${motor} acciones=${acciones} />`; break;
    default: contenido = html`<${Partida} d=${d} motor=${motor} acciones=${acciones} />`;
  }
  return html`<div class="app" data-pantalla=${pantalla}>
    ${contenido}
    ${d.aviso ? html`<div class="aviso" role="alert" key=${d.aviso.n} onClick=${acciones.cerrarAviso}>${d.aviso.texto}</div>` : null}
  </div>`;
}

const Marca = () => html`<h1 class="marca-juego">${t('tablero.nombre')}</h1>`;

// --- Entrar ---------------------------------------------------------------------------------------------------------------

function PideCodigo({ d, acciones }) {
  const [codigo, setCodigo] = useState('');
  const valido = CODIGO.test(codigo);
  return html`<main class="entrada">
    <${Marca} />
    <form onSubmit=${e => { e.preventDefault(); if (valido) acciones.entrarEnSala(codigo); }}>
      <label>
        <span>${t('jugador.codigo')}</span>
        <input class="campo-codigo" value=${codigo} maxlength="4" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false"
          inputmode="text" placeholder="ABCD" onInput=${e => setCodigo(limpiarCodigo(e.target.value))} />
      </label>
      <p class="ayuda">${t('jugador.codigo_ayuda')}</p>
      <${Boton} tipo="principal" texto=${t('jugador.continuar')} desactivado=${!valido} onClick=${() => valido && acciones.entrarEnSala(codigo)} />
    </form>
  </main>`;
}

function PideNombre({ d, acciones }) {
  const [nombre, setNombre] = useState(d.nombre ?? '');
  const limpio = nombre.trim();
  const entrar = () => { if (limpio && !d.pendiente) acciones.unirse(limpio); };
  return html`<main class="entrada">
    <${Marca} />
    <p class="sala-codigo"><span class="etiqueta">${t('sala.codigo')}</span> <b class="codigo">${d.codigo}</b></p>
    <form onSubmit=${e => { e.preventDefault(); entrar(); }}>
      <label>
        <span>${t('jugador.nombre')}</span>
        <input class="campo-nombre" value=${nombre} maxlength="24" autocomplete="nickname" placeholder=${t('jugador.nombre_ejemplo')} onInput=${e => setNombre(e.target.value)} />
      </label>
      <${Boton} tipo="principal" texto=${t('jugador.entrar')} desactivado=${!limpio || d.pendiente} onClick=${entrar} />
      <${Boton} icono="volver" texto=${t('jugador.otra_sala')} onClick=${acciones.otraSala} />
    </form>
  </main>`;
}

function Conectando() {
  const [lento, setLento] = useState(false);
  useEffect(() => {
    const reloj = setTimeout(() => setLento(true), 8000);
    return () => clearTimeout(reloj);
  }, []);
  return html`<main class="entrada centrado">
    <${Marca} />
    <div class="girando" aria-hidden="true"></div>
    <p>${t('jugador.conectando')}</p>
    ${lento ? html`<p class="ayuda">${t('jugador.conectando_lento')}</p>` : null}
  </main>`;
}

// Una pantalla con un mensaje y, si se puede, la manera de volver a empezar.
function Aparte({ titulo, acciones }) {
  return html`<main class="entrada centrado">
    <${Marca} />
    <p class="mensaje">${titulo}</p>
    ${acciones ? html`<${Boton} tipo="principal" texto=${t('jugador.otra_sala')} onClick=${acciones.otraSala} />` : null}
  </main>`;
}

// --- El vestíbulo: elegir ficha -------------------------------------------------------------------------------------------

function Vestibulo({ d, motor, acciones }) {
  const { estado: s, miId: id } = d.datos;
  const fichas = Object.keys(motor.ctx.fichas);
  const duenoDe = f => s.ids.find(k => s.jugadores[k].ficha === f);
  const mia = s.jugadores[id].ficha;
  return html`<main class="vestibulo-celular">
    <header class="encabezado-sala"><span class="etiqueta">${t('sala.codigo')}</span><b class="codigo">${d.codigo}</b></header>
    <h2>${t('jugador.elige_ficha')}</h2>
    <div class="fichas-elegir">${fichas.map(f => {
      const dueno = duenoDe(f);
      const mio = dueno === id;
      return html`<button type="button" key=${f} class=${`ficha-elegir ${mio ? 'elegida' : ''}`} style=${{ '--color': motor.ctx.fichas[f].color }}
        disabled=${(Boolean(dueno) && !mio) || d.pendiente} aria-pressed=${mio} onClick=${() => !mio && acciones.enviar({ type: 'elegirFicha', ficha: f })}>
        <${Retrato} ficha=${f} color=${motor.ctx.fichas[f].color} />
        <span class="nombre">${nombreFicha(f)}</span>
        ${dueno && !mio ? html`<small>${t('jugador.ocupada', { jugador: nombreDe(s, dueno) })}</small>` : null}
      </button>`;
    })}</div>
    ${mia ? html`<${DetalleDeFicha} ficha=${mia} s=${s} motor=${motor} />` : html`<p class="nota">${t('jugador.ficha_al_azar')}</p>`}
    <h3>${t('sala.jugadores', { n: s.ids.length, max: MAX_JUGADORES })}</h3>
    <ul class="lista-jugadores">${s.ids.map(k => html`<li key=${k} style=${{ '--color': s.jugadores[k].ficha ? motor.ctx.fichas[s.jugadores[k].ficha].color : 'var(--piedra)' }}>
      <${Retrato} ficha=${s.jugadores[k].ficha} color=${s.jugadores[k].ficha ? motor.ctx.fichas[s.jugadores[k].ficha].color : null} pieza />
      <span class="nombre">${nombreDe(s, k)}${k === id ? html` <small class="tu">${t('jugador.tu')}</small>` : ''}</span>
      ${s.jugadores[k].bot ? html`<small class="etiqueta-bot">${t('sala.bot')}</small>` : null}
    </li>`)}</ul>
    <p class="nota espera">${t('jugador.esperando_inicio')}</p>
    <${Boton} icono="volver" texto=${t('jugador.salir')} onClick=${acciones.salir} />
  </main>`;
}

// Qué es la ficha que he elegido: su metáfora y los nombres de sus dos habilidades (si se juega con ellas).
function DetalleDeFicha({ ficha, s, motor }) {
  const f = motor.ctx.fichas[ficha];
  return html`<section class="detalle-ficha" style=${{ '--color': f.color }}>
    <p class="metafora">${t(`ficha.${ficha}.metafora`)}</p>
    ${s.opciones.habilidades ? html`<p class="habilidades-ficha">
      <span><b>${t('jugador.pasiva')}</b> ${t(`habilidad.${f.pasiva.id}`)}</span>
      <span><b>${t('jugador.activa')}</b> ${t(`habilidad.${f.activa.id}`)}</span>
    </p>` : null}
  </section>`;
}

// --- El final -----------------------------------------------------------------------------------------------------------

function Final({ d, motor, acciones }) {
  const { estado: s, miId: id } = d.datos;
  const filas = clasificacion(motor, s, { nombreDeFicha: nombreFicha });
  const ganador = filas.find(f => f.ganador);
  return html`<main class="final">
    <p class="etiqueta">${t(`fin.${s.motivoFin}`)}</p>
    <h1>${ganador?.id === id ? t('jugador.final.ganaste') : t('fin.titulo', { jugador: ganador?.nombre ?? '' })}</h1>
    <ol class="mesa">${filas.map((f, k) => html`<li key=${f.id} class=${`fila-mesa ${f.id === id ? 'yo' : ''} ${f.ganador ? 'turno' : ''} ${f.quebrado ? 'quebrado' : ''}`.trim()} style=${{ '--color': f.color }}>
      <span class="puesto">${f.quebrado ? '·' : k + 1}</span>
      <${Retrato} ficha=${f.ficha} color=${f.color} pieza />
      <div class="info"><b class="nombre">${f.nombre}${f.id === id ? html` <small class="tu">${t('jugador.tu')}</small>` : null}</b>
        <small>${f.quebrado ? t('jugador.mesa.quebrado') : t('jugador.mesa.patrimonio', { cantidad: f.patrimonio })}</small></div>
      <span class="dinero">${f.quebrado ? '' : dinero(f.dinero)}</span>
    </li>`)}</ol>
    <p class="nota">${t('jugador.final.otra_vez')}</p>
    <${Boton} tipo="principal" texto=${t('jugador.final.salir')} onClick=${acciones.salir} />
  </main>`;
}
