// Relato de una partida entre bots: narra los acontecimientos en español o inglés (T-12 de trabajoParalelo.md).
// Uso: node tools/relato.js [--semilla 7] [--jugadores 4] [--idioma es] [--hasta 200]
import { readFile } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';
import { traducir, unirDiccionarios } from '../src/i18n/traducir.js';

const args = process.argv.slice(2);

if (args.includes('--ayuda') || args.includes('-h') || args.includes('--help')) {
  console.log(`Uso: node tools/relato.js [--semilla 7] [--jugadores 4] [--idioma es] [--hasta 200]

Opciones:
  --semilla <n>    Semilla del generador pseudoaleatorio (por defecto: 7)
  --jugadores <n>  Número de jugadores de 2 a 8 (por defecto: 4)
  --idioma <lang>  Idioma del relato: es | en (por defecto: es)
  --hasta <turnos> Corta la narración después de ese número de turnos (por defecto: sin límite)
  --ayuda, -h      Muestra esta ayuda`);
  process.exit(0);
}

const obtenerArg = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : porDefecto;
};

const semilla = Number(obtenerArg('semilla', 7));
const jugadores = Number(obtenerArg('jugadores', 4));
const idioma = obtenerArg('idioma', 'es') === 'en' ? 'en' : 'es';
const hastaStr = obtenerArg('hasta', null);
const hasta = hastaStr !== null ? Number(hastaStr) : Infinity;


/**
 * Carga los diccionarios desde el disco usando node:fs/promises.
 * @param {string} lang
 */
async function cargarDiccionarios(lang) {
  const partes = ['juego', 'narrador', 'errores', 'interfaz'];
  const cargados = {};
  for (const p of partes) {
    const url = new URL(`../src/i18n/${lang}/${p}.json`, import.meta.url);
    const contenido = await readFile(url, 'utf8');
    cargados[p] = JSON.parse(contenido);
  }
  return unirDiccionarios(cargados.juego, cargados.narrador, cargados.errores, cargados.interfaz);
}

const dicc = await cargarDiccionarios(idioma);
const diccBase = idioma === 'es' ? dicc : await cargarDiccionarios('es');

const datos = await cargarDatos();
const motor = crearMotor(datos);
const fichas = fichasParaPartida(motor, semilla, jugadores);

let contadorVariantes = 0;

/**
 * Traduce una clave con marcadores y avanza el selector determinista de variantes.
 * @param {string} clave
 * @param {object} params
 * @returns {string}
 */
function narrar(clave, params = {}) {
  const variante = contadorVariantes++;
  return traducir(dicc, diccBase, clave, params, { idioma, variante });
}

/**
 * Obtiene el nombre localizado de un participante (ficha o banco).
 * @param {object} s
 * @param {string} id
 * @returns {string}
 */
function nombreParticipante(s, id) {
  if (id === 'banco') return dicc.banco ?? (idioma === 'en' ? 'the bank' : 'el banco');
  const fichaId = s.jugadores[id]?.ficha;
  if (fichaId) {
    return dicc[`ficha.${fichaId}`] ?? fichaId;
  }
  return id;
}

/**
 * Mapea un evento del motor a su clave narrable y parámetros, o devuelve null si no se narra.
 * @param {object} e
 * @param {object} s
 * @returns {{ clave: string, params: object } | null}
 */
