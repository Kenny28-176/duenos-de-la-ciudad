// Las reglas de seguridad de Firebase (database.rules.json). Aquí solo se vigila lo esencial: que sean JSON válido, que no
// dejen nada abierto de más y que cubran todo lo que el juego escribe. Que acepten y rechacen lo que deben se prueba con la
// base de datos de verdad (docs/RED.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACCIONES_DE_CELULAR } from '../src/net/protocolo.js';

const reglas = JSON.parse(await readFile(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;

// Todas las reglas de lectura y escritura, con su ruta.
function recorrer(nodo, ruta = '', salida = []) {
  for (const [clave, valor] of Object.entries(nodo)) {
    if (clave === '.read' || clave === '.write') salida.push({ ruta: `${ruta}/${clave}`, valor });
    else if (valor && typeof valor === 'object') recorrer(valor, `${ruta}/${clave}`, salida);
  }
  return salida;
}
const todas = recorrer(reglas);

test('por defecto no se puede leer ni escribir nada', () => {
  assert.equal(reglas['.read'], false);
  assert.equal(reglas['.write'], false);
});

test('solo la meta y el estado se pueden leer sin más; y nunca se puede escribir sin identificarse', () => {
  const abiertas = todas.filter(r => r.valor === true).map(r => r.ruta);
  assert.deepEqual(abiertas.sort(), ['/salas/$sala/estado/.read', '/salas/$sala/meta/.read']);
  for (const r of todas.filter(x => x.ruta.endsWith('/.write') && x.valor !== false)) {
    assert.ok(typeof r.valor === 'string' && r.valor.startsWith('auth != null'), `${r.ruta} exige estar identificado`);
  }
});

test('el estado y las vistas solo los escribe el anfitrión, y una vista solo la lee su dueño', () => {
  const sala = reglas.salas.$sala;
  const anfitrion = "root.child('salas').child($sala).child('meta').child('anfitrion').val() === auth.uid";
  assert.ok(sala.estado['.write'].includes(anfitrion));
  assert.ok(sala.vistas.$uid['.write'].includes(anfitrion));
  assert.ok(sala.vistas.$uid['.read'].includes('$uid === auth.uid'));
  assert.ok(sala.acciones['.read'].includes(anfitrion), 'solo el anfitrión lee las acciones');
});

test('una acción solo se puede crear con el propio uid, y no admite campos desconocidos', () => {
  const accion = reglas.salas.$sala.acciones.$clave;
  assert.ok(accion['.write'].includes("newData.child('uid').val() === auth.uid"));
  assert.ok(accion['.write'].includes('!data.exists()'), 'un celular no puede cambiar una acción ya escrita');
  assert.equal(accion.$otro['.validate'], false);
  assert.equal(accion.accion.$otro['.validate'], false);
  assert.equal(accion.accion.ofrece.$otro['.validate'], false);
});

test('el código de la sala son cuatro consonantes, como en src/net/protocolo.js', () => {
  assert.match(reglas.salas.$sala['.validate'], /\[BCDFGHJKLMNPRSTVWXZ\]\{4\}/);
});

test('las reglas dejan escribir cada campo que llevan las acciones de los celulares', () => {
  // Los campos que escriben las acciones (src/net/anfitrion.js reenvía lo que llega, así que cualquiera de estos puede ir).
  const permitidos = Object.keys(reglas.salas.$sala.acciones.$clave.accion).filter(k => !k.startsWith('.') && !k.startsWith('$'));
  for (const campo of ['type', 'nombre', 'ficha', 'casilla', 'barrio', 'cantidad', 'objetivo', 'para', 'trato', 'ofrece', 'pide']) {
    assert.ok(permitidos.includes(campo), `falta ${campo}`);
  }
  assert.ok(ACCIONES_DE_CELULAR.size >= 20);
});
