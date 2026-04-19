/**
 * Aurality Studio — MIDI Controller (DDJ-400)
 * Full Pioneer DDJ-400 MIDI mapping via Web MIDI API.
 */
class MIDIController {
  constructor(app) {
    this.app = app;
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    this.connected = false;
    this.jogSensitivity = 0.01;
    this.padMode = { A: 'hotcue', B: 'hotcue' }; // hotcue, beatloop, beatjump, sampler

    // DDJ-400 MIDI note/CC mapping
    this.MAP = {
      // Deck A (Channel 0)
      PLAY_A: 0x0B, CUE_A: 0x0C, SYNC_A: 0x58,
      // Deck B (Channel 1, but DDJ-400 sends on same channel with different notes)
      PLAY_B: 0x0B, CUE_B: 0x0C, SYNC_B: 0x58,

      // Jog wheels (CC)
      JOG_A: 0x21, JOG_B: 0x21,

      // Tempo slider (CC)
      TEMPO_A: 0x00, TEMPO_B: 0x00,

      // Channel faders
      FADER_A: 0x13, FADER_B: 0x13,

      // Crossfader
      CROSSFADER: 0x1F,

      // EQ
      EQ_HI_A: 0x07, EQ_MID_A: 0x0B, EQ_LO_A: 0x0F,
      EQ_HI_B: 0x07, EQ_MID_B: 0x0B, EQ_LO_B: 0x0F,

      // Trim
      TRIM_A: 0x03, TRIM_B: 0x03,

      // Filter
      FILTER_A: 0x17, FILTER_B: 0x17,

      // Headphone cue
      CUE_CH_A: 0x54, CUE_CH_B: 0x54,

      // Performance pads (notes 0x00-0x07 per deck)
      PAD_START: 0x00,

      // Beat FX
      BEAT_FX_SELECT: 0x1A,
      BEAT_FX_LEVEL: 0x02,
      BEAT_FX_ON: 0x47,

      // Load buttons
      LOAD_A: 0x46, LOAD_B: 0x46,

      // Browse encoder
      BROWSE: 0x40,

      // Shift
      SHIFT_A: 0x3F, SHIFT_B: 0x3F
    };

    this.shiftPressed = { A: false, B: false };
  }

