// Máquina de estados de la partida. Todo es puro: paso(ctx, estado, acción) → { state, events, error }.
// El estado es JSON plano (se guardará en Firebase). El tablero (la laptop o tablet) es quien llama a paso(): los
// celulares solo envían acciones. Las reglas están en docs/DISENO.md.
import { MAX_JUGADORES, MIN_JUGADORES } from './contexto.js';
import { cargar, cobrar, deudorActivo, resolverDeudas, transferir } from './dinero.js';
import { dado, shuffle } from './rng.js';
import { cerrarSubasta, iniciarSubasta, pujar, retirarse } from './subasta.js';
import { actualizarRachas, finDeTurno, iniciarTurno, irAlCalabozo, mover, pasarTurno, seguir } from './turno.js';
import { comprarAcciones, construir, deshipotecar, hipotecar, venderAcciones, venderEdificio } from './gestion.js';
import { aceptarTrato, proponerTrato, rechazarTrato } from './tratos.js';
import { quebrar } from './quiebra.js';
import { usarHabilidad } from './habilidades.js';

// Opciones de la sala (docs/DISENO.md, sección 9). «dadosDePrueba» deja elegir los dados: solo para las pruebas.
// «limiteMinutos» (null = sin límite) lo vigila el tablero, que lleva el reloj: el motor no sabe qué hora es, solo aplica
// finPorTiempo cuando el tablero se lo pide.
export const OPCIONES = {
  meta: 10000, mercado: true, subastas: true, habilidades: true, partidaRapida: false, dadosDePrueba: false, limiteMinutos: null,
};
export const MAX_LIMITE_MINUTOS = 600;
export { MAX_JUGADORES };

const err = (state, codigo, mensaje, datos = {}) => ({ state, events: [], error: { codigo, mensaje, datos } });
// Un error de una acción: su código, el mensaje en español (para los registros) y los datos con los que la interfaz
// lo traduce. «variante» distingue los distintos mensajes de un mismo código.
const no = (codigo, mensaje, datos = {}) => ({ codigo, mensaje, datos });

export function nuevaPartida(ctx, { sala = null, semilla = Date.now() } = {}) {
  return {
    v: 1,
    sala,
    rng: semilla >>> 0,
    fase: 'sala', // sala → juego → fin
    opciones: { ...OPCIONES },
    ids: [],
    jugadores: {},
    orden: [],
    props: {},
    banco: { ...ctx.eco.existencias },
    bolsa: {},
    mazos: { noticias: [], fortuna: [] },
    efectos: [],
    tratos: {},
    siguienteTrato: 1,
    subasta: null,
    subastasPendientes: [],
    deudas: [],
    turno: null,
    ronda: 0,
    turnos: 0,
    ultimaRonda: false,
    enRacha: {},
    ganador: null,
    motivoFin: null,
  };
}

const nuevoJugador = (id, nombre, bot) => ({
  id, nombre, ficha: null, ...(bot ? { bot: true } : {}),
  dinero: 0, casilla: 0, calabozo: null, salvoconductos: 0, quebrado: false, acciones: {},
  marcado: false, pierdeTurno: false,
  hab: { enfriamiento: 0, ultimoObjetivo: null, prestamo: null, peajeRonda: 0 },
});

// --- Sala ----------------------------------------------------------------------------------------------

function unirse(ctx, s, a) {
  if (s.fase !== 'sala') return no('empezada', 'La partida ya empezó.');
  if (typeof a.id !== 'string' || !a.id || a.id.length > 40) return no('id', 'Identificador no válido.');
  if (s.jugadores[a.id]) return no('repetido', 'Ya estás en la sala.');
  const nombre = String(a.nombre ?? '').trim();
  if (!nombre || nombre.length > 24) return no('nombre', 'Escribe un nombre de 1 a 24 letras.');
  if (s.ids.some(id => s.jugadores[id].nombre.toLowerCase() === nombre.toLowerCase())) {
    return no('nombre_repetido', 'Ya hay alguien con ese nombre.');
  }
  if (s.ids.length >= MAX_JUGADORES) return no('llena', `La sala está llena (máximo ${MAX_JUGADORES}).`, { maximo: MAX_JUGADORES });
  s.ids.push(a.id);
  s.jugadores[a.id] = nuevoJugador(a.id, nombre, a.bot);
  if (a.ficha) {
    const fallo = elegirFicha(ctx, s, { id: a.id, ficha: a.ficha });
    if (fallo) return fallo;
  }
  return undefined;
}

