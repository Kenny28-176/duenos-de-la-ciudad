# Lo visual de Dueños de la Ciudad

> **Para quién es:** para la herramienta que genera las imágenes, que trabaja en paralelo con el código, y para Kenny,
> que aprueba el estilo.
>
> **La regla de oro es la coherencia.** Las 141 imágenes tienen que parecer hechas por la misma mano. Por eso esta
> guía fija cada detalle: tipo de dibujo, línea, colores, luz, fondo, encuadre, posición y tamaño. No se deja nada a
> elección. Si algo no está escrito aquí, se copia de las imágenes ya aprobadas de la misma carpeta, y en la duda se
> pregunta a Kenny antes de inventar.
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
2. **Empieza por la hoja de estilo.** Genera solo 3 piezas de fichas: la Rata, el Toro y la Burbuja. Enséñaselas a
   Kenny. Mientras no las apruebe, no se genera nada más. Esas 3 piezas son la referencia de estilo de todo lo demás.
3. **Arma la petición de cada imagen** con tres partes:
   - la plantilla de su tipo (sección 7);
   - la descripción de esa imagen (sección 8);
   - si aparece una ficha, su hoja de personaje (sección 5).
4. **Adjunta referencias:** 2 o 3 imágenes ya aprobadas de la misma carpeta y, si aparece una ficha, su pieza
   aprobada.
5. **Genera la imagen** con la proporción indicada (por ejemplo 1:1 o 4:3) y a 1024 px por el lado más largo, o
   más.
6. **Guarda el original** en `visuales-originales/`, con la misma ruta. Git ignora esa carpeta.
7. **Copia la imagen** a `public/visuales/` con la ruta y el nombre exactos de la sección 8. Puede ir en `.png`.
8. **Prepárala para la web:** `python tools/optimizar-imagenes.py --aplicar`.
   - La recorta a la proporción exacta si se pasa un poco, la deja en la medida exacta, la convierte a WebP y conserva
     la transparencia.
   - Si la proporción es muy distinta o la imagen es demasiado pequeña, no la toca y lo dice: hay que regenerarla.
9. **Compárala con las demás:** `npm run hoja:visuales` crea `visuales-originales/hoja-de-contactos.html`. Ábrelo en el
   navegador. Muestra cada carpeta a su tamaño real en el juego, sobre fondo claro y oscuro. Regenera la imagen si
   desentona con sus vecinas en cualquiera de estas cosas:
   - el grosor de la línea;
   - la luz;
   - los colores;
   - el tamaño del motivo.
10. **Anota los créditos** en [`public/visuales/CREDITOS.md`](../public/visuales/CREDITOS.md), con una fila por
    carpeta: herramienta y modelo, licencia CC0 y fecha.
11. **Revisa:** `npm run revisar:imagenes` tiene que terminar en ✔. También dice cuántas imágenes faltan.
12. **Sube solo lo visual:**
    - primero `git pull`;
    - después `git add public/visuales`;
    - después un commit en español, como «Visuales: piezas de las 10 fichas», y `git push`.

    **Nunca** `git add -A`: el código se está cambiando a la vez.

**Orden de trabajo:** primero toda la prioridad P1, después la P2 y por último la P3 (sección 8). Los iconos SVG no se
generan como imagen: se escriben como código (sección 7.13).

---

## 2. Reglas de estilo para todas las imágenes

### 2.1 Tipo de dibujo

- **Estilo:** ilustración vectorial plana con sombreado de dos tonos (*cel shading*).
  - Cada superficie lleva su color base y, en la parte que no recibe la luz, **un solo tono de sombra con el borde
    nítido**.
  - Las superficies curvas o brillantes llevan además **un solo brillo pequeño**.
- **Degradados:** no hay. Solo se permiten en dos sitios:
  - el cielo de las escenas, un degradado vertical de dos colores (sección 2.7);
  - la cara de las insignias activas (sección 7.6).
- **Prohibido en el acabado:**
  - texturas, ruido, grano, trazos de pincel o acuarela;
  - aspecto de lápiz o de boceto;
  - render 3D, plástico brillante o fotorrealismo;
  - pixel art, anime o manga.
- **Acabado mate.** Los brillos solo van en ojos, monedas, cristal, metal pulido y burbujas.
- **Nivel de detalle:** el mínimo para que se entienda. Ningún detalle más pequeño que el 1,5 % del ancho del lienzo,
  porque se perdería.

### 2.2 Línea

- **Color:** todos los contornos van en tinta `#1D2430`. Nunca en negro puro.
- **Trazo:** grosor uniforme a lo largo de todo el trazo, con extremos y uniones redondeados.
- **Grosor:** se mide en porcentaje del ancho del lienzo.

| Tipo de imagen | Contorno exterior (silueta) | Líneas interiores (detalles) |
|---|---|---|
| Piezas, retratos, edificios, insignias, ilustraciones de interfaz, emblema | 2 % (20 px si se genera a 1024) | 1 % |
| Esquinas, efectos de cartas, dorsos | 1,5 % | 0,75 % |
| Escenas (centro del tablero, cabeceras, portada, redes): primer plano | 1 % | 0,5 % |
| Escenas: plano medio | 0,6 % | 0,3 % |
| Escenas: fondo | sin línea | sin línea |

- **Sin contorno:** vapor, humo, agua en movimiento, brillos, sombras proyectadas, destellos y líneas de movimiento.

### 2.3 Luz y sombras

- **Una sola luz**, arriba a la izquierda (como las 10:30 en un reloj), a 45°.
- **Sombra propia:** en el lado derecho e inferior de cada volumen, con el tono sombra de su color (sección 3). Borde
  nítido. Cubre entre el 30 y el 40 % de la superficie.
- **Brillo:** arriba a la izquierda, con el tono brillo de su color. Es pequeño (hasta el 10 % de la superficie) y solo
  va en superficies curvas.
- **Punto de brillo:** blanco `#FFFFFF` en ojos, monedas y cristal, arriba a la izquierda. Es el único sitio donde se
  usa el blanco puro.
- **Sombra proyectada en el suelo:** tinta `#1D2430` al 25 % de opacidad, con el borde nítido, desplazada hacia abajo y
  a la derecha.

### 2.4 Formas

- **Todo redondeado:** esquinas con un radio de al menos el 2 % del lienzo. Nada de puntas afiladas: los cuernos, los
  dientes, los picos y las flechas terminan en punta redondeada.
- **Siluetas claras y compactas:** cada personaje y cada objeto tiene que reconocerse pintado en un solo color a 48 px.
- **Edificios:**
  - cuerpos rectangulares con las esquinas suavizadas;
  - ventanas como rectángulos redondeados, en filas regulares;
  - tejados simples;
  - las líneas verticales siempre verticales.
- **Manos:** siempre como guante de dibujo animado de 4 dedos, en blanco cálido `#FBF9F4`. No hay manos con piel.

### 2.5 Perspectiva

| Tipo de imagen | Ángulo de cámara |
|---|---|
| Piezas, edificios, esquinas, objetos sueltos | 3/4 desde arriba: la cámara mira hacia abajo 25° y el motivo está girado 30° hacia la derecha |
| Retratos e ilustraciones de interfaz | Frontal con el personaje en 3/4 hacia la derecha; la cámara a la altura del pecho |
| Cabeceras, efectos, portada, redes | Frontal un poco elevada, como desde un segundo piso (15° hacia abajo); sin puntos de fuga exagerados |
| Centro del tablero | Aérea inclinada: la cámara mira hacia abajo 45°, con las calles alineadas con los bordes del lienzo |
| Insignias e iconos | Plano, de frente, sin perspectiva |

### 2.6 Profundidad en las escenas

En las escenas hay siempre **3 planos**:

| Plano | Color | Línea |
|---|---|---|
| Primer plano | Colores plenos | La de primer plano (sección 2.2) |
| Plano medio | Colores plenos | La de plano medio |
| Fondo | Siluetas sin detalles, con su color mezclado al 40 % con el color del cielo | Sin línea |

### 2.7 Hora del día

| Momento | Cielo (degradado de arriba abajo) | Dónde se usa |
|---|---|---|
| **Media tarde soleada** | cielo `#8FD3F4` → horizonte `#FCE7C8` | Esquinas, cabeceras, efectos de cartas, retratos con cielo, ilustraciones de interfaz (salvo victoria) |
| **Atardecer** | violeta `#6C5B9E` → naranja `#F6A57A`, con ventanas encendidas en luz de ventana `#FFE08A` | Centro del tablero, portada, redes |
| **Noche** | noche `#16202E`, con estrellas pequeñas en blanco cálido | Ilustración de victoria |

### 2.8 Prohibido en todas las imágenes

- **Texto de cualquier tipo:** letras, números, letreros, inscripciones o cifras en relojes, pizarras y pantallas. Los
  textos y las cifras los pone el código en el idioma de cada jugador. Si la herramienta pinta letras, se regenera.
