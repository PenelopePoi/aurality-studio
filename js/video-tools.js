/**
 * Aurality Studio — Video Tools
 * Full video editing suite: import, timeline, effects, export, screen recording.
 * Vanilla JS, Web APIs only (Canvas, MediaRecorder, getDisplayMedia).
 */
class VideoTools {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.previewVideo = null;
    this.timeline = {
      clips: [],
      audioTracks: [],
      currentTime: 0,
      duration: 0,
      zoom: 1.0,
      playhead: 0,
      selection: null
    };
    this.playback = {
      isPlaying: false,
      speed: 1.0,
      reverse: false,
      loop: false,
      startTime: 0,
      animFrameId: null
    };
    this.effects = {
      brightness: 0,
      contrast: 1.0,
      saturation: 1.0,
      hue: 0,
      filter: 'none', // none, grayscale, sepia, invert, blur, sharpen
      filterIntensity: 1.0,
      chromaKey: { enabled: false, color: [0, 255, 0], threshold: 80, smoothing: 10 },
      pip: { enabled: false, source: null, x: 0.7, y: 0.7, width: 0.25, height: 0.25 },
      textOverlays: [],
      transitions: []
    };
    this.exportSettings = {
      resolution: '1080p',
      frameRate: 30,
      quality: 0.9,
      format: 'video/webm'
    };
    this.screenRecorder = {
      mediaRecorder: null,
      stream: null,
      webcamStream: null,
      chunks: [],
      isRecording: false,
      isPaused: false,
      startTime: 0,
      includeWebcam: false,
      includeSystemAudio: true,
      includeMic: false
    };
    this._resolutions = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4K': { width: 3840, height: 2160 }
    };
    this._offscreenCanvas = null;
    this._offscreenCtx = null;
    this._clipCache = new Map();
    this._thumbnailCache = new Map();
    this.isInitialized = false;
  }

  // ─── Initialization ───────────────────────────────────────────────

  init(canvasEl, previewVideoEl) {
    if (this.isInitialized) return;

    if (canvasEl) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1920;
      this.canvas.height = 1080;
      this.ctx = this.canvas.getContext('2d');
    }

    this.previewVideo = previewVideoEl || document.createElement('video');
    this.previewVideo.playsInline = true;
    this.previewVideo.muted = false;

    this._offscreenCanvas = document.createElement('canvas');
    this._offscreenCtx = this._offscreenCanvas.getContext('2d');

    this.isInitialized = true;
    console.log('[VideoTools] Initialized');
  }

  // ─── Video Import ─────────────────────────────────────────────────

  async importVideo(file) {
    if (!file) throw new Error('No file provided');

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      throw new Error(`Unsupported format: ${file.type || file.name}`);
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        const clip = {
          id: this._uid(),
          name: file.name,
          file,
          url,
          video,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          startTime: 0,
          endTime: video.duration,
          trimIn: 0,
          trimOut: video.duration,
          trackIndex: 0,
          timelineOffset: this.timeline.duration,
          speed: 1.0,
          volume: 1.0,
          opacity: 1.0,
          effects: {},
          transitions: { in: null, out: null }
        };

        this.timeline.clips.push(clip);
        this._recalcDuration();
        this._generateThumbnails(clip);

        console.log('[VideoTools] Imported:', file.name, `${video.videoWidth}x${video.videoHeight}`, `${video.duration.toFixed(2)}s`);
        resolve(clip);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load video: ${file.name}`));
      };

      video.src = url;
    });
  }

  async importFromUrl(url, name) {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        const clip = {
          id: this._uid(),
          name: name || url.split('/').pop(),
          file: null,
          url,
          video,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          startTime: 0,
          endTime: video.duration,
          trimIn: 0,
          trimOut: video.duration,
          trackIndex: 0,
          timelineOffset: this.timeline.duration,
          speed: 1.0,
          volume: 1.0,
          opacity: 1.0,
          effects: {},
          transitions: { in: null, out: null }
        };

        this.timeline.clips.push(clip);
        this._recalcDuration();

        console.log('[VideoTools] Imported from URL:', clip.name);
        resolve(clip);
      };

      video.onerror = () => reject(new Error(`Failed to load: ${url}`));
      video.src = url;
    });
  }

  // ─── Timeline Operations ──────────────────────────────────────────

  trimClip(clipId, trimIn, trimOut) {
    const clip = this._getClip(clipId);
    if (!clip) return null;

    clip.trimIn = Math.max(0, trimIn);
    clip.trimOut = Math.min(clip.duration, trimOut);

    if (clip.trimIn >= clip.trimOut) {
      throw new Error('trimIn must be less than trimOut');
    }

    this._recalcDuration();
    console.log('[VideoTools] Trimmed:', clip.name, `${clip.trimIn.toFixed(2)}s - ${clip.trimOut.toFixed(2)}s`);
    return clip;
  }

  splitClip(clipId, splitTime) {
    const clip = this._getClip(clipId);
    if (!clip) return null;

    const relativeTime = splitTime - clip.timelineOffset;
    if (relativeTime <= clip.trimIn || relativeTime >= clip.trimOut) {
      throw new Error('Split point must be within clip bounds');
    }

    // Create second half
    const newClip = {
      ...clip,
      id: this._uid(),
      name: clip.name + ' (split)',
      trimIn: relativeTime,
      timelineOffset: clip.timelineOffset + (relativeTime - clip.trimIn),
      video: clip.video.cloneNode(true),
      transitions: { in: null, out: clip.transitions.out }
    };
    newClip.video.src = clip.url;

    // Truncate first half
    clip.trimOut = relativeTime;
    clip.transitions.out = null;

    const idx = this.timeline.clips.indexOf(clip);
    this.timeline.clips.splice(idx + 1, 0, newClip);
    this._recalcDuration();

    console.log('[VideoTools] Split:', clip.name, 'at', splitTime.toFixed(2) + 's');
    return [clip, newClip];
  }

  cutClip(clipId, startTime, endTime) {
    const clip = this._getClip(clipId);
    if (!clip) return null;

    const relStart = startTime - clip.timelineOffset;
    const relEnd = endTime - clip.timelineOffset;

    // Split into up to two parts, removing the middle
    const parts = [];

    if (relStart > clip.trimIn) {
      const before = { ...clip, id: this._uid(), trimOut: relStart };
      parts.push(before);
    }

    if (relEnd < clip.trimOut) {
      const after = {
        ...clip,
        id: this._uid(),
        name: clip.name + ' (cut)',
        trimIn: relEnd,
        timelineOffset: clip.timelineOffset + (relEnd - clip.trimIn)
      };
      parts.push(after);
    }

    const idx = this.timeline.clips.indexOf(clip);
    this.timeline.clips.splice(idx, 1, ...parts);
    this._recalcDuration();

    console.log('[VideoTools] Cut:', clip.name, `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
    return parts;
  }

  moveClip(clipId, newOffset) {
    const clip = this._getClip(clipId);
    if (!clip) return null;

    clip.timelineOffset = Math.max(0, newOffset);
    this._recalcDuration();
    return clip;
  }

  reorderClip(clipId, newIndex) {
    const clip = this._getClip(clipId);
    if (!clip) return null;

    const oldIdx = this.timeline.clips.indexOf(clip);
    this.timeline.clips.splice(oldIdx, 1);
    this.timeline.clips.splice(Math.min(newIndex, this.timeline.clips.length), 0, clip);
    return clip;
  }

  removeClip(clipId) {
    const idx = this.timeline.clips.findIndex(c => c.id === clipId);
    if (idx === -1) return false;

    const clip = this.timeline.clips[idx];
    this.timeline.clips.splice(idx, 1);
    this._clipCache.delete(clipId);
    this._thumbnailCache.delete(clipId);

    if (clip.url && clip.file) URL.revokeObjectURL(clip.url);

    this._recalcDuration();
    console.log('[VideoTools] Removed:', clip.name);
    return true;
  }

  // ─── Audio Overlay Track ──────────────────────────────────────────

  async addAudioTrack(file, offset = 0) {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'auto';

    return new Promise((resolve, reject) => {
      audio.onloadedmetadata = () => {
        const track = {
          id: this._uid(),
          name: file.name,
          file,
          url,
          audio,
          duration: audio.duration,
          timelineOffset: offset,
          trimIn: 0,
          trimOut: audio.duration,
          volume: 1.0,
          muted: false
        };

        this.timeline.audioTracks.push(track);
        this._recalcDuration();
        console.log('[VideoTools] Audio track added:', file.name);
        resolve(track);
      };

      audio.onerror = () => reject(new Error(`Failed to load audio: ${file.name}`));
      audio.src = url;
    });
  }

  removeAudioTrack(trackId) {
    const idx = this.timeline.audioTracks.findIndex(t => t.id === trackId);
    if (idx === -1) return false;

    const track = this.timeline.audioTracks[idx];
    URL.revokeObjectURL(track.url);
    this.timeline.audioTracks.splice(idx, 1);
    this._recalcDuration();
    return true;
  }

  // ─── Playback ─────────────────────────────────────────────────────

  play() {
    if (this.playback.isPlaying) return;

    this.playback.isPlaying = true;
    this.playback.startTime = performance.now() - (this.timeline.currentTime * 1000 / this.playback.speed);

    // Start any video/audio at correct position
    this._syncMediaToPlayhead();
    this._startRenderLoop();

    console.log('[VideoTools] Playing at', this.playback.speed + 'x');
  }

  pause() {
    if (!this.playback.isPlaying) return;

    this.playback.isPlaying = false;
    if (this.playback.animFrameId) {
      cancelAnimationFrame(this.playback.animFrameId);
      this.playback.animFrameId = null;
    }

    // Pause all media
    this.timeline.clips.forEach(clip => {
      try { clip.video.pause(); } catch (e) { /* noop */ }
    });
    this.timeline.audioTracks.forEach(track => {
      try { track.audio.pause(); } catch (e) { /* noop */ }
    });

    console.log('[VideoTools] Paused at', this.timeline.currentTime.toFixed(2) + 's');
  }

  stop() {
    this.pause();
    this.timeline.currentTime = 0;
    this._renderFrame(0);
  }

  seek(time) {
    this.timeline.currentTime = Math.max(0, Math.min(time, this.timeline.duration));
    this.playback.startTime = performance.now() - (this.timeline.currentTime * 1000 / this.playback.speed);

    if (this.playback.isPlaying) {
      this._syncMediaToPlayhead();
    }

    this._renderFrame(this.timeline.currentTime);
  }

  scrub(time) {
    this.seek(time);
    window.dispatchEvent(new CustomEvent('video-scrub', {
      detail: { time: this.timeline.currentTime, duration: this.timeline.duration }
    }));
  }

  // Frame-by-frame navigation
  nextFrame() {
    const frameDuration = 1 / this.exportSettings.frameRate;
    this.seek(this.timeline.currentTime + frameDuration);
  }

  prevFrame() {
    const frameDuration = 1 / this.exportSettings.frameRate;
    this.seek(this.timeline.currentTime - frameDuration);
  }

  setSpeed(speed) {
    speed = Math.max(0.25, Math.min(4.0, speed));
    this.playback.speed = speed;

    if (this.playback.isPlaying) {
      this.playback.startTime = performance.now() - (this.timeline.currentTime * 1000 / speed);

      this.timeline.clips.forEach(clip => {
        try { clip.video.playbackRate = speed; } catch (e) { /* noop */ }
      });
    }

    console.log('[VideoTools] Speed:', speed + 'x');
  }

  setReverse(enabled) {
    this.playback.reverse = enabled;
    console.log('[VideoTools] Reverse:', enabled);
  }

  // ─── Render Loop ──────────────────────────────────────────────────

  _startRenderLoop() {
    const tick = () => {
      if (!this.playback.isPlaying) return;

      const elapsed = (performance.now() - this.playback.startTime) / 1000 * this.playback.speed;
      const time = this.playback.reverse
        ? this.timeline.duration - elapsed
        : elapsed;

      this.timeline.currentTime = time;

      if (time >= this.timeline.duration || time <= 0) {
        if (this.playback.loop) {
          this.timeline.currentTime = this.playback.reverse ? this.timeline.duration : 0;
          this.playback.startTime = performance.now();
          this._syncMediaToPlayhead();
        } else {
          this.pause();
          window.dispatchEvent(new CustomEvent('video-ended'));
          return;
        }
      }

      this._renderFrame(this.timeline.currentTime);

      window.dispatchEvent(new CustomEvent('video-timeupdate', {
        detail: { time: this.timeline.currentTime, duration: this.timeline.duration }
      }));

      this.playback.animFrameId = requestAnimationFrame(tick);
    };

    this.playback.animFrameId = requestAnimationFrame(tick);
  }

  _renderFrame(time) {
    if (!this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    // Find active clips at this time
    const activeClips = this._getClipsAtTime(time);

    // Render clips sorted by track index
    activeClips
      .sort((a, b) => a.trackIndex - b.trackIndex)
      .forEach(clip => {
        const clipTime = (time - clip.timelineOffset) + clip.trimIn;
        this._renderClip(clip, clipTime, width, height);
      });

    // Render text overlays
    this._renderTextOverlays(time, width, height);

    // Render PiP
    if (this.effects.pip.enabled && this.effects.pip.source) {
      this._renderPiP(width, height);
    }
  }

  _renderClip(clip, clipTime, width, height) {
    // Seek video to correct frame
    if (Math.abs(clip.video.currentTime - clipTime) > 0.05) {
      clip.video.currentTime = clipTime;
    }

    // Set up offscreen canvas for effects processing
    this._offscreenCanvas.width = width;
    this._offscreenCanvas.height = height;

    // Calculate aspect-fit dimensions
    const scale = Math.min(width / clip.width, height / clip.height);
    const drawW = clip.width * scale;
    const drawH = clip.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;

    // Draw video frame to offscreen canvas
    this._offscreenCtx.clearRect(0, 0, width, height);
    this._offscreenCtx.globalAlpha = clip.opacity;
    this._offscreenCtx.drawImage(clip.video, drawX, drawY, drawW, drawH);

    // Apply per-clip effects if any
    if (Object.keys(clip.effects).length > 0) {
      this._applyClipEffects(clip);
    }

    // Apply global color grading
    this._applyColorGrading();

    // Apply filter
    this._applyFilter();

    // Apply chroma key
    if (this.effects.chromaKey.enabled) {
      this._applyChromaKey();
    }

    // Check for transition
    const transition = this._getActiveTransition(clip, this.timeline.currentTime);
    if (transition) {
      this._applyTransition(transition, clip);
    }

    // Composite to main canvas
    this.ctx.drawImage(this._offscreenCanvas, 0, 0);
  }

  // ─── Video Effects ────────────────────────────────────────────────

  setColorGrading(settings) {
    if (settings.brightness !== undefined) this.effects.brightness = Math.max(-100, Math.min(100, settings.brightness));
    if (settings.contrast !== undefined) this.effects.contrast = Math.max(0, Math.min(3, settings.contrast));
    if (settings.saturation !== undefined) this.effects.saturation = Math.max(0, Math.min(3, settings.saturation));
    if (settings.hue !== undefined) this.effects.hue = settings.hue % 360;
  }

  setFilter(filterName, intensity = 1.0) {
    const validFilters = ['none', 'grayscale', 'sepia', 'invert', 'blur', 'sharpen'];
    if (!validFilters.includes(filterName)) {
      throw new Error(`Unknown filter: ${filterName}. Valid: ${validFilters.join(', ')}`);
    }
    this.effects.filter = filterName;
    this.effects.filterIntensity = Math.max(0, Math.min(1, intensity));
    console.log('[VideoTools] Filter:', filterName, 'at', (intensity * 100).toFixed(0) + '%');
  }

  setChromaKey(enabled, options = {}) {
    this.effects.chromaKey.enabled = enabled;
    if (options.color) this.effects.chromaKey.color = options.color;
    if (options.threshold !== undefined) this.effects.chromaKey.threshold = options.threshold;
    if (options.smoothing !== undefined) this.effects.chromaKey.smoothing = options.smoothing;
    console.log('[VideoTools] Chroma key:', enabled ? 'ON' : 'OFF');
  }

  setPiP(enabled, options = {}) {
    this.effects.pip.enabled = enabled;
    if (options.source) this.effects.pip.source = options.source;
    if (options.x !== undefined) this.effects.pip.x = options.x;
    if (options.y !== undefined) this.effects.pip.y = options.y;
    if (options.width !== undefined) this.effects.pip.width = options.width;
    if (options.height !== undefined) this.effects.pip.height = options.height;
    console.log('[VideoTools] PiP:', enabled ? 'ON' : 'OFF');
  }

  // ─── Text Overlays ───────────────────────────────────────────────

  addTextOverlay(options) {
    const overlay = {
      id: this._uid(),
      text: options.text || 'Text',
      x: options.x || 0.5,
      y: options.y || 0.5,
      fontSize: options.fontSize || 48,
      fontFamily: options.fontFamily || 'Arial, sans-serif',
      color: options.color || '#ffffff',
      backgroundColor: options.backgroundColor || 'transparent',
      alignment: options.alignment || 'center',
      bold: options.bold || false,
      italic: options.italic || false,
      shadow: options.shadow || false,
      shadowColor: options.shadowColor || 'rgba(0,0,0,0.7)',
      shadowBlur: options.shadowBlur || 4,
      outline: options.outline || false,
      outlineColor: options.outlineColor || '#000000',
      outlineWidth: options.outlineWidth || 2,
      startTime: options.startTime || 0,
      endTime: options.endTime || this.timeline.duration || 10,
      animation: options.animation || 'none', // none, fadeIn, fadeOut, slideUp, slideDown, typewriter, bounce
      animationDuration: options.animationDuration || 0.5
    };

    this.effects.textOverlays.push(overlay);
    console.log('[VideoTools] Text overlay added:', overlay.text);
    return overlay;
  }

  updateTextOverlay(overlayId, updates) {
    const overlay = this.effects.textOverlays.find(o => o.id === overlayId);
    if (!overlay) return null;
    Object.assign(overlay, updates);
    return overlay;
  }

  removeTextOverlay(overlayId) {
    const idx = this.effects.textOverlays.findIndex(o => o.id === overlayId);
    if (idx === -1) return false;
    this.effects.textOverlays.splice(idx, 1);
    return true;
  }

  _renderTextOverlays(time, width, height) {
    const active = this.effects.textOverlays.filter(o => time >= o.startTime && time <= o.endTime);

    active.forEach(overlay => {
      const ctx = this.ctx;
      ctx.save();

      // Build font string
      let fontStyle = '';
      if (overlay.italic) fontStyle += 'italic ';
      if (overlay.bold) fontStyle += 'bold ';
      fontStyle += `${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.font = fontStyle;
      ctx.textAlign = overlay.alignment;
      ctx.textBaseline = 'middle';

      let x = overlay.x * width;
      let y = overlay.y * height;
      let alpha = 1.0;

      // Animation calculations
      const elapsed = time - overlay.startTime;
      const remaining = overlay.endTime - time;
      const animDur = overlay.animationDuration;

      switch (overlay.animation) {
        case 'fadeIn':
          if (elapsed < animDur) alpha = elapsed / animDur;
          break;
        case 'fadeOut':
          if (remaining < animDur) alpha = remaining / animDur;
          break;
        case 'slideUp':
          if (elapsed < animDur) {
            const progress = elapsed / animDur;
            y += (1 - progress) * overlay.fontSize * 2;
            alpha = progress;
          }
          break;
        case 'slideDown':
          if (elapsed < animDur) {
            const progress = elapsed / animDur;
            y -= (1 - progress) * overlay.fontSize * 2;
            alpha = progress;
          }
          break;
        case 'typewriter': {
          const charCount = Math.floor((elapsed / animDur) * overlay.text.length);
          overlay._visibleText = overlay.text.substring(0, Math.min(charCount, overlay.text.length));
          break;
        }
        case 'bounce':
          if (elapsed < animDur) {
            const t = elapsed / animDur;
            const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t);
            y -= bounce * overlay.fontSize;
          }
          break;
      }

      ctx.globalAlpha = alpha;

      const displayText = overlay._visibleText || overlay.text;

      // Background
      if (overlay.backgroundColor !== 'transparent') {
        const metrics = ctx.measureText(displayText);
        const pad = 10;
        ctx.fillStyle = overlay.backgroundColor;
        const bgX = overlay.alignment === 'center' ? x - metrics.width / 2 - pad :
          overlay.alignment === 'right' ? x - metrics.width - pad : x - pad;
        ctx.fillRect(bgX, y - overlay.fontSize / 2 - pad / 2,
          metrics.width + pad * 2, overlay.fontSize + pad);
      }

      // Shadow
      if (overlay.shadow) {
        ctx.shadowColor = overlay.shadowColor;
        ctx.shadowBlur = overlay.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Outline
      if (overlay.outline) {
        ctx.strokeStyle = overlay.outlineColor;
        ctx.lineWidth = overlay.outlineWidth;
        ctx.strokeText(displayText, x, y);
      }

      // Text fill
      ctx.fillStyle = overlay.color;
      ctx.fillText(displayText, x, y);

      ctx.restore();
    });
  }

  // ─── Transitions ──────────────────────────────────────────────────

  addTransition(fromClipId, toClipId, type, duration = 1.0) {
    const validTypes = ['fade', 'dissolve', 'wipe', 'zoom', 'slideLeft', 'slideRight', 'slideUp', 'slideDown'];
    if (!validTypes.includes(type)) {
      throw new Error(`Unknown transition: ${type}. Valid: ${validTypes.join(', ')}`);
    }

    const fromClip = this._getClip(fromClipId);
    const toClip = this._getClip(toClipId);
    if (!fromClip || !toClip) throw new Error('Invalid clip IDs');

    const transition = {
      id: this._uid(),
      type,
      duration,
      fromClipId,
      toClipId,
      startTime: fromClip.timelineOffset + (fromClip.trimOut - fromClip.trimIn) - duration
    };

    this.effects.transitions.push(transition);

    fromClip.transitions.out = transition.id;
    toClip.transitions.in = transition.id;

    console.log('[VideoTools] Transition:', type, `${duration}s between`, fromClip.name, '->', toClip.name);
    return transition;
  }

  removeTransition(transitionId) {
    const idx = this.effects.transitions.findIndex(t => t.id === transitionId);
    if (idx === -1) return false;

    const transition = this.effects.transitions[idx];
    const fromClip = this._getClip(transition.fromClipId);
    const toClip = this._getClip(transition.toClipId);
    if (fromClip) fromClip.transitions.out = null;
    if (toClip) toClip.transitions.in = null;

    this.effects.transitions.splice(idx, 1);
    return true;
  }

  _getActiveTransition(clip, time) {
    return this.effects.transitions.find(t => {
      return time >= t.startTime && time <= t.startTime + t.duration &&
        (t.fromClipId === clip.id || t.toClipId === clip.id);
    });
  }

  _applyTransition(transition, clip) {
    const progress = (this.timeline.currentTime - transition.startTime) / transition.duration;
    const isFrom = transition.fromClipId === clip.id;
    const t = isFrom ? 1 - progress : progress;

    const w = this._offscreenCanvas.width;
    const h = this._offscreenCanvas.height;

    switch (transition.type) {
      case 'fade':
        this.ctx.globalAlpha = t;
        break;

      case 'dissolve':
        this.ctx.globalAlpha = t;
        break;

      case 'wipe':
        this.ctx.save();
        this.ctx.beginPath();
        if (isFrom) {
          this.ctx.rect(0, 0, w * (1 - progress), h);
        } else {
          this.ctx.rect(w * (1 - progress), 0, w * progress, h);
        }
        this.ctx.clip();
        break;

      case 'zoom': {
        const scale = isFrom ? 1 + progress * 0.3 : 1.3 - progress * 0.3;
        const cx = w / 2;
        const cy = h / 2;
        this.ctx.translate(cx, cy);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-cx, -cy);
        this.ctx.globalAlpha = t;
        break;
      }

      case 'slideLeft':
        this.ctx.translate(isFrom ? -w * progress : w * (1 - progress), 0);
        break;

      case 'slideRight':
        this.ctx.translate(isFrom ? w * progress : -w * (1 - progress), 0);
        break;

      case 'slideUp':
        this.ctx.translate(0, isFrom ? -h * progress : h * (1 - progress));
        break;

      case 'slideDown':
        this.ctx.translate(0, isFrom ? h * progress : -h * (1 - progress));
        break;
    }
  }

  // ─── Pixel-Level Effects ──────────────────────────────────────────

  _applyColorGrading() {
    if (this.effects.brightness === 0 && this.effects.contrast === 1.0 &&
        this.effects.saturation === 1.0 && this.effects.hue === 0) return;

    const w = this._offscreenCanvas.width;
    const h = this._offscreenCanvas.height;
    const imageData = this._offscreenCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const brightness = this.effects.brightness;
    const contrast = this.effects.contrast;
    const saturation = this.effects.saturation;
    const hueShift = this.effects.hue * Math.PI / 180;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      r += brightness;
      g += brightness;
      b += brightness;

      // Contrast
      r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

      // Saturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturation;
      g = gray + (g - gray) * saturation;
      b = gray + (b - gray) * saturation;

      // Hue rotation
      if (hueShift !== 0) {
        const cos = Math.cos(hueShift);
        const sin = Math.sin(hueShift);
        const nr = r * (0.213 + cos * 0.787 - sin * 0.213) +
                   g * (0.715 - cos * 0.715 - sin * 0.715) +
                   b * (0.072 - cos * 0.072 + sin * 0.928);
        const ng = r * (0.213 - cos * 0.213 + sin * 0.143) +
                   g * (0.715 + cos * 0.285 + sin * 0.140) +
                   b * (0.072 - cos * 0.072 - sin * 0.283);
        const nb = r * (0.213 - cos * 0.213 - sin * 0.787) +
                   g * (0.715 - cos * 0.715 + sin * 0.715) +
                   b * (0.072 + cos * 0.928 + sin * 0.072);
        r = nr; g = ng; b = nb;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    this._offscreenCtx.putImageData(imageData, 0, 0);
  }

  _applyFilter() {
    if (this.effects.filter === 'none') return;

    const w = this._offscreenCanvas.width;
    const h = this._offscreenCanvas.height;
    const imageData = this._offscreenCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const intensity = this.effects.filterIntensity;

    switch (this.effects.filter) {
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i] + (gray - data[i]) * intensity;
          data[i + 1] = data[i + 1] + (gray - data[i + 1]) * intensity;
          data[i + 2] = data[i + 2] + (gray - data[i + 2]) * intensity;
        }
        break;

      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const sr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          const sg = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          const sb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
          data[i] = r + (sr - r) * intensity;
          data[i + 1] = g + (sg - g) * intensity;
          data[i + 2] = b + (sb - b) * intensity;
        }
        break;

      case 'invert':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] + (255 - data[i] * 2) * intensity;
          data[i + 1] = data[i + 1] + (255 - data[i + 1] * 2) * intensity;
          data[i + 2] = data[i + 2] + (255 - data[i + 2] * 2) * intensity;
        }
        break;

      case 'blur':
        this._applyBoxBlur(imageData, Math.ceil(intensity * 10));
        break;

      case 'sharpen':
        this._applySharpen(imageData, intensity);
        break;
    }

    this._offscreenCtx.putImageData(imageData, 0, 0);
  }

  _applyBoxBlur(imageData, radius) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const copy = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const idx = (ny * w + nx) * 4;
              r += copy[idx];
              g += copy[idx + 1];
              b += copy[idx + 2];
              count++;
            }
          }
        }

        const idx = (y * w + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
      }
    }
  }

  _applySharpen(imageData, amount) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const copy = new Uint8ClampedArray(data);

    // Unsharp mask kernel
    const kernel = [
      0, -amount, 0,
      -amount, 1 + 4 * amount, -amount,
      0, -amount, 0
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4 + c;
              val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          data[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, val));
        }
      }
    }
  }

  _applyChromaKey() {
    const w = this._offscreenCanvas.width;
    const h = this._offscreenCanvas.height;
    const imageData = this._offscreenCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const [kr, kg, kb] = this.effects.chromaKey.color;
    const threshold = this.effects.chromaKey.threshold;
    const smoothing = this.effects.chromaKey.smoothing;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);

      if (dist < threshold) {
        data[i + 3] = 0; // Fully transparent
      } else if (dist < threshold + smoothing) {
        const alpha = (dist - threshold) / smoothing;
        data[i + 3] = Math.round(alpha * 255);
      }
    }

    this._offscreenCtx.putImageData(imageData, 0, 0);
  }

  _applyClipEffects(clip) {
    // Per-clip overrides (brightness, contrast, etc.)
    if (clip.effects.brightness !== undefined || clip.effects.contrast !== undefined) {
      const saved = { ...this.effects };
      if (clip.effects.brightness !== undefined) this.effects.brightness = clip.effects.brightness;
      if (clip.effects.contrast !== undefined) this.effects.contrast = clip.effects.contrast;
      if (clip.effects.saturation !== undefined) this.effects.saturation = clip.effects.saturation;
      this._applyColorGrading();
      Object.assign(this.effects, saved);
    }
  }

  _renderPiP(width, height) {
    const pip = this.effects.pip;
    const source = pip.source;

    if (!source) return;

    const x = pip.x * width;
    const y = pip.y * height;
    const w = pip.width * width;
    const h = pip.height * height;

    // Draw border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

    // Draw PiP source (video element or canvas)
    try {
      this.ctx.drawImage(source, x, y, w, h);
    } catch (e) {
      // Source might not be ready
    }
  }

  // ─── Export ───────────────────────────────────────────────────────

  setExportSettings(settings) {
    if (settings.resolution && this._resolutions[settings.resolution]) {
      this.exportSettings.resolution = settings.resolution;
    }
    if (settings.frameRate) {
      this.exportSettings.frameRate = Math.max(1, Math.min(120, settings.frameRate));
    }
    if (settings.quality !== undefined) {
      this.exportSettings.quality = Math.max(0.1, Math.min(1.0, settings.quality));
    }
    if (settings.format) {
      this.exportSettings.format = settings.format;
    }
    console.log('[VideoTools] Export settings:', JSON.stringify(this.exportSettings));
  }

  async exportVideo(onProgress) {
    const res = this._resolutions[this.exportSettings.resolution];
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = res.width;
    exportCanvas.height = res.height;
    const exportCtx = exportCanvas.getContext('2d');

    const stream = exportCanvas.captureStream(this.exportSettings.frameRate);

    // Mix audio into the stream
    const audioCtx = new AudioContext();
    const audioDestination = audioCtx.createMediaStreamDestination();

    // Add audio from video clips
    for (const clip of this.timeline.clips) {
      if (clip.video && clip.volume > 0) {
        try {
          const source = audioCtx.createMediaElementSource(clip.video.cloneNode(true));
          const gain = audioCtx.createGain();
          gain.gain.value = clip.volume;
          source.connect(gain);
          gain.connect(audioDestination);
        } catch (e) {
          // Audio may not be available
        }
      }
    }

    // Add audio tracks to stream
    audioDestination.stream.getAudioTracks().forEach(track => {
      stream.addTrack(track);
    });

    // Determine MIME type
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: this._getBitrate()
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        audioCtx.close();
        console.log('[VideoTools] Export complete:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');
        resolve(blob);
      };

      recorder.onerror = (e) => reject(e.error);

      recorder.start(100);

      // Render frames at real-time speed
      const savedCanvas = this.canvas;
      const savedCtx = this.ctx;
      this.canvas = exportCanvas;
      this.ctx = exportCtx;

      let currentTime = 0;
      const frameDuration = 1000 / this.exportSettings.frameRate;
      const totalFrames = Math.ceil(this.timeline.duration * this.exportSettings.frameRate);
      let frameCount = 0;

      const renderNextFrame = () => {
        if (currentTime >= this.timeline.duration) {
          this.canvas = savedCanvas;
          this.ctx = savedCtx;
          recorder.stop();
          return;
        }

        this._renderFrame(currentTime);
        currentTime += 1 / this.exportSettings.frameRate;
        frameCount++;

        if (onProgress) {
          onProgress(frameCount / totalFrames);
        }

        // Use setTimeout to avoid blocking the UI
        setTimeout(renderNextFrame, frameDuration);
      };

      renderNextFrame();
    });
  }

  async exportGif(startTime, endTime, options = {}) {
    const width = options.width || 480;
    const height = options.height || 270;
    const fps = options.fps || 10;
    const quality = options.quality || 10;

    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = width;
    gifCanvas.height = height;
    const gifCtx = gifCanvas.getContext('2d');

    const frames = [];
    const frameDuration = 1 / fps;
    let currentTime = startTime;

    const savedCanvas = this.canvas;
    const savedCtx = this.ctx;
    this.canvas = gifCanvas;
    this.ctx = gifCtx;

    while (currentTime <= endTime) {
      this._renderFrame(currentTime);
      frames.push(gifCtx.getImageData(0, 0, width, height));
      currentTime += frameDuration;
    }

    this.canvas = savedCanvas;
    this.ctx = savedCtx;

    // Encode frames as animated GIF using basic LZW
    const gif = this._encodeGif(frames, width, height, Math.round(1000 / fps));

    console.log('[VideoTools] GIF export:', frames.length, 'frames,', (gif.size / 1024).toFixed(1) + 'KB');
    return gif;
  }

  _encodeGif(frames, width, height, delay) {
    // Build a minimal GIF89a binary
    // Header + Logical Screen Descriptor
    const parts = [];

    // GIF89a header
    parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    // Logical screen descriptor
    const lsd = new Uint8Array(7);
    lsd[0] = width & 0xFF;
    lsd[1] = (width >> 8) & 0xFF;
    lsd[2] = height & 0xFF;
    lsd[3] = (height >> 8) & 0xFF;
    lsd[4] = 0xF6; // GCT flag, 7-bit color (128 colors)
    lsd[5] = 0;    // bg color index
    lsd[6] = 0;    // pixel aspect
    parts.push(lsd);

    // Global color table (128 colors, simplified palette)
    const gct = new Uint8Array(128 * 3);
    for (let i = 0; i < 128; i++) {
      const r = ((i >> 4) & 0x7) * 36;
      const g = ((i >> 1) & 0x7) * 36;
      const b = (i & 0x1) * 255;
      gct[i * 3] = r;
      gct[i * 3 + 1] = g;
      gct[i * 3 + 2] = b;
    }
    parts.push(gct);

    // NETSCAPE application extension for looping
    parts.push(new Uint8Array([
      0x21, 0xFF, 0x0B,
      0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, // NETSCAPE
      0x32, 0x2E, 0x30, // 2.0
      0x03, 0x01, 0x00, 0x00, 0x00 // loop forever
    ]));

    // Encode each frame
    for (const frame of frames) {
      // Graphic control extension
      const gce = new Uint8Array(8);
      gce[0] = 0x21; gce[1] = 0xF9; gce[2] = 0x04;
      gce[3] = 0x00; // no transparency
      gce[4] = (delay / 10) & 0xFF;
      gce[5] = ((delay / 10) >> 8) & 0xFF;
      gce[6] = 0x00; // transparent color index
      gce[7] = 0x00; // block terminator
      parts.push(gce);

      // Image descriptor
      const imgDesc = new Uint8Array(10);
      imgDesc[0] = 0x2C;
      // left, top = 0
      imgDesc[5] = width & 0xFF;
      imgDesc[6] = (width >> 8) & 0xFF;
      imgDesc[7] = height & 0xFF;
      imgDesc[8] = (height >> 8) & 0xFF;
      imgDesc[9] = 0x00; // no local color table
      parts.push(imgDesc);

      // Quantize frame to palette indices
      const indices = new Uint8Array(width * height);
      for (let p = 0; p < indices.length; p++) {
        const r = frame.data[p * 4];
        const g = frame.data[p * 4 + 1];
        const b = frame.data[p * 4 + 2];
        indices[p] = ((r / 36) << 4 | (g / 36) << 1 | (b > 127 ? 1 : 0)) & 0x7F;
      }

      // LZW minimum code size
      parts.push(new Uint8Array([0x07]));

      // Simplified LZW encoding (uncompressed sub-blocks)
      const blockSize = 254;
      for (let offset = 0; offset < indices.length; offset += blockSize) {
        const chunk = indices.slice(offset, offset + blockSize);
        parts.push(new Uint8Array([chunk.length]));
        parts.push(chunk);
      }

      // Block terminator
      parts.push(new Uint8Array([0x00]));
    }

    // Trailer
    parts.push(new Uint8Array([0x3B]));

    return new Blob(parts, { type: 'image/gif' });
  }

  async extractThumbnail(clipId, time, width = 320, height = 180) {
    const clip = this._getClip(clipId);
    if (!clip) throw new Error('Clip not found');

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = width;
    thumbCanvas.height = height;
    const thumbCtx = thumbCanvas.getContext('2d');

    return new Promise((resolve) => {
      const seekTime = time !== undefined ? time : clip.trimIn;
      clip.video.currentTime = seekTime;

      const onSeeked = () => {
        clip.video.removeEventListener('seeked', onSeeked);

        // Scale to fit
        const scale = Math.min(width / clip.width, height / clip.height);
        const dw = clip.width * scale;
        const dh = clip.height * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;

        thumbCtx.fillStyle = '#000';
        thumbCtx.fillRect(0, 0, width, height);
        thumbCtx.drawImage(clip.video, dx, dy, dw, dh);

        thumbCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          this._thumbnailCache.set(`${clipId}_${seekTime}`, url);
          resolve({ blob, url, time: seekTime });
        }, 'image/jpeg', 0.85);
      };

      clip.video.addEventListener('seeked', onSeeked);
    });
  }

  async extractAllThumbnails(clipId, count = 10) {
    const clip = this._getClip(clipId);
    if (!clip) throw new Error('Clip not found');

    const thumbnails = [];
    const duration = clip.trimOut - clip.trimIn;
    const interval = duration / count;

    for (let i = 0; i < count; i++) {
      const time = clip.trimIn + interval * i;
      const thumb = await this.extractThumbnail(clipId, time);
      thumbnails.push(thumb);
    }

    return thumbnails;
  }

  _getBitrate() {
    const res = this._resolutions[this.exportSettings.resolution];
    const pixels = res.width * res.height;
    const base = pixels * this.exportSettings.frameRate * 0.1;
    return Math.round(base * this.exportSettings.quality);
  }

  // ─── Screen Recording ─────────────────────────────────────────────

  async startScreenRecording(options = {}) {
    if (this.screenRecorder.isRecording) {
      throw new Error('Already recording');
    }

    const displayOptions = {
      video: {
        cursor: options.cursor !== false ? 'always' : 'never',
        displaySurface: options.displaySurface || 'monitor'
      },
      audio: this.screenRecorder.includeSystemAudio
    };

    try {
      this.screenRecorder.stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
    } catch (e) {
      throw new Error('Screen capture denied or unavailable');
    }

    const tracks = [...this.screenRecorder.stream.getTracks()];

    // Add mic audio if requested
    if (this.screenRecorder.includeMic || options.includeMic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        micStream.getAudioTracks().forEach(track => {
          this.screenRecorder.stream.addTrack(track);
          tracks.push(track);
        });
      } catch (e) {
        console.warn('[VideoTools] Mic access denied:', e.message);
      }
    }

    // Add webcam overlay if requested
    if (this.screenRecorder.includeWebcam || options.includeWebcam) {
      try {
        this.screenRecorder.webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          }
        });
      } catch (e) {
        console.warn('[VideoTools] Webcam access denied:', e.message);
      }
    }

    // Handle stream end
    this.screenRecorder.stream.getVideoTracks()[0].addEventListener('ended', () => {
      this.stopScreenRecording();
    });

    // Determine MIME type
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    this.screenRecorder.mediaRecorder = new MediaRecorder(this.screenRecorder.stream, {
      mimeType,
      videoBitsPerSecond: options.bitrate || 5000000
    });

    this.screenRecorder.chunks = [];

    this.screenRecorder.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.screenRecorder.chunks.push(e.data);
      }
    };

    this.screenRecorder.mediaRecorder.onstop = () => {
      this._finalizeScreenRecording();
    };

    this.screenRecorder.mediaRecorder.start(1000);
    this.screenRecorder.isRecording = true;
    this.screenRecorder.isPaused = false;
    this.screenRecorder.startTime = Date.now();

    console.log('[VideoTools] Screen recording started');

    window.dispatchEvent(new CustomEvent('screen-recording-start', {
      detail: { time: Date.now() }
    }));
  }

  pauseScreenRecording() {
    if (!this.screenRecorder.isRecording || this.screenRecorder.isPaused) return;

    this.screenRecorder.mediaRecorder.pause();
    this.screenRecorder.isPaused = true;

    console.log('[VideoTools] Screen recording paused');
    window.dispatchEvent(new CustomEvent('screen-recording-pause'));
  }

  resumeScreenRecording() {
    if (!this.screenRecorder.isRecording || !this.screenRecorder.isPaused) return;

    this.screenRecorder.mediaRecorder.resume();
    this.screenRecorder.isPaused = false;

    console.log('[VideoTools] Screen recording resumed');
    window.dispatchEvent(new CustomEvent('screen-recording-resume'));
  }

  stopScreenRecording() {
    if (!this.screenRecorder.isRecording) return;

    this.screenRecorder.mediaRecorder.stop();
    this.screenRecorder.isRecording = false;
    this.screenRecorder.isPaused = false;

    // Stop all tracks
    if (this.screenRecorder.stream) {
      this.screenRecorder.stream.getTracks().forEach(t => t.stop());
    }
    if (this.screenRecorder.webcamStream) {
      this.screenRecorder.webcamStream.getTracks().forEach(t => t.stop());
    }

    console.log('[VideoTools] Screen recording stopped');
  }

  _finalizeScreenRecording() {
    const blob = new Blob(this.screenRecorder.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const duration = (Date.now() - this.screenRecorder.startTime) / 1000;

    const recording = {
      blob,
      url,
      duration,
      size: blob.size,
      timestamp: Date.now()
    };

    console.log('[VideoTools] Screen recording finalized:',
      `${duration.toFixed(1)}s,`, (blob.size / 1024 / 1024).toFixed(2) + 'MB');

    window.dispatchEvent(new CustomEvent('screen-recording-complete', {
      detail: recording
    }));

    return recording;
  }

  setScreenRecordingOptions(options) {
    if (options.includeWebcam !== undefined) this.screenRecorder.includeWebcam = options.includeWebcam;
    if (options.includeSystemAudio !== undefined) this.screenRecorder.includeSystemAudio = options.includeSystemAudio;
    if (options.includeMic !== undefined) this.screenRecorder.includeMic = options.includeMic;
  }

  // ─── Download Helpers ─────────────────────────────────────────────

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    console.log('[VideoTools] Download:', filename);
  }

  async downloadExport(filename) {
    const blob = await this.exportVideo();
    this.downloadBlob(blob, filename || 'aurality-export.webm');
  }

  async downloadGif(startTime, endTime, filename, options) {
    const blob = await this.exportGif(startTime, endTime, options);
    this.downloadBlob(blob, filename || 'aurality-clip.gif');
  }

  async downloadThumbnail(clipId, time, filename) {
    const thumb = await this.extractThumbnail(clipId, time);
    this.downloadBlob(thumb.blob, filename || 'thumbnail.jpg');
  }

  // ─── Timeline State ───────────────────────────────────────────────

  getTimelineState() {
    return {
      clips: this.timeline.clips.map(c => ({
        id: c.id,
        name: c.name,
        duration: c.duration,
        trimIn: c.trimIn,
        trimOut: c.trimOut,
        timelineOffset: c.timelineOffset,
        trackIndex: c.trackIndex,
        speed: c.speed,
        volume: c.volume
      })),
      audioTracks: this.timeline.audioTracks.map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        timelineOffset: t.timelineOffset,
        volume: t.volume,
        muted: t.muted
      })),
      duration: this.timeline.duration,
      currentTime: this.timeline.currentTime,
      effects: { ...this.effects, textOverlays: [...this.effects.textOverlays] },
      exportSettings: { ...this.exportSettings }
    };
  }

  loadTimelineState(state) {
    if (state.effects) {
      Object.assign(this.effects, state.effects);
    }
    if (state.exportSettings) {
      Object.assign(this.exportSettings, state.exportSettings);
    }
    console.log('[VideoTools] Timeline state loaded');
  }

  // ─── Internal Helpers ─────────────────────────────────────────────

  _getClip(clipId) {
    return this.timeline.clips.find(c => c.id === clipId) || null;
  }

  _getClipsAtTime(time) {
    return this.timeline.clips.filter(clip => {
      const clipStart = clip.timelineOffset;
      const clipEnd = clip.timelineOffset + (clip.trimOut - clip.trimIn);
      return time >= clipStart && time < clipEnd;
    });
  }

  _recalcDuration() {
    let max = 0;

    this.timeline.clips.forEach(clip => {
      const end = clip.timelineOffset + (clip.trimOut - clip.trimIn);
      if (end > max) max = end;
    });

    this.timeline.audioTracks.forEach(track => {
      const end = track.timelineOffset + (track.trimOut - track.trimIn);
      if (end > max) max = end;
    });

    this.timeline.duration = max;
  }

  _syncMediaToPlayhead() {
    const time = this.timeline.currentTime;

    this.timeline.clips.forEach(clip => {
      const clipStart = clip.timelineOffset;
      const clipEnd = clip.timelineOffset + (clip.trimOut - clip.trimIn);

      if (time >= clipStart && time < clipEnd) {
        const clipTime = (time - clipStart) + clip.trimIn;
        clip.video.currentTime = clipTime;
        clip.video.playbackRate = this.playback.speed * clip.speed;
        clip.video.play().catch(() => {});
      } else {
        clip.video.pause();
      }
    });

    this.timeline.audioTracks.forEach(track => {
      if (track.muted) { track.audio.pause(); return; }

      const trackStart = track.timelineOffset;
      const trackEnd = track.timelineOffset + (track.trimOut - track.trimIn);

      if (time >= trackStart && time < trackEnd) {
        const trackTime = (time - trackStart) + track.trimIn;
        track.audio.currentTime = trackTime;
        track.audio.volume = track.volume;
        track.audio.play().catch(() => {});
      } else {
        track.audio.pause();
      }
    });
  }

  async _generateThumbnails(clip) {
    try {
      const thumbs = await this.extractAllThumbnails(clip.id, 8);
      this._thumbnailCache.set(clip.id, thumbs);
    } catch (e) {
      console.warn('[VideoTools] Thumbnail generation failed:', e.message);
    }
  }

  _uid() {
    return 'vt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────

  destroy() {
    this.pause();

    // Revoke all object URLs
    this.timeline.clips.forEach(clip => {
      if (clip.url && clip.file) URL.revokeObjectURL(clip.url);
    });
    this.timeline.audioTracks.forEach(track => {
      URL.revokeObjectURL(track.url);
    });

    this._thumbnailCache.forEach((val) => {
      if (typeof val === 'string') URL.revokeObjectURL(val);
      if (Array.isArray(val)) val.forEach(t => URL.revokeObjectURL(t.url));
    });

    this._clipCache.clear();
    this._thumbnailCache.clear();

    this.timeline.clips = [];
    this.timeline.audioTracks = [];
    this.effects.textOverlays = [];
    this.effects.transitions = [];

    if (this.screenRecorder.isRecording) {
      this.stopScreenRecording();
    }

    this.isInitialized = false;
    console.log('[VideoTools] Destroyed');
  }
}

window.AuralityVideoTools = VideoTools;
