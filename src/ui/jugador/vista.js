// Lo que muestra el celular de un jugador, calculado a partir del estado de la partida y de lo que el tablero dice que puede
// hacer («puede»: src/engine/posibles.js). Son funciones puras: no tocan el navegador y solo consultan el motor, así se
// prueban sin pantalla. Los textos no se escriben aquí: devuelven datos (ids, números) y los componentes los traducen.
//
// Las cifras de los botones (lo que cuesta construir, lo que se cobra al hipotecar…) salen de las mismas funciones del motor
// que usa el tablero al resolver la acción, así lo que se lee en el botón es lo que pasa al pulsarlo.
import { barrioSinEdificios, propiedadesDe } from '../../engine/contexto.js';
import { resumenJugadores } from '../tablero/vista.js';

// Qué pantalla toca con lo que se sabe: no hay manera de hablar con el tablero, pedir el código, conectar, una sala que no existe
// o que se cerró, pedir el nombre, el vestíbulo (elegir ficha), la partida o el final. «datos» es lo que da el cliente
// (src/net/cliente.js); mientras no hayan llegado la sala, el estado y la vista de este celular, se está conectando.
export function pantallaActual({ codigo, datos, cerrada = false, sinRed = false }) {
  if (sinRed) return 'sin-red';
  if (!codigo) return 'codigo';
  if (cerrada) return 'cerrada';
  if (!datos || datos.sala === null || datos.vista.puede === undefined) return 'conectando';
  if (datos.sala === false) return 'sin-sala';
  if (!datos.estado) return 'conectando';
  // Quien tiene identificador pero ya no está en el estado (el tablero lo sacó de la sala) es como quien no ha entrado.
  const estaDentro = datos.miId !== null && datos.estado.jugadores?.[datos.miId] !== undefined;
  if (!estaDentro) return datos.estado.fase === 'sala' ? 'nombre' : 'empezada';
  return { sala: 'vestibulo', juego: 'partida', fin: 'final' }[datos.estado.fase] ?? 'conectando';
}

// El dinero, el patrimonio y lo que falta para la meta.
export function cartera(motor, s, id) {
  const patrimonio = motor.patrimonio(s, id);
  const meta = s.opciones.meta;
  return {
    dinero: s.jugadores[id].dinero,
    patrimonio,
    meta,
    avance: meta ? Math.min(1, patrimonio / meta) : null,
    salvoconductos: s.jugadores[id].salvoconductos,
  };
}

// Qué está pasando, visto por este jugador: de quién es el turno, si hay una subasta o una deuda por pagar.
export function situacion(s, id) {
  if (s.fase === 'fin') return { tipo: 'fin' };
  if (s.subasta) return { tipo: 'subasta' };
  const deuda = s.deudas[0];
  if (deuda?.id === id) return { tipo: 'deuda-mia', deuda };
  if (deuda) return { tipo: 'deuda-ajena', quien: deuda.id };
  const turno = s.turno;
  if (!turno) return { tipo: 'ninguna' };
  return { tipo: turno.id === id ? 'mi-turno' : 'turno-ajeno', quien: turno.id, fase: turno.fase, compra: turno.compra };
}

// --- Las propiedades --------------------------------------------------------------------------------------------------

