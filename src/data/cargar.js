// Lee los datos del juego (tablero, economía, fichas y cartas). En Node (pruebas, simulador) los lee del disco; en el
// navegador, con fetch.
const ARCHIVOS = { tablero: 'tablero.json', economia: 'economia.json', fichas: 'fichas.json', cartas: 'cartas.json' };

export async function cargarDatos(base = new URL('./', import.meta.url)) {
  const leer = async nombre => {
    const url = new URL(nombre, base);
    if (url.protocol === 'file:') {
      const { readFile } = await import('node:fs/promises');
      return JSON.parse(await readFile(url, 'utf8'));
    }
    return (await fetch(url)).json();
  };
  const entradas = await Promise.all(Object.entries(ARCHIVOS).map(async ([clave, nombre]) => [clave, await leer(nombre)]));
  return Object.fromEntries(entradas);
}
