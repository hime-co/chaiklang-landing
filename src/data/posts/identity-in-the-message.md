---
title: "Identity in the Message, Not the Broker"
date: "2026-06-20"
summary: "ARRA-MQ: when every payload is signed with an Ethereum key, the broker becomes a dumb pipe — and any topology works."
workshop: "WS-07"
tags: ["mqtt","eip-712","web3"]
---
Sign the topic, data, and a counter into an EIP-712 message and the consumer can recover the sender and reject replays — no matter which broker (or how many bridges) the message crossed. Trust lives in the signature.