function mapearEvento(e, s) {
  const nombre = id => nombreParticipante(s, id);
  const nombreCasilla = i => dicc[`casilla.${i}`] ?? `casilla ${i}`;
  const nombreBarrio = b => dicc[`barrio.${b}`] ?? b;

  switch (e.type) {
    case 'empieza':
      return { clave: 'evento.empieza', params: { jugador: nombre(e.orden[0]) } };

    case 'reparto':
      return { clave: 'evento.reparto', params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla) } };

    case 'turno':
      return { clave: 'evento.turno', params: { jugador: nombre(e.id), ronda: e.ronda } };

    case 'ronda':
      return { clave: 'evento.ronda', params: { ronda: e.ronda } };

    case 'dados': {
      const dobles = e.dados[0] === e.dados[1];
      const total = e.dados.reduce((a, b) => a + b, 0);
      return {
        clave: dobles ? 'evento.dados.dobles' : 'evento.dados',
        params: { jugador: nombre(e.id), total },
      };
    }

    case 'salida':
      return { clave: 'evento.salida', params: { jugador: nombre(e.id) } };

    case 'compra':
      return {
        clave: 'evento.compra',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla), precio: e.precio },
      };

    case 'noCompra':
      return {
        clave: 'evento.noCompra',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla) },
      };

    case 'subasta':
      return {
        clave: `evento.subasta.${e.origen}`,
        params: { casilla: nombreCasilla(e.casilla) },
      };

    case 'puja':
      return {
        clave: 'evento.puja',
        params: { jugador: nombre(e.id), cantidad: e.cantidad },
      };

    case 'retirada':
      return { clave: 'evento.retirada', params: { jugador: nombre(e.id) } };

    case 'subastaGanada':
      return {
        clave: 'evento.subastaGanada',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla), cantidad: e.cantidad },
      };

    case 'subastaDesierta':
      return {
        clave: 'evento.subastaDesierta',
        params: { casilla: nombreCasilla(e.casilla) },
      };

    case 'alquiler':
      return {
        clave: 'evento.alquiler',
        params: {
          jugador: nombre(e.id),
          dueno: nombre(e.dueno ?? e.a),
          casilla: nombreCasilla(e.casilla),
          cantidad: e.cantidad,
        },
      };

    case 'sinAlquiler':
      return {
        clave: `evento.sinAlquiler.${e.motivo}`,
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla) },
      };

    case 'deuda':
      return {
        clave: 'evento.deuda',
        params: { jugador: nombre(e.id), cantidad: e.cantidad, acreedor: nombre(e.acreedor) },
      };

    case 'deudaPagada':
      return {
        clave: 'evento.deudaPagada',
        params: { jugador: nombre(e.id), cantidad: e.cantidad, acreedor: nombre(e.acreedor) },
      };

    case 'bancarrota':
      return {
        clave: e.acreedor === 'banco' ? 'evento.bancarrota.banco' : 'evento.bancarrota.jugador',
        params: { jugador: nombre(e.id), acreedor: nombre(e.acreedor) },
      };

    case 'alCalabozo':
      return {
        clave: `evento.alCalabozo.${e.motivo}`,
        params: { jugador: nombre(e.id) },
      };

    case 'saleDelCalabozo':
      return {
        clave: `evento.saleDelCalabozo.${e.como}`,
        params: { jugador: nombre(e.id) },
      };

    case 'carta': {
      const mazoNombre = dicc[`mazo.${e.mazo}`] ?? e.mazo;
      return {
        clave: 'evento.carta',
        params: { jugador: nombre(e.id), mazo: mazoNombre },
      };
    }

    case 'masPobre':
      return {
        clave: 'evento.masPobre',
        params: { jugador: nombre(e.id) },
      };

    case 'construir':
      return {
        clave: e.nivel === 5 ? 'evento.construir.torre' : 'evento.construir',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla), nivel: e.nivel },
      };

    case 'venderEdificio':
      return {
        clave: 'evento.venderEdificio',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla), cantidad: e.cantidad },
      };

    case 'hipotecar':
      return {
        clave: 'evento.hipotecar',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla), cantidad: e.cantidad },
      };

    case 'deshipotecar':
      return {
        clave: 'evento.deshipotecar',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla), coste: e.coste },
      };

    case 'accionesCompradas':
      return {
        clave: 'evento.accionesCompradas',
        params: {
          jugador: nombre(e.id),
          acciones: e.cantidad,
          barrio: nombreBarrio(e.barrio),
          coste: e.coste,
        },
      };

    case 'accionesVendidas':
      return {
        clave: 'evento.accionesVendidas',
        params: {
          jugador: nombre(e.id),
          acciones: e.cantidad,
          barrio: nombreBarrio(e.barrio),
          ingreso: e.ingreso,
        },
      };

    case 'tratoPropuesto':
      return {
        clave: 'evento.tratoPropuesto',
        params: { jugador: nombre(e.de), otro: nombre(e.para) },
      };

    case 'tratoAceptado':
      return {
        clave: 'evento.tratoAceptado',
        params: { jugador: nombre(e.de), otro: nombre(e.para) },
      };

    case 'tratoRechazado':
      return {
        clave: 'evento.tratoRechazado',
        params: { jugador: nombre(e.de), otro: nombre(e.para) },
      };

    case 'tratoCancelado':
      return {
        clave: 'evento.tratoCancelado',
        params: { jugador: nombre(e.de), otro: nombre(e.para) },
      };

    case 'habilidad':
      return {
        clave: `evento.habilidad.${e.habilidad}`,
        params: {
          jugador: nombre(e.id),
          cantidad: e.cantidad,
          barrio: e.barrio ? nombreBarrio(e.barrio) : undefined,
          casilla: e.casilla !== undefined ? nombreCasilla(e.casilla) : undefined,
          objetivo: e.objetivo ? nombre(e.objetivo) : undefined,
        },
      };

    case 'finEfecto':
      return {
        clave: `evento.finEfecto.${e.efecto}`,
        params: { jugador: nombre(e.id) },
      };

    case 'prestamoDevuelto':
      return {
        clave: 'evento.prestamoDevuelto',
        params: { jugador: nombre(e.id), cantidad: e.cantidad },
      };

    case 'pierdeTurno':
      return {
        clave: 'evento.pierdeTurno',
        params: { jugador: nombre(e.id) },
      };

    case 'frenesi':
      return {
        clave: 'evento.frenesi',
        params: { jugador: nombre(e.id), casilla: nombreCasilla(e.casilla) },
      };

    case 'rachaFinal':
      return {
        clave: 'evento.rachaFinal',
        params: { jugador: nombre(e.id) },
      };

    case 'rachaPerdida':
      return {
        clave: 'evento.rachaPerdida',
        params: { jugador: nombre(e.id) },
      };

    case 'fin':
      return {
        clave: `evento.fin.${e.motivo}`,
        params: { jugador: nombre(e.ganador) },
      };

    default:
      return null;
  }
}

// Ejecutar la partida y narrar los eventos
let turnosProcesados = 0;
let cortado = false;

simularPartida(motor, {
  semilla,
  fichas,
  maxTurnos: Number.isFinite(hasta) ? hasta : 1000,
  alEvento: (evento, estado) => {
    if (cortado) return;

    if (evento.type === 'turno') {
      turnosProcesados++;
      if (turnosProcesados > hasta) {
        cortado = true;
        return;
      }
    }

    const mapeado = mapearEvento(evento, estado);
    if (!mapeado) return;

    const texto = narrar(mapeado.clave, mapeado.params);
    const ronda = estado.ronda || 1;
    const etiquetaRonda = idioma === 'en' ? `Round ${ronda}` : `Ronda ${ronda}`;
    console.log(`${etiquetaRonda} · ${texto}`);
  },
});