// Mis propiedades agrupadas por barrio, y luego los transportes y los servicios, cada una con lo que se puede hacer con ella
// y cuánto cuesta o cuánto se cobra: construir, vender un edificio, hipotecar y levantar la hipoteca.
export function propiedades(motor, s, id, puede = {}) {
  const { ctx } = motor;
  const lista = clave => new Set(puede[clave] ?? []);
  const construir = lista('construir');
  const vender = lista('venderEdificio');
  const hipotecar = lista('hipotecar');
  const deshipotecar = lista('deshipotecar');
  const mias = new Set(propiedadesDe(ctx, s, id));
  const servicios = ctx.servicios.filter(i => mias.has(i)).length;

  const tarjeta = i => {
    const c = ctx.casillas[i];
    const p = s.props[i];
    return {
      casilla: i,
      tipo: c.tipo,
      precio: c.precio,
      nivel: p.nivel,
      hipotecada: p.hipotecada,
      // Los servicios cobran según los dados: se enseña por cuánto se multiplican, no una cantidad.
      alquiler: p.hipotecada || c.tipo === 'servicio' ? null : motor.alquiler(s, i),
      factorDados: c.tipo === 'servicio' ? ctx.eco.servicios[servicios - 1] : null,
      construir: construir.has(i) ? motor.costeConstruir(s, id, i) : null,
      vender: vender.has(i) ? motor.valorVentaEdificio(s, i) : null,
      hipotecar: hipotecar.has(i) ? motor.valorHipoteca(i) : null,
      deshipotecar: deshipotecar.has(i) ? motor.costeDeshipotecar(i) : null,
    };
  };

  const grupos = [];
  for (const b of Object.values(ctx.barrios)) {
    const tengo = b.calles.filter(i => mias.has(i));
    if (!tengo.length) continue;
    grupos.push({ tipo: 'barrio', barrio: b.id, color: b.color, imagen: b.imagen, tengo: tengo.length, total: b.calles.length, completo: tengo.length === b.calles.length, items: tengo.map(tarjeta) });
  }
  for (const [tipo, todas] of [['transporte', ctx.transportes], ['servicio', ctx.servicios]]) {
    const tengo = todas.filter(i => mias.has(i));
    if (tengo.length) grupos.push({ tipo, tengo: tengo.length, total: todas.length, completo: tengo.length === todas.length, items: tengo.map(tarjeta) });
  }
  return grupos;
}

// --- La Bolsa -----------------------------------------------------------------------------------------------------------

// Una fila por barrio con el precio de su acción, cuántas tengo y lo que cuesta o se cobra por un paquete. «abierta» dice si
// ahora se puede comprar (solo al pasar por la Salida o al caer en la Bolsa o la Agencia). Sin mercado vivo, no hay Bolsa.
export function bolsa(motor, s, id, puede = {}) {
  if (!s.opciones.mercado) return null;
  const { ctx } = motor;
  const { paquete, maxPorJugador, recompra } = ctx.eco.bolsa;
  const comprar = new Set(puede.comprarAcciones ?? []);
  const vender = new Set(puede.venderAcciones ?? []);
  const filas = Object.values(ctx.barrios).map(b => {
    const precio = motor.precioAccion(s, b.id);
    return {
      barrio: b.id,
      color: b.color,
      imagen: b.imagen,
      precio,
      tengo: s.jugadores[id].acciones[b.id] ?? 0,
      quedan: motor.accionesDisponibles(s, b.id),
      comprar: comprar.has(b.id) ? paquete * precio : null,
      vender: vender.has(b.id) ? Math.floor(paquete * precio * recompra) : null,
    };
  });
  return { paquete, maximo: maxPorJugador, abierta: s.fase === 'juego' && s.turno?.id === id && Boolean(s.turno.bolsaAbierta), filas };
}

// --- Los tratos ---------------------------------------------------------------------------------------------------------

export const rivales = (s, id) => s.orden.filter(k => k !== id && !s.jugadores[k].quebrado);

// Los tratos que me tocan, vistos desde mí: lo que doy y lo que recibo, con quién, y si puedo aceptarlo ahora.
export function tratos(s, id, puede = {}) {
  const aceptables = new Set(puede.aceptarTrato ?? []);
  return Object.values(s.tratos).filter(t => t.de === id || t.para === id).map(t => {
    const mio = t.de === id;
    return {
      id: t.id,
      recibido: !mio,
      con: mio ? t.para : t.de,
      doy: mio ? t.ofrece : t.pide,
      recibo: mio ? t.pide : t.ofrece,
      puedeAceptar: aceptables.has(t.id),
    };
  });
}

// Las propiedades de un jugador que se pueden tratar: las calles con edificios en su barrio, no (hay que venderlos antes).
export function propiedadesTratables(motor, s, quien) {
  const { ctx } = motor;
  return propiedadesDe(ctx, s, quien).filter(i => ctx.casillas[i].tipo !== 'calle' || barrioSinEdificios(ctx, s, ctx.casillas[i].barrio));
}