- **Firmas, logotipos y marcas de agua.**
- **Símbolos de monedas reales, billetes y banderas de países.**
- **Personas.** Los únicos personajes son las 10 fichas. Se permiten gaviotas y pájaros pequeños como siluetas.
- **Vehículos con marca.** Los vehículos genéricos sí se permiten.
- **Nada que recuerde al juego comercial más famoso de este género:**
  - ni un señor mayor con sombrero de copa y bigote;
  - ni fichas de metal plateado (sombrero, dedal, plancha, bota, perro, carretilla, barco de guerra, coche de
    carreras);
  - ni signos de interrogación en las cartas, ni cofres del tesoro, ni locomotoras, ni bombillas, ni grifos;
  - ni una flecha roja de salida, ni un policía señalando, ni rejas con cartel, ni un coche rojo de aparcamiento;
  - ni el fondo verde menta, ni billetes de colores pastel, ni casas verdes con hoteles rojos.
- **Nada de otras obras:** no se pide «al estilo de» ningún juego, película, estudio o artista, y no se nombran marcas
  en las peticiones. Tampoco aparecen personajes de otras obras ni esculturas o edificios famosos reconocibles.

---

## 3. La paleta

**La paleta es cerrada:** solo se usan estos colores y sus tonos de sombra y brillo.
- **Sombra:** el color mezclado con tinta al 25 %.
- **Brillo:** el color mezclado con blanco al 35 %.

Los dos tonos ya están calculados en las tablas.

### 3.1 Colores generales

| Nombre | Base | Sombra | Brillo | Uso |
|---|---|---|---|---|
| Tinta | `#1D2430` | — | — | Contornos, pupilas, sombras proyectadas (con opacidad) |
| Noche | `#16202E` | — | — | Fondo del tablero, cielo de noche, medallones oscuros |
| Crema | `#F4F1EA` | `#BEBEBC` | `#F8F6F1` | Fondos claros, papel, calles, aros de los medallones |
| Blanco cálido | `#FBF9F4` | `#C4C4C3` | `#FCFBF8` | Todo lo blanco: porcelana, ojos, camisas, guantes, nubes |
| Gris piedra | `#A7ADB7` | `#858B95` | `#C6CAD0` | Cemento, metal mate, pelaje de la Rata, agujas |
| Gris pizarra | `#5B6472` | `#4C5462` | `#949AA3` | Metal oscuro, asfalto, maletines |
| Carbón | `#3A4150` | `#333A48` | `#7F848D` | Manchas de la Vaca |
| Arena | `#E9D6B9` | `#B6AA97` | `#F1E4D2` | Fachadas claras, hocicos, barrigas, suelos |
| Madera | `#9C6B3F` | `#7C593B` | `#BF9F82` | Madera, cuero, pelaje del Oso |
| Ladrillo | `#B5563C` | `#8F4A39` | `#CF9180` | Ladrillo y tejas |
| Techo pizarra | `#3D5A80` | `#354D6C` | `#8194AC` | Tejados de las casas |
| Oro | `#F2C14E` | `#BD9A47` | `#F7D78C` | Monedas, llave de la ciudad, cuernos del Toro, insignias pasivas |
| Verde dinero | `#0F7B6C` | `#13655D` | `#63A99F` | Lo positivo y el dinero; color de los servicios |
| Verde sube | `#2BB673` | `#289262` | `#75D0A4` | Flechas y gráficas que suben |
| Rojo baja | `#E5484D` | `#B33F46` | `#EE888B` | Flechas que bajan, pagos, alarmas, pico del Cisne Negro |
| Ámbar | `#F2A541` | `#BD853D` | `#F7C584` | Destacados, cascos de obra, mazo Fortuna, color de los transportes |
| Azul noticias | `#2B4C7E` | `#28426B` | `#758BAB` | Mazo Noticias |
| Rosa | `#F28482` | `#BD6C6E` | `#F7AFAE` | Mejillas, interior de orejas, narices, flores |
| Verde hoja | `#4C9A2A` | `#407D2C` | `#8BBD75` | Vegetación |
| Verde bosque | `#2D6A4F` | `#295947` | `#779E8D` | Vegetación oscura |
| Turquesa | `#18A999` | `#19887F` | `#69C7BD` | Agua |
| Agua profunda | `#0E7C74` | `#126663` | `#62AAA5` | Agua profunda y sombras del agua |
| Cielo | `#8FD3F4` | `#73A7C3` | `#B6E2F8` | Cielo de día, cristal, gotas de sudor |
| Horizonte | `#FCE7C8` | — | — | Parte baja del cielo de día |
| Atardecer alto | `#6C5B9E` | — | — | Parte alta del cielo de atardecer |
| Atardecer bajo | `#F6A57A` | — | — | Parte baja del cielo de atardecer |
| Luz de ventana | `#FFE08A` | — | — | Ventanas encendidas y farolas |
| Interior de boca | `#7A2E3A` | — | — | Bocas abiertas (con la lengua en rosa) |

### 3.2 Colores propios de los personajes

| Nombre | Base | Sombra | Brillo | Uso |
|---|---|---|---|---|
| Marrón toro | `#7A4A33` | `#634132` | `#A9897A` | Pelaje del Toro |
| Marfil | `#E7E3DC` | `#B5B3B1` | `#EFEDE8` | Piel del Elefante Blanco |
| Rojo hormiga | `#8E3B2F` | `#72352F` | `#B68078` | Cuerpo de la Hormiga |
| Azul tiburón | `#6C8CA6` | `#587289` | `#9FB4C5` | Piel del Tiburón |
| Plumaje | `#33354F` | `#2E3147` | `#7A7C8D` | Plumas del Cisne Negro (más claro que la tinta, para que se vea el contorno) |

### 3.3 Cuánto color

- En cada imagen hay **como mucho 3 colores dominantes**, más los neutros (tinta, crema, blanco cálido, grises).
- **El color propio del motivo** (el del barrio o el de la ficha) ocupa **al menos el 30 %** de la superficie con
  color, salvo que la ficha técnica diga otra cosa.
- **Nada de colores fosforescentes** ni de colores fuera de la paleta.

---

## 4. Los barrios y las otras propiedades

Cada barrio tiene un color y una forma de construir. Se respetan en todas las imágenes donde aparece: el centro del
tablero, las cabeceras y la portada.

| Barrio | Base | Sombra | Brillo | Arquitectura y materiales | Elementos que siempre aparecen |
|---|---|---|---|---|---|
| **Los Talleres** | gris acero `#6E7B8B` | `#5A6574` | `#A1A9B4` | Naves industriales con tejado de diente de sierra, paredes de ladrillo, puertas de persiana metálica gris pizarra | Chimeneas cortas con vapor blanco, chispas ámbar de soldadura, una grúa pequeña |
| **La Feria** | fucsia `#D9468F` | `#AA3E77` | `#E687B6` | Carpas a rayas fucsia y crema, puestos de madera con toldos | Banderines en cadena (fucsia, ámbar y turquesa), cajas de fruta |
| **Puerto Viejo** | turquesa `#18A999` | `#19887F` | `#69C7BD` | Casas bajas de colores junto al agua, muelle de madera | Faro blanco cálido con una franja turquesa, barcas de pesca, redes, gaviotas |
| **Barrio Universitario** | violeta `#7A4FD1` | `#6344A9` | `#A98DE1` | Edificio principal con cúpula violeta y escalinata, biblioteca con ventanales | Árboles, bicicletas aparcadas, banderolas violeta lisas (sin escudos ni letras) |
| **Centro Histórico** | terracota `#C1502E` | `#98452F` | `#D78D77` | Casas antiguas de dos pisos con balcones de madera y tejas de ladrillo, plaza adoquinada | Campanario con reloj sin números, una fuente |
| **Jardines del Río** | verde hoja `#4C9A2A` | `#407D2C` | `#8BBD75` | Casas pequeñas entre jardines, puentes de arco | Río turquesa, sauces, flores rosa y ámbar, bancos |
| **Distrito Financiero** | azul eléctrico `#2563EB` | `#2353BC` | `#719AF2` | Rascacielos inventados de cristal azul eléctrico con reflejos en bandas diagonales | Pantallas con gráficas que suben (verde sube), plazas de piedra |
| **Altos del Mirador** | dorado `#D4A017` | `#A6811D` | `#E3C168` | Casas elegantes con tejados dorados en colinas, jardines con setos | Un mirador con barandilla de madera, vista a la ciudad |
| *Transportes* | ámbar `#F2A541` | `#BD853D` | `#F7C584` | Terminal de Buses, Metro Central, Teleférico y Aeropuerto | Vehículos genéricos sin marcas |
| *Servicios* | verde dinero `#0F7B6C` | `#13655D` | `#63A99F` | Compañía de Agua y Red de Internet | Depósitos, tuberías, antenas |

---

## 5. Las 10 fichas: hojas de personaje

### 5.1 Reglas comunes de los personajes

- **De pie, como dibujos animados:**
  - los animales, sobre dos patas;
  - el Tiburón, sobre la cola;
  - la Taza y la Burbuja son objetos con cara, sin brazos ni piernas.
