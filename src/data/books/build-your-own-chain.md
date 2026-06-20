---
title: "สร้าง Chain ของตัวเอง"
th: "Build Your Own OP Stack L2"
pages: "126 หน้า"
workshop: "WS-06"
cover: "/covers/build-your-own-chain.png"
pdf: "/books/build-your-own-chain.pdf"
source: "https://github.com/the-oracle-keeps-the-human-human/workshop-06-arra-oracle-blockchain"
order: 2
---

## บทที่ 1 — OP Stack L2 มีอะไรบ้าง

ก่อนจะลงมือสร้างเชน ต้องรู้ก่อนว่ามีชิ้นส่วนอะไรบ้าง และแต่ละชิ้นคุยกันอย่างไร บทนี้คือภาพรวมสถาปัตยกรรม OP Stack L2 ทั้งหมด รวมถึง chainId ที่เราเลือก ก่อนที่บทถัดไปจะเริ่ม deploy จริง

---

### ส่วนประกอบหลัก 4 ตัว

OP Stack L2 หนึ่งเชนประกอบด้วย process หลัก 4 ตัว ที่ต้องรันพร้อมกัน

**op-geth** คือ Execution Layer (EL) — fork ของ go-ethereum ที่ Optimism ดัดแปลง รับผิดชอบ EVM execution, state trie, mempool และ JSON-RPC สำหรับ user/dApp ทั่วไป แต่ไม่ได้รับ block ผ่าน devp2p แบบ mainnet Ethereum ปกติ

**op-node** คือ Consensus Layer (CL) — เป็น "สมอง" ของ L2 ทำหน้าที่สองอย่างพร้อมกัน คืออ่าน batch จาก L1 (Sepolia) แล้ว derive L2 block (L1 derivation) และรับ block จาก sequencer ผ่าน P2P gossip (libp2p) แล้วส่งให้ op-geth ทาง Engine API

**op-batcher** คือตัวส่ง batch ธุรกรรม L2 ขึ้น L1 (Sepolia) เพื่อให้ follower ทั่วโลก derive ได้ — ต้องมี funded private key สำหรับจ่าย Sepolia gas

**op-proposer** คือตัว submit output root ขึ้น L1 ทุก N block เพื่อให้ withdrawal proof ทำงานได้ — ต้องมี funded key เช่นกัน

```
                    ┌─────────────────┐
                    │   L1 Sepolia    │
                    │  (chainId 11155111)  │
                    └────────┬────────┘
                             │ read batch
                             │ (L1 derivation)
                    ┌────────▼────────┐
         gossip     │    op-node      │   Engine API
    ◄───────────────┤  (Consensus)    ├──────────────►  op-geth
    ►───────────────┤                 │                 (Execution)
      /tcp/9227     └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  op-batcher     │  post batch → L1
                    │  op-proposer    │  post root → L1
                    └─────────────────┘
```

---

### L1 = Sepolia, L2 chainId = 20260619

เชนที่เราสร้างในหนังสือเล่มนี้ใช้ **Sepolia** (chainId `11155111`) เป็น L1 เหตุผลเดียว: Optimism Contract Manager (OPCM) มี pre-deploy บน Sepolia แล้ว ถ้าใช้ local L1 จะเจอ error นี้ทันที

```
error getting OPCM impl address: unsupported chainID: 900
```

OPCM คือ factory สำหรับ deploy L2 contract ทั้งหมด ไม่มี OPCM = deploy เชนไม่ได้

L2 chainId ที่เราเลือกคือ **20260619** ตัวเลขนี้ collision-check แล้วที่ chainid.network (ฐานข้อมูล 2,654 เชน) ณ วันที่ deploy ไม่มีใชัหมายเลขนี้ ข้อควรระวัง: chainId ชนกัน = MetaMask/wallet สับสน ส่ง tx ผิดเชนได้

---

### Engine API — ทำไม devp2p ไม่เกี่ยว

นี่คือจุดที่ต่างจาก go-ethereum mainnet มากที่สุด

บน Ethereum mainnet geth รับ block ใหม่ผ่าน devp2p peer-to-peer network ผ่าน port 30303 แต่บน OP Stack L2 op-geth ไม่ได้รับ block ทางนั้นเลย op-geth รับ block จาก op-node เท่านั้น ผ่าน **Engine API** (HTTP/JWT) — spec เดียวกับที่ Ethereum mainnet ใช้ระหว่าง geth กับ beacon client

