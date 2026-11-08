{
  function finish(event, firstDeal, remainingDeals) {
    return {
      event,
      deals: [firstDeal, ...remainingDeals]
    }
  }

  function makeDeal(board, deal) {
    return { board, deal }
  }
}

Document
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
  = "[" _ "Deal"i _ '"' direction:Direction ":" _ hands:FourHands '"' _ "]" LineEnd {
      return { value: { direction, hands } }
    }

BoardNumber
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
  = "[" _ !("Event"i / "Board"i / "Deal"i) [A-Za-z] [A-Za-z0-9_]* _ '"' TagString '"' _ "]" LineEnd {
      return null
    }

CommentLine
  = ("%" [^\r\n]* / ";" [^\r\n]* / "{" (!"}" .)* "}") LineEnd { return null }

FreeTextLine
  = !("[" _ ("Event"i / "Board"i / "Deal"i)) (!LineBreak .)+ LineEnd { return null }

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
