# La red: cómo se hablan el tablero y los celulares

> **Para quien desarrolle.** Describe lo que hay en `src/net/` y las reglas de seguridad de Firebase. La guía para crear
> el proyecto de Firebase está en [FIREBASE.md](FIREBASE.md).

## La idea

- **El tablero manda.** Es la «autoridad»: recibe lo que piden los celulares, lo pasa por el motor y publica el resultado.
  Los celulares nunca calculan reglas ni dinero: solo piden acciones y muestran lo que publica el tablero.
- **Firebase solo hace de buzón.** El juego habla con un «transporte» (`escuchar`, `set`, `update`, `empujar`…). Hay tres:
  - uno **en memoria**, que imita a Firebase al escribir (listas a objetos, sin valores vacíos), para probar todo sin red;
  - uno **HTTP** (`src/net/http.js`), que habla con el relé del servidor local de la laptop: es el modo para jugar en casa,
    por la wifi, sin Firebase (más abajo);
  - y habrá otro **con Firebase** de verdad, para jugar por internet.

  Cambiar de uno a otro no toca el motor ni las pantallas.
- **Todo es público, salvo el azar.** Cualquier celular puede leer el estado de la partida (el dinero de cada uno, sus
  calles…), porque en el juego es público. Lo único que no sale son el estado del azar y el orden de los mazos: si
  salieran, se podría saber qué dado o qué carta viene.

## Qué se guarda y quién lo escribe

```
salas/ABCD/
  meta                { anfitrion: uid, creada: ms, version: 1 }                   solo el tablero
  estado/…            el estado de la partida, sin secretos, por partes             solo el tablero; lo lee todo el mundo
                      (con «publicacion»: el número de cada publicación)
  vistas/<uid>/       { id, n, puede: {…}, error?: {…} }                            solo el tablero; solo lo lee ese uid
  acciones/<clave>    { uid, accion: {…} }                                          los celulares las escriben; solo el tablero las lee y las borra
```

- **El código de la sala** son cuatro consonantes (`BCDFGHJKLMNPRSTVWXZ`): sin vocales no forman palabras.
- **`estado`** es el estado del motor (`src/engine/juego.js`) pasado por `src/net/codec.js`. Firebase no guarda `null`, ni
  objetos o listas vacías, y convierte las listas en objetos con índices (`0`, `1`…): el codificador hace esa conversión a
  propósito, y `decodificar` la deshace y repone los campos vacíos para que el estado sea idéntico al original.
- **Se escribe por partes.** `diferencias(antes, después)` da solo las hojas que cambian
  (`estado/jugadores/j1/dinero: 1750`), y se escriben de golpe con un `update`. Hay del orden de mil cambios por partida
  y la descarga gratuita de Firebase es de 360 MB al día.
- **`vistas/<uid>`** es lo que le toca solo a ese celular: su jugador (`id`) y sus botones (`puede`). `puede` sale de
  `src/engine/posibles.js`, que prueba cada acción con el propio motor sobre una copia del estado: lo que ve el jugador y
  lo que acepta el tablero no pueden contradecirse. Si una acción falla, el tablero le deja ahí el `error` (código, datos y
  un número para saber si es nuevo), y el celular lo traduce con `src/ui/errores.js`.
- **Estado y botones llegan juntos.** El número de la publicación va dentro del propio `estado` y también en la vista:
  el celular sabe que está «al día» cuando coinciden y no actúa con el estado de una publicación y los botones de otra.

## Cómo es una partida

1. **Abrir la sala.** El tablero se conecta con su inicio de sesión anónimo, elige un código libre y escribe
   `salas/CODIGO/meta` con su `uid` como anfitrión. Muestra el código y un QR.
2. **Unirse.** El celular entra con el código, también con un inicio de sesión anónimo, y pide
   `{ type: 'unirse', nombre, ficha }`. El tablero le asigna un jugador (`j1`, `j2`…) y se lo apunta a su `uid`.
3. **Jugar.** Cada acción es `acciones/<clave>: { uid, accion }`. El tablero:
   - pone el jugador que corresponde a ese `uid` (quien manda la acción no dice quién es, así nadie se hace pasar por otro);
   - rechaza lo que es solo suyo (`configurar`, `empezar`, `cerrarSubasta`, `finPorTiempo`);
   - reconstruye las listas que Firebase convirtió en objetos (las propiedades de un trato);
   - la pasa por el motor, anima el resultado en la pantalla y **después** la publica. Así los celulares no destripan la
     sorpresa: ven el resultado cuando termina la animación.
4. **Cerrar.** El tablero borra `salas/CODIGO`. Las salas olvidadas se limpian con una herramienta de mantenimiento.

**Lo que mueve el propio tablero.** Los bots y las subastas no los mueve ningún celular: la orquesta
(`src/net/orquesta.js`) mira el estado, programa la jugada del bot que toca (o el cierre de una subasta: enseguida si nadie
puede pujar, a los 10 s si hay personas) y la aplica con `anfitrion.accionSi(version, accion)`, que la descarta si mientras
tanto llegó otra acción.

- **Un trato sin contestar para una persona no frena a los bots** (ella contesta cuando quiera); uno para un bot lo contesta
  el bot enseguida.
- **Delegar en un bot.** Si una persona se ausenta o se le cae el celular, el tablero (el botón BOT de su tarjeta) puede poner
  un bot a jugar por ella: la orquesta la trata como a un bot (`delegados`) hasta que se lo quiten. Es del tablero, no del
  celular: quien está en la mesa decide.
