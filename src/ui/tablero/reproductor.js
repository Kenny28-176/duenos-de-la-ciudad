// El reproductor de la partida (la de demostración o la de verdad con celulares). Pide un paso a su fuente (la demo de
// src/ui/tablero/demo.js o la orquesta de src/net/orquesta.js: las dos tienen paso() y estado()), cuenta y anima sus
// eventos uno detrás de otro (los dados que ruedan, la ficha que camina, el dinero que sube y baja, las cartas, las
// subastas…) y, al terminar el paso, deja la pantalla igual que el estado del motor. Así las cosas se ven en el orden en
// que pasan, no todas de golpe. La velocidad y la pausa vienen del almacén (almacen.js).
import { datosDeCarta, preciosActuales } from './vista.js';

const espera = ms => new Promise(listo => setTimeout(listo, ms));

// Cuánto dura el aviso de cada tipo de evento (en milisegundos a velocidad normal) y de qué clase es.
const AVISOS = {
  habilidad: [1700, 'habilidad'], alCalabozo: [1500, 'calabozo'], saleDelCalabozo: [1000, 'calabozo'], pierdeTurno: [1400, 'habilidad'],
  frenesi: [1400, 'habilidad'], bancarrota: [2200, 'malo'], rachaFinal: [2000, 'bueno'], rachaPerdida: [1200, 'malo'],
  tratoAceptado: [1200, 'neutro'], prestamoDevuelto: [900, 'neutro'], deuda: [1200, 'malo'],
};

