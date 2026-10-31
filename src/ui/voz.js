// La voz del narrador: lee en voz alta las frases del narrador (src/ui/narrador.js) con la síntesis de voz del navegador
// (speechSynthesis). Es opcional y empieza apagada: cada sistema trae sus propias voces y no todos tienen una en cada idioma.
// El reproductor del tablero espera a que acabe la frase antes de pasar al siguiente evento, como un comentarista: así la voz no
// se queda atrás. Con el tablero muy acelerado no habla (no daría tiempo).

// Los eventos que se leen en voz alta. Los demás (el turno, los dados, las pujas…) pasan con su sonido y su animación.
const HABLADOS = new Set([
  'empieza', 'compra', 'subasta', 'subastaGanada', 'subastaDesierta', 'alquiler', 'deuda', 'bancarrota', 'alCalabozo', 'saleDelCalabozo',
  'carta', 'masPobre', 'construir', 'venderEdificio', 'hipotecar', 'deshipotecar', 'accionesCompradas', 'accionesVendidas',
  'tratoPropuesto', 'tratoAceptado', 'tratoRechazado', 'habilidad', 'finEfecto', 'pierdeTurno', 'frenesi', 'rachaFinal', 'rachaPerdida', 'fin',
]);

export const seLee = e => HABLADOS.has(e.type);

// La mejor voz del sistema para un idioma: las «naturales» o «neuronales» antes que las demás, y las del propio equipo (no
// necesitan internet) antes que las de la nube. Si no hay ninguna en ese idioma, null (el navegador usará la suya).
export function elegirVoz(voces, idioma) {
  const del = voces.filter(v => v.lang?.toLowerCase().startsWith(idioma));
  const puntos = v => (/natural|neural/i.test(v.name) ? 4 : 0) + (v.localService ? 2 : 0) + (v.default ? 1 : 0);
  return [...del].sort((a, b) => puntos(b) - puntos(a))[0] ?? null;
}

// «sintetizador» y «Elocucion» son los del navegador (speechSynthesis y SpeechSynthesisUtterance); las pruebas pasan los suyos.
export function crearVoz({ sintetizador = globalThis.speechSynthesis, Elocucion = globalThis.SpeechSynthesisUtterance, esperaMaxima = 9000 } = {}) {
  const disponible = Boolean(sintetizador && Elocucion);
  let activa = false;
  let ultima = null; // el navegador puede olvidar una frase en marcha si nadie la guarda, y entonces nunca avisa de que acabó

  function parar() {
    try { sintetizador?.cancel(); } catch { /* sin voz */ }
  }

  // Lee un texto y devuelve una promesa que se cumple cuando acaba (o pasado «esperaMaxima», por si el navegador no avisa).
  function decir(texto, { idioma = 'es', velocidad = 1 } = {}) {
    if (!activa || !disponible || !texto || velocidad >= 4) return Promise.resolve();
    return new Promise(listo => {
      let reloj = null;
      let frase = null;
      const fin = () => {
        clearTimeout(reloj);
        if (ultima === frase) ultima = null;
        listo();
      };
      try {
        frase = new Elocucion(texto);
        const voz = elegirVoz(sintetizador.getVoices?.() ?? [], idioma);
        if (voz) frase.voice = voz;
        frase.lang = voz?.lang ?? (idioma === 'en' ? 'en-US' : 'es-ES');
        frase.rate = velocidad > 1 ? 1.25 : 1.05;
        frase.onend = fin;
        frase.onerror = fin;
        ultima = frase;
        reloj = setTimeout(fin, esperaMaxima);
        sintetizador.speak(frase);
      } catch {
        fin();
      }
    });
  }

  return {
    disponible,
    activa: () => activa,
    poner(valor) {
      activa = Boolean(valor) && disponible;
      if (!activa) parar();
    },
    parar,
    decir,
    // Lo que se dice de un evento (o undefined si no se lee): su frase y, en una carta, el texto de la carta.
    alEvento(e, texto, { idioma = 'es', velocidad = 1, textoDeCarta = null } = {}) {
      if (!activa || !texto || !seLee(e)) return undefined;
      return decir(e.type === 'carta' && textoDeCarta ? `${texto} ${textoDeCarta}` : texto, { idioma, velocidad });
    },
  };
}
