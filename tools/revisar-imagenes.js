// Revisa las imágenes de public/visuales/ contra las reglas del proyecto (docs/VISUALES.md):
//   - el contenido del archivo es del tipo que dice su extensión, y ese formato está permitido en su carpeta;
//   - no superan el tamaño ni el peso máximos de su carpeta (tools/limites-imagenes.json);
//   - su origen y licencia están anotados en public/visuales/CREDITOS.md, sin huecos «(completar)».
// Solo lee: no cambia ninguna imagen. Para reducirlas y convertirlas: python tools/optimizar-imagenes.py --aplicar
//   node tools/revisar-imagenes.js           informa y termina con error si algo no cumple
//   node tools/revisar-imagenes.js --avisar  informa pero termina bien (para ver el estado sin bloquear nada)
// Adaptado de Aldeanos vs Lobos.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITES = JSON.parse(readFileSync(join(RAIZ, 'tools', 'limites-imagenes.json'), 'utf8'));
const RASTER = ['png', 'jpg', 'webp', 'gif'];
const EXTENSIONES = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', gif: 'gif', svg: 'svg' };

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

// La regla de tamaño y formato de una ruta relativa a public/visuales/ (la primera cuyo prefijo coincide).
export const reglaPara = (ruta, reglas = LIMITES.reglas) => reglas.find(r => ruta.startsWith(r.prefijo));

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
// creditos: el texto de CREDITOS.md.
export function revisarImagenes(archivos, creditos, limites = LIMITES) {
  const patrones = patronesDeCreditos(creditos);
  const problemas = [];
  for (const { ruta, bytes } of archivos) {
    const motivos = [];
    const nombreExtension = ruta.split('.').pop().toLowerCase();
    const extension = EXTENSIONES[nombreExtension];
    const regla = reglaPara(ruta, limites.reglas);
    const real = tipoReal(bytes);
    const kb = Math.round(bytes.length / 1024);
    if (!real) motivos.push('no parece una imagen válida');
    else if (real !== extension) motivos.push(`es ${real.toUpperCase()} pero se llama .${nombreExtension}`);
    if (!regla.formatos.includes(extension)) motivos.push(`en esta carpeta va en ${regla.formatos.map(f => `.${f}`).join(' o ')}`);
    if (real === 'svg') {
      if (kb > limites.svgKb) motivos.push(`pesa ${kb} KB (máximo ${limites.svgKb} para un SVG)`);
    } else if (RASTER.includes(real)) {
      const d = dimensiones(bytes, real);
      if (!d) motivos.push('no se pueden leer sus dimensiones');
      else if (Math.max(d.ancho, d.alto) > regla.lado) motivos.push(`mide ${d.ancho}×${d.alto} px (máximo ${regla.lado})`);
      if (kb > regla.kb) motivos.push(`pesa ${kb} KB (máximo ${regla.kb})`);
    }
    if (!patrones.some(p => cubre(p, ruta))) motivos.push('no está anotada en CREDITOS.md');
    if (motivos.length) problemas.push({ ruta, motivos });
  }
  const generales = /\(completar/i.test(creditos)
    ? ['CREDITOS.md todavía tiene huecos «(completar…)»: anota la autoría o herramienta, la licencia y la fecha']
    : [];
  return { problemas, generales };
}

// Lee public/visuales/ y su CREDITOS.md de la carpeta del proyecto y los revisa.
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
  const creditos = existsSync(join(base, 'CREDITOS.md')) ? readFileSync(join(base, 'CREDITOS.md'), 'utf8') : '';
  return { archivos, ...revisarImagenes(archivos, creditos) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { archivos, problemas, generales } = revisarCarpeta();
  for (const { ruta, motivos } of problemas) console.log(`✖ ${ruta}: ${motivos.join('; ')}`);
  for (const general of generales) console.log(`✖ ${general}`);
  if (problemas.length || generales.length) {
    console.log(`\n${problemas.length} de ${archivos.length} imágenes no cumplen las reglas${generales.length ? ' y los créditos están incompletos' : ''}.`);
    console.log('Para reducirlas y convertirlas: python tools/optimizar-imagenes.py --aplicar (guarda antes los originales fuera del repositorio).');
    process.exitCode = process.argv.includes('--avisar') ? 0 : 1;
  } else {
    console.log(`✔ ${archivos.length} imágenes correctas y con sus créditos`);
  }
}
