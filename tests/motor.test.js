// Las reglas del motor (docs/DISENO.md), probadas con partidas preparadas a mano y dados elegidos («dadosDePrueba»).
// El estado es JSON plano: cada prueba monta directamente la situación que quiere comprobar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';

const motor = crearMotor(await cargarDatos());
const { ctx } = motor;
const { eco } = ctx;
const INICIAL = eco.dineroInicial;
const ficha = id => ctx.fichas[id];

// Aplica acciones que tienen que salir bien. Devuelve el estado final y todos los eventos.
function jugar(s, ...acciones) {
  const ev = [];
  for (const accion of acciones) {
    const r = motor.paso(s, accion);
    assert.equal(r.error, null, `${accion.type}: ${r.error?.mensaje}`);
    s = r.state;
    ev.push(...r.events);
  }
  return { s, ev };
}

// Una acción que el motor tiene que rechazar con este código, sin tocar el estado.
function rechaza(s, accion, codigo) {
  const r = motor.paso(s, accion);
  assert.equal(r.error?.codigo, codigo, r.error?.mensaje ?? `${accion.type} no debería poder hacerse`);
  assert.equal(r.state, s);
  assert.deepEqual(r.events, []);
}

// ¿Hay algún evento con estos datos?
const hay = (ev, patron) => ev.some(e => Object.entries(patron).every(([k, v]) => e[k] === v));

// Partida empezada con dados de prueba y, salvo que se pidan, sin habilidades. Juegan j1, j2… con estas fichas y en
// este orden: se deshace el sorteo del orden para que cada prueba sepa quién tira primero.
function partida({ fichas = ['oso', 'rata'], ...opciones } = {}) {
  const unirse = fichas.map((f, k) => ({ type: 'unirse', id: `j${k + 1}`, nombre: `Jugador ${k + 1}`, ficha: f }));
  const configurar = { type: 'configurar', opciones: { dadosDePrueba: true, habilidades: false, ...opciones } };
  const { s } = jugar(motor.nuevaPartida({ semilla: 7 }), ...unirse, configurar, { type: 'empezar' });
  s.orden = fichas.map((_, k) => `j${k + 1}`);
  s.turno.id = 'j1';
  return s;
}

// Un turno en el que no pasa nada: desde la Salida saca 10 y cae de visita en el Calabozo.
function turnoTranquilo(s, id) {
  const copia = structuredClone(s);
  copia.jugadores[id].casilla = ctx.salida;
  return jugar(copia, { type: 'tirar', id, dados: [4, 6] }, { type: 'terminarTurno', id });
}

// Pone una carta encima de su mazo para que la robe quien caiga ahí.
function cartaArriba(s, carta) {
  const mazo = ctx.cartas[carta].mazo;
  s.mazos[mazo] = [carta, ...s.mazos[mazo].filter(id => id !== carta)];
  return s;
}

// --- La sala ----------------------------------------------------------------------------------------------

test('al empezar, cada jugador recibe el dinero inicial y una ficha, y juega el primero del orden', () => {
  const { s } = jugar(motor.nuevaPartida({ semilla: 3 }),
    { type: 'unirse', id: 'a', nombre: 'Ana', ficha: 'toro' }, { type: 'unirse', id: 'b', nombre: 'Beto' }, { type: 'empezar' });
  assert.equal(s.fase, 'juego');
  assert.deepEqual([...s.orden].sort(), ['a', 'b']);
  assert.equal(s.jugadores.a.ficha, 'toro');
  assert.ok(ctx.fichas[s.jugadores.b.ficha] && s.jugadores.b.ficha !== 'toro', 'a quien no elige le toca una ficha libre');
  for (const id of s.orden) assert.equal(s.jugadores[id].dinero, INICIAL);
  assert.deepEqual([s.turno.id, s.turno.fase], [s.orden[0], 'inicio']);
});

test('la sala no admite nombres repetidos, fichas ocupadas ni más de 8 jugadores', () => {
  let { s } = jugar(motor.nuevaPartida({ semilla: 1 }), { type: 'unirse', id: 'a', nombre: 'Ana', ficha: 'toro' });
  rechaza(s, { type: 'unirse', id: 'b', nombre: 'ANA' }, 'nombre_repetido');
  rechaza(s, { type: 'unirse', id: 'b', nombre: 'Beto', ficha: 'toro' }, 'ficha_ocupada');
  rechaza(s, { type: 'empezar' }, 'pocos');
  for (let k = 2; k <= 8; k++) ({ s } = jugar(s, { type: 'unirse', id: `j${k}`, nombre: `Jugador ${k}` }));
  rechaza(s, { type: 'unirse', id: 'j9', nombre: 'Jugador 9' }, 'llena');
  ({ s } = jugar(s, { type: 'empezar' }));
  rechaza(s, { type: 'unirse', id: 'tarde', nombre: 'Tarde' }, 'empezada');
  rechaza(s, { type: 'configurar', opciones: { meta: 5000 } }, 'empezada');
});

test('las cifras salen de las fórmulas de docs/DISENO.md', () => {
  const c = i => ctx.casillas[i];
  assert.equal(c(1).precio, 70); // 60 + 9 × 1, redondeado a 10
  assert.equal(c(3).precio, 100); // la última calle de su barrio cuesta un 10 % más
  assert.equal(c(39).precio, 450);
  assert.equal(c(39).alquilerBase, 36); // el 8 % del precio
  assert.equal(c(39).costeCasa, 180); // el 40 % de la calle más cara del barrio
  assert.equal(c(5).precio, eco.precioTransporte);
  assert.equal(c(13).precio, eco.precioServicio);
});

