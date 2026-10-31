// El anfitrión: el tablero cuando la partida es de verdad. Recibe las acciones que mandan los celulares, las pasa por el
// motor (que es quien decide) y publica el resultado para que todos lo vean. Solo habla con un «transporte»
// (src/net/memoria.js o, con Firebase, el de verdad), así se prueba sin red.
//
// El tablero anima cada paso antes de publicarlo, para que los celulares no destripen la sorpresa:
//
//   const anfitrion = crearAnfitrion({ transporte, motor, codigo });
//   await anfitrion.abrir();
//   for (;;) {
//     const paso = await anfitrion.siguientePaso();   // { accion, eventos, uid } cuando llega algo que valga
//     await animar(paso.eventos);                      // (el reproductor del tablero)
//     await anfitrion.publicar();                      // ahora sí lo ven los celulares
//   }
//
// Si la página del tablero se recarga a media partida, anfitrion.instantanea() (que se guarda tras cada jugada) y la opción
// «recuperar» devuelven la sala a como estaba: el estado entero (con el azar y los mazos, que no se publican), quién es cada celular
// y las cuentas con las que los celulares saben qué se ha publicado y qué se ha atendido.
import { codificar, diferencias, reconstruir, sinSecretos } from './codec.js';
import { ACCIONES_DE_CELULAR, MAX_MOVIMIENTOS, rutas } from './protocolo.js';

