// Bots: jugadores que deciden solos. Sirven para el modo demostración, para rellenar sillas y para el simulador que
// equilibra la economía. Son sencillos a propósito: juegan de forma razonable, sin estrategias rebuscadas.
//   quienActua(s)            → id del jugador que tiene que decidir ahora (o null)
//   decidirBot(ctx, s, id)   → la acción que elige ese jugador
import {
  accionesDisponibles, activa, alquiler, barrioCompleto, costeConstruir, costeDeshipotecar, distancia, nivelesBarrio,
  pasiva, patrimonio, precioAccion, propiedadesDe, siguiente,
} from './contexto.js';
import { pujaMinima } from './subasta.js';

const reserva = s => Math.min(400, 150 + 8 * s.ronda);
const activosDe = s => s.orden.filter(id => !s.jugadores[id].quebrado);

// --- Quién decide ahora ------------------------------------------------------------------------------

// En una subasta pregunta, en orden de juego a partir de quien va ganando, al primero que puede pujar. Si nadie
// puede, devuelve null: el tablero tiene que cerrar la subasta.
export function quienActua(s) {
  if (s.fase !== 'juego') return null;
  if (s.subasta) {
    const { activos, lider } = s.subasta;
    const n = s.orden.length;
    const desde = lider ? s.orden.indexOf(lider) + 1 : 0;
    for (let k = 0; k < n; k++) {
      const id = s.orden[(desde + k) % n];
      if (id !== lider && activos.includes(id)) return id;
    }
    return null;
  }
  if (s.deudas.length) return s.deudas[0].id;
  const trato = Object.values(s.tratos)[0];
  if (trato) return trato.para;
  return s.turno.id;
}

export function decidirBot(ctx, s, id) {
  if (s.subasta) return decidirSubasta(ctx, s, id);
  if (s.deudas[0]?.id === id) return decidirDeuda(ctx, s, id);
  const trato = Object.values(s.tratos).find(t => t.para === id);
  if (trato) return responderTrato(ctx, s, id, trato);
  if (s.turno.id === id) return decidirTurno(ctx, s, id);
  return null;
}

// Lo que haría un bot si su acción elegida falla (no debería pasar: las pruebas cuentan estos fallos).
export function accionDeRespaldo(s, id) {
  if (s.subasta) return { type: 'retirarse', id };
  if (s.deudas[0]?.id === id) return { type: 'declararBancarrota', id };
  const trato = Object.values(s.tratos).find(t => t.para === id);
  if (trato) return { type: 'rechazarTrato', id, trato: trato.id };
  if (s.turno.compra != null) return { type: 'noComprar', id };
  return { type: s.turno.fase === 'inicio' ? 'tirar' : 'terminarTurno', id };
}

// --- Valorar propiedades ----------------------------------------------------------------------------------

const callesDe = (ctx, s, barrio, id) => ctx.barrios[barrio].calles.filter(k => s.props[k].dueno === id).length;

// Cuánto vale para «id» quedarse con la propiedad i: más si completa su barrio o si impide que otro complete el suyo.
function valorParaMi(ctx, s, id, i) {
  const c = ctx.casillas[i];
  let valor = c.precio;
  if (c.tipo === 'calle') {
    const calles = ctx.barrios[c.barrio].calles;
    const mias = callesDe(ctx, s, c.barrio, id);
    if (mias === calles.length - 1) valor *= 1.8;
    else if (mias > 0) valor *= 1.25;
    for (const otro of activosDe(s)) {
      if (otro !== id && callesDe(ctx, s, c.barrio, otro) === calles.length - 1) valor *= 1.4;
    }
  } else if (c.tipo === 'transporte') {
    valor *= 1 + 0.25 * ctx.transportes.filter(k => s.props[k].dueno === id).length;
  }
  return Math.round(valor);
}

// Cuánto pierde «id» si entrega la propiedad i a «otro»: más si con ella el otro completa su barrio.
function valorDePerder(ctx, s, id, otro, i) {
  const c = ctx.casillas[i];
  let valor = c.precio * 1.1;
  if (c.tipo === 'calle' && callesDe(ctx, s, c.barrio, otro) === ctx.barrios[c.barrio].calles.length - 1) valor *= 1.6;
  if (c.tipo === 'calle' && barrioCompleto(ctx, s, c.barrio, id)) valor *= 2;
  return Math.round(valor);
}

// --- Subastas, deudas y tratos -------------------------------------------------------------------------

