// Comprueba, contra la base de datos de Firebase de verdad, que las reglas de seguridad (database.rules.json, publicadas en la consola)
// permiten lo que hace el juego y prohíben lo que no le toca a cada uno, y que el transporte (src/net/firebase.js) se entiende con
// Firebase: la sesión anónima, escribir por partes, escuchar con los eventos del servidor y las listas que Firebase devuelve como tales.
//
//   node tools/comprobar-reglas.js            con el proyecto de src/net/firebase-config.js
//   node tools/comprobar-reglas.js --falso    con la imitación de Firebase (tools/firebase-falso.js), para probar la herramienta
//
// Crea tres cuentas anónimas (un tablero y dos celulares) y una sala de prueba con un código al azar, y la borra al acabar. Gasta muy
// poco de la cuota gratuita (unos KB). Acaba con 1 si algo no sale como debe.
import { pathToFileURL } from 'node:url';
import { crearTransporteFirebase } from '../src/net/firebase.js';
import { codigoDeSala } from '../src/net/protocolo.js';
import { FuenteDeEventos } from './fuente-de-eventos.js';

const espera = ms => new Promise(listo => setTimeout(listo, ms));
const almacenEnMemoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

// Espera a que se cumpla algo (lo mira a menudo) o a que pase el tiempo; devuelve si se cumplió.
async function hasta(condicion, ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (condicion()) return true;
    await espera(25);
  }
  return condicion();
}

// Devuelve { comprobaciones: [{ que, esperado, resultado, ok }], eventos: [...] }. «avisar» recibe cada comprobación al hacerla.
export async function comprobarReglas({ config, crearFuente = url => new FuenteDeEventos(url), avisar = () => {}, msEscucha = 8000 }) {
  const comprobaciones = [];
  const apuntar = (que, esperado, resultado) => {
    const c = { que, esperado, resultado, ok: esperado === resultado };
    comprobaciones.push(c);
    avisar(c);
  };
  // Hace algo y apunta si Firebase lo dejó («permitido») o no («rechazado»).
  const intentar = async (que, esperado, accion) => {
    let resultado;
    try {
      await accion();
      resultado = 'permitido';
    } catch (error) {
      resultado = /permission denied/i.test(error.message) ? 'rechazado' : `error: ${error.message}`;
    }
    apuntar(que, esperado, resultado);
  };
  const conectar = clave => crearTransporteFirebase({ config, clave, almacen: almacenEnMemoria(), crearFuente, esperaReintento: 300, agrupar: 30 });

  const tablero = await conectar('tablero');
  const ana = await conectar('ana');
  const luis = await conectar('luis');
  apuntar('las tres sesiones anónimas tienen uid distintos', true, new Set([tablero.uid, ana.uid, luis.uid]).size === 3 && Boolean(tablero.uid));

  let codigo = null;
  for (let k = 0; k < 20 && !codigo; k++) {
    const candidato = codigoDeSala();
    if (!(await tablero.get(`salas/${candidato}/meta`))) codigo = candidato;
  }
  const sala = `salas/${codigo}`;
  const eventos = []; // los eventos tal como los manda Firebase, para mirarlos si algo no cuadra
  const escuchas = [];
  try {
    await intentar('el tablero abre la sala (escribe su meta)', 'permitido', () => tablero.set(`${sala}/meta`, { anfitrion: tablero.uid, creada: Date.now(), version: 1 }));

    // Una escucha «en crudo» del estado (es público: no hace falta sesión), para ver cómo manda Firebase cada cambio.
    const cruda = crearFuente(`${String(config.databaseURL).replace(/\/+$/, '')}/${sala}/estado.json`);
    for (const tipo of ['put', 'patch', 'keep-alive', 'cancel', 'auth_revoked']) cruda.addEventListener(tipo, e => eventos.push({ tipo, datos: e.data }));
    escuchas.push(() => cruda.close());
    const valores = [];
    escuchas.push(ana.escuchar(`${sala}/estado`, v => valores.push(v)));
    const hijos = [];
    escuchas.push(tablero.escucharHijos(`${sala}/acciones`, (clave, v) => hijos.push(clave)));
    apuntar('el celular recibe el estado (vacío) al escuchar', true, await hasta(() => valores.length >= 1, msEscucha));

    await intentar('el tablero publica el estado y las vistas por partes (un update de varias rutas)', 'permitido', () => tablero.update({
      [`${sala}/estado/fase`]: 'juego', [`${sala}/estado/publicacion`]: 1, [`${sala}/estado/jugadores/j1/dinero`]: 1500,
      [`${sala}/vistas/${ana.uid}`]: { id: 'j1', n: 1, movimientos: { 1: { cantidad: 5, motivo: 'sueldo' }, 2: { cantidad: 7, motivo: 'alquiler' } } },
      [`${sala}/vistas/${luis.uid}`]: { id: 'j2', n: 1 },
    }));
    apuntar('el celular recibe la publicación entera, de una vez', true,
      await hasta(() => valores.at(-1)?.publicacion === 1 && valores.at(-1)?.jugadores?.j1?.dinero === 1500, msEscucha));
    await intentar('un celular lee su vista', 'permitido', () => ana.get(`${sala}/vistas/${ana.uid}`));
    const movimientos = await ana.get(`${sala}/vistas/${ana.uid}/movimientos`).catch(() => null);
    apuntar('los movimientos 1 y 2 vuelven como objeto (Firebase los devuelve como lista)', true, JSON.stringify(movimientos) === JSON.stringify({ 1: { cantidad: 5, motivo: 'sueldo' }, 2: { cantidad: 7, motivo: 'alquiler' } }));

    let claveDeAna = null;
    await intentar('un celular pide una acción con su uid', 'permitido', async () => {
      claveDeAna = await ana.empujar(`${sala}/acciones`, { uid: ana.uid, accion: { type: 'unirse', nombre: 'Ana', ficha: 'toro' } });
    });
    await intentar('un celular propone un trato (con listas y acciones)', 'permitido', () => ana.empujar(`${sala}/acciones`, {
      uid: ana.uid, accion: { type: 'proponerTrato', para: 'j2', ofrece: { dinero: 100, propiedades: [3, 5] }, pide: { acciones: { 'altos-del-mirador': 2 } } },
    }));
    apuntar('el tablero recibe las acciones', true, await hasta(() => hijos.length >= 2, msEscucha));
    await intentar('un celular repite su acción con la misma clave (un reintento)', 'permitido', () => ana.set(`${sala}/acciones/${claveDeAna}`, { uid: ana.uid, accion: { type: 'unirse', nombre: 'Ana', ficha: 'toro' } }));
    await intentar('otro celular pisa la acción de Ana', 'rechazado', () => luis.set(`${sala}/acciones/${claveDeAna}`, { uid: luis.uid, accion: { type: 'tirar' } }));
    await intentar('el tablero borra una acción atendida', 'permitido', () => tablero.remove(`${sala}/acciones/${claveDeAna}`));

    await intentar('un celular escribe el estado', 'rechazado', () => ana.set(`${sala}/estado/jugadores/j1/dinero`, 1e6));
    await intentar('un celular escribe su propia vista', 'rechazado', () => ana.set(`${sala}/vistas/${ana.uid}/n`, 99));
    await intentar('un celular lee la vista de otro', 'rechazado', () => ana.get(`${sala}/vistas/${luis.uid}`));
    await intentar('un celular lee las acciones', 'rechazado', () => ana.get(`${sala}/acciones`));
    await intentar('un celular lee la sala entera', 'rechazado', () => ana.get(sala));
    await intentar('un celular se hace pasar por otro', 'rechazado', () => ana.empujar(`${sala}/acciones`, { uid: luis.uid, accion: { type: 'tirar' } }));
    await intentar('un celular manda una acción con un campo que no existe', 'rechazado', () => ana.empujar(`${sala}/acciones`, { uid: ana.uid, accion: { type: 'tirar', dinero: 5000 } }));
    await intentar('un celular manda un nombre de más de 24 letras', 'rechazado', () => ana.empujar(`${sala}/acciones`, { uid: ana.uid, accion: { type: 'unirse', nombre: 'x'.repeat(25) } }));
    await intentar('un celular se queda con la sala (cambia la meta)', 'rechazado', () => ana.set(`${sala}/meta`, { anfitrion: ana.uid, creada: 1, version: 1 }));
    await intentar('un celular cierra la sala', 'rechazado', () => ana.remove(sala));
    await intentar('alguien escribe fuera de las salas', 'rechazado', () => ana.set('basura', 1));
    await intentar('alguien abre una sala con un código que no es de cuatro consonantes', 'rechazado', () => ana.set('salas/ABCD/meta', { anfitrion: ana.uid, creada: 1, version: 1 }));

    await intentar('el tablero cierra la sala (la borra entera)', 'permitido', () => tablero.remove(sala));
    apuntar('el celular ve que la sala ya no existe', true, await hasta(() => valores.at(-1) === null, msEscucha));
  } finally {
    escuchas.forEach(dejar => dejar());
    await tablero.remove(sala).catch(() => {});
    for (const t of [tablero, ana, luis]) t.cerrar();
  }
  return { comprobaciones, eventos, codigo };
}