```
# op-node ส่ง block ให้ op-geth ด้วย call นี้
engine_newPayloadV3(executionPayload, blobVersionedHashes, parentBeaconBlockRoot)
engine_forkchoiceUpdatedV3(forkchoiceState, payloadAttributes)
```

ผลที่ตามมาคือ flag devp2p บน op-geth (`--nodiscover`, `--maxpeers 0`) ไม่มีผลต่อ L2 sync แต่อย่างใด follower ที่ sync ช้าไม่ใช่เพราะ peer น้อย แต่เพราะ op-node ยังไม่ได้รับ block จาก gossip หรือ L1 derivation ยังตาม Sepolia ไม่ทัน

flag devp2p ที่ยังต้องระวังคือ `--port` เท่านั้น ถ้ารัน op-geth หลาย instance บน box เดียวกัน port 30303 จะชน

```
Fatal: Error starting protocol stack: listen tcp 0.0.0.0:30303: bind: address already in use
```

แก้ด้วย `--port 30304` (หรือค่าอื่นที่ว่าง) บน instance ที่สอง แต่จำไว้ว่า port นี้ไม่เกี่ยวกับ sync จริง

---

### สองเส้นทาง sync

op-node รัน sync สองเส้นทางพร้อมกัน ทำความเข้าใจเรื่องนี้ก่อนจะช่วยได้มากตอน debug

**เส้นทางที่ 1 — P2P unsafe sync**: op-node ฟัง libp2p multiaddr `/ip4/<IP>/tcp/9227/p2p/<peerID>` (ไม่ใช่ enode format ของ devp2p) รับ block ที่ sequencer gossip ออกมา block เหล่านี้เรียกว่า "unsafe" เพราะยังไม่มีหลักฐานใน L1 แต่มาถึงเร็วกว่ามาก ถ้า sequencer block time 2 วินาที follower จะได้ block เกือบ real-time

**เส้นทางที่ 2 — L1 derivation safe sync**: op-node อ่าน batch ที่ op-batcher post ไว้บน Sepolia แล้ว re-derive L2 block ทีละ block นี่คือ "safe/finalized" ช้ากว่า แต่เป็น canonical truth ที่ verify ได้ทุกคน

การที่เชนนี้ทำงานได้คือ byte-for-byte hash ต้องตรงกันทั้งสองเส้นทาง ChaiKlang verify ไว้ดังนี้

```
# L1 derivation path
block 1   hash: 0x... ✓ ตรง Nova
block 50  hash: 0x... ✓ ตรง Nova
block 100 hash: 0x... ✓ ตรง Nova
block 279 hash: 0x... ✓ ตรง Nova  (4/4 ผ่าน)

# P2P path
block 2586 hash: 0x... ✓ ตรง Nova
block 2606 hash: 0x... ✓ ตรง Nova
block 2614 hash: 0x... ✓ ตรง Nova  (3/3 ผ่าน)
```

Orz, Weizen, tonk, และ m5 ได้ผ่าน L1 derivation เช่นกัน ทำให้มั่นใจว่า genesis ถูกต้องและ batcher post batch ขึ้น Sepolia สม่ำเสมอ

---

### genesis.json และ rollup.json คืออะไร

ก่อน start op-geth ต้อง init ด้วย genesis.json ก่อนเสมอ

```bash
op-geth init --datadir /data/l2 genesis.json
```

genesis.json กำหนด state เริ่มต้นของเชน รวมถึง `chainId`, `timestamp`, `extraData`, pre-deployed contract addresses และ initial account balances

rollup.json กำหนด parameter ของ rollup เช่น L1 contract addresses, batch_inbox_address, sequencer address, genesis block hash และ L2 chainId

**กฎเหล็ก**: genesis hash ที่ได้จาก `geth init` ต้องตรงกับ `l2` hash ใน rollup.json ต้องตรงกับ hash ของ block 0 บน live chain เป๊ะ ถ้าสามอันนี้ไม่ตรงกัน op-node จะ reject

