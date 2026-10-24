// Prepara los datos para el motor y hace los cálculos de la economía (docs/DISENO.md, secciones 3 y 4).
// Los precios, alquileres y costes salen de fórmulas con los parámetros de src/data/economia.json, para que el
// simulador pueda ajustarlos todos a la vez. Aquí también están los cálculos que dependen del estado de la partida:
// valor de un barrio, precio de una acción, alquiler de una casilla y patrimonio de un jugador.

export const redondear = (x, a = 1) => Math.round(x / a) * a;
export const TIPOS_PROPIEDAD = ['calle', 'transporte', 'servicio'];
export const MIN_JUGADORES = 2;
export const MAX_JUGADORES = 8;
const JUGADORES_DE_REFERENCIA = 4; // las cifras normales de las habilidades son las de las partidas de 4

// Las cifras de una habilidad en una partida de «n» jugadores. «porJugadores» da, para algunos campos, una lista con un
// valor por cada número de jugadores (de 2 a 8); el de 4 tiene que coincidir con el campo normal.
function cifrasPara(habilidad, n) {
  if (!habilidad.porJugadores) return habilidad;
  const { porJugadores, ...cifras } = habilidad;
  for (const [campo, valores] of Object.entries(porJugadores)) cifras[campo] = valores[n - MIN_JUGADORES];
  return cifras;
}

function comprobarPorJugadores(ficha, habilidad) {
  for (const [campo, valores] of Object.entries(habilidad.porJugadores ?? {})) {
    const donde = `${ficha.id}, ${habilidad.id}, ${campo}`;
    if (!(campo in habilidad)) throw new Error(`porJugadores cambia un campo que no existe (${donde})`);
    const largo = MAX_JUGADORES - MIN_JUGADORES + 1;
    if (!Array.isArray(valores) || valores.length !== largo || !valores.every(v => typeof v === 'number' && v > 0)) {
      throw new Error(`porJugadores necesita ${largo} números positivos, de ${MIN_JUGADORES} a ${MAX_JUGADORES} jugadores (${donde})`);
    }
    if (valores[JUGADORES_DE_REFERENCIA - MIN_JUGADORES] !== habilidad[campo]) {
      throw new Error(`porJugadores no coincide con el valor normal en las partidas de ${JUGADORES_DE_REFERENCIA} (${donde})`);
    }
  }
}

export function prepararContexto({ tablero, economia, fichas, cartas }) {
  const eco = economia;
  const casillas = tablero.casillas.map((c, i) => ({ ...c, i }));
  const barrios = {};
  for (const b of tablero.barrios) barrios[b.id] = { ...b, calles: [] };
  for (const c of casillas) if (c.tipo === 'calle') barrios[c.barrio].calles.push(c.i);
  for (const b of Object.values(barrios)) {
    const ultima = Math.max(...b.calles);
    for (const i of b.calles) {
      const c = casillas[i];
      const bruto = eco.precio.base + eco.precio.porCasilla * i;
      c.precio = redondear(i === ultima ? bruto * (1 + eco.precio.recargoUltima) : bruto, eco.precio.redondeo);
      c.alquilerBase = Math.round(c.precio * eco.alquiler.base);
    }
    const masCara = Math.max(...b.calles.map(i => casillas[i].precio));
    for (const i of b.calles) casillas[i].costeCasa = redondear(masCara * eco.costeCasa, eco.precio.redondeo);
  }
  for (const c of casillas) {
    if (c.tipo === 'transporte') c.precio = eco.precioTransporte;
    if (c.tipo === 'servicio') c.precio = eco.precioServicio;
  }
  const deTipo = tipo => casillas.filter(c => c.tipo === tipo).map(c => c.i);
  const todasLasCartas = [...cartas.noticias.map(c => ({ ...c, mazo: 'noticias' })), ...cartas.fortuna.map(c => ({ ...c, mazo: 'fortuna' }))];
  for (const f of fichas.fichas) for (const h of [f.pasiva, f.activa]) comprobarPorJugadores(f, h);
  const fichasPorJugadores = {};
  for (let n = MIN_JUGADORES; n <= MAX_JUGADORES; n++) {
    fichasPorJugadores[n] = Object.fromEntries(fichas.fichas.map(f => [f.id, { ...f, pasiva: cifrasPara(f.pasiva, n), activa: cifrasPara(f.activa, n) }]));
  }
  return {
    eco,
    casillas,
    barrios,
    propiedades: casillas.filter(c => TIPOS_PROPIEDAD.includes(c.tipo)).map(c => c.i),
    transportes: deTipo('transporte'),
    servicios: deTipo('servicio'),
    salida: deTipo('salida')[0],
    calabozo: deTipo('calabozo')[0],
    fichas: Object.fromEntries(fichas.fichas.map(f => [f.id, f])),
    fichasPorJugadores,
    cartas: Object.fromEntries(todasLasCartas.map(c => [c.id, c])),
    mazos: { noticias: cartas.noticias.map(c => c.id), fortuna: cartas.fortuna.map(c => c.id) },
    salvoconducto: todasLasCartas.find(c => c.efecto.tipo === 'salvoconducto')?.id,
  };
}

