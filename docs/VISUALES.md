# Lo visual de Dueños de la Ciudad

> **Para quién es:** para la herramienta que genera las imágenes, que trabaja en paralelo con el código, y para Kenny,
> que aprueba el estilo.
>
> **El estilo, en una frase:** pintura naturalista y sobria, para un juego de jóvenes adultos y adultos. Los animales y
> los objetos son **reales, no dibujos animados**: no se humanizan, no llevan ropa ni caras. La metáfora de cada uno se
> cuenta con la pose y, como mucho, un objeto simbólico. Las composiciones son **minimalistas**: un protagonista,
> mucho aire y nada de adornos. **Las únicas excepciones** son las insignias de las habilidades y los iconos: son
> gráficos planos y minimalistas, con la misma paleta.
>
> **La regla de oro es la coherencia.** Las 141 imágenes tienen que parecer pintadas por la misma mano. Esta guía fija
> cada detalle: técnica, pincelada, luz, colores, fondo, encuadre, posición y tamaño. Si algo no está escrito aquí, se
> copia de las imágenes ya aprobadas de la misma carpeta, y en la duda se pregunta a Kenny antes de inventar.
>
> Aquí solo se tocan `public/visuales/` y su `CREDITOS.md`. El código y la documentación los lleva otra parte del
> equipo.

## Índice

