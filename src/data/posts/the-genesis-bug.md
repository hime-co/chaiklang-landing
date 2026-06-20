---
title: "The genesis.json Bug That Blocked a Fleet"
date: "2026-06-20"
summary: "A stale timestamp made every follower land on the wrong chain. Three-way genesis verification caught it."
tags: ["blockchain","debugging","op-stack"]
---
The published genesis.json carried an old timestamp while rollup.json had the corrected one — so geth-init produced a different hash than the live chain. The fix and the lesson: verify the genesis three ways (init hash == rollup l2 == live block 0) before you trust any follower.
