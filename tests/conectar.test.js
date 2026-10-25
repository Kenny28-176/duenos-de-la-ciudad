// Cómo se conecta un dispositivo: su identidad (que los celulares guardan aunque la página no sea segura), si hay relé local y
// por qué dirección de la wifi llegan los celulares al tablero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identidad, redDisponible } from '../src/net/conectar.js';
import { direccionesDeLaRed } from '../tools/red-local.js';

// Un almacenamiento falso con la forma de localStorage.
const almacenFalso = () => {
  const datos = new Map();
  return { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)), datos };
};

test('la identidad se guarda y es la misma al recargar la página', () => {
  const almacen = almacenFalso();
  const primera = identidad('celular', 'duenos:uid', { almacen });
  assert.match(primera, /^celular-.+/);
  assert.equal(identidad('celular', 'duenos:uid', { almacen }), primera);
  assert.equal(almacen.datos.get('duenos:uid'), primera);
  assert.notEqual(identidad('celular', 'otra', { almacen }), primera, 'cada clave tiene la suya');
});

test('en una página no segura (http://192.168…), donde no existe randomUUID, la identidad también se guarda', () => {
  // Es lo que ven los celulares: crypto sin randomUUID. Antes, esto hacía que cada recarga fuera un jugador distinto.
  const almacen = almacenFalso();
  const azar = { getRandomValues: bytes => bytes.fill(171) };
  const primera = identidad('celular', 'duenos:uid', { almacen, azar });
  assert.equal(primera, `celular-${'ab'.repeat(16)}`);
  assert.equal(identidad('celular', 'duenos:uid', { almacen, azar: {} }), primera, 'la segunda vez sale de lo guardado');
  assert.equal(almacen.datos.size, 1);
  // Y si ni siquiera hay crypto, sigue habiendo una identidad.
  assert.match(identidad('celular', 'x', { almacen: almacenFalso(), azar: null }), /^celular-[0-9a-f]{32}$/);
});

test('si el navegador no deja guardar nada, la identidad existe pero no se recuerda', () => {
  const sinAlmacen = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  const uid = identidad('tablero', 'duenos:uid-tablero', { almacen: sinAlmacen, azar: { randomUUID: () => 'abc' } });
  assert.equal(uid, 'tablero-abc');
  assert.match(identidad('celular', 'x', { almacen: null }), /^celular-/);
});

test('redDisponible dice si hay relé local detrás de esta página', async () => {
  const responde = (ok, cuerpo) => async () => ({ ok, json: async () => cuerpo });
  assert.deepEqual(await redDisponible({ peticion: responde(true, { ok: true, direcciones: ['http://192.168.1.5:8080'] }) }), { modo: 'local', direcciones: ['http://192.168.1.5:8080'] });
  assert.deepEqual(await redDisponible({ peticion: responde(true, { ok: true }) }), { modo: 'local', direcciones: [] });
  assert.equal(await redDisponible({ peticion: responde(false, {}) }), null, 'un 404 (la web publicada, sin relé)');
  assert.equal(await redDisponible({ peticion: async () => { throw new Error('sin red'); } }), null);
});

test('las direcciones para los celulares son las de la wifi, no las de máquinas virtuales ni VPN', () => {
  const adaptador = ip => [{ family: 'IPv4', address: ip, internal: false }];
  // Las de esta laptop: wifi, Tailscale, Hyper-V y WSL.
  const portatil = {
    Tailscale: adaptador('100.67.126.105'),
    'vEthernet (Default Switch)': adaptador('172.18.144.1'),
    'Wi-Fi': adaptador('192.168.100.5'),
    'Loopback Pseudo-Interface 1': [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    'vEthernet (WSL (Hyper-V firewall))': adaptador('172.29.192.1'),
  };
  assert.deepEqual(direccionesDeLaRed(portatil, 8080), ['http://192.168.100.5:8080']);
  // Con VirtualBox (que también usa 192.168…) no se confunde.
  assert.deepEqual(direccionesDeLaRed({ 'VirtualBox Host-Only Network': adaptador('192.168.56.1'), 'Wi-Fi': adaptador('10.0.0.7') }, 80), ['http://10.0.0.7:80']);
  // Con cable y wifi a la vez salen las dos, la de 192.168… primero.
  assert.deepEqual(direccionesDeLaRed({ 'Wi-Fi': adaptador('10.0.0.7'), 'Ethernet': adaptador('192.168.1.20') }, 8080), ['http://192.168.1.20:8080', 'http://10.0.0.7:8080']);
  // Si solo hay adaptadores virtuales, se ofrecen esos (mejor eso que nada).
  assert.deepEqual(direccionesDeLaRed({ Tailscale: adaptador('100.1.2.3') }, 8080), ['http://100.1.2.3:8080']);
  assert.deepEqual(direccionesDeLaRed({ lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }], eth0: [{ family: 'IPv6', address: 'fe80::1', internal: false }] }, 8080), []);
});
