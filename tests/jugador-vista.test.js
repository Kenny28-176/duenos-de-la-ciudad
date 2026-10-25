// Lo que ve el celular de un jugador (src/ui/jugador/vista.js): las cifras de los botones tienen que ser las que luego aplica el
// motor, así que se comprueban contra él, también en estados de partidas enteras entre bots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';
import {
  accionDeHabilidad, bolsa, cartera, clasificacion, habilidadActiva, opcionesDePuja, parteDeTrato, parteVacia, propiedades,
  pantallaActual, propiedadesTratables, rivales, situacion, tratos,
} from '../src/ui/jugador/vista.js';

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
const calleDeOtroBarrio = (barrio = 'talleres') => ctx.propiedades.find(i => ctx.casillas[i].tipo === 'calle' && ctx.casillas[i].barrio !== barrio);

// Comprueba que cada cifra que enseña el celular a ese jugador es la que el motor aplica al hacer la acción.
function comprobarCifras(s, id) {
  const puede = motor.posibles(s, id);
  const evento = (accion, tipo) => {
    const r = motor.paso(s, { id, ...accion });
    assert.equal(r.error, null, `${accion.type} debería valer: ${r.error?.mensaje}`);
    return r.events.find(e => e.type === tipo);
  };
  for (const grupo of propiedades(motor, s, id, puede)) {
    for (const it of grupo.items) {
      if (it.construir !== null) assert.equal(evento({ type: 'construir', casilla: it.casilla }, 'construir').coste, it.construir, `construir ${it.casilla}`);
      if (it.vender !== null) assert.equal(evento({ type: 'venderEdificio', casilla: it.casilla }, 'venderEdificio').cantidad, it.vender, `vender ${it.casilla}`);
      if (it.hipotecar !== null) assert.equal(evento({ type: 'hipotecar', casilla: it.casilla }, 'hipotecar').cantidad, it.hipotecar, `hipotecar ${it.casilla}`);
      if (it.deshipotecar !== null) assert.equal(evento({ type: 'deshipotecar', casilla: it.casilla }, 'deshipotecar').coste, it.deshipotecar, `deshipotecar ${it.casilla}`);
    }
  }
  const b = bolsa(motor, s, id, puede);
  if (b) {
    for (const f of b.filas) {
      if (f.comprar !== null) assert.equal(evento({ type: 'comprarAcciones', barrio: f.barrio, cantidad: b.paquete }, 'accionesCompradas').coste, f.comprar, `comprar ${f.barrio}`);
      if (f.vender !== null) assert.equal(evento({ type: 'venderAcciones', barrio: f.barrio, cantidad: b.paquete }, 'accionesVendidas').ingreso, f.vender, `vender ${f.barrio}`);
    }
  }
  return puede;
}

test('la cartera da el dinero, el patrimonio y el avance hacia la meta (sin pasarse del 100 %)', () => {
  const s = partida();
  const c = cartera(motor, s, 'j1');
  assert.equal(c.dinero, ctx.eco.dineroInicial);
  assert.equal(c.patrimonio, motor.patrimonio(s, 'j1'));
  assert.equal(c.meta, 10000);
  assert.equal(c.avance, c.patrimonio / 10000);
  s.jugadores.j1.dinero = 50000;
  assert.equal(cartera(motor, s, 'j1').avance, 1);
  s.opciones.meta = null;
  assert.equal(cartera(motor, s, 'j1').avance, null);
});

test('la situación dice de quién es el turno y si hay una subasta o una deuda', () => {
  const s = partida();
  assert.deepEqual(situacion(s, 'j1'), { tipo: 'mi-turno', quien: 'j1', fase: 'inicio', compra: null });
  assert.equal(situacion(s, 'j2').tipo, 'turno-ajeno');
  assert.equal(situacion(s, 'j2').quien, 'j1');
  s.deudas.push({ id: 'j2', acreedor: 'j1', cantidad: 500, motivo: 'alquiler' });
  assert.equal(situacion(s, 'j2').tipo, 'deuda-mia');
  assert.deepEqual(situacion(s, 'j1'), { tipo: 'deuda-ajena', quien: 'j2' });
  s.subasta = { casilla: 3, origen: 'j1', puja: 0, lider: null, activos: ['j1', 'j2'] };
  assert.equal(situacion(s, 'j1').tipo, 'subasta', 'la subasta pasa por delante de todo');
  s.fase = 'fin';
  assert.equal(situacion(s, 'j1').tipo, 'fin');
});

