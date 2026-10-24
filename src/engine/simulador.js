// Simula partidas completas entre bots (docs/DISENO.md, sección 10). En cada paso comprueba las reglas que se deben
// cumplir siempre:
//   - el dinero de cada jugador coincide con la suma de sus movimientos (eventos «dinero»);
//   - nadie tiene dinero negativo;
//   - nunca hay más casas, torres ni acciones de las que existen;
//   - quien quiebra no conserva nada.
// Y devuelve estadísticas para equilibrar la economía: duración, quién gana, casillas más pisadas, etc.
import { patrimonio, precioAccion, propiedadesDe } from './contexto.js';
import { accionDeRespaldo, decidirBot, quienActua } from './bots.js';
import { shuffle } from './rng.js';

function comprobarReglas(ctx, s, libro) {
  const fallos = [];
  let casas = s.banco.casas;
  let torres = s.banco.torres;
  for (const i of ctx.propiedades) {
    const p = s.props[i];
    if (p.nivel === 5) torres++;
    else casas += p.nivel;
    if (p.dueno && s.jugadores[p.dueno].quebrado) fallos.push(`la casilla ${i} es de alguien en bancarrota`);
    if (p.nivel > 0 && p.hipotecada) fallos.push(`la casilla ${i} tiene edificios y está hipotecada`);
  }
  if (casas !== ctx.eco.existencias.casas) fallos.push(`hay ${casas} casas en total (deberían ser ${ctx.eco.existencias.casas})`);
  if (torres !== ctx.eco.existencias.torres) fallos.push(`hay ${torres} torres en total (deberían ser ${ctx.eco.existencias.torres})`);
  for (const id of s.orden) {
    const j = s.jugadores[id];
    if (j.dinero < 0) fallos.push(`${id} tiene dinero negativo (${j.dinero})`);
    if ((libro[id] ?? 0) !== j.dinero) fallos.push(`el dinero de ${id} (${j.dinero}) no cuadra con sus movimientos (${libro[id] ?? 0})`);
    for (const [barrio, n] of Object.entries(j.acciones)) {
      if (!(n > 0) || n > ctx.eco.bolsa.maxPorJugador) fallos.push(`${id} tiene ${n} acciones de ${barrio}`);
    }
  }
  for (const barrio of Object.keys(ctx.barrios)) {
    const total = s.orden.reduce((n, id) => n + (s.jugadores[id].acciones[barrio] ?? 0), 0);
    if (total > ctx.eco.bolsa.acciones) fallos.push(`hay ${total} acciones de ${barrio}`);
  }
  return fallos;
}

// opciones: { semilla, fichas: [ids], sala: {opciones de la sala}, maxTurnos, comprobar, alEvento }
// Si se da alEvento(evento, estado), recibe cada evento del motor junto con el estado ya actualizado (lo usan
// herramientas como tools/relato.js).
export function simularPartida(motor, { semilla = 1, fichas, sala = {}, maxTurnos = 400, comprobar = true, alEvento } = {}) {
  const { ctx } = motor;
  let s = motor.nuevaPartida({ semilla });
  const libro = {};
  const r = {
    semilla, jugadores: fichas.length, pisadas: new Array(ctx.casillas.length).fill(0), erroresBots: [],
    subastas: 0, tratos: 0, bancarrotas: 0, habilidades: {}, acciones: 0, dinero: {},
  };
  const contar = e => {
    if (e.type === 'dinero') {
      if (e.de !== 'banco') libro[e.de] = (libro[e.de] ?? 0) - e.cantidad;
      if (e.a !== 'banco') libro[e.a] = (libro[e.a] ?? 0) + e.cantidad;
      r.dinero[e.motivo] = (r.dinero[e.motivo] ?? 0) + e.cantidad;
    }
    if (e.type === 'cae') r.pisadas[e.casilla]++;
    if (e.type === 'subasta') r.subastas++;
    if (e.type === 'tratoAceptado') r.tratos++;
    if (e.type === 'bancarrota') r.bancarrotas++;
    if (e.type === 'habilidad') r.habilidades[e.habilidad] = (r.habilidades[e.habilidad] ?? 0) + 1;
  };
  const aplicar = accion => {
    const res = motor.paso(s, accion);
    if (res.error) return res;
    s = res.state;
    res.events.forEach(contar);
    if (alEvento) for (const e of res.events) alEvento(e, s);
    if (comprobar && s.fase !== 'sala') {
      const fallos = comprobarReglas(ctx, s, libro);
      if (fallos.length) {
        throw new Error(`Semilla ${semilla}, acción ${JSON.stringify(accion)}: ${fallos.join('; ')}`);
      }
    }
    return res;
  };
  const exigir = accion => {
    const res = aplicar(accion);
    if (res.error) throw new Error(`Semilla ${semilla}: ${accion.type} falló: ${res.error.mensaje}`);
    return res;
  };

  fichas.forEach((ficha, k) => exigir({ type: 'unirse', id: `j${k + 1}`, nombre: `Bot ${k + 1}`, ficha, bot: true }));
  exigir({ type: 'configurar', opciones: sala });
  exigir({ type: 'empezar' });
  const orden = [...s.orden];
  let finPedido = false;
  while (s.fase === 'juego') {
    if (++r.acciones > 60000) throw new Error(`Semilla ${semilla}: la partida no termina`);
    if (!finPedido && s.turnos >= maxTurnos) {
      exigir({ type: 'finPorTiempo' });
      finPedido = true;
    }
    const id = quienActua(s);
    if (id === null) {
      exigir({ type: 'cerrarSubasta' });
      continue;
    }
    const accion = decidirBot(ctx, s, id);
    const res = aplicar(accion);
    if (res.error) {
      r.erroresBots.push({ accion, error: res.error.mensaje, turno: s.turnos });
      exigir(accionDeRespaldo(s, id));
    }
  }

  const ganador = s.ganador;
  const componentes = { dinero: s.jugadores[ganador].dinero, propiedades: 0, edificios: 0, acciones: 0 };
  for (const i of propiedadesDe(ctx, s, ganador)) {
    const c = ctx.casillas[i];
    componentes.propiedades += s.props[i].hipotecada ? c.precio / 2 : c.precio;
    if (c.tipo === 'calle') componentes.edificios += s.props[i].nivel * c.costeCasa;
  }
  for (const [barrio, n] of Object.entries(s.jugadores[ganador].acciones)) componentes.acciones += n * precioAccion(ctx, s, barrio);
  return {
    ...r,
    turnos: s.turnos,
    rondas: s.ronda,
    ganador,
    fichaGanadora: s.jugadores[ganador].ficha,
    asientoGanador: orden.indexOf(ganador),
    motivo: s.motivoFin,
    patrimonios: Object.fromEntries(orden.map(id => [s.jugadores[id].ficha, patrimonio(ctx, s, id)])),
    componentes,
  };
}

