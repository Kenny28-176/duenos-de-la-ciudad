// La voz del narrador (src/ui/voz.js) sin navegador, con un sintetizador de mentira: elige la mejor voz del idioma, solo lee los eventos
// que cuentan, espera a que acabe cada frase (con un tope por si el navegador no avisa) y calla al apagarla o al pausar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearVoz, elegirVoz, seLee } from '../src/ui/voz.js';

class Elocucion {
  constructor(texto) { this.text = texto; }
}

// Un sintetizador de mentira: apunta lo que se le pide leer y deja decidir cuándo acaba cada frase.
function sintetizadorFalso(voces = []) {
  const s = {
    dichas: [], cancelaciones: 0,
    getVoices: () => voces,
    speak(frase) { s.dichas.push(frase); },
    cancel() { s.cancelaciones++; s.dichas.at(-1)?.onend?.(); },
  };
  return s;
}

const voz = (name, lang, extra = {}) => ({ name, lang, localService: false, default: false, ...extra });

test('elige la mejor voz del idioma: natural, del propio equipo, la de por defecto', () => {
  const voces = [
    voz('Google US English', 'en-US'),
    voz('Google español', 'es-ES'),
    voz('Microsoft Sabina', 'es-MX', { localService: true }),
    voz('Microsoft Dalia Online (Natural)', 'es-MX'),
    voz('Otra', 'es_AR', { default: true }),
  ];
  assert.equal(elegirVoz(voces, 'es').name, 'Microsoft Dalia Online (Natural)');
  assert.equal(elegirVoz(voces.filter(v => !/Natural/.test(v.name)), 'es').name, 'Microsoft Sabina');
  assert.equal(elegirVoz(voces, 'en').name, 'Google US English');
  assert.equal(elegirVoz(voces, 'fr'), null, 'sin voz en ese idioma, la del navegador');
  assert.equal(elegirVoz([], 'es'), null);
});

test('solo se leen los eventos que cuentan', () => {
  for (const tipo of ['compra', 'alquiler', 'carta', 'subastaGanada', 'bancarrota', 'fin', 'alCalabozo', 'habilidad']) assert.ok(seLee({ type: tipo }), tipo);
  for (const tipo of ['turno', 'dados', 'puja', 'retirada', 'ronda', 'salida', 'dinero', 'mover']) assert.ok(!seLee({ type: tipo }), tipo);
});

test('apagada no dice nada; encendida lee y la promesa se cumple al acabar la frase', async () => {
  const sint = sintetizadorFalso([voz('Sabina', 'es-MX', { localService: true })]);
  const v = crearVoz({ sintetizador: sint, Elocucion });
  assert.equal(v.disponible, true);
  assert.equal(v.alEvento({ type: 'compra' }, 'Ana compra la Calle del Hierro.'), undefined, 'apagada');
  v.poner(true);
  assert.equal(v.activa(), true);
  assert.equal(v.alEvento({ type: 'turno' }, 'Es el turno de Ana.'), undefined, 'ese evento no se lee');

  let acabo = false;
  const dicha = v.alEvento({ type: 'compra' }, 'Ana compra la Calle del Hierro.', { idioma: 'es' });
  dicha.then(() => { acabo = true; });
  await Promise.resolve();
  assert.equal(sint.dichas.length, 1);
  assert.equal(sint.dichas[0].text, 'Ana compra la Calle del Hierro.');
  assert.equal(sint.dichas[0].voice.name, 'Sabina');
  assert.equal(sint.dichas[0].lang, 'es-MX');
  assert.equal(acabo, false, 'todavía está hablando');
  sint.dichas[0].onend();
  await dicha;
  assert.equal(acabo, true);
});

test('en una carta se lee también el texto de la carta', async () => {
  const sint = sintetizadorFalso();
  const v = crearVoz({ sintetizador: sint, Elocucion });
  v.poner(true);
  const dicha = v.alEvento({ type: 'carta' }, 'Ana saca una carta de Noticias.', { textoDeCarta: 'Cobras 50 $ de la rifa.' });
  assert.equal(sint.dichas[0].text, 'Ana saca una carta de Noticias. Cobras 50 $ de la rifa.');
  assert.equal(sint.dichas[0].lang, 'es-ES', 'sin voces, el idioma lo pone la frase');
  sint.dichas[0].onerror();
  await dicha;
});

test('si el navegador no avisa de que acabó, se sigue pasado el tope', async () => {
  const v = crearVoz({ sintetizador: sintetizadorFalso(), Elocucion, esperaMaxima: 20 });
  v.poner(true);
  const antes = Date.now();
  await v.decir('Una frase que nunca acaba.');
  assert.ok(Date.now() - antes >= 15 && Date.now() - antes < 1000);
});

test('con el tablero muy acelerado no habla, y al apagarla o pararla calla', async () => {
  const sint = sintetizadorFalso();
  const v = crearVoz({ sintetizador: sint, Elocucion });
  v.poner(true);
  await v.decir('Muy deprisa.', { velocidad: 4 });
  assert.equal(sint.dichas.length, 0);
  const dicha = v.decir('Algo largo.');
  v.poner(false);
  await dicha; // cancel() acaba la frase en marcha
  assert.equal(sint.cancelaciones, 1);
  assert.equal(v.activa(), false);
  v.parar();
  assert.equal(sint.cancelaciones, 2);
});

test('un navegador sin voz no se rompe: no está disponible y no se puede encender', async () => {
  const v = crearVoz({ sintetizador: undefined, Elocucion: undefined });
  assert.equal(v.disponible, false);
  v.poner(true);
  assert.equal(v.activa(), false);
  await v.decir('Nadie me oye.');
  assert.equal(v.alEvento({ type: 'compra' }, 'Nadie me oye.'), undefined);
  v.parar();
});
