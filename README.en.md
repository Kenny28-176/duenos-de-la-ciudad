# 🏙️ City Owners (Dueños de la Ciudad)

[![CI](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml)

**A property-trading board game for in-person play.**

- A **laptop or tablet acts as the board**. It displays the city, moves the tokens, rolls the dice and manages the bank.
- **Each player uses their phone as a wallet**. It holds their cash, streets and shares. From there they roll,
  buy, bid, build, mortgage, invest and trade.

> 🚧 **Under construction.** The game engine is working (phase 1), but user screens are not ready yet, so the game
> cannot be played yet. The draft rules are in [`docs/DISENO.md`](docs/DISENO.md) (in Spanish).

> A **free, open-source, non-profit** project under the [MIT](LICENSE) license. Sibling of
> [Villagers vs Wolves](https://github.com/Kenny28-176/aldeanos-vs-lobos). Not affiliated with any commercial game
> publisher and includes no third-party material. See the [legal notice](AVISO_LEGAL.md) (in Spanish).

> 🌐 **Español:** [README.md](README.md).

## The idea in a minute

- **The classic flow:** roll the dice, buy streets, collect rent, complete districts and build houses and towers.
  If nobody buys a street, it is auctioned among all players.
- **The living market:** each district trades on the Stock Exchange.
  - Its share price rises whenever someone buys or builds there.
  - Shareholders collect a dividend every time someone pays rent in that district.
  - This allows you to earn money from another player's district.
- **The tokens:** 10 characters representing economic metaphors (the Rat, the Cup, the Bull, the Bear, the Bubble…).
  Each has one passive and one active ability.
- **The goal:** the first player to reach the net worth goal (cash, streets, buildings and shares) and return to
  Start wins. Games have a predictable conclusion, lasting around 60 to 90 minutes.

## What you will need

| | |
|---|---|
| 🖥️ **A laptop or tablet** | Acts as the board. Landscape orientation works best; a TV also works. |
| 📱 **One phone per player** | 2 to 8 players, on Android or iPhone using any modern browser. |
| 📶 **Internet connection** | On all devices (Wi-Fi or mobile data). |

## Status and roadmap

| Phase | What it brings | Status |
|---|---|---|
| 0. Foundation | Repository, content guidelines, tests and publishing | Done |
| 1. Engine | All rules, bots and a simulator to balance the economy | Done |
| 2. Board | Animated board with a bot demo match | Next |
| 3. Phones | First real game | Pending |
| 4. Management & trading | **v0.1**: building, mortgaging, debt, deals and game saving | Pending |
| 5. Polish | Room settings, stats, English, accessibility, TV mode | Pending |
| 6. Release | **v1.0** | Pending |

Future ideas, such as a cooperative mode against a corporation, are in [`docs/IDEAS.md`](docs/IDEAS.md) (in Spanish).

## Development

Requires [Node.js](https://nodejs.org/) 22 or later. There are no dependencies to install.

```
npm test               # tests
npm run simular        # bot matches to balance the economy
node tools/serve.js    # local server at http://localhost:8080/public/
```

- Project architecture and guidelines: [`CLAUDE.md`](CLAUDE.md) (in Spanish).
- How to contribute: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- How to create the Firebase project connecting the board with phones: [`docs/FIREBASE.md`](docs/FIREBASE.md) (in Spanish).

## License

Code and texts are under the [MIT](LICENSE) license. Details, credits and privacy information are in the
[legal notice](AVISO_LEGAL.md) (in Spanish).
