// Simulador de equilibrio: juega muchas partidas entre bots y resume los resultados (docs/DISENO.md, sección 10).
//   node tools/simular.js                         300 partidas de 4 jugadores
//   node tools/simular.js --partidas 1000 --jugadores 6 --semilla 100
//   node tools/simular.js --sin-habilidades --sin-mercado --sin-subastas --meta 7000
//   node tools/simular.js --json                  el informe en JSON (para comparar ajustes)
//   node tools/simular.js --ajuste fichas.toro.pasiva.factor=2.2 --ajuste economia.sueldo=260
//                                                 prueba otras cifras sin tocar src/data (se puede repetir)
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, informe, simularPartida } from '../src/engine/simulador.js';

const args = process.argv.slice(2);
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? Number(args[i + 1]) : porDefecto;
};

// «fichas.<ficha>.<pasiva|activa>.<cifra>=valor» o «economia.<ruta>=valor».
function ajustar(datos, ajuste) {
  const [ruta, texto] = ajuste.split('=');
  const partes = ruta.split('.');
  const raiz = partes.shift();
  let objeto = raiz === 'fichas' ? Object.fromEntries(datos.fichas.fichas.map(f => [f.id, f])) : datos[raiz];
  const ultima = partes.pop();
  for (const parte of partes) objeto = objeto?.[parte];
  if (!objeto || !(ultima in objeto) || texto === undefined) throw new Error(`No existe la cifra que se quiere ajustar: ${ruta}`);
  objeto[ultima] = Number(texto);
}
const partidas = valor('partidas', 300);
const jugadores = valor('jugadores', 4);
const semilla = valor('semilla', 1);
const sala = {
  habilidades: !args.includes('--sin-habilidades'),
  mercado: !args.includes('--sin-mercado'),
  subastas: !args.includes('--sin-subastas'),
  meta: valor('meta', 10000) || null, // --meta 0 = sin meta (hasta la bancarrota)
};

const datos = await cargarDatos();
const ajustes = args.flatMap((a, i) => (a === '--ajuste' ? [args[i + 1]] : []));
for (const ajuste of ajustes) ajustar(datos, ajuste);
const motor = crearMotor(datos);
const resultados = [];
const inicio = Date.now();
for (let k = 0; k < partidas; k++) {
  const semillaPartida = semilla + k;
  resultados.push(simularPartida(motor, { semilla: semillaPartida, fichas: fichasParaPartida(motor, semillaPartida, jugadores), sala }));
}
const resumen = informe(motor, resultados);

if (args.includes('--json')) {
  console.log(JSON.stringify(resumen, null, 2));
} else {
  const lineas = [
    `Partidas: ${resumen.partidas} de ${jugadores} jugadores (en ${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
    `Sala: meta ${sala.meta || 'sin meta'}, mercado ${sala.mercado ? 'sí' : 'no'}, subastas ${sala.subastas ? 'sí' : 'no'}, habilidades ${sala.habilidades ? 'sí' : 'no'}`,
    ...(ajustes.length ? [`Ajustes: ${ajustes.join(', ')}`] : []),
    `Turnos: media ${resumen.turnos.media} (10 %: ${resumen.turnos.p10}, 90 %: ${resumen.turnos.p90}); rondas: ${resumen.rondas}`,
    `Duración estimada: ${resumen.minutosEstimados} min (a 30 s por turno)`,
    `Cómo terminan: ${Object.entries(resumen.motivos).map(([m, p]) => `${m} ${p} %`).join(', ')}`,
    `Victorias por asiento: ${Object.entries(resumen.victoriasPorAsiento).map(([a, p]) => `${a}.º ${p} %`).join(', ')}`,
    'Victorias por ficha:',
    ...Object.entries(resumen.victoriasPorFicha).map(([f, x]) => `  ${f.padEnd(16)} ${String(x.victorias).padStart(5)} %  (${x.partidas} partidas)`),
    `Casillas más pisadas: ${resumen.casillasMasPisadas.map(c => `${c.nombre} ${c.porcentaje} %`).join(', ')}`,
    `Casillas menos pisadas: ${resumen.casillasMenosPisadas.map(c => `${c.nombre} ${c.porcentaje} %`).join(', ')}`,
    `Parte del patrimonio del ganador en acciones: ${resumen.parteDelPatrimonioEnAcciones} %`,
    `Por partida: ${resumen.porPartida.subastas} subastas, ${resumen.porPartida.tratos} tratos, ${resumen.porPartida.bancarrotas} bancarrotas`,
    `Errores de los bots: ${resumen.erroresDeBots}`,
  ];
  console.log(lineas.join('\n'));
}
