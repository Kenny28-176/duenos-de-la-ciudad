// Pruebas unitarias de casos límite y reglas extra del motor (T-10 de trabajoParalelo.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';

const DATOS = await cargarDatos();
const motor = crearMotor(DATOS);
const { ctx } = motor;
const { eco } = ctx;
const INICIAL = eco.dineroInicial;

// --- Ayudantes copiados de tests/motor.test.js (de Claude), según T-08 y T-10 -----------------------

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

// --- Los 20 casos límite ---------------------------------------------------------------------------

test('1. transportes: el alquiler es según cuántos tenga el dueño (eco.transportes)', () => {
  const s = partida();
  const transportes = ctx.transportes; // [5, 15, 25, 35]
  assert.equal(transportes.length, 4);

  // 1 transporte
  s.props[transportes[0]] = { dueno: 'j1', nivel: 0, hipotecada: false };
  assert.equal(motor.alquiler(s, transportes[0]), eco.transportes[0]);

  // 2 transportes
  s.props[transportes[1]] = { dueno: 'j1', nivel: 0, hipotecada: false };
  assert.equal(motor.alquiler(s, transportes[0]), eco.transportes[1]);
  assert.equal(motor.alquiler(s, transportes[1]), eco.transportes[1]);

  // 3 transportes
  s.props[transportes[2]] = { dueno: 'j1', nivel: 0, hipotecada: false };
  assert.equal(motor.alquiler(s, transportes[0]), eco.transportes[2]);

  // 4 transportes
  s.props[transportes[3]] = { dueno: 'j1', nivel: 0, hipotecada: false };
  assert.equal(motor.alquiler(s, transportes[0]), eco.transportes[3]);
});

test('2. servicios: los dados por 5 si el dueño tiene uno y por 12 si tiene los dos (eco.servicios)', () => {
  const s = partida();
  const servicios = ctx.servicios; // [13, 27]
  assert.equal(servicios.length, 2);

  const dados = [3, 4]; // suma 7

  // Con 1 servicio
  s.props[servicios[0]] = { dueno: 'j1', nivel: 0, hipotecada: false };
  assert.equal(motor.alquiler(s, servicios[0], dados), 7 * eco.servicios[0]);

  // Con los 2 servicios
  s.props[servicios[1]] = { dueno: 'j1', nivel: 0, hipotecada: false };
  assert.equal(motor.alquiler(s, servicios[0], dados), 7 * eco.servicios[1]);
  assert.equal(motor.alquiler(s, servicios[1], dados), 7 * eco.servicios[1]);
});

test('3. sin casas en el banco no se construye (existencias)', () => {
  const s = partida();
  // j1 es dueño de todo el barrio talleres (calles 1 y 3)
  s.props[1] = { dueno: 'j1', nivel: 0, hipotecada: false };
  s.props[3] = { dueno: 'j1', nivel: 0, hipotecada: false };
  s.turno.fase = 'gestion';

  // Si no quedan casas en el banco
  s.banco.casas = 0;
  rechaza(s, { type: 'construir', id: 'j1', casilla: 1 }, 'existencias');
});

test('4. al vender una torre sin 4 casas en el banco, la calle se queda con las que haya y el dueño cobra los niveles que pierde', () => {
  const s = partida();
  // j1 tiene torre en la calle 1 y calle 3
  s.props[1] = { dueno: 'j1', nivel: 5, hipotecada: false };
  s.props[3] = { dueno: 'j1', nivel: 5, hipotecada: false };
  s.turno.fase = 'gestion';

  // Solo hay 2 casas disponibles en el banco (menos de 4)
  s.banco.casas = 2;
  s.banco.torres = 0;
  const dineroAntes = s.jugadores.j1.dinero;
  const costeCasa = ctx.casillas[1].costeCasa;

  const { s: sPost } = jugar(s, { type: 'venderEdificio', id: 'j1', casilla: 1 });

  // La calle se queda con las casas que había en el banco (2 casas)
  assert.equal(sPost.props[1].nivel, 2);
  assert.equal(sPost.banco.casas, 0);
  assert.equal(sPost.banco.torres, 1);

  // El dueño cobra por los 3 niveles perdidos (5 - 2 = 3)
  const cobroEsperado = Math.round(3 * costeCasa * eco.ventaEdificios);
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + cobroEsperado);
});

test('5. pasar por la Salida y caer en ella cobra el sueldo una sola vez', () => {
  const s = partida();
  // Situamos a j1 en la casilla 38. Dados [1, 1] avanzan 2 pasos: 38 -> 39 -> 0 (Salida)
  s.jugadores.j1.casilla = 38;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 1] });

  assert.equal(sPost.jugadores.j1.casilla, 0);
  const eventosSalida = ev.filter(e => e.type === 'salida' && e.id === 'j1');
  assert.equal(eventosSalida.length, 1, 'solo debe emitirse un evento de salida');
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes + eco.sueldo);
});

