# Shuffle application specification

## 1. Purpose and scope

Shuffle is a mobile-first bridge dealing aid. It displays one arrow for each of 52 successive cards. Each arrow tells the person dealing which compass position receives the next card.

The application supports:

1. Random practice deals, preserving the current application's behavior.
2. Specific deals drawn from a static deal library bundled with the application.

This document specifies app behavior, persisted state, navigation, presentation, offline behavior, and the JSON data contract consumed by the app. It does **not** specify how source PBN is parsed or how the generated JSON is produced. That build-time program must be specified separately.

The application does not fetch deal data from user-entered URLs and has no external deal upload capability. The deal library is public application data; confidentiality against users inspecting application assets is out of scope.

## 2. Technology and architecture requirements

- Use Vue.js, Pinia, Vite+, and UnoCSS.
- Do not use Vue Router. The application is a true single-page application and remains at the same visible URL. Do not put screen, session, deal, or workflow state in the path, query string, or URL hash.
- Pinia is the source of truth for application navigation and workflow state.
- Persist recoverable application state in browser local storage. Persist only serializable data; do not persist derived arrow arrays because they are regenerated when the arrow screen is shown.
- Keep Workbox offline support. The generated deal library must be available offline along with the application shell.
- State and data formats stored by the app must be versioned and recoverable when invalid or incompatible.

## 3. Terms and directions

- **Set / session:** A static collection of numbered duplicate bridge boards. In the UI, the set is played as a session.
- **Set ID:** Stable slug generated from the set's mandatory Event name in the source of truth. The slug function must be a well-known JavaScript ecosystem implementation, with its package and version pinned so dependency upgrades cannot silently change existing IDs. Duplicate generated set IDs are a build error.
- **Board / deal:** One board in a set. Board numbers are contiguous positive integers starting at 1; a set has at most 64 boards.
- **Deal identity:** `(setId, boardNumber)`. Identical card distributions in different sets are distinct deals and are tracked independently.
- **Touched session:** A session for which at least one board has been marked completed.
- **Active session / board:** The session or board currently selected for work. Selection alone does not mark a session touched or a board completed.
- Directions are clockwise: North, East, South, West. An up arrow means North; right means East; down means South; left means West.

## 4. Application modes and screens

### 4.1 Home

Home is the entry point and offers:

- **Random mode**
- **Play a session**

The app must not expose URL loading or upload controls.

### 4.2 Random mode

- Show exactly 52 arrows: 13 each of up, right, down, and left, in a randomized sequence.
- A tap regenerates the random arrow sequence, preserving current behavior.
- Random mode does not create session, board-completion, or active-deal state. It does not need to be restored after app restart.
- A back action returns to the previous screen, normally Home.

### 4.3 Session selection

- Show the available sessions in lexicographic order by `setId` (the slug). This ordering must be deterministic and must not depend on the user's locale.
- Selecting a session makes it the active session and opens its board selection screen.
- A session becomes touched only when one of its boards is marked completed.
- A session with no completion history is still selectable.

### 4.4 Board selection

- Show all boards in the active session, ordered by numeric `boardNumber`.
- Completed boards are visibly greyed out but remain selectable and replayable.
- The active board is highlighted. Selecting another board replaces the active selection and clears any other board highlight.
- When a new session is selected, board 1 is initially highlighted and scrolled into view.
- When a session is resumed, show board selection. Restore the saved active board if it is still present; otherwise recover to board selection with no active board. If the session itself no longer exists, recover to Home.
- Completing board N returns to this screen and highlights and scrolls board N+1 into view.
- If N is the final board, return to board selection with no active board highlighted. The set has reached its final board; do not wrap to board 1.
- A completed board may be selected and replayed. It remains marked completed (grey) while active. Completing a replay returns to selection and highlights N+1, if present.
- Selecting a different board abandons any prior board workflow. It does not change prior completion state.
- The screen provides an explicit action to return Home. This is distinct from native back navigation.

### 4.5 Cutter screen

- Show the active session name and board number.
- Provide an action for the cutter to reveal a cutting card C. Select C uniformly from the 52 cards on each reveal request, using a simple random draw; cryptographic randomness is not required.
- C may be refreshed if it was shown to the designated dealer. Refreshing C replaces the prior cut target. Any arrows previously generated for the old C must not be reused.
- The cutter performs the physical cut described in section 5.
- After the physical cut, the cutter confirms the cut. This advances to the handoff screen.
- Back returns to the previously visited screen. When entered from board selection, this returns to board selection.

### 4.6 Handoff screen

- Display a brief instruction to hand the phone to the dealer.
- Require acknowledgement by the dealer before showing arrows.
- Acknowledge advances to the arrow screen and generates the arrows from the currently stored C.
- Cancel/back returns to the prior screen in app history. This can reveal information contrary to the table protocol; that is accepted under the non-adversarial user assumption.

### 4.7 Specific-deal arrow screen

