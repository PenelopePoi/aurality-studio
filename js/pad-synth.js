// pad-synth.js — 808 Drum Machine + Kaossilator-style Synthesizer for DDJ-400 Pads
// Turns DDJ-400 performance pads into a full drum machine and synth

class PadSynth {
  constructor(audioContext, masterGain) {
    this.ctx = audioContext;
    this.master = masterGain;
    this.synthGain = this.ctx.createGain();
    this.synthGain.gain.value = 0.8;
    this.synthGain.connect(this.master);

    // Compressor for punchy 808 sound
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.15;
    this.compressor.connect(this.synthGain);

    // Active pad mode per deck
    this.mode = { A: '808', B: '808' }; // '808', 'synth', 'chord', 'bass'

    // 808 kit definitions — each pad triggers a different drum sound
    this.kits = {
      '808': {
        name: 'TR-808',
        sounds: [
          { name: 'Kick',    fn: (v) => this.kick808(v) },
          { name: 'Snare',   fn: (v) => this.snare808(v) },
          { name: 'Clap',    fn: (v) => this.clap808(v) },
          { name: 'HiHat C', fn: (v) => this.hihatClosed(v) },
          { name: 'HiHat O', fn: (v) => this.hihatOpen(v) },
          { name: 'Tom Lo',  fn: (v) => this.tom808(v, 80) },
          { name: 'Tom Hi',  fn: (v) => this.tom808(v, 200) },
          { name: 'Cowbell', fn: (v) => this.cowbell808(v) }
        ]
      },
      '909': {
        name: 'TR-909',
        sounds: [
          { name: 'Kick',    fn: (v) => this.kick909(v) },
          { name: 'Snare',   fn: (v) => this.snare909(v) },
          { name: 'Clap',    fn: (v) => this.clap808(v) },
          { name: 'HiHat C', fn: (v) => this.hihatClosed(v) },
          { name: 'HiHat O', fn: (v) => this.hihatOpen(v) },
          { name: 'Ride',    fn: (v) => this.ride909(v) },
          { name: 'Crash',   fn: (v) => this.crash909(v) },
          { name: 'Rim',     fn: (v) => this.rimshot(v) }
        ]
      }
    };

    // Synth state (Kaossilator-style)
    this.synthState = {
      waveform: 'sawtooth', // sine, square, sawtooth, triangle
      scale: 'chromatic',
      rootNote: 48, // C3
      filterFreq: 2000,
      filterRes: 5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.4,
      release: 0.5,
      activeNotes: new Map()
    };

    // Scale definitions (semitone offsets)
    this.scales = {
      chromatic:  [0,1,2,3,4,5,6,7,8,9,10,11],
      major:      [0,2,4,5,7,9,11],
      minor:      [0,2,3,5,7,8,10],
      pentatonic: [0,2,4,7,9],
      blues:      [0,3,5,6,7,10],
      dorian:     [0,2,3,5,7,9,10],
      mixolydian: [0,2,4,5,7,9,10],
      phrygian:   [0,1,3,5,7,8,10]
    };

    // Pad note mappings for synth mode (8 pads = 8 scale degrees)
    this.padNotes = [0,1,2,3,4,5,6,7];

    // Sequencer
    this.sequencer = {
      running: false,
      bpm: 120,
      currentStep: 0,
      steps: 16,
      pattern: Array.from({length: 8}, () => new Array(16).fill(false)),
      intervalId: null
    };

    this.currentKit = '808';
    this.activeMode = '808'; // '808', '909', 'synth', 'sequencer'
  }

  // ========== 808 DRUM SYNTHESIS ==========

