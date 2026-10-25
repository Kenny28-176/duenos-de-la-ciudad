// Juega partidas enteras con celulares de verdad (Chrome sin ventana) y un jugador «al azar» que pulsa lo que ve en pantalla:
// tirar, comprar o subastar, pujar, construir, Bolsa, tratos, habilidades, deudas y bancarrota. Sirve para encontrar callejones
// sin salida (un estado en el que la mesa espera algo que el celular no deja hacer), errores de JavaScript y acciones que el
// tablero rechaza aunque el celular las ofrecía.
//
//   node tools/jugar-con-celulares.js                       3 celulares y 1 bot, meta de 3.000 $, semilla 1
//   node tools/jugar-con-celulares.js --celulares 4 --bots 2 --semilla 7 --meta 5000 --partidas 3
//   node tools/jugar-con-celulares.js --maximo 240          segundos máximos por partida (por defecto 180)
//
// Termina con código 1 si alguna partida se atasca, da un error de JavaScript o no acaba. Las decisiones salen de un azar con
// semilla (la misma semilla repite las mismas decisiones ante los mismos estados); jugarPartida() se puede importar desde pruebas.
import { fileURLToPath } from 'node:url';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearAnfitrion } from '../src/net/anfitrion.js';
import { crearTransporteHttp } from '../src/net/http.js';
import { crearOrquesta } from '../src/net/orquesta.js';
import { buscarChrome, espera, iniciarNavegador } from './navegador.js';
import { crearServidor } from './serve.js';

const motor = crearMotor(await cargarDatos());