  async init() {
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.midiAccess.onstatechange = (e) => this._onStateChange(e);
      this._connectDevices();
      console.log('[MIDI] Initialized');
      return true;
    } catch (e) {
      console.warn('[MIDI] Not available:', e.message);
      return false;
    }
  }

  _connectDevices() {
    for (const input of this.midiAccess.inputs.values()) {
      if (input.name.includes('DDJ-400') || input.name.includes('DDJ')) {
        this.input = input;
        this.input.onmidimessage = (msg) => this._onMessage(msg);
        console.log('[MIDI] Input connected:', input.name);
      }
    }
    for (const output of this.midiAccess.outputs.values()) {
      if (output.name.includes('DDJ-400') || output.name.includes('DDJ')) {
        this.output = output;
        console.log('[MIDI] Output connected:', output.name);
      }
    }
    this.connected = !!(this.input && this.output);

    // If no DDJ-400 found, connect to any available MIDI device
    if (!this.input) {
      const firstInput = this.midiAccess.inputs.values().next().value;
      if (firstInput) {
        this.input = firstInput;
        this.input.onmidimessage = (msg) => this._onMessage(msg);
        console.log('[MIDI] Generic input connected:', firstInput.name);
      }
    }
    if (!this.output) {
      const firstOutput = this.midiAccess.outputs.values().next().value;
      if (firstOutput) {
        this.output = firstOutput;
        console.log('[MIDI] Generic output connected:', firstOutput.name);
      }
    }
    if (this.input) this.connected = true;
  }

  _onStateChange(e) {
    console.log('[MIDI] State change:', e.port.name, e.port.state);
    if (e.port.state === 'connected') {
      this._connectDevices();
    } else if (e.port.state === 'disconnected') {
      this.connected = false;
      window.dispatchEvent(new CustomEvent('midi-disconnected'));
    }
    window.dispatchEvent(new CustomEvent('midi-state', { detail: { connected: this.connected } }));
  }

  _onMessage(msg) {
    const [status, note, velocity] = msg.data;
    const type = status & 0xF0;
    const midiChannel = status & 0x0F;

    // DDJ-400: Channel 0 = Deck A, Channel 1 = Deck B
    const deckChannel = midiChannel === 0 ? 'A' : 'B';

    switch (type) {
      case 0x90: // Note On
        this._handleNoteOn(deckChannel, note, velocity);
        break;
      case 0x80: // Note Off
        this._handleNoteOff(deckChannel, note, velocity);
        break;
      case 0xB0: // Control Change
        this._handleCC(deckChannel, note, velocity);
        break;
    }
  }

  _handleNoteOn(channel, note, velocity) {
    if (velocity === 0) { this._handleNoteOff(channel, note, velocity); return; }

    const deck = channel === 'A' ? this.app.deckA : this.app.deckB;

    // Play/Pause
    if (note === this.MAP.PLAY_A) {
      if (deck.isPlaying) deck.pause(); else deck.play();
      this._sendLED(channel, note, deck.isPlaying ? 127 : 0);
      this.app.updateUI();
      return;
    }

    // Cue
    if (note === this.MAP.CUE_A) {
      deck.cuePress();
      this.app.updateUI();
      return;
    }

    // Sync
    if (note === this.MAP.SYNC_A) {
      const otherDeck = channel === 'A' ? this.app.deckB : this.app.deckA;
      deck.syncTo(otherDeck);
      this.app.updateUI();
      return;
    }

    // Shift
    if (note === this.MAP.SHIFT_A) {
      this.shiftPressed[channel] = true;
      return;
    }

    // Headphone cue
    if (note === this.MAP.CUE_CH_A) {
      this.app.mixer.toggleCue(channel);
      this.app.updateUI();
      return;
    }

    // Performance pads (0x00-0x07)
    if (note >= 0x00 && note <= 0x07) {
      this._handlePad(channel, note, velocity);
      return;
    }

    // Load
    if (note === this.MAP.LOAD_A) {
      // Trigger load dialog
      window.dispatchEvent(new CustomEvent('midi-load', { detail: { channel } }));
      return;
    }

    // Beat FX on
    if (note === this.MAP.BEAT_FX_ON) {
      this.app.toggleFX(channel);
      return;
    }
  }

  _handleNoteOff(channel, note) {
    if (note === this.MAP.SHIFT_A) {
      this.shiftPressed[channel] = false;
    }
    // Pad note off for synth modes
    if (note >= this.MAP.PAD_START && note <= this.MAP.PAD_START + 7) {
      this._handlePadOff(channel, note - this.MAP.PAD_START);
    }
  }

  _handleCC(channel, cc, value) {
    const deck = channel === 'A' ? this.app.deckA : this.app.deckB;

    // Jog wheel
    if (cc === this.MAP.JOG_A) {
      const delta = value < 64 ? value : value - 128;
      if (this.shiftPressed[channel]) {
        // Scratch mode
        deck.scratch(delta * this.jogSensitivity);
      } else {
        // Pitch bend
        const bendAmount = delta * 0.001;
        deck.setPitch(deck.pitchAdjust + bendAmount);
      }
      this.app.updateUI();
      return;
    }

    // Tempo slider
    if (cc === this.MAP.TEMPO_A) {
      const pitch = (value - 64) / 64; // -1 to 1
      deck.setPitch(pitch);
      this.app.updateUI();
      return;
    }

    // Channel fader
    if (cc === this.MAP.FADER_A) {
      this.app.mixer.setVolume(channel, value / 127);
      this.app.updateUI();
      return;
    }

    // Crossfader
    if (cc === this.MAP.CROSSFADER) {
      this.app.mixer.setCrossfader(value / 127);
      this.app.updateUI();
      return;
    }

    // EQ
    if (cc === this.MAP.EQ_HI_A) {
      const db = ((value / 127) * 32) - 26;
      this.app.mixer.setEQ(channel, 'hi', db);
      return;
    }
    if (cc === this.MAP.EQ_MID_A) {
      const db = ((value / 127) * 32) - 26;
      this.app.mixer.setEQ(channel, 'mid', db);
      return;
    }
    if (cc === this.MAP.EQ_LO_A) {
      const db = ((value / 127) * 32) - 26;
      this.app.mixer.setEQ(channel, 'lo', db);
      return;
    }

    // Trim
    if (cc === this.MAP.TRIM_A) {
      this.app.mixer.setTrim(channel, (value / 127) * 2);
      return;
    }

    // Filter
    if (cc === this.MAP.FILTER_A) {
      this.app.mixer.setFilter(channel, value / 127);
      return;
    }

    // Browse encoder
    if (cc === this.MAP.BROWSE) {
      const dir = value < 64 ? value : value - 128;
      window.dispatchEvent(new CustomEvent('midi-browse', { detail: { direction: dir } }));
      return;
    }

    // Beat FX level
    if (cc === this.MAP.BEAT_FX_LEVEL) {
      window.dispatchEvent(new CustomEvent('midi-fx-level', { detail: { channel, value: value / 127 } }));
      return;
    }
  }

  _handlePad(channel, padIndex, velocity) {
    const deck = channel === 'A' ? this.app.deckA : this.app.deckB;
    const mode = this.padMode[channel];

    switch (mode) {
      case 'hotcue':
        if (this.shiftPressed[channel]) {
          deck.deleteHotCue(padIndex);
          this._sendLED(channel, padIndex, 0);
        } else {
          if (deck.hotCues[padIndex] !== null) {
            deck.triggerHotCue(padIndex);
          } else {
            deck.setHotCue(padIndex);
          }
          this._sendLED(channel, padIndex, 127);
        }
        break;

      case 'beatloop': {
        const beats = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4][padIndex] || 1;
        deck.autoLoop(beats);
        break;
      }

      case 'beatjump': {
        const jumps = [-32, -16, -8, -4, 4, 8, 16, 32][padIndex] || 0;
        deck.beatJump(jumps);
        break;
      }

      case 'sampler':
        window.dispatchEvent(new CustomEvent('midi-sampler', { detail: { channel, pad: padIndex, velocity } }));
        break;

      case 'drumpad':
        // Route to 808/synth pad engine
        if (this.app.padSynth) {
          const vel = velocity / 127;
          if (velocity > 0) {
            this.app.padSynth.padOn(padIndex, vel);
            this._sendLED(channel, padIndex, 127);
          } else {
            this.app.padSynth.padOff(padIndex);
            this._sendLED(channel, padIndex, 0);
          }
        }
        break;
    }
    this.app.updateUI();
  }

  // Handle pad note off (for synth release)
  _handlePadOff(channel, padIndex) {
    if (this.padMode[channel] === 'drumpad' && this.app.padSynth) {
      this.app.padSynth.padOff(padIndex);
      this._sendLED(channel, padIndex, 0);
    }
  }

  // Send LED feedback to controller
  _sendLED(channel, note, value) {
    if (!this.output) return;
    const midiChannel = channel === 'A' ? 0 : 1;
    this.output.send([0x90 | midiChannel, note, value]);
  }

  // Cycle pad mode
  cyclePadMode(channel) {
    const modes = ['hotcue', 'beatloop', 'beatjump', 'sampler', 'drumpad'];
    const idx = modes.indexOf(this.padMode[channel]);
    this.padMode[channel] = modes[(idx + 1) % modes.length];
    // Auto-show 808 panel when entering drumpad mode
    if (this.padMode[channel] === 'drumpad') {
      const panel = document.getElementById('pad-synth-panel');
      if (panel) panel.style.display = 'block';
    }
    return this.padMode[channel];
  }

  // Set all LEDs off
  resetLEDs() {
    if (!this.output) return;
    for (let ch = 0; ch < 2; ch++) {
      for (let note = 0; note < 128; note++) {
        this.output.send([0x90 | ch, note, 0]);
      }
    }
  }
}

window.AuralityMIDI = MIDIController;
