// Geometría del tablero: cálculo matemático de la posición de las 40 casillas y de las fichas.

/**
 * Calcula la posición, tamaño, rotación y franja de color de las 40 casillas en un tablero cuadrado.
 * El origen (0, 0) está arriba a la izquierda y la coordenada «y» crece hacia abajo.
 * El recorrido comienza en la Salida (esquina inferior izquierda) y avanza en sentido horario.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.lado=1000] - Longitud del lado del tablero en unidades SVG.
 * @param {number} [opciones.esquina=130] - Tamaño del cuadrado de las esquinas.
 * @param {number} [opciones.banda=0.22] - Fracción del fondo de casilla destinada a la franja de barrio exterior.
 * @returns {object} Geometría del tablero con { lado, esquina, paso, banda, centro, casillas }.
 */
export function geometriaTablero({ lado = 1000, esquina = 130, banda = 0.22 } = {}) {
  const paso = (lado - 2 * esquina) / 9;
  const centro = { x: lado / 2, y: lado / 2 };
  const casillas = [];

  // Casilla 0: Salida (esquina inferior izquierda)
  casillas.push({
    i: 0,
    lado: 0,
    esquina: true,
    x: 0,
    y: lado - esquina,
    ancho: esquina,
    alto: esquina,
    centro: { x: esquina / 2, y: lado - esquina / 2 },
    rotacion: 0,
    banda: null,
  });

  // Lado 1: casillas 1 a 9 (columna izquierda, de abajo hacia arriba)
  for (let k = 1; k <= 9; k++) {
    const y = lado - esquina - k * paso;
    casillas.push({
      i: k,
      lado: 1,
      esquina: false,
      x: 0,
      y,
      ancho: esquina,
      alto: paso,
      centro: { x: esquina / 2, y: y + paso / 2 },
      rotacion: 90,
      banda: { x: 0, y, ancho: esquina * banda, alto: paso },
    });
  }

  // Casilla 10: Calabozo (esquina superior izquierda)
  casillas.push({
    i: 10,
    lado: 0,
    esquina: true,
    x: 0,
    y: 0,
    ancho: esquina,
    alto: esquina,
    centro: { x: esquina / 2, y: esquina / 2 },
    rotacion: 0,
    banda: null,
  });

  // Lado 2: casillas 11 a 19 (fila superior, de izquierda a derecha)
  for (let k = 0; k < 9; k++) {
    const x = esquina + k * paso;
    const i = 11 + k;
    casillas.push({
      i,
      lado: 2,
      esquina: false,
      x,
      y: 0,
      ancho: paso,
      alto: esquina,
      centro: { x: x + paso / 2, y: esquina / 2 },
      rotacion: 180,
      banda: { x, y: 0, ancho: paso, alto: esquina * banda },
    });
  }

  // Casilla 20: Bolsa de Valores (esquina superior derecha)
  casillas.push({
    i: 20,
    lado: 0,
    esquina: true,
    x: lado - esquina,
    y: 0,
    ancho: esquina,
    alto: esquina,
    centro: { x: lado - esquina / 2, y: esquina / 2 },
    rotacion: 0,
    banda: null,
  });

  // Lado 3: casillas 21 a 29 (columna derecha, de arriba hacia abajo)
  for (let k = 0; k < 9; k++) {
    const y = esquina + k * paso;
    const i = 21 + k;
    casillas.push({
      i,
      lado: 3,
      esquina: false,
      x: lado - esquina,
      y,
      ancho: esquina,
      alto: paso,
      centro: { x: lado - esquina / 2, y: y + paso / 2 },
      rotacion: 270,
      banda: { x: lado - esquina * banda, y, ancho: esquina * banda, alto: paso },
    });
  }

  // Casilla 30: ¡Auditoría! (esquina inferior derecha)
  casillas.push({
    i: 30,
    lado: 0,
    esquina: true,
    x: lado - esquina,
    y: lado - esquina,
    ancho: esquina,
    alto: esquina,
    centro: { x: lado - esquina / 2, y: lado - esquina / 2 },
    rotacion: 0,
    banda: null,
  });

  // Lado 4: casillas 31 a 39 (fila inferior, de derecha a izquierda)
  for (let k = 0; k < 9; k++) {
    const x = lado - esquina - (k + 1) * paso;
    const i = 31 + k;
    casillas.push({
      i,
      lado: 4,
      esquina: false,
      x,
      y: lado - esquina,
      ancho: paso,
      alto: esquina,
      centro: { x: x + paso / 2, y: lado - esquina / 2 },
      rotacion: 0,
      banda: { x, y: lado - esquina * banda, ancho: paso, alto: esquina * banda },
    });
  }

  return { lado, esquina, paso, banda, centro, casillas };
}