// --- El tablero como grafo ----------------------------------------------------------------------

export const siguiente = (ctx, i) => ctx.casillas[i].siguiente ?? (i + 1) % ctx.casillas.length;
export const anterior = (ctx, i) => (i - 1 + ctx.casillas.length) % ctx.casillas.length;

// Pasos hacia delante desde «desde» hasta «hasta» (una vuelta entera si son la misma casilla).
export function distancia(ctx, desde, hasta) {
  let i = desde;
  for (let pasos = 1; pasos <= ctx.casillas.length; pasos++) {
    i = siguiente(ctx, i);
    if (i === hasta) return pasos;
  }
  return ctx.casillas.length;
}

// --- Habilidades de las fichas ---------------------------------------------------------------------

// La ficha de un jugador con las cifras de sus habilidades para el número de jugadores de la partida.
export function fichaEnPartida(ctx, s, id) {
  const ficha = s.jugadores[id]?.ficha;
  return (ctx.fichasPorJugadores[s.orden.length] ?? ctx.fichas)[ficha];
}

// La pasiva de un jugador si es «habilidad» y la sala juega con habilidades; si no, null.
export function pasiva(ctx, s, id, habilidad) {
  if (!s.opciones.habilidades) return null;
  const p = fichaEnPartida(ctx, s, id)?.pasiva;
  return p?.id === habilidad ? p : null;
}

export function activa(ctx, s, id) {
  return s.opciones.habilidades ? fichaEnPartida(ctx, s, id)?.activa ?? null : null;
}

// --- Propiedades ----------------------------------------------------------------------------------

export const propiedadesDe = (ctx, s, id) => ctx.propiedades.filter(i => s.props[i].dueno === id);

export const barrioCompleto = (ctx, s, barrio, id) => ctx.barrios[barrio].calles.every(i => s.props[i].dueno === id);

export const nivelesBarrio = (ctx, s, barrio) => ctx.barrios[barrio].calles.map(i => s.props[i].nivel);

export const barrioSinEdificios = (ctx, s, barrio) => nivelesBarrio(ctx, s, barrio).every(n => n === 0);

// Lo que cuesta construir un nivel (casa o torre) en una calle: el Elefante Blanco tiene descuento.
export function costeConstruir(ctx, s, id, i) {
  const coste = ctx.casillas[i].costeCasa;
  const elefante = pasiva(ctx, s, id, 'constructora');
  return elefante ? Math.round(coste * (1 - elefante.descuento)) : coste;
}

export const valorHipoteca = (ctx, i) => Math.round(ctx.casillas[i].precio * ctx.eco.hipoteca);
export const costeDeshipotecar = (ctx, i) => Math.round(valorHipoteca(ctx, i) * (1 + ctx.eco.interesHipoteca));

