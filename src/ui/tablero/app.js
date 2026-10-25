// Arranque de la pantalla del tablero (public/tablero.html). Por ahora muestra una partida de demostración entre bots;
// más adelante, la partida de verdad con los celulares. Se puede probar con parámetros en la dirección:
//   ?jugadores=4  ?semilla=7  ?velocidad=4  ?idioma=en
import { cargarDatos } from '../../data/cargar.js';
import { crearMotor } from '../../engine/index.js';
import { fichasParaPartida } from '../../engine/simulador.js';
import { alCambiarIdioma, diccionariosActivos, iniciarIdioma, t, usarIdioma } from '../../i18n/idioma.js';
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
  pausado: false, velocidad: numero('velocidad', 1, 1, 16), idioma, jugadores: numero('jugadores', 4, 2, 8),
});
const almacen = crearAlmacen(estadoInicial());

let capas = null;
let reproductor = null;
let contenedor = null;

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

// Empieza una partida de demostración nueva con ese número de jugadores.
function nuevaPartida(jugadores, semilla = numero('semilla', Date.now() % 100000, 1, 4294967295)) {
  reproductor?.parar();
  const { velocidad, idioma: lang } = almacen.leer();
  const fichas = fichasParaPartida(motor, semilla, jugadores);
  const demo = crearDemo(motor, { semilla, fichas });
  const estado = demo.estado();
  // El dinero empieza en cero: sube al repartirse el inicial.
  almacen.cambiar({ ...estadoInicial(), velocidad, idioma: lang, jugadores, estado, dinero: Object.fromEntries(estado.orden.map(id => [id, 0])) });
  montarTablero();
  reproductor = crearReproductor({ motor, demo, almacen, capas: () => capas, narrador: narradorActual, nombreBarrio: b => t(`barrio.${b}`) });
  reproductor.correr();
}

// Con ?depurar=1, la pantalla enseña su almacén en window.duenos (para probarla desde fuera, p. ej. tools/ver.js).
if (parametros.has('depurar')) window.duenos = { almacen, motor, t };

const acciones = {
  pausar: () => reproductor?.pausar(),
  velocidad: v => almacen.cambiar({ velocidad: v }),
  nueva: jugadores => nuevaPartida(jugadores, Date.now() % 100000),
  idioma: async lang => {
    await usarIdioma(lang);
    almacen.cambiar({ idioma: lang });
    montarTablero();
  },
};

alCambiarIdioma(lang => {
  document.documentElement.lang = lang;
  document.title = t('tablero.titulo');
});

// El contenedor del tablero está vacío para Preact: el SVG lo pone esta función y lo mueve capas.js.
render(html`<${Pantalla} almacen=${almacen} motor=${motor} acciones=${acciones} alMontar=${el => {
  if (!el || contenedor === el) return;
  contenedor = el;
  nuevaPartida(almacen.leer().jugadores);
}} />`, document.getElementById('app'));
