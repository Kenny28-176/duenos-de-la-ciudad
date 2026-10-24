// El tablero en SVG, a partir de los datos (src/data/tablero.json) y de la geometría (geometria.js). Pinta lo que no
// cambia durante la partida:
//   - el fondo de noche y la ciudad del centro;
//   - las casillas de papel, con la franja del color de su barrio en el borde exterior (docs/VISUALES.md, sección 9);
//   - el icono, el nombre y el precio de cada casilla, y las cuatro esquinas.
// Al final deja vacías las capas de lo que sí cambia (dueños, edificios, marcadores y fichas) y la plaza del centro,
// donde se muestran los dados y las cartas. Devuelve el SVG como texto, para poder probarlo sin navegador.
//
// Hay dos formas de orientar los textos:
//   'derechos'     (por defecto) para una laptop o una TV: nada queda boca abajo; las filas van derechas y las columnas,
//                  giradas un cuarto de vuelta;
//   'hacia-fuera'  para una tablet tumbada en el centro de la mesa: cada casilla se lee desde su lado.

const escapar = texto => String(texto).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = x => Math.round(x * 100) / 100;

// Giro del contenido de cada lado del tablero y si la franja queda arriba en ese contenido ya girado.
const ORIENTACION = {
  derechos: { 1: [-90, true], 2: [0, true], 3: [90, true], 4: [0, false] },
  'hacia-fuera': { 1: [90, false], 2: [180, false], 3: [270, false], 4: [0, false] },
};

// Parte un nombre en líneas de como mucho «ancho» caracteres, sin cortar palabras.
export function partirNombre(nombre, ancho = 14, maxLineas = 3) {
  const lineas = [];
  for (const palabra of String(nombre).split(/\s+/).filter(Boolean)) {
    const ultima = lineas.at(-1);
    if (ultima !== undefined && `${ultima} ${palabra}`.length <= ancho) lineas[lineas.length - 1] = `${ultima} ${palabra}`;
    else lineas.push(palabra);
  }
  if (lineas.length <= maxLineas) return lineas;
  return [...lineas.slice(0, maxLineas - 1), lineas.slice(maxLineas - 1).join(' ')];
}

// Clase de la franja de color según el tipo de casilla (las calles usan el color de su barrio).
function claseDeFranja(c) {
  return c.tipo === 'calle' ? 'franja' : `franja franja-${c.tipo}`;
}

// Medidas del contenido de una casilla, en unidades del SVG (el tablero mide 1000). Los textos se centran en su línea
// (dominant-baseline="central"), así la misma cuenta vale con la franja arriba o abajo.
const MEDIDA = { aire: 8, separacion: 16, icono: 30, interlineado: 12, letras: 12 };

// El contenido de una casilla normal, dibujado en su propio marco: «ancho» a lo largo del borde, «fondo» hacia dentro,
// con el origen en el centro de la casilla. Desde el borde exterior: franja, precio, icono y nombre.
function contenido(ctx, c, { ancho, fondo, franjaArriba, franja, base, texto }) {
  const alto = fondo * franja;
  const barrio = c.tipo === 'calle' ? ctx.barrios[c.barrio] : null;
  const imagen = barrio?.imagen ?? c.imagen;
  const color = barrio ? ` style="fill: ${barrio.color}"` : '';
  const arriba = -fondo / 2;
  const abajo = fondo / 2;
  // La y del punto que está a «d» del borde exterior.
  const y = d => (franjaArriba ? arriba + d : abajo - d);
  const partes = [
    `<rect class="papel" x="${num(-ancho / 2)}" y="${num(arriba)}" width="${num(ancho)}" height="${num(fondo)}"/>`,
    `<rect class="${claseDeFranja(c)}"${color} x="${num(-ancho / 2)}" y="${num(franjaArriba ? arriba : abajo - alto)}" width="${num(ancho)}" height="${num(alto)}"/>`,
  ];
  const precio = texto.precio(c);
  if (precio) partes.push(`<text class="precio" x="0" y="${num(y(alto + MEDIDA.aire))}" dominant-baseline="central">${escapar(precio)}</text>`);
  const lado = Math.min(ancho * 0.4, MEDIDA.icono);
  const centroIcono = alto + MEDIDA.separacion + lado / 2;
  if (imagen) {
    partes.push(`<image class="icono" href="${escapar(base + imagen)}" x="${num(-lado / 2)}" y="${num(y(centroIcono) - lado / 2)}" width="${num(lado)}" height="${num(lado)}"/>`);
  }
  // Las líneas del nombre, de la más cercana al icono hacia dentro del tablero.
  const lineas = partirNombre(texto.nombre(c), MEDIDA.letras);
  const tspans = lineas.map((linea, k) => {
    const j = franjaArriba ? k : lineas.length - 1 - k;
    const d = alto + MEDIDA.separacion + lado + MEDIDA.aire + j * MEDIDA.interlineado;
    return `<tspan x="0" y="${num(y(d))}">${escapar(linea)}</tspan>`;
  }).join('');
  partes.push(`<text class="nombre" dominant-baseline="central">${tspans}</text>`);
  return partes.join('');
}