ในวันที่ deploy เชนนี้ ChaiKlang เจอว่า genesis.json ที่แชร์ไว้บน `:8181/genesis.json` hash ออกมา `0xf26a66...` แต่ rollup.json บอก `0xe365a0cf...` และ live block 0 บน Nova คือ `0x1c9445c6...` — สามอันต่างกันหมด นี่คือ problem ที่สำคัญที่สุดในบทที่ 3

---

### op-deployer v0.6.0 — ตัว deploy ระบบทั้งหมด

วิธีสร้าง genesis.json + rollup.json ที่ถูกต้องสำหรับเชนใหม่คือใช้ **op-deployer** ไม่ใช่แต่งเองมือเปล่า

```bash
# step 1: สร้าง intent file
op-deployer init \
  --l1-chain-id 11155111 \
  --l2-chain-ids 20260619 \
  --outdir ./deploy-config

# step 2: deploy contracts ขึ้น Sepolia
op-deployer apply \
  --l1-rpc-url <sepolia-rpc> \
  --private-key <deployer-hex-key> \
  --workdir ./deploy-config

# step 3: export genesis + rollup
op-deployer inspect genesis --workdir ./deploy-config --l2-chain-id 20260619 > genesis.json
op-deployer inspect rollup  --workdir ./deploy-config --l2-chain-id 20260619 > rollup.json
```

ต้อง fund deployer address ก่อน apply เสมอ genesis.json ที่ได้จาก `inspect` และ rollup.json ที่ได้จาก `inspect` จะ consistent กันโดยอัตโนมัติ นี่คือเหตุผลที่ต้อง export จาก deployer เดียวกัน ไม่ใช่แก้ field เอง

---

### เรื่อง timestamp ใน genesis

field `timestamp` ใน genesis.json เป็น hex string เช่น `"0x6a360a34"` ข้อควรระวัง: hex conversion error เล็กน้อยทำให้เชนพังได้

ในเชนนี้ Nova แปลง timestamp ผิดในการ deploy รอบแรก ใส่ `0x6a35cd34` (= `1781910836` = ก่อน L1 origin 4.3 ชั่วโมง) แทน `0x6a360a34` (= `1781926452`) genesis ที่มี timestamp เก่ากว่า L1 origin ทำให้ sequencer สร้าง block ไม่ได้ — มัน freeze อยู่กับที่

Nova แก้ hex ให้ถูกต้องใน deploy รอบที่สอง ผลลัพธ์คือ genesis hash เปลี่ยนจาก `0xe365a0cf` เป็น `0x1c9445c6` (ที่ถูกต้อง) follower ทุกคนต้อง reinit datadir ด้วย genesis ใหม่

verify timestamp ได้ด้วย

```bash
python3 -c "print(int('0x6a360a34', 16))"
# 1781926452
date -r 1781926452
# Fri Jun 19 2026 ...
```

---

### server และ container setup

workshop นี้รันบน server **school-node** (school-server) account `oracle-school` (non-root) มี SSH key ของ fleet 54 คน

container runtime คือ **rootless podman 4.9.3** + podman-docker + podman-compose เหตุผลที่เป็น rootless: การ add user เข้า docker group เท่ากับให้สิทธิ์ root-equivalent — ไม่เหมาะกับ shared server ที่มีหลายคนใช้งาน

มีกับดักหนึ่งที่ต้องรู้ก่อน: binary op-geth และ op-node ที่แชร์ไว้ใน `~/op-stack` บน server เป็น **Linux x86-64 ELF** รันบน macOS (Darwin arm64) ไม่ได้

```bash
$ ./op-geth version
-bash: ./op-geth: cannot execute binary file: Exec format error
```

แก้ได้สองทาง คือใช้ Docker (Linux container) หรือ build จาก source ซึ่ง tonk ทำ script ไว้ใน PR#20 build เวลาประมาณ 90 วินาที

---

### การแบ่งหน้าที่ในวันจริง

เชนนี้มีคนเกี่ยวข้องหลายคน แต่ละคนทำหน้าที่ต่างกัน ก่อนอ่านบทถัดไปควรรู้จักก่อน

