/**
 * Aurality Studio — Deck
 * Full deck implementation: load, play, cue, loop, scratch, slip mode, pitch/tempo control.
 */
class Deck {
  constructor(engine, channel) {
    this.engine = engine;
    this.channel = channel; // 'A' or 'B'
    this.audioBuffer = null;
    this.source = null;
    this.gainNode = engine.ctx.createGain();
    this.playbackRate = 1.0;
    this.pitchRange = 0.06; // +/- 6%
    this.pitchAdjust = 0; // -1 to 1
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pauseOffset = 0;
    this.duration = 0;
    this.bpm = 0;
    this.detectedKey = '';
    this.beatGrid = [];
    this.waveformData = null;

    // Cue points
    this.cuePoint = 0;
    this.hotCues = new Array(8).fill(null); // 8 hot cue slots

    // Loops
    this.loopIn = null;
    this.loopOut = null;
    this.loopActive = false;
    this.loopRollActive = false;
    this.loopRollPosition = 0;

    // Slip mode
    this.slipMode = false;
    this.slipPosition = 0;
    this.slipPlaying = false;
    this.slipSource = null;

    // Scratch
    this.isScratchMode = false;
    this.scratchPosition = 0;

    // Track info
    this.trackName = '';
    this.trackArtist = '';

    // Master tempo
    this.masterTempo = false;

    // Connect gain to channel input
    this.gainNode.connect(engine.getChannelInput(channel));
  }

  async loadTrack(audioData, metadata = {}) {
    try {
      if (this.isPlaying) this.stop();
      const arrayBuffer = audioData instanceof ArrayBuffer ? audioData : await audioData.arrayBuffer();
      this.audioBuffer = await this.engine.decodeAudioData(arrayBuffer.slice(0));
      this.duration = this.audioBuffer.duration;
      this.pauseOffset = 0;
      this.cuePoint = 0;
      this.trackName = metadata.name || 'Unknown';
      this.trackArtist = metadata.artist || 'Unknown';

      // Generate waveform data
      this.waveformData = this._generateWaveformData();

      // Detect BPM
      this.bpm = await this._detectBPM();

      // Detect key
      this.detectedKey = this._detectKey();

      // Generate beat grid
      this._generateBeatGrid();

      console.log(`[Deck ${this.channel}] Loaded: ${this.trackName} | BPM: ${this.bpm.toFixed(1)} | Key: ${this.detectedKey}`);
      return { bpm: this.bpm, key: this.detectedKey, duration: this.duration };
    } catch (e) {
      console.error(`[Deck ${this.channel}] Load error:`, e);
      throw e;
    }
  }

  play() {
    if (!this.audioBuffer || this.isPlaying) return;
    this._startPlayback(this.pauseOffset);
    this.isPlaying = true;
    this.isPaused = false;

    if (this.slipMode) {
      this.slipPosition = this.pauseOffset;
      this.slipPlaying = true;
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentPosition();
    this._stopSource();
    this.isPlaying = false;
    this.isPaused = true;
  }

  stop() {
    this._stopSource();
    this.pauseOffset = this.cuePoint;
    this.isPlaying = false;
    this.isPaused = false;
  }

  cuePress() {
    if (this.isPlaying) {
      // Set cue point at current position and stop
      this.cuePoint = this.getCurrentPosition();
      this.pause();
      this.pauseOffset = this.cuePoint;
      this.seekTo(this.cuePoint);
    } else {
      // Jump to cue point
      this.pauseOffset = this.cuePoint;
      this.seekTo(this.cuePoint);
    }
  }

  seekTo(position) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this._stopSource();
    this.pauseOffset = Math.max(0, Math.min(position, this.duration));
    if (wasPlaying) this._startPlayback(this.pauseOffset);
  }

  getCurrentPosition() {
    if (!this.isPlaying || !this.source) return this.pauseOffset;
    const elapsed = (this.engine.ctx.currentTime - this.startTime) * this.getEffectiveRate();
    let pos = this.pauseOffset + elapsed;

    // Handle loop
    if (this.loopActive && this.loopIn !== null && this.loopOut !== null) {
      const loopLen = this.loopOut - this.loopIn;
      if (loopLen > 0 && pos >= this.loopOut) {
        pos = this.loopIn + ((pos - this.loopIn) % loopLen);
      }
    }
    return Math.min(pos, this.duration);
  }

