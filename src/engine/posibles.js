// Qué puede hacer un jugador ahora mismo, para que su celular enseñe solo los botones que valen. No repite ninguna regla:
// prueba cada acción posible con el propio motor, sobre una copia del estado (paso() nunca toca el que recibe), y se
// queda con las que no dan error. Así lo que ve el jugador y lo que acepta el tablero no pueden contradecirse.
//
//   posibles(ctx, s, 'j1') → { tirar: true, comprar: 220, construir: [1, 3], pujar: 40, habilidad: { id: 'esprint' }, … }
//
// Solo salen las acciones que se pueden hacer: lo que falta es que no se puede (y Firebase no guarda listas vacías).
import { propiedadesDe } from './contexto.js';
import { paso } from './juego.js';
import { pujaMinima } from './subasta.js';

export function posibles(ctx, s, id) {
  const j = s.jugadores[id];
  if (s.fase !== 'juego' || !j || j.quebrado) return {};
  const vale = accion => paso(ctx, s, { id, ...accion }).error === null;
  const filtrar = (lista, hacer) => lista.filter(x => vale(hacer(x)));
  const mias = propiedadesDe(ctx, s, id);
  const calles = mias.filter(i => ctx.casillas[i].tipo === 'calle');
  const barrios = Object.keys(ctx.barrios);
  const rivales = s.orden.filter(k => k !== id && !s.jugadores[k].quebrado);
  const paquete = ctx.eco.bolsa.paquete;
  const p = {};
  // Solo se anota lo que hay: un sí, una cantidad mayor que cero, una lista o un objeto con algo dentro.
  const poner = (clave, valor) => {
    let hay = valor === true;
    if (typeof valor === 'number') hay = valor > 0;
    else if (Array.isArray(valor)) hay = valor.length > 0;
    else if (valor !== null && typeof valor === 'object') hay = Object.keys(valor).length > 0;
    if (hay) p[clave] = valor;
  };

  // El turno.
  poner('tirar', vale({ type: 'tirar' }));
  if (s.turno.id === id && s.turno.compra != null) {
    poner('noComprar', vale({ type: 'noComprar' }));
    if (vale({ type: 'comprar' })) poner('comprar', ctx.casillas[s.turno.compra].precio);
  }
  poner('terminarTurno', vale({ type: 'terminarTurno' }));
  if (j.calabozo) {
    if (vale({ type: 'pagarFianza' })) poner('pagarFianza', ctx.eco.fianza);
    poner('usarSalvoconducto', vale({ type: 'usarSalvoconducto' }));
  }
  poner('declararBancarrota', vale({ type: 'declararBancarrota' }));

  // Las propiedades y las acciones de la Bolsa.
  poner('construir', filtrar(calles, casilla => ({ type: 'construir', casilla })));
  poner('venderEdificio', filtrar(calles.filter(i => s.props[i].nivel > 0), casilla => ({ type: 'venderEdificio', casilla })));
  poner('hipotecar', filtrar(mias, casilla => ({ type: 'hipotecar', casilla })));
  poner('deshipotecar', filtrar(mias.filter(i => s.props[i].hipotecada), casilla => ({ type: 'deshipotecar', casilla })));
  poner('comprarAcciones', filtrar(barrios, barrio => ({ type: 'comprarAcciones', barrio, cantidad: paquete })));
  poner('venderAcciones', filtrar(barrios.filter(b => (j.acciones[b] ?? 0) >= paquete), barrio => ({ type: 'venderAcciones', barrio, cantidad: paquete })));

  // La subasta.
  if (s.subasta && s.subasta.activos.includes(id)) {
    const minima = pujaMinima(ctx, s, id);
    if (vale({ type: 'pujar', cantidad: minima })) poner('pujar', minima);
    poner('retirarse', vale({ type: 'retirarse' }));
  }

  // Los tratos: ver y contestar los que te tocan; proponer, siempre que no haya subasta.
  poner('aceptarTrato', Object.values(s.tratos).filter(t => t.para === id && vale({ type: 'aceptarTrato', trato: t.id })).map(t => t.id));
  poner('rechazarTrato', Object.values(s.tratos).filter(t => t.para === id || t.de === id).map(t => t.id));
  poner('proponerTrato', !s.subasta && rivales.length > 0);

  // La habilidad activa: cuáles son sus opciones (a quién, qué calle, qué barrio, cuánto).
  const hab = s.opciones.habilidades ? ctx.fichas[j.ficha]?.activa : null;
  if (hab) {
    // Una habilidad con opciones (barrios, calles, rivales…) solo se ofrece si hay alguna que valga.
    const ofrecer = (datos, conOpciones = true) => {
      if (conOpciones && !Object.values(datos).some(v => (Array.isArray(v) ? v.length : v))) return;
      p.habilidad = { id: hab.id, ...datos };
    };
    switch (hab.id) {
      case 'rally':
        ofrecer({ barrios: filtrar(barrios, barrio => ({ type: 'usarHabilidad', barrio })) });
        break;
      case 'inflar':
        ofrecer({ casillas: filtrar(calles, casilla => ({ type: 'usarHabilidad', casilla })) });
        break;
      case 'obras-eternas':
        ofrecer({ casillas: filtrar(ctx.propiedades.filter(i => ctx.casillas[i].tipo === 'calle' && s.props[i].dueno && s.props[i].dueno !== id), casilla => ({ type: 'usarHabilidad', casilla })) });
        break;
      case 'frenesi':
      case 'imprevisto':
        ofrecer({ objetivos: filtrar(rivales, objetivo => ({ type: 'usarHabilidad', objetivo })) });
        break;
      case 'prestamo-expres':
        if (vale({ type: 'usarHabilidad', cantidad: 10 })) ofrecer({ maximo: hab.maximo });
        break;
      default:
        if (vale({ type: 'usarHabilidad' })) ofrecer({}, false);
    }
  }
  return p;
}
