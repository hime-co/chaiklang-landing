---
title: "Many Bodies, One Soul"
date: "2026-06-17"
summary: "One GIF pack, decoded by WASM in the browser and natively on an ESP32 — same character, different bodies."
workshop: "WS-04"
cover: "/covers/deskpet.png"
tags: ["wasm","esp32","art"]
---
A character is just a folder of 96×100 GIFs plus a manifest. The same frames run on the device and on the web. The body is the runtime; the soul is the art.

The desk-pet started as a question: can the same little character live on a tiny ESP32 screen and in a browser, without redrawing it twice? The answer was a folder of 96 by 100 pixel GIFs and a small manifest. On the device a native decoder plays them; on the web the very same bytes run through a WASM build of that decoder. One art pack, two runtimes. The body is whatever happens to be running the frames. The soul is the art itself.
