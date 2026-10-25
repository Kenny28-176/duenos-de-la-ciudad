// Una base de datos en memoria que se comporta como la parte de Firebase Realtime Database que usa el juego. Sirve para
// probar el tablero y los celulares sin red (y, con latencia, para ver cómo se portan con retrasos). Cada cliente se
// conecta con su identidad (uid) y recibe un «transporte», que es lo único que ven el anfitrión y el cliente:
//
//   transporte.uid                          quién es (en Firebase, el inicio de sesión anónimo)
//   await transporte.set(ruta, valor)       escribe un subárbol (null lo borra)
//   await transporte.update({ruta: valor})  escribe varias rutas a la vez, de golpe
//   await transporte.remove(ruta)           borra
//   await transporte.get(ruta)              lee el valor de una ruta (o null)
//   await transporte.empujar(ruta, valor)   añade un hijo con una clave nueva que ordena por orden de llegada; devuelve la clave
//   transporte.escuchar(ruta, cb)           cb(valor) ahora y cada vez que cambie algo bajo esa ruta; devuelve cómo dejar de escuchar
//   transporte.escucharHijos(ruta, cb)      cb(clave, valor) una vez por cada hijo nuevo, también los que ya había
//
// Las rutas son «salas/ABCD/estado/jugadores/j1». Las notificaciones llegan después de la escritura, en orden, como por
// la red. No imita las reglas de seguridad: eso se prueba con la base de datos de verdad.

import { codificar } from './codec.js';

const partir = ruta => String(ruta).split('/').filter(Boolean);
const copia = valor => (valor === undefined ? null : structuredClone(valor));
// Lo que se escribe queda como lo guardaría Firebase: las listas pasan a objetos con índices y no se guarda lo vacío ni null.
const comoFirebase = valor => codificar(valor) ?? null;

export function crearBaseDeDatos({ latenciaMs = 0 } = {}) {
  let raiz = {};
  let contador = 0;
  let pendientes = 0;
  let reposo = [];
  const oyentes = new Set();

  const leer = partes => partes.reduce((nodo, clave) => (nodo && typeof nodo === 'object' ? nodo[clave] : undefined), raiz);

  // Escribe un valor (o borra, con null) y limpia los padres que se quedan vacíos, como hace Firebase.
  function escribir(partes, valor) {
    valor = comoFirebase(valor);
    if (!partes.length) {
      raiz = valor === null ? {} : copia(valor);
      return;
    }
    const camino = [raiz];
    for (const clave of partes.slice(0, -1)) {
      let hijo = camino.at(-1)[clave];
      if (hijo === null || typeof hijo !== 'object') {
        if (valor === null || valor === undefined) return;
        hijo = {};
        camino.at(-1)[clave] = hijo;
      }
      camino.push(hijo);
    }
    const ultimo = partes.at(-1);
    if (valor === null || valor === undefined) delete camino.at(-1)[ultimo];
    else camino.at(-1)[ultimo] = copia(valor);
    for (let k = partes.length - 1; k > 0; k--) {
      if (Object.keys(camino[k]).length) break;
      delete camino[k - 1][partes[k - 1]];
    }
  }

  // Entrega algo a un oyente más tarde (con la latencia pedida) y lleva la cuenta de lo que está en camino.
  function entregar(oyente, entrega) {
    pendientes++;
    const hecho = () => {
      try {
        if (oyente.activo) entrega();
      } finally {
        pendientes--;
        if (!pendientes) { const quienes = reposo; reposo = []; quienes.forEach(listo => listo()); }
      }
    };
    if (latenciaMs) setTimeout(hecho, latenciaMs);
    else queueMicrotask(hecho);
  }

  // Avisa a los oyentes que se ven afectados por un cambio en estas rutas.
  function notificar(rutasCambiadas) {
    for (const oyente of oyentes) {
      const afectado = rutasCambiadas.some(partes => {
        const n = Math.min(partes.length, oyente.partes.length);
        return partes.slice(0, n).every((clave, i) => clave === oyente.partes[i]);
      });
      if (afectado) revisar(oyente);
    }
  }

  function revisar(oyente) {
    const valor = leer(oyente.partes);
    if (oyente.tipo === 'valor') {
      const texto = JSON.stringify(valor ?? null);
      if (texto === oyente.ultimo) return;
      oyente.ultimo = texto;
      const entregado = copia(valor);
      entregar(oyente, () => oyente.cb(entregado));
      return;
    }
    const hijos = valor && typeof valor === 'object' ? valor : {};
    for (const clave of [...oyente.vistos]) if (!(clave in hijos)) oyente.vistos.delete(clave);
    for (const clave of Object.keys(hijos)) {
      if (oyente.vistos.has(clave)) continue;
      oyente.vistos.add(clave);
      const entregado = copia(hijos[clave]);
      entregar(oyente, () => oyente.cb(clave, entregado));
    }
  }

  function suscribir(tipo, ruta, cb) {
    const oyente = { tipo, partes: partir(ruta), cb, activo: true, ultimo: undefined, vistos: new Set() };
    oyentes.add(oyente);
    revisar(oyente);
    // Un «valor» se entrega siempre una vez al conectar, aunque no haya nada (null).
    if (tipo === 'valor' && oyente.ultimo === undefined) {
      oyente.ultimo = 'null';
      entregar(oyente, () => cb(null));
    }
    return () => { oyente.activo = false; oyentes.delete(oyente); };
  }

  return {
    // El árbol entero (copia), para mirar en las pruebas.
    instantanea: () => copia(raiz),
    // Una promesa que se cumple cuando ya no queda ninguna notificación en camino.
    reposo: () => (pendientes ? new Promise(listo => reposo.push(listo)) : Promise.resolve()),
    conectar(uid) {
      return {
        uid,
        async set(ruta, valor) {
          escribir(partir(ruta), valor);
          notificar([partir(ruta)]);
        },
        async update(cambios) {
          const rutas = Object.keys(cambios).map(partir);
          Object.entries(cambios).forEach(([ruta, valor]) => escribir(partir(ruta), valor));
          notificar(rutas);
        },
        remove(ruta) { return this.set(ruta, null); },
        async get(ruta) { return copia(leer(partir(ruta))); },
        async empujar(ruta, valor) {
          const clave = `p${String(++contador).padStart(8, '0')}`;
          escribir([...partir(ruta), clave], valor);
          notificar([[...partir(ruta), clave]]);
          return clave;
        },
        escuchar: (ruta, cb) => suscribir('valor', ruta, cb),
        escucharHijos: (ruta, cb) => suscribir('hijos', ruta, cb),
      };
    },
  };
}