test('las propiedades salen por barrios, luego transportes y servicios, con lo que se puede hacer con cada una', () => {
  const s = partida();
  const barrio = ctx.barrios.talleres;
  for (const i of barrio.calles) s.props[i].dueno = 'j1';
  const transporte = ctx.transportes[0];
  const servicio = ctx.servicios[0];
  s.props[transporte].dueno = 'j1';
  s.props[servicio].dueno = 'j1';
  const otra = calleDeOtroBarrio();
  s.props[otra].dueno = 'j1';
  s.props[otra].hipotecada = true;
  const grupos = propiedades(motor, s, 'j1', motor.posibles(s, 'j1'));
  assert.deepEqual(grupos.map(g => g.tipo), ['barrio', 'barrio', 'transporte', 'servicio']);
  assert.deepEqual(grupos.map(g => g.barrio ?? null), ['talleres', ctx.casillas[otra].barrio, null, null].sort((a, b) => 0));
  const talleres = grupos.find(g => g.barrio === 'talleres');
  assert.equal(talleres.completo, true);
  assert.equal(talleres.items.length, barrio.calles.length);
  const primera = talleres.items[0];
  assert.equal(primera.construir, motor.costeConstruir(s, 'j1', primera.casilla));
  assert.equal(primera.hipotecar, motor.valorHipoteca(primera.casilla));
  assert.equal(primera.vender, null, 'sin edificios no hay nada que vender');
  assert.equal(primera.alquiler, motor.alquiler(s, primera.casilla));
  const ajena = grupos.find(g => g.barrio === ctx.casillas[otra].barrio);
  assert.equal(ajena.completo, ajena.total === 1);
  assert.equal(ajena.items[0].hipotecada, true);
  assert.equal(ajena.items[0].alquiler, null, 'una propiedad hipotecada no cobra');
  assert.equal(ajena.items[0].deshipotecar, motor.costeDeshipotecar(otra));
  const servicios = grupos.find(g => g.tipo === 'servicio');
  assert.equal(servicios.items[0].alquiler, null);
  assert.equal(servicios.items[0].factorDados, ctx.eco.servicios[0]);
  assert.equal(grupos.find(g => g.tipo === 'transporte').items[0].alquiler, ctx.eco.transportes[0]);
  // Quien no tiene nada, no tiene grupos.
  assert.deepEqual(propiedades(motor, s, 'j2', {}), []);
});

test('el precio de vender un edificio sale del motor: una torre baja a 4 casas, o a las que tenga el banco', () => {
  for (const casasDelBanco of [30, 2, 0]) {
    const s = partida();
    for (const i of ctx.barrios.talleres.calles) {
      s.props[i].dueno = 'j1';
      s.props[i].nivel = 5;
    }
    s.banco.casas = casasDelBanco;
    const puede = motor.posibles(s, 'j1');
    const grupo = propiedades(motor, s, 'j1', puede).find(g => g.barrio === 'talleres');
    const casilla = grupo.items[0].casilla;
    const coste = ctx.casillas[casilla].costeCasa;
    const esperado = Math.round((5 - Math.min(4, casasDelBanco)) * coste * ctx.eco.ventaEdificios);
    assert.equal(grupo.items[0].vender, esperado, `con ${casasDelBanco} casas en el banco`);
    comprobarCifras(s, 'j1');
  }
});

test('la Bolsa enseña el precio, lo que cuesta un paquete y si está abierta', () => {
  const s = partida();
  const cerrada = bolsa(motor, s, 'j1', motor.posibles(s, 'j1'));
  assert.equal(cerrada.abierta, false);
  assert.equal(cerrada.paquete, ctx.eco.bolsa.paquete);
  assert.equal(cerrada.filas.length, Object.keys(ctx.barrios).length);
  assert.ok(cerrada.filas.every(f => f.comprar === null && f.vender === null), 'cerrada: no hay botones');
  s.turno.bolsaAbierta = true;
  s.jugadores.j1.acciones.feria = 10;
  const abierta = bolsa(motor, s, 'j1', motor.posibles(s, 'j1'));
  assert.equal(abierta.abierta, true);
  assert.equal(bolsa(motor, s, 'j2', motor.posibles(s, 'j2')).abierta, false, 'solo la ve abierta quien tiene el turno');
  const feria = abierta.filas.find(f => f.barrio === 'feria');
  assert.equal(feria.tengo, 10);
  assert.equal(feria.comprar, ctx.eco.bolsa.paquete * motor.precioAccion(s, 'feria'));
  assert.equal(feria.vender, Math.floor(ctx.eco.bolsa.paquete * motor.precioAccion(s, 'feria') * ctx.eco.bolsa.recompra));
  comprobarCifras(s, 'j1');
  s.opciones.mercado = false;
  assert.equal(bolsa(motor, s, 'j1', {}), null, 'sin mercado vivo no hay Bolsa');
});