/**
 * Calcula las coordenadas (x, y) y radio para dibujar la ficha «n» de un grupo de «total» fichas en una casilla.
 * Garantiza que hasta 8 fichas no se solapen, permanezcan dentro de la casilla y fuera de la franja exterior (banda).
 *
 * @param {object} geo - Geometría devuelta por geometriaTablero.
 * @param {object|number} casilla - Casilla o su índice (0 a 39).
 * @param {number} n - Índice de la ficha (0 <= n < total).
 * @param {number} total - Total de fichas presentes en esa casilla (1 a 8).
 * @param {object} [opciones]
 * @param {boolean} [opciones.preso=false] - En el Calabozo (casilla 10), true ubica en la celda y false en la zona de visita.
 * @returns {{ x: number, y: number, radio: number }}
 */
export function posicionFicha(geo, casilla, n, total, { preso = false } = {}) {
  const c = typeof casilla === 'number' ? geo.casillas[casilla] : casilla;
  const bandaFrac = geo.banda ?? 0.22;

  // Radio proporcional a las dimensiones mínimas para encajar hasta 8 fichas con separación segura
  const ranuraTangencial = geo.paso / 2;
  const ranuraRadial = (geo.esquina * (1 - bandaFrac)) / 4;
  const ranuraCalabozo = (0.6 * geo.esquina) / 3;
  const ranuraMin = Math.min(ranuraTangencial, ranuraRadial, ranuraCalabozo);
  const radio = Math.max(1, Math.round(ranuraMin * 0.44 * 100) / 100);

  // Casilla 10: Calabozo
  if (c.i === 10) {
    if (preso) {
      // Cuadrado interior (60 % de la esquina más cercano al centro del tablero)
      const minX = 0.4 * geo.esquina;
      const minY = 0.4 * geo.esquina;
      const ranura = (0.6 * geo.esquina) / 3;
      const ranuras = [
        [0, 0], [1, 0], [2, 0],
        [0, 1], [2, 1],
        [0, 2], [1, 2], [2, 2],
        [1, 1],
      ];
      const idx = total === 1 ? 8 : n;
      const [col, fila] = ranuras[idx];
      return {
        x: minX + (col + 0.5) * ranura,
        y: minY + (fila + 0.5) * ranura,
        radio,
      };
    }

    // Zona de visita: franja en L exterior (5 ranuras en brazo superior, 3 en brazo izquierdo)
    if (n < 5) {
      return {
        x: (n + 0.5) * (geo.esquina / 5),
        y: 0.2 * geo.esquina,
        radio,
      };
    }
    const k = n - 5;
    return {
      x: 0.2 * geo.esquina,
      y: 0.4 * geo.esquina + (k + 0.5) * (0.6 * geo.esquina / 3),
      radio,
    };
  }

  // Esquinas 0, 20 y 30
  if (c.esquina) {
    const ranura = geo.esquina / 3;
    const ranuras = [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
      [1, 1],
    ];
    const idx = total === 1 ? 8 : n;
    const [col, fila] = ranuras[idx];
    return {
      x: c.x + (col + 0.5) * ranura,
      y: c.y + (fila + 0.5) * ranura,
      radio,
    };
  }

  // Casillas estándar (lados 1 a 4): área útil interior, fuera de la banda
  const longTangencial = geo.paso;
  const longRadial = geo.esquina * (1 - bandaFrac);

  let u, v;
  if (total === 1) {
    u = 0.5 * longTangencial;
    v = 0.5 * longRadial;
  } else {
    const col = n % 2;
    const fila = Math.floor(n / 2);
    u = (col + 0.5) * (longTangencial / 2);
    v = (fila + 0.5) * (longRadial / 4);
  }

  // Mapear coordenadas locales (u tangencial, v radial alejándose de la banda) al tablero
  if (c.lado === 1) {
    return {
      x: geo.esquina * bandaFrac + v,
      y: c.y + u,
      radio,
    };
  }

  if (c.lado === 2) {
    return {
      x: c.x + u,
      y: geo.esquina * bandaFrac + v,
      radio,
    };
  }

  if (c.lado === 3) {
    return {
      x: geo.lado - geo.esquina * bandaFrac - v,
      y: c.y + u,
      radio,
    };
  }

  // Lado 4
  return {
    x: c.x + u,
    y: geo.lado - geo.esquina * bandaFrac - v,
    radio,
  };
}
