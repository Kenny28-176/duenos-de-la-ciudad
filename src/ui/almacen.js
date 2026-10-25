// Un almacén mínimo de datos: guarda un objeto y avisa a quien lo escucha cada vez que cambia. La pantalla lo usa para
// que sus componentes se vuelvan a pintar cuando el reproductor de eventos mueve algo (dinero, dados, cartas…).
//   const almacen = crearAlmacen({ dados: null });
//   almacen.cambiar({ dados: [3, 4] });        mezcla estos campos con los que había
//   almacen.cambiar(d => ({ n: d.n + 1 }));    o los calcula a partir de los actuales
//   const parar = almacen.escuchar(d => …);    avisa con los datos nuevos; devuelve la función para dejar de escuchar
export function crearAlmacen(inicial) {
  let datos = inicial;
  const oyentes = new Set();
  return {
    leer: () => datos,
    cambiar(parche) {
      datos = { ...datos, ...(typeof parche === 'function' ? parche(datos) : parche) };
      for (const oyente of oyentes) oyente(datos);
    },
    escuchar(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
  };
}