- **Proporciones:** la cabeza mide entre el 40 y el 45 % de la altura del personaje. Cuerpo compacto y extremidades
  cortas y redondeadas. Las manos son guantes blancos de 4 dedos (sección 2.4).
- **Misma altura:** las 10 fichas miden lo mismo en la imagen, sin importar su tamaño real. La Hormiga es tan alta
  como el Elefante.
- **Ojos (iguales en las 10):**
  - dos óvalos verticales en blanco cálido, de alto el 12 % de la altura del personaje, separados medio ojo y con
    contorno tinta;
  - la pupila en tinta ocupa el 55 % del ojo y mira al espectador;
  - un punto de brillo `#FFFFFF` en la pupila, arriba a la izquierda.
- **Cejas:** un trazo corto y grueso de tinta sobre cada ojo. Son las que dan la emoción.
- **Boca:** una línea curva simple. Solo en los retratos puede abrirse: interior en interior de boca y lengua en rosa.
- **Mejillas:** un óvalo rosa `#F28482` al 40 % de opacidad bajo cada ojo, en los 10 personajes.
- **Mirada:** el cuerpo girado 3/4 hacia la derecha y los ojos mirando al espectador.
- **Accesorios:** los de su hoja, ni uno más ni uno menos, y con el mismo diseño en la pieza y en el retrato.
- **Personalización:** cada ficha tiene un único aspecto. No hay variantes, disfraces ni cambios de ropa.
- **El color de la ficha** se usa siempre en los mismos sitios:
  - la peana de la pieza;
  - el medallón del retrato;
  - las dos insignias de sus habilidades;
  - el accesorio que lo indique su hoja.

### 5.2 Las hojas

**🐀 La Rata** · color de ficha naranja `#F4A261` (sombra `#BE8355`, brillo `#F8C398`) · metáfora: la «carrera de la
rata», trabajar sin parar para pagar las cuentas.

| Parte | Cómo es |
|---|---|
| Cuerpo | Pelaje gris piedra. Barriga, hocico y palmas en arena. Orejas redondas muy grandes (cada una mide el 60 % del ancho de la cabeza) con el interior rosa. Nariz rosa. Cola larga y fina en el brillo del rosa, en forma de S. Tres bigotes finos de tinta a cada lado |
| Ropa | Camisa de manga corta en blanco cálido, con cuello, y corbata en su naranja |
| Accesorios | Maletín gris pizarra con cierre de oro. Una gota de sudor en cielo junto a la frente (siempre) |
| Expresión | Decidida: cejas inclinadas hacia el centro, sonrisa apretada |
| Pose de la pieza | Corriendo hacia la derecha: pierna derecha adelantada, cuerpo inclinado 10° hacia delante, maletín en la mano de atrás, la cola en S detrás |

**☕ La Taza** · color de ficha café `#8D5524` (sombra `#714927`, brillo `#B59171`) · metáfora: la «tasa» de interés.

| Parte | Cómo es |
|---|---|
| Cuerpo | Taza cilíndrica de porcelana blanco cálido, un poco más estrecha abajo. Una franja ancha café en el tercio de arriba. El asa a la izquierda de la imagen. Arriba se ve el café, en la sombra del café |
| Cara | En el frente de la taza: ojos, cejas, mejillas y boca. Sin brazos ni piernas |
| Accesorios | El vapor: dos volutas en blanco cálido al 80 %, sin contorno, que se juntan en una flecha que sube |
| Expresión | Relajada («el interés trabaja por mí»): ojos medio cerrados, sonrisa tranquila |
| Pose de la pieza | De pie, quieta, con el vapor en flecha hacia arriba |

**🐂 El Toro** · color de ficha rojo `#E63946` (sombra `#B43441`, brillo `#EF7E87`) · metáfora: el mercado alcista.

| Parte | Cómo es |
|---|---|
| Cuerpo | Pelaje marrón toro. Hocico ancho en arena, con dos orificios de tinta. Cuernos de oro curvados hacia arriba. Un mechón en la frente. Pezuñas en gris pizarra. Cola con una borla |
| Ropa | Un pañuelo al cuello en su rojo |
| Accesorios | Ninguno más |
| Expresión | Confiada: sonrisa de medio lado, cejas levantadas |
| Pose de la pieza | Embistiendo hacia arriba: cabeza baja y adelantada, cuernos hacia delante y arriba, una pata delantera levantada y una nubecita de polvo en gris piedra detrás, sin contorno |

**🐻 El Oso** · color de ficha verde bosque `#2D6A4F` (sombra `#295947`, brillo `#779E8D`) · metáfora: el mercado
bajista.

| Parte | Cómo es |
|---|---|
| Cuerpo | Pelaje madera. Hocico y barriga en arena. Nariz de tinta. Orejas pequeñas y redondas. Es más ancho que los demás, pero igual de alto |
| Ropa | Bufanda verde bosque con dos rayas arena en cada extremo |
| Accesorios | Ninguno más |
| Expresión | Tranquilo y satisfecho: párpados a media altura, sonrisa pequeña |
| Pose de la pieza | De pie, con los brazos cruzados |

**🫧 La Burbuja** · color de ficha celeste `#4CC9F0` (sombra `#40A0C0`, brillo `#8BDCF5`) · metáfora: la burbuja
inmobiliaria.

| Parte | Cómo es |
|---|---|
| Cuerpo | Una esfera de jabón: relleno celeste al 20 % de opacidad (se ve a través) y contorno de tinta normal. Por dentro del borde, un aro iridiscente fino de tres colores (celeste, rosa y oro) al 60 %. Un brillo grande en blanco cálido con forma de ventana curva arriba a la izquierda, y otro pequeño abajo a la derecha |
| Dentro | Una casa (sección 6) del 40 % del diámetro, en la parte de abajo |
| Cara | Ojos, cejas, mejillas y boca sobre la superficie, en la mitad de arriba y delante de la casa |
| Expresión | Eufórica: sonrisa grande, cejas muy arriba |
| Pose de la pieza | Flotando a un 4 % de altura sobre la peana, inclinada 5° hacia la derecha |

**🐄 La Vaca Lechera** · color de ficha amarillo mantequilla `#F9C74F` (sombra `#C29E47`, brillo `#FBDB8D`) · metáfora:
el negocio que da dinero fijo.

| Parte | Cómo es |
|---|---|
| Cuerpo | Blanco cálido con 4 manchas grandes de carbón, de bordes redondeados. Hocico ancho en el brillo del rosa. Dos cuernos cortos en arena. Orejas con el interior rosa. Sin ubre visible |
| Ropa | Ninguna |
| Accesorios | Collar de cuero madera con una campana de oro |
| Expresión | Amable y satisfecha: ojos abiertos, sonrisa |
| Pose de la pieza | De pie, saludando con la mano derecha levantada |

**🐘 El Elefante Blanco** · color de ficha rosa `#F28482` (sombra `#BD6C6E`, brillo `#F7AFAE`) · metáfora: la obra
carísima que no sirve para nada.

| Parte | Cómo es |
|---|---|
| Cuerpo | Piel marfil. Orejas grandes con el interior rosa. Trompa larga levantada en S. Dos colmillos cortos en arena |
| Ropa | Ninguna |
| Accesorios | Casco de obra ámbar con una franja horizontal en blanco cálido |
| Expresión | Orgulloso y algo despistado: cejas arriba, ojos mirando un poco hacia arriba, sonrisa satisfecha |
| Pose de la pieza | De pie, sacando pecho, con la trompa levantada |

**🐜 La Hormiga** · color de ficha violeta `#7B2CBF` (sombra `#642A9B`, brillo `#A976D5`) · metáfora: el gasto hormiga.

| Parte | Cómo es |
|---|---|
| Cuerpo | Tres segmentos redondeados en rojo hormiga. Dos antenas con una bolita en la punta. Seis patas: está de pie sobre las dos de atrás |
| Ropa | Ninguna |
| Accesorios | Una moneda de oro gigante (su diámetro es el 60 % de la altura de la Hormiga), sostenida sobre la cabeza con las cuatro patas de delante |
| Expresión | Esforzada pero feliz: ojos cerrados en arco, sonrisa grande |
| Pose de la pieza | De pie, levantando la moneda sobre la cabeza |

**🦈 El Tiburón** · color de ficha azul marino `#1D4E89` (sombra `#1D4473`, brillo `#6C8CB2`) · metáfora: el inversor sin
piedad.

| Parte | Cómo es |
|---|---|
| Cuerpo | Azul tiburón arriba y vientre en blanco cálido. Aleta dorsal grande. Las aletas de los lados hacen de brazos. Está de pie sobre la cola |
| Ropa | Cuello de camisa en blanco cálido y corbata en su azul marino |
| Accesorios | Gafas de sol de tinta, con un brillo blanco en cada cristal. Sonrisa con una fila de dientes triangulares en blanco cálido, de puntas redondeadas |
| Expresión | Confiado: sonrisa de medio lado enseñando los dientes. Los ojos no se ven: los tapan las gafas |
| Pose de la pieza | De pie sobre la cola, ajustándose la corbata con una aleta |

