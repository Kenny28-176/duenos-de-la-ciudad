// El sonido del juego, sintetizado con WebAudio: no hay archivos de audio (no pesan nada, no tienen derechos de nadie y suenan igual
// en cualquier idioma). Tiene tres partes:
//   - sonidoDeEvento(e): qué suena con cada evento del motor (función pura, se prueba sin navegador);
//   - SONIDOS: el catálogo, una receta por sonido que programa osciladores y ruido en un AudioContext;
//   - crearSonido(): el reproductor. Monta la cadena de salida (compresor, limitador suave y un poco de reverberación), guarda el
//     volumen y el silencio, y cumple lo que exigen los navegadores: el audio solo arranca después de que alguien toque la pantalla.
// Lo usan el tablero (src/ui/tablero/) y el celular (src/ui/jugador/, solo el aviso de «te toca»).

const MINIMO = 0.0001; // las rampas exponenciales no pueden llegar a cero

// --- Piezas de síntesis ----------------------------------------------------------------------------------------------------

const ruidos = new WeakMap();
// Un segundo de ruido blanco por contexto: todos los golpes y soplidos se cortan de ahí.
function bufferDeRuido(c) {
  if (!ruidos.has(c)) {
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ruidos.set(c, b);
  }
  return ruidos.get(c);
}

// Una nota: un oscilador con ataque rápido y caída exponencial. «f2» desliza la altura hasta ahí; «filtro» es un paso bajo
// opcional (quita lo áspero de las ondas de sierra y cuadradas). Devuelve el instante en que se apaga.
function nota(c, salida, t, { f, f2 = null, tipo = 'sine', vol = 0.2, ataque = 0.004, mantener = 0, caida = 0.25, filtro = 0, desafino = 0 }) {
  const fin = t + ataque + mantener + caida;
  const osc = c.createOscillator();
  osc.type = tipo;
  osc.frequency.setValueAtTime(f, t);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, fin);
  if (desafino) osc.detune.value = desafino;
  const g = c.createGain();
  g.gain.setValueAtTime(MINIMO, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ataque);
  if (mantener > 0) g.gain.setValueAtTime(vol, t + ataque + mantener);
  g.gain.exponentialRampToValueAtTime(MINIMO, fin);
  if (filtro) {
    const paso = c.createBiquadFilter();
    paso.type = 'lowpass';
    paso.frequency.value = filtro;
    osc.connect(paso);
    paso.connect(g);
  } else {
    osc.connect(g);
  }
  g.connect(salida);
  osc.start(t);
  osc.stop(fin + 0.03);
  return fin;
}

