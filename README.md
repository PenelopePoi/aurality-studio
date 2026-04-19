# Aurality Studio

A professional browser-based DJ application and creative audio workstation built as a Progressive Web App. Aurality Studio delivers a full dual-deck mixing environment with AI-powered harmonic assistance, real-time effects, stem separation, MIDI controller support, and audio-reactive visuals -- all running entirely in the browser with zero backend dependencies.

A project of **Aurality**, a 501(c)(3) nonprofit organization dedicated to making professional-grade creative tools accessible to everyone.

## Features

### Dual-Deck DJ Engine
- Two independent decks with play, cue, loop, scratch, and slip mode
- Adjustable pitch/tempo control with BPM sync
- 8 hot cue slots per deck
- Beat-grid-aligned looping (auto and manual)
- Drag-and-drop track loading

### Professional Mixer
- Crossfader with selectable curves (smooth, sharp, constant power)
- Per-channel volume faders and trim controls
- 3-band EQ (hi/mid/lo) per channel
- Filter sweep (lowpass/highpass) per channel
- Headphone cueing with cue/master mix knob

### Effects Suite
- Reverb (convolution-based), delay, compressor, noise gate
- AutoTune, pitch shift, de-esser
- Flanger, phaser, chorus
- Beat repeat, bit crusher
- Performance effects: echo out, brake, spinback

### AI Mix Assistant
- Harmonic mixing via Camelot wheel key matching
- Smart track suggestions based on key, BPM, and energy compatibility
- Energy-level analysis and transition recommendations
- AI-generated playlist ordering

### Stem Separation
- Real-time frequency-band stem isolation: vocals, drums, bass, melody
- Per-stem mute/solo controls per channel

### 808 Drum Machine and Pad Synth
- TR-808 drum kit with kick, snare, hi-hat, and more
- Kaossilator-style synthesizer mode
- Chord and bass pad modes
- Full DDJ-400 performance pad integration

### Track Library
- IndexedDB-backed local track library
- Automatic BPM and key detection on import
- Search, sort, playlists, crates, and play history
- Persistent across sessions

### Performance Recorder
- Record entire mix sessions as audio (WebM/Opus)
- Session timeline with event logging

### Waveform Display
- Scrolling and overview waveform renderers
- Frequency-colored waveform visualization
- Beat grid overlay, hot cue markers, loop region display
- Interactive scrubbing via click/drag

### VJ Visualizer
- Five audio-reactive visual modes: spectrum, waveoscope, particles, tunnel, kaleidoscope
- Beat-synced flash and color cycling
- Full-screen canvas rendering

### MIDI Controller Support
- Full Pioneer DDJ-400 mapping via Web MIDI API
- Jog wheels, tempo sliders, channel faders, EQ knobs
- Performance pads with hot cue, beat loop, beat jump, and sampler modes
- LED feedback to controller

### Practice Mode
- Beatmatching and transition analysis with scoring
- Session tracking with improvement tips

### Progressive Web App
- Installable on desktop and mobile
- Offline support via Service Worker caching
- Standalone display mode optimized for landscape

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Audio | Web Audio API (AudioContext, AnalyserNode, BiquadFilter, DynamicsCompressor, Convolver) |
| MIDI | Web MIDI API |
| Storage | IndexedDB |
| Recording | MediaRecorder API |
| Rendering | Canvas 2D |
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks, no build step) |
| PWA | Service Worker, Web App Manifest |

No bundler, no transpiler, no npm dependencies. The entire application runs from static files.

## Getting Started

### Prerequisites

- A modern browser (Chrome, Edge, or Firefox recommended)
- For MIDI: a Web MIDI compatible browser (Chrome/Edge) and a MIDI controller

### Running Locally

Serve the project directory with any static file server:

```bash
npx serve .
```

Or use Python:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or whichever port your server uses).

You can also open `index.html` directly, though some features (Service Worker, audio loading) require serving over HTTP.

### Installing as a PWA

When served over HTTPS (or localhost), use your browser's "Install" prompt to add Aurality Studio to your home screen or dock for a standalone app experience.

## Project Structure

```
aurality-studio/
  index.html            Main application (single-page)
  manifest.json         PWA manifest
  sw.js                 Service Worker for offline caching
  aurality-logo.png     Application logo
  css/
    aurality.css        All application styles
  js/
    app.js              Main application class, UI binding, render loop
    audio-engine.js     Core Web Audio graph and routing
    deck.js             Deck implementation (play, cue, loop, scratch)
    mixer.js            Crossfader, EQ, filters, headphone cue
    effects.js          Full FX suite (15+ effects)
    library.js          IndexedDB track library with BPM/key analysis
    waveform.js         Canvas waveform renderer with beat grid
    visualizer.js       Audio-reactive VJ visualizations
    ai-assist.js        AI harmonic mixing and track suggestions
    recorder.js         Performance recording (WebM/Opus)
    stem-separator.js   Real-time stem separation
    practice-mode.js    Beatmatching practice and scoring
    pad-synth.js        808 drum machine and pad synthesizer
    midi.js             DDJ-400 MIDI controller mapping
  GUIDE.md              Extended user guide
```

## Deployment

Aurality Studio is fully static. Deploy to any static hosting provider:

- **GitHub Pages** -- push to a `gh-pages` branch or configure in repo settings
- **Vercel** -- `vercel --prod` from the project root
- **Netlify** -- drag and drop the project folder, or connect the repo
- **Any web server** -- copy all files to the document root

HTTPS is recommended to enable PWA installation and Service Worker caching.

## Funding

Aurality is a 501(c)(3) nonprofit. Development is sustained through grants, donations, and community support. If you would like to contribute to the mission of making professional creative tools accessible, please reach out.

## License

All rights reserved.
