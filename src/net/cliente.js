// El cliente: el celular de un jugador. Escucha el estado de la partida y su propia vista (qué botones tiene), y manda las
// acciones que pide. No decide nada: lo que ve es lo que publica el tablero. Solo habla con un «transporte»
// (src/net/memoria.js o, con Firebase, el de verdad).
//
//   const celular = crearCliente({ transporte, motor, codigo });
//   celular.alCambiar(({ estado, vista }) => pintar(estado, vista));
//   celular.enviar({ type: 'unirse', nombre: 'Ana', ficha: 'toro' });
//   celular.enviar({ type: 'tirar' });
import { decodificar, sinSecretos } from './codec.js';
import { rutas } from './protocolo.js';

export function crearCliente({ transporte, motor, codigo }) {
  const r = rutas(codigo);
  // Una partida nueva da la forma del estado (qué listas y qué valores hay), para rellenar lo que Firebase no guarda.
  const plantilla = sinSecretos(motor.nuevaPartida({ sala: codigo, semilla: 1 }));
  let estado = null;
  let vista = {};
  let numeroDelEstado = 0;
  let abierta = null; // meta de la sala (null si no existe)
  let existe = null;
  const oyentes = new Set();
  const avisar = () => { for (const oyente of oyentes) oyente(api.datos()); };

  const paradas = [
    transporte.escuchar(r.estado, arbol => {
      if (arbol) {
        const { publicacion, ...resto } = arbol;
        estado = decodificar(resto, plantilla);
        numeroDelEstado = publicacion ?? 0;
      } else {
        estado = null;
        numeroDelEstado = 0;
      }
      avisar();
    }),
    transporte.escuchar(r.vista(transporte.uid), v => {
      vista = decodificar(v ?? {}, {});
      vista.puede ??= {};
      avisar();
    }),
    transporte.escuchar(r.meta, m => { abierta = m; existe = m !== null; avisar(); }),
  ];

  const api = {
    uid: transporte.uid,
    codigo,
    // Lo que se ve ahora: el estado, la vista de este celular y si las dos son de la misma publicación del tablero
    // (así, quien actúe lo hace con todo al día, no con la mitad).
    datos: () => ({
      estado,
      vista,
      sala: existe,
      meta: abierta,
      alDia: estado !== null && vista.n === numeroDelEstado,
      miId: vista.id ?? null,
      n: numeroDelEstado,
    }),
    alCambiar(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    // Pide una acción al tablero. No dice quién es: el tablero lo sabe por el uid.
    async enviar(accion) {
      await transporte.empujar(r.acciones, { uid: transporte.uid, accion });
    },
    cerrar() {
      paradas.forEach(parar => parar());
      oyentes.clear();
    },
  };
  return api;
}