// Fichas distintas para cada partida, elegidas a partir de la semilla (para que cada ficha juegue en todos los
// asientos a lo largo de muchas partidas).
export function fichasParaPartida(motor, semilla, n) {
  return shuffle({ rng: (semilla * 2654435761) >>> 0 }, Object.keys(motor.ctx.fichas)).slice(0, n);
}

const media = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const percentil = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];

// Resume muchas partidas: lo que mira el informe de equilibrio.
export function informe(motor, resultados, { segundosPorTurno = 30 } = {}) {
  const { ctx } = motor;
  const n = resultados.length;
  const porcentaje = (cuenta, total = n) => Math.round((cuenta / total) * 1000) / 10;
  const turnos = resultados.map(r => r.turnos);
  const motivos = {};
  const porFicha = {};
  const porAsiento = {};
  for (const r of resultados) {
    motivos[r.motivo] = (motivos[r.motivo] ?? 0) + 1;
    for (const ficha of Object.keys(r.patrimonios)) {
      porFicha[ficha] ??= { partidas: 0, victorias: 0 };
      porFicha[ficha].partidas++;
    }
    porFicha[r.fichaGanadora].victorias++;
    porAsiento[r.asientoGanador] = (porAsiento[r.asientoGanador] ?? 0) + 1;
  }
  const pisadas = ctx.casillas.map((c, i) => ({ casilla: i, nombre: c.nombre, veces: resultados.reduce((a, r) => a + r.pisadas[i], 0) }));
  const totalPisadas = pisadas.reduce((a, p) => a + p.veces, 0);
  const ordenadas = [...pisadas].sort((a, b) => b.veces - a.veces).map(p => ({ ...p, porcentaje: porcentaje(p.veces, totalPisadas) }));
  const parteAcciones = media(resultados.map(r => {
    const c = r.componentes;
    const total = c.dinero + c.propiedades + c.edificios + c.acciones;
    return total > 0 ? c.acciones / total : 0;
  }));
  return {
    partidas: n,
    jugadores: [...new Set(resultados.map(r => r.jugadores))],
    turnos: { media: Math.round(media(turnos)), p10: percentil(turnos, 0.1), p90: percentil(turnos, 0.9) },
    rondas: Math.round(media(resultados.map(r => r.rondas)) * 10) / 10,
    minutosEstimados: Math.round((media(turnos) * segundosPorTurno) / 60),
    motivos: Object.fromEntries(Object.entries(motivos).map(([m, c]) => [m, porcentaje(c)])),
    victoriasPorAsiento: Object.fromEntries(Object.entries(porAsiento).sort().map(([a, c]) => [Number(a) + 1, porcentaje(c)])),
    victoriasPorFicha: Object.fromEntries(Object.entries(porFicha)
      .map(([f, x]) => [f, { partidas: x.partidas, victorias: porcentaje(x.victorias, x.partidas) }])
      .sort((a, b) => b[1].victorias - a[1].victorias)),
    casillasMasPisadas: ordenadas.slice(0, 5),
    casillasMenosPisadas: ordenadas.slice(-5),
    parteDelPatrimonioEnAcciones: Math.round(parteAcciones * 1000) / 10,
    porPartida: {
      subastas: Math.round(media(resultados.map(r => r.subastas)) * 10) / 10,
      tratos: Math.round(media(resultados.map(r => r.tratos)) * 10) / 10,
      bancarrotas: Math.round(media(resultados.map(r => r.bancarrotas)) * 10) / 10,
    },
    erroresDeBots: resultados.reduce((a, r) => a + r.erroresBots.length, 0),
  };
}
