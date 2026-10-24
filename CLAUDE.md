# Dueños de la Ciudad — guía para desarrollar (y para asistentes de IA)

> Idioma base de la app, de los textos y de los comentarios: **español**. Habrá traducción al **inglés** (el español
> es la referencia y el respaldo).

## Qué es

Un juego de **compraventa de propiedades** para jugar **en persona**, entre amigos adultos:

- Una **laptop o tablet es el tablero**: muestra la ciudad, mueve las fichas, tira los dados, hace de **banco** y
  aplica todas las reglas.
- **Cada jugador usa su celular como cartera**: su dinero, sus calles y sus acciones, y los botones para tirar,
  comprar, pujar, construir, hipotecar, invertir y negociar.

Lo que lo hace distinto es el **mercado vivo** (cada barrio cotiza en la Bolsa) y la **meta de patrimonio** (gana el
primero que llega a la meta y vuelve a la Salida). Todo funciona en el navegador, sin instalar nada. Es un proyecto
**libre (MIT), gratuito y sin ánimo de lucro**, hermano de *Aldeanos vs Lobos*.

**Estado:** fase 1 hecha. El motor, los bots y el simulador funcionan, pero todavía no hay pantallas. Lo siguiente es la
fase 2, el tablero animado. Las reglas están en borrador en [`docs/DISENO.md`](docs/DISENO.md) y las ideas para
después, en [`docs/IDEAS.md`](docs/IDEAS.md).

## Reglas de contenido (importante)

- **Todo el contenido debe ser original** o tener una licencia compatible.
- Este género tiene un juego comercial muy famoso. **No uses su nombre ni nada que lo imite o lo recuerde:**
  - ni el aspecto de su tablero, ni el diseño o la función de sus cuatro esquinas;
  - ni sus fichas, ni los nombres de sus mazos, ni los textos de sus cartas, ni sus calles;
  - ni sus tablas de precios y alquileres, ni su reglamento.
- Las **mecánicas** sí son libres: dados, comprar, cobrar alquiler, construir, hipotecar, subastar y negociar.
- **Ningún nombre de marca de terceros** en títulos, textos de la interfaz, documentación, palabras clave ni nombres de
  archivo. [`tests/marcas.test.js`](tests/marcas.test.js) falla si aparece alguna palabra de su lista, que va
  codificada. Eso incluye los términos de economía terminados como el nombre de esa marca, para no acercarse a ella.
- **Las cifras** (precios, alquileres, sueldos y acciones) salen de las fórmulas de `docs/DISENO.md`, ajustadas con el
  simulador. Nunca se copian tablas de otros juegos.
- **Textos con palabras propias.**
- **Imágenes propias** o con una licencia que permita redistribuirlas.
  - Van en `public/visuales/`, con su origen anotado en `public/visuales/CREDITOS.md`.
  - Siguen la lista, el estilo, los tamaños y los formatos de [`docs/VISUALES.md`](docs/VISUALES.md): 512 px como
    máximo, salvo las excepciones de `tools/limites-imagenes.json`.
  - Si se generan con IA, nunca se pide el estilo ni los elementos de otro juego, y se revisa que no lleven firmas,
    logotipos ni textos ajenos.
- **Nada de claves privadas ni datos personales** en el repositorio. La `apiKey` web de Firebase es pública por
  diseño. Lo que protege la base de datos son las **reglas** y el **inicio de sesión anónimo**. Sin ese inicio de
  sesión, restringir la clave no protege Realtime Database.
- **Material local que nunca se sube.** Estas rutas están en `.gitignore`:
  - `PLAN.md`: el plan de trabajo;
  - `Documentos/`: material de referencia con derechos de terceros. Sirve solo para entender mecánicas: nunca se
    copia;
  - `visuales-originales/`: los originales en alta resolución de las imágenes.

## Arquitectura (decidida)

| Tema | Decisión |
|---|---|
| Tablero | **Laptop o tablet**, también TV, en horizontal. Ejecuta el motor (la «autoridad»), el banco, los dados, la voz y el sonido. |
| Jugadores | Su celular (Android o iPhone), en el navegador. Entran con un enlace y el código de la sala, o escaneando un QR. |
| Sincronización | **Firebase Realtime Database** (plan gratuito), con **inicio de sesión anónimo** y reglas por usuario. Los celulares nunca calculan reglas ni dinero. |
| Datos en Firebase | **Por partes** (`jugadores/j1/dinero`, `casillas/12/dueno`…), escribiendo solo lo que cambia. Hay del orden de mil cambios por partida y la descarga gratuita es de 360 MB al día. |
| Red | Aislada en un módulo (`src/net/`). Así se puede añadir después un modo de red local o de navegador a navegador sin tocar el motor. |
| Stack | JS modular (módulos ES) sin paso de compilación. Pantallas con Preact + htm, copiados en `public/vendor/`. Nada se carga de servidores externos. |
| Tablero visual | **2D**: SVG generado desde los datos, animaciones con la API del navegador y dados en CSS 3D. El dibujo va separado del motor. |
| Idiomas | Ningún texto visible va escrito en el código: sale de los diccionarios de `src/i18n/`, como en *Aldeanos vs Lobos*. Hay una carpeta por idioma (`es/` y `en/`), con cuatro partes: `juego`, `narrador`, `errores` e `interfaz`. |

