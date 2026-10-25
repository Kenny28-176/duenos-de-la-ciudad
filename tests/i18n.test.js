// Pruebas unitarias de los diccionarios de español e inglés (src/i18n/).
// Valida consistencia entre idiomas, correspondencia con los datos del juego y reglas de estilo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unirDiccionarios } from '../src/i18n/traducir.js';
import { cargarDatos } from '../src/data/cargar.js';

const DATOS = await cargarDatos();
const { tablero, fichas, cartas } = DATOS;

async function cargarIdioma(idioma) {
  const partes = ['juego', 'narrador', 'errores', 'interfaz'];
  const contenidos = {};
  for (const parte of partes) {
    const url = new URL(`../src/i18n/${idioma}/${parte}.json`, import.meta.url);
    const texto = await readFile(url, 'utf8');
    contenidos[parte] = JSON.parse(texto);
  }
  return {
    partes: contenidos,
    unido: unirDiccionarios(
      contenidos.juego,
      contenidos.narrador,
      contenidos.errores,
      contenidos.interfaz,
    ),
  };
}

const { partes: partesEs, unido: diccEs } = await cargarIdioma('es');
const { partes: partesEn, unido: diccEn } = await cargarIdioma('en');

const FORMATOS_CONOCIDOS = new Set(['dinero', 'pct', 'extra', 'menos']);

/**
 * Extrae los marcadores {campo} o {campo:formato} de un texto.
 * @param {string} texto
 * @returns {{ campo: string, formato?: string }[]}
 */
