// Pruebas unitarias del módulo de traducción y gestión de idiomas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IDIOMAS,
  IDIOMA_BASE,
  traducir,
  traducirN,
  elegirIdioma,
  listaDeNombres,
  unirDiccionarios,
} from '../src/i18n/traducir.js';
import {
  iniciarIdioma,
  usarIdioma,
  t,
  tn,
  existe,
  idiomaActual,
  alCambiarIdioma,
  recordarIdioma,
} from '../src/i18n/idioma.js';

test('constantes de idiomas base', () => {
  assert.equal(IDIOMA_BASE, 'es');
  assert.deepEqual(IDIOMAS, { es: 'Español', en: 'English' });
});

test('marcadores sin formato en español e inglés', () => {
  const dictEs = { bienvenida: 'Hola {nombre}, tienes {puntos} puntos y {saldo} monedas' };
  const dictEn = { bienvenida: 'Hello {nombre}, you have {puntos} points and {saldo} coins' };

  // Español: miles con punto
  const resEs = traducir(dictEs, dictEs, 'bienvenida', { nombre: 'Ana', puntos: 1250, saldo: 4000.5 }, { idioma: 'es' });
  assert.equal(resEs, 'Hola Ana, tienes 1.250 puntos y 4.000,5 monedas');

  // Inglés: miles con coma
  const resEn = traducir(dictEn, dictEs, 'bienvenida', { nombre: 'Ana', puntos: 1250, saldo: 4000.5 }, { idioma: 'en' });
  assert.equal(resEn, 'Hello Ana, you have 1,250 points and 4,000.5 coins');

  // Marcador sin valor queda vacío
  const sinValor = traducir(dictEs, dictEs, 'bienvenida', { nombre: 'Beto' }, { idioma: 'es' });
  assert.equal(sinValor, 'Hola Beto, tienes  puntos y  monedas');
});

test('formato de dinero en español e inglés', () => {
  const dictEs = { cobro: 'Cobras {cantidad:dinero}' };
  const dictEn = { cobro: 'You collect {cantidad:dinero}' };

  // Español: cifra + espacio indivisible (U+00A0) + $
  const resEs = traducir(dictEs, dictEs, 'cobro', { cantidad: 1250 }, { idioma: 'es' });
  assert.equal(resEs, 'Cobras 1.250\u00A0$');

  // Inglés: $ + cifra
  const resEn = traducir(dictEn, dictEs, 'cobro', { cantidad: 1250 }, { idioma: 'en' });
  assert.equal(resEn, 'You collect $1,250');
});

test('formato de porcentaje (pct) en español e inglés', () => {
  const dictEs = { tasa: 'Interés del {valor:pct}' };
  const dictEn = { tasa: 'Interest of {valor:pct}' };

  // 0.05 -> 5 % / 5%
  assert.equal(traducir(dictEs, dictEs, 'tasa', { valor: 0.05 }, { idioma: 'es' }), 'Interés del 5\u00A0%');
  assert.equal(traducir(dictEn, dictEs, 'tasa', { valor: 0.05 }, { idioma: 'en' }), 'Interest of 5%');

  // 0.006 -> 0,6 % / 0.6%
  assert.equal(traducir(dictEs, dictEs, 'tasa', { valor: 0.006 }, { idioma: 'es' }), 'Interés del 0,6\u00A0%');
  assert.equal(traducir(dictEn, dictEs, 'tasa', { valor: 0.006 }, { idioma: 'en' }), 'Interest of 0.6%');
});

test('formato extra (aumento) en español e inglés', () => {
  const dictEs = { sube: 'Sube un {factor:extra}' };
  const dictEn = { sube: 'Increases by {factor:extra}' };

  // 1.15 -> 15 %
  assert.equal(traducir(dictEs, dictEs, 'sube', { factor: 1.15 }, { idioma: 'es' }), 'Sube un 15\u00A0%');
  assert.equal(traducir(dictEn, dictEs, 'sube', { factor: 1.15 }, { idioma: 'en' }), 'Increases by 15%');

  // 1.3 -> 30 %
  assert.equal(traducir(dictEs, dictEs, 'sube', { factor: 1.3 }, { idioma: 'es' }), 'Sube un 30\u00A0%');
  assert.equal(traducir(dictEn, dictEs, 'sube', { factor: 1.3 }, { idioma: 'en' }), 'Increases by 30%');
});

