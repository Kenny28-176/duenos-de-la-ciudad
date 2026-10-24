# Crear el proyecto de Firebase

> **Para el dueño del proyecto** (o para quien monte su propia copia del juego). Hay que hacerlo antes de la fase 3,
> cuando los celulares empiecen a conectarse con el tablero. Son unos 15 minutos y no hace falta saber programar.

**Por qué hace falta.** El tablero (la laptop o tablet) y los celulares se hablan a través de una pequeña base de
datos en internet: Firebase Realtime Database, de Google.

- El tablero escribe lo que pasa en la partida.
- Cada celular manda sus jugadas.
- Los jugadores no configuran nada: esto se hace una sola vez.

| | |
|---|---|
| **Lo que cuesta** | Nada. Se usa el plan gratuito, «Spark», que no pide tarjeta. Si algún día se agotara la cuota, el servicio se pausa hasta el mes siguiente, pero nunca cobra. |
| **Lo que necesitas** | Una cuenta de Google. Conviene que tenga activada la verificación en dos pasos, porque esa cuenta será la dueña del proyecto. |
| **Ojo** | Es un proyecto nuevo, distinto del de *Aldeanos vs Lobos*: no reutilices aquel. |

> Las pantallas de Firebase cambian de vez en cuando. Si algo no coincide con lo que ves, haz una captura y pregunta
> antes de seguir.

## Paso 1 · Crea el proyecto

