// El turno: mover la ficha, resolver la casilla donde cae, pasar al siguiente jugador y comprobar quién gana.
// Lo usan las acciones de juego.js y también las cartas y las subastas (que pueden mover fichas o cerrar turnos).
import { alquiler, distancia, siguiente, anterior, pasiva, patrimonio, redondear } from './contexto.js';
import { cargar, cobrar } from './dinero.js';
import { robarCarta } from './cartas.js';
import { iniciarSubasta } from './subasta.js';
import { inicioDeTurnoHabilidades, peajeHormiga } from './habilidades.js';

export const activos = s => s.orden.filter(id => !s.jugadores[id].quebrado);

// --- Empezar, seguir y pasar el turno --------------------------------------------------------------

export function iniciarTurno(ctx, s, ev, id) {
  s.turnos++;
  s.turno = {
    id, fase: 'inicio', dados: null, dobles: 0, repite: false, compra: null,
    bolsaAbierta: false, habilidadUsada: false, esprint: false, tratosPropuestos: 0,
  };
  ev.push({ type: 'turno', id, ronda: s.ronda });
  inicioDeTurnoHabilidades(ctx, s, ev, id);
}

// Tras resolver la casilla (o una subasta): vuelve a tirar si sacó dobles o pasa a gestionar. Espera mientras haya una
// subasta o una compra por decidir.
export function seguir(ctx, s) {
  const t = s.turno;
  if (s.fase !== 'juego' || !t || s.subasta || t.compra != null || t.fase === 'quiebra') return;
  const j = s.jugadores[t.id];
  t.fase = t.repite && !j.calabozo && !j.quebrado ? 'inicio' : 'gestion';
}

// Lo que pasa al terminar el turno de un jugador: las Obras eternas sobre sus calles acaban.
export function finDeTurno(ctx, s, ev, id) {
  const antes = s.efectos.length;
  s.efectos = s.efectos.filter(e => !(e.tipo === 'obras' && e.finTurnoDe === id));
  if (s.efectos.length < antes) ev.push({ type: 'finEfecto', efecto: 'obras', id });
}

export function pasarTurno(ctx, s, ev) {
  const n = s.orden.length;
  let indice = s.orden.indexOf(s.turno.id);
  for (let vueltas = 0; vueltas < n * 3; vueltas++) {
    indice = (indice + 1) % n;
    if (indice === 0) {
      s.ronda++;
      ev.push({ type: 'ronda', ronda: s.ronda });
      if (s.ultimaRonda) return terminarPorPatrimonio(ctx, s, ev, 'tiempo');
    }
    const id = s.orden[indice];
    const j = s.jugadores[id];
    if (j.quebrado) continue;
    iniciarTurno(ctx, s, ev, id);
    if (s.fase !== 'juego') return;
    if (!j.pierdeTurno) return;
    j.pierdeTurno = false;
    ev.push({ type: 'pierdeTurno', id });
    finDeTurno(ctx, s, ev, id);
  }
}

// --- Fin de la partida -------------------------------------------------------------------------------

export function terminar(ctx, s, ev, ganador, motivo) {
  s.fase = 'fin';
  s.ganador = ganador;
  s.motivoFin = motivo;
  const patrimonios = Object.fromEntries(s.orden.map(id => [id, patrimonio(ctx, s, id, { paraMeta: true })]));
  ev.push({ type: 'fin', ganador, motivo, patrimonios });
}

// Gana el mayor patrimonio (si empatan, quien va antes en el orden de juego).
export function terminarPorPatrimonio(ctx, s, ev, motivo) {
  let mejor = null;
  const valor = id => patrimonio(ctx, s, id, { paraMeta: true });
  for (const id of activos(s)) if (mejor === null || valor(id) > valor(mejor)) mejor = id;
  terminar(ctx, s, ev, mejor, motivo);
}

// Avisa cuando alguien alcanza la meta (va camino de ganar) o deja de tenerla.
export function actualizarRachas(ctx, s, ev) {
  if (!s.opciones.meta) return;
  for (const id of s.orden) {
    const en = !s.jugadores[id].quebrado && patrimonio(ctx, s, id, { paraMeta: true }) >= s.opciones.meta;
    if (en && !s.enRacha[id]) {
      s.enRacha[id] = true;
      ev.push({ type: 'rachaFinal', id });
    } else if (!en && s.enRacha[id]) {
      delete s.enRacha[id];
      ev.push({ type: 'rachaPerdida', id });
    }
  }
}

// --- Mover la ficha ----------------------------------------------------------------------------------

export function mover(ctx, s, ev, id, pasos) {
  const j = s.jugadores[id];
  const camino = [];
  for (let k = 0; k < pasos; k++) {
    j.casilla = siguiente(ctx, j.casilla);
    camino.push(j.casilla);
  }
  ev.push({ type: 'mover', id, camino });
  for (let k = 0; k < camino.length; k++) {
    if (camino[k] === ctx.salida) {
      pasarPorSalida(ctx, s, ev, id);
      if (s.fase !== 'juego') return;
    } else if (k < camino.length - 1) {
      peajeHormiga(ctx, s, ev, id, camino[k]);
    }
  }
  caer(ctx, s, ev, id);
}

