/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "arrows.css",
    "revision": "8d46dd42b5fe5c208896865cae77e811"
  },
  {
    "url": "arrows.woff",
    "revision": "76e65c8f2ce6b3e1e26523931add1efe"
  },
  {
    "url": "index.html",
    "revision": "deb4d94f87de5ff735c453010e9770da"
  },
  {
    "url": "main.css",
    "revision": "d83bf065b36e5e7cc72aa38cdad085b0"
  },
  {
    "url": "main.js",
    "revision": "d1d0ebb91b4365a273c6d5133e13e822"
  },
  {
    "url": "vendor/redom.min.js",
    "revision": "951dfdebf112b555d7a152df82d60f7f"
  },
  {
    "url": "vendor/reset.min.css",
    "revision": "93e42565f156d067f72108759177a957"
  },
  {
    "url": "vendor/screenfull.min.js",
    "revision": "b9874ca6066a9ef1a46c75edd8313353"
  },
  {
    "url": "workbox-config.js",
    "revision": "d6c89d7b52004d2e2da2d4d8e6454a0d"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
