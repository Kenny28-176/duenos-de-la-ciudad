# Lo visual de Dueños de la Ciudad

> **Para quién es:** para la herramienta que genera las imágenes, que trabaja en paralelo con el código, y para Kenny,
> que aprueba el estilo.
>
> **Qué contiene:** todas las imágenes que hay que crear, la carpeta y el nombre exacto de cada una, el estilo común, y
> cómo prepararlas y subirlas. El código y la documentación los lleva otra parte del equipo: aquí solo se tocan
> `public/visuales/` y su `CREDITOS.md`.

## 1. Cómo trabajar, paso a paso

1. **Lee el estilo común** (sección 2) antes de generar nada.
2. **Empieza por la hoja de estilo.** Genera solo 3 piezas de fichas: la Rata, el Toro y la Burbuja. Enséñaselas a
   Kenny. Cuando las apruebe, sigue con el resto usando esas 3 como referencia, para que todo tenga el mismo estilo.
3. **Genera cada imagen** con la descripción de la sección 4. Puedes generarla en el tamaño que dé la herramienta (por
   ejemplo, 1024 px).
4. **Guarda el original** en `visuales-originales/`, con la misma ruta. Git ignora esa carpeta, así que no se sube.
5. **Copia la imagen** a `public/visuales/` con la ruta y el nombre exactos de la tabla. Puede ir en `.png`.
6. **Prepárala para la web:** `python tools/optimizar-imagenes.py --aplicar`. Reduce cada imagen al tamaño de su
   carpeta, la convierte a WebP y conserva la transparencia.
7. **Anota los créditos** en [`public/visuales/CREDITOS.md`](../public/visuales/CREDITOS.md), con una fila por
   carpeta: herramienta y modelo, licencia (CC0) y fecha.
8. **Revisa:** `npm run revisar:imagenes` tiene que terminar en ✔.
9. **Sube solo lo visual:**
   - primero `git pull`;
   - después `git add public/visuales`;
   - después un commit en español, como «Visuales: piezas de las 10 fichas».

   **Nunca** `git add -A`: el código se está cambiando a la vez, y se mezclarían los trabajos.

Si una imagen no convence, se reemplaza el archivo con el mismo nombre y se repiten los pasos 6 a 9.

## 2. Estilo común

### Dirección de arte

- **El mundo:** una ciudad moderna inventada, latinoamericana, alegre y cálida. Es para adultos, pero amable, con
  humor ligero: las fichas son metáforas de la economía.
- **El estilo:** ilustración 2D vectorial plana con volumen suave.
  - Formas simples y redondeadas, contorno oscuro de grosor medio (color «tinta» `#1D2430`).
  - Sombras de un solo tono, luz desde arriba a la izquierda.
  - Colores vivos, sin texturas fotográficas ni degradados complicados.
- **Legible en pequeño:** casi todo se verá entre 40 y 120 px. La silueta tiene que entenderse sin colores.
- **Coherencia:** todas las imágenes parecen del mismo juego. Usa siempre como referencia la hoja de estilo aprobada.

### Colores

**La interfaz:**

| Uso | Color |
|---|---|
| Fondo del tablero (noche) | `#16202E` |
| Casillas y tarjetas (crema) | `#F4F1EA` |
| Contornos y texto (tinta) | `#1D2430` |
| Dinero y lo positivo | `#0F7B6C` |
| La Bolsa sube | `#2BB673` |
| La Bolsa baja, pagos | `#E5484D` |
| Destacado (ámbar) | `#F2A541` |

**Los 8 barrios:**

| Barrio | Archivo (id) | Color |
|---|---|---|
| Los Talleres | `talleres` | gris acero `#6E7B8B` |
| La Feria | `feria` | fucsia `#D9468F` |
| Puerto Viejo | `puerto-viejo` | turquesa `#18A999` |
| Barrio Universitario | `universitario` | violeta `#7A4FD1` |
| Centro Histórico | `centro-historico` | terracota `#C1502E` |
| Jardines del Río | `jardines-del-rio` | verde hoja `#4C9A2A` |
| Distrito Financiero | `distrito-financiero` | azul eléctrico `#2563EB` |
| Altos del Mirador | `altos-del-mirador` | dorado `#D4A017` |