**🦢 El Cisne Negro** · color de ficha negro azulado `#22223B` (sombra `#212338`, brillo `#6F6F80`) · metáfora: el
imprevisto que nadie vio venir.

| Parte | Cómo es |
|---|---|
| Cuerpo | Plumaje, con brillos en el brillo del plumaje. Pico en rojo baja con la punta de tinta. Patas en gris pizarra |
| Ropa | Ninguna |
| Accesorios | Ninguno: su rasgo es la elegancia |
| Expresión | Misterioso: párpados a media altura, media sonrisa |
| Pose de la pieza | De pie, con el cuello en S y un ala un poco abierta |

---

## 6. Objetos que se repiten

Estos objetos salen en varias imágenes y **tienen que ser siempre el mismo**. Su primera versión aprobada pasa a ser la
referencia de las siguientes.

| Objeto | Diseño fijo |
|---|---|
| **Moneda** | Disco de oro con el canto en la sombra del oro y un anillo interior en relieve (un círculo al 70 % del diámetro, en el brillo del oro). Sin símbolos ni números. Un destello `#FFFFFF` con forma de rombo, arriba a la izquierda. De canto, es un rectángulo redondeado con muescas |
| **Llave de la ciudad** | Llave antigua de oro. La cabeza es un anillo. La caña es larga. El paletón, en lugar de dientes, dibuja el perfil de 4 edificios de alturas 2, 4, 3 y 5 |
| **Casa** | Una planta con tejado a dos aguas. Fachada arena, tejado techo pizarra, puerta de madera, una ventana cuadrada en luz de ventana y una chimenea pequeña |
| **Torre** | Rascacielos genérico de cristal cielo con estructura gris pizarra, 6 filas de ventanas y una antena con una luz en rojo baja |
| **Flecha que sube / que baja** | Flecha gruesa con la punta redondeada, en verde sube o en rojo baja, con contorno de tinta |
| **Gráfica** | Línea en zigzag de 4 tramos con un punto en cada vértice, sobre 3 líneas horizontales de tinta al 20 % |
| **Maletín** | Gris pizarra, con asa y cierre de oro |
| **Lupa** | Aro y mango en gris pizarra; el cristal en cielo al 50 %, con un brillo |
| **Sello de goma** | Mango de madera redondeado y base en rojo baja |
| **Dado** | Cubo en blanco cálido con las esquinas muy redondeadas y puntos de tinta. Siempre en 3/4, enseñando tres caras |
| **Carta en miniatura** | Rectángulo 3:4 con las esquinas redondeadas, en azul noticias o en ámbar, con su emblema simplificado (sección 7.8) |
| **Arco de entrada de la ciudad** | Arco de medio punto de piedra arena, con un remate de oro en la clave |
| **Efectos** | Las gotas de sudor van en cielo; las líneas de movimiento, en tinta al 40 % y sin contorno; los destellos son estrellas de 4 puntas en blanco cálido; el confeti son rectángulos pequeños en los colores de los barrios |

---

## 7. Fichas técnicas por tipo de imagen

Cada ficha dice el lienzo final exacto, la proporción con que se genera, el fondo, dónde va el motivo y qué tamaño
tiene. Los porcentajes se miden sobre el lienzo, desde la esquina de arriba a la izquierda. La plantilla de cada tipo
se copia tal cual al principio de la petición.

### 7.1 Pieza de ficha (`fichas/piezas/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Peana | Un disco visto en elipse. La cara de arriba mide el 72 % del ancho del lienzo y el 18 % del alto, centrada a lo ancho. El borde lateral tiene un grosor del 5 % del alto, en la sombra del color de la ficha. La cara de arriba va en el color de la ficha, con un aro fino en blanco cálido (grosor del 1 %) al 85 % de su ancho. El borde inferior de la peana queda al 95 % del alto |
| Sombras | La del personaje sobre la peana: elipse de tinta al 25 % del 50 % del ancho de la peana. La de la peana sobre el suelo: elipse de tinta al 20 %, asomando un 3 % por abajo y a la derecha |
| Personaje | De pie en el centro de la cara de arriba de la peana. Lo más alto (orejas, cuernos, vapor, moneda) llega al 6 % del borde de arriba. Ocupa como mucho el 80 % del ancho y deja al menos un 4 % de margen a cada lado |
| Vista | 3/4 desde arriba (sección 2.5) |
| Línea | Contorno exterior del 2 % e interiores del 1 % (en el personaje y en la peana) |
| Nada más | Ni suelo, ni fondo, ni otros objetos |

```
Plantilla: Pieza de juego de mesa digital, ilustración vectorial plana con sombreado de dos tonos y borde nítido,
contorno #1D2430 grueso y uniforme con extremos redondeados, luz desde arriba a la izquierda, acabado mate. Un
personaje de dibujos animados, cabezón, de pie sobre una peana redonda vista en elipse del color [color de la ficha],
centrado; vista 3/4 desde arriba, girado hacia la derecha y mirando al espectador. Fondo transparente. Sin texto,
sin letras, sin números, sin logotipos, sin firma y sin marca de agua. Personaje: [hoja de personaje de la sección 5].
```

### 7.2 Retrato de ficha (`fichas/retratos/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 512 px, WebP. Se genera en 1:1 |
| Fondo | Transparente fuera del medallón |
| Medallón | Círculo centrado del 94 % del lienzo, relleno del color de la ficha. Detrás del personaje, un círculo en el brillo de su color, del 60 % del diámetro, centrado a lo ancho y con el centro al 42 % del alto. Por fuera, un aro crema del 2,5 % y un contorno de tinta del 1,5 % |
| Suelo | Si la escena lo necesita, una banda en la sombra del color de la ficha desde el 80 % del alto hasta el borde del medallón |
| Personaje | De cuerpo entero, con los mismos colores, ropa y accesorios que su pieza. Ocupa entre el 62 y el 70 % del alto, centrado a lo ancho (con un 8 % de margen), con la cabeza en el tercio de arriba. Más expresivo que en la pieza |
| Escena | Los objetos de su escena (sección 8) van dentro del medallón, a un 6 % del borde como mínimo. Solo puede salirse del círculo, por arriba y hasta un 4 %, la parte más alta del personaje |
| Vista | Frontal, con el personaje en 3/4 hacia la derecha |
| Línea | 2 % el personaje y los objetos principales; 1 % los detalles y los objetos secundarios |

```
Plantilla: Retrato de personaje para un juego de mesa digital, ilustración vectorial plana con sombreado de dos tonos
y borde nítido, contorno #1D2430 grueso y uniforme, luz desde arriba a la izquierda, acabado mate. Dentro de un
medallón redondo de color [color de la ficha], con un círculo más claro detrás del personaje y un aro crema por
fuera; fondo transparente fuera del medallón. Personaje de cuerpo entero, cabezón, en 3/4 hacia la derecha y mirando
al espectador. Sin texto, sin letras, sin números, sin logotipos, sin firma y sin marca de agua. Personaje: [hoja de
personaje]. Escena: [descripción de la sección 8].
```

### 7.3 Centro del tablero (`tablero/centro/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 1024 × 1024 px, WebP. Se genera en 1:1 |
| Fondo | Noche `#16202E`, sin transparencia |
| La ciudad | Ocupa un cuadrado centrado del 88 % del lienzo, con las esquinas redondeadas (radio del 8 %). Su borde se difumina hacia el noche en una franja del 6 %: es la única transición suave permitida en esta imagen |
| Distribución | Ver la imagen en la sección 8. Cada zona va junto al lado del tablero donde están sus calles, en el orden del recorrido: la Salida abajo a la izquierda y el avance en el sentido de las agujas del reloj |
| Plaza central | En el centro, una plaza redonda crema, lisa y sin edificios, del 22 % del ancho. Ahí el código muestra los dados y las cartas |
| Vista | Aérea inclinada (sección 2.5) |
| Color | Atardecer (sección 2.7). Todos los colores van mezclados con noche al 20 %, para que no compitan con las fichas. Una de cada cuatro ventanas, encendida en luz de ventana |
| Línea | 0,5 % en los edificios. Sin línea en suelos, agua y vegetación de fondo |

### 7.4 Esquina (`tablero/esquinas/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 512 px, WebP. Se genera en 1:1 |
| Fondo | Crema `#F4F1EA`, sin transparencia. Detrás del motivo, un círculo centrado del 84 % del lienzo en el color de acento de la esquina al 25 % de opacidad |
| Suelo | Una elipse plana en arena, del 80 % del ancho y el 14 % del alto, centrada a lo ancho y con el centro al 80 % del alto. El motivo se apoya en ella |
| Motivo | Centrado. Ocupa el 70 % del ancho y va del 12 % al 82 % del alto. Margen mínimo del 6 % |
| Vista | 3/4 desde arriba |
| Línea | 1,5 % la silueta; 0,75 % los detalles |
| Color de acento | Salida: oro. Calabozo: gris piedra. Bolsa de Valores: verde sube. ¡Auditoría!: rojo baja |