  getEffectiveRate() {
    return this.playbackRate * (1 + this.pitchAdjust * this.pitchRange);
  }

  // Pitch range: 6%, 10%, 16%, wide(100%)
  setPitchRange(range) {
    const ranges = { '6': 0.06, '10': 0.10, '16': 0.16, 'wide': 1.0 };
    this.pitchRange = ranges[range] || 0.06;
  }

  setPitch(value) {
    // value: -1 to 1
    this.pitchAdjust = Math.max(-1, Math.min(1, value));
    if (this.source) {
      this.source.playbackRate.setTargetAtTime(this.getEffectiveRate(), this.engine.ctx.currentTime, 0.05);
    }
  }

  // Hot cues
  setHotCue(index, position = null) {
    if (index < 0 || index >= 8) return;
    this.hotCues[index] = position !== null ? position : this.getCurrentPosition();
  }

  triggerHotCue(index) {
    if (index < 0 || index >= 8 || this.hotCues[index] === null) return;
    this.seekTo(this.hotCues[index]);
    if (!this.isPlaying) this.play();
  }

  deleteHotCue(index) {
    if (index < 0 || index >= 8) return;
    this.hotCues[index] = null;
  }

  // Loops
  setLoopIn() {
    this.loopIn = this.getCurrentPosition();
    if (this.loopOut !== null && this.loopOut > this.loopIn) {
      this.loopActive = true;
    }
  }

  setLoopOut() {
    this.loopOut = this.getCurrentPosition();
    if (this.loopIn !== null && this.loopOut > this.loopIn) {
      this.loopActive = true;
    }
  }

  // Auto loop in beats
  autoLoop(beats) {
    if (!this.bpm || this.bpm === 0) return;
    const beatDuration = 60 / this.bpm;
    const loopDuration = beatDuration * beats;
    this.loopIn = this.getCurrentPosition();
    this.loopOut = this.loopIn + loopDuration;
    this.loopActive = true;
    // Restart at loop in
    this.seekTo(this.loopIn);
  }

  toggleLoop() {
    this.loopActive = !this.loopActive;
  }

  // Loop roll: like auto loop but stores position for slip
  loopRoll(beats) {
    if (!this.bpm) return;
    this.loopRollPosition = this.getCurrentPosition();
    this.loopRollActive = true;
    this.autoLoop(beats);
  }

  loopRollRelease() {
    if (!this.loopRollActive) return;
    this.loopActive = false;
    this.loopRollActive = false;
    if (this.slipMode) {
      // Return to where the track would have been
      const elapsed = this.engine.ctx.currentTime - this.startTime;
      this.seekTo(this.loopRollPosition + elapsed * this.getEffectiveRate());
    }
  }

  // Slip mode
  toggleSlipMode() {
    this.slipMode = !this.slipMode;
    if (this.slipMode && this.isPlaying) {
      this.slipPosition = this.getCurrentPosition();
      this.slipPlaying = true;
    }
  }

  // Scratch simulation
  scratch(delta) {
    if (!this.audioBuffer) return;
    this.isScratchMode = true;
    const pos = this.getCurrentPosition() + delta;
    this.seekTo(Math.max(0, Math.min(pos, this.duration)));
  }

  scratchRelease() {
    this.isScratchMode = false;
    if (this.slipMode && this.slipPlaying) {
      const elapsed = this.engine.ctx.currentTime - this.startTime;
      this.seekTo(this.slipPosition + elapsed * this.getEffectiveRate());
    }
  }

  // Beat jump
  beatJump(beats) {
    if (!this.bpm) return;
    const jumpTime = (60 / this.bpm) * beats;
    this.seekTo(this.getCurrentPosition() + jumpTime);
  }

  // Sync to another deck
  syncTo(otherDeck) {
    if (!otherDeck.bpm || !this.bpm) return;
    const ratio = otherDeck.bpm / this.bpm;
    this.playbackRate = ratio;
    if (this.source) {
      this.source.playbackRate.setTargetAtTime(this.getEffectiveRate(), this.engine.ctx.currentTime, 0.05);
    }
  }

  // Brake effect (slow down to stop)
  brake(duration = 2) {
    if (!this.source || !this.isPlaying) return;
    const now = this.engine.ctx.currentTime;
    this.source.playbackRate.setValueAtTime(this.getEffectiveRate(), now);
    this.source.playbackRate.linearRampToValueAtTime(0.01, now + duration);
    setTimeout(() => {
      this.pauseOffset = this.getCurrentPosition();
      this._stopSource();
      this.isPlaying = false;
    }, duration * 1000);
  }

