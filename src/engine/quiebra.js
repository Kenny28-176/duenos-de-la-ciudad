// Bancarrota (docs/DISENO.md, «Deudas y bancarrota»): si quien debe no reúne el dinero, quiebra y sale de la partida.
//   - Si debía a un jugador, este recibe su dinero (los edificios se venden antes al banco), sus propiedades, sus
//     acciones (hasta el máximo por jugador) y sus salvoconductos.
//   - Si debía al banco, sus propiedades vuelven a estar libres y se subastan, y sus acciones vuelven al banco.
import { propiedadesDe } from './contexto.js';
import { cobrar, transferir } from './dinero.js';
import { iniciarSubasta } from './subasta.js';
import { quitarTratosDe } from './tratos.js';
import { activos, pasarTurno, terminar } from './turno.js';

export function quebrar(ctx, s, ev, id, acreedor) {
  const j = s.jugadores[id];
  const props = propiedadesDe(ctx, s, id);
  for (const i of props) {
    const p = s.props[i];
    if (!p.nivel) continue;
    if (p.nivel === 5) s.banco.torres++;
    else s.banco.casas += p.nivel;
    cobrar(s, ev, id, Math.round(p.nivel * ctx.casillas[i].costeCasa * ctx.eco.ventaEdificios), 'venta-edificios');
    p.nivel = 0;
  }
  transferir(s, ev, id, acreedor, j.dinero, 'bancarrota');
  if (acreedor === 'banco') {
    for (const i of props) s.props[i] = { dueno: null, nivel: 0, hipotecada: false };
    for (let k = 0; k < j.salvoconductos; k++) s.mazos.fortuna.push(ctx.salvoconducto);
  } else {
    const otro = s.jugadores[acreedor];
    for (const i of props) s.props[i].dueno = acreedor;
    for (const [barrio, n] of Object.entries(j.acciones)) {
      const caben = Math.min(n, ctx.eco.bolsa.maxPorJugador - (otro.acciones[barrio] ?? 0));
      if (caben > 0) otro.acciones[barrio] = (otro.acciones[barrio] ?? 0) + caben;
    }
    otro.salvoconductos += j.salvoconductos;
  }
  Object.assign(j, { quebrado: true, acciones: {}, salvoconductos: 0, marcado: false, pierdeTurno: false, calabozo: null });
  j.hab.prestamo = null;
  s.deudas = s.deudas.filter(d => d.id !== id && d.acreedor !== id);
  s.efectos = s.efectos.filter(e => e.jugador !== id && e.hasta !== id && e.finTurnoDe !== id);
  delete s.enRacha[id];
  quitarTratosDe(s, id);
  ev.push({ type: 'bancarrota', id, acreedor });

  const quedan = activos(s);
  if (quedan.length === 1) return terminar(ctx, s, ev, quedan[0], 'bancarrota');
  const suTurno = s.turno.id === id;
  if (suTurno) s.turno.fase = 'quiebra';
  if (acreedor === 'banco' && props.length) iniciarSubasta(ctx, s, ev, props, 'bancarrota');
  if (suTurno && !s.subasta) pasarTurno(ctx, s, ev);
  return undefined;
}
