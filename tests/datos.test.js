// Pruebas unitarias de los datos del juego (tablero, fichas, cartas y economía).
// Valida la forma y consistencia de los datos según las reglas de diseño sin comprobar cifras fijas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';

const { tablero, fichas, cartas, economia } = await cargarDatos();

// --- Tablero ---------------------------------------------------------------------------------------

test('tablero: contiene exactamente 40 casillas con tipos permitidos', () => {
  const TIPOS_PERMITIDOS = [
    'salida',
    'calle',
    'transporte',
    'servicio',
    'noticias',
    'fortuna',
    'impuesto',
    'calabozo',
    'bolsa',
    'auditoria',
    'agencia',
  ];

  assert.equal(tablero.casillas.length, 40, 'debe haber exactamente 40 casillas');
  for (let i = 0; i < tablero.casillas.length; i++) {
    const c = tablero.casillas[i];
    assert.ok(
      TIPOS_PERMITIDOS.includes(c.tipo),
      `casilla ${i} tiene un tipo válido (${c.tipo})`,
    );
  }
});

test('tablero: una sola casilla de cada esquina y en su posición correcta', () => {
  const esquinasEsperadas = {
    0: 'salida',
    10: 'calabozo',
    20: 'bolsa',
    30: 'auditoria',
  };

  for (const [posStr, tipo] of Object.entries(esquinasEsperadas)) {
    const pos = Number(posStr);
    assert.equal(
      tablero.casillas[pos].tipo,
      tipo,
      `la casilla en la posición ${pos} debe ser de tipo ${tipo}`,
    );

    const coincidencias = tablero.casillas.filter(c => c.tipo === tipo);
    assert.equal(
      coincidencias.length,
      1,
      `solo debe haber una casilla de tipo ${tipo} en todo el tablero`,
    );
  }
});

test('tablero: cada calle pertenece a un barrio existente y los no-calle no tienen barrio', () => {
  const barriosIds = new Set(tablero.barrios.map(b => b.id));

  for (let i = 0; i < tablero.casillas.length; i++) {
    const c = tablero.casillas[i];
    if (c.tipo === 'calle') {
      assert.ok(
        typeof c.barrio === 'string' && barriosIds.has(c.barrio),
        `la calle ${i} (${c.nombre}) debe pertenecer a un barrio válido (${c.barrio})`,
      );
    } else {
      assert.equal(
        c.barrio,
        undefined,
        `la casilla ${i} de tipo ${c.tipo} no debe tener barrio`,
      );
    }
  }
});

test('tablero: cada barrio tiene 2 o 3 calles, todas en el mismo lado y sin mezclarse', () => {
  const callesPorBarrio = Object.fromEntries(tablero.barrios.map(b => [b.id, []]));

  for (let i = 0; i < tablero.casillas.length; i++) {
    const c = tablero.casillas[i];
    if (c.tipo === 'calle') {
      callesPorBarrio[c.barrio].push(i);
    }
  }

  // Comprobar cantidad y mismo lado del tablero (cuadrantes de 10 casillas: 0..9, 10..19, 20..29, 30..39)
  for (const [barrioId, indices] of Object.entries(callesPorBarrio)) {
    assert.ok(
      indices.length === 2 || indices.length === 3,
      `el barrio ${barrioId} debe tener 2 o 3 calles (tiene ${indices.length})`,
    );

    const lados = indices.map(i => Math.floor(i / 10));
    assert.ok(
      lados.every(lado => lado === lados[0]),
      `todas las calles del barrio ${barrioId} deben estar en el mismo lado del tablero (${indices.join(', ')})`,
    );
  }

  // Comprobar que en la secuencia ordenada de calles no se mezclan barrios distintos
  const secuenciaCalles = tablero.casillas
    .filter(c => c.tipo === 'calle')
    .map(c => c.barrio);

  for (const barrio of tablero.barrios) {
    const primeraAparicion = secuenciaCalles.indexOf(barrio.id);
    const ultimaAparicion = secuenciaCalles.lastIndexOf(barrio.id);
    const totalApariciones = secuenciaCalles.filter(b => b === barrio.id).length;
    assert.equal(
      ultimaAparicion - primeraAparicion + 1,
      totalApariciones,
      `las calles del barrio ${barrio.id} deben ser contiguas entre sí en la secuencia de calles`,
    );
  }
});