**Las 10 fichas** (cada una tiene su color, que se usa en su peana, su retrato y sus insignias):

| Ficha | Archivo (id) | Color |
|---|---|---|
| La Rata | `rata` | naranja `#F4A261` |
| La Taza | `taza` | café `#8D5524` |
| El Toro | `toro` | rojo `#E63946` |
| El Oso | `oso` | verde bosque `#2D6A4F` |
| La Burbuja | `burbuja` | celeste `#4CC9F0` |
| La Vaca Lechera | `vaca-lechera` | amarillo mantequilla `#F9C74F` |
| El Elefante Blanco | `elefante-blanco` | rosa `#F28482` |
| La Hormiga | `hormiga` | violeta `#7B2CBF` |
| El Tiburón | `tiburon` | azul marino `#1D4E89` |
| El Cisne Negro | `cisne-negro` | negro azulado `#22223B` |

### Prohibido en todas las imágenes

- **Texto:** ni letras, ni números, ni símbolos de monedas reales. Los nombres y las cifras los pone el código, en el
  idioma de cada jugador. Si la herramienta pinta letras, hay que regenerar la imagen.
- **Marcas:** ni firmas, ni logotipos, ni marcas de agua.
- **Nada que recuerde al juego comercial más famoso de este género:**
  - ni un señor mayor con sombrero de copa y bigote;
  - ni fichas de metal plateado (sombrero, dedal, plancha, bota, perro, carretilla, barco de guerra, coche de
    carreras);
  - ni signos de interrogación en las cartas, ni cofres del tesoro, ni locomotoras, ni bombillas, ni grifos;
  - ni una flecha roja de salida, ni un policía señalando, ni rejas con cartel, ni un coche rojo de aparcamiento;
  - ni el fondo verde menta, ni billetes de colores pastel, ni casas verdes con hoteles rojos.
- **Nada de otras obras:** no se pide «al estilo de» ningún juego, película, estudio o artista, y no se mencionan
  marcas en las instrucciones. Tampoco personajes de otras obras, personas reales ni esculturas o edificios famosos
  reconocibles.

### Plantilla de instrucciones

Cada imagen se pide con esta base, más la descripción de la sección 4:

```
Ilustración 2D para un juego de mesa digital, estilo vectorial plano con volumen suave: formas simples y
redondeadas, contorno oscuro (#1D2430) de grosor medio, sombras suaves de un solo tono, luz desde arriba a la
izquierda, colores vivos y cálidos. Sin texto, sin letras, sin números, sin logotipos, sin firma y sin marca de
agua. [Fondo transparente | Fondo de color liso #XXXXXX]. Tema: [descripción de la sección 4].
```

## 3. Formatos y tamaños

| Tipo | Formato | Tamaño máximo | Peso máximo |
|---|---|---|---|
| **Ilustraciones** (fichas, esquinas, tarjetas, insignias…) | WebP | 512 px por lado | 120 KB |
| **Iconos** (barrios, casillas, marcadores, acciones, interfaz) | SVG de un solo color | — | 20 KB |
| Centro del tablero | WebP | 1024 px | 300 KB |
| Portada | WebP | 1600 px | 300 KB |
| Imagen para redes | PNG o JPG | 1200 px | 300 KB |
| Icono de la app | PNG | 512 px | 150 KB |

- **Reglas de los iconos SVG:**
  - `viewBox="0 0 64 64"`;
  - pintados con `fill="currentColor"` o `stroke="currentColor"` (el código les da el color);
  - formas simples que se entiendan a 24 px; si son de línea, trazo de 4;
  - sin colores fijos, sin texto, sin imágenes incrustadas, sin scripts y sin tipografías.