  // Spinback effect
  spinback(duration = 0.5) {
    if (!this.source || !this.isPlaying) return;
    const now = this.engine.ctx.currentTime;
    this.source.playbackRate.setValueAtTime(this.getEffectiveRate(), now);
    this.source.playbackRate.linearRampToValueAtTime(-2, now + duration);
    setTimeout(() => {
      this.pauseOffset = this.getCurrentPosition();
      this._stopSource();
      this.isPlaying = false;
    }, duration * 1000);
  }

  _startPlayback(offset) {
    this._stopSource();
    this.source = this.engine.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.playbackRate.value = this.getEffectiveRate();
    this.source.connect(this.gainNode);

    // Handle loop
    if (this.loopActive && this.loopIn !== null && this.loopOut !== null) {
      this.source.loopStart = this.loopIn;
      this.source.loopEnd = this.loopOut;
      this.source.loop = true;
      this.source.start(0, offset);
    } else {
      this.source.loop = false;
      this.source.start(0, offset);
      this.source.onended = () => {
        if (this.isPlaying && !this.loopActive) {
          this.isPlaying = false;
          this.pauseOffset = 0;
          window.dispatchEvent(new CustomEvent('deck-ended', { detail: { channel: this.channel } }));
        }
      };
    }
    this.startTime = this.engine.ctx.currentTime;
    this.pauseOffset = offset;
  }

