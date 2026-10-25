# La red: cómo se hablan el tablero y los celulares

> **Para quien desarrolle.** Describe lo que hay en `src/net/` y las reglas de seguridad de Firebase. La guía para crear
> el proyecto de Firebase está en [FIREBASE.md](FIREBASE.md).

## La idea

- **El tablero manda.** Es la «autoridad»: recibe lo que piden los celulares, lo pasa por el motor y publica el resultado.
  Los celulares nunca calculan reglas ni dinero: solo piden acciones y muestran lo que publica el tablero.
- **Firebase solo hace de buzón.** El juego habla con un «transporte» (`escuchar`, `set`, `update`, `empujar`…). Hay uno
  en memoria, que imita a Firebase al escribir (listas a objetos, sin valores vacíos), para probar todo sin red, y habrá
  otro con Firebase de verdad. Cambiar de uno a otro no toca el motor ni las pantallas.
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
- `tests/posibles.test.js`: los botones de cada jugador.
- Con el proyecto de Firebase creado, `node tools/comprobar-reglas.js` (pendiente) probará las reglas contra la base de
  datos de verdad: lo que debe aceptar y lo que debe rechazar.
