# Créditos de las imágenes

Aquí se anota **de dónde sale cada imagen** de `public/visuales/` y bajo qué licencia se publica. La lista de lo que
hay que dibujar, el estilo y los tamaños están en [`docs/VISUALES.md`](../../docs/VISUALES.md).

Solo se aceptan imágenes **propias** o con una **licencia que permita usarlas y redistribuirlas** (por ejemplo CC0,
CC BY o CC BY-SA). No se aceptan capturas, escaneos ni recortes de juegos de terceros.

## Cómo completarlo

Una fila por grupo de imágenes. En la primera columna, las rutas relativas a esta carpeta entre comillas invertidas;
se puede usar un `*` para todos los archivos de una carpeta (por ejemplo `fichas/piezas/*.webp`).

| Archivos | Autoría / herramienta | Licencia | Fecha | Notas |
|---|---|---|---|---|
| `fichas/piezas/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Pintura naturalista gouache según docs/VISUALES.md |
| `fichas/retratos/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Pintura naturalista gouache según docs/VISUALES.md |
| `tablero/centro/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Pintura naturalista gouache según docs/VISUALES.md |
| `tablero/esquinas/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Pintura naturalista gouache según docs/VISUALES.md |
| `tablero/edificios/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Maquetas en pintura gouache según docs/VISUALES.md |
| `tablero/barrios/*.svg` | Código propio | CC0 | 24 de octubre de 2026 | Pictogramas vectoriales según docs/VISUALES.md sección 7.13 |
| `tablero/casillas/*.svg` | Código propio | CC0 | 24 de octubre de 2026 | Pictogramas vectoriales según docs/VISUALES.md sección 7.13 |
| `tablero/marcadores/*.svg` | Código propio | CC0 | 24 de octubre de 2026 | Pictogramas vectoriales según docs/VISUALES.md sección 7.13 |
| `botones/habilidades/activas/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Insignias minimalistas de habilidades activas según docs/VISUALES.md sección 7.6 |
| `botones/habilidades/pasivas/*.webp` | Antigravity (Google Imagen 3) | CC0 | 24 de octubre de 2026 | Insignias minimalistas de habilidades pasivas según docs/VISUALES.md sección 7.7 |
| `tarjetas/dorsos/*.webp` | Antigravity (Google Imagen 3) | CC0 | 25 de octubre de 2026 | Dorsos de cartas según docs/VISUALES.md sección 7.8 |
| `tarjetas/efectos/*.webp` | Antigravity (Google Imagen 3) | CC0 | 25 de octubre de 2026 | Bodegones de cartas según docs/VISUALES.md sección 7.9 |

| `botones/acciones/*.svg` | Código propio | CC0 | 24 de octubre de 2026 | Pictogramas vectoriales según docs/VISUALES.md sección 7.13 |
| `interfaz/iconos/*.svg` | Código propio | CC0 | 24 de octubre de 2026 | Pictogramas vectoriales según docs/VISUALES.md sección 7.13 |



## Recomendaciones

- Guarda los originales en alta resolución **fuera** del repositorio (por ejemplo en `visuales-originales/`, que git
  ignora) y prepara las versiones para la web con `python tools/optimizar-imagenes.py --aplicar`.
- Si una imagen se generó con IA, anota la herramienta y el modelo, y no pidas ni uses el estilo de una obra, un
  autor, un estudio o un juego concretos.
- Comprueba todo con `npm run revisar:imagenes` antes de subirlo.