  _stopSource() {
    if (this.source) {
      try { this.source.stop(); } catch (e) {}
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
  }

  _generateWaveformData() {
    if (!this.audioBuffer) return null;
    const rawData = this.audioBuffer.getChannelData(0);
    const samples = 800; // waveform resolution
    const blockSize = Math.floor(rawData.length / samples);
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j]);
      }
      data[i] = sum / blockSize;
    }
    return data;
  }

  async _detectBPM() {
    if (!this.audioBuffer) return 120;
    try {
      const offlineCtx = new OfflineAudioContext(1, this.audioBuffer.length, this.audioBuffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = this.audioBuffer;

      // Lowpass filter to isolate kick/bass
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      source.connect(filter);
      filter.connect(offlineCtx.destination);
      source.start(0);

      const rendered = await offlineCtx.startRendering();
      const data = rendered.getChannelData(0);

      // Peak detection with autocorrelation
      const peaks = this._findPeaks(data, this.audioBuffer.sampleRate);
      if (peaks.length < 2) return 120;

      // Calculate intervals
      const intervals = [];
      for (let i = 1; i < Math.min(peaks.length, 100); i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
      }

      // Find most common interval (histogram approach)
      const bpmCounts = {};
      for (const interval of intervals) {
        const bpm = Math.round(60 * this.audioBuffer.sampleRate / interval);
        if (bpm >= 60 && bpm <= 200) {
          const rounded = Math.round(bpm);
          bpmCounts[rounded] = (bpmCounts[rounded] || 0) + 1;
        }
      }

      let bestBPM = 120;
      let bestCount = 0;
      for (const [bpm, count] of Object.entries(bpmCounts)) {
        if (count > bestCount) {
          bestCount = count;
          bestBPM = parseInt(bpm);
        }
      }

      // If BPM is very low, try doubling
      if (bestBPM < 80) bestBPM *= 2;

      return bestBPM;
    } catch (e) {
      console.warn('[Deck] BPM detection failed, defaulting to 120:', e);
      return 120;
    }
  }

  _findPeaks(data, sampleRate) {
    const peaks = [];
    const threshold = 0.3;
    const minPeakDistance = sampleRate * 0.2; // minimum 200ms between peaks

    // Compute envelope
    const windowSize = Math.floor(sampleRate * 0.01);
    const envelope = new Float32Array(Math.floor(data.length / windowSize));
    for (let i = 0; i < envelope.length; i++) {
      let sum = 0;
      const start = i * windowSize;
      for (let j = 0; j < windowSize && start + j < data.length; j++) {
        sum += data[start + j] * data[start + j];
      }
      envelope[i] = Math.sqrt(sum / windowSize);
    }

    // Normalize
    const maxVal = Math.max(...envelope);
    if (maxVal === 0) return peaks;
    for (let i = 0; i < envelope.length; i++) envelope[i] /= maxVal;

    // Find peaks
    let lastPeak = -minPeakDistance;
    for (let i = 1; i < envelope.length - 1; i++) {
      const samplePos = i * windowSize;
      if (envelope[i] > threshold &&
          envelope[i] > envelope[i - 1] &&
          envelope[i] >= envelope[i + 1] &&
          samplePos - lastPeak > minPeakDistance) {
        peaks.push(samplePos);
        lastPeak = samplePos;
      }
    }
    return peaks;
  }

  _detectKey() {
    if (!this.audioBuffer) return 'N/A';
    try {
      const data = this.audioBuffer.getChannelData(0);
      const fftSize = 4096;
      const sampleRate = this.audioBuffer.sampleRate;

      // Simple chromagram approach: analyze first 10 seconds
      const analyzeLength = Math.min(data.length, sampleRate * 10);
      const chromagram = new Float32Array(12);

      // Note frequencies for octave 4
      const noteFreqs = [
        261.63, 277.18, 293.66, 311.13, 329.63, 349.23,
        369.99, 392.00, 415.30, 440.00, 466.16, 493.88
      ];
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

      // Goertzel-like approach for each chroma bin
      for (let n = 0; n < 12; n++) {
        let energy = 0;
        for (let octave = 2; octave <= 6; octave++) {
          const freq = noteFreqs[n] * Math.pow(2, octave - 4);
          const k = Math.round(freq * fftSize / sampleRate);
          if (k < fftSize / 2) {
            // Simple DFT at this frequency
            let real = 0, imag = 0;
            const step = Math.max(1, Math.floor(analyzeLength / fftSize));
            for (let i = 0; i < fftSize && i * step < analyzeLength; i++) {
              const angle = 2 * Math.PI * k * i / fftSize;
              real += data[i * step] * Math.cos(angle);
              imag += data[i * step] * Math.sin(angle);
            }
            energy += Math.sqrt(real * real + imag * imag);
          }
        }
        chromagram[n] = energy;
      }

      // Key profiles (Krumhansl-Kessler)
      const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
      const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

      let bestKey = 'C';
      let bestCorr = -Infinity;

      for (let shift = 0; shift < 12; shift++) {
        // Rotate chromagram
        const rotated = new Float32Array(12);
        for (let i = 0; i < 12; i++) rotated[i] = chromagram[(i + shift) % 12];

        // Correlate with major
        let corrMaj = this._correlate(rotated, majorProfile);
        if (corrMaj > bestCorr) {
          bestCorr = corrMaj;
          bestKey = noteNames[shift];
        }

        // Correlate with minor
        let corrMin = this._correlate(rotated, minorProfile);
        if (corrMin > bestCorr) {
          bestCorr = corrMin;
          bestKey = noteNames[shift] + 'm';
        }
      }

      // Convert to Camelot
      return this._toCamelot(bestKey);
    } catch (e) {
      return 'N/A';
    }
  }

  _correlate(a, b) {
    let sum = 0, sumA = 0, sumB = 0;
    const meanA = a.reduce((s, v) => s + v, 0) / a.length;
    const meanB = b.reduce((s, v) => s + v, 0) / b.length;
    for (let i = 0; i < a.length; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      sum += da * db;
      sumA += da * da;
      sumB += db * db;
    }
    return sum / (Math.sqrt(sumA * sumB) || 1);
  }

  _toCamelot(key) {
    const camelotMap = {
      'C': '8B', 'C#': '3B', 'D': '10B', 'D#': '5B', 'E': '12B', 'F': '7B',
      'F#': '2B', 'G': '9B', 'G#': '4B', 'A': '11B', 'A#': '6B', 'B': '1B',
      'Cm': '5A', 'C#m': '12A', 'Dm': '7A', 'D#m': '2A', 'Em': '9A', 'Fm': '4A',
      'F#m': '11A', 'Gm': '6A', 'G#m': '1A', 'Am': '8A', 'A#m': '3A', 'Bm': '10A'
    };
    return camelotMap[key] || key;
  }

  _generateBeatGrid() {
    if (!this.bpm || this.bpm === 0) { this.beatGrid = []; return; }
    const interval = 60 / this.bpm;
    this.beatGrid = [];
    for (let t = 0; t < this.duration; t += interval) {
      this.beatGrid.push(t);
    }
  }
}

window.AuralityDeck = Deck;
