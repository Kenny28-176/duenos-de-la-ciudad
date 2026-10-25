// Arranque de la pantalla del tablero (public/tablero.html). Tiene tres modos:
//   demo      una partida de demostración entre bots (lo que se ve al abrir la página);
//   sala      el vestíbulo de una partida con celulares: el código, el QR y los jugadores que van entrando;
//   partida   la partida de verdad: el tablero recibe las acciones de los celulares, las pasa por el motor, las anima y las publica.
// Se puede probar con parámetros en la dirección:
//   ?jugadores=4  ?semilla=7  ?velocidad=4  ?idioma=en  ?sala=1 (abre una sala al cargar)  ?depurar=1
import { cargarDatos } from '../../data/cargar.js';
import { MAX_JUGADORES } from '../../engine/contexto.js';
import { crearMotor } from '../../engine/index.js';
import { fichasParaPartida } from '../../engine/simulador.js';
import { alCambiarIdioma, diccionariosActivos, iniciarIdioma, t, usarIdioma } from '../../i18n/idioma.js';
import { crearAnfitrion } from '../../net/anfitrion.js';
import { conectar, identidad, redDisponible } from '../../net/conectar.js';
import { crearOrquesta } from '../../net/orquesta.js';
import { codigoDeSala } from '../../net/protocolo.js';
import { crearAlmacen } from '../almacen.js';
import { crearNarrador } from '../narrador.js';
import { html, render } from '../preact.js';
import { crearCapas } from './capas.js';
import { Pantalla } from './componentes.js';
import { crearDemo } from './demo.js';
import { dibujarTablero } from './dibujo.js';
import { geometriaTablero } from './geometria.js';
import { crearReproductor } from './reproductor.js';
import { nombreMostrado } from './vista.js';

const parametros = new URLSearchParams(location.search);
const numero = (nombre, porDefecto, min, max) => Math.min(max, Math.max(min, Number(parametros.get(nombre)) || porDefecto));

const motor = crearMotor(await cargarDatos());
const { idioma } = await iniciarIdioma(parametros.get('idioma') ? { idioma: parametros.get('idioma') } : {});
document.documentElement.lang = idioma;
document.title = t('tablero.titulo');

const geo = geometriaTablero();

// El tablero dibujado con los textos del idioma actual.
const dibujar = () => dibujarTablero(motor.ctx, geo, {
  texto: {
    nombre: c => t(c.precio ? `casilla.${c.i}.corta` : `casilla.${c.i}`),
    precio: c => (c.precio ? t('fmt.dinero', { cantidad: c.precio }) : ''),
  },
});

const estadoInicial = () => ({
  estado: null, dinero: {}, precios: {}, preciosPrevios: {}, registro: [], flotantes: [], turnoDe: null,
  dados: null, carta: null, cartaN: 0, subasta: null, aviso: null, fin: null, error: null,
  pausado: false, velocidad: numero('velocidad', 1, 1, 100), idioma, jugadores: numero('jugadores', 4, 2, 8),
  modo: 'demo', sala: null, red: null, delegados: [], publicadas: 0,
});
const almacen = crearAlmacen(estadoInicial());

let capas = null;
let reproductor = null;
let contenedor = null;
let sala = null; // la sala abierta: { transporte, anfitrion, codigo, cerrada, bots }

// El narrador del idioma actual, con los bots llamados por su ficha («Rata», «Toro»…).
function narradorActual() {
  const { dic, base, idioma: lang } = diccionariosActivos();
  return crearNarrador({ dic, base, idioma: lang, nombreJugador: (s, id) => nombreMostrado(s.jugadores[id], f => t(`ficha.${f}`)) });
}

// Dibuja el tablero (otra vez) y pone en él lo que dice el estado de la partida.
function montarTablero() {
  contenedor.innerHTML = dibujar();
  capas = crearCapas(contenedor.querySelector('svg'), motor, geo);
  const { estado } = almacen.leer();
  if (estado) capas.actualizar(estado);
}

const nuevoReproductor = (fuente, extra = {}) => crearReproductor({
  motor, demo: fuente, almacen, capas: () => capas, narrador: narradorActual, nombreBarrio: b => t(`barrio.${b}`), ...extra,
});

// --- Demostración ----------------------------------------------------------------------------------------------------

