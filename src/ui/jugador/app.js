// Arranque de la pantalla del celular (public/jugador.html): un jugador de una partida con tablero. Entra con el código de la
// sala (en la dirección: ?sala=ABCD), escribe su nombre, elige ficha y juega con los botones que le da el tablero. El celular no
// calcula nada: pide acciones y enseña lo que publica el tablero (src/net/cliente.js).
//   ?sala=ABCD  ?idioma=en  ?depurar=1
import { cargarDatos } from '../../data/cargar.js';
import { crearMotor } from '../../engine/index.js';
import { diccionariosActivos, iniciarIdioma, t } from '../../i18n/idioma.js';
import { crearCliente } from '../../net/cliente.js';
import { conectar, identidad, redDisponible } from '../../net/conectar.js';
import { CODIGO, limpiarCodigo } from '../../net/protocolo.js';
import { crearAlmacen } from '../almacen.js';
import { textoDeError } from '../errores.js';
import { html, render } from '../preact.js';
import { Aplicacion } from './pantallas.js';

const parametros = new URLSearchParams(location.search);
const motor = crearMotor(await cargarDatos());
const { idioma } = await iniciarIdioma(parametros.get('idioma') ? { idioma: parametros.get('idioma') } : {});
document.documentElement.lang = idioma;
document.title = t('jugador.titulo');

// Lo que se recuerda en este celular (el nombre): si el navegador no deja guardarlo, no pasa nada.
const memoria = {
  leer(clave) { try { return localStorage.getItem(clave); } catch { return null; } },
  guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } },
};

const SEGUNDOS_SIN_RESPUESTA = 20; // si el tablero no contesta en este tiempo, se vuelven a activar los botones
const SEGUNDOS_DE_AVISO = 6;

const codigoDeLaDireccion = limpiarCodigo(parametros.get('sala'));
const almacen = crearAlmacen({
  codigo: CODIGO.test(codigoDeLaDireccion) ? codigoDeLaDireccion : '',
  nombre: memoria.leer('duenos:nombre') ?? '',
  datos: null, cerrada: false, sinRed: false, pendiente: false, aviso: null,
});

let transporte = null;
let cliente = null;
let vistaVista = false; // ya llegó la vista de este celular (para no enseñar un error viejo al entrar)
let ultimoError = 0; // el número del último error que ya se enseñó
let salaVista = false; // la sala existió: si deja de existir, es que el tablero la cerró
let enviada = { n: 0, error: 0 }; // cómo estaba todo cuando se mandó la acción pendiente
let relojAviso = null;
let relojRespuesta = null;
let puedeAntes = {};

// --- Avisos ---------------------------------------------------------------------------------------------------------------

let numeroDeAviso = 0;
function mostrarAviso(texto) {
  clearTimeout(relojAviso);
  almacen.cambiar({ aviso: { texto, n: ++numeroDeAviso } });
  relojAviso = setTimeout(() => almacen.cambiar({ aviso: null }), SEGUNDOS_DE_AVISO * 1000);
}

function vibrar(patron) {
  try { navigator.vibrate?.(patron); } catch { /* algunos navegadores no dejan */ }
}

// Que la pantalla no se apague mientras se juega (el celular es la cartera: se mira de vez en cuando).
async function mantenerPantalla() {
  try { await navigator.wakeLock?.request('screen'); } catch { /* sin permiso o sin soporte */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && cliente) mantenerPantalla();
});

// --- Lo que llega del tablero ----------------------------------------------------------------------------------------------