- La subasta entre personas se cierra a los 10 s sin pujas (el tablero todavía no enseña la cuenta atrás).

## Jugar en casa, sin Firebase (el relé local)

`node tools/serve.js` sirve la web y, en `/red`, hace de buzón (`tools/red-local.js`): guarda la base de datos en memoria y
responde al transporte HTTP.

```
POST /red/op          { uid, op: 'set'|'update'|'remove'|'get'|'empujar', ruta, valor, cambios }
GET  /red/escuchar    ?uid=&tipo=valor|hijos&ruta=   conexión larga con eventos «data: …» ({k:'valor',v}, {k:'hijo',c,v}; el
                      primero, {k:'listo'})
GET  /red/info        { ok, direcciones }: dónde encontrar la laptop en la wifi (las páginas lo piden para saber si hay relé)
```

- El tablero se abre por `localhost` y el QR lleva la dirección de la laptop en la wifi (la primera de una red doméstica:
  192.168…, 10…, 172.16…). Los celulares entran por ahí.
- Escuchar es un `fetch` que se lee a trozos (sin `EventSource`, así funciona igual en el navegador y en Node); si se corta,
  vuelve a conectar solo y recibe el valor de ahora.
- **Detalle que costó encontrar:** con `Content-Type: text/event-stream`, Chrome no entrega la respuesta de `fetch()` hasta
  que llega un segundo trozo (aunque haya relleno y datos), así que lo primero que se enviaba tardaba varios segundos. Con
  `text/plain` y `X-Content-Type-Options: nosniff` llega en milisegundos; por eso el relé manda ese tipo.
- **No tiene ninguna seguridad** (cualquiera de la red puede leer y escribir) y lo que guarda se pierde al apagarlo: es para
  casa y para desarrollo. Si se recarga la página del tablero a media partida, la sala se pierde.

## La pantalla del celular

`public/jugador.html` + `src/ui/jugador/`. Entra con `?sala=ABCD` (el QR del tablero lo lleva), escribe su nombre (que
recuerda), elige ficha y juega.

- **Qué pantalla toca** sale de lo que se sabe (`pantallaActual`): conectando, sala que no existe o cerrada, nombre,
  vestíbulo, partida o final. Solo se enseña lo que está completo: el estado y los botones de la misma publicación.
- **Los botones son los de `vista.puede`**, que calcula el propio motor. Las cifras de cada botón (lo que cuesta construir, lo
  que se cobra al hipotecar o al vender un edificio, el precio de un paquete de acciones) salen de las mismas funciones del
  motor que usa el tablero al resolver la acción (`motor.costeConstruir`, `valorVentaEdificio`, `valorHipoteca`…).
- **Una acción a la vez:** al mandar una, los botones se desactivan hasta que el tablero publica algo nuevo o contesta con un
  error (o pasan 20 s). El error llega en la vista y se traduce con `src/ui/errores.js`.
- **Tiene en cuenta que el tablero anima antes de publicar:** el celular no ve el resultado hasta que acaba la animación.
- Vibra al empezar el turno, al abrirse una subasta o al llegar un trato, y pide que la pantalla no se apague.

## Las reglas de seguridad

Están en [`database.rules.json`](../database.rules.json). Lo que dicen, en corto:

| Ruta | Quién lee | Quién escribe |
|---|---|---|
| `salas/$sala` | nadie (solo se leen las rutas de abajo) | nadie, salvo lo de abajo |
| `meta` | todos | quien crea la sala (si no existe) y, después, solo el anfitrión |
| `estado` | todos | solo el anfitrión |
| `vistas/$uid` | solo ese `uid` | solo el anfitrión |
| `acciones/$clave` | solo el anfitrión | cualquiera, para crear una con su propio `uid` (no se puede cambiar); el anfitrión, para borrarla |

- El código de la sala tiene que ser de cuatro consonantes.
- Cada acción solo puede llevar los campos que existen, con su tipo y un tamaño máximo.
- **Hace falta el inicio de sesión anónimo** (Authentication → Anónimo). Sin él, `auth.uid` no existe y estas reglas no
  protegen nada; restringir la clave de API tampoco protege la base de datos.
- **Lo que las reglas no pueden evitar:** que alguien que conozca un código mande acciones basura (el tablero las
  rechaza, y cada una gasta un poco de descarga) o que ocupe códigos libres. Para un grupo de amigos es aceptable.

## Cómo se prueba

- `tests/red-base.test.js`: el codificador y la base en memoria (que escribe como Firebase).
- `tests/red-partida.test.js`: un tablero y cuatro celulares juegan **una partida entera** por la red, también con latencia,
  y al final todos ven lo mismo que el tablero y el dinero de cada uno cuadra con sus movimientos.
- `tests/red-http.test.js`: el transporte HTTP contra el relé, incluida una partida entera con un tablero y cuatro celulares.
- `tests/orquesta.test.js`: los bots juegan solos y las subastas se cierran.
- `tests/posibles.test.js`: los botones de cada jugador.
- `tests/jugador-vista.test.js`: lo que enseña el celular. Comprueba, en cientos de estados de partidas entre bots, que cada cifra
  de un botón es la que aplica el motor.
- `tests/pantalla-red.test.js` y `tests/pantalla-celular.test.js`: en un Chrome de verdad, el tablero abre la sala y un celular
  entra, elige ficha y juega (tirar, comprar, habilidad, construir, Bolsa, trato, subasta).
- Con el proyecto de Firebase creado, `node tools/comprobar-reglas.js` (pendiente) probará las reglas contra la base de
  datos de verdad: lo que debe aceptar y lo que debe rechazar.