// --- El turno ---------------------------------------------------------------------------------------------

test('quien cae en una propiedad libre puede comprarla al precio del banco', () => {
  let { s } = jugar(partida(), { type: 'tirar', id: 'j1', dados: [1, 2] });
  assert.equal(s.jugadores.j1.casilla, 3);
  assert.deepEqual([s.turno.fase, s.turno.compra], ['compra', 3]);
  rechaza(s, { type: 'terminarTurno', id: 'j1' }, 'fase');
  let ev;
  ({ s, ev } = jugar(s, { type: 'comprar', id: 'j1' }));
  const precio = ctx.casillas[3].precio;
  assert.ok(hay(ev, { type: 'dinero', de: 'j1', a: 'banco', cantidad: precio, motivo: 'compra' }));
  assert.equal(s.props[3].dueno, 'j1');
  assert.equal(s.jugadores.j1.dinero, INICIAL - precio);
  assert.equal(s.turno.fase, 'gestion');
  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }));
  assert.deepEqual([s.turno.id, s.turno.fase], ['j2', 'inicio']);
});

test('solo juega quien tiene el turno, y cada cosa a su tiempo', () => {
  const s = partida();
  rechaza(s, { type: 'tirar', id: 'j2', dados: [1, 2] }, 'no_es_tu_turno');
  rechaza(s, { type: 'tirar', id: 'nadie', dados: [1, 2] }, 'jugador');
  rechaza(s, { type: 'volar', id: 'j1' }, 'accion');
  rechaza(s, { type: 'comprar', id: 'j1' }, 'fase');
  rechaza(s, { type: 'terminarTurno', id: 'j1' }, 'fase');
});

test('el alquiler: el base, el doble con el barrio completo y nada si está hipotecada', () => {
  const base = ctx.casillas[3].alquilerBase;
  let s = partida();
  s.props[3].dueno = 'j2';
  assert.equal(motor.alquiler(s, 3), base);
  s.props[1].dueno = 'j2'; // ya tiene las dos calles de los Talleres
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  const doble = base * eco.alquiler.barrioCompleto;
  assert.ok(hay(ev, { type: 'alquiler', id: 'j1', a: 'j2', casilla: 3, cantidad: doble }));
  assert.deepEqual([s.jugadores.j1.dinero, s.jugadores.j2.dinero], [INICIAL - doble, INICIAL + doble]);
  assert.equal(s.turno.fase, 'gestion');

  s = partida();
  s.props[3] = { dueno: 'j2', nivel: 0, hipotecada: true };
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.ok(hay(ev, { type: 'sinAlquiler', id: 'j1', motivo: 'hipotecada' }));
  assert.equal(s.jugadores.j1.dinero, INICIAL);
});

test('al pasar por la Salida se cobra el sueldo', () => {
  let s = partida();
  s.jugadores.j1.casilla = 38;
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.equal(s.jugadores.j1.casilla, 1);
  assert.ok(hay(ev, { type: 'dinero', a: 'j1', cantidad: eco.sueldo, motivo: 'sueldo' }));
  assert.equal(s.jugadores.j1.dinero, INICIAL + eco.sueldo);
});

test('con dobles se vuelve a tirar; con tres dobles seguidos, al Calabozo', () => {
  let { s } = jugar(partida(), { type: 'tirar', id: 'j1', dados: [2, 2] }, { type: 'comprar', id: 'j1' });
  assert.equal(s.turno.fase, 'inicio');
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [3, 3] })); // de visita en el Calabozo
  assert.deepEqual([s.jugadores.j1.casilla, s.jugadores.j1.calabozo, s.turno.fase], [ctx.calabozo, null, 'inicio']);
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [4, 4] }));
  assert.ok(hay(ev, { type: 'alCalabozo', id: 'j1', motivo: 'tres-dobles' }));
  assert.deepEqual(s.jugadores.j1.calabozo, { intentos: 0 });
  assert.equal(s.turno.fase, 'gestion');
});

test('del Calabozo se sale con dobles o pagando la fianza; al tercer intento, pagando a la fuerza', () => {
  const preso = s => {
    Object.assign(s.jugadores.j1, { casilla: ctx.calabozo, calabozo: { intentos: 0 } });
    return s;
  };

  // Con dobles sale y avanza, pero no vuelve a tirar.
  let { s } = jugar(preso(partida()), { type: 'tirar', id: 'j1', dados: [5, 5] });
  assert.deepEqual([s.jugadores.j1.calabozo, s.jugadores.j1.casilla, s.turno.fase], [null, 20, 'gestion']);

  // Sin dobles se queda. Al tercer intento paga la fianza y avanza.
  s = preso(partida());
  for (const intento of [1, 2]) {
    ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }, { type: 'terminarTurno', id: 'j1' }));
    assert.deepEqual([s.jugadores.j1.casilla, s.jugadores.j1.calabozo], [ctx.calabozo, { intentos: intento }]);
    ({ s } = turnoTranquilo(s, 'j2'));
  }
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.ok(hay(ev, { type: 'dinero', de: 'j1', cantidad: eco.fianza, motivo: 'fianza' }));
  assert.deepEqual([s.jugadores.j1.calabozo, s.jugadores.j1.casilla], [null, 13]);

  // Antes de tirar puede pagar la fianza y tirar como siempre.
  ({ s } = jugar(preso(partida()), { type: 'pagarFianza', id: 'j1' }));
  assert.deepEqual([s.jugadores.j1.calabozo, s.jugadores.j1.dinero, s.turno.fase], [null, INICIAL - eco.fianza, 'inicio']);
  rechaza(s, { type: 'pagarFianza', id: 'j1' }, 'calabozo');
});

