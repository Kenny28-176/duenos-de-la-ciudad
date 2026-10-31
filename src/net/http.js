// Un transporte que habla por HTTP con el servidor local de desarrollo (tools/serve.js), que hace de buzón en la laptop.
// Es el mismo «transporte» que usa el resto de la red (src/net/memoria.js, Firebase): el tablero y los celulares no notan la
// diferencia. Sirve para jugar en casa por la wifi sin Firebase y para las pruebas con el navegador.
//
//   const transporte = crearTransporteHttp({ uid });                 mismo origen que la página
//   const transporte = crearTransporteHttp({ uid, base: 'http://192.168.1.20:8080' });
//
// Las operaciones son un POST a /red/op. Escuchar es una petición larga a /red/escuchar que va devolviendo eventos
// («data: …» y una línea en blanco, como los eventos del servidor), leída con fetch (así funciona igual en el navegador y en
// Node, sin EventSource). Si se corta, se vuelve a conectar sola y recibe otra vez el valor actual.
//
// Ojo: no tiene ninguna seguridad (cualquiera de la red puede leer y escribir). Es solo para casa y para desarrollo.

// Un celular al que se le apaga la pantalla puede quedarse con la conexión larga muerta sin que nadie se entere. El relé manda
// un latido cada 15 s: si pasa «silencioMaximo» sin recibir nada (ni latido), se da la conexión por muerta y se vuelve a abrir.
// «reconectar()» hace lo mismo a la fuerza (al volver a la página o al recuperar la red).
export function crearTransporteHttp({ uid, base = '', peticion = (...a) => fetch(...a), esperaReintento = 800, silencioMaximo = 40000, revisarCada = 5000 }) {
  const parar = new Set();
  const cortar = new Set(); // lo que corta la conexión larga de cada escucha (la reabre el bucle de suscribir)

  // Si hay conexión: «en línea» mientras todas las escuchas abiertas están recibiendo datos (cada conexión larga empieza con un aviso
  // «listo» del relé y manda un latido cada 15 s). Sirve para decirle al jugador que su celular se quedó sin conexión con el tablero.
  let enLinea = false;
  let escuchas = 0; // las pedidas y no cerradas
  let vivas = 0; // las que ahora mismo están conectadas
  const oyentesDeConexion = new Set();
  function revisarConexion() {
    const ahora = escuchas > 0 && vivas === escuchas;
    if (ahora === enLinea) return;
    enLinea = ahora;
    for (const oyente of oyentesDeConexion) oyente(enLinea);
  }

  async function llamar(cuerpo) {
    const respuesta = await peticion(`${base}/red/op`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, ...cuerpo }) });
    const datos = await respuesta.json();
    if (!datos.ok) throw new Error(datos.error ?? 'Error de la red local');
    return datos;
  }

  // Una escucha: se mantiene abierta y avisa de cada evento; si se corta, reconecta.
  function suscribir(tipo, ruta, cb) {
    let activa = true;
    let control = null;
    let viva = false;
    const interrumpir = () => control?.abort();
    const noViva = () => { if (viva) { viva = false; vivas--; } };
    const cerrar = () => {
      if (!activa) return;
      activa = false;
      interrumpir();
      parar.delete(cerrar);
      cortar.delete(interrumpir);
      noViva();
      escuchas--;
      revisarConexion();
    };
    parar.add(cerrar);
    cortar.add(interrumpir);
    escuchas++;
    revisarConexion();

    async function conectar() {
      while (activa) {
        control = new AbortController();
        let ultimoDato = Date.now();
        const vigilante = setInterval(() => { if (Date.now() - ultimoDato > silencioMaximo) interrumpir(); }, revisarCada);
        try {
          const url = `${base}/red/escuchar?uid=${encodeURIComponent(uid)}&tipo=${tipo}&ruta=${encodeURIComponent(ruta)}`;
          const respuesta = await peticion(url, { signal: control.signal });
          const lector = respuesta.body.getReader();
          const decodificador = new TextDecoder();
          let pendiente = '';
          while (activa) {
            const { done, value } = await lector.read();
            ultimoDato = Date.now();
            if (done) break;
            if (!viva) {
              viva = true;
              vivas++;
              revisarConexion();
            }
            pendiente += decodificador.decode(value, { stream: true });
            let corte;
            while ((corte = pendiente.indexOf('\n\n')) >= 0) {
              const bloque = pendiente.slice(0, corte);
              pendiente = pendiente.slice(corte + 2);
              const linea = bloque.split('\n').find(l => l.startsWith('data: '));
              if (!linea || !activa) continue;
              const evento = JSON.parse(linea.slice(6));
              // {k:'listo'} es solo el aviso de que la conexión está abierta.
              if (evento.k === 'valor') cb(evento.v);
              else if (evento.k === 'hijo') cb(evento.c, evento.v);
            }
          }
        } catch (error) {
          if (!activa) return;
        } finally {
          clearInterval(vigilante);
          noViva();
          revisarConexion();
        }
        if (activa) await new Promise(listo => setTimeout(listo, esperaReintento));
      }
    }
    conectar();
    return cerrar;
  }

  return {
    uid,
    set: (ruta, valor) => llamar({ op: 'set', ruta, valor: valor ?? null }),
    update: cambios => llamar({ op: 'update', cambios }),
    remove: ruta => llamar({ op: 'remove', ruta }),
    get: async ruta => (await llamar({ op: 'get', ruta })).valor ?? null,
    empujar: async (ruta, valor) => (await llamar({ op: 'empujar', ruta, valor })).clave,
    escuchar: (ruta, cb) => suscribir('valor', ruta, cb),
    escucharHijos: (ruta, cb) => suscribir('hijos', ruta, cb),
    // ¿Hay conexión? (todas las escuchas abiertas están recibiendo) y aviso de cada cambio; devuelve cómo dejar de avisar.
    enLinea: () => enLinea,
    alCambiarConexion(oyente) {
      oyentesDeConexion.add(oyente);
      return () => oyentesDeConexion.delete(oyente);
    },
    // Corta las conexiones largas para que se vuelvan a abrir y traigan lo último (al volver a la página o recuperar la red).
    reconectar: () => [...cortar].forEach(interrumpir => interrumpir()),
    // Deja de escuchar todo (al cerrar la pantalla).
    cerrar: () => [...parar].forEach(cerrar => cerrar()),
  };
}
