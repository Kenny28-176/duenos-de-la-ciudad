// Revisa las imágenes de public/visuales/ contra las reglas de docs/VISUALES.md:
//   - están en la lista de la sección 8, con un nombre en minúsculas, sin tildes ni espacios;
//   - el contenido del archivo es del tipo que dice su extensión, y ese formato es el de su carpeta;
//   - miden exactamente lo que dice su ficha técnica y no pesan más de lo permitido (tools/limites-imagenes.json);
//   - los iconos SVG siguen la construcción común (sección 7.13): etiqueta de apertura, grosor, colores y elementos;
//   - su origen y licencia están anotados en public/visuales/CREDITOS.md, sin huecos «(completar)».
// También cuenta cuántas imágenes de la lista faltan. Solo lee: no cambia ninguna imagen.
// Para recortarlas, reducirlas y convertirlas: python tools/optimizar-imagenes.py --aplicar
//   node tools/revisar-imagenes.js           informa y termina con error si algo no cumple
//   node tools/revisar-imagenes.js --faltan  además, lista las imágenes que faltan
//   node tools/revisar-imagenes.js --avisar  informa pero termina bien (para ver el estado sin bloquear nada)
// Adaptado de Aldeanos vs Lobos.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITES = JSON.parse(readFileSync(join(RAIZ, 'tools', 'limites-imagenes.json'), 'utf8'));
const RASTER = ['png', 'jpg', 'webp', 'gif'];
const EXTENSIONES = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', gif: 'gif', svg: 'svg' };
const NOMBRE_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:webp|svg|png|jpg)$/;
const CARPETAS = ['marca', 'tablero', 'fichas', 'tarjetas', 'botones', 'interfaz'];

// Tipo real de una imagen según sus primeros bytes (null si no es una imagen conocida).
export function tipoReal(b) {
  if (b.length >= 8 && b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 10 && ['GIF87a', 'GIF89a'].includes(b.toString('latin1', 0, 6))) return 'gif';
  const inicio = b.toString('utf8', 0, 512).trimStart();
  if (inicio.startsWith('<svg') || inicio.startsWith('<?xml')) return 'svg';
  return null;
}

