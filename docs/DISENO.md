# Diseño de Dueños de la Ciudad

> **Borrador para aprobar** (23 de octubre de 2026). Describe las reglas tal como las implementará el motor.
>
> - Las cifras son provisionales: las ajustará el simulador de la fase 1.
> - La última sección, [Preguntas abiertas](#11-preguntas-abiertas), necesita una decisión antes de programar.

## 1. La idea

| | |
|---|---|
| Género | Compraventa de propiedades por turnos, con dados |
| Jugadores | De 2 a 8, más bots opcionales |
| Público | Amigos adultos, en persona |
| Duración | De 60 a 90 minutos en la partida normal |
| Cómo se gana | Llegando el primero a la **meta de patrimonio** y volviendo a la **Salida** |

Lo clásico del género: dados, comprar calles, cobrar alquiler, completar barrios, construir, hipotecar, subastar,
negociar, el calabozo y la bancarrota.

Lo propio de este juego:

- **El mercado vivo.** Cada barrio cotiza en la Bolsa.
  - El precio de sus acciones sube cuando se compran calles o se construye en él.
  - Baja cuando se hipotecan calles o se venden edificios.
  - Quien tiene acciones cobra dividendos cada vez que alguien paga alquiler en ese barrio.
- **La meta de patrimonio.** La partida tiene un final previsible, y nadie se pasa horas eliminado esperando.

### De la caja a la pantalla

| En un juego de mesa de este tipo | En Dueños de la Ciudad |
|---|---|
| Tablero de cartón | La laptop o tablet: la ciudad dibujada y animada |
| Dados | Dados 3D en el tablero. Se tiran desde el celular (botón o agitándolo) |
| Billetes | No hay. El banco del tablero lleva todo el dinero y cada celular muestra el tuyo |
| Títulos de propiedad | Tarjetas en el celular, con la tabla de alquileres de cada calle |
| Mazos de cartas | Los mazos **Noticias** y **Fortuna**: la carta robada se muestra en el tablero |
| Fichas | 10 fichas propias, cada una con dos habilidades (ver [Las fichas](#las-fichas)) |
| Casas y hoteles | **Casas** y **torres** que aparecen sobre las calles |
| Bolsa | Nueva: la pizarra de la Bolsa en el tablero, y tus acciones en el celular |

## 2. La ciudad

### Barrios y calles

Hay 8 barrios con 22 calles. Cada barrio tiene su color y su **icono**, para que se distinga también sin ver los
colores. Van del más barato, cerca de la Salida, al más caro, al final del recorrido.

| # | Barrio | Icono | Color | Calles |
|---|---|---|---|---|
| 1 | Los Talleres | 🔧 | gris acero | Calle del Hierro · Pasaje de la Fragua |
| 2 | La Feria | 🎪 | frambuesa | Calle de los Puestos · Avenida del Trueque · Plaza del Regateo |
| 3 | Puerto Viejo | ⚓ | turquesa | Muelle de las Redes · Calle del Faro · Paseo de las Gaviotas |
| 4 | Barrio Universitario | 🎓 | violeta | Calle de los Libros · Avenida del Saber · Plaza de la Tesis |
| 5 | Centro Histórico | 🔔 | terracota | Calle del Campanario · Avenida de los Fundadores · Plaza del Reloj |
| 6 | Jardines del Río | 🌳 | verde salvia | Calle de los Sauces · Avenida de las Orquídeas · Paseo del Río |
| 7 | Distrito Financiero | 📈 | azul cobalto | Avenida del Capital · Calle del Dividendo · Plaza de las Finanzas |
| 8 | Altos del Mirador | ⭐ | oro viejo | Avenida del Mirador · Calle de las Estrellas |

### Otras casillas

- **4 transportes:** Terminal de Buses, Metro Central, Teleférico y Aeropuerto. El alquiler depende de cuántos tenga
  el mismo dueño.
- **2 servicios:** Compañía de Agua y Red de Internet. El alquiler depende de la tirada de dados.
- **6 casillas de cartas:** 3 de **Noticias** (lo que pasa en la ciudad y en el mercado) y 3 de **Fortuna** (lo que te
  pasa a ti).
- **1 impuesto:** el Impuesto al Patrimonio.
- **1 Agencia de Bolsa:** para comprar y vender acciones.
- **4 esquinas propias:**

| Esquina | Qué pasa |
|---|---|
| **Salida (Día de pago)** | Al pasar o caer, cobras el sueldo y puedes comprar acciones. |
| **Calabozo** | Si solo pasas, no ocurre nada. Si te envían, quedas retenido. |
| **Bolsa de Valores** | Al caer, puedes comprar y vender acciones. |
| **¡Auditoría!** | Te revisan las cuentas y vas directo al Calabozo, sin cobrar el sueldo. |

### El recorrido (borrador)

Son 40 casillas en una vuelta. El simulador medirá cuánto se pisa cada una, y se moverán si hace falta. Para el motor,
el tablero es un grafo de casillas, así que en el futuro podrá tener cruces (ver [IDEAS.md](IDEAS.md)).

**Orientación en pantalla:** la Salida está en la esquina de abajo a la izquierda y las fichas avanzan en el sentido de
las agujas del reloj:

- suben por el lado izquierdo (lado 1);
- cruzan por arriba (lado 2);
- bajan por la derecha (lado 3);
- vuelven por abajo (lado 4).

La ilustración del centro del tablero sigue el mismo orden (ver [VISUALES.md](VISUALES.md)).

| Lado | Casillas |
|---|---|
| 1 (0–9) | 0 Salida · 1 Calle del Hierro · 2 Noticias · 3 Pasaje de la Fragua · 4 Calle de los Puestos · 5 Terminal de Buses · 6 Avenida del Trueque · 7 Fortuna · 8 Plaza del Regateo · 9 Impuesto al Patrimonio |
| 2 (10–19) | 10 Calabozo · 11 Muelle de las Redes · 12 Calle del Faro · 13 Compañía de Agua · 14 Paseo de las Gaviotas · 15 Metro Central · 16 Calle de los Libros · 17 Noticias · 18 Avenida del Saber · 19 Plaza de la Tesis |
| 3 (20–29) | 20 Bolsa de Valores · 21 Calle del Campanario · 22 Fortuna · 23 Avenida de los Fundadores · 24 Plaza del Reloj · 25 Teleférico · 26 Calle de los Sauces · 27 Red de Internet · 28 Avenida de las Orquídeas · 29 Paseo del Río |
| 4 (30–39) | 30 ¡Auditoría! · 31 Avenida del Capital · 32 Calle del Dividendo · 33 Noticias · 34 Plaza de las Finanzas · 35 Aeropuerto · 36 Fortuna · 37 Avenida del Mirador · 38 Agencia de Bolsa · 39 Calle de las Estrellas |

### Las fichas

Son 10 fichas, y cada una es una metáfora de la economía:

| Ficha | Por qué |
|---|---|
| 🐀 La Rata | La «carrera de la rata»: trabajar sin parar solo para pagar las cuentas |
| ☕ La Taza | La «tasa» de interés (y el café de las reuniones de negocios) |
| 🐂 El Toro | El mercado alcista: los precios suben |
| 🐻 El Oso | El mercado bajista: los precios bajan |
| 🫧 La Burbuja | La burbuja inmobiliaria: todo sube… hasta que explota |
| 🐄 La Vaca Lechera | El negocio que da dinero todos los meses |
| 🐘 El Elefante Blanco | La obra carísima que no sirve para nada |
| 🐜 La Hormiga | El gasto hormiga: lo poco que, sumado, es mucho |
| 🦈 El Tiburón | El inversor sin piedad |
| 🦢 El Cisne Negro | El imprevisto que nadie vio venir |

Cada jugador elige su ficha en la sala, sin repetir, viendo sus habilidades. Los colores y los dibujos de cada ficha
están en [VISUALES.md](VISUALES.md).

### Las habilidades de las fichas

Cada ficha tiene una habilidad **pasiva**, que funciona siempre, y una **activa**, que el jugador usa cuando quiere.
Después de usar la activa hay que esperar su **enfriamiento**: un número de turnos propios. Cada habilidad hace
referencia a la metáfora de su ficha. Las cifras son provisionales.

| Ficha | Pasiva | Activa (enfriamiento) |
|---|---|---|
| 🐀 La Rata | **Horas extra:** cobra 300 $ de sueldo en la Salida, en vez de 250 $. | **Esprint** (4): antes de tirar, suma un tercer dado a su tirada. Los dobles solo cuentan con los dos dados normales. |
| ☕ La Taza | **Interés a favor:** al pasar por la Salida, el banco le paga el 2 % de su dinero en efectivo (máximo 60 $). | **Préstamo exprés** (6, contado desde que lo devuelve): pide hasta 600 $ al banco, y tres turnos después se le cobran 660 $ solos. Mientras lo debe, la deuda se resta de su patrimonio. |
| 🐂 El Toro | **Optimista:** cobra un 25 % más de dividendos. | **Rally** (5): elige un barrio y sus acciones suben un 20 % hasta su próximo turno. En ese rato cualquiera puede vender caro, él también. |
| 🐻 El Oso | **Apuesta bajista:** cobra 20 $ del banco cada vez que otro jugador hipoteca una calle o vende edificios. | **Hibernar** (6): antes de tirar. Ese turno no paga alquileres, pero sus calles tampoco cobran hasta su próximo turno. |
| 🫧 La Burbuja | **Valor inflado:** sus calles cuentan un 10 % más en su patrimonio. Solo vale para la meta: al vender o hipotecar valen lo normal. | **Inflar** (5): elige una calle suya, que cobra el doble hasta su próximo turno. Luego estalla y durante la ronda siguiente esa calle cobra la mitad. |
| 🐄 La Vaca Lechera | **Renta fija:** al empezar cada turno cobra el 1 % del valor de sus calles y edificios (máximo 30 $). | **Temporada alta** (5): durante una ronda, todos los alquileres que cobra suben un 25 %. |
| 🐘 El Elefante Blanco | **Constructora:** construye casas y torres un 15 % más barato. | **Obras eternas** (6): pone en obras una calle de otro jugador, que no cobra alquiler hasta el final del siguiente turno de su dueño. |
| 🐜 La Hormiga | **Peaje hormiga:** cada vez que otro jugador pasa por una calle suya sin caer en ella, le paga 5 $ (máximo 30 $ por ronda). | **Hormiguero** (4): hasta su próximo turno, el peaje sube a 25 $ por calle, sin máximo. |
| 🦈 El Tiburón | **Cazador de gangas:** gana los empates en las subastas y paga solo el 80 % de lo que pujó. | **Frenesí** (5): marca a un jugador. La próxima vez que ese jugador vaya a comprarle una calle al banco no podrá hacerlo: se subasta entre todos. |
| 🦢 El Cisne Negro | **Antifrágil:** las cartas que le hacen pagar le cuestan la mitad, y las que le hacen cobrar le dan un 50 % más. | **Imprevisto** (7): elige a un jugador, que pierde su próximo turno. No tira, pero sigue cobrando y puede negociar. |

**Reglas para todas:**

- Solo se puede usar **una habilidad activa por turno**. Se usa desde el celular y el tablero la anuncia con animación
  y sonido.
- Las que perjudican a otro jugador (Obras eternas, Frenesí e Imprevisto) **no se pueden usar dos veces seguidas contra
  el mismo jugador**.
- **Todo es público:** el tablero muestra la habilidad de cada ficha y cuántos turnos le faltan para poder usarla de
  nuevo.
- Las habilidades están **activadas por defecto**. La sala puede desactivarlas para jugar con las reglas clásicas.

**Cómo se equilibran:**

- Cada habilidad vale más o menos lo mismo a lo largo de una partida: entre 250 y 400 $, del 3 al 4 % de la meta.
- Las que podrían crecer sin control tienen un máximo, para que no hagan cada vez más rico al que ya va ganando.
- Los ataques tienen los enfriamientos más largos y sirven, sobre todo, para frenar a quien está por llegar a la meta.
- El simulador lo comprueba (ver la sección 10).

### El dinero

Se juega con dinero ficticio, con el símbolo **$**. Todo lo lleva el banco del tablero: no hay billetes.

## 3. La economía (cifras provisionales)

Las cifras salen de fórmulas sencillas, para que el simulador pueda ajustarlas todas a la vez:

| Concepto | Fórmula provisional | Ejemplo |
|---|---|---|
| Dinero inicial | 2.000 $ | |
| Sueldo al pasar por la Salida | 250 $ | |
| Precio de una calle | 60 $ + 9 $ × su número de casilla, redondeado a 10. La última calle de cada barrio cuesta un 10 % más | Calle del Hierro (1): 70 $ · Calle de las Estrellas (39): 450 $ |
| Transportes y servicios | 220 $ cada transporte; 160 $ cada servicio | |
| Alquiler sin construir | 8 % del precio | 70 $ → 6 $ |
| Barrio completo | El alquiler sin construir se dobla | |
| Coste de una casa | 40 % del precio de la calle más cara del barrio, redondeado a 10 | Los Talleres: 40 $ · Altos del Mirador: 180 $ |
| Alquiler con casas | Se multiplica el alquiler sin construir: × 5 con 1 casa, × 14 con 2, × 32 con 3, × 42 con 4 | Calle de las Estrellas: 180 $, 504 $, 1.152 $, 1.512 $ |
| Torre | Cuesta 4 casas más una casa. Alquiler: × 52 | Calle de las Estrellas: 1.872 $ |
| Existencias del banco | 36 casas y 12 torres | |
| Transportes | 30, 60, 120 o 240 $, según el dueño tenga 1, 2, 3 o 4 | |
| Servicios | Dados × 5 si el dueño tiene uno; dados × 12 si tiene los dos | |
| Hipoteca | El banco paga el 50 % del precio. Levantarla cuesta eso más un 10 % | |
| Impuesto al Patrimonio | 5 % de tu patrimonio, redondeado a 10 | |
| Fianza del Calabozo | 80 $ | |
| Venta de edificios al banco | La mitad de lo que costaron | |

### El patrimonio

**Patrimonio = dinero + calles + edificios + acciones**:

- cada calle, transporte o servicio cuenta por su precio (la mitad si está hipotecado);
- cada casa o torre, por lo que costó;
- cada acción, por su precio actual en la Bolsa.

El tablero muestra siempre el patrimonio de cada jugador y lo lejos que está de la meta.

## 4. El mercado vivo

### Las acciones

- **Cuántas hay:** cada barrio emite **100 acciones**. Nadie puede tener más de **50 acciones** de un mismo barrio.
- **Cómo se compran:** al banco, al precio del momento, en paquetes de 5.
- **Cómo se venden:** el banco las recompra al **90 % de su precio**. El 10 % es la comisión.
- **Precio de una acción:** el valor del barrio dividido entre 50, redondeado. Nunca baja de 1 $.
- **Valor del barrio:** se calcula así:
  - se suma el precio de todas sus calles, tengan dueño o no;
  - se suma la mitad de lo que costaron sus edificios (lo que el banco pagaría por ellos);
  - se resta la mitad del precio de las calles hipotecadas;
  - se suman o restan los cambios que hagan las cartas de Noticias.

> Ejemplo: al empezar, Los Talleres vale 70 + 100 = 170 $, así que la acción cuesta 3 $. Con una torre en cada calle
> (400 $ en edificios, que cuentan 200 $), el barrio vale 370 $ y la acción, 7 $.

**Por qué los edificios cuentan solo la mitad.** Así nadie puede ganar dinero sin riesgo con esta jugada: comprar
acciones, construir para que suban, venderlas y luego vender los edificios. El simulador tendrá un bot «aprovechado»
que buscará abusos de este tipo.

### Dónde se compran y se venden

| | Cuándo |
|---|---|
| Comprar | Al pasar o caer en la **Salida**, o al caer en la **Bolsa de Valores** o en la **Agencia de Bolsa**. En cada visita puedes comprar acciones de uno o de varios barrios. |
| Vender | En cualquier momento de tu turno, o para pagar una deuda. |

### Dividendos

- Cada vez que alguien paga alquiler en una calle de un barrio, **el banco** paga un dividendo a cada accionista de
  ese barrio: el **0,4 % del alquiler por cada acción** que tenga, redondeado.
- **Ejemplo:** Ana paga 600 $ en Altos del Mirador y Luis tiene 30 acciones de ese barrio. Luis cobra
  600 × 0,4 % × 30 = 72 $.
- **Si el dueño también tiene acciones,** cobra el alquiler y además su dividendo.
- **Quien paga el alquiler no cobra dividendo** por ese pago, aunque tenga acciones.

### La pizarra de la Bolsa

El tablero muestra siempre el precio de las acciones de los 8 barrios, con flechas ▲▼ cuando cambian. En el celular,
cada jugador ve sus acciones, lo que pagó por ellas y lo que valen ahora.

## 5. Un turno

1. **Si estás en el Calabozo**, intentas salir (ver [El Calabozo](#el-calabozo)).
2. **Tiras los dados**, con el botón o agitando el celular. Tu ficha avanza casilla a casilla en el tablero. Si pasas
   por la Salida, cobras el sueldo y puedes comprar acciones.
3. **Resuelves la casilla** (tabla de abajo).
4. **Gestionas:** construir, vender, hipotecar, vender acciones o negociar.
5. **Si sacaste dobles**, vuelves a tirar. El tercer doble seguido te manda al Calabozo.
6. **Terminas el turno** con el botón.

| Casilla | Qué pasa |
|---|---|
| Calle, transporte o servicio libre | Lo compras al precio marcado, o se **subasta** entre todos (también tú). |
| Calle, transporte o servicio de otro | Pagas el alquiler, salvo que esté hipotecado. Los accionistas del barrio cobran su dividendo. |
| Tuyo | No pasa nada. |
| Noticias o Fortuna | Robas una carta. Se muestra en el tablero y se aplica sola. |
| Impuesto al Patrimonio | Pagas el 5 % de tu patrimonio. |
| Bolsa de Valores o Agencia de Bolsa | Puedes comprar y vender acciones. |
| ¡Auditoría! | Vas al Calabozo sin cobrar el sueldo. |
| Calabozo (de paso) | No pasa nada. |

**Quién puede hacer qué, y cuándo:**

| Acción | Cuándo |
|---|---|
| Construir y levantar hipotecas | Solo en tu turno |
| Vender edificios, hipotecar y vender acciones | En tu turno, o cuando debes dinero |
| Proponer y aceptar tratos | En cualquier momento, salvo durante una subasta o una animación |

## 6. Reglas en detalle

### Subastas

- Empiezan en 10 $, y cada puja sube al menos 10 $.
- El tablero muestra una cuenta atrás de 10 segundos, que vuelve a empezar con cada puja.
- Gana la puja más alta. Si nadie puja, la calle sigue libre.
- Se puja desde el celular (+10, +50, +100 o una cifra). Nadie puede pujar más dinero del que tiene.

### Construir

- Solo con el barrio completo y sin ninguna calle del barrio hipotecada.
- **De forma pareja:** nadie pone la 2.ª casa en una calle hasta que todas las del barrio tengan una, y así con las
  siguientes.
- **La torre:** se pone cuando todas las calles del barrio tienen 4 casas. Las 4 casas vuelven al banco.
- **Si se acaban las existencias,** hay que esperar a que alguien venda. Si quedan pocas y las quieren varios, se
  subastan.
- **Vender edificios:** el banco paga la mitad de su coste. Se venden también de forma pareja.

### Hipotecas

- Solo se pueden hipotecar calles de un barrio sin edificios. Antes hay que vender los edificios del barrio.
- El banco paga el 50 % del precio.
- Una calle hipotecada no cobra alquiler y baja el valor de su barrio en la Bolsa.
- Levantar la hipoteca cuesta el 50 % del precio más un 10 %.

### El Calabozo

- **Se entra** al caer en ¡Auditoría!, por una carta o al sacar tres dobles seguidos.
- **Se sale** de una de estas formas:
  - pagando la fianza de 80 $ antes de tirar;
  - usando un salvoconducto;
  - sacando dobles: te mueves con esa tirada.
- Hay 3 intentos. Si al tercero no sacas dobles, pagas la fianza y te mueves.
- Desde el Calabozo sigues cobrando alquileres y dividendos, y puedes negociar, pujar y gestionar.

### Tratos

- Son entre dos jugadores, en cualquier momento (salvo durante una subasta o una animación).
- **Qué se puede incluir:**
  - calles, transportes y servicios, siempre que no haya edificios en su barrio;
  - dinero;
  - **acciones**;
  - salvoconductos.
- **Cómo se negocia:** uno propone desde su celular, y la propuesta sale en el tablero para que la vean todos. El otro
  acepta, rechaza o hace una contraoferta.
- **Calles hipotecadas:** quien recibe una paga al banco el 10 % de la hipoteca. Después puede levantarla cuando
  quiera.

### Deudas y bancarrota

- Si debes más dinero del que tienes, el celular te guía para conseguirlo: vender edificios, hipotecar, vender
  acciones o negociar.
- Si aun así no te alcanza, quedas en **bancarrota** y sales de la partida:
  - **si debías a un jugador**, ese jugador recibe tu dinero, tus calles y tus acciones (los edificios se venden antes
    al banco);
  - **si debías al banco**, tus calles se subastan y tus acciones vuelven al banco.

### La meta y el final

- **La meta de patrimonio** es, por defecto, de 10.000 $. Al alcanzarla, el tablero lo anuncia:
  «¡La Rata va camino de ser Dueña de la Ciudad!».
- **Gana quien vuelve a la Salida**, pasando o cayendo, con un patrimonio igual o mayor que la meta. Si al llegar ya no
  la alcanza, sigue jugando.
- **Si todos los demás quiebran,** gana el último que queda.
- **Con límite de tiempo** (opcional), al acabar el tiempo se termina la ronda y gana el mayor patrimonio.

## 7. Las cartas

- Hay 16 cartas de **Noticias**, que le pasan a la ciudad o al mercado, y a veces a todos.
- Hay 16 de **Fortuna**, que le pasan a quien la roba.
- Se barajan al empezar. La carta robada va al fondo del mazo, salvo el salvoconducto, que se guarda hasta usarlo.

Estos son los tipos de efecto. El texto de cada carta se escribirá en la fase 1, con palabras propias:

| Efecto | Ejemplo de Noticias | Ejemplo de Fortuna |
|---|---|---|
| Cobrar o pagar | «Subsidio municipal: todos cobran 50 $» | «Te devuelven un depósito: cobras 120 $» |
| Moverse | «Desvío por obras: retrocede 3 casillas» | «Te llevan en coche: avanza hasta el transporte más cercano» |
| Calabozo | — | «Inspección sorpresa: vas al Calabozo» · «Salvoconducto: sales gratis del Calabozo» |
| Mercado | «Llega una gran empresa a un barrio al azar: su valor sube 200 $» · «Pánico en la Bolsa: todos los barrios pierden un 10 % de su valor» | «Un soplo: compras 5 acciones de un barrio a mitad de precio» |
| Edificios | «Revisión de fachadas: cada dueño paga 20 $ por casa y 80 $ por torre» | — |
| Entre jugadores | — | «Celebras tu cumpleaños: cada jugador te da 20 $» |

## 8. Qué ve cada pantalla

| Pantalla | Qué muestra |
|---|---|
| **Tablero** | La ciudad, las fichas, los dados y la pizarra de la Bolsa. El patrimonio de cada jugador y lo que le falta para la meta. Las habilidades de cada ficha y su enfriamiento. La carta robada, la subasta, los tratos y el registro de lo que ha pasado. |
| **Celular** | Tu dinero y tu patrimonio, y el botón que toca en cada momento. El botón de tu habilidad activa, con los turnos que le faltan. Tus calles (con su tabla de alquileres) y tus acciones. Los tratos, la subasta y tus movimientos. |

**Qué información es pública:** todo, incluido el dinero de cada uno. Solo es privado lo que estás preparando, como un
trato antes de enviarlo.

## 9. Opciones de la sala

| Opción | Por defecto | Alternativas |
|---|---|---|
| Meta de patrimonio | 10.000 $ (normal) | 7.000 $ (corta) · 14.000 $ (larga) · sin meta (hasta la bancarrota) |
| Mercado vivo | Activado | Desactivado (reglas clásicas) |
| Habilidades de las fichas | Activadas | Desactivadas |
| Subastas | Activadas | Desactivadas |
| Partida rápida | No | Cada jugador empieza con 2 calles al azar |
| Límite de tiempo | Sin límite | 45, 60 o 90 minutos |
| Bots | Ninguno | Hasta completar 8 jugadores |
| Voz del narrador | Activada | Desactivada |

## 10. Cómo lo comprobará el simulador

En la fase 1, el simulador jugará miles de partidas con bots y medirá esto:

- **Duración media** según el número de jugadores. Objetivo: de 60 a 90 minutos.
- **Ventaja del primer jugador.** Objetivo: menos de 5 puntos porcentuales.
- **Frecuencia de cada casilla y rentabilidad de cada barrio.** Así se ajustan los precios y se mueven casillas si
  hace falta.
- **Parte del patrimonio que viene del mercado.** Objetivo: importante, pero no decisiva (entre el 20 y el 35 %).
- **Equilibrio de las fichas.** Cada ficha jugará en todas las posiciones. Con 4 jugadores, cada una debería ganar
  alrededor del 25 % de las partidas, 3 puntos arriba o abajo. Si una se pasa, se ajustan sus números, no el resto del
  juego.
- **Abusos.** Un bot «aprovechado» buscará maneras de ganar dinero sin riesgo. Si las encuentra, se cambian las
  reglas.
- **Reglas que se deben cumplir siempre:**
  - todo el dinero queda anotado;
  - nunca hay más edificios que existencias;
  - cada calle tiene un solo dueño;
  - nadie tiene dinero negativo fuera de una deuda.

## 11. Preguntas abiertas

1. **Absorciones (opa hostil):** ¿se puede comprar a la fuerza la calle de otro jugador, pagándole un múltiplo de su
   valor? Propuesta: no en la v0.1. Se probaría después como opción.
2. **Meta por defecto de 10.000 $**, que es 5 veces el dinero inicial: ¿te parece bien para unos 75 minutos? El
   simulador la ajustará.
3. **Bancarrota:** propuesta: quien quiebra queda fuera. La otra opción es que el banco lo rescate una vez.
4. **Gestión fuera de turno:** propuesta: la tabla «Quién puede hacer qué, y cuándo» de la sección 5.
5. **Nombres:** ¿te gustan los barrios, las calles y las fichas? Se pueden cambiar todos.
