// Habilidades de las fichas (docs/DISENO.md, «Las habilidades de las fichas»; cifras en src/data/fichas.json).
// Las pasivas que dependen de otras reglas viven donde se aplican (sueldo e interés en la Salida, dividendos, alquiler,
// subastas, cartas, construir y patrimonio); aquí están las activas, los efectos que caducan al empezar un turno, la
// Renta fija, el Préstamo exprés, el Peaje hormiga y la Apuesta bajista.
import { activa, pasiva, propiedadesDe } from './contexto.js';
import { cargar, cobrar, transferir } from './dinero.js';
import { activos } from './turno.js';

// Un error de una acción: su código, el mensaje en español (para los registros) y los datos con los que la interfaz
// lo traduce. «variante» distingue los distintos mensajes de un mismo código.
const no = (codigo, mensaje, datos = {}) => ({ codigo, mensaje, datos });

// --- Al empezar el turno de un jugador -----------------------------------------------------------------

export function inicioDeTurnoHabilidades(ctx, s, ev, id) {
  // Los efectos que duran «hasta su próximo turno» acaban; la burbuja inflada estalla (cobra menos una ronda).
  const siguen = [];
  for (const e of s.efectos) {
    if (e.hasta !== id) {
      siguen.push(e);
      continue;
    }
    if (e.tipo === 'inflada') siguen.push({ tipo: 'estallada', casilla: e.casilla, factor: e.factorEstallido, hasta: id });
    ev.push({ type: 'finEfecto', efecto: e.tipo, id });
  }
  s.efectos = siguen;
  if (!s.opciones.habilidades) return;
  const j = s.jugadores[id];
  if (j.hab.enfriamiento > 0) j.hab.enfriamiento--;
  j.hab.peajeRonda = 0;
  if (j.hab.prestamo) {
    j.hab.prestamo.turnos--;
    if (j.hab.prestamo.turnos <= 0) {
      const devolver = j.hab.prestamo.devolver;
      j.hab.prestamo = null;
      j.hab.enfriamiento = activa(ctx, s, id).enfriamiento;
      ev.push({ type: 'prestamoDevuelto', id, cantidad: devolver });
      cargar(s, ev, id, 'banco', devolver, 'prestamo');
    }
  }
  const vaca = pasiva(ctx, s, id, 'renta-fija');
  if (vaca) {
    const valor = propiedadesDe(ctx, s, id)
      .filter(i => ctx.casillas[i].tipo === 'calle')
      .reduce((total, i) => total + ctx.casillas[i].precio + s.props[i].nivel * ctx.casillas[i].costeCasa, 0);
    cobrar(s, ev, id, Math.min(vaca.maximo, Math.round(valor * vaca.porcentaje)), 'renta-fija');
  }
}

// --- Pasivas que reaccionan a lo que hacen los demás --------------------------------------------------

// Peaje hormiga: quien pasa (sin caer) por una calle de la Hormiga le paga un poco, con un máximo por ronda salvo
// mientras dura el Hormiguero. Nunca deja a nadie en deuda: si no le alcanza, paga lo que tiene.
export function peajeHormiga(ctx, s, ev, id, i) {
  if (ctx.casillas[i].tipo !== 'calle') return;
  const p = s.props[i];
  const dueno = p.dueno;
  if (!dueno || dueno === id || p.hipotecada) return;
  const hormiga = pasiva(ctx, s, dueno, 'peaje-hormiga');
  if (!hormiga) return;
  const hormiguero = s.efectos.find(e => e.tipo === 'hormiguero' && e.jugador === dueno);
  let cantidad = hormiguero ? hormiguero.peaje : Math.min(hormiga.peaje, hormiga.maximoRonda - s.jugadores[dueno].hab.peajeRonda);
  cantidad = Math.min(cantidad, s.jugadores[id].dinero);
  if (cantidad <= 0) return;
  transferir(s, ev, id, dueno, cantidad, 'peaje');
  if (!hormiguero) s.jugadores[dueno].hab.peajeRonda += cantidad;
}

// Apuesta bajista: el Oso cobra del banco cada vez que otro jugador hipoteca o vende edificios.
export function apuestaBajista(ctx, s, ev, quien) {
  for (const id of activos(s)) {
    const oso = id !== quien && pasiva(ctx, s, id, 'apuesta-bajista');
    if (oso) cobrar(s, ev, id, oso.cantidad, 'apuesta-bajista');
  }
}

// --- Habilidades activas --------------------------------------------------------------------------------

function objetivoValido(s, j, objetivo) {
  const o = s.jugadores[objetivo];
  if (!o || o.quebrado || objetivo === j.id) return no('objetivo', 'Elige a otro jugador que siga en la partida.');
  if (j.hab.ultimoObjetivo === objetivo) return no('mismo_objetivo', 'No puedes usarla dos veces seguidas contra el mismo jugador.');
  return null;
}