function elegirFicha(ctx, s, a) {
  if (s.fase !== 'sala') return no('empezada', 'La partida ya empezó.');
  if (!s.jugadores[a.id]) return no('jugador', 'No estás en la sala.', { variante: 'sala' });
  if (!ctx.fichas[a.ficha]) return no('ficha', 'Esa ficha no existe.');
  if (s.ids.some(id => id !== a.id && s.jugadores[id].ficha === a.ficha)) return no('ficha_ocupada', 'Esa ficha ya la tiene otro jugador.');
  s.jugadores[a.id].ficha = a.ficha;
  return undefined;
}

function salir(ctx, s, a) {
  if (s.fase !== 'sala') return no('empezada', 'La partida ya empezó.');
  if (!s.jugadores[a.id]) return no('jugador', 'No estás en la sala.', { variante: 'sala' });
  s.ids = s.ids.filter(id => id !== a.id);
  delete s.jugadores[a.id];
  return undefined;
}

function configurar(ctx, s, a) {
  if (s.fase !== 'sala') return no('empezada', 'La partida ya empezó.');
  const o = a.opciones ?? {};
  if ('meta' in o && o.meta !== null && !(Number.isInteger(o.meta) && o.meta > 0)) return no('meta', 'La meta tiene que ser una cantidad positiva o ninguna.');
  if ('limiteMinutos' in o && o.limiteMinutos !== null && !(Number.isInteger(o.limiteMinutos) && o.limiteMinutos > 0 && o.limiteMinutos <= MAX_LIMITE_MINUTOS)) {
    return no('limite', 'El límite de tiempo tiene que ser una cantidad de minutos (un número entero) o ninguno.', { maximo: MAX_LIMITE_MINUTOS });
  }
  for (const clave of Object.keys(o)) {
    if (!(clave in OPCIONES)) return no('opcion', `Opción desconocida: ${clave}`, { variante: 'desconocida', clave });
    if (clave !== 'meta' && clave !== 'limiteMinutos' && typeof o[clave] !== 'boolean') return no('opcion', `La opción ${clave} es sí o no.`, { variante: 'booleana', clave });
  }
  Object.assign(s.opciones, o);
  return undefined;
}

function empezar(ctx, s, a, ev) {
  if (s.fase !== 'sala') return no('empezada', 'La partida ya empezó.');
  if (s.ids.length < MIN_JUGADORES) return no('pocos', `Hacen falta al menos ${MIN_JUGADORES} jugadores.`, { minimo: MIN_JUGADORES });
  const libres = shuffle(s, Object.keys(ctx.fichas).filter(f => !s.ids.some(id => s.jugadores[id].ficha === f)));
  for (const id of s.ids) if (!s.jugadores[id].ficha) s.jugadores[id].ficha = libres.shift();
  s.orden = shuffle(s, s.ids);
  for (const i of ctx.propiedades) s.props[i] = { dueno: null, nivel: 0, hipotecada: false };
  for (const b of Object.keys(ctx.barrios)) s.bolsa[b] = { ajuste: 0 };
  for (const mazo of ['noticias', 'fortuna']) {
    s.mazos[mazo] = shuffle(s, ctx.mazos[mazo].filter(id => s.opciones.mercado || !ctx.cartas[id].mercado));
  }
  s.fase = 'juego';
  s.ronda = 1;
  ev.push({ type: 'empieza', orden: [...s.orden] });
  for (const id of s.orden) cobrar(s, ev, id, ctx.eco.dineroInicial, 'inicial');
  if (s.opciones.partidaRapida) {
    const calles = shuffle(s, ctx.propiedades.filter(i => ctx.casillas[i].tipo === 'calle'));
    for (let ronda = 0; ronda < 2; ronda++) {
      for (const id of s.orden) {
        const i = calles.shift();
        s.props[i].dueno = id;
        ev.push({ type: 'reparto', id, casilla: i });
      }
    }
  }
  iniciarTurno(ctx, s, ev, s.orden[0]);
  return undefined;
}

// --- Turno ------------------------------------------------------------------------------------------------

