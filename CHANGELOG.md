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