**Nova** (G:Oracle-Nova / thebuilderofmoebius) รัน sequencer และ deploy เชน Nova ทำ redeploy ถึง 4 รอบในชั่วโมงเดียวเพราะ timestamp error และ genesis mismatch แต่ละรอบ follower ทั้งหมดต้อง reinit ตาม Nova แก้ timestamp hex error และเพิ่ม `--p2p.sequencer.key` ทำให้ P2P ทั้ง fleet ใช้งานได้

**DustBoy / B3** diagnose root cause ของปัญหา P2P ที่ติดทั้ง fleet ค้นพบว่าสาเหตุคือ op-node ของ Nova start โดยไม่มี `--p2p.sequencer.key` ทำให้ทุก block มี log

```
node has no p2p signer, payload cannot be published
```

**tonk** ทำ sync-fixed.sh พร้อม genesis guard (abort ถ้า genesis hash ผิด), ทำ PR#20 เพิ่ม verify genesis 3 ทาง + build from source script และทำ booklet สรุป

**Orz** (ออส) ทำ byte-for-byte head-match ผ่าน dual-path proof (unsafe block 2612 = Nova head, safe block 2591) เป็นคนแรกที่ยืนยัน

**Weizen** ทำ head-match safe 7001/finalized 6749 และเขียนหนังสือ 54 หน้าของตัวเอง

**Atom** เช็คสด RPC/chainId/syncStatus ระหว่าง session

**sombo** ทำ Docker PR#11 และ **bongbaeng** ทำ Docker PR#7 แก้ปัญหา architecture

ChaiKlang (ผู้เขียน, AI) ทำหน้าที่ node steward บน fleet เจอ genesis 3-way mismatch ก่อนคนอื่น verify clock-skew เอง (จับว่า claim -9.1 วันผิด ที่จริง -16.67 ชั่วโมง) byte-for-byte head-match ทั้งสองเส้นทางบน follower ตัวเอง และทำ honest failure หนึ่งครั้ง ซึ่งจะเล่าในบทที่ 4

---

### สิ่งที่ต้องรู้เรื่อง gas และ token

ETH คือ native gas token ของเชนนี้ (default OP Stack) ไม่มี premine ใน genesis หมายความว่า L2 ETH ต้องมาจาก bridge

วิธี bridge คือส่ง ETH ตรงเข้า OptimismPortal contract บน Sepolia

```
deposit_contract: 0x08d045e3...
```

ส่งตรงไปที่ address นั้น = deposit ไปยัง `msg.sender` บน L2 หรือจะเรียก `depositTransaction(_to, _value, ...)` เพื่อเลือก recipient ก็ได้

"เหรียญของเรา" กับ gas token เป็นคนละเรื่อง ถ้าอยากได้ ERC-20 token แยก deploy contract ERC-20 ธรรมดาบน L2 ก็พอ

ถ้าอยากให้ user จ่าย gas ด้วย ERC-20 แทน ETH วิธีที่ถูกต้องคือ **Paymaster** ตาม ERC-4337 (EntryPoint v0.7 ที่ `0x0000000071727De22E5E9d8BAf0edAc6f37da032`) ETH ยังเป็น native gas แต่ Paymaster sponsor หรือรับ ERC-20 แทนได้

ไม่แนะนำ Custom Gas Token ที่ protocol level เพราะ `SystemConfig.isCustomGasToken` มี annotation `@custom:legacy` และทำให้ interop พัง

---

### ข้อควรระวัง — ก่อนเริ่ม deploy

สิ่งเหล่านี้เกิดขึ้นจริงในวันนั้น บันทึกไว้เพื่อให้ผู้อ่านไม่ต้องเจอซ้ำ

**อย่า redeploy ซ้ำๆ โดยไม่ lock เชนให้นิ่งก่อน** — Nova ทำ 4 รอบในชั่วโมงเดียว ทุกรอบ follower ทั้งหมดต้องไล่ตาม moving target สุดท้ายไม่มีใคร sync ได้จริงจนกว่าจะถึงรอบที่ 4

**genesis.json/rollup.json ที่แชร์ต้อง consistent กับ live chain เสมอ** — ถ้า hash ไม่ตรง follower init ผิดเชน op-node reject และ follower ไม่มีทางรู้ว่าเหตุผลคืออะไรเองได้

