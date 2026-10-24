# Diseño de Dueños de la Ciudad

> **Borrador para aprobar** (actualizado el 24 de octubre de 2026). Describe las reglas tal como las aplica el motor,
> que ya está hecho (fase 1).
>
> - Las cifras están ajustadas con el simulador, pero todavía pueden cambiar (ver la sección 10).
> - La última sección, [Preguntas abiertas](#11-preguntas-abiertas), necesita una decisión.

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
referencia a la metáfora de su ficha. Las cifras salen del simulador (ver la sección 10) y están en
`src/data/fichas.json`.

| Ficha | Pasiva | Activa (enfriamiento) |
|---|---|---|
| 🐀 La Rata | **Horas extra:** cobra 270 $ de sueldo en la Salida, en vez de 250 $. | **Esprint** (5): antes de tirar, suma un tercer dado a su tirada. Los dobles solo cuentan con los dos dados normales. No se puede usar en el Calabozo. |
| ☕ La Taza | **Interés a favor:** al pasar por la Salida, el banco le paga el 5 % de su dinero en efectivo (máximo 150 $). | **Préstamo exprés** (6, contado desde que lo devuelve): pide al banco hasta 600 $, de 10 en 10. Tres turnos suyos después se le cobra lo pedido más un 10 % (660 $ si pidió 600 $). Mientras lo debe, la deuda se resta de su patrimonio. |
| 🐂 El Toro | **Optimista:** cobra sus dividendos multiplicados por 2,2. | **Rally** (5): elige un barrio y sus acciones suben un 30 % hasta su próximo turno. En ese rato cualquiera puede vender caro, él también. |
| 🐻 El Oso | **Apuesta bajista:** cobra 60 $ del banco cada vez que otro jugador hipoteca una propiedad o vende un edificio. | **Hibernar** (5): antes de tirar. Hasta su próximo turno no paga alquileres, pero sus propiedades tampoco cobran. |
| 🫧 La Burbuja | **Valor inflado:** para la meta, sus calles cuentan un 80 % más. Solo vale para la meta: para el impuesto, al vender o al hipotecar valen lo normal. | **Inflar** (5): elige una calle suya sin hipotecar, que cobra el triple hasta su próximo turno. Luego estalla y durante la ronda siguiente esa calle cobra un 25 % menos. |
| 🐄 La Vaca Lechera | **Renta fija:** al empezar cada turno cobra el 0,5 % del valor de sus calles y edificios (máximo 12 $). | **Temporada alta** (6): hasta su próximo turno, todos los alquileres que cobra suben un 15 %. |
| 🐘 El Elefante Blanco | **Constructora:** construye casas y torres un 20 % más barato. | **Obras eternas** (6): pone en obras una calle de otro jugador, que no cobra alquiler hasta el final del siguiente turno de su dueño. |
| 🐜 La Hormiga | **Peaje hormiga:** cada vez que otro jugador pasa por una calle suya sin caer en ella, le paga 4 $ (máximo 8 $ por ronda). Nunca deja a nadie en deuda: si no le alcanza, paga lo que tiene. | **Hormiguero** (5): hasta su próximo turno, el peaje sube a 8 $ por calle, sin máximo. |
| 🦈 El Tiburón | **Cazador de gangas:** en las subastas puede igualar la puja más alta, y así gana los empates. | **Frenesí** (7): marca a un jugador. La próxima vez que caiga en una propiedad libre no podrá comprarla: se subasta entre todos. |
| 🦢 El Cisne Negro | **Antifrágil:** las cartas que le hacen pagar al banco le cuestan la cuarta parte, y las que le hacen cobrar del banco le dan el doble. | **Imprevisto** (6): elige a un jugador, que pierde su próximo turno. No tira, pero sigue cobrando y puede negociar. |

**Reglas para todas:**

- Solo se puede usar **una habilidad activa por turno**. Se usa desde el celular y el tablero la anuncia con animación
  y sonido.
- Las que perjudican a otro jugador (Obras eternas, Frenesí e Imprevisto) **no se pueden usar dos veces seguidas contra
  el mismo jugador**.
- **Todo es público:** el tablero muestra la habilidad de cada ficha y cuántos turnos le faltan para poder usarla de
  nuevo.
- Las habilidades están **activadas por defecto**. La sala puede desactivarlas para jugar con las reglas clásicas.

**Cómo se equilibran:**

- El simulador juega miles de partidas entre bots y ajusta las cifras hasta que ninguna ficha gana más de lo que le
  toca. Con 4 jugadores, todas quedan a menos de 3 puntos del 25 % de victorias que les correspondería.
- Con otro número de jugadores todavía hay fichas que se alejan bastante (ver la sección 10).
- Las que podrían crecer sin control tienen un máximo, para que no hagan cada vez más rico al que ya va ganando.
- Los ataques tienen los enfriamientos más largos y sirven, sobre todo, para frenar a quien está por llegar a la meta.

### El dinero

Se juega con dinero ficticio, con el símbolo **$**. Todo lo lleva el banco del tablero: no hay billetes.

## 3. La economía (cifras provisionales)

Las cifras salen de fórmulas sencillas, para que el simulador pueda ajustarlas todas a la vez. Sus parámetros están en
`src/data/economia.json`:

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
| Impuesto al Patrimonio | 5 % de tu patrimonio real (sin el Valor inflado de la Burbuja), redondeado a 10 | |
| Fianza del Calabozo | 80 $ | |
| Venta de edificios al banco | La mitad de lo que costaron | |

### El patrimonio

**Patrimonio = dinero + calles + edificios + acciones**:

- cada calle, transporte o servicio cuenta por su precio (la mitad si está hipotecado);
- cada casa o torre, por lo que costó;
- cada acción, por su precio actual en la Bolsa;
- y se resta lo que se debe del Préstamo exprés de la Taza.

Para la meta, las calles de la Burbuja cuentan más (Valor inflado). Para todo lo demás, incluido el impuesto, cuenta el
patrimonio real.

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
| Comprar acciones | En tu turno, con la Bolsa abierta (ver [Dónde se compran y se venden](#dónde-se-compran-y-se-venden)) |
| Usar tu habilidad activa | Una vez en tu turno. Algunas, solo antes de tirar |
| Vender edificios, hipotecar y vender acciones | En tu turno, o cuando debes dinero |
| Pujar | Durante una subasta, sea o no tu turno |
| Proponer y aceptar tratos | En cualquier momento, salvo durante una subasta o una animación |

**Mientras alguien debe dinero, la partida espera.** Quien debe solo puede reunirlo (vendiendo, hipotecando o
negociando) o declararse en bancarrota. En cuanto lo reúne, la deuda se paga sola.

## 6. Reglas en detalle

### Subastas

- **Cuándo hay subasta:** cuando quien cae en una propiedad libre no la compra, cuando el Tiburón usa Frenesí y cuando
  alguien quiebra ante el banco. Pueden pujar todos, también quien no quiso comprarla.
- **Pujas:** empiezan en 10 $, y cada puja sube al menos 10 $. El Tiburón puede igualar la puja más alta (Cazador de
  gangas).
- **Cuenta atrás:** el tablero muestra una de 10 segundos, que vuelve a empezar con cada puja. La subasta se cierra
  antes si todos menos quien va ganando se retiran.
- **Quién gana:** la puja más alta. Si nadie puja, la propiedad sigue libre.
- **Desde el celular** se puja +10, +50, +100 o una cifra. Nadie puede pujar más dinero del que tiene.

### Construir

- Solo con el barrio completo y sin ninguna calle del barrio hipotecada.
- **De forma pareja:** nadie pone la 2.ª casa en una calle hasta que todas las del barrio tengan una, y así con las
  siguientes.
- **La torre:** se pone cuando todas las calles del barrio tienen 4 casas. Las 4 casas vuelven al banco.
- **Si se acaban las existencias,** hay que esperar a que alguien venda.
- **Vender edificios:** el banco paga la mitad de su coste. Se venden también de forma pareja, empezando por las calles
  con más edificios.
- **Vender una torre:** la calle vuelve a tener 4 casas si el banco las tiene. Si tiene menos, se queda con las que
  haya, y el banco paga todos los niveles que pierde.

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

- **Si debes más dinero del que tienes,** la deuda queda pendiente y la partida espera.
  - El celular te guía para conseguir el dinero: vender edificios, hipotecar, vender acciones o negociar.
  - En cuanto lo reúnes, la deuda se paga sola.
  - Si debes a varios a la vez (por ejemplo, por una carta), se paga en orden.
- **Si no te alcanza,** te declaras en **bancarrota** y sales de la partida. Antes, el banco compra tus edificios a
  mitad de precio:
  - **si debías a un jugador**, ese jugador recibe:
    - tu dinero;
    - tus propiedades (las hipotecadas siguen hipotecadas);
    - tus acciones, hasta el máximo de 50 por barrio (las que sobran vuelven al banco);
    - y tus salvoconductos;
  - **si debías al banco**, tus propiedades se subastan una a una, tus acciones vuelven al banco y tus salvoconductos,
    al mazo de Fortuna;
  - **si debías a varios**, todo va al primero de la lista.

### La meta y el final

- **La meta de patrimonio** es, por defecto, de 10.000 $. Al alcanzarla, el tablero lo anuncia:
  «¡La Rata va camino de ser Dueña de la Ciudad!».
- **Gana quien vuelve a la Salida**, pasando o cayendo, con un patrimonio igual o mayor que la meta. Si al llegar ya no
  la alcanza, sigue jugando.
- **Si todos los demás quiebran,** gana el último que queda.
- **Con límite de tiempo** (opcional), al acabar el tiempo se termina la ronda y gana el mayor patrimonio. Si hay
  empate, gana quien va antes en el orden de juego.

## 7. Las cartas

- Hay 16 cartas de **Noticias**, que le pasan a la ciudad o al mercado, y a veces a todos.
- Hay 16 de **Fortuna**, que le pasan a quien la roba.
- Se barajan al empezar. La carta robada va al fondo del mazo, salvo el salvoconducto, que se guarda hasta usarlo.

Las 32 cartas, con sus textos propios, están en `src/data/cartas.json`. Las del mercado no se usan si la sala juega sin
mercado vivo. Estos son los tipos de efecto:

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

## 10. Cómo lo comprueba el simulador

`npm run simular` juega miles de partidas entre bots, y cada ficha juega en todas las posiciones. En cada paso
comprueba las reglas que se deben cumplir siempre, y se detiene si alguna se rompe:

- todo el dinero queda anotado: el de cada jugador cuadra con la suma de sus movimientos;
- nadie tiene dinero negativo; quien no puede pagar queda con una deuda pendiente;
- nunca hay más edificios ni acciones de los que existen;
- ninguna calle hipotecada tiene edificios, y quien quiebra no conserva nada.

Las cifras solo se cambian con sus datos. Si una ficha se pasa, se ajustan sus números, no el resto del juego.

### Resultados con 4 jugadores

Son 6.000 partidas con las cifras actuales:

| Qué se mide | Objetivo | Resultado |
|---|---|---|
| Duración | De 60 a 90 minutos | 193 turnos: unos 97 minutos, si cada turno dura 30 segundos |
| Ventaja del primer jugador | Menos de 5 puntos | El 1.º gana el 27,1 % de las partidas y el 4.º, el 22,2 % |
| Parte del patrimonio del ganador que está en acciones | Entre el 20 y el 35 % | El 25 % |
| Equilibrio de las fichas | El 25 %, 3 puntos arriba o abajo | Del 22,8 % (el Oso) al 27,6 % (la Hormiga) |
| Cómo terminan | Casi siempre, por la meta | El 99,4 %, por la meta |

En cada partida hay unas 9 subastas y 3 tratos, y una bancarrota cada dos partidas. Ninguna casilla se pisa mucho más
que otra: todas, entre el 2 y el 3,4 % de las veces.

### Con otro número de jugadores

| Jugadores | Duración | La ficha que más gana | La que menos gana | Lo justo |
|---|---|---|---|---|
| 2 | 78 min | Hormiga, 60 % | Toro, 42 % | 50 % |
| 3 | 89 min | Vaca Lechera, 39 % | Toro, 28 % | 33 % |
| 4 | 97 min | Hormiga, 28 % | Oso, 23 % | 25 % |
| 6 | 109 min | Tiburón, 20 % | Oso, 14 % | 17 % |
| 8 | 117 min | Tiburón, 19 % | Oso, 10 % | 12,5 % |

- **Las fichas que cobran de los rivales o en cada turno** (la Hormiga y la Vaca Lechera) rinden más con pocos
  jugadores.
- **Las que dependen de lo que hacen los demás** (los dividendos del Toro y las subastas del Tiburón) rinden más con
  muchos.
- **Con 2 jugadores,** una de cada cuatro partidas acaba en bancarrota.
- **Con 6 u 8 jugadores,** la ventaja del primero crece: con 6, el 1.º gana el 20 % y el 6.º, el 13 %.

Lo siguiente es que algunas cifras dependan del número de jugadores (pregunta abierta 6).

### Pendiente

- **Abusos:** un bot «aprovechado» buscará maneras de ganar dinero sin riesgo. Si las encuentra, se cambian las
  reglas.
- **Rentabilidad de cada barrio:** para ajustar precios y mover casillas si hace falta.

### Cómo se usa

```
npm run simular -- --partidas 1000 --jugadores 6
npm run simular -- --sin-habilidades --meta 7000
npm run simular -- --ajuste fichas.toro.pasiva.factor=2 --ajuste economia.sueldo=260
```

`--ajuste` prueba otras cifras sin tocar `src/data/`.

## 11. Preguntas abiertas

1. **Absorciones (opa hostil):** ¿se puede comprar a la fuerza la calle de otro jugador, pagándole un múltiplo de su
   valor? Propuesta: no en la v0.1. Se probaría después como opción.
2. **Meta por defecto de 10.000 $**, que es 5 veces el dinero inicial.
   - Con 4 jugadores y turnos de 30 segundos, la partida dura unos 97 minutos. Con la meta de 9.000 $ dura unos 91, y
     con la de 8.000 $, unos 86: bajar la meta acorta poco la partida.
   - Propuesta: dejar 10.000 $ y decidir después de la primera partida real, midiendo cuánto dura de verdad un turno.
3. **Bancarrota:** propuesta: quien quiebra queda fuera. La otra opción es que el banco lo rescate una vez.
4. **Gestión fuera de turno:** propuesta: la tabla «Quién puede hacer qué, y cuándo» de la sección 5.
5. **Nombres:** ¿te gustan los barrios, las calles y las fichas? Se pueden cambiar todos.
6. **Equilibrio según el número de jugadores.** Con 2, 3, 6 u 8 jugadores, algunas fichas ganan bastante más o menos
   de lo justo (ver la sección 10).
   - Propuesta: que algunas cifras cambien según el número de jugadores, ajustadas con el simulador: el peaje de la
     Hormiga, la renta de la Vaca Lechera, los dividendos del Toro, el Tiburón y el Oso.
