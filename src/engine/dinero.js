// Todos los movimientos de dinero pasan por aquí. Cada uno queda en un evento «dinero» con su motivo, así las pruebas
// comprueban que el dinero de cada jugador cuadra con la suma de sus movimientos. Nadie queda nunca en negativo: si
// alguien debe más de lo que tiene, la deuda queda pendiente (s.deudas) hasta que reúna el dinero o quiebre.

// De «de» a «a» (un jugador o 'banco'). Quien paga debe tener el dinero: lo comprueba quien llama.
export function transferir(s, ev, de, a, cantidad, motivo) {
  if (!(cantidad > 0)) return;
  if (de !== 'banco') s.jugadores[de].dinero -= cantidad;
  if (a !== 'banco') s.jugadores[a].dinero += cantidad;
  ev.push({ type: 'dinero', de, a, cantidad, motivo });
}

export const cobrar = (s, ev, id, cantidad, motivo) => transferir(s, ev, 'banco', id, cantidad, motivo);

// Cobra una deuda: si el deudor tiene el dinero, paga ya (devuelve true); si no, queda pendiente.
export function cargar(s, ev, deudor, acreedor, cantidad, motivo) {
  if (!(cantidad > 0)) return true;
  if (s.jugadores[deudor].dinero >= cantidad) {
    transferir(s, ev, deudor, acreedor, cantidad, motivo);
    return true;
  }
  s.deudas.push({ id: deudor, acreedor, cantidad, motivo });
  ev.push({ type: 'deuda', id: deudor, acreedor, cantidad, motivo });
  return false;
}

// Paga, en orden, las deudas cuyo deudor ya tiene el dinero.
export function resolverDeudas(s, ev) {
  while (s.deudas.length && s.jugadores[s.deudas[0].id].dinero >= s.deudas[0].cantidad) {
    const d = s.deudas.shift();
    transferir(s, ev, d.id, d.acreedor, d.cantidad, d.motivo);
    ev.push({ type: 'deudaPagada', id: d.id, acreedor: d.acreedor, cantidad: d.cantidad });
  }
}

export const deudorActivo = s => s.deudas[0]?.id ?? null;
