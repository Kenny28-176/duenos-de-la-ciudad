// El estado de la partida, preparado para viajar por Firebase Realtime Database y de vuelta. Firebase no guarda null ni
// objetos o listas vacías, y convierte las listas en objetos con índices (0, 1, 2…): este módulo hace esa conversión a
// propósito y de forma que se pueda deshacer. También calcula qué hojas del árbol han cambiado entre dos estados, para
// escribir solo eso (docs/DISENO.md y CLAUDE.md: «Datos en Firebase, por partes»).
//
//   codificar(sinSecretos(estado))      → árbol listo para guardar
//   decodificar(árbol, plantilla)       → el estado otra vez (con listas y lo que falte, de la plantilla)
//   diferencias(antes, después, ruta)   → { 'ruta/jugadores/j1/dinero': 1750, 'ruta/props/3/dueno': null, … }

// Lo que los celulares no pueden ver: el estado del azar y el orden de los mazos. Si lo vieran, podrían saber qué sale
// en la próxima tirada o qué carta viene.
const SECRETOS = ['rng', 'mazos'];

export function sinSecretos(estado) {
  const copia = { ...estado };
  for (const clave of SECRETOS) delete copia[clave];
  return copia;
}

// Un árbol de Firebase: las listas pasan a objetos con las claves «0», «1»…; se omiten null, undefined y lo que queda vacío.
export function codificar(valor) {
  if (valor === null || valor === undefined) return undefined;
  if (Array.isArray(valor)) valor = Object.fromEntries(valor.map((v, i) => [i, v]));
  if (typeof valor !== 'object') return valor;
  const hijos = {};
  for (const [clave, v] of Object.entries(valor)) {
    const hijo = codificar(v);
    if (hijo !== undefined) hijos[clave] = hijo;
  }
  return Object.keys(hijos).length ? hijos : undefined;
}

// Un objeto cuyas claves son exactamente 0, 1, 2… n-1 era una lista. (Ningún mapa del estado se llama así: las casillas
// con dueño empiezan en la 1 y los jugadores, las acciones y los tratos tienen claves con letras.)
// También lo usa el tablero con lo que piden los celulares: una acción con una lista (las propiedades de un trato) llega
// de Firebase como un objeto con índices.
export function reconstruir(valor) {
  if (valor === null || typeof valor !== 'object') return valor;
  const claves = Object.keys(valor);
  if (claves.length && claves.every((clave, i) => clave === String(i))) return claves.map(clave => reconstruir(valor[clave]));
  return Object.fromEntries(claves.map(clave => [clave, reconstruir(valor[clave])]));
}

// «plantilla» es una partida nueva: de ella salen las listas y los valores que Firebase no guardó por estar vacíos.
export function decodificar(arbol, plantilla = {}) {
  const estado = reconstruir(arbol ?? {});
  for (const [clave, defecto] of Object.entries(plantilla)) {
    if (estado[clave] === undefined) estado[clave] = structuredClone(defecto);
  }
  restaurarVacios(estado);
  return estado;
}

// Los campos que valen null (o están vacíos) y que Firebase no guarda: se reponen para que el estado sea igual que el original.
function restaurarVacios(estado) {
  for (const propiedad of Object.values(estado.props ?? {})) propiedad.dueno ??= null;
  for (const jugador of Object.values(estado.jugadores ?? {})) {
    jugador.ficha ??= null;
    jugador.calabozo ??= null;
    jugador.acciones ??= {};
    jugador.hab ??= {};
    jugador.hab.ultimoObjetivo ??= null;
    jugador.hab.prestamo ??= null;
  }
  if (estado.turno) {
    estado.turno.dados ??= null;
    estado.turno.compra ??= null;
  }
  if (estado.subasta) {
    estado.subasta.lider ??= null;
    estado.subasta.activos ??= [];
  }
  // Un trato guarda lo que da cada parte; sin propiedades ni acciones, esas listas no se guardan.
  for (const trato of Object.values(estado.tratos ?? {})) {
    for (const parte of [trato.ofrece, trato.pide]) {
      if (!parte) continue;
      parte.propiedades ??= [];
      parte.acciones ??= {};
    }
  }
  if (estado.opciones) estado.opciones.meta ??= null;
}

const esObjeto = valor => valor !== null && typeof valor === 'object';

// Las hojas que cambian entre dos árboles codificados. Un valor nuevo o cambiado va con su ruta; uno que desaparece, con
// null (Firebase lo borra). Si desaparece un subárbol entero, basta una línea para él.
export function diferencias(antes, despues, ruta = '') {
  const cambios = {};
  const recorrer = (a, b, prefijo) => {
    for (const clave of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = a[clave];
      const y = b[clave];
      const donde = prefijo ? `${prefijo}/${clave}` : clave;
      if (y === undefined) cambios[donde] = null;
      else if (x === undefined) cambios[donde] = y;
      else if (esObjeto(x) && esObjeto(y)) recorrer(x, y, donde);
      else if (x !== y) cambios[donde] = y;
    }
  };
  recorrer(antes ?? {}, despues ?? {}, ruta);
  return cambios;
}