  kick808(velocity = 1.0) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain.gain.setValueAtTime(velocity * 1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.8);
    // Sub layer
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, now);
    subGain.gain.setValueAtTime(velocity * 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    sub.connect(subGain);
    subGain.connect(this.compressor);
    sub.start(now);
    sub.stop(now + 1.0);
  }

  kick909(velocity = 1.0) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(velocity * 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    // Click transient
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.value = 1000;
    clickGain.gain.setValueAtTime(velocity * 0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    click.connect(clickGain);
    clickGain.connect(this.compressor);
    click.start(now);
    click.stop(now + 0.02);
    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  snare808(velocity = 1.0) {
    const now = this.ctx.currentTime;
    // Tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
    oscGain.gain.setValueAtTime(velocity * 0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.2);
    // Noise
    this._noiseHit(velocity * 0.5, 0.15, 3000, 8000);
  }

  snare909(velocity = 1.0) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
    oscGain.gain.setValueAtTime(velocity * 0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.15);
    this._noiseHit(velocity * 0.7, 0.25, 2000, 10000);
  }

  clap808(velocity = 1.0) {
    // Multiple short noise bursts
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this._noiseHit(velocity * 0.4, 0.03, 1000, 6000), i * 12);
    }
    setTimeout(() => this._noiseHit(velocity * 0.6, 0.2, 1000, 8000), 40);
  }

  hihatClosed(velocity = 1.0) {
    this._noiseHit(velocity * 0.4, 0.06, 6000, 16000);
    this._metallic(velocity * 0.3, 0.04);
  }

  hihatOpen(velocity = 1.0) {
    this._noiseHit(velocity * 0.4, 0.35, 5000, 15000);
    this._metallic(velocity * 0.3, 0.25);
  }

  tom808(velocity = 1.0, freq = 100) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);
    gain.gain.setValueAtTime(velocity * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  cowbell808(velocity = 1.0) {
    const now = this.ctx.currentTime;
    [587, 845].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 15;
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(velocity * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(bp);
      bp.connect(gain);
      gain.connect(this.compressor);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  ride909(velocity = 1.0) {
    this._metallic(velocity * 0.4, 0.8);
    this._noiseHit(velocity * 0.2, 0.6, 8000, 18000);
  }

  crash909(velocity = 1.0) {
    this._metallic(velocity * 0.5, 1.5);
    this._noiseHit(velocity * 0.4, 1.2, 4000, 16000);
  }

  rimshot(velocity = 1.0) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(velocity * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.04);
    this._noiseHit(velocity * 0.3, 0.02, 2000, 12000);
  }

  // ========== HELPER FUNCTIONS ==========

  _noiseHit(volume, duration, hpFreq = 1000, lpFreq = 10000) {
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpFreq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lpFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.compressor);
    source.start(now);
  }

  _metallic(volume, duration) {
    const now = this.ctx.currentTime;
    const freqs = [2093, 2637, 3520, 4186, 5274];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f + (Math.random() * 20 - 10);
      gain.gain.setValueAtTime(volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // ========== KAOSSILATOR-STYLE SYNTH ==========

  midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  getScaleNote(padIndex) {
    const scale = this.scales[this.synthState.scale] || this.scales.chromatic;
    const octave = Math.floor(padIndex / scale.length);
    const degree = padIndex % scale.length;
    return this.synthState.rootNote + scale[degree] + (octave * 12);
  }

  synthNoteOn(padIndex, velocity = 1.0) {
    const note = this.getScaleNote(padIndex);
    const freq = this.midiToFreq(note);
    const now = this.ctx.currentTime;
    const s = this.synthState;

    // Oscillator
    const osc = this.ctx.createOscillator();
    osc.type = s.waveform;
    osc.frequency.value = freq;

    // Second oscillator (detuned for thickness)
    const osc2 = this.ctx.createOscillator();
    osc2.type = s.waveform;
    osc2.frequency.value = freq * 1.003;

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(s.filterFreq, now);
    filter.Q.value = s.filterRes;

    // ADSR envelope
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(velocity * 0.4, now + s.attack);
    env.gain.linearRampToValueAtTime(velocity * 0.4 * s.sustain, now + s.attack + s.decay);

    // Mixer
    const mix = this.ctx.createGain();
    mix.gain.value = 0.5;

    osc.connect(mix);
    osc2.connect(mix);
    mix.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);

    osc.start(now);
    osc2.start(now);

    s.activeNotes.set(padIndex, { osc, osc2, env, filter, startTime: now });
  }

  synthNoteOff(padIndex) {
    const s = this.synthState;
    const noteData = s.activeNotes.get(padIndex);
    if (!noteData) return;

    const now = this.ctx.currentTime;
    noteData.env.gain.cancelScheduledValues(now);
    noteData.env.gain.setValueAtTime(noteData.env.gain.value, now);
    noteData.env.gain.linearRampToValueAtTime(0, now + s.release);
    noteData.osc.stop(now + s.release + 0.1);
    noteData.osc2.stop(now + s.release + 0.1);
    s.activeNotes.delete(padIndex);
  }

  // ========== BASS SYNTH MODE ==========

  bassNoteOn(padIndex, velocity = 1.0) {
    const note = this.getScaleNote(padIndex);
    const freq = this.midiToFreq(note - 12); // One octave lower
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.3);
    filter.Q.value = 8;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(velocity * 0.6, now + 0.005);
    env.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.15);

    const mix = this.ctx.createGain();
    mix.gain.value = 0.5;

    osc.connect(mix);
    sub.connect(mix);
    mix.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);

    osc.start(now);
    sub.start(now);

    this.synthState.activeNotes.set(padIndex + 100, { osc, osc2: sub, env, filter, startTime: now });
  }

  bassNoteOff(padIndex) {
    const noteData = this.synthState.activeNotes.get(padIndex + 100);
    if (!noteData) return;
    const now = this.ctx.currentTime;
    noteData.env.gain.cancelScheduledValues(now);
    noteData.env.gain.setValueAtTime(noteData.env.gain.value, now);
    noteData.env.gain.linearRampToValueAtTime(0, now + 0.1);
    noteData.osc.stop(now + 0.15);
    noteData.osc2.stop(now + 0.15);
    this.synthState.activeNotes.delete(padIndex + 100);
  }

  // ========== CHORD MODE ==========

  chordNoteOn(padIndex, velocity = 1.0) {
    const chords = [
      [0,4,7],     // major
      [0,3,7],     // minor
      [0,4,7,11],  // maj7
      [0,3,7,10],  // min7
      [0,4,7,10],  // dom7
      [0,3,6],     // dim
      [0,4,8],     // aug
      [0,5,7]      // sus4
    ];
    const chord = chords[padIndex % chords.length];
    const rootNote = this.synthState.rootNote + (Math.floor(padIndex / 8) * 12);

    chord.forEach((interval, i) => {
      const freq = this.midiToFreq(rootNote + interval);
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;
      filter.Q.value = 1;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(velocity * 0.2, now + 0.02);
      env.gain.linearRampToValueAtTime(velocity * 0.15, now + 0.2);
      osc.connect(filter);
      filter.connect(env);
      env.connect(this.compressor);
      osc.start(now);

      const key = padIndex * 10 + i + 200;
      this.synthState.activeNotes.set(key, { osc, osc2: null, env, filter, startTime: now });
    });
  }

  chordNoteOff(padIndex) {
    const chords = [[0,4,7],[0,3,7],[0,4,7,11],[0,3,7,10],[0,4,7,10],[0,3,6],[0,4,8],[0,5,7]];
    const chord = chords[padIndex % chords.length];
    chord.forEach((_, i) => {
      const key = padIndex * 10 + i + 200;
      const nd = this.synthState.activeNotes.get(key);
      if (nd) {
        const now = this.ctx.currentTime;
        nd.env.gain.cancelScheduledValues(now);
        nd.env.gain.setValueAtTime(nd.env.gain.value, now);
        nd.env.gain.linearRampToValueAtTime(0, now + 0.5);
        nd.osc.stop(now + 0.55);
        this.synthState.activeNotes.delete(key);
      }
    });
  }

  // ========== STEP SEQUENCER ==========

  startSequencer() {
    if (this.sequencer.running) return;
    this.sequencer.running = true;
    const stepTime = 60000 / this.sequencer.bpm / 4; // 16th notes
    this.sequencer.intervalId = setInterval(() => {
      const step = this.sequencer.currentStep;
      for (let pad = 0; pad < 8; pad++) {
        if (this.sequencer.pattern[pad][step]) {
          const kit = this.kits[this.currentKit];
          if (kit && kit.sounds[pad]) {
            kit.sounds[pad].fn(0.8);
          }
        }
      }
      this.sequencer.currentStep = (step + 1) % this.sequencer.steps;
      if (this.onSequencerStep) this.onSequencerStep(this.sequencer.currentStep);
    }, stepTime);
  }

  stopSequencer() {
    this.sequencer.running = false;
    if (this.sequencer.intervalId) {
      clearInterval(this.sequencer.intervalId);
      this.sequencer.intervalId = null;
    }
    this.sequencer.currentStep = 0;
  }

  toggleStep(pad, step) {
    this.sequencer.pattern[pad][step] = !this.sequencer.pattern[pad][step];
    return this.sequencer.pattern[pad][step];
  }

  // ========== PAD TRIGGER (called from MIDI or UI) ==========

  padOn(padIndex, velocity = 1.0) {
    switch (this.activeMode) {
      case '808':
      case '909':
        const kit = this.kits[this.activeMode];
        if (kit && kit.sounds[padIndex]) {
          kit.sounds[padIndex].fn(velocity);
        }
        break;
      case 'synth':
        this.synthNoteOn(padIndex, velocity);
        break;
      case 'bass':
        this.bassNoteOn(padIndex, velocity);
        break;
      case 'chord':
        this.chordNoteOn(padIndex, velocity);
        break;
      case 'sequencer':
        // In sequencer mode, pads toggle steps at current position
        this.toggleStep(padIndex, this.sequencer.currentStep);
        // Also play the sound for feedback
        const seqKit = this.kits[this.currentKit];
        if (seqKit && seqKit.sounds[padIndex]) {
          seqKit.sounds[padIndex].fn(velocity);
        }
        break;
    }
    if (this.onPadTrigger) this.onPadTrigger(padIndex, this.activeMode);
  }

  padOff(padIndex) {
    switch (this.activeMode) {
      case 'synth':
        this.synthNoteOff(padIndex);
        break;
      case 'bass':
        this.bassNoteOff(padIndex);
        break;
      case 'chord':
        this.chordNoteOff(padIndex);
        break;
    }
  }

  // ========== MODE / SETTINGS ==========

  setMode(mode) {
    // Release all active notes when switching
    this.synthState.activeNotes.forEach((nd, key) => {
      const now = this.ctx.currentTime;
      nd.env.gain.cancelScheduledValues(now);
      nd.env.gain.setValueAtTime(0, now);
      nd.osc.stop(now + 0.01);
      if (nd.osc2) nd.osc2.stop(now + 0.01);
    });
    this.synthState.activeNotes.clear();
    this.activeMode = mode;
    if (mode === '808' || mode === '909') this.currentKit = mode;
  }

  setWaveform(type) { this.synthState.waveform = type; }
  setScale(name) { if (this.scales[name]) this.synthState.scale = name; }
  setRootNote(midi) { this.synthState.rootNote = midi; }
  setFilterFreq(f) { this.synthState.filterFreq = f; }
  setFilterRes(q) { this.synthState.filterRes = q; }
  setADSR(a, d, s, r) {
    this.synthState.attack = a;
    this.synthState.decay = d;
    this.synthState.sustain = s;
    this.synthState.release = r;
  }
  setBPM(bpm) {
    this.sequencer.bpm = bpm;
    if (this.sequencer.running) {
      this.stopSequencer();
      this.startSequencer();
    }
  }

  // Get mode names for UI
  getModes() {
    return [
      { id: '808', name: 'TR-808', icon: '🥁' },
      { id: '909', name: 'TR-909', icon: '🎛️' },
      { id: 'synth', name: 'Kaossilator', icon: '🎹' },
      { id: 'bass', name: '808 Bass', icon: '🔊' },
      { id: 'chord', name: 'Chord Pad', icon: '🎵' },
      { id: 'sequencer', name: 'Step Seq', icon: '⬛' }
    ];
  }

  getPadLabels() {
    switch (this.activeMode) {
      case '808':
      case '909':
        return this.kits[this.activeMode].sounds.map(s => s.name);
      case 'synth':
      case 'bass':
        return this.padNotes.map(i => {
          const note = this.getScaleNote(i);
          const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
          return names[note % 12] + Math.floor(note / 12 - 1);
        });
      case 'chord':
        return ['Maj','Min','Maj7','Min7','Dom7','Dim','Aug','Sus4'];
      case 'sequencer':
        return this.kits[this.currentKit].sounds.map(s => s.name);
      default:
        return Array(8).fill('---');
    }
  }
}

// Export for use in app
if (typeof window !== 'undefined') {
  window.PadSynth = PadSynth;
}