// Lo que hace el jugador al azar cada vez que se le da la mano: UNA cosa (un clic) según lo que ve. Se ejecuta dentro de la página.
export function decidir(semilla) {
  // Un azar con semilla (mulberry32) que vive en la página mientras dura la partida.
  window.__azar ??= (() => {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const habilitados = selector => [...document.querySelectorAll(selector)].filter(b => !b.disabled);
  const pulsar = (selector, patron) => {
    const boton = habilitados(selector).find(b => patron.test(b.textContent));
    if (!boton) return null;
    boton.click();
    return boton.textContent.trim().replace(/\s+/g, ' ');
  };
  const azar = p => window.__azar() < p;
  const pestanaActiva = () => document.querySelector('.pestanas button.activa')?.textContent ?? '';
  // Cambia de pestaña si no está ya en ella (devuelve null si ya estaba, para seguir con lo que toque en esa pestaña).
  const irA = nombre => (new RegExp(nombre).test(pestanaActiva()) ? null : pulsar('.pestanas button', new RegExp(nombre)));
  const d = window.duenos.cliente().datos();
  if (!d.miId || d.estado?.fase !== 'juego' || !d.alDia || window.duenos.almacen.leer().pendiente) return null;
  const puede = d.vista.puede ?? {};
  const hay = clave => Array.isArray(puede[clave]) && puede[clave].length > 0;

  // La subasta tapa todo lo demás.
  if (document.querySelector('.subasta')) {
    if (puede.pujar !== undefined && azar(0.45)) return pulsar('.subasta .rapidas button', /\$/);
    if (puede.retirarse) return pulsar('.subasta button', /Retirarme|Drop out/);
    return null;
  }
  // Un trato que me proponen: se contesta (la mitad de las veces, que sí).
  if (document.querySelector('.pestanas .globo')) {
    const cambio = irA('Tratos|Deals');
    if (cambio) return cambio;
    return (azar(0.5) ? pulsar('.trato.recibido button', /Aceptar|Accept/) : null) ?? pulsar('.trato.recibido button', /Rechazar|Decline/);
  }
  // Una deuda: vender o hipotecar lo que se pueda y, si ya no hay nada, declararse en bancarrota.
  if (document.querySelector('.situacion.sit-deuda-mia')) {
    if (hay('venderEdificio') || hay('hipotecar')) {
      return irA('Calles|Streets') ?? pulsar('.calles button', /Vender edificio|Sell building/) ?? pulsar('.calles button', /Hipotecar|Mortgage/);
    }
    if (hay('venderAcciones')) return irA('Bolsa|Exchange') ?? pulsar('.bolsa button', /Vender|Sell/);
    return pulsar('.dock button', /Sí, declararme|Yes, declare/) ?? pulsar('.dock button', /Declararme|Declare bankruptcy/);
  }
  // Decidir la compra de la calle donde se cayó.
  if (puede.noComprar) {
    if (puede.comprar !== undefined && azar(0.8)) return pulsar('.compra button', /Comprar|Buy/);
    return pulsar('.compra button', /Subastar|No comprar|Auction|Don't buy/);
  }
  // La elección de una habilidad que ya está abierta.
  const eleccion = document.querySelector('.eleccion');
  if (eleccion) {
    const fichas = habilitados('.eleccion .chip');
    if (fichas.length) { fichas[Math.floor(window.__azar() * fichas.length)].click(); return 'elige para la habilidad'; }
    return pulsar('.eleccion button', /Pedir|Ask for it/) ?? pulsar('.eleccion button', /Cancelar|Cancel/);
  }
  if (puede.tirar) {
    if (puede.habilidad && azar(0.35)) return pulsar('.dock .habilidad button', /./);
    if (puede.pagarFianza && azar(0.3)) return pulsar('.dock button', /fianza|bail/i);
    if (puede.usarSalvoconducto) return pulsar('.dock button', /salvoconducto|safe-conduct/i);
    return pulsar('.dock button', /Tirar|Roll/);
  }
  if (puede.terminarTurno) {
    // Antes de terminar, a veces se gestiona algo.
    if (hay('construir') && azar(0.7)) return irA('Calles|Streets') ?? pulsar('.calles button', /Casa|Torre|House|Tower/);
    if (hay('comprarAcciones') && azar(0.5)) return irA('Bolsa|Exchange') ?? pulsar('.bolsa button', /Comprar|Buy/);
    if (hay('deshipotecar') && azar(0.3)) return irA('Calles|Streets') ?? pulsar('.calles button', /Levantar|Pay off/);
    if (hay('venderAcciones') && azar(0.1)) return irA('Bolsa|Exchange') ?? pulsar('.bolsa button', /Vender|Sell/);
    if (puede.habilidad && azar(0.3)) return pulsar('.dock .habilidad button', /./);
    return pulsar('.dock button', /Terminar|End turn/);
  }
  return null;
}

// Juega una partida y devuelve { problemas, resumen, estado }: «problemas» está vacío si todo fue bien.
export async function jugarPartida({ celulares: CELULARES = 3, bots: BOTS = 1, meta: META = 3000, semilla: SEMILLA = 1, maximo: MAXIMO_S = 180, numero: numeroDePartida = 0, silencioso = false } = {}) {
  if (buscarChrome() === null) throw new Error('No hay Chrome en este ordenador.');
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const nav = await iniciarNavegador({ puerto: 9300 + Math.floor(Math.random() * 600) });
  const codigo = 'BCDF';
  const transporte = crearTransporteHttp({ uid: 'tablero', base, esperaReintento: 30 });
  const anfitrion = crearAnfitrion({ transporte, motor, codigo, semilla: SEMILLA });
  const orquesta = crearOrquesta({ anfitrion, motor, velocidad: () => 100, pensarMs: 50 });
  await anfitrion.abrir();
  const eventos = [];
  let corre = true;
  const bucle = (async () => {
    while (corre) {
      const hecho = await orquesta.paso();
      if (!hecho) break;
      eventos.push(...hecho.eventos);
      await anfitrion.publicar();
    }
  })();

  const problemas = [];
  const resumen = { celulares: CELULARES, bots: BOTS, clics: 0, avisos: {}, atascos: 0 };
  try {
    const fichas = Object.keys(motor.ctx.fichas);
    const pestanas = [];
    for (let k = 0; k < CELULARES; k++) {
      const p = await nav.abrir(`${base}/public/jugador.html?sala=${codigo}&depurar=1`, { ancho: 390, alto: 844, idioma: k % 2 ? 'en' : 'es' });
      await p.esperarSelector('.campo-nombre', 30000);
      await p.eval(n => {
        const campo = document.querySelector('.campo-nombre');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, n);
        campo.dispatchEvent(new Event('input', { bubbles: true }));
      }, `Celular${k + 1}`);
      await espera(120);
      await p.eval(() => [...document.querySelectorAll('button')].find(b => /Entrar a la sala|Join the room/.test(b.textContent)).click());
      await p.esperarSelector('.fichas-elegir', 20000);
      pestanas.push(p);
    }
    for (let k = 0; k < BOTS; k++) anfitrion.accionPropia({ type: 'unirse', id: `b${k + 1}`, nombre: `Bot ${k + 1}`, ficha: fichas[fichas.length - 1 - k], bot: true });
    while (anfitrion.estado().ids.length < CELULARES + BOTS) await espera(30);
    anfitrion.accionPropia({ type: 'configurar', opciones: { meta: META } });
    anfitrion.accionPropia({ type: 'empezar' });
    await Promise.all(pestanas.map(p => p.esperarSelector('.partida', 30000)));

    // El juego: cada celular mira lo que tiene delante y hace una cosa, una y otra vez, hasta que acaba la partida.
    const inicio = Date.now();
    let ultimoAvance = Date.now();
    let ultimaVersion = anfitrion.version();
    const avisosVistos = new Map();
    while (anfitrion.estado().fase === 'juego') {
      if (Date.now() - inicio > MAXIMO_S * 1000) { problemas.push(`la partida no acabó en ${MAXIMO_S} s (turno ${anfitrion.estado().turnos}, ronda ${anfitrion.estado().ronda})`); break; }
      for (const [k, p] of pestanas.entries()) {
        const hecho = await p.eval(decidir, SEMILLA * 100 + k).catch(error => { problemas.push(`celular ${k + 1}: ${error.message}`); return null; });
        if (hecho) resumen.clics++;
        // Los avisos (errores que el tablero devuelve) dicen que el celular ofreció algo que el tablero no aceptó.
        const aviso = await p.eval(() => document.querySelector('.aviso')?.textContent ?? null);
        if (aviso && avisosVistos.get(k) !== aviso) {
          avisosVistos.set(k, aviso);
          resumen.avisos[aviso] = (resumen.avisos[aviso] ?? 0) + 1;
        }
      }
      if (anfitrion.version() !== ultimaVersion) { ultimaVersion = anfitrion.version(); ultimoAvance = Date.now(); }
      if (Date.now() - ultimoAvance > 20000) {
        resumen.atascos++;
        const s = anfitrion.estado();
        const pantallas = await Promise.all(pestanas.map(async (p, k) => `celular ${k + 1}: ${(await p.eval(() => `${document.querySelector('.situacion')?.innerText ?? ''} | ${document.querySelector('.dock')?.innerText ?? document.querySelector('.subasta')?.innerText ?? ''}`)).replace(/\s+/g, ' ')} | puede=${await p.eval(() => JSON.stringify(window.duenos.cliente().datos().vista.puede))}`));
        problemas.push(`ATASCADA hace 20 s. Turno de ${s.turno?.id} (fase ${s.turno?.fase}), subasta=${JSON.stringify(s.subasta)}, deudas=${JSON.stringify(s.deudas)}, tratos=${Object.keys(s.tratos)}.\n    ${pantallas.join('\n    ')}`);
        break;
      }
      await espera(40);
    }
    const s = anfitrion.estado();
    if (s.fase === 'fin') {
      await espera(500);
      const enFinal = await Promise.all(pestanas.map(p => p.eval(() => document.querySelector('.final') !== null)));
      if (!enFinal.every(Boolean)) problemas.push(`al acabar la partida, no todos los celulares enseñan el final: ${enFinal}`);
    }
    const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
    const decir = silencioso ? () => {} : console.log;
    decir(`Partida ${numeroDePartida + 1}: ${s.fase === 'fin' ? `acabó (${s.motivoFin}, gana ${s.jugadores[s.ganador]?.nombre})` : 'sin acabar'} · ${s.turnos} turnos, ronda ${s.ronda} · ${duracion} s · ${resumen.clics} clics`);
    const tipos = {};
    for (const e of eventos) tipos[e.type] = (tipos[e.type] ?? 0) + 1;
    const interesantes = ['compra', 'subastaGanada', 'subastaDesierta', 'construir', 'venderEdificio', 'hipotecar', 'deshipotecar', 'accionesCompradas', 'accionesVendidas', 'tratoAceptado', 'tratoRechazado', 'habilidad', 'bancarrota', 'deuda'];
    decir(`  eventos: ${interesantes.map(t => `${t} ${tipos[t] ?? 0}`).join(' · ')}`);
    if (Object.keys(resumen.avisos).length) decir(`  avisos del tablero a los celulares: ${JSON.stringify(resumen.avisos)}`);
    if (nav.errores.length) problemas.push(`errores de JavaScript: ${JSON.stringify([...new Set(nav.errores)].slice(0, 5))}`);
  } finally {
    corre = false;
    nav.cerrar();
    await anfitrion.cerrar().catch(() => {});
    transporte.cerrar();
    await bucle.catch(() => {});
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
  return { problemas, resumen, estado: anfitrion.estado() };
}

// --- Desde la terminal ----------------------------------------------------------------------------------------------------

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argumentos = Object.fromEntries(process.argv.slice(2).reduce((lista, a, i, todos) => (a.startsWith('--') ? [...lista, [a.slice(2), todos[i + 1]]] : lista), []));
  const numero = (nombre, porDefecto) => Number(argumentos[nombre] ?? porDefecto);
  const partidas = numero('partidas', 1);
  let fallos = 0;
  for (let k = 0; k < partidas; k++) {
    const { problemas } = await jugarPartida({
      celulares: numero('celulares', 3), bots: numero('bots', 1), meta: numero('meta', 3000), semilla: numero('semilla', 1) + k, maximo: numero('maximo', 180), numero: k,
    });
    for (const p of problemas) console.log(`  ✖ ${p}`);
    if (problemas.length) fallos++;
  }
  console.log(fallos ? `
${fallos} de ${partidas} partidas con problemas.` : `
Las ${partidas} partidas acabaron sin problemas.`);
  process.exitCode = fallos ? 1 : 0;
}