// --- Subastas -----------------------------------------------------------------------------------------------

test('si quien cae no la compra, la propiedad se subasta y gana la puja más alta', () => {
  let { s } = jugar(partida({ fichas: ['oso', 'rata', 'toro'] }),
    { type: 'tirar', id: 'j1', dados: [1, 2] }, { type: 'noComprar', id: 'j1' });
  assert.deepEqual([s.subasta.casilla, s.subasta.origen], [3, 'compra']);
  rechaza(s, { type: 'terminarTurno', id: 'j1' }, 'subasta');
  rechaza(s, { type: 'pujar', id: 'j2', cantidad: eco.subasta.minimo - 1 }, 'puja_baja');
  ({ s } = jugar(s, { type: 'pujar', id: 'j2', cantidad: 40 }, { type: 'pujar', id: 'j3', cantidad: 50 }));
  rechaza(s, { type: 'pujar', id: 'j2', cantidad: 50 + eco.subasta.incremento - 1 }, 'puja_baja');
  rechaza(s, { type: 'retirarse', id: 'j3' }, 'lider');
  let ev;
  ({ s, ev } = jugar(s, { type: 'retirarse', id: 'j1' }, { type: 'retirarse', id: 'j2' }));
  // Solo queda quien va ganando: la subasta se cierra sola.
  assert.ok(hay(ev, { type: 'subastaGanada', casilla: 3, id: 'j3', cantidad: 50 }));
  assert.equal(s.subasta, null);
  assert.equal(s.props[3].dueno, 'j3');
  assert.equal(s.jugadores.j3.dinero, INICIAL - 50);
  assert.equal(s.turno.fase, 'gestion');
});

test('el tablero cierra la subasta cuando se acaba el tiempo; si nadie pujó, la propiedad sigue libre', () => {
  let { s } = jugar(partida(), { type: 'tirar', id: 'j1', dados: [1, 2] }, { type: 'noComprar', id: 'j1' });
  let ev;
  ({ s, ev } = jugar(s, { type: 'cerrarSubasta' }));
  assert.ok(hay(ev, { type: 'subastaDesierta', casilla: 3 }));
  assert.deepEqual([s.subasta, s.props[3].dueno, s.turno.fase], [null, null, 'gestion']);
});

// --- Construir, hipotecar y la Bolsa ------------------------------------------------------------------------

test('se construye con el barrio completo y de forma pareja; la torre devuelve sus 4 casas', () => {
  let s = partida();
  const construir = casilla => ({ type: 'construir', id: 'j1', casilla });
  s.props[1].dueno = 'j1';
  rechaza(s, construir(1), 'barrio_incompleto');
  s.props[3].dueno = 'j1';
  ({ s } = jugar(s, construir(1)));
  rechaza(s, construir(1), 'parejo');
  ({ s } = jugar(s, construir(3), construir(1), construir(3), construir(1), construir(3), construir(1), construir(3)));
  assert.deepEqual([s.props[1].nivel, s.props[3].nivel, s.banco.casas], [4, 4, eco.existencias.casas - 8]);
  ({ s } = jugar(s, construir(3)));
  assert.deepEqual([s.props[3].nivel, s.banco.torres, s.banco.casas], [5, eco.existencias.torres - 1, eco.existencias.casas - 4]);
  const coste = ctx.casillas[1].costeCasa;
  assert.equal(s.jugadores.j1.dinero, INICIAL - 9 * coste);
  assert.equal(motor.alquiler(s, 3), ctx.casillas[3].alquilerBase * eco.alquiler.multiplicadores[5]);
  rechaza(s, construir(3), 'maximo');
  rechaza(s, { type: 'hipotecar', id: 'j1', casilla: 1 }, 'edificios');

  // Se vende también de forma pareja (primero la torre) y a mitad de precio.
  rechaza(s, { type: 'venderEdificio', id: 'j1', casilla: 1 }, 'parejo');
  ({ s } = jugar(s, { type: 'venderEdificio', id: 'j1', casilla: 3 }));
  assert.deepEqual([s.props[3].nivel, s.banco.torres, s.banco.casas], [4, eco.existencias.torres, eco.existencias.casas - 8]);
  assert.equal(s.jugadores.j1.dinero, INICIAL - 9 * coste + coste * eco.ventaEdificios);
});