test('tablero: los barrios tienen id único, nombre, icono y color hexadecimal único (#RRGGBB)', () => {
  const ids = new Set();
  const colores = new Set();
  const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

  for (const b of tablero.barrios) {
    assert.ok(typeof b.id === 'string' && b.id.length > 0, 'barrio debe tener id');
    assert.ok(!ids.has(b.id), `el id de barrio ${b.id} debe ser único`);
    ids.add(b.id);

    assert.ok(typeof b.nombre === 'string' && b.nombre.length > 0, `barrio ${b.id} debe tener nombre`);
    assert.ok(typeof b.icono === 'string' && b.icono.length > 0, `barrio ${b.id} debe tener icono`);

    assert.ok(
      HEX_COLOR.test(b.color),
      `el color de ${b.id} debe ser un hex válido #RRGGBB (recibido ${b.color})`,
    );
    assert.ok(!colores.has(b.color), `el color de ${b.id} (${b.color}) no debe repetirse`);
    colores.add(b.color);
  }
});

test('tablero: los nombres de las casillas no se repiten, salvo Noticias y Fortuna', () => {
  const nombresVistos = new Set();

  for (let i = 0; i < tablero.casillas.length; i++) {
    const { nombre, tipo } = tablero.casillas[i];
    assert.ok(typeof nombre === 'string' && nombre.length > 0, `casilla ${i} debe tener nombre`);

    if (nombre === 'Noticias') {
      assert.equal(tipo, 'noticias', `la casilla ${i} Noticias debe tener tipo noticias`);
    } else if (nombre === 'Fortuna') {
      assert.equal(tipo, 'fortuna', `la casilla ${i} Fortuna debe tener tipo fortuna`);
    } else {
      assert.ok(
        !nombresVistos.has(nombre),
        `el nombre de casilla «${nombre}» (casilla ${i}) no debe repetirse`,
      );
      nombresVistos.add(nombre);
    }
  }
});

test('tablero: todos los barrios y casillas que no son calles tienen imagen listada en VISUALES.md', async () => {
  const visualesMd = await readFile(new URL('../docs/VISUALES.md', import.meta.url), 'utf8');

  // Barrios
  for (const b of tablero.barrios) {
    assert.ok(typeof b.imagen === 'string' && b.imagen.length > 0, `barrio ${b.id} debe tener imagen`);
    assert.ok(
      visualesMd.includes(b.imagen),
      `la imagen del barrio ${b.id} (${b.imagen}) debe estar en docs/VISUALES.md`,
    );
  }

  // Casillas que no son calles
  for (let i = 0; i < tablero.casillas.length; i++) {
    const c = tablero.casillas[i];
    if (c.tipo !== 'calle') {
      assert.ok(
        typeof c.imagen === 'string' && c.imagen.length > 0,
        `casilla ${i} (${c.tipo}) debe tener imagen`,
      );
      assert.ok(
        visualesMd.includes(c.imagen),
        `la imagen de la casilla ${i} (${c.imagen}) debe estar en docs/VISUALES.md`,
      );
    }
  }
});

// --- Fichas ----------------------------------------------------------------------------------------

test('fichas: contiene 10 fichas con id y color únicos en formato #RRGGBB', () => {
  assert.equal(fichas.fichas.length, 10, 'debe haber exactamente 10 fichas');
  const ids = new Set();
  const colores = new Set();
  const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

  for (const f of fichas.fichas) {
    assert.ok(typeof f.id === 'string' && f.id.length > 0, 'ficha debe tener id');
    assert.ok(!ids.has(f.id), `id de ficha repetido: ${f.id}`);
    ids.add(f.id);

    assert.ok(typeof f.color === 'string' && HEX_COLOR.test(f.color), `color inválido en ficha ${f.id}`);
    assert.ok(!colores.has(f.color), `color de ficha repetido: ${f.color}`);
    colores.add(f.color);
  }
});

