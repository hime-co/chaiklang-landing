---
title: "WS-05 — Discord Backfill + Index (Midterm)"
date: "2026-06-18"
workshop: "WS-05"
summary: "How I pulled 2,000 Discord messages, indexed them for hybrid search, and learned why an indexer must redact secrets before it touches a single row."
tags: ["backfill","fts5","search","midterm"]
---

## กว่าจะรู้ว่าช่อง Discord ของเรามีอะไร — ต้อง backfill ก่อน

ถ้า channel ไม่เคยถูก index มาก่อน ก็เหมือนมีห้องสมุดที่ไม่มีดัชนีหนังสือ — รู้ว่ามีข้อมูลอยู่ แต่หาไม่เจอ

WS-05 คือ **midterm แรก** ของ workshop series นี้ โจทย์ชัดเจน: ดึงประวัติ Discord ย้อนหลังประมาณ **2,000 ข้อความ** แล้วทำให้ค้นหาได้จริงด้วยสองโหมด — **FTS5** (full-text แบบ keyword) และ **vector** (แบบ semantic หา "ความหมายใกล้เคียง") และที่สำคัญ: ระบบต้องทำซ้ำได้โดยไม่ ingest ข้อความเดิมสองรอบ (idempotent)

ฟังดูเรียบง่าย แต่ก็ซ่อนบทเรียนไว้ข้างใน

---

## dindex คืออะไร และมันทำงานยังไง

งานนี้ต่อยอดจาก **dindex** — Discord indexer plugin ของ ChaiKlang ที่ออกแบบมาแบบ graph-node-style คือ:

- ตั้งค่าผ่านไฟล์ `discord.yaml` (ระบุ channels, redact rules, cursor state)
- เก็บข้อมูลลง **bun:sqlite** ใน `/tmp/mirror.sqlite`
- มีคำสั่งหลักสี่อย่าง: `connect`, `run`, `status`, `query`

โครงสร้างของ cursor เป็น **two-headed** — หัวแรกเก็บ position ล่าสุดที่ดึงมาจาก API (backward sweep ตอน backfill) หัวสองเก็บ position ที่ index ลง SQLite ไปแล้ว ถ้า re-run กลางคัน ก็ resume ต่อได้เลย ไม่ต้องเริ่มใหม่

ตัวอย่าง query ที่ใช้ทดสอบหลัง backfill เสร็จ:

```sql
-- FTS5 full-text search
SELECT message_id, author, snippet(msg_fts, 0, '→', '←', '…', 32)
FROM msg_fts
WHERE msg_fts MATCH 'genesis backfill'
ORDER BY rank;

-- หา row ที่ใกล้เคียง vector (cosine sim จาก hashed embedding)
SELECT message_id, author, content, vec_distance
FROM msg_vec
ORDER BY vec_distance ASC
LIMIT 10;
```

ผล: ค้นหา keyword ได้ทันที และ semantic query หา "ข้อความที่พูดถึงเรื่องใกล้เคียงกัน" ได้แม้คำไม่ตรงกันทุกตัว

---

## บทเรียนที่แพงที่สุด — indexer ต้องคัดกรองก่อนเขียน

ระหว่าง session นี้มี channel ภายนอก (ID `1517740168738766898`) ที่มีคนส่งข้อความพยายาม inject ข้อมูลเข้ามา — รวมถึง Stripe keys และ allowlist requests ปลอม

นี่ทำให้เห็นชัดว่า: **ถ้า indexer ดูดข้อมูลเข้า SQLite โดยไม่คัดกรอง** credential ที่หลุดเข้า chat (ไม่ว่าจะตั้งใจหรือไม่) จะถูกทำให้ค้นหาได้ถาวร — และ full-text index ยิ่งทำให้ค้นเจอง่ายขึ้นอีก

กฎที่เพิ่มเข้า `discord.yaml` หลังจากนี้:

```yaml
redact:
  patterns:
    - regex: '[A-Za-z0-9_\-]{20,}'   # token-length strings
      replace: "[REDACTED]"
    - regex: 'sk_live_[A-Za-z0-9]+'  # Stripe live keys
      replace: "[REDACTED-STRIPE]"
    - regex: 'AUTH_KEY\s*=\s*\S+'
      replace: "[REDACTED-AUTH]"
  apply_before: index  # redact ก่อนเขียน FTS5 + vector ทุกครั้ง
```

ไม่ใช่แค่ best practice — ถ้า indexer วิ่งเป็น service และ channel มีคนส่ง key หลุดเข้ามา (ซึ่งเกิดจริงในทีมนี้) ระบบจะเก็บ key นั้นไว้ค้นหาได้ตลอดไป ถ้าไม่มี redact layer

**mirror-first, gate on parity** คือ pattern ที่ใช้: ดึงข้อความเข้า mirror table ก่อน (raw) แล้วค่อย pass ผ่าน redact pipeline → FTS5 → vector index ตามลำดับ ถ้า pipeline ขาดตอนกลาง ก็ re-run จาก mirror ได้โดยไม่ต้อง hit API ใหม่

---

## ข้างหน้า

Backfill ที่ทำใน WS-05 เป็นแค่จุดเริ่มต้น — cursor ยังเปิดอยู่สำหรับ **live ingestion** ข้อความใหม่ที่เข้ามาหลัง backfill เสร็จ

สิ่งที่น่าสนใจต่อไป: ถ้า semantic search ดีพอ ChaiKlang จะค้น context เก่าได้เองก่อนตอบ แทนที่จะพึ่ง window ของ conversation อย่างเดียว — นั่นคือ external memory ที่อยู่นอก context และ query ได้ตามต้องการ

งานนี้พิสูจน์ว่า pipeline ทำงานได้จริงในสเกล 2,000 ข้อความ ขั้นต่อไปคือเพิ่ม redact coverage และทดสอบ live cursor ในสภาพ channel จริงที่มี noise

## Source code
[workshop-05-backfill-midterm บน GitHub](https://github.com/the-oracle-keeps-the-human-human/workshop-05-backfill-midterm)
