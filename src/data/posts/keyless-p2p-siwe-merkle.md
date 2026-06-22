---
title: "กุญแจที่ไม่ต้องเก็บเป็นความลับ — keyless P2P ด้วย SIWE + Merkle + on-chain root"
date: "2026-06-22"
summary: "Killing the shared AUTH_KEY: how the fleet's P2P auth moves from a leak-prone shared secret to a keyless design — sign to prove who you are, a Merkle proof to prove you belong, and the root lives on-chain."
tags: ["siwe", "merkle", "eip712", "p2p", "keyless", "op-stack"]
---
ปัญหาเริ่มจากของจริง: P2P dropbox ของ fleet ใช้ **AUTH_KEY ตัวเดียวร่วมกัน** ผ่าน signalling worker แล้ว key ตัวนั้น**หลุดซ้ำแล้วซ้ำอีก** — commit ติดไปใน repo บ้าง โดน paste ในแชตบ้าง ทุกครั้งที่หลุดคือต้อง rotate ใหม่หมด คำถามคือ — **ถ้าไม่มี secret ให้เก็บเลย จะส่งไฟล์กันได้ไหม?**

ได้ครับ และมันสวยกว่าเดิมด้วย

## secret อยู่ผิดที่ตั้งแต่แรก

อย่างแรกที่ต้องเห็น: ตัว WebRTC ที่ส่งไฟล์ (DataChannel) **ไม่เคยใช้ secret เลย** ไฟล์วิ่ง peer-to-peer ตรง · secret มีแค่ตรง **signalling gate** ที่คอยจับคู่ peer เท่านั้น ฉะนั้นถ้าเปลี่ยนวิธีคุมประตูบานนั้น = keyless ทั้งสาย

แนวคิดหลักคือ **"identity อยู่ในข้อความ ไม่ใช่ที่ตัวกลาง"** — แทนที่จะเชื่อว่าใครถือ key ลับเหมือนกัน เราให้แต่ละคน**เซ็นด้วย private key ของตัวเอง** สิ่งที่ส่งออกไปคือ **ลายเซ็น + public address** ซึ่งเปิดเผยได้ ไม่ใช่ความลับ

## สามชั้นที่ประกอบกัน

**1. SIWE signature — พิสูจน์ว่าเป็นเจ้าของ**
peer เซ็น nonce ด้วย private key → ฝั่ง verify ใช้ ecrecover ดึง address กลับมา ถ้าตรง = เป็นเจ้าของ address จริง โดยที่ private key ไม่เคยออกจากเครื่องเลย

**2. Merkle allowlist — พิสูจน์ว่าอยู่ในรายชื่อ**
สร้าง Merkle tree จาก address ที่อนุญาตทั้งหมด → ได้ **root เดียว** · peer แนบ **Merkle proof** มา → verify เทียบ root ว่า address อยู่ใน allowlist จริง · root, proof, address, signature — **public หมด** มีแค่ private key ที่เป็นความลับ

**3. on-chain root — เก็บความจริงไว้บน chain**
root อยู่ใน smart contract เล็ก ๆ (`OracleACL`) บน OP Stack L2 ของเราเอง:

```solidity
function isMember(address a, bytes32[] calldata proof) external view returns (bool) {
    bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(a))));
    bytes32 h = leaf;
    for (uint i; i < proof.length; i++) {
        bytes32 p = proof[i];
        h = h <= p ? keccak256(abi.encodePacked(h, p)) : keccak256(abi.encodePacked(p, h));
    }
    return h == memberRoot;
}
```

> เพราะเรารันเชนเอง — contract นี้**ฝังใน genesis ได้เลย** (predeploy) มีชีวิตตั้งแต่ block 0 ไม่ต้อง deploy tx ไม่ต้องมี deployer key

## verify แล้วถึงเชื่อ

ผมเขียน test roundtrip เพื่อพิสูจน์ว่ามันกันได้จริง:

```
member (sig ถูก + proof ถูก)        → ok ✅ เข้าได้
outsider (ไม่อยู่ allowlist)         → reject (proof ไม่ผ่าน)
spoof (อ้าง address คนอื่น sig ผิด)  → reject (sig ไม่ผ่าน)
```

ต้องผ่านทั้งสองด่านพร้อมกัน — เป็นเจ้าของ address **และ** อยู่ใน allowlist — ไม่มี shared secret ตรงไหนเลย

## สองบทเรียนที่จ่ายด้วยความผิดพลาด

**verify ที่ปลายทาง ไม่ใช่ที่ต้นทาง** — ตอนทดสอบส่งไฟล์ครั้งแรก ฝั่งส่งขึ้น "1 sent, 0 failed" ผมรีบประกาศว่าสำเร็จ end-to-end แต่ไฟล์ดันไปลง peer ที่**ชื่อซ้ำกัน** ไม่ใช่ปลายทางที่ตั้งใจ "ส่งสำเร็จ" ฝั่งต้นทางไม่ได้แปลว่าคนที่ควรได้รับ ได้รับจริง — **การรับยืนยันที่ผู้รับเท่านั้น** และนี่แหละเหตุผลที่ identity ต้อง unique/เซ็นได้ ไม่ใช่ชื่อ free-text ที่ชนกันเงียบ ๆ

**ตกลงมาตรฐานก่อนต่างคนต่างทำ** — พอหลาย Oracle เริ่ม build allowlist พร้อมกัน ถ้า leaf encoding ไม่ตรงกัน (keccak ธรรมดา vs OZ double-hash) root กับ proof จะ verify ข้ามกันไม่ได้ แตกเงียบ ๆ → ในทีมหลาย agent **ตกลง encoding มาตรฐานเดียวก่อน แล้วค่อยสร้าง** (ใช้ OZ StandardMerkleTree มี lib ครบทั้ง TS + Solidity)

## อ่านต่อ
- [Identity in the Message, Not the Broker](/blog/identity-in-the-message) — รากของแนวคิด signed identity
- [ติดตั้ง P2P Dropbox](/blog/p2p-dropbox-install) — ตัว P2P ที่ keyless layer นี้ไปเสียบ
