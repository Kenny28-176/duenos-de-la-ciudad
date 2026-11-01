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
  - y otro **con Firebase** (`src/net/firebase.js`), para jugar por internet desde la web publicada (más abajo).

  Cambiar de uno a otro no toca el motor ni las pantallas.
- **Todo es público, salvo el azar.** (Las pantallas no enseñan el dinero en efectivo de los demás, docs/DISENO.md sección 8, pero va en
  el estado.) Cualquier celular puede leer el estado de la partida (el dinero de cada uno, sus
  calles…), porque en el juego es público. Lo único que no sale son el estado del azar y el orden de los mazos: si
  salieran, se podría saber qué dado o qué carta viene.

## Qué se guarda y quién lo escribe

```
salas/ABCD/
  meta                { anfitrion: uid, creada: ms, version: 1 }                   solo el tablero
  estado/…            el estado de la partida, sin secretos, por partes             solo el tablero; lo lee todo el mundo
                      (con «publicacion»: el número de cada publicación)
  vistas/<uid>/       { id, n, puede: {…}, atendidas, movimientos?: {…}, error?: {…} }  solo el tablero; solo lo lee ese uid
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
- **`movimientos`** (dentro de la vista) son los últimos 12 movimientos de dinero de ese jugador (`MAX_MOVIMIENTOS`), con su motivo:
  `{ 17: { de, a, cantidad, motivo }, 18: … }`. El tablero los anota de cada evento `dinero` que emite el motor (el banco no tiene
  historial) y solo los lee su dueño: lo que paga y cobra cada uno no tiene por qué verlo el resto. Van **por número y no por
  posición** (el número es único, sube siempre y empieza en 1: así el mapa no se confunde con una lista de Firebase): cada movimiento
  nuevo escribe una sola entrada y borra la más vieja, en vez de reescribir las doce. Con `revancha` se vacían (los números siguen
  subiendo) y la instantánea para recuperar la partida los lleva. El celular los enseña al tocar su dinero («Mis movimientos») y avisa
  un momento de lo que entra o sale (`src/ui/jugador/movimientos.js`).
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
4. **Cerrar.** El tablero borra `salas/CODIGO`. Si la página se cierra sin cerrar la sala (al acabar, o en el vestíbulo), la sala se
   queda: el tablero apunta las que abre (`duenos:salas`, en su navegador) y, al volver a abrirse, borra las suyas que tengan más de 12
   horas (así nunca toca una partida en marcha en otra pestaña). Descartar una partida guardada borra su sala al momento.

**Lo que mueve el propio tablero.** Los bots y las subastas no los mueve ningún celular: la orquesta
(`src/net/orquesta.js`) mira el estado, programa la jugada del bot que toca (o el cierre de una subasta: enseguida si nadie
puede pujar, a los 10 s si hay personas) y la aplica con `anfitrion.accionSi(version, accion)`, que la descarta si mientras
tanto llegó otra acción.

- **Un trato sin contestar para una persona no frena a los bots** (ella contesta cuando quiera); uno para un bot lo contesta
  el bot enseguida.
- **Delegar en un bot.** Si una persona se ausenta o se le cae el celular, el tablero (el botón BOT de su tarjeta) puede poner
  un bot a jugar por ella: la orquesta la trata como a un bot (`delegados`) hasta que se lo quiten. Es del tablero, no del
  celular: quien está en la mesa decide.
- La subasta entre personas se cierra a los 10 s sin pujas (`SEGUNDOS_DE_SUBASTA`, en `protocolo.js`), y cada puja vuelve a contar. El tablero y el celular enseñan la cuenta atrás como una barra que se vacía y se reinicia con cada publicación.

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
  casa y para desarrollo.

## Jugar por internet: Firebase

`src/net/firebase.js` habla con Firebase Realtime Database por su **API web** (REST y eventos del servidor), sin la biblioteca de
Firebase: no hay código de terceros que descargar ni que mantener al día, y pesa unos pocos KB.

- **Cuándo se usa.** `redDisponible()` (`src/net/conectar.js`) elige: si la página la sirve la laptop (`node tools/serve.js`), el relé
  local; si no, en una página segura (https: la web publicada), Firebase, con la configuración de `src/net/firebase-config.js` (el bloque
  `firebaseConfig` de la consola: `apiKey` y `databaseURL`; no es secreto). Una página de la laptop (http) nunca se va sola a Firebase: si
  su relé no contestara un momento, el celular no debe acabar en otra red que el tablero. Con `?red=firebase` se usa Firebase aunque haya
  relé. El enlace del QR lleva a los celulares a la misma red que el tablero.
- **Quién es cada uno.** El inicio de sesión anónimo (`accounts:signUp`) da el `uid` con el que trabajan las reglas. El token dura una hora
  y se renueva solo (antes de caducar, y si Firebase contesta 401 o manda `auth_revoked`). La sesión se guarda en el navegador
  (`duenos:firebase-tablero` y `duenos:firebase-celular`): al recargar, el celular sigue siendo el mismo jugador y el tablero, el dueño de
  su sala. Si lo que falla es la red, no se crea otra cuenta.
- **Escribir.** `set` es un PUT, `update` un PATCH de varias rutas en la raíz y `remove` un DELETE, todos con `print=silent` (Firebase no
  devuelve lo escrito: no gasta descarga). Las escrituras salen de una en una y en orden, y se repiten con esperas crecientes si falla la
  red o Firebase (5xx). Todas se pueden repetir sin riesgo: `empujar` inventa aquí la clave (ordenada por la hora, como las de Firebase) y
  escribe con PUT; las reglas dejan que un celular repita su propia acción, y el tablero no atiende dos veces la misma clave.
- **Escuchar.** Con `EventSource`: Firebase manda un `put` con lo que hay, y luego `put` y `patch` con cada cambio (un `update` de varias
  rutas llega en un solo `patch`), `keep-alive` cada 30 s, `cancel` si se pierde el permiso y `auth_revoked` al caducar el token. Cada
  escucha guarda una copia de su ruta, le aplica los cambios y entrega lo que llega seguido de una vez. Si la conexión se calla más de 75 s
  (ni el `keep-alive`), se abre otra.
- **Listas.** Firebase devuelve como lista un objeto con claves numéricas «casi seguidas» (los movimientos `{ 1: …, 2: … }` llegan como
  `[null, …, …]`): el transporte lo deshace, para que todo llegue igual que desde la base en memoria.
- **Lo que gasta.** El estado publicado pesa de 3,5 a 5 KB y una partida entera manda a cada celular unos 150 KB de cambios: la descarga
  gratuita da para miles de partidas al mes. Cada escucha abierta cuenta como una conexión: el tablero usa 1 y cada celular 3 (el estado,
  su vista y la meta), así que una partida de 4 usa 13 de las 100 conexiones a la vez del plan gratuito.
- **La imitación de Firebase** (`tools/firebase-falso.js`) se porta como Firebase en todo lo anterior y aplica las reglas de
  `database.rules.json` con el evaluador de `tools/reglas-firebase.js`. Se abre a mano con `node tools/firebase-falso.js` y el tablero con
  `?red=firebase&firebase=http://127.0.0.1:9100` (ese parámetro solo vale en una página abierta desde la propia laptop: en la web
  publicada, un enlace no puede llevar a los celulares a otro servidor).

