# shuffle

## Development

This application uses Vue, Pinia, Vite+, UnoCSS, and Workbox.

- `vp dev` starts the development server.
- `vp build` creates the production build and Workbox service worker.
- `vp preview` serves the production build locally.
- Add one PBN file per session to `deal-sets/`. The Vite config validates and merges these into `public/deal-library.json` before serving or building.
- `vp run build:deals` runs only the deal-library generator.

Vite+ manages the project toolchain and package manager. Run `vp install` after changing dependencies.

Display 52 arrows in your browser!

This was made for shuffling Bridge deals, without having to actually shuffle the deck.  Just take any deck and lay the cards according to the arrows.

With some practice you can deal a deck just as fast as mechanically possible, without having to shuffle.

Truly randomizing a deck by shuffling requires 6-7 typical "riffle shuffles", which takes at least half a minute and is quite tiring.  Many people do not do this, and you end up with badly shuffled deals in your tournament.

This little helper avoids that situation.
