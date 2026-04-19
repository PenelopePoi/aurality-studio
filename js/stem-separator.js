/**
 * Aurality Studio — Stem Separator
 * Real-time frequency-band stem separation: vocals, drums, bass, melody.
 */
class StemSeparator {
  constructor(engine) {
    this.engine = engine;
    this.active = false;
    this.stems = {};
    this.channelStems = { A: null, B: null };
  }

  // Create stem separation chain for a channel
  createStemChain(channel) {
    const ctx = this.engine.ctx;

    const chain = {
      input: ctx.createGain(),
      output: ctx.createGain(),

      // Bass stem: 20-250 Hz
      bass: {
        filter: ctx.createBiquadFilter(),
        gain: ctx.createGain(),
        muted: false
      },
      // Drums stem: 250-4000 Hz, transient-focused
      drums: {
        lowCut: ctx.createBiquadFilter(),
        highCut: ctx.createBiquadFilter(),
        gain: ctx.createGain(),
        muted: false
      },
      // Vocals stem: 300-4000 Hz, mid-focused
      vocals: {
        lowCut: ctx.createBiquadFilter(),
        highCut: ctx.createBiquadFilter(),
        midBoost: ctx.createBiquadFilter(),
        gain: ctx.createGain(),
        muted: false
      },
      // Melody/Other stem: 4000-20000 Hz
      melody: {
        filter: ctx.createBiquadFilter(),
        gain: ctx.createGain(),
        muted: false
      }
    };

    // Configure bass filter
    chain.bass.filter.type = 'lowpass';
    chain.bass.filter.frequency.value = 250;
    chain.bass.filter.Q.value = 0.7;
    chain.bass.gain.gain.value = 1.0;

    // Configure drums filters (bandpass 250-4000)
    chain.drums.lowCut.type = 'highpass';
    chain.drums.lowCut.frequency.value = 250;
    chain.drums.highCut.type = 'lowpass';
    chain.drums.highCut.frequency.value = 4000;
    chain.drums.gain.gain.value = 1.0;

    // Configure vocals filters (bandpass 300-4000 with mid boost)
    chain.vocals.lowCut.type = 'highpass';
    chain.vocals.lowCut.frequency.value = 300;
    chain.vocals.highCut.type = 'lowpass';
    chain.vocals.highCut.frequency.value = 4000;
    chain.vocals.midBoost.type = 'peaking';
    chain.vocals.midBoost.frequency.value = 1500;
    chain.vocals.midBoost.Q.value = 1;
    chain.vocals.midBoost.gain.value = 3;
    chain.vocals.gain.gain.value = 1.0;

    // Configure melody filter
    chain.melody.filter.type = 'highpass';
    chain.melody.filter.frequency.value = 4000;
    chain.melody.gain.gain.value = 1.0;

    // Routing
    // Bass path
    chain.input.connect(chain.bass.filter);
    chain.bass.filter.connect(chain.bass.gain);
    chain.bass.gain.connect(chain.output);

    // Drums path
    chain.input.connect(chain.drums.lowCut);
    chain.drums.lowCut.connect(chain.drums.highCut);
    chain.drums.highCut.connect(chain.drums.gain);
    chain.drums.gain.connect(chain.output);

    // Vocals path
    chain.input.connect(chain.vocals.lowCut);
    chain.vocals.lowCut.connect(chain.vocals.highCut);
    chain.vocals.highCut.connect(chain.vocals.midBoost);
    chain.vocals.midBoost.connect(chain.vocals.gain);
    chain.vocals.gain.connect(chain.output);

    // Melody path
    chain.input.connect(chain.melody.filter);
    chain.melody.filter.connect(chain.melody.gain);
    chain.melody.gain.connect(chain.output);

    this.channelStems[channel] = chain;
    return chain;
  }

  // Toggle stem mute/unmute
  toggleStem(channel, stemName) {
    const chain = this.channelStems[channel];
    if (!chain || !chain[stemName]) return false;

    const stem = chain[stemName];
    stem.muted = !stem.muted;
    stem.gain.gain.setTargetAtTime(
      stem.muted ? 0 : 1,
      this.engine.ctx.currentTime,
      0.02
    );

    return !stem.muted; // return new state (true = audible)
  }

  // Set stem volume
  setStemVolume(channel, stemName, volume) {
    const chain = this.channelStems[channel];
    if (!chain || !chain[stemName]) return;

    const stem = chain[stemName];
    if (!stem.muted) {
      stem.gain.gain.setTargetAtTime(
        Math.max(0, Math.min(2, volume)),
        this.engine.ctx.currentTime,
        0.02
      );
    }
  }

  // Solo a stem (mute all others)
  soloStem(channel, stemName) {
    const chain = this.channelStems[channel];
    if (!chain) return;

    const stemNames = ['bass', 'drums', 'vocals', 'melody'];
    for (const name of stemNames) {
      if (!chain[name]) continue;
      const isSoloed = name === stemName;
      chain[name].muted = !isSoloed;
      chain[name].gain.gain.setTargetAtTime(
        isSoloed ? 1 : 0,
        this.engine.ctx.currentTime,
        0.02
      );
    }
  }

  // Unsolo (restore all stems)
  unsoloAll(channel) {
    const chain = this.channelStems[channel];
    if (!chain) return;

    const stemNames = ['bass', 'drums', 'vocals', 'melody'];
    for (const name of stemNames) {
      if (!chain[name]) continue;
      chain[name].muted = false;
      chain[name].gain.gain.setTargetAtTime(1, this.engine.ctx.currentTime, 0.02);
    }
  }

  // Get stem state for UI
  getState(channel) {
    const chain = this.channelStems[channel];
    if (!chain) return {};
    return {
      bass: { muted: chain.bass.muted, volume: chain.bass.gain.gain.value },
      drums: { muted: chain.drums.muted, volume: chain.drums.gain.gain.value },
      vocals: { muted: chain.vocals.muted, volume: chain.vocals.gain.gain.value },
      melody: { muted: chain.melody.muted, volume: chain.melody.gain.gain.value }
    };
  }
}

window.AuralityStemSeparator = StemSeparator;