test('formato menos (descuento/bajada) en español e inglés', () => {
  const dictEs = { baja: 'Cobra un {factor:menos} menos' };
  const dictEn = { baja: 'Collects {factor:menos} less' };

  // 0.75 -> 25 %
  assert.equal(traducir(dictEs, dictEs, 'baja', { factor: 0.75 }, { idioma: 'es' }), 'Cobra un 25\u00A0% menos');
  assert.equal(traducir(dictEn, dictEs, 'baja', { factor: 0.75 }, { idioma: 'en' }), 'Collects 25% less');

  // 0.8 -> 20 %
  assert.equal(traducir(dictEs, dictEs, 'baja', { factor: 0.8 }, { idioma: 'es' }), 'Cobra un 20\u00A0% menos');
  assert.equal(traducir(dictEn, dictEs, 'baja', { factor: 0.8 }, { idioma: 'en' }), 'Collects 20% less');
});

test('formato desconocido lanza un error explicativo', () => {
  const dict = { saludo: 'Hola {nombre:invalido}' };
  assert.throws(() => {
    traducir(dict, dict, 'saludo', { nombre: 10 });
  }, /Formato desconocido en marcador: "invalido"/);
});

test('variantes de texto seleccionadas por índice módulo longitud', () => {
  const dict = {
    frases: ['Primera opción', 'Segunda opción', 'Tercera opción'],
  };

  assert.equal(traducir(dict, dict, 'frases', {}, { variante: 0 }), 'Primera opción');
  assert.equal(traducir(dict, dict, 'frases', {}, { variante: 1 }), 'Segunda opción');
  assert.equal(traducir(dict, dict, 'frases', {}, { variante: 2 }), 'Tercera opción');
  assert.equal(traducir(dict, dict, 'frases', {}, { variante: 3 }), 'Primera opción');
  assert.equal(traducir(dict, dict, 'frases', {}, { variante: 7 }), 'Segunda opción');
});

test('plurales con traducirN (.uno y .otros)', () => {
  const dictEs = {
    'casas.uno': '{n} casa',
    'casas.otros': '{n} casas',
  };
  const dictEn = {
    'casas.uno': '{n} house',
    'casas.otros': '{n} houses',
  };

  assert.equal(traducirN(dictEs, dictEs, 'casas', 1, {}, { idioma: 'es' }), '1 casa');
  assert.equal(traducirN(dictEs, dictEs, 'casas', 0, {}, { idioma: 'es' }), '0 casas');
  assert.equal(traducirN(dictEs, dictEs, 'casas', 4, {}, { idioma: 'es' }), '4 casas');

  assert.equal(traducirN(dictEn, dictEs, 'casas', 1, {}, { idioma: 'en' }), '1 house');
  assert.equal(traducirN(dictEn, dictEs, 'casas', 2, {}, { idioma: 'en' }), '2 houses');
});

test('respaldo en español cuando falta en inglés y retorno de clave si no existe', () => {
  const baseEs = {
    'solo.espanol': 'Texto en español',
    'comun': 'Común ES',
  };
  const dictEn = {
    'comun': 'Common EN',
  };

  // Clave en inglés se traduce al inglés
  assert.equal(traducir(dictEn, baseEs, 'comun', {}, { idioma: 'en' }), 'Common EN');

  // Clave que no está en inglés recurre al español base
  assert.equal(traducir(dictEn, baseEs, 'solo.espanol', {}, { idioma: 'en' }), 'Texto en español');

  // Clave que no existe en ninguno devuelve la clave
  assert.equal(traducir(dictEn, baseEs, 'clave.inexistente'), 'clave.inexistente');
});

