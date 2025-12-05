if (!self.define) {
  let e,
    s = {};
  const t = (t, i) => (
    (t = new URL(t + ".js", i).href),
    s[t] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = t), (e.onload = s), document.head.appendChild(e);
        } else (e = t), importScripts(t), s();
      }).then(() => {
        let e = s[t];
        if (!e) throw new Error(`Module ${t} didn’t register its module`);
        return e;
      })
  );
  self.define = (i, a) => {
    const n =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[n]) return;
    let c = {};
    const p = (e) => t(e, n),
      o = { module: { uri: n }, exports: c, require: p };
    s[n] = Promise.all(i.map((e) => o[e] || p(e))).then((e) => (a(...e), c));
  };
}
define(["./workbox-e9849328"], function (e) {
  "use strict";
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "eddea9b965cbb81ac660a6509fa841df",
        },
        {
          url: "/_next/static/chunks/1575-c4a0d6387453dfe1.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/1577-956e9757ace3ccbd.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/1731-a16f70f27070419b.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/1735.a2c22233d32f94bf.js",
          revision: "a2c22233d32f94bf",
        },
        {
          url: "/_next/static/chunks/1798-15c3fa10e0bb5627.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/1805-0562c14a20fdc663.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/1ed183b4-454158954ac96fe6.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/2374-7000fb5898735bf8.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/2763-7b6f5dd879d988b0.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/291-0718e0be63563d6f.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/3008-dcc2e5377a1f4e50.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/4228-45df340dd1f53fe5.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/4371-8f4cb095bf985241.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/5690-1b006af50cadffc9.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/5744-dc1bb1c0d99101cf.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/5858-5dce28936456e93f.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/6410-41134e56fee2d3b0.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/6421-64a499edc41b7b0c.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/6687-7752f6b4f92eaf47.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/6763-be7436e01a1c6010.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/6979-d4d012a89175f1c5.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/7138-c9b1c19a476a631f.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/7230-dc01597775f76861.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/7315-29cd59dac4292bb0.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8049-ca9d07063dc214ab.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8193-fff7e46fe280da0b.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8434-025928ce589ce792.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8626-1f369ca192cf92fc.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8694-de4adf48afe1111c.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8704-298433a5ad5e98d3.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8768-c3f5e24b8e0b7498.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/8791-416b24ac03ec98c4.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/9192-700cd4490778582d.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/9200-84e9c8c3bbe7e8f2.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/9371-a11646ca69d49234.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/9466-54f741eba7f66837.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/9640-d709193948d1ce8a.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/cash-flow/page-27388620d737d1f2.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/dashboard/page-1fb494e2c80ab2f9.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/expenses/add/page-f56237b50ac11c2c.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/expenses/edit/%5Bid%5D/page-ad1891b68e9263ec.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/expenses/page-bd2650735a4a1ae4.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/fixed-estimates/add/page-b4764c161bfb775b.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/fixed-estimates/edit/%5Bid%5D/page-eaf14e98b00935a3.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/fixed-estimates/page-c602be7bec86ef2f.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/income/add/page-eac6bf21dde2615d.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/income/edit/%5Bid%5D/page-8340b69fa692597f.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/income/page-89f73ce34956ce37.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/buy-new/page-a4e052a400263af8.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/currencies/page-3b111799ad86d825.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/debt-instruments/edit/%5Bid%5D/page-fddc8828cd2acea6.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/debt-instruments/page-340004efad437b8e.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/gold/page-1e1139b83606282c.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/real-estate/details/%5Bid%5D/page-6b95e7ba2dea4463.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/real-estate/edit/%5Bid%5D/page-0dae4daf0e01ce08.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/real-estate/page-b1b0d0dc2a983195.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/securities/%5BsecurityId%5D/sell/page-02c0a5e1459fe0c0.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/stocks/edit/%5Bid%5D/page-cb1c4ce0a56e60a4.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/investments/stocks/page-c7f76d581232dcc6.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/layout-986e78a6da4b38eb.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/profile/page-2059c92e91e44fbf.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/securities/%5BsecurityId%5D/page-09ab170d02668ba4.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/securities/page-639ebc695c27ad6d.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/(app)/settings/page-d1447923a5890fbd.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-9788e33c898e93ac.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/api/scrape-exchange-rate/route-dac222ec6a193e8a.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/api/scrape-gold-prices/route-2aea92e306dfdf5a.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/api/scrape-market-data/route-14364f474e48269d.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/api/scan-stock-orchestrator/route-687294e2418f3892.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/api/scan-stock/route-56ca388ae42a849e.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/layout-29bd388c8b4c9113.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/loading-b8931bc017046e28.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/app/page-e107b20f09a55eea.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/be5fd5d0-085ec3aa62cbdf08.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/fc286847-7a4afa002cca5bdb.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/framework-f2abd9fce659bef8.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/main-6d526b5165ef036f.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/main-app-66dd6c06de820da6.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/pages/_app-6941a832e5d592b5.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/pages/_error-71dd17ef3f48f337.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-c217e45e9a8653e5.js",
          revision: "tmpDi-Qm3o2EXOgHbNpKo",
        },
        {
          url: "/_next/static/css/9a7e43342e633c49.css",
          revision: "9a7e43342e633c49",
        },
        {
          url: "/_next/static/css/fdb330e27d941293.css",
          revision: "fdb330e27d941293",
        },
        {
          url: "/_next/static/media/4cf2300e9c8272f7-s.p.woff2",
          revision: "18bae71b1e1b2bb25321090a3b563103",
        },
        {
          url: "/_next/static/media/747892c23ea88013-s.woff2",
          revision: "a0761690ccf4441ace5cec893b82d4ab",
        },
        {
          url: "/_next/static/media/8d697b304b401681-s.woff2",
          revision: "cc728f6c0adb04da0dfcb0fc436a8ae5",
        },
        {
          url: "/_next/static/media/93f479601ee12b01-s.p.woff2",
          revision: "da83d5f06d825c5ae65b7cca706cb312",
        },
        {
          url: "/_next/static/media/9610d9e46709d722-s.woff2",
          revision: "7b7c0ef93df188a852344fc272fc096b",
        },
        {
          url: "/_next/static/media/ba015fad6dcf6784-s.woff2",
          revision: "8ea4f719af3312a055caf09f34c89a77",
        },
        {
          url: "/_next/static/tmpDi-Qm3o2EXOgHbNpKo/_buildManifest.js",
          revision: "ce475dd576181ec3e1f555050c4f328a",
        },
        {
          url: "/_next/static/tmpDi-Qm3o2EXOgHbNpKo/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/default-avatar.png",
          revision: "58a544e487967f4b1e8e514da7a566fe",
        },
        {
          url: "/locales/ar.json",
          revision: "c53ac0eac8feb3ea8b11ea99a8c06c1c",
        },
        {
          url: "/locales/en.json",
          revision: "664347a59076cfeb91c56cd05d25056d",
        },
        { url: "/manifest.json", revision: "58137cdd976ed27ecb3a2f69c8dca1f1" },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: t,
              state: i,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    );
});