test('hipotecar da la mitad del precio; levantar la hipoteca cuesta un 10 % más', () => {
  let s = partida();
  s.props[5].dueno = 'j1';
  const hipoteca = ctx.casillas[5].precio * eco.hipoteca;
  ({ s } = jugar(s, { type: 'hipotecar', id: 'j1', casilla: 5 }));
  assert.equal(s.jugadores.j1.dinero, INICIAL + hipoteca);
  rechaza(s, { type: 'hipotecar', id: 'j1', casilla: 5 }, 'hipotecada');
  ({ s } = jugar(s, { type: 'deshipotecar', id: 'j1', casilla: 5 }));
  assert.equal(s.props[5].hipotecada, false);
  assert.equal(s.jugadores.j1.dinero, INICIAL + hipoteca - Math.round(hipoteca * (1 + eco.interesHipoteca)));

  // En un barrio con una calle hipotecada no se construye.
  s.props[1] = { dueno: 'j1', nivel: 0, hipotecada: true };
  s.props[3].dueno = 'j1';
  rechaza(s, { type: 'construir', id: 'j1', casilla: 3 }, 'hipotecada');
});

test('las acciones se compran al pasar por la Salida o caer en la Bolsa o la Agencia; el banco las recompra', () => {
  const barrio = 'altos-del-mirador';
  const comprar = cantidad => ({ type: 'comprarAcciones', id: 'j1', barrio, cantidad });
  let s = partida();
  rechaza(s, comprar(10), 'bolsa_cerrada');
  s.jugadores.j1.casilla = 35;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] })); // la Agencia de Bolsa
  const precio = motor.precioAccion(s, barrio);
  assert.equal(precio, Math.round(motor.valorBarrio(s, barrio) / eco.bolsa.divisor));
  rechaza(s, comprar(eco.bolsa.paquete - 1), 'cantidad');
  ({ s } = jugar(s, comprar(10)));
  assert.equal(s.jugadores.j1.acciones[barrio], 10);
  assert.equal(s.jugadores.j1.dinero, INICIAL - 10 * precio);
  assert.equal(motor.patrimonio(s, 'j1'), INICIAL, 'las acciones cuentan en el patrimonio a su precio');
  rechaza(s, comprar(eco.bolsa.maxPorJugador), 'maximo');
  ({ s } = jugar(s, { type: 'venderAcciones', id: 'j1', barrio, cantidad: 10 }));
  assert.equal(s.jugadores.j1.dinero, INICIAL - 10 * precio + Math.floor(10 * precio * eco.bolsa.recompra));
  assert.deepEqual(s.jugadores.j1.acciones, {});
});

test('cada alquiler de una calle paga, desde el banco, un dividendo a los accionistas de su barrio', () => {
  let s = partida({ fichas: ['oso', 'rata', 'toro'] });
  for (const i of [1, 3]) s.props[i] = { dueno: 'j2', nivel: 2, hipotecada: false };
  s.jugadores.j3.acciones.talleres = 50;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  const renta = motor.alquiler(s, 3);
  assert.equal(s.jugadores.j3.dinero, INICIAL + Math.round(renta * eco.bolsa.dividendo * 50));
});

test('sin mercado vivo no hay Bolsa ni cartas del mercado', () => {
  let s = partida({ mercado: false });
  assert.ok([...s.mazos.noticias, ...s.mazos.fortuna].every(id => !ctx.cartas[id].mercado));
  s.jugadores.j1.casilla = 35;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  rechaza(s, { type: 'comprarAcciones', id: 'j1', barrio: 'talleres', cantidad: 5 }, 'bolsa_cerrada');
});

// --- Deudas, bancarrota y final -----------------------------------------------------------------------------

test('quien no puede pagar queda en deuda hasta que reúne el dinero', () => {
  let s = partida();
  s.props[3] = { dueno: 'j2', nivel: 5, hipotecada: false };
  for (const i of [5, 11]) s.props[i].dueno = 'j1';
  s.jugadores.j1.dinero = 250;
  let ev;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  const renta = motor.alquiler(s, 3);
  assert.deepEqual(s.deudas, [{ id: 'j1', acreedor: 'j2', cantidad: renta, motivo: 'alquiler' }]);
  rechaza(s, { type: 'terminarTurno', id: 'j1' }, 'deuda');
  ({ s } = jugar(s, { type: 'hipotecar', id: 'j1', casilla: 5 }));
  assert.equal(s.deudas.length, 1, 'todavía no le alcanza');
  ({ s, ev } = jugar(s, { type: 'hipotecar', id: 'j1', casilla: 11 }));
  assert.ok(hay(ev, { type: 'deudaPagada', id: 'j1', acreedor: 'j2', cantidad: renta }));
  assert.deepEqual(s.deudas, []);
  const hipotecas = (ctx.casillas[5].precio + ctx.casillas[11].precio) * eco.hipoteca;
  assert.equal(s.jugadores.j1.dinero, 250 + hipotecas - renta);
  jugar(s, { type: 'terminarTurno', id: 'j1' });
});

test('quien quiebra ante otro jugador le da su dinero, sus propiedades y sus acciones', () => {
  let s = partida({ fichas: ['oso', 'rata', 'toro'] });
  s.props[3] = { dueno: 'j2', nivel: 5, hipotecada: false };
  s.props[5].dueno = 'j1';
  s.jugadores.j1.dinero = 100;
  s.jugadores.j1.acciones.feria = 10;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  rechaza(s, { type: 'declararBancarrota', id: 'j2' }, 'sin_deuda');
  let ev;
  ({ s, ev } = jugar(s, { type: 'declararBancarrota', id: 'j1' }));
  assert.ok(hay(ev, { type: 'bancarrota', id: 'j1', acreedor: 'j2' }));
  assert.equal(s.jugadores.j1.quebrado, true);
  assert.equal(s.props[5].dueno, 'j2');
  assert.deepEqual(s.jugadores.j2.acciones, { feria: 10 });
  assert.equal(s.jugadores.j2.dinero, INICIAL + 100);
  assert.deepEqual([s.deudas, s.fase, s.turno.id], [[], 'juego', 'j2']);
  rechaza(s, { type: 'proponerTrato', id: 'j1', para: 'j2', ofrece: {}, pide: { dinero: 10 } }, 'jugador');
});

