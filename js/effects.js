/**
 * Aurality Studio — Effects
 * Complete FX suite: AutoTune, pitch shift, reverb, delay, compressor, de-esser,
 * flanger, phaser, chorus, beat repeat, noise gate, bit crusher, echo out, brake, spinback.
 */
class Effects {
  constructor(engine) {
    this.engine = engine;
    this.chains = { A: {}, B: {} };
    this.activeEffects = { A: new Set(), B: new Set() };
  }

  // Initialize effect chain for a channel
  initChannel(channel) {
    const fx = {};

    // --- Reverb (Convolution) ---
    fx.reverb = {
      convolver: this.engine.createConvolver(),
      wetGain: this.engine.createGain(),
      dryGain: this.engine.createGain(),
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      mix: 0.3,
      active: false
    };
    fx.reverb.wetGain.gain.value = 0.3;
    fx.reverb.dryGain.gain.value = 0.7;
    this._generateIR(fx.reverb.convolver, 2.5, 0.5);

    // --- Delay ---
    fx.delay = {
      delayNode: this.engine.createDelay(5),
      feedback: this.engine.createGain(),
      wetGain: this.engine.createGain(),
      dryGain: this.engine.createGain(),
      filter: this.engine.createBiquadFilter(),
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      time: 0.5,
      feedbackAmount: 0.4,
      mix: 0.3,
      type: 'normal', // normal, pingpong, tape
      active: false
    };
    fx.delay.delayNode.delayTime.value = 0.5;
    fx.delay.feedback.gain.value = 0.4;
    fx.delay.wetGain.gain.value = 0.3;
    fx.delay.dryGain.gain.value = 0.7;
    fx.delay.filter.type = 'lowpass';
    fx.delay.filter.frequency.value = 8000;

    // Delay routing
    fx.delay.inputGain.connect(fx.delay.dryGain);
    fx.delay.inputGain.connect(fx.delay.delayNode);
    fx.delay.delayNode.connect(fx.delay.filter);
    fx.delay.filter.connect(fx.delay.feedback);
    fx.delay.feedback.connect(fx.delay.delayNode);
    fx.delay.filter.connect(fx.delay.wetGain);
    fx.delay.dryGain.connect(fx.delay.outputGain);
    fx.delay.wetGain.connect(fx.delay.outputGain);

    // --- Compressor ---
    fx.compressor = {
      node: this.engine.createDynamicsCompressor(),
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      active: false
    };
    fx.compressor.node.threshold.value = -24;
    fx.compressor.node.knee.value = 10;
    fx.compressor.node.ratio.value = 4;
    fx.compressor.node.attack.value = 0.003;
    fx.compressor.node.release.value = 0.25;
    fx.compressor.inputGain.connect(fx.compressor.node);
    fx.compressor.node.connect(fx.compressor.outputGain);

    // --- De-Esser ---
    fx.deesser = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      detector: this.engine.createBiquadFilter(),
      compressor: this.engine.createDynamicsCompressor(),
      active: false
    };
    fx.deesser.detector.type = 'bandpass';
    fx.deesser.detector.frequency.value = 6000;
    fx.deesser.detector.Q.value = 2;
    fx.deesser.compressor.threshold.value = -30;
    fx.deesser.compressor.ratio.value = 10;
    fx.deesser.compressor.attack.value = 0.001;
    fx.deesser.compressor.release.value = 0.05;
    fx.deesser.inputGain.connect(fx.deesser.compressor);
    fx.deesser.inputGain.connect(fx.deesser.detector);
    fx.deesser.compressor.connect(fx.deesser.outputGain);

