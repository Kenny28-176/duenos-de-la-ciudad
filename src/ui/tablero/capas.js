// Las capas del tablero que cambian durante la partida, pintadas a partir del estado del motor:
//   - las fichas de los jugadores: la pieza sobre un anillo del color de su ficha (docs/VISUALES.md, sección 9);
//   - el dueño de cada propiedad: una mini pieza en el borde de la casilla que da al centro;
//   - las casas y las torres, sobre la franja de color de su barrio;
//   - los marcadores: hipotecada, en obras, inflada, estallada…
// Las fichas se animan con la API del navegador (caminar casilla a casilla); lo demás se repinta con actualizar().
import { ladoDeFicha, posicionFicha } from './geometria.js';

const SVG = 'http://www.w3.org/2000/svg';
const LADO_BASE = 60; // las fichas se dibujan de este tamaño y se escalan

function crear(tipo, atributos = {}, padre = null) {
  const el = document.createElementNS(SVG, tipo);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  if (padre) padre.append(el);
  return el;
}

// Una imagen que solo se ve cuando ha cargado: las que todavía no existen no enseñan el icono de imagen rota. Las que ya se
// cargaron una vez se ven al momento (si no, las monedas de los dueños y las casas, que se repintan en cada paso, parpadearían).
const yaCargadas = new Set();
function mostrarCuandoCargue(imagen) {
  const href = imagen.getAttribute('href');
  if (yaCargadas.has(href)) {
    imagen.classList.add('cargada');
    return;
  }
  const prueba = new Image();
  prueba.onload = () => {
    yaCargadas.add(href);
    imagen.classList.add('cargada');
  };
  prueba.src = href;
}

export function imagenSegura(atributos, padre) {
  const imagen = crear('image', atributos, padre);
  mostrarCuandoCargue(imagen);
  return imagen;
}

// Un punto en el borde de la casilla que da al centro del tablero, «d» hacia dentro del tablero.
function bordeInterior(geo, g, d = 0) {
  const { lado, esquina } = geo;
  switch (g.lado) {
    case 1: return { x: esquina + d, y: g.centro.y };
    case 2: return { x: g.centro.x, y: esquina + d };
    case 3: return { x: lado - esquina - d, y: g.centro.y };
    default: return { x: g.centro.x, y: lado - esquina - d };
  }
}

// Los puntos donde van los edificios, repartidos a lo largo de la franja de color de la casilla.
function puntosDeEdificios(g, cuantos) {
  const b = g.banda;
  const horizontal = g.lado === 2 || g.lado === 4;
  return Array.from({ length: cuantos }, (_, k) => {
    const t = (k + 0.5) / cuantos;
    return horizontal ? { x: b.x + b.ancho * t, y: b.y + b.alto / 2 } : { x: b.x + b.ancho / 2, y: b.y + b.alto * t };
  });
}

const espera = ms => new Promise(listo => setTimeout(listo, ms));
const mueve = (x, y) => `translate(${x}px, ${y}px)`;