- **Si la herramienta no sabe hacer SVG,** puede entregar un WebP de 256 px con la silueta en blanco sobre fondo
  transparente, con el mismo nombre (`.webp` en lugar de `.svg`).
- **Las reglas exactas** están en `tools/limites-imagenes.json`, y el optimizador y la revisión las aplican solos.

## 4. Lista de imágenes

**Prioridades:**

- **P1:** hace falta para la fase 2 (el tablero animado).
- **P2:** hace falta para las fases 3 y 4 (los celulares).
- **P3:** hace falta para la publicación.

Las rutas son relativas a `public/visuales/`. En total son **141 imágenes**.

### 4.1 Fichas (`fichas/`)

**Piezas** (`fichas/piezas/`, P1). Son las fichas que se mueven por el tablero: 10 ilustraciones WebP de 256 px con
fondo transparente.

- **Cómo es cada una:** una figura estilizada de pie sobre una peana redonda del color de su ficha.
- **Vista:** 3/4 desde arriba, mirando un poco a la derecha. La figura ocupa el 80 % del alto, con una sombra suave bajo
  la peana.
- **Acabado:** mate, como un juguete de vinilo pintado. **No** de metal plateado.

| Archivo | Qué dibujar |
|---|---|
| `fichas/piezas/rata.webp` | Una rata con corbata y un maletín pequeño, en postura de correr. |
| `fichas/piezas/taza.webp` | Una taza de café con asa y ojos simpáticos; el vapor sale en forma de flecha que sube. |
| `fichas/piezas/toro.webp` | Un toro robusto con cuernos dorados, en postura de embestir hacia arriba. |
| `fichas/piezas/oso.webp` | Un oso pardo grande y tranquilo, con bufanda. |
| `fichas/piezas/burbuja.webp` | Una burbuja de jabón iridiscente con carita y una casita dentro. |
| `fichas/piezas/vaca-lechera.webp` | Una vaca simpática con manchas y una campana dorada al cuello. |
| `fichas/piezas/elefante-blanco.webp` | Un elefante blanco con un casco de obra amarillo. |
| `fichas/piezas/hormiga.webp` | Una hormiga que carga una moneda más grande que ella. |
| `fichas/piezas/tiburon.webp` | Un tiburón con corbata y gafas de sol, con la aleta bien visible. |
| `fichas/piezas/cisne-negro.webp` | Un cisne negro elegante con el pico rojo y la mirada misteriosa. |

**Retratos** (`fichas/retratos/`, P2). Se ven al elegir ficha en el celular: 10 ilustraciones WebP de 512 px. Cada
personaje va dentro de un medallón redondo sobre fondo liso de su color, y la escena cuenta su metáfora.

| Archivo | Qué dibujar |
|---|---|
| `fichas/retratos/rata.webp` | La Rata corre dentro de una rueda de ejercicio hecha con una moneda gigante: cansada pero decidida. |
| `fichas/retratos/taza.webp` | La Taza sobre un platito con monedas apiladas; su vapor dibuja una curva que sube. |
| `fichas/retratos/toro.webp` | El Toro, confiado, sobre una gráfica que sube. |
| `fichas/retratos/oso.webp` | El Oso, con los brazos cruzados frente a una gráfica que baja, satisfecho. |
| `fichas/retratos/burbuja.webp` | La Burbuja, enorme, flota sobre la ciudad con casas dentro, a punto de rozar una aguja. |
| `fichas/retratos/vaca-lechera.webp` | La Vaca junto a un cántaro del que salen monedas en vez de leche. |
| `fichas/retratos/elefante-blanco.webp` | El Elefante Blanco, delante de un puente enorme que no lleva a ninguna parte. |
| `fichas/retratos/hormiga.webp` | Una fila de hormigas lleva monedas pequeñas a un hormiguero con forma de hucha. |
| `fichas/retratos/tiburon.webp` | El Tiburón, de traje, nada entre gráficas que parecen olas. |
| `fichas/retratos/cisne-negro.webp` | El Cisne Negro se desliza sobre un lago oscuro donde se refleja un relámpago; algunas plumas se convierten en cartas. |

