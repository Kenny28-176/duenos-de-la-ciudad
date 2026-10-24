// Pruebas unitarias de la geometría del tablero y posicionamiento de fichas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometriaTablero, posicionFicha } from '../src/ui/tablero/geometria.js';

test('hay 40 casillas, con las esquinas en 0, 10, 20 y 30, y todas dentro del tablero', () => {
  const geo = geometriaTablero();
  assert.equal(geo.casillas.length, 40);

  const esquinasIndices = [0, 10, 20, 30];
  for (const c of geo.casillas) {
    assert.equal(c.esquina, esquinasIndices.includes(c.i));

    // Todas dentro de los límites del tablero
    assert.ok(c.x >= 0, `casilla ${c.i} x >= 0`);
    assert.ok(c.y >= 0, `casilla ${c.i} y >= 0`);
    assert.ok(c.x + c.ancho <= geo.lado + 1e-6, `casilla ${c.i} dentro del ancho`);
    assert.ok(c.y + c.alto <= geo.lado + 1e-6, `casilla ${c.i} dentro del alto`);

    // Centro consistente
    assert.ok(Math.abs(c.centro.x - (c.x + c.ancho / 2)) < 1e-6);
    assert.ok(Math.abs(c.centro.y - (c.y + c.alto / 2)) < 1e-6);

    // Rotaciones por lado
    if (c.esquina) {
      assert.equal(c.rotacion, 0);
      assert.equal(c.lado, 0);
    } else if (c.lado === 1) {
      assert.equal(c.rotacion, 90);
    } else if (c.lado === 2) {
      assert.equal(c.rotacion, 180);
    } else if (c.lado === 3) {
      assert.equal(c.rotacion, 270);
    } else if (c.lado === 4) {
      assert.equal(c.rotacion, 0);
    }
  }
});

test('ninguna casilla se solapa con otra y cubren exactamente el anillo exterior', () => {
  const geo = geometriaTablero();

  // No se solapan entre sí (área de intersección 0 para cualquier par)
  for (let a = 0; a < geo.casillas.length; a++) {
    for (let b = a + 1; b < geo.casillas.length; b++) {
      const ca = geo.casillas[a];
      const cb = geo.casillas[b];
      const interAncho = Math.max(0, Math.min(ca.x + ca.ancho, cb.x + cb.ancho) - Math.max(ca.x, cb.x));
      const interAlto = Math.max(0, Math.min(ca.y + ca.alto, cb.y + cb.alto) - Math.max(ca.y, cb.y));
      assert.ok(interAncho * interAlto < 1e-9, `solapamiento entre casilla ${a} y ${b}`);
    }
  }

  // La suma de áreas coincide exactamente con lado² − (lado − 2 · esquina)²
  const areaTotal = geo.casillas.reduce((acc, c) => acc + c.ancho * c.alto, 0);
  const areaEsperada = geo.lado ** 2 - (geo.lado - 2 * geo.esquina) ** 2;
  assert.ok(Math.abs(areaTotal - areaEsperada) < 1e-6, 'suma de áreas correcta');
});

test('cada casilla toca a la siguiente en un segmento continuo, y la 39 toca a la 0', () => {
  const geo = geometriaTablero();

  for (let i = 0; i < 40; i++) {
    const c1 = geo.casillas[i];
    const c2 = geo.casillas[(i + 1) % 40];

    // Comprobar contacto horizontal o vertical con segmento de longitud positiva
    const tocaVertical = (Math.abs(c1.x + c1.ancho - c2.x) < 1e-6 || Math.abs(c2.x + c2.ancho - c1.x) < 1e-6)
      && (Math.min(c1.y + c1.alto, c2.y + c2.alto) - Math.max(c1.y, c2.y) > 1e-6);

    const tocaHorizontal = (Math.abs(c1.y + c1.alto - c2.y) < 1e-6 || Math.abs(c2.y + c2.alto - c1.y) < 1e-6)
      && (Math.min(c1.x + c1.ancho, c2.x + c2.ancho) - Math.max(c1.x, c2.x) > 1e-6);

    assert.ok(tocaVertical || tocaHorizontal, `casilla ${i} no toca a la casilla ${(i + 1) % 40}`);
  }
});

