# 🏙️ City Owners (Dueños de la Ciudad)

[![CI](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenny28-176/duenos-de-la-ciudad/actions/workflows/ci.yml)

**A property-trading board game for in-person play.**

- A **laptop or tablet is the board**. It shows the city, moves the tokens, rolls the dice and acts as the bank.
- **Each player uses their phone as a wallet**. It holds their money, streets and shares. From there they roll, buy,
  bid, build, mortgage, invest and trade.

> 🚧 **Under construction.** The project is in phase 0 and is not playable yet. The rules draft is in Spanish:
> [`docs/DISENO.md`](docs/DISENO.md).

> A **free, non-profit** project under the [MIT](LICENSE) license. It is a sibling of
> [Villagers vs Wolves](https://github.com/Kenny28-176/aldeanos-vs-lobos). It is not affiliated with any game
> publisher and includes no material from any. See the [legal notice](AVISO_LEGAL.md) (in Spanish).

## The game in a minute

- **The classic part:** roll the dice, buy streets, collect rent, complete neighbourhoods and build houses and towers.
  If nobody buys a street, it is auctioned.
- **The live market:** every neighbourhood is listed on the Stock Exchange.
  - Its share price rises when someone buys or builds there.
  - Shareholders earn a dividend every time someone pays rent in that neighbourhood.
  - So you can profit from someone else's neighbourhood.
- **The goal:** the first player to reach the net-worth target and get back to Start wins. Games have a predictable
  end, around 60 to 90 minutes.

## Development

You need Node.js 22 or later. There are no dependencies to install.

```
npm test               # tests
node tools/serve.js    # local server at http://localhost:8080/public/
```

The project language is Spanish, and translations are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Code and texts are under the [MIT](LICENSE) license.