### 4.2 Tablero (`tablero/`, P1)

El tablero lo dibuja el código. Aquí van las piezas que pone encima.

**Centro** (`tablero/centro/`):

| Archivo | Tamaño | Qué dibujar |
|---|---|---|
| `tablero/centro/ciudad.webp` | 1024 px | Mapa ilustrado de la ciudad inventada, en vista aérea con una inclinación suave, al atardecer y con las primeras luces encendidas. Se reconocen los 8 barrios: talleres industriales, feria con carpas, puerto con faro, campus universitario, centro histórico con campanario, jardines junto a un río, distrito financiero con rascacielos y colinas con casas elegantes. Colores con poca saturación (encima van las fichas y los avisos) y bordes que se funden con el fondo `#16202E`. |

**Esquinas** (`tablero/esquinas/`): 4 ilustraciones WebP de 512 px con fondo crema `#F4F1EA`.

| Archivo | Qué dibujar |
|---|---|
| `tablero/esquinas/salida.webp` | **Día de pago:** el arco de entrada de la ciudad, con un gran sobre de sueldo abierto del que salen monedas. Un camino empieza bajo el arco. |
| `tablero/esquinas/calabozo.webp` | Una celda moderna de comisaría vista de frente, con una banca fuera para quien solo pasa. Luz fría azulada, sin personas ni carteles. |
| `tablero/esquinas/bolsa-de-valores.webp` | La fachada de un edificio de bolsa con columnas modernas y una gran pizarra luminosa con flechas verdes y rojas. A los lados de la escalera, un toro y un oso pequeños y estilizados, que no imiten ninguna escultura real. |
| `tablero/esquinas/auditoria.webp` | **¡Auditoría!:** una lupa gigante sobre un libro de cuentas abierto, un sello de goma rojo y una luz giratoria ámbar. Sin personas ni policías. |

**Iconos de los barrios** (`tablero/barrios/`): 8 SVG de un solo color. Van en cada calle y en las tarjetas.

| Archivo | Qué dibujar |
|---|---|
| `tablero/barrios/talleres.svg` | Una llave inglesa cruzada con un engranaje. |
| `tablero/barrios/feria.svg` | Una carpa de feria con banderín. |
| `tablero/barrios/puerto-viejo.svg` | Un ancla. |
| `tablero/barrios/universitario.svg` | Un birrete. |
| `tablero/barrios/centro-historico.svg` | Un campanario. |
| `tablero/barrios/jardines-del-rio.svg` | Un árbol con ondas de agua debajo. |
| `tablero/barrios/distrito-financiero.svg` | Una gráfica de barras que sube. |
| `tablero/barrios/altos-del-mirador.svg` | Una estrella sobre una colina. |

**Iconos de las otras casillas** (`tablero/casillas/`): 10 SVG de un solo color.

| Archivo | Qué dibujar |
|---|---|
| `tablero/casillas/terminal-de-buses.svg` | Un autobús de frente. |
| `tablero/casillas/metro-central.svg` | Un tren de metro de frente, con dos faros. |
| `tablero/casillas/teleferico.svg` | Una cabina colgada de un cable entre dos montañas. |
| `tablero/casillas/aeropuerto.svg` | Un avión de perfil, despegando. |
| `tablero/casillas/compania-de-agua.svg` | Una gota con ondas. |
| `tablero/casillas/red-de-internet.svg` | Una antena con ondas de señal. |
| `tablero/casillas/noticias.svg` | Un periódico doblado. |
| `tablero/casillas/fortuna.svg` | Una rueda de la fortuna (noria) pequeña. |
| `tablero/casillas/impuesto-al-patrimonio.svg` | Una balanza con un maletín en un plato y monedas en el otro. |
| `tablero/casillas/agencia-de-bolsa.svg` | Un maletín con una flecha en zigzag. |

