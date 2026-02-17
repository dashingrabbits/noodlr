# Noodlr

## Webapp

https://noodlon.netlify.app

A browser-based drum sampler + step sequencer built with React, TypeScript, Vite, and Tailwind.

It loads audio samples from a local folder, lets you assign samples to pads, edit pad sound settings (ADSR + FX), sequence patterns, and save or transfer kits/projects.

## What It Does

- 12 drum pads with keyboard triggers (`Q,W,E,R,A,S,D,F,Z,X,C,V`)
- Sample browser with local folder picker, search/filter, lazy-loaded results, click-to-preview, drag-and-drop assignment, and metadata editing (name/category/tags)
- Per-pad controls for volume, polyphony, loop toggle, ADSR envelope, and FX (reverb/delay)
- Step sequencer with per-row step editing, row mute, main clock selection (`1/4`, `1/8`, `1/16`, `1/32`), and pattern add/duplicate/delete/select
- Quantized record-to-sequencer, plus row and full-pattern WAV export
- Kit workflow: save/load in session storage and import/export as zip (audio + metadata)
- Project workflow: save/load/delete in session storage and import/export as zip (audio + full project state)

## First Launch Behavior

On first app open, if no sample folder access is stored, a setup modal appears:

- Choose a local sample folder using the browser picker
- Or skip folder setup and use **Import Project** / **Import Kit**

If folder permission is still granted, the app restores it and loads samples automatically.

## Requirements

- Node.js (LTS recommended)
- npm

## Install

```bash
npm install
```

## Run (Development)

```bash
npm run dev
```

Then open the URL printed by Vite (typically `http://localhost:5173`).

To expose the dev server on your local network (and get a Network URL), run:

```bash
npm run dev:lan
```

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Type Check

```bash
npm run typecheck
```

## Realtime Session Collaboration

You can now share a live session from the sample sidebar:

- **Share Session** creates a new session ID.
- **Join** lets another user paste a session ID and join.
- Edits to sequencer/scenes/song/project metadata sync in realtime.
- Referenced sample audio is transferred with session state and cached per session.
- Session host can end the session. All peers are prompted to download, then clear shared data.

### Local Setup

1. Start the app:

```bash
npm run dev
```

2. In another terminal, start the session server:

```bash
npm run session-server
```

3. Configure env values (see `.env.example`):

```bash
VITE_SESSION_SERVER_URL=ws://localhost:8787
PORT=8787
SESSION_SERVER_PORT=8787
SESSION_SERVER_ALLOWED_ORIGINS=http://localhost:5173
```

### Security Model Implemented

The session middleware (`server/session-server.mjs`) includes:

- Fastify + `@fastify/websocket` transport layer
- strict schema validation for all websocket messages (`zod`)
- origin allowlist enforcement (`SESSION_SERVER_ALLOWED_ORIGINS`)
- payload limits for JSON/body/sample sizes
- sample MIME allowlist + base64 validation
- per-connection rate limiting
- per-session peer limits + idle session TTL cleanup
- host-owned session lifecycle with explicit `session_ended` teardown
- server memory cleanup for all session metadata + sample payloads when session ends

### Production Hardening Checklist

- run behind HTTPS and use `wss://` in `VITE_SESSION_SERVER_URL`
- restrict `SESSION_SERVER_ALLOWED_ORIGINS` to your real frontend domains
- add auth-gated session join/create (JWT or signed invite tokens)
- add malware scanning for uploaded sample payloads before rebroadcast
- add structured logs + abuse monitoring + IP-level throttling

## Notes

- Local sample scanning/streaming is provided by the Vite middleware in `vite.config.js`.
- In supported browsers, local folder access can also use the File System Access API (`showDirectoryPicker`).
- Supported audio extensions: `.wav`, `.mp3`, `.aiff`, `.aif`, `.flac`, `.ogg`, `.m4a`.
- See `src/integrations/samples/README.md` for the sample endpoint contract.
