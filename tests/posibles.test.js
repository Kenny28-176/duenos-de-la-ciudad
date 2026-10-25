// Qué botones tiene cada jugador (src/engine/posibles.js): salen exactamente las acciones que el motor aceptaría.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';
import { decidirBot, quienActua } from '../src/engine/bots.js';

const motor = crearMotor(await cargarDatos());
const { ctx } = motor;

function partida(fichas = ['rata', 'toro', 'oso'], opciones = {}) {
  let s = motor.nuevaPartida({ semilla: 7 });
  const hacer = a => {
    const r = motor.paso(s, a);
    assert.equal(r.error, null, r.error?.mensaje);
    s = r.state;
  };
  fichas.forEach((f, k) => hacer({ type: 'unirse', id: `j${k + 1}`, nombre: `Jugador ${k + 1}`, ficha: f }));
  hacer({ type: 'configurar', opciones: { dadosDePrueba: true, habilidades: false, ...opciones } });
  hacer({ type: 'empezar' });
  s.orden = fichas.map((_, k) => `j${k + 1}`);
  s.turno.id = 'j1';
  return s;
}

test('antes de empezar o después de acabar, nadie puede hacer nada', () => {
  assert.deepEqual(motor.posibles(motor.nuevaPartida({ semilla: 1 }), 'j1'), {});
  const s = partida();
  s.fase = 'fin';
  assert.deepEqual(motor.posibles(s, 'j1'), {});
  assert.deepEqual(motor.posibles(partida(), 'nadie'), {});
});

test('al empezar el turno solo puede tirar quien lo tiene, y los demás solo pueden proponer tratos', () => {
  const s = partida();
  const p1 = motor.posibles(s, 'j1');
  assert.deepEqual(Object.keys(p1).sort(), ['comprarAcciones', 'hipotecar'].filter(k => k in p1).concat(['proponerTrato', 'tirar']).sort());
  assert.equal(p1.tirar, true);
  assert.deepEqual(motor.posibles(s, 'j2'), { proponerTrato: true });
});

test('al caer en una calle libre, comprar (con su precio) o dejar que se subaste', () => {
  let s = partida();
  s = motor.paso(s, { type: 'tirar', id: 'j1', dados: [1, 2] }).state;
  const p = motor.posibles(s, 'j1');
  assert.equal(p.comprar, ctx.casillas[3].precio);
  assert.equal(p.noComprar, true);
  assert.ok(!p.tirar && !p.terminarTurno, 'primero hay que decidir');
  s.jugadores.j1.dinero = 10;
  assert.ok(!('comprar' in motor.posibles(s, 'j1')), 'sin dinero, no puede comprar');
  assert.equal(motor.posibles(s, 'j1').noComprar, true);
});

test('con el barrio completo puede construir, y vender y hipotecar según lo que tenga', () => {
  const s = partida();
  for (const i of [1, 3]) s.props[i].dueno = 'j1';
  s.props[5].dueno = 'j1';
  const p = motor.posibles(s, 'j1');
  assert.deepEqual(p.construir, [1, 3]);
  assert.deepEqual(p.hipotecar, [1, 3, 5]);
  assert.ok(!p.venderEdificio && !p.deshipotecar);
  s.props[1].nivel = 1;
  assert.deepEqual(motor.posibles(s, 'j1').venderEdificio, [1]);
  assert.deepEqual(motor.posibles(s, 'j1').construir, [3], 'primero la que tiene menos edificios');
  s.props[5].hipotecada = true;
  assert.deepEqual(motor.posibles(s, 'j1').deshipotecar, [5]);
});

test('las acciones de la Bolsa solo están con la Bolsa abierta', () => {
  const s = partida();
  assert.ok(!('comprarAcciones' in motor.posibles(s, 'j1')));
  s.turno.bolsaAbierta = true;
  s.jugadores.j1.acciones.feria = 10;
  const p = motor.posibles(s, 'j1');
  assert.equal(p.comprarAcciones.length, 8);
  assert.deepEqual(p.venderAcciones, ['feria']);
});

test('durante una subasta, pujar (con la puja mínima) y retirarse; el que va ganando no puede retirarse', () => {
  let s = partida();
  s = motor.paso(s, { type: 'tirar', id: 'j1', dados: [1, 2] }).state;
  s = motor.paso(s, { type: 'noComprar', id: 'j1' }).state;
  assert.deepEqual(motor.posibles(s, 'j2'), { pujar: ctx.eco.subasta.minimo, retirarse: true });
  assert.deepEqual(Object.keys(motor.posibles(s, 'j1')).sort(), ['pujar', 'retirarse']);
  s = motor.paso(s, { type: 'pujar', id: 'j2', cantidad: 30 }).state;
  assert.deepEqual(motor.posibles(s, 'j2'), {}, 'el que va ganando espera');
  assert.equal(motor.posibles(s, 'j3').pujar, 40);
});

