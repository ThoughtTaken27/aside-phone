# Aside Phone

Use your computer's [Aside](https://aside.com) agent from your phone: chat, live browser view, browser-history search, voice dictation, file uploads, notifications, and **Next**, a phone-first planner that turns your real work into a short, dated list.

Runs on **macOS or Windows**. The phone side is an installable web app for **iPhone (iOS 16.4+) and Android**; nothing goes through an app store.

```text
phone ──https──> aside-frontdoor.<you>.workers.dev   (your own free Cloudflare Worker, fixed address)
                        │ forwards to
                        ▼
                 Cloudflare quick tunnel               (outbound-only from your computer)
                        │
                        ▼
                 this computer, 127.0.0.1:8790        (Aside Phone server → Aside CLI → Aside)
```

## Security model

- The server listens on `127.0.0.1` only. The only way in from outside is the front door you choose (your Cloudflare Worker, or Tailscale). No port is opened on your computer or router.
- Pairing happens on a **separate loopback-only page** (`127.0.0.1:8791/pair`) that is never proxied. Codes are random, single-use, and expire after ten minutes.
- A paired phone holds a 90-day HttpOnly session cookie. Credentials never appear in URLs.
- Secrets, settings, and uploads live outside the repository, in `~/.aside-mobile` (Windows: `%USERPROFILE%\.aside-mobile`).
- The front-door Worker adds no trust: a stranger who finds your URL sees only "pair this phone", and pairing needs a code shown on your computer's screen.
- Background jobs (mail sorting, research) never run on Claude models, and private mail (codes, money, government, health, family) is filtered by plain code before any model sees it. See `miniapp/server/src/guards.ts`.