// Empieza una partida de demostración nueva con ese número de jugadores.
function nuevaPartida(jugadores, semilla = numero('semilla', Date.now() % 100000, 1, 4294967295)) {
  reproductor?.parar();
  const { velocidad, idioma: lang, red } = almacen.leer();
  const fichas = fichasParaPartida(motor, semilla, jugadores);
  const demo = crearDemo(motor, { semilla, fichas });
  const estado = demo.estado();
  // El dinero empieza en cero: sube al repartirse el inicial.
  almacen.cambiar({ ...estadoInicial(), velocidad, idioma: lang, jugadores, red, estado, dinero: Object.fromEntries(estado.orden.map(id => [id, 0])) });
  montarTablero();
  reproductor = nuevoReproductor(demo);
  reproductor.correr();
}

// --- Una partida con celulares ------------------------------------------------------------------------------------

// La dirección con la que entran los celulares: la de esta página, salvo que sea «localhost» (que desde un celular no
// llega a la laptop): en ese caso, la de la laptop en la wifi que dice el servidor.
function direccionParaCelulares(red) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!local) return { raiz: location.origin, sinRed: false, otras: [] };
  // Abierto por «localhost»: los celulares entran por la dirección de la laptop en la wifi; si no tiene, no podrán entrar. Si
  // hay más de una (cable y wifi a la vez), las demás se enseñan por si la primera no es la que usan los celulares.
  return red.direcciones.length
    ? { raiz: red.direcciones[0], sinRed: false, otras: red.direcciones.slice(1) }
    : { raiz: location.origin, sinRed: true, otras: [] };
}

async function abrirSala() {
  const { red } = almacen.leer();
  if (!red || sala) return;
  reproductor?.parar();
  try {
    const transporte = conectar(red.modo, identidad('tablero', 'duenos:uid-tablero'));
    let codigo = null;
    for (let intento = 0; intento < 30 && !codigo; intento++) {
      const candidato = codigoDeSala();
      if (!(await transporte.get(`salas/${candidato}/meta`))) codigo = candidato;
    }
    if (!codigo) throw new Error('no hay códigos libres');
    const anfitrion = crearAnfitrion({ transporte, motor, codigo });
    await anfitrion.abrir();
    sala = { transporte, anfitrion, codigo, cerrada: false, bots: 0, fichasPedidas: new Set(), delegados: new Set(), orquesta: null };
    const { raiz, sinRed, otras } = direccionParaCelulares(red);
    const ruta = new URL('jugador.html', location.href).pathname;
    const url = `${raiz}${ruta}?sala=${codigo}`;
    const { velocidad, idioma: lang } = almacen.leer();
    almacen.cambiar({
      ...estadoInicial(), velocidad, idioma: lang, red, modo: 'sala', estado: anfitrion.estado(),
      sala: { codigo, url, direccion: new URL(url).host + new URL(url).pathname, sinRed, otras: otras.map(o => new URL(o).host + ruta) },
    });
    montarTablero();
    atenderVestibulo(sala);
  } catch (error) {
    sala = null;
    almacen.cambiar({ error: t('sala.error', { motivo: error.message }) });
    nuevaPartida(almacen.leer().jugadores);
  }
}

// En el vestíbulo, el tablero atiende a los celulares que entran, eligen ficha o salen, y publica cada cambio.
async function atenderVestibulo(esta) {
  while (!esta.cerrada) {
    const paso = await esta.anfitrion.siguientePaso();
    if (!paso || esta.cerrada) return;
    if (paso.accion.type === 'empezar') {
      empezarPartida(esta, paso);
      return;
    }
    await esta.anfitrion.publicar();
    almacen.cambiar({ estado: esta.anfitrion.estado() });
  }
}

