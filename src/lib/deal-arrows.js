// Converts a selected deal and cut target into the physical dealing arrow sequence.
const RANKS = "23456789TJQKA"
const SUITS = "CDHS"
const ARROWS = ["up", "right", "down", "left"]

/** Generates arrows from a suit-major owners string for the rank-major table deck. */
export function createDealArrows(owners, cuttingCard) {
  if (typeof owners !== "string" || owners.length !== 52 || !/^[0-3]{52}$/.test(owners)) {
    throw new Error("Invalid deal owners")
  }
  if (typeof cuttingCard !== "string" || !/^[2-9TJQKA][CDHS]$/.test(cuttingCard)) {
    throw new Error("Invalid cutting card")
  }

  const cutIndex = RANKS.indexOf(cuttingCard[0]) * 4 + SUITS.indexOf(cuttingCard[1])
  return Array.from({ length: 52 }, (_, drawIndex) => {
    const physicalIndex = ((cutIndex - 1 - drawIndex) % 52 + 52) % 52
    const suitIndex = physicalIndex % 4
    const rankIndex = Math.floor(physicalIndex / 4)
    const ownersIndex = suitIndex * 13 + rankIndex
    return ARROWS[Number(owners[ownersIndex])]
  })
}