Read [Security](#security) before exposing anything beyond your own devices.

## Requirements

| | macOS | Windows 10/11 (x64) |
| --- | --- | --- |
| Aside app, signed in | [aside.com/download](https://aside.com/download) | same |
| Aside CLI | installed by the app (`~/.aside/cli`) | Aside Settings > Developer, or the signed PowerShell installer in [Aside's developer docs](https://docs.aside.com/help/developers) |
| Node.js **22.5+** | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| Git | Xcode tools or `brew install git` | `winget install Git.Git` |
| Free Cloudflare account | for the permanent address | same |

Optional: [9router](https://www.npmjs.com/package/9router) on `localhost:20128` powers Next's mail sorting, research helpers, and the Jarvis fast path (`tools/jev`). Add it in Aside (Settings > AI providers) as a provider named exactly `9router` with base URL `http://localhost:20128/v1` and your 9router key; the server reads it from Aside's `models.json` and only ever talks to it on localhost. Without it, chat and the browser view still work.

## Install

macOS:

```bash
git clone https://github.com/ThoughtTaken27/aside-phone.git ~/aside-phone
cd ~/aside-phone/miniapp
npm run setup
```

Windows (PowerShell):

```powershell
git clone https://github.com/ThoughtTaken27/aside-phone.git "$HOME\aside-phone"
cd "$HOME\aside-phone\miniapp"
npm run setup
```

`npm run setup` runs `npm ci` against the committed lockfile, builds, and runs the doctor. Runtime and network warnings are expected until the next steps are done; dependency, build, and configuration failures are not.

If the doctor cannot find Aside's data folder on Windows, find the folder that contains `accounts.json` and set `ASIDE_HOME` to it (`setx ASIDE_HOME "C:\path\to\it"`, then open a new terminal).

## Permanent address (recommended)

```bash
npm run frontdoor
```

One command, same on both systems. It:

1. Downloads a pinned `cloudflared` release and checks its SHA-256 (macOS uses Homebrew's).
2. Opens a browser once so you can sign in to (or create) a free Cloudflare account.
3. Deploys a small Worker to `https://aside-frontdoor.<your-subdomain>.workers.dev`. This address never changes.
4. Installs the server and a tunnel supervisor as background jobs that start at login and restart if they crash.
5. Prints your phone address once it answers.

Background jobs:

| | macOS | Windows |
| --- | --- | --- |
| How | launchd: `com.aside.mobile`, `com.aside.frontdoor` | a per-user login entry (`HKCU\...\Run\AsideMobile`) starts a small supervisor; no admin rights, no service |
| Logs | `~/Library/Logs/com.aside.*.log` | `%LOCALAPPDATA%\AsideMobile\Logs\` |
| Status | `npm run doctor` | `npm run service -- status` |
| Remove | `npm run frontdoor -- off`, then `npm run service -- off` | same |

Pick a different Worker name with `FRONTDOOR_NAME=my-aside npm run frontdoor` (PowerShell: `$env:FRONTDOOR_NAME='my-aside'; npm run frontdoor`).

If deploy complains about a workers.dev subdomain, open Cloudflare's dashboard > **Workers & Pages** once to claim one, then rerun.

Without the front door, `npm run service` keeps the server running locally, and `npm start` runs it in the foreground.

## Pair a phone

On the computer, open `http://127.0.0.1:8791/pair`. Each load creates a fresh one-time code that expires in ten minutes.

**iPhone** (install first, then pair: Safari tabs and installed web apps have separate storage):

1. In Safari, open `https://<your-front-door>/app`.
2. **Share** > **Add to Home Screen** > **Add**.
3. Open Aside from the home-screen icon.
4. On the computer, click **Copy link** on the pairing page, send it to yourself (AirDrop is not available from Windows; use a note, message, or email to yourself), copy it on the phone, and paste it into the app.

**Android**: scan the QR code, then Chrome menu > **Add to Home screen**.

## Next

Next is the planner tab. It is off until you give it a config, and all of it is optional:

`<Aside data>/u/<account>/next/config.json` (macOS: `~/.aside/u/0/next/config.json`)

```json
{
  "owner": {
    "name": "Alex",
    "timeZone": "America/New_York",
    "school": {
      "name": "Example High School",
      "place": "Springfield",
      "gradYear": 2028,
      "staffDomains": ["district.example.edu"],
      "studentDomain": "students.district.example.edu"
    },
    "familyNames": ["YourSurname"]
  },
  "mailAccount": "you@school.example.edu",
  "mailModel": "oc/space-bunny-free",
  "mailGate": "oc/jev-1.13-free",
  "agentModel": "9router/oc/space-bunny-free",
  "personalMail": { "account": "you@gmail.com", "privateSenders": [], "notForMe": [] }
}
```

- `owner` personalizes the prompts (name, time zone, school). Omit `school` if you are not a student.
- `mailAccount` / `personalMail` turn on read-only Gmail sorting through your logged-in Aside browser. Mail scripts are checked before they run: only search and read are allowed. Nothing is ever sent.
- Model names are 9router model ids. Background work refuses Claude models by design.

## Verify

```bash
cd miniapp
npm run doctor
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

CI runs typecheck, tests, and build on Linux and Windows (Node 22 and 24), and installs and removes the Windows login service end to end.

## Project layout

```text
miniapp/
  frontdoor/   Cloudflare Worker, tunnel supervisors (bash for macOS, Node for Windows), installers
  scripts/     doctor, service installers (launchd / Windows login runner)
  server/      Fastify API, pairing listener, Next
  web/         React/Vite phone UI
tools/jev      local CLI for the Jev/9router decision door (used by Hey Aside's fast path)
```

## Configuration

A fresh clone needs no config file. Common environment overrides (full list in `miniapp/server/src/config.ts`):

- `ASIDE_HOME`: Aside's data folder (the one with `accounts.json`)
- `MINIAPP_ASIDE_CLI`: Aside CLI path
- `MINIAPP_PORT` / `MINIAPP_PAIR_PORT`: listener ports (8790 / 8791)
- `MINIAPP_STATE_DIR`: where this app keeps its secret and state
- `ASIDE_OWNER_TZ`: time zone if you do not set `owner.timeZone`

Background jobs do not read your shell profile: after changing an override, rerun `npm run service` from a terminal where it is set.

## Security

This software can read your Aside sessions, local browser history, browser tabs, uploaded files, and (with the optional mail feature) your Gmail, and it can start Aside tasks. Treat a paired phone like an unlocked laptop.

Review the trust boundary before use:

- `miniapp/server/src/auth.ts`: session cookies and token checks
- `miniapp/server/src/pair.ts`: loopback pairing and one-time codes
- `miniapp/server/src/guards.ts`: model and mail guardrails
- `miniapp/frontdoor/worker.js`: the public Worker

Check listeners are loopback-only:

```bash
# macOS
lsof -nP -iTCP:8790 -sTCP:LISTEN
# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 8790,8791 -State Listen
```

To sign out every phone after a suspected leak: delete `~/.aside-mobile/miniapp-secret.json` (Windows: `%USERPROFILE%\.aside-mobile\miniapp-secret.json`), restart (`npm run service`), and pair again.

No API key or Anthropic credential belongs in this repository; the server talks to the Aside app already signed in on your computer.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Phone shows "Mac offline" | Computer asleep, or the tunnel is switching after a network change | Wake it; otherwise wait 30 s and check the front-door log |
| Page hangs on the phone only | The browser kept a dead connection | Clear site data for the address, reopen |
| Pairing rejected | Link expired or already used | Reload the pairing page, use the new link within ten minutes |
| iPhone asks to pair again | Paired in Safari, not the installed app | Open the home-screen app and paste a new link there |
| Doctor: no Aside CLI (Windows) | CLI not installed or terminal opened before install | Install the CLI, open a new terminal, or set `MINIAPP_ASIDE_CLI` |
| Doctor: no Aside account folder (Windows) | Aside keeps its data elsewhere | Set `ASIDE_HOME` to the folder containing `accounts.json`, rerun `npm run service` |
| History/search empty | Node older than 22.5, or Aside's history file not found | Upgrade Node; on Windows set `ASIDE_HISTORY_DB` to Aside's `...\Default\History` file |
| Next mail stays empty | 9router not running, or no `mailAccount` | Start 9router; check `next/config.json` |

## License

MIT. See [LICENSE](LICENSE). Built on an earlier open-source Aside bridge; its attribution is kept in the license.