Reglas de oro:

- **El tablero es la autoridad.** Lee las acciones de los celulares, resuelve y publica el resultado. Un celular solo
  escucha su propia vista y la pública.
- **El motor es puro:** `paso(estado, acción) → { estado, eventos }`. El azar tiene semilla y vive dentro del estado.
  Se prueba sin red y con miles de partidas simuladas.
- **Tableros y cartas viven en datos**, no en `if`s. El tablero es un grafo de casillas (la vuelta de siempre es un
  caso particular) y la forma de ganar es intercambiable. Así, los modos de `docs/IDEAS.md` no obligan a rehacer el
  motor.
- **Los eventos se convierten en animaciones.** El motor devuelve eventos (`dados`, `mover`, `pagar`…) y el tablero
  los reproduce en cola. Los celulares esperan a que termine la animación para no destripar la sorpresa.
- **Cada movimiento de dinero queda anotado** con su motivo, y la suma cuadra con el dinero de cada jugador.

## Mapa del código

```
index.html, public/      portada (es y en/) y estilos; más adelante, las pantallas del tablero y del celular
public/visuales/         imágenes del juego (marca, tablero, fichas, tarjetas, botones, interfaz) y su CREDITOS.md
src/data/                los datos del juego: tablero.json, economia.json, fichas.json y cartas.json, y cargar.js
src/engine/              el motor puro: juego.js (acciones y permisos), turno, cartas, subasta, gestion, tratos,
                         quiebra, habilidades, dinero, contexto (fórmulas y patrimonio) y rng; bots.js y simulador.js
tools/                   serve.js (servidor local), construir-sitio.js (revisa y empaqueta la web para Pages),
                         simular.js (equilibrio con bots), revisar-imagenes.js, optimizar-imagenes.py y
                         hoja-de-contactos.js (con las reglas de limites-imagenes.json)
tests/                   pruebas (node:test, sin dependencias): reglas del motor, partidas entre bots, marcas,
                         documentación, web e imágenes
docs/                    DISENO.md (las reglas tal como las aplica el motor), VISUALES.md (todo lo que hay que dibujar),
                         IDEAS.md (para después)
```

Lo que llega en las fases 2 y 3:

- `src/net/`: la conexión con Firebase;
- `src/ui/`: las pantallas;
- `src/i18n/`: los idiomas.

## Cómo se trabaja

```
npm test                                 # todas las pruebas
node tools/serve.js                      # servidor local en http://localhost:8080/public/
node tools/construir-sitio.js --revisar  # comprueba que la web no depende de servidores externos
npm run simular -- --partidas 1000       # partidas entre bots: duración, victorias por ficha y por asiento…
                                         # (--jugadores N, --sin-habilidades, --ajuste fichas.toro.pasiva.factor=2)
npm run revisar:imagenes                 # lista, nombre, formato, medida exacta, SVG y créditos de public/visuales/
python tools/optimizar-imagenes.py       # informa (con --aplicar, recorta, deja la medida exacta y pasa a WebP)
npm run hoja:visuales                    # hoja de contactos para comparar las imágenes (visuales-originales/)
```

- **Las imágenes las genera otra herramienta en paralelo**, siguiendo `docs/VISUALES.md`, y sube solo
  `public/visuales/`. No mezcles en un mismo commit código e imágenes, y no edites imágenes ajenas. Si el código
  necesita una imagen nueva, añádela primero a `docs/VISUALES.md`.

- **Puede haber otra IA trabajando a la vez** en esta carpeta. Su reparto de tareas está en `trabajoParalelo.md`, un
  archivo local que no se sube. Si existe, léelo antes de tocar nada: dice de quién es cada archivo.

- Antes de subir cambios: `npm test` en verde.
- **Commits pequeños**, con un mensaje claro en español y con `git add` de **archivos concretos**, nunca
  `git add -A`. El dueño también edita desde otro IDE y hace sus propios commits.
- **Commit solo de tus rutas:** `git commit -m "…" -- <rutas>`. El índice de git es compartido, y así no te llevas lo
  que otro haya preparado.
- Si cambia una regla, `docs/DISENO.md` se actualiza en el mismo commit que el motor.
- Las cifras de las fichas y de la economía se cambian solo con datos del simulador (`npm run simular`).