function alCambiar() {
  const d = cliente.datos();
  if (d.sala === true) salaVista = true;
  const parche = { cerrada: salaVista && d.sala === false };
  // Solo se enseña lo que está completo: el estado y los botones de la misma publicación (salvo antes de estar en la partida).
  if (d.alDia || d.miId === null) parche.datos = d;

  const error = d.vista.error;
  if (d.vista.puede !== undefined && !vistaVista) {
    vistaVista = true;
    ultimoError = error?.n ?? 0;
  } else if (error && error.n !== ultimoError) {
    ultimoError = error.n;
    mostrarAviso(textoDeError(error, diccionariosActivos()));
  }

  // La acción pendiente está contestada cuando el tablero publica algo nuevo o dice que no valía.
  if (almacen.leer().pendiente && (d.n !== enviada.n || ultimoError !== enviada.error)) {
    clearTimeout(relojRespuesta);
    parche.pendiente = false;
  }

  // Un toque de vibración cuando me toca a mí (tirar, pujar) o me llega un trato.
  if (d.alDia && d.miId) {
    const puede = d.vista.puede ?? {};
    if ((puede.tirar && !puedeAntes.tirar) || (puede.pujar && !puedeAntes.pujar) || (puede.aceptarTrato && !puedeAntes.aceptarTrato)) vibrar([120, 60, 120]);
    puedeAntes = { tirar: puede.tirar, pujar: puede.pujar, aceptarTrato: puede.aceptarTrato };
  }
  almacen.cambiar(parche);
}

// --- Lo que hace el jugador ------------------------------------------------------------------------------------------------

function ponerCodigoEnLaDireccion(codigo) {
  try {
    const url = new URL(location.href);
    if (codigo) url.searchParams.set('sala', codigo);
    else url.searchParams.delete('sala');
    history.replaceState(null, '', url);
  } catch { /* no es importante */ }
}

function entrarEnSala(codigo) {
  cliente?.cerrar();
  vistaVista = false;
  ultimoError = 0;
  salaVista = false;
  puedeAntes = {};
  ponerCodigoEnLaDireccion(codigo);
  almacen.cambiar({ codigo, datos: null, cerrada: false, pendiente: false, aviso: null });
  cliente = crearCliente({ transporte, motor, codigo });
  cliente.alCambiar(alCambiar);
  alCambiar();
  mantenerPantalla();
}

function otraSala() {
  cliente?.cerrar();
  cliente = null;
  ponerCodigoEnLaDireccion('');
  almacen.cambiar({ codigo: '', datos: null, cerrada: false, pendiente: false, aviso: null });
}

async function enviar(accion) {
  if (!cliente || almacen.leer().pendiente) return;
  const d = cliente.datos();
  enviada = { n: d.n, error: ultimoError };
  almacen.cambiar({ pendiente: true });
  clearTimeout(relojRespuesta);
  relojRespuesta = setTimeout(() => almacen.cambiar({ pendiente: false }), SEGUNDOS_SIN_RESPUESTA * 1000);
  try {
    await cliente.enviar(accion);
  } catch {
    clearTimeout(relojRespuesta);
    almacen.cambiar({ pendiente: false });
    mostrarAviso(t('jugador.error_red'));
  }
}

const acciones = {
  enviar,
  entrarEnSala,
  otraSala,
  unirse(nombre) {
    memoria.guardar('duenos:nombre', nombre);
    almacen.cambiar({ nombre });
    enviar({ type: 'unirse', nombre });
  },
  // Salir de la sala: si todavía no ha empezado la partida, se avisa al tablero para que deje el sitio libre.
  salir() {
    if (cliente?.datos().estado?.fase === 'sala' && cliente.datos().miId) cliente.enviar({ type: 'salir' }).catch(() => {});
    otraSala();
  },
  cerrarAviso: () => almacen.cambiar({ aviso: null }),
};

// --- Arranque ---------------------------------------------------------------------------------------------------------------

const red = await redDisponible();
if (red) {
  transporte = conectar(red.modo, identidad('celular'));
  if (almacen.leer().codigo) entrarEnSala(almacen.leer().codigo);
} else {
  almacen.cambiar({ sinRed: true });
}

if (parametros.get('depurar') === '1') window.duenos = { almacen, motor, t, cliente: () => cliente };
render(html`<${Aplicacion} almacen=${almacen} acciones=${acciones} motor=${motor} />`, document.getElementById('app'));
