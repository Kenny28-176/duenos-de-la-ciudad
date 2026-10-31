// El sonido (src/ui/sonido.js) sin navegador: con un audio de mentira que apunta todo lo que se le programa, se comprueba qué suena con
// cada evento del motor, que cada receta del catálogo programa notas sensatas (sin valores imposibles ni sonidos eternos) y que el
// reproductor cumple lo que exigen los navegadores (no suena hasta que alguien toca la pantalla, y un fallo no estropea nada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SONIDOS, crearCadena, crearSonido, monedasDe, sonidoDeEvento } from '../src/ui/sonido.js';

// Un AudioContext de mentira: apunta los nodos que se crean y las llamadas a sus parámetros.
function audioFalso({ estado = 'running', alResumir = null } = {}) {
  const nodos = [];
  const parametro = () => {
    const llamadas = [];
    return {
      value: 0,
      llamadas,
      setValueAtTime: (v, t) => { llamadas.push(['fijar', v, t]); },
      exponentialRampToValueAtTime: (v, t) => {
        if (!(v > 0)) throw new RangeError('una rampa exponencial no puede llegar a cero');
        llamadas.push(['rampa', v, t]);
      },
    };
  };
  const nodo = (tipo, extra = {}) => {
    const n = { tipo, destinos: [], connect(otro) { n.destinos.push(otro); return otro; }, ...extra };
    nodos.push(n);
    return n;
  };
  const c = {
    sampleRate: 8000,
    currentTime: 0,
    state: estado,
    destination: { tipo: 'destino' },
    nodos,
    createGain: () => nodo('ganancia', { gain: parametro() }),
    createOscillator: () => nodo('oscilador', {
      frequency: parametro(), detune: parametro(), inicio: null, fin: null,
      start(t) { this.inicio = t; }, stop(t) { this.fin = t; },
    }),
    createBufferSource: () => nodo('ruido', { inicio: null, fin: null, start(t) { this.inicio = t; }, stop(t) { this.fin = t; } }),
    createBiquadFilter: () => nodo('filtro', { frequency: parametro(), Q: parametro() }),
    createBuffer: (canales, largo) => ({ getChannelData: () => new Float32Array(largo) }),
    createDynamicsCompressor: () => nodo('compresor', { threshold: parametro(), knee: parametro(), ratio: parametro(), attack: parametro(), release: parametro() }),
    createWaveShaper: () => nodo('limitador'),
    createConvolver: () => nodo('eco'),
    resume() {
      return Promise.resolve().then(() => { c.state = 'running'; alResumir?.(); });
    },
  };
  return c;
}

// Los eventos del motor, con los campos que mira el sonido.
const EVENTO = { camino: [1, 2, 3], cantidad: 120, motivo: 'alquiler', de: 'j1', a: 'j2', nivel: 2 };
const evento = (type, extra = {}) => ({ type, ...EVENTO, ...extra });

test('cada evento del motor suena o está en la lista de los que no suenan', async () => {
  const narrador = JSON.parse(await readFile(new URL('../src/i18n/es/narrador.json', import.meta.url), 'utf8'));
  const tipos = new Set(['dinero', 'mover', 'cae']);
  for (const clave of Object.keys(narrador)) if (clave.startsWith('evento.')) tipos.add(clave.split('.')[1]);
  // Estos no suenan a propósito: su efecto ya se oye con otro evento (el alquiler, con el dinero que cambia de manos) o no hace falta.
  const sinSonido = new Set(['alquiler', 'sinAlquiler', 'noCompra', 'retirada', 'ronda', 'reparto', 'masPobre', 'finEfecto', 'prestamoDevuelto', 'cae']);
  for (const tipo of tipos) {
    const sonido = sonidoDeEvento(evento(tipo));
    if (sinSonido.has(tipo)) assert.equal(sonido, null, `${tipo} no suena`);
    else {
      assert.ok(sonido, `${tipo} tiene un sonido`);
      assert.ok(SONIDOS[sonido.nombre], `${tipo}: la receta «${sonido.nombre}» existe`);
      assert.ok([1, 2].includes(sonido.prioridad), `${tipo}: prioridad`);
    }
  }
  // Y todas las recetas se usan para algo (menos las del celular).
  const usadas = new Set([...tipos].map(tipo => sonidoDeEvento(evento(tipo))?.nombre));
  usadas.add(sonidoDeEvento(evento('dinero', { de: 'banco' })).nombre);
  for (const nombre of Object.keys(SONIDOS)) if (nombre !== 'miTurno') assert.ok(usadas.has(nombre), `la receta «${nombre}» no la usa ningún evento`);
});

