// Azar con semilla (mulberry32). El estado del generador vive dentro del estado de la partida (state.rng) para que el
// motor sea puro y reproducible en las pruebas. Adaptado de Aldeanos vs Lobos.

export function rngNext(seed) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return { seed: t, value: ((r ^ (r >>> 14)) >>> 0) / 4294967296 };
}

// Número en [0, 1). Avanza state.rng.
export function random(state) {
  const r = rngNext(state.rng);
  state.rng = r.seed;
  return r.value;
}

// Un dado de 6 caras.
export const dado = state => 1 + Math.floor(random(state) * 6);

export function pick(state, list) {
  return list[Math.floor(random(state) * list.length)];
}

export function shuffle(state, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
