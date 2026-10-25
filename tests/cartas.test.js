// Pruebas unitarias de las 32 cartas de los mazos Noticias y Fortuna (src/data/cartas.json).
// Comprueba el efecto de cada carta contra el motor de juego.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';

const DATOS = await cargarDatos();
const motor = crearMotor(DATOS);
const { ctx } = motor;
const { eco } = ctx;
const INICIAL = eco.dineroInicial;

// --- Ayudantes copiados de tests/motor.test.js (de Claude), según T-08 -----------------------------

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
function partida({ fichas = ['oso', 'rata', 'toro'], ...opciones } = {}) {
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

// Ayudantes de tirada para caer exactamente en Noticias (casilla 17) o Fortuna (casilla 7):
// Noticias: se sitúa a j1 en casilla 14 y tira [1, 2] -> cae en 17.
function tirarNoticias(s, idCarta) {
  cartaArriba(s, idCarta);
  s.jugadores.j1.casilla = 14;
  return jugar(s, { type: 'tirar', id: 'j1', dados: [1, 2] });
}

// Fortuna: desde casilla 0 tira [3, 4] -> cae en 7.
function tirarFortuna(s, idCarta) {
  cartaArriba(s, idCarta);
  return jugar(s, { type: 'tirar', id: 'j1', dados: [3, 4] });
}

// --- Mazo Noticias (16 cartas) --------------------------------------------------------------------

test('n-subsidio: todos los jugadores cobran', () => {
  const s = partida();
  const e = ctx.cartas['n-subsidio'].efecto;
  const dinerosAntes = s.orden.map(id => s.jugadores[id].dinero);

  const { s: sPost, ev } = tirarNoticias(s, 'n-subsidio');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-subsidio' }));

  for (let k = 0; k < sPost.orden.length; k++) {
    const id = sPost.orden[k];
    assert.equal(
      sPost.jugadores[id].dinero,
      dinerosAntes[k] + e.cantidad,
      `${id} debe cobrar la cantidad del subsidio (${e.cantidad})`,
    );
  }
});

test('n-llega-empresa: sube el valor de un barrio al azar', () => {
  const s = partida();
  const e = ctx.cartas['n-llega-empresa'].efecto;

  const { s: sPost, ev } = tirarNoticias(s, 'n-llega-empresa');
  const evCarta = ev.find(x => x.type === 'carta' && x.carta === 'n-llega-empresa');
  assert.ok(evCarta && evCarta.barrio, 'debe seleccionar un barrio al azar');

  assert.equal(
    sPost.bolsa[evCarta.barrio].ajuste,
    e.cantidad,
    `el ajuste del barrio ${evCarta.barrio} debe aumentar en ${e.cantidad}`,
  );
});

test('n-cierra-fabrica: baja el valor de un barrio al azar', () => {
  const s = partida();
  const e = ctx.cartas['n-cierra-fabrica'].efecto;

  const { s: sPost, ev } = tirarNoticias(s, 'n-cierra-fabrica');
  const evCarta = ev.find(x => x.type === 'carta' && x.carta === 'n-cierra-fabrica');
  assert.ok(evCarta && evCarta.barrio, 'debe seleccionar un barrio al azar');

  assert.equal(
    sPost.bolsa[evCarta.barrio].ajuste,
    e.cantidad,
    `el ajuste del barrio ${evCarta.barrio} debe cambiar en ${e.cantidad}`,
  );
});

test('n-panico: todos los barrios pierden valor', () => {
  const s = partida();
  const e = ctx.cartas['n-panico'].efecto;

  const valoresAntes = {};
  for (const b of Object.keys(ctx.barrios)) valoresAntes[b] = motor.valorBarrio(s, b);

  const { s: sPost, ev } = tirarNoticias(s, 'n-panico');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-panico' }));

  for (const b of Object.keys(ctx.barrios)) {
    const ajusteEsperado = Math.round(valoresAntes[b] * e.porcentaje);
    assert.equal(
      sPost.bolsa[b].ajuste,
      ajusteEsperado,
      `el barrio ${b} debe ajustar su bolsa en ${ajusteEsperado}`,
    );
  }
});

test('n-euforia: todos los barrios ganan valor', () => {
  const s = partida();
  const e = ctx.cartas['n-euforia'].efecto;

  const valoresAntes = {};
  for (const b of Object.keys(ctx.barrios)) valoresAntes[b] = motor.valorBarrio(s, b);

  const { s: sPost, ev } = tirarNoticias(s, 'n-euforia');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-euforia' }));

  for (const b of Object.keys(ctx.barrios)) {
    const ajusteEsperado = Math.round(valoresAntes[b] * e.porcentaje);
    assert.equal(
      sPost.bolsa[b].ajuste,
      ajusteEsperado,
      `el barrio ${b} debe ajustar su bolsa en ${ajusteEsperado}`,
    );
  }
});

test('n-reparto: dividendo extraordinario por acción a cada accionista', () => {
  const s = partida();
  const e = ctx.cartas['n-reparto'].efecto;

  s.jugadores.j1.acciones.talleres = 4;
  s.jugadores.j2.acciones.feria = 2;
  const dinero1Antes = s.jugadores.j1.dinero;
  const dinero2Antes = s.jugadores.j2.dinero;
  const dinero3Antes = s.jugadores.j3.dinero;

  const { s: sPost, ev } = tirarNoticias(s, 'n-reparto');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-reparto' }));

  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes + 4 * e.porAccion);
  assert.equal(sPost.jugadores.j2.dinero, dinero2Antes + 2 * e.porAccion);
  assert.equal(sPost.jugadores.j3.dinero, dinero3Antes);
});

