// El narrador: convierte los eventos del motor en frases, para el registro del tablero y, más adelante, para la voz.
// Son funciones puras (no tocan el navegador): las usan la pantalla, tools/relato.js y las pruebas.
// Las frases salen de los diccionarios de src/i18n/<idioma>/narrador.json; los nombres, de juego.json.
import { traducir } from '../i18n/traducir.js';

// Eventos que el motor emite pero que no se cuentan con una frase: se ven de otra forma en el tablero (los dados, el
// movimiento de las fichas, los números que suben y bajan) o son detalles internos.
export const EVENTOS_SIN_FRASE = ['dinero', 'mover', 'cae'];

// El nombre «oficial» de un jugador en las frases: el que escribió al unirse.
const nombreEscrito = (s, id) => s.jugadores[id]?.nombre ?? id;

// A partir de un evento, la clave de su frase y los datos que lleva, o null si no se cuenta.
// «nombres» da los textos de cada cosa: jugador(id), casilla(i), barrio(id) y mazo(id).
export function describirEvento(e, nombres) {
  const { jugador, casilla, barrio, mazo } = nombres;
  switch (e.type) {
    case 'empieza':
      return { clave: 'evento.empieza', datos: { jugador: jugador(e.orden[0]) } };
    case 'reparto':
      return { clave: 'evento.reparto', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla) } };
    case 'turno':
      return { clave: 'evento.turno', datos: { jugador: jugador(e.id), ronda: e.ronda } };
    case 'ronda':
      return { clave: 'evento.ronda', datos: { ronda: e.ronda } };
    case 'dados':
      return {
        clave: e.dados[0] === e.dados[1] ? 'evento.dados.dobles' : 'evento.dados',
        datos: { jugador: jugador(e.id), total: e.dados.reduce((a, b) => a + b, 0) },
      };
    case 'salida':
      return { clave: 'evento.salida', datos: { jugador: jugador(e.id) } };
    case 'compra':
      return { clave: 'evento.compra', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla), precio: e.precio } };
    case 'noCompra':
      return { clave: 'evento.noCompra', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla) } };
    case 'subasta':
      return { clave: `evento.subasta.${e.origen}`, datos: { casilla: casilla(e.casilla) } };
    case 'puja':
      return { clave: 'evento.puja', datos: { jugador: jugador(e.id), cantidad: e.cantidad } };
    case 'retirada':
      return { clave: 'evento.retirada', datos: { jugador: jugador(e.id) } };
    case 'subastaGanada':
      return { clave: 'evento.subastaGanada', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla), cantidad: e.cantidad } };
    case 'subastaDesierta':
      return { clave: 'evento.subastaDesierta', datos: { casilla: casilla(e.casilla) } };
    case 'alquiler':
      return { clave: 'evento.alquiler', datos: { jugador: jugador(e.id), dueno: jugador(e.a), casilla: casilla(e.casilla), cantidad: e.cantidad } };
    case 'sinAlquiler':
      return { clave: `evento.sinAlquiler.${e.motivo}`, datos: { jugador: jugador(e.id), casilla: casilla(e.casilla) } };
    case 'deuda':
      return { clave: 'evento.deuda', datos: { jugador: jugador(e.id), cantidad: e.cantidad, acreedor: jugador(e.acreedor) } };
    case 'deudaPagada':
      return { clave: 'evento.deudaPagada', datos: { jugador: jugador(e.id), cantidad: e.cantidad, acreedor: jugador(e.acreedor) } };
    case 'bancarrota':
      return {
        clave: e.acreedor === 'banco' ? 'evento.bancarrota.banco' : 'evento.bancarrota.jugador',
        datos: { jugador: jugador(e.id), acreedor: jugador(e.acreedor) },
      };
    case 'alCalabozo':
      return { clave: `evento.alCalabozo.${e.motivo}`, datos: { jugador: jugador(e.id) } };
    case 'saleDelCalabozo':
      return { clave: `evento.saleDelCalabozo.${e.como}`, datos: { jugador: jugador(e.id) } };
    case 'carta':
      return { clave: 'evento.carta', datos: { jugador: jugador(e.id), mazo: mazo(e.mazo) } };
    case 'masPobre':
      return { clave: 'evento.masPobre', datos: { jugador: jugador(e.id) } };
    case 'construir':
      return {
        clave: e.nivel === 5 ? 'evento.construir.torre' : 'evento.construir',
        datos: { jugador: jugador(e.id), casilla: casilla(e.casilla), nivel: e.nivel },
      };
    case 'venderEdificio':
      return { clave: 'evento.venderEdificio', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla), cantidad: e.cantidad } };
    case 'hipotecar':
      return { clave: 'evento.hipotecar', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla), cantidad: e.cantidad } };
    case 'deshipotecar':
      return { clave: 'evento.deshipotecar', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla), coste: e.coste } };
    case 'accionesCompradas':
      return { clave: 'evento.accionesCompradas', datos: { jugador: jugador(e.id), acciones: e.cantidad, barrio: barrio(e.barrio), coste: e.coste } };
    case 'accionesVendidas':
      return { clave: 'evento.accionesVendidas', datos: { jugador: jugador(e.id), acciones: e.cantidad, barrio: barrio(e.barrio), ingreso: e.ingreso } };
    case 'tratoPropuesto':
    case 'tratoAceptado':
    case 'tratoRechazado':
    case 'tratoCancelado':
      return { clave: `evento.${e.type}`, datos: { jugador: jugador(e.de), otro: jugador(e.para) } };
    case 'habilidad':
      return {
        clave: `evento.habilidad.${e.habilidad}`,
        datos: {
          jugador: jugador(e.id),
          cantidad: e.cantidad,
          barrio: e.barrio ? barrio(e.barrio) : undefined,
          casilla: e.casilla !== undefined ? casilla(e.casilla) : undefined,
          objetivo: e.objetivo ? jugador(e.objetivo) : undefined,
        },
      };
    case 'finEfecto':
      return { clave: `evento.finEfecto.${e.efecto}`, datos: { jugador: jugador(e.id) } };
    case 'prestamoDevuelto':
      return { clave: 'evento.prestamoDevuelto', datos: { jugador: jugador(e.id), cantidad: e.cantidad } };
    case 'pierdeTurno':
      return { clave: 'evento.pierdeTurno', datos: { jugador: jugador(e.id) } };
    case 'frenesi':
      return { clave: 'evento.frenesi', datos: { jugador: jugador(e.id), casilla: casilla(e.casilla) } };
    case 'rachaFinal':
      return { clave: 'evento.rachaFinal', datos: { jugador: jugador(e.id) } };
    case 'rachaPerdida':
      return { clave: 'evento.rachaPerdida', datos: { jugador: jugador(e.id) } };
    case 'fin':
      return { clave: `evento.fin.${e.motivo}`, datos: { jugador: jugador(e.ganador) } };
    default:
      return null;
  }
}

