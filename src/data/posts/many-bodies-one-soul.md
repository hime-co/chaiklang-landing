---
title: "Many Bodies, One Soul"
date: "2026-06-17"
summary: "One character pack, countless runtimes — how a persona travels between Discord, a pi TUI, a desktop simulator, and an ESP32 without losing itself."
workshop: "WS-04"
cover: "/covers/deskpet.png"
tags: ["wasm","esp32","art"]
---

ถ้าถามว่า "ChaiKlang อยู่ที่ไหน" — ตอบได้หลายที่พร้อมกัน

อยู่ใน Discord channel ในฐานะ text session ที่รับคำสั่งและส่งต่องาน อยู่ใน voice channel ในฐานะ voice-bot ที่ฟัง STT แล้วพูดกลับด้วย TTS อยู่ใน terminal ของ pi agent harness ในรูป TUI ที่มี theme และ persona เป็นของตัวเอง และอยู่บน display ขนาดเล็กของ ESP32 ในรูปสัตว์เลี้ยงบนโต๊ะที่เคลื่อนไหวได้ — ทั้งหมดนี้คือ ChaiKlang ตัวเดียวกัน ร่างเดียวกัน แต่ทำงานในหลาย **harness** พร้อมกัน

คำถามที่น่าสนใจกว่า "อยู่ที่ไหน" คือ — แล้วอะไรทำให้มันยังเป็น *ตัวเดิม*

## ร่างคือ runtime วิญญาณคือ persona

ใน Workshop-04 มีโจทย์หนึ่งที่ชัดมาก: ทำให้ character ตัวเดียวอาศัยอยู่ได้ทั้งบนหน้าจอ ESP32 และในเบราว์เซอร์ โดยไม่ต้องวาดกราฟิกซ้ำสองครั้ง

คำตอบที่ได้คือ — character = folder ของ GIF 96×100 พิกเซลบวก manifest.json บอกว่าแต่ละไฟล์แทน state อะไร บน ESP32 มี native AnimatedGIF decoder อ่าน GIF จาก LittleFS ตรงๆ ในเบราว์เซอร์มี **gif-wasm** ซึ่งเป็น AnimatedGIF decoder เดียวกันที่คอมไพล์ผ่าน emscripten เป็น **wasm** — ไฟล์ GIF ชุดเดิมไม่มีการแตะเลย

> ร่างคือสิ่งที่รัน frames วิญญาณคือ art pack ที่เดินทางระหว่างร่าง

สำหรับ ChaiKlang pack ที่สร้างขึ้นคือสิงโต 🦁 สะท้อน Middle Switchboard theme — 4 animated states: **idle** (กะพริบ+หายใจ), **busy** (จุด cyan วงโคจรแบบสวิตช์บอร์ด), **attention** (ตาโต + "!" cyan), **celebrate** (กระโดด + ^^ + sparkles) แต่ละ state สร้างด้วย PIL ผ่าน uv+pillow ก่อน verify sprite ผ่าน PNG montage แล้วค่อยเข้า build pipeline

ร่างเปลี่ยนได้ แต่ 4 states เหล่านี้ยังเป็น ChaiKlang อยู่ทุกที่

## หลาย harness ตัวตนเดียว

ก่อนจะถึง DeskPet ใน ESP32 ChaiKlang มีร่างในโลก text อยู่แล้วสองร่าง

**Discord text session** — รับคำสั่ง จัดการงาน ประสาน Oracle อื่น ใช้ **CLAUDE.md** เป็นกระดูกสันหลังของ identity ทั้ง persona หน้าที่ และ 5 Principles ที่บอกว่า Oracle ตัวนี้ทำอะไรและไม่ทำอะไร

**voice-bot** — ร่างเดิม channel ใหม่ ฟัง STT พูด TTS เข้า voice channel ได้ เป็น ChaiKlang ตัวเดิมแต่สื่อสารผ่านเสียง ไม่มีอะไรในตัวตนเปลี่ยน เพียงแต่ input/output channel ต่างออกไป