### 7.5 Edificio (`tablero/edificios/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Motivo | Centrado a lo ancho. La base del edificio queda al 92 % del alto, con una sombra de contacto en elipse de tinta al 20 % del 90 % de su ancho. La casa ocupa el 70 % del ancho y el 62 % del alto. La torre ocupa el 46 % del ancho y el 86 % del alto |
| Vista | 3/4 desde arriba, la misma que las piezas |
| Línea | 2 % / 1 % |
| Diseño | El de la casa y la torre de la sección 6, sin cambios |

### 7.6 Insignia de habilidad activa (`botones/habilidades/activas/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Forma | Un hexágono con un vértice arriba y otro abajo (los lados verticales a izquierda y derecha). Mide el 94 % del alto, es regular y tiene las esquinas redondeadas con un radio del 6 %. Va centrado |
| Capas, de fuera adentro | 1. Contorno de tinta del 2 %. 2. Borde en blanco cálido del 6 %. 3. Cara con un degradado vertical: el brillo del color de la ficha arriba y su color base abajo. 4. Relieve: una franja del 5 % en la sombra de su color a lo largo del borde de abajo, para que parezca un botón que se puede pulsar. 5. Reflejo: una banda curva blanca al 25 % de opacidad en el 30 % de arriba de la cara |
| Símbolo | En blanco cálido, con contorno de tinta del 2,5 % y sombras en gris piedra. Ocupa el 56 % del ancho y va centrado a lo ancho, con el centro al 47 % del alto. Detrás lleva una copia de su silueta desplazada un 2,5 % abajo a la derecha, en la sombra del color de la ficha. Puede tener **un** detalle de color de la paleta (oro, verde sube, rojo baja, ámbar o gris piedra) que no pase del 25 % del símbolo |

```
Plantilla: Insignia de habilidad activa para un juego de mesa digital: hexágono con un vértice arriba y otro abajo,
esquinas redondeadas, borde blanco cálido grueso y contorno #1D2430, cara de color [color de la ficha] con un
degradado suave más claro arriba, una franja más oscura en el borde inferior y un reflejo curvo arriba; parece un
botón que se puede pulsar. En el centro, un símbolo grande en blanco cálido con contorno oscuro: [símbolo de la
sección 8]. Ilustración vectorial plana, luz desde arriba a la izquierda. Fondo transparente. Sin texto, sin letras,
sin números, sin logotipos, sin firma y sin marca de agua.
```

### 7.7 Insignia de habilidad pasiva (`botones/habilidades/pasivas/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 256 × 256 px, WebP. Se genera en 1:1 |
| Fondo | Transparente |
| Forma | Una medalla redonda del 94 % del lienzo, centrada |
| Capas, de fuera adentro | 1. Contorno de tinta del 2 %. 2. Canto de moneda en oro, del 7 %, con 32 muescas (rectángulos redondeados) en la sombra del oro. 3. Un aro fino en el brillo del oro, del 1,5 %. 4. Cara plana (sin degradado) en la sombra del color de la ficha. 5. Un círculo interior en el color base de la ficha, del 70 % del diámetro |
| Símbolo | En oro, con brillos en el brillo del oro y contorno de tinta del 2 %. Ocupa el 54 % del ancho y va centrado. Puede tener **un** detalle en blanco cálido, verde sube o rojo baja que no pase del 25 % del símbolo |
| Diferencia con las activas | Sin relieve inferior y sin reflejo: la medalla se mira, no se pulsa |

```
Plantilla: Insignia de habilidad pasiva para un juego de mesa digital: medalla redonda con el canto dorado de una
moneda, con muescas, y contorno #1D2430; la cara, plana, de color [color de la ficha] más oscuro, con un círculo
interior del color [color de la ficha]. En el centro, un símbolo dorado con contorno oscuro: [símbolo de la sección
8]. Ilustración vectorial plana, luz desde arriba a la izquierda. Fondo transparente. Sin texto, sin letras, sin
números, sin logotipos, sin firma y sin marca de agua.
```

### 7.8 Dorso de carta (`tarjetas/dorsos/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 384 × 512 px (3:4), WebP. Se genera en 3:4 |
| Fondo | El color del mazo, a sangre (llega a los bordes). Sin transparencia. Las esquinas son rectas: el código las redondea |
| Marco | Una banda crema del 5 % del ancho, a un 4 % del borde, con un contorno de tinta del 1 % por dentro y por fuera |
| Dentro del marco | Un patrón repetido del motivo pequeño de su mazo (sección 8), en la sombra del color del mazo, en cuadrícula regular |
| Centro | Un medallón crema redondo del 56 % del ancho, centrado, con contorno de tinta del 1,5 %. El emblema del mazo va dentro y ocupa el 70 % del medallón |
| Simetría | El marco y el patrón son simétricos y se ven igual girados 180°. El emblema va derecho |

### 7.9 Efecto de carta (`tarjetas/efectos/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 384 px (4:3), WebP. Se genera en 4:3 |
| Fondo | Crema `#F4F1EA`, sin transparencia. Detrás del motivo, un círculo centrado de diámetro igual al 76 % del alto, en el color de acento de la carta al 25 % de opacidad |
| Suelo | Solo en las que lo indique la sección 8: una banda arena desde el 80 % del alto hasta abajo |
| Motivo | Centrado. Ocupa el 64 % del alto y como mucho el 70 % del ancho |
| Vista | Frontal un poco elevada |
| Línea | 1,5 % / 0,75 % |

### 7.10 Cabecera de propiedad (`tarjetas/cabeceras/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 288 px (16:9), WebP. Se genera en 16:9 |
| Fondo | Escena completa, sin transparencia. Cielo de media tarde (degradado) en el 40 % de arriba, con 2 nubes en blanco cálido sin contorno. El horizonte va al 55 % del alto |
| Composición | El motivo principal (sección 8) centrado, ocupando entre el 50 y el 60 % del ancho, en plano medio. Una calle o suelo en crema y arena en el 15 % de abajo. A los lados, edificios de su barrio en plano medio. Siluetas de la ciudad en el fondo |
| Color | El color del barrio (o el de los transportes y servicios) ocupa entre el 30 y el 40 % de la superficie con color: tejados, toldos, fachadas y banderines. Las calles y el cielo no cuentan |
| Vista | Frontal un poco elevada, con 3 planos de profundidad (sección 2.6) |
| Línea | La de las escenas (sección 2.2) |

### 7.11 Ilustración de interfaz (`interfaz/ilustraciones/`)

| Aspecto | Regla |
|---|---|
| Lienzo final | 512 × 512 px, WebP. Se genera en 1:1 |
| Fondo | Igual que los retratos: transparente fuera de un medallón del 94 %, con el círculo más claro detrás del motivo, el aro crema y el contorno de tinta. El color del medallón lo indica la sección 8 |
| Motivo | Centrado. Ocupa el 70 % del alto del medallón |
| Línea | 2 % / 1 % |

### 7.12 Marca (`marca/`)

| Archivo | Reglas |
|---|---|
| Emblema | 512 × 512 px, WebP, fondo transparente. Un círculo noche del 92 % con un aro de oro del 3 %. Dentro, la llave de la ciudad (sección 6) en diagonal, con la cabeza abajo a la izquierda y el paletón arriba a la derecha, ocupando el 76 % de la diagonal. Línea del 2 % |
| Icono de la app | 512 × 512 px, PNG, cuadrado lleno de noche. Sin círculo ni aro. La llave, centrada dentro del 60 % central del lienzo (los celulares recortan los bordes) |
| Portada | 1600 × 900 px (16:9), WebP, sin transparencia. Ver la sección 8 |
| Redes | 1200 × 630 px, PNG o JPG, sin transparencia. Se genera en 16:9 y el optimizador recorta lo que sobra arriba y abajo. Ver la sección 8 |

### 7.13 Iconos SVG (los escribe el código, no un generador de imágenes)

Los iconos de `tablero/barrios/`, `tablero/casillas/`, `tablero/marcadores/`, `botones/acciones/` e `interfaz/iconos/`
son **SVG escritos a mano**, de **trazo**, todos con la misma construcción:

- **La etiqueta de apertura**, exactamente así:

  ```
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  ```

- **El trazo:** todos los trazos son de 5. Nunca hay otro grosor.
- **Los rellenos:** solo con `fill="currentColor"`, y solo en detalles pequeños de hasta 10 × 10 (puntos, ojos,
  remaches).
- **Los colores:** no se escriben. Solo `currentColor` y `none`, porque el código da el color. Nada de `#…`, `rgb()`
  ni nombres de colores.
- **El área:** todo va dentro del recuadro de 6 a 58. La forma principal cabe en un cuadrado de 48 × 48 centrado (de 8
  a 56). Las formas redondas pueden llegar a 52 × 52.