test('los tratos se ven desde quien mira: lo que doy y lo que recibo', () => {
  const s = partida();
  s.props[1].dueno = 'j1';
  s.props[calleDeOtroBarrio()].dueno = 'j2';
  const r = motor.paso(s, { type: 'proponerTrato', id: 'j1', para: 'j2', ofrece: { dinero: 100, propiedades: [1] }, pide: { propiedades: [calleDeOtroBarrio()] } });
  assert.equal(r.error, null);
  const hechos = r.state;
  const mio = tratos(hechos, 'j1', motor.posibles(hechos, 'j1'));
  assert.equal(mio.length, 1);
  assert.equal(mio[0].recibido, false);
  assert.equal(mio[0].con, 'j2');
  assert.equal(mio[0].doy.dinero, 100);
  assert.deepEqual(mio[0].recibo.propiedades, [calleDeOtroBarrio()]);
  assert.equal(mio[0].puedeAceptar, false, 'no se acepta un trato propio');
  const suyo = tratos(hechos, 'j2', motor.posibles(hechos, 'j2'));
  assert.equal(suyo[0].recibido, true);
  assert.equal(suyo[0].con, 'j1');
  assert.deepEqual(suyo[0].doy.propiedades, [calleDeOtroBarrio()]);
  assert.equal(suyo[0].recibo.dinero, 100);
  assert.equal(suyo[0].puedeAceptar, true);
  assert.deepEqual(tratos(hechos, 'j3', motor.posibles(hechos, 'j3')), [], 'un tercero no ve el trato');
});

test('las propiedades que se pueden tratar excluyen las calles con edificios en su barrio', () => {
  const s = partida();
  for (const i of ctx.barrios.talleres.calles) s.props[i].dueno = 'j1';
  s.props[ctx.transportes[0]].dueno = 'j1';
  assert.deepEqual(propiedadesTratables(motor, s, 'j1').sort((a, b) => a - b), [...ctx.barrios.talleres.calles, ctx.transportes[0]].sort((a, b) => a - b));
  s.props[ctx.barrios.talleres.calles[0]].nivel = 1;
  assert.deepEqual(propiedadesTratables(motor, s, 'j1'), [ctx.transportes[0]]);
  assert.deepEqual(rivales(s, 'j1'), ['j2', 'j3']);
  s.jugadores.j2.quebrado = true;
  assert.deepEqual(rivales(s, 'j1'), ['j3'], 'los que quebraron no cuentan');
});

test('una parte de trato sin lo que está en cero es la que acepta el motor', () => {
  assert.deepEqual(parteDeTrato({ dinero: 0, propiedades: [], acciones: { feria: 0, talleres: 5 }, salvoconductos: 0 }), { acciones: { talleres: 5 } });
  assert.equal(parteVacia({ dinero: 0, propiedades: [], acciones: {}, salvoconductos: 0 }), true);
  assert.equal(parteVacia({ dinero: 1, propiedades: [], acciones: {}, salvoconductos: 0 }), false);
  const s = partida();
  s.props[1].dueno = 'j1';
  s.jugadores.j1.acciones.feria = 10;
  s.jugadores.j1.salvoconductos = 1;
  const parte = parteDeTrato({ dinero: 50, propiedades: [1], acciones: { feria: 5, talleres: 0 }, salvoconductos: 1 });
  const r = motor.paso(s, { type: 'proponerTrato', id: 'j1', para: 'j2', ofrece: parte, pide: parteDeTrato({ dinero: 20, propiedades: [], acciones: {}, salvoconductos: 0 }) });
  assert.equal(r.error, null, r.error?.mensaje);
  const aceptado = motor.paso(r.state, { type: 'aceptarTrato', id: 'j2', trato: 't1' });
  assert.equal(aceptado.error, null, aceptado.error?.mensaje);
  assert.equal(aceptado.state.props[1].dueno, 'j2');
  assert.equal(aceptado.state.jugadores.j2.acciones.feria, 5);
});

test('las pujas que se ofrecen son +10, +50 y +100 sobre la más alta, y no pasan del dinero', () => {
  assert.deepEqual(opcionesDePuja(10, 1000), [10, 50, 100], 'sin pujas: 10, 50 y 100');
  assert.deepEqual(opcionesDePuja(70, 1000), [70, 110, 160], 'con 60 de puja: +10, +50 y +100');
  assert.deepEqual(opcionesDePuja(70, 120), [70, 110]);
  assert.deepEqual(opcionesDePuja(50, 65), [50]);
  assert.deepEqual(opcionesDePuja(80, 70), []);
  assert.deepEqual(opcionesDePuja(100, 100, 25), [100]);
});