**Edificios** (`tablero/edificios/`): 2 ilustraciones WebP de 128 px con fondo transparente, en la misma vista 3/4 que
las fichas.

| Archivo | Qué dibujar |
|---|---|
| `tablero/edificios/casa.webp` | Una casa moderna pequeña: fachada crema, techo azul pizarra y una ventana iluminada. |
| `tablero/edificios/torre.webp` | Una torre de viviendas y oficinas de cristal turquesa, con una antena. |

**Marcadores** (`tablero/marcadores/`): 9 SVG de un solo color. Se ponen sobre una calle o junto a una ficha para
mostrar un estado.

| Archivo | Qué dibujar | Cuándo se usa |
|---|---|---|
| `tablero/marcadores/hipotecada.svg` | Un candado cerrado. | La calle está hipotecada. |
| `tablero/marcadores/en-obras.svg` | Un cono y una valla de obra. | Obras eternas del Elefante Blanco. |
| `tablero/marcadores/inflada.svg` | Una burbuja con un destello. | La calle está inflada por la Burbuja. |
| `tablero/marcadores/estallada.svg` | Una burbuja rota con salpicaduras. | La burbuja estalló. |
| `tablero/marcadores/retenido.svg` | Una puerta de celda. | El jugador está retenido en el Calabozo. |
| `tablero/marcadores/hibernando.svg` | Una luna creciente con tres curvitas de sueño (sin letras). | El Oso hiberna. |
| `tablero/marcadores/marcado.svg` | Una aleta de tiburón dentro de una diana. | Frenesí del Tiburón. |
| `tablero/marcadores/pierde-turno.svg` | Un reloj de arena con una raya diagonal. | Imprevisto del Cisne Negro. |
| `tablero/marcadores/en-racha-final.svg` | La llave de la ciudad. | El jugador alcanzó la meta y vuelve a la Salida. |

### 4.3 Botones (`botones/`, P2)

El código dibuja el marco de cada botón y sus estados (disponible, desactivado y la cuenta de turnos de recarga). Aquí
van **los símbolos** que van dentro.

**Insignias de las habilidades.** Cada ficha tiene una habilidad activa y otra pasiva (ver `docs/DISENO.md`). Son 20
ilustraciones WebP de 256 px con fondo transparente, que deben entenderse a 48 px.

| | Activas (`botones/habilidades/activas/`) | Pasivas (`botones/habilidades/pasivas/`) |
|---|---|---|
| **Forma** | Hexágono con las esquinas redondeadas, borde blanco grueso y contorno exterior oscuro. | Medalla redonda con doble borde dorado (`#D4A017`) y muescas alrededor, como el canto de una moneda. |
| **Fondo** | El color de la ficha, con un degradado suave (más claro arriba) y un brillo curvo en la parte de arriba: tiene que parecer que se puede pulsar. | El color de la ficha, más oscuro. |
| **Símbolo** | Grande y blanco, con contorno oscuro, en el centro. | Blanco o dorado, en el centro. |