- **El estilo:** de frente y sin perspectiva, simétrico cuando el objeto lo es, con las esquinas redondeadas (`rx` de
  al menos 4).
- **La separación:** al menos 4 entre trazos paralelos, para que no se junten a 24 px.
- **La complejidad:** como mucho 8 elementos.
- **Elementos permitidos:** `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon` y `g`. Prohibidos:
  `text`, `image`, `style`, `script`, degradados y filtros.
- **El peso:** 20 KB como máximo. Lo normal es menos de 2 KB.

Ejemplo de un icono correcto, la moneda de `interfaz/iconos/`:

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="32" cy="32" r="22"/>
  <circle cx="32" cy="32" r="12"/>
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

Las piezas siguen la ficha 7.1. Su aspecto completo está en las hojas de la sección 5.

| Archivo | Pose (detalle en la sección 5) |
|---|---|
| `fichas/piezas/rata.webp` | Corriendo hacia la derecha con el maletín |
| `fichas/piezas/taza.webp` | Quieta, con el vapor en flecha |
| `fichas/piezas/toro.webp` | Embistiendo hacia arriba |
| `fichas/piezas/oso.webp` | Brazos cruzados |
| `fichas/piezas/burbuja.webp` | Flotando sobre la peana |
| `fichas/piezas/vaca-lechera.webp` | Saludando |
| `fichas/piezas/elefante-blanco.webp` | Sacando pecho, con la trompa levantada |
| `fichas/piezas/hormiga.webp` | Levantando la moneda |
| `fichas/piezas/tiburon.webp` | Ajustándose la corbata |
| `fichas/piezas/cisne-negro.webp` | Cuello en S y un ala abierta |

Los retratos siguen la ficha 7.2:

| Archivo | Escena dentro del medallón |
|---|---|
| `fichas/retratos/rata.webp` | La Rata corre dentro de una rueda de ejercicio cuyo aro es una moneda gigante (vista de canto), con 3 líneas de movimiento detrás. Está cansada pero decidida |
| `fichas/retratos/taza.webp` | La Taza, sobre un platito en blanco cálido, con una torre de 3 monedas a su derecha. Su vapor dibuja una gráfica que sube |
| `fichas/retratos/toro.webp` | El Toro, de pie y con los brazos en jarra, sube por una gráfica en verde sube que cruza el medallón en diagonal hacia arriba a la derecha |
| `fichas/retratos/oso.webp` | El Oso, con los brazos cruzados, delante de una gráfica en rojo baja que cae. Detrás, a la izquierda, la entrada de una cueva con un montoncito de monedas |
| `fichas/retratos/burbuja.webp` | La Burbuja, enorme (80 % del medallón), flota sobre una silueta de la ciudad que asoma por abajo, con 3 casas dentro. Desde la derecha se acerca una aguja en gris piedra, con la punta a un 10 % de la burbuja. Ella mira la aguja preocupada pero sigue sonriendo |
| `fichas/retratos/vaca-lechera.webp` | La Vaca, sobre pasto en verde hoja, junto a un cántaro metálico en gris piedra del que sale un chorro de monedas en lugar de leche |
| `fichas/retratos/elefante-blanco.webp` | El Elefante, orgulloso, delante de un puente enorme en gris piedra que se corta en el aire, con una cinta de inauguración roja cortada colgando |
| `fichas/retratos/hormiga.webp` | La Hormiga, delante, y dos hormigas iguales pero más pequeñas detrás, en fila, llevan monedas hacia un hormiguero de tierra arena con una ranura de hucha en la cima |
| `fichas/retratos/tiburon.webp` | El Tiburón nada entre olas que son líneas de gráfica, en turquesa y agua profunda, con la aleta fuera del agua |
| `fichas/retratos/cisne-negro.webp` | El Cisne se desliza sobre un lago en noche en el que se refleja un relámpago ámbar. Tres plumas caen y se convierten en cartas en miniatura (una de Noticias y dos de Fortuna) |

### 8.2 Tablero · P1

**Centro (ficha 7.3):**

| Archivo | Qué dibujar |
|---|---|
| `tablero/centro/ciudad.webp` | La ciudad vista desde el aire, con cada zona junto a su lado del tablero. **Abajo a la izquierda,** el arco de entrada de la ciudad (la Salida). **Lado izquierdo, de abajo arriba:** Los Talleres, la Terminal de Buses y La Feria. **Arriba a la izquierda:** una comisaría pequeña (el Calabozo). **Lado de arriba, de izquierda a derecha:** Puerto Viejo junto a un trozo de mar, la Compañía de Agua, la estación del Metro Central y el Barrio Universitario. **Arriba a la derecha:** el edificio de la Bolsa de Valores. **Lado derecho, de arriba abajo:** el Centro Histórico, una línea de Teleférico, la torre de la Red de Internet y los Jardines del Río, con un río que viene del mar. **Abajo a la derecha:** la oficina de auditoría con una lupa en el tejado. **Lado de abajo, de derecha a izquierda:** el Distrito Financiero, el Aeropuerto con una pista y un avión, y los Altos del Mirador en una colina. **En el centro,** la plaza redonda lisa. Cada barrio, con su arquitectura de la sección 4 |

**Esquinas (ficha 7.4):**

| Archivo | Qué dibujar |
|---|---|
| `tablero/esquinas/salida.webp` | **Día de pago** (acento oro). El arco de entrada de la ciudad (sección 6). Bajo el arco, un sobre de sueldo abierto en blanco cálido del que suben 5 monedas en abanico. Un camino crema sale del arco hacia el espectador |
| `tablero/esquinas/calabozo.webp` | **Calabozo** (acento gris piedra). Una comisaría pequeña y moderna en gris piedra. A la izquierda, la puerta de una celda con barrotes verticales gris pizarra, sin carteles. A la derecha, un banco de madera para quien solo pasa, con un reloj de pared sin números encima |
| `tablero/esquinas/bolsa-de-valores.webp` | **Bolsa de Valores** (acento verde sube). Una fachada con 4 columnas modernas en blanco cálido, escalinata y frontón sin inscripciones. Sobre la puerta, una pizarra luminosa en noche con 2 flechas que suben y 1 que baja, y gráficas sin números. A los lados de la escalinata, un toro (a la izquierda) y un oso (a la derecha) pequeños y estilizados, en oro, como adornos. No deben imitar ninguna escultura real |
| `tablero/esquinas/auditoria.webp` | **¡Auditoría!** (acento rojo baja). Una lupa gigante (sección 6) inclinada sobre un libro de cuentas abierto (páginas crema con líneas grises, sin números), un sello de goma al lado y una luz giratoria ámbar sobre el libro, con 3 rayos. Sin personas ni policías |

**Edificios (ficha 7.5):**

| Archivo | Qué dibujar |
|---|---|
| `tablero/edificios/casa.webp` | La casa de la sección 6 |
| `tablero/edificios/torre.webp` | La torre de la sección 6 |

**Iconos de los barrios** (SVG, ficha 7.13):

| Archivo | Qué dibujar con trazos |
|---|---|
| `tablero/barrios/talleres.svg` | Una llave inglesa en diagonal cruzada con medio engranaje |
| `tablero/barrios/feria.svg` | Una carpa de feria: un triángulo con el borde inferior ondulado y un banderín en la punta |
| `tablero/barrios/puerto-viejo.svg` | Un ancla |
| `tablero/barrios/universitario.svg` | Un birrete de frente, con su borla |
| `tablero/barrios/centro-historico.svg` | Un campanario: una torre con una campana dentro y tejado a dos aguas |
| `tablero/barrios/jardines-del-rio.svg` | Un árbol de copa redonda con dos ondas de agua debajo |
| `tablero/barrios/distrito-financiero.svg` | Tres barras que suben, con una flecha encima |
| `tablero/barrios/altos-del-mirador.svg` | Una colina con una estrella de 5 puntas encima |

**Iconos de las otras casillas** (SVG):

| Archivo | Qué dibujar con trazos |
|---|---|
| `tablero/casillas/terminal-de-buses.svg` | Un autobús de frente, con dos faros |
| `tablero/casillas/metro-central.svg` | Un tren de metro de frente, con dos faros y una ventana grande |
| `tablero/casillas/teleferico.svg` | Una cabina colgada de un cable en diagonal |
| `tablero/casillas/aeropuerto.svg` | Un avión de perfil, despegando hacia arriba a la derecha |
| `tablero/casillas/compania-de-agua.svg` | Una gota con dos ondas debajo |
| `tablero/casillas/red-de-internet.svg` | Una antena con tres arcos de señal |
| `tablero/casillas/noticias.svg` | Un periódico doblado, con tres líneas de texto simuladas |
| `tablero/casillas/fortuna.svg` | Una noria: un círculo con radios y 6 cabinas pequeñas |
| `tablero/casillas/impuesto-al-patrimonio.svg` | Una balanza con un maletín en un plato y una moneda en el otro |
| `tablero/casillas/agencia-de-bolsa.svg` | Un maletín con una flecha en zigzag que sube |

