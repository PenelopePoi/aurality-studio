/**
 * Aurality Studio — Performance Recorder
 * Records entire mix as WAV with session timeline.
 */
class Recorder {
  constructor(engine) {
    this.engine = engine;
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = 0;
    this.duration = 0;
    this.timeline = []; // Session events
    this.destination = null;
    this.stream = null;
  }

  start() {
    if (this.isRecording) return;

    try {
      // Create a MediaStream from the audio context destination
      this.destination = this.engine.ctx.createMediaStreamDestination();
      this.engine.masterGain.connect(this.destination);

      this.stream = this.destination.stream;
      const options = { mimeType: 'audio/webm;codecs=opus' };

      // Fallback mime types
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options.mimeType = 'audio/ogg;codecs=opus';
        } else {
          delete options.mimeType;
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.timeline = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        this._finalizeRecording();
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.isPaused = false;
      this.startTime = Date.now();

      this.addEvent('recording-start', 'Recording started');
      console.log('[Recorder] Started');
    } catch (e) {
      console.error('[Recorder] Failed to start:', e);
    }
  }

  stop() {
    if (!this.isRecording) return;
    this.addEvent('recording-stop', 'Recording stopped');
    this.duration = (Date.now() - this.startTime) / 1000;
    this.mediaRecorder.stop();
    this.isRecording = false;

    // Disconnect from master
    try {
      this.engine.masterGain.disconnect(this.destination);
    } catch (e) {}
  }

  pause() {
    if (!this.isRecording || this.isPaused) return;
    this.mediaRecorder.pause();
    this.isPaused = true;
    this.addEvent('recording-pause', 'Recording paused');
  }

  resume() {
    if (!this.isRecording || !this.isPaused) return;
    this.mediaRecorder.resume();
    this.isPaused = false;
    this.addEvent('recording-resume', 'Recording resumed');
  }

  addEvent(type, description, data = null) {
    this.timeline.push({
      time: this.isRecording ? (Date.now() - this.startTime) / 1000 : 0,
      type,
      description,
      data,
      timestamp: Date.now()
    });
  }

  getElapsed() {
    if (!this.isRecording) return this.duration;
    return (Date.now() - this.startTime) / 1000;
  }

  _finalizeRecording() {
    if (this.chunks.length === 0) return;

    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Auto-download
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurality-mix-${timestamp}.webm`;

    // Dispatch event with recording data
    window.dispatchEvent(new CustomEvent('recording-complete', {
      detail: {
        blob,
        url,
        duration: this.duration,
        timeline: [...this.timeline],
        filename: a.download
      }
    }));

    console.log(`[Recorder] Complete: ${this.duration.toFixed(1)}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // Download the recording
  downloadRecording(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'aurality-mix.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Convert to WAV (offline rendering approach)
  async exportAsWAV() {
    if (this.chunks.length === 0) return null;

    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const arrayBuffer = await blob.arrayBuffer();

    try {
      const audioBuffer = await this.engine.ctx.decodeAudioData(arrayBuffer);
      return this._audioBufferToWAV(audioBuffer);
    } catch (e) {
      console.warn('[Recorder] WAV export failed, returning webm');
      return blob;
    }
  }

  _audioBufferToWAV(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const wav = new ArrayBuffer(totalLength);
    const view = new DataView(wav);

    // RIFF header
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    this._writeString(view, 8, 'WAVE');

    // fmt chunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave channels
    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([wav], { type: 'audio/wav' });
  }

  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

window.AuralityRecorder = Recorder;