| Ficha | Activa: archivo y símbolo | Pasiva: archivo y símbolo |
|---|---|---|
| Rata | `esprint.webp`: un dado lanzado con líneas de velocidad detrás y una pequeña huella de rata. | `horas-extra.webp`: un reloj despertador con una moneda dorada al lado y una flecha pequeña que sube. |
| Taza | `prestamo-expres.webp`: una mano que entrega una moneda grande, junto a un reloj de arena pequeño. | `interes-a-favor.webp`: una taza humeante cuyo vapor forma una flecha curva hacia arriba, con dos monedas apiladas al lado. |
| Toro | `rally.webp`: una gráfica de línea que se dispara hacia arriba en zigzag, con una estela de chispas. | `optimista.webp`: una cabeza de toro de frente, con cuernos dorados y una moneda brillante entre ellos. |
| Oso | `hibernar.webp`: la cabeza de un oso dormido, con los ojos cerrados, bajo una luna creciente. | `apuesta-bajista.webp`: una garra de oso sobre una flecha que baja, atrapando una moneda. |
| Burbuja | `inflar.webp`: una burbuja enorme a punto de estallar y una aguja que se acerca. | `valor-inflado.webp`: una casita dentro de una burbuja brillante, con destellos. |
| Vaca Lechera | `temporada-alta.webp`: una campana de vaca dorada que vibra, con rayos de sol detrás. | `renta-fija.webp`: un cántaro de leche del que caen monedas en fila, ordenadas. |
| Elefante Blanco | `obras-eternas.webp`: una valla de obra a rayas con un cono naranja delante. | `constructora.webp`: una grúa de obra con una etiqueta de descuento colgando (la etiqueta sin texto). |
| Hormiga | `hormiguero.webp`: un hormiguero con una barrera de peaje a rayas cerrando la entrada. | `peaje-hormiga.webp`: tres hormigas en fila con monedas pequeñas a la espalda. |
| Tiburón | `frenesi.webp`: una aleta de tiburón dentro de una diana, con ondas en el agua. | `cazador-de-gangas.webp`: un martillo de subasta con la aleta de un tiburón asomando detrás. |
| Cisne Negro | `imprevisto.webp`: un reloj de arena volcado y agrietado, con una pluma negra que cae. | `antifragil.webp`: un escudo con una pluma negra en el centro y grietas alrededor que no lo tocan. |

Cada archivo va en la carpeta de su columna. Por ejemplo, `botones/habilidades/activas/esprint.webp` y
`botones/habilidades/pasivas/horas-extra.webp`.

**Iconos de las acciones** (`botones/acciones/`): 24 SVG de un solo color, para los botones del celular y del menú del
tablero.

| Archivo | Qué dibujar | | Archivo | Qué dibujar |
|---|---|---|---|---|
| `tirar-dados.svg` | Dos dados. | | `vender-acciones.svg` | Una gráfica de barras con un signo menos. |
| `agitar-celular.svg` | Un celular con líneas de vibración. | | `pagar-fianza.svg` | Una moneda que entra por una puerta de celda. |
| `comprar.svg` | Una mano con la llave de una casa. | | `salvoconducto.svg` | Un pase con una estrella. |
| `pasar.svg` | Una flecha que rodea un punto. | | `terminar-turno.svg` | Una marca de verificación dentro de un círculo. |
| `subastar.svg` | Un martillo de subasta. | | `bancarrota.svg` | Un bolsillo vuelto del revés, vacío. |
| `pujar.svg` | Una mano levantada con una moneda. | | `usar-habilidad.svg` | Un rayo dentro de un hexágono. |
| `construir.svg` | Una casa con un signo más. | | `aceptar.svg` | Una marca de verificación. |
| `vender-edificio.svg` | Una casa con una flecha que sale hacia una moneda. | | `rechazar.svg` | Una equis. |
| `hipotecar.svg` | Un candado cerrado sobre una casa. | | `volver.svg` | Una flecha hacia la izquierda. |
| `levantar-hipoteca.svg` | Un candado abierto sobre una casa. | | `ajustes.svg` | Un engranaje. |
| `tratos.svg` | Un apretón de manos. | | `ayuda.svg` | Un salvavidas. |
| `comprar-acciones.svg` | Una gráfica de barras con un signo más. | | `pantalla-completa.svg` | Cuatro esquinas hacia fuera. |

### 4.4 Tarjetas (`tarjetas/`, P2)

El código pone el texto y el marco de cada tarjeta. Aquí van las ilustraciones.

**Dorsos** (`tarjetas/dorsos/`): 2 ilustraciones WebP de 366 × 512 px. Son diseños simétricos, como el dorso de una
carta, con un borde de patrón geométrico.

