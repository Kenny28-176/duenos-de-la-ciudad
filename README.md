# 🏙️ Dueños de la Ciudad

[![CI](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml)

**Un juego de compraventa de propiedades para jugar en persona.**

- Una **laptop o tablet es el tablero**. Muestra la ciudad, mueve las fichas, tira los dados y hace de banco.
- **Cada jugador usa su celular como cartera**. Ahí tiene su dinero, sus calles y sus acciones. Desde ahí tira,
  compra, puja, construye, hipoteca, invierte y negocia.

> 🚧 **En construcción.** El proyecto está en la fase 0 y todavía no se puede jugar. Las reglas están en borrador en
> [`docs/DISENO.md`](docs/DISENO.md).

> Proyecto **libre, gratuito y sin ánimo de lucro**, bajo licencia [MIT](LICENSE). Es hermano de
> [Aldeanos vs Lobos](https://github.com/Kenny28-176/aldeanos-vs-lobos). No está afiliado a ningún editor de juegos
> ni incluye material de ninguno. Lee el [aviso legal](AVISO_LEGAL.md).

> 🌐 **English:** [README.en.md](README.en.md).

## La idea en un minuto

- **Lo de siempre:** tiras los dados, compras calles, cobras alquiler, completas barrios y construyes casas y torres.
  Si nadie compra una calle, se subasta entre todos.
- **El mercado vivo:** cada barrio cotiza en la Bolsa.
  - El precio de sus acciones sube cuando alguien compra o construye en él.
  - Quien tiene acciones cobra un dividendo cada vez que alguien paga alquiler en ese barrio.
  - Así puedes ganar dinero con el barrio de otro.
- **La meta:** gana quien llega primero a la meta de patrimonio (dinero, calles, edificios y acciones) y vuelve a la
  Salida. Las partidas tienen un final previsible, de unos 60 a 90 minutos.

## Qué vas a necesitar

| | |
|---|---|
| 🖥️ **Una laptop o tablet** | Es el tablero. Mejor en horizontal; también sirve una TV. |
| 📱 **Un celular por jugador** | De 2 a 8 jugadores, con Android o iPhone y cualquier navegador moderno. |
| 📶 **Internet** | En todos los dispositivos (wifi o datos). |

## Estado y hoja de ruta

| Fase | Qué trae | Estado |
|---|---|---|
| 0. Base | Repositorio, normas de contenido, pruebas y publicación | Hecha |
| 1. Motor | Todas las reglas, bots y un simulador para equilibrar la economía | Siguiente |
| 2. Tablero | Tablero animado con una partida de bots | Pendiente |
| 3. Celulares | Primera partida real | Pendiente |
| 4. Gestión y tratos | **v0.1**: construir, hipotecar, deudas, tratos y guardar la partida | Pendiente |
| 5. Pulido | Reglas de la sala, estadísticas, inglés, accesibilidad, modo TV | Pendiente |
| 6. Publicación | **v1.0** | Pendiente |

Las ideas para más adelante, como un modo cooperativo contra una corporación, están en [`docs/IDEAS.md`](docs/IDEAS.md).

## Desarrollo

Hace falta [Node.js](https://nodejs.org/) 22 o posterior. No hay dependencias que instalar.

```
npm test               # pruebas
node tools/serve.js    # servidor local en http://localhost:8080/public/
```

- Cómo está organizado y las normas del proyecto: [`CLAUDE.md`](CLAUDE.md).
- Cómo colaborar: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licencia

El código y los textos están bajo licencia [MIT](LICENSE). Los detalles, los créditos y la privacidad están en el
[aviso legal](AVISO_LEGAL.md).
