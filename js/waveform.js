/**
 * Aurality Studio — Waveform Renderer
 * Canvas-based waveform display with beat grid, cue points, loops, and playhead.
 */
class WaveformRenderer {
  constructor(canvasId, channel) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.channel = channel;
    this.waveformData = null;
    this.duration = 0;
    this.playPosition = 0;
    this.beatGrid = [];
    this.hotCues = [];
    this.loopIn = null;
    this.loopOut = null;
    this.loopActive = false;
    this.cuePoint = 0;
    this.zoom = 1;
    this.scrollOffset = 0;
    this.isDragging = false;
    this.colorPrimary = channel === 'A' ? '#00e5ff' : '#ff0066';
    this.colorSecondary = channel === 'A' ? '#0088aa' : '#aa0044';
    this.colorBeat = 'rgba(255,255,255,0.15)';
    this.colorCue = '#ffaa00';
    this.colorLoop = 'rgba(0, 255, 100, 0.2)';
    this.colorPlayhead = '#ffffff';

    // Frequency color mode
    this.frequencyColorMode = true;

    this._setupInteraction();
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width * (window.devicePixelRatio || 1);
      this.canvas.height = rect.height * (window.devicePixelRatio || 1);
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
    }
  }

  _setupInteraction() {
    if (!this.canvas) return;

    // Click to seek
    this.canvas.addEventListener('click', (e) => {
      if (!this.waveformData || !this.duration) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const position = x * this.duration;
      window.dispatchEvent(new CustomEvent('waveform-seek', {
        detail: { channel: this.channel, position }
      }));
    });

    // Drag for scratch
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this._lastMouseX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.waveformData) return;
      const delta = (e.clientX - this._lastMouseX) / this.canvas.getBoundingClientRect().width;
      this._lastMouseX = e.clientX;
      window.dispatchEvent(new CustomEvent('waveform-scratch', {
        detail: { channel: this.channel, delta: delta * this.duration * 0.1 }
      }));
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        window.dispatchEvent(new CustomEvent('waveform-scratch-release', {
          detail: { channel: this.channel }
        }));
      }
    });

    // Scroll to zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(1, Math.min(20, this.zoom + (e.deltaY > 0 ? -0.5 : 0.5)));
    });
  }

  setData(waveformData, duration, beatGrid) {
    this.waveformData = waveformData;
    this.duration = duration;
    this.beatGrid = beatGrid || [];
  }

  update(position, hotCues, loopIn, loopOut, loopActive, cuePoint) {
    this.playPosition = position;
    this.hotCues = hotCues || [];
    this.loopIn = loopIn;
    this.loopOut = loopOut;
    this.loopActive = loopActive;
    this.cuePoint = cuePoint;
  }

  render(frequencyData) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, w, h);

    if (!this.waveformData || !this.waveformData.length) {
      // Empty state
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = `${14 * (window.devicePixelRatio || 1)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Drop a track here', w / 2, h / 2);
      return;
    }

    const samples = this.waveformData.length;
    const progress = this.duration > 0 ? this.playPosition / this.duration : 0;
    const centerSample = Math.floor(progress * samples);

    // Calculate visible range based on zoom
    const visibleSamples = Math.floor(samples / this.zoom);
    const startSample = Math.max(0, centerSample - Math.floor(visibleSamples / 2));
    const endSample = Math.min(samples, startSample + visibleSamples);

    // Draw beat grid
    if (this.beatGrid.length > 0) {
      ctx.strokeStyle = this.colorBeat;
      ctx.lineWidth = 1;
      for (const beat of this.beatGrid) {
        const beatSample = (beat / this.duration) * samples;
        if (beatSample >= startSample && beatSample <= endSample) {
          const x = ((beatSample - startSample) / visibleSamples) * w;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
      }
    }

    // Draw loop region
    if (this.loopIn !== null && this.loopOut !== null) {
      const loopStartX = ((this.loopIn / this.duration * samples - startSample) / visibleSamples) * w;
      const loopEndX = ((this.loopOut / this.duration * samples - startSample) / visibleSamples) * w;
      ctx.fillStyle = this.loopActive ? 'rgba(0, 255, 100, 0.15)' : 'rgba(0, 255, 100, 0.05)';
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, h);

      // Loop boundaries
      ctx.strokeStyle = this.loopActive ? '#00ff64' : 'rgba(0,255,100,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, h); ctx.stroke();
    }

    // Draw waveform
    const barWidth = Math.max(1, w / visibleSamples);
    const midY = h / 2;

    for (let i = startSample; i < endSample; i++) {
      const x = ((i - startSample) / visibleSamples) * w;
      const amplitude = this.waveformData[i] || 0;
      const barHeight = amplitude * h * 0.8;

      // Color based on position relative to playhead and frequency
      let color;
      if (this.frequencyColorMode && frequencyData && frequencyData.length > 0) {
        const freqIdx = Math.floor((i / samples) * frequencyData.length);
        const freq = frequencyData[freqIdx] || 0;
        const hue = (freq / 255) * 240; // blue to red
        const isPast = i < centerSample;
        const lightness = isPast ? 35 : 55;
        color = `hsl(${hue}, 80%, ${lightness}%)`;
      } else {
        color = i < centerSample ? this.colorSecondary : this.colorPrimary;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, midY - barHeight / 2, Math.max(barWidth - 0.5, 1), barHeight);
    }

    // Draw cue point marker
    if (this.cuePoint > 0) {
      const cueSample = (this.cuePoint / this.duration) * samples;
      if (cueSample >= startSample && cueSample <= endSample) {
        const x = ((cueSample - startSample) / visibleSamples) * w;
        ctx.fillStyle = this.colorCue;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 8, 0);
        ctx.lineTo(x, 12);
        ctx.fill();
        ctx.strokeStyle = this.colorCue;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
    }

    // Draw hot cue markers
    const hotCueColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0088ff', '#8800ff', '#ff00ff'];
    for (let i = 0; i < this.hotCues.length; i++) {
      if (this.hotCues[i] === null) continue;
      const cueSample = (this.hotCues[i] / this.duration) * samples;
      if (cueSample >= startSample && cueSample <= endSample) {
        const x = ((cueSample - startSample) / visibleSamples) * w;
        ctx.fillStyle = hotCueColors[i] || '#ffffff';
        ctx.fillRect(x - 1, 0, 3, h);
        // Label
        ctx.font = `bold ${10 * (window.devicePixelRatio || 1)}px sans-serif`;
        ctx.fillText(String(i + 1), x + 4, 12 * (window.devicePixelRatio || 1));
      }
    }

    // Draw playhead
    const playheadX = ((centerSample - startSample) / visibleSamples) * w;
    ctx.strokeStyle = this.colorPlayhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // Glow effect on playhead
    const gradient = ctx.createLinearGradient(playheadX - 10, 0, playheadX + 10, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(playheadX - 10, 0, 20, h);

    // Time display
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${11 * (window.devicePixelRatio || 1)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(this._formatTime(this.playPosition), 8, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText('-' + this._formatTime(this.duration - this.playPosition), w - 8, h - 8);
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  }
}

// Overview waveform (full track, small)
class OverviewWaveform {
  constructor(canvasId, channel) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.channel = channel;
    this.waveformData = null;
    this.duration = 0;
    this.position = 0;
    this.color = channel === 'A' ? '#00e5ff' : '#ff0066';
  }

  setData(data, duration) {
    this.waveformData = data;
    this.duration = duration;
  }

  render(position) {
    if (!this.ctx || !this.canvas) return;
    this.position = position;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.fillStyle = '#0a0a12';
    this.ctx.fillRect(0, 0, w, h);

    if (!this.waveformData) return;

    const progress = this.duration > 0 ? this.position / this.duration : 0;
    const samples = this.waveformData.length;
    const midY = h / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * w;
      const amp = this.waveformData[i] * h * 0.9;
      const isPast = i / samples < progress;
      this.ctx.fillStyle = isPast ? this.color : 'rgba(255,255,255,0.2)';
      this.ctx.fillRect(x, midY - amp / 2, Math.max(w / samples, 1), amp);
    }

    // Playhead
    const px = progress * w;
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(px, 0);
    this.ctx.lineTo(px, h);
    this.ctx.stroke();
  }
}

window.AuralityWaveform = WaveformRenderer;
window.AuralityOverviewWaveform = OverviewWaveform;
