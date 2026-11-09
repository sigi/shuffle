{
  // These orders define the normalized values returned to the generator.
  const directions = "NESW"
  const pbnSuits = "SHDC"
  const canonicalSuits = "CDHS"
  const ranks = "23456789TJQKA"

  // Builds the compact document object consumed by build-deal-library.js.
  function finish(event, firstDeal, remainingDeals) {
    return {
      event,
      deals: [firstDeal, ...remainingDeals]
    }
  }

  // Gives every board and deal pair the same result shape.
  function makeDeal(board, deal) {
    return { board, deal }
  }

  // Converts direction-relative PBN hands into NESW seats and CDHS rank arrays.
  function normalizeHands(direction, hands) {
    const start = directions.indexOf(direction)
    const suppliedHands = hands.filter((hand) => hand !== null).length
    if (suppliedHands < 3) error("Deal must contain at least three hands")

    const normalized = Array.from({ length: 4 }, () => [])
    hands.forEach((hand, handIndex) => {
      if (hand === null) return
      const position = (start + handIndex) % 4
      const holdings = Array.from({ length: 4 }, () => [])
      hand.split(".").forEach((suitRanks, pbnSuitIndex) => {
        const suit = pbnSuits[pbnSuitIndex]
        const canonicalSuitIndex = canonicalSuits.indexOf(suit)
        for (const rank of suitRanks) holdings[canonicalSuitIndex].push(ranks.indexOf(rank))
      })
      normalized[position] = holdings
    })
    return normalized
  }
}

Document
  // Event leads the first section. Later sections are Board/Deal pairs; this output is
  // the parser-to-generator contract.
  = BlankLine* (PrefixIgnoredLine / BlankLine)* event:EventTag IgnoredLine* firstBoard:BoardTag IgnoredLine* firstDeal:DealTag IgnoredLine*
    rest:(BlankLine+ board:BoardTag IgnoredLine* deal:DealTag IgnoredLine* { return makeDeal(board.value, deal.value) })*
    BlankLine* !. {
      return finish(event.value, makeDeal(firstBoard.value, firstDeal.value), rest)
    }

EventTag
  = "[" _ "Event"i _ '"' value:TagString '"' _ "]" LineEnd {
      return { value: value.trim() }
    }

BoardTag
  = "[" _ "Board"i _ '"' value:BoardNumber '"' _ "]" LineEnd {
      return { value }
    }

DealTag
  // Normalize card syntax here; ownersForDeal performs uniqueness and hand-size checks.
  = "[" _ "Deal"i _ '"' direction:Direction ":" _ hands:FourHands '"' _ "]" LineEnd {
      return { value: normalizeHands(direction, hands) }
    }

BoardNumber
  // Reject invalid board numbers before the generator receives them.
  = digits:$([0-9]+) {
      const value = Number(digits)
      if (value < 1 || value > 64) error("Board number must be in the range 1..64")
      return value
    }

Direction
  = [NESWnesw] { return text().toUpperCase() }

FourHands
  = first:Hand _ second:Hand _ third:Hand _ fourth:Hand {
      return [first, second, third, fourth]
    }

Hand
  = "-" { return null }
  / first:SuitRanks "." second:SuitRanks "." third:SuitRanks "." fourth:SuitRanks {
      return [first, second, third, fourth].join(".")
    }

SuitRanks
  = ranks:$([AKQJT98765432akqjt]*) { return ranks.toUpperCase() }

TagString
  = chars:(EscapedCharacter / StringCharacter)* { return chars.join("") }

EscapedCharacter
  = "\\" char:('"' / "\\") { return char }

StringCharacter
  = !('"' / "\r" / "\n") char:. { return char }

PrefixIgnoredLine
  = CommentLine / FreeTextLine

IgnoredLine
  = OtherTag / CommentLine / FreeTextLine

OtherTag
  // Accept unrelated PBN metadata and discard it.
  = "[" _ !( ("Event"i / "Board"i / "Deal"i) ![A-Za-z0-9_] ) [A-Za-z] [A-Za-z0-9_]* _ '"' TagString '"' _ "]" LineEnd {
      return null
    }

CommentLine
  // Comments are ignored and do not delimit sections.
  = ("%" [^\r\n]* / ";" [^\r\n]* / "{" (!"}" .)* "}") LineEnd { return null }

FreeTextLine
  // Ignore ordinary lines, but prevent malformed relevant tags falling through here.
  = !("[" _ ("Event"i / "Board"i / "Deal"i) ![A-Za-z0-9_]) (!LineBreak .)+ LineEnd { return null }

BlankLine
  = HorizontalSpace* LineBreak

LineEnd
  = HorizontalSpace* (LineBreak / !.)

_
  = HorizontalSpace*

HorizontalSpace
  = [ \t\v]

LineBreak
  = "\r\n" / "\n" / "\r"