- Display only the 52 arrows, in dealing order. Do not display set name, board number, card identities, hands, controls, or explanatory text on this screen.
- Tapping once is a no-op, apart from the first application tap behavior in section 8.
- Double-tapping opens completion confirmation. The arrow page itself does not determine whether all cards have physically been dealt.
- On every entry to this screen, regenerate arrows from the selected board and the C currently stored for this workflow. Do not cache the arrow sequence. If C changes, arrows must reflect the new C.
- Native back returns to the previous screen in app history, normally handoff. Do not shortcut directly to board selection.

### 4.8 Confirmation screens

All confirmation screens must:

- Support native back to the previous screen.
- Offer context-appropriate confirmation and cancellation actions.
- Display a brief hint explaining the action or next workflow step.

Completion confirmation:

- Confirm marks the active `(setId, boardNumber)` completed, marks its session touched, and returns to board selection.
- Cancel returns to the arrow screen without changing completion state.
- Native back returns to arrows without changing completion state.

Cut confirmation:

- Confirm accepts the physical cut and advances to handoff.
- Cancel returns to the cutter screen with the currently selected C visible.
- Native back returns to the previous screen in app history.

The wording may vary by context, but the action semantics must remain explicit.

## 5. Physical deck, cut, and arrow mapping

### 5.1 Required sorted deck

The deck is assumed to be sorted exactly as follows, **bottom to top**:

`♣2, ♣3, …, ♣A, ♦2, …, ♦A, ♥2, …, ♥A, ♠2, …, ♠A`

Thus ♣2 is bottom and ♠A is top. Rank order is 2, 3, …, 10, J, Q, K, A; suit order is clubs, diamonds, hearts, spades.

### 5.2 Cut procedure and offset

Let `D[0..51]` be that canonical order from bottom to top. If C is `D[c]`, then `c` cards are below C. Move those `c` cards to the top, preserving their relative order. C is then the bottom card.

Examples:

- C=♣2: `c=0`, no cards move.
- C=♦2: `c=13`, 13 cards move.
- C=♠A: `c=51`, 51 cards move.

The next card drawn is from the top. At draw position `k` (zero-based from the top), the card is:

`D[((c - 1 - k) mod 52 + 52) mod 52]`

The positive modulo form is intentional for JavaScript implementations where `%` can return a negative result.

### 5.3 Arrow assignment

Each generated board contains one owner code for each canonical card index. The arrow for draw position `k` is the direction that owns the card at the above computed index. Each hand must receive exactly 13 cards, producing exactly 13 arrows of each direction.

The board's duplicate-bridge dealer does not affect the sequence. Dealer and vulnerability metadata are for board labeling and future features only.

## 6. Generated deal-library JSON contract

The build-time PBN parser/generator is specified separately. Its output consumed by this app must conform to the following data model.

### 6.1 Shape

