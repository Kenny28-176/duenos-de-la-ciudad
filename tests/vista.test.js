// La vista del tablero (src/ui/tablero/vista.js) y el almacén de datos (src/ui/almacen.js): lo que se calcula a partir
// del estado del motor, sin pantalla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { unirDiccionarios, traducir } from '../src/i18n/traducir.js';
import { crearAlmacen } from '../src/ui/almacen.js';
import { datosDeCarta, filasBolsa, imagenDeEfecto, nombreMostrado, preciosActuales, resumenJugadores, sinArticulo } from '../src/ui/tablero/vista.js';

const motor = crearMotor(await cargarDatos());
const { ctx } = motor;

async function diccionario(idioma) {
  const partes = [];
  for (const parte of ['juego', 'narrador', 'errores', 'interfaz']) {
    partes.push(JSON.parse(await readFile(new URL(`../src/i18n/${idioma}/${parte}.json`, import.meta.url), 'utf8')));
  }
  return unirDiccionarios(...partes);
}
const es = await diccionario('es');
const en = await diccionario('en');

// Una partida empezada con las fichas dadas (sin habilidades salvo que se pidan).
function partida(fichas = ['rata', 'toro', 'oso'], opciones = {}) {
  let s = motor.nuevaPartida({ semilla: 5 });
  const hacer = a => {
    const r = motor.paso(s, a);
    assert.equal(r.error, null, r.error?.mensaje);
    s = r.state;
  };
  fichas.forEach((f, k) => hacer({ type: 'unirse', id: `j${k + 1}`, nombre: `Jugador ${k + 1}`, ficha: f, ...(k === 0 ? {} : { bot: true }) }));
  hacer({ type: 'configurar', opciones: { habilidades: false, ...opciones } });
  hacer({ type: 'empezar' });
  return s;
}

test('el almacén avisa de los cambios y deja de avisar a quien se da de baja', () => {
  const almacen = crearAlmacen({ a: 1, b: 2 });
  const vistos = [];
  const parar = almacen.escuchar(d => vistos.push(d));
  almacen.cambiar({ a: 5 });
  almacen.cambiar(d => ({ b: d.b + 10 }));
  assert.deepEqual(almacen.leer(), { a: 5, b: 12 });
  parar();
  almacen.cambiar({ a: 0 });
  assert.deepEqual(vistos, [{ a: 5, b: 2 }, { a: 5, b: 12 }]);
});

test('el nombre de un bot es el de su ficha sin artículo, en los dos idiomas', () => {
  assert.equal(sinArticulo('La Vaca Lechera'), 'Vaca Lechera');
  assert.equal(sinArticulo('The White Elephant'), 'White Elephant');
  assert.equal(sinArticulo('Ana'), 'Ana');
  const bot = { bot: true, ficha: 'toro', nombre: 'Bot 2' };
  assert.equal(nombreMostrado(bot, f => traducir(es, es, `ficha.${f}`)), 'Toro');
  assert.equal(nombreMostrado(bot, f => traducir(en, es, `ficha.${f}`)), 'Bull');
  assert.equal(nombreMostrado({ nombre: 'Ana', ficha: 'toro' }, () => 'x'), 'Ana');
});

test('el resumen de jugadores da dinero, patrimonio, avance hacia la meta y estados', () => {
  const s = partida();
  const filas = resumenJugadores(motor, s, { nombreDeFicha: f => traducir(es, es, `ficha.${f}`) });
  assert.equal(filas.length, 3);
  assert.deepEqual(filas.map(f => f.id), s.orden);
  const primero = filas[0];
  assert.equal(primero.dinero, ctx.eco.dineroInicial);
  assert.equal(primero.patrimonio, ctx.eco.dineroInicial);
  assert.equal(primero.avance, ctx.eco.dineroInicial / s.opciones.meta);
  assert.equal(filas.filter(f => f.turno).length, 1);
  assert.equal(primero.activa, null, 'sin habilidades no hay botón de habilidad');

  // El dinero que se muestra puede ir por detrás del real; los estados salen del juego.
  s.jugadores.j2.calabozo = { intentos: 1 };
  s.jugadores.j2.marcado = true;
  s.enRacha.j2 = true;
  const j2 = resumenJugadores(motor, s, { dinero: { j2: 1234 } }).find(f => f.id === 'j2');
  assert.equal(j2.dinero, 1234);
  assert.deepEqual(j2.estados, ['retenido', 'marcado', 'en-racha-final']);
});

test('con habilidades, cada jugador muestra su habilidad activa y su enfriamiento', () => {
  const s = partida(['rata', 'taza'], { habilidades: true });
  const de = (ficha, filas = resumenJugadores(motor, s)) => filas.find(f => f.ficha === ficha);
  assert.deepEqual([de('rata').activa.id, de('rata').activa.lista], ['esprint', true]);
  s.jugadores.j2.hab.enfriamiento = 3; // j2 es la Taza
  assert.deepEqual(de('taza').activa, { id: 'prestamo-expres', enfriamiento: 3, lista: false });
});

test('la pizarra de la Bolsa muestra el precio de cada barrio y si ha subido o bajado', () => {
  const s = partida();
  const antes = preciosActuales(motor, s);
  assert.equal(Object.keys(antes).length, 8);
  assert.ok(filasBolsa(motor, s, antes).every(f => f.tendencia === null));

  s.bolsa.talleres.ajuste += 300;
  s.bolsa.feria.ajuste -= 100;
  const filas = Object.fromEntries(filasBolsa(motor, s, antes).map(f => [f.barrio, f]));
  assert.equal(filas.talleres.tendencia, 'sube');
  assert.equal(filas.feria.tendencia, 'baja');
  assert.equal(filas['puerto-viejo'].tendencia, null);
  assert.equal(filas.talleres.precio, motor.precioAccion(s, 'talleres'));
  assert.ok(filas.talleres.imagen.endsWith('talleres.svg'));

  assert.deepEqual(filasBolsa(motor, partida(['rata', 'toro'], { mercado: false })), [], 'sin mercado no hay pizarra');
});

test('cada carta tiene su bodegón entre las imágenes de la guía de estilo', async () => {
  const guia = await readFile(new URL('../docs/VISUALES.md', import.meta.url), 'utf8');
  for (const carta of Object.values(ctx.cartas)) {
    const imagen = imagenDeEfecto(carta.efecto);
    assert.ok(guia.includes(`tarjetas/efectos/${imagen}.webp`), `${carta.id} usa «${imagen}», que no está en docs/VISUALES.md`);
  }
});

test('los textos de las cartas se rellenan con sus cifras y el barrio elegido', () => {
  const evento = { type: 'carta', id: 'j1', mazo: 'noticias', carta: 'n-llega-empresa', barrio: 'feria' };
  const d = datosDeCarta(ctx, evento, b => traducir(es, es, `barrio.${b}`));
  assert.deepEqual([d.mazo, d.imagen, d.datos.barrio, d.datos.cantidad], ['noticias', 'llega-empresa', 'La Feria', 200]);
  assert.match(traducir(es, es, `carta.${d.id}`, d.datos, { idioma: 'es' }), /La Feria.*200 \$ más/);
  assert.match(traducir(en, es, `carta.${d.id}`, d.datos, { idioma: 'en' }), /\$200 more/);
});