export function crearAnfitrion({ transporte, motor, codigo, semilla = Date.now(), recuperar = null }) {
  const r = rutas(codigo);
  let estado = recuperar ? JSON.parse(JSON.stringify(recuperar.estado)) : motor.nuevaPartida({ sala: codigo, semilla });
  const jugadorDe = new Map(recuperar?.jugadores ?? []); // uid del celular → id del jugador
  const cola = [];
  let despertar = null;
  let cerrada = false;
  let publicaciones = recuperar?.publicaciones ?? 0;
  let version = recuperar?.version ?? 0; // cuántas acciones se han aplicado (para saber si el estado ha cambiado desde que algo se programó)
  let arbolPublicado = {};
  const vistasPublicadas = new Map(); // uid → árbol de su vista
  const errores = new Map(); // uid → su último error, con un número para saber si es uno nuevo
  const atendidas = new Map(recuperar?.atendidas ?? []); // uid → cuántas acciones suyas ha atendido el tablero (aplicadas o rechazadas): es su acuse de recibo
  let numeroDeError = recuperar?.numeroDeError ?? 0;
  // Los últimos movimientos de dinero de cada jugador (id → { número: { de, a, cantidad, motivo } }). El número es único y sube siempre
  // (empieza en 1: así el mapa nunca parece una lista de Firebase), y se guarda por número y no por posición para que cada movimiento
  // nuevo escriba una sola entrada en la base y borre la más vieja, en vez de reescribirlas todas.
  const movimientos = new Map(recuperar?.movimientos ?? []);
  let ultimoMovimiento = recuperar?.ultimoMovimiento ?? 0;
  let parar = null;

  const despertarAlQueEspera = () => { const f = despertar; despertar = null; f?.(); };

  // Un celular pide algo: se guarda en la cola y se borra de la base (cada acción se procesa una sola vez).
  function recibir(clave, mensaje) {
    transporte.remove(`${r.acciones}/${clave}`);
    if (mensaje && typeof mensaje.uid === 'string') {
      cola.push(mensaje);
      despertarAlQueEspera();
    }
  }

  // Convierte lo que pide un celular en una acción del motor, o dice por qué no.
  function preparar(uid, accionRecibida) {
    // Lo que llega de Firebase trae las listas como objetos con índices y sin lo que está vacío.
    const accion = reconstruir(accionRecibida);
    if (!accion || typeof accion.type !== 'string' || !ACCIONES_DE_CELULAR.has(accion.type)) {
      return { error: { codigo: 'accion', mensaje: `Acción desconocida: ${accion?.type}`, datos: { tipo: String(accion?.type) } } };
    }
    if (accion.type === 'unirse') {
      if (!jugadorDe.has(uid)) jugadorDe.set(uid, `j${jugadorDe.size + 1}`);
      // Solo el nombre y la ficha: lo demás (si es un bot, por ejemplo) no lo decide el celular.
      return { accion: { type: 'unirse', id: jugadorDe.get(uid), nombre: accion.nombre, ...(accion.ficha ? { ficha: accion.ficha } : {}) } };
    }
    const id = jugadorDe.get(uid);
    if (!id) return { error: { codigo: 'jugador', mensaje: 'No estás en la sala.', datos: { variante: 'sala' } } };
    return { accion: { ...accion, id } };
  }

  // Anota un movimiento de dinero en el historial de cada jugador que interviene (el banco no tiene).
  function anotarMovimiento({ de, a, cantidad, motivo }) {
    const numero = ++ultimoMovimiento;
    for (const id of new Set([de, a])) {
      if (id === 'banco') continue;
      const lista = movimientos.get(id) ?? {};
      lista[numero] = { de, a, cantidad, motivo };
      const numeros = Object.keys(lista).map(Number).sort((x, y) => x - y);
      for (const viejo of numeros.slice(0, Math.max(0, numeros.length - MAX_MOVIMIENTOS))) delete lista[viejo];
      movimientos.set(id, lista);
    }
  }

  function aplicar(accion) {
    const resultado = motor.paso(estado, accion);
    if (resultado.error) return { error: resultado.error };
    estado = resultado.state;
    version++;
    // Otra partida con los mismos jugadores: el historial de la anterior no se arrastra (los números siguen subiendo).
    if (accion.type === 'revancha') movimientos.clear();
    for (const e of resultado.events) if (e.type === 'dinero') anotarMovimiento(e);
    return { accion, eventos: resultado.events };
  }

  // Le dice a un celular que lo que pidió no vale. Solo cambia su error (no sus botones: el tablero puede ir un paso por
  // delante de lo publicado, y el celular vería botones de un estado que todavía no ve).
  async function avisarError(uid, error) {
    const nuevo = { codigo: error.codigo, mensaje: error.mensaje, datos: error.datos ?? {}, n: ++numeroDeError };
    errores.set(uid, nuevo);
    // Un «unirse» fallido no deja al celular con un jugador: se olvida su uid.
    if (jugadorDe.has(uid) && !estado.jugadores[jugadorDe.get(uid)]) jugadorDe.delete(uid);
    const previa = vistasPublicadas.get(uid) ?? {};
    const vista = { ...previa, error: codificar(nuevo), atendidas: atendidas.get(uid) };
    vistasPublicadas.set(uid, vista);
    const cambios = diferencias({ error: previa.error, atendidas: previa.atendidas }, { error: vista.error, atendidas: vista.atendidas }, r.vista(uid));
    if (Object.keys(cambios).length) await transporte.update(cambios);
  }

  const api = {
    // El estado de la partida tal como lo tiene el tablero (que puede ir un paso por delante de lo publicado).
    estado: () => estado,
    codigo,
    // Cuántas veces se ha publicado (el número de la última publicación) y cuántas acciones se han aplicado.
    publicaciones: () => publicaciones,
    version: () => version,
    // Quién es cada celular (uid → id de jugador).
    jugadores: () => new Map(jugadorDe),
    // Todo lo que hace falta para seguir esta sala tras recargar la página del tablero (se pasa a «recuperar»): solo JSON.
    instantanea: () => ({
      estado, jugadores: [...jugadorDe], publicaciones, version, atendidas: [...atendidas], numeroDeError,
      movimientos: [...movimientos], ultimoMovimiento,
    }),

    // Abre la sala: la crea en la base y se pone a escuchar las acciones de los celulares.
    async abrir() {
      await transporte.set(r.meta, { anfitrion: transporte.uid, creada: Date.now(), version: 1 });
      parar = transporte.escucharHijos(r.acciones, recibir);
      await api.publicar();
    },

    // Algo que hace el propio tablero (configurar, empezar, cerrar la subasta, el tiempo): entra en la misma cola.
    accionPropia(accion) {
      cola.push({ uid: transporte.uid, accion, propia: true });
      despertarAlQueEspera();
    },

    // Una acción del tablero que solo vale si nada ha cambiado desde que se programó (la jugada de un bot, el cierre de una
    // subasta): si mientras tanto llegó otra acción, la programada ya no tiene sentido y se descarta.
    accionSi(versionEsperada, accion) {
      if (version === versionEsperada) api.accionPropia(accion);
    },

    // Espera la siguiente acción que valga y la aplica. Devuelve { accion, eventos, uid }, o null si se cerró la sala.
    // Las que no valen (porque no toca, porque no hay dinero…) no se devuelven: se le dice el error a quien las mandó.
    async siguientePaso() {
      for (;;) {
        while (!cola.length && !cerrada) await new Promise(listo => { despertar = listo; });
        if (cerrada) return null;
        const mensaje = cola.shift();
        const preparada = mensaje.propia ? { accion: mensaje.accion } : preparar(mensaje.uid, mensaje.accion);
        const resultado = preparada.error ? preparada : aplicar(preparada.accion);
        if (!mensaje.propia) atendidas.set(mensaje.uid, (atendidas.get(mensaje.uid) ?? 0) + 1);
        if (resultado.error) {
          if (!mensaje.propia) await avisarError(mensaje.uid, resultado.error);
          continue;
        }
        return { ...resultado, uid: mensaje.uid };
      }
    },

    // Publica lo que ha cambiado desde la última vez, por partes: el estado para todos y la vista de cada celular.
    async publicar() {
      publicaciones++;
      // El número de la publicación va dentro del propio estado: así los celulares reciben juntos el estado y su número, y
      // pueden saber si sus botones (la vista) son de la misma publicación.
      const arbol = { ...codificar(sinSecretos(estado)), publicacion: publicaciones };
      const cambios = diferencias(arbolPublicado, arbol, r.estado);
      for (const [uid] of jugadorDe) {
        const id = jugadorDe.get(uid);
        const vista = codificar({
          id, n: publicaciones, puede: motor.posibles(estado, id), atendidas: atendidas.get(uid) ?? 0, movimientos: movimientos.get(id), error: errores.get(uid),
        }) ?? {};
        Object.assign(cambios, diferencias(vistasPublicadas.get(uid) ?? {}, vista, r.vista(uid)));
        vistasPublicadas.set(uid, vista);
      }
      arbolPublicado = arbol;
      await transporte.update(cambios);
    },

    // Cierra la sala: deja de escuchar y la borra.
    async cerrar() {
      cerrada = true;
      parar?.();
      despertarAlQueEspera();
      await transporte.remove(r.raiz);
    },
  };
  return api;
}
