# Ideas para después

Son ideas aprobadas para estudiar cuando el juego base esté terminado. **No están en desarrollo.** Cada una tendrá su
issue en GitHub para hablarla con calma.

El motor se prepara desde el principio para que ninguna obligue a rehacerlo:

- el tablero es un grafo de casillas;
- la forma de ganar es intercambiable;
- hay información secreta por jugador;
- los bots juegan como uno más.

## ⭐ Modo cooperativo: «Todos contra la Corporación»

*Guardada a petición del dueño del proyecto: es la primera candidata después de la v1.0.*

**De dónde viene.** Este género nace de *The Landlord's Game*, de Lizzie Magie (1904), que hoy está en dominio público.
Traía dos reglamentos:

- en uno ganaba quien arruinaba a los demás;
- en el otro **ganaban todos** cuando el jugador más pobre duplicaba su dinero inicial.

Este modo recoge esa segunda idea, con mecánicas propias.

**La idea.**

- **El rival:** el tablero controla a **la Corporación**, un rival automático. En cada ronda compra calles libres,
  construye, sube los alquileres de sus calles y compra acciones.
- **Se gana juntos** si, antes de un número de rondas, ocurre una de estas dos cosas:
  - el jugador más pobre duplica su dinero inicial;
  - la Corporación no consigue controlar 3 barrios.
- **Se pierde juntos** si la Corporación completa 3 barrios o si alguien quiebra.
- **Las herramientas** siguen siendo los tratos, las subastas y la Bolsa, pero pensados para cooperar. Por ejemplo:
  - un fondo común;
  - préstamos sin interés entre jugadores;
  - comprar acciones de un barrio para frenar a la Corporación.

**Por qué encaja.**

- Solo es posible con un tablero digital que juega por su cuenta.
- Nadie queda eliminado.
- Funciona bien con familias o en colegios.

**Qué hay que decidir:**

- cómo decide la Corporación y a qué velocidad;
- cuántas rondas hay y cómo se equilibra según el número de jugadores;
- qué herramientas de cooperación hay.

## Otras ideas

- **Ciudad con caminos:** un mapa con cruces en el que eliges ruta. Puede haber varios mapas, o mapas generados al
  azar.
- **Objetivos secretos** (un cruce con *Aldeanos vs Lobos*): cada celular recibe en secreto un objetivo o un rol que da
  puntos o poderes.
- **Absorciones (opa hostil):** comprar a la fuerza la calle de otro jugador pagándole un múltiplo de su valor.
- **Jugar sin internet**, de una de estas dos formas:
  - de navegador a navegador: el tablero hace de servidor de verdad por el wifi;
  - un servidor en la laptop.
- **Vista de maqueta o 3D:** los edificios crecen en relieve sobre la ciudad.
- **Tablero «La Aldea»:** un segundo tablero en el mundo de *Aldeanos vs Lobos*, con mercaderes, gremios y posadas.
- **Editor de tableros:** crear el tablero de tu propia ciudad, de tu colegio o de tu grupo de amigos.
- **Jugar a distancia:** que el celular muestre también un tablero pequeño.
- **Dinero oculto:** que cada uno vea solo su propio dinero.
- **Modo «¡Págame!»:** si el dueño no reclama el alquiler desde su celular antes de la siguiente tirada, lo pierde.