test('la habilidad activa pide lo que necesita y manda una acción que el motor acepta, en las 10 fichas', () => {
  const fichas = Object.keys(ctx.fichas);
  const ofrecidas = [];
  for (const ficha of fichas) {
    const s = partida([ficha, ...fichas.filter(f => f !== ficha).slice(0, 3)], { habilidades: true });
    for (const i of ctx.barrios.talleres.calles) s.props[i].dueno = 'j1';
    s.props[calleDeOtroBarrio()].dueno = 'j2';
    const hab = habilidadActiva(motor.posibles(s, 'j1'));
    if (!hab) continue;
    ofrecidas.push(hab.id);
    assert.equal(hab.id, ctx.fichas[ficha].activa.id);
    const valor = { barrio: hab.barrios[0], casilla: hab.casillas[0], objetivo: hab.objetivos[0], cantidad: hab.maximo }[hab.eleccion];
    if (hab.eleccion) assert.notEqual(valor, undefined, `${hab.id} debería ofrecer algo que elegir`);
    const accion = accionDeHabilidad(hab, valor);
    assert.equal(accion.type, 'usarHabilidad');
    const r = motor.paso(s, { id: 'j1', ...accion });
    assert.equal(r.error, null, `${hab.id}: ${r.error?.mensaje}`);
  }
  assert.ok(ofrecidas.length >= 9, `casi todas las habilidades se pueden usar al empezar (salieron ${ofrecidas.join(', ')})`);
  assert.equal(habilidadActiva({}), null);
  assert.deepEqual(accionDeHabilidad({ eleccion: null }), { type: 'usarHabilidad' });
});

test('la clasificación ordena por patrimonio, deja al final a los que quebraron y marca al ganador', () => {
  const s = partida();
  s.jugadores.j2.dinero = 9000;
  s.jugadores.j3.quebrado = true;
  s.props[1].dueno = 'j1';
  const filas = clasificacion(motor, s);
  assert.deepEqual(filas.map(f => f.id), ['j2', 'j1', 'j3']);
  assert.equal(filas[1].propiedades, 1);
  assert.equal(filas[2].propiedades, 0);
  assert.ok(filas.every(f => f.ganador === false));
  s.ganador = 'j2';
  assert.equal(clasificacion(motor, s)[0].ganador, true);
});

test('en partidas enteras entre bots, las cifras de los botones de todos son las que aplica el motor', () => {
  let comprobados = 0;
  for (const semilla of [3, 11, 29]) {
    const n = 3 + (semilla % 3);
    let contador = 0;
    simularPartida(motor, {
      semilla,
      fichas: fichasParaPartida(motor, semilla, n),
      comprobar: false,
      maxTurnos: 160,
      alEvento(e, s) {
        // Una vez por turno nuevo, y cada vez que se construye o se vende (donde están los casos raros).
        if (e.type !== 'turno' && e.type !== 'construir' && e.type !== 'venderEdificio') return;
        if (++contador % 3 !== 0) return;
        for (const id of s.orden) {
          if (s.jugadores[id].quebrado) continue;
          comprobarCifras(s, id);
          comprobados++;
        }
      },
    });
  }
  assert.ok(comprobados > 100, `se comprobaron ${comprobados} estados de jugador`);
});

test('la pantalla que toca sale de lo que se sabe: conectar, pedir nombre, vestíbulo, partida y final', () => {
  const datos = (cambios = {}) => ({ sala: true, estado: { fase: 'sala' }, vista: { puede: {} }, miId: null, ...cambios });
  const pantalla = (cambios, extra = {}) => pantallaActual({ codigo: 'BCDF', datos: datos(cambios), ...extra });
  assert.equal(pantallaActual({ codigo: 'BCDF', datos: datos(), sinRed: true }), 'sin-red', 'sin manera de hablar con el tablero, nada más importa');
  assert.equal(pantallaActual({ codigo: '', datos: null }), 'codigo');
  assert.equal(pantallaActual({ codigo: 'BCDF', datos: null }), 'conectando');
  assert.equal(pantalla({ sala: null }), 'conectando', 'todavía no se sabe si la sala existe');
  assert.equal(pantalla({ vista: {} }), 'conectando', 'todavía no llegó la vista de este celular');
  assert.equal(pantalla({ estado: null }), 'conectando');
  assert.equal(pantalla({ sala: false }), 'sin-sala');
  assert.equal(pantalla({}, { cerrada: true }), 'cerrada');
  assert.equal(pantalla({ miId: null }), 'nombre');
  assert.equal(pantalla({ estado: { fase: 'juego' } }), 'empezada', 'si la partida ya empezó, no se entra');
  assert.equal(pantalla({ miId: 'j1' }), 'vestibulo');
  assert.equal(pantalla({ miId: 'j1', estado: { fase: 'juego' } }), 'partida');
  assert.equal(pantalla({ miId: 'j1', estado: { fase: 'fin' } }), 'final');
});
