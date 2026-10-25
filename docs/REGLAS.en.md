# How to Play Dueños de la Ciudad

> **Quick Player's Guide.** Everything you need to sit down and master the city in 5 minutes.
> For technical specifications and engine formulas, see [DISENO.md](DISENO.md).
> Versión en español: [REGLAS.md](REGLAS.md).

---

## 1. What is the Game About?

*Dueños de la Ciudad* is a turn-based property trading board game for **2 to 8 players**, designed for in-person gaming sessions with friends:

- **The shared screen (laptop or tablet)** acts as the **board**: it renders the city, animates token movements, displays the Stock Exchange ticker, and broadcasts auctions, trades, and market events.
- **Your smartphone** is your personal **wallet and controller**: roll the dice (with a tap or by shaking your phone), buy properties, manage your portfolio of shares, and propose deals to your rivals.
- **No paper cash, no banker hassle:** the engine handles all financial transactions, rents, taxes, and bookkeeping automatically and transparently.

---

## 2. How to Win

The winner is the first player to:

1. **Reach the Net Worth Goal** (default: **$10,000**).
2. **Return to Start** (either by passing or landing on it).

Your **net worth** represents the sum of all your assets:
$$\text{Net Worth} = \text{Cash on Hand} + \text{Streets and Transports} + \text{Buildings} + \text{Current Value of Share Portfolio}$$
*(Minus any outstanding express loan debts).*

The central board constantly tracks each player's net worth and how close they are to victory. If all your opponents declare bankruptcy before anyone reaches the goal, the last solvent player remaining wins automatically.

---

## 3. Your Turn Step-by-Step

On your turn, your smartphone guides you with intuitive action buttons:

1. **If you are in the Lockup:** before rolling, you must attempt to leave (by paying the $80 bail, playing a Get-Out-of-Lockup pass, or attempting to roll doubles).
2. **Roll the dice:** tap the button or shake your phone. Your token moves around the board. If you pass **Start**, you collect your **$250 salary** and the Stock Market opens for share purchases.
3. **Resolve the cell you landed on:**
   - **Unowned street, transport, or utility:** you may purchase it at the listed bank price. If you decline to buy, it goes to an open **public auction** among all players.
   - **Property owned by another player:** you pay the required rent. In addition, all shareholders of that district receive bank-funded dividends.
   - **Your own property:** nothing happens.
   - **News or Fortune:** draw a card. Its effect is animated on the main board and applied immediately.
   - **Wealth Tax:** pay 5% of your actual net worth to the bank.
   - **Stock Exchange or Brokerage:** the market opens to buy and sell district shares.
   - **Audit!:** financial inspectors catch you off-guard and send you straight to the Lockup without collecting salary.
4. **Manage your real estate empire (at any point during your turn):**
   - Construct houses or towers across your complete, unmortgaged districts.
   - Mortgage properties if you require immediate liquidity.
   - Buy or sell shares in districts.
   - Trigger your token's **active ability** if it is off cooldown.
   - Propose commercial trade deals to opponents.
5. **Did you roll doubles?** If both dice match, roll again! However, rolling **three consecutive doubles** on the same turn is flagged as reckless speculation and sends you immediately to the Lockup.
6. **End your turn:** tap the end turn button on your phone to pass the dice to the next player.

---

## 4. The Big Innovation: The Living Stock Market

Each of the city's 8 districts is publicly traded on the **Stock Exchange**. This is the strategic core of the game:

### District Shares
- Each district has a total issuance of **100 shares**.
- No individual player may hold more than **50 shares** in the same district.
- Shares are bought from the bank in bundles of 5 at the current market quotation.
- Shares can be sold back at any time: the bank repurchases them at **90% of current market price** (the remaining 10% serves as a brokerage commission).

### What Moves District Prices?
- **Prices rise** whenever properties in the district are bought, when houses and towers are erected, or via bullish market news.
- **Prices fall** when streets are mortgaged, when buildings are sold back, or due to market panics.

### Dividends
Whenever a player lands on a street and pays rent:
- The property owner collects the full rental payment.
- **The bank pays dividends:** every shareholder in that district receives **0.4% of the rental amount for every share** they own.
- *(The tenant paying the rent does not receive dividends on their own payment).*

---

## 5. Properties, Houses, and Towers

### The 8 Districts
The city features 22 streets organized across 8 themed districts:

| District | Streets | Accent Color |
|---|---|---|
| **The Workshops** | Iron Street · Forge Alley | Steel gray |
| **The Fairground** | Stall Street · Barter Avenue · Bargain Square | Raspberry |
| **Old Port** | Nets Wharf · Lighthouse Street · Seagull Walk | Turquoise |
| **University Quarter** | Book Street · Knowledge Avenue · Thesis Square | Violet |
| **Old Town** | Belfry Street · Founders Avenue · Clock Square | Terracotta |
| **Riverside Gardens** | Willow Street · Orchid Avenue · Riverside Walk | Sage green |
| **Financial District** | Capital Avenue · Dividend Street · Finance Square | Cobalt blue |
| **Lookout Heights** | Lookout Avenue · Star Street | Old gold |

### Transports and Utilities
- **4 Transports ($220 each):** Bus Terminal, Central Metro, Cable Car, and Airport. Rent scales according to how many stations the owner controls ($30, $60, $120, or $240).
- **2 Utilities ($160 each):** Water Company and Internet Network. Rent equals the dice roll multiplied by 5 (if owning one utility) or by 12 (if owning both).

