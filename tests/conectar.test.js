// Cómo se conecta un dispositivo: su identidad (que los celulares guardan aunque la página no sea segura), si hay relé local y
// por qué dirección de la wifi llegan los celulares al tablero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identidad, parametrosDeRed, redDisponible } from '../src/net/conectar.js';
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
  const sinFirebase = { config: null, parametros: new URLSearchParams() };
  assert.deepEqual(await redDisponible({ ...sinFirebase, peticion: responde(true, { ok: true, direcciones: ['http://192.168.1.5:8080'] }) }), { modo: 'local', direcciones: ['http://192.168.1.5:8080'] });
  assert.deepEqual(await redDisponible({ ...sinFirebase, peticion: responde(true, { ok: true }) }), { modo: 'local', direcciones: [] });
  assert.equal(await redDisponible({ ...sinFirebase, peticion: responde(false, {}) }), null, 'un 404 (la web publicada, sin relé)');
  assert.equal(await redDisponible({ ...sinFirebase, peticion: async () => { throw new Error('sin red'); } }), null);
});

test('sin relé y con el proyecto de Firebase configurado (la web publicada), se juega por Firebase', async () => {
  const sinRele = async () => ({ ok: false, json: async () => ({}) });
  const conRele = async () => ({ ok: true, json: async () => ({ ok: true, direcciones: ['http://192.168.1.5:8080'] }) });
  const config = { apiKey: 'AIza-de-prueba', databaseURL: 'https://juego-default-rtdb.firebaseio.com', projectId: 'juego' };
  const sinParametros = new URLSearchParams();
  const publicada = { servidor: 'kenny28-176.github.io', protocolo: 'https:' };
  assert.deepEqual(await redDisponible({ peticion: sinRele, config, parametros: sinParametros, ...publicada }), { modo: 'firebase', config, direcciones: [] });
  assert.equal(await redDisponible({ peticion: sinRele, config: { apiKey: 'x' }, parametros: sinParametros, ...publicada }), null, 'una configuración a medias no vale');
  // Una página de la laptop (http) cuyo relé no contesta un momento no se va a Firebase: el tablero sigue en la wifi.
  assert.equal(await redDisponible({ peticion: sinRele, config, parametros: sinParametros, servidor: '192.168.1.5', protocolo: 'http:' }), null);
  // Con el relé delante gana el relé (jugar en casa no gasta Firebase), salvo que se pida Firebase.
  assert.equal((await redDisponible({ peticion: conRele, config, parametros: sinParametros })).modo, 'local');
  const pedida = await redDisponible({ peticion: conRele, config, parametros: new URLSearchParams('red=firebase') });
  assert.deepEqual(pedida, { modo: 'firebase', config, direcciones: ['http://192.168.1.5:8080'] }, 'y sabe por dónde entran los celulares');
  // La imitación de Firebase (tools/firebase-falso.js), solo desde la propia laptop.
  const falso = new URLSearchParams('red=firebase&firebase=http://127.0.0.1:9100');
  const enLaLaptop = await redDisponible({ peticion: conRele, config: null, parametros: falso, servidor: 'localhost' });
  assert.equal(enLaLaptop.modo, 'firebase');
  assert.equal(enLaLaptop.config.databaseURL, 'http://127.0.0.1:9100');
  assert.equal(enLaLaptop.config.urlCuentas, 'http://127.0.0.1:9100/v1');
  const desdeFuera = await redDisponible({ peticion: sinRele, config, parametros: falso, servidor: 'kenny28-176.github.io', protocolo: 'https:' });
  assert.equal(desdeFuera.config, config, 'en la web publicada, un enlace no puede llevar a los celulares a otro servidor');
  assert.equal(parametrosDeRed(falso), 'red=firebase&firebase=http%3A%2F%2F127.0.0.1%3A9100');
  assert.equal(parametrosDeRed(new URLSearchParams('sala=1&velocidad=3')), '', 'en la web publicada, el enlace no lleva nada más');
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
