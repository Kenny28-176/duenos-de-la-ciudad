// Punto de entrada del motor. Recibe los datos (tablero, economía, fichas y cartas) ya leídos, para funcionar igual en
// el navegador y en Node (pruebas y simulador).
import {
  accionesDisponibles, alquiler, costeConstruir, fichaEnPartida, patrimonio, precioAccion, prepararContexto, valorBarrio,
} from './contexto.js';
import { OPCIONES, nuevaPartida, paso } from './juego.js';
import { posibles } from './posibles.js';

export function crearMotor(datos) {
  const ctx = prepararContexto(datos);
  return {
    ctx,
    OPCIONES,
    nuevaPartida: opciones => nuevaPartida(ctx, opciones),
    paso: (s, accion) => paso(ctx, s, accion),
    // Qué puede hacer un jugador ahora mismo (para los botones del celular).
    posibles: (s, id) => posibles(ctx, s, id),
    patrimonio: (s, id) => patrimonio(ctx, s, id),
    precioAccion: (s, barrio) => precioAccion(ctx, s, barrio),
    valorBarrio: (s, barrio) => valorBarrio(ctx, s, barrio),
    accionesDisponibles: (s, barrio) => accionesDisponibles(ctx, s, barrio),
    alquiler: (s, i, dados) => alquiler(ctx, s, i, dados),
    costeConstruir: (s, id, i) => costeConstruir(ctx, s, id, i),
    // La ficha de un jugador, con las cifras de sus habilidades para el número de jugadores de la partida.
    ficha: (s, id) => fichaEnPartida(ctx, s, id),
  };
}
