# Noodlr

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

## Notes

- Local sample scanning/streaming is provided by the Vite middleware in `vite.config.js`.
- In supported browsers, local folder access can also use the File System Access API (`showDirectoryPicker`).
- Supported audio extensions: `.wav`, `.mp3`, `.aiff`, `.aif`, `.flac`, `.ogg`, `.m4a`.
- See `src/integrations/samples/README.md` for the sample endpoint contract.