test('el orden sigue el sentido de las agujas del reloj por los 4 lados', () => {
  const geo = geometriaTablero();

  // Lado 1 (columna izquierda): de abajo a arriba, la «y» decrece de la 1 a la 9
  for (let i = 1; i < 9; i++) {
    assert.ok(geo.casillas[i + 1].y < geo.casillas[i].y, `lado 1 orden y casilla ${i}`);
  }

  // Lado 2 (fila superior): de izquierda a derecha, la «x» crece de la 11 a la 19
  for (let i = 11; i < 19; i++) {
    assert.ok(geo.casillas[i + 1].x > geo.casillas[i].x, `lado 2 orden x casilla ${i}`);
  }

  // Lado 3 (columna derecha): de arriba a abajo, la «y» crece de la 21 a la 29
  for (let i = 21; i < 29; i++) {
    assert.ok(geo.casillas[i + 1].y > geo.casillas[i].y, `lado 3 orden y casilla ${i}`);
  }

  // Lado 4 (fila inferior): de derecha a izquierda, la «x» decrece de la 31 a la 39
  for (let i = 31; i < 39; i++) {
    assert.ok(geo.casillas[i + 1].x < geo.casillas[i].x, `lado 4 orden x casilla ${i}`);
  }
});

test('cada banda está dentro de su casilla, en el borde exterior y más lejos del centro que la casilla', () => {
  const geo = geometriaTablero();

  for (const c of geo.casillas) {
    if (c.esquina) {
      assert.equal(c.banda, null);
      continue;
    }

    const b = c.banda;
    assert.ok(b, `casilla ${c.i} debe tener banda`);

    // Dentro de la casilla
    assert.ok(b.x >= c.x - 1e-6 && b.y >= c.y - 1e-6);
    assert.ok(b.x + b.ancho <= c.x + c.ancho + 1e-6);
    assert.ok(b.y + b.alto <= c.y + c.alto + 1e-6);

    // Pegada al borde exterior correspondiente
    if (c.lado === 1) assert.ok(Math.abs(b.x - 0) < 1e-6);
    if (c.lado === 2) assert.ok(Math.abs(b.y - 0) < 1e-6);
    if (c.lado === 3) assert.ok(Math.abs((b.x + b.ancho) - geo.lado) < 1e-6);
    if (c.lado === 4) assert.ok(Math.abs((b.y + b.alto) - geo.lado) < 1e-6);

    // Más lejos del centro del tablero que el centro de su casilla
    const centroBanda = { x: b.x + b.ancho / 2, y: b.y + b.alto / 2 };
    const distBanda = Math.hypot(centroBanda.x - geo.centro.x, centroBanda.y - geo.centro.y);
    const distCasilla = Math.hypot(c.centro.x - geo.centro.x, c.centro.y - geo.centro.y);
    assert.ok(distBanda > distCasilla, `banda de casilla ${c.i} más cerca del centro que la casilla`);
  }
});

test('con 1 a 8 fichas en cualquier casilla, todas quedan dentro, fuera de la banda y sin solaparse', () => {
  const geo = geometriaTablero();

  for (const c of geo.casillas) {
    for (let total = 1; total <= 8; total++) {
      const fichas = [];
      for (let n = 0; n < total; n++) {
        fichas.push(posicionFicha(geo, c.i, n, total));
      }

      const radio = fichas[0].radio;
      assert.ok(radio > 0);

      // Todas con el mismo radio
      for (const f of fichas) {
        assert.equal(f.radio, radio, `fichas en casilla ${c.i} con distinto radio`);

        // Dentro del rectángulo de la casilla
        assert.ok(f.x - radio >= c.x - 1e-6, `casilla ${c.i} total ${total} x min`);
        assert.ok(f.x + radio <= c.x + c.ancho + 1e-6, `casilla ${c.i} total ${total} x max`);
        assert.ok(f.y - radio >= c.y - 1e-6, `casilla ${c.i} total ${total} y min`);
        assert.ok(f.y + radio <= c.y + c.alto + 1e-6, `casilla ${c.i} total ${total} y max`);

        // Fuera de la franja exterior (banda) en casillas con barrio
        if (c.banda) {
          if (c.lado === 1) assert.ok(f.x - radio >= c.banda.x + c.banda.ancho - 1e-6);
          if (c.lado === 2) assert.ok(f.y - radio >= c.banda.y + c.banda.alto - 1e-6);
          if (c.lado === 3) assert.ok(f.x + radio <= c.banda.x + 1e-6);
          if (c.lado === 4) assert.ok(f.y + radio <= c.banda.y + 1e-6);
        }
      }

      // Separación mutua >= 2 · radio
      for (let j = 0; j < total; j++) {
        for (let k = j + 1; k < total; k++) {
          const dist = Math.hypot(fichas[j].x - fichas[k].x, fichas[j].y - fichas[k].y);
          assert.ok(dist >= 2 * radio - 1e-6, `solapamiento entre ficha ${j} y ${k} en casilla ${c.i}`);
        }
      }
    }
  }
});