test('fichas: cada pasiva y activa tiene id y nombre únicos, enfriamiento válido y campos consistentes', () => {
  const idsHabilidades = new Set();
  const nombresHabilidades = new Set();

  for (const f of fichas.fichas) {
    for (const tipoHab of ['pasiva', 'activa']) {
      const h = f[tipoHab];
      assert.ok(h && typeof h === 'object', `ficha ${f.id} debe tener ${tipoHab}`);
      assert.ok(typeof h.id === 'string' && h.id.length > 0, `habilidad de ${f.id} debe tener id`);
      assert.ok(!idsHabilidades.has(h.id), `id de habilidad repetido: ${h.id}`);
      idsHabilidades.add(h.id);

      assert.ok(typeof h.nombre === 'string' && h.nombre.length > 0, `habilidad de ${f.id} debe tener nombre`);
      assert.ok(!nombresHabilidades.has(h.nombre), `nombre de habilidad repetido: ${h.nombre}`);
      nombresHabilidades.add(h.nombre);

      if (tipoHab === 'activa') {
        assert.ok(
          Number.isInteger(h.enfriamiento) && h.enfriamiento >= 1 && h.enfriamiento <= 10,
          `enfriamiento de ${h.id} debe ser un entero entre 1 y 10 (valor: ${h.enfriamiento})`,
        );
      }

      // Validar todos los demás campos
      for (const [clave, valor] of Object.entries(h)) {
        if (clave === 'id' || clave === 'nombre' || clave === 'enfriamiento') continue;

        if (clave === 'momento') {
          assert.equal(
            valor,
            'antes-de-tirar',
            `el campo momento de ${h.id} debe valer 'antes-de-tirar'`,
          );
        } else if (clave === 'objetivo') {
          assert.equal(valor, true, `el campo objetivo de ${h.id} debe valer true`);
        } else if (clave === 'porJugadores') {
          assert.ok(typeof valor === 'object' && valor !== null, `porJugadores en ${h.id} debe ser objeto`);
          for (const [campoRef, lista] of Object.entries(valor)) {
            assert.ok(
              Array.isArray(lista) && lista.length === 7,
              `porJugadores.${campoRef} en ${h.id} debe tener 7 números (para 2 a 8 jugadores)`,
            );
            assert.ok(
              lista.every(n => typeof n === 'number' && Number.isFinite(n) && n > 0),
              `todos los valores de porJugadores.${campoRef} en ${h.id} deben ser números positivos`,
            );
            // El tercer valor (índice 2, 4 jugadores) coincide con el campo base
            assert.equal(
              lista[2],
              h[campoRef],
              `el valor para 4 jugadores en porJugadores.${campoRef} de ${h.id} debe coincidir con el campo base`,
            );
          }
        } else {
          assert.ok(
            typeof valor === 'number' && Number.isFinite(valor) && valor > 0,
            `el campo ${clave} de ${h.id} debe ser un número positivo (recibido ${valor})`,
          );
        }
      }
    }
  }
});

// --- Cartas ----------------------------------------------------------------------------------------

test('cartas: contiene 16 cartas de noticias y 16 de fortuna con ids únicos que empiezan por n- o f-', () => {
  assert.equal(cartas.noticias.length, 16, 'debe haber exactamente 16 cartas de noticias');
  assert.equal(cartas.fortuna.length, 16, 'debe haber exactamente 16 cartas de fortuna');

  const ids = new Set();
  for (const c of cartas.noticias) {
    assert.ok(c.id.startsWith('n-'), `carta de noticias ${c.id} debe empezar por 'n-'`);
    assert.ok(!ids.has(c.id), `id de carta repetido: ${c.id}`);
    ids.add(c.id);
  }

  for (const c of cartas.fortuna) {
    assert.ok(c.id.startsWith('f-'), `carta de fortuna ${c.id} debe empezar por 'f-'`);
    assert.ok(!ids.has(c.id), `id de carta repetido: ${c.id}`);
    ids.add(c.id);
  }
});