function tirar(ctx, s, a, ev) {
  const t = s.turno;
  const j = s.jugadores[a.id];
  if (t.fase !== 'inicio') return no('fase', 'Ahora no toca tirar.', { variante: 'tirar' });
  let dados;
  if (a.dados && s.opciones.dadosDePrueba) dados = [...a.dados];
  else dados = [dado(s), dado(s)];
  if (t.esprint && dados.length < 3) dados.push(a.dados && s.opciones.dadosDePrueba ? 1 : dado(s));
  t.esprint = false;
  t.dados = dados;
  const total = dados.reduce((x, y) => x + y, 0);
  const dobles = dados[0] === dados[1];
  ev.push({ type: 'dados', id: a.id, dados });
  if (j.calabozo) {
    t.repite = false;
    if (dobles) {
      j.calabozo = null;
      ev.push({ type: 'saleDelCalabozo', id: a.id, como: 'dobles' });
    } else if (++j.calabozo.intentos >= 3) {
      j.calabozo = null;
      ev.push({ type: 'saleDelCalabozo', id: a.id, como: 'fianza' });
      cargar(s, ev, a.id, 'banco', ctx.eco.fianza, 'fianza');
    } else {
      t.fase = 'gestion';
      return undefined;
    }
  } else if (dobles) {
    t.dobles++;
    if (t.dobles === 3) {
      irAlCalabozo(ctx, s, ev, a.id, 'tres-dobles');
      seguir(ctx, s);
      return undefined;
    }
    t.repite = true;
  } else {
    t.repite = false;
  }
  mover(ctx, s, ev, a.id, total);
  seguir(ctx, s);
  return undefined;
}

function comprar(ctx, s, a, ev) {
  const t = s.turno;
  if (t.compra == null) return no('fase', 'No hay nada que comprar.', { variante: 'comprar' });
  const i = t.compra;
  const precio = ctx.casillas[i].precio;
  if (s.jugadores[a.id].dinero < precio) return no('sin_dinero', `Cuesta ${precio} $.`, { coste: precio });
  transferir(s, ev, a.id, 'banco', precio, 'compra');
  s.props[i].dueno = a.id;
  t.compra = null;
  ev.push({ type: 'compra', id: a.id, casilla: i, precio });
  seguir(ctx, s);
  return undefined;
}

function noComprar(ctx, s, a, ev) {
  const t = s.turno;
  if (t.compra == null) return no('fase', 'No hay nada que comprar.', { variante: 'comprar' });
  const i = t.compra;
  t.compra = null;
  ev.push({ type: 'noCompra', id: a.id, casilla: i });
  if (s.opciones.subastas) iniciarSubasta(ctx, s, ev, [i], 'compra');
  seguir(ctx, s);
  return undefined;
}

function pagarFianza(ctx, s, a, ev) {
  const j = s.jugadores[a.id];
  if (s.turno.fase !== 'inicio' || !j.calabozo) return no('calabozo', 'No estás en el Calabozo.');
  if (j.dinero < ctx.eco.fianza) return no('sin_dinero', `La fianza cuesta ${ctx.eco.fianza} $.`, { coste: ctx.eco.fianza });
  transferir(s, ev, a.id, 'banco', ctx.eco.fianza, 'fianza');
  j.calabozo = null;
  ev.push({ type: 'saleDelCalabozo', id: a.id, como: 'fianza' });
  return undefined;
}

function usarSalvoconducto(ctx, s, a, ev) {
  const j = s.jugadores[a.id];
  if (s.turno.fase !== 'inicio' || !j.calabozo) return no('calabozo', 'No estás en el Calabozo.');
  if (!j.salvoconductos) return no('salvoconducto', 'No tienes ningún salvoconducto.');
  j.salvoconductos--;
  s.mazos.fortuna.push(ctx.salvoconducto);
  j.calabozo = null;
  ev.push({ type: 'saleDelCalabozo', id: a.id, como: 'salvoconducto' });
  return undefined;
}

function terminarTurno(ctx, s, a, ev) {
  if (s.turno.fase !== 'gestion') return no('fase', 'Todavía no puedes terminar el turno.', { variante: 'terminar' });
  finDeTurno(ctx, s, ev, a.id);
  pasarTurno(ctx, s, ev);
  return undefined;
}

function declararBancarrota(ctx, s, a, ev) {
  if (deudorActivo(s) !== a.id) return no('sin_deuda', 'Solo puede declararse en bancarrota quien tiene una deuda pendiente.');
  quebrar(ctx, s, ev, a.id, s.deudas[0].acreedor);
  return undefined;
}

// Se acabó el tiempo: se juega la ronda en curso (todos acaban su turno) y gana el mayor patrimonio. Anunciarlo dos veces no cambia nada.
function finPorTiempo(ctx, s, a, ev) {
  if (s.ultimaRonda) return undefined;
  s.ultimaRonda = true;
  ev.push({ type: 'ultimaRonda' });
  return undefined;
}

// Otra partida con los mismos jugadores (con su nombre, su ficha y si son bots) y las mismas opciones: vuelve a la sala, con el
// azar donde lo dejó la anterior, y quien manda en la sala puede cambiar las opciones y empezar.
function revancha(ctx, s) {
  const jugadores = s.ids.map(id => ({ id, nombre: s.jugadores[id].nombre, ficha: s.jugadores[id].ficha, bot: s.jugadores[id].bot === true }));
  const nueva = { ...nuevaPartida(ctx, { sala: s.sala, semilla: s.rng }), opciones: { ...s.opciones } };
  for (const clave of Object.keys(s)) delete s[clave];
  Object.assign(s, nueva);
  for (const j of jugadores) {
    s.ids.push(j.id);
    s.jugadores[j.id] = { ...nuevoJugador(j.id, j.nombre, j.bot), ficha: j.ficha };
  }
  return undefined;
}