test('quien quiebra ante el banco devuelve sus propiedades, que se subastan', () => {
  let s = partida({ fichas: ['oso', 'rata', 'toro'] });
  for (const i of [11, 12]) s.props[i].dueno = 'j1';
  s.jugadores.j1.dinero = 0;
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [4, 5] })); // el Impuesto sobre el patrimonio
  const impuesto = Math.round((motor.patrimonio(s, 'j1') * eco.impuestoPatrimonio) / 10) * 10;
  assert.ok(hay(ev, { type: 'deuda', id: 'j1', acreedor: 'banco', cantidad: impuesto, motivo: 'impuesto' }));
  ({ s } = jugar(s, { type: 'declararBancarrota', id: 'j1' }));
  assert.deepEqual([s.subasta.casilla, s.subasta.origen, s.subasta.activos, s.turno.fase], [11, 'bancarrota', ['j2', 'j3'], 'quiebra']);
  ({ s } = jugar(s, { type: 'pujar', id: 'j2', cantidad: 10 }, { type: 'retirarse', id: 'j3' }));
  assert.equal(s.props[11].dueno, 'j2');
  assert.equal(s.subasta.casilla, 12);
  ({ s } = jugar(s, { type: 'cerrarSubasta' }));
  assert.deepEqual([s.props[12].dueno, s.subasta, s.turno.id], [null, null, 'j2']);
});

test('con dos jugadores, la bancarrota de uno termina la partida', () => {
  let s = partida();
  s.props[3] = { dueno: 'j2', nivel: 5, hipotecada: false };
  s.jugadores.j1.dinero = 100;
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }, { type: 'declararBancarrota', id: 'j1' }));
  assert.ok(hay(ev, { type: 'fin', ganador: 'j2', motivo: 'bancarrota' }));
  assert.equal(s.fase, 'fin');
});

test('gana quien llega a la meta de patrimonio y pasa por la Salida', () => {
  let s = partida({ meta: 3000 });
  s.jugadores.j1.dinero = 3100;
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [4, 6] }));
  assert.ok(hay(ev, { type: 'rachaFinal', id: 'j1' }), 'el tablero avisa de que va camino de ganar');
  assert.equal(s.fase, 'juego');
  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }));
  ({ s } = turnoTranquilo(s, 'j2'));
  s.jugadores.j1.casilla = 38;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.ok(hay(ev, { type: 'fin', ganador: 'j1', motivo: 'meta' }));
  assert.deepEqual([s.fase, s.ganador], ['fin', 'j1']);
  rechaza(s, { type: 'terminarTurno', id: 'j1' }, 'fuera_de_juego');
});

test('a tiempo: cuando el tablero lo pide, al acabar la ronda gana el mayor patrimonio', () => {
  let s = partida({ meta: null });
  s.jugadores.j2.dinero = INICIAL + 500;
  ({ s } = jugar(s, { type: 'finPorTiempo' }));
  ({ s } = turnoTranquilo(s, 'j1'));
  assert.equal(s.fase, 'juego', 'la ronda acaba con el último jugador');
  const { ev } = turnoTranquilo(s, 'j2');
  assert.ok(hay(ev, { type: 'fin', ganador: 'j2', motivo: 'tiempo' }));
});

// --- Tratos -------------------------------------------------------------------------------------------------

test('en un trato se cambian propiedades, dinero y acciones; quien recibe una hipotecada paga el 10 %', () => {
  let s = partida();
  s.props[1].dueno = 'j1';
  s.props[5] = { dueno: 'j2', nivel: 0, hipotecada: true };
  s.jugadores.j2.acciones.feria = 10;
  const propuesta = {
    type: 'proponerTrato', id: 'j1', para: 'j2',
    ofrece: { propiedades: [1], dinero: 100 }, pide: { propiedades: [5], acciones: { feria: 10 } },
  };
  rechaza(s, { ...propuesta, pide: { propiedades: [3] } }, 'propiedad');
  ({ s } = jugar(s, propuesta));
  const [trato] = Object.keys(s.tratos);
  rechaza(s, { type: 'aceptarTrato', id: 'j1', trato }, 'no_es_para_ti');
  ({ s } = jugar(s, { type: 'aceptarTrato', id: 'j2', trato }));
  assert.deepEqual([s.props[1].dueno, s.props[5].dueno], ['j2', 'j1']);
  assert.deepEqual([s.jugadores.j1.acciones, s.jugadores.j2.acciones], [{ feria: 10 }, {}]);
  const interes = Math.round(ctx.casillas[5].precio * eco.hipoteca * eco.interesHipoteca);
  assert.deepEqual([s.jugadores.j1.dinero, s.jugadores.j2.dinero], [INICIAL - 100 - interes, INICIAL + 100]);
  assert.deepEqual(s.tratos, {});
});

