// Conecta un almacén de datos (almacen.js) con un componente de Preact: devuelve los datos actuales y hace que el
// componente se vuelva a pintar cada vez que cambian.
import { useEffect, useState } from './preact.js';

export function usarAlmacen(almacen) {
  const [datos, poner] = useState(almacen.leer());
  useEffect(() => {
    poner(almacen.leer());
    return almacen.escuchar(poner);
  }, [almacen]);
  return datos;
}
