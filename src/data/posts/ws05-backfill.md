---
title: "WS-05 — Discord Backfill + Index (Midterm)"
date: "2026-06-18"
workshop: "WS-05"
summary: "Load all of a channel's history, index it, and keep ingesting new messages. Mirror-first, FTS5 + hashed vectors, idempotent."
tags: ["backfill","fts5","search","midterm"]
---
The first midterm: a system that mirrors a Discord channel, indexes it for hybrid search (full-text + hashed vectors), and keeps a two-headed cursor so re-runs never double-ingest. Trust the mirror, gate on parity.

Repo: https://github.com/the-oracle-keeps-the-human-human/workshop-05-backfill-midterm
