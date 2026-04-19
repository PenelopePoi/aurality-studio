# Aurality Studio -- Complete User Guide

## Table of Contents

- [1. Orientation](#1-orientation)
- [2. Core Concepts in Music Production](#2-core-concepts-in-music-production)
- [3. Interface Tour](#3-interface-tour)
  - [3.1 Start Screen](#31-start-screen)
  - [3.2 Top Bar](#32-top-bar)
  - [3.3 Deck A and Deck B](#33-deck-a-and-deck-b)
  - [3.4 Mixer Section](#34-mixer-section)
  - [3.5 Effects Panel](#35-effects-panel)
  - [3.6 Library Panel](#36-library-panel)
  - [3.7 808 Drum Machine Panel](#37-808-drum-machine-panel)
  - [3.8 Visualizer (VJ Mode)](#38-visualizer-vj-mode)
  - [3.9 AI Mix Assistant](#39-ai-mix-assistant)
  - [3.10 Practice Mode](#310-practice-mode)
- [4. Guided Projects](#4-guided-projects)
  - [Project 1: Your First Mix](#project-1-your-first-mix)
  - [Project 2: Your First Beat](#project-2-your-first-beat)
  - [Project 3: A Complete DJ Set Transition](#project-3-a-complete-dj-set-transition)
  - [Project 4: Making a Trap Beat from Scratch](#project-4-making-a-trap-beat-from-scratch)
  - [Project 5: Vocal Processing Chain](#project-5-vocal-processing-chain)
  - [Project 6: Live Performance with DDJ-400](#project-6-live-performance-with-ddj-400)
  - [Project 7: The Full Production -- A Song That Hits](#project-7-the-full-production----a-song-that-hits)
- [5. Professional Techniques](#5-professional-techniques)
  - [5.1 Arrangement](#51-arrangement)
  - [5.2 Mixing](#52-mixing)
  - [5.3 Mastering Basics](#53-mastering-basics)
  - [5.4 Songwriting Fundamentals](#54-songwriting-fundamentals)
- [6. Troubleshooting and Common Mistakes](#6-troubleshooting-and-common-mistakes)
- [7. Next Steps](#7-next-steps)
- [8. Educational Credit Framework](#8-educational-credit-framework)
  - [8.1 Learning Objectives](#81-learning-objectives)
  - [8.2 Course Equivalence](#82-course-equivalence)
  - [8.3 Portfolio Deliverables](#83-portfolio-deliverables)
  - [8.4 Self-Assessment Checkpoints](#84-self-assessment-checkpoints)
- [Appendix A: Keyboard Shortcuts](#appendix-a-keyboard-shortcuts)
- [Appendix B: Glossary](#appendix-b-glossary)
- [Appendix C: Genre BPM and Key Reference](#appendix-c-genre-bpm-and-key-reference)

---

## 1. Orientation

### What Aurality Studio Is

Aurality Studio is a web-based music production application and DJ system that runs entirely in your Chrome browser. It uses something called the Web Audio API (a set of tools built into Chrome for generating and processing sound) to give you two virtual turntables, a mixer, a drum machine, effects processing, and an AI assistant -- all without installing any software.

You can use it to mix songs together like a DJ, build beats from scratch using synthesized drum sounds, apply audio effects like reverb and delay to tracks, record your performances, and visualize your music in real time.

### What You Will Be Able to Do After Finishing This Guide

- Load audio files and mix them together using two decks
- Beatmatch (align the tempos of two songs so they play in sync)
- Use EQ, filters, and effects to create smooth transitions between tracks
- Program drum patterns using the built-in 808 and 909 drum machines
- Create melodies and bass lines using the synthesizer
- Record and export your mixes
- Understand how professional producers and DJs think about sound
- Build a complete song from scratch using the tools in Aurality Studio

### Time Estimates

| Section | Estimated Time |
|---------|---------------|
| Section 2: Core Concepts | 20 minutes |
| Section 3: Interface Tour | 30 minutes |
| Project 1: Your First Mix | 20 minutes |
| Project 2: Your First Beat | 30 minutes |
| Project 3: DJ Set Transition | 45 minutes |
| Project 4: Trap Beat | 60 minutes |
| Project 5: Vocal Processing | 45 minutes |
| Project 6: DDJ-400 Performance | 60 minutes |
| Project 7: Full Production | 90 minutes |
| Section 5: Professional Techniques | 40 minutes |

### System Requirements

- **Browser**: Google Chrome (version 80 or later). Other Chromium-based browsers like Edge or Brave may work but are not guaranteed.
- **Operating system**: macOS, Windows, or Linux -- anything that runs Chrome.
- **Audio output**: Headphones or speakers connected to your computer. Headphones are strongly recommended for mixing because they let you hear details that speakers in a room will blur.
- **Audio files**: MP3, WAV, FLAC, OGG, AAC, M4A, or WebM files on your computer. You need at least two songs to practice mixing.
- **Optional hardware**: Pioneer DDJ-400 DJ controller. Aurality Studio has full MIDI mapping for this controller, but everything can be done with your mouse and keyboard.
- **RAM**: At least 4 GB. Audio processing uses real memory.

### How to Launch

Open your terminal (Terminal on macOS, Command Prompt or PowerShell on Windows) and run:

```
cd ~/aurality-studio && python3 -m http.server 8080
```

Then open Chrome and go to `http://localhost:8080`.

If you do not have Python installed, you can also use Node.js:

```
cd ~/aurality-studio && npx serve -p 8080
```

Or simply open the `index.html` file directly in Chrome by dragging it into a browser window. The local server method is recommended because some browser features (like MIDI access) work more reliably when served over HTTP.

---

## 2. Core Concepts in Music Production

These are the ten foundational ideas that every professional music producer uses without thinking about them. If you understand these, you will understand why every knob, slider, and button in Aurality Studio exists.

### 1. Sound

Sound is vibrations traveling through air. When something vibrates -- a guitar string, a speaker cone, your vocal cords -- it pushes air molecules back and forth in waves. Those waves travel to your ear, which converts them into electrical signals your brain interprets as sound. Analogy: drop a stone in still water and watch the ripples spread outward. Sound works the same way, except the ripples are invisible pressure waves in air, spreading in all directions from the source.

### 2. Frequency (Pitch)

Frequency is how fast those vibrations cycle back and forth, measured in Hertz (Hz), which means "cycles per second." A vibration cycling 440 times per second (440 Hz) produces the note A above middle C. Low frequencies (20-200 Hz) are what you feel in your chest -- bass rumbles, kick drums, the low end of a piano. Mid frequencies (200-2000 Hz) are where the human voice lives and where most instruments have their main body. High frequencies (2000-20000 Hz) are the sparkle, the sizzle, the crispness -- cymbals, the "s" sound in speech, the shimmer of a synth. Analogy: a thick, heavy guitar string vibrates slowly and produces a low note. A thin, tight string vibrates quickly and produces a high note.

### 3. Amplitude (Volume)

Amplitude is how big the vibrations are -- how much energy is in the wave. Bigger vibrations mean louder sound. Volume is measured in decibels (dB), which is a relative scale. Zero dB in digital audio means the absolute maximum level before the sound distorts (clips). Negative numbers are quieter. Every reduction of about 6 dB cuts the perceived loudness roughly in half. Analogy: whispering versus shouting. You are saying the same words with the same pitch, but the energy behind them is completely different.

### 4. Waveforms

A waveform is the shape of the vibration over time, and that shape determines the character (or "timbre") of the sound. There are four basic waveform shapes used in electronic music production. A **sine wave** is a perfectly smooth curve that produces a pure, clean tone -- think of a flute playing a single note. A **square wave** alternates sharply between two levels, creating a buzzy, hollow sound -- think of 8-bit video game music. A **sawtooth wave** ramps up gradually then drops sharply, producing a bright, rich, harmonically complex sound -- think of a brass instrument. A **triangle wave** rises and falls in straight lines, creating something between a sine and a square -- soft and hollow, like a recorder. In Aurality Studio's synthesizer, you can switch between these four shapes and hear the difference immediately.

### 5. Tempo (BPM)

Tempo is the speed of music, measured in beats per minute (BPM). It is the heartbeat of a song. At 60 BPM, you get one beat every second -- a slow, walking pace. At 120 BPM, you get two beats per second -- a brisk jog. At 180 BPM, three per second -- a sprint. Different genres live at different tempos: hip-hop typically sits between 80 and 100 BPM, house music between 120 and 130, techno between 125 and 140, and drum and bass between 160 and 180. When you are mixing two songs together, their tempos need to match, or one will be racing ahead of the other. Aurality Studio automatically detects the BPM of any track you load.

### 6. Rhythm

Rhythm is the pattern of sound and silence within time. It is not just about speed (that is tempo) -- it is about *where* the sounds land and where the silences are. In most Western popular music, there are four beats per bar (a bar is a repeating unit of time). The kick drum typically falls on beats 1 and 3, the snare on beats 2 and 4. That pattern -- kick, snare, kick, snare -- is the backbone of pop, rock, hip-hop, and electronic music. Changing where the hits land changes the feel of the music entirely. The gap between two sounds can be as important as the sounds themselves.

### 7. Melody

A melody is a sequence of individual pitches arranged in time to form a recognizable tune. It is the part of a song you hum, whistle, or sing along to. Melodies are built from scales -- ordered sets of notes that sound pleasing when played together. The most common scales in Western music are the major scale (which sounds bright and resolved) and the minor scale (which sounds darker and more emotional). A melody moves up and down through the notes of a scale, creating patterns of tension and release. The simplest melodies are often the most effective -- think of the opening four notes of Beethoven's Fifth Symphony.

### 8. Harmony

Harmony is what happens when multiple pitches sound at the same time. A chord is a specific combination of simultaneous pitches. Major chords (built from the root, the note four half-steps up, and the note seven half-steps up) sound bright, stable, and happy. Minor chords (root, three half-steps up, seven half-steps up) sound darker, sadder, and more emotional. The choice between major and minor harmony is the single biggest factor in the emotional character of a piece of music. Chord progressions -- sequences of chords -- create the emotional arc of a song. In Aurality Studio's Chord Pad mode, you can play major, minor, seventh, diminished, augmented, and suspended chords with a single button press.

### 9. Key

The key of a song is its "home base" -- the central pitch and scale that the entire song is organized around. A song in the key of C major uses the notes C, D, E, F, G, A, and B, and the note C feels like "home" whenever it appears. If two songs are in the same key or in compatible keys, they will sound good played together. If they are in clashing keys, the combination will sound harsh and wrong. DJs use a tool called the **Camelot wheel** to quickly identify compatible keys. The Camelot wheel assigns every key a number (1-12) and a letter (A for minor, B for major). Keys with the same number, or numbers one step apart, are compatible. Aurality Studio automatically detects the key of every track you load and displays it in Camelot notation.

### 10. Signal Flow

Signal flow is the path sound takes from its point of creation to your ears. In Aurality Studio, the chain is: audio source (a loaded track or the drum machine) flows into the trim control (initial volume adjustment), then through the three-band EQ (which shapes the frequency balance), then through the filter (which can remove high or low frequencies), then through effects (reverb, delay, and so on), then into the channel fader (the main volume control for that channel), then through the crossfader (which blends between the two decks), then through the master compressor (which controls the overall dynamic range), then through the master volume, and finally out to your speakers. Understanding this chain is fundamental. When something sounds wrong, trace the signal path step by step until you find where the problem is.

---

## 3. Interface Tour

This section walks through every panel and control in Aurality Studio. Open the app in Chrome and follow along.

### 3.1 Start Screen

When you first open Aurality Studio, you see a dark screen with the words "AURALITY STUDIO" in a gradient text (cyan to magenta), "PROFESSIONAL DJ APPLICATION" below it, and a large START button.

The START button is not decorative. Chrome requires a user interaction before it will allow audio to play (this is a browser security policy to prevent websites from blasting sound at you without permission). Clicking START creates the audio context -- the internal engine that processes all sound. Nothing works until you click it.

Below the START button is a small status line that will show initialization progress.

After you click START, the start screen fades away and the full interface appears.

### 3.2 Top Bar

The top bar runs across the entire width of the screen. From left to right:

**AURALITY STUDIO logo** -- just branding, not a button.

**MIDI status indicator** -- a small dot and the text "No MIDI." When you connect a DDJ-400 or another MIDI controller, the dot turns green and shows the device name. If you do not have a MIDI controller, ignore this entirely.

**REC button** -- starts and stops recording your entire output. When recording is active, the button turns red and a recording indicator appears showing elapsed time. Everything that comes out of the master output is captured. When you stop recording, you get a prompt to download the recording as a WebM audio file. You can also use Ctrl+R (or Cmd+R on Mac) to toggle recording.

**VJ button** -- opens the visualizer panel, a full-screen canvas that displays audio-reactive graphics. The visuals respond to the music in real time. See section 3.8.

**AI button** -- opens the AI Mix Assistant panel, which suggests the next track to play based on key and BPM compatibility, and recommends transition techniques. See section 3.9.

**PRACTICE button** -- activates Practice Mode, which scores your beatmatching and transitions in real time and gives you improvement tips. See section 3.10.

**808 button** (orange) -- opens the 808 Drum Machine / Synth panel, a floating window with drum pads, a synthesizer, and a step sequencer. See section 3.7.

**MASTER volume slider** -- controls the final output volume of everything. The range goes from 0 (silence) to 1.5 (150%, which adds gain -- use carefully to avoid distortion).

**Master meter** -- a small canvas showing the current output level. Green is safe. If it is constantly maxed out, turn down the master volume.

### 3.3 Deck A and Deck B

Aurality Studio has two decks -- Deck A on the left and Deck B on the right. They are functionally identical. Each deck is a complete virtual turntable that can load, play, and manipulate one audio track.

#### Deck Header

At the top of each deck you will find:

- **Deck label** (DECK A or DECK B)
- **BPM display** -- shows the detected tempo of the loaded track. Aurality uses peak detection and autocorrelation analysis of the low-frequency content to automatically calculate the BPM when a track loads. The display shows "---" when no track is loaded.
- **TAP button** -- lets you manually set the BPM by tapping in time with the music. Tap at least four times. Aurality calculates the average interval between your taps and converts it to BPM. If you stop tapping for more than two seconds, the tap counter resets.
- **Key display** -- shows the detected musical key in Camelot notation (for example, "8B" for C major, "5A" for C minor). The detection uses a Goertzel-based chromagram analysis correlated against the Krumhansl-Kessler key profiles.
- **Time display** -- current playback position in minutes:seconds.
- **Remaining display** -- time remaining until the track ends, shown as a negative value.
- **Track name and artist** -- extracted from the filename. If your file is named "Artist Name - Track Title.mp3," Aurality splits on the dash and displays the artist and title separately.

#### Waveform Display

Below the header are two waveform displays:

**Main waveform** -- a scrolling, detailed view of the audio near the current playback position. The waveform is color-coded:
- Deck A uses cyan; Deck B uses magenta
- The vertical height of the waveform at each point represents the amplitude (volume) at that moment
- Vertical lines show the beat grid (evenly spaced markers based on the detected BPM)
- Hot cue positions appear as colored markers
- Loop regions are highlighted in green
- The cue point appears as an orange marker
- A white vertical line marks the current playback position (the playhead)

You can click anywhere on the waveform to jump (seek) to that position. Click and drag to scratch.

**Overview waveform** -- a smaller, zoomed-out view of the entire track. A position indicator shows where you are in the song. This lets you see the overall structure at a glance -- where the drops are, where the breakdowns happen, where the track is quiet or loud.

#### Transport Controls

Below the waveform:

- **Play button** (triangle icon) -- starts or pauses playback. When playing, the button is highlighted. Keyboard: Space for Deck A, Enter for Deck B.
- **CUE button** -- if the track is playing, CUE sets a cue point (a saved position you can jump back to) at the current location and pauses. If the track is stopped, CUE jumps to the saved cue point. Keyboard: Q for Deck A, P for Deck B.
- **SYNC button** -- automatically adjusts this deck's playback speed to match the BPM of the other deck. This is the easy way to beatmatch. Keyboard: W for Deck A, O for Deck B.
- **SLIP button** -- toggles slip mode. When slip mode is on and you scratch, loop, or otherwise manipulate the playback position, the track's "real" position continues advancing silently in the background. When you release, playback snaps back to where the track would have been if you had not touched it. This lets you do tricks without losing your place.
- **BRK button** -- brake effect. Simulates the sound of a turntable slowing down and stopping over about two seconds.
- **SPIN button** -- spinback effect. The track rapidly reverses at increasing speed over half a second, then stops. Classic DJ transition sound.

#### Pitch/Tempo Slider

A vertical slider that adjusts the playback speed of the track. Moving it up speeds the track up (higher pitch, faster tempo); moving it down slows it down. The current pitch adjustment is displayed as a percentage.

Below the slider is a range selector with four options:
- **+/-6%** -- the default. Fine control for small adjustments. Enough for most beatmatching.
- **+/-10%** -- wider range for bigger tempo differences.
- **+/-16%** -- very wide range.
- **WIDE** -- full range up to +/-100%. The track can be played at anything from zero speed to double speed.

#### Loop Controls

Two rows of buttons:

**Manual loop row:**
- **IN** -- sets the loop start point at the current playback position.
- **OUT** -- sets the loop end point at the current playback position. If IN was already set, the loop activates immediately.
- **LOOP** -- toggles the loop on or off. When a loop is active, playback cycles between the IN and OUT points indefinitely.

**Auto-loop row:**
Buttons labeled 1/32, 1/16, 1/8, 1/4, 1/2, 1, 2, 4, 8, and 16. Each sets an automatic loop starting from the current position, with the length measured in beats. For example, pressing "4" at 120 BPM creates a loop exactly 4 beats long (2 seconds). Pressing "1/4" creates a loop one quarter-beat long -- a rapid stutter effect. The loop size is calculated from the detected BPM, so BPM detection must be accurate for these to work correctly.

#### Hot Cue Buttons (1-8)

Eight numbered buttons below the loop controls. Each stores a position in the track that you can jump to instantly.

- **Click an empty hot cue** -- saves the current playback position to that slot. The button lights up to show it is set.
- **Click a set hot cue** -- instantly jumps to that saved position. If the track is paused, it also starts playing.
- **Right-click a set hot cue** -- deletes it.
- **Keyboard**: keys 1 through 8 trigger hot cues on Deck A. Shift+1 through Shift+8 trigger hot cues on Deck B.

Hot cues are saved per track in the browser's IndexedDB, so they persist between sessions.

#### Stems Section

Four buttons labeled BASS, DRUMS, VOX (vocals), and MELODY. These control a frequency-band stem separator that splits the audio into four frequency ranges:

- **BASS** -- frequencies below 250 Hz. Kick drums, bass guitars, sub-bass synths.
- **DRUMS** -- frequencies from 250 Hz to 4000 Hz, weighted toward transient content. Snares, toms, the body of the kick.
- **VOX** -- frequencies from 300 Hz to 4000 Hz with a mid-frequency boost around 1500 Hz. Vocal content.
- **MELODY** -- frequencies above 4000 Hz. Hi-hats, cymbals, high synths, the "air" of the mix.

Click a button to mute that stem. Click again to unmute. When muted, the button appears dimmed. This is not true AI stem separation (which would require a machine learning model) -- it is real-time frequency filtering that approximates stem isolation. It works well enough for performance use but is not surgical. Bass and vocal isolation are the most effective; drums and melody overlap significantly.

#### Effects Grid

Nine effect buttons per deck: REVERB, DELAY, FLANGE, PHASE, CHORUS, CRUSH, ECHO, COMP, and DE-ESS. Click to toggle each effect on or off. See section 3.5 for what each does.

### 3.4 Mixer Section

The mixer sits between Deck A and Deck B. It controls how the audio from both decks is blended together.

#### Channel A and Channel B Strips

Each channel strip contains, from top to bottom:

**TRIM** -- a small horizontal slider that adjusts the input gain before EQ. Range: 0 to 2x (double volume). This is used to match the loudness of two tracks that were mastered at different levels. If track B is quieter than track A, turn up track B's trim so they are equally loud before you start mixing.

**EQ Section (HI, MID, LO)** -- three horizontal sliders that boost or cut specific frequency ranges.
- **HI** (high shelf at 3200 Hz) -- controls the treble. Cymbals, hi-hats, vocal sibilance, synth sparkle.
- **MID** (peaking at 1000 Hz) -- controls the midrange. Vocals, guitars, snare body, synth leads.
- **LO** (low shelf at 320 Hz) -- controls the bass. Kick drum, bass line, sub-bass.

The range for each is -26 dB (nearly silent -- called a "kill") to +6 dB (boosted). Double-click any EQ slider to reset it to 0 (flat/neutral).

EQ is the single most important mixing tool. Most DJ transitions involve manipulating the EQ on both channels simultaneously -- typically cutting the bass on one track while bringing in the bass of the other, so you never have two bass lines fighting each other.

**FLT (Filter)** -- a horizontal slider that controls a sweepable filter. The center position (0.5) means no filtering. Moving the slider left applies a low-pass filter (removes high frequencies, making the sound muffled and dark). Moving it right applies a high-pass filter (removes low frequencies, making the sound thin and airy). Filter sweeps are a bread-and-butter DJ technique for building tension and creating transitions.

**CUE button** -- toggles headphone monitoring for this channel. When active, the pre-fader audio from this channel is sent to the headphone output. This lets you listen to the next track in your headphones while the audience hears the current track through the speakers. (Note: headphone monitoring requires a multi-output audio setup.)

**Channel fader** -- a vertical slider that controls the volume of this channel. Range: 0 (silent) to 1.25 (125%). This is the main volume control for the channel, applied after EQ and filter.

**VU meter** -- a vertical bar next to the fader that shows the current audio level for this channel in real time. Higher is louder. If it is constantly maxed out, reduce the trim or fader.

#### Master VU

Between the two channel strips, a small VU meter labeled MST shows the combined master output level.

#### Crossfader

At the bottom of the mixer:

**Crossfader** -- a horizontal slider that blends between Deck A and Deck B. All the way left = only Deck A is audible. All the way right = only Deck B is audible. Center = both decks are audible at equal volume. This is the primary tool for transitioning between tracks.

**Crossfader curve selector** -- a dropdown with three options:
- **Smooth Curve** -- gradual blend. Both tracks are always partially audible near the center. Good for long, smooth transitions.
- **Sharp Cut** -- aggressive curve. Each side cuts out quickly near the edges. Good for scratching and quick cuts.
- **Constant Power** -- maintains a consistent total volume across the entire crossfader range. Technically the most "correct" curve, using a cosine/sine relationship.

### 3.5 Effects Panel

Each deck has nine effects that can be toggled on and off. Here is what each one does, what it sounds like, and when to use it.

**REVERB** -- simulates the sound of a physical space. The audio is processed through a synthetic impulse response (a mathematical model of how sound bounces around in a room). With the default settings, it sounds like a medium-sized hall with a 2.5-second decay. The effect has a wet/dry mix that blends between the original (dry) signal and the reverberated (wet) signal. Use reverb on vocals to add depth and space. Use it at the end of a phrase to let the last note trail off into a wash of reflections. Avoid using too much -- it makes everything sound distant and muddy.

**DELAY** -- repeats the audio at a set time interval. The default is a 0.5-second delay with 40% feedback (each repeat is 40% quieter than the last) filtered through a low-pass at 8000 Hz (so the repeats get progressively darker and softer). This creates an echo effect. Use it to add rhythmic depth to vocals or synth leads. Syncing the delay time to the BPM of your track makes the echoes fall on the beat, which sounds intentional rather than chaotic.

**FLANGE (Flanger)** -- creates a sweeping, jet-engine-like effect by mixing the original audio with a slightly delayed copy, where the delay time is constantly changing (modulated by a slow oscillator at 0.5 Hz). The sound sweeps up and down through the frequency spectrum. Use it for transitions -- a flanger sweep over 4 bars creates dramatic movement.

**PHASE (Phaser)** -- similar to a flanger but uses a chain of six all-pass filters instead of a delay line. Produces a thinner, more subtle sweeping effect -- more "whooshy" than a flanger's "jet engine." Use it to add movement to pads and sustained sounds.

**CHORUS** -- thickens the sound by creating three slightly detuned and delayed copies of the original audio, each modulated by its own oscillator at slightly different rates. The result sounds like multiple voices or instruments playing the same part. Use it to make thin synth sounds bigger and wider.

**CRUSH (Bit Crusher)** -- deliberately reduces the audio quality by lowering the bit depth (from the standard 16 or 24 bits down to as few as 1 bit) and sample rate. The default is 8-bit at one-quarter sample rate. The sound becomes harsh, noisy, and digital -- think early video game audio or glitchy electronic music. Use it as a special effect or to completely destroy a sound before dropping into something clean.

**ECHO (Echo Out)** -- a specific type of delay designed for ending a track. It has a longer feedback value (70%) and deliberately lets the echoes build and wash out. When you activate echo out, the current audio trails off into a cascade of repeating echoes. This is the classic "echo out" technique for ending a DJ mix section -- hit ECHO, then stop the track, and let the echoes decay naturally while you bring in the next song.

**COMP (Compressor)** -- reduces the dynamic range of the audio (the difference between the quietest and loudest parts). The compressor has a threshold of -24 dB, a ratio of 4:1, a fast attack of 3 ms, and a release of 250 ms. When the audio exceeds the threshold, the compressor reduces its volume by the ratio (so audio 4 dB above threshold is reduced to 1 dB above). This makes loud parts quieter and, when you turn up the overall level to compensate, makes quiet parts louder. The result is a more consistent, punchy sound. Use it on vocals to keep them at a steady volume, or on the master output for a tighter, more controlled mix.

**DE-ESS (De-Esser)** -- a specialized compressor that targets sibilance -- the harsh "s," "sh," and "t" sounds in speech and singing that live around 6000 Hz. The de-esser uses a bandpass filter tuned to 6000 Hz to detect sibilance, then compresses only when those frequencies are present. Use it on vocals to tame harsh consonant sounds without affecting the rest of the voice.

Additional effects exist in the code that are not directly mapped to deck buttons but are available through the effects engine: **AutoTune** (pitch correction that snaps vocal pitches to the nearest note in a chosen key and scale), **Pitch Shift** (raises or lowers pitch by semitones or cents without changing tempo), **Beat Repeat** (captures a short segment of audio and repeats it rapidly for a stutter effect), and **Noise Gate** (silences audio that falls below a threshold -- useful for cutting background noise).

### 3.6 Library Panel

The library panel runs along the bottom of the screen. It is where you manage, browse, and load your audio files.

#### Importing Tracks

There are two ways to get audio files into Aurality Studio:

1. **Drag and drop** -- drag audio files directly from your computer's file manager onto the Aurality Studio window. A blue overlay appears saying "Drop audio files to import." Accepted formats: MP3, WAV, FLAC, OGG, AAC, M4A, WebM. If you drop files directly onto a specific deck, the last imported file automatically loads into that deck.

2. **Import button** -- click the "+ Import" button in the library toolbar. A file picker opens. Select one or more audio files.

Imported tracks are stored in your browser's IndexedDB (a local database built into Chrome). They persist between sessions -- you do not need to re-import them every time you open the app. But they are tied to that specific browser profile and that specific computer.

#### Track Metadata

When you import a track, Aurality reads the filename and attempts to extract the artist and title. Files named in the format "Artist - Title.mp3" are parsed automatically. BPM and key are detected when the track is loaded into a deck, and those values are saved back to the library for future reference.

Each track entry shows:
- Artist name
- Track title
- BPM (after detection)
- Key in Camelot notation (after detection)
- Duration
- Genre (if manually set)

#### Search, Sort, Filter

**Search bar** -- type to filter tracks. Searches across artist name, track title, genre, and key.

**Column headers** -- click any column header (Artist, Title, BPM, Key, Time, Genre) to sort the library by that field. Click the same header again to reverse the sort direction.

#### Tabs

- **All Tracks** -- shows every imported track, with a count.
- **Playlists** -- shows your saved playlists (collections of tracks). You can create playlists and add tracks to them.
- **History** -- shows the last 500 tracks you played, most recent first.

#### Loading a Track to a Deck

Each track in the library has two load buttons: **A** and **B**. Click A to load the track into Deck A, or B for Deck B. When a track loads, Aurality:
1. Decodes the audio data
2. Generates the waveform display
3. Detects the BPM using low-frequency peak analysis
4. Detects the musical key using chromagram correlation
5. Generates a beat grid (evenly spaced markers based on BPM)
6. Loads any previously saved cue points and hot cues
7. Records the play to your history

### 3.7 808 Drum Machine Panel

Click the orange 808 button in the top bar to open the drum machine. It appears as a floating panel in the center of the screen.

#### Mode Selector

Six mode buttons at the top of the panel:

- **TR-808** -- classic Roland TR-808 drum machine sounds. The original analog drum machine from 1980 that defined hip-hop, trap, and electronic music. Eight pads: Kick, Snare, Clap, HiHat Closed, HiHat Open, Tom Low, Tom High, Cowbell. All sounds are synthesized in real time using oscillators and noise generators -- no audio samples needed.

- **TR-909** -- Roland TR-909 sounds. The drum machine that defined house, techno, and trance. Eight pads: Kick (punchier and shorter than the 808), Snare (brighter, with more noise), Clap, HiHat Closed, HiHat Open, Ride, Crash, Rim. The 909 kick has an added click transient for extra attack.

- **Kaossilator** -- a melodic synthesizer mode inspired by the Korg Kaossilator. Each pad plays a different note from the selected scale. The synth uses two detuned oscillators (for a thick sound) through a resonant low-pass filter with a full ADSR envelope (attack, decay, sustain, release -- the shape of how the sound begins, sustains, and fades). Hold a pad to sustain the note; release to let it fade.

- **808 Bass** -- a bass synthesizer optimized for deep sub-bass tones. Each pad plays a note one octave lower than Kaossilator mode. Uses a sawtooth oscillator paired with a sine sub-oscillator through a resonant filter with an aggressive filter envelope that sweeps from bright to dark. This is the sound of trap and modern hip-hop bass.

- **Chord Pad** -- each pad plays a full chord (multiple notes simultaneously). The eight pads are: Major, Minor, Major 7th, Minor 7th, Dominant 7th, Diminished, Augmented, Suspended 4th. All chords are built from the selected root note. This lets you sketch chord progressions without knowing music theory -- just listen and pick the ones that sound right together.

- **Step Seq** (Step Sequencer) -- a grid-based pattern programmer. Each row represents one drum sound; each column represents one sixteenth-note step in a one-bar pattern. Click cells to activate or deactivate them. When the sequencer plays, it moves from left to right, triggering any active sounds at each step. This is the classic way drum machines have worked since the 1970s.

#### Pad Grid

Eight large pads arranged in a 4x2 grid. Their function changes based on the selected mode:
- In drum modes (808/909): each pad triggers a different drum sound when clicked.
- In synth modes (Kaossilator/Bass/Chord): each pad plays a different pitch or chord. Hold to sustain, release to stop.
- In sequencer mode: each pad selects a drum sound to program.

The keyboard keys Z, X, C, V, B, N, M, and comma (,) can be used to trigger the eight pads.

#### Synth Controls

Below the pad grid:

- **Scale** -- select from Chromatic, Major, Minor, Pentatonic, Blues, Dorian, Mixolydian, or Phrygian. This determines which notes the pads play in Kaossilator, Bass, and Chord modes. Start with Pentatonic if you want everything to sound good together -- the pentatonic scale has no "wrong" notes.

- **Wave** -- select the oscillator waveform: Saw (bright, rich), Square (buzzy, hollow), Sine (pure, clean), or Triangle (soft, mellow).

- **Root** -- the base note for the scale: C2 (deep), C3 (low), C4 (middle), C5 (high). This shifts all pad notes up or down.

- **Filter** -- a slider from 100 Hz to 10000 Hz that controls the cutoff frequency of the low-pass filter. Lower values make the sound darker and more muffled; higher values let more brightness through.

- **BPM** -- sets the tempo for the step sequencer. Type a number between 60 and 200.

- **SEQ play button** -- starts or stops the step sequencer.

#### Step Sequencer Grid

When visible, this is a grid with 8 rows (one per drum sound) and 16 columns (one per sixteenth-note step). Click any cell to toggle it on or off. When the sequencer is running, a highlight moves across the columns to show the current step. Any active cell triggers its drum sound as the highlight passes over it.

The sequencer tempo is independent of the deck tempo. To synchronize them, manually set the sequencer BPM to match your playing track.

### 3.8 Visualizer (VJ Mode)

Click the VJ button in the top bar to open a full-screen canvas overlay displaying audio-reactive graphics. The visualizer analyzes the master audio output in real time and translates frequency and amplitude data into moving, colorful patterns.

Five visualization modes cycle when you click the visualizer:

1. **Spectrum** -- vertical bars representing the frequency content of the audio, like a graphic equalizer. Low frequencies on the left, high on the right. Bars change color as they move across the spectrum. Beat detection triggers white flash effects.

2. **Waveoscope** -- an oscilloscope-style view showing the raw audio waveform as a flowing line. The line moves in real time with the sound waves, with a neon glow effect.

3. **Particles** -- an explosion of particles from the center of the screen, triggered by bass hits. Particles fly outward, fade, and die. Heavy bass = more particles. The colors shift with beat detection.

4. **Tunnel** -- a geometric tunnel effect that pulsates with the music. Hexagonal rings recede into the center, their size and brightness modulated by different frequency bands.

5. **Kaleidoscope** -- a rotating mandala pattern built from frequency data. Eight symmetrical slices create an ever-shifting kaleidoscope that responds to every element of the music.

The visualizer is purely visual -- it does not affect the audio in any way. Press V on the keyboard or click VJ again to toggle it off.

### 3.9 AI Mix Assistant

Click the AI button in the top bar to open the AI panel on the right side of the screen. The AI assistant uses rule-based analysis (not a neural network) to provide mixing guidance in three areas:

**Next Track Suggestions** -- when a track is loaded on either deck, the AI scores every track in your library based on three factors: key compatibility (using the Camelot wheel -- same key, adjacent keys, or relative major/minor get highest scores), BPM compatibility (within 2% is ideal, within 5% is good, within 10% is acceptable, and half/double time relationships are also recognized), and energy flow (the AI prefers gradual energy increases and penalizes large energy drops). Each suggestion shows the track name, score, and the reasons it was recommended.

**Transition Suggestions** -- when both decks have tracks loaded, the AI analyzes the BPM difference, key compatibility, and relative energy levels to recommend specific transition techniques:
- **Long harmonic blend** -- recommended when keys are compatible and BPMs match closely. Technique: swap bass EQs gradually over 16-32 bars.
- **Echo out** -- recommended when dropping energy. Technique: activate echo on the outgoing track, sweep a filter, fade in the new track clean.
- **Hard cut** -- recommended when both tracks share the same key and tempo. Technique: cue the new track to its first beat, cut the crossfader on a downbeat.
- **Filter sweep** -- recommended when BPMs are within 5%. Technique: high-pass the outgoing track while low-passing the incoming track, then swap.
- **BPM ride** -- recommended when tempos differ by 3-10%. Technique: gradually pitch-match over 16 bars, then blend.

**Smart Playlist** -- click "Generate Smart Playlist" to have the AI build an ordered playlist from your library. It selects tracks with compatible keys and BPMs, arranged to create a gradually building energy arc. You need tracks in your library for this to work.

### 3.10 Practice Mode

Click PRACTICE in the top bar to start a practice session. During the session, Aurality silently monitors your mixing and scores your performance.

The scoring evaluates three metrics:

- **BPM Accuracy (40% of score)** -- how closely matched are the effective BPMs of both decks? You lose 20 points for every BPM difference. Within 0.5 BPM = excellent.

- **Phase Alignment (40% of score)** -- are the beats of both tracks landing at the same time? Even with matching BPMs, the tracks can be "out of phase" (the beats are aligned to different points in time). Aurality measures how close the beat positions are.

- **Key Compatibility (20% of score)** -- are the tracks in compatible keys according to the Camelot wheel? You get 100 points for compatible keys, 50 for incompatible.

Scores are graded: S (95+), A+ (90-94), A (85-89), B+ (80-84), B (70-79), C (60-69), D (50-59), F (below 50).

When you end the session (click PRACTICE again), you see your overall score, grade, and personalized tips. If your score is below 60, the tips focus on basic beatmatching skills. Between 60 and 80, they suggest EQ techniques and longer blends. Above 80, they encourage advanced techniques like filter sweeps and harmonic mixing.

Session history is stored so you can track your improvement over time.

---

## 4. Guided Projects

Each project builds on the skills from previous ones and produces a finished recording you can keep.

### Project 1: Your First Mix

**Level**: Beginner | **Time**: ~20 minutes | **Deliverable**: A recorded two-track blend

**What you will learn**: Loading tracks, playing and pausing, matching BPM, using the crossfader, recording output.

**Step 1 -- Prepare two audio files.** Find two songs on your computer that you like. MP3 or WAV format. Ideally pick two songs in a similar genre -- do not try to mix a country ballad with a drum-and-bass track for your first attempt. Songs around 120 BPM are easiest to work with.

**Step 2 -- Launch Aurality Studio.** Open Chrome, go to localhost:8080 (or however you are running it), and click START.

**Step 3 -- Import your tracks.** Drag both audio files from your file manager onto the Aurality Studio window. They appear in the library at the bottom.

**Step 4 -- Load Track A.** In the library, find your first song. Click the "A" button on its row. The track loads into Deck A. Watch the waveform appear. The BPM and key are detected and displayed.

**Step 5 -- Load Track B.** Find your second song in the library. Click the "B" button. It loads into Deck B.

**Step 6 -- Play Track A.** Click the Play button on Deck A (or press Space). The track starts playing. You should hear it through your speakers or headphones. The waveform scrolls and the time display updates.

**Step 7 -- Match the BPM.** Look at the BPM display on both decks. If they are different, click the SYNC button on Deck B. Deck B's playback speed adjusts to match Deck A's tempo. The pitch percentage will change to reflect the speed adjustment.

**Step 8 -- Start recording.** Click the REC button in the top bar. It turns red. A timer appears showing the recording duration.

**Step 9 -- Play Track B.** With Track A already playing, click Play on Deck B (or press Enter). Both tracks are now playing simultaneously. The crossfader is in the center, so you hear both at equal volume.

**Step 10 -- Crossfade.** Slowly drag the crossfader from the center position toward the right (toward B). Listen as Track A gets quieter and Track B gets louder. Take about 15-30 seconds to move it all the way to the right. You have just performed your first mix transition.

**Step 11 -- Stop recording.** Click REC again. A dialog appears asking if you want to download the recording. Click OK. A WebM audio file is saved to your downloads folder.

**Congratulations.** You just made your first DJ mix. It probably was not perfect -- the beats may have drifted, the key may have clashed, the crossfade may have been too fast or too slow. That is completely fine. You now know the basic mechanical process. Every subsequent project refines your technique.

**Self-check**: Play back your recording. Can you hear the moment where both tracks are playing simultaneously? Does it sound like one continuous piece of music, or does it sound like two songs fighting each other? If it sounds like a fight, your BPMs may not have been perfectly matched, or the keys may have clashed.

---

### Project 2: Your First Beat

**Level**: Beginner | **Time**: ~30 minutes | **Deliverable**: A recorded beat pattern

**What you will learn**: Using the 808 drum machine, understanding rhythm patterns, step sequencer basics.

**Step 1 -- Open the 808 panel.** Click the orange 808 button in the top bar. The drum machine panel appears.

**Step 2 -- Select TR-808 mode.** Make sure the TR-808 mode button is active (it should be by default).

**Step 3 -- Learn the sounds.** Click each pad one at a time and listen: Kick (pad 1) -- a deep, booming bass thump. Snare (pad 2) -- a sharp crack with a tail of noise. Clap (pad 3) -- multiple short noise bursts creating a hand-clap sound. HiHat Closed (pad 4) -- a short, tight tick. HiHat Open (pad 5) -- a longer, splashy wash. Tom Low (pad 6) -- a deep pitched drum. Tom High (pad 7) -- a higher pitched drum. Cowbell (pad 8) -- a bright metallic ping.

**Step 4 -- Switch to Step Sequencer mode.** Click the "Step Seq" mode button. A grid appears with 8 rows and 16 columns. Each row is one drum sound. Each column is one sixteenth-note step in a one-bar pattern.

**Step 5 -- Set the tempo.** Set the BPM to 90 (a good hip-hop tempo). Type 90 in the BPM field.

**Step 6 -- Program the kick drum.** In the Kick row, click the cells at positions 1, 5, 9, and 13. This puts a kick drum on every beat (1, 2, 3, 4) -- the four beats of the bar.

**Step 7 -- Program the snare.** In the Snare row, click positions 5 and 13. This puts snares on beats 2 and 4 -- the "backbeat" that drives most popular music.

**Step 8 -- Program the hi-hat.** In the HiHat Closed row, click every other position: 1, 3, 5, 7, 9, 11, 13, 15. This creates a steady eighth-note hi-hat pattern.

**Step 9 -- Press SEQ to play.** Click the play button. The pattern loops. Listen to your beat. You should hear: boom-tick-CRACK-tick-boom-tick-CRACK-tick. This is the fundamental pattern of hip-hop.

**Step 10 -- Add variation.** Try adding a kick at position 11 (the "and" of beat 3). This is the "boom-bap" pattern -- the syncopated kick that gives hip-hop its swing. Try putting an open hi-hat on position 15 to lead into the next bar.

**Step 11 -- Start recording.** With the sequencer still playing, click REC. Let it run for 30 seconds or more. Click REC again to stop and download.

**Experiment**: Try changing the BPM to 130 and reprogramming for a house music pattern -- kick on every beat (1, 5, 9, 13), clap on beats 2 and 4 (5, 13), and hi-hats on every sixteenth note (all 16 positions). Notice how the same basic elements create a completely different feel at a different tempo.

**Self-check**: Can you tap your foot to the beat? Does it feel like it loops cleanly (no awkward gap or stutter at the repeat point)? If it does not loop cleanly, check that you have not accidentally activated a step at the very end that throws off the rhythm.

---

### Project 3: A Complete DJ Set Transition

**Level**: Intermediate | **Time**: ~45 minutes | **Deliverable**: A recorded three-song mix with professional transitions

**What you will learn**: EQ mixing, filter sweeps, echo out technique, hot cue marking, reading waveforms.

**Preparation**: Import at least three tracks that are in the same genre and have BPMs within about 10 of each other. Check their detected BPMs and keys in the library.

**Step 1 -- Plan your set order.** Click the AI button and look at the key values. Arrange your three songs in an order where adjacent tracks have compatible Camelot keys (same number, or numbers one apart). If you do not have compatible keys, it still works -- the transition techniques will just have to compensate.

**Step 2 -- Load Song 1 on Deck A and Song 2 on Deck B.** Match the BPMs using SYNC or manual pitch adjustment.

**Step 3 -- Set hot cues on Song 2.** Play Song 2 on Deck B with the crossfader all the way to A (so the audience cannot hear it). Find the point where the beat first comes in strong -- the first big downbeat. Set Hot Cue 1 there by clicking pad 1. Find the start of the first chorus or drop and set Hot Cue 2.

**Step 4 -- Mark your mix-out point on Song 1.** Play Song 1 on Deck A. Find the section where the energy starts to decrease -- the breakdown or the transition section. Set a hot cue there. This is where you will start your transition.

**Step 5 -- Begin the transition with EQ mixing.** When Song 1 reaches your marked mix-out point:
- Make sure the crossfader is in the center (both audible)
- On Song 2 (Deck B), cut the LO EQ all the way to -26 (kill the bass)
- Start Song 2 playing from Hot Cue 1
- You should hear Song 1 with full bass and Song 2 with no bass playing simultaneously
- Over the next 16 bars (count the beats: 4 bars = 16 beats at the standard 4/4 time), gradually bring Song 2's LO EQ from -26 back up toward 0

**Step 6 -- Swap the bass.** At a phrase change (the start of a new 8-bar section -- you will feel it):
- Quickly cut Song 1's LO EQ to -26 (kill Song 1's bass)
- Simultaneously bring Song 2's LO EQ to 0 (full bass)
- This "bass swap" should happen in less than a second. The bass line switches from Song 1 to Song 2 without any moment of doubled bass.

**Step 7 -- Remove Song 1.** Over the next 8-16 bars:
- Gradually pull Song 1's channel fader down
- Or gradually move the crossfader toward B
- Or use a filter sweep: slowly turn Song 1's filter slider toward the left (low-pass), making it more muffled until it disappears

**Step 8 -- Prepare for the third song.** Once Song 1 is fully out, load Song 3 onto Deck A. Match BPM. Set hot cues.

**Step 9 -- Try the echo-out transition.** For the second transition (Song 2 to Song 3):
- When ready to transition, click the ECHO button on Deck B
- Wait 2 bars to let the echo build
- Stop Deck B's playback. The echoes continue ringing out
- While the echoes decay, start Song 3 on Deck A with the crossfader toward A
- As the echoes from Song 2 fade away, Song 3 is already playing cleanly

**Step 10 -- Record the whole set.** Start recording before you begin, and stop after the final song is playing solo. Download the file.

**Self-check**: Listen to the transitions. At the bass-swap point, does the bass jump or dip in volume, or does it transition smoothly? During the echo-out, does the reverberant tail blend naturally with the incoming track? These are the details that separate amateur and professional mixes.

---

### Project 4: Making a Trap Beat from Scratch

**Level**: Intermediate | **Time**: ~60 minutes | **Deliverable**: A complete trap beat recording

**What you will learn**: 808 bass programming, layered drum patterns, hi-hat rolls, melodic synthesis, beat structure.

Trap music is defined by a few signature elements: a deep, long sub-bass 808 kick, sharp snares layered with claps, rapid hi-hat patterns, and dark melodic loops. You will build all of these from scratch.

**Step 1 -- Set the tempo.** Open the 808 panel. Set the BPM to 140 (trap lives between 130 and 160 BPM, but is usually felt as a half-time groove at 70 BPM -- the kick pattern is sparse, which makes 140 BPM feel slow and heavy).

**Step 2 -- Program the kick pattern.** Switch to Step Sequencer mode with TR-808 selected. In the Kick row, activate only steps 1 and 11. This creates a sparse, syncopated kick pattern. Do not put a kick on every beat -- trap kicks are deliberately placed off the grid to create tension.

**Step 3 -- Program the snare/clap.** In the Snare row, activate steps 5 and 13 (beats 2 and 4). In the Clap row, also activate steps 5 and 13. The snare and clap hitting simultaneously creates the fat, cracking trap snare sound.

**Step 4 -- Program the hi-hats.** This is where trap gets its character. In the HiHat Closed row, activate every single step (all 16). This creates a steady sixteenth-note hi-hat pulse. Now you need rolls -- rapid bursts of hi-hats. For a simple roll effect, put Open Hi-hat on steps 13, 14, 15, and 16. The open hi-hats at the end of the bar create a cascading fill into the next bar.

**Step 5 -- Hit play and listen.** You should hear: deep kick, steady hi-hats ticking constantly, a cracking snare/clap on 2 and 4, and a hi-hat roll at the end of each bar. This is the skeleton of every trap beat.

**Step 6 -- Add the 808 bass line.** Switch to 808 Bass mode. Set the scale to Minor (trap uses minor scales almost exclusively for its dark sound). Set the root note to C3. Set the waveform to Saw. Now you need to create a bass pattern. The bass in trap follows the kick but sustains longer. Play pad 1 (the root note) and hold it -- listen to the deep, filtered sub-bass tone. Let go. Play pad 3 -- a minor third up, dark and heavy. Play pad 5 -- the fifth, powerful and stable.

A classic trap bass pattern uses the root note on beat 1 (sustained for two beats), a brief note on the minor third on the "and" of beat 3, and back to the root on beat 4. You can finger-drum this over the playing sequencer pattern.

**Step 7 -- Add a melody.** Switch to Kaossilator mode. Set the scale to Minor, root to C4 (one octave above the bass), waveform to Saw. Lower the filter to about 3000 Hz for a darker tone. Play simple, short melodic phrases -- tap pads in sequence, leaving space between notes. Trap melodies are sparse: three to five notes, repeated with small variations. The minor pentatonic scale (which removes the "difficult" notes from the minor scale) is particularly forgiving -- set scale to Pentatonic and every pad combination sounds good together.

**Step 8 -- Layer and record.** Start the step sequencer for drums, then play the 808 bass and melody live over it. Start recording with REC before you begin. Perform for 2-4 minutes. Stop recording and download.

**Self-check**: Does the 808 bass feel like it sits underneath everything else, or is it fighting with the kick drum? If they clash, try starting the bass note slightly after the kick (not exactly on the same beat). Do the hi-hat rolls add excitement at the end of each bar, or do they sound robotic? Vary the velocity (how hard you hit the pads) for a more human feel.

---

### Project 5: Vocal Processing Chain

**Level**: Advanced | **Time**: ~45 minutes | **Deliverable**: A processed vocal track, before-and-after comparison

**What you will learn**: Effect chaining, AutoTune concepts, compression for vocals, reverb for space, delay for depth, de-essing.

**Preparation**: You need an audio file with vocals -- a singing or rapping track, or even just a recording of yourself talking. An a cappella (vocals only) file works best, but a full song works too.

**Step 1 -- Load the vocal track.** Import the file and load it onto Deck A. Play it and listen to the raw, unprocessed vocals. Note any issues: inconsistent volume (some words are loud, some are quiet), harsh "s" sounds, dry/flat quality (no sense of space).

**Step 2 -- Apply Compression (COMP).** Click the COMP button on Deck A. The compressor tames the dynamics -- loud parts get pulled down, making the overall volume more consistent. The default settings (threshold -24 dB, ratio 4:1, attack 3 ms, release 250 ms) work well for vocals. The fast attack catches the initial transient (the sharp start of each word), and the moderate release lets the compressor relax between phrases.

Listen again. The vocal should sound more even -- the quiet words are more audible and the loud words are less jarring. If the effect is too strong (the vocal sounds squashed or unnatural), the threshold would need to be raised (closer to 0), but the current defaults are a reasonable starting point.

**Step 3 -- Apply De-Essing (DE-ESS).** Click DE-ESS. Listen specifically for "s," "sh," and "t" sounds. They should be tamed -- still present but no longer piercing. If the vocal does not have much sibilance, you may not notice a difference, which is fine.

**Step 4 -- Apply Reverb (REVERB).** Click REVERB. The vocal immediately sounds like it is in a room rather than in a vacuum. The default 2.5-second decay with 30% wet mix adds a sense of space without drowning the vocal. Close your eyes and listen -- you should be able to "hear" the room around the singer.

If the reverb sounds too big (like a cathedral) or too small (like a bathroom), the parameters would need adjusting. For now, the default is a good medium hall.

**Step 5 -- Apply Delay (DELAY).** Click DELAY. You will hear echoes of the vocal repeating at 500 ms intervals. This adds depth and rhythmic interest. The delay is filtered through a low-pass filter at 8000 Hz, so each repeat is slightly darker than the last -- this keeps the echoes from competing with the original vocal for clarity.

**Step 6 -- A/B compare.** This is the critical step. Turn all effects off by clicking each button: COMP off, DE-ESS off, REVERB off, DELAY off. Listen to 10 seconds of the raw vocal. Then turn them all back on and listen to the same 10 seconds. The difference should be dramatic: the processed vocal sounds fuller, more present, more "produced."

**Step 7 -- Record both versions.** Start recording. Play 15 seconds with all effects off. Then turn all effects on (COMP first, then DE-ESS, then REVERB, then DELAY) and play another 15 seconds. Stop recording and download. You now have a before-and-after demo of a vocal processing chain.

**Key insight**: The order of effects matters. Compression should come before reverb, because you want to compress the dry vocal (making it consistent) and then add space to the already-consistent signal. If you reverse the order and compress after reverb, the compressor reacts to the reverb tail, which creates pumping artifacts. In Aurality Studio, all effects on a given deck are applied in parallel (simultaneously) rather than in series, so the order issue is less critical here than in a traditional DAW, but understanding the concept is essential for your future growth.

---

### Project 6: Live Performance with DDJ-400

**Level**: Advanced | **Time**: ~60 minutes | **Deliverable**: A recorded live performance set

**What you will learn**: MIDI controller integration, jog wheel technique, hardware pad modes, hands-on DJ performance.

**Requirements**: A Pioneer DDJ-400 controller connected to your computer via USB.

**Step 1 -- Connect the DDJ-400.** Plug the controller into your computer via USB. Open Aurality Studio and click START. The MIDI status indicator in the top bar should change from "No MIDI" with a gray dot to the controller name with a green dot. If it does not connect, see the Troubleshooting section.

**Step 2 -- Understand the MIDI mapping.** The DDJ-400's physical controls are mapped to Aurality Studio's virtual controls:

| DDJ-400 Control | Aurality Function |
|----------------|-------------------|
| Play/Pause button | Play/Pause (per deck) |
| Cue button | Set/Return to cue point |
| Sync button | Sync BPM to other deck |
| Jog wheel (top surface) | Scratch (with Shift held) or pitch bend |
| Tempo slider | Pitch/tempo adjustment |
| Channel faders | Channel volume |
| Crossfader | Blend between decks |
| EQ knobs (Hi/Mid/Lo) | 3-band EQ per channel |
| Trim knob | Input gain |
| Filter knob | Low-pass/High-pass filter sweep |
| Performance pads | Hot cues, beat loops, beat jumps, sampler, or drum pads |
| Load button | Load selected library track to deck |
| Browse encoder | Scroll through library |
| Beat FX On | Toggle effect |
| Headphone Cue | Pre-fader headphone monitoring |

**Step 3 -- Configure pad mode.** The DDJ-400 pads have five modes in Aurality Studio, cycled through by the pad mode button:
- **Hot Cue** -- pads 1-8 set and trigger hot cues (Shift + pad deletes)
- **Beat Loop** -- pads trigger auto-loops of different lengths (1/32, 1/16, 1/8, 1/4, 1/2, 1, 2, 4 beats)
- **Beat Jump** -- pads jump backward or forward by different beat amounts (-32, -16, -8, -4, +4, +8, +16, +32 beats)
- **Sampler** -- pads trigger loaded samples
- **Drum Pad** -- pads trigger the 808/909 drum machine or synthesizer (opens the 808 panel automatically)

**Step 4 -- Load and cue your first track.** Use the browse encoder to scroll through the library. Press Load on the Deck A side to load a track. Put your headphones on. Press the headphone Cue button for Deck A. You should hear the track in your headphones. Press Play. Find a good starting point and set a cue by pressing Cue.

**Step 5 -- Beatmatch with jog wheels.** Load a second track on Deck B. Press Play. If the beats are not aligned, hold Shift and touch the top of the jog wheel on Deck B. Turn it gently forward (to speed up temporarily) or backward (to slow down temporarily) to nudge the beats into alignment. This is physical beatmatching. Use the tempo slider for larger adjustments, and the jog wheel for fine-tuning.

**Step 6 -- Perform a live transition.** Use the channel faders and crossfader to blend between tracks. Use the EQ knobs to do a bass swap. Use the filter knob for sweeps. This is where it becomes physical -- your hands are on real controls, and the tactile feedback makes it easier to feel the music and react to it.

**Step 7 -- Switch to drum pad mode.** Cycle the pad mode to Drum Pad. The 808 panel opens on screen. Now your DDJ-400 pads trigger drum sounds. With a track playing on Deck A, play a drum pattern on the pads in real time over the music. The velocity of your pad hits (how hard you press) controls the volume of each drum hit.

**Step 8 -- Record a full performance.** Click REC. Perform a 5-10 minute set: start with one track, bring in a second track with a proper transition, play some drum fills over the mix, transition to a third track, and end with an echo-out. Stop recording. Download the file.

**Self-check**: Listen to the recording. Were the beatmatches tight? Could you hear any moment where the two tracks drifted out of sync? Were the transitions smooth or abrupt? The recording does not lie -- it captures exactly what happened.

---

### Project 7: The Full Production -- A Song That Hits

**Level**: Advanced | **Time**: ~90 minutes | **Deliverable**: A complete original song with structure, drums, bass, melody, and effects

**What you will learn**: Song structure, arrangement, layering, building and releasing tension, mixing for clarity, final output.

This project brings together everything from the previous six. You will build a complete song from nothing using only the tools in Aurality Studio.

**Step 1 -- Choose a genre and tempo.** For this project, use 128 BPM (a versatile tempo for house, pop, and electronic music). Open the 808 panel. Set the BPM to 128.

**Step 2 -- Build the main drum pattern.** Switch to Step Sequencer mode with TR-909 (its punchier kick and brighter snare work well for this tempo).

The main drum pattern:
- **Kick**: steps 1, 5, 9, 13 (four-on-the-floor -- kick on every beat, the foundation of house music)
- **Snare**: steps 5, 13 (beats 2 and 4)
- **HiHat Closed**: steps 1, 3, 5, 7, 9, 11, 13, 15 (eighth notes)
- **HiHat Open**: step 15 (leading into the next bar)

Press SEQ play. This is your main groove. Let it loop a few times and get comfortable with the feel.

**Step 3 -- Build a simplified "intro" drum pattern.** You will need to plan your performance because the sequencer only has one pattern at a time. The intro should be simpler than the main groove. For the intro, program just: kick on steps 1, 5, 9, 13 and closed hi-hat on every step (all 16). No snare. The full snare comes in at the "drop."

**Step 4 -- Create the chord progression.** Switch to Chord Pad mode. Set scale to Minor, root to C4. Play these four chords in sequence, holding each for about two beats:
- Pad 2 (Minor) -- the home chord, dark and stable
- Pad 4 (Minor 7th) -- adds a wistful quality
- Pad 1 (Major) -- a moment of brightness
- Pad 8 (Suspended 4th) -- unresolved tension, leading back to minor

This is a variant of the i-i7-III-ivsus4 progression in minor. Repeat it and listen. It should feel like it circles back on itself -- a loop you could listen to for hours.

**Step 5 -- Create the bass line.** Switch to 808 Bass mode. Minor scale, root C3, waveform Saw, filter around 2000 Hz. The bass follows the chord roots: play the root note of each chord, sustained for about two beats, matching the timing of your chord changes. In minor starting on C, the bass notes would be: C, C, D# (or Eb), F. Keep it simple -- one note per chord change, let it ring.

**Step 6 -- Create the melody.** Switch to Kaossilator mode. Minor Pentatonic scale, root C4, waveform Saw, filter 4000 Hz. The pentatonic scale gives you only five notes, and every combination sounds good. Play short, catchy phrases: three or four notes, then a rest. Repeat the same phrase, then vary it slightly on the repeat. This repetition-with-variation is the essence of a hook -- the melody that sticks in your head.

**Step 7 -- Plan the arrangement.** A complete song structure in bars (each bar is 4 beats at 128 BPM, or about 1.88 seconds):

| Section | Length | Elements |
|---------|--------|----------|
| Intro | 8 bars (15 sec) | Drums (simple pattern, no snare), hi-hats only |
| Build | 8 bars (15 sec) | Add the chord pad, gradually increase filter |
| Drop/Chorus | 8 bars (15 sec) | Full drums (add snare), bass, melody, all effects |
| Verse | 16 bars (30 sec) | Full drums, bass, no melody (leave space) |
| Chorus | 8 bars (15 sec) | Full drums, bass, melody returns |
| Bridge | 8 bars (15 sec) | Remove drums except hi-hats, chords only, echo effect |
| Final Chorus | 8 bars (15 sec) | Everything together, full energy |
| Outro | 8 bars (15 sec) | Gradually remove elements, end with just kick fading out |

**Step 8 -- Perform and record.** This is a live performance -- you will play through the arrangement in real time, switching modes and adding/removing elements as you go. Start recording first.

1. Start the sequencer with the intro pattern (kick + hi-hat only)
2. After 8 bars, switch to Chord Pad mode and start playing chords over the drums
3. After 8 more bars, stop the sequencer, switch to the full drum pattern (add snare to the sequencer), restart, then switch to Bass mode and play the bass line
4. Keep going through the arrangement, switching between modes for each element
5. For the bridge, stop the sequencer and play just chords with the echo effect active
6. For the final chorus, restart everything at full intensity
7. For the outro, stop one element at a time until only the kick remains, then stop the sequencer

**Step 9 -- Stop recording and download.** You now have a complete, original song.

This is imperfect by design. You cannot multitrack (record each element separately) in Aurality Studio's current architecture. But this constraint forces you to perform the arrangement live, which teaches you about song structure, energy flow, and the relationship between different musical elements in a way that a traditional DAW with unlimited tracks and undo does not.

**Self-check**: Listen to the full recording. Does each section feel different from the one before it? Does the drop (when the full drums and bass come in) feel impactful? Does the bridge provide a moment of breathing room? Does the outro end cleanly? If any section sounds muddy, you probably had too many elements at the same frequency range competing. The fix: give each element its own space in the frequency spectrum.

---

## 5. Professional Techniques

### 5.1 Arrangement

**The 4-bar and 8-bar rule.** Almost all popular and electronic music is organized in 4-bar and 8-bar phrases. New elements enter or leave every 4 or 8 bars. Transitions happen on 8-bar or 16-bar boundaries. If you start mixing at a random point that is not on a phrase boundary, the transition will feel "wrong" even if the BPM and key are perfect. Count bars while you listen: count to 4 repeatedly ("1-2-3-4, 2-2-3-4, 3-2-3-4, 4-2-3-4" = 4 bars). Elements almost always change on the "1" of a new phrase.

**Energy arc: tension, release, bigger tension, bigger release.** A great song or DJ set is not just a flat line of energy. It is a series of waves. The energy builds through a verse, releases at the chorus or drop, then rebuilds higher, and releases bigger. The highest-energy moment in a song should feel earned -- the listener has been pulled through rising tension that demands resolution. In a DJ set, this arc plays out over 30-60 minutes rather than 3-4 minutes.

**The drop: building anticipation then unleashing energy.** The "drop" is the moment in electronic music where the full drums and bass slam in after a build-up section. A great drop works because of what comes before it -- the build-up strips elements away (remove the kick drum, add a rising filter sweep, increase a reverb, add a riser synth sound), creating a vacuum of anticipation. When the drop hits and all the energy returns at once, it is the contrast that creates the impact. A drop without a build-up is just noise.

**Intro and outro construction for DJ-friendly tracks.** If you plan to use your music in DJ sets, structure the intro and outro to be "mix-friendly." A DJ-friendly intro starts with just the kick drum for 16-32 bars, then gradually adds elements. This gives the DJ time to beatmatch and blend. The outro mirrors the intro -- elements drop out one by one until only the kick remains for 16-32 bars, giving the next DJ time to blend in.

### 5.2 Mixing

**EQ: cutting is better than boosting.** When two elements clash in the same frequency range (for example, two bass lines or two vocals), the instinct is to boost the one you want to hear more. Do not do this. Instead, cut the one you want to hear less. Cutting removes energy from the problem frequency. Boosting adds energy to the entire signal, including noise and distortion. If you cannot hear the vocals, do not boost the vocal frequency -- cut the mid-range of the instruments that are masking the vocals.

**Compression: controls dynamic range.** A compressor reduces the volume of audio that exceeds a set threshold, by a set ratio. The four key parameters:
- **Threshold** (-24 dB in Aurality's default): the volume level where compression begins. Audio below this level is untouched.
- **Ratio** (4:1 default): how much compression is applied. 4:1 means that for every 4 dB the audio goes above the threshold, only 1 dB comes through. Higher ratios = more compression.
- **Attack** (3 ms default): how quickly the compressor reacts when audio exceeds the threshold. Fast attack (1-5 ms) catches the very start of sounds, creating a punchy feel. Slow attack (20-50 ms) lets the initial transient through before compressing, preserving the "snap" of drums.
- **Release** (250 ms default): how quickly the compressor stops compressing after the audio drops below the threshold. Too fast = pumping artifacts. Too slow = compression never releases and the sound stays squashed.

**Reverb: creates space.** Reverb simulates the reflections of sound in a physical space. Key concept: pre-delay. In a real room, there is a tiny gap between the original sound and the first reflection (the time it takes sound to travel to the nearest wall and back). Adding pre-delay (5-30 ms) to your reverb keeps the original signal clean and distinct, then the reverb tail fills in behind it. Short reverb (0.5-1 second) = small room, intimate, close. Long reverb (2-4 seconds) = cathedral, vast, distant. The wet/dry mix controls how much reverb you hear relative to the original. 10-20% wet is subtle and professional. 50%+ wet is a special effect.

**Stereo field: pan instruments left and right.** In a stereo mix, every sound exists somewhere on a left-to-right spectrum. The fundamental rule: keep kick drum and bass centered (they carry the most energy and need to hit both speakers equally). Spread hi-hats, synths, and background elements to the left and right. Vocals typically stay centered or very slightly off-center. This creates width and separation, making each element easier to hear.

**Level balance: if you cannot hear something, do not just turn it up -- turn other things down.** This is counter-intuitive but critical. Every time you boost a level, you reduce the headroom (the space between your audio and the maximum level before distortion). Instead, if you want the vocals louder, try turning down the instruments by 2 dB. The relative balance is the same, but you have preserved headroom and reduced the risk of distortion.

### 5.3 Mastering Basics

**What mastering is.** Mastering is the final step in music production: taking the finished mix and preparing it for playback on any system -- laptop speakers, earbuds, car stereos, club sound systems. A mastered track sounds loud, clear, and consistent regardless of how it is played.

**Loudness: LUFS explained simply.** LUFS stands for Loudness Units Full Scale. It measures perceived loudness, which is different from peak level. You can have a track that peaks at 0 dB but sounds quiet because most of its content is at -20 dB. LUFS measures the average perceived loudness over time. The target for music distributed on streaming platforms (Spotify, Apple Music, YouTube) is approximately -14 LUFS. If your track is louder than -14 LUFS, streaming platforms will turn it down automatically. If it is quieter, it will just sound quieter compared to other tracks. Target -14 LUFS and you are in the sweet spot.

**Final EQ: gentle broad strokes.** Mastering EQ is not about fixing individual instruments -- that should have been done in mixing. Mastering EQ is about subtle, broad adjustments to the overall frequency balance. A gentle 1 dB boost of everything above 10 kHz adds "air" and presence. A gentle 1 dB cut at 200-400 Hz reduces muddiness. These are small moves with big impact. If you need more than 2-3 dB of EQ in mastering, the problem is in the mix, not the master.

**Limiting: the ceiling.** A limiter is a compressor with an infinite ratio -- nothing goes above the set threshold, ever. In mastering, you set the limiter's ceiling at -0.3 dB (just below the absolute maximum, to prevent digital clipping on some playback systems) and push the input gain up. The limiter catches the peaks, allowing you to increase the overall loudness without distortion. Push too hard and the sound becomes squashed and lifeless. The goal is the loudest level that does not sacrifice dynamics.

**Reference tracks: compare your song to a professional release.** Load a commercially released track in the same genre on the other deck. A/B compare: play your track for 10 seconds, then switch to the reference for 10 seconds, then switch back. Listen for differences in loudness, bass weight, high-frequency brightness, stereo width, and overall clarity. Your track does not need to sound identical to the reference, but it should be in the same ballpark. If your track sounds thin and weak compared to the reference, you likely need more compression and limiting. If it sounds muffled, you likely need a high-shelf EQ boost.

### 5.4 Songwriting Fundamentals

**Melody: repetition with variation.** The most memorable melodies are simple phrases repeated multiple times with small changes. The hook -- the part of the song that sticks in your head -- is almost always a short (2-4 bar) melodic phrase that repeats. On the first repeat, play it exactly the same. On the second repeat, change the last note. On the third repeat, play it the same as the first again. This creates a pattern that is familiar enough to remember but varied enough to stay interesting.

**Harmony: the two chord progressions that power most of Western music.**

I-IV-V-I: the root chord, the chord built on the fourth note of the scale, the chord built on the fifth, and back to the root. In the key of C major, that is C-F-G-C. This is the foundation of blues, rock, country, and folk music. It sounds resolved, confident, and forward-moving.

I-V-vi-IV: root, fifth, minor sixth, fourth. In C major: C-G-Am-F. This is the chord progression behind "Let It Be," "No Woman No Cry," "With or Without You," "Someone Like You," and hundreds of other hits. It sounds emotional, yearning, and satisfying.

In Aurality Studio's Chord Pad mode, you can play these progressions by selecting the right pads: Maj, Dom7, Min, Maj corresponds roughly to I-V-vi-IV.

**Rhythm: syncopation creates groove.** Syncopation means placing notes where you do not expect them -- between the beats rather than on them. A perfectly on-beat pattern sounds mechanical. A pattern where the kick drum arrives a sixteenth-note early, or the bass note sustains through the beat rather than stopping, sounds human and groovy. In the step sequencer, try moving elements one step earlier or later than the "obvious" position and listen to how it changes the feel.

**Lyric writing (conceptual).** Aurality Studio does not have a lyric editor, but understanding lyric basics informs how you think about vocal tracks. The single most important principle: specific details hit harder than vague generalities. "Tuesday morning, cold coffee on the counter" creates a vivid picture. "I was feeling sad" creates nothing. Every great lyric has a concrete image that lets the listener see, hear, smell, or touch the world the singer is describing. Write from personal truth. The most universal emotions come from the most specific experiences.

---

## 6. Troubleshooting and Common Mistakes

**"No sound."** Three possible causes, in order of likelihood:
1. You did not click the START button. Chrome blocks audio until a user gesture creates an AudioContext. Click START.
2. Chrome's audio permissions are blocked for localhost. Click the lock icon in the address bar, find "Sound" or "Audio," and set it to "Allow."
3. Your system volume or output device is muted or disconnected. Check your OS audio settings.

**"MIDI not connecting."** Chrome requires explicit permission for MIDI. When you first connect a controller, Chrome should show a permission prompt -- click "Allow." If you dismissed it, go to chrome://settings/content/midi and allow localhost. Also: check the USB cable, try a different USB port, try refreshing the page after connecting the controller.

**"Tracks sound terrible when mixed."** The two most common causes: key clash and BPM mismatch. Check the Camelot key values of both tracks. If they are not the same number (or one number apart) and not the same letter (or A/B variants of the same number), the keys may clash. There is no fix other than choosing different tracks. For BPM mismatch, use SYNC or manually adjust the pitch slider until both BPM displays show the same value.

**"808 sounds thin."** The 808 kick produces sub-bass frequencies (30-55 Hz). Most laptop speakers cannot physically reproduce frequencies below 80-100 Hz. The bass is there -- you just cannot hear it on your current speakers. Test with headphones or external speakers with a subwoofer. If it still sounds thin, check the master volume (it should not be too low) and make sure the synth filter is not cutting the low frequencies.

**"Mix sounds good on headphones, bad on speakers" (or vice versa).** This is the most common problem in all of audio production. Different playback systems emphasize different frequencies. Headphones often exaggerate bass; small speakers cannot reproduce it. The solution is to always check your mix on multiple playback systems: headphones, laptop speakers, phone speakers, car speakers, a Bluetooth speaker. A good mix sounds acceptable on all of them, even if it sounds best on full-range monitors.

**"Recording is silent."** Make sure you clicked REC before you started playing. Recording captures the master output in real time -- it does not retroactively capture audio that already played. Also check that the master volume is not at zero and that the channel faders and crossfader are positioned so that audio is reaching the master bus.

**"Everything sounds muddy."** Muddy audio is almost always caused by too much energy in the 200-500 Hz range (the low-midrange). This is where the body of most instruments lives, and when multiple elements stack up there, the result is a thick, undefined mess. Cut the MID EQ on elements that do not need body in that range. In a DJ mix, cut the LO EQ on the incoming track so you are never playing two bass lines simultaneously.

**"Too many effects."** The number one beginner mistake in both DJing and production is overusing effects. Reverb on everything makes everything sound distant and washed out. Delay on everything creates a wall of echoes. Flangers on everything makes everything sound like it is in a washing machine. The fix: turn everything off. Start with the dry signal. Add one effect at a time, and only add it if it makes the sound genuinely better. If you are not sure, it is better without it.

---

## 7. Next Steps

**Share your music.**
- **SoundCloud** (free tier available) -- upload mixes and original tracks, share links, get plays and comments.
- **BandLab** (free) -- full online DAW with social features. Upload your recordings and let others listen, comment, and even remix.
- **YouTube** (free) -- pair your recording with visuals (even a static image or the Aurality visualizer screen-recorded) and upload as a music video.

**Get feedback.**
- **Reddit r/WeAreTheMusicMakers** -- a community of producers at all levels. Post your work in the weekly feedback thread.
- **Reddit r/beatmaking** -- specifically for beat producers.
- **BandLab community** -- built-in social features for sharing and receiving feedback.
- Accept constructive criticism. Do not argue with feedback. Listen, consider, and apply what resonates.

**Collaborate.**
- BandLab allows you to invite other users to your project for real-time collaboration.
- Find vocalists, rappers, or other producers who complement your style.

**Keep learning.**
- **YouTube channels for production education:**
  - **Andrew Huang** -- creative production techniques, sound design, songwriting
  - **You Suck at Producing** -- FL Studio and Ableton tutorials with humor and practical advice
  - **In The Mix** -- mixing and mastering tutorials, EQ and compression deep dives
  - **Point Blank Music School** -- free lessons from a professional music school
- **YouTube channels for DJ technique:**
  - **DJ Carlo Atendido** -- beginner DJ tutorials, DDJ-400 specific content
  - **Crossfader** -- DJ technique, transitions, and live performance tips

**Practice routine.** Fifteen minutes daily is more effective than three hours once a week. Consistency builds muscle memory. A sample daily routine:
- 5 minutes: load two tracks and practice manual beatmatching (without SYNC)
- 5 minutes: practice one transition technique (EQ swap, filter sweep, echo out)
- 5 minutes: program a new drum pattern or melody on the 808

**Document your journey.** Keep your recordings organized by date. Listen back to your earliest work after a month of practice. The improvement will motivate you to continue. These recordings are also portfolio pieces if you pursue music production professionally.

---

## 8. Educational Credit Framework

### 8.1 Learning Objectives

Each section of this guide maps to formal learning objectives using Bloom's taxonomy verbs (a standard framework for describing the cognitive level of educational activities):

**Section 2 -- Core Concepts (Knowledge/Comprehension)**
- Define sound, frequency, amplitude, waveform, tempo, rhythm, melody, harmony, key, and signal flow
- Explain the relationship between frequency and pitch using real-world analogies
- Distinguish between major and minor chords by ear
- Describe the signal flow path from audio source to speaker output

**Section 3 -- Interface Tour (Application/Analysis)**
- Identify all interface elements and their functions
- Operate transport controls, EQ, filters, and effects
- Analyze waveform displays to identify structural elements in a track
- Apply the Camelot wheel to determine key compatibility between tracks

**Section 4 -- Guided Projects 1-3 (Application/Synthesis)**
- Execute a basic two-track mix with BPM matching and crossfading
- Program a rhythmic pattern using the step sequencer
- Construct a multi-song transition using EQ mixing, filter sweeps, and echo out

**Section 4 -- Guided Projects 4-5 (Synthesis/Evaluation)**
- Synthesize a complete trap beat by layering kick, snare, hi-hat, bass, and melody
- Evaluate the impact of each effect in a vocal processing chain through A/B comparison

**Section 4 -- Guided Projects 6-7 (Synthesis/Evaluation)**
- Integrate MIDI hardware with software for live performance
- Create a complete song with intro, verse, chorus, bridge, and outro structure
- Evaluate arrangement choices based on energy flow and listener engagement

**Section 5 -- Professional Techniques (Analysis/Evaluation)**
- Analyze the frequency content of a mix and make corrective EQ decisions
- Evaluate the effectiveness of compression settings based on audio results
- Compare a self-produced track against a commercial reference

### 8.2 Course Equivalence

| Guide Section | Equivalent Course | Credit Hours | Key Assessments |
|---|---|---|---|
| Sections 2-3 | Introduction to Music Technology (MUS 101) | 3 | Interface identification quiz, signal flow diagram, written definitions of 10 core concepts |
| Section 4 (Projects 1-3) | Audio Production I (MUS 201) | 3 | Three mixed recordings with self-assessment reflection on BPM accuracy, key compatibility, and transition smoothness |
| Section 4 (Projects 4-5) | Beat Production and Sound Design (MUS 210) | 3 | Two original beats (hip-hop and house), one vocal processing demo with before/after comparison |
| Section 5 | Mixing and Mastering (MUS 301) | 3 | One final mixed and mastered track, one A/B comparison essay (500 words) comparing self-produced track to commercial reference |
| Section 4 (Projects 6-7) | Live Performance and Technology (MUS 250) | 2 | One recorded live set (minimum 5 minutes with 3 transitions), one full original song with documented arrangement structure |
| Section 5.4 (Songwriting) | Songwriting Fundamentals (MUS 220) | 3 | Three original compositions with written analysis of melody, harmony, and structure choices |

**Total potential credit equivalent: 17 credit hours** across six courses, equivalent to slightly more than one full-time semester of undergraduate music technology study.

### 8.3 Portfolio Deliverables

By the end of this guide, a learner who completes all projects should have produced the following concrete deliverables:

1. **Recording of a two-track crossfade mix** (Project 1)
2. **Recording of an original 808 beat pattern** (Project 2)
3. **Recording of a three-song DJ set with EQ mixing and echo-out transitions** (Project 3)
4. **Recording of an original trap beat with bass and melody** (Project 4)
5. **Recording of a vocal processing chain with before/after comparison** (Project 5)
6. **Recording of a live performance set using DDJ-400** (Project 6, if hardware available)
7. **Recording of a complete original song with full arrangement** (Project 7)
8. **Written self-assessment reflections** for each project
9. **A/B comparison essay** evaluating own work against commercial reference
10. **Practice session log** documenting daily improvement over at least two weeks

### 8.4 Self-Assessment Checkpoints

**After Section 2 (Core Concepts):**
- Without looking at the guide, write a one-sentence definition for each of the 10 core concepts
- Name the four basic waveform shapes and describe what each sounds like
- Given two Camelot key values (for example, 8B and 5A), determine whether they are compatible

**After Section 3 (Interface Tour):**
- With Aurality Studio open, describe the function of every control in the mixer section from memory
- Trace the signal flow from a loaded track to the speaker output, naming each processing stage
- Load a track and identify three structural landmarks (intro, chorus, breakdown) by reading the waveform display alone, before pressing play

**After Projects 1-3:**
- Record a two-track mix without using the SYNC button (manual beatmatching only)
- Score at least 70/100 in Practice Mode across three transitions
- Perform a bass-swap EQ transition without audible bass doubling

**After Projects 4-5:**
- Program a drum pattern in the step sequencer from memory (no reference)
- Identify which effect is active on a track by ear alone: play a vocal track with one unknown effect active and name which effect it is
- Describe the difference in sound between a compressed and uncompressed vocal

**After Projects 6-7:**
- Perform a 10-minute set from memory with at least three transitions and no train wrecks (moments where the mix completely falls apart)
- Arrange a song with at least four distinct sections (intro, verse, chorus, outro) and explain why you chose that structure
- Listen to a commercial release and identify the arrangement structure: count the bars in each section, name each section, and describe the energy arc

---

## Appendix A: Keyboard Shortcuts

| Key | Function |
|-----|----------|
| Space | Play/Pause Deck A |
| Enter | Play/Pause Deck B |
| Q | Cue -- Deck A (set cue point if playing, jump to cue if stopped) |
| P | Cue -- Deck B |
| W | Sync -- Deck A (match BPM to Deck B) |
| O | Sync -- Deck B (match BPM to Deck A) |
| V | Toggle Visualizer (VJ mode) on/off |
| Ctrl+R / Cmd+R | Toggle Recording on/off |
| 1 | Hot Cue 1 -- Deck A (set if empty, trigger if set) |
| 2 | Hot Cue 2 -- Deck A |
| 3 | Hot Cue 3 -- Deck A |
| 4 | Hot Cue 4 -- Deck A |
| 5 | Hot Cue 5 -- Deck A |
| 6 | Hot Cue 6 -- Deck A |
| 7 | Hot Cue 7 -- Deck A |
| 8 | Hot Cue 8 -- Deck A |
| Shift+1 | Hot Cue 1 -- Deck B |
| Shift+2 | Hot Cue 2 -- Deck B |
| Shift+3 | Hot Cue 3 -- Deck B |
| Shift+4 | Hot Cue 4 -- Deck B |
| Shift+5 | Hot Cue 5 -- Deck B |
| Shift+6 | Hot Cue 6 -- Deck B |
| Shift+7 | Hot Cue 7 -- Deck B |
| Shift+8 | Hot Cue 8 -- Deck B |
| Z | 808 Pad 1 (Kick / first note) |
| X | 808 Pad 2 (Snare / second note) |
| C | 808 Pad 3 (Clap / third note) |
| V* | 808 Pad 4 (HiHat Closed / fourth note) |
| B | 808 Pad 5 (HiHat Open / fifth note) |
| N | 808 Pad 6 (Tom Low / sixth note) |
| M | 808 Pad 7 (Tom High / seventh note) |
| , (comma) | 808 Pad 8 (Cowbell / eighth note) |

*Note: The V key serves double duty -- it toggles the visualizer when no Ctrl/Cmd modifier is held. If the 808 panel is open and you want to use V as a drum pad, the visualizer toggle may interfere. Use the VJ button in the top bar as an alternative.

**Mouse shortcuts:**
- Click waveform: seek to that position
- Click and drag waveform: scratch
- Double-click EQ slider: reset to 0 (flat)
- Right-click hot cue pad: delete the hot cue

---

## Appendix B: Glossary

**808** -- the Roland TR-808 Rhythm Composer, a drum machine from 1980 whose synthesized sounds (particularly the deep kick and snappy snare) became foundational to hip-hop, trap, and electronic music. In Aurality Studio, "808" refers to the built-in drum synthesizer that recreates these sounds.

**A/B comparison** -- switching between two audio sources to compare them directly. Used to evaluate the impact of processing (before/after) or to compare your work against a reference.

**ADSR** -- attack, decay, sustain, release. The four stages of a volume envelope that shapes how a synthesized sound begins, develops, and ends. Attack is how quickly the sound reaches full volume. Decay is how quickly it drops from peak to sustain level. Sustain is the volume level held while a note is pressed. Release is how quickly the sound fades after the note is released.

**Amplitude** -- the magnitude of a sound wave. Higher amplitude means louder sound.

**Audio context** -- the Web Audio API object that represents the audio processing system in Chrome. Must be created by a user gesture (like clicking START).

**AutoTune** -- pitch correction technology that detects the pitch of an audio signal and adjusts it to the nearest note in a specified scale.

**Bar** -- a unit of musical time containing a fixed number of beats (usually four in popular music). Also called a "measure."

**Beatmatching** -- the DJ technique of adjusting the tempo and phase of two tracks so their beats play in perfect synchronization.

**Beat grid** -- a series of evenly spaced markers overlaid on a waveform display, aligned to the detected BPM. Used to visually confirm beat alignment.

**Bit crusher** -- an effect that deliberately reduces audio quality by lowering the bit depth and sample rate, creating harsh, digital distortion.

**BPM** -- beats per minute. The standard unit of musical tempo.

**Camelot wheel** -- a system that assigns every musical key a number (1-12) and letter (A for minor, B for major), making it easy to identify harmonically compatible keys. Keys with the same number, or numbers one step apart, mix well together.

**Channel fader** -- a slider controlling the volume of one mixer channel.

**Chord** -- two or more musical notes played simultaneously.

**Chromagram** -- a representation of audio frequency content grouped by the twelve pitch classes (C, C#, D, etc.), used for key detection.

**Clipping** -- distortion that occurs when an audio signal exceeds the maximum level (0 dB in digital audio). The peaks of the waveform are "clipped" off, producing harsh artifacts.

**Compression** -- reducing the dynamic range of an audio signal by attenuating loud parts. Makes audio more consistent in volume.

**Crossfader** -- a horizontal slider on a DJ mixer that blends between two audio channels. Full left = channel A only. Full right = channel B only.

**Cue point** -- a saved position in a track that can be jumped to instantly.

**dB (decibel)** -- a logarithmic unit of measurement for sound level. In digital audio, 0 dB is the maximum level before clipping.

**Decay** -- the second stage of an ADSR envelope: how quickly the sound drops from its initial peak to the sustain level.

**De-esser** -- a frequency-selective compressor designed to reduce sibilance (harsh "s" and "sh" sounds) in vocal recordings.

**Delay** -- an effect that repeats the audio signal at a set time interval, creating echoes.

**Drop** -- the moment in electronic music where the full beat and bass return after a build-up section.

**Dynamic range** -- the difference between the quietest and loudest parts of an audio signal.

**EQ (equalization)** -- the process of boosting or cutting specific frequency ranges in an audio signal.

**Feedback** -- in a delay effect, the proportion of the delayed signal that is fed back into the delay input, creating repeated echoes. Higher feedback = more repeats.

**Filter** -- a device that removes certain frequencies from an audio signal. A low-pass filter removes high frequencies (sounds muffled). A high-pass filter removes low frequencies (sounds thin).

**Flanger** -- an effect that mixes the original audio with a slightly delayed copy, where the delay time continuously varies, creating a sweeping sound.

**Frequency** -- the number of vibrations per second of a sound wave, measured in Hertz (Hz). Determines pitch.

**Gain** -- the amount of amplification applied to an audio signal.

**Harmonic mixing** -- the DJ practice of selecting and mixing tracks with compatible musical keys.

**Hot cue** -- a saved position in a track that can be triggered instantly via a numbered button, without interrupting the track's current playback.

**Hz (Hertz)** -- cycles per second. The unit of measurement for frequency.

**IndexedDB** -- a browser-based database used by Aurality Studio to store tracks, playlists, and settings locally.

**Key** -- the central pitch and scale around which a piece of music is organized.

**Limiter** -- a compressor with an infinite ratio, preventing audio from exceeding a set level.

**Loop** -- a section of audio that repeats continuously between a start point and an end point.

**Low-pass filter** -- a filter that allows frequencies below a cutoff point to pass through while reducing frequencies above it.

**LUFS** -- Loudness Units Full Scale. A standardized measurement of perceived audio loudness over time.

**Major** -- a musical scale or chord quality that sounds bright, stable, and happy.

**Master** -- the final audio output bus that combines all channels before reaching the speakers.

**MIDI** -- Musical Instrument Digital Interface. A protocol for communicating musical performance data between devices (which note was pressed, how hard, when it was released).

**Minor** -- a musical scale or chord quality that sounds dark, emotional, and tense.

**Mixer** -- the section of a DJ system that controls volume levels, EQ, and blending between multiple audio sources.

**Noise gate** -- an effect that silences audio falling below a set threshold. Used to cut background noise.

**Oscillator** -- an electronic circuit (or digital model of one) that generates a repeating waveform at a specific frequency.

**Panning** -- placing a sound in the left-right stereo field.

**Phaser** -- an effect that creates a sweeping sound by passing audio through a series of all-pass filters modulated by an oscillator.

**Pitch** -- the perceived highness or lowness of a sound, determined by its frequency.

**Pre-delay** -- a short silence before the onset of reverb reflections, preserving clarity of the original signal.

**Reverb (reverberation)** -- the persistence of sound after the original source has stopped, caused by reflections in a physical space. In audio production, reverb is simulated using algorithms or impulse responses.

**Scale** -- an ordered set of musical notes that form the basis for melodies and harmonies.

**Signal flow** -- the path audio takes through a series of processing stages from source to output.

**Slip mode** -- a DJ feature where the track's "true" position continues silently during scratching or looping, snapping back when released.

**Step sequencer** -- a grid-based music programming tool where each column represents a time step and each row represents a sound, allowing patterns to be created by toggling cells on and off.

**Stem** -- an isolated component of a mix (for example, vocals only, drums only, bass only).

**Sync** -- automatic BPM matching between two DJ decks.

**Syncopation** -- placing rhythmic emphasis on off-beats or unexpected positions, creating groove and swing.

**Tempo** -- the speed of music, measured in BPM.

**Threshold** -- in dynamics processing (compression, gating), the level at which the processor begins to act.

**Timbre** -- the quality or character of a sound that distinguishes it from other sounds at the same pitch and volume. Determined by the waveform shape and harmonic content.

**Trim** -- the initial gain adjustment at the input of a mixer channel, used to match levels between tracks.

**VU meter** -- a visual indicator of audio signal level. VU stands for Volume Unit.

**Waveform** -- a visual representation of audio amplitude over time, or the shape of a sound wave that determines its timbre.

**Wet/dry mix** -- the balance between the processed (wet) signal and the original (dry) signal in an effect.

---

## Appendix C: Genre BPM and Key Reference

### BPM Ranges by Genre

| Genre | Typical BPM Range | Common Feel |
|-------|------------------|-------------|
| Ambient / Downtempo | 60-90 | Floating, atmospheric, meditative |
| Hip-Hop | 80-100 | Head-nodding, laid-back groove |
| Trap | 130-170 (felt as half-time 65-85) | Heavy, dark, sparse kick with rapid hi-hats |
| R&B | 60-100 | Smooth, sensual, vocal-focused |
| Reggaeton | 90-100 | Bouncy, syncopated, Latin-influenced |
| Pop | 100-130 | Danceable, accessible, radio-friendly |
| House | 120-130 | Four-on-the-floor kick, groovy, warm |
| Tech House | 122-128 | Hypnotic, minimal, loop-driven |
| Deep House | 118-125 | Mellow, soulful, jazzy undertones |
| Progressive House | 126-132 | Building, melodic, epic |
| Trance | 130-145 | Euphoric, sweeping, energetic |
| Techno | 125-140 | Dark, mechanical, driving, relentless |
| Electro | 125-135 | Aggressive, distorted, robotic |
| Dubstep | 138-142 (felt as half-time 69-71) | Heavy bass wobbles, aggressive drops |
| Drum and Bass | 160-180 | Fast breakbeats, deep bass, high energy |
| Jungle | 160-180 | Chopped breakbeats, ragga influences |
| Breakbeat | 120-140 | Syncopated, funky, non-four-on-the-floor |
| Garage / UK Garage | 130-140 | Shuffling, skippy, vocal-heavy |
| Jersey Club | 130-140 | Percussive, rapid-fire samples, bouncy |
| Afrobeats | 100-120 | Polyrhythmic, warm, danceable |
| Latin House | 120-128 | Congas, piano, vocal, tropical energy |
| Hardstyle | 150-160 | Pounding kick, extreme compression, euphoric melodies |
| Hardcore | 160-200+ | Extremely fast, distorted, intense |

### Common Keys by Genre

These are tendencies, not rules. Any song can be in any key.

| Genre | Most Common Keys | Why |
|-------|-----------------|-----|
| Pop | C major, G major, D major | Bright, accessible, easy to sing |
| Hip-Hop / Trap | C minor, G minor, D minor, F minor | Dark, aggressive, emotional |
| House | A minor, F major, C major | Warm, groovy, versatile |
| Trance | A minor, D minor, E minor | Euphoric in minor, powerful in the build |
| R&B | Eb major, Ab major, Bb minor | Rich, warm, soulful |
| EDM / Festival | F minor, Bb minor, Eb minor | Epic, dramatic, high-energy |

### Camelot Wheel Quick Reference

Compatible keys for mixing (Camelot numbers that mix well together):

```
     1A  -- 12A -- 11A
    / |         |  \
  2A  1B       11B 10A
    \ |         |  /
     3A  -- 4A -- 5A
    / |         |  \
  2B  3B       5B  6A
    \ |         |  /
     4B  -- ... (continues around)
```

**Rules for key compatibility:**
- Same number and same letter: perfect match (e.g., 8B to 8B)
- Same number, different letter: relative major/minor (e.g., 8A to 8B) -- always compatible
- One number up or down, same letter: adjacent key (e.g., 8B to 7B or 9B) -- compatible
- Two or more numbers apart: potentially clashing -- use caution or use EQ to isolate elements

**Full Camelot wheel with standard key names:**

| Camelot | Key |
|---------|-----|
| 1A | Ab minor |
| 1B | B major |
| 2A | Eb minor |
| 2B | F# major |
| 3A | Bb minor |
| 3B | Db major |
| 4A | F minor |
| 4B | Ab major |
| 5A | C minor |
| 5B | Eb major |
| 6A | G minor |
| 6B | Bb major |
| 7A | D minor |
| 7B | F major |
| 8A | A minor |
| 8B | C major |
| 9A | E minor |
| 9B | G major |
| 10A | B minor |
| 10B | D major |
| 11A | F# minor |
| 11B | A major |
| 12A | Db minor |
| 12B | E major |