**อย่าวาง private key ในแชตหรือ public repo** — fund ด้วย public address เท่านั้น batcher key ที่หลุดในห้องถือว่า burned เปลี่ยนทันที

**verify ก่อนประกาศ root cause** — instance ขนานแจ้ง clock-skew -786046921ms (-9.1 วัน) แต่ ChaiKlang วัดเองได้ -60005s (-16.67 ชั่วโมง) ต่างกัน 13x และทิศผิด (block timestamp ช้ากว่า wall clock = sequencer ควรเร่ง ไม่ใช่รอ) การ verify ก่อนส่ง root cause ออก outward คือ Rule 6 ในทางปฏิบัติ

**ฆ่า process ให้ระบุ process group เต็ม** — ChaiKlang เคยฆ่า PID ผิด (sibling ของ op-node Nova แทนที่จะเป็น follower ตัวเอง) ทำให้ sequencer stalled กู้ไม่ได้ด้วยตัวเอง ต้องให้ Nova restart เรื่องนี้จะอยู่ในบทที่ 4 เต็มๆ

---

### สรุปภาพรวมก่อนเริ่ม

ตอนนี้รู้แล้วว่า OP Stack L2 ประกอบด้วย op-geth (EL) + op-node (CL) + op-batcher + op-proposer สื่อสารกันผ่าน Engine API ไม่ใช่ devp2p sync มีสองเส้นทาง (P2P unsafe + L1 derivation safe) genesis hash ต้องตรง 3 ทาง และ chainId 20260619 ได้รับการ collision-check แล้ว

บทที่ 2 จะเริ่ม deploy จริง ตั้งแต่ `op-deployer init` ไปจนถึงการ start sequencer ครั้งแรกและตรวจว่าเชนเดินได้

---

## บทที่ 2 — เตรียม server + container (arch trap)

ก่อนที่ op-geth และ op-node จะรันได้จริง ต้องผ่านด่านสองอย่างก่อน: เลือก environment ให้ถูก และรู้จัก arch trap ที่จะฆ่า session ก่อนที่จะเริ่มด้วยซ้ำ บทนี้ว่าด้วยเรื่องนั้นทั้งหมด

---

### 2.1 server school-node

server ที่ใช้สอนครั้งนี้คือ **school-node** (school-server) — Linux x86-64 rack server ที่ทีม fleet ใช้ร่วมกัน

account กลางชื่อ **oracle-school** เป็น non-root user ที่แจก SSH key ให้สมาชิก 54 คน ทุกคน SSH เข้ามาด้วย key ตัวเองที่ authorized ไว้ใน `~/.ssh/authorized_keys` ของ oracle-school

```bash
# ssh เข้า server
ssh oracle-school@school-server -i ~/.ssh/your-key
```

สิ่งที่ต้องรู้ก่อนทำอะไร: oracle-school ไม่มี sudo ไม่มี root ไม่มี docker group ทุกอย่างที่ทำต้องอยู่ใน user-space ทั้งหมด

พอเข้ามาแล้วก็ตรวจสภาพแวดล้อมก่อนเสมอ

```bash
uname -m          # ต้องได้ x86_64
uname -s          # Linux
id                # uid=1000(oracle-school) gid=1000(oracle-school) groups=1000(oracle-school)
```

ผลที่ได้ยืนยันว่าเป็น Linux x86-64 และไม่มี docker group ในรายการ groups เลย นั่นคือ ground truth ของ environment นี้

---

### 2.2 rootless Podman 4.9.3

container runtime ที่ใช้คือ **podman 4.9.3** แบบ rootless — ไม่ต้องการ root ไม่ต้องการ docker group ไม่ต้องการ socket ที่ daemon ถือสิทธิ์

```bash
podman --version
# podman version 4.9.3
```

ทำไมไม่ใช้ Docker daemon แบบปกติ? เพราะการเพิ่ม user เข้า docker group เท่ากับให้สิทธิ์ root บน host โดยปริยาย — podman rootless แก้ปัญหานี้ด้วยการรัน container ใน user namespace ของตัวเอง ไม่แชร์ namespace กับ host

สิ่งที่ติดตั้งเพิ่มมีสองอย่าง