test('en el Calabozo, las presas quedan dentro de la celda y las de visita fuera', () => {
  const geo = geometriaTablero();
  const minCelda = 0.4 * geo.esquina;
  const maxCelda = geo.esquina;

  // Fichas presas (preso: true) dentro del cuadrado interior del 60 %
  for (let total = 1; total <= 8; total++) {
    const presas = [];
    for (let n = 0; n < total; n++) {
      presas.push(posicionFicha(geo, 10, n, total, { preso: true }));
    }
    const radio = presas[0].radio;

    for (const f of presas) {
      assert.ok(f.x - radio >= minCelda - 1e-6, 'presa dentro de límite x min celda');
      assert.ok(f.x + radio <= maxCelda + 1e-6, 'presa dentro de límite x max celda');
      assert.ok(f.y - radio >= minCelda - 1e-6, 'presa dentro de límite y min celda');
      assert.ok(f.y + radio <= maxCelda + 1e-6, 'presa dentro de límite y max celda');
    }

    for (let j = 0; j < total; j++) {
      for (let k = j + 1; k < total; k++) {
        const dist = Math.hypot(presas[j].x - presas[k].x, presas[j].y - presas[k].y);
        assert.ok(dist >= 2 * radio - 1e-6, 'presas no se solapan');
      }
    }
  }

  // Fichas de visita (preso: false) en la franja en L exterior, completamente fuera de la celda
  for (let total = 1; total <= 8; total++) {
    const visitas = [];
    for (let n = 0; n < total; n++) {
      visitas.push(posicionFicha(geo, 10, n, total, { preso: false }));
    }
    const radio = visitas[0].radio;

    for (const f of visitas) {
      // Dentro de la casilla 10
      assert.ok(f.x - radio >= 0 - 1e-6);
      assert.ok(f.x + radio <= geo.esquina + 1e-6);
      assert.ok(f.y - radio >= 0 - 1e-6);
      assert.ok(f.y + radio <= geo.esquina + 1e-6);

      // Fuera de la celda interior: o bien en el brazo superior o en el brazo izquierdo
      const fueraCelda = (f.x + radio <= minCelda + 1e-6) || (f.y + radio <= minCelda + 1e-6);
      assert.ok(fueraCelda, 'ficha de visita debe estar fuera de la celda interior');
    }

    for (let j = 0; j < total; j++) {
      for (let k = j + 1; k < total; k++) {
        const dist = Math.hypot(visitas[j].x - visitas[k].x, visitas[j].y - visitas[k].y);
        assert.ok(dist >= 2 * radio - 1e-6, 'visitas no se solapan');
      }
    }
  }
});

test('funciona también con otros valores de lado, esquina y banda', () => {
  const configuraciones = [
    { lado: 800, esquina: 100, banda: 0.2 },
    { lado: 1200, esquina: 160, banda: 0.25 },
    { lado: 600, esquina: 80, banda: 0.18 },
  ];

  for (const cfg of configuraciones) {
    const geo = geometriaTablero(cfg);
    assert.equal(geo.casillas.length, 40);

    const areaTotal = geo.casillas.reduce((acc, c) => acc + c.ancho * c.alto, 0);
    const areaEsperada = geo.lado ** 2 - (geo.lado - 2 * geo.esquina) ** 2;
    assert.ok(Math.abs(areaTotal - areaEsperada) < 1e-6);

    // Comprobar colocación de 8 fichas en esquina y en casilla de lado
    for (const numCasilla of [0, 5, 10, 15, 20, 25, 30, 35]) {
      const fichas = [];
      for (let n = 0; n < 8; n++) {
        fichas.push(posicionFicha(geo, numCasilla, n, 8));
      }
      const radio = fichas[0].radio;
      assert.ok(radio > 0);
      for (let j = 0; j < 8; j++) {
        for (let k = j + 1; k < 8; k++) {
          const dist = Math.hypot(fichas[j].x - fichas[k].x, fichas[j].y - fichas[k].y);
          assert.ok(dist >= 2 * radio - 1e-6);
        }
      }
    }
  }
});