function esquina(c, g, { base, texto }) {
  const { x, y, ancho, alto } = g;
  const partes = [
    `<rect class="papel" x="${num(x)}" y="${num(y)}" width="${num(ancho)}" height="${num(alto)}"/>`,
    c.imagen ? `<image class="ilustracion" href="${escapar(base + c.imagen)}" x="${num(x)}" y="${num(y)}" width="${num(ancho)}" height="${num(alto)}" preserveAspectRatio="xMidYMid slice"/>` : '',
    `<rect class="marco-esquina marco-${c.tipo}" x="${num(x + 2)}" y="${num(y + 2)}" width="${num(ancho - 4)}" height="${num(alto - 4)}"/>`,
    `<rect class="rotulo" x="${num(x + 8)}" y="${num(y + alto - 30)}" width="${num(ancho - 16)}" height="22" rx="3"/>`,
    `<text class="nombre-esquina" x="${num(x + ancho / 2)}" y="${num(y + alto - 19)}" dominant-baseline="central">${escapar(texto.nombre(c))}</text>`,
  ];
  return partes.join('');
}

// geo: lo que devuelve geometriaTablero(). texto: { nombre(casilla), precio(casilla) } con los textos ya traducidos.
// La franja de color ocupa la misma parte del fondo de cada casilla que en la geometría (geo.banda).
export function dibujarTablero(ctx, geo, { orientacion = 'derechos', base = 'visuales/', texto = {} } = {}) {
  const textos = {
    nombre: c => c.nombre,
    precio: c => (c.precio ? `${c.precio} $` : ''),
    ...texto,
  };
  const giros = ORIENTACION[orientacion];
  if (!giros) throw new Error(`Orientación desconocida: ${orientacion}`);
  const { lado, esquina: fondo } = geo;
  const interior = lado - 2 * fondo;
  const casillas = geo.casillas.map(g => {
    const c = ctx.casillas[g.i];
    const clase = `casilla casilla-${c.tipo}`;
    if (g.esquina) return `<g class="${clase}" data-casilla="${g.i}">${esquina(c, g, { base, texto: textos })}</g>`;
    const [giro, franjaArriba] = giros[g.lado];
    const cuerpo = contenido(ctx, c, { ancho: geo.paso, fondo, franjaArriba, franja: geo.banda, base, texto: textos });
    return `<g class="${clase}" data-casilla="${g.i}" transform="translate(${num(g.centro.x)} ${num(g.centro.y)}) rotate(${giro})">${cuerpo}</g>`;
  });
  return [
    `<svg class="tablero" viewBox="0 0 ${lado} ${lado}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect class="noche" width="${lado}" height="${lado}"/>`,
    `<image class="ciudad" href="${escapar(`${base}tablero/centro/ciudad.webp`)}" x="${fondo}" y="${fondo}" width="${interior}" height="${interior}"/>`,
    `<g class="casillas">${casillas.join('')}</g>`,
    '<g class="capa capa-duenos"></g>',
    '<g class="capa capa-edificios"></g>',
    '<g class="capa capa-marcadores"></g>',
    '<g class="capa capa-fichas"></g>',
    `<g class="plaza" transform="translate(${lado / 2} ${lado / 2})"></g>`,
    '</svg>',
  ].join('');
}