// Un soplido o un golpe seco: ruido que pasa por un filtro (que puede barrer de «f» a «f2»). Dura como mucho medio segundo.
function ruido(c, salida, t, { dur = 0.05, f = 2000, f2 = null, q = 1, tipo = 'bandpass', vol = 0.15, ataque = 0.002 }) {
  const fin = t + dur;
  const fuente = c.createBufferSource();
  fuente.buffer = bufferDeRuido(c);
  fuente.loop = true;
  const filtro = c.createBiquadFilter();
  filtro.type = tipo;
  filtro.Q.value = q;
  filtro.frequency.setValueAtTime(f, t);
  if (f2) filtro.frequency.exponentialRampToValueAtTime(f2, fin);
  const g = c.createGain();
  g.gain.setValueAtTime(MINIMO, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(MINIMO, fin);
  fuente.connect(filtro);
  filtro.connect(g);
  g.connect(salida);
  fuente.start(t, Math.random() * 0.5);
  fuente.stop(fin + 0.03);
  return fin;
}

// Una campanita metálica: parciales que no son múltiplos exactos de la nota (por eso suena a metal y no a flauta); los agudos se
// apagan antes. [razón con la nota, volumen, duración]
const PARCIALES = [[1, 1, 1], [2.76, 0.55, 0.6], [5.4, 0.3, 0.35], [8.93, 0.15, 0.2]];
function campana(c, salida, t, { f, vol = 0.2, caida = 0.8 }) {
  let fin = t;
  for (const [razon, v, d] of PARCIALES) {
    if (f * razon > 12000) continue;
    fin = Math.max(fin, nota(c, salida, t, { f: f * razon, vol: vol * v, ataque: 0.002, caida: caida * d }));
  }
  return fin;
}

// Monedas que caen (sube = false) o que se reciben (sube = true): tantas más cuanto mayor es la cantidad.
function monedas(c, salida, t, { n = 2, f, sube, vol = 0.14, cada = 0.07 }) {
  const fines = [];
  for (let k = 0; k < n; k++) {
    const fk = f * (sube ? 1 + 0.16 * k : 1 - 0.09 * k) * (0.97 + Math.random() * 0.06);
    fines.push(campana(c, salida, t + k * cada, { f: fk, vol: vol * (1 - 0.08 * k), caida: 0.2 + 0.04 * k }));
  }
  return Math.max(...fines);
}

// Cuántas monedas suenan para una cantidad: de 1 (hasta unos 50 $) a 4 (miles).
export const monedasDe = cantidad => Math.min(4, Math.max(1, 1 + Math.floor(Math.log10(Math.max(1, cantidad) / 20))));

const dura = (t, ...fines) => Math.max(...fines) - t;
// Cuánto se encoge el tiempo con la velocidad del tablero (a ×4 o más, un cuarto).
const ritmo = p => Math.min(1, Math.max(0.25, p.escala ?? 1));

// --- El catálogo -------------------------------------------------------------------------------------------------------------
// Cada receta es (contexto, nodo de salida, instante de inicio, parámetros) → duración en segundos.

export const SONIDOS = {
  // Dos dados que rebotan cada vez más espaciados y se asientan con un golpe seco.
  dados(c, s, t, p) {
    const k = ritmo(p);
    const fines = [];
    for (const gap0 of [0.034, 0.041]) {
      let x = 0;
      let gap = gap0;
      while (x < 0.8) {
        fines.push(ruido(c, s, t + x * k, { dur: 0.028, f: 1800 + Math.random() * 1800, q: 2.5, vol: 0.12 * (1 - x / 1.1) }));
        x += gap;
        gap *= 1.16;
      }
    }
    fines.push(ruido(c, s, t + 0.86 * k, { dur: 0.05, f: 300, q: 1.2, vol: 0.2 }), nota(c, s, t + 0.86 * k, { f: 150, f2: 60, vol: 0.2, caida: 0.1 }));
    return dura(t, ...fines);
  },
  // Un golpecito de madera cada vez que la ficha aterriza en una casilla.
  pasos(c, s, t, { n = 1, cada = 0.17 }) {
    const fines = [];
    for (let i = 1; i <= n; i++) {
      const x = t + Math.max(0, i * cada - 0.02);
      fines.push(nota(c, s, x, { f: 400 + (i % 2) * 60, f2: 200, vol: 0.13, ataque: 0.002, caida: 0.07 }), ruido(c, s, x, { dur: 0.025, f: 1500, q: 2, vol: 0.06 }));
    }
    return dura(t, ...fines);
  },
  turno: (c, s, t) => nota(c, s, t, { f: 660, vol: 0.07, caida: 0.2 }) - t,
  inicio: (c, s, t) => dura(t, ...[523.25, 659.25, 783.99].map((f, k) => nota(c, s, t + k * 0.1, { f, tipo: 'triangle', vol: 0.13, caida: 0.35 }))),
  // El sueldo: un chorrito de monedas con un «cha-ching» brillante.
  sueldo(c, s, t) {
    const fines = [ruido(c, s, t, { dur: 0.05, tipo: 'highpass', f: 5000, vol: 0.08 })];
    [2300, 3100, 2700, 3500].forEach((f, k) => fines.push(campana(c, s, t + 0.05 + k * 0.085, { f, vol: 0.15, caida: 0.35 })));
    return dura(t, ...fines);
  },
  cobro: (c, s, t, p) => monedas(c, s, t, { n: p.n ?? 2, f: 2600, sube: true }) - t,
  pago: (c, s, t, p) => monedas(c, s, t, { n: p.n ?? 2, f: 2000, sube: false, vol: 0.12 }) - t,
  // Una compra: el golpe del sello y una campanita (quinta justa) que invita a seguir.
  compra: (c, s, t) => dura(t,
    nota(c, s, t, { f: 170, f2: 70, vol: 0.28, caida: 0.12 }),
    ruido(c, s, t, { dur: 0.05, f: 800, q: 1, vol: 0.14 }),
    campana(c, s, t + 0.06, { f: 1046.5, vol: 0.17, caida: 0.9 }),
    campana(c, s, t + 0.14, { f: 1568, vol: 0.13, caida: 1.0 })),
  // Tres martillazos y, si es una torre, un acorde de campanitas que sube.
  construir(c, s, t, { torre = false }) {
    const fines = [];
    for (const x of [0, 0.15, 0.31]) {
      fines.push(ruido(c, s, t + x, { dur: 0.045, f: 750, q: 3, vol: 0.28 }), nota(c, s, t + x, { f: 230, f2: 85, tipo: 'triangle', vol: 0.26, caida: 0.09 }));
    }
    if (torre) [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => fines.push(campana(c, s, t + 0.5 + k * 0.08, { f, vol: 0.12, caida: 0.8 })));
    return dura(t, ...fines);
  },
  // Una carta que se da la vuelta: el roce del papel y un toquecito.
  carta: (c, s, t) => dura(t,
    ruido(c, s, t, { dur: 0.24, f: 4200, f2: 900, q: 0.9, vol: 0.14, ataque: 0.03 }),
    nota(c, s, t + 0.22, { f: 1100, vol: 0.06, caida: 0.04 })),
  // La puerta de hierro de la celda y el cerrojo.
  calabozo: (c, s, t) => dura(t,
    campana(c, s, t, { f: 150, vol: 0.2, caida: 1.4 }),
    ruido(c, s, t, { dur: 0.12, f: 400, q: 0.8, vol: 0.2 }),
    nota(c, s, t + 0.3, { f: 1500, f2: 900, tipo: 'square', vol: 0.05, caida: 0.03 }),
    nota(c, s, t + 0.4, { f: 1300, f2: 800, tipo: 'square', vol: 0.05, caida: 0.03 })),
  libre: (c, s, t) => dura(t,
    nota(c, s, t, { f: 1700, f2: 1100, tipo: 'square', vol: 0.04, caida: 0.03 }),
    nota(c, s, t + 0.12, { f: 392, tipo: 'triangle', vol: 0.16, caida: 0.3 }),
    nota(c, s, t + 0.24, { f: 523.25, tipo: 'triangle', vol: 0.16, caida: 0.5 })),
  // La campanilla que abre la subasta.
  subasta: (c, s, t) => dura(t, campana(c, s, t, { f: 1318.5, vol: 0.16, caida: 1 }), campana(c, s, t + 0.24, { f: 1318.5, vol: 0.16, caida: 1.1 })),
  // Cada puja suena un peldaño más alto que la anterior.
  puja(c, s, t, { n = 0 }) {
    const f = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5][Math.min(n, 7)];
    return dura(t, nota(c, s, t, { f, tipo: 'triangle', vol: 0.14, caida: 0.2 }), nota(c, s, t, { f: f * 2, vol: 0.04, caida: 0.1 }));
  },
  // Adjudicado: dos martillazos y una campanita.
  martillo(c, s, t) {
    const fines = [];
    for (const x of [0, 0.22]) {
      fines.push(ruido(c, s, t + x, { dur: 0.05, f: 900, q: 3, vol: 0.34 }), nota(c, s, t + x, { f: 210, f2: 80, tipo: 'triangle', vol: 0.3, caida: 0.1 }));
    }
    fines.push(campana(c, s, t + 0.4, { f: 1046.5, vol: 0.14, caida: 0.9 }), campana(c, s, t + 0.46, { f: 1318.5, vol: 0.1, caida: 0.9 }));
    return dura(t, ...fines);
  },
  desierta: (c, s, t) => dura(t,
    nota(c, s, t, { f: 392, tipo: 'triangle', vol: 0.14, caida: 0.25 }),
    nota(c, s, t + 0.2, { f: 311.13, tipo: 'triangle', vol: 0.14, caida: 0.5 })),
  // La cinta de cotizaciones: cinco pitidos que suben (compra de acciones) o bajan (venta).
  bolsaSube: (c, s, t) => cinta(c, s, t, [0, 1, 2, 3, 4]),
  bolsaBaja: (c, s, t) => cinta(c, s, t, [4, 3, 2, 1, 0]),
  mensaje: (c, s, t) => dura(t,
    nota(c, s, t, { f: 784, tipo: 'triangle', vol: 0.12, caida: 0.18 }),
    nota(c, s, t + 0.11, { f: 1046.5, tipo: 'triangle', vol: 0.12, caida: 0.35 })),
  acuerdo: (c, s, t) => dura(t, campana(c, s, t, { f: 659.25, vol: 0.13, caida: 0.7 }), campana(c, s, t + 0.13, { f: 987.77, vol: 0.13, caida: 0.9 })),
  rechazo: (c, s, t) => dura(t, ...[0, 0.2].map(x => nota(c, s, t + x, { f: 196, f2: 160, tipo: 'sawtooth', vol: 0.1, caida: 0.16, filtro: 700 }))),
  // Una habilidad: destellos que suben por la escala pentatónica.
  habilidad(c, s, t) {
    const fines = [880, 987.77, 1174.66, 1318.51, 1567.98, 1760].map((f, k) => nota(c, s, t + k * 0.06, { f, vol: 0.1, caida: 0.35 }));
    fines.push(ruido(c, s, t, { dur: 0.4, tipo: 'highpass', f: 6500, vol: 0.04, ataque: 0.1 }));
    return dura(t, ...fines);
  },
  alerta: (c, s, t) => dura(t, ...[0, 0.2].map(x => nota(c, s, t + x, { f: 247, tipo: 'triangle', vol: 0.2, caida: 0.14 }))),
  // Una quiebra: un trombón que se hunde y un golpe grave.
  quiebra: (c, s, t) => dura(t,
    nota(c, s, t, { f: 330, f2: 80, tipo: 'sawtooth', vol: 0.2, caida: 1, filtro: 800 }),
    nota(c, s, t + 0.9, { f: 90, f2: 45, vol: 0.3, caida: 0.35 }),
    campana(c, s, t, { f: 110, vol: 0.1, caida: 1.2 })),
  meta: (c, s, t) => dura(t,
    ...[523.25, 659.25, 783.99, 1046.5].map((f, k) => nota(c, s, t + k * 0.09, { f, tipo: 'triangle', vol: 0.14, caida: 0.35 })),
    campana(c, s, t + 0.36, { f: 1568, vol: 0.12, caida: 1 })),
  // Un gong grave: se acabó el tiempo, esta es la última ronda.
  gong: (c, s, t) => dura(t,
    campana(c, s, t, { f: 196, vol: 0.2, caida: 1.8 }),
    campana(c, s, t + 0.02, { f: 392, vol: 0.08, caida: 1.4 }),
    ruido(c, s, t, { dur: 0.15, f: 350, q: 0.8, vol: 0.12 })),
  sello: (c, s, t) => dura(t,
    nota(c, s, t, { f: 140, f2: 60, vol: 0.28, caida: 0.1 }),
    ruido(c, s, t, { dur: 0.04, f: 600, q: 1, vol: 0.15 }),
    campana(c, s, t + 0.05, { f: 700, vol: 0.06, caida: 0.4 })),
  // El final: tres notas cortas de metal y un acorde mayor largo, con una campanita encima.
  victoria(c, s, t) {
    const fines = [];
    const metal = (x, f, caida, vol) => {
      for (const desafino of [-7, 7]) fines.push(nota(c, s, t + x, { f, tipo: 'sawtooth', vol: vol / 2, ataque: 0.02, caida, filtro: 2200, desafino }));
    };
    [0, 0.16, 0.32].forEach(x => metal(x, 392, 0.14, 0.13));
    [523.25, 659.25, 783.99].forEach(f => metal(0.52, f, 1.1, 0.16));
    fines.push(campana(c, s, t + 0.52, { f: 1046.5, vol: 0.14, caida: 1.4 }));
    return dura(t, ...fines);
  },
  // Para el celular: «te toca».
  miTurno: (c, s, t) => dura(t, campana(c, s, t, { f: 880, vol: 0.12, caida: 0.7 }), campana(c, s, t + 0.16, { f: 1318.5, vol: 0.12, caida: 0.9 })),
};