test('6. ¡Auditoría! manda al Calabozo sin cobrar el sueldo', () => {
  const s = partida();
  // Situamos a j1 en la casilla 26 y tira [2, 2] (4 pasos) -> cae en casilla 30 (¡Auditoría!)
  s.jugadores.j1.casilla = 26;
  const dineroAntes = s.jugadores.j1.dinero;

  const { s: sPost, ev } = jugar(s, { type: 'tirar', id: 'j1', dados: [2, 2] });

  assert.equal(sPost.jugadores.j1.casilla, ctx.calabozo);
  assert.ok(sPost.jugadores.j1.calabozo !== null);
  assert.ok(hay(ev, { type: 'alCalabozo', id: 'j1', motivo: 'auditoria' }));
  assert.ok(!hay(ev, { type: 'salida', id: 'j1' }), 'no debe pasar por Salida');
  assert.equal(sPost.jugadores.j1.dinero, dineroAntes);
});

test('7. con el tercer doble consecutivo no se mueve la ficha', () => {
  const s = partida();
  // Asignamos a j1 sus propiedades para que no se detenga en fase de compra
  for (const i of ctx.propiedades) s.props[i] = { dueno: 'j1', nivel: 0, hipotecada: false };

  // Tirada 1 con dobles: [1, 1] -> avanza a 2
  const { s: s1 } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 1] });
  assert.equal(s1.jugadores.j1.casilla, 2);
  assert.equal(s1.turno.dobles, 1);
  assert.equal(s1.turno.fase, 'inicio');

  // Tirada 2 con dobles: [2, 2] -> avanza a 6
  const { s: s2 } = jugar(s1, { type: 'tirar', id: 'j1', dados: [2, 2] });
  assert.equal(s2.jugadores.j1.casilla, 6);
  assert.equal(s2.turno.dobles, 2);
  assert.equal(s2.turno.fase, 'inicio');

  // Tirada 3 con dobles: [3, 3] -> directo al Calabozo sin avanzar 6 casillas
  const { s: s3, ev } = jugar(s2, { type: 'tirar', id: 'j1', dados: [3, 3] });
  assert.equal(s3.jugadores.j1.casilla, ctx.calabozo);
  assert.ok(s3.jugadores.j1.calabozo !== null);
  assert.ok(hay(ev, { type: 'alCalabozo', id: 'j1', motivo: 'tres-dobles' }));
});

test('8. esprint: en el Calabozo da error calabozo; los dobles cuentan solo con los dos primeros dados', () => {
  const s = partida({ fichas: ['rata', 'oso'], habilidades: true });
  s.jugadores.j1.calabozo = { intentos: 0 };
  s.jugadores.j1.casilla = ctx.calabozo;

  // En el Calabozo no se puede usar Esprint
  rechaza(s, { type: 'usarHabilidad', id: 'j1' }, 'calabozo');

  // Fuera del Calabozo: usar esprint
  s.jugadores.j1.calabozo = null;
  s.jugadores.j1.casilla = 0;
  const { s: sEsprint } = jugar(s, { type: 'usarHabilidad', id: 'j1' });
  assert.equal(sEsprint.turno.esprint, true);

  // Tirada con 3 dados donde los dos primeros son dobles: [2, 2, 5] -> repite turno
  const { s: sTiroDobles } = jugar(sEsprint, { type: 'tirar', id: 'j1', dados: [2, 2, 5] });
  assert.equal(sTiroDobles.jugadores.j1.casilla, 9);
  assert.equal(sTiroDobles.turno.repite, true);

  // En cambio, si el 2º y 3º son iguales pero los 2 primeros no: [2, 5, 5] -> no cuenta como dobles
  const s2 = partida({ fichas: ['rata', 'oso'], habilidades: true });
  const { s: sEsprint2 } = jugar(s2, { type: 'usarHabilidad', id: 'j1' });
  const { s: sTiroNoDobles } = jugar(sEsprint2, { type: 'tirar', id: 'j1', dados: [2, 5, 5] });
  assert.equal(sTiroNoDobles.turno.repite, false);
});

test('9. hibernar después de tirar da momento', () => {
  const s = partida({ fichas: ['oso', 'rata'], habilidades: true });
  // Tras tirar los dados
  const { s: sTirado } = jugar(s, { type: 'tirar', id: 'j1', dados: [2, 3] });
  rechaza(sTirado, { type: 'usarHabilidad', id: 'j1' }, 'momento');
});

