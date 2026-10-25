# Registro de cambios

Aquí se anotan los cambios de cada versión. Las versiones siguen el esquema mayor.menor.parche.

## [Sin publicar]

### Añadido

- Base del proyecto: licencia MIT, aviso legal, normas de contenido y de colaboración, código de conducta y política
  de seguridad.
- Prueba de palabras prohibidas en todo el repositorio, para no nombrar marcas ni elementos de juegos comerciales.
- Revisión de la web (sin servidores externos ni enlaces rotos), servidor local e integración continua con publicación
  en GitHub Pages.
- Borradores de las reglas ([`docs/DISENO.md`](docs/DISENO.md)) y de las ideas para después
  ([`docs/IDEAS.md`](docs/IDEAS.md)).
- Habilidades de las 10 fichas (una pasiva y una activa cada una) en el diseño.
- Lista de todo lo que hay que dibujar, con su estilo, tamaños y carpetas ([`docs/VISUALES.md`](docs/VISUALES.md)).
- Carpeta `public/visuales/` con sus créditos, revisión automática de las imágenes (formato, tamaño y créditos) y un
  optimizador que las reduce y las convierte a WebP.
- `docs/VISUALES.md` pasa a ser una guía de estilo completa para que las imágenes sean coherentes:
  - tipo de dibujo, línea, luz, perspectiva y hora del día;
  - paleta cerrada con sus tonos de sombra y brillo;
  - identidad de cada barrio y hojas de personaje de las 10 fichas;
  - objetos que se repiten;
  - fichas técnicas con encuadre, posición y tamaño de cada tipo de imagen.
- La revisión de imágenes ahora comprueba:
  - que cada imagen esté en la lista de la guía y tenga un nombre válido;
  - la medida exacta de su carpeta;
  - la construcción común de los iconos SVG.

  Además, cuenta las imágenes que faltan. El optimizador recorta a la proporción exacta, y hay una hoja de contactos
  (`npm run hoja:visuales`) para comparar las imágenes entre sí.
- El diseño fija la orientación del tablero en pantalla (la Salida abajo a la izquierda, avance en el sentido de las
  agujas del reloj).
- Nueva dirección de arte, pensada para jóvenes adultos y adultos:
  - pintura naturalista y sobria de aspecto gouache, en lugar de dibujos animados;
  - animales y objetos reales, sin humanizar, en composiciones minimalistas y con una paleta apagada y terrosa;
  - insignias como botones esmaltados (activas) y medallas acuñadas (pasivas);
  - iconos de línea fina (trazo 4);
  - retratos, esquinas, cartas y escenas pintados con su ambiente;
  - la portada adopta la nueva paleta.
- Hoja de estilo aprobada (piezas de la Rata, el Toro y la Burbuja y retrato de la Rata). La guía se ajusta a ella:
  - peanas lisas: el color del jugador lo pone el código con un anillo bajo la pieza;
  - retratos con un borde fino de papel;
  - las insignias de las habilidades pasan a ser gráficos planos y minimalistas: hexágono verde con un relieve mínimo
    para las activas y roseta dorada plana para las pasivas, con el símbolo en silueta.
- **Fase 1, el motor del juego** (`src/engine/`). Aplica todas las reglas de `docs/DISENO.md`:
  - turnos, dobles y Calabozo;
  - compras, subastas y alquileres;
  - casas, torres e hipotecas;
  - las cartas de Noticias y Fortuna;
  - la Bolsa y los dividendos;
  - los tratos, las deudas y la bancarrota;
  - la meta de patrimonio y el final por tiempo;
  - las habilidades de las 10 fichas.

  Es puro y reproducible: cada acción da un estado nuevo y una lista de eventos, y el azar tiene semilla.
- Los datos del juego (`src/data/`): el tablero de 40 casillas, la economía, las 10 fichas y las 32 cartas, con textos
  propios.
- Bots y un simulador de partidas (`npm run simular`):
  - en cada paso comprueba que el dinero cuadra y que nunca hay más edificios ni acciones de los que existen;
  - con `--ajuste` se prueban otras cifras sin tocar los datos.
- Pruebas de las reglas, con dados elegidos, y de 105 partidas completas entre bots, de 2 a 8 jugadores.
- Cifras de las habilidades ajustadas con el simulador. Con 4 jugadores, todas las fichas quedan a menos de 3 puntos
  del 25 % de victorias que les correspondería. Los resultados, también con 2, 3, 6 y 8 jugadores, están en
  `docs/DISENO.md` (sección 10).
- Guía paso a paso para crear el proyecto de Firebase: [`docs/FIREBASE.md`](docs/FIREBASE.md).
- Algunas cifras de las habilidades cambian según el número de jugadores (`porJugadores` en `src/data/fichas.json`),
  para que ninguna ficha tenga ventaja con pocos o con muchos rivales.
- Los bots valoran cada subasta a su manera, como haría una persona. Con valoraciones idénticas, el Tiburón ganaba
  casi todas las subastas en las partidas de muchos jugadores.