test('no se cambian calles de un barrio con edificios, y quien propone un trato puede retirarlo', () => {
  let s = partida();
  for (const i of [1, 3]) s.props[i] = { dueno: 'j1', nivel: 1, hipotecada: false };
  rechaza(s, { type: 'proponerTrato', id: 'j1', para: 'j2', ofrece: { propiedades: [1] }, pide: { dinero: 100 } }, 'edificios');
  ({ s } = jugar(s, { type: 'proponerTrato', id: 'j2', para: 'j1', ofrece: { dinero: 50 }, pide: {} }));
  const [trato] = Object.keys(s.tratos);
  let ev;
  ({ s, ev } = jugar(s, { type: 'rechazarTrato', id: 'j2', trato }));
  assert.ok(hay(ev, { type: 'tratoCancelado', trato }));
  assert.deepEqual(s.tratos, {});
});

// --- Cartas -------------------------------------------------------------------------------------------------

test('el salvoconducto se lo queda quien lo roba, hasta que lo usa para salir del Calabozo', () => {
  let { s } = jugar(cartaArriba(partida(), ctx.salvoconducto), { type: 'tirar', id: 'j1', dados: [3, 4] }); // Fortuna
  assert.equal(s.jugadores.j1.salvoconductos, 1);
  assert.ok(!s.mazos.fortuna.includes(ctx.salvoconducto));
  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }));
  ({ s } = turnoTranquilo(s, 'j2'));
  Object.assign(s.jugadores.j1, { casilla: ctx.calabozo, calabozo: { intentos: 0 } });
  ({ s } = jugar(s, { type: 'usarSalvoconducto', id: 'j1' }));
  assert.deepEqual([s.jugadores.j1.calabozo, s.jugadores.j1.salvoconductos], [null, 0]);
  assert.equal(s.mazos.fortuna.at(-1), ctx.salvoconducto, 'vuelve al fondo del mazo');
});

test('las cartas que mueven la ficha cobran el sueldo si pasan por la Salida', () => {
  let s = cartaArriba(partida(), 'n-dia-de-cobro');
  s.jugadores.j1.casilla = 14;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] })); // Noticias
  assert.equal(s.jugadores.j1.casilla, ctx.salida);
  assert.equal(s.jugadores.j1.dinero, INICIAL + eco.sueldo);
});

// --- Las habilidades de las fichas --------------------------------------------------------------------------

test('sin habilidades, ninguna ficha tiene ventajas', () => {
  let s = partida({ fichas: ['rata', 'oso'] });
  rechaza(s, { type: 'usarHabilidad', id: 'j1' }, 'sin_habilidades');
  s.jugadores.j1.casilla = 38;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.equal(s.jugadores.j1.dinero, INICIAL + eco.sueldo);
});

test('Rata — Horas extra (más sueldo) y Esprint (un tercer dado)', () => {
  let s = partida({ fichas: ['rata', 'oso'], habilidades: true });
  s.jugadores.j1.casilla = 37;
  ({ s } = jugar(s, { type: 'usarHabilidad', id: 'j1' }, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.deepEqual(s.turno.dados, [1, 2, 1]);
  assert.equal(s.jugadores.j1.casilla, 1);
  assert.equal(s.jugadores.j1.dinero, INICIAL + ficha('rata').pasiva.sueldo);
  rechaza(s, { type: 'usarHabilidad', id: 'j1' }, 'una_por_turno');
  ({ s } = jugar(s, { type: 'comprar', id: 'j1' }, { type: 'terminarTurno', id: 'j1' }));
  ({ s } = turnoTranquilo(s, 'j2'));
  assert.equal(s.jugadores.j1.hab.enfriamiento, ficha('rata').activa.enfriamiento - 1);
  rechaza(s, { type: 'usarHabilidad', id: 'j1' }, 'enfriamiento');
});

test('Taza — Préstamo exprés (se devuelve con interés) e Interés a favor (al pasar por la Salida)', () => {
  const { pasiva, activa } = ficha('taza');
  let s = partida({ fichas: ['taza', 'oso'], habilidades: true });
  rechaza(s, { type: 'usarHabilidad', id: 'j1', cantidad: activa.maximo + 10 }, 'cantidad');
  ({ s } = jugar(s, { type: 'usarHabilidad', id: 'j1', cantidad: 500 }));
  const devolver = Math.round(500 * (1 + activa.interes));
  assert.equal(s.jugadores.j1.dinero, INICIAL + 500);
  assert.equal(motor.patrimonio(s, 'j1'), INICIAL + 500 - devolver, 'lo que debe resta del patrimonio');
  let r = { s };
  for (let k = 0; k < activa.turnos; k++) r = turnoTranquilo(turnoTranquilo(r.s, 'j1').s, 'j2');
  assert.ok(hay(r.ev, { type: 'prestamoDevuelto', id: 'j1', cantidad: devolver }));
  assert.equal(r.s.jugadores.j1.dinero, INICIAL + 500 - devolver);
  assert.equal(r.s.jugadores.j1.hab.enfriamiento, activa.enfriamiento);

  s = r.s;
  s.jugadores.j1.casilla = 38;
  const antes = s.jugadores.j1.dinero;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  const interes = Math.min(pasiva.maximo, Math.round((antes + eco.sueldo) * pasiva.porcentaje));
  assert.equal(s.jugadores.j1.dinero, antes + eco.sueldo + interes);
});

test('Toro — Optimista (más dividendos) y Rally (sube las acciones de un barrio)', () => {
  const { pasiva, activa } = ficha('toro');
  let s = partida({ fichas: ['oso', 'toro'], habilidades: true });
  for (const i of [1, 3]) s.props[i] = { dueno: 'j2', nivel: 2, hipotecada: false };
  s.jugadores.j2.acciones.talleres = 50;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  const renta = motor.alquiler(s, 3);
  assert.equal(s.jugadores.j2.dinero, INICIAL + renta + Math.round(renta * eco.bolsa.dividendo * 50 * pasiva.factor));
  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }));
  const precio = motor.precioAccion(s, 'altos-del-mirador');
  ({ s } = jugar(s, { type: 'usarHabilidad', id: 'j2', barrio: 'altos-del-mirador' }));
  assert.equal(motor.precioAccion(s, 'altos-del-mirador'), Math.round(precio * activa.factor));
});