test('con una deuda, quien debe puede vender y declararse en bancarrota; los demás esperan', () => {
  const s = partida();
  s.jugadores.j2.dinero = 0;
  s.jugadores.j2.acciones.feria = 5;
  s.deudas.push({ id: 'j2', acreedor: 'j1', cantidad: 100, motivo: 'alquiler' });
  const p = motor.posibles(s, 'j2');
  assert.equal(p.declararBancarrota, true);
  assert.deepEqual(p.venderAcciones, ['feria']);
  assert.ok(!p.tirar);
  assert.ok(!('declararBancarrota' in motor.posibles(s, 'j1')));
  assert.ok(!('tirar' in motor.posibles(s, 'j1')), 'mientras haya una deuda, nadie tira');
});

test('en el Calabozo: pagar la fianza (con su precio) y el salvoconducto si lo tiene', () => {
  const s = partida();
  Object.assign(s.jugadores.j1, { casilla: ctx.calabozo, calabozo: { intentos: 0 } });
  assert.equal(motor.posibles(s, 'j1').pagarFianza, ctx.eco.fianza);
  assert.ok(!('usarSalvoconducto' in motor.posibles(s, 'j1')));
  s.jugadores.j1.salvoconductos = 1;
  assert.equal(motor.posibles(s, 'j1').usarSalvoconducto, true);
});

test('los tratos: proponer siempre (salvo en subasta), y contestar los que te tocan', () => {
  let s = partida();
  s = motor.paso(s, { type: 'proponerTrato', id: 'j2', para: 'j1', ofrece: { dinero: 50 }, pide: {} }).state;
  assert.deepEqual(motor.posibles(s, 'j1').aceptarTrato, ['t1']);
  assert.deepEqual(motor.posibles(s, 'j1').rechazarTrato, ['t1']);
  assert.deepEqual(motor.posibles(s, 'j2').rechazarTrato, ['t1'], 'quien lo propuso puede retirarlo');
  assert.ok(!('aceptarTrato' in motor.posibles(s, 'j2')));
  assert.ok(!('rechazarTrato' in motor.posibles(s, 'j3')));
});

test('cada habilidad activa ofrece sus opciones: barrios, calles, rivales o cuánto pedir', () => {
  const casos = {
    rata: [{ id: 'esprint' }],
    toro: [{ id: 'rally', barrios: Object.keys(ctx.barrios) }],
    taza: [{ id: 'prestamo-expres', maximo: 600 }],
    oso: [{ id: 'hibernar' }],
    burbuja: [null], // sin calles, no hay a qué inflar
    'vaca-lechera': [{ id: 'temporada-alta' }],
    'elefante-blanco': [null], // sin calles de rivales, no hay obras
    hormiga: [{ id: 'hormiguero' }],
    tiburon: [{ id: 'frenesi', objetivos: ['j2'] }],
    'cisne-negro': [{ id: 'imprevisto', objetivos: ['j2'] }],
  };
  for (const [ficha, [esperado]] of Object.entries(casos)) {
    const s = partida([ficha, ficha === 'oso' ? 'rata' : 'oso'], { habilidades: true });
    const hab = motor.posibles(s, 'j1').habilidad;
    if (esperado === null) assert.equal(hab, undefined, ficha);
    else assert.deepEqual(hab, esperado, ficha);
  }
  // Con calles propias y ajenas, ya hay opciones.
  const s = partida(['burbuja', 'elefante-blanco'], { habilidades: true });
  s.props[1].dueno = 'j1';
  s.props[3].dueno = 'j2';
  assert.deepEqual(motor.posibles(s, 'j1').habilidad, { id: 'inflar', casillas: [1] });
  s.turno.id = 'j2';
  assert.deepEqual(motor.posibles(s, 'j2').habilidad, { id: 'obras-eternas', casillas: [1] });
  // Y sin habilidades en la sala, no hay botón.
  assert.ok(!('habilidad' in motor.posibles(partida(['rata', 'oso']), 'j1')));
});

test('coherencia: en partidas reales, todo lo que dice que se puede, el motor lo acepta, y quien le toca siempre puede algo', () => {
  for (const semilla of [21, 22, 23]) {
    const fichas = fichasParaPartida(motor, semilla, 4);
    let revisados = 0;
    simularPartida(motor, {
      semilla, fichas, comprobar: false, maxTurnos: 120,
      alEvento: (e, s) => {
        if (e.type !== 'dados' && e.type !== 'compra' && e.type !== 'subasta') return;
        if (s.fase !== 'juego') return;
        const actor = quienActua(s);
        if (actor) {
          const p = motor.posibles(s, actor);
          assert.ok(Object.keys(p).length > 0, `${actor} debería poder hacer algo (${JSON.stringify(decidirBot(ctx, s, actor))})`);
          // La acción que elegiría un bot está entre las posibles.
          const accion = decidirBot(ctx, s, actor);
          if (accion.type !== 'usarHabilidad' && accion.type !== 'proponerTrato') {
            assert.ok(accion.type in p, `${actor} quiere «${accion.type}» y no está en ${JSON.stringify(p)}`);
          }
          revisados++;
        }
      },
    });
    assert.ok(revisados > 20, `${revisados} comprobaciones`);
  }
});