test('el dinero suena una sola vez: el que ya tiene su propio evento no suena aparte', () => {
  for (const motivo of ['inicial', 'sueldo', 'compra', 'construir', 'acciones', 'subasta', 'trato']) {
    assert.equal(sonidoDeEvento(evento('dinero', { motivo })), null, motivo);
  }
  assert.equal(sonidoDeEvento(evento('dinero', { motivo: 'alquiler', de: 'j1', a: 'j2' })).nombre, 'pago');
  assert.equal(sonidoDeEvento(evento('dinero', { motivo: 'dividendo', de: 'banco', a: 'j2' })).nombre, 'cobro');
  assert.equal(sonidoDeEvento(evento('dinero', { cantidad: 0 })), null, 'sin cantidad no suena');
  assert.equal(sonidoDeEvento(evento('construir', { nivel: 5 })).torre, true);
  assert.equal(sonidoDeEvento(evento('construir', { nivel: 3 })).torre, false);
  assert.equal(sonidoDeEvento(evento('mover', { camino: [4, 5], atras: true })).n, 2);
});

test('cuantas más monedas, más dinero', () => {
  assert.deepEqual([10, 50, 200, 2000, 20000, 900000].map(monedasDe), [1, 1, 2, 3, 4, 4]);
});

test('cada receta programa notas sensatas: dentro de lo audible, con volumen contenido y sin alargarse', () => {
  for (const [nombre, receta] of Object.entries(SONIDOS)) {
    const c = audioFalso();
    const salida = c.createGain();
    const t0 = 1;
    const duracion = receta(c, salida, t0, { n: 3, cada: 0.17, torre: true, escala: 1 });
    assert.ok(duracion > 0.02 && duracion <= 3.2, `${nombre}: dura ${duracion.toFixed(2)} s`);
    const fuentes = c.nodos.filter(n => n.tipo === 'oscilador' || n.tipo === 'ruido');
    assert.ok(fuentes.length > 0, `${nombre}: tiene fuentes de sonido`);
    for (const f of fuentes) {
      assert.ok(Number.isFinite(f.inicio) && Number.isFinite(f.fin), `${nombre}: arranca y para`);
      assert.ok(f.inicio >= t0 - 1e-9 && f.fin > f.inicio, `${nombre}: ${f.inicio} → ${f.fin}`);
      assert.ok(f.fin - t0 <= duracion + 0.05, `${nombre}: ninguna nota pasa de lo que dice durar`);
    }
    for (const o of c.nodos.filter(n => n.tipo === 'oscilador')) {
      for (const [, hz] of o.frequency.llamadas) assert.ok(hz >= 20 && hz <= 16000, `${nombre}: ${hz} Hz`);
    }
    for (const g of c.nodos.filter(n => n.tipo === 'ganancia' && n !== salida)) {
      const picos = g.gain.llamadas.map(l => l[1]);
      assert.ok(Math.max(...picos) <= 0.5, `${nombre}: un volumen de ${Math.max(...picos)}`);
    }
  }
});

test('con el tablero acelerado, los sonidos se acortan', () => {
  const duracion = escala => SONIDOS.dados(audioFalso(), { connect() {} }, 0, { escala });
  assert.ok(duracion(0.25) < duracion(1) * 0.5);
});

test('la cadena de salida no pasa de 1 y acaba en los altavoces', () => {
  const c = audioFalso();
  const { entrada, maestro } = crearCadena(c, 0.6);
  assert.equal(maestro.gain.value, 0.6);
  assert.ok(c.nodos.some(n => n.tipo === 'limitador'), 'hay un limitador suave');
  assert.ok(maestro.destinos.includes(c.destination), 'el volumen general va a los altavoces');
  assert.ok(entrada.destinos.length >= 2, 'la entrada va al compresor y al eco');
});