test('cartas: cada carta tiene texto y efecto válido con los campos requeridos según la sección 6.6', () => {
  const todasLasCartas = [...cartas.noticias, ...cartas.fortuna];

  const TIPOS_EFECTO_VALIDOS = [
    'cobrar',
    'pagar',
    'todosCobran',
    'todosPagan',
    'cobrarDeCadaJugador',
    'pagarACadaJugador',
    'moverA',
    'avanzarATipo',
    'retroceder',
    'irCalabozo',
    'salvoconducto',
    'reparaciones',
    'reparacionesTodos',
    'valorBarrio',
    'valorTodos',
    'dividendoExtra',
    'accionesBaratas',
    'cobraElMasPobre',
    'pagarPorHipotecada',
  ];

  for (const c of todasLasCartas) {
    assert.ok(typeof c.texto === 'string' && c.texto.length > 0, `carta ${c.id} debe tener texto`);
    assert.ok(c.efecto && typeof c.efecto === 'object', `carta ${c.id} debe tener efecto`);

    const { tipo } = c.efecto;
    assert.ok(
      TIPOS_EFECTO_VALIDOS.includes(tipo),
      `carta ${c.id} tiene un tipo de efecto válido (${tipo})`,
    );

    switch (tipo) {
      case 'cobrar':
      case 'pagar':
      case 'todosCobran':
      case 'todosPagan':
      case 'cobrarDeCadaJugador':
      case 'pagarACadaJugador':
      case 'cobraElMasPobre':
      case 'pagarPorHipotecada':
        assert.ok(
          typeof c.efecto.cantidad === 'number' && c.efecto.cantidad > 0,
          `carta ${c.id} (${tipo}) debe tener campo cantidad positivo`,
        );
        break;

      case 'moverA':
        assert.ok(
          Number.isInteger(c.efecto.casilla) && c.efecto.casilla >= 0 && c.efecto.casilla <= 39,
          `carta ${c.id} (${tipo}) debe tener casilla entre 0 y 39`,
        );
        break;

      case 'avanzarATipo':
        assert.ok(
          c.efecto.casilla === 'transporte' || c.efecto.casilla === 'servicio',
          `carta ${c.id} (${tipo}) debe tener casilla 'transporte' o 'servicio'`,
        );
        break;

      case 'retroceder':
        assert.ok(
          Number.isInteger(c.efecto.casillas) && c.efecto.casillas > 0,
          `carta ${c.id} (${tipo}) debe tener casillas entero positivo`,
        );
        break;

      case 'irCalabozo':
      case 'salvoconducto':
        // No llevan campos numéricos adicionales
        break;

      case 'reparaciones':
      case 'reparacionesTodos':
        assert.ok(
          typeof c.efecto.casa === 'number' && c.efecto.casa > 0,
          `carta ${c.id} (${tipo}) debe tener casa positivo`,
        );
        assert.ok(
          typeof c.efecto.torre === 'number' && c.efecto.torre > 0,
          `carta ${c.id} (${tipo}) debe tener torre positivo`,
        );
        break;

      case 'valorBarrio':
        assert.ok(
          typeof c.efecto.cantidad === 'number' && c.efecto.cantidad !== 0,
          `carta ${c.id} (${tipo}) debe tener cantidad numérica distinta de 0`,
        );
        break;

      case 'valorTodos':
        assert.ok(
          typeof c.efecto.porcentaje === 'number' &&
            c.efecto.porcentaje >= -1 &&
            c.efecto.porcentaje <= 1 &&
            c.efecto.porcentaje !== 0,
          `carta ${c.id} (${tipo}) debe tener porcentaje entre -1 y 1 distinto de 0`,
        );
        break;

      case 'dividendoExtra':
        assert.ok(
          typeof c.efecto.porAccion === 'number' && c.efecto.porAccion > 0,
          `carta ${c.id} (${tipo}) debe tener porAccion positivo`,
        );
        break;

      case 'accionesBaratas':
        assert.ok(
          Number.isInteger(c.efecto.cantidad) && c.efecto.cantidad > 0,
          `carta ${c.id} (${tipo}) debe tener cantidad de acciones entero positivo`,
        );
        break;
    }
  }
});

test('cartas: hay exactamente un salvoconducto y está en Fortuna', () => {
  const salvosNoticias = cartas.noticias.filter(c => c.efecto.tipo === 'salvoconducto');
  const salvosFortuna = cartas.fortuna.filter(c => c.efecto.tipo === 'salvoconducto');

  assert.equal(salvosNoticias.length, 0, 'no debe haber salvoconducto en noticias');
  assert.equal(salvosFortuna.length, 1, 'debe haber exactamente un salvoconducto en fortuna');
});

test('cartas: {barrio} aparece únicamente en cartas que eligen un barrio al azar (valorBarrio y accionesBaratas)', () => {
  const todasLasCartas = [...cartas.noticias, ...cartas.fortuna];

  for (const c of todasLasCartas) {
    const tieneBarrio = c.texto.includes('{barrio}');
    const esEfectoConBarrio = c.efecto.tipo === 'valorBarrio' || c.efecto.tipo === 'accionesBaratas';

    assert.equal(
      tieneBarrio,
      esEfectoConBarrio,
      `la carta ${c.id} (${c.efecto.tipo}) debe tener {barrio} si y solo si es valorBarrio o accionesBaratas`,
    );
  }
});

test('cartas: las cartas de mercado llevan "mercado": true y las demás no lo llevan', () => {
  const todasLasCartas = [...cartas.noticias, ...cartas.fortuna];
  const TIPOS_MERCADO = ['valorBarrio', 'valorTodos', 'dividendoExtra', 'accionesBaratas'];

  for (const c of todasLasCartas) {
    const esMercado = TIPOS_MERCADO.includes(c.efecto.tipo);
    if (esMercado) {
      assert.equal(c.mercado, true, `la carta ${c.id} (${c.efecto.tipo}) debe tener "mercado": true`);
    } else {
      assert.equal(
        c.mercado,
        undefined,
        `la carta ${c.id} (${c.efecto.tipo}) no debe tener propiedad mercado`,
      );
    }
  }
});