function extraerMarcadores(texto) {
  const regex = /\{([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?\}/g;
  const marcadores = [];
  let m;
  while ((m = regex.exec(texto)) !== null) {
    marcadores.push({ campo: m[1], formato: m[2] });
  }
  return marcadores;
}

// --- Integridad y correspondencia entre idiomas ----------------------------------------------------

test('i18n: las cuatro partes de cada idioma son JSON válido y se unen sin claves repetidas', () => {
  assert.ok(diccEs && typeof diccEs === 'object');
  assert.ok(diccEn && typeof diccEn === 'object');
});

test('i18n: español e inglés tienen exactamente las mismas claves', () => {
  const clavesEs = Object.keys(diccEs).sort();
  const clavesEn = Object.keys(diccEn).sort();

  const faltanEnIngles = clavesEs.filter(k => !(k in diccEn));
  const faltanEnEspanol = clavesEn.filter(k => !(k in diccEs));

  assert.deepEqual(faltanEnIngles, [], 'claves en español que faltan en inglés');
  assert.deepEqual(faltanEnEspanol, [], 'claves en inglés que faltan en español');
  assert.equal(clavesEs.length, clavesEn.length);
});

test('i18n: en cada clave los marcadores y formatos coinciden entre español e inglés, y los formatos son válidos', () => {
  for (const clave of Object.keys(diccEs)) {
    const valEs = diccEs[clave];
    const valEn = diccEn[clave];

    const esArrayEs = Array.isArray(valEs);
    const esArrayEn = Array.isArray(valEn);
    assert.equal(
      esArrayEs,
      esArrayEn,
      `la clave «${clave}» debe tener la misma estructura (array o string) en ambos idiomas`,
    );

    const variantesEs = esArrayEs ? valEs : [valEs];
    const variantesEn = esArrayEn ? valEn : [valEn];

    assert.equal(
      variantesEs.length,
      variantesEn.length,
      `la clave «${clave}» debe tener el mismo número de variantes en ambos idiomas`,
    );

    for (let i = 0; i < variantesEs.length; i++) {
      const marcEs = extraerMarcadores(variantesEs[i]);
      const marcEn = extraerMarcadores(variantesEn[i]);

      // Verificar que los formatos usados son conocidos
      for (const m of [...marcEs, ...marcEn]) {
        if (m.formato) {
          assert.ok(
            FORMATOS_CONOCIDOS.has(m.formato),
            `formato desconocido «${m.formato}» en clave «${clave}»`,
          );
        }
      }

      // Ordenar por campo para comparar independientemente del orden de redacción
      const ordenadosEs = [...marcEs].sort((a, b) => a.campo.localeCompare(b.campo));
      const ordenadosEn = [...marcEn].sort((a, b) => a.campo.localeCompare(b.campo));

      assert.deepEqual(
        ordenadosEs,
        ordenadosEn,
        `los marcadores de la clave «${clave}» (variante ${i}) deben coincidir exactamente entre español e inglés`,
      );
    }
  }
});

// --- Cobertura de datos del juego (src/data/) -------------------------------------------------------

test('i18n: hay texto para cada barrio en tablero.json', () => {
  for (const b of tablero.barrios) {
    const clave = `barrio.${b.id}`;
    assert.ok(typeof diccEs[clave] === 'string', `falta «${clave}» en español`);
    assert.ok(typeof diccEn[clave] === 'string', `falta «${clave}» en inglés`);
  }
});

test('i18n: hay texto para cada casilla de 0 a 39 y versión corta para calles, transportes y servicios', () => {
  for (let i = 0; i < 40; i++) {
    const clave = `casilla.${i}`;
    assert.ok(typeof diccEs[clave] === 'string', `falta «${clave}» en español`);
    assert.ok(typeof diccEn[clave] === 'string', `falta «${clave}» en inglés`);

    const c = tablero.casillas[i];
    if (['calle', 'transporte', 'servicio'].includes(c.tipo)) {
      const claveCorta = `casilla.${i}.corta`;
      assert.ok(typeof diccEs[claveCorta] === 'string', `falta «${claveCorta}» en español`);
      assert.ok(typeof diccEn[claveCorta] === 'string', `falta «${claveCorta}» en inglés`);
    }
  }
});

test('i18n: hay texto para los mazos de noticias y fortuna', () => {
  assert.ok(typeof diccEs['mazo.noticias'] === 'string');
  assert.ok(typeof diccEn['mazo.noticias'] === 'string');
  assert.ok(typeof diccEs['mazo.fortuna'] === 'string');
  assert.ok(typeof diccEn['mazo.fortuna'] === 'string');
});

test('i18n: hay texto para cada ficha, su metáfora, sus habilidades y sus textos', () => {
  for (const f of fichas.fichas) {
    // Ficha y metáfora
    assert.ok(typeof diccEs[`ficha.${f.id}`] === 'string', `falta ficha.${f.id}`);
    assert.ok(typeof diccEn[`ficha.${f.id}`] === 'string', `falta ficha.${f.id} en inglés`);
    assert.ok(typeof diccEs[`ficha.${f.id}.metafora`] === 'string', `falta ficha.${f.id}.metafora`);
    assert.ok(typeof diccEn[`ficha.${f.id}.metafora`] === 'string', `falta ficha.${f.id}.metafora en inglés`);

    // Habilidades pasiva y activa
    for (const tipoHab of ['pasiva', 'activa']) {
      const h = f[tipoHab];
      assert.ok(typeof diccEs[`habilidad.${h.id}`] === 'string', `falta habilidad.${h.id}`);
      assert.ok(typeof diccEn[`habilidad.${h.id}`] === 'string', `falta habilidad.${h.id} en inglés`);

      const claveTexto = `habilidad.${h.id}.texto`;
      assert.ok(typeof diccEs[claveTexto] === 'string', `falta «${claveTexto}» en español`);
      assert.ok(typeof diccEn[claveTexto] === 'string', `falta «${claveTexto}» en inglés`);

      // Cada marcador de habilidad.<id>.texto debe ser un campo propio de esa habilidad en fichas.json
      const marcadores = extraerMarcadores(diccEs[claveTexto]);
      for (const m of marcadores) {
        assert.ok(
          m.campo in h,
          `el marcador «{${m.campo}}» en «${claveTexto}» debe ser un campo de la habilidad en fichas.json`,
        );
      }
    }
  }
});

test('i18n: hay texto para cada carta y cada marcador es un campo de su efecto o barrio', () => {
  const todasLasCartas = [...cartas.noticias, ...cartas.fortuna];

  for (const c of todasLasCartas) {
    const clave = `carta.${c.id}`;
    assert.ok(typeof diccEs[clave] === 'string', `falta «${clave}» en español`);
    assert.ok(typeof diccEn[clave] === 'string', `falta «${clave}» en inglés`);

    // Marcadores deben ser campos del efecto, o 'barrio'
    const marcadores = extraerMarcadores(diccEs[clave]);
    for (const m of marcadores) {
      const esValido = m.campo === 'barrio' || m.campo in c.efecto;
      assert.ok(
        esValido,
        `el marcador «{${m.campo}}» en «${clave}» debe ser un campo de su efecto o «barrio»`,
      );
    }
  }
});

// --- Eventos del narrador y motivos de dinero ------------------------------------------------------

test('i18n: hay un texto evento.* por cada fila de la sección 6.4 de trabajoParalelo.md', () => {
  const eventosSeccion64 = [
    'evento.empieza',
    'evento.reparto',
    'evento.turno',
    'evento.ronda',
    'evento.dados',
    'evento.dados.dobles',
    'evento.salida',
    'evento.compra',
    'evento.noCompra',
    'evento.subasta.compra',
    'evento.subasta.frenesi',
    'evento.subasta.bancarrota',
    'evento.puja',
    'evento.retirada',
    'evento.subastaGanada',
    'evento.subastaDesierta',
    'evento.alquiler',
    'evento.sinAlquiler.hipotecada',
    'evento.sinAlquiler.obras',
    'evento.sinAlquiler.hiberna',
    'evento.deuda',
    'evento.deudaPagada',
    'evento.bancarrota.banco',
    'evento.bancarrota.jugador',
    'evento.alCalabozo.auditoria',
    'evento.alCalabozo.tres-dobles',
    'evento.alCalabozo.carta',
    'evento.saleDelCalabozo.dobles',
    'evento.saleDelCalabozo.fianza',
    'evento.saleDelCalabozo.salvoconducto',
    'evento.carta',
    'evento.masPobre',
    'evento.construir',
    'evento.construir.torre',
    'evento.venderEdificio',
    'evento.hipotecar',
    'evento.deshipotecar',
    'evento.accionesCompradas',
    'evento.accionesVendidas',
    'evento.tratoPropuesto',
    'evento.tratoAceptado',
    'evento.tratoRechazado',
    'evento.tratoCancelado',
    // 10 habilidades activas
    'evento.habilidad.esprint',
    'evento.habilidad.prestamo-expres',
    'evento.habilidad.rally',
    'evento.habilidad.hibernar',
    'evento.habilidad.inflar',
    'evento.habilidad.temporada-alta',
    'evento.habilidad.obras-eternas',
    'evento.habilidad.hormiguero',
    'evento.habilidad.frenesi',
    'evento.habilidad.imprevisto',
    // 7 finEfecto
    'evento.finEfecto.inflada',
    'evento.finEfecto.estallada',
    'evento.finEfecto.rally',
    'evento.finEfecto.hibernar',
    'evento.finEfecto.temporada',
    'evento.finEfecto.hormiguero',
    'evento.finEfecto.obras',
    // otros eventos
    'evento.prestamoDevuelto',
    'evento.pierdeTurno',
    'evento.frenesi',
    'evento.rachaFinal',
    'evento.rachaPerdida',
    'evento.fin.meta',
    'evento.fin.bancarrota',
    'evento.fin.tiempo',
  ];

  for (const clave of eventosSeccion64) {
    assert.ok(clave in diccEs, `falta «${clave}» en español`);
    assert.ok(clave in diccEn, `falta «${clave}» en inglés`);
  }
});

test('i18n: hay un motivo.* por cada fila de la sección 6.5 de trabajoParalelo.md y etiqueta de banco', () => {
  const motivosSeccion65 = [
    'inicial',
    'sueldo',
    'interes',
    'compra',
    'alquiler',
    'dividendo',
    'construir',
    'venta-edificios',
    'hipoteca',
    'deshipotecar',
    'acciones',
    'subasta',
    'trato',
    'interes-hipoteca',
    'impuesto',
    'fianza',
    'carta',
    'prestamo',
    'renta-fija',
    'peaje',
    'apuesta-bajista',
    'bancarrota',
  ];

  for (const motivo of motivosSeccion65) {
    const clave = `motivo.${motivo}`;
    assert.ok(clave in diccEs, `falta «${clave}» en español`);
    assert.ok(clave in diccEn, `falta «${clave}» en inglés`);
  }

  assert.ok('banco' in diccEs, 'falta «banco» en español');
  assert.ok('banco' in diccEn, 'falta «banco» en inglés');
});

// --- Restricciones de formato y longitud -----------------------------------------------------------

test('i18n: ningún texto está vacío ni tiene espacios al principio o al final', () => {
  for (const [idioma, dicc] of [['es', diccEs], ['en', diccEn]]) {
    for (const [clave, valor] of Object.entries(dicc)) {
      const textos = Array.isArray(valor) ? valor : [valor];
      for (let i = 0; i < textos.length; i++) {
        const t = textos[i];
        assert.ok(
          typeof t === 'string' && t.length > 0,
          `el texto de «${clave}» (${idioma}, variante ${i}) no debe estar vacío`,
        );
        assert.equal(
          t,
          t.trim(),
          `el texto de «${clave}» (${idioma}, variante ${i}) no debe tener espacios al principio ni al final`,
        );
      }
    }
  }
});

test('i18n: casilla.<n>.corta tiene como máximo 14 caracteres', () => {
  for (let i = 0; i < 40; i++) {
    const clave = `casilla.${i}.corta`;
    if (clave in diccEs) {
      assert.ok(
        diccEs[clave].length <= 14,
        `«${clave}» en español supera los 14 caracteres: «${diccEs[clave]}» (${diccEs[clave].length})`,
      );
      assert.ok(
        diccEn[clave].length <= 14,
        `«${clave}» en inglés supera los 14 caracteres: «${diccEn[clave]}» (${diccEn[clave].length})`,
      );
    }
  }
});

test('i18n: las frases del narrador tienen como máximo 90 caracteres', () => {
  for (const [idioma, partes] of [['es', partesEs], ['en', partesEn]]) {
    for (const [clave, valor] of Object.entries(partes.narrador)) {
      const textos = Array.isArray(valor) ? valor : [valor];
      for (let i = 0; i < textos.length; i++) {
        const t = textos[i];
        assert.ok(
          t.length <= 90,
          `«${clave}» (${idioma}, variante ${i}) supera los 90 caracteres: «${t}» (${t.length})`,
        );
      }
    }
  }
});