## Recuperar la partida si se recarga el tablero

La partida vive en el tablero (la «autoridad»): si su página se recarga o se cierra, se perdería. Para evitarlo:

- **Se guarda** tras cada jugada, ya publicada, en el `localStorage` del navegador del tablero (`duenos:partida`): la
  instantánea del anfitrión (`anfitrion.instantanea()`), que lleva el estado entero **con el azar y los mazos** (que no se
  publican), quién es cada celular y las cuentas de publicaciones y acuses (`atendidas`), más los bots y los delegados. Pesa
  unas decenas de KB. Se borra al cerrar la sala o al acabar la partida, y se da por abandonada a las 12 horas.
- **Al volver a abrir** el tablero se ofrece «Recuperar la partida» (o descartarla). Recuperar crea un anfitrión con la opción
  `recuperar` sobre **la misma sala**: reescribe lo publicado, sigue contando las publicaciones desde donde iban y retoma las
  acciones que los celulares hubieran mandado mientras tanto (siguen en el buzón). Los celulares no se enteran: su conexión se
  recupera sola y vuelven a ver su estado.
- **Límites:** la jugada que se estuviera animando en ese momento (aplicada pero aún sin publicar) se pierde, y el celular que la
  mandó puede repetirla; solo funciona en el mismo navegador (es donde está lo guardado); y si otro tablero ha cogido esa sala, no
  se le quita.