test('10. préstamo exprés: pedir otro sin devolver el primero da prestamo, y cantidad no múltiplo de 10 da cantidad', () => {
  const s = partida({ fichas: ['taza', 'rata'], habilidades: true });

  // Cantidad no múltiplo de 10 o inválida da error 'cantidad'
  rechaza(s, { type: 'usarHabilidad', id: 'j1', cantidad: 25 }, 'cantidad');
  rechaza(s, { type: 'usarHabilidad', id: 'j1', cantidad: 5 }, 'cantidad');

  // Pedir préstamo válido de 100 $
  const { s: sPrestamo } = jugar(s, { type: 'usarHabilidad', id: 'j1', cantidad: 100 });
  assert.ok(sPrestamo.jugadores.j1.hab.prestamo !== null);

  // En su siguiente turno (o reseteando la bandera de uso por turno), pedir otro sin devolver el primero da error 'prestamo'
  sPrestamo.turno.habilidadUsada = false;
  rechaza(sPrestamo, { type: 'usarHabilidad', id: 'j1', cantidad: 100 }, 'prestamo');
});

test('11. imprevisto dos veces seguidas contra el mismo jugador da mismo_objetivo', () => {
  const s = partida({ fichas: ['cisne-negro', 'rata', 'toro'], habilidades: true });

  // j1 usa Imprevisto contra j2
  const { s: s1 } = jugar(s, { type: 'usarHabilidad', id: 'j1', objetivo: 'j2' });
  assert.equal(s1.jugadores.j2.pierdeTurno, true);
  assert.equal(s1.jugadores.j1.hab.ultimoObjetivo, 'j2');

  // Reseteamos enfriamiento y turno para j1 a mano
  s1.jugadores.j1.hab.enfriamiento = 0;
  s1.turno.habilidadUsada = false;

  // Intentar usarlo de nuevo contra j2 da 'mismo_objetivo'
  rechaza(s1, { type: 'usarHabilidad', id: 'j1', objetivo: 'j2' }, 'mismo_objetivo');
});

test('12. frenesí: si el jugador marcado cae en una propiedad con dueño, la marca sigue hasta la próxima libre', () => {
  const s = partida({ fichas: ['tiburon', 'rata'], habilidades: true });

  // j1 usa Frenesí marcando a j2
  const { s: sMarcado } = jugar(s, { type: 'usarHabilidad', id: 'j1', objetivo: 'j2' });
  assert.equal(sMarcado.jugadores.j2.marcado, true);

  // j1 termina su turno
  const { s: sTurnoJ2 } = jugar(sMarcado, { type: 'tirar', id: 'j1', dados: [4, 6] }, { type: 'terminarTurno', id: 'j1' });
  assert.equal(sTurnoJ2.turno.id, 'j2');

  // Le asignamos a j1 la calle 1 para que j2 caiga en propiedad con dueño
  sTurnoJ2.props[1] = { dueno: 'j1', nivel: 0, hipotecada: false };
  // j2 tira y cae en la calle 1 (propiedad con dueño)
  const { s: sCaeOcupada } = jugar(sTurnoJ2, { type: 'tirar', id: 'j2', dados: [1, 0] });
  assert.equal(sCaeOcupada.jugadores.j2.casilla, 1);
  assert.equal(sCaeOcupada.jugadores.j2.marcado, true, 'la marca debe seguir activa');

  // Terminamos turno de j2 y de j1 para volver a j2
  const { s: sFinJ2 } = jugar(sCaeOcupada, { type: 'terminarTurno', id: 'j2' });
  const { s: sVuelveJ2 } = jugar(sFinJ2, { type: 'tirar', id: 'j1', dados: [4, 6] }, { type: 'terminarTurno', id: 'j1' });

  // j2 tira desde 1 y cae en calle 3 (propiedad libre)
  assert.equal(sVuelveJ2.props[3].dueno, null);
  const { s: sCaeLibre, ev } = jugar(sVuelveJ2, { type: 'tirar', id: 'j2', dados: [1, 1] });
  assert.equal(sCaeLibre.jugadores.j2.casilla, 3);
  assert.equal(sCaeLibre.jugadores.j2.marcado, false, 'la marca desaparece');
  assert.ok(hay(ev, { type: 'frenesi', id: 'j2', casilla: 3 }));
  assert.ok(sCaeLibre.subasta !== null, 'se subasta por Frenesí');
});