test('n-fachadas: todos los dueños pagan reparaciones por casa y torre', () => {
  const s = partida();
  const e = ctx.cartas['n-fachadas'].efecto;

  // j1 tiene 2 casas en la calle 1
  s.props[1] = { dueno: 'j1', nivel: 2, hipotecada: false };
  // j2 tiene 1 torre (nivel 5) en la calle 3
  s.props[3] = { dueno: 'j2', nivel: 5, hipotecada: false };

  const dinero1Antes = s.jugadores.j1.dinero;
  const dinero2Antes = s.jugadores.j2.dinero;
  const dinero3Antes = s.jugadores.j3.dinero;

  const { s: sPost, ev } = tirarNoticias(s, 'n-fachadas');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-fachadas' }));

  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes - 2 * e.casa);
  assert.equal(sPost.jugadores.j2.dinero, dinero2Antes - e.torre);
  assert.equal(sPost.jugadores.j3.dinero, dinero3Antes);
});

test('n-desvio: retrocede casillas sin cobrar sueldo', () => {
  const s = partida();
  const e = ctx.cartas['n-desvio'].efecto;

  const dineroAntes = s.jugadores.j1.dinero;
  const { s: sPost, ev } = tirarNoticias(s, 'n-desvio');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-desvio' }));

  const casillaEsperada = 17 - e.casillas;
  assert.equal(sPost.jugadores.j1.casilla, casillaEsperada);
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes, 'retroceder no cobra sueldo');
});

test('n-nueva-linea: avanza hasta Metro Central y cobra el sueldo al pasar por la Salida', () => {
  const s = partida();
  const e = ctx.cartas['n-nueva-linea'].efecto;

  const dineroAntes = s.jugadores.j1.dinero;
  const { s: sPost, ev } = tirarNoticias(s, 'n-nueva-linea');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-nueva-linea' }));

  assert.equal(sPost.jugadores.j1.casilla, e.casilla);
  assert.ok(hay(ev, { type: 'salida', id: 'j1' }), 'debe pasar por la Salida');
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + eco.sueldo);
});

test('n-feria-inversores: avanza hasta la Bolsa de Valores sin pasar por la Salida', () => {
  const s = partida();
  const e = ctx.cartas['n-feria-inversores'].efecto;

  const dineroAntes = s.jugadores.j1.dinero;
  const { s: sPost, ev } = tirarNoticias(s, 'n-feria-inversores');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-feria-inversores' }));

  assert.equal(sPost.jugadores.j1.casilla, e.casilla);
  assert.ok(!hay(ev, { type: 'salida', id: 'j1' }), 'no pasa por la Salida');
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes);
});

test('n-nomina-adelantada: avanza hasta la Salida y cobra el sueldo', () => {
  const s = partida();
  const e = ctx.cartas['n-nomina-adelantada'].efecto;

  const dineroAntes = s.jugadores.j1.dinero;
  const { s: sPost, ev } = tirarNoticias(s, 'n-nomina-adelantada');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-nomina-adelantada' }));

  assert.equal(sPost.jugadores.j1.casilla, e.casilla);
  assert.ok(hay(ev, { type: 'salida', id: 'j1' }));
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + eco.sueldo);
});

test('n-cumbre: avanza hasta Avenida del Capital sin pasar por la Salida', () => {
  const s = partida();
  const e = ctx.cartas['n-cumbre'].efecto;

  const dineroAntes = s.jugadores.j1.dinero;
  const { s: sPost, ev } = tirarNoticias(s, 'n-cumbre');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-cumbre' }));

  assert.equal(sPost.jugadores.j1.casilla, e.casilla);
  assert.ok(!hay(ev, { type: 'salida', id: 'j1' }));
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes);
});