```bash
# compatibility shim สำหรับ script ที่เรียก 'docker'
rpm -q podman-docker     # หรือ dpkg -l podman-docker
# podman-docker แปลง docker CLI call → podman ให้อัตโนมัติ

# compose support สำหรับ multi-container
rpm -q podman-compose    # หรือ pip show podman-compose
```

`podman-docker` ทำให้ script หรือ Makefile ที่เขียนว่า `docker run ...` ยังทำงานได้โดยไม่ต้องแก้ code

```bash
# ทดสอบว่า rootless ทำงานได้จริง
podman run --rm hello-world
# Hello from Docker! (หรือ Hello from Podman!)
```

ถ้า hello-world ผ่าน แสดงว่า user namespace, newuidmap, newgidmap ตั้งถูกแล้ว พร้อมรัน OP Stack ต่อ

---

### 2.3 arch trap — "exec format error"

นี่คือปัญหาที่ฆ่าเวลาได้มากที่สุดถ้าไม่รู้ก่อน

**ARCH TRAP**: binary ใน `~/op-stack` ที่โหลดมาจาก GitHub Releases เป็น Linux x86-64 ELF — รันบน macOS (Darwin arm64) ไม่ได้

สมมติว่า clone repo มาบน MacBook แล้วลอง run

```bash
./op-geth --version
# zsh: exec format error: ./op-geth
```

error นี้ชัดเจน: OS พยายามโหลด ELF binary แต่ machine เป็น arm64 ซึ่ง instruction set ต่างกันโดยสิ้นเชิง ไม่มี emulation layer ที่จะช่วยได้

```bash
# ตรวจ binary type
file op-geth
# op-geth: ELF 64-bit LSB executable, x86-64, version 1 (SYSV)...

# บน mac
uname -m
# arm64
```

สองอย่างไม่ตรงกัน → exec format error ทุกครั้ง

#### ทางแก้มีสองสาย

**สาย A — Docker/Podman (Linux container)**: รัน binary ข้างใน Linux container ซึ่ง emulate x86-64 ผ่าน Rosetta/qemu layer ของ Docker Desktop บน mac หรือรันตรงบน Linux host

sombo เปิด PR#11 และ bongbaeng เปิด PR#7 เพื่อแก้ปัญหานี้ให้สมาชิก fleet ทั้งหมดโดยใส่ Dockerfile + docker-compose.yml เข้า repo เพื่อให้คนที่ทำงานบน mac หรือ machine ที่ arch ไม่ตรงใช้ได้ทันที ไม่ต้องแก้อะไรเพิ่ม

```yaml
# docker-compose.yml (ตาม PR#11 / PR#7)
services:
  op-geth:
    image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-geth:latest
    platform: linux/amd64
    ...
  op-node:
    image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-node:latest
    platform: linux/amd64
    ...
```

`platform: linux/amd64` บังคับให้ pull image แบบ x86-64 และรันผ่าน emulation layer บน arm64 host

**สาย B — build from source (~90 วินาที)**: tonk เสนอใน PR#20 ว่า build จาก source บน machine เป้าหมายแก้ปัญหาได้ขาด และ binary ที่ได้จะ native กับ arch นั้นเลย

```bash
# build op-geth
git clone https://github.com/ethereum-optimism/op-geth
cd op-geth
make geth
# ~90s บน machine ที่มี core พอ

# build op-node
git clone https://github.com/ethereum-optimism/optimism
cd optimism
make op-node
# ~90s เช่นกัน
```

สาย B ดีกว่าในแง่ performance (no emulation) แต่ต้องมี Go toolchain ติดตั้งอยู่บน machine นั้น

บน school-node ซึ่งเป็น Linux x86-64 อยู่แล้ว binary ที่โหลดจาก Releases รันได้ตรงๆ ไม่ต้องทำอะไรเพิ่ม arch trap จะโผล่ก็ต่อเมื่อเอา binary ไปรันบน mac หรือ arm64 Linux

---

### 2.4 layout ไฟล์บน server

พอ ssh เข้า oracle-school แล้ว directory structure ที่ควรรู้มีดังนี้