test('13. una deuda con varios jugadores (f-cena sin dinero): orden de deudas y liquidación por bancarrota', () => {
  const s = partida();
  cartaArriba(s, 'f-cena');
  // j1 tiene 0 de dinero para no poder pagar la cena (25 $ a cada uno)
  s.jugadores.j1.dinero = 0;
  s.props[1] = { dueno: 'j1', nivel: 0, hipotecada: false };

  // j1 cae en Fortuna (casilla 7)
  const { s: sDeuda } = jugar(s, { type: 'tirar', id: 'j1', dados: [3, 4] });

  // Se crean dos deudas en orden: primero con j2 y luego con j3
  assert.equal(sDeuda.deudas.length, 2);
  assert.equal(sDeuda.deudas[0].acreedor, 'j2');
  assert.equal(sDeuda.deudas[1].acreedor, 'j3');

  // Si j1 se declara en bancarrota, quiebra ante el primer acreedor (j2)
  const { s: sQuiebra, ev } = jugar(sDeuda, { type: 'declararBancarrota', id: 'j1' });
  assert.ok(hay(ev, { type: 'bancarrota', id: 'j1', acreedor: 'j2' }));
  assert.equal(sQuiebra.props[1].dueno, 'j2', 'las propiedades pasan íntegras a j2');
  assert.equal(sQuiebra.deudas.length, 0, 'la deuda restante con j3 se cancela al quebrar');
});

test('14. quiebra con salvoconducto: ante el banco vuelve al mazo de Fortuna; ante un jugador pasa al acreedor', () => {
  // Caso A: quiebra ante un jugador
  const s = partida();
  s.jugadores.j1.salvoconductos = 1;
  s.jugadores.j1.dinero = 0;
  s.deudas = [{ id: 'j1', acreedor: 'j2', cantidad: 500, motivo: 'alquiler' }];

  const { s: sQuiebraJugador } = jugar(s, { type: 'declararBancarrota', id: 'j1' });
  assert.equal(sQuiebraJugador.jugadores.j1.salvoconductos, 0);
  assert.equal(sQuiebraJugador.jugadores.j2.salvoconductos, 1);

  // Caso B: quiebra ante el banco
  const s2 = partida();
  s2.jugadores.j1.salvoconductos = 1;
  s2.jugadores.j1.dinero = 0;
  s2.deudas = [{ id: 'j1', acreedor: 'banco', cantidad: 500, motivo: 'impuesto' }];

  const { s: sQuiebraBanco } = jugar(s2, { type: 'declararBancarrota', id: 'j1' });
  assert.equal(sQuiebraBanco.jugadores.j1.salvoconductos, 0);
  assert.ok(s2.mazos.fortuna.includes(ctx.salvoconducto));
});

test('15. quiebra ante un jugador que ya tiene 50 acciones del mismo barrio: no recibe ninguna más de ese barrio', () => {
  const s = partida();
  s.jugadores.j1.acciones.talleres = 10;
  s.jugadores.j2.acciones.talleres = 50; // j2 ya tiene el máximo
  s.jugadores.j1.dinero = 0;
  s.deudas = [{ id: 'j1', acreedor: 'j2', cantidad: 300, motivo: 'alquiler' }];

  const { s: sPost } = jugar(s, { type: 'declararBancarrota', id: 'j1' });
  assert.equal(sPost.jugadores.j2.acciones.talleres, 50, 'no puede superar 50 acciones');
});

test('16. tratos: propiedad no disponible da propiedad, exceso de 50 acciones da maximo, y trato con salvoconductos', () => {
  const s = partida();
  s.props[1] = { dueno: 'j1', nivel: 0, hipotecada: false };

  // Caso A: el oferente vende/pierde la propiedad antes de que el otro acepte -> da 'propiedad'
  const { s: sTrato1 } = jugar(s, {
    type: 'proponerTrato',
    id: 'j1',
    para: 'j2',
    ofrece: { propiedades: [1] },
    pide: { dinero: 100 },
  });
  // Cambiamos el dueño de la propiedad 1 a j3 antes de que j2 acepte
  sTrato1.props[1].dueno = 'j3';
  rechaza(sTrato1, { type: 'aceptarTrato', id: 'j2', trato: 't1' }, 'propiedad');

  // Caso B: trato que dejaría a alguien con más de 50 acciones de un barrio da 'maximo'
  const s2 = partida();
  s2.jugadores.j1.acciones.talleres = 20;
  s2.jugadores.j2.acciones.talleres = 40;
  const { s: sTrato2 } = jugar(s2, {
    type: 'proponerTrato',
    id: 'j1',
    para: 'j2',
    ofrece: { acciones: { talleres: 15 } }, // 40 + 15 = 55 > 50
    pide: { dinero: 50 },
  });
  rechaza(sTrato2, { type: 'aceptarTrato', id: 'j2', trato: 't1' }, 'maximo');

  // Caso C: trato con salvoconductos
  const s3 = partida();
  s3.jugadores.j1.salvoconductos = 1;
  const { s: sTrato3 } = jugar(s3, {
    type: 'proponerTrato',
    id: 'j1',
    para: 'j2',
    ofrece: { salvoconductos: 1 },
    pide: { dinero: 80 },
  });
  const { s: sAceptado } = jugar(sTrato3, { type: 'aceptarTrato', id: 'j2', trato: 't1' });
  assert.equal(sAceptado.jugadores.j1.salvoconductos, 0);
  assert.equal(sAceptado.jugadores.j2.salvoconductos, 1);
  assert.equal(sAceptado.jugadores.j1.dinero, INICIAL + 80);
});