export const PARTE_VACIA = { dinero: 0, propiedades: [], acciones: {}, salvoconductos: 0 };

// Una parte del trato sin lo que está en cero (lo que hay que mandar al tablero: Firebase no guarda valores vacíos).
export function parteDeTrato(parte) {
  const acciones = Object.fromEntries(Object.entries(parte.acciones ?? {}).filter(([, n]) => n > 0));
  return {
    ...(parte.dinero > 0 ? { dinero: parte.dinero } : {}),
    ...(parte.propiedades?.length ? { propiedades: [...parte.propiedades] } : {}),
    ...(Object.keys(acciones).length ? { acciones } : {}),
    ...(parte.salvoconductos > 0 ? { salvoconductos: parte.salvoconductos } : {}),
  };
}

export const parteVacia = parte => Object.keys(parteDeTrato(parte)).length === 0;

// --- La subasta ---------------------------------------------------------------------------------------------------------

// Las cantidades que se ofrecen como botones al pujar, sin pasarse del dinero: +10, +50 y +100 sobre la puja más alta (docs/DISENO.md,
// «Subastas»). La mínima es la primera: puja + incremento, o solo 10 si nadie ha pujado; por eso los otros dos son mínima + 4 y + 9
// incrementos.
export function opcionesDePuja(minima, dinero, incremento = 10) {
  const cantidades = [0, 4, 9].map(k => minima + k * incremento).filter(c => c <= dinero);
  return [...new Set(cantidades)];
}

// --- La habilidad --------------------------------------------------------------------------------------------------------

// Lo que hace falta para usar la habilidad activa: qué elegir (barrio, calle, rival o cuánto) antes de mandarla.
export function habilidadActiva(puede = {}) {
  const h = puede.habilidad;
  if (!h) return null;
  const eleccion = h.barrios ? 'barrio' : h.casillas ? 'casilla' : h.objetivos ? 'objetivo' : h.maximo ? 'cantidad' : null;
  return { id: h.id, eleccion, barrios: h.barrios ?? [], casillas: h.casillas ?? [], objetivos: h.objetivos ?? [], maximo: h.maximo ?? 0 };
}

// La acción que se manda al tablero al usar la habilidad con lo elegido.
export function accionDeHabilidad(habilidad, valor) {
  const clave = { barrio: 'barrio', casilla: 'casilla', objetivo: 'objetivo', cantidad: 'cantidad' }[habilidad.eleccion];
  return { type: 'usarHabilidad', ...(clave ? { [clave]: valor } : {}) };
}

// --- Los demás jugadores y el final -------------------------------------------------------------------------------------

// Los jugadores, ordenados por patrimonio (los que quebraron, al final), con lo que se necesita para la mesa y el final.
export function clasificacion(motor, s, opciones = {}) {
  const filas = resumenJugadores(motor, s, opciones).map(f => ({
    ...f,
    propiedades: f.quebrado ? 0 : propiedadesDe(motor.ctx, s, f.id).length,
    ganador: s.ganador === f.id,
  }));
  return filas.sort((a, b) => Number(a.quebrado) - Number(b.quebrado) || b.patrimonio - a.patrimonio);
}

// --- Mis movimientos de dinero --------------------------------------------------------------------------------------------

// Los movimientos de dinero de este jugador que le ha publicado el tablero (vista.movimientos), del más nuevo al más viejo:
// { n, signo: +1 si le entra y −1 si le sale, cantidad, motivo, otro: el jugador del otro lado, o null si es el banco }.
export function movimientos(vista, id) {
  return Object.entries(vista?.movimientos ?? {})
    .map(([n, m]) => {
      const entra = m.a === id;
      const otro = entra ? m.de : m.a;
      return { n: Number(n), signo: entra ? 1 : -1, cantidad: m.cantidad, motivo: m.motivo, otro: otro === 'banco' ? null : otro };
    })
    .sort((x, y) => y.n - x.n);
}