| Archivo | Qué dibujar |
|---|---|
| `tarjetas/dorsos/noticias.webp` | Un periódico doblado delante de siluetas de edificios. Colores tinta y crema, con acentos azul marino. |
| `tarjetas/dorsos/fortuna.webp` | Una rueda de la fortuna (noria) cuyas cabinas son monedas. Colores ámbar y dorado. |

**Efectos de las cartas** (`tarjetas/efectos/`): 13 ilustraciones WebP de 512 × 384 px. Van en el frente de las cartas
de Noticias y Fortuna, según lo que haga cada carta.

| Archivo | Qué dibujar |
|---|---|
| `tarjetas/efectos/cobrar.webp` | Una mano que recibe monedas que caen del cielo. |
| `tarjetas/efectos/pagar.webp` | Una billetera abierta de la que se escapan monedas volando. |
| `tarjetas/efectos/avanzar.webp` | Una señal de tráfico con una flecha hacia delante y un coche pequeño en marcha. |
| `tarjetas/efectos/retroceder.webp` | Una señal de desvío por obras, con una flecha curva hacia atrás. |
| `tarjetas/efectos/viaje.webp` | Boletos de bus, metro y teleférico abiertos en abanico. |
| `tarjetas/efectos/calabozo.webp` | Una puerta de celda que se cierra, con una lupa de auditor delante. Sin policías. |
| `tarjetas/efectos/salvoconducto.webp` | Un pase dorado con una cinta roja y un sello. |
| `tarjetas/efectos/bolsa-sube.webp` | Una pizarra de cotizaciones con flechas verdes y confeti. |
| `tarjetas/efectos/bolsa-baja.webp` | Una pizarra de cotizaciones con flechas rojas que caen y papeles volando. |
| `tarjetas/efectos/llega-empresa.webp` | Un camión de mudanza con cajas y una grúa que levanta un edificio de oficinas. |
| `tarjetas/efectos/reparaciones.webp` | Un andamio con un casco y herramientas sobre una fachada. |
| `tarjetas/efectos/cumpleanos.webp` | Un pastel con velas y sobres con monedas. |
| `tarjetas/efectos/subsidio.webp` | El edificio del ayuntamiento con un gran lazo de regalo. |

**Cabeceras** (`tarjetas/cabeceras/`): 14 escenas horizontales WebP de 512 × 256 px. Encabezan la tarjeta de cada
propiedad en el celular y se ven en grande en el centro del tablero cuando alguien cae en ella. En los barrios
predomina su color.

| Archivo | Qué dibujar |
|---|---|
| `tarjetas/cabeceras/talleres.webp` | Una calle industrial con talleres, chispas de soldadura, ladrillo y grúas pequeñas. |
| `tarjetas/cabeceras/feria.webp` | Un mercado al aire libre con carpas de colores, banderines y puestos de fruta. |
| `tarjetas/cabeceras/puerto-viejo.webp` | Un muelle con barcas de pesca, un faro y gaviotas. |
| `tarjetas/cabeceras/universitario.webp` | Un campus con biblioteca, árboles y bicicletas. |
| `tarjetas/cabeceras/centro-historico.webp` | Una plaza con campanario y casas antiguas con balcones. |
| `tarjetas/cabeceras/jardines-del-rio.webp` | Un paseo junto al río, con sauces, puentes pequeños y flores. |
| `tarjetas/cabeceras/distrito-financiero.webp` | Rascacielos de cristal inventados, con pantallas que muestran gráficas. |
| `tarjetas/cabeceras/altos-del-mirador.webp` | Colinas con casas elegantes y un mirador sobre la ciudad al atardecer. |
| `tarjetas/cabeceras/terminal-de-buses.webp` | Andenes con autobuses de colores y viajeros con maletas. |
| `tarjetas/cabeceras/metro-central.webp` | Un andén de metro moderno con un tren que llega. |
| `tarjetas/cabeceras/teleferico.webp` | Cabinas de teleférico sobre los tejados y las colinas. |
| `tarjetas/cabeceras/aeropuerto.webp` | Una terminal con un avión despegando al fondo. |
| `tarjetas/cabeceras/compania-de-agua.webp` | Un depósito de agua con tuberías y una fuente. |
| `tarjetas/cabeceras/red-de-internet.webp` | Una torre de antenas con cables y luces de señal. |