function cinta(c, s, t, escalones) {
  return dura(t, ...escalones.map((k, i) => nota(c, s, t + i * 0.055, { f: 600 * 1.14 ** k, tipo: 'square', vol: 0.05, caida: 0.05, filtro: 2600 })));
}

// --- Qué suena con cada evento ------------------------------------------------------------------------------------------------

// Los movimientos de dinero que ya suenan con su propio evento (la compra, la obra, el sueldo…) no suenan dos veces.
const DINERO_CON_SONIDO_PROPIO = new Set(['inicial', 'sueldo', 'compra', 'construir', 'venta-edificios', 'hipoteca', 'deshipoteca', 'acciones', 'subasta', 'trato', 'bancarrota']);

// El sonido de un evento del motor: { nombre, prioridad, …datos } o null si no suena. «prioridad» 2 es lo principal; con el tablero
// muy acelerado solo suena eso.
export function sonidoDeEvento(e) {
  switch (e.type) {
    case 'empieza': return { nombre: 'inicio', prioridad: 2 };
    case 'turno': return { nombre: 'turno', prioridad: 1 };
    case 'dados': return { nombre: 'dados', prioridad: 2 };
    case 'mover': return { nombre: 'pasos', n: e.camino.length, atras: Boolean(e.atras), prioridad: 1 };
    case 'salida': return { nombre: 'sueldo', prioridad: 2 };
    case 'dinero':
      if (DINERO_CON_SONIDO_PROPIO.has(e.motivo) || !(e.cantidad > 0)) return null;
      return { nombre: e.de === 'banco' ? 'cobro' : 'pago', cantidad: e.cantidad, prioridad: 1 };
    case 'compra': return { nombre: 'compra', prioridad: 2 };
    case 'carta': return { nombre: 'carta', prioridad: 2 };
    case 'construir': return { nombre: 'construir', torre: e.nivel === 5, prioridad: 2 };
    case 'venderEdificio': return { nombre: 'cobro', cantidad: e.cantidad, prioridad: 1 };
    case 'hipotecar':
    case 'deshipotecar': return { nombre: 'sello', prioridad: 1 };
    case 'subasta': return { nombre: 'subasta', prioridad: 2 };
    case 'puja': return { nombre: 'puja', prioridad: 1 };
    case 'subastaGanada': return { nombre: 'martillo', prioridad: 2 };
    case 'subastaDesierta': return { nombre: 'desierta', prioridad: 1 };
    case 'accionesCompradas': return { nombre: 'bolsaSube', prioridad: 1 };
    case 'accionesVendidas': return { nombre: 'bolsaBaja', prioridad: 1 };
    case 'tratoPropuesto': return { nombre: 'mensaje', prioridad: 1 };
    case 'tratoAceptado': return { nombre: 'acuerdo', prioridad: 2 };
    case 'tratoRechazado':
    case 'tratoCancelado': return { nombre: 'rechazo', prioridad: 1 };
    case 'habilidad':
    case 'frenesi': return { nombre: 'habilidad', prioridad: 2 };
    case 'alCalabozo': return { nombre: 'calabozo', prioridad: 2 };
    case 'saleDelCalabozo': return { nombre: 'libre', prioridad: 2 };
    case 'deuda': return { nombre: 'alerta', prioridad: 2 };
    case 'deudaPagada': return { nombre: 'cobro', cantidad: e.cantidad, prioridad: 1 };
    case 'bancarrota': return { nombre: 'quiebra', prioridad: 2 };
    case 'pierdeTurno':
    case 'rachaPerdida': return { nombre: 'desierta', prioridad: 1 };
    case 'rachaFinal': return { nombre: 'meta', prioridad: 2 };
    case 'ultimaRonda': return { nombre: 'gong', prioridad: 2 };
    case 'fin': return { nombre: 'victoria', prioridad: 2 };
    default: return null;
  }
}

