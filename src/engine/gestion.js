// Gestionar propiedades y acciones (docs/DISENO.md, secciones 4 y 6): construir, vender edificios, hipotecar, levantar
// hipotecas y comprar o vender acciones. Quién puede hacerlo y cuándo lo decide juego.js; aquí van las reglas.
// Los edificios son niveles por calle: 1 a 4 casas y 5 = torre (que devuelve sus 4 casas al banco).
import {
  accionesDisponibles, barrioCompleto, costeConstruir, costeDeshipotecar, nivelesBarrio, precioAccion, valorHipoteca,
} from './contexto.js';
import { cobrar, transferir } from './dinero.js';
import { apuestaBajista } from './habilidades.js';

const no = (codigo, mensaje) => ({ codigo, mensaje });
const TORRE = 5;

function calleDe(ctx, s, id, i) {
  const c = ctx.casillas[i];
  if (!c || c.tipo !== 'calle') return no('casilla', 'Elige una calle.');
  if (s.props[i].dueno !== id) return no('no_es_tuya', 'Esa calle no es tuya.');
  return null;
}

export function construir(ctx, s, a, ev) {
  const fallo = calleDe(ctx, s, a.id, a.casilla);
  if (fallo) return fallo;
  const c = ctx.casillas[a.casilla];
  const p = s.props[a.casilla];
  if (!barrioCompleto(ctx, s, c.barrio, a.id)) return no('barrio_incompleto', 'Necesitas todas las calles del barrio.');
  if (ctx.barrios[c.barrio].calles.some(i => s.props[i].hipotecada)) {
    return no('hipotecada', 'No se puede construir en un barrio con calles hipotecadas.');
  }
  if (p.nivel >= TORRE) return no('maximo', 'Esa calle ya tiene una torre.');
  if (p.nivel > Math.min(...nivelesBarrio(ctx, s, c.barrio))) {
    return no('parejo', 'Hay que construir de forma pareja: primero en las calles con menos edificios.');
  }
  if (p.nivel === TORRE - 1 ? s.banco.torres < 1 : s.banco.casas < 1) {
    return no('existencias', 'El banco no tiene edificios: hay que esperar a que alguien venda.');
  }
  const coste = costeConstruir(ctx, s, a.id, a.casilla);
  if (s.jugadores[a.id].dinero < coste) return no('sin_dinero', `Construir cuesta ${coste} $.`);
  transferir(s, ev, a.id, 'banco', coste, 'construir');
  if (p.nivel === TORRE - 1) {
    s.banco.torres--;
    s.banco.casas += TORRE - 1;
  } else {
    s.banco.casas--;
  }
  p.nivel++;
  ev.push({ type: 'construir', id: a.id, casilla: a.casilla, nivel: p.nivel, coste });
  return undefined;
}

// Se vende de forma pareja: primero en las calles con más edificios. Para bajar una torre a 4 casas hacen falta 4 casas
// del banco; si no las tiene, la calle se queda con las que haya.
export function venderEdificio(ctx, s, a, ev) {
  const fallo = calleDe(ctx, s, a.id, a.casilla);
  if (fallo) return fallo;
  const c = ctx.casillas[a.casilla];
  const p = s.props[a.casilla];
  if (p.nivel === 0) return no('sin_edificios', 'Esa calle no tiene edificios.');
  if (p.nivel < Math.max(...nivelesBarrio(ctx, s, c.barrio))) {
    return no('parejo', 'Hay que vender de forma pareja: primero en las calles con más edificios.');
  }
  const antes = p.nivel;
  if (p.nivel === TORRE) {
    const casas = Math.min(TORRE - 1, s.banco.casas);
    s.banco.torres++;
    s.banco.casas -= casas;
    p.nivel = casas;
  } else {
    s.banco.casas++;
    p.nivel--;
  }
  const cantidad = Math.round((antes - p.nivel) * c.costeCasa * ctx.eco.ventaEdificios);
  cobrar(s, ev, a.id, cantidad, 'venta-edificios');
  ev.push({ type: 'venderEdificio', id: a.id, casilla: a.casilla, nivel: p.nivel, cantidad });
  apuestaBajista(ctx, s, ev, a.id);
  return undefined;
}

