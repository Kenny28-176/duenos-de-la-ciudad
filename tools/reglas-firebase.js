// Las reglas de seguridad de Realtime Database (database.rules.json), evaluadas sobre un árbol en memoria. Lo usa la imitación de
// Firebase (tools/firebase-falso.js) para que las pruebas rechacen lo mismo que rechazaría Firebase: así, un campo que falta en las
// reglas o una escritura sin permiso salen en las pruebas y no en una partida de verdad. Quien manda de verdad es Firebase:
// tools/comprobar-reglas.js prueba lo mismo contra el proyecto real.
//
// Lo que implementa (lo que usan nuestras reglas, y algo más):
//   .read y .write   en cascada: basta con que lo permita una regla del camino, de la raíz a la ruta
//   .validate        en cada nodo con datos nuevos (la ruta escrita, sus padres y todo lo que cuelga de ella), sin cascada; no
//                    se evalúa al borrar
//   $comodines (el nombre exacto gana al comodín), auth (null o { uid, provider }), data, newData, root y now
//   child() parent() val() exists() hasChild() hasChildren() isString() isNumber() isBoolean() getPriority()
//   y en los textos: length, matches(), beginsWith(), endsWith(), contains(), toLowerCase(), toUpperCase(), replace()
import { readFileSync } from 'node:fs';

const partir = ruta => String(ruta ?? '').split('/').filter(Boolean);
const esObjeto = valor => valor !== null && typeof valor === 'object';
const leer = (arbol, partes) => partes.reduce((nodo, clave) => (esObjeto(nodo) ? nodo[clave] ?? null : null), arbol ?? null);

export function leerReglas(archivo = new URL('../database.rules.json', import.meta.url)) {
  return JSON.parse(readFileSync(archivo, 'utf8')).rules;
}

// Lo que ven las reglas de un sitio del árbol (data, newData, root).
class Instantanea {
  constructor(arbol, partes) {
    this.arbol = arbol;
    this.partes = partes;
  }
  get valor() { return leer(this.arbol, this.partes); }
  val() { const v = this.valor; return esObjeto(v) ? JSON.parse(JSON.stringify(v)) : v; }
  child(ruta) { return new Instantanea(this.arbol, [...this.partes, ...partir(ruta)]); }
  parent() { return new Instantanea(this.arbol, this.partes.slice(0, -1)); }
  exists() { return this.valor !== null; }
  hasChild(ruta) { return this.child(ruta).exists(); }
  hasChildren(lista) {
    if (!esObjeto(this.valor)) return false;
    return lista === undefined ? Object.keys(this.valor).length > 0 : lista.every(hijo => this.hasChild(hijo));
  }
  isString() { return typeof this.valor === 'string'; }
  isNumber() { return typeof this.valor === 'number'; }
  isBoolean() { return typeof this.valor === 'boolean'; }
  getPriority() { return null; }
}

