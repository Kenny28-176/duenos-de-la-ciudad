// Lo que muestra el tablero, calculado a partir del estado del motor. Son funciones puras: no tocan el navegador ni el
// motor (solo lo consultan), así se prueban sin pantalla. Los textos no se escriben aquí: devuelven datos (ids,
// números) y los componentes los traducen.

// El nombre que se muestra de un jugador: el que escribió, o la ficha sin artículo si es un bot («Rata», no «La Rata»),
// para que las frases suenen bien («Rata paga 9 $ a Hormiga»). «nombreDeFicha» da el nombre traducido de una ficha.
export const sinArticulo = nombre => String(nombre).replace(/^(la|el|los|las|the)\s+/i, '');

export function nombreMostrado(j, nombreDeFicha) {
  return j.bot ? sinArticulo(nombreDeFicha(j.ficha)) : j.nombre;
}

// Una fila por jugador, en orden de juego. «dinero» (opcional) es el que se está mostrando, que puede ir un poco por
// detrás del real mientras se animan los movimientos de dinero.
export function resumenJugadores(motor, s, { dinero = {}, nombreDeFicha = f => f } = {}) {
  const meta = s.opciones.meta;
  return s.orden.map(id => {
    const j = s.jugadores[id];
    const ficha = s.opciones.habilidades ? motor.ficha(s, id) : null;
    const patrimonio = motor.patrimonio(s, id);
    return {
      id,
      nombre: nombreMostrado(j, nombreDeFicha),
      ficha: j.ficha,
      color: motor.ctx.fichas[j.ficha].color,
      dinero: dinero[id] ?? j.dinero,
      patrimonio,
      avance: meta ? Math.min(1, patrimonio / meta) : null,
      turno: s.fase === 'juego' && s.turno?.id === id,
      quebrado: j.quebrado,
      estados: [
        j.calabozo && 'retenido',
        j.marcado && 'marcado',
        j.pierdeTurno && 'pierde-turno',
        s.efectos.some(e => e.tipo === 'hibernar' && e.jugador === id) && 'hibernando',
        s.enRacha[id] && 'en-racha-final',
      ].filter(Boolean),
      activa: ficha
        ? { id: ficha.activa.id, enfriamiento: j.hab.enfriamiento, lista: j.hab.enfriamiento === 0 && !j.hab.prestamo }
        : null,
    };
  });
}

// Las filas de la pizarra de la Bolsa: el precio de la acción de cada barrio y si ha subido o bajado desde «anteriores»
// (un objeto { barrio: precio } de antes). Sin mercado vivo no hay pizarra.
export function filasBolsa(motor, s, anteriores = {}) {
  if (!s.opciones.mercado) return [];
  return Object.values(motor.ctx.barrios).map(b => {
    const precio = motor.precioAccion(s, b.id);
    const antes = anteriores[b.id] ?? precio;
    return {
      barrio: b.id,
      color: b.color,
      imagen: b.imagen,
      precio,
      tendencia: precio > antes ? 'sube' : precio < antes ? 'baja' : null,
      rally: s.efectos.some(e => e.tipo === 'rally' && e.barrio === b.id),
    };
  });
}

// Los precios de las acciones ahora mismo, para compararlos luego.
export function preciosActuales(motor, s) {
  if (!s.opciones.mercado) return {};
  return Object.fromEntries(Object.keys(motor.ctx.barrios).map(b => [b, motor.precioAccion(s, b)]));
}

// La imagen del bodegón de cada carta (tarjetas/efectos/<nombre>.webp) según lo que hace.
export function imagenDeEfecto(efecto) {
  switch (efecto.tipo) {
    case 'cobrar': case 'dividendoExtra': case 'cobraElMasPobre': return 'cobrar';
    case 'todosCobran': return 'subsidio';
    case 'pagar': case 'todosPagan': case 'pagarACadaJugador': case 'pagarPorHipotecada': return 'pagar';
    case 'cobrarDeCadaJugador': return 'rifa';
    case 'moverA': return 'avanzar';
    case 'avanzarATipo': return 'viaje';
    case 'retroceder': return 'retroceder';
    case 'irCalabozo': return 'calabozo';
    case 'salvoconducto': return 'salvoconducto';
    case 'reparaciones': case 'reparacionesTodos': return 'reparaciones';
    case 'valorBarrio': return efecto.cantidad > 0 ? 'llega-empresa' : 'bolsa-baja';
    case 'valorTodos': return efecto.porcentaje > 0 ? 'bolsa-sube' : 'bolsa-baja';
    case 'accionesBaratas': return 'bolsa-sube';
    default: return 'cobrar';
  }
}

// Todo lo que necesita mostrar una carta robada: su identificador, su mazo, las cifras de su texto y su imagen.
// «e» es el evento «carta» del motor ({ id, mazo, carta, barrio? }); «nombreBarrio» traduce un barrio.
export function datosDeCarta(ctx, e, nombreBarrio) {
  const carta = ctx.cartas[e.carta];
  return {
    id: e.carta,
    mazo: e.mazo,
    jugador: e.id,
    imagen: imagenDeEfecto(carta.efecto),
    datos: { ...carta.efecto, barrio: e.barrio ? nombreBarrio(e.barrio) : undefined },
  };
}