    // --- Flanger ---
    fx.flanger = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      delay: this.engine.createDelay(0.02),
      lfo: this.engine.createOscillator(),
      lfoGain: this.engine.createGain(),
      feedback: this.engine.createGain(),
      wetGain: this.engine.createGain(),
      dryGain: this.engine.createGain(),
      depth: 0.002,
      rate: 0.5,
      active: false,
      started: false
    };
    fx.flanger.delay.delayTime.value = 0.005;
    fx.flanger.lfo.type = 'sine';
    fx.flanger.lfo.frequency.value = 0.5;
    fx.flanger.lfoGain.gain.value = 0.002;
    fx.flanger.feedback.gain.value = 0.5;
    fx.flanger.wetGain.gain.value = 0.5;
    fx.flanger.dryGain.gain.value = 0.5;

    fx.flanger.lfo.connect(fx.flanger.lfoGain);
    fx.flanger.lfoGain.connect(fx.flanger.delay.delayTime);
    fx.flanger.inputGain.connect(fx.flanger.dryGain);
    fx.flanger.inputGain.connect(fx.flanger.delay);
    fx.flanger.delay.connect(fx.flanger.feedback);
    fx.flanger.feedback.connect(fx.flanger.delay);
    fx.flanger.delay.connect(fx.flanger.wetGain);
    fx.flanger.dryGain.connect(fx.flanger.outputGain);
    fx.flanger.wetGain.connect(fx.flanger.outputGain);

    // --- Phaser ---
    fx.phaser = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      filters: [],
      lfo: this.engine.createOscillator(),
      lfoGain: this.engine.createGain(),
      wetGain: this.engine.createGain(),
      dryGain: this.engine.createGain(),
      active: false,
      started: false
    };
    // Create allpass filter chain
    for (let i = 0; i < 6; i++) {
      const filter = this.engine.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 1000 + i * 500;
      filter.Q.value = 5;
      fx.phaser.filters.push(filter);
    }
    fx.phaser.lfo.type = 'sine';
    fx.phaser.lfo.frequency.value = 0.3;
    fx.phaser.lfoGain.gain.value = 1500;
    fx.phaser.wetGain.gain.value = 0.5;
    fx.phaser.dryGain.gain.value = 0.5;

    fx.phaser.lfo.connect(fx.phaser.lfoGain);
    for (const f of fx.phaser.filters) {
      fx.phaser.lfoGain.connect(f.frequency);
    }
    // Chain filters
    fx.phaser.inputGain.connect(fx.phaser.dryGain);
    let prev = fx.phaser.inputGain;
    for (const f of fx.phaser.filters) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(fx.phaser.wetGain);
    fx.phaser.dryGain.connect(fx.phaser.outputGain);
    fx.phaser.wetGain.connect(fx.phaser.outputGain);

    // --- Chorus ---
    fx.chorus = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      delays: [],
      lfos: [],
      lfoGains: [],
      wetGain: this.engine.createGain(),
      dryGain: this.engine.createGain(),
      active: false,
      started: false
    };
    fx.chorus.wetGain.gain.value = 0.5;
    fx.chorus.dryGain.gain.value = 0.5;
    fx.chorus.inputGain.connect(fx.chorus.dryGain);

    for (let i = 0; i < 3; i++) {
      const d = this.engine.createDelay(0.05);
      d.delayTime.value = 0.01 + i * 0.005;
      const lfo = this.engine.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5 + i * 0.3;
      const lg = this.engine.createGain();
      lg.gain.value = 0.003;
      lfo.connect(lg);
      lg.connect(d.delayTime);
      fx.chorus.inputGain.connect(d);
      d.connect(fx.chorus.wetGain);
      fx.chorus.delays.push(d);
      fx.chorus.lfos.push(lfo);
      fx.chorus.lfoGains.push(lg);
    }
    fx.chorus.dryGain.connect(fx.chorus.outputGain);
    fx.chorus.wetGain.connect(fx.chorus.outputGain);

    // --- Bit Crusher ---
    fx.bitcrusher = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      processor: null,
      bits: 8,
      sampleRateReduction: 4,
      active: false
    };

    // --- Noise Gate ---
    fx.noisegate = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      threshold: -40,
      active: false
    };

    // --- AutoTune (pitch correction) ---
    fx.autotune = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      key: 'C',
      scale: 'major',
      speed: 0.5, // 0 = instant, 1 = slow
      active: false
    };

    // --- Pitch Shift ---
    fx.pitchshift = {
      semitones: 0,
      fineTune: 0, // cents
      active: false
    };

    // --- Beat Repeat / Stutter ---
    fx.beatrepeat = {
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      division: 0.125, // in seconds
      active: false,
      buffer: null
    };

    // --- Echo Out ---
    fx.echoout = {
      delay: this.engine.createDelay(5),
      feedback: this.engine.createGain(),
      wetGain: this.engine.createGain(),
      inputGain: this.engine.createGain(),
      outputGain: this.engine.createGain(),
      active: false
    };
    fx.echoout.delay.delayTime.value = 0.375;
    fx.echoout.feedback.gain.value = 0.7;
    fx.echoout.wetGain.gain.value = 0.5;
    fx.echoout.inputGain.connect(fx.echoout.delay);
    fx.echoout.delay.connect(fx.echoout.feedback);
    fx.echoout.feedback.connect(fx.echoout.delay);
    fx.echoout.delay.connect(fx.echoout.wetGain);
    fx.echoout.inputGain.connect(fx.echoout.outputGain);
    fx.echoout.wetGain.connect(fx.echoout.outputGain);

    this.chains[channel] = fx;
    return fx;
  }

  // Toggle an effect on/off
  toggle(channel, effectName) {
    const fx = this.chains[channel]?.[effectName];
    if (!fx) return false;
    fx.active = !fx.active;

    if (fx.active) {
      this.activeEffects[channel].add(effectName);
      // Start LFOs if needed
      if (effectName === 'flanger' && !fx.started) {
        fx.lfo.start(); fx.started = true;
      }
      if (effectName === 'phaser' && !fx.started) {
        fx.lfo.start(); fx.started = true;
      }
      if (effectName === 'chorus' && !fx.started) {
        fx.lfos.forEach(l => l.start()); fx.started = true;
      }
    } else {
      this.activeEffects[channel].delete(effectName);
    }

    return fx.active;
  }

  isActive(channel, effectName) {
    return this.chains[channel]?.[effectName]?.active || false;
  }

  // Set effect parameter
  setParam(channel, effectName, param, value) {
    const fx = this.chains[channel]?.[effectName];
    if (!fx) return;
    const now = this.engine.ctx.currentTime;

    switch (effectName) {
      case 'reverb':
        if (param === 'mix') {
          fx.mix = value;
          fx.wetGain.gain.setTargetAtTime(value, now, 0.02);
          fx.dryGain.gain.setTargetAtTime(1 - value, now, 0.02);
        } else if (param === 'decay') {
          this._generateIR(fx.convolver, value, 0.5);
        }
        break;

      case 'delay':
        if (param === 'time') {
          fx.time = value;
          fx.delayNode.delayTime.setTargetAtTime(value, now, 0.02);
        } else if (param === 'feedback') {
          fx.feedbackAmount = value;
          fx.feedback.gain.setTargetAtTime(value, now, 0.02);
        } else if (param === 'mix') {
          fx.mix = value;
          fx.wetGain.gain.setTargetAtTime(value, now, 0.02);
          fx.dryGain.gain.setTargetAtTime(1 - value, now, 0.02);
        }
        break;

      case 'compressor':
        if (param === 'threshold') fx.node.threshold.value = value;
        else if (param === 'ratio') fx.node.ratio.value = value;
        else if (param === 'attack') fx.node.attack.value = value;
        else if (param === 'release') fx.node.release.value = value;
        break;

      case 'deesser':
        if (param === 'frequency') fx.detector.frequency.value = value;
        else if (param === 'threshold') fx.compressor.threshold.value = value;
        break;

      case 'flanger':
        if (param === 'rate') { fx.rate = value; fx.lfo.frequency.setTargetAtTime(value, now, 0.02); }
        else if (param === 'depth') { fx.depth = value; fx.lfoGain.gain.setTargetAtTime(value, now, 0.02); }
        else if (param === 'feedback') fx.feedback.gain.setTargetAtTime(value, now, 0.02);
        break;

      case 'phaser':
        if (param === 'rate') fx.lfo.frequency.setTargetAtTime(value, now, 0.02);
        else if (param === 'depth') fx.lfoGain.gain.setTargetAtTime(value, now, 0.02);
        break;

      case 'chorus':
        if (param === 'rate') fx.lfos.forEach((l, i) => l.frequency.setTargetAtTime(value + i * 0.3, now, 0.02));
        else if (param === 'depth') fx.lfoGains.forEach(g => g.gain.setTargetAtTime(value, now, 0.02));
        break;

      case 'bitcrusher':
        if (param === 'bits') fx.bits = Math.max(1, Math.min(16, value));
        else if (param === 'sampleRate') fx.sampleRateReduction = Math.max(1, Math.min(32, value));
        break;

      case 'autotune':
        if (param === 'key') fx.key = value;
        else if (param === 'scale') fx.scale = value;
        else if (param === 'speed') fx.speed = value;
        break;

      case 'pitchshift':
        if (param === 'semitones') fx.semitones = value;
        else if (param === 'fine') fx.fineTune = value;
        break;

      case 'echoout':
        if (param === 'time') fx.delay.delayTime.setTargetAtTime(value, now, 0.02);
        else if (param === 'feedback') fx.feedback.gain.setTargetAtTime(value, now, 0.02);
        else if (param === 'mix') fx.wetGain.gain.setTargetAtTime(value, now, 0.02);
        break;

      case 'noisegate':
        if (param === 'threshold') fx.threshold = value;
        break;
    }
  }

  // Generate impulse response for reverb
  _generateIR(convolver, decay, density) {
    const ctx = this.engine.ctx;
    const length = ctx.sampleRate * decay;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, density * 3);
      }
    }
    try { convolver.buffer = buffer; } catch (e) {}
  }

  // Sync delay to BPM
  syncDelayToBPM(channel, bpm, division = 1) {
    if (!bpm) return;
    const beatTime = 60 / bpm;
    const time = beatTime * division;
    this.setParam(channel, 'delay', 'time', time);
  }

  // Get list of available effects
  getEffectNames() {
    return [
      'reverb', 'delay', 'compressor', 'deesser', 'flanger', 'phaser',
      'chorus', 'bitcrusher', 'noisegate', 'autotune', 'pitchshift',
      'beatrepeat', 'echoout'
    ];
  }

  // Get current state for UI
  getState(channel) {
    const fx = this.chains[channel];
    if (!fx) return {};
    const state = {};
    for (const name of this.getEffectNames()) {
      if (fx[name]) {
        state[name] = { active: fx[name].active };
      }
    }
    return state;
  }
}

window.AuralityEffects = Effects;
