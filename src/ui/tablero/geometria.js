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

// Cuánto mide la imagen de una ficha (como fracción del ancho de una casilla normal) según cuántas comparten casilla:
// sola, se ve grande; con varias, cada una se achica para que quepan todas. El círculo que ocupa una ficha tiene el 42 %
// del lado de su imagen (la pieza no llena todo el cuadrado).
const TAMANO_IMAGEN = [0, 0.62, 0.5, 0.45, 0.45, 0.38, 0.38, 0.33, 0.33];
const CIRCULO = 0.42;
// Columnas y filas en que se reparten las fichas de una casilla normal.
const DISPOSICION = [null, [1, 1], [1, 2], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4]];

// Lado de la imagen de una ficha cuyo círculo tiene este radio (para dibujarla).
export const ladoDeFicha = radio => radio / CIRCULO;

/**
 * Calcula las coordenadas (x, y) y radio para dibujar la ficha «n» de un grupo de «total» fichas en una casilla.
 * Garantiza que hasta 8 fichas no se solapen, permanezcan dentro de la casilla y fuera de la franja exterior (banda).
 * Una ficha sola es grande; si comparten casilla, se achican. En el Calabozo, siempre pequeñas.
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
  const redondear = x => Math.round(x * 100) / 100;
  const radioNormal = redondear(CIRCULO * TAMANO_IMAGEN[total] * geo.paso);

  // Casilla 10: Calabozo (las fichas son pequeñas: las ranuras son de un tercio o un quinto de la esquina)
  if (c.i === 10) {
    const radio = Math.max(1, redondear(Math.min(geo.paso / 2, (geo.esquina * (1 - bandaFrac)) / 4, (0.6 * geo.esquina) / 3) * 0.44));
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
      return { x: minX + (col + 0.5) * ranura, y: minY + (fila + 0.5) * ranura, radio };
    }

    // Zona de visita: franja en L exterior (5 ranuras en brazo superior, 3 en brazo izquierdo)
    if (n < 5) return { x: (n + 0.5) * (geo.esquina / 5), y: 0.2 * geo.esquina, radio };
    const k = n - 5;
    return { x: 0.2 * geo.esquina, y: 0.4 * geo.esquina + (k + 0.5) * (0.6 * geo.esquina / 3), radio };
  }

  // Esquinas 0, 20 y 30: una cuadrícula de 3 × 3 con la ficha sola en el centro
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
    return { x: c.x + (col + 0.5) * ranura, y: c.y + (fila + 0.5) * ranura, radio: Math.min(radioNormal, redondear(ranura * 0.49)) };
  }

  // Casillas normales (lados 1 a 4): área útil interior, fuera de la banda, repartida en columnas y filas
  const longTangencial = geo.paso;
  const longRadial = geo.esquina * (1 - bandaFrac);
  const [columnas, filas] = DISPOSICION[total];
  const u = ((n % columnas) + 0.5) * (longTangencial / columnas);
  const v = (Math.floor(n / columnas) + 0.5) * (longRadial / filas);
  const radio = radioNormal;

  // Mapear coordenadas locales (u tangencial, v radial alejándose de la banda) al tablero
  if (c.lado === 1) return { x: geo.esquina * bandaFrac + v, y: c.y + u, radio };
  if (c.lado === 2) return { x: c.x + u, y: geo.esquina * bandaFrac + v, radio };
  if (c.lado === 3) return { x: geo.lado - geo.esquina * bandaFrac - v, y: c.y + u, radio };
  return { x: c.x + u, y: geo.lado - geo.esquina * bandaFrac - v, radio };
}