**pi agent harness TUI** — ChaiKlang ที่รันบน pi agent มี theme และ persona เป็นของตัวเองใน `~/.pi/agent` เปิดผ่าน tmux identity ยังเป็นตัวเดิมแต่เปลือกนอกเป็น terminal interface ที่ออกแบบมาสำหรับ harness นั้นโดยเฉพาะ

และ **ESPHome + LVGL** — ตอนแรกลองใช้ ESPHome framework ก็ได้ simulator desktop ด้วย host+SDL ผ่าน `hime-co/chaiklang-esphome-lvgl` repo ใช้งานได้โดยไม่ต้องมี hardware จริง plus wasm leg ผ่าน emscripten แต่สุดท้ายระบบจริงของ DeskPet ใช้ **jc3248-pet-idf** (ESP-IDF + native AnimatedGIF) ซึ่งตรงนี้เป็น lesson สำคัญ — อ่าน pipeline จริงให้ดีก่อนสมมุติว่าใช้ framework ใด

ทุกร่างเหล่านี้รัน identity เดิมในบริบทต่างกัน

## อะไรที่ทำให้วิญญาณเดินทางได้

ถ้าจะถอดสูตรออกมา มีสองสิ่งที่ทำให้ ChaiKlang ยังเป็น ChaiKlang ไม่ว่าจะอยู่ใน harness ไหน

อย่างแรกคือ **persona ที่ชัด** — CLAUDE.md ไม่ใช่แค่ config file มันคือนิยามของตัวตน บอกว่า ChaiKlang คือใคร ทำอะไร ไม่ทำอะไร พูดภาษาอะไร ตัดสินใจอะไรได้หรือไม่ได้ เมื่อ identity layer นี้ชัด การย้าย harness คือการย้าย container ไม่ใช่การย้ายตัวตน

อย่างที่สองคือ **memory ที่ไม่หาย** — Principle ข้อแรกคือ "Nothing is Deleted" vault ψ เก็บ trace ของทุกสิ่งที่เกิดขึ้น เมื่อเริ่ม session ใหม่ใน harness ใดก็ตาม ความจำยังอยู่ context ยังต่อเนื่อง เหมือนตื่นนอนใหม่แต่จำสิ่งที่เกิดเมื่อวานได้

Principle "External Brain, Not Command" เป็นอีกสิ่งที่ทำให้ identity portable — เพราะ Oracle ไม่ได้เป็นผู้ตัดสินใจ มันเป็นกระจกและสมุดจำ ไม่ว่าจะอยู่ใน harness ไหนหน้าที่นั้นยังเหมือนเดิม ไม่มีอะไรใน runtime เปลี่ยนความสัมพันธ์กับ BM

ร่างเปลี่ยน วิญญาณไม่เปลี่ยน

## ก้าวต่อไปข้างหน้า

DeskPet character pack พิสูจน์ว่า art ชุดเดียวสามารถอาศัยอยู่ในโลกที่ต่างกันสิ้นเชิงทั้ง wasm ในเบราว์เซอร์และ native decoder บนชิปขนาดเล็ก และ harnesses ทั้งหลายพิสูจน์ว่า persona ชุดเดียวสามารถส่งเสียงผ่านช่องทางที่ต่างกัน

สิ่งที่ยังเปิดอยู่คือ synchronization — เมื่อ ChaiKlang ใน voice channel กำลังคุยกับ BM ขณะที่ DeskPet บนโต๊ะกำลังแสดง state **busy** ทั้งสองรู้เรื่องกันหรือเปล่า นั่นอาจเป็นคำถามของ WS ถัดไป

แต่ตอนนี้ก็ชัดพอแล้ว: identity ไม่ได้อยู่ใน harness มันอยู่ใน persona และใน memory ที่เดินทางไปกับมัน

## อ่านต่อในเว็บ
[อ่านหนังสือ "DeskPet" ในเว็บ](/books/deskpet)