test('unirDiccionarios combina partes y detecta claves repetidas', () => {
  const parte1 = { 'a.1': 'Uno', 'a.2': 'Dos' };
  const parte2 = { 'b.1': 'Tres' };
  const parte3 = { 'c.1': 'Cuatro' };

  const unido = unirDiccionarios(parte1, parte2, parte3);
  assert.deepEqual(unido, {
    'a.1': 'Uno',
    'a.2': 'Dos',
    'b.1': 'Tres',
    'c.1': 'Cuatro',
  });

  // Clave repetida lanza error
  const parteRepetida = { 'a.1': 'Duplicado' };
  assert.throws(() => {
    unirDiccionarios(parte1, parteRepetida);
  }, /Clave repetida en el diccionario: "a\.1"/);
});

test('elegirIdioma respeta orden de prioridad: parámetro, guardado, navegador, base', () => {
  // Parámetro tiene la máxima prioridad
  assert.equal(elegirIdioma({ parametro: 'en', guardado: 'es', navegador: 'es' }), 'en');
  assert.equal(elegirIdioma({ parametro: 'es-ES', guardado: 'en', navegador: 'en' }), 'es');
  assert.equal(elegirIdioma({ parametro: { get: k => (k === 'lang' ? 'en' : null) } }), 'en');

  // Guardado tiene prioridad sobre navegador
  assert.equal(elegirIdioma({ guardado: 'en', navegador: 'es' }), 'en');
  assert.equal(elegirIdioma({ guardado: 'es', navegador: 'en-US' }), 'es');

  // Navegador cuando no hay parámetro ni guardado
  assert.equal(elegirIdioma({ navegador: 'en-US' }), 'en');
  assert.equal(elegirIdioma({ navegador: ['fr', 'en', 'es'] }), 'en');
  assert.equal(elegirIdioma({ navegador: 'es-MX' }), 'es');

  // Por defecto es idioma base (español)
  assert.equal(elegirIdioma({ navegador: 'fr-FR' }), 'es');
  assert.equal(elegirIdioma(), 'es');
});

test('listaDeNombres une elementos con comas y conjunción', () => {
  assert.equal(listaDeNombres([]), '');
  assert.equal(listaDeNombres(['Ana']), 'Ana');
  assert.equal(listaDeNombres(['Ana', 'Beto']), 'Ana y Beto');
  assert.equal(listaDeNombres(['Ana', 'Beto', 'Carlos']), 'Ana, Beto y Carlos');
  assert.equal(listaDeNombres(['Ana', 'Beto', 'Carlos'], 'and'), 'Ana, Beto and Carlos');
  assert.equal(listaDeNombres(['Rata', 'Toro'], 'o'), 'Rata o Toro');
});

test('idioma.js gestiona estado, cambio de idioma y oyentes', async () => {
  const diccionariosPrueba = {
    es: {
      'saludo': 'Hola {nombre}',
      'casa.uno': '{n} casa',
      'casa.otros': '{n} casas',
      'solo.base': 'En base',
    },
    en: {
      'saludo': 'Hello {nombre}',
      'casa.uno': '{n} house',
      'casa.otros': '{n} houses',
    },
  };

  const cambios = [];
  const desuscribir = alCambiarIdioma(nuevo => cambios.push(nuevo));

  await iniciarIdioma({
    idioma: 'es',
    persistir: false,
    diccionarios: diccionariosPrueba,
  });

  assert.equal(idiomaActual(), 'es');
  assert.equal(t('saludo', { nombre: 'Ana' }), 'Hola Ana');
  assert.equal(tn('casa', 1), '1 casa');
  assert.equal(tn('casa', 3), '3 casas');
  assert.equal(existe('saludo'), true);
  assert.equal(existe('clave.inexistente'), false);

  // Cambiar a inglés
  await usarIdioma('en', { persistir: false, diccionarios: diccionariosPrueba });
  assert.equal(idiomaActual(), 'en');
  assert.equal(t('saludo', { nombre: 'Ana' }), 'Hello Ana');
  assert.equal(tn('casa', 1), '1 house');
  assert.equal(tn('casa', 3), '3 houses');
  assert.equal(t('solo.base'), 'En base'); // Respaldo en base
  assert.deepEqual(cambios, ['en']);

  // Desuscribir oyente
  desuscribir();
  await usarIdioma('es', { persistir: false, diccionarios: diccionariosPrueba });
  assert.equal(idiomaActual(), 'es');
  assert.deepEqual(cambios, ['en']); // No recibió el segundo cambio
});