// Ancho y alto en píxeles de una imagen raster (null si no se puede leer).
export function dimensiones(b, tipo = tipoReal(b)) {
  try {
    if (tipo === 'png') return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
    if (tipo === 'gif') return { ancho: b.readUInt16LE(6), alto: b.readUInt16LE(8) };
    if (tipo === 'webp') {
      const trozo = b.toString('latin1', 12, 16);
      if (trozo === 'VP8X') return { ancho: 1 + b.readUIntLE(24, 3), alto: 1 + b.readUIntLE(27, 3) };
      if (trozo === 'VP8L') {
        const bits = b.readUInt32LE(21);
        return { ancho: (bits & 0x3fff) + 1, alto: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (trozo === 'VP8 ') return { ancho: b.readUInt16LE(26) & 0x3fff, alto: b.readUInt16LE(28) & 0x3fff };
      return null;
    }
    if (tipo === 'jpg') {
      let pos = 2;
      while (pos + 9 < b.length) {
        if (b[pos] !== 0xff) { pos++; continue; }
        const marca = b[pos + 1];
        if (marca === 0xff) { pos++; continue; }
        if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) return { alto: b.readUInt16BE(pos + 5), ancho: b.readUInt16BE(pos + 7) };
        pos += marca === 0xd8 || (marca >= 0xd0 && marca <= 0xd7) || marca === 0x01 ? 2 : 2 + b.readUInt16BE(pos + 2);
      }
    }
  } catch { /* archivo cortado o dañado */ }
  return null;
}

// La regla de medida y formato de una ruta relativa a public/visuales/ (la primera cuyo prefijo coincide), o
// undefined si está en una carpeta que la guía no prevé.
export const reglaPara = (ruta, reglas = LIMITES.reglas) => reglas.find(r => ruta.startsWith(r.prefijo));

// Las rutas de todas las imágenes que pide docs/VISUALES.md (las que aparecen entre comillas invertidas).
export function imagenesEsperadas(textoVisuales) {
  const patron = new RegExp(`\`((?:${CARPETAS.join('|')})/[a-z0-9/-]+\\.(?:webp|svg|png|jpg))\``, 'g');
  return [...new Set([...textoVisuales.matchAll(patron)].map(m => m[1]))].sort();
}

// Comprueba que un icono SVG sigue la construcción común de docs/VISUALES.md (sección 7.13).
export function revisarSvg(texto, reglas = LIMITES.svg) {
  const motivos = [];
  const apertura = texto.match(/<svg\b[^>]*>/);
  if (!apertura) return ['no tiene etiqueta <svg>'];
  const atributos = Object.fromEntries([...apertura[0].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
  if (atributos.xmlns !== 'http://www.w3.org/2000/svg') motivos.push('a la etiqueta <svg> le falta xmlns="http://www.w3.org/2000/svg"');
  for (const [nombre, valor] of Object.entries(reglas.apertura)) {
    if (atributos[nombre] !== valor) motivos.push(`la etiqueta <svg> debe llevar ${nombre}="${valor}"`);
  }
  const prohibidos = [...new Set([...texto.matchAll(/<(text|image|style|script|foreignObject|linearGradient|radialGradient|filter|use|pattern|mask)\b/gi)].map(m => m[1]))];
  if (prohibidos.length) motivos.push(`usa elementos no permitidos: ${prohibidos.map(p => `<${p}>`).join(', ')}`);
  if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(texto)) motivos.push('escribe colores fijos: solo se permiten currentColor y none');
  const colores = [...texto.matchAll(/\b(fill|stroke)\s*=\s*"([^"]*)"/g)].map(m => m[2]).filter(v => !['none', 'currentColor'].includes(v));
  if (colores.length) motivos.push(`usa colores no permitidos (${[...new Set(colores)].join(', ')}): solo currentColor y none`);
  const grosores = [...texto.matchAll(/stroke-width\s*=\s*"([^"]*)"/g)].map(m => m[1]).filter(v => v !== reglas.apertura['stroke-width']);
  if (grosores.length) motivos.push(`usa trazos de grosor distinto de ${reglas.apertura['stroke-width']} (${[...new Set(grosores)].join(', ')})`);
  if (/\sstyle\s*=/.test(texto)) motivos.push('usa estilos en línea (style=…)');
  if (/\s(?:xlink:)?href\s*=/.test(texto)) motivos.push('enlaza a otros archivos (href)');
  if (/\son\w+\s*=/i.test(texto)) motivos.push('lleva código (atributos on…)');
  return motivos;
}

// Patrones de archivo anotados en CREDITOS.md: la primera columna de cada fila de la tabla, con los nombres entre
// comillas invertidas (por ejemplo `fichas/piezas/*.webp`).
export function patronesDeCreditos(texto) {
  const patrones = [];
  for (const linea of texto.split('\n')) {
    if (!linea.trimStart().startsWith('|')) continue;
    for (const m of (linea.split('|')[1] ?? '').matchAll(/`([^`]+)`/g)) patrones.push(m[1].trim());
  }
  return patrones;
}

// ¿Cubre este patrón (con a lo sumo un «*», que no cruza carpetas) la ruta de una imagen?
export function cubre(patron, ruta) {
  const trozos = patron.split('*');
  if (trozos.length === 1) return patron === ruta;
  if (trozos.length > 2) return false;
  const [antes, despues] = trozos;
  if (ruta.length < antes.length + despues.length || !ruta.startsWith(antes) || !ruta.endsWith(despues)) return false;
  return !ruta.slice(antes.length, ruta.length - despues.length).includes('/');
}

// archivos: [{ ruta: 'fichas/piezas/rata.webp' (relativa a public/visuales), bytes: Buffer }];
// creditos: el texto de CREDITOS.md; esperados: las rutas de docs/VISUALES.md (o null para no comprobarlo).
export function revisarImagenes(archivos, creditos, { limites = LIMITES, esperados = null } = {}) {
  const patrones = patronesDeCreditos(creditos);
  const problemas = [];
  for (const { ruta, bytes } of archivos) {
    const motivos = [];
    const nombre = ruta.split('/').pop();
    const nombreExtension = nombre.split('.').pop().toLowerCase();
    const extension = EXTENSIONES[nombreExtension];
    if (!NOMBRE_VALIDO.test(nombre)) motivos.push('el nombre debe ir en minúsculas, sin tildes, espacios ni guiones bajos (palabras-con-guiones)');
    if (esperados && !esperados.includes(ruta)) motivos.push('no está en la lista de docs/VISUALES.md (sección 8)');
    const regla = reglaPara(ruta, limites.reglas);
    const real = tipoReal(bytes);
    const kb = Math.round(bytes.length / 1024);
    if (!real) motivos.push('no parece una imagen válida');
    else if (real !== extension) motivos.push(`es ${real.toUpperCase()} pero se llama .${nombreExtension}`);
    if (!regla) {
      motivos.push('está en una carpeta que no está en docs/VISUALES.md');
    } else {
      if (!regla.formatos.includes(extension)) motivos.push(`en esta carpeta va en ${regla.formatos.map(f => `.${f}`).join(' o ')}`);
      if (real === 'svg') {
        if (kb > limites.svg.kb) motivos.push(`pesa ${kb} KB (máximo ${limites.svg.kb} para un SVG)`);
        motivos.push(...revisarSvg(bytes.toString('utf8'), limites.svg));
      } else if (RASTER.includes(real) && regla.ancho) {
        const d = dimensiones(bytes, real);
        if (!d) motivos.push('no se pueden leer sus dimensiones');
        else if (d.ancho !== regla.ancho || d.alto !== regla.alto) motivos.push(`mide ${d.ancho}×${d.alto} px (debe medir ${regla.ancho}×${regla.alto})`);
        if (kb > regla.kb) motivos.push(`pesa ${kb} KB (máximo ${regla.kb})`);
      }
    }
    if (!patrones.some(p => cubre(p, ruta))) motivos.push('no está anotada en CREDITOS.md');
    if (motivos.length) problemas.push({ ruta, motivos });
  }
  const generales = /\(completar/i.test(creditos)
    ? ['CREDITOS.md todavía tiene huecos «(completar…)»: anota la autoría o herramienta, la licencia y la fecha']
    : [];
  return { problemas, generales };
}

// Lee public/visuales/, su CREDITOS.md y la lista de docs/VISUALES.md de la carpeta del proyecto, y los revisa.
export function revisarCarpeta(raiz = RAIZ) {
  const base = join(raiz, 'public', 'visuales');
  const rutas = [];
  const andar = carpeta => {
    for (const nombre of readdirSync(carpeta)) {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) andar(ruta);
      else if (EXTENSIONES[nombre.split('.').pop().toLowerCase()]) rutas.push(ruta);
    }
  };
  if (existsSync(base)) andar(base);
  const archivos = rutas.sort().map(r => ({ ruta: relative(base, r).split(sep).join('/'), bytes: readFileSync(r) }));
  const leer = ruta => (existsSync(ruta) ? readFileSync(ruta, 'utf8') : '');
  const esperados = imagenesEsperadas(leer(join(raiz, 'docs', 'VISUALES.md')));
  const hechas = new Set(archivos.map(a => a.ruta));
  const faltan = esperados.filter(r => !hechas.has(r));
  return { archivos, esperados, faltan, ...revisarImagenes(archivos, leer(join(base, 'CREDITOS.md')), { esperados }) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { archivos, esperados, faltan, problemas, generales } = revisarCarpeta();
  for (const { ruta, motivos } of problemas) console.log(`✖ ${ruta}: ${motivos.join('; ')}`);
  for (const general of generales) console.log(`✖ ${general}`);
  const conProblemas = new Set(problemas.map(p => p.ruta));
  const hechas = esperados.filter(r => !faltan.includes(r) && !conProblemas.has(r)).length;
  if (problemas.length || generales.length) {
    console.log(`\n${problemas.length} de ${archivos.length} imágenes no cumplen las reglas${generales.length ? ' y los créditos están incompletos' : ''}.`);
    console.log('Para recortarlas, reducirlas y convertirlas: python tools/optimizar-imagenes.py --aplicar (guarda antes los originales fuera del repositorio).');
    process.exitCode = process.argv.includes('--avisar') ? 0 : 1;
  } else {
    console.log(`✔ ${archivos.length} imágenes correctas y con sus créditos`);
  }
  const porCarpeta = {};
  for (const ruta of faltan) {
    const carpeta = ruta.split('/').slice(0, -1).join('/');
    porCarpeta[carpeta] = (porCarpeta[carpeta] ?? 0) + 1;
  }
  console.log(`\nHechas y correctas: ${hechas} de ${esperados.length} imágenes de docs/VISUALES.md.`);
  if (faltan.length) {
    console.log(`Faltan ${faltan.length}: ${Object.entries(porCarpeta).map(([c, n]) => `${c} (${n})`).join(', ')}.`);
    if (process.argv.includes('--faltan')) for (const ruta of faltan) console.log(`  - ${ruta}`);
    else console.log('Para verlas una por una: node tools/revisar-imagenes.js --faltan');
  }
}
