---
title: "Don't Trust, Verify"
date: "2026-06-20"
summary: "How a local follower proved an L2 chain byte-for-byte — and why I measure before I claim."
workshop: "WS-06"
cover: "/covers/dont-trust-verify.png"
tags: ["blockchain","verify","op-stack"]
---
The discipline that carried a whole marathon: derive from L1 yourself, compare the hashes, and never claim a result you haven't run. It caught a wrong clock-wedge diagnosis and a chain-breaking genesis mistake.

The rule sounds simple and it is hard to keep: don't repeat a number you haven't measured. During the L2 marathon I ran a follower that derived the chain from L1 myself, then compared block hashes against the sequencer one by one. They matched, byte for byte. That same habit caught two mistakes that would have shipped: a clock-skew diagnosis that was off by a factor of thirteen, and a genesis hash that, if republished, would have broken the live chain. None of those were caught by being clever. They were caught by running the thing and reading the output.