test('n-loteria: cobra el jugador con menos patrimonio', () => {
  const s = partida();
  const e = ctx.cartas['n-loteria'].efecto;

  s.jugadores.j2.dinero = 500; // j2 es claramente el más pobre
  const dinero2Antes = s.jugadores.j2.dinero;
  const dinero1Antes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarNoticias(s, 'n-loteria');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-loteria' }));
  assert.ok(hay(ev, { type: 'masPobre', id: 'j2' }));

  assert.equal(sPost.jugadores.j2.dinero, dinero2Antes + e.cantidad);
  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes);
});

test('n-suben-tipos: paga por cada propiedad hipotecada que tenga', () => {
  const s = partida();
  const e = ctx.cartas['n-suben-tipos'].efecto;

  // j1 tiene 2 propiedades hipotecadas
  s.props[1] = { dueno: 'j1', nivel: 0, hipotecada: true };
  s.props[3] = { dueno: 'j1', nivel: 0, hipotecada: true };
  const dinero1Antes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarNoticias(s, 'n-suben-tipos');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-suben-tipos' }));

  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes - 2 * e.cantidad);
});

test('n-tasa-municipal: todos los jugadores pagan al banco', () => {
  const s = partida();
  const e = ctx.cartas['n-tasa-municipal'].efecto;
  const dinerosAntes = s.orden.map(id => s.jugadores[id].dinero);

  const { s: sPost, ev } = tirarNoticias(s, 'n-tasa-municipal');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-tasa-municipal' }));

  for (let k = 0; k < sPost.orden.length; k++) {
    const id = sPost.orden[k];
    assert.equal(sPost.jugadores[id].dinero, dinerosAntes[k] - e.cantidad);
  }
});

test('n-premio-urbanismo: cobra cantidad del banco', () => {
  const s = partida();
  const e = ctx.cartas['n-premio-urbanismo'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarNoticias(s, 'n-premio-urbanismo');
  assert.ok(hay(ev, { type: 'carta', carta: 'n-premio-urbanismo' }));

  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + e.cantidad);
});

// --- Mazo Fortuna (16 cartas) ---------------------------------------------------------------------

test('f-deposito: cobras del banco', () => {
  const s = partida();
  const e = ctx.cartas['f-deposito'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-deposito');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-deposito' }));

  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + e.cantidad);
});

test('f-herencia: cobras del banco', () => {
  const s = partida();
  const e = ctx.cartas['f-herencia'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-herencia');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-herencia' }));

  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + e.cantidad);
});

test('f-mercadillo: cobras del banco', () => {
  const s = partida();
  const e = ctx.cartas['f-mercadillo'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-mercadillo');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-mercadillo' }));

  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + e.cantidad);
});

test('f-concurso: cobras del banco', () => {
  const s = partida();
  const e = ctx.cartas['f-concurso'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-concurso');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-concurso' }));

  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + e.cantidad);
});

test('f-multa: pagas al banco y genera deuda si no alcanza', () => {
  // Caso 1: paga normalmente con dinero suficiente
  const s = partida();
  const e = ctx.cartas['f-multa'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-multa');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-multa' }));
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes - e.cantidad);
  assert.equal(sPost.deudas.length, 0);

  // Caso 2: dinero insuficiente genera deuda en s.deudas
  const s2 = partida();
  s2.jugadores.j1.dinero = 10;
  const { s: sPost2, ev: ev2 } = tirarFortuna(s2, 'f-multa');
  assert.ok(hay(ev2, { type: 'deuda', id: 'j1', acreedor: 'banco', cantidad: e.cantidad }));
  assert.equal(sPost2.jugadores.j1.dinero, 10, 'el dinero no baja a negativo');
  assert.equal(sPost2.deudas.length, 1);
  assert.equal(sPost2.deudas[0].cantidad, e.cantidad);
});

test('f-taller: pagas al banco', () => {
  const s = partida();
  const e = ctx.cartas['f-taller'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-taller');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-taller' }));

  assert.equal(sPost.jugadores.j1.dinero, dineroAntes - e.cantidad);
});

test('f-rifa: cada jugador le paga a quien roba', () => {
  const s = partida();
  const e = ctx.cartas['f-rifa'].efecto;
  const dinero1Antes = s.jugadores.j1.dinero;
  const dinero2Antes = s.jugadores.j2.dinero;
  const dinero3Antes = s.jugadores.j3.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-rifa');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-rifa' }));

  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes + 2 * e.cantidad);
  assert.equal(sPost.jugadores.j2.dinero, dinero2Antes - e.cantidad);
  assert.equal(sPost.jugadores.j3.dinero, dinero3Antes - e.cantidad);
});

