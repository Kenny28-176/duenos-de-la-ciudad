// El sonido de verdad, en Chrome sin ventana: cada receta del catálogo se «graba» con un OfflineAudioContext (el audio real del
// navegador, sin altavoces) y se mide el resultado: que suene, que no se recorte, que no se alargue y que no tenga valores raros.
// Si el ordenador no tiene Chrome, la prueba se salta sola (en la integración continua de GitHub sí lo hay).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServidor } from '../tools/serve.js';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';

const motivo = buscarChrome() !== null ? false : 'no hay Chrome en este ordenador';

test('todos los sonidos del catálogo suenan de verdad: audibles, sin recortes y sin colas eternas', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const pestana = await nav.abrir(`http://127.0.0.1:${servidor.address().port}/index.html`);
    await pestana.esperarSelector('body');
    const medidas = await pestana.eval(async () => {
      const { SONIDOS, crearCadena } = await import('/src/ui/sonido.js');
      const tasa = 44100;
      const resultado = {};
      for (const [nombre, receta] of Object.entries(SONIDOS)) {
        const c = new OfflineAudioContext(1, tasa * 5, tasa);
        const { entrada } = crearCadena(c, 1);
        const duracion = receta(c, entrada, 0.05, { n: 3, cada: 0.17, torre: true, escala: 1 });
        const datos = (await c.startRendering()).getChannelData(0);
        let pico = 0;
        let suma = 0;
        let ultimo = 0;
        let raros = 0;
        for (let i = 0; i < datos.length; i++) {
          if (!Number.isFinite(datos[i])) raros++;
          const a = Math.abs(datos[i]);
          if (a > pico) pico = a;
          if (a > 0.002) ultimo = i;
          suma += datos[i] * datos[i];
        }
        resultado[nombre] = { duracion, pico, rms: Math.sqrt(suma / datos.length), cola: ultimo / tasa, raros };
      }
      return resultado;
    });
    const nombres = Object.keys(medidas);
    assert.ok(nombres.length >= 28, `se midieron ${nombres.length} sonidos`);
    for (const [nombre, m] of Object.entries(medidas)) {
      const texto = `${nombre}: ${JSON.stringify(m)}`;
      assert.equal(m.raros, 0, `valores imposibles en ${texto}`);
      assert.ok(m.pico > 0.02, `suena muy flojo: ${texto}`);
      assert.ok(m.pico <= 0.95, `se acerca a recortar: ${texto}`);
      assert.ok(m.rms > 0.002, `casi no suena: ${texto}`);
      assert.ok(m.cola <= 3.6, `cola demasiado larga: ${texto}`);
    }
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.close();
  }
});

test('el banco de sonidos tiene un botón por sonido, con su texto en los dos idiomas, y todos suenan', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const { SONIDOS } = await import('../src/ui/sonido.js');
    const total = Object.keys(SONIDOS).length;
    for (const [idioma, titulo, volumen] of [['es', 'Dueños de la Ciudad · Sonidos', 'Volumen'], ['en', 'City Owners · Sounds', 'Volume']]) {
      const pestana = await nav.abrir(`http://127.0.0.1:${servidor.address().port}/public/sonidos.html?depurar=1`, { idioma });
      await pestana.esperarSelector('li button', 30000, total);
      assert.equal(await pestana.eval(() => document.title), titulo);
      assert.match(await pestana.eval(() => document.body.textContent), new RegExp(volumen));
      assert.doesNotMatch(await pestana.eval(() => document.body.textContent), /sonidos\.[a-zA-Z]+/, 'ninguna clave sin traducir');
      // Se pulsan todos: cada uno programa su sonido.
      for (let k = 0; k < total; k++) {
        await pestana.eval(n => document.querySelectorAll('li button')[n].click(), k);
        await new Promise(listo => setTimeout(listo, 20));
      }
      const fin = Date.now() + 10000;
      while (Date.now() < fin && (await pestana.eval(() => window.duenos.sonido.estado().sonaron)) < total) await new Promise(listo => setTimeout(listo, 100));
      assert.equal(await pestana.eval(() => window.duenos.sonido.estado().sonaron), total, `${idioma}: suenan los ${total}`);
    }
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.close();
  }
});
