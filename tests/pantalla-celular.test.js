// El celular de punta a punta, en un Chrome de verdad: entra a una sala, escribe su nombre, elige ficha y juega con sus botones
// (tirar, comprar, habilidad, construir, Bolsa, subasta, trato). El tablero es el de siempre (un anfitrión en Node con su
// orquesta y los bots) y el celular habla con él por el relé HTTP. Cada resultado se comprueba en el estado del tablero. Se
// salta si no hay Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearAnfitrion } from '../src/net/anfitrion.js';
import { crearTransporteHttp } from '../src/net/http.js';
import { crearOrquesta } from '../src/net/orquesta.js';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';
import { crearServidor } from '../tools/serve.js';
import { esperarHasta } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());
const motivo = buscarChrome() === null ? 'no hay Chrome en este ordenador' : false;
const inicio = Date.now();
const marca = fase => { if (process.env.DEPURAR) console.log(`  [${((Date.now() - inicio) / 1000).toFixed(1)} s] ${fase}`); };
const espera = ms => new Promise(listo => setTimeout(listo, ms));

// Pulsa el primer botón (de ese ámbito) cuyo texto contenga lo dado y que no esté desactivado; false si no hay.
const pulsar = (p, texto, ambito = 'button') => p.eval((t, a) => {
  const b = [...document.querySelectorAll(a)].find(x => x.textContent.includes(t) && !x.disabled);
  if (!b) return false;
  b.click();
  return true;
}, texto, ambito);

async function pulsarCuandoEste(p, texto, ambito = 'button', ms = 15000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await pulsar(p, texto, ambito)) return;
    await espera(40);
  }
  throw new Error(`No se pudo pulsar «${texto}» en «${ambito}». En pantalla: ${(await p.eval(() => document.body.innerText)).slice(0, 400)}`);
}

const escribir = (p, selector, valor) => p.eval((s, v) => {
  const campo = document.querySelector(s);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, v);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}, selector, valor);

const texto = (p, selector) => p.eval(s => document.querySelector(s)?.innerText ?? null, selector);
const cifras = cadena => Number(String(cadena).replace(/\D/g, ''));

// La pantalla se repinta unos milisegundos después de recibir el estado: se espera a que muestre lo esperado.
async function esperarTexto(p, selector, patron, ms = 8000) {
  const fin = Date.now() + ms;
  let ultimo = null;
  while (Date.now() < fin) {
    ultimo = await texto(p, selector);
    if (ultimo !== null && patron.test(ultimo)) return ultimo;
    await espera(40);
  }
  throw new Error(`«${selector}» no llegó a mostrar ${patron}. Mostraba: ${JSON.stringify(ultimo)}`);
}

// En ninguna pantalla debe verse una clave sin traducir («jugador.dock.tirar») ni un hueco sin rellenar («{cantidad}»).
async function sinClavesSueltas(p, donde) {
  const visible = await p.eval(() => document.body.textContent);
  assert.doesNotMatch(visible, /\b(jugador|sala|fmt|estado|habilidad|subasta)\.[a-z_.-]+/, `una clave sin traducir en «${donde}»: ${visible.slice(0, 200)}`);
  assert.doesNotMatch(visible, /\{[a-z_]+(:[a-z]+)?\}/, `un hueco sin rellenar en «${donde}»`);
}

