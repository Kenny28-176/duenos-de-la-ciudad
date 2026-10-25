// Traduce los errores del motor ({ codigo, mensaje, datos }) a la lengua del jugador. El motor solo da el código y los
// datos; los textos están en src/i18n/<idioma>/errores.json, con la clave «error.<código>» o, si un mismo código tiene
// varios mensajes, «error.<código>.<variante>» (la variante viene en los datos).
import { traducir } from '../i18n/traducir.js';

// «dic» y «base» son los diccionarios ya unidos (el del idioma y el español, que es la base).
export function textoDeError(error, { dic, base = dic, idioma = 'es' }) {
  const tiene = clave => dic?.[clave] !== undefined || base?.[clave] !== undefined;
  const { variante, ...datos } = error.datos ?? {};
  const clave = variante && tiene(`error.${error.codigo}.${variante}`) ? `error.${error.codigo}.${variante}` : `error.${error.codigo}`;
  // Si el texto falta, se usa el mensaje en español del motor, que siempre existe.
  if (!tiene(clave)) return error.mensaje ?? error.codigo;
  // Una casilla viene como número: se pone su nombre.
  if (typeof datos.casilla === 'number') datos.casilla = traducir(dic, base, `casilla.${datos.casilla}`, {}, { idioma });
  return traducir(dic, base, clave, datos, { idioma });
}