// Alquiler que se paga al caer en una propiedad con dueño, con los efectos de las habilidades.
export function alquiler(ctx, s, i, dados = [0, 0]) {
  const c = ctx.casillas[i];
  const p = s.props[i];
  const eco = ctx.eco;
  let monto;
  if (c.tipo === 'calle') {
    monto = c.alquilerBase * eco.alquiler.multiplicadores[p.nivel];
    if (p.nivel === 0 && barrioCompleto(ctx, s, c.barrio, p.dueno)) monto *= eco.alquiler.barrioCompleto;
  } else if (c.tipo === 'transporte') {
    monto = eco.transportes[ctx.transportes.filter(k => s.props[k].dueno === p.dueno).length - 1];
  } else {
    const n = ctx.servicios.filter(k => s.props[k].dueno === p.dueno).length;
    monto = (dados[0] + dados[1]) * eco.servicios[n - 1];
  }
  for (const e of s.efectos) {
    if ((e.tipo === 'inflada' || e.tipo === 'estallada') && e.casilla === i) monto *= e.factor;
    if (e.tipo === 'temporada' && e.jugador === p.dueno) monto *= e.factor;
  }
  return Math.round(monto);
}

// --- La Bolsa --------------------------------------------------------------------------------------

// Valor de un barrio: sus calles (tengan dueño o no), la mitad de lo que costaron sus edificios, menos la mitad de las
// calles hipotecadas, más los cambios de las cartas de Noticias.
export function valorBarrio(ctx, s, barrio) {
  let valor = s.bolsa[barrio].ajuste;
  for (const i of ctx.barrios[barrio].calles) {
    const c = ctx.casillas[i];
    const p = s.props[i];
    valor += c.precio + p.nivel * c.costeCasa * ctx.eco.ventaEdificios;
    if (p.hipotecada) valor -= c.precio * ctx.eco.hipoteca;
  }
  return valor;
}

export function precioAccion(ctx, s, barrio) {
  let precio = Math.max(1, Math.round(valorBarrio(ctx, s, barrio) / ctx.eco.bolsa.divisor));
  for (const e of s.efectos) if (e.tipo === 'rally' && e.barrio === barrio) precio = Math.round(precio * e.factor);
  return precio;
}

export function accionesDisponibles(ctx, s, barrio) {
  const emitidas = s.orden.reduce((n, id) => n + (s.jugadores[id].acciones[barrio] ?? 0), 0);
  return ctx.eco.bolsa.acciones - emitidas;
}

// --- Patrimonio -------------------------------------------------------------------------------------

// Dinero + propiedades (la mitad si están hipotecadas) + edificios (lo que costaron) + acciones (a su precio) − lo que
// debe del Préstamo exprés. Para la meta ({ paraMeta: true }), la Burbuja cuenta sus calles un poco más (Valor
// inflado); en todo lo demás (lo que ven los demás, el impuesto) cuenta el valor real.
export function patrimonio(ctx, s, id, { paraMeta = false } = {}) {
  const j = s.jugadores[id];
  if (j.quebrado) return 0;
  const burbuja = paraMeta && pasiva(ctx, s, id, 'valor-inflado');
  let total = j.dinero;
  for (const i of propiedadesDe(ctx, s, id)) {
    const c = ctx.casillas[i];
    const p = s.props[i];
    let valor = p.hipotecada ? c.precio * (1 - ctx.eco.hipoteca) : c.precio;
    if (burbuja && c.tipo === 'calle') valor *= burbuja.factor;
    total += valor + (c.tipo === 'calle' ? p.nivel * c.costeCasa : 0);
  }
  for (const [barrio, n] of Object.entries(j.acciones)) total += n * precioAccion(ctx, s, barrio);
  total -= j.hab.prestamo?.devolver ?? 0;
  return Math.round(total);
}