test('Oso — Hibernar (ni paga ni cobra alquileres) y Apuesta bajista (cobra cuando otros hipotecan)', () => {
  let s = partida({ fichas: ['oso', 'rata'], habilidades: true });
  s.props[3].dueno = 'j2';
  let ev;
  ({ s, ev } = jugar(s, { type: 'usarHabilidad', id: 'j1' }, { type: 'tirar', id: 'j1', dados: [1, 2] }));
  assert.ok(hay(ev, { type: 'sinAlquiler', id: 'j1', motivo: 'hiberna' }));
  assert.equal(s.jugadores.j1.dinero, INICIAL);
  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }, { type: 'hipotecar', id: 'j2', casilla: 3 }));
  assert.equal(s.jugadores.j1.dinero, INICIAL + ficha('oso').pasiva.cantidad);
});

test('Burbuja — Inflar (una calle cobra más y después se desinfla) y Valor inflado (para la meta)', () => {
  const { pasiva, activa } = ficha('burbuja');
  const meta = 3000;
  let s = partida({ fichas: ['burbuja', 'oso'], habilidades: true, meta });
  s.props[3].dueno = 'j1';
  const base = ctx.casillas[3].alquilerBase;
  ({ s } = jugar(s, { type: 'usarHabilidad', id: 'j1', casilla: 3 }));
  assert.equal(motor.alquiler(s, 3), Math.round(base * activa.factor));
  const r = turnoTranquilo(turnoTranquilo(s, 'j1').s, 'j2'); // empieza su turno: la burbuja estalla
  assert.equal(motor.alquiler(r.s, 3), Math.round(base * activa.factorEstallido));

  s = r.s;
  s.jugadores.j1.dinero = meta - Math.round(ctx.casillas[3].precio * pasiva.factor) + 10;
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [4, 6] }));
  assert.ok(motor.patrimonio(s, 'j1') < meta, 'su patrimonio real no llega a la meta');
  assert.ok(hay(ev, { type: 'rachaFinal', id: 'j1' }), 'para la meta, sus calles valen más');
});

test('Vaca Lechera — Temporada alta (cobra más alquiler) y Renta fija (al empezar su turno)', () => {
  const { pasiva, activa } = ficha('vaca-lechera');
  let s = partida({ fichas: ['vaca-lechera', 'oso'], habilidades: true });
  for (const i of [37, 39]) s.props[i].dueno = 'j1';
  const completo = ctx.casillas[39].alquilerBase * eco.alquiler.barrioCompleto;
  ({ s } = jugar(s, { type: 'usarHabilidad', id: 'j1' }));
  assert.equal(motor.alquiler(s, 39), Math.round(completo * activa.factor));
  const r = turnoTranquilo(turnoTranquilo(s, 'j1').s, 'j2');
  const renta = Math.min(pasiva.maximo, Math.round((ctx.casillas[37].precio + ctx.casillas[39].precio) * pasiva.porcentaje));
  assert.ok(hay(r.ev, { type: 'dinero', a: 'j1', cantidad: renta, motivo: 'renta-fija' }));
  assert.equal(motor.alquiler(r.s, 39), completo, 'la temporada alta ya acabó');
});

test('Elefante Blanco — Constructora (construye más barato) y Obras eternas (una calle ajena sin alquiler)', () => {
  let s = partida({ fichas: ['elefante-blanco', 'oso'], habilidades: true });
  for (const i of [1, 3]) s.props[i].dueno = 'j1';
  s.props[4].dueno = 'j2';
  ({ s } = jugar(s, { type: 'construir', id: 'j1', casilla: 1 }));
  const descuento = ficha('elefante-blanco').pasiva.descuento;
  assert.equal(s.jugadores.j1.dinero, INICIAL - Math.round(ctx.casillas[1].costeCasa * (1 - descuento)));
  rechaza(s, { type: 'usarHabilidad', id: 'j1', casilla: 3 }, 'casilla');
  let ev;
  ({ s, ev } = jugar(s, { type: 'usarHabilidad', id: 'j1', casilla: 4 }, { type: 'tirar', id: 'j1', dados: [1, 3] }));
  assert.ok(hay(ev, { type: 'sinAlquiler', id: 'j1', casilla: 4, motivo: 'obras' }));
  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }));
  ({ s } = turnoTranquilo(s, 'j2'));
  assert.ok(!s.efectos.some(e => e.tipo === 'obras'), 'las obras acaban con el turno del dueño');
});

