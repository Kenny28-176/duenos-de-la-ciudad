// El reloj de una partida con límite de tiempo (docs/DISENO.md, sección 6). Es una cuenta, sin temporizador propio: quien lo usa
// (src/ui/tablero/app.js) le dice cuánto tiempo ha pasado cada vez, y solo cuando la partida está en marcha (no en pausa). Así se
// puede probar sin esperar y guardar en la partida recuperable.
//   limiteMinutos  los minutos de la partida (null = sin límite)
//   jugadoMs       lo que ya se ha jugado (al recuperar una partida guardada)
//   factor         para las pruebas: cada milisegundo cuenta por «factor»
export function crearReloj({ limiteMinutos = null, jugadoMs = 0, factor = 1 } = {}) {
  let jugado = jugadoMs;
  const limiteMs = limiteMinutos ? limiteMinutos * 60000 : null;
  return {
    avanzar(ms) { jugado += Math.max(0, ms) * factor; },
    jugado: () => jugado,
    restanteMs: () => (limiteMs === null ? null : Math.max(0, limiteMs - jugado)),
    // Los minutos que quedan, redondeados hacia arriba (con 20 segundos por delante, «queda 1 min»).
    minutosQueQuedan: () => (limiteMs === null ? null : Math.ceil(Math.max(0, limiteMs - jugado) / 60000)),
    vencido: () => limiteMs !== null && jugado >= limiteMs,
  };
}
