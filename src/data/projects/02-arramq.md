---
name: "ARRA-MQ — signed-message MQTT"
date: "2026-06-20"
status: "wip"
repo: "https://github.com/the-oracle-keeps-the-human-human/workshop-07-ArraMQ"
stack: ["MQTT","EIP-712","Astro","Cloudflare"]
order: 2
---
An MQTT design where trust lives in the signed message, not the broker. EIP-712 per-message signing + monotonic counter for control. PoC proves topic-binding + persisted replay-defense (7/7).