export function crearCapas(svg, motor, geo, { base = 'visuales/' } = {}) {
  const { ctx } = motor;
  const capa = nombre => svg.querySelector(`.capa-${nombre}`);
  const fichas = new Map(); // id del jugador → { grupo, escala, x, y }

  // La pieza de una ficha sobre su anillo, de lado LADO_BASE y con el origen en su centro.
  function pieza(padre, ficha, { clase, lado = LADO_BASE }) {
    const grupo = crear('g', { class: clase }, padre);
    const escala = crear('g', { class: 'escala' }, grupo);
    crear('ellipse', { class: 'anillo', cx: 0, cy: lado * 0.29, rx: lado * 0.46, ry: lado * 0.14, style: `stroke: ${ctx.fichas[ficha].color}` }, escala);
    imagenSegura({ href: `${base}fichas/piezas/${ficha}.webp`, x: -lado / 2, y: -lado / 2, width: lado, height: lado }, escala);
    return { grupo, escala };
  }

  function colocar(id, x, y, radio) {
    const f = fichas.get(id);
    f.x = x;
    f.y = y;
    f.grupo.style.transform = mueve(x, y);
    if (radio) f.escala.style.transform = `scale(${ladoDeFicha(radio) / LADO_BASE})`;
  }

  // Dónde le toca estar a cada ficha según el estado: si comparten casilla, se reparten el sitio.
  function posiciones(s) {
    const porCasilla = new Map();
    for (const id of s.orden) {
      const j = s.jugadores[id];
      if (j.quebrado) continue;
      const clave = `${j.casilla}:${j.calabozo ? 'preso' : ''}`;
      if (!porCasilla.has(clave)) porCasilla.set(clave, []);
      porCasilla.get(clave).push(id);
    }
    const resultado = new Map();
    for (const ids of porCasilla.values()) {
      ids.forEach((id, n) => {
        const j = s.jugadores[id];
        resultado.set(id, posicionFicha(geo, j.casilla, n, ids.length, { preso: Boolean(j.calabozo) }));
      });
    }
    return resultado;
  }

  function actualizarFichas(s) {
    const sitio = posiciones(s);
    for (const id of s.orden) {
      const j = s.jugadores[id];
      if (!fichas.has(id)) {
        const { grupo, escala } = pieza(capa('fichas'), j.ficha, { clase: 'ficha' });
        grupo.dataset.jugador = id;
        fichas.set(id, { grupo, escala, x: 0, y: 0 });
        const p = sitio.get(id);
        // La primera vez, sin transición: que aparezcan ya en su sitio.
        grupo.classList.add('sin-transicion');
        colocar(id, p.x, p.y, p.radio);
        requestAnimationFrame(() => requestAnimationFrame(() => grupo.classList.remove('sin-transicion')));
        continue;
      }
      const f = fichas.get(id);
      f.grupo.classList.toggle('quebrada', j.quebrado);
      const p = sitio.get(id);
      if (p) colocar(id, p.x, p.y, p.radio);
    }
  }

  function actualizarPropiedades(s) {
    const duenos = capa('duenos');
    const edificios = capa('edificios');
    const marcadores = capa('marcadores');
    duenos.replaceChildren();
    edificios.replaceChildren();
    marcadores.replaceChildren();
    const efectos = new Map();
    for (const e of s.efectos) {
      const tipo = { inflada: 'inflada', estallada: 'estallada', obras: 'en-obras' }[e.tipo];
      if (tipo && e.casilla !== undefined) efectos.set(e.casilla, tipo);
    }
    for (const i of ctx.propiedades) {
      const p = s.props[i];
      if (!p) continue; // antes de empezar la partida todavía no hay propiedades
      const g = geo.casillas[i];
      svg.querySelector(`[data-casilla="${i}"]`)?.classList.toggle('hipotecada', p.hipotecada);
      if (!p.dueno) continue;
      const punto = bordeInterior(geo, g, 14);
      const ficha = s.jugadores[p.dueno].ficha;
      const moneda = crear('g', { class: 'dueno' }, duenos);
      moneda.style.transform = mueve(punto.x, punto.y);
      crear('circle', { class: 'moneda', r: 17, style: `stroke: ${ctx.fichas[ficha].color}` }, moneda);
      imagenSegura({ href: `${base}fichas/piezas/${ficha}.webp`, x: -15, y: -17, width: 30, height: 30 }, moneda);
      if (p.nivel > 0) {
        const torre = p.nivel === 5;
        const lado = torre ? 50 : 32;
        for (const q of puntosDeEdificios(g, torre ? 1 : p.nivel)) {
          imagenSegura({
            class: torre ? 'torre' : 'casa', href: `${base}tablero/edificios/${torre ? 'torre' : 'casa'}.webp`,
            x: q.x - lado / 2, y: q.y - lado / 2 - (torre ? 5 : 0), width: lado, height: lado,
          }, edificios);
        }
      }
      const marcador = p.hipotecada ? 'hipotecada' : efectos.get(i);
      if (marcador) {
        const horizontal = g.lado === 2 || g.lado === 4;
        const centro = bordeInterior(geo, g, 14);
        const x = centro.x + (horizontal ? 30 : 0);
        const y = centro.y + (horizontal ? 0 : 30);
        crear('circle', { class: 'fondo-marcador', cx: x, cy: y, r: 13 }, marcadores);
        imagenSegura({ class: 'marcador', href: `${base}tablero/marcadores/${marcador}.svg`, x: x - 10, y: y - 10, width: 20, height: 20 }, marcadores);
      }
    }
  }

  for (const imagen of svg.querySelectorAll('image')) mostrarCuandoCargue(imagen);

  return {
    actualizar(s) {
      actualizarPropiedades(s);
      actualizarFichas(s);
    },
    ficha: id => fichas.get(id),

    // Hace caminar la ficha de un jugador por las casillas de «camino», un salto por casilla.
    async caminar(id, camino, { porCasilla = 170, velocidad = 1 } = {}) {
      const f = fichas.get(id);
      if (!f || !camino.length) return;
      const ms = (porCasilla * camino.length) / velocidad;
      const puntos = [{ x: f.x, y: f.y }, ...camino.map(i => posicionFicha(geo, i, 0, 1))];
      const solo = posicionFicha(geo, camino.at(-1), 0, 1).radio;
      // Un saltito entre cada par de casillas, para que se note cada paso.
      const cuadros = [{ transform: mueve(puntos[0].x, puntos[0].y) }];
      for (let k = 1; k < puntos.length; k++) {
        const a = puntos[k - 1];
        const b = puntos[k];
        cuadros.push({ transform: mueve((a.x + b.x) / 2, (a.y + b.y) / 2 - 10), offset: (k - 0.5) / (puntos.length - 1) });
        cuadros.push({ transform: mueve(b.x, b.y), offset: k / (puntos.length - 1) });
      }
      f.grupo.classList.add('sin-transicion');
      f.escala.style.transform = `scale(${ladoDeFicha(solo) / LADO_BASE})`;
      capa('fichas').append(f.grupo); // por encima de las demás
      const animacion = f.grupo.animate(cuadros, { duration: ms, easing: 'ease-in-out' });
      await animacion.finished.catch(() => {});
      const fin = puntos.at(-1);
      colocar(id, fin.x, fin.y);
      requestAnimationFrame(() => requestAnimationFrame(() => f.grupo.classList.remove('sin-transicion')));
    },

    // Deja una casilla marcada con una clase (o la quita): la de una subasta en marcha, por ejemplo.
    marcar(casilla, clase, activo = true) {
      svg.querySelector(`[data-casilla="${casilla}"]`)?.classList.toggle(clase, activo);
    },

    // Ilumina una casilla un momento (donde cae una ficha, donde se compra…).
    async destacar(casilla, { ms = 700, clase = 'destacada' } = {}) {
      const el = svg.querySelector(`[data-casilla="${casilla}"]`);
      if (!el) return;
      el.classList.add(clase);
      await espera(ms);
      el.classList.remove(clase);
    },
  };
}