test('un celular entra a la sala, elige ficha y juega con sus botones hasta construir, comprar acciones, pujar y cerrar un trato', { skip: motivo, timeout: 150000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const nav = await iniciarNavegador({ puerto: 9300 + Math.floor(Math.random() * 400) });
  const codigo = 'BCDF';

  // El tablero: un anfitrión con su orquesta, que atiende lo que llegue y lo publica.
  const transporte = crearTransporteHttp({ uid: 'tablero', base, esperaReintento: 30 });
  const anfitrion = crearAnfitrion({ transporte, motor, codigo, semilla: 21 });
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
  // Cambia el estado a mano (para montar una situación) y lo publica.
  const fabricar = cambio => { cambio(anfitrion.estado()); return anfitrion.publicar(); };
  const hubo = (tipo, cuando = () => true) => eventos.some(e => e.type === tipo && cuando(e));
  // El celular está al día cuando ve la última publicación del tablero.
  const alDia = p => esperarHasta(() => true, 1).then(async () => {
    const fin = Date.now() + 8000;
    while (Date.now() < fin) {
      if (await p.eval(n => { const d = window.duenos.cliente().datos(); return d.alDia && d.n >= n; }, anfitrion.publicaciones())) return;
      await espera(25);
    }
    throw new Error('el celular no llegó a la última publicación');
  });

  try {
    // --- Entrar: el código, el nombre y los errores ---------------------------------------------------------------------
    const ana = await nav.abrir(`${base}/public/jugador.html?sala=${codigo}&depurar=1`, { ancho: 390, alto: 844, idioma: 'es' });
    await ana.esperarSelector('.campo-nombre', 30000);
    marca('el celular pide el nombre');
    await sinClavesSueltas(ana, 'nombre');
    assert.equal(await pulsar(ana, 'Entrar a la sala'), false, 'sin nombre no se puede entrar');
    await escribir(ana, '.campo-nombre', 'Ana');
    await pulsarCuandoEste(ana, 'Entrar a la sala');
    await ana.esperarSelector('.fichas-elegir', 15000);
    assert.equal(anfitrion.estado().jugadores.j1.nombre, 'Ana');
    marca('Ana está en el vestíbulo');

    // Otro celular, en inglés, intenta entrar con el mismo nombre: el tablero le dice que no, traducido.
    const beto = await nav.abrir(`${base}/public/jugador.html?sala=${codigo}&depurar=1`, { ancho: 390, alto: 844, idioma: 'en' });
    await beto.esperarSelector('.campo-nombre', 30000);
    assert.match(await texto(beto, '.entrada'), /what's your name\?/i);
    await sinClavesSueltas(beto, 'name');
    await escribir(beto, '.campo-nombre', 'ana');
    await pulsarCuandoEste(beto, 'Join the room');
    await beto.esperarSelector('.aviso', 10000);
    assert.match(await texto(beto, '.aviso'), /name/i);
    assert.equal(await beto.eval(() => document.querySelector('.fichas-elegir') === null), true, 'sigue en la pantalla del nombre');
    await sinClavesSueltas(beto, 'error en inglés');
    marca('el nombre repetido se rechaza en inglés');

    // Ana elige el Toro (y no puede quedarse con una ficha que ya tiene otro).
    await ana.eval(() => [...document.querySelectorAll('.ficha-elegir')].find(b => b.textContent.includes('Toro')).click());
    await esperarHasta(() => anfitrion.estado().jugadores.j1.ficha === 'toro', 8000, 'el tablero no apuntó la ficha');
    anfitrion.accionPropia({ type: 'unirse', id: 'b1', nombre: 'Bot 1', ficha: 'rata', bot: true });
    anfitrion.accionPropia({ type: 'unirse', id: 'b2', nombre: 'Bot 2', ficha: 'oso', bot: true });
    await esperarHasta(() => anfitrion.estado().ids.length === 3, 8000, 'los bots no entraron');
    await ana.esperarSelector('.lista-jugadores li', 10000, 3);
    assert.equal(await ana.eval(() => [...document.querySelectorAll('.ficha-elegir')].find(b => b.textContent.includes('Rata')).disabled), true, 'la ficha de otro está ocupada');
    await sinClavesSueltas(ana, 'vestíbulo');
    anfitrion.accionPropia({ type: 'configurar', opciones: { meta: 4000 } });
    anfitrion.accionPropia({ type: 'empezar' });
    await ana.esperarSelector('.partida', 15000);
    marca('empezó la partida');
    await sinClavesSueltas(ana, 'partida');

    // Los bots juegan sus turnos hasta que le toca a Ana: entonces el tablero se queda esperando lo que ella haga.
    const esperarSuTurno = () => esperarTexto(ana, '.dock', /Tirar/, 20000);
    await esperarSuTurno();
    await alDia(ana);
    await esperarTexto(ana, '.situacion', /tu turno/i);
    assert.equal(cifras(await texto(ana, '.dinero-grande')), anfitrion.estado().jugadores.j1.dinero, 'el dinero de la cabecera es el del tablero');

    // --- La habilidad: Rally, con su barrio ------------------------------------------------------------------------------
    await pulsarCuandoEste(ana, 'Rally', '.dock button');
    await ana.esperarSelector('.eleccion .chip', 8000);
    await sinClavesSueltas(ana, 'elegir barrio');
    await ana.eval(() => document.querySelector('.eleccion .chip').click());
    await esperarHasta(() => anfitrion.estado().efectos.some(e => e.tipo === 'rally'), 8000, 'el tablero no aplicó el Rally');
    marca('Rally usado');

    // --- Tirar, comprar y terminar el turno -----------------------------------------------------------------------------
    await pulsarCuandoEste(ana, 'Tirar los dados', '.dock button');
    await esperarHasta(() => hubo('dados', e => e.id === 'j1'), 8000, 'no se tiraron los dados');
    // Sea lo que sea lo que le tocó, Ana hace lo que le dejan: comprar si puede y terminar el turno.
    const alTerminar = async () => {
      const fin = Date.now() + 20000;
      while (Date.now() < fin) {
        if (await pulsar(ana, 'Terminar turno', '.dock button')) return true;
        if (await pulsar(ana, 'Comprar', '.dock .compra button')) { await espera(80); continue; }
        if (await pulsar(ana, 'Tirar', '.dock button')) { await espera(80); continue; } // dobles: vuelve a tirar
        await pulsar(ana, 'Retirarme', '.subasta button');
        await espera(60);
      }
      return false;
    };
    assert.equal(await alTerminar(), true, 'Ana no pudo terminar su turno');
    await esperarHasta(() => hubo('turno', e => e.id !== 'j1'), 8000, 'el turno no pasó a otro');
    marca('Ana tiró, decidió y terminó su turno');
    await sinClavesSueltas(ana, 'después de jugar');

    // --- Construir: Ana tiene un barrio entero (se monta cuando vuelve a ser su turno) ----------------------------------
    await esperarSuTurno();
    await fabricar(s => {
      for (const i of motor.ctx.barrios.talleres.calles) { s.props[i].dueno = 'j1'; s.props[i].nivel = 0; s.props[i].hipotecada = false; }
      s.jugadores.j1.dinero = 3000;
      s.turno.id = 'j1'; s.turno.fase = 'gestion'; s.turno.dados = [3, 4]; s.turno.compra = null; s.turno.bolsaAbierta = true;
    });
    await alDia(ana);
    await ana.eval(() => [...document.querySelectorAll('.pestanas button')].find(b => b.textContent.includes('Calles')).click());
    await ana.esperarSelector('.calles .tarjeta', 8000);
    await sinClavesSueltas(ana, 'calles');
    const costeCasa = motor.costeConstruir(anfitrion.estado(), 'j1', motor.ctx.barrios.talleres.calles[0]);
    await esperarTexto(ana, '.calles .tarjeta .acciones', /Casa/);
    assert.equal(cifras(await texto(ana, '.calles .tarjeta .acciones .detalle-boton')), costeCasa, 'el botón enseña lo que cuesta construir');
    const antes = anfitrion.estado().jugadores.j1.dinero;
    await pulsarCuandoEste(ana, 'Casa', '.calles button');
    await esperarHasta(() => hubo('construir', e => e.id === 'j1'), 8000, 'no se construyó');
    assert.equal(anfitrion.estado().jugadores.j1.dinero, antes - costeCasa);
    marca('Ana construyó');

    // --- La Bolsa abierta: comprar un paquete de acciones --------------------------------------------------------------
    await ana.eval(() => [...document.querySelectorAll('.pestanas button')].find(b => b.textContent.includes('Bolsa')).click());
    await ana.esperarSelector('.bolsa .fila-bolsa', 8000);
    await sinClavesSueltas(ana, 'bolsa');
    await alDia(ana);
    await pulsarCuandoEste(ana, 'Comprar 5', '.bolsa button');
    await esperarHasta(() => hubo('accionesCompradas', e => e.id === 'j1'), 8000, 'no se compraron acciones');
    marca('Ana compró acciones');

    // --- Un trato que le propone un bot: Ana lo acepta -------------------------------------------------------------------
    const dineroAntes = anfitrion.estado().jugadores.j1.dinero;
    anfitrion.accionPropia({ type: 'proponerTrato', id: 'b1', para: 'j1', ofrece: { dinero: 120 }, pide: {} });
    await ana.esperarSelector('.pestanas .globo', 8000);
    await ana.eval(() => [...document.querySelectorAll('.pestanas button')].find(b => b.textContent.includes('Tratos')).click());
    await ana.esperarSelector('.trato.recibido', 8000);
    await sinClavesSueltas(ana, 'tratos');
    await pulsarCuandoEste(ana, 'Aceptar', '.trato button');
    await esperarHasta(() => hubo('tratoAceptado'), 8000, 'no se aceptó el trato');
    assert.equal(anfitrion.estado().jugadores.j1.dinero, dineroAntes + 120);
    marca('Ana aceptó el trato');

    // --- Una subasta en la que solo participa Ana: puja la mínima y, como nadie más puede, la gana al cerrarse -------------
    // (se espera a que el tablero haya vuelto a atender, para que la jugada de un bot no se cruce con lo que se monta aquí)
    await esperarHasta(() => hubo('tratoAceptado') && anfitrion.estado().turno.id === 'j1', 8000);
    await espera(100);
    const calleLibre = Object.keys(anfitrion.estado().props).map(Number).find(i => !anfitrion.estado().props[i].dueno && motor.ctx.casillas[i].tipo === 'calle');
    const efectivo = anfitrion.estado().jugadores.j1.dinero;
    await fabricar(s => { s.subasta = { casilla: calleLibre, origen: 'compra', puja: 0, lider: null, activos: ['j1'] }; });
    await ana.esperarSelector('.subasta .rapidas button', 8000);
    await sinClavesSueltas(ana, 'subasta');
    const minima = motor.ctx.eco.subasta.minimo;
    assert.equal(cifras(await texto(ana, '.subasta .rapidas button')), minima, 'el primer botón es la puja mínima');
    await pulsarCuandoEste(ana, '$', '.subasta .rapidas button');
    await esperarHasta(() => hubo('puja', e => e.id === 'j1' && e.cantidad === minima), 8000, 'no se registró la puja');
    await esperarHasta(() => hubo('subastaGanada', e => e.id === 'j1' && e.casilla === calleLibre), 8000, 'Ana no ganó la subasta');
    assert.equal(anfitrion.estado().jugadores.j1.dinero, efectivo - minima);
    marca('Ana pujó y ganó');

    // Nunca hubo un error de JavaScript en el celular.
    assert.deepEqual(nav.errores, []);
  } finally {
    corre = false;
    nav.cerrar();
    await anfitrion.cerrar().catch(() => {});
    transporte.cerrar();
    await bucle.catch(() => {});
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
});