// a: { id, casilla?, barrio?, objetivo?, cantidad? }. Quien llama ya comprobó que es su turno y nada lo bloquea.
export function usarHabilidad(ctx, s, a, ev) {
  if (!s.opciones.habilidades) return no('sin_habilidades', 'Esta sala juega sin habilidades.');
  const j = s.jugadores[a.id];
  const t = s.turno;
  const hab = activa(ctx, s, a.id);
  if (t.habilidadUsada) return no('una_por_turno', 'Solo se puede usar una habilidad activa por turno.');
  if (j.hab.enfriamiento > 0) return no('enfriamiento', `Todavía faltan ${j.hab.enfriamiento} turnos.`, { n: j.hab.enfriamiento, variante: j.hab.enfriamiento === 1 ? 'uno' : 'otros' });
  if (hab.momento === 'antes-de-tirar' && (t.fase !== 'inicio' || (hab.id === 'hibernar' && t.dados))) {
    return no('momento', 'Esta habilidad se usa antes de tirar los dados.');
  }
  const detalle = {};
  switch (hab.id) {
    case 'esprint':
      if (j.calabozo) return no('calabozo', 'No se puede usar en el Calabozo.', { variante: 'habilidad' });
      t.esprint = true;
      break;
    case 'prestamo-expres': {
      if (j.hab.prestamo) return no('prestamo', 'Ya tienes un préstamo sin devolver.');
      const cantidad = a.cantidad;
      if (!Number.isInteger(cantidad) || cantidad < 10 || cantidad > hab.maximo || cantidad % 10) {
        return no('cantidad', `Pide entre 10 y ${hab.maximo} $, en múltiplos de 10.`, { variante: 'prestamo', maximo: hab.maximo });
      }
      j.hab.prestamo = { devolver: Math.round(cantidad * (1 + hab.interes)), turnos: hab.turnos };
      cobrar(s, ev, a.id, cantidad, 'prestamo');
      detalle.cantidad = cantidad;
      break;
    }
    case 'rally':
      if (!s.opciones.mercado) return no('sin_mercado', 'Esta sala juega sin mercado vivo.');
      if (!ctx.barrios[a.barrio]) return no('barrio', 'Elige un barrio.');
      s.efectos.push({ tipo: 'rally', barrio: a.barrio, factor: hab.factor, hasta: a.id });
      detalle.barrio = a.barrio;
      break;
    case 'hibernar':
      s.efectos.push({ tipo: 'hibernar', jugador: a.id, hasta: a.id });
      break;
    case 'inflar': {
      const p = s.props[a.casilla];
      if (!p || ctx.casillas[a.casilla].tipo !== 'calle' || p.dueno !== a.id || p.hipotecada) {
        return no('casilla', 'Elige una de tus calles sin hipotecar.', { variante: 'calle_propia' });
      }
      s.efectos = s.efectos.filter(e => !(e.casilla === a.casilla && (e.tipo === 'inflada' || e.tipo === 'estallada')));
      s.efectos.push({ tipo: 'inflada', casilla: a.casilla, factor: hab.factor, factorEstallido: hab.factorEstallido, hasta: a.id });
      detalle.casilla = a.casilla;
      break;
    }
    case 'temporada-alta':
      s.efectos.push({ tipo: 'temporada', jugador: a.id, factor: hab.factor, hasta: a.id });
      break;
    case 'obras-eternas': {
      const p = s.props[a.casilla];
      if (!p || ctx.casillas[a.casilla].tipo !== 'calle' || !p.dueno || p.dueno === a.id) {
        return no('casilla', 'Elige una calle de otro jugador.', { variante: 'calle_ajena' });
      }
      const fallo = objetivoValido(s, j, p.dueno);
      if (fallo) return fallo;
      s.efectos.push({ tipo: 'obras', casilla: a.casilla, finTurnoDe: p.dueno });
      j.hab.ultimoObjetivo = p.dueno;
      Object.assign(detalle, { casilla: a.casilla, objetivo: p.dueno });
      break;
    }
    case 'hormiguero':
      s.efectos.push({ tipo: 'hormiguero', jugador: a.id, peaje: hab.peaje, hasta: a.id });
      break;
    case 'frenesi':
    case 'imprevisto': {
      const fallo = objetivoValido(s, j, a.objetivo);
      if (fallo) return fallo;
      if (hab.id === 'frenesi') s.jugadores[a.objetivo].marcado = true;
      else s.jugadores[a.objetivo].pierdeTurno = true;
      j.hab.ultimoObjetivo = a.objetivo;
      detalle.objetivo = a.objetivo;
      break;
    }
    default:
      return no('habilidad', `Habilidad desconocida: ${hab.id}`, { habilidad: hab.id });
  }
  t.habilidadUsada = true;
  // El enfriamiento del préstamo empieza cuando se devuelve.
  if (hab.id !== 'prestamo-expres') j.hab.enfriamiento = hab.enfriamiento;
  ev.push({ type: 'habilidad', id: a.id, habilidad: hab.id, ...detalle });
  return undefined;
}