1. [Cómo trabajar](#1-cómo-trabajar)
2. [Reglas de estilo para todas las imágenes](#2-reglas-de-estilo-para-todas-las-imágenes)
3. [La paleta](#3-la-paleta)
4. [Los barrios y las otras propiedades](#4-los-barrios-y-las-otras-propiedades)
5. [Las 10 fichas: hojas de personaje](#5-las-10-fichas-hojas-de-personaje)
6. [Objetos que se repiten](#6-objetos-que-se-repiten)
7. [Fichas técnicas por tipo de imagen](#7-fichas-técnicas-por-tipo-de-imagen)
8. [Lista de imágenes](#8-lista-de-imágenes)
9. [Lo que dibuja el código con el mismo estilo](#9-lo-que-dibuja-el-código-con-el-mismo-estilo)
10. [Antes de subir cada imagen](#10-antes-de-subir-cada-imagen)

---

## 1. Cómo trabajar

1. **Lee las secciones 2 a 7 completas** antes de generar nada.
2. **La hoja de estilo ya está aprobada** (24 de octubre de 2026). La forman las piezas de la Rata, el Toro y la
   Burbuja y el retrato de la Rata. Son la referencia de estilo de todas las imágenes pintadas: en la duda, manda lo
   que se ve en ellas.

   **Las insignias de las habilidades tienen su propia muestra.** Antes de hacer las 20, se hacen cuatro:
   - 2 activas: `botones/habilidades/activas/esprint.webp` y `botones/habilidades/activas/rally.webp`;
   - 2 pasivas: `botones/habilidades/pasivas/horas-extra.webp` y `botones/habilidades/pasivas/optimista.webp`.

   Kenny tiene que aprobarlas antes de seguir.
3. **Referencias:** usa como referencia solo esta guía y las imágenes ya aprobadas del proyecto. No uses obras de otros
   artistas ni imágenes de internet: copiarías algo que tiene dueño.
4. **Arma la petición de cada imagen** con tres partes:
   - la plantilla de su tipo (sección 7);
   - la descripción de esa imagen (sección 8);
   - si aparece una ficha, su hoja de personaje (sección 5).
5. **Adjunta referencias:** 2 o 3 imágenes ya aprobadas de la misma carpeta y, si aparece una ficha, su pieza
   aprobada.
6. **Genera la imagen** con la proporción indicada (por ejemplo 1:1 o 4:3) y a 1024 px por el lado más largo, o
   más.
7. **Guarda el original** en `visuales-originales/`, con la misma ruta. Git ignora esa carpeta.
8. **Copia la imagen** a `public/visuales/` con la ruta y el nombre exactos de la sección 8. Puede ir en `.png`.
9. **Prepárala para la web:** `python tools/optimizar-imagenes.py --aplicar`.
   - La recorta a la proporción exacta si se pasa un poco, la deja en la medida exacta, la convierte a WebP y conserva
     la transparencia.
   - Si la proporción es muy distinta o la imagen es demasiado pequeña, no la toca y lo dice: hay que regenerarla.
10. **Compárala con las demás:** `npm run hoja:visuales` crea `visuales-originales/hoja-de-contactos.html`. Ábrelo en el
    navegador. Muestra cada carpeta a su tamaño real en el juego, sobre fondo claro y oscuro. Regenera la imagen si
    desentona con sus vecinas en cualquiera de estas cosas:
    - la pincelada;
    - la luz;
    - los colores;
    - el nivel de detalle;
    - el tamaño del motivo.
11. **Anota los créditos** en [`public/visuales/CREDITOS.md`](../public/visuales/CREDITOS.md), con una fila por
    carpeta: herramienta y modelo, licencia CC0 y fecha.
12. **Revisa:** `npm run revisar:imagenes` tiene que terminar en ✔. También dice cuántas imágenes faltan.
13. **Sube solo lo visual:**
    - primero `git pull`;
    - después `git add public/visuales`;
    - después un commit en español, como «Visuales: piezas de las 10 fichas», y `git push`.

    **Nunca** `git add -A`: el código se está cambiando a la vez.

**Orden de trabajo:** primero toda la prioridad P1, después la P2 y por último la P3 (sección 8). Los iconos SVG no se
generan como imagen: se escriben como código (sección 7.13).

---

## 2. Reglas de estilo para todas las imágenes

### 2.1 Técnica

- **Pintura naturalista de aspecto gouache:** pintura opaca sobre papel, realista pero claramente pintada a mano. No es
  una foto, ni un render 3D, ni una ilustración vectorial.
- **Realismo estilizado:**
  - la anatomía, las proporciones y los materiales son reales;
  - el detalle está simplificado: se pintan las masas grandes y unos pocos detalles definidos (ojos, hocico, brillos);
  - nada de hiperrealismo: no se pinta cada pelo ni cada reflejo.
- **Ambiente adulto y sobrio:** serio y elegante, con un punto de ironía en las metáforas, pero sin chistes visuales.
  Realista, pero nunca desagradable: nada de babas, heridas, suciedad ni gestos amenazantes.
- **Excepciones:** las insignias de las habilidades (secciones 7.6 y 7.7) y los iconos SVG (sección 7.13) no se pintan.
  Son gráficos planos y minimalistas, con los colores de la paleta.

### 2.2 Pincelada y bordes

- **Pincelada visible pero fina:** pinceladas cortas que siguen la forma (la dirección del pelo, la curva de una
  porcelana, la caída de una pluma). Sin manchas sueltas, salpicaduras, goteos ni trazos de boceto.
- **Textura de papel** muy sutil, la misma en todas las imágenes. Nada de grano fotográfico.
- **Sin contornos de cómic.** No hay líneas negras alrededor de las formas. La silueta se define por el contraste de
  luz y color con el fondo.
- **Bordes:**
  - nítidos en la silueta del protagonista, sobre todo del lado de la luz;
  - suaves en las sombras y en los planos del fondo.
- **Detalle según el tamaño final:**
  - en las piezas y los edificios (que se ven a 40–128 px), la pincelada es más limpia y las formas más simples;
  - en los retratos y las escenas, la pincelada se nota más.

### 2.3 Luz y sombras

- **Una sola luz natural**, cálida, que entra desde arriba a la izquierda (como las 10:30 en un reloj), a 45°.
- **Claroscuro moderado:** el protagonista bien iluminado y el entorno en una penumbra suave. El contraste de luz
  separa al protagonista del fondo.
- **Sombras frías:** se pintan mezclando el color del objeto con el color de sombra (sección 3), nunca con negro.
- **Luces cálidas:** se pintan mezclando el color del objeto con el color de luz (sección 3), nunca con blanco puro.
- **Sombras proyectadas:** suaves, hacia abajo a la derecha.
- **Borde de luz:** en las imágenes con fondo transparente, una línea muy fina de luz cálida en el borde del lado en
  sombra, para que el motivo se separe del tablero oscuro.

### 2.4 Composición minimalista

- **Un solo protagonista** por imagen.
- **Aire:** entre el 30 y el 45 % del lienzo queda como espacio libre (fondo sin elementos).
- **Como mucho 2 elementos secundarios**, y solo los que diga la sección 8.
- **Fondos:** un campo de color pintado, casi liso, con una viñeta suave (un 15–20 % más oscuro en los bordes). Si hay
  entorno (una pared, un suelo, el agua), se sugiere con pocas pinceladas, sin detalles.
- **Ni marcos, ni adornos, ni decoración.**

### 2.5 Perspectiva

| Tipo de imagen | Cámara |
|---|---|
| Piezas, edificios, objetos sueltos | 3/4 desde arriba: la cámara mira hacia abajo 25° y el motivo está girado 30° hacia la derecha |
| Retratos e ilustraciones de interfaz | Baja, a la altura del protagonista: lo engrandece, como en un retrato de naturaleza |
| Esquinas, efectos, cabeceras, portada, redes | Frontal, con la cámara a la altura de los ojos de una persona y 10° hacia abajo; sin puntos de fuga exagerados |
| Centro del tablero | Aérea inclinada: la cámara mira hacia abajo 45°, con las calles alineadas con los bordes del lienzo |
| Insignias | Planas, de frente, sin perspectiva |
| Iconos SVG | Planos, de frente |

### 2.6 Profundidad en las escenas

| Plano | Cómo se pinta |
|---|---|
| Primer plano | Colores plenos, el mayor contraste y los bordes más nítidos |
| Plano medio | Colores plenos, contraste medio |
| Fondo | Formas sin detalle, más claras y más frías: mezcladas al 40 % con el color del cielo o de la penumbra |

### 2.7 Hora del día

| Momento | Cielo (de arriba abajo) | Dónde se usa |
|---|---|---|
| **Tarde clara** | cielo `#A9C7D6` → horizonte `#E9DFCB` | Esquinas, cabeceras, efectos de cartas y escenas de los retratos que están al aire libre |
| **Atardecer** | malva `#5B5577` → ocre rosado `#D9A27E`, con ventanas encendidas en luz de ventana `#F0C987` | Centro del tablero, portada, redes, retrato de la Vaca Lechera |
| **Noche** | noche `#1E242B`, con pocas estrellas en hueso | Ilustración de victoria |
| **Interior en penumbra** | Sin cielo: una pared pintada en el color del fondo, con viñeta | Retratos y bodegones de interior |

### 2.8 Prohibido en todas las imágenes

- **Estilo de dibujos animados:**
  - personajes humanizados (de pie como personas, con ropa, guantes o accesorios humanos);
  - caras en los objetos, ojos grandes, mejillas sonrosadas o expresiones humanas;
  - estilo infantil, «kawaii», «chibi» o de mascota;
  - contornos negros gruesos o colores saturados o fosforescentes;
  - en las imágenes pintadas, colores planos de vector (lo plano es solo para las insignias y los iconos).
- **Texto de cualquier tipo:** letras, números, letreros, inscripciones o cifras en relojes, pizarras y pantallas. Si
  la herramienta pinta letras, se regenera.
- **Firmas, logotipos y marcas de agua.**
- **Símbolos de monedas reales, billetes y banderas de países.**
- **Personas ni partes del cuerpo humano.** Las únicas criaturas son las 10 fichas, y en las escenas, si acaso,
  gaviotas o pájaros lejanos como siluetas.
- **Vehículos con marca.** Los vehículos genéricos sí se permiten.
- **Nada que recuerde al juego comercial más famoso de este género:**
  - ni un señor mayor con sombrero de copa y bigote;
  - ni fichas de metal plateado (sombrero, dedal, plancha, bota, perro, carretilla, barco de guerra, coche de
    carreras);
  - ni signos de interrogación en las cartas, ni cofres del tesoro, ni locomotoras, ni bombillas, ni grifos;
  - ni una flecha roja de salida, ni un policía señalando, ni rejas con cartel, ni un coche rojo de aparcamiento;
  - ni el fondo verde menta, ni billetes de colores pastel, ni casas verdes con hoteles rojos.
- **Nada de otras obras:**
  - no se pide «al estilo de» ningún juego, película, estudio o artista, y no se nombran marcas en las peticiones;
  - no se copian obras concretas, personajes de otras obras, esculturas o edificios famosos reconocibles.

---

## 3. La paleta

**Paleta apagada y terrosa.** Estos son los colores de referencia. Al pintar habrá variaciones naturales de tono
dentro de cada color, pero **no aparecen colores nuevos ni más saturados**.

### 3.1 Colores para pintar luces y sombras

| Nombre | Color | Uso |
|---|---|---|
| Color de sombra | `#34414C` (pizarra azulada) | Se mezcla con el color de cada objeto para pintar sus sombras: entre un 20 % en la penumbra y un 50 % en la sombra más profunda |
| Color de luz | `#EADFC2` (ocre claro) | Se mezcla con el color de cada objeto para pintar sus luces, hasta un 35 % |

### 3.2 Colores generales

| Nombre | Color | Uso |
|---|---|---|
| Tinta | `#23262B` | Texto de la interfaz y trazos de los iconos SVG. En las pinturas, solo en los acentos más oscuros (pupilas, orificios) |
| Noche | `#1E242B` | Fondo del tablero, cielo de noche |
| Papel | `#EFEAE0` | Fondos claros, papel, páginas |
| Hueso | `#F4EFE6` | Todo lo blanco: porcelana, plumas claras, nubes, papel de sobre |
| Pizarra | `#3A3F45` | Peanas de las fichas, piedra oscura |
| Piedra | `#9A968E` | Piedra, cemento, metal mate |
| Madera oscura | `#5E4433` | Mesas, suelos de tablas, cuero |
| Madera clara | `#B08A62` | Maquetas, cajas, mangos |
| Ladrillo | `#9E5A43` | Ladrillo y tejas |
| Latón | `#A88A4A` | La llave de la ciudad, campanas, lupas y herrajes |
| Oro viejo | `#C9A44C` | Monedas y medallas |
| Verde sube | `#4E9A6A` | Luces y gráficas que suben |
| Rojo baja | `#B5483F` | Luces y gráficas que bajan, lacre, sellos |
| Ámbar | `#C98B3A` | Color de los transportes y del mazo Fortuna, luces de aviso |
| Azul noticias | `#34507A` | Mazo Noticias |
| Verde dinero | `#3F7A66` | Color de los servicios |
| Agua | `#4F7F86` | Agua |
| Agua profunda | `#2E5257` | Agua profunda y sombras del agua |
| Vegetación | `#5F7A4A` | Plantas y pasto |
| Vegetación oscura | `#3E5A3F` | Árboles y sombras de las plantas |
| Cielo | `#A9C7D6` | Parte alta del cielo de tarde |
| Horizonte | `#E9DFCB` | Parte baja del cielo de tarde |
| Atardecer alto | `#5B5577` | Parte alta del cielo de atardecer |
| Atardecer bajo | `#D9A27E` | Parte baja del cielo de atardecer |
| Luz de ventana | `#F0C987` | Ventanas encendidas y farolas |

### 3.3 Los colores de las fichas

Cada ficha tiene un color propio. Es su identidad en el juego y se usa en tres sitios:

- en la interfaz, en el panel del jugador;
- en el tablero, en el anillo que el código dibuja bajo su pieza;
- en el fondo de su retrato.

No tiene por qué ser el color del animal o del objeto. Las insignias de las habilidades no lo usan: llevan el color de
su tipo (sección 3.4).

| Ficha | Color |
|---|---|
| La Rata | gris grafito `#6B7078` |
| La Taza | terracota `#B8693A` |
| El Toro | rojo óxido `#A63D32` |
| El Oso | verde musgo `#4F7A55` |
| La Burbuja | azul niebla `#6A9DB8` |
| La Vaca Lechera | ocre `#C9A04A` |
| El Elefante Blanco | malva `#A9707D` |
| La Hormiga | oliva `#8A8F3C` |
| El Tiburón | petróleo `#3E7C80` |
| El Cisne Negro | índigo `#3F5482` |

### 3.4 Los colores de las insignias de las habilidades

Son iguales para las 10 fichas. El tipo de habilidad se reconoce por la forma y el color, y la habilidad concreta, por
el símbolo.

| Parte | Activas (botones) | Pasivas (logos) |
|---|---|---|
| Forma | verde `#4E9A6A` | oro viejo `#C9A44C` |
| Borde de la forma | `#3B664E` | `#7E6B3D` |
| Relieve inferior | `#417757` | — (las pasivas son planas) |
| Círculo interior | `#7EB28D` | `#D4B978` |
| Símbolo | `#324F41` | `#5D5237` |

### 3.5 Cuánto color

- En cada imagen hay **como mucho 3 colores dominantes**, más los neutros (papel, hueso, piedras, maderas, noche).
- **El color propio** (el de la ficha, el barrio o la carta) **es el único acento intenso** de la imagen. Todo lo demás
  va más apagado.

---

## 4. Los barrios y las otras propiedades

Cada barrio tiene un color y una forma de construir. Se respetan en todas las imágenes donde aparece: el centro del
tablero, las cabeceras y la portada. El color del barrio va en tejados, toldos, persianas o fachadas, nunca en el
cielo ni en las calles.

| Barrio | Color | Arquitectura y materiales | Elementos que siempre aparecen |
|---|---|---|---|
| **Los Talleres** | gris acero `#6F7780` | Naves industriales de ladrillo con tejado de diente de sierra y persianas metálicas | Chimeneas cortas con vapor claro, chispas de soldadura, una grúa pequeña |
| **La Feria** | frambuesa `#B5577A` | Carpas de lona a rayas frambuesa y hueso, puestos de madera con toldos | Banderines de tela, cajas de fruta |
| **Puerto Viejo** | turquesa apagado `#3E8E86` | Casas bajas junto al agua, con muelle de madera | Faro de piedra clara con una franja turquesa, barcas de pesca, redes, gaviotas |
| **Barrio Universitario** | violeta apagado `#6E5A9E` | Edificio de piedra con cúpula violeta y escalinata, biblioteca con ventanales | Árboles, bicicletas aparcadas, banderolas lisas (sin escudos ni letras) |
| **Centro Histórico** | terracota `#B05A3C` | Casas antiguas de dos pisos con balcones de madera y tejados de teja, plaza adoquinada | Campanario con un reloj sin números, una fuente |
| **Jardines del Río** | verde salvia `#6A8F4E` | Casas pequeñas entre jardines, puentes de piedra en arco | Río, sauces, flores de tonos apagados, bancos |
| **Distrito Financiero** | azul cobalto `#3C64A8` | Rascacielos inventados de cristal azul cobalto y acero, de líneas sobrias | Pantallas con luces que suben (sin cifras), plazas de piedra |
| **Altos del Mirador** | oro viejo `#B8963A` | Casas señoriales con tejados de tono oro viejo en colinas, jardines con setos | Un mirador con barandilla de piedra y vista a la ciudad |
| *Transportes* | ámbar `#C98B3A` | Terminal de Buses, Metro Central, Teleférico y Aeropuerto | Vehículos genéricos sin marcas |
| *Servicios* | verde dinero `#3F7A66` | Compañía de Agua y Red de Internet | Depósitos, tuberías, antenas |

---

## 5. Las 10 fichas: hojas de personaje

### 5.1 Reglas comunes

- **Animales y objetos reales:**
  - los animales se ven y se mueven como su especie: a cuatro patas los que van a cuatro patas, sin ropa y sin gestos
    humanos;
  - los objetos son objetos, sin cara.
- **La metáfora** se cuenta con la pose y, en algunas fichas, con un único objeto simbólico (la moneda de la Hormiga,
  la campana de la Vaca, la casa de la Burbuja). Ni uno más.
- **Misma altura:** las 10 fichas miden lo mismo en la imagen, sin importar su tamaño real. La Hormiga se pinta tan
  grande como el Elefante, como en una lámina de naturaleza.
- **La mirada:** los animales miran en la dirección de su movimiento o hacia el espectador, nunca con expresiones
  humanas.
- **Un solo aspecto:** no hay variantes, disfraces ni cambios. La pieza y el retrato muestran el mismo animal u
  objeto, con los mismos colores y marcas.

### 5.2 Las hojas

**La Rata** · color de ficha gris grafito `#6B7078` · metáfora: la «carrera de la rata», correr sin parar para pagar
las cuentas.

| Aspecto | Cómo es |
|---|---|
| Qué es | Una rata parda real, delgada y ágil |
| Colores | Pelaje gris pardo `#6E6A64`, más claro en el vientre (`#A39B8F`). Orejas finas y algo translúcidas en un rosa apagado (`#C98F86`). Cola larga y desnuda en el mismo rosa, más oscuro. Bigotes finos y claros. Ojos negros con un brillo |
| Pose de la pieza | Corriendo hacia la derecha en plena zancada, con el cuerpo estirado y bajo, y la cola en curva detrás |
| Evitar | Aspecto sucio, dientes amenazantes, babas |

**La Taza** · color de ficha terracota `#B8693A` · metáfora: la «tasa» de interés.

| Aspecto | Cómo es |
|---|---|
| Qué es | Una taza de café real, de cerámica esmaltada |
| Colores | Por fuera, esmalte terracota con pequeñas variaciones de tono; por dentro y en el borde, esmalte hueso. Café oscuro (`#3B2A20`) con un brillo |
| Detalle | Vapor suave en hueso, semitransparente, que sube en una curva ascendente (nunca dibujando una flecha) |
| Pose de la pieza | De pie sobre la peana, con el asa a la izquierda y el vapor subiendo |
| Evitar | Cara, platos decorados, dibujos en la taza |

**El Toro** · color de ficha rojo óxido `#A63D32` · metáfora: el mercado alcista, que embiste hacia arriba.

| Aspecto | Cómo es |
|---|---|
| Qué es | Un toro real, musculoso y compacto |
| Colores | Pelaje castaño muy oscuro (`#3E2C24`), con brillos rojizos en el lomo. Cuernos color hueso con las puntas oscuras. Hocico oscuro y húmedo |
| Pose de la pieza | Embistiendo hacia la derecha: cabeza baja, cuernos hacia arriba, una pata delantera levantada y polvo ocre levantándose detrás |
| Evitar | Sangre, banderillas, adornos de toreo |

**El Oso** · color de ficha verde musgo `#4F7A55` · metáfora: el mercado bajista, que da el zarpazo hacia abajo.

| Aspecto | Cómo es |
|---|---|
| Qué es | Un oso pardo real, robusto y pesado |
| Colores | Pelaje pardo (`#6B4A33`) con las puntas más claras (`#9C7653`) en el lomo. Hocico algo más claro. Garras oscuras |
| Pose de la pieza | A cuatro patas, avanzando hacia la derecha, con una zarpa delantera levantada a punto de bajar |
| Evitar | Rugidos, dientes a la vista |

**La Burbuja** · color de ficha azul niebla `#6A9DB8` · metáfora: la burbuja inmobiliaria.

| Aspecto | Cómo es |
|---|---|
| Qué es | Una pompa de jabón real, perfectamente redonda |
| Colores | Transparente, con reflejos iridiscentes de tonos apagados (malva, verde y oro viejo) en el borde. Un reflejo de ventana luminosa arriba a la izquierda |
| Detalle | Dentro, una casa diminuta y realista (la casa de la sección 6), del 40 % del diámetro, en la parte de abajo |
| Pose de la pieza | Flotando a un 4 % de altura sobre la peana, con una sombra suave en la peana |
| Evitar | Cara, colores de arcoíris saturados |

**La Vaca Lechera** · color de ficha ocre `#C9A04A` · metáfora: el negocio que da dinero fijo.

| Aspecto | Cómo es |
|---|---|
| Qué es | Una vaca lechera real, tranquila y bien alimentada |
| Colores | Blanca (en hueso) con manchas negras de bordes naturales. Hocico rosado apagado. Cuernos cortos claros |
| Detalle | Una campana de latón colgada de una correa de cuero |
| Pose de la pieza | De pie, en 3/4 hacia la derecha, con la cabeza un poco girada hacia el espectador |
| Evitar | Ubre exagerada, aspecto de dibujo de granja |

**El Elefante Blanco** · color de ficha malva `#A9707D` · metáfora: la obra carísima que no sirve para nada.

| Aspecto | Cómo es |
|---|---|
| Qué es | Un elefante real de piel muy clara, casi blanca, majestuoso |
| Colores | Piel blanco hueso con tonos rosados apagados en las orejas, la trompa y los pliegues. Colmillos cortos de marfil |
| Pose de la pieza | De pie, solemne, con la trompa levantada en curva |
| Evitar | Mantos, adornos, cascos o cualquier accesorio |

**La Hormiga** · color de ficha oliva `#8A8F3C` · metáfora: el gasto hormiga, lo poco que sumado es mucho.

| Aspecto | Cómo es |
|---|---|
| Qué es | Una hormiga real, pintada como en una lámina de naturaleza (a escala grande) |
| Colores | Cuerpo castaño rojizo oscuro (`#5A2A20`) con brillos ámbar en el abdomen. Seis patas finas y dos antenas |
| Detalle | Carga con las mandíbulas una moneda de oro viejo más grande que su cabeza, levantada por delante |
| Pose de la pieza | Caminando hacia la derecha con la moneda |
| Evitar | Aspecto de insecto amenazante, mandíbulas exageradas |

**El Tiburón** · color de ficha petróleo `#3E7C80` · metáfora: el inversor sin piedad.

| Aspecto | Cómo es |
|---|---|
| Qué es | Un tiburón real, de silueta clásica y aerodinámica |
| Colores | Gris azulado (`#5F7480`) en el lomo y vientre hueso, con la transición suave entre los dos |
| Pose de la pieza | Nadando hacia la derecha en diagonal ascendente, suspendido sobre la peana como una pieza de museo, con la aleta dorsal bien visible. Boca cerrada o apenas entreabierta |
| Evitar | Sangre, fauces abiertas con muchos dientes |

**El Cisne Negro** · color de ficha índigo `#3F5482` · metáfora: el imprevisto que nadie vio venir.

| Aspecto | Cómo es |
|---|---|
| Qué es | Un cisne negro real |
| Colores | Plumaje negro con reflejos pizarra (más claro que la tinta, para que se vea la forma). Pico rojo coral apagado (`#B4504A`) con una banda clara cerca de la punta. Ojo rojo |
| Pose de la pieza | Posado sobre la peana como sobre el agua (sin patas a la vista), con el cuello en S y un ala ligeramente arqueada |
| Evitar | Brillos de purpurina, poses de ballet |

---

## 6. Objetos que se repiten

Estos objetos salen en varias imágenes y **tienen que ser siempre el mismo**. Su primera versión aprobada pasa a ser la
referencia de las siguientes.

| Objeto | Diseño fijo |
|---|---|
| **Peana** | Disco liso de pizarra pulida visto en elipse, con la cara de arriba un poco más clara y un brillo suave en el canto. Sin ningún color: el del jugador lo pone el código, con un anillo bajo la pieza |
| **Moneda** | Moneda de oro viejo gastada, con el canto estriado y un anillo en relieve. Sin símbolos ni números. Un brillo cálido arriba a la izquierda |
| **Llave de la ciudad** | Llave antigua de latón con pátina. La cabeza es un anillo, la caña es larga y el paletón, en lugar de dientes, forma el perfil de 4 edificios de alturas 2, 4, 3 y 5 |
| **Casa** | Maqueta de arquitectura: casa de una planta con tejado a dos aguas. Fachada de madera clara pintada, tejado de pizarra, puerta de madera oscura y una ventana con luz de ventana |
| **Torre** | Maqueta de arquitectura: torre de cristal azul grisáceo con estructura de acero, 6 franjas de ventanas y una antena con una luz roja apagada |
| **Gráfica** | Línea de luz en verde sube o rojo baja, como la de una pantalla de cotizaciones, sin ejes ni cifras |
| **Maletín** | Maletín de cuero en madera oscura, con cierre de latón |
| **Lupa** | Aro y mango de latón, con el cristal reflejando la luz |
| **Sello** | Sello de lacre en rojo baja, sin letras, con un relieve circular simple |
| **Dado** | Dado de hueso con las esquinas redondeadas por el uso y los puntos oscuros. Siempre en 3/4, enseñando tres caras |
| **Carta en miniatura** | Carta 3:4 con el dorso de su mazo (sección 7.8) simplificado |
| **Arco de entrada de la ciudad** | Arco de medio punto de piedra clara, con una clave de latón |

---

## 7. Fichas técnicas por tipo de imagen

Cada ficha dice el lienzo final exacto, la proporción con que se genera, el fondo, dónde va el motivo y qué tamaño
tiene. Los porcentajes se miden sobre el lienzo, desde la esquina de arriba a la izquierda.

La **frase de estilo** se copia al principio de **todas** las peticiones de imágenes pintadas (todas menos las
insignias, que tienen su propia plantilla, y los iconos SVG):

```
Pintura naturalista de aspecto gouache, realista pero claramente pintada a mano, para un juego de mesa para adultos:
pincelada visible y fina que sigue la forma, textura sutil de papel, paleta terrosa y apagada, sombras frías y luces
cálidas, una sola luz natural desde arriba a la izquierda, claroscuro moderado. Composición minimalista con un solo
protagonista y mucho espacio libre. Sin contornos negros, sin estilo de dibujos animados, sin rasgos humanos, sin
texto, letras ni números, sin logotipos, firma ni marca de agua.
```

### 7.1 Pieza de ficha (`fichas/piezas/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Peana | La de la sección 6, lisa y sin color. La cara de arriba mide el 72 % del ancho del lienzo y el 18 % del alto, centrada a lo ancho. El canto tiene un grosor del 5 % del alto. El borde inferior de la peana queda al 95 % del alto |
| Protagonista | El animal u objeto de su hoja (sección 5), de cuerpo entero, apoyado en la peana. Lo más alto llega al 6 % del borde de arriba. Ocupa como mucho el 80 % del ancho y deja al menos un 4 % de margen a cada lado |
| Sombras | Sombra de contacto suave del protagonista sobre la peana, y sombra suave de la peana hacia abajo a la derecha |
| Detalle | Simplificado: grandes masas de color y solo los detalles que se reconocen a 48 px (ojos, cuernos, aletas, la moneda) |
| Borde de luz | La línea fina de luz cálida del lado en sombra (sección 2.3) |
| Nada más | Ni suelo, ni fondo, ni otros objetos aparte de los de su hoja |

```
Plantilla (después de la frase de estilo): Pieza de juego de mesa: [protagonista y pose de la hoja de personaje],
de cuerpo entero sobre una peana redonda y lisa de pizarra pulida vista en elipse. Vista 3/4 desde arriba, girado
hacia la derecha. Detalle simplificado para verse pequeño, silueta muy clara. Fondo transparente.
```

### 7.2 Retrato de ficha (`fichas/retratos/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 512 px, WebP. Se genera en 1:1 |
| Fondo | Pintado, sin transparencia, con un borde de papel claro (hueso) del 3 % alrededor de la pintura, como una lámina impresa. Es igual que en el retrato aprobado de la Rata |
| Entorno | Un entorno mínimo pintado (sección 8) dominado por el color de la ficha, apagado, con la viñeta de la sección 2.4. El suelo o la línea del horizonte entre el 75 y el 80 % del alto |
| Protagonista | El mismo animal u objeto que su pieza. De cuerpo entero o casi, ocupa entre el 55 y el 70 % del alto, con su centro entre el 45 y el 55 % del ancho y la cabeza en el tercio de arriba |
| Elementos | Como mucho los 2 de la sección 8 |
| Cámara | Baja, a la altura del protagonista |
| Detalle | Más que en la pieza: la pincelada se nota |

```
Plantilla (después de la frase de estilo): Retrato de naturaleza de [protagonista de la hoja de personaje], cámara
baja a su altura. Escena: [descripción de la sección 8]. Entorno mínimo dominado por el color [color de la ficha],
apagado, con viñeta suave. Formato cuadrado, con un borde fino de papel claro alrededor, como una lámina impresa.
```

### 7.3 Centro del tablero (`tablero/centro/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 1024 × 1024 px, WebP. Se genera en 1:1 |
| Fondo | Noche `#1E242B`, sin transparencia |
| La ciudad | Ocupa un cuadrado centrado del 88 % del lienzo, con las esquinas redondeadas (radio del 8 %). Su borde se funde con la noche en una franja del 6 % |
| Distribución | Ver la imagen en la sección 8. Cada zona va junto al lado del tablero donde están sus calles, en el orden del recorrido: la Salida abajo a la izquierda y el avance en el sentido de las agujas del reloj |
| Plaza central | En el centro, una plaza redonda de piedra clara, lisa y sin edificios, del 22 % del ancho. Ahí el código muestra los dados y las cartas |
| Vista | Aérea inclinada (sección 2.5) |
| Color | Atardecer (sección 2.7). Todo un 20 % más oscuro y apagado que en las cabeceras, para que no compita con las fichas. Una de cada cuatro ventanas, encendida |
| Detalle | Pintado con masas grandes. Los barrios se reconocen por su color y su arquitectura, no por los detalles |

### 7.4 Esquina (`tablero/esquinas/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 512 px, WebP. Se genera en 1:1 |
| Fondo | Pintado a sangre, sin transparencia: el fondo de su escena (sección 8) con el color de acento de la esquina mezclado al 25 % y la viñeta |
| Suelo | Entre el 75 y el 80 % del alto |
| Motivo | Centrado. Ocupa entre el 60 y el 70 % del ancho y va del 15 al 80 % del alto |
| Vista | Frontal (sección 2.5) |
| Color de acento | Salida: oro viejo. Calabozo: piedra. Bolsa de Valores: verde sube. ¡Auditoría!: rojo baja |

### 7.5 Edificio (`tablero/edificios/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Motivo | La maqueta de la sección 6, centrada a lo ancho. La base queda al 92 % del alto, con una sombra de contacto suave. La casa ocupa el 70 % del ancho y el 62 % del alto. La torre ocupa el 46 % del ancho y el 86 % del alto |
| Vista | 3/4 desde arriba, la misma que las piezas |
| Detalle | Simplificado, con el borde de luz de la sección 2.3 |

### 7.6 Insignia de habilidad activa (`botones/habilidades/activas/`)

Es el **botón** de la habilidad: un gráfico plano y minimalista, no una pintura. Las 10 activas tienen exactamente la
misma forma, los mismos colores y el mismo tamaño; solo cambia el símbolo. Los colores están en la sección 3.4.

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Estilo | Colores planos. Sin degradados, brillos, texturas, pinceladas, sombras ni relieve 3D, salvo el relieve inferior de esta tabla |
| Forma | Un hexágono regular con un vértice arriba y otro abajo (los lados verticales a izquierda y derecha) y las esquinas redondeadas (radio del 10 %). Ocupa el 90 % del alto y va centrado. Relleno verde, con un borde del 3 % en su tono de borde |
| Relieve inferior | Una franja del 6 % en el tono de relieve a lo largo de los dos lados de abajo, para que se lea como un botón que se puede pulsar |
| Círculo interior | Centrado, del 62 % del lienzo, en el tono de círculo interior |
| Símbolo | Una silueta sólida de un solo color (el tono de símbolo), con los detalles calados: huecos que dejan ver el círculo de debajo. Ocupa el 44 % del ancho y va centrado en el círculo. Formas simples y rotundas, que se entiendan a 32 px, con como mucho 2 piezas separadas |

```
Plantilla: Insignia plana y minimalista para un juego para adultos, vista de frente: hexágono regular con un vértice
arriba y otro abajo y las esquinas redondeadas, de color verde plano #4E9A6A con un borde fino #3B664E y una franja
#417757 a lo largo de los dos lados de abajo; dentro, un círculo #7EB28D y, en el centro, un símbolo en silueta
sólida #324F41 con los detalles calados: [símbolo de la sección 8]. Colores planos, sin degradados, sin brillos, sin
texturas, sin contornos negros, sin sombras. Sin texto, letras ni números, sin logotipos, firma ni marca de agua.
Fondo transparente.
```

### 7.7 Insignia de habilidad pasiva (`botones/habilidades/pasivas/`)

Es el **logo** de la habilidad: igual de plano y minimalista que las activas, pero con otra forma, otro color y sin
relieve, porque no se pulsa. Las 10 pasivas son iguales entre sí; solo cambia el símbolo.

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Estilo | El mismo que las activas |
| Forma | Una roseta de 12 puntas redondeadas, como un sello, que ocupa el 90 % del lienzo y va centrada. Relleno oro viejo, con un borde del 3 % en su tono de borde. Sin relieve |
| Círculo interior | Centrado, del 62 % del lienzo, en el tono de círculo interior |
| Símbolo | Las mismas reglas que en las activas, en el tono de símbolo de las pasivas |
| Diferencia con las activas | La activa es un hexágono verde con relieve: se pulsa. La pasiva es una roseta dorada plana: se mira |

```
Plantilla: Insignia plana y minimalista para un juego para adultos, vista de frente: roseta de 12 puntas
redondeadas, como un sello, de color oro viejo plano #C9A44C con un borde fino #7E6B3D; dentro, un círculo #D4B978
y, en el centro, un símbolo en silueta sólida #5D5237 con los detalles calados: [símbolo de la sección 8]. Colores
planos, sin degradados, sin brillos, sin texturas, sin contornos negros, sin sombras ni relieve. Sin texto, letras
ni números, sin logotipos, firma ni marca de agua. Fondo transparente.
```

### 7.8 Dorso de carta (`tarjetas/dorsos/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 384 × 512 px (3:4), WebP. Se genera en 3:4 |
| Fondo | El color del mazo, pintado a sangre como papel teñido. Sin transparencia. Las esquinas son rectas: el código las redondea |
| Marco | Una cenefa geométrica sencilla pintada en hueso, a un 5 % del borde y con un grosor del 4 %. Es simétrica y se ve igual girada 180° |
| Centro | Un óvalo hueso del 56 % del ancho, centrado, con el emblema del mazo (sección 8) pintado dentro, ocupando el 70 % del óvalo |
| Nada más | Sin patrones recargados ni dorados brillantes |

### 7.9 Efecto de carta (`tarjetas/efectos/`)

Son **bodegones**: objetos reales pintados.

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 384 px (4:3), WebP. Se genera en 4:3 |
| Fondo | Pintado a sangre, sin transparencia: una pared lisa en papel mezclado al 20 % con el color de acento de la carta (sección 8), con viñeta |
| Superficie | Los objetos se apoyan sobre una mesa de madera oscura que ocupa el 25 % de abajo, salvo los que la sección 8 marca sin mesa |
| Motivo | Centrado. Ocupa el 60 % del alto y como mucho el 70 % del ancho |
| Vista | Frontal, ligeramente desde arriba |

### 7.10 Cabecera de propiedad (`tarjetas/cabeceras/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 288 px (16:9), WebP. Se genera en 16:9 |
| Fondo | Escena completa, sin transparencia, con un cielo de tarde en el 40 % de arriba. El horizonte va al 55 % del alto |
| Composición | Un edificio o lugar protagonista (sección 8) centrado, que ocupa entre el 45 y el 55 % del ancho. A los lados, como mucho dos edificios sencillos de su barrio. El fondo, en siluetas atmosféricas. Una calle o suelo en el 15 % de abajo |
| Color | El color del barrio (o el de los transportes y servicios) es el único acento intenso: en tejados, toldos, fachadas o persianas |
| Vista | Frontal, con 3 planos de profundidad (sección 2.6) |

### 7.11 Ilustración de interfaz (`interfaz/ilustraciones/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 512 px, WebP. Se genera en 1:1 |
| Fondo | Pintado, sin transparencia, con el color de fondo que indica la sección 8, viñeta y el mismo borde de papel claro del 3 % que los retratos |
| Motivo | Centrado. Ocupa entre el 55 y el 70 % del alto. Como mucho 2 elementos secundarios |

### 7.12 Marca (`marca/`)

| Archivo | Reglas |
|---|---|
| Emblema | 512 × 512 px, WebP, fondo transparente. Un disco de pizarra del 92 % con un filo de latón. Encima, la llave de la ciudad (sección 6) en diagonal, con la cabeza abajo a la izquierda y el paletón arriba a la derecha, ocupando el 76 % de la diagonal |
| Icono de la app | 512 × 512 px, PNG, un cuadrado lleno de noche con la llave centrada dentro del 60 % central (los celulares recortan los bordes). Más simple que el emblema: sin disco |
| Portada | 1600 × 900 px (16:9), WebP, sin transparencia. Ver la sección 8 |
| Redes | 1200 × 630 px, PNG o JPG, sin transparencia. Se genera en 16:9 y el optimizador recorta lo que sobra arriba y abajo. Ver la sección 8 |

### 7.13 Iconos SVG (los escribe el código, no un generador de imágenes)

Los iconos de `tablero/barrios/`, `tablero/casillas/`, `tablero/marcadores/`, `botones/acciones/` e `interfaz/iconos/`
son **SVG escritos a mano**: **pictogramas de línea fina**, sobrios y todos con la misma construcción. Son la única
excepción a la pintura: en una interfaz para adultos, los iconos limpios son lo que mejor se lee.

- **La etiqueta de apertura**, exactamente así:

  ```
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  ```

- **El trazo:** todos los trazos son de 4. Nunca hay otro grosor.
- **Los rellenos:** solo con `fill="currentColor"`, y solo en detalles pequeños de hasta 8 × 8 (puntos y remaches).
- **Los colores:** no se escriben. Solo `currentColor` y `none`, porque el código da el color. Nada de `#…`, `rgb()`
  ni nombres de colores.
- **El área:** todo va dentro del recuadro de 6 a 58. La forma principal cabe en un cuadrado de 48 × 48 centrado (de 8
  a 56). Las formas redondas pueden llegar a 52 × 52.
- **El estilo:** de frente y sin perspectiva, simétrico cuando el objeto lo es, con las esquinas redondeadas (`rx` de
  al menos 3).
- **La separación:** al menos 4 entre trazos paralelos, para que no se junten a 24 px.
- **La complejidad:** como mucho 8 elementos. Pueden aparecer manos dibujadas con líneas (como en «tratos»), pero
  nunca caras.
- **Elementos permitidos:** `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon` y `g`. Prohibidos:
  `text`, `image`, `style`, `script`, degradados y filtros.
- **El peso:** 20 KB como máximo. Lo normal es menos de 2 KB.

Ejemplo de un icono correcto, la moneda de `interfaz/iconos/`:

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="32" cy="32" r="22"/>
  <circle cx="32" cy="32" r="13"/>
</svg>
```

La revisión automática comprueba la etiqueta de apertura, los grosores, los colores y los elementos prohibidos.

---

## 8. Lista de imágenes

**Prioridades:**

- **P1:** hace falta para la fase 2 (el tablero animado).
- **P2:** hace falta para las fases 3 y 4 (los celulares).
- **P3:** hace falta para la publicación.

Las rutas son relativas a `public/visuales/`. En total son **141 imágenes**. Cada una sigue su ficha técnica de la
sección 7.

### 8.1 Fichas · P1 las piezas, P2 los retratos

Las piezas siguen la ficha 7.1. El animal u objeto y su pose están en las hojas de la sección 5:

| Archivo | Pose |
|---|---|
| `fichas/piezas/rata.webp` | Corriendo en plena zancada |
| `fichas/piezas/taza.webp` | Quieta, con el vapor subiendo |
| `fichas/piezas/toro.webp` | Embistiendo, con la cabeza baja y los cuernos arriba |
| `fichas/piezas/oso.webp` | A cuatro patas, con una zarpa levantada |
| `fichas/piezas/burbuja.webp` | Flotando sobre la peana, con la casa dentro |
| `fichas/piezas/vaca-lechera.webp` | De pie, con la campana |
| `fichas/piezas/elefante-blanco.webp` | De pie, con la trompa levantada |
| `fichas/piezas/hormiga.webp` | Caminando con la moneda |
| `fichas/piezas/tiburon.webp` | Nadando en diagonal hacia arriba |
| `fichas/piezas/cisne-negro.webp` | Con el cuello en S y un ala arqueada |

Los retratos siguen la ficha 7.2:

| Archivo | Escena (como mucho 2 elementos) |
|---|---|
| `fichas/retratos/rata.webp` | La Rata corre sobre el canto de una moneda gigante de oro viejo puesta de pie, como en una rueda. Detrás, una pared de tablas en penumbra, con el gris grafito de la ficha |
| `fichas/retratos/taza.webp` | Bodegón de interior: la Taza sobre su plato en una mesa de madera oscura, junto a una pila ordenada de monedas. El vapor sube en curva. Pared en terracota apagado |
| `fichas/retratos/toro.webp` | El Toro embiste en un terreno abierto, levantando polvo dorado. Detrás, un cielo en rojo óxido apagado, con un haz de luz que sube en diagonal |
| `fichas/retratos/oso.webp` | El Oso, sentado a la entrada de su cueva en penumbra, con un pequeño montón de monedas a sus pies. El musgo de la roca, en verde musgo |
| `fichas/retratos/burbuja.webp` | La Burbuja flota sobre la silueta de una ciudad en azul niebla, con la casa dentro. Una aguja de coser se acerca desde la derecha |
| `fichas/retratos/vaca-lechera.webp` | Al atardecer, la Vaca está en un prado de luz ocre, junto a un cubo metálico lleno de monedas en lugar de leche |
| `fichas/retratos/elefante-blanco.webp` | El Elefante, frente a un puente monumental de piedra sin terminar que se corta en el aire. Cielo malva apagado |
| `fichas/retratos/hormiga.webp` | En primer plano, la Hormiga carga su moneda. Detrás, desenfocada, una fila de hormigas lleva monedas. Suelo de tierra con hierba oliva |
| `fichas/retratos/tiburon.webp` | El Tiburón, en aguas profundas color petróleo, con rayos de luz que bajan desde la superficie y monedas hundidas en el fondo |
| `fichas/retratos/cisne-negro.webp` | El Cisne, en un lago oscuro en calma bajo un cielo índigo. En el agua se refleja un relámpago lejano |

### 8.2 Tablero · P1

**Centro (ficha 7.3):**

| Archivo | Qué pintar |
|---|---|
| `tablero/centro/ciudad.webp` | La ciudad vista desde el aire, con cada zona junto a su lado del tablero. **Abajo a la izquierda,** el arco de entrada de la ciudad (la Salida). **Lado izquierdo, de abajo arriba:** Los Talleres, la Terminal de Buses y La Feria. **Arriba a la izquierda:** una comisaría pequeña (el Calabozo). **Lado de arriba, de izquierda a derecha:** Puerto Viejo junto a un trozo de mar, la Compañía de Agua, la estación del Metro Central y el Barrio Universitario. **Arriba a la derecha:** el edificio de la Bolsa de Valores. **Lado derecho, de arriba abajo:** el Centro Histórico, una línea de Teleférico, la torre de la Red de Internet y los Jardines del Río, con un río que viene del mar. **Abajo a la derecha:** la oficina de auditoría. **Lado de abajo, de derecha a izquierda:** el Distrito Financiero, el Aeropuerto con una pista y los Altos del Mirador en una colina. **En el centro,** la plaza redonda lisa. Cada barrio, con su arquitectura de la sección 4 |

**Esquinas (ficha 7.4):**

| Archivo | Qué pintar |
|---|---|
| `tablero/esquinas/salida.webp` | **Día de pago** (acento oro viejo). El arco de entrada de la ciudad con luz cálida de mañana que pasa a través. En el suelo, bajo el arco, un sobre de sueldo de papel kraft abierto del que asoman monedas |
| `tablero/esquinas/calabozo.webp` | **Calabozo** (acento piedra). La puerta de hierro de una celda, entreabierta, en un muro de piedra, con una luz fría que entra por una ventana alta. A un lado, un banco de madera. Sin carteles |
| `tablero/esquinas/bolsa-de-valores.webp` | **Bolsa de Valores** (acento verde sube). La escalinata y las columnas de un edificio clásico de piedra en penumbra. Sobre la puerta, una pantalla oscura con dos líneas de luz que suben (verde sube) y una que baja (rojo baja), sin cifras |
| `tablero/esquinas/auditoria.webp` | **¡Auditoría!** (acento rojo baja). Bodegón: un libro de cuentas abierto bajo la luz de una lámpara, con una lupa de latón encima y un sello de lacre rojo al lado. Las páginas con líneas, sin números |

**Edificios (ficha 7.5):**

| Archivo | Qué pintar |
|---|---|
| `tablero/edificios/casa.webp` | La maqueta de la casa de la sección 6 |
| `tablero/edificios/torre.webp` | La maqueta de la torre de la sección 6 |

**Iconos de los barrios** (SVG, ficha 7.13):

| Archivo | Qué dibujar con trazos |
|---|---|
| `tablero/barrios/talleres.svg` | Una llave inglesa en diagonal cruzada con medio engranaje |
| `tablero/barrios/feria.svg` | Una carpa de feria: un triángulo con el borde inferior ondulado y un banderín en la punta |
| `tablero/barrios/puerto-viejo.svg` | Un ancla |
| `tablero/barrios/universitario.svg` | Un edificio con cúpula y columnas |
| `tablero/barrios/centro-historico.svg` | Un campanario: una torre con una campana dentro y tejado a dos aguas |
| `tablero/barrios/jardines-del-rio.svg` | Un árbol de copa redonda con dos ondas de agua debajo |
| `tablero/barrios/distrito-financiero.svg` | Tres rascacielos de alturas distintas |
| `tablero/barrios/altos-del-mirador.svg` | Una colina con una casa en la cima |

**Iconos de las otras casillas** (SVG):

| Archivo | Qué dibujar con trazos |
|---|---|
| `tablero/casillas/terminal-de-buses.svg` | Un autobús de frente, con dos faros |
| `tablero/casillas/metro-central.svg` | Un tren de metro de frente, con dos faros y una ventana grande |
| `tablero/casillas/teleferico.svg` | Una cabina colgada de un cable en diagonal |
| `tablero/casillas/aeropuerto.svg` | Un avión de perfil, despegando hacia arriba a la derecha |
| `tablero/casillas/compania-de-agua.svg` | Una gota con dos ondas debajo |
| `tablero/casillas/red-de-internet.svg` | Una antena con tres arcos de señal |
| `tablero/casillas/noticias.svg` | Un periódico doblado, con tres líneas que simulan texto |
| `tablero/casillas/fortuna.svg` | Una noria: un círculo con radios y 6 cabinas pequeñas |
| `tablero/casillas/impuesto-al-patrimonio.svg` | Una balanza con un maletín en un plato y una moneda en el otro |
| `tablero/casillas/agencia-de-bolsa.svg` | Un maletín con una línea en zigzag que sube |

**Marcadores** (SVG):

| Archivo | Qué dibujar con trazos | Cuándo se usa |
|---|---|---|
| `tablero/marcadores/hipotecada.svg` | Un candado cerrado | La calle está hipotecada |
| `tablero/marcadores/en-obras.svg` | Un cono de obra delante de una valla | Obras eternas del Elefante Blanco |
| `tablero/marcadores/inflada.svg` | Una burbuja con un reflejo | La calle está inflada por la Burbuja |
| `tablero/marcadores/estallada.svg` | Una burbuja rota, con cuatro salpicaduras | La burbuja estalló |
| `tablero/marcadores/retenido.svg` | La puerta de una celda con barrotes | El jugador está retenido en el Calabozo |
| `tablero/marcadores/hibernando.svg` | Una luna creciente con tres estrellas pequeñas | El Oso hiberna |
| `tablero/marcadores/marcado.svg` | Una aleta de tiburón dentro de una diana | Frenesí del Tiburón |
| `tablero/marcadores/pierde-turno.svg` | Un reloj de arena con una raya en diagonal | Imprevisto del Cisne Negro |
| `tablero/marcadores/en-racha-final.svg` | La llave de la ciudad | El jugador alcanzó la meta y vuelve a la Salida |

### 8.3 Botones · P2

**Insignias de las habilidades activas** (ficha 7.6). Todas en el mismo verde; solo cambia el símbolo:

| Archivo | Ficha | Símbolo en silueta (los detalles, calados) |
|---|---|---|
| `botones/habilidades/activas/esprint.webp` | Rata | Un dado en 3/4 con los puntos calados y tres líneas de velocidad a su izquierda |
| `botones/habilidades/activas/prestamo-expres.webp` | Taza | Una moneda con el canto calado y una flecha curva que la rodea y vuelve |
| `botones/habilidades/activas/rally.webp` | Toro | Una flecha en zigzag que sube hacia arriba a la derecha |
| `botones/habilidades/activas/hibernar.webp` | Oso | Una luna creciente con dos estrellas pequeñas |
| `botones/habilidades/activas/inflar.webp` | Burbuja | Un círculo con un reflejo calado y la punta de una aguja que lo apunta desde abajo a la derecha |
| `botones/habilidades/activas/temporada-alta.webp` | Vaca Lechera | Una campana de vaca con dos ondas a cada lado |
| `botones/habilidades/activas/obras-eternas.webp` | Elefante Blanco | Un cono de obra con dos franjas caladas |
| `botones/habilidades/activas/hormiguero.webp` | Hormiga | Una barrera de peaje: un poste con un brazo horizontal con franjas caladas |
| `botones/habilidades/activas/frenesi.webp` | Tiburón | Una aleta de tiburón dentro del anillo de una diana |
| `botones/habilidades/activas/imprevisto.webp` | Cisne Negro | Un rayo |

**Insignias de las habilidades pasivas** (ficha 7.7). Todas en el mismo oro viejo; solo cambia el símbolo:

| Archivo | Ficha | Símbolo en silueta (los detalles, calados) |
|---|---|---|
| `botones/habilidades/pasivas/horas-extra.webp` | Rata | Un reloj de bolsillo con la esfera calada y una flecha pequeña que sube |
| `botones/habilidades/pasivas/interes-a-favor.webp` | Taza | Una taza de perfil con vapor en curva ascendente |
| `botones/habilidades/pasivas/optimista.webp` | Toro | La cabeza de un toro de frente, con los cuernos hacia arriba y los ojos calados |
| `botones/habilidades/pasivas/apuesta-bajista.webp` | Oso | Tres marcas de zarpazo en diagonal hacia abajo |
| `botones/habilidades/pasivas/valor-inflado.webp` | Burbuja | Un círculo con una casa calada dentro |
| `botones/habilidades/pasivas/renta-fija.webp` | Vaca Lechera | Tres monedas iguales apiladas, con los cantos calados |
| `botones/habilidades/pasivas/constructora.webp` | Elefante Blanco | Una grúa torre |
| `botones/habilidades/pasivas/peaje-hormiga.webp` | Hormiga | Una hormiga vista desde arriba |
| `botones/habilidades/pasivas/cazador-de-gangas.webp` | Tiburón | Un martillo de subasta |
| `botones/habilidades/pasivas/antifragil.webp` | Cisne Negro | Un escudo con una pluma calada |

**Iconos de las acciones** (SVG, ficha 7.13):

| Archivo | Qué dibujar con trazos |
|---|---|
| `botones/acciones/tirar-dados.svg` | Dos dados de frente, uno un poco más alto, con sus puntos rellenos |
| `botones/acciones/agitar-celular.svg` | Un celular con dos líneas de vibración a cada lado |
| `botones/acciones/comprar.svg` | La llave de una casa con una etiqueta colgando |
| `botones/acciones/pasar.svg` | Una flecha curva que rodea un punto relleno |
| `botones/acciones/subastar.svg` | Un martillo de subasta en diagonal sobre su base |
| `botones/acciones/pujar.svg` | Una mano levantada con una moneda |
| `botones/acciones/construir.svg` | Una casa con un signo más arriba a la derecha |
| `botones/acciones/vender-edificio.svg` | Una casa con una flecha que sale hacia una moneda |
| `botones/acciones/hipotecar.svg` | Un candado cerrado delante de una casa |
| `botones/acciones/levantar-hipoteca.svg` | Un candado abierto delante de una casa |
| `botones/acciones/tratos.svg` | Un apretón de manos |
| `botones/acciones/comprar-acciones.svg` | Tres barras con un signo más encima |
| `botones/acciones/vender-acciones.svg` | Tres barras con un signo menos encima |
| `botones/acciones/pagar-fianza.svg` | Una moneda que entra por una puerta de celda |
| `botones/acciones/salvoconducto.svg` | Un sobre con un sello |
| `botones/acciones/terminar-turno.svg` | Una marca de verificación dentro de un círculo |
| `botones/acciones/bancarrota.svg` | Una cartera abierta y vacía |
| `botones/acciones/usar-habilidad.svg` | Un rayo dentro de un hexágono con un vértice arriba |
| `botones/acciones/aceptar.svg` | Una marca de verificación |
| `botones/acciones/rechazar.svg` | Una equis |
| `botones/acciones/volver.svg` | Una flecha hacia la izquierda |
| `botones/acciones/ajustes.svg` | Un engranaje de 8 dientes con un círculo en el centro |
| `botones/acciones/ayuda.svg` | Un salvavidas |
| `botones/acciones/pantalla-completa.svg` | Cuatro esquinas que apuntan hacia fuera |

### 8.4 Tarjetas · P2

**Dorsos (ficha 7.8):**

| Archivo | Color del mazo | Emblema del centro |
|---|---|---|
| `tarjetas/dorsos/noticias.webp` | Azul noticias | Un periódico doblado, pintado, con columnas de texto sugeridas con líneas grises (ilegibles) |
| `tarjetas/dorsos/fortuna.webp` | Ámbar | Una noria pequeña de hierro, con monedas de oro viejo como cabinas |

**Efectos de las cartas** (bodegones, ficha 7.9):

| Archivo | Acento | Mesa | Qué pintar |
|---|---|---|---|
| `tarjetas/efectos/cobrar.webp` | Verde sube | Sí | Monedas que caen sobre un cuenco de latón, con algunas ya dentro |
| `tarjetas/efectos/pagar.webp` | Rojo baja | Sí | Una cartera de cuero abierta y casi vacía, con dos monedas que se escapan rodando |
| `tarjetas/efectos/avanzar.webp` | Ámbar | No | Una señal de tráfico redonda con una flecha hacia delante, junto a una carretera que se pierde en la distancia |
| `tarjetas/efectos/retroceder.webp` | Ámbar | No | Una valla de obra con una señal de desvío y una flecha curva hacia atrás |
| `tarjetas/efectos/viaje.webp` | Ámbar | Sí | Tres billetes de transporte de cartón, sin texto, en abanico, con el dibujo de un autobús, un metro y un teleférico |
| `tarjetas/efectos/calabozo.webp` | Piedra | Sí | Una llave de hierro grande junto a un candado cerrado |
| `tarjetas/efectos/salvoconducto.webp` | Oro viejo | Sí | Un sobre de papel grueso cerrado con un sello de lacre rojo |
| `tarjetas/efectos/bolsa-sube.webp` | Verde sube | No | Una pantalla oscura con líneas de luz verdes que suben (sin cifras) y unos papeles al aire |
| `tarjetas/efectos/bolsa-baja.webp` | Rojo baja | No | Una pantalla oscura con líneas de luz rojas que bajan (sin cifras) y papeles cayendo |
| `tarjetas/efectos/llega-empresa.webp` | Azul cobalto | No | Una grúa que levanta un bloque de oficinas de cristal sobre un solar |
| `tarjetas/efectos/reparaciones.webp` | Ámbar | Sí | Un casco de obra, un martillo y una llave inglesa sobre unos planos enrollados |
| `tarjetas/efectos/cumpleanos.webp` | Malva | Sí | Un pastel sencillo con tres velas encendidas y un sobre cerrado al lado |
| `tarjetas/efectos/subsidio.webp` | Verde dinero | No | La fachada de un ayuntamiento de piedra con un gran lazo rojo delante de la puerta |

**Cabeceras (ficha 7.10).** Cada barrio, con su arquitectura de la sección 4 y sin personas:

| Archivo | Color dominante | Protagonista |
|---|---|---|
| `tarjetas/cabeceras/talleres.webp` | Gris acero | Una nave industrial con tejado de diente de sierra y la persiana subida, con chispas de soldadura dentro |
| `tarjetas/cabeceras/feria.webp` | Frambuesa | La carpa principal de la feria, con banderines y un puesto de fruta delante |
| `tarjetas/cabeceras/puerto-viejo.webp` | Turquesa apagado | El faro al final del muelle, con dos barcas de pesca |
| `tarjetas/cabeceras/universitario.webp` | Violeta apagado | El edificio con cúpula y escalinata, entre árboles |
| `tarjetas/cabeceras/centro-historico.webp` | Terracota | La plaza con la fuente y el campanario detrás |
| `tarjetas/cabeceras/jardines-del-rio.webp` | Verde salvia | Un puente de piedra en arco sobre el río, con sauces |
| `tarjetas/cabeceras/distrito-financiero.webp` | Azul cobalto | Tres rascacielos de cristal; el del centro, con una pantalla con luces que suben |
| `tarjetas/cabeceras/altos-del-mirador.webp` | Oro viejo | El mirador con barandilla de piedra en primer plano y casas señoriales en la colina |
| `tarjetas/cabeceras/terminal-de-buses.webp` | Ámbar | Andenes cubiertos con dos autobuses genéricos de color ámbar |
| `tarjetas/cabeceras/metro-central.webp` | Ámbar | La entrada de una estación de metro, con un tren en un andén elevado |
| `tarjetas/cabeceras/teleferico.webp` | Ámbar | Dos cabinas ámbar colgadas de un cable sobre tejados y colinas |
| `tarjetas/cabeceras/aeropuerto.webp` | Ámbar | Una terminal de cristal con un avión genérico despegando al fondo |
| `tarjetas/cabeceras/compania-de-agua.webp` | Verde dinero | Un depósito de agua redondo con tuberías, junto a un estanque |
| `tarjetas/cabeceras/red-de-internet.webp` | Verde dinero | Una torre de antenas con luces de señal, sobre un edificio técnico |

### 8.5 Interfaz · P2

**Iconos** (SVG, ficha 7.13):

| Archivo | Qué dibujar con trazos |
|---|---|
| `interfaz/iconos/moneda.svg` | La moneda del ejemplo de la sección 7.13 |
| `interfaz/iconos/patrimonio.svg` | Un maletín con asa |
| `interfaz/iconos/meta.svg` | La llave de la ciudad, en diagonal, con el paletón de edificios |
| `interfaz/iconos/acciones.svg` | Un certificado enrollado con una línea en zigzag que sube |
| `interfaz/iconos/sube.svg` | Un triángulo con un vértice arriba |
| `interfaz/iconos/baja.svg` | Un triángulo con un vértice abajo |

**Ilustraciones (ficha 7.11):**

| Archivo | Color de fondo | Qué pintar |
|---|---|---|
| `interfaz/ilustraciones/victoria.webp` | Noche | La llave de la ciudad, de latón, sobre un cojín de terciopelo oscuro, con fuegos artificiales lejanos en oro viejo |
| `interfaz/ilustraciones/bancarrota.webp` | Piedra | Una maleta de cuero abierta y vacía, con una polilla que sale volando |
| `interfaz/ilustraciones/mirando-el-tablero.webp` | Azul niebla | Unos prismáticos de latón sobre una mesa, apuntando a una tablet que muestra la ciudad en miniatura. El celular la enseña mientras el tablero anima |
| `interfaz/ilustraciones/sala-de-espera.webp` | Ocre | El arco de entrada de la ciudad y, delante, las 10 piezas (con su peana) en una fila curva, esperando |

### 8.6 Marca · P3

Ficha técnica 7.12:

| Archivo | Qué pintar |
|---|---|
| `marca/emblema.webp` | La llave de la ciudad sobre el disco de pizarra con filo de latón |
| `marca/icono-512.png` | La llave de la ciudad sobre noche, dentro del 60 % central |
| `marca/portada.webp` | Interior al atardecer: las 10 piezas (con su peana) colocadas en fila sobre una mesa de madera oscura, junto a un gran ventanal. Al otro lado del cristal, la ciudad con sus barrios reconocibles: los rascacielos cobalto, el campanario terracota, el faro y las carpas frambuesa. La mesa y las piezas en el 35 % de abajo y el 35 % de arriba sin elementos (cielo y pared), para el título que pone la web |
| `marca/redes.png` | La misma escena en horizontal, con las piezas y la ventana en la mitad derecha y la mitad izquierda en penumbra lisa, libre para el título |

---

## 9. Lo que dibuja el código con el mismo estilo

Esto no se dibuja como imagen, pero se describe para que todo combine:

- **Tipografías:** «Fraunces» (con serifa, sobria) para los títulos, e «Inter» para el texto y las cifras (con números
  de ancho fijo, para que el dinero no baile). Las dos son libres (licencia OFL) y van copiadas en el repositorio.
- **Interfaz:**
  - la misma paleta apagada;
  - el tablero sobre noche y el celular sobre papel;
  - bordes finos de 1 px y esquinas poco redondeadas (6 px);
  - sombras suaves hacia abajo a la derecha;
  - botones planos y sobrios. El único botón con relieve es el de las habilidades activas, que es su insignia
    hexagonal verde.
- **El tablero:** la Salida va en la esquina de abajo a la izquierda y las fichas avanzan en el sentido de las agujas
  del reloj.
  - Cada casilla es de papel, con una franja fina del color de su barrio en el borde exterior y su icono.
  - Las calles con dueño muestran la mini pieza del dueño.
  - Bajo cada pieza, un anillo fino del color de su ficha (sección 3.3), que identifica al jugador.
- **Los dados:** cubos 3D de hueso con los puntos oscuros, como el dado de la sección 6.
- **Las tarjetas:** papel con un borde fino y esquinas de 6 px. Arriba, la cabecera o el bodegón del efecto; debajo,
  el texto.
- **Botones de habilidad:** la insignia y, encima, el anillo de recarga y el estado desactivado (en gris).

---

## 10. Antes de subir cada imagen

- [ ] Está en la carpeta y con el nombre exactos de la sección 8, en minúsculas, sin tildes ni espacios.
- [ ] Sigue su ficha técnica de la sección 7: lienzo, fondo, posición y tamaño del motivo y ángulo.
- [ ] Es pintura naturalista (sección 2), salvo las insignias y los iconos, que son planos:
  - sin contornos negros;
  - sin estilo de dibujos animados;
  - sin humanizar;
  - con la luz arriba a la izquierda, las sombras frías y las luces cálidas.
- [ ] La composición es mínima: un protagonista, espacio libre y como mucho 2 elementos secundarios.
- [ ] Solo usa colores de la sección 3, y el único acento intenso es el color propio.
- [ ] Si aparece una ficha, coincide con su hoja de personaje y con su pieza aprobada.
- [ ] Los objetos repetidos coinciden con la sección 6.
- [ ] No tiene texto, letras, números, firmas, logotipos ni marcas de agua, y no recuerda a ningún juego comercial ni
      a otra obra.
- [ ] En la hoja de contactos (`npm run hoja:visuales`) no desentona con sus vecinas.
- [ ] `python tools/optimizar-imagenes.py --aplicar` y `npm run revisar:imagenes` terminan bien.
- [ ] Está anotada en `public/visuales/CREDITOS.md`.
