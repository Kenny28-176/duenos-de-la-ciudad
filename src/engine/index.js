// Punto de entrada del motor. Recibe los datos (tablero, economía, fichas y cartas) ya leídos, para funcionar igual en
// el navegador y en Node (pruebas y simulador).
import {
  accionesDisponibles, alquiler, costeConstruir, patrimonio, precioAccion, prepararContexto, valorBarrio,
} from './contexto.js';
import { OPCIONES, nuevaPartida, paso } from './juego.js';

export function crearMotor(datos) {
  const ctx = prepararContexto(datos);
  return {
    ctx,
    OPCIONES,
    nuevaPartida: opciones => nuevaPartida(ctx, opciones),
    paso: (s, accion) => paso(ctx, s, accion),
    patrimonio: (s, id) => patrimonio(ctx, s, id),
    precioAccion: (s, barrio) => precioAccion(ctx, s, barrio),
    valorBarrio: (s, barrio) => valorBarrio(ctx, s, barrio),
    accionesDisponibles: (s, barrio) => accionesDisponibles(ctx, s, barrio),
    alquiler: (s, i, dados) => alquiler(ctx, s, i, dados),
    costeConstruir: (s, id, i) => costeConstruir(ctx, s, id, i),
  };
}