- Fase 2, primeras piezas del tablero:
  - la cola de animaciones;
  - la partida de demostración entre bots;
  - la geometría de las 40 casillas;
  - el dibujo del tablero en SVG, con la franja de color en el borde exterior y los textos sin quedar nunca boca
    abajo.
- Bibliotecas y tipografías locales en `public/vendor/` (Preact + htm, qrcode-generator, Fraunces e Inter), con
  `npm run vendor` para descargarlas y comprobar su huella.
- Idiomas: el módulo de traducción (`src/i18n/`), con formatos de dinero y porcentajes, y todos los textos del juego y
  del narrador en español y en inglés.
- Más pruebas: los datos, las 32 cartas, los diccionarios, 20 casos límite de las reglas y el contraste de los colores
  (`tools/contraste.js`).
- `tools/relato.js` cuenta una partida entre bots como lo haría el narrador.
- El README en inglés, al día.

- **Fase 2, la pantalla del tablero** (`public/tablero.html`), con una partida de demostración entre bots:
  - la ciudad pintada en el centro, las casillas con su franja de color, su icono y su precio, y las cuatro esquinas;
  - las fichas caminan casilla a casilla sobre un anillo del color de cada jugador, y se reparten el sitio cuando
    comparten casilla;
  - dueños, casas, torres y marcadores (hipotecada, en obras…) sobre el tablero;
  - dados en 3D, cartas que se dan la vuelta, subastas y avisos de habilidades;
  - panel con el dinero de cada jugador (que sube y baja con números flotantes), su patrimonio y su avance hacia la
    meta, la Bolsa con flechas ▲▼ y el registro de lo que pasa;
  - pausa, velocidad ×1 a ×8, de 2 a 8 jugadores, español e inglés, y se adapta a pantallas bajas.
- El narrador (`src/ui/narrador.js`) convierte los eventos del motor en frases; lo usan la pantalla y `tools/relato.js`.
- Pruebas de la pantalla en Chrome sin ventana (`tests/pantalla.test.js`) y herramientas para verla sin abrirla a mano
  (`tools/ver.js` y `tools/navegador.js`).
- La portada enlaza a la demostración del tablero.

- **Fase 3, la red entre el tablero y los celulares** (`src/net/`, `docs/RED.md`), probada sin Firebase:
  - el tablero (anfitrión) recibe las acciones de los celulares, las pasa por el motor y publica el resultado por partes;
  - cada celular (cliente) ve el estado público y sus propios botones, y pide acciones sin decir quién es (el tablero lo
    sabe por su identidad, así nadie se hace pasar por otro);
  - una base de datos en memoria que escribe como Firebase (listas a objetos, sin valores vacíos) permite probar todo;
  - una prueba juega una partida entera entre un tablero y cuatro celulares, con y sin latencia, y comprueba que todos
    acaban viendo lo mismo y que el dinero cuadra.
- Qué botones tiene cada jugador (`src/engine/posibles.js`): lo calcula el propio motor, probando cada acción, así lo que
  ve el celular y lo que acepta el tablero no pueden contradecirse.
- Los errores del motor llevan sus datos y se traducen al español y al inglés (81 textos).
- Las reglas de seguridad de Firebase (`database.rules.json`), con pruebas de que no dejan nada abierto de más.
- **Jugar con celulares en casa, sin Firebase**: el servidor local (`node tools/serve.js`) hace de buzón por la wifi
  (`tools/red-local.js`, `src/net/http.js`). El tablero abre una sala con su código y su QR, deja añadir bots y elegir las
  opciones, y una orquesta (`src/net/orquesta.js`) mueve a los bots y cierra las subastas.
- **La pantalla del celular** (`public/jugador.html`, `src/ui/jugador/`): entrar con el código, escribir el nombre, elegir
  ficha y jugar con los botones que da el tablero: tirar, comprar, subastar y pujar, construir, vender, hipotecar, comprar y
  vender acciones, tratos, habilidades, deudas y bancarrota. En español y en inglés. Las cifras de cada botón salen del motor,
  y una prueba comprueba, en cientos de estados de partidas entre bots, que coinciden con lo que luego se aplica.
- Pruebas de punta a punta en un Chrome de verdad: el celular entra, elige ficha y juega (`tests/pantalla-celular.test.js`), y
  el tablero abre una sala con celulares (`tests/pantalla-red.test.js`).

### Cambiado

- Los colores del juego están ahora en `public/tema.css`, compartidos por el tablero y el celular.
- Una ficha que está sola en su casilla se ve más grande; si comparten casilla, se achican para que quepan todas.

- Diez cartas tienen ahora textos, temas o cifras propios, para no parecerse a las de ningún juego comercial. Por
  ejemplo, el cumpleaños pasa a ser una rifa y el paseo, una visita guiada. La prueba de palabras prohibidas vigila
  también esas frases.
