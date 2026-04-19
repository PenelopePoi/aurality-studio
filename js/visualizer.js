/**
 * Aurality Studio — VJ Visualizer
 * Canvas-based audio-reactive visualizations.
 */
class Visualizer {
  constructor(canvasId, engine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.engine = engine;
    this.active = false;
    this.mode = 'spectrum'; // spectrum, waveoscope, particles, tunnel, kaleidoscope
    this.modes = ['spectrum', 'waveoscope', 'particles', 'tunnel', 'kaleidoscope'];
    this.particles = [];
    this.tunnelAngle = 0;
    this.frameCount = 0;
    this.hueOffset = 0;
    this.lastBass = 0;
    this.beatFlash = 0;
  }

  toggle() {
    this.active = !this.active;
    if (this.active) this._resize();
    return this.active;
  }

  nextMode() {
    const idx = this.modes.indexOf(this.mode);
    this.mode = this.modes[(idx + 1) % this.modes.length];
    this.particles = [];
    return this.mode;
  }

  _resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
      this.canvas.height = parent.clientHeight * (window.devicePixelRatio || 1);
    }
  }

  render() {
    if (!this.active || !this.ctx || !this.canvas) return;
    this.frameCount++;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Get frequency data
    const freqData = this.engine.getFrequencyData('master');
    if (!freqData || freqData.length === 0) {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Calculate bass energy for beat detection
    let bassEnergy = 0;
    for (let i = 0; i < Math.min(10, freqData.length); i++) bassEnergy += freqData[i];
    bassEnergy /= 10;

    // Simple beat detection
    if (bassEnergy > this.lastBass + 30) {
      this.beatFlash = 1;
      this.hueOffset += 30;
    }
    this.lastBass = bassEnergy;
    this.beatFlash *= 0.9;

    switch (this.mode) {
      case 'spectrum': this._renderSpectrum(ctx, w, h, freqData); break;
      case 'waveoscope': this._renderWaveoscope(ctx, w, h); break;
      case 'particles': this._renderParticles(ctx, w, h, freqData, bassEnergy); break;
      case 'tunnel': this._renderTunnel(ctx, w, h, freqData, bassEnergy); break;
      case 'kaleidoscope': this._renderKaleidoscope(ctx, w, h, freqData, bassEnergy); break;
    }
  }

  _renderSpectrum(ctx, w, h, data) {
    ctx.fillStyle = `rgba(10, 10, 15, 0.3)`;
    ctx.fillRect(0, 0, w, h);

    const bars = data.length / 2;
    const barWidth = w / bars;
    const maxH = h * 0.85;

    for (let i = 0; i < bars; i++) {
      const val = data[i] / 255;
      const barHeight = val * maxH;
      const x = i * barWidth;
      const hue = (i / bars) * 240 + this.hueOffset;

      // Main bar
      const gradient = ctx.createLinearGradient(x, h, x, h - barHeight);
      gradient.addColorStop(0, `hsla(${hue}, 90%, 50%, 0.9)`);
      gradient.addColorStop(1, `hsla(${hue + 30}, 90%, 70%, 0.6)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

      // Reflection
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.15)`;
      ctx.fillRect(x, h, barWidth - 1, barHeight * 0.3);

      // Peak dot
      if (val > 0.5) {
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${val})`;
        ctx.fillRect(x, h - barHeight - 4, barWidth - 1, 3);
      }
    }

    // Beat flash
    if (this.beatFlash > 0.1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.beatFlash * 0.1})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  _renderWaveoscope(ctx, w, h) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
    ctx.fillRect(0, 0, w, h);

    if (!this.engine.masterAnalyser) return;
    const data = new Float32Array(this.engine.masterAnalyser.fftSize);
    this.engine.masterAnalyser.getFloatTimeDomainData(data);

    const midY = h / 2;
    ctx.lineWidth = 2;

    // Left channel (cyan)
    ctx.strokeStyle = `hsla(${180 + this.hueOffset}, 100%, 60%, 0.8)`;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const y = midY + data[i] * h * 0.4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = `hsla(${180 + this.hueOffset}, 100%, 60%, 0.5)`;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
  }

  _renderParticles(ctx, w, h, data, bass) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    ctx.fillRect(0, 0, w, h);

    // Spawn particles on beat
    if (bass > 150 && this.particles.length < 500) {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: w / 2,
          y: h / 2,
          vx: (Math.random() - 0.5) * bass * 0.05,
          vy: (Math.random() - 0.5) * bass * 0.05,
          size: Math.random() * 4 + 1,
          hue: Math.random() * 360,
          life: 1,
          decay: 0.005 + Math.random() * 0.015
        });
      }
    }

    // Update and render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.vx *= 0.99;
      p.vy *= 0.99;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `hsla(${p.hue + this.hueOffset}, 100%, 60%, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center ring
    const ringSize = 50 + bass * 0.3;
    ctx.strokeStyle = `hsla(${this.hueOffset}, 80%, 60%, 0.3)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, ringSize, 0, Math.PI * 2);
    ctx.stroke();
  }

  _renderTunnel(ctx, w, h, data, bass) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
    ctx.fillRect(0, 0, w, h);

    this.tunnelAngle += 0.01 + bass * 0.0001;
    const cx = w / 2;
    const cy = h / 2;
    const rings = 15;

    for (let r = rings; r >= 0; r--) {
      const radius = (r / rings) * Math.min(w, h) * 0.5 + bass * 0.2;
      const segments = 6;
      const freqIdx = Math.floor((r / rings) * (data.length / 4));
      const val = data[freqIdx] / 255;

      ctx.strokeStyle = `hsla(${(r / rings) * 240 + this.hueOffset}, 80%, ${40 + val * 40}%, ${0.3 + val * 0.5})`;
      ctx.lineWidth = 1 + val * 3;

      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const angle = (s / segments) * Math.PI * 2 + this.tunnelAngle + r * 0.1;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  _renderKaleidoscope(ctx, w, h, data, bass) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const slices = 8;
    const angleStep = (Math.PI * 2) / slices;

    ctx.save();
    ctx.translate(cx, cy);

    for (let s = 0; s < slices; s++) {
      ctx.save();
      ctx.rotate(angleStep * s + this.frameCount * 0.005);

      const points = 20;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const freqIdx = Math.floor((i / points) * (data.length / 4));
        const val = data[freqIdx] / 255;
        const dist = 20 + val * Math.min(w, h) * 0.3;
        const angle = (i / points) * angleStep;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      const hue = (s / slices) * 360 + this.hueOffset;
      ctx.strokeStyle = `hsla(${hue}, 90%, 60%, 0.6)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}

window.AuralityVisualizer = Visualizer;