The following JSON Schema defines the structural contract. The app/build validator must additionally enforce constraints noted below that JSON Schema cannot express conveniently, including unique set IDs, contiguous board numbers, and exactly 13 occurrences of each owner code.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:shuffle:deal-library:v1",
  "title": "Shuffle Deal Library",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "sets"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "sets": {
      "type": "array",
      "items": { "$ref": "#/$defs/set" }
    }
  },
  "$defs": {
    "metadata": {
      "type": "object",
      "additionalProperties": true
    },
    "set": {
      "type": "object",
      "additionalProperties": false,
      "required": ["setId", "name", "boards"],
      "properties": {
        "setId": { "type": "string", "minLength": 1 },
        "name": { "type": "string", "minLength": 1 },
        "metadata": { "$ref": "#/$defs/metadata" },
        "boards": {
          "type": "array",
          "minItems": 1,
          "maxItems": 64,
          "items": { "$ref": "#/$defs/board" }
        }
      }
    },
    "board": {
      "type": "object",
      "additionalProperties": false,
      "required": ["boardNumber", "dealer", "vulnerability", "owners"],
      "properties": {
        "boardNumber": { "type": "integer", "minimum": 1, "maximum": 64 },
        "dealer": { "type": "integer", "minimum": 0, "maximum": 3 },
        "vulnerability": { "type": "integer", "minimum": 0, "maximum": 3 },
        "owners": {
          "type": "array",
          "minItems": 52,
          "maxItems": 52,
          "items": { "type": "integer", "minimum": 0, "maximum": 3 }
        },
        "metadata": { "$ref": "#/$defs/metadata" }
      }
    }
  }
}
```

Example board object (the `owners` list has all 52 entries):

```json
{
  "boardNumber": 1,
  "dealer": 0,
  "vulnerability": 0,
  "owners": [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3
  ],
  "metadata": {}
}
```

### 6.2 Fields and constraints

- `schemaVersion`: required positive integer. The example version is `1`.
- `sets`: required array of deal sets.
- `setId`: required unique slug generated from the mandatory source Event name.
- `name`: required human-readable Event name.
- `metadata`: optional JSON object for future set-level metadata. Defaults to `{}` when absent.
- `boards`: required array, ordered by ascending board number.
- `boardNumber`: required integer in `1..64`. Board numbers in each set must be exactly contiguous from 1 through the number of boards in that set.
- `dealer`: required integer direction code: `0=N`, `1=E`, `2=S`, `3=W`.
- `vulnerability`: required integer: `0=None`, `1=NS`, `2=EW`, `3=Both`.
- `owners`: required array of exactly 52 integers. Each value is one of `0=N`, `1=E`, `2=S`, `3=W`; each code occurs exactly 13 times. Index 0 means ♣2, index 51 means ♠A. The entry at each index is the compass hand holding that card.
- `metadata`: optional JSON object for future board-level metadata. Defaults to `{}` when absent.

Dealer and vulnerability use duplicate-bridge board conventions. Dealer repeats N, E, S, W by board number. Vulnerability repeats every 16 boards in this sequence, with index 1 corresponding to board 1:

| Board in cycle | Vulnerability |
| --- | --- |
| 1 | None |
| 2 | NS |
| 3 | EW |
| 4 | Both |
| 5 | NS |
| 6 | EW |
| 7 | Both |
| 8 | None |
| 9 | EW |
| 10 | Both |
| 11 | None |
| 12 | NS |
| 13 | Both |
| 14 | None |
| 15 | NS |
| 16 | EW |

The application may rely on build-time validation for uniqueness and hand-card counts, but it must reject or recover safely from malformed or unsupported JSON at runtime. Set and board identity is `(setId, boardNumber)`; array position and display order are not identity.

### 6.3 Persistence identity behavior

- Completion state is keyed by `setId` and `boardNumber`, not by array index or card content.
- If two sets contain the same card distribution, their completion records remain independent.
- If a set or board disappears from a later build, discard its saved state silently.
- Duplicate set IDs are rejected by the build.
- Source sets and boards are write-once/static in normal operation. Changing an Event name changes the slug and therefore creates a different set identity.

## 7. Persisted app state and recovery

Persist enough state in local storage to restore the user-visible workflow, including:

- State schema version.
- Active session/set ID, if any.
- Active board number, if any.
- Completed board identities and touched sessions.
- Current screen and up to 20 app history entries.
- Current cutter target C and cut-confirmation/handoff state needed to resume accurately.
- Selection and scroll position for session/board lists where practical.

Do not persist random-mode arrows. Do not persist derived specific-deal arrow arrays; regenerate them on arrow-page entry using current C.

History rules:

- Record all app screen transitions in order.
- Keep at most 20 entries. When adding an entry over the limit, drop the oldest entry.
- Native back removes/restores the last app screen entry. When app history is empty, the app state does not move.
- The SPA URL remains unchanged; native browser navigation is only an input to app state.
- If the saved active session is no longer present in the bundled library, discard stale session/workflow state and show Home. If the session exists but a saved board does not, recover to that session's board selection with no invalid board active.
- Invalid or unsupported persisted state must not prevent startup; recover to the nearest valid screen or Home.

Because browser session history is controlled by the browser, a web application cannot guarantee that Back never leaves the page. The implementation must use same-URL History API entries and `popstate` to map Back to app history while entries exist, and should re-arm its same-URL guard as needed. This is best effort at the browser-history boundary; it must not change the visible URL. The app must be tested in supported mobile browsers and installed-PWA mode.

## 8. Mobile presentation and interaction

- Target smartphone/tablet portrait presentation only. The PWA manifest remains portrait and fullscreen.
- Screens are full-screen and non-scrolling except session and board lists.
- Preserve the existing arrow display design intent: all 52 arrows visible at once, maximize arrow size, and use available display space efficiently. The current layout is the visual baseline.
- The specific-deal arrow page contains arrows only.
- Request fullscreen aggressively. If fullscreen requires a user gesture, the first tap anywhere on the app requests fullscreen and that tap event is discarded; it must not also activate a control or regenerate arrows.
- Random-mode taps after that first gesture regenerate arrows.
- Disable text selection and browser zoom to the extent possible in a web application. Platform and accessibility overrides may still permit zoom; this is best effort, not a guarantee.
- Scrolling is allowed only in session and board lists. Selecting/highlighting a board should scroll it into view when the workflow specifies it, including board N+1 after completion.

## 9. Offline and update behavior

- Workbox must precache the application shell and generated deal-library JSON.
- Build order must ensure generated JSON exists before Workbox precache generation.
- A newly detected service-worker/application version may reload the application without asking for user confirmation.
- After reload, restore persisted state if it remains compatible with the new library; otherwise apply the recovery rules in section 7.

## 10. Error and empty-state behavior

- An app build containing invalid generated data must fail before deployment; details belong to the build-time PBN processor specification.
- If the app cannot load or validate its bundled JSON at runtime, show a generic application-data error and recover to Home where possible.
- An empty library should not expose an unusable session-selection flow. Home remains available, including random mode.
- A set with no boards is invalid and must be rejected by the build.

## 11. Explicitly out of scope

- Runtime URL-based PBN loading and external uploads.
- Confidentiality against inspection of bundled application data.
- Tracking scores, results, or player identities. The data model allows future metadata, but this release does not define scorekeeping behavior.
- Cryptographically secure cut-card selection.
- A native application wrapper or guarantees beyond browser capabilities.