test('Hormiga — Peaje hormiga (con tope por ronda) y Hormiguero (más peaje y sin tope)', () => {
  const { pasiva, activa } = ficha('hormiga');
  let s = partida({ fichas: ['oso', 'hormiga'], habilidades: true });
  for (const i of [1, 3, 4]) s.props[i].dueno = 'j2';
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [2, 3] })); // pasa por 1, 3 y 4 y cae en 5
  assert.equal(s.jugadores.j2.dinero, INICIAL + Math.min(3 * pasiva.peaje, pasiva.maximoRonda));
  ({ s } = jugar(s, { type: 'comprar', id: 'j1' }, { type: 'terminarTurno', id: 'j1' }, { type: 'usarHabilidad', id: 'j2' }));
  ({ s } = turnoTranquilo(s, 'j2'));
  s.jugadores.j1.casilla = 0;
  const antes = s.jugadores.j2.dinero;
  ({ s } = jugar(s, { type: 'tirar', id: 'j1', dados: [2, 3] }));
  assert.equal(s.jugadores.j2.dinero, antes + 3 * activa.peaje);
});

test('Tiburón — Cazador de gangas (gana los empates) y Frenesí (obliga a subastar)', () => {
  let { s } = jugar(partida({ fichas: ['oso', 'tiburon'], habilidades: true }),
    { type: 'tirar', id: 'j1', dados: [1, 2] }, { type: 'noComprar', id: 'j1' }, { type: 'pujar', id: 'j1', cantidad: 50 });
  ({ s } = jugar(s, { type: 'pujar', id: 'j2', cantidad: 50 })); // iguala la puja más alta y pasa a ganar
  rechaza(s, { type: 'pujar', id: 'j1', cantidad: 50 }, 'puja_baja');
  ({ s } = jugar(s, { type: 'retirarse', id: 'j1' }));
  assert.equal(s.props[3].dueno, 'j2');
  assert.equal(s.jugadores.j2.dinero, INICIAL - Math.round(50 * ficha('tiburon').pasiva.pago));

  ({ s } = jugar(s, { type: 'terminarTurno', id: 'j1' }, { type: 'usarHabilidad', id: 'j2', objetivo: 'j1' }));
  ({ s } = turnoTranquilo(s, 'j2'));
  let ev;
  ({ s, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [2, 3] }));
  assert.ok(hay(ev, { type: 'frenesi', id: 'j1', casilla: 8 }));
  assert.equal(s.turno.compra, null);
  assert.deepEqual([s.subasta.casilla, s.subasta.origen], [8, 'frenesi']);
});

test('Cisne Negro — Antifrágil (las cartas le cobran menos y le pagan más) e Imprevisto (otro pierde el turno)', () => {
  const { pasiva } = ficha('cisne-negro');
  for (const [carta, sentido, signo] of [['f-deposito', 'cobra', 1], ['f-taller', 'paga', -1]]) {
    const { s } = jugar(cartaArriba(partida({ fichas: ['cisne-negro', 'oso'], habilidades: true }), carta),
      { type: 'tirar', id: 'j1', dados: [3, 4] }); // Fortuna
    assert.equal(s.jugadores.j1.dinero, INICIAL + signo * Math.round(ctx.cartas[carta].efecto.cantidad * pasiva[sentido]), carta);
  }

  let s = partida({ fichas: ['cisne-negro', 'oso', 'rata'], habilidades: true });
  rechaza(s, { type: 'usarHabilidad', id: 'j1', objetivo: 'j1' }, 'objetivo');
  let ev;
  ({ s, ev } = jugar(s, { type: 'usarHabilidad', id: 'j1', objetivo: 'j2' },
    { type: 'tirar', id: 'j1', dados: [4, 6] }, { type: 'terminarTurno', id: 'j1' }));
  assert.ok(hay(ev, { type: 'pierdeTurno', id: 'j2' }));
  assert.equal(s.turno.id, 'j3');
});

// --- El motor -----------------------------------------------------------------------------------------------

test('el motor no modifica el estado que recibe y, con la misma semilla, hace lo mismo', () => {
  const s = partida();
  const copia = structuredClone(s);
  motor.paso(s, { type: 'tirar', id: 'j1', dados: [1, 2] });
  assert.deepEqual(s, copia);

  const alAzar = () => {
    const { s: t } = jugar(motor.nuevaPartida({ semilla: 99 }),
      { type: 'unirse', id: 'a', nombre: 'Ana' }, { type: 'unirse', id: 'b', nombre: 'Beto' }, { type: 'empezar' });
    return motor.paso(t, { type: 'tirar', id: t.turno.id });
  };
  assert.deepEqual(alAzar(), alAzar());
});

test('sin «dadosDePrueba», los dados que mande un celular no cuentan', () => {
  const { s } = jugar(motor.nuevaPartida({ semilla: 5 }),
    { type: 'unirse', id: 'a', nombre: 'Ana' }, { type: 'unirse', id: 'b', nombre: 'Beto' }, { type: 'empezar' });
  assert.deepEqual(motor.paso(s, { type: 'tirar', id: s.turno.id, dados: [6, 6] }), motor.paso(s, { type: 'tirar', id: s.turno.id }));
});
