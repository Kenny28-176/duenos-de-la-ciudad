// Tratos entre dos jugadores (docs/DISENO.md, «Tratos»): calles, transportes y servicios sin edificios en su barrio,
// dinero, acciones y salvoconductos. Uno propone, la propuesta se ve en el tablero y el otro acepta o rechaza (una
// contraoferta es un rechazo más una propuesta nueva). Al aceptar se vuelve a comprobar todo, porque las cosas pueden
// haber cambiado. Quien recibe una propiedad hipotecada paga al banco el 10 % de la hipoteca.
import { barrioSinEdificios, valorHipoteca } from './contexto.js';
import { cargar, transferir } from './dinero.js';

// Un error de una acción: su código, el mensaje en español (para los registros) y los datos con los que la interfaz
// lo traduce. «variante» distingue los distintos mensajes de un mismo código.
const no = (codigo, mensaje, datos = {}) => ({ codigo, mensaje, datos });
const VACIO = { dinero: 0, propiedades: [], acciones: {}, salvoconductos: 0 };

// Normaliza una parte del trato (lo que da un jugador) o devuelve null si no tiene la forma esperada.
function normalizar(parte = {}) {
  const p = { ...VACIO, ...parte };
  if (!Number.isInteger(p.dinero) || p.dinero < 0) return null;
  if (!Array.isArray(p.propiedades) || !p.propiedades.every(Number.isInteger)) return null;
  if (typeof p.acciones !== 'object' || p.acciones === null) return null;
  if (!Object.values(p.acciones).every(n => Number.isInteger(n) && n > 0)) return null;
  if (!Number.isInteger(p.salvoconductos) || p.salvoconductos < 0) return null;
  return { dinero: p.dinero, propiedades: [...new Set(p.propiedades)], acciones: { ...p.acciones }, salvoconductos: p.salvoconductos };
}

// ¿Puede dar este jugador esta parte ahora mismo?
function validarParte(ctx, s, id, parte) {
  const j = s.jugadores[id];
  if (parte.dinero > j.dinero) return no('sin_dinero', `${j.nombre} no tiene tanto dinero.`, { variante: 'trato', jugador: j.nombre });
  for (const i of parte.propiedades) {
    const c = ctx.casillas[i];
    if (!s.props[i] || s.props[i].dueno !== id) return no('propiedad', `${c?.nombre ?? i} no es de ${j.nombre}.`, { casilla: i, jugador: j.nombre });
    if (c.tipo === 'calle' && !barrioSinEdificios(ctx, s, c.barrio)) {
      return no('edificios', `${c.nombre} tiene edificios en su barrio: hay que venderlos antes.`, { variante: 'trato', casilla: i });
    }
  }
  for (const [barrio, n] of Object.entries(parte.acciones)) {
    if (!ctx.barrios[barrio] || (j.acciones[barrio] ?? 0) < n) return no('acciones', `${j.nombre} no tiene esas acciones.`, { jugador: j.nombre });
  }
  if (parte.salvoconductos > j.salvoconductos) return no('salvoconducto', `${j.nombre} no tiene salvoconductos.`, { variante: 'jugador', jugador: j.nombre });
  return null;
}

const vacia = parte => !parte.dinero && !parte.propiedades.length && !Object.keys(parte.acciones).length && !parte.salvoconductos;

export function proponerTrato(ctx, s, a, ev) {
  const para = s.jugadores[a.para];
  if (!para || para.quebrado || a.para === a.id) return no('jugador', 'Elige a otro jugador que siga en la partida.', { variante: 'otro' });
  const ofrece = normalizar(a.ofrece);
  const pide = normalizar(a.pide);
  if (!ofrece || !pide) return no('trato', 'El trato no tiene la forma esperada.', { variante: 'forma' });
  if (vacia(ofrece) && vacia(pide)) return no('vacio', 'El trato está vacío.');
  const fallo = validarParte(ctx, s, a.id, ofrece) ?? validarParte(ctx, s, a.para, pide);
  if (fallo) return fallo;
  const id = `t${s.siguienteTrato++}`;
  s.tratos[id] = { id, de: a.id, para: a.para, ofrece, pide };
  if (s.turno?.id === a.id) s.turno.tratosPropuestos++;
  ev.push({ type: 'tratoPropuesto', trato: id, de: a.id, para: a.para });
  return undefined;
}

function entregar(ctx, s, ev, de, a, parte) {
  transferir(s, ev, de, a, parte.dinero, 'trato');
  for (const i of parte.propiedades) {
    s.props[i].dueno = a;
    if (s.props[i].hipotecada) {
      cargar(s, ev, a, 'banco', Math.round(valorHipoteca(ctx, i) * ctx.eco.interesHipoteca), 'interes-hipoteca');
    }
  }
  for (const [barrio, n] of Object.entries(parte.acciones)) {
    const quedan = s.jugadores[de].acciones[barrio] - n;
    if (quedan) s.jugadores[de].acciones[barrio] = quedan;
    else delete s.jugadores[de].acciones[barrio];
    s.jugadores[a].acciones[barrio] = (s.jugadores[a].acciones[barrio] ?? 0) + n;
  }
  s.jugadores[de].salvoconductos -= parte.salvoconductos;
  s.jugadores[a].salvoconductos += parte.salvoconductos;
}

export function aceptarTrato(ctx, s, a, ev) {
  const t = s.tratos[a.trato];
  if (!t) return no('trato', 'Ese trato ya no existe.', { variante: 'inexistente' });
  if (t.para !== a.id) return no('no_es_para_ti', 'Ese trato no es para ti.');
  const fallo = validarParte(ctx, s, t.de, t.ofrece) ?? validarParte(ctx, s, t.para, t.pide);
  if (fallo) return fallo;
  const maximo = ctx.eco.bolsa.maxPorJugador;
  for (const [quien, recibe] of [[t.para, t.ofrece], [t.de, t.pide]]) {
    for (const [barrio, n] of Object.entries(recibe.acciones)) {
      if ((s.jugadores[quien].acciones[barrio] ?? 0) + n > maximo) {
        return no('maximo', `Nadie puede tener más de ${maximo} acciones de un barrio.`, { maximo });
      }
    }
  }
  delete s.tratos[a.trato];
  entregar(ctx, s, ev, t.de, t.para, t.ofrece);
  entregar(ctx, s, ev, t.para, t.de, t.pide);
  ev.push({ type: 'tratoAceptado', trato: t.id, de: t.de, para: t.para });
  return undefined;
}

export function rechazarTrato(ctx, s, a, ev) {
  const t = s.tratos[a.trato];
  if (!t) return no('trato', 'Ese trato ya no existe.', { variante: 'inexistente' });
  if (t.para !== a.id && t.de !== a.id) return no('no_es_tuyo', 'Ese trato no es tuyo.');
  delete s.tratos[a.trato];
  ev.push({ type: t.de === a.id ? 'tratoCancelado' : 'tratoRechazado', trato: t.id, de: t.de, para: t.para });
  return undefined;
}

// Quita los tratos en los que participa un jugador (cuando quiebra).
export function quitarTratosDe(s, id) {
  for (const [k, t] of Object.entries(s.tratos)) if (t.de === id || t.para === id) delete s.tratos[k];
}