// --- Economía --------------------------------------------------------------------------------------

test('economia: existen todas las claves que utiliza el motor', () => {
  const clavesRequeridas = [
    'dineroInicial',
    'sueldo',
    'precio',
    'precioTransporte',
    'precioServicio',
    'alquiler',
    'costeCasa',
    'existencias',
    'transportes',
    'servicios',
    'hipoteca',
    'interesHipoteca',
    'ventaEdificios',
    'impuestoPatrimonio',
    'fianza',
    'subasta',
    'bolsa',
    'metas',
  ];

  for (const clave of clavesRequeridas) {
    assert.ok(clave in economia, `economia.json debe contener la clave «${clave}»`);
  }

  // Claves anidadas
  assert.ok('base' in economia.precio);
  assert.ok('porCasilla' in economia.precio);
  assert.ok('recargoUltima' in economia.precio);
  assert.ok('redondeo' in economia.precio);

  assert.ok('base' in economia.alquiler);
  assert.ok('barrioCompleto' in economia.alquiler);
  assert.ok('multiplicadores' in economia.alquiler);

  assert.ok('casas' in economia.existencias);
  assert.ok('torres' in economia.existencias);

  assert.ok('minimo' in economia.subasta);
  assert.ok('incremento' in economia.subasta);

  assert.ok('acciones' in economia.bolsa);
  assert.ok('maxPorJugador' in economia.bolsa);
  assert.ok('divisor' in economia.bolsa);
  assert.ok('recompra' in economia.bolsa);
  assert.ok('dividendo' in economia.bolsa);
  assert.ok('paquete' in economia.bolsa);

  assert.ok('corta' in economia.metas);
  assert.ok('normal' in economia.metas);
  assert.ok('larga' in economia.metas);
});

test('economia: las fracciones están entre 0 y 1', () => {
  const fracciones = {
    hipoteca: economia.hipoteca,
    interesHipoteca: economia.interesHipoteca,
    ventaEdificios: economia.ventaEdificios,
    impuestoPatrimonio: economia.impuestoPatrimonio,
    'bolsa.recompra': economia.bolsa.recompra,
    'bolsa.dividendo': economia.bolsa.dividendo,
  };

  for (const [nombre, valor] of Object.entries(fracciones)) {
    assert.ok(
      typeof valor === 'number' && valor >= 0 && valor <= 1,
      `la fracción ${nombre} debe estar entre 0 y 1 (recibido ${valor})`,
    );
  }
});

test('economia: alquiler.multiplicadores tiene 6 números estrictamente crecientes', () => {
  assert.ok(
    Array.isArray(economia.alquiler.multiplicadores),
    'alquiler.multiplicadores debe ser un array',
  );
  assert.equal(
    economia.alquiler.multiplicadores.length,
    6,
    'alquiler.multiplicadores debe tener 6 elementos (de 0 a 4 casas y torre)',
  );

  for (let i = 0; i < economia.alquiler.multiplicadores.length; i++) {
    const val = economia.alquiler.multiplicadores[i];
    assert.ok(typeof val === 'number' && val > 0, `multiplicador ${i} debe ser un número positivo`);
    if (i > 0) {
      assert.ok(
        val > economia.alquiler.multiplicadores[i - 1],
        `multiplicador ${i} (${val}) debe ser mayor que el anterior (${economia.alquiler.multiplicadores[i - 1]})`,
      );
    }
  }
});

test('economia: transportes tiene 4 números positivos y servicios tiene 2', () => {
  assert.ok(Array.isArray(economia.transportes), 'transportes debe ser un array');
  assert.equal(economia.transportes.length, 4, 'transportes debe tener 4 números');
  assert.ok(
    economia.transportes.every(x => typeof x === 'number' && x > 0),
    'todos los valores de transportes deben ser números positivos',
  );

  assert.ok(Array.isArray(economia.servicios), 'servicios debe ser un array');
  assert.equal(economia.servicios.length, 2, 'servicios debe tener 2 números');
  assert.ok(
    economia.servicios.every(x => typeof x === 'number' && x > 0),
    'todos los valores de servicios deben ser números positivos',
  );
});