export const moverHasta = (ctx, s, ev, id, destino) => mover(ctx, s, ev, id, distancia(ctx, s.jugadores[id].casilla, destino));

// Hacia atrás: sin cobrar el sueldo ni pagar peajes.
export function retroceder(ctx, s, ev, id, pasos) {
  const j = s.jugadores[id];
  const camino = [];
  for (let k = 0; k < pasos; k++) {
    j.casilla = anterior(ctx, j.casilla);
    camino.push(j.casilla);
  }
  ev.push({ type: 'mover', id, camino, atras: true });
  caer(ctx, s, ev, id);
}

export function irAlCalabozo(ctx, s, ev, id, motivo) {
  const j = s.jugadores[id];
  j.casilla = ctx.calabozo;
  j.calabozo = { intentos: 0 };
  if (s.turno?.id === id) s.turno.repite = false;
  ev.push({ type: 'alCalabozo', id, motivo });
}

export function pasarPorSalida(ctx, s, ev, id) {
  const j = s.jugadores[id];
  cobrar(s, ev, id, pasiva(ctx, s, id, 'horas-extra')?.sueldo ?? ctx.eco.sueldo, 'sueldo');
  const taza = pasiva(ctx, s, id, 'interes-a-favor');
  if (taza) cobrar(s, ev, id, Math.min(taza.maximo, Math.round(j.dinero * taza.porcentaje)), 'interes');
  if (s.opciones.mercado && s.turno?.id === id) s.turno.bolsaAbierta = true;
  ev.push({ type: 'salida', id });
  if (s.opciones.meta && patrimonio(ctx, s, id, { paraMeta: true }) >= s.opciones.meta) terminar(ctx, s, ev, id, 'meta');
}

// --- La casilla donde cae ------------------------------------------------------------------------------

export function caer(ctx, s, ev, id) {
  const c = ctx.casillas[s.jugadores[id].casilla];
  ev.push({ type: 'cae', id, casilla: c.i });
  switch (c.tipo) {
    case 'calle':
    case 'transporte':
    case 'servicio':
      return caerEnPropiedad(ctx, s, ev, id, c.i);
    case 'noticias':
    case 'fortuna':
      return robarCarta(ctx, s, ev, id, c.tipo);
    case 'impuesto': {
      const cantidad = redondear(patrimonio(ctx, s, id) * ctx.eco.impuestoPatrimonio, 10);
      return cargar(s, ev, id, 'banco', cantidad, 'impuesto');
    }
    case 'agencia':
    case 'bolsa':
      if (s.opciones.mercado && s.turno?.id === id) s.turno.bolsaAbierta = true;
      return undefined;
    case 'auditoria':
      return irAlCalabozo(ctx, s, ev, id, 'auditoria');
    default: // la Salida (el sueldo ya se cobró) y el Calabozo de paso
      return undefined;
  }
}

function caerEnPropiedad(ctx, s, ev, id, i) {
  const p = s.props[i];
  if (!p.dueno) {
    const j = s.jugadores[id];
    if (j.marcado) {
      j.marcado = false;
      ev.push({ type: 'frenesi', id, casilla: i });
      return iniciarSubasta(ctx, s, ev, [i], 'frenesi');
    }
    s.turno.compra = i;
    s.turno.fase = 'compra';
    return undefined;
  }
  if (p.dueno !== id) cobrarAlquiler(ctx, s, ev, id, i);
  return undefined;
}

// ¿Por qué no se cobra alquiler en esta casilla? (null si se cobra)
function sinAlquiler(s, pagador, i) {
  const p = s.props[i];
  if (p.hipotecada) return 'hipotecada';
  for (const e of s.efectos) {
    if (e.tipo === 'obras' && e.casilla === i) return 'obras';
    if (e.tipo === 'hibernar' && (e.jugador === pagador || e.jugador === p.dueno)) return 'hiberna';
  }
  return null;
}

export function cobrarAlquiler(ctx, s, ev, pagador, i) {
  const p = s.props[i];
  const motivo = sinAlquiler(s, pagador, i);
  if (motivo) {
    ev.push({ type: 'sinAlquiler', id: pagador, casilla: i, motivo });
    return;
  }
  const cantidad = alquiler(ctx, s, i, s.turno?.dados ?? [0, 0]);
  if (cantidad <= 0) return;
  ev.push({ type: 'alquiler', id: pagador, a: p.dueno, casilla: i, cantidad });
  cargar(s, ev, pagador, p.dueno, cantidad, 'alquiler');
  if (ctx.casillas[i].tipo === 'calle') pagarDividendos(ctx, s, ev, ctx.casillas[i].barrio, cantidad, pagador);
}

// Cada accionista del barrio (salvo quien paga) cobra del banco un dividendo por cada acción. El Toro, más.
export function pagarDividendos(ctx, s, ev, barrio, cantidad, pagador) {
  if (!s.opciones.mercado) return;
  for (const id of activos(s)) {
    const n = s.jugadores[id].acciones[barrio] ?? 0;
    if (id === pagador || !n) continue;
    const factor = pasiva(ctx, s, id, 'optimista')?.factor ?? 1;
    cobrar(s, ev, id, Math.round(cantidad * ctx.eco.bolsa.dividendo * n * factor), 'dividendo');
  }
}
