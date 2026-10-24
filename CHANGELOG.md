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