// Las expresiones de las reglas son casi JavaScript: solo cambian los nombres de algunos métodos de los textos. Se compilan una vez.
const compiladas = new Map();
function compilar(expresion, variables) {
  const clave = `${variables.join(',')}|${expresion}`;
  if (!compiladas.has(clave)) {
    const js = expresion
      .replace(/\.matches\(/g, '.match(')
      .replace(/\.beginsWith\(/g, '.startsWith(')
      .replace(/\.contains\(/g, '.includes(');
    // eslint-disable-next-line no-new-func
    compiladas.set(clave, new Function('auth', 'data', 'newData', 'root', 'now', ...variables, `"use strict"; return (${js});`));
  }
  return compiladas.get(clave);
}

// Una regla vale si es true o si su expresión da algo verdadero. Si falla (por ejemplo, auth.uid sin sesión), no vale, como en Firebase.
function cumple(regla, { auth, data, newData, root, variables }) {
  if (typeof regla === 'boolean') return regla;
  try {
    const nombres = Object.keys(variables);
    return Boolean(compilar(regla, nombres)(auth, data, newData, root, Date.now(), ...nombres.map(n => variables[n])));
  } catch {
    return false;
  }
}

// La regla de un hijo: la que se llama como él o, si no hay, la del comodín ($algo), que da valor a su variable.
function reglaDelHijo(nodo, clave) {
  if (!esObjeto(nodo)) return null;
  if (Object.hasOwn(nodo, clave)) return { nodo: nodo[clave], variable: null };
  const comodin = Object.keys(nodo).find(k => k.startsWith('$'));
  return comodin ? { nodo: nodo[comodin], variable: [comodin, clave] } : null;
}

// Las reglas de cada nivel del camino, de la raíz a la ruta, con las variables de los comodines que se han ido cruzando.
function camino(reglas, partes) {
  const niveles = [{ nodo: reglas, variables: {} }];
  for (const clave of partes) {
    const previo = niveles.at(-1);
    const hijo = reglaDelHijo(previo.nodo, clave);
    niveles.push({
      nodo: hijo?.nodo ?? null,
      variables: hijo?.variable ? { ...previo.variables, [hijo.variable[0]]: hijo.variable[1] } : previo.variables,
    });
  }
  return niveles;
}

export function puedeLeer(reglas, arbol, ruta, auth) {
  const partes = partir(ruta);
  return camino(reglas, partes).some(({ nodo, variables }, k) => esObjeto(nodo) && nodo['.read'] !== undefined
    && cumple(nodo['.read'], { auth, data: new Instantanea(arbol, partes.slice(0, k)), newData: null, root: new Instantanea(arbol, []), variables }));
}

// ¿Se puede escribir en esta ruta? «antes» y «despues» son la base entera antes y después de la escritura (con todos los cambios
// de un update a la vez). Devuelve null si vale, o por qué no («permiso» o «validacion»).
export function revisarEscritura(reglas, antes, despues, ruta, auth) {
  const partes = partir(ruta);
  const niveles = camino(reglas, partes);
  const root = new Instantanea(antes, []);
  const contexto = (k, variables) => ({ auth, data: new Instantanea(antes, partes.slice(0, k)), newData: new Instantanea(despues, partes.slice(0, k)), root, variables });
  const permitido = niveles.some(({ nodo, variables }, k) => esObjeto(nodo) && nodo['.write'] !== undefined && cumple(nodo['.write'], contexto(k, variables)));
  if (!permitido) return 'permiso';

  // .validate en los padres que siguen teniendo datos…
  for (let k = 0; k < partes.length; k++) {
    const { nodo, variables } = niveles[k];
    if (leer(despues, partes.slice(0, k)) === null || !esObjeto(nodo) || nodo['.validate'] === undefined) continue;
    if (!cumple(nodo['.validate'], contexto(k, variables))) return 'validacion';
  }
  // …y en la ruta escrita y todo lo que cuelga de ella.
  const validarDesde = (nodo, variables, aqui) => {
    const nuevo = leer(despues, aqui);
    if (nuevo === null) return true;
    if (esObjeto(nodo) && nodo['.validate'] !== undefined) {
      const ok = cumple(nodo['.validate'], { auth, data: new Instantanea(antes, aqui), newData: new Instantanea(despues, aqui), root, variables });
      if (!ok) return false;
    }
    if (!esObjeto(nuevo) || !esObjeto(nodo)) return true;
    return Object.keys(nuevo).every(clave => {
      const hijo = reglaDelHijo(nodo, clave);
      if (!hijo) return true; // sin reglas para ese hijo: vale cualquier cosa
      return validarDesde(hijo.nodo, hijo.variable ? { ...variables, [hijo.variable[0]]: hijo.variable[1] } : variables, [...aqui, clave]);
    });
  };
  const { nodo, variables } = niveles.at(-1);
  return validarDesde(nodo, variables, partes) ? null : 'validacion';
}
