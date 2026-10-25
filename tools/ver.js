// Abre una página del proyecto en Chrome (sin ventana), espera, hace capturas y cuenta los errores. Sirve para ver cómo
// quedan las pantallas sin abrirlas a mano.
//
//   node tools/ver.js public/tablero.html                          una captura a los 3 segundos
//   node tools/ver.js public/tablero.html --ancho 1920 --alto 1080 --idioma en
//   node tools/ver.js public/tablero.html --esperas 2,6,12         capturas a los 2, 6 y 12 segundos
//   node tools/ver.js public/tablero.html?velocidad=8 --selector .tablero --carpeta capturas
//   node tools/ver.js "public/tablero.html?depurar=1" --js "window.duenos.almacen.cambiar({ pausado: true })"
//
// Las capturas van a la carpeta indicada (por defecto, la temporal del sistema) y el programa imprime sus rutas.
import { crearServidor } from './serve.js';
import { espera, iniciarNavegador } from './navegador.js';

const args = process.argv.slice(2);
const pagina = args[0] && !args[0].startsWith('--') ? args[0] : 'public/index.html';
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : porDefecto;
};
const ancho = Number(valor('ancho', 1280));
const alto = Number(valor('alto', 800));
const idioma = valor('idioma', 'es');
const selector = valor('selector', 'body');
const esperas = String(valor('esperas', '3')).split(',').map(Number);
const carpeta = valor('carpeta', undefined);
const codigo = valor('js', null);

const servidor = crearServidor();
await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
const url = `http://127.0.0.1:${servidor.address().port}/${pagina}`;
const nav = await iniciarNavegador(carpeta ? { capturas: carpeta } : {});
try {
  const pestana = await nav.abrir(url, { ancho, alto, idioma });
  await pestana.esperarSelector(selector, 20000);
  if (codigo) await pestana.eval(c => (0, eval)(c), codigo);
  const nombre = pagina.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  let antes = 0;
  for (const segundos of esperas) {
    await espera((segundos - antes) * 1000);
    antes = segundos;
    console.log(await pestana.captura(`${nombre}-${ancho}x${alto}-${idioma}-${segundos}s.png`));
  }
  const unicos = lista => [...new Set(lista)].map(e => `  - ${e}`).join('\n');
  console.log(nav.errores.length ? `✖ ${nav.errores.length} error(es) de JavaScript:\n${unicos(nav.errores)}` : '✔ Sin errores de JavaScript');
  if (nav.red.length) console.log(`⚠ ${new Set(nav.red).size} petición(es) fallida(s) (imágenes que aún no existen, por ejemplo):\n${unicos(nav.red)}`);
  process.exitCode = nav.errores.length ? 1 : 0;
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exitCode = 1;
} finally {
  nav.cerrar();
  servidor.close();
}
