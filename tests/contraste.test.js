// Pruebas unitarias de contraste y accesibilidad WCAG 2.1 (T-11 de trabajoParalelo.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import {
  calcularContraste,
  analizarColores,
  luminanciaRelativa,
  TEXTO_OSCURO,
  TEXTO_CLARO,
} from '../tools/contraste.js';

const DATOS = await cargarDatos();
const { tablero, fichas } = DATOS;

test('contraste: comprueba la fórmula con caso conocido (blanco sobre negro da exactamente 21:1)', () => {
  const contrasteBlancoNegro = calcularContraste('#FFFFFF', '#000000');
  assert.equal(contrasteBlancoNegro, 21);

  // Luminancias de referencia
  assert.equal(luminanciaRelativa('#000000'), 0);
  assert.equal(luminanciaRelativa('#FFFFFF'), 1);

  // Mismo color da ratio 1:1
  assert.equal(calcularContraste('#123456', '#123456'), 1);
});

test('contraste: cada barrio tiene al menos un color de texto con ratio 3:1 o superior', () => {
  const elementos = tablero.barrios.map(b => ({
    tipo: 'Barrio',
    id: b.id,
    nombre: b.nombre,
    color: b.color,
  }));

  const resultados = analizarColores(elementos, TEXTO_OSCURO, TEXTO_CLARO);

  for (const r of resultados) {
    assert.ok(
      r.mejorContraste >= 3.0,
      `El barrio «${r.nombre}» (${r.color}) debe alcanzar al menos 3:1 con algún texto (mejor: ${r.mejorContraste}:1 con texto ${r.recomendado})`,
    );
  }
});

test('contraste: cada ficha tiene al menos un color de texto con ratio 3:1 o superior', () => {
  const elementos = fichas.fichas.map(f => ({
    tipo: 'Ficha',
    id: f.id,
    nombre: f.nombre,
    color: f.color,
  }));

  const resultados = analizarColores(elementos, TEXTO_OSCURO, TEXTO_CLARO);

  for (const r of resultados) {
    assert.ok(
      r.mejorContraste >= 3.0,
      `La ficha «${r.nombre}» (${r.color}) debe alcanzar al menos 3:1 con algún texto (mejor: ${r.mejorContraste}:1 con texto ${r.recomendado})`,
    );
  }
});