// --- La cadena de salida y el reproductor ---------------------------------------------------------------------------------

// Un eco corto y suave (ruido que se apaga) para que los sonidos no suenen «secos» como un pitido de ordenador.
function impulso(c, segundos) {
  const n = Math.floor(c.sampleRate * segundos);
  const b = c.createBuffer(2, n, c.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const d = b.getChannelData(canal);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  }
  return b;
}

// Todos los sonidos entran por «entrada» y salen por un compresor (para que varios a la vez no se pisen), un limitador suave (que
// nunca deja pasar de 1, para no dañar los altavoces) y el volumen general.
export function crearCadena(c, volumen = 0.8) {
  const entrada = c.createGain();
  const compresor = c.createDynamicsCompressor();
  compresor.threshold.value = -16;
  compresor.knee.value = 18;
  compresor.ratio.value = 5;
  compresor.attack.value = 0.004;
  compresor.release.value = 0.2;
  const curva = new Float32Array(2048);
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh((i / (curva.length - 1)) * 2 - 1);
  const limitador = c.createWaveShaper();
  limitador.curve = curva;
  const maestro = c.createGain();
  maestro.gain.value = volumen;
  const eco = c.createConvolver();
  eco.buffer = impulso(c, 0.55);
  const humedo = c.createGain();
  humedo.gain.value = 0.14;
  entrada.connect(compresor);
  entrada.connect(eco);
  eco.connect(humedo);
  humedo.connect(compresor);
  compresor.connect(limitador);
  limitador.connect(maestro);
  maestro.connect(c.destination);
  return { entrada, maestro };
}