### Balanced Construction
- To build, you must own **all streets in the district** and none may be mortgaged.
- Building must be **even**: you cannot erect a second house on a street until every street in that district has at least one house.
- Upon reaching 4 houses on every street in the district, you can upgrade to a **Tower** (skyscraper). The 4 houses return to the bank's supply and rent reaches its maximum tier.
- If the bank exhausts its supply of houses or towers, no further construction is permitted until a player sells buildings.

---

## 6. Auctions, Mortgages, and Trades

### Public Auctions
Whenever a player lands on an unowned property and declines to purchase it at bank price, an open auction begins:
- Bidding opens at **$10**, with minimum bid increments of **$10**.
- The main board displays a **10-second countdown** that resets with each new bid.
- All players may participate, including the player who initially declined the purchase.

### Mortgages
If you require immediate capital:
- You may mortgage any street that has no buildings (if houses are present, sell them to the bank first at half cost).
- The bank immediately pays you **50% of the property's purchase price**.
- A mortgaged street collects no rent and reduces its district's valuation on the Stock Exchange.
- To unmortgage, pay the bank the 50% principal plus a **10% interest fee**.

### Player Trades
Negotiate deals with any opponent from your smartphone at any time (except during active auctions):
- Include any combination of **properties, cash, district shares, and Get-Out-of-Lockup passes**.
- Players receiving mortgaged properties must pay a 10% registry fee to the bank upon receipt, and may unmortgage whenever ready.

---

## 7. The Lockup

You are sent to the Lockup by landing on **Audit!**, drawing certain News or Fortune cards, or rolling **three consecutive doubles**.

- Being in the Lockup does not halt your business: **you continue collecting rents and stock dividends**, and you can actively bid in auctions and propose trades.
- To exit the Lockup:
  1. Pay the **$80 bail** before your roll and move freely.
  2. Or play a **Get-Out-of-Lockup pass**.
  3. Or roll for **doubles**. You have up to 3 attempts across turns; on the third failed attempt, you must pay the bail and move forward.

---

## 8. The 10 Tokens and Their Abilities

Each token represents an economic metaphor and possesses one **passive ability** (always active) and one **active ability** (with cooldown turns). The figures in the table are those of a 4-player game: some change slightly with other player counts, so that no token has an advantage.

| Token | Metaphor | Passive | Active (Cooldown) |
|---|---|---|---|
| **🐀 The Rat** | The rat race | **Overtime:** Collects $270 salary on Start (instead of $250). | **Sprint (5):** Adds a 3rd die before rolling. *(Cannot be used in Lockup).* |
| **☕ The Cup** | Interest rates | **Favorable Interest:** On Start, earns 5% on cash on hand (max $150). | **Express Loan (6):** Borrows up to $600; repays amount +10% after 3 turns. |
| **🐂 The Bull** | Bull market | **Bullish:** Multiplies stock dividend earnings by 2.2×. | **Rally (5):** Chosen district's share price surges +30% until next turn. |
| **🐻 The Bear** | Bear market | **Short Position:** Earns $70 from the bank whenever a rival mortgages or sells. | **Hibernate (5):** Before rolling: neither pays nor collects rent until next turn. |
| **🫧 The Bubble** | Housing bubble | **Inflated Value:** Own streets count +80% towards the net worth victory goal. | **Inflate (5):** An owned street triples rent for a turn, followed by a −25% lull. |
| **🐄 The Cash Cow** | Steady cash flow | **Fixed Income:** Collects 0.5% of total property value each turn (max $12). | **Peak Season (6):** All collected rents increase by +15% until next turn. |
| **🐘 The White Elephant** | White elephant megaproject | **Construction Firm:** Builds houses and towers at a 20% discount. | **Endless Roadworks (6):** Shuts down a rival street, preventing rent collection for a round. |
| **🐜 The Ant** | Nibble expenses | **Ant Toll:** Rivals passing owned streets pay $4 (max $7 per round). | **Anthill (5):** Toll jumps to $8 per street with no round cap until next turn. |
| **🦈 The Shark** | Ruthless investor | **Bargain Hunter:** Matches highest auction bids and wins ties. | **Feeding Frenzy (7):** Marks a rival: their next unowned landing must go to auction. |
| **🦢 The Black Swan** | Unforeseen black swan shock | **Antifragile:** Bank penalties cost 1/4; bank rewards pay 2×. | **Unforeseen Event (6):** Forces a rival to skip their next turn *(no repeat target)*. |

---

## 9. Debts and Bankruptcy

If you owe rent, taxes, or card penalties exceeding your cash balance:

- **The game pauses temporarily** while you resolve your debt.
- Your smartphone displays immediate liquid options: sell district shares, sell houses/towers to the bank for half price, or mortgage properties.
- Once sufficient funds are raised, your debt is paid automatically.
- **Bankruptcy:** if all your assets cannot cover the debt:
  - **Owed to another player:** that creditor receives all your remaining cash, properties, and district shares (up to the 50-share cap per district). You are eliminated.
  - **Owed to the bank:** your properties are auctioned individually to remaining players, and shares return to the public float.

---

## 10. Room Options and Custom Rules

When setting up a room on the shared board, the host can customize game parameters:

- **Net worth goal:** $7,000 (short game), $10,000 (the usual one), $14,000 (long game), or no goal (until only one player is left).
- **Quick Game:** each player starts with 2 random unmortgaged streets dealed.
- **Time Limit:** 45, 60, or 90-minute timer; the highest net worth when the buzzer sounds wins.
- **Classic Mode:** disable character abilities, auctions, or the stock market for a purist experience.
- **AI Bots:** fill empty seats with automated bots to enjoy full games of up to 8 participants.