// Un número entre 0 y 1 que depende del momento de la partida, del jugador y de la casilla, sin gastar el azar del
// estado. Así cada bot valora cada subasta a su manera, como haría una persona, y no se plantan todos en la misma cifra
// (con valoraciones idénticas, quien gana los empates, el Tiburón, se llevaría casi todas las subastas).
function capricho(s, id, casilla) {
  let h = (s.rng ^ Math.imul(casilla + 1, 0x9e3779b1)) >>> 0;
  for (const letra of id) h = Math.imul(h ^ letra.charCodeAt(0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

function decidirSubasta(ctx, s, id) {
  const sub = s.subasta;
  const j = s.jugadores[id];
  const minima = pujaMinima(ctx, s, id);
  // Entre el 86 y el 104 % de lo que vale para él (el 95 % de media).
  const aprecio = 0.86 + 0.18 * capricho(s, id, sub.casilla);
  const maxima = Math.min(j.dinero - 20, Math.round(valorParaMi(ctx, s, id, sub.casilla) * aprecio));
  if (minima > maxima) return { type: 'retirarse', id };
  const salto = Math.max(10, Math.round((maxima - sub.puja) / 40) * 10);
  return { type: 'pujar', id, cantidad: Math.max(minima, Math.min(maxima, sub.puja + salto)) };
}

function decidirDeuda(ctx, s, id) {
  const j = s.jugadores[id];
  const falta = s.deudas[0].cantidad - j.dinero;
  const paquete = ctx.eco.bolsa.paquete;
  // 1. Vender acciones.
  const barrioAcciones = Object.keys(j.acciones).sort((a, b) => j.acciones[b] - j.acciones[a])[0];
  if (barrioAcciones) {
    const porAccion = Math.max(1, Math.floor(precioAccion(ctx, s, barrioAcciones) * ctx.eco.bolsa.recompra));
    const necesarias = Math.ceil(falta / porAccion / paquete) * paquete;
    return { type: 'venderAcciones', id, barrio: barrioAcciones, cantidad: Math.min(j.acciones[barrioAcciones], necesarias) };
  }
  const mias = propiedadesDe(ctx, s, id);
  const sinEdificios = i => ctx.casillas[i].tipo !== 'calle' || nivelesBarrio(ctx, s, ctx.casillas[i].barrio).every(n => n === 0);
  // 2. Hipotecar lo que no tiene edificios (primero lo que no forma un barrio completo).
  const hipotecables = mias.filter(i => !s.props[i].hipotecada && sinEdificios(i)).sort((a, b) => {
    const completo = i => (ctx.casillas[i].tipo === 'calle' && barrioCompleto(ctx, s, ctx.casillas[i].barrio, id) ? 1 : 0);
    return completo(a) - completo(b) || ctx.casillas[a].precio - ctx.casillas[b].precio;
  });
  if (hipotecables.length) return { type: 'hipotecar', id, casilla: hipotecables[0] };
  // 3. Vender edificios, de forma pareja (la calle con más edificios del barrio).
  const conEdificios = mias.filter(i => s.props[i].nivel > 0 && s.props[i].nivel === Math.max(...nivelesBarrio(ctx, s, ctx.casillas[i].barrio)));
  if (conEdificios.length) return { type: 'venderEdificio', id, casilla: conEdificios[0] };
  return { type: 'declararBancarrota', id };
}

function valorDeParte(ctx, s, parte, quien, otro, recibo) {
  let total = parte.dinero + parte.salvoconductos * 50;
  for (const i of parte.propiedades) total += recibo ? valorParaMi(ctx, s, quien, i) : valorDePerder(ctx, s, quien, otro, i);
  for (const [barrio, n] of Object.entries(parte.acciones)) total += n * precioAccion(ctx, s, barrio);
  return total;
}

function responderTrato(ctx, s, id, t) {
  const recibo = valorDeParte(ctx, s, t.ofrece, id, t.de, true);
  const doy = valorDeParte(ctx, s, t.pide, id, t.de, false);
  const puedoPagar = t.pide.dinero <= s.jugadores[id].dinero;
  return { type: recibo >= doy && puedoPagar ? 'aceptarTrato' : 'rechazarTrato', id, trato: t.id };
}

// Propone, de vez en cuando, comprar la calle que le falta para completar un barrio.
function decidirTrato(ctx, s, id) {
  if (s.turno.tratosPropuestos > 0 || s.ronda % 3 !== 0) return null;
  const j = s.jugadores[id];
  for (const barrio of Object.keys(ctx.barrios)) {
    const calles = ctx.barrios[barrio].calles;
    if (callesDe(ctx, s, barrio, id) !== calles.length - 1) continue;
    const falta = calles.find(i => s.props[i].dueno !== id);
    const dueno = s.props[falta].dueno;
    if (!dueno || s.props[falta].nivel > 0) continue;
    const precio = ctx.casillas[falta].precio;
    const oferta = Math.min(j.dinero - reserva(s), Math.round(precio * 1.9 / 10) * 10);
    if (oferta < precio * 1.3) continue;
    return { type: 'proponerTrato', id, para: dueno, ofrece: { dinero: oferta }, pide: { propiedades: [falta] } };
  }
  return null;
}

// --- El turno ---------------------------------------------------------------------------------------

function decidirTurno(ctx, s, id) {
  const t = s.turno;
  const j = s.jugadores[id];
  if (t.compra != null) {
    const precio = ctx.casillas[t.compra].precio;
    const valor = valorParaMi(ctx, s, id, t.compra);
    if (j.dinero >= precio && (j.dinero - precio >= reserva(s) || valor >= precio * 1.5)) return { type: 'comprar', id };
    const prestamo = usarPrestamo(ctx, s, id, precio - j.dinero, valor >= precio * 1.5);
    if (prestamo) return prestamo;
    return { type: 'noComprar', id };
  }
  if (t.fase === 'inicio') {
    if (j.calabozo) {
      if (j.salvoconductos) return { type: 'usarSalvoconducto', id };
      if (j.dinero >= ctx.eco.fianza + 400 && s.ronda < 15) return { type: 'pagarFianza', id };
    }
    return habilidadAntesDeTirar(ctx, s, id) ?? { type: 'tirar', id };
  }
  return habilidadDespuesDeTirar(ctx, s, id)
    ?? decidirAcciones(ctx, s, id)
    ?? decidirConstruir(ctx, s, id)
    ?? decidirDeshipotecar(ctx, s, id)
    ?? decidirTrato(ctx, s, id)
    ?? { type: 'terminarTurno', id };
}

function decidirConstruir(ctx, s, id) {
  const j = s.jugadores[id];
  const barrios = Object.keys(ctx.barrios)
    .filter(b => barrioCompleto(ctx, s, b, id) && ctx.barrios[b].calles.every(i => !s.props[i].hipotecada))
    .sort((a, b) => ctx.casillas[ctx.barrios[b].calles[0]].alquilerBase - ctx.casillas[ctx.barrios[a].calles[0]].alquilerBase);
  for (const b of barrios) {
    const niveles = nivelesBarrio(ctx, s, b);
    const minimo = Math.min(...niveles);
    if (minimo >= 5) continue;
    const i = ctx.barrios[b].calles.find(k => s.props[k].nivel === minimo);
    const hay = minimo === 4 ? s.banco.torres > 0 : s.banco.casas > 0;
    if (hay && j.dinero - costeConstruir(ctx, s, id, i) >= reserva(s)) return { type: 'construir', id, casilla: i };
  }
  return null;
}

function decidirDeshipotecar(ctx, s, id) {
  const j = s.jugadores[id];
  const hipotecadas = propiedadesDe(ctx, s, id).filter(i => s.props[i].hipotecada).sort((a, b) => costeDeshipotecar(ctx, a) - costeDeshipotecar(ctx, b));
  if (hipotecadas.length && j.dinero - costeDeshipotecar(ctx, hipotecadas[0]) >= reserva(s) + 300) {
    return { type: 'deshipotecar', id, casilla: hipotecadas[0] };
  }
  return null;
}

// Invierte en la Bolsa cuando puede y le sobra dinero: en los barrios más construidos. Quien juega con el Toro (cobra
// más dividendos) invierte un poco más.
function decidirAcciones(ctx, s, id) {
  if (!s.opciones.mercado) return null;
  const j = s.jugadores[id];
  const paquete = ctx.eco.bolsa.paquete;
  const inversor = pasiva(ctx, s, id, 'optimista');
  const tope = inversor ? 30 : 25;
  if (!s.turno.bolsaAbierta || j.dinero < reserva(s) + (inversor ? 300 : 400)) return null;
  const barrios = Object.keys(ctx.barrios)
    .map(b => ({ b, nivel: nivelesBarrio(ctx, s, b).reduce((x, y) => x + y, 0), precio: precioAccion(ctx, s, b) }))
    .filter(x => (j.acciones[x.b] ?? 0) < tope && accionesDisponibles(ctx, s, x.b) >= paquete)
    .sort((x, y) => y.nivel - x.nivel || x.precio - y.precio);
  const elegido = barrios[0];
  if (elegido && j.dinero - elegido.precio * paquete >= reserva(s) + (inversor ? 200 : 300)) {
    return { type: 'comprarAcciones', id, barrio: elegido.b, cantidad: paquete };
  }
  return null;
}

// --- Habilidades -------------------------------------------------------------------------------------------

const lista = (ctx, s, id) => {
  const hab = activa(ctx, s, id);
  return hab && !s.turno.habilidadUsada && s.jugadores[id].hab.enfriamiento === 0 ? hab : null;
};

function usarPrestamo(ctx, s, id, falta, merece) {
  const hab = lista(ctx, s, id);
  if (!hab || hab.id !== 'prestamo-expres' || !merece || s.jugadores[id].hab.prestamo) return null;
  const cantidad = Math.ceil((falta + 100) / 10) * 10;
  return cantidad <= hab.maximo ? { type: 'usarHabilidad', id, cantidad } : null;
}

// El mayor alquiler que podría pagar en las próximas casillas (de 2 a 12 pasos).
function peligroDelante(ctx, s, id) {
  let i = s.jugadores[id].casilla;
  let peor = 0;
  for (let paso = 1; paso <= 12; paso++) {
    i = siguiente(ctx, i);
    const p = s.props[i];
    if (paso >= 2 && p?.dueno && p.dueno !== id && !p.hipotecada) peor = Math.max(peor, alquiler(ctx, s, i, [3, 4]));
  }
  return peor;
}

function habilidadAntesDeTirar(ctx, s, id) {
  const hab = lista(ctx, s, id);
  if (!hab || s.jugadores[id].calabozo) return null;
  if (hab.id === 'esprint') return { type: 'usarHabilidad', id };
  if (hab.id === 'hibernar' && !s.turno.dados && peligroDelante(ctx, s, id) >= 300) return { type: 'usarHabilidad', id };
  return null;
}

function habilidadDespuesDeTirar(ctx, s, id) {
  const hab = lista(ctx, s, id);
  if (!hab) return null;
  const j = s.jugadores[id];
  const rivales = activosDe(s).filter(k => k !== id && k !== j.hab.ultimoObjetivo);
  const mias = propiedadesDe(ctx, s, id);
  switch (hab.id) {
    case 'rally': {
      // Lo guarda para el final: subir sus acciones justo cuando eso le basta para llegar a la meta antes de la Salida.
      if (!s.opciones.mercado || !s.opciones.meta || distancia(ctx, j.casilla, ctx.salida) > 12) return null;
      const actual = patrimonio(ctx, s, id);
      const barrio = Object.keys(j.acciones).sort((a, b) => j.acciones[b] * precioAccion(ctx, s, b) - j.acciones[a] * precioAccion(ctx, s, a))[0];
      if (!barrio || actual >= s.opciones.meta) return null;
      const subida = j.acciones[barrio] * precioAccion(ctx, s, barrio) * (hab.factor - 1);
      return actual + subida >= s.opciones.meta ? { type: 'usarHabilidad', id, barrio } : null;
    }
    case 'inflar': {
      const calles = mias.filter(i => ctx.casillas[i].tipo === 'calle' && !s.props[i].hipotecada)
        .sort((a, b) => alquiler(ctx, s, b) - alquiler(ctx, s, a));
      return calles.length && alquiler(ctx, s, calles[0]) >= 40 ? { type: 'usarHabilidad', id, casilla: calles[0] } : null;
    }
    case 'temporada-alta':
      return mias.length >= 4 ? { type: 'usarHabilidad', id } : null;
    case 'hormiguero':
      return mias.filter(i => ctx.casillas[i].tipo === 'calle').length >= 3 ? { type: 'usarHabilidad', id } : null;
    case 'obras-eternas': {
      const objetivo = ctx.propiedades
        .filter(i => ctx.casillas[i].tipo === 'calle' && rivales.includes(s.props[i].dueno) && !s.props[i].hipotecada)
        .sort((a, b) => alquiler(ctx, s, b) - alquiler(ctx, s, a))[0];
      return objetivo != null && alquiler(ctx, s, objetivo) >= 100 ? { type: 'usarHabilidad', id, casilla: objetivo } : null;
    }
    case 'frenesi': {
      const libres = ctx.propiedades.filter(i => !s.props[i].dueno).length;
      const rico = [...rivales].sort((a, b) => patrimonio(ctx, s, b) - patrimonio(ctx, s, a))[0];
      return rico && libres >= 6 ? { type: 'usarHabilidad', id, objetivo: rico } : null;
    }
    case 'imprevisto': {
      const lider = [...rivales].sort((a, b) => patrimonio(ctx, s, b) - patrimonio(ctx, s, a))[0];
      return lider && patrimonio(ctx, s, lider) > patrimonio(ctx, s, id) ? { type: 'usarHabilidad', id, objetivo: lider } : null;
    }
    default:
      return null;
  }
}