1. Entra en la [consola de Firebase](https://console.firebase.google.com) con tu cuenta de Google.
2. Pulsa **Crear un proyecto** (puede llamarse **Agregar proyecto**).
3. **Nombre del proyecto:** `Dueños de la Ciudad`.
4. **Identificador del proyecto.** Debajo del nombre aparece el que propone Firebase. Pulsa el lápiz y escribe
   `duenos-de-la-ciudad`.
   - Forma parte de la dirección de la base de datos y **no se puede cambiar después**.
   - Si te dice que ya existe, acepta el que te proponga (por ejemplo, `duenos-de-la-ciudad-1a2b3`) y apúntalo.
5. Acepta las condiciones y pulsa **Continuar**.
6. Si te pregunta por la **asistencia con IA** (Gemini en Firebase), desactívala: el juego no la usa.
7. **Google Analytics:** desactívalo. El juego no lo necesita, y así no se recoge ningún dato de los jugadores.
8. Pulsa **Crear proyecto**, espera a que termine y pulsa **Continuar**.

## Paso 2 · Crea la base de datos

1. En el menú de la izquierda, abre **Compilación** (o **Build**) y elige **Realtime Database**.
   - No elijas **Firestore**: es otra base de datos distinta.
2. Pulsa **Crear base de datos**.
3. **Ubicación:** elige **Estados Unidos (us-central1)**, la más cercana a América. Tampoco se puede cambiar después.
4. **Reglas de seguridad:** elige **Empezar en modo bloqueado**.
   - Así nadie puede leer ni escribir nada hasta que se publiquen las reglas del juego, en la fase 3.
   - **No elijas el modo de prueba:** deja la base de datos abierta a cualquiera durante 30 días.
5. Pulsa **Habilitar**. Arriba verás la dirección de la base de datos, algo como
   `https://duenos-de-la-ciudad-default-rtdb.firebaseio.com`. Cópiala.

## Paso 3 · Activa el inicio de sesión anónimo

Cada celular recibe una identidad anónima, sin correo ni contraseña. Con ella, las reglas de la base de datos pueden
decir «solo tú puedes mandar tus jugadas», y nadie puede hacerse pasar por otro jugador.

1. En el menú de la izquierda: **Compilación** → **Authentication** → **Comenzar**.
2. En la pestaña **Método de inicio de sesión**, elige **Anónimo**, actívalo y pulsa **Guardar**.
3. En la pestaña **Configuración**, abre **Dominios autorizados** y pulsa **Agregar dominio**. Escribe
   `kenny28-176.github.io`, que es donde se publica el juego, y pulsa **Agregar**.

## Paso 4 · Registra la app web

1. Pulsa el engranaje ⚙ junto a **Descripción general del proyecto** y elige **Configuración del proyecto**. Quédate
   en la pestaña **General**.
2. Baja hasta **Tus apps** y pulsa el icono web `</>`.
3. **Sobrenombre de la app:** `Dueños de la Ciudad (web)`.
   - **No** marques **Firebase Hosting**: el juego se publica en GitHub Pages.
4. Pulsa **Registrar app**. Verás un bloque de código que empieza por `const firebaseConfig = {`.
5. Copia ese bloque entero.
   - Comprueba que incluye `databaseURL`. Si no, añádele la dirección que copiaste en el paso 2.
6. Pulsa **Ir a la consola**. Las instrucciones de instalación (con `npm`) no hacen falta: el juego ya trae lo
   necesario.

## Paso 5 · Pasa los datos al proyecto

Pégale estos datos a Claude en el chat (o, si montas tu copia, ponlos en `src/net/`, cuando exista):

1. el bloque `firebaseConfig` del paso 4;
2. el identificador del proyecto, si no quedó como `duenos-de-la-ciudad`;
3. la ubicación de la base de datos, si no es Estados Unidos.

**¿Es seguro compartir ese bloque?** Sí. La `apiKey` de una app web no es un secreto: la ve cualquiera que abra la web
del juego. Lo que protege los datos son las reglas de la base de datos y el inicio de sesión anónimo.

**Lo que nunca debes compartir con nadie**, tampoco con una IA:

- la contraseña de tu cuenta de Google ni los códigos de verificación que te lleguen;
- una **clave privada de cuenta de servicio**, que es un archivo `.json` que se descarga en Configuración del proyecto
  → Cuentas de servicio. No la generes: el juego no la necesita.

## Más adelante (en la fase 3)

Cuando el código de la red esté listo, quedarán dos pasos más. Se explicarán con detalle en su momento:

1. **Publicar las reglas de seguridad.** El proyecto traerá un archivo `database.rules.json`. Se copia en
   **Realtime Database → Reglas** y se pulsa **Publicar**.
2. **Restringir la clave de API** (unos 3 minutos). Así nadie puede usar la clave desde otras webs.
   - Se hace en [Google Cloud](https://console.cloud.google.com/apis/credentials), en la clave «Browser key (auto
     created by Firebase)».
   - En **Restricciones de aplicaciones → Sitios web** se añaden `https://kenny28-176.github.io/*` y
     `http://localhost:8080/*`.
   - En **Restricciones de API** se dejan solo las que usa el juego (la lista exacta llegará con la fase 3).

   Conviene hacerlo **después** de la primera prueba: si una restricción está mal, el juego no conecta y cuesta saber
   por qué.

## La cuota gratuita

El plan Spark da para mucho más de lo que usa un grupo de amigos:

| Qué | Límite gratuito | Qué significa en el juego |
|---|---|---|
| Conexiones a la vez | 100 | Cada dispositivo cuenta una: el tablero y hasta 8 celulares. Caben unas 11 partidas a la vez. |
| Datos guardados | 1 GB | Una partida ocupa muy poco y se borra al terminar. |
| Descargas al mes | 10 GB | Una partida gasta unos pocos MB, porque solo se envía lo que cambia. |

- **Para ver el consumo:** **Realtime Database** → pestaña **Uso**.
- **Si Firebase te ofrece pasar al plan Blaze (de pago), di que no.** Con Blaze hay que dar una tarjeta y podría
  haber cobros.

## Si algo sale mal

| Qué pasa | Qué hacer |
|---|---|
| El identificador `duenos-de-la-ciudad` ya existe | Acepta el que propone Firebase y apúntalo para el paso 5. |
| No encuentras **Realtime Database** | Está en **Compilación** (o **Build**), en el menú de la izquierda. Si no aparece, busca en **Todos los productos**. |
| Elegiste el modo de prueba sin querer | En **Realtime Database → Reglas**, borra todo, pega `{ "rules": { ".read": false, ".write": false } }` y pulsa **Publicar**. |
| El bloque no tiene `databaseURL` | Cópiala de la parte de arriba de **Realtime Database → Datos**. |
| Te pide una tarjeta | Para: estás pasando al plan de pago. Vuelve atrás; el plan Spark no la necesita. |