// node tools/comprobar-reglas.js [--falso]
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let config;
  let falso = null;
  if (process.argv.includes('--falso')) {
    const { crearFirebaseFalso } = await import('./firebase-falso.js');
    falso = crearFirebaseFalso();
    await falso.arrancar();
    config = falso.config();
    console.log(`Con la imitación de Firebase (${config.databaseURL}).`);
  } else {
    ({ configuracionFirebase: config } = await import('../src/net/firebase-config.js'));
    if (!config) {
      console.error('Falta la configuración de Firebase en src/net/firebase-config.js (docs/FIREBASE.md, paso 4).');
      process.exit(1);
    }
    console.log(`Con el proyecto de Firebase: ${config.databaseURL}`);
  }
  try {
    const { comprobaciones, eventos } = await comprobarReglas({
      config, avisar: c => console.log(`${c.ok ? '✔' : '✖'} ${c.que}${c.ok ? '' : ` (se esperaba «${c.esperado}» y fue «${c.resultado}»)`}`),
    });
    const mal = comprobaciones.filter(c => !c.ok);
    console.log(`\n${comprobaciones.length - mal.length} de ${comprobaciones.length} como deben.`);
    if (process.argv.includes('--eventos') || mal.length) {
      console.log('\nLos eventos que mandó Firebase al escuchar el estado:');
      for (const e of eventos) console.log(`  ${e.tipo}: ${e.datos}`);
    }
    process.exitCode = mal.length ? 1 : 0;
  } finally {
    await falso?.cerrar();
  }
}
