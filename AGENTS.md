# Setting up Aside Phone as an agent

Follow this checklist in order and verify each success condition. Detect the platform first (`node -p process.platform`: `darwin` or `win32`) and use the matching commands.

Ask the user only for what an agent cannot do safely: signing in to Aside or Cloudflare, approving an installer or UAC prompt, handling the phone, or approving a security-relevant change.

Never: expose or proxy the pairing port `8791`; copy secrets, tokens, or `next/config.json` into the repository; disable antivirus, SmartScreen, Gatekeeper, or execution policy; run unreviewed remote scripts; push or publish anything.

## Success test

- `npm run doctor` exits with no `FAIL`.
- `http://127.0.0.1:8790/api/health` returns `"ok":true` locally, and `https://<front door>/api/health` returns it from outside.
- The phone app (installed to the home screen) lists sessions and a test message gets a reply.
- A pairing link works once; reusing it fails.

## 1. Prerequisites

- Aside app installed and signed in (https://aside.com/download).
- Aside CLI: `aside --version` works in a new terminal. Windows: install from Aside Settings > Developer, or the signed PowerShell installer documented at https://docs.aside.com/help/developers (it verifies its own Authenticode signature; keep that check).
- Node 22.5+ (`node --version`), Git.
  - macOS: `brew install node git` (Homebrew from https://brew.sh, not a piped script).
  - Windows: `winget install OpenJS.NodeJS.LTS` and `winget install Git.Git`, then open a new terminal.

## 2. Clone and build

```bash
git clone https://github.com/ThoughtTaken27/aside-phone.git ~/aside-phone
cd ~/aside-phone/miniapp
npm run setup
```

**Check:** Toolchain, Build, and Configuration have no `FAIL`. Runtime/network warnings are expected now.

Windows: if Configuration warns that the Aside account folder is missing, find the folder containing `accounts.json` (look in `%USERPROFILE%\.aside`, `%LOCALAPPDATA%\Aside`, `%APPDATA%\Aside`), then `setx ASIDE_HOME "<that folder>"`, open a new terminal, and rerun `npm run doctor`. Do not guess; confirm the file exists.

## 3. Permanent address

```bash
npm run frontdoor
```

The user signs in to Cloudflare once in the browser. The script deploys the Worker, installs the background jobs, and prints the phone address.

**Check:** `curl -s https://<printed-address>/api/health` (PowerShell: `irm https://<printed-address>/api/health`) returns `ok: true`. Logs: macOS `~/Library/Logs/com.aside.frontdoor.log`; Windows `%LOCALAPPDATA%\AsideMobile\Logs\frontdoor.log` showing `published=200`.

## 4. Pair the phone

Open `http://127.0.0.1:8791/pair` on the computer.

- iPhone: open `https://<address>/app` in Safari, Share > Add to Home Screen, open the installed app, then paste the copied link (send it to the phone through a note or message to self). Never pair in a Safari tab.
- Android: scan the QR, then Add to Home screen.

## 5. Optional: Next and 9router

- 9router: add it in Aside's AI provider settings as `9router`, base URL `http://localhost:20128/v1`.
- Next: ask the user for their first name, time zone, and (only if they are a student and want it) school details and mail accounts, then write `<Aside data>/u/<id>/next/config.json` as shown in the README. Never invent values. Keep this file out of the repository.

## 6. Final verification

```bash
cd ~/aside-phone/miniapp
npm run typecheck
npm test
npm run doctor
git status --short
```

`git status` must be clean: nothing personal belongs in the checkout. Explain every remaining warning to the user.