export function hipotecar(ctx, s, a, ev) {
  const c = ctx.casillas[a.casilla];
  const p = s.props[a.casilla];
  if (!p) return no('casilla', 'Elige una propiedad.');
  if (p.dueno !== a.id) return no('no_es_tuya', 'Esa propiedad no es tuya.');
  if (p.hipotecada) return no('hipotecada', 'Ya está hipotecada.');
  if (c.tipo === 'calle' && nivelesBarrio(ctx, s, c.barrio).some(n => n > 0)) {
    return no('edificios', 'Antes hay que vender los edificios del barrio.');
  }
  p.hipotecada = true;
  const cantidad = valorHipoteca(ctx, a.casilla);
  cobrar(s, ev, a.id, cantidad, 'hipoteca');
  ev.push({ type: 'hipotecar', id: a.id, casilla: a.casilla, cantidad });
  apuestaBajista(ctx, s, ev, a.id);
  return undefined;
}

export function deshipotecar(ctx, s, a, ev) {
  const p = s.props[a.casilla];
  if (!p) return no('casilla', 'Elige una propiedad.');
  if (p.dueno !== a.id) return no('no_es_tuya', 'Esa propiedad no es tuya.');
  if (!p.hipotecada) return no('no_hipotecada', 'No está hipotecada.');
  const coste = costeDeshipotecar(ctx, a.casilla);
  if (s.jugadores[a.id].dinero < coste) return no('sin_dinero', `Levantar la hipoteca cuesta ${coste} $.`);
  transferir(s, ev, a.id, 'banco', coste, 'deshipotecar');
  p.hipotecada = false;
  ev.push({ type: 'deshipotecar', id: a.id, casilla: a.casilla, coste });
  return undefined;
}

function cantidadDeAcciones(ctx, a) {
  if (!ctx.barrios[a.barrio]) return no('barrio', 'Elige un barrio.');
  const paquete = ctx.eco.bolsa.paquete;
  if (!Number.isInteger(a.cantidad) || a.cantidad <= 0 || a.cantidad % paquete) {
    return no('cantidad', `Las acciones van en paquetes de ${paquete}.`);
  }
  return null;
}

export function comprarAcciones(ctx, s, a, ev) {
  const fallo = cantidadDeAcciones(ctx, a);
  if (fallo) return fallo;
  const j = s.jugadores[a.id];
  const tiene = j.acciones[a.barrio] ?? 0;
  if (tiene + a.cantidad > ctx.eco.bolsa.maxPorJugador) {
    return no('maximo', `Nadie puede tener más de ${ctx.eco.bolsa.maxPorJugador} acciones de un barrio.`);
  }
  if (a.cantidad > accionesDisponibles(ctx, s, a.barrio)) return no('agotadas', 'No quedan tantas acciones de ese barrio.');
  const coste = a.cantidad * precioAccion(ctx, s, a.barrio);
  if (j.dinero < coste) return no('sin_dinero', `Esas acciones cuestan ${coste} $.`);
  transferir(s, ev, a.id, 'banco', coste, 'acciones');
  j.acciones[a.barrio] = tiene + a.cantidad;
  ev.push({ type: 'accionesCompradas', id: a.id, barrio: a.barrio, cantidad: a.cantidad, coste });
  return undefined;
}

// El banco recompra las acciones con una comisión.
export function venderAcciones(ctx, s, a, ev) {
  const fallo = cantidadDeAcciones(ctx, a);
  if (fallo) return fallo;
  const j = s.jugadores[a.id];
  const tiene = j.acciones[a.barrio] ?? 0;
  if (a.cantidad > tiene) return no('sin_acciones', 'No tienes tantas acciones de ese barrio.');
  const cantidad = Math.floor(a.cantidad * precioAccion(ctx, s, a.barrio) * ctx.eco.bolsa.recompra);
  if (tiene === a.cantidad) delete j.acciones[a.barrio];
  else j.acciones[a.barrio] = tiene - a.cantidad;
  cobrar(s, ev, a.id, cantidad, 'acciones');
  ev.push({ type: 'accionesVendidas', id: a.id, barrio: a.barrio, cantidad: a.cantidad, ingreso: cantidad });
  return undefined;
}