// demo: crearDemo(); almacen: el almacén de la pantalla; capas: () → las capas del tablero de ahora (crearCapas; cambian
// si se vuelve a dibujar el tablero); narrador: () → el narrador del idioma actual (crearNarrador); nombreBarrio:
// traduce un barrio.
// despuesDePaso(paso, estado), si se da, se llama al terminar de animar cada paso: la partida con celulares publica ahí el
// resultado, para que los celulares lo vean cuando acaba la animación y no antes.
export function crearReproductor({ motor, demo, almacen, capas, narrador, nombreBarrio, despuesDePaso = null }) {
  let contador = 0;
  let parado = false;
  let reanudar = null;

  const velocidad = () => almacen.leer().velocidad;
  // Las esperas de menos de un milisegundo (solo con velocidades enormes, en las pruebas) se saltan.
  const pausa = ms => (ms / velocidad() < 1 ? Promise.resolve() : espera(ms / velocidad()));

  async function aviso(texto, ms, tipo) {
    const clave = ++contador;
    almacen.cambiar({ aviso: { texto, tipo, clave } });
    await pausa(ms);
    if (almacen.leer().aviso?.clave === clave) almacen.cambiar({ aviso: null });
  }

  // Lo que hace falta mostrar de cada evento, además de contarlo en el registro. Cada uno devuelve una promesa que se
  // cumple cuando se puede pasar al siguiente. «texto» es la frase del narrador (o null).
  const animadores = {
    turno: async e => {
      almacen.cambiar({ turnoDe: e.id });
      await pausa(420);
    },
    dados: async e => {
      almacen.cambiar(d => ({ dados: { valores: e.dados, id: e.id, n: (d.dados?.n ?? 0) + 1, velocidad: d.velocidad } }));
      await pausa(1250);
    },
    mover: e => capas().caminar(e.id, e.camino, { velocidad: velocidad(), porCasilla: e.atras ? 120 : 170 }),
    cae: e => capas().destacar(e.casilla, { ms: 420 / velocidad() }),
    dinero: async e => {
      const cambios = [];
      if (e.de !== 'banco') cambios.push([e.de, -e.cantidad]);
      if (e.a !== 'banco') cambios.push([e.a, e.cantidad]);
      const claves = cambios.map(() => ++contador);
      almacen.cambiar(d => {
        const dinero = { ...d.dinero };
        cambios.forEach(([id, delta]) => { dinero[id] = (dinero[id] ?? 0) + delta; });
        return { dinero, flotantes: [...d.flotantes, ...cambios.map(([id, delta], k) => ({ clave: claves[k], id, delta }))] };
      });
      setTimeout(() => almacen.cambiar(d => ({ flotantes: d.flotantes.filter(f => !claves.includes(f.clave)) })), 1700 / velocidad());
      await pausa(120);
    },
    carta: async e => {
      almacen.cambiar({ carta: datosDeCarta(motor.ctx, e, nombreBarrio), cartaN: ++contador });
      await pausa(3600);
      almacen.cambiar({ carta: null });
    },
    compra: async e => { await capas().destacar(e.casilla, { ms: 600 / velocidad(), clase: 'comprada' }); },
    construir: async e => { await capas().destacar(e.casilla, { ms: 600 / velocidad(), clase: 'comprada' }); },
    subasta: async e => {
      almacen.cambiar({ subasta: { casilla: e.casilla, origen: e.origen, puja: 0, lider: null, pujas: [] } });
      capas().marcar(e.casilla, 'subastada');
      await pausa(1000);
    },
    puja: async e => {
      almacen.cambiar(d => ({
        subasta: d.subasta && { ...d.subasta, puja: e.cantidad, lider: e.id, pujas: [...d.subasta.pujas, { id: e.id, cantidad: e.cantidad }].slice(-4) },
      }));
      await pausa(480);
    },
    retirada: () => pausa(120),
    subastaGanada: async e => {
      almacen.cambiar(d => ({ subasta: d.subasta && { ...d.subasta, ganador: e.id } }));
      await pausa(1200);
      capas().marcar(e.casilla, 'subastada', false);
      almacen.cambiar({ subasta: null });
    },
    subastaDesierta: async e => {
      almacen.cambiar(d => ({ subasta: d.subasta && { ...d.subasta, desierta: true } }));
      await pausa(900);
      capas().marcar(e.casilla, 'subastada', false);
      almacen.cambiar({ subasta: null });
    },
    fin: async (e, texto) => {
      almacen.cambiar({ fin: { ganador: e.ganador, motivo: e.motivo }, aviso: null });
      await pausa(300);
    },
  };
  for (const [tipo, [ms, clase]] of Object.entries(AVISOS)) {
    animadores[tipo] = (e, texto) => (texto ? aviso(texto, ms, clase) : pausa(100));
  }

  // Cuenta y anima los eventos de un paso y deja la pantalla igual que el estado en que acaba.
  async function presentar(paso) {
    const { eventos } = paso;
    const s = demo.estado();
    for (const e of eventos) {
      const texto = narrador().frase(e, s);
      if (texto !== null) {
        almacen.cambiar(d => {
          const ultima = d.registro.at(-1);
          if (ultima?.texto === texto) return { registro: [...d.registro.slice(0, -1), { ...ultima, veces: ultima.veces + 1 }] };
          return { registro: [...d.registro, { n: ++contador, texto, veces: 1 }].slice(-60) };
        });
      }
      await (animadores[e.type]?.(e, texto) ?? pausa(texto === null ? 0 : 140));
      if (parado) return;
    }
    const nuevos = preciosActuales(motor, s);
    almacen.cambiar(d => {
      const previos = { ...d.preciosPrevios };
      for (const [b, precio] of Object.entries(nuevos)) if (precio !== d.precios[b] && d.precios[b] !== undefined) previos[b] = d.precios[b];
      return { estado: s, dinero: Object.fromEntries(s.orden.map(id => [id, s.jugadores[id].dinero])), precios: nuevos, preciosPrevios: previos };
    });
    capas().actualizar(s);
    await despuesDePaso?.(paso, s);
    await pausa(60);
  }

  async function esperarSiPausa() {
    while (almacen.leer().pausado && !parado) await new Promise(listo => { reanudar = listo; });
  }

  return {
    // Reproduce la partida hasta el final (o hasta que se pare).
    async correr() {
      while (!parado) {
        await esperarSiPausa();
        if (parado) return;
        let paso;
        try {
          paso = await demo.paso();
        } catch (error) {
          almacen.cambiar({ error: error.message });
          return;
        }
        if (!paso) return;
        await presentar(paso);
      }
    },
    pausar() {
      almacen.cambiar(d => ({ pausado: !d.pausado }));
      if (!almacen.leer().pausado) reanudar?.();
    },
    parar() {
      parado = true;
      reanudar?.();
    },
  };
}