// Un narrador para un idioma. «dic» y «base» son los diccionarios ya unidos: el del idioma y el español (la base).
//   nombreJugador(s, id)   cómo se llama a cada jugador en las frases (por defecto, el nombre que escribió)
// Las variantes de cada frase se eligen en orden con un contador, así la misma partida se cuenta siempre igual.
export function crearNarrador({ dic, base = dic, idioma = 'es', nombreJugador = nombreEscrito }) {
  let contador = 0;
  const t = (clave, datos) => traducir(dic, base, clave, datos, { idioma, variante: contador++ });
  // El texto de una clave sin variantes ni marcadores; si falta en los dos diccionarios, el respaldo.
  const nombreSimple = (clave, respaldo) => {
    const texto = traducir(dic, base, clave, {}, { idioma });
    return texto === clave ? respaldo : texto;
  };

  return {
    t,
    // Los nombres de las cosas del tablero, ya traducidos.
    nombres(s) {
      return {
        jugador: id => (id === 'banco' ? nombreSimple('banco', id) : nombreJugador(s, id)),
        casilla: i => nombreSimple(`casilla.${i}`, String(i)),
        barrio: b => nombreSimple(`barrio.${b}`, b),
        mazo: m => nombreSimple(`mazo.${m}`, m),
      };
    },
    // La frase de un evento, o null si ese evento no se cuenta con palabras. «s» es el estado de la partida.
    frase(e, s) {
      const d = describirEvento(e, this.nombres(s));
      return d ? t(d.clave, d.datos) : null;
    },
  };
}