- **El tiempo ya jugado** (si la partida tiene límite) también se guarda (`jugadoMs`) y se retoma.

## El final de la partida: el reloj y jugar otra vez

- **El reloj es del tablero.** El motor no sabe qué hora es: con la opción `limiteMinutos` (null = sin límite) el tablero cuenta el tiempo
  en que la partida corre (`src/ui/tablero/reloj.js`, una cuenta pura que se prueba sin esperar; no cuenta la pausa ni un portátil
  dormido) y, al agotarse, manda la acción propia `finPorTiempo`. Los celulares no pueden mandarla (no está en
  `ACCIONES_DE_CELULAR`). El motor pone `ultimaRonda` en el estado (los celulares lo ven y avisan) y emite el evento `ultimaRonda`
  (el narrador, el aviso de pantalla y el gong); la partida acaba al cerrarse la ronda con el motivo `tiempo`. Con `?reloj=N` en la
  dirección del tablero cada segundo cuenta por N: es para las pruebas.
- **Tras el final, la orquesta devuelve `null`** (la partida ya acabó): el reproductor termina y nadie se queda esperando una acción que no
  llegará. El tablero enseña «Jugar otra vez» y «Cerrar la sala».
- **Jugar otra vez** es la acción propia `revancha` (solo vale con la partida acabada, tampoco la pueden mandar los celulares): deja el estado
  como una sala recién abierta pero con los mismos jugadores (nombre, ficha, si son bots), las mismas opciones y el azar donde estaba. El tablero
  publica, vuelve al vestíbulo (con las opciones de la partida anterior) y los celulares, que ven `fase: 'sala'` y siguen siendo el mismo jugador,
  vuelven solos a la pantalla de la sala. `tests/red-revancha.test.js` lo prueba por la red con una segunda partida entera.

## La pantalla del celular

`public/jugador.html` + `src/ui/jugador/`. Entra con `?sala=ABCD` (el QR del tablero lo lleva), escribe su nombre (que
recuerda), elige ficha y juega.

- **Qué pantalla toca** sale de lo que se sabe (`pantallaActual`): conectando, sala que no existe o cerrada, nombre,
  vestíbulo, partida o final. Solo se enseña lo que está completo: el estado y los botones de la misma publicación.
- **Los botones son los de `vista.puede`**, que calcula el propio motor. Las cifras de cada botón (lo que cuesta construir, lo
  que se cobra al hipotecar o al vender un edificio, el precio de un paquete de acciones) salen de las mismas funciones del
  motor que usa el tablero al resolver la acción (`motor.costeConstruir`, `valorVentaEdificio`, `valorHipoteca`…).
- **Una acción a la vez:** al mandar una, los botones se desactivan hasta que el tablero acusa recibo (o pasan 20 s). El acuse es
  el contador `atendidas` de la vista, que sube cuando el tablero atiende una acción de ese celular, aplicada (con la jugada ya
  animada y publicada) o rechazada. No basta con que llegue cualquier publicación: si el tablero estaba animando la jugada de otro,
  la mía aún no se ha aplicado, y volver a ofrecer los botones con datos viejos dejaría repetirla. El error llega en la vista y se
  traduce con `src/ui/errores.js`.
- **Tiene en cuenta que el tablero anima antes de publicar:** el celular no ve el resultado hasta que acaba la animación.
- **Sabe si tiene conexión:** el transporte HTTP dice si está «en línea» (`enLinea()` y `alCambiarConexion()`: cuenta como viva una escucha
  que está recibiendo datos, y está en línea cuando lo están todas). Si el celular pierde la conexión más de 3 segundos, sale una franja
  ámbar «Sin conexión con el tablero. Reconectando…» arriba del todo, y se quita sola cuando vuelve (una reconexión rápida no avisa).
- Vibra y suena un aviso (`src/ui/sonido.js`) al empezar el turno, al abrirse una subasta o al llegar un trato, y pide que la pantalla
  no se apague. El aviso sonoro existe porque los iPhone no vibran desde el navegador; viene encendido y se apaga en la pestaña Mesa
  (se recuerda en el celular). Los navegadores no dejan sonar hasta que alguien toca la pantalla: en el celular eso pasa solo, al
  escribir el nombre y elegir ficha.

## El sonido y la voz del tablero

No hay archivos de audio: todo se sintetiza con WebAudio en el navegador (`src/ui/sonido.js`), así no pesa nada, no hay derechos de
nadie y suena igual en los dos idiomas.

