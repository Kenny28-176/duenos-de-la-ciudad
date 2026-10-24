// Partida de demostración para el tablero: juegan solo bots. Da los pasos de uno en uno para que el tablero anime los
// eventos de cada paso antes de pedir el siguiente. Los bots deciden igual que en el simulador (src/engine/bots.js).
//   const demo = crearDemo(motor, { semilla, fichas: ['rata', 'toro', …] })
//   demo.paso()     → { accion, eventos } con el siguiente paso, o null cuando la partida ha terminado
//   demo.estado()   → el estado de la partida en este momento
import { accionDeRespaldo, decidirBot, quienActua } from '../../engine/bots.js';

export function crearDemo(motor, { semilla = Date.now(), fichas, sala = {}, maxTurnos = 400 } = {}) {
  const { ctx } = motor;
  let s = motor.nuevaPartida({ semilla });
  const aplicar = accion => {
    const r = motor.paso(s, accion);
    if (r.error) throw new Error(`La demostración no pudo hacer «${accion.type}»: ${r.error.mensaje}`);
    s = r.state;
    return r.events;
  };

  fichas.forEach((ficha, k) => aplicar({ type: 'unirse', id: `j${k + 1}`, nombre: ctx.fichas[ficha].nombre, ficha, bot: true }));
  aplicar({ type: 'configurar', opciones: sala });
  // Los eventos del principio (el orden de juego y el dinero inicial) se entregan en el primer paso.
  let inicio = { accion: { type: 'empezar' }, eventos: aplicar({ type: 'empezar' }) };
  let finPedido = false;

  function paso() {
    if (inicio) {
      const primero = inicio;
      inicio = null;
      return primero;
    }
    if (s.fase !== 'juego') return null;
    if (!finPedido && s.turnos >= maxTurnos) {
      finPedido = true;
      return { accion: { type: 'finPorTiempo' }, eventos: aplicar({ type: 'finPorTiempo' }) };
    }
    const id = quienActua(s);
    // Si nadie puede pujar, el tablero cierra la subasta (como haría al acabarse la cuenta atrás).
    let accion = id === null ? { type: 'cerrarSubasta' } : decidirBot(ctx, s, id);
    let r = motor.paso(s, accion);
    if (r.error && id !== null) {
      accion = accionDeRespaldo(s, id);
      r = motor.paso(s, accion);
    }
    if (r.error) throw new Error(`La demostración no pudo hacer «${accion.type}»: ${r.error.mensaje}`);
    s = r.state;
    return { accion, eventos: r.events };
  }

  return { paso, estado: () => s };
}
