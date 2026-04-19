/**
 * Aurality Studio — Audio Engine
 * Core Web Audio API engine managing the audio graph, routing, and master output.
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterAnalyser = null;
    this.masterCompressor = null;
    this.headphoneCtx = null;
    this.headphoneGain = null;
    this.channels = { A: null, B: null };
    this.crossfaderValue = 0.5;
    this.crossfaderCurve = 'smooth'; // smooth, sharp, constant
    this.sampleRate = 44100;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    // Master chain: compressor -> gain -> analyser -> destination
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -6;
    this.masterCompressor.knee.value = 10;
    this.masterCompressor.ratio.value = 4;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Create channel strips for A and B
    this.channels.A = this._createChannelStrip('A');
    this.channels.B = this._createChannelStrip('B');

    this.isInitialized = true;
    console.log('[AudioEngine] Initialized at', this.sampleRate, 'Hz');
  }

  _createChannelStrip(id) {
    const strip = {
      id,
      // Gain stages
      trimGain: this.ctx.createGain(),
      channelGain: this.ctx.createGain(),
      // 3-band EQ
      eqHi: this.ctx.createBiquadFilter(),
      eqMid: this.ctx.createBiquadFilter(),
      eqLo: this.ctx.createBiquadFilter(),
      // Filter sweep
      filter: this.ctx.createBiquadFilter(),
      filterEnabled: false,
      // Analyser
      analyser: this.ctx.createAnalyser(),
      // Pre-fader send for headphone cue
      preFaderSplit: this.ctx.createGain(),
      cueSend: this.ctx.createGain(),
      cueEnabled: false,
      // Input node (decks connect here)
      input: this.ctx.createGain()
    };

    strip.trimGain.gain.value = 1.0;
    strip.channelGain.gain.value = 1.0;
    strip.cueSend.gain.value = 0;

    // EQ setup
    strip.eqHi.type = 'highshelf';
    strip.eqHi.frequency.value = 3200;
    strip.eqHi.gain.value = 0;

    strip.eqMid.type = 'peaking';
    strip.eqMid.frequency.value = 1000;
    strip.eqMid.Q.value = 0.7;
    strip.eqMid.gain.value = 0;

    strip.eqLo.type = 'lowshelf';
    strip.eqLo.frequency.value = 320;
    strip.eqLo.gain.value = 0;

    // Filter
    strip.filter.type = 'lowpass';
    strip.filter.frequency.value = 20000;
    strip.filter.Q.value = 1;

    // Analyser
    strip.analyser.fftSize = 1024;
    strip.analyser.smoothingTimeConstant = 0.85;

    // Chain: input -> trim -> eqLo -> eqMid -> eqHi -> filter -> preFaderSplit
    //   preFaderSplit -> cueSend (headphone)
    //   preFaderSplit -> channelGain -> analyser -> masterCompressor
    strip.input.connect(strip.trimGain);
    strip.trimGain.connect(strip.eqLo);
    strip.eqLo.connect(strip.eqMid);
    strip.eqMid.connect(strip.eqHi);
    strip.eqHi.connect(strip.filter);
    strip.filter.connect(strip.preFaderSplit);
    strip.preFaderSplit.connect(strip.cueSend);
    strip.preFaderSplit.connect(strip.channelGain);
    strip.channelGain.connect(strip.analyser);
    strip.analyser.connect(this.masterCompressor);

    return strip;
  }

  getChannelInput(channel) {
    return this.channels[channel]?.input || null;
  }

  setTrim(channel, value) {
    const ch = this.channels[channel];
    if (ch) ch.trimGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setChannelVolume(channel, value) {
    const ch = this.channels[channel];
    if (ch) ch.channelGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setEQ(channel, band, value) {
    const ch = this.channels[channel];
    if (!ch) return;
    const node = band === 'hi' ? ch.eqHi : band === 'mid' ? ch.eqMid : ch.eqLo;
    // value: -26 to +6 dB, kill at -26
    node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setFilter(channel, frequency, type = 'lowpass') {
    const ch = this.channels[channel];
    if (!ch) return;
    ch.filter.type = type;
    ch.filter.frequency.setTargetAtTime(
      Math.max(20, Math.min(20000, frequency)),
      this.ctx.currentTime, 0.02
    );
  }

  setCrossfader(value) {
    this.crossfaderValue = value; // 0 = full A, 1 = full B
    let gainA, gainB;
    switch (this.crossfaderCurve) {
      case 'sharp':
        gainA = value < 0.5 ? 1 : Math.max(0, 1 - (value - 0.5) * 4);
        gainB = value > 0.5 ? 1 : Math.max(0, 1 - (0.5 - value) * 4);
        break;
      case 'constant':
        gainA = Math.cos(value * Math.PI / 2);
        gainB = Math.sin(value * Math.PI / 2);
        break;
      default: // smooth
        gainA = Math.cos(value * Math.PI / 2);
        gainB = Math.sin(value * Math.PI / 2);
    }
    if (this.channels.A) {
      this.channels.A.channelGain.gain.setTargetAtTime(
        gainA * this.channels.A.channelGain.gain.value,
        this.ctx.currentTime, 0.01
      );
    }
    if (this.channels.B) {
      this.channels.B.channelGain.gain.setTargetAtTime(
        gainB * this.channels.B.channelGain.gain.value,
        this.ctx.currentTime, 0.01
      );
    }
  }

  setCue(channel, enabled) {
    const ch = this.channels[channel];
    if (!ch) return;
    ch.cueEnabled = enabled;
    ch.cueSend.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.01);
  }

  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    }
  }

  getMasterLevel() {
    if (!this.masterAnalyser) return 0;
    const data = new Float32Array(this.masterAnalyser.fftSize);
    this.masterAnalyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  getChannelLevel(channel) {
    const ch = this.channels[channel];
    if (!ch) return 0;
    const data = new Float32Array(ch.analyser.fftSize);
    ch.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  getFrequencyData(channel) {
    const analyser = channel === 'master' ? this.masterAnalyser : this.channels[channel]?.analyser;
    if (!analyser) return new Uint8Array(0);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }

  getCurrentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  createConvolver() {
    return this.ctx.createConvolver();
  }

  createGain() {
    return this.ctx.createGain();
  }

  createBiquadFilter() {
    return this.ctx.createBiquadFilter();
  }

  createDelay(maxTime = 5) {
    return this.ctx.createDelay(maxTime);
  }

  createDynamicsCompressor() {
    return this.ctx.createDynamicsCompressor();
  }

  createWaveShaper() {
    return this.ctx.createWaveShaper();
  }

  createOscillator() {
    return this.ctx.createOscillator();
  }

  createAnalyser() {
    return this.ctx.createAnalyser();
  }

  createScriptProcessor(bufferSize, inCh, outCh) {
    return this.ctx.createScriptProcessor(bufferSize, inCh, outCh);
  }

  decodeAudioData(buffer) {
    return this.ctx.decodeAudioData(buffer);
  }

  createBufferSource() {
    return this.ctx.createBufferSource();
  }

  createBuffer(channels, length, sampleRate) {
    return this.ctx.createBuffer(channels, length, sampleRate);
  }

  connectToMaster(node) {
    node.connect(this.masterCompressor);
  }
}

window.AuralityAudioEngine = AudioEngine;