- **Qué suena con cada evento** lo dice `sonidoDeEvento(e)`, una función pura. El dinero que ya suena con su propio evento (la compra, la
  obra, el sueldo…) no suena dos veces. Cada sonido es una receta del catálogo `SONIDOS` (notas, golpes de ruido filtrado y
  campanitas metálicas); `tests/sonido.test.js` revisa cada receta con un audio de mentira y `tests/sonido-navegador.test.js` las
  «graba» con el audio de Chrome para medir que se oigan, no se recorten y no se alarguen.
- **El reproductor** (`src/ui/tablero/reproductor.js`) lanza el sonido de cada evento a la vez que su animación. Con el tablero a ×4 o más
  solo suena lo principal; los sonidos se acortan con la velocidad y no suena nada hasta el primer toque de pantalla.
- **La voz** (`src/ui/voz.js`, `speechSynthesis`) es opcional y viene apagada. Lee las frases del narrador de los eventos que cuentan
  (compras, alquileres, cartas con su texto, subastas, quiebras…), elige la mejor voz del idioma que tenga el equipo y el reproductor
  espera a que acabe cada frase antes de seguir, como un comentarista. A ×4 o más no habla. Si el navegador no tiene voz, el botón no sale.
- **Los botones «Sonido» y «Voz»** del panel del tablero se recuerdan en el navegador (`duenos:sonido`).
- **El banco de sonidos** (`public/sonidos.html`, también con `?idioma=en`) tiene un botón por cada sonido y uno para oírlos todos: sirve
  para ajustarlos sin jugar una partida.

## Las reglas de seguridad

Están en [`database.rules.json`](../database.rules.json). Lo que dicen, en corto:

| Ruta | Quién lee | Quién escribe |
|---|---|---|
| `salas/$sala` | nadie (solo se leen las rutas de abajo) | el anfitrión, solo para borrarla entera (cerrar la sala); lo demás, abajo |
| `meta` | todos | quien crea la sala (si no existe) y, después, solo el anfitrión |
| `estado` | todos | solo el anfitrión |
| `vistas/$uid` | solo ese `uid` | solo el anfitrión |
| `acciones/$clave` | solo el anfitrión | cualquiera, para crear una con su propio `uid` o repetir la suya (un reintento; la de otro no se puede pisar); el anfitrión, para borrarla |

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
- `tests/red-atendidas.test.js`: el acuse de recibo (`atendidas`), también con publicaciones ajenas por medio.
- `tests/red-recuperar.test.js`: la instantánea del anfitrión; restaurada, devuelve el estado entero (con el azar y los mazos), la
  partida sigue idéntica, y los celulares siguen jugando con el tablero nuevo como si no hubiera pasado nada.
- `tests/partida-celulares.test.js`: partidas enteras por la interfaz de celulares de Chrome con un jugador al azar, con un anfitrión
  en Node y con la página del tablero (`tools/jugar-con-celulares.js`).
- `tests/pantalla-red.test.js` y `tests/pantalla-celular.test.js`: en un Chrome de verdad, el tablero abre la sala y un celular
  entra, elige ficha y juega (tirar, comprar, habilidad, construir, Bolsa, trato, subasta).
- `tests/reglas-firebase.test.js`: las reglas de seguridad con el evaluador de `tools/reglas-firebase.js`: lo que hacen el tablero y los
  celulares está permitido (con una acción de cada tipo, con todos sus campos) y lo que no les toca, prohibido.
- `tests/red-firebase.test.js`: el transporte de Firebase contra la imitación (con las reglas): la sesión anónima, escribir y leer por
  partes, las listas que devuelve Firebase, los cortes de red, los tokens que caducan, las acciones repetidas y una partida entera.
- `tests/pantalla-firebase.test.js`: en un Chrome de verdad y por la imitación de Firebase, el tablero abre la sala, un celular entra por el
  enlace del QR y juega, nada se rechaza, y al cerrar la sala (o al volver a abrir el tablero, con las salas viejas) no queda nada.
- **Con el proyecto de Firebase creado**, `node tools/comprobar-reglas.js` prueba las reglas y el transporte contra la base de datos de
  verdad: 27 cosas que deben permitirse o rechazarse, y enseña los eventos tal como los manda Firebase (con `--eventos`). Usa una sala de
  prueba con un código al azar y la borra al acabar. `tests/comprobar-reglas.test.js` la prueba contra la imitación.
