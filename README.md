# Shuffle

Shuffle is a mobile-first bridge dealing aid. It tells the person dealing which compass position receives each card, so a prepared deck can reproduce a specific deal without shuffling. There is also a random mode (shuffle mode).

## Using the app

Use the app in portrait orientation. It requests fullscreen on the first tap; that tap is used only to enter fullscreen.

### Random mode

Choose **Random dealing** on the home screen to display a sequence of 52 arrows: 13 for each compass position. Deal cards face down, following the arrows in order. Tap the arrow display to generate another random sequence. Swipe up to return home.

This mode exists to create random deals without the need for shuffling. Truly randomizing
a deck of cards requires several “riffle shuffles,” which is time consuming. With some practice
one can deal according to the arrow pattern in less time than shuffling alone would
require.

### Play a session

Choose **Play a session**, select a deal set, then select a board. Boards are listed in numerical order. A board can be replayed even after it has been marked complete.

Dealing a board requires two people: a “handler” (card dealer) and an “assistant” (deck cutter).
The assistant cuts the deck at a random position, so that the dealer will not know the order of
the cards (since the deck must be sorted, this obfuscation step is necessary, otherwise it would
be too easy for the dealer to know the position of important cards).

If the person who is dealing is not playing the deal, they can take both roles.

The selected board is dealt in these steps:

1. **Cutting card:** The cutter sees a randomly selected target card. Starting from the bottom of the sorted deck, find that card face up without changing the order. Move every card below the target to the top, keeping those moved cards in order – you have cut the deck below the card shown by the app. The target is now at the bottom of the deck. Tap the displayed card to choose a new target if needed, then tap **Cut performed — hand off**.
2. **Hand-off:** Pass the deck and phone to the handler. Keep the bottom card hidden. The handler acknowledges the hand-off before the app displays the arrows.
3. **Dealing:** Deal face down, one card at a time, following the arrows. An up arrow means North; right means East; down means South; left means West.
4. **Completion:** After all 52 cards are dealt, swipe down on the arrow display and confirm completion. The app returns to board selection. The next board is highlighted when one remains.

### Table protocol

The physical deck must be sorted from bottom to top by rank, then suit: ♣2, ♦2, ♥2, ♠2, then the four threes, continuing through the four aces. The cutter searches the face-up deck from the bottom and preserves card order except for moving the cards below the target to the top.

For the blind hand-off, the cutter must not observe the dealing, and the handler must not see the target card or the cut. The handler deals face down and must not inspect the bottom of the deck. These steps conceal the relationship between the known deck order, the cut, and the displayed hand assignment. The protocol assumes participants follow it and are not seeking unauthorized information.

Use the app’s back button or swipe up to return to the previous screen. Back navigation may reveal information that the table protocol is intended to hide; the protocol assumes the user will not use it to gain an advantage.

### Saved progress

The app stores its state in this browser’s local storage. It remembers the current screen and navigation history, selected session and board, cut target, board-list scroll position, and which boards have been completed. This allows an interrupted session to resume after closing or reloading the app. Completed boards stay marked complete, including when replayed. Progress is local to the browser and device; clearing browser storage removes it. Random arrow sequences are not saved.

The deal library is bundled with the app and is available offline after the app and its data have been cached. The library is application data, not a user-upload feature.

## Development

The project uses Vue, Pinia, Vite+, UnoCSS, and Workbox.

- `vp install` installs project dependencies.
- `vp dev` starts the development server.
- `vp test` runs the unit and page interaction tests.
- `vp run build` builds the app and Workbox service worker. The `build` script first generates the deal library.
- `vp preview` serves the production build locally.
- `vp run build:deals` runs only the deal-library generator.

Add one PBN file per session to `deal-sets/`. Each file’s `Event` tag supplies the set name and slug identity. The build-time generator validates the deals and merges them into `public/deal-library.json`; that file is generated and ignored by Git. Vite+ manages the project toolchain and package manager. Run `vp install` after changing dependencies.
