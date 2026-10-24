// Cola de animaciones. El motor devuelve de golpe todos los eventos de un paso (dados, mover, pagar…); el tablero los
// reproduce uno detrás de otro, cada uno con su animación, y los celulares esperan a que termine para no destripar la
// sorpresa (CLAUDE.md, «Los eventos se convierten en animaciones»).
//   const cola = crearCola({ mover: async e => …, compra: async e => … })
//   await cola.reproducir(eventos)   // termina cuando acaban las animaciones de estos eventos
// Los eventos sin animación pasan sin esperar. Si una animación falla, se avisa con alFallar y la cola sigue.
export function crearCola(animadores, { alFallar = () => {} } = {}) {
  let cadena = Promise.resolve();
  let pendientes = 0;

  function reproducir(eventos) {
    pendientes++;
    cadena = cadena
      .then(async () => {
        for (const e of eventos) {
          const animar = animadores[e.type];
          if (!animar) continue;
          try {
            await animar(e);
          } catch (error) {
            alFallar(error, e);
          }
        }
      })
      .finally(() => {
        pendientes--;
      });
    return cadena;
  }

  return { reproducir, ocupada: () => pendientes > 0 };
}