const contextoDelNavegador = () => {
  const Clase = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Clase ? new Clase() : null;
};

// El reproductor. «crearContexto» se puede cambiar para las pruebas. Nada suena hasta que alguien llama a desbloquear() desde un
// toque de pantalla o una tecla (los navegadores no dejan sonar antes), y un sonido que falla nunca estropea la partida.
export function crearSonido({ crearContexto = contextoDelNavegador, volumen = 0.9, activo = true } = {}) {
  let contexto = null;
  let cadena = null;
  let imposible = false; // el navegador no tiene audio: no se insiste
  let pujas = 0;
  let sonaron = 0; // cuántos sonidos se han programado (para las pruebas y para depurar)
  const ultimo = new Map();

  const listo = () => activo && contexto !== null && contexto.state === 'running';

  function reproducir(nombre, p = {}) {
    const receta = SONIDOS[nombre];
    if (!receta || !listo()) return false;
    const ahora = contexto.currentTime;
    // Un mismo sonido no se repite en menos de 70 ms: el dividendo de varios accionistas sonaría como una sola ráfaga.
    if (ultimo.has(nombre) && ahora - ultimo.get(nombre) < 0.07) return false;
    ultimo.set(nombre, ahora);
    try {
      receta(contexto, cadena.entrada, ahora + 0.02, p);
      sonaron++;
      return true;
    } catch {
      return false;
    }
  }

  // Crea el audio (o lo reanuda si el navegador lo suspendió). Devuelve true si ya hay audio. Hay que llamarlo desde un gesto.
  function desbloquear() {
    if (imposible) return false;
    try {
      if (!contexto) {
        contexto = crearContexto();
        if (!contexto) {
          imposible = true;
          return false;
        }
        cadena = crearCadena(contexto, volumen);
      }
      if (contexto.state !== 'running') contexto.resume?.()?.catch?.(() => {});
      return true;
    } catch {
      imposible = true;
      contexto = null;
      return false;
    }
  }

  return {
    reproducir,
    desbloquear,
    // Como desbloquear(), pero espera a que el audio esté en marcha: para sonar justo en el primer toque.
    async activar() {
      if (!desbloquear()) return false;
      try { await contexto.resume?.(); } catch { /* el navegador no lo deja */ }
      return listo();
    },
    // El sonido de un evento del motor. «velocidad» es la del tablero: muy acelerado, solo suena lo principal.
    evento(e, { velocidad = 1 } = {}) {
      const s = sonidoDeEvento(e);
      if (!s || (velocidad >= 4 && s.prioridad < 2)) return false;
      const p = { ...s, escala: Math.min(1, Math.max(0.25, 1 / velocidad)) };
      if (s.nombre === 'subasta') pujas = 0;
      if (s.nombre === 'puja') p.n = pujas++;
      if (s.nombre === 'pasos') p.cada = (s.atras ? 0.12 : 0.17) / velocidad;
      if (s.nombre === 'cobro' || s.nombre === 'pago') p.n = monedasDe(s.cantidad);
      return reproducir(s.nombre, p);
    },
    // Un toque de prueba, para oír al activar el sonido.
    probar: () => reproducir('cobro', { n: 2 }),
    poner(valor) { activo = Boolean(valor); },
    volumen(valor) {
      volumen = Math.min(1, Math.max(0, valor));
      if (cadena) cadena.maestro.gain.value = volumen;
    },
    estado: () => ({ activo, volumen, listo: listo(), sonaron }),
  };
}
