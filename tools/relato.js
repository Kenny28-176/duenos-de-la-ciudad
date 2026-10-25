// Relato de una partida entre bots: narra los acontecimientos en español o inglés (T-12 de trabajoParalelo.md).
// Uso: node tools/relato.js [--semilla 7] [--jugadores 4] [--idioma es] [--hasta 200]
// Las frases las compone src/ui/narrador.js, el mismo narrador que usa el tablero.
import { readFile } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';
import { unirDiccionarios } from '../src/i18n/traducir.js';
import { crearNarrador } from '../src/ui/narrador.js';

const args = process.argv.slice(2);

if (args.includes('--ayuda') || args.includes('-h') || args.includes('--help')) {
  console.log(`Uso: node tools/relato.js [--semilla 7] [--jugadores 4] [--idioma es] [--hasta 200]

Opciones:
  --semilla <n>    Semilla del generador pseudoaleatorio (por defecto: 7)
  --jugadores <n>  Número de jugadores de 2 a 8 (por defecto: 4)
  --idioma <lang>  Idioma del relato: es | en (por defecto: es)
  --hasta <turnos> Corta la narración después de ese número de turnos (por defecto: sin límite)
  --ayuda, -h      Muestra esta ayuda`);
  process.exit(0);
}

const obtenerArg = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : porDefecto;
};

const semilla = Number(obtenerArg('semilla', 7));
const jugadores = Number(obtenerArg('jugadores', 4));
const idioma = obtenerArg('idioma', 'es') === 'en' ? 'en' : 'es';
const hastaStr = obtenerArg('hasta', null);
const hasta = hastaStr !== null ? Number(hastaStr) : Infinity;

// Lee del disco las cuatro partes del diccionario de un idioma y las une.
async function cargarDiccionario(lang) {
  const partes = [];
  for (const parte of ['juego', 'narrador', 'errores', 'interfaz']) {
    partes.push(JSON.parse(await readFile(new URL(`../src/i18n/${lang}/${parte}.json`, import.meta.url), 'utf8')));
  }
  return unirDiccionarios(...partes);
}

const dic = await cargarDiccionario(idioma);
const base = idioma === 'es' ? dic : await cargarDiccionario('es');

// En el relato, a cada jugador se le llama por su ficha («La Rata»), no por su nombre.
const narrador = crearNarrador({ dic, base, idioma, nombreJugador: (s, id) => dic[`ficha.${s.jugadores[id].ficha}`] ?? id });

const motor = crearMotor(await cargarDatos());
const fichas = fichasParaPartida(motor, semilla, jugadores);
let turnos = 0;
let cortado = false;

simularPartida(motor, {
  semilla,
  fichas,
  maxTurnos: Number.isFinite(hasta) ? hasta : 1000,
  alEvento: (evento, estado) => {
    if (cortado) return;
    if (evento.type === 'turno' && ++turnos > hasta) {
      cortado = true;
      return;
    }
    const frase = narrador.frase(evento, estado);
    if (frase === null) return;
    console.log(`${idioma === 'en' ? 'Round' : 'Ronda'} ${estado.ronda || 1} · ${frase}`);
  },
});
