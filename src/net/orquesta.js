// El organizador de una partida en red. El anfitrión solo atiende lo que mandan los celulares; esto añade lo que hace falta
// para que la partida no se quede parada:
//   - los bots de la sala juegan cuando les toca (con una pausa, como si pensaran);
//   - si nadie puede pujar en una subasta, o entre personas nadie puja en 10 segundos, el tablero la cierra.
// Tiene la misma forma que la partida de demostración (src/ui/tablero/demo.js): paso() y estado(), así el reproductor del
// tablero anima una y otra igual.
import { decidirBot, quienActua } from '../engine/bots.js';

export const SEGUNDOS_DE_SUBASTA = 10;

export function crearOrquesta({ anfitrion, motor, velocidad = () => 1, pensarMs = 500 }) {
  const { ctx } = motor;
  const esBot = (s, id) => s.jugadores[id]?.bot === true;

  // Programa lo que tenga que hacer el tablero por su cuenta, a menos que antes llegue algo de un celular.
  function programar() {
    const s = anfitrion.estado();
    if (s.fase !== 'juego') return () => {};
    const version = anfitrion.version();
    const v = velocidad();
    const quien = quienActua(s);
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

  return {
    estado: () => anfitrion.estado(),
    // La siguiente acción que se aplique, venga de un celular o del propio tablero (un bot, una subasta). Devuelve
    // { accion, eventos, uid }, o null si se cerró la sala.
    async paso() {
      const cancelar = programar();
      try {
        return await anfitrion.siguientePaso();
      } finally {
        cancelar();
      }
    },
  };
}