test('17. comprar acciones cuando ya se emitieron las 100 del barrio da agotadas', () => {
  const s = partida();
  s.jugadores.j1.casilla = 20; // En la Bolsa de Valores
  s.turno.fase = 'gestion';
  s.turno.bolsaAbierta = true;

  // Entre j2 y j3 tienen las 100 acciones de talleres
  s.jugadores.j2.acciones.talleres = 50;
  s.jugadores.j3.acciones.talleres = 50;

  rechaza(s, { type: 'comprarAcciones', id: 'j1', barrio: 'talleres', cantidad: 5 }, 'agotadas');
});

test('18. subasta: pujar más dinero del que se tiene da sin_dinero; pujar después de retirarse da fuera', () => {
  const s = partida();
  // j1 tira dados [1, 0], avanza a casilla 1 (libre) y decide no comprar -> se abre subasta
  const { s: sCae } = jugar(s, { type: 'tirar', id: 'j1', dados: [1, 0] });
  assert.equal(sCae.turno.fase, 'compra');
  const { s: sSubasta } = jugar(sCae, { type: 'noComprar', id: 'j1' });
  assert.ok(sSubasta.subasta !== null);

  // Pujar más dinero del que se tiene
  rechaza(sSubasta, { type: 'pujar', id: 'j2', cantidad: sSubasta.jugadores.j2.dinero + 500 }, 'sin_dinero');

  // Retirarse de la subasta y luego intentar pujar da 'fuera'
  const { s: sRetirado } = jugar(sSubasta, { type: 'retirarse', id: 'j3' });
  rechaza(sRetirado, { type: 'pujar', id: 'j3', cantidad: 50 }, 'fuera');
});

test('19. partida rápida: cada jugador empieza con 2 calles distintas', () => {
  const s = partida({ partidaRapida: true });
  for (const id of s.orden) {
    const callesJugador = Object.entries(s.props)
      .filter(([_, p]) => p.dueno === id)
      .map(([i]) => Number(i));

    assert.equal(callesJugador.length, 2, `${id} debe tener exactamente 2 calles`);
    for (const i of callesJugador) {
      assert.equal(ctx.casillas[i].tipo, 'calle', `la propiedad ${i} debe ser de tipo calle`);
    }
  }
});

test('20. rachaPerdida: se emite cuando el patrimonio de quien había llegado a la meta vuelve a quedar por debajo', () => {
  const s = partida({ meta: 2500 });
  // Inicialmente tienen 2000, por debajo de la meta de 2500
  assert.equal(s.enRacha.j1, undefined);

  // j1 cobra dinero y alcanza la meta (patrimonio >= 2500)
  s.turno.fase = 'gestion';
  s.props[1] = { dueno: 'j1', nivel: 0, hipotecada: false };
  // Construye casas o recibe dinero para superar la meta
  s.jugadores.j1.dinero = 3000;
  // Hacemos una acción que invoque actualizarRachas (ej. hipotecar)
  const { s: sMeta, ev: ev1 } = jugar(s, { type: 'hipotecar', id: 'j1', casilla: 1 });
  assert.equal(sMeta.enRacha.j1, true);
  assert.ok(hay(ev1, { type: 'rachaFinal', id: 'j1' }));

  // Ahora j1 pierde patrimonio (ej. paga fianza o pierde dinero) y vuelve a caer por debajo de 2500
  sMeta.jugadores.j1.dinero = 1000;
  // Deshipotecar para actualizar rachas
  const { s: sBaja, ev: ev2 } = jugar(sMeta, { type: 'deshipotecar', id: 'j1', casilla: 1 });
  assert.equal(sBaja.enRacha.j1, undefined);
  assert.ok(hay(ev2, { type: 'rachaPerdida', id: 'j1' }));
});
