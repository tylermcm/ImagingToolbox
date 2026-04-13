# Imaging Toolbox MVP

Mobile-first astrophotography framing MVP inspired by Black Water Skies Imaging Toolbox.

## Current capabilities

- target search against an embedded deep-sky catalog
- target resolution from catalog name or typed RA/Dec coordinates
- procedural sky background with a single draggable and rotatable reticle
- equipment inputs: focal length, multiplier, sensor width/height, pixel size
- computed metrics: effective focal length, FOV, image scale
- equipment preset save/load via local storage
- framing session save/load via local storage

## Architecture

- `src/domain`: pure framing math and target resolution logic
- `src/state`: app state + persistence actions
- `src/components`: mobile UI and interaction components

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run test
npm run build
```
