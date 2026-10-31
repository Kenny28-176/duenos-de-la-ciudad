// Las estadísticas de la partida y los premios del final. Salen de los eventos del motor, que el tablero va pasando al animarlos:
// la pantalla final no solo dice quién ganó, también quién se llevó la Llave de oro (más alquiler cobrado) o el Abono del Calabozo.
// Son funciones puras sobre un objeto de cuentas que se puede guardar (va con la partida guardada) y empezar de cero.
//
//   const cuentas = {};
//   anotar(cuentas, eventos);           con cada paso
//   premios(cuentas, estado.orden)      → [{ id: 'casero', jugador: 'j2', cifra: 2350 }, …] (los nombres y textos, en la interfaz)

// Cada premio: qué cuenta mira y si es dinero. Van por orden de interés: si hay que elegir, salen los primeros.
export const PREMIOS = [
  { id: 'casero', cuenta: 'alquilerCobrado', dinero: true },
  { id: 'constructor', cuenta: 'edificios' },
  { id: 'bolsista', cuenta: 'dividendos', dinero: true },
  { id: 'subastero', cuenta: 'subastas' },
  { id: 'negociador', cuenta: 'tratos' },
  { id: 'inquilino', cuenta: 'alquilerPagado', dinero: true },
  { id: 'preso', cuenta: 'calabozo' },
  { id: 'dobles', cuenta: 'dobles' },
];

const sumar = (cuentas, id, cuenta, cantidad = 1) => {
  if (!id || id === 'banco') return;
  cuentas[id] ??= {};
  cuentas[id][cuenta] = (cuentas[id][cuenta] ?? 0) + cantidad;
};

// Suma lo que cuentan estos eventos.
export function anotar(cuentas, eventos) {
  for (const e of eventos) {
    switch (e.type) {
      case 'dinero':
        if (e.motivo === 'alquiler') {
          sumar(cuentas, e.a, 'alquilerCobrado', e.cantidad);
          sumar(cuentas, e.de, 'alquilerPagado', e.cantidad);
        } else if (e.motivo === 'dividendo') sumar(cuentas, e.a, 'dividendos', e.cantidad);
        break;
      case 'construir': sumar(cuentas, e.id, 'edificios'); break;
      case 'subastaGanada': sumar(cuentas, e.id, 'subastas'); break;
      case 'tratoAceptado':
        sumar(cuentas, e.de, 'tratos');
        sumar(cuentas, e.para, 'tratos');
        break;
      case 'alCalabozo': sumar(cuentas, e.id, 'calabozo'); break;
      case 'dados': if (e.dados?.[0] === e.dados?.[1]) sumar(cuentas, e.id, 'dobles'); break;
      default: break;
    }
  }
  return cuentas;
}

// Los premios que se reparten: para cada uno, quien tiene más (si es más que cero y nadie le empata). Como mucho «maximo», y
// procurando que no se los lleve todos la misma persona: primero, uno por jugador; luego, los demás por orden.
export function premios(cuentas, jugadores, { maximo = 4 } = {}) {
  const ganados = [];
  for (const premio of PREMIOS) {
    const cifras = jugadores.map(id => [id, cuentas[id]?.[premio.cuenta] ?? 0]).sort((a, b) => b[1] - a[1]);
    const [primero, segundo] = cifras;
    if (!primero || primero[1] <= 0 || (segundo && segundo[1] === primero[1])) continue;
    ganados.push({ id: premio.id, jugador: primero[0], cifra: primero[1], dinero: Boolean(premio.dinero) });
  }
  const elegidos = [];
  const conPremio = new Set();
  for (const p of ganados) {
    if (elegidos.length < maximo && !conPremio.has(p.jugador)) { elegidos.push(p); conPremio.add(p.jugador); }
  }
  for (const p of ganados) if (elegidos.length < maximo && !elegidos.includes(p)) elegidos.push(p);
  return elegidos.sort((a, b) => ganados.indexOf(a) - ganados.indexOf(b));
}