**Marcadores** (SVG):

| Archivo | Qué dibujar con trazos | Cuándo se usa |
|---|---|---|
| `tablero/marcadores/hipotecada.svg` | Un candado cerrado | La calle está hipotecada |
| `tablero/marcadores/en-obras.svg` | Un cono de obra delante de una valla | Obras eternas del Elefante Blanco |
| `tablero/marcadores/inflada.svg` | Una burbuja con un destello | La calle está inflada por la Burbuja |
| `tablero/marcadores/estallada.svg` | Una burbuja rota, con cuatro salpicaduras | La burbuja estalló |
| `tablero/marcadores/retenido.svg` | La puerta de una celda con barrotes | El jugador está retenido en el Calabozo |
| `tablero/marcadores/hibernando.svg` | Una luna creciente con tres curvitas de sueño (sin letras) | El Oso hiberna |
| `tablero/marcadores/marcado.svg` | Una aleta de tiburón dentro de una diana | Frenesí del Tiburón |
| `tablero/marcadores/pierde-turno.svg` | Un reloj de arena con una raya en diagonal | Imprevisto del Cisne Negro |
| `tablero/marcadores/en-racha-final.svg` | La llave de la ciudad | El jugador alcanzó la meta y vuelve a la Salida |

### 8.3 Botones · P2

**Insignias de las habilidades activas** (ficha 7.6). El fondo de cada una va en el color de su ficha.

| Archivo | Ficha | Símbolo (en blanco cálido) | Detalle de color |
|---|---|---|---|
| `botones/habilidades/activas/esprint.webp` | Rata | Un dado (sección 6) inclinado, como recién lanzado, con 3 líneas de movimiento a su izquierda | Ninguno (los puntos van en tinta) |
| `botones/habilidades/activas/prestamo-expres.webp` | Taza | Un guante que entrega hacia la derecha una moneda grande, con un reloj de arena pequeño arriba a la derecha | La moneda, en oro |
| `botones/habilidades/activas/rally.webp` | Toro | Una gráfica en zigzag que sube de abajo a la izquierda hasta arriba a la derecha y termina en punta de flecha | La punta de flecha, en verde sube |
| `botones/habilidades/activas/hibernar.webp` | Oso | La cabeza de un oso de frente, dormido (ojos como arcos cerrados), con una luna creciente arriba a la derecha | La luna, en oro |
| `botones/habilidades/activas/inflar.webp` | Burbuja | Una burbuja grande con brillo, y una aguja que se acerca desde la derecha | La aguja, en gris piedra |
| `botones/habilidades/activas/temporada-alta.webp` | Vaca Lechera | Una campana de vaca con 3 ondas de vibración a cada lado y un sol detrás | El sol, en oro |
| `botones/habilidades/activas/obras-eternas.webp` | Elefante Blanco | Una valla de obra con un cono delante | Las franjas de la valla, en ámbar |
| `botones/habilidades/activas/hormiguero.webp` | Hormiga | Un montículo de hormiguero con una barrera de peaje cerrada en la entrada | Las franjas de la barrera, en rojo baja |
| `botones/habilidades/activas/frenesi.webp` | Tiburón | Una diana de 2 anillos con una aleta en el centro | El anillo exterior, en rojo baja |
| `botones/habilidades/activas/imprevisto.webp` | Cisne Negro | Un reloj de arena volcado con una grieta en zigzag y una pluma que cae a la derecha | La arena, en oro |

**Insignias de las habilidades pasivas** (ficha 7.7). La medalla va en el color de su ficha.

| Archivo | Ficha | Símbolo (en oro) | Detalle de color |
|---|---|---|---|
| `botones/habilidades/pasivas/horas-extra.webp` | Rata | Un despertador con una flecha pequeña que sube a su derecha | La flecha, en verde sube |
| `botones/habilidades/pasivas/interes-a-favor.webp` | Taza | Una taza con vapor que forma una flecha curva hacia arriba | El vapor, en blanco cálido |
| `botones/habilidades/pasivas/optimista.webp` | Toro | La cabeza de un toro de frente, con los cuernos hacia arriba y una flecha pequeña que sube sobre la frente | La flecha, en verde sube |
| `botones/habilidades/pasivas/apuesta-bajista.webp` | Oso | Una garra sobre una flecha que baja | La flecha, en rojo baja |
| `botones/habilidades/pasivas/valor-inflado.webp` | Burbuja | Una casa dentro de una burbuja | El aro de la burbuja, en blanco cálido |
| `botones/habilidades/pasivas/renta-fija.webp` | Vaca Lechera | Un cántaro de leche del que caen 3 monedas en fila | Ninguno |
| `botones/habilidades/pasivas/constructora.webp` | Elefante Blanco | Una grúa con una etiqueta colgando (sin texto) | La etiqueta, en blanco cálido |
| `botones/habilidades/pasivas/peaje-hormiga.webp` | Hormiga | Tres hormigas en fila, cada una con una moneda | Ninguno |
| `botones/habilidades/pasivas/cazador-de-gangas.webp` | Tiburón | Un martillo de subasta con una aleta detrás | La aleta, en blanco cálido |
| `botones/habilidades/pasivas/antifragil.webp` | Cisne Negro | Un escudo con una pluma en el centro y 3 grietas alrededor que no lo tocan | La pluma, en blanco cálido |

**Iconos de las acciones** (SVG, ficha 7.13):

| Archivo | Qué dibujar con trazos |
|---|---|
| `botones/acciones/tirar-dados.svg` | Dos dados de frente, uno un poco más alto, con sus puntos rellenos |
| `botones/acciones/agitar-celular.svg` | Un celular con dos líneas de vibración a cada lado |
| `botones/acciones/comprar.svg` | Un guante que sostiene la llave de una casa |
| `botones/acciones/pasar.svg` | Una flecha curva que rodea un punto relleno |
| `botones/acciones/subastar.svg` | Un martillo de subasta en diagonal sobre su base |
| `botones/acciones/pujar.svg` | Un guante levantado con una moneda |
| `botones/acciones/construir.svg` | Una casa con un signo más arriba a la derecha |
| `botones/acciones/vender-edificio.svg` | Una casa con una flecha que sale hacia una moneda |
| `botones/acciones/hipotecar.svg` | Un candado cerrado delante de una casa |
| `botones/acciones/levantar-hipoteca.svg` | Un candado abierto delante de una casa |
| `botones/acciones/tratos.svg` | Un apretón de manos |
| `botones/acciones/comprar-acciones.svg` | Tres barras con un signo más encima |
| `botones/acciones/vender-acciones.svg` | Tres barras con un signo menos encima |
| `botones/acciones/pagar-fianza.svg` | Una moneda que entra por una puerta de celda |
| `botones/acciones/salvoconducto.svg` | Un pase rectangular con una estrella |
| `botones/acciones/terminar-turno.svg` | Una marca de verificación dentro de un círculo |
| `botones/acciones/bancarrota.svg` | Un bolsillo vuelto del revés, vacío |
| `botones/acciones/usar-habilidad.svg` | Un rayo dentro de un hexágono con un vértice arriba |
| `botones/acciones/aceptar.svg` | Una marca de verificación |
| `botones/acciones/rechazar.svg` | Una equis |
| `botones/acciones/volver.svg` | Una flecha hacia la izquierda |
| `botones/acciones/ajustes.svg` | Un engranaje de 8 dientes con un círculo en el centro |
| `botones/acciones/ayuda.svg` | Un salvavidas |
| `botones/acciones/pantalla-completa.svg` | Cuatro esquinas que apuntan hacia fuera |

### 8.4 Tarjetas · P2

**Dorsos (ficha 7.8):**

| Archivo | Color del mazo | Motivo del patrón | Emblema del centro |
|---|---|---|---|
| `tarjetas/dorsos/noticias.webp` | Azul noticias | Rombos pequeños (4 % del ancho) | Un periódico doblado en blanco cálido, con líneas grises en lugar de texto, delante de la silueta de 3 edificios en tinta |
| `tarjetas/dorsos/fortuna.webp` | Ámbar | Destellos de 4 puntas | Una noria de oro cuyas 6 cabinas son monedas |

**Efectos de las cartas (ficha 7.9):**

