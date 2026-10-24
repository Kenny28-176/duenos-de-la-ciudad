// Subastas: cuando alguien no compra una calle libre, cuando el Tiburón usa Frenesí y cuando las calles de quien quiebra
// ante el banco vuelven a venderse. La cuenta atrás la lleva el tablero: cuando se acaba, manda «cerrarSubasta».
// El Tiburón (Cazador de gangas) puede igualar la puja más alta para ganar el empate. Paga su puja multiplicada por
// «pago» (src/data/fichas.json; hoy vale 1, así que la paga entera).
import { pasiva } from './contexto.js';
import { transferir } from './dinero.js';
import { activos, pasarTurno, seguir } from './turno.js';

const no = (codigo, mensaje) => ({ codigo, mensaje });

// Añade casillas a la cola de subastas y empieza la primera si no hay otra en marcha.
export function iniciarSubasta(ctx, s, ev, casillas, origen) {
  s.subastasPendientes.push(...casillas.map(casilla => ({ casilla, origen })));
  if (!s.subasta) siguienteSubasta(ctx, s, ev);
}

function siguienteSubasta(ctx, s, ev) {
  const siguiente = s.subastasPendientes.shift();
  if (!siguiente) return false;
  s.subasta = { casilla: siguiente.casilla, origen: siguiente.origen, puja: 0, lider: null, activos: activos(s) };
  ev.push({ type: 'subasta', casilla: siguiente.casilla, origen: siguiente.origen });
  return true;
}

// Puja mínima que puede hacer un jugador ahora mismo.
export function pujaMinima(ctx, s, id) {
  const { puja, lider } = s.subasta;
  if (puja === 0) return ctx.eco.subasta.minimo;
  if (lider !== id && pasiva(ctx, s, id, 'cazador-de-gangas')) return puja;
  return puja + ctx.eco.subasta.incremento;
}

export function pujar(ctx, s, a, ev) {
  const sub = s.subasta;
  if (!sub) return no('sin_subasta', 'No hay ninguna subasta en marcha.');
  if (!sub.activos.includes(a.id)) return no('fuera', 'Ya no participas en esta subasta.');
  if (sub.lider === a.id) return no('ya_lider', 'Ya tienes la puja más alta.');
  const cantidad = a.cantidad;
  if (!Number.isInteger(cantidad)) return no('cantidad', 'La puja tiene que ser una cantidad entera.');
  const minima = pujaMinima(ctx, s, a.id);
  if (cantidad < minima) return no('puja_baja', `La puja mínima es ${minima} $.`);
  if (cantidad > s.jugadores[a.id].dinero) return no('sin_dinero', 'No tienes tanto dinero.');
  sub.puja = cantidad;
  sub.lider = a.id;
  ev.push({ type: 'puja', id: a.id, cantidad });
  return undefined;
}

export function retirarse(ctx, s, a, ev) {
  const sub = s.subasta;
  if (!sub) return no('sin_subasta', 'No hay ninguna subasta en marcha.');
  if (!sub.activos.includes(a.id)) return no('fuera', 'Ya no participas en esta subasta.');
  if (sub.lider === a.id) return no('lider', 'Tienes la puja más alta: no puedes retirarte.');
  sub.activos = sub.activos.filter(id => id !== a.id);
  ev.push({ type: 'retirada', id: a.id });
  // Se cierra sola cuando solo queda quien va ganando (o no queda nadie).
  if (sub.activos.length === 0 || (sub.activos.length === 1 && sub.activos[0] === sub.lider)) cerrar(ctx, s, ev);
  return undefined;
}

export function cerrarSubasta(ctx, s, a, ev) {
  if (!s.subasta) return no('sin_subasta', 'No hay ninguna subasta en marcha.');
  cerrar(ctx, s, ev);
  return undefined;
}

function cerrar(ctx, s, ev) {
  const { casilla, puja, lider } = s.subasta;
  if (lider) {
    const tiburon = pasiva(ctx, s, lider, 'cazador-de-gangas');
    const pago = tiburon ? Math.round(puja * tiburon.pago) : puja;
    transferir(s, ev, lider, 'banco', pago, 'subasta');
    s.props[casilla].dueno = lider;
    ev.push({ type: 'subastaGanada', casilla, id: lider, cantidad: pago });
  } else {
    ev.push({ type: 'subastaDesierta', casilla });
  }
  s.subasta = null;
  if (siguienteSubasta(ctx, s, ev)) return;
  if (s.turno.fase === 'quiebra') pasarTurno(ctx, s, ev);
  else seguir(ctx, s);
}
