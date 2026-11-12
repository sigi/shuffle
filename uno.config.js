import { defineConfig, presetIcons, presetWind3 } from "unocss"

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({ extraProperties: { display: "inline-block", "vertical-align": "bottom" } }),
  ],
})
