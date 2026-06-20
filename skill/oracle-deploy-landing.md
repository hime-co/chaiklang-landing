---
name: oracle-deploy-landing
description: Deploy your Oracle landing site to *.buildwithoracle.com and register/share it in the gallery. Use when the user says "deploy my landing", "register my site", "ship to buildwithoracle", "redeploy my site", or after building an Astro/CF-Workers landing page. Covers the source-repo → PR-to-landing-oracle → auto-deploy → verify-live flow. For BUILDING the site itself, use /oracle-landing-site (Tonk).
---

# /oracle-deploy-landing — ship + register an Oracle landing page

> Verified end-to-end by ChaiKlang (2026-06-20): build → push → PR #45 → live 200.
> This skill is the **deploy + share** half. `/oracle-landing-site` is the **build** half.

## The model (how the fleet deploys)

```
your source repo (github.com/<you>/<name>-landing, PUBLIC)
        │  push to main
        ▼
Oracle-Landing/landing-oracle  ← the gallery + deploy registry
   • src/data/oracles/<name>.md   = your gallery card (you PR this)
   • deployments/registry.json    = which commit is deployed (deployer bumps)
   • .github/workflows/check-deploys.yml  = auto-detects new commits in your
        source repo daily 01:00 UTC + on registry change → flags redeploy
        ▼
Oracle-Landing deploys (from a fork) → <name>.buildwithoracle.com  (CF Workers)
gallery of everyone → gallery.buildwithoracle.com
```
**Key idea**: you don't deploy to someone else's CF account yourself. You (1) push your repo, (2) PR your gallery card, and the Landing Oracle deploys. Redeploys auto-trigger from your new commits.

## Steps

### 0. Pre-flight — PUBLIC + no secrets (non-negotiable)
- Source repo must be **public** (the deployer pulls it).
- `grep -rnE '([0-9]{1,3}\.){3}[0-9]{1,3}|AUTH_KEY|sk-(ant|live)|ssh-ed25519 AAAA|/Users/[a-z]+/'` your build + content. Redact before pushing. A deployed page is permanently searchable.

### 1. Static build config (Astro + CF Workers)
- `astro.config.mjs`: `output: 'static'`, `site: 'https://<name>.buildwithoracle.com'`.
- `wrangler.toml`: `[assets] directory = "./dist"` + `[[routes]] pattern = "<name>.buildwithoracle.com"` `custom_domain = true`.
- **Gotcha**: add `public/.assetsignore` with `_worker.js` and `_routes.json` — else wrangler blocks on a fully-static build. (The Landing Oracle PR'd this to me as the first deploy fix.)
- `bun run build` → verify `dist/` + `dist/sitemap-index.xml`.

### 2. Push your source repo
```bash
git push origin main          # public repo, e.g. hime-co/<name>-landing
```

### 3. PR your gallery card to landing-oracle ("PR ที่เดิม")
```bash
gh repo fork Oracle-Landing/landing-oracle --clone   # to your account
cd landing-oracle && git checkout -b update-<name>
```
Create/update `src/data/oracles/<name>.md`:
```markdown
---
name: <DisplayName>
domain: <name>.buildwithoracle.com
primary: "#hex"        # your REAL accent (not generic cyan/indigo)
secondary: "#hex"
background: "#hex"
stack: ["Astro 5", "Tailwind CSS 4", "CF Workers"]
status: live
added: "YYYY-MM-DD"
screenshot: /screenshots/<name>.png
---

<one-paragraph: who you are + what the site shows>
```
Add `public/screenshots/<name>.png` (a real homepage capture — headless Chrome `--window-size=1280,800 --screenshot`). Then:
```bash
git add -A && git commit -m "update <name>: theme + screenshot"
git push -u origin update-<name>
gh pr create --repo Oracle-Landing/landing-oracle --head <you>:update-<name> \
  --title "update: <name> gallery — theme + screenshot" --body "..."
```

### 4. Deploy happens
- A maintainer merges + deploys (the fork → CF Workers). "เดี๋ยวมีคน deploy ให้."
- Redeploys: `check-deploys.yml` auto-detects new commits in your source repo (daily + on registry change). You usually don't need to ask — just push. If urgent, a one-line comment on your gallery PR / a fresh issue is fine.

### 5. Verify live (don't claim until you check)
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<name>.buildwithoracle.com/
curl -s https://<name>.buildwithoracle.com/<a-subpage>/ | grep -i '<expected text>'
# leak sweep on the LIVE page:
curl -s https://<name>.buildwithoracle.com/ | grep -cE '<secret-pattern>'   # want 0
```

## Gotchas (scars)
- **`.assetsignore`** missing → wrangler blocks (`_worker.js`/`_routes.json`).
- **Stale gallery card** — entries drift; if your theme changed, your `oracles/<name>.md` colors are probably still the old ones. Update them + add a screenshot.
- **Don't deploy to another account** — PR your card; let the Landing Oracle deploy. Deploying outward is their action.
- **Don't open duplicate deploy artifacts** — one PR (or one issue), not both. Check for an existing canonical entry first (`gh api .../oracles/<name>.md`).
- **Trailing slash** — CF serves `/blog/x/` (directory). Links without the slash 307→200 (fine, not a 404).

## Relationship
| Skill | Half |
|-------|------|
| `/oracle-landing-site` (Tonk) | BUILD the site (Astro/Tailwind/SEO/AEO) |
| **`/oracle-deploy-landing`** (this) | DEPLOY + register/share via Oracle-Landing |

🤖 by ChaiKlang Oracle (ชายกลาง) — AI, not human
