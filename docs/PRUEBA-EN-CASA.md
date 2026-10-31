# Probar el juego en casa, con celulares de verdad

Una guía para la primera partida con amigos. Todo lo que está aquí se ha probado ya con navegadores de prueba; lo que **no** se ha
probado nunca es un celular de verdad (sobre todo un iPhone), así que esta guía sirve para jugar y, de paso, para encontrar lo que
falla. Si algo no va como se cuenta aquí, anótalo (hay un apartado al final para eso).

## Antes de empezar

- **Una laptop** con [Node.js](https://nodejs.org/) 22 o posterior. Es el tablero y también el «buzón» por el que hablan los celulares.
- **De 2 a 8 celulares** (si faltan jugadores, el tablero pone bots), todos **en la misma wifi que la laptop**.
- Una pantalla grande para la laptop, si se puede (con un cable HDMI a la tele, mejor).

## Paso a paso

1. En la laptop, en la carpeta del proyecto: `node tools/serve.js`. Si Windows pregunta por el cortafuegos, **permite el acceso en redes
   privadas**: sin eso, los celulares no pueden entrar.
2. En el navegador de la laptop, abre `http://localhost:8080/public/tablero.html` y pulsa **Jugar con celulares**. Salen un código de
   cuatro letras y un QR.
3. En cada celular, escanea el QR con la cámara (o abre en el navegador la dirección que sale junto al código) y escribe tu nombre.
4. Cada jugador elige su ficha. Si faltan jugadores, **Añadir un bot**. En **Opciones** se elige la meta y el tiempo de la partida
   (para una prueba corta: meta de 7.000 $ y 45 minutos).
5. **Empezar la partida.** Toca una vez la pantalla de la laptop para que pueda sonar (los navegadores no dejan sonar antes).

## Qué conviene probar

Marca cada cosa cuando salga bien. Si algo no sale, mira «Cómo anotar un fallo».

1. **Entrar.** El QR abre la página del celular y deja escribir el nombre. Si no, ¿qué muestra el celular? (un mensaje de sala que no
   existe, una pantalla en blanco, «Conectando…» para siempre…).
2. **Elegir ficha.** Cada celular ve las fichas de los demás ocupadas y la suya marcada.
3. **El turno.** Cuando te toca, el celular **vibra** (en Android) y **suena un aviso**; en un iPhone no vibra, pero debería sonar. Se
   apaga en la pestaña **Mesa**.
4. **Tirar, comprar, subastar, construir.** Los botones del celular hacen lo que dicen y el tablero lo anima. ¿Se ve igual en el
   tablero y en el celular?
5. **Tu dinero.** Al cobrar o pagar sale un aviso breve junto al saldo («−150 $ Alquiler · a Ana»). **Toca el saldo** para ver tus últimos
   movimientos.
6. **La Bolsa y los tratos.** Comprar acciones, proponer un trato a otro celular y aceptarlo o rechazarlo.
7. **El sonido del tablero.** Suenan los dados, los pasos, las monedas… Con el botón **Sonido** se apaga; con **Voz** se enciende un
   narrador que lee lo que pasa (si el equipo tiene voces). En `public/sonidos.html` se oyen todos los sonidos, uno por uno: dime cuáles
   suenan mal.
8. **Una pantalla que se apaga.** Bloquea un celular durante un minuto y desbloquéalo: tiene que volver solo a su sitio, con lo último
   que pasó. (Si no, anota cuánto tardó.)
9. **Un celular que se recarga** (tira de la página hacia abajo, o ciérrala y ábrela otra vez con el mismo enlace): vuelve a su
   jugador, sin pedir el nombre.
10. **Alguien se ausenta.** Pulsa **BOT** en su tarjeta del tablero: un bot juega por esa persona hasta que se lo quites.
11. **Recargar el tablero** a media partida (F5 en la laptop): al volver, sale **Recuperar la partida**; los celulares siguen donde
    estaban.
12. **El tiempo.** Con un límite de tiempo, el tablero enseña «Quedan N min»; al acabarse suena un gong, se juega la última ronda y gana
    quien más patrimonio tenga.
13. **Jugar otra vez.** Al terminar, **Jugar otra vez** devuelve a todos a la sala sin escanear nada.

## Si algo no va

- **El celular no entra:** comprueba que está en **la misma wifi** que la laptop (no en datos móviles). Algunos routers, las redes de
  «invitados» y las wifis de hoteles, oficinas y universidades **impiden que los dispositivos se hablen entre sí**: ahí no funcionará;
  prueba con otra wifi o con el celular de alguien como punto de acceso.
- **El QR lleva a una dirección que no abre:** la laptop puede tener varias redes (cable, wifi, VPN). La sala enseña las otras
  direcciones posibles debajo del código: prueba con la otra.
- **Windows pregunta por el cortafuegos y dijiste que no:** vuelve a abrir `node tools/serve.js` o permite Node.js en
  «Configuración de Windows → Seguridad → Firewall → Permitir una aplicación».
- **El tablero no suena:** toca primero la pantalla de la laptop (los navegadores lo exigen) y mira que el botón **Sonido** esté
  encendido y el volumen de la laptop.

## Cómo anotar un fallo

Para poder arreglarlo, lo más útil es:

1. **Qué celular y qué navegador** (por ejemplo: «iPhone 12, Safari» o «Samsung A14, Chrome»), y con cuántos jugadores.
2. **Qué hacías y qué pasó** (y qué esperabas que pasara).
3. **Una captura de pantalla** del celular **y** del tablero, si se puede.
4. Si el tablero muestra un recuadro rojo con un error, **su texto**.
5. Si es algo que se repite, **cuántas veces de cuántas** ocurre.
