// Verifies arrows by simulating the physical cut and comparing each dealt card to owners.
import { describe, expect, it } from "vite-plus/test"
import { createDealArrows } from "../src/lib/deal-arrows.js"
import { referenceOwners } from "./fixtures/reference-data.js"

const ranks = "23456789TJQKA"
const suits = "CDHS"
const arrowsByOwner = ["up", "right", "down", "left"]
const deckBottomToTop = [...ranks].flatMap((rank) => [...suits].map((suit) => `${rank}${suit}`))

// Independently simulates the physical cut and derives expected directions from owners.
function expectedFromDeal(cuttingCard) {
  const cutIndex = deckBottomToTop.indexOf(cuttingCard)
  const cutDeck = [
    ...deckBottomToTop.slice(cutIndex),
    ...deckBottomToTop.slice(0, cutIndex),
  ]
  const dealtTopToBottom = cutDeck.reverse()

  return dealtTopToBottom.map((card) => {
    const rankIndex = ranks.indexOf(card[0])
    const suitIndex = suits.indexOf(card[1])
    const suitMajorOwnersIndex = suitIndex * 13 + rankIndex
    return arrowsByOwner[Number(referenceOwners[suitMajorOwnersIndex])]
  })
}

describe("specific-deal arrow generation", () => {
  it.each([
    ["no-op cut from the bottom card", "2C", 0],
    ["half cut from the middle card", "8H", 26],
    ["full cut from the top card", "AS", 51],
  ])("matches the owners truth after a %s", (_label, cuttingCard, cardsBelowCutCard) => {
    expect(deckBottomToTop.indexOf(cuttingCard)).toBe(cardsBelowCutCard)

    const expected = expectedFromDeal(cuttingCard)
    const actual = createDealArrows(referenceOwners, cuttingCard)

    expect(actual).toHaveLength(52)
    expect(actual).toEqual(expected)
    for (const arrow of arrowsByOwner) {
      expect(actual.filter((value) => value === arrow)).toHaveLength(13)
    }
  })
})
