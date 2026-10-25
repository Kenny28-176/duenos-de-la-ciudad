// Lo que se hablan el tablero (el anfitrión) y los celulares, y dónde lo escriben. Sirve igual para Firebase que para la
// base en memoria de las pruebas (src/net/memoria.js).
//
//   salas/ABCD/
//     meta              { anfitrion: uid, creada: ms, version: 1 }                      lo escribe el tablero
//     estado/…          el estado de la partida, sin secretos, por partes               lo escribe el tablero; lo leen todos
//                       (con «publicacion»: el número de la publicación, que sube cada vez)
//     vistas/<uid>/     { id, n, puede: {…}, error?: {…} }  lo que le toca a ese celular lo escribe el tablero; lo lee ese uid
//     acciones/<clave>  { uid, accion: {…} }                                            lo escriben los celulares; el tablero las lee y las borra
//
// Los celulares nunca escriben el estado: solo piden acciones, y el tablero decide. Quien manda una acción no dice quién es:
// el tablero pone el jugador que corresponde a su uid, así nadie puede hacerse pasar por otro.

// Lo que un celular puede pedir. Lo demás (configurar, empezar, cerrar la subasta, el tiempo) es solo del tablero.
export const ACCIONES_DE_CELULAR = new Set([
  'unirse', 'elegirFicha', 'salir',
  'tirar', 'comprar', 'noComprar', 'pagarFianza', 'usarSalvoconducto', 'usarHabilidad', 'terminarTurno',
  'construir', 'venderEdificio', 'hipotecar', 'deshipotecar', 'comprarAcciones', 'venderAcciones',
  'pujar', 'retirarse', 'proponerTrato', 'aceptarTrato', 'rechazarTrato', 'declararBancarrota',
]);

export const rutas = codigo => ({
  raiz: `salas/${codigo}`,
  meta: `salas/${codigo}/meta`,
  estado: `salas/${codigo}/estado`,
  vistas: `salas/${codigo}/vistas`,
  vista: uid => `salas/${codigo}/vistas/${uid}`,
  acciones: `salas/${codigo}/acciones`,
});

// Los segundos que espera el tablero, en una subasta entre personas, antes de cerrarla si nadie puja (vuelven a contar con cada puja).
// Lo usan la orquesta (que la cierra) y las pantallas (que enseñan la cuenta atrás).
export const SEGUNDOS_DE_SUBASTA = 10;

// El código de una sala: cuatro consonantes (sin vocales no forman palabras, y sin la Q ni la Y no se confunden).
const LETRAS = 'BCDFGHJKLMNPRSTVWXZ';
export const CODIGO = /^[BCDFGHJKLMNPRSTVWXZ]{4}$/;

export function codigoDeSala(azar = Math.random) {
  return Array.from({ length: 4 }, () => LETRAS[Math.floor(azar() * LETRAS.length)]).join('');
}

// Lo que escribe una persona (el código al unirse) se arregla: mayúsculas y sin espacios.
export const limpiarCodigo = texto => String(texto ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