// --- Quién puede hacer qué y cuándo -------------------------------------------------------------------------

// Cuándo se puede pedir cada acción de juego:
//   turno     solo quien tiene el turno, sin subasta ni deudas pendientes
//   gestion   quien tiene el turno (como «turno») o quien debe dinero (para reunirlo)
//   subasta   durante una subasta
//   trato     cualquiera que siga en la partida, salvo durante una subasta
//   deudor    quien tiene la deuda pendiente
//   anfitrion el tablero (los celulares no pueden mandarlas: lo filtra el controlador)
const ACCIONES = {
  unirse: { sala: unirse },
  elegirFicha: { sala: elegirFicha },
  salir: { sala: salir },
  configurar: { sala: configurar },
  empezar: { sala: empezar },
  tirar: { turno: tirar },
  comprar: { turno: comprar },
  noComprar: { turno: noComprar },
  pagarFianza: { turno: pagarFianza },
  usarSalvoconducto: { turno: usarSalvoconducto },
  usarHabilidad: { turno: usarHabilidad },
  construir: { turno: construir },
  deshipotecar: { turno: deshipotecar },
  comprarAcciones: { turno: comprarAcciones, bolsa: true },
  terminarTurno: { turno: terminarTurno },
  venderEdificio: { gestion: venderEdificio },
  hipotecar: { gestion: hipotecar },
  venderAcciones: { gestion: venderAcciones },
  pujar: { subasta: pujar },
  retirarse: { subasta: retirarse },
  cerrarSubasta: { anfitrion: cerrarSubasta },
  proponerTrato: { trato: proponerTrato },
  aceptarTrato: { trato: aceptarTrato },
  rechazarTrato: { trato: rechazarTrato },
  declararBancarrota: { deudor: declararBancarrota },
  finPorTiempo: { anfitrion: finPorTiempo },
  revancha: { fin: revancha },
};

function permiso(ctx, s, regla, a) {
  if (regla.sala) return null;
  if (regla.fin) return s.fase === 'fin' ? null : no('no_ha_terminado', 'La partida todavía no ha terminado.');
  if (s.fase !== 'juego') return no('fuera_de_juego', s.fase === 'sala' ? 'La partida no ha empezado.' : 'La partida ha terminado.', { variante: s.fase === 'sala' ? 'sala' : 'fin' });
  if (regla.anfitrion) return null;
  const j = s.jugadores[a.id];
  if (!j || j.quebrado) return no('jugador', 'No estás en la partida.', { variante: 'partida' });
  if (regla.subasta) return null;
  if (s.subasta) return no('subasta', 'Hay una subasta en marcha.');
  if (regla.trato) return null;
  const deudor = deudorActivo(s);
  if (regla.deudor) return null;
  if (regla.gestion && deudor === a.id) return null;
  if (s.turno.id !== a.id) return no('no_es_tu_turno', 'No es tu turno.');
  if (deudor) return no('deuda', 'Hay una deuda pendiente.');
  if ((regla.gestion || regla.bolsa || regla.turno === construir || regla.turno === deshipotecar)
    && !['inicio', 'compra', 'gestion'].includes(s.turno.fase)) {
    return no('fase', 'Ahora no se puede.');
  }
  if (regla.bolsa && (!s.opciones.mercado || !s.turno.bolsaAbierta)) {
    return no('bolsa_cerrada', 'Solo se compran acciones al pasar por la Salida o al caer en la Bolsa o la Agencia.');
  }
  return null;
}

export function paso(ctx, estado, accion) {
  const regla = ACCIONES[accion?.type];
  if (!regla) return err(estado, 'accion', `Acción desconocida: ${accion?.type}`, { tipo: String(accion?.type) });
  const fallo = permiso(ctx, estado, regla, accion);
  if (fallo) return err(estado, fallo.codigo, fallo.mensaje, fallo.datos);
  const s = structuredClone(estado);
  const ev = [];
  const manejador = Object.values(regla).find(v => typeof v === 'function');
  const error = manejador(ctx, s, accion, ev);
  if (error) return err(estado, error.codigo, error.mensaje, error.datos);
  if (s.fase === 'juego') {
    resolverDeudas(s, ev);
    actualizarRachas(ctx, s, ev);
  }
  return { state: s, events: ev, error: null };
}
