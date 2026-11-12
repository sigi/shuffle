import vue from "@vitejs/plugin-vue"
import UnoCSS from "unocss/vite"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig, lazyPlugins } from "vite-plus"
// https://vite.dev/config/
export default defineConfig({
  base: "./",
  test: {
    include: ["scripts/**/*.test.js"],
    environment: "happy-dom",
  },
  fmt: { semi: false },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    vue(),
    UnoCSS({ inspector: false }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{html,js,css,woff,png,svg,json}"],
      },
    }),
  ]),
})