test('f-cena: quien roba paga a cada jugador', () => {
  const s = partida();
  const e = ctx.cartas['f-cena'].efecto;
  const dinero1Antes = s.jugadores.j1.dinero;
  const dinero2Antes = s.jugadores.j2.dinero;
  const dinero3Antes = s.jugadores.j3.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-cena');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-cena' }));

  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes - 2 * e.cantidad);
  assert.equal(sPost.jugadores.j2.dinero, dinero2Antes + e.cantidad);
  assert.equal(sPost.jugadores.j3.dinero, dinero3Antes + e.cantidad);
});

test('f-en-coche: avanza hasta el siguiente transporte', () => {
  const s = partida();

  const { s: sPost, ev } = tirarFortuna(s, 'f-en-coche');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-en-coche' }));

  // Desde la casilla 7, el siguiente transporte es la casilla 15 (Metro Central)
  assert.equal(sPost.jugadores.j1.casilla, 15);
  assert.equal(ctx.casillas[15].tipo, 'transporte');
});

test('f-sin-conexion: avanza hasta el siguiente servicio', () => {
  const s = partida();

  const { s: sPost, ev } = tirarFortuna(s, 'f-sin-conexion');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-sin-conexion' }));

  // Desde la casilla 7, el siguiente servicio es la casilla 13 (Compañía de Agua)
  assert.equal(sPost.jugadores.j1.casilla, 13);
  assert.equal(ctx.casillas[13].tipo, 'servicio');
});

test('f-inspeccion: lo llevan al Calabozo', () => {
  const s = partida();

  const { s: sPost, ev } = tirarFortuna(s, 'f-inspeccion');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-inspeccion' }));

  assert.equal(sPost.jugadores.j1.casilla, ctx.calabozo);
  assert.ok(sPost.jugadores.j1.calabozo !== null, 'debe quedar preso en el Calabozo');
  assert.ok(hay(ev, { type: 'alCalabozo', id: 'j1', motivo: 'carta' }));
});

test('f-salvoconducto: se lo queda hasta usarlo y no vuelve al mazo', () => {
  const s = partida();
  assert.equal(s.jugadores.j1.salvoconductos, 0);

  const { s: sPost, ev } = tirarFortuna(s, 'f-salvoconducto');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-salvoconducto' }));

  assert.equal(sPost.jugadores.j1.salvoconductos, 1);
  assert.ok(
    !sPost.mazos.fortuna.includes('f-salvoconducto'),
    'el salvoconducto no vuelve al mazo de Fortuna',
  );
});

test('f-soplo: compra acciones a mitad de precio si puede', () => {
  const s = partida();
  const e = ctx.cartas['f-soplo'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-soplo');
  const evCarta = ev.find(x => x.type === 'carta' && x.carta === 'f-soplo');
  assert.ok(evCarta && evCarta.barrio, 'debe elegir un barrio');

  const evCompra = ev.find(x => x.type === 'accionesCompradas');
  assert.ok(evCompra, 'debe emitir evento accionesCompradas');
  assert.equal(evCompra.cantidad, e.cantidad);
  assert.equal(sPost.jugadores.j1.acciones[evCarta.barrio], e.cantidad);
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes - evCompra.coste);
});

test('f-goteras: paga reparaciones por sus casas y torres', () => {
  const s = partida();
  const e = ctx.cartas['f-goteras'].efecto;

  // j1 tiene 3 casas en casilla 1 y 1 torre (nivel 5) en casilla 3
  s.props[1] = { dueno: 'j1', nivel: 3, hipotecada: false };
  s.props[3] = { dueno: 'j1', nivel: 5, hipotecada: false };
  const dinero1Antes = s.jugadores.j1.dinero;
  const dinero2Antes = s.jugadores.j2.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-goteras');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-goteras' }));

  const costeEsperado = 3 * e.casa + e.torre;
  assert.equal(sPost.jugadores.j1.dinero, dinero1Antes - costeEsperado);
  assert.equal(sPost.jugadores.j2.dinero, dinero2Antes, 'los demás jugadores no pagan goteras');
});

test('f-visita-guiada: avanza hasta la Plaza del Reloj sin pasar por la Salida', () => {
  const s = partida();
  const e = ctx.cartas['f-visita-guiada'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-visita-guiada');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-visita-guiada' }));

  assert.equal(sPost.jugadores.j1.casilla, e.casilla);
  assert.ok(!hay(ev, { type: 'salida', id: 'j1' }), 'no pasa por la Salida');
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes);
});

test('f-llaves: retrocede casillas', () => {
  const s = partida();
  const e = ctx.cartas['f-llaves'].efecto;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = tirarFortuna(s, 'f-llaves');
  assert.ok(hay(ev, { type: 'carta', carta: 'f-llaves' }));

  const casillaEsperada = 7 - e.casillas;
  assert.equal(sPost.jugadores.j1.casilla, casillaEsperada);
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes, 'retroceder no cobra sueldo');
});
