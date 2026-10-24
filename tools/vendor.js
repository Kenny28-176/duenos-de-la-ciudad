// Descarga y comprueba las dependencias locales de public/vendor/ (Preact+htm, qrcode y tipografías).
//   node tools/vendor.js              descarga y escribe public/vendor/vendor.json
//   node tools/vendor.js --comprobar  comprueba que los archivos coinciden con vendor.json
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR_DIR = join(RAIZ, 'public', 'vendor');
const VENDOR_JSON = join(VENDOR_DIR, 'vendor.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const TABLA_BIBLIOTECAS = [
  {
    id: 'preact',
    nombre: 'htm / Preact',
    version: 'htm 3.1.1 / Preact 10',
    licencia: 'Apache-2.0 (htm) y MIT (Preact)',
    archivos: [
      { destino: 'preact/standalone.module.js', origen: 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js' },
      { destino: 'preact/LICENSE-htm', origen: 'https://unpkg.com/htm@3.1.1/LICENSE' },
      { destino: 'preact/LICENSE-preact', origen: 'https://unpkg.com/preact@10/LICENSE' },
    ]
  },
  {
    id: 'qrcode',
    nombre: 'qrcode-generator',
    version: '1.4.4',
    licencia: 'MIT',
    archivos: [
      { destino: 'qrcode/qrcode.js', origen: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js' },
      { destino: 'qrcode/LICENSE', origen: 'https://raw.githubusercontent.com/kazuhikoarase/qrcode-generator/master/LICENSE' },
    ]
  }
];

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:wght@600..700&family=Inter:wght@400..700&display=swap';
const OFL_FRAUNCES_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt';
const OFL_INTER_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function descargar(url, esBinario = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Error descargando ${url}: HTTP ${res.status}`);
  return esBinario ? Buffer.from(await res.arrayBuffer()) : await res.text();
}

// Analiza el CSS de Google Fonts para extraer los bloques latin y latin-ext
function parsearBloquesFuentes(css) {
  const bloques = [];
  const regex = /\/\*\s*([\w-]+)\s*\*\/[\s\S]*?@font-face\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const subconjunto = match[1].trim();
    const contenido = match[2];
    if (subconjunto === 'latin' || subconjunto === 'latin-ext') {
      const familyMatch = contenido.match(/font-family:\s*['"]?([^'";]+)/);
      const weightMatch = contenido.match(/font-weight:\s*([^;]+)/);
      const styleMatch = contenido.match(/font-style:\s*([^;]+)/);
      const rangeMatch = contenido.match(/unicode-range:\s*([^;]+)/);
      const urlMatch = contenido.match(/url\((https:[^)]+\.woff2)\)/);
      if (familyMatch && urlMatch) {
        bloques.push({
          family: familyMatch[1].trim(),
          subconjunto,
          weight: weightMatch ? weightMatch[1].trim() : '400 700',
          style: styleMatch ? styleMatch[1].trim() : 'normal',
          unicodeRange: rangeMatch ? rangeMatch[1].trim() : '',
          url: urlMatch[1].trim()
        });
      }
    }
  }
  return bloques;
}

export async function sincronizar({ comprobar = false } = {}) {
  if (comprobar) {
    if (!existsSync(VENDOR_JSON)) {
      console.error(`✖ No existe ${VENDOR_JSON}`);
      return false;
    }
    const data = JSON.parse(readFileSync(VENDOR_JSON, 'utf8'));
    let ok = true;
    for (const [id, info] of Object.entries(data.librerias)) {
      for (const arch of info.archivos) {
        const ruta = join(VENDOR_DIR, arch.destino);
        if (!existsSync(ruta)) {
          console.error(`✖ Falta ${arch.destino}`);
          ok = false;
          continue;
        }
        const bytes = readFileSync(ruta);
        const actualSha = sha256(bytes);
        if (actualSha !== arch.sha256) {
          console.error(`✖ SHA-256 no coincide para ${arch.destino}: esperado ${arch.sha256}, actual ${actualSha}`);
          ok = false;
        }
      }
    }
    if (ok) {
      console.log('✔ Todos los archivos coinciden con vendor.json');
    }
    return ok;
  }

  console.log('Descargando dependencias de vendor...');
  const librerias = {};

  // 1. Bibliotecas estándar
  for (const lib of TABLA_BIBLIOTECAS) {
    const archivosInfo = [];
    for (const item of lib.archivos) {
      console.log(`  Descargando ${item.destino}...`);
      const contenido = await descargar(item.origen, true);
      const destinoCompleto = join(VENDOR_DIR, item.destino);
      mkdirSync(dirname(destinoCompleto), { recursive: true });
      writeFileSync(destinoCompleto, contenido);
      archivosInfo.push({
        destino: item.destino.replaceAll('\\', '/'),
        sha256: sha256(contenido),
        bytes: contenido.length,
        origen: item.origen
      });
    }
    librerias[lib.id] = {
      nombre: lib.nombre,
      version: lib.version,
      licencia: lib.licencia,
      archivos: archivosInfo
    };
  }

  // 2. Tipografías Google Fonts
  console.log('  Obteniendo CSS de Google Fonts...');
  const cssGoogle = await descargar(GOOGLE_FONTS_URL, false);
  const bloques = parsearBloquesFuentes(cssGoogle);

  const fuentesArchivos = [];
  const cssReglas = ['/* Tipografías locales: Fraunces e Inter (SIL OFL 1.1) */\n'];

  for (const b of bloques) {
    const nombreFamilia = b.family.toLowerCase();
    const nombreArchivo = `${nombreFamilia}-${b.subconjunto}.woff2`;
    const relDestino = `fuentes/${nombreArchivo}`;
    console.log(`  Descargando fuente ${relDestino}...`);
    const woff2Buffer = await descargar(b.url, true);
    const destinoCompleto = join(VENDOR_DIR, relDestino);
    mkdirSync(dirname(destinoCompleto), { recursive: true });
    writeFileSync(destinoCompleto, woff2Buffer);

    fuentesArchivos.push({
      destino: relDestino.replaceAll('\\', '/'),
      sha256: sha256(woff2Buffer),
      bytes: woff2Buffer.length,
      origen: b.url
    });

    cssReglas.push(`/* ${nombreFamilia} ${b.subconjunto} */
@font-face {
  font-family: '${b.family}';
  font-style: ${b.style};
  font-weight: ${b.weight};
  font-display: swap;
  src: url('${nombreArchivo}') format('woff2');
  unicode-range: ${b.unicodeRange};
}
`);
  }

  // Descargar licencias OFL
  console.log('  Descargando licencias OFL...');
  const oflFraunces = await descargar(OFL_FRAUNCES_URL, true);
  const oflInter = await descargar(OFL_INTER_URL, true);

  const destFrauncesOFL = 'fuentes/OFL-Fraunces.txt';
  const destInterOFL = 'fuentes/OFL-Inter.txt';

  writeFileSync(join(VENDOR_DIR, destFrauncesOFL), oflFraunces);
  writeFileSync(join(VENDOR_DIR, destInterOFL), oflInter);

  fuentesArchivos.push({
    destino: destFrauncesOFL,
    sha256: sha256(oflFraunces),
    bytes: oflFraunces.length,
    origen: OFL_FRAUNCES_URL
  });
  fuentesArchivos.push({
    destino: destInterOFL,
    sha256: sha256(oflInter),
    bytes: oflInter.length,
    origen: OFL_INTER_URL
  });

  // Guardar fuentes.css
  const relCss = 'fuentes/fuentes.css';
  const cssContenido = Buffer.from(cssReglas.join('\n'), 'utf8');
  writeFileSync(join(VENDOR_DIR, relCss), cssContenido);

  fuentesArchivos.unshift({
    destino: relCss,
    sha256: sha256(cssContenido),
    bytes: cssContenido.length,
    origen: GOOGLE_FONTS_URL
  });

  librerias['fuentes'] = {
    nombre: 'Fraunces e Inter',
    version: 'Fraunces 600..700 / Inter 400..700',
    licencia: 'SIL OFL 1.1',
    archivos: fuentesArchivos
  };

  const vendorData = {
    generado: '2026-10-24',
    librerias
  };

  writeFileSync(VENDOR_JSON, JSON.stringify(vendorData, null, 2) + '\n', 'utf8');
  console.log('✔ vendor.json generado con éxito');
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const comprobar = process.argv.includes('--comprobar');
  sincronizar({ comprobar }).then(ok => {
    if (!ok) process.exitCode = 1;
  }).catch(err => {
    console.error('✖ Error:', err);
    process.exitCode = 1;
  });
}
