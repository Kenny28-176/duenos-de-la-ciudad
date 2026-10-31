// El organizador de una partida en red. El anfitrión solo atiende lo que mandan los celulares; esto añade lo que hace falta
// para que la partida no se quede parada:
//   - los bots de la sala juegan cuando les toca (con una pausa, como si pensaran), y también las personas a las que el tablero
//     les ha puesto un bot («delegados»: alguien que se ausentó o cuyo celular se cayó);
//   - si nadie puede pujar en una subasta, o entre personas nadie puja en 10 segundos, el tablero la cierra.
// Tiene la misma forma que la partida de demostración (src/ui/tablero/demo.js): paso() y estado(), así el reproductor del
// tablero anima una y otra igual.
import { decidirBot, quienActua } from '../engine/bots.js';
import { SEGUNDOS_DE_SUBASTA } from './protocolo.js';

export { SEGUNDOS_DE_SUBASTA };

// delegados() da el conjunto de jugadores a los que juega un bot. Si cambia mientras se espera, reprogramar() lo tiene en cuenta.
export function crearOrquesta({ anfitrion, motor, velocidad = () => 1, pensarMs = 500, delegados = () => new Set() }) {
  const { ctx } = motor;
  const esBot = (s, id) => s.jugadores[id]?.bot === true || delegados().has(id);

  // Quién tiene que mover ahora. Un trato pendiente para una persona no frena a los bots: ella contesta cuando quiera, y mientras
  // tanto la mesa sigue (si no, un trato sin contestar pararía la partida). Los tratos para un bot, sí: los contesta enseguida.
  function quienDebeActuar(s) {
    const paraBots = Object.fromEntries(Object.entries(s.tratos).filter(([, trato]) => esBot(s, trato.para)));
    return quienActua({ ...s, tratos: paraBots });
  }

  // Programa lo que tenga que hacer el tablero por su cuenta, a menos que antes llegue algo de un celular.
  function programar() {
    const s = anfitrion.estado();
    if (s.fase !== 'juego') return () => {};
    const version = anfitrion.version();
    const v = velocidad();
    const quien = quienDebeActuar(s);
    let ms;
    let accion;
    if (quien === null) {
      // Una subasta en la que nadie puede pujar.
      [ms, accion] = [400, { type: 'cerrarSubasta' }];
    } else if (esBot(s, quien)) {
      [ms, accion] = [pensarMs, decidirBot(ctx, s, quien)];
    } else if (s.subasta) {
      // Una subasta entre personas: se cierra si nadie puja a tiempo.
      [ms, accion] = [SEGUNDOS_DE_SUBASTA * 1000, { type: 'cerrarSubasta' }];
    } else {
      return () => {};
    }
    const reloj = setTimeout(() => anfitrion.accionSi(version, accion), ms / v);
    return () => clearTimeout(reloj);
  }

  let cancelar = () => {};
  const reprogramar = () => {
    cancelar();
    cancelar = programar();
  };

  return {
    estado: () => anfitrion.estado(),
    // Vuelve a mirar qué tiene que hacer el tablero (cuando cambian los delegados mientras se espera a una persona).
    reprogramar,
    // La siguiente acción que se aplique, venga de un celular o del propio tablero (un bot, una subasta). Devuelve
    // { accion, eventos, uid }, o null si se cerró la sala o la partida ya acabó (así nadie se queda esperando una acción
    // que no llegará, y el tablero puede ofrecer otra partida).
    async paso() {
      if (anfitrion.estado().fase === 'fin') return null;
      reprogramar();
      try {
        return await anfitrion.siguientePaso();
      } finally {
        cancelar();
        cancelar = () => {};
      }
    },
  };
}