test('no suena nada hasta que alguien toca la pantalla, y luego sí', async () => {
  const c = audioFalso({ estado: 'suspended' });
  const sonido = crearSonido({ crearContexto: () => c });
  assert.equal(sonido.evento(evento('dados')), false, 'antes del primer toque, nada');
  assert.equal(c.nodos.length, 0);
  assert.equal(sonido.desbloquear(), true);
  assert.equal(sonido.evento(evento('dados')), false, 'el navegador aún no ha dejado sonar');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(sonido.estado().listo, true);
  assert.equal(sonido.evento(evento('dados')), true);
  assert.ok(c.nodos.filter(n => n.tipo === 'oscilador' || n.tipo === 'ruido').length > 5);
});

test('un mismo sonido no se repite en menos de 70 ms, y apagarlo lo calla', () => {
  const c = audioFalso();
  const sonido = crearSonido({ crearContexto: () => c });
  sonido.desbloquear();
  assert.equal(sonido.evento(evento('compra')), true);
  assert.equal(sonido.evento(evento('compra')), false, 'repetido al instante');
  c.currentTime = 0.2;
  assert.equal(sonido.evento(evento('compra')), true);
  sonido.poner(false);
  c.currentTime = 1;
  assert.equal(sonido.evento(evento('compra')), false, 'apagado');
  sonido.poner(true);
  assert.equal(sonido.evento(evento('compra')), true);
});

test('con el tablero muy acelerado solo suena lo principal', () => {
  const c = audioFalso();
  const sonido = crearSonido({ crearContexto: () => c });
  sonido.desbloquear();
  assert.equal(sonido.evento(evento('turno'), { velocidad: 4 }), false);
  assert.equal(sonido.evento(evento('mover'), { velocidad: 4 }), false);
  assert.equal(sonido.evento(evento('dados'), { velocidad: 4 }), true);
  c.currentTime = 1;
  assert.equal(sonido.evento(evento('turno'), { velocidad: 1 }), true);
});

test('las pujas de una subasta suenan cada vez más altas, y la siguiente subasta empieza de nuevo', () => {
  const c = audioFalso();
  const sonido = crearSonido({ crearContexto: () => c });
  sonido.desbloquear();
  const altura = () => {
    const antes = c.nodos.length;
    c.currentTime += 1;
    sonido.evento(evento('puja'));
    return c.nodos.slice(antes).find(n => n.tipo === 'oscilador').frequency.llamadas[0][1];
  };
  sonido.evento(evento('subasta'));
  const primera = altura();
  const segunda = altura();
  const tercera = altura();
  assert.ok(primera < segunda && segunda < tercera, `${primera} < ${segunda} < ${tercera}`);
  c.currentTime += 1;
  sonido.evento(evento('subasta'));
  assert.equal(altura(), primera, 'otra subasta, otra escala');
});

test('un navegador sin audio, o un sonido que falla, no estropean la partida', () => {
  const sin = crearSonido({ crearContexto: () => null });
  assert.equal(sin.desbloquear(), false);
  assert.equal(sin.evento(evento('dados')), false);

  let intentos = 0;
  const roto = crearSonido({ crearContexto: () => { intentos++; throw new Error('sin tarjeta de sonido'); } });
  assert.equal(roto.desbloquear(), false);
  assert.equal(roto.desbloquear(), false);
  assert.equal(intentos, 1, 'no se insiste');

  const c = audioFalso();
  const sonido = crearSonido({ crearContexto: () => c });
  sonido.desbloquear();
  c.createOscillator = () => { throw new Error('se rompió'); };
  assert.equal(sonido.evento(evento('compra')), false);
});

test('el volumen se puede cambiar en cualquier momento y se queda entre 0 y 1', () => {
  const c = audioFalso();
  const sonido = crearSonido({ crearContexto: () => c, volumen: 0.5 });
  sonido.volumen(2);
  assert.equal(sonido.estado().volumen, 1);
  sonido.desbloquear();
  sonido.volumen(0.3);
  const maestro = c.nodos.filter(n => n.tipo === 'ganancia').find(n => n.destinos.includes(c.destination));
  assert.equal(maestro.gain.value, 0.3);
});
