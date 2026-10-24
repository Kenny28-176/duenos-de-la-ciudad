// Los mazos Noticias y Fortuna (src/data/cartas.json). La carta robada vuelve al fondo de su mazo, salvo el
// salvoconducto, que se queda quien lo roba hasta usarlo. El Cisne Negro (Antifrágil) paga menos y cobra más en las
// cartas que le cobran o le pagan desde el banco (las cifras están en src/data/fichas.json).
import { accionesDisponibles, pasiva, patrimonio, precioAccion, propiedadesDe, siguiente, valorBarrio } from './contexto.js';
import { cargar, cobrar, transferir } from './dinero.js';
import { pick } from './rng.js';
import { activos, irAlCalabozo, moverHasta, retroceder } from './turno.js';

// Ajuste de Antifrágil a un importe de carta entre el banco y el jugador.
function antifragil(ctx, s, id, cantidad, sentido) {
  const cisne = pasiva(ctx, s, id, 'antifragil');
  return cisne ? Math.round(cantidad * cisne[sentido]) : cantidad;
}

const costeReparaciones = (ctx, s, id, casa, torre) =>
  propiedadesDe(ctx, s, id).reduce((total, i) => {
    const nivel = s.props[i].nivel;
    return total + (nivel === 5 ? torre : nivel * casa);
  }, 0);

export function robarCarta(ctx, s, ev, id, mazo) {
  const cartaId = s.mazos[mazo].shift();
  const carta = ctx.cartas[cartaId];
  if (carta.efecto.tipo !== 'salvoconducto') s.mazos[mazo].push(cartaId);
  const detalle = {};
  const e = carta.efecto;
  if (e.tipo === 'valorBarrio') detalle.barrio = pick(s, Object.keys(ctx.barrios));
  if (e.tipo === 'accionesBaratas') {
    const j = s.jugadores[id];
    const posibles = Object.keys(ctx.barrios).filter(b =>
      accionesDisponibles(ctx, s, b) >= e.cantidad && (j.acciones[b] ?? 0) + e.cantidad <= ctx.eco.bolsa.maxPorJugador);
    detalle.barrio = posibles.length ? pick(s, posibles) : null;
  }
  ev.push({ type: 'carta', id, mazo, carta: cartaId, ...detalle });
  aplicarCarta(ctx, s, ev, id, e, detalle);
}

function aplicarCarta(ctx, s, ev, id, e, detalle) {
  const j = s.jugadores[id];
  const otros = activos(s).filter(k => k !== id);
  switch (e.tipo) {
    case 'cobrar':
      return cobrar(s, ev, id, antifragil(ctx, s, id, e.cantidad, 'cobra'), 'carta');
    case 'pagar':
      return cargar(s, ev, id, 'banco', antifragil(ctx, s, id, e.cantidad, 'paga'), 'carta');
    case 'todosCobran':
      for (const k of activos(s)) cobrar(s, ev, k, antifragil(ctx, s, k, e.cantidad, 'cobra'), 'carta');
      return undefined;
    case 'todosPagan':
      for (const k of activos(s)) cargar(s, ev, k, 'banco', antifragil(ctx, s, k, e.cantidad, 'paga'), 'carta');
      return undefined;
    case 'cobrarDeCadaJugador':
      for (const k of otros) cargar(s, ev, k, id, e.cantidad, 'carta');
      return undefined;
    case 'pagarACadaJugador':
      for (const k of otros) cargar(s, ev, id, k, e.cantidad, 'carta');
      return undefined;
    case 'moverA':
      return moverHasta(ctx, s, ev, id, e.casilla);
    case 'avanzarATipo': {
      let destino = j.casilla;
      do destino = siguiente(ctx, destino); while (ctx.casillas[destino].tipo !== e.casilla);
      return moverHasta(ctx, s, ev, id, destino);
    }
    case 'retroceder':
      return retroceder(ctx, s, ev, id, e.casillas);
    case 'irCalabozo':
      return irAlCalabozo(ctx, s, ev, id, 'carta');
    case 'salvoconducto':
      j.salvoconductos++;
      return undefined;
    case 'reparaciones':
      return cargar(s, ev, id, 'banco', antifragil(ctx, s, id, costeReparaciones(ctx, s, id, e.casa, e.torre), 'paga'), 'carta');
    case 'reparacionesTodos':
      for (const k of activos(s)) {
        cargar(s, ev, k, 'banco', antifragil(ctx, s, k, costeReparaciones(ctx, s, k, e.casa, e.torre), 'paga'), 'carta');
      }
      return undefined;
    case 'valorBarrio':
      s.bolsa[detalle.barrio].ajuste += e.cantidad;
      return undefined;
    case 'valorTodos':
      for (const b of Object.keys(ctx.barrios)) s.bolsa[b].ajuste += Math.round(valorBarrio(ctx, s, b) * e.porcentaje);
      return undefined;
    case 'dividendoExtra':
      for (const k of activos(s)) {
        const factor = pasiva(ctx, s, k, 'optimista')?.factor ?? 1;
        const acciones = Object.values(s.jugadores[k].acciones).reduce((a, n) => a + n, 0);
        cobrar(s, ev, k, Math.round(acciones * e.porAccion * factor), 'dividendo');
      }
      return undefined;
    case 'accionesBaratas': {
      if (!detalle.barrio) return undefined;
      const coste = Math.round(precioAccion(ctx, s, detalle.barrio) * 0.5) * e.cantidad;
      if (j.dinero < coste) return undefined;
      transferir(s, ev, id, 'banco', coste, 'acciones');
      j.acciones[detalle.barrio] = (j.acciones[detalle.barrio] ?? 0) + e.cantidad;
      ev.push({ type: 'accionesCompradas', id, barrio: detalle.barrio, cantidad: e.cantidad, coste });
      return undefined;
    }
    case 'cobraElMasPobre': {
      let pobre = null;
      for (const k of activos(s)) if (pobre === null || patrimonio(ctx, s, k) < patrimonio(ctx, s, pobre)) pobre = k;
      ev.push({ type: 'masPobre', id: pobre });
      return cobrar(s, ev, pobre, antifragil(ctx, s, pobre, e.cantidad, 'cobra'), 'carta');
    }
    case 'pagarPorHipotecada': {
      const n = propiedadesDe(ctx, s, id).filter(i => s.props[i].hipotecada).length;
      return cargar(s, ev, id, 'banco', antifragil(ctx, s, id, n * e.cantidad, 'paga'), 'carta');
    }
    default:
      throw new Error(`Efecto de carta desconocido: ${e.tipo}`);
  }
}