| Archivo | Acento | Suelo | Qué dibujar |
|---|---|---|---|
| `tarjetas/efectos/cobrar.webp` | Verde sube | No | Un guante abierto hacia arriba que recibe 6 monedas que caen |
| `tarjetas/efectos/pagar.webp` | Rojo baja | No | Una billetera de madera abierta de la que se escapan 4 monedas volando hacia arriba a la derecha |
| `tarjetas/efectos/avanzar.webp` | Ámbar | Sí | Una señal de tráfico redonda con una flecha hacia delante y, a su lado, un coche pequeño genérico en marcha con líneas de movimiento |
| `tarjetas/efectos/retroceder.webp` | Ámbar | Sí | Una valla de obra con una señal de desvío y una flecha curva hacia atrás |
| `tarjetas/efectos/viaje.webp` | Ámbar | No | Tres boletos abiertos en abanico: uno con un autobús, otro con un metro y otro con un teleférico (dibujos, sin texto) |
| `tarjetas/efectos/calabozo.webp` | Gris piedra | Sí | La puerta de una celda que se cierra, con una lupa de auditor delante. Sin policías |
| `tarjetas/efectos/salvoconducto.webp` | Oro | No | Un pase dorado con una cinta en rojo baja y un sello redondo |
| `tarjetas/efectos/bolsa-sube.webp` | Verde sube | No | Una pizarra de cotizaciones en noche con 3 flechas que suben y confeti |
| `tarjetas/efectos/bolsa-baja.webp` | Rojo baja | No | Una pizarra de cotizaciones en noche con 3 flechas que bajan y papeles volando |
| `tarjetas/efectos/llega-empresa.webp` | Azul eléctrico | Sí | Una grúa que coloca un edificio de oficinas de cristal, con un camión de mudanza genérico y cajas |
| `tarjetas/efectos/reparaciones.webp` | Ámbar | Sí | Un andamio sobre la fachada de una casa, con un casco de obra y herramientas |
| `tarjetas/efectos/cumpleanos.webp` | Rosa | No | Un pastel con 3 velas encendidas y 2 sobres cerrados con monedas asomando |
| `tarjetas/efectos/subsidio.webp` | Verde dinero | Sí | El edificio del ayuntamiento, con columnas y un gran lazo de regalo en rojo baja delante |

**Cabeceras (ficha 7.10).** Cada barrio, con su arquitectura y sus elementos de la sección 4:

| Archivo | Color dominante | Motivo principal |
|---|---|---|
| `tarjetas/cabeceras/talleres.webp` | Gris acero | Una nave industrial con tejado de diente de sierra y la persiana subida, chispas de soldadura dentro y una grúa pequeña al lado |
| `tarjetas/cabeceras/feria.webp` | Fucsia | La carpa principal de la feria con banderines y dos puestos de fruta delante |
| `tarjetas/cabeceras/puerto-viejo.webp` | Turquesa | El faro al final del muelle, con dos barcas de pesca y gaviotas |
| `tarjetas/cabeceras/universitario.webp` | Violeta | El edificio con cúpula y escalinata, con árboles y bicicletas delante |
| `tarjetas/cabeceras/centro-historico.webp` | Terracota | La plaza con la fuente y el campanario detrás, entre casas con balcones |
| `tarjetas/cabeceras/jardines-del-rio.webp` | Verde hoja | Un puente de arco sobre el río, con sauces y flores en las orillas |
| `tarjetas/cabeceras/distrito-financiero.webp` | Azul eléctrico | Tres rascacielos de cristal, el del centro con una pantalla con una gráfica que sube |
| `tarjetas/cabeceras/altos-del-mirador.webp` | Dorado | El mirador con barandilla en primer plano, casas elegantes de tejados dorados en la colina y la ciudad abajo |
| `tarjetas/cabeceras/terminal-de-buses.webp` | Ámbar | Andenes cubiertos con dos autobuses genéricos de color ámbar y maletas apiladas |
| `tarjetas/cabeceras/metro-central.webp` | Ámbar | La boca de una estación de metro con un tren que llega al andén elevado |
| `tarjetas/cabeceras/teleferico.webp` | Ámbar | Dos cabinas ámbar colgadas de un cable sobre tejados y colinas |
| `tarjetas/cabeceras/aeropuerto.webp` | Ámbar | Una terminal de cristal con un avión genérico despegando al fondo |
| `tarjetas/cabeceras/compania-de-agua.webp` | Verde dinero | Un depósito de agua redondo con tuberías y una fuente delante |
| `tarjetas/cabeceras/red-de-internet.webp` | Verde dinero | Una torre de antenas con cables y luces de señal, sobre un edificio técnico |

### 8.5 Interfaz · P2

**Iconos** (SVG, ficha 7.13):

| Archivo | Qué dibujar con trazos |
|---|---|
| `interfaz/iconos/moneda.svg` | La moneda del ejemplo de la sección 7.13 |
| `interfaz/iconos/patrimonio.svg` | Un maletín con asa |
| `interfaz/iconos/meta.svg` | La llave de la ciudad, en diagonal, con el paletón de edificios |
| `interfaz/iconos/acciones.svg` | Un certificado enrollado con una gráfica que sube |
| `interfaz/iconos/sube.svg` | Un triángulo con un vértice arriba |
| `interfaz/iconos/baja.svg` | Un triángulo con un vértice abajo |

**Ilustraciones (ficha 7.11):**

| Archivo | Color del medallón | Qué dibujar |
|---|---|---|
| `interfaz/ilustraciones/victoria.webp` | Noche | La llave de la ciudad, grande y en diagonal, entre fuegos artificiales en oro, verde sube y fucsia, con confeti |
| `interfaz/ilustraciones/bancarrota.webp` | Gris piedra | Una maleta de madera abierta y vacía, con una polilla gris que sale volando |
| `interfaz/ilustraciones/mirando-el-tablero.webp` | Cielo | Unos prismáticos en gris pizarra apuntando a una tablet de marco tinta que muestra la ciudad en miniatura. El celular la enseña mientras el tablero anima |
| `interfaz/ilustraciones/sala-de-espera.webp` | Ámbar | El arco de entrada de la ciudad y, delante, las 10 piezas de las fichas (con su peana) en una fila curva, esperando |

### 8.6 Marca · P3

Ficha técnica 7.12:

| Archivo | Qué dibujar |
|---|---|
| `marca/emblema.webp` | La llave de la ciudad en el círculo noche con el aro de oro |
| `marca/icono-512.png` | La llave de la ciudad sobre noche, dentro del 60 % central |
| `marca/portada.webp` | La ciudad al atardecer desde el mirador. El horizonte, al 58 % del alto. En el plano medio, el perfil con los barrios reconocibles: los rascacielos azul eléctrico, el campanario terracota, el faro, las carpas fucsia y la cúpula violeta. En primer plano, la terraza del mirador (barandilla de madera) en el 25 % de abajo, con las 10 fichas de pie y sin peana: en una fila suave, girados en 3/4 hacia la ciudad (se les ve la cara de perfil), ocupando el 60 % central del ancho y con el 18 % del alto cada uno. El 35 % de arriba es cielo sin elementos, para el título que pone la web |
| `marca/redes.png` | La misma escena en horizontal: la ciudad y las fichas en la mitad derecha, y la mitad izquierda con cielo de atardecer libre para el título |

---

## 9. Lo que dibuja el código con el mismo estilo

Esto no se dibuja como imagen, pero se describe para que todo combine:

- **Tipografías:** «Baloo 2» para los títulos y las cifras grandes, y «Nunito» para el texto. Las dos son libres
  (licencia OFL) y van copiadas en el repositorio.
- **Interfaz:**
  - la misma paleta;
  - el tablero sobre noche y el celular sobre crema;
  - bordes de tinta de 2 px y esquinas redondeadas de 12 px;
  - sombras de 4 px hacia abajo a la derecha, en tinta al 25 %;
  - los botones con un borde inferior más oscuro de 4 px, como el relieve de las insignias activas.
- **El tablero:** la Salida va en la esquina de abajo a la izquierda y las fichas avanzan en el sentido de las agujas
  del reloj.
  - Cada casilla es crema, con una franja del color de su barrio en el borde exterior y su icono.
  - Las calles con dueño muestran la mini pieza del dueño.
- **Los dados:** cubos 3D en blanco cálido con las esquinas muy redondeadas y puntos de tinta, como el dado de la
  sección 6.
- **Las tarjetas:** marco crema con contorno de tinta y esquinas de 12 px. Arriba, la cabecera o la ilustración del
  efecto; debajo, el texto.
- **Botones de habilidad:** la insignia y, encima, el anillo de recarga y el estado desactivado (en gris).

---

## 10. Antes de subir cada imagen

- [ ] Está en la carpeta y con el nombre exactos de la sección 8, en minúsculas, sin tildes ni espacios.
- [ ] Sigue su ficha técnica de la sección 7: lienzo, fondo, posición y tamaño del motivo, ángulo y grosor de línea.
- [ ] Solo usa colores de la sección 3, con la luz arriba a la izquierda y las sombras de borde nítido.
- [ ] Si aparece una ficha, coincide con su hoja de personaje y con su pieza aprobada.
- [ ] Los objetos repetidos coinciden con la sección 6.
- [ ] No tiene texto, letras, números, firmas, logotipos ni marcas de agua, y no recuerda a ningún juego comercial ni
      a otra obra.
- [ ] En la hoja de contactos (`npm run hoja:visuales`) no desentona con sus vecinas.
- [ ] `python tools/optimizar-imagenes.py --aplicar` y `npm run revisar:imagenes` terminan bien.
- [ ] Está anotada en `public/visuales/CREDITOS.md`.