// Pasa del vestíbulo a la partida: el primer paso (el reparto del dinero inicial) se anima como los demás y, al acabar cada
// paso, se publica para que los celulares lo vean cuando termina la animación.
function empezarPartida(esta, primerPaso) {
  const orquesta = crearOrquesta({ anfitrion: esta.anfitrion, motor, velocidad: () => almacen.leer().velocidad, delegados: () => esta.delegados });
  esta.orquesta = orquesta;
  let primero = primerPaso;
  const fuente = {
    estado: () => esta.anfitrion.estado(),
    paso: async () => {
      if (primero) {
        const p = primero;
        primero = null;
        return p;
      }
      return orquesta.paso();
    },
  };
  const estado = esta.anfitrion.estado();
  const { velocidad, idioma: lang, red, sala: datosSala } = almacen.leer();
  almacen.cambiar({
    ...estadoInicial(), velocidad, idioma: lang, red, modo: 'partida', sala: datosSala, estado,
    dinero: Object.fromEntries(estado.orden.map(id => [id, 0])),
  });
  montarTablero();
  // Al publicar se cuenta una publicación más: la cuenta atrás de la subasta vuelve a empezar (la orquesta también cuenta desde ahí).
  const despuesDePaso = async () => {
    await esta.anfitrion.publicar();
    almacen.cambiar(d => ({ publicadas: d.publicadas + 1 }));
  };
  reproductor = nuevoReproductor(fuente, { despuesDePaso });
  reproductor.correr();
}

async function cerrarSala() {
  const esta = sala;
  if (!esta) return;
  sala = null;
  esta.cerrada = true;
  reproductor?.parar();
  try {
    await esta.anfitrion.cerrar();
  } finally {
    esta.transporte.cerrar?.();
  }
  nuevaPartida(almacen.leer().jugadores);
}

// Un bot para completar la mesa: elige una ficha libre al azar.
function anadirBot() {
  if (!sala || sala.cerrada) return;
  const s = sala.anfitrion.estado();
  // Se cuentan también los bots ya pedidos que el tablero todavía no ha procesado (si se pulsa varias veces seguidas).
  const ocupadas = id => s.ids.some(k => s.jugadores[k].ficha === id);
  const pendientes = [...sala.fichasPedidas].filter(f => !ocupadas(f));
  if (s.ids.length + pendientes.length >= MAX_JUGADORES) return;
  const libres = Object.keys(motor.ctx.fichas).filter(f => !ocupadas(f) && !sala.fichasPedidas.has(f));
  if (!libres.length) return;
  const ficha = libres[Math.floor(Math.random() * libres.length)];
  const n = ++sala.bots;
  sala.fichasPedidas.add(ficha);
  sala.anfitrion.accionPropia({ type: 'unirse', id: `b${n}`, nombre: `Bot ${n}`, ficha, bot: true });
}

// Pone (o quita) un bot que juegue por una persona que se ausentó o a la que se le cayó el celular. Es del tablero, no del celular:
// quien está en la mesa decide, y la partida no se queda parada esperando a alguien que no está.
function delegar(id) {
  if (!sala || sala.cerrada || !sala.orquesta) return;
  if (sala.delegados.has(id)) sala.delegados.delete(id);
  else sala.delegados.add(id);
  almacen.cambiar({ delegados: [...sala.delegados] });
  sala.orquesta.reprogramar();
}

function empezar(opciones) {
  if (!sala || sala.cerrada) return;
  sala.anfitrion.accionPropia({ type: 'configurar', opciones });
  sala.anfitrion.accionPropia({ type: 'empezar' });
}

// --- La pantalla -------------------------------------------------------------------------------------------------------

// Con ?depurar=1, la pantalla enseña su almacén en window.duenos (para probarla desde fuera, p. ej. tools/ver.js).
if (parametros.has('depurar')) window.duenos = { almacen, motor, t, sala: () => sala };

const acciones = {
  pausar: () => reproductor?.pausar(),
  velocidad: v => almacen.cambiar({ velocidad: v }),
  nueva: jugadores => nuevaPartida(jugadores, Date.now() % 100000),
  idioma: async lang => {
    await usarIdioma(lang);
    almacen.cambiar({ idioma: lang });
    montarTablero();
  },
  abrirSala, cerrarSala, anadirBot, empezar, delegar,
};

alCambiarIdioma(lang => {
  document.documentElement.lang = lang;
  document.title = t('tablero.titulo');
});

// ¿Se puede jugar con celulares desde esta página? Solo si el servidor de la laptop (tools/serve.js) está detrás.
almacen.cambiar({ red: await redDisponible() });

// El contenedor del tablero está vacío para Preact: el SVG lo pone esta función y lo mueve capas.js.
render(html`<${Pantalla} almacen=${almacen} motor=${motor} acciones=${acciones} alMontar=${el => {
  if (!el || contenedor === el) return;
  contenedor = el;
  nuevaPartida(almacen.leer().jugadores);
  if (parametros.has('sala')) abrirSala();
}} />`, document.getElementById('app'));