### 4.5 Interfaz (`interfaz/`, P2)

**Iconos:** 6 SVG de un solo color.

| Archivo | Qué dibujar |
|---|---|
| `interfaz/moneda.svg` | Una moneda, sin ningún símbolo. |
| `interfaz/patrimonio.svg` | Un maletín. |
| `interfaz/meta.svg` | La llave de la ciudad: su paletón dibuja el perfil de unos edificios. |
| `interfaz/acciones.svg` | Un certificado enrollado con una gráfica. |
| `interfaz/sube.svg` | Un triángulo hacia arriba. |
| `interfaz/baja.svg` | Un triángulo hacia abajo. |

**Ilustraciones:** 4 WebP de 512 px.

| Archivo | Qué dibujar |
|---|---|
| `interfaz/victoria.webp` | La llave de la ciudad, gigante y dorada, sobre la ciudad, con confeti y fuegos artificiales. |
| `interfaz/bancarrota.webp` | Una maleta abierta y vacía, con una polilla que sale volando. |
| `interfaz/mirando-el-tablero.webp` | Unos prismáticos que apuntan a una tablet con la ciudad. El celular la muestra mientras el tablero anima. |
| `interfaz/sala-de-espera.webp` | Las 10 fichas en fila ante el arco de entrada de la ciudad, esperando para entrar. |

### 4.6 Marca (`marca/`, P3)

| Archivo | Formato y tamaño | Qué dibujar |
|---|---|---|
| `marca/emblema.webp` | WebP, 512 px, fondo transparente | La llave de la ciudad, dorada, cuyo paletón dibuja el perfil de unos edificios, sobre un círculo `#16202E`. |
| `marca/icono-512.png` | PNG, 512 × 512 px | El emblema sobre un fondo liso `#16202E`, ocupando solo el 60 % central (los celulares recortan los bordes del icono). El resto de tamaños los saca el código. |
| `marca/portada.webp` | WebP, 1600 × 900 px | La ciudad al atardecer vista desde el mirador. En primer plano, las 10 fichas como personajes que miran la ciudad. Hay que dejar libre la parte de arriba para el título, que pone la web. |
| `marca/redes.png` | PNG, 1200 × 630 px | La misma escena en horizontal, con la mitad izquierda despejada para el título, que se añade después. |

## 5. Lo que no hace falta dibujar

- **El tablero completo:** el código dibuja las 40 casillas a partir de los datos.
- **Los dados:** son 3D y los dibuja el código.
- **Los marcos de las tarjetas y de los botones**, y el anillo de recarga de las habilidades: los dibuja el código
  para poder cambiarlos de estado.
- **Cualquier texto o cifra:** nombres, precios y alquileres los pone el código en el idioma de cada jugador.
- **El color del dueño de cada calle:** se muestra con la mini ficha del dueño.

## 6. Antes de subir cada imagen

- [ ] Tiene el nombre y la carpeta exactos de la sección 4.
- [ ] No tiene texto, letras, números, firmas, logotipos ni marcas de agua.
- [ ] No recuerda a ningún juego comercial ni a ninguna otra obra (ver «Prohibido»).
- [ ] Se entiende al tamaño en que se va a ver, y el fondo es transparente cuando se pide.
- [ ] Encaja con el estilo de la hoja aprobada.
- [ ] `python tools/optimizar-imagenes.py --aplicar` y `npm run revisar:imagenes` terminan bien.
- [ ] Está anotada en `public/visuales/CREDITOS.md`.
