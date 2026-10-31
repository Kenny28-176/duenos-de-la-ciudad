# 🏙️ City Owners (Dueños de la Ciudad)

[![CI](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml)

**A property-trading board game for in-person play.**

- A **laptop or tablet acts as the board**. It displays the city, moves the tokens, rolls the dice and manages the bank.
- **Each player uses their phone as a wallet**. It holds their cash, streets and shares. From there they roll,
  buy, bid, build, mortgage, invest and trade.

> 🚧 **Under construction.** A test game can already be played at home, with the laptop as the board and the phones on
> the same wifi (see [“Play at home”](#play-at-home-local-mode)). Playing over the internet without installing anything
> is not ready yet. The draft rules are in [`docs/DISENO.md`](docs/DISENO.md) (in Spanish).

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
| 📱 **One phone per player** | 2 to 8 players, on Android (recent Chrome) or iPhone (iOS 15 or later) using any modern browser. |
| 📶 **A wifi network** | For now, all devices on the same wifi. Playing over the internet will come later. |

## Status and roadmap

| Phase | What it brings | Status |
|---|---|---|
| 0. Foundation | Repository, content guidelines, tests and publishing | Done |
| 1. Engine | All rules, bots and a simulator to balance the economy | Done |
| 2. Board | Animated board with a bot demo match | Done (see the [demo](public/tablero.html)) |
| 3. Phones | The network between the board and the phones, and the phone screen | **In progress**: playable on the home wifi; Firebase is still needed to play over the internet |
| 4. Management & trading | **v0.1**: building, mortgaging, debt, deals and game saving | Pending |
| 5. Polish | Room settings, stats, English, accessibility, TV mode | Pending |
| 6. Release | **v1.0** | Pending |

Future ideas, such as a cooperative mode against a corporation, are in [`docs/IDEAS.md`](docs/IDEAS.md) (in Spanish).

## Play at home (local mode)

The laptop acts as the board and as the mailbox, so neither Firebase nor the internet is needed, only a wifi network.
The laptop needs [Node.js](https://nodejs.org/) 22 or later.

1. On the laptop, from the project folder: `node tools/serve.js`. If Windows asks about the firewall, allow access on
   private networks: the phones connect through it.
2. Open `http://localhost:8080/public/tablero.html` on the laptop and press **Play with phones**. The room code and a
   QR code appear.
3. On each phone, connected to the same wifi, scan the QR code (or open the address shown next to the code) and type
   your name.
4. Each player chooses a token. If players are missing, the board adds bots. When everyone is in, **Start the game**.

If someone steps away or their phone drops out, press **BOT** on their card on the board: a bot plays for that person until
you take it off (so the game doesn't stall). A phone that reloads goes back to its place on its own. If the board page is
reloaded or closed by accident, opening it again (in the same browser) shows **Resume the game**: it picks up the same room
and the phones carry on where they were. A saved game is valid for 12 hours.

For the first test with real phones there is a guide with what to check and how to report a problem: [`docs/PRUEBA-EN-CASA.md`](docs/PRUEBA-EN-CASA.md) (in Spanish).

**Your money:** on the phone, tapping your balance shows your latest transactions (where each dollar came from and went to), and a short
notice appears next to the balance every time you collect or pay.

**Length:** when opening the room you can set a game length (45, 60 or 90 minutes). The board shows what is left; when time runs out it
announces the last round and whoever has the highest net worth when it ends wins. When a game is over, **Play again** goes back to the room
with the same players and options: the phones return by themselves, with no need to scan the QR code again.

**Sound:** the board plays sounds (dice, steps, coins, auctions, cards…) as soon as someone taps the screen, because browsers do not
allow sound before that. There are no audio files: the browser synthesises everything. In the panel, **Sound** turns it off and **Voice**
turns on a narrator that reads out what happens (off by default, and only shown if the device has voices). Each phone chimes, and
vibrates if it can, when it is that player's turn; turn it off in the **Table** tab. `public/sonidos.html` plays every sound one by one.

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