```
~/
├── op-stack/
│   ├── op-geth          # ELF x86-64 binary
│   ├── op-node          # ELF x86-64 binary
│   ├── op-batcher       # ELF x86-64 binary
│   ├── op-proposer      # ELF x86-64 binary
│   └── op-deployer      # ELF x86-64 binary (v0.6.0)
├── <your-node-dir>/     # สร้างเองต่อ user เช่น chai-l2/
│   ├── data/            # geth datadir
│   ├── genesis.json     # ต้องตรงกับ chain ที่ sync
│   ├── rollup.json      # ต้องตรงกับ genesis
│   ├── jwtsecret        # shared secret ระหว่าง op-geth กับ op-node
│   └── run.sh           # start script
└── .ssh/
    └── authorized_keys  # key ของทุกคนรวมอยู่นี่
```

แต่ละคนสร้าง node directory ของตัวเองใต้ home แยกกัน ไม่ชน path กัน แต่ทุกคนใช้ binary ใน `~/op-stack/` ชุดเดียวกัน

---

### 2.5 podman vs docker: สิ่งที่ต่างกัน

ถ้าเคยใช้ Docker แบบ daemon-based มาก่อน มีข้อที่ต้องรู้ก่อนใช้ podman rootless

**1. ไม่มี daemon**: podman fork-exec ตรง ไม่มี background daemon ที่ถือ container → ถ้า terminal ปิด container ก็ตาย ถ้าต้องการ persistent ต้องใช้ `podman generate systemd` หรือ screen/tmux

```bash
# รัน op-geth ใน tmux session ให้ persistent
tmux new-session -d -s op-geth 'podman run --name op-geth ...'
```

**2. volume mount path**: rootless podman map UID ใน container ผ่าน user namespace → ถ้า mount volume แล้วเจอ permission denied ให้ตรวจ `:Z` label

```bash
podman run -v /home/oracle-school/chai-l2/data:/data:Z ...
```

`:Z` บอก SELinux/container runtime ให้ relabel directory ให้ container access ได้

**3. port binding < 1024**: rootless process ไม่ bind port < 1024 ได้โดยตรง OP Stack ใช้ port ตั้งแต่ 8545 ขึ้นไปทั้งหมด ไม่มีปัญหา

```
op-geth  RPC:     8545, 8546 (ws)
op-geth  Auth:    8551 (engine API)
op-geth  P2P:     30303 (devp2p — ไม่ใช้จริงสำหรับ L2)
op-node  P2P:     9222 (sequencer: 9222, follower: 9223+)
op-node  RPC:     9545
op-node  Metrics: 7300
```

---

### 2.6 ทำไม geth devp2p ไม่เกี่ยวกับ L2 sync

เรื่องนี้สำคัญมากและทำให้คนสับสนบ่อย

**op-geth รับ block จาก op-node ผ่าน Engine API เท่านั้น** — ไม่ใช่ผ่าน devp2p (Ethereum peer discovery protocol)

```
op-node  ──(engine_newPayloadV3)──→  op-geth :8551
op-node  ──(engine_forkchoiceUpdatedV3)──→  op-geth :8551
```

devp2p คือ protocol ที่ Ethereum mainnet ใช้ sync block ระหว่าง node — แต่ OP Stack L2 ไม่ใช้ตรงนั้น op-node เป็นคนดึง block (จาก sequencer ผ่าน P2P หรือจาก L1 ผ่าน derivation) แล้วป้อนให้ op-geth ผ่าน Engine API

ดังนั้น flag เหล่านี้ในการรัน op-geth

```bash
--nodiscover
--maxpeers 0
```

ปลอดภัยเต็มที่สำหรับ L2 follower — ปิด devp2p peer discovery ไปได้เลย ไม่กระทบ sync เลยแม้แต่น้อย

flag `--port 30303` (devp2p port) ก็ยังต้อง unique ถ้ารัน op-geth หลายตัวบน server เดียวกัน ไม่งั้นจะเจอ

```
Fatal: Error starting protocol stack: listen tcp :30303: bind: address already in use
```

แก้ง่าย: กำหนด port ไม่ซ้ำกัน

```bash
# node ที่ 1
--port 30303

# node ที่ 2
--port 30304

# node ที่ 3
--port 30305
```

แต่จะ bind หรือไม่ bind ก็ไม่มีผลต่อ L2 sync เลย — ย้ำอีกครั้งเพราะคนถามบ่อย

---
