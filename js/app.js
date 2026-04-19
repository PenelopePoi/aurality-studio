/**
 * Aurality Studio — Main Application
 * Initializes all modules, binds UI, manages state, runs render loop.
 */
class AuralityApp {
  constructor() {
    this.engine = new AuralityAudioEngine();
    this.deckA = null;
    this.deckB = null;
    this.mixer = null;
    this.effects = null;
    this.midi = null;
    this.library = null;
    this.recorder = null;
    this.stemSeparator = null;
    this.ai = new AuralityAI();
    this.practiceMode = new AuralityPracticeMode();
    this.waveformA = null;
    this.waveformB = null;
    this.overviewA = null;
    this.overviewB = null;
    this.visualizer = null;
    this.animFrameId = null;
    this.selectedTrack = null;
    this.libraryView = 'all'; // all, playlists, history
  }

  async init() {
    console.log('[Aurality Studio] Initializing...');

    // Init audio engine
    await this.engine.init();

    // Init decks
    this.deckA = new AuralityDeck(this.engine, 'A');
    this.deckB = new AuralityDeck(this.engine, 'B');

    // Init mixer
    this.mixer = new AuralityMixer(this.engine);

    // Init effects
    this.effects = new AuralityEffects(this.engine);
    this.effects.initChannel('A');
    this.effects.initChannel('B');

    // Init stem separator
    this.stemSeparator = new AuralityStemSeparator(this.engine);

    // Init recorder
    this.recorder = new AuralityRecorder(this.engine);

    // Init library
    this.library = new AuralityLibrary();
    await this.library.init();

    // Init waveforms
    this.waveformA = new AuralityWaveform('waveform-a', 'A');
    this.waveformB = new AuralityWaveform('waveform-b', 'B');
    this.overviewA = new AuralityOverviewWaveform('overview-a', 'A');
    this.overviewB = new AuralityOverviewWaveform('overview-b', 'B');

    // Init visualizer
    this.visualizer = new AuralityVisualizer('visualizer-canvas', this.engine);

    // Init Pad Synth (808 / Kaossilator) — connect to masterCompressor to stay in signal chain
    this.padSynth = new PadSynth(this.engine.ctx, this.engine.masterCompressor);
    this._initPadSynthUI();

    // Init MIDI
    this.midi = new AuralityMIDI(this);
    const midiOk = await this.midi.init();
    this._updateMIDIStatus(midiOk && this.midi.connected);

    // Bind all UI
    this._bindUI();
    this._bindDragDrop();
    this._bindEvents();

    // Render library
    this._renderLibrary();

    // Start render loop
    this._startRenderLoop();

    console.log('[Aurality Studio] Ready.');
  }

  // ===== Track Loading =====
  async loadTrackToDeck(trackMeta, channel) {
    const deck = channel === 'A' ? this.deckA : this.deckB;
    const audioData = await this.library.getAudioData(trackMeta.id);
    if (!audioData) { console.error('No audio data for', trackMeta.id); return; }

    const result = await deck.loadTrack(audioData, { name: trackMeta.name, artist: trackMeta.artist });

    // Update metadata in library
    await this.library.updateTrack(trackMeta.id, {
      bpm: result.bpm,
      key: result.key,
      duration: result.duration
    });

    // Load saved cue points
    const savedCues = await this.library.loadCuePoints(trackMeta.id);
    if (savedCues) {
      deck.cuePoint = savedCues.cuePoint || 0;
      if (savedCues.hotCues) {
        for (let i = 0; i < 8; i++) {
          deck.hotCues[i] = savedCues.hotCues[i] || null;
        }
      }
    }

    // Set waveform data
    const wf = channel === 'A' ? this.waveformA : this.waveformB;
    const ov = channel === 'A' ? this.overviewA : this.overviewB;
    wf.setData(deck.waveformData, deck.duration, deck.beatGrid);
    ov.setData(deck.waveformData, deck.duration);

    // Record play
    await this.library.recordPlay(trackMeta.id);

    // Update AI suggestions
    this._updateAISuggestions(channel);

    this.updateUI();
  }

  // ===== UI Binding =====
  _bindUI() {
    // Transport buttons - Deck A
    this._on('play-a', 'click', () => { this.deckA.isPlaying ? this.deckA.pause() : this.deckA.play(); this.updateUI(); });
    this._on('cue-a', 'click', () => { this.deckA.cuePress(); this.updateUI(); });
    this._on('sync-a', 'click', () => { this.deckA.syncTo(this.deckB); this.updateUI(); });

    // Transport buttons - Deck B
    this._on('play-b', 'click', () => { this.deckB.isPlaying ? this.deckB.pause() : this.deckB.play(); this.updateUI(); });
    this._on('cue-b', 'click', () => { this.deckB.cuePress(); this.updateUI(); });
    this._on('sync-b', 'click', () => { this.deckB.syncTo(this.deckA); this.updateUI(); });

    // Pitch sliders
    this._on('pitch-a', 'input', (e) => { this.deckA.setPitch(parseFloat(e.target.value)); this.updateUI(); });
    this._on('pitch-b', 'input', (e) => { this.deckB.setPitch(parseFloat(e.target.value)); this.updateUI(); });

    // Pitch range
    this._on('pitch-range-a', 'change', (e) => this.deckA.setPitchRange(e.target.value));
    this._on('pitch-range-b', 'change', (e) => this.deckB.setPitchRange(e.target.value));

    // Hot cue pads
    for (let i = 0; i < 8; i++) {
      this._on(`hotcue-a-${i}`, 'click', () => {
        if (this.deckA.hotCues[i] !== null) this.deckA.triggerHotCue(i);
        else this.deckA.setHotCue(i);
        this.updateUI();
      });
      this._on(`hotcue-b-${i}`, 'click', () => {
        if (this.deckB.hotCues[i] !== null) this.deckB.triggerHotCue(i);
        else this.deckB.setHotCue(i);
        this.updateUI();
      });
      // Right-click to delete
      const padA = document.getElementById(`hotcue-a-${i}`);
      const padB = document.getElementById(`hotcue-b-${i}`);
      if (padA) padA.addEventListener('contextmenu', (e) => { e.preventDefault(); this.deckA.deleteHotCue(i); this.updateUI(); });
      if (padB) padB.addEventListener('contextmenu', (e) => { e.preventDefault(); this.deckB.deleteHotCue(i); this.updateUI(); });
    }

    // Loop controls
    ['a', 'b'].forEach(d => {
      const deck = d === 'a' ? this.deckA : this.deckB;
      [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32].forEach(beats => {
        const label = beats < 1 ? `1/${Math.round(1/beats)}` : String(beats);
        this._on(`loop-${d}-${label}`, 'click', () => { deck.autoLoop(beats); this.updateUI(); });
      });
      this._on(`loop-in-${d}`, 'click', () => { deck.setLoopIn(); this.updateUI(); });
      this._on(`loop-out-${d}`, 'click', () => { deck.setLoopOut(); this.updateUI(); });
      this._on(`loop-toggle-${d}`, 'click', () => { deck.toggleLoop(); this.updateUI(); });
    });

    // Slip mode
    this._on('slip-a', 'click', () => { this.deckA.toggleSlipMode(); this.updateUI(); });
    this._on('slip-b', 'click', () => { this.deckB.toggleSlipMode(); this.updateUI(); });

    // Mixer controls
    this._on('fader-a', 'input', (e) => this.mixer.setVolume('A', parseFloat(e.target.value)));
    this._on('fader-b', 'input', (e) => this.mixer.setVolume('B', parseFloat(e.target.value)));
    this._on('crossfader', 'input', (e) => this.mixer.setCrossfader(parseFloat(e.target.value)));
    this._on('trim-a', 'input', (e) => this.mixer.setTrim('A', parseFloat(e.target.value) * 2));
    this._on('trim-b', 'input', (e) => this.mixer.setTrim('B', parseFloat(e.target.value) * 2));

    // EQ knobs (using range inputs as knob simulation)
    ['hi', 'mid', 'lo'].forEach(band => {
      this._on(`eq-${band}-a`, 'input', (e) => this.mixer.setEQ('A', band, parseFloat(e.target.value)));
      this._on(`eq-${band}-b`, 'input', (e) => this.mixer.setEQ('B', band, parseFloat(e.target.value)));
      // Double-click to reset
      const elA = document.getElementById(`eq-${band}-a`);
      const elB = document.getElementById(`eq-${band}-b`);
      if (elA) elA.addEventListener('dblclick', () => { elA.value = 0; this.mixer.setEQ('A', band, 0); });
      if (elB) elB.addEventListener('dblclick', () => { elB.value = 0; this.mixer.setEQ('B', band, 0); });
    });

    // Filter
    this._on('filter-a', 'input', (e) => this.mixer.setFilter('A', parseFloat(e.target.value)));
    this._on('filter-b', 'input', (e) => this.mixer.setFilter('B', parseFloat(e.target.value)));

    // Headphone cue
    this._on('cue-ch-a', 'click', () => { const on = this.mixer.toggleCue('A'); this._toggleClass('cue-ch-a', 'active', on); });
    this._on('cue-ch-b', 'click', () => { const on = this.mixer.toggleCue('B'); this._toggleClass('cue-ch-b', 'active', on); });

    // Crossfader curve
    this._on('xf-curve', 'change', (e) => this.mixer.setCrossfaderCurve(e.target.value));

    // Master volume
    this._on('master-vol', 'input', (e) => this.mixer.setMasterVolume(parseFloat(e.target.value)));

    // FX buttons
    const fxNames = ['reverb', 'delay', 'flanger', 'phaser', 'chorus', 'bitcrusher', 'echoout', 'compressor', 'deesser'];
    fxNames.forEach(fx => {
      this._on(`fx-${fx}-a`, 'click', () => {
        const active = this.effects.toggle('A', fx);
        this._toggleClass(`fx-${fx}-a`, 'active', active);
      });
      this._on(`fx-${fx}-b`, 'click', () => {
        const active = this.effects.toggle('B', fx);
        this._toggleClass(`fx-${fx}-b`, 'active', active);
      });
    });

    // Stem buttons
    ['bass', 'drums', 'vocals', 'melody'].forEach(stem => {
      this._on(`stem-${stem}-a`, 'click', () => {
        const audible = this.stemSeparator.toggleStem('A', stem);
        this._toggleClass(`stem-${stem}-a`, 'muted', !audible);
      });
      this._on(`stem-${stem}-b`, 'click', () => {
        const audible = this.stemSeparator.toggleStem('B', stem);
        this._toggleClass(`stem-${stem}-b`, 'muted', !audible);
      });
    });

    // Top bar buttons
    this._on('btn-record', 'click', () => this._toggleRecording());
    this._on('btn-visualizer', 'click', () => this._toggleVisualizer());
    this._on('btn-ai', 'click', () => this._toggleAIPanel());
    this._on('btn-practice', 'click', () => this._togglePracticeMode());

    // Library
    this._on('library-search', 'input', (e) => {
      this.library.search(e.target.value);
      this._renderLibrary();
    });
    this._on('library-import', 'click', () => this._triggerFileImport());
    this._on('tab-all', 'click', () => { this.libraryView = 'all'; this.library.currentPlaylist = null; this._renderLibrary(); this._updateTabs(); });
    this._on('tab-playlists', 'click', () => { this.libraryView = 'playlists'; this._renderLibrary(); this._updateTabs(); });
    this._on('tab-history', 'click', () => { this.libraryView = 'history'; this._renderLibrary(); this._updateTabs(); });

    // Tap tempo
    this._tapTempoState = { A: [], B: [] };
    ['a', 'b'].forEach(d => {
      const ch = d.toUpperCase();
      this._on(`tap-${d}`, 'click', () => {
        const now = performance.now();
        const taps = this._tapTempoState[ch];
        // Reset if gap > 2 seconds since last tap
        if (taps.length > 0 && (now - taps[taps.length - 1]) > 2000) {
          taps.length = 0;
        }
        taps.push(now);
        // Keep last 8 taps max
        if (taps.length > 8) taps.shift();
        // Visual flash
        const btn = document.getElementById(`tap-${d}`);
        if (btn) {
          btn.classList.add('tapping');
          setTimeout(() => btn.classList.remove('tapping'), 100);
        }
        // Need at least 4 taps to calculate BPM
        if (taps.length >= 4) {
          const intervals = [];
          for (let i = 1; i < taps.length; i++) {
            intervals.push(taps[i] - taps[i - 1]);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const bpm = 60000 / avgInterval;
          if (bpm >= 40 && bpm <= 240) {
            const deck = ch === 'A' ? this.deckA : this.deckB;
            deck.bpm = Math.round(bpm * 10) / 10;
            this._setText(`bpm-${d}`, deck.bpm.toFixed(1));
          }
        }
      });
    });

    // Library sort
    document.querySelectorAll('.track-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        this.library.sort(th.dataset.sort);
        this._renderLibrary();
      });
    });

    // Beat jump buttons
    [-32, -16, -8, -4, -1, 1, 4, 8, 16, 32].forEach(beats => {
      this._on(`bj-a-${beats}`, 'click', () => { this.deckA.beatJump(beats); this.updateUI(); });
      this._on(`bj-b-${beats}`, 'click', () => { this.deckB.beatJump(beats); this.updateUI(); });
    });

    // Brake / spinback
    this._on('brake-a', 'click', () => this.deckA.brake());
    this._on('brake-b', 'click', () => this.deckB.brake());
    this._on('spinback-a', 'click', () => this.deckA.spinback());
    this._on('spinback-b', 'click', () => this.deckB.spinback());
  }

  _bindDragDrop() {
    const overlay = document.getElementById('drop-overlay');
    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (overlay) overlay.classList.add('visible');
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0 && overlay) overlay.classList.remove('visible');
    });

    document.addEventListener('dragover', (e) => e.preventDefault());

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (overlay) overlay.classList.remove('visible');

      const files = Array.from(e.dataTransfer.files).filter(f =>
        /\.(mp3|wav|flac|ogg|aac|m4a|webm)$/i.test(f.name)
      );

      for (const file of files) {
        await this.library.importTrack(file);
      }
      this._renderLibrary();

      // If dropping on a specific deck
      const target = e.target.closest('.deck-panel');
      if (target && files.length > 0) {
        const channel = target.classList.contains('deck-a') ? 'A' : 'B';
        const lastTrack = this.library.tracks[this.library.tracks.length - 1];
        if (lastTrack) await this.loadTrackToDeck(lastTrack, channel);
      }
    });
  }

  _bindEvents() {
    // Waveform interaction events
    window.addEventListener('waveform-seek', (e) => {
      const deck = e.detail.channel === 'A' ? this.deckA : this.deckB;
      deck.seekTo(e.detail.position);
    });

    window.addEventListener('waveform-scratch', (e) => {
      const deck = e.detail.channel === 'A' ? this.deckA : this.deckB;
      deck.scratch(e.detail.delta);
    });

    window.addEventListener('waveform-scratch-release', (e) => {
      const deck = e.detail.channel === 'A' ? this.deckA : this.deckB;
      deck.scratchRelease();
    });

    // MIDI events
    window.addEventListener('midi-state', (e) => this._updateMIDIStatus(e.detail.connected));
    window.addEventListener('midi-load', (e) => {
      // Load selected track to requested deck
      if (this.selectedTrack) this.loadTrackToDeck(this.selectedTrack, e.detail.channel);
    });
    window.addEventListener('midi-browse', (e) => {
      // Scroll library
      const content = document.querySelector('.library-content');
      if (content) content.scrollTop += e.detail.direction * 30;
    });

    // Recording complete
    window.addEventListener('recording-complete', (e) => {
      const { url, filename, duration } = e.detail;
      if (confirm(`Recording complete (${Math.round(duration)}s). Download now?`)) {
        this.recorder.downloadRecording(url, filename);
      }
    });

    // Deck ended
    window.addEventListener('deck-ended', (e) => {
      this.updateUI();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._handleKeyboard(e));
  }

  _handleKeyboard(e) {
    // Prevent default for DJ shortcuts
    const key = e.key.toLowerCase();

    switch (key) {
      case ' ': // Space = play/pause deck A
        e.preventDefault();
        this.deckA.isPlaying ? this.deckA.pause() : this.deckA.play();
        break;
      case 'enter': // Enter = play/pause deck B
        e.preventDefault();
        this.deckB.isPlaying ? this.deckB.pause() : this.deckB.play();
        break;
      case 'q': this.deckA.cuePress(); break;
      case 'p': this.deckB.cuePress(); break;
      case 'w': this.deckA.syncTo(this.deckB); break;
      case 'o': this.deckB.syncTo(this.deckA); break;
      case 'r': if (e.ctrlKey || e.metaKey) { e.preventDefault(); this._toggleRecording(); } break;
      case 'v': if (e.ctrlKey || e.metaKey) break; this._toggleVisualizer(); break;
      // Hot cues deck A: 1-8
      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8':
        if (!e.target.matches('input')) {
          const idx = parseInt(key) - 1;
          if (e.shiftKey) this.deckB.hotCues[idx] !== null ? this.deckB.triggerHotCue(idx) : this.deckB.setHotCue(idx);
          else this.deckA.hotCues[idx] !== null ? this.deckA.triggerHotCue(idx) : this.deckA.setHotCue(idx);
        }
        break;
    }
    this.updateUI();
  }

  // ===== Feature Toggles =====
  _toggleRecording() {
    if (this.recorder.isRecording) {
      this.recorder.stop();
      this._toggleClass('btn-record', 'recording', false);
      this._setDisplay('rec-indicator', false);
    } else {
      this.recorder.start();
      this._toggleClass('btn-record', 'recording', true);
      this._setDisplay('rec-indicator', true);
    }
  }

  _toggleVisualizer() {
    const active = this.visualizer.toggle();
    this._toggleClass('visualizer-panel', 'active', active);
    this._toggleClass('btn-visualizer', 'active', active);
    if (active) this.visualizer._resize();
  }

  _toggleAIPanel() {
    const panel = document.getElementById('ai-panel');
    if (!panel) return;
    const showing = panel.classList.toggle('active');
    this._toggleClass('btn-ai', 'active', showing);
    if (showing) this._updateAISuggestions('A');
  }

  _togglePracticeMode() {
    if (this.practiceMode.active) {
      const session = this.practiceMode.endSession();
      this._toggleClass('btn-practice', 'active', false);
      if (session) this._showPracticeResults(session);
    } else {
      this.practiceMode.startSession();
      this._toggleClass('btn-practice', 'active', true);
    }
  }

  toggleFX(channel) {
    // Toggle first active-type effect (used by MIDI)
    const names = this.effects.getEffectNames();
    for (const name of names) {
      if (this.effects.isActive(channel, name)) {
        this.effects.toggle(channel, name);
        return;
      }
    }
    // If none active, toggle reverb
    this.effects.toggle(channel, 'reverb');
  }

  // ===== UI Updates =====
  updateUI() {
    // Deck A info
    this._setText('track-name-a', this.deckA.trackName || 'No Track');
    this._setText('track-artist-a', this.deckA.trackArtist || '');
    this._setText('bpm-a', this.deckA.bpm ? this.deckA.bpm.toFixed(1) : '---');
    this._setText('key-a', this.deckA.detectedKey || '---');
    this._setText('time-a', this._formatTime(this.deckA.getCurrentPosition()));
    this._setText('remain-a', '-' + this._formatTime(this.deckA.duration - this.deckA.getCurrentPosition()));
    this._toggleClass('play-a', 'playing', this.deckA.isPlaying);
    this._setText('pitch-val-a', (this.deckA.pitchAdjust * this.deckA.pitchRange * 100).toFixed(1) + '%');

    // Deck B info
    this._setText('track-name-b', this.deckB.trackName || 'No Track');
    this._setText('track-artist-b', this.deckB.trackArtist || '');
    this._setText('bpm-b', this.deckB.bpm ? this.deckB.bpm.toFixed(1) : '---');
    this._setText('key-b', this.deckB.detectedKey || '---');
    this._setText('time-b', this._formatTime(this.deckB.getCurrentPosition()));
    this._setText('remain-b', '-' + this._formatTime(this.deckB.duration - this.deckB.getCurrentPosition()));
    this._toggleClass('play-b', 'playing', this.deckB.isPlaying);
    this._setText('pitch-val-b', (this.deckB.pitchAdjust * this.deckB.pitchRange * 100).toFixed(1) + '%');

    // Hot cue indicators
    for (let i = 0; i < 8; i++) {
      this._toggleClass(`hotcue-a-${i}`, 'set', this.deckA.hotCues[i] !== null);
      this._toggleClass(`hotcue-b-${i}`, 'set', this.deckB.hotCues[i] !== null);
    }

    // Loop indicators
    this._toggleClass('loop-toggle-a', 'active', this.deckA.loopActive);
    this._toggleClass('loop-toggle-b', 'active', this.deckB.loopActive);

    // Slip mode
    this._toggleClass('slip-a', 'active', this.deckA.slipMode);
    this._toggleClass('slip-b', 'active', this.deckB.slipMode);

    // Recording time
    if (this.recorder.isRecording) {
      this._setText('rec-time', this._formatTime(this.recorder.getElapsed()));
    }
  }

  // ===== Render Loop =====
  _startRenderLoop() {
    const render = () => {
      this.animFrameId = requestAnimationFrame(render);

      // Update waveforms
      const freqA = this.engine.getFrequencyData('A');
      const freqB = this.engine.getFrequencyData('B');

      this.waveformA.update(
        this.deckA.getCurrentPosition(), this.deckA.hotCues,
        this.deckA.loopIn, this.deckA.loopOut, this.deckA.loopActive, this.deckA.cuePoint
      );
      this.waveformA.render(freqA);

      this.waveformB.update(
        this.deckB.getCurrentPosition(), this.deckB.hotCues,
        this.deckB.loopIn, this.deckB.loopOut, this.deckB.loopActive, this.deckB.cuePoint
      );
      this.waveformB.render(freqB);

      // Overview waveforms
      this.overviewA.render(this.deckA.getCurrentPosition());
      this.overviewB.render(this.deckB.getCurrentPosition());

      // VU meters
      const levels = this.mixer.getLevels();
      this._setMeterHeight('vu-a', levels.A);
      this._setMeterHeight('vu-b', levels.B);
      this._setMeterHeight('vu-master', levels.master);

      // Master stereo meter (canvas)
      this._renderMasterMeter(levels);

      // Visualizer
      if (this.visualizer.active) this.visualizer.render();

      // Loop handling via position check (backup for source loop)
      if (this.deckA.isPlaying && this.deckA.loopActive && this.deckA.loopOut) {
        if (this.deckA.getCurrentPosition() >= this.deckA.loopOut) {
          this.deckA.seekTo(this.deckA.loopIn);
        }
      }
      if (this.deckB.isPlaying && this.deckB.loopActive && this.deckB.loopOut) {
        if (this.deckB.getCurrentPosition() >= this.deckB.loopOut) {
          this.deckB.seekTo(this.deckB.loopIn);
        }
      }

      // Periodic UI update (every 5 frames to reduce DOM thrash)
      if (this._frameCount === undefined) this._frameCount = 0;
      this._frameCount++;
      if (this._frameCount % 5 === 0) {
        this._setText('time-a', this._formatTime(this.deckA.getCurrentPosition()));
        this._setText('remain-a', '-' + this._formatTime(Math.max(0, this.deckA.duration - this.deckA.getCurrentPosition())));
        this._setText('time-b', this._formatTime(this.deckB.getCurrentPosition()));
        this._setText('remain-b', '-' + this._formatTime(Math.max(0, this.deckB.duration - this.deckB.getCurrentPosition())));
        if (this.recorder.isRecording) {
          this._setText('rec-time', this._formatTime(this.recorder.getElapsed()));
        }
      }
    };
    render();
  }

  // ===== Library Rendering =====
  _renderLibrary() {
    const tbody = document.getElementById('library-tbody');
    if (!tbody) return;

    if (this.libraryView === 'history') {
      this._renderHistory(tbody);
      return;
    }

    if (this.libraryView === 'playlists') {
      this._renderPlaylists(tbody);
      return;
    }

    const tracks = this.library.getFilteredTracks();

    // Update track count in tab
    const countEl = document.getElementById('track-count');
    if (countEl) countEl.textContent = this.library.tracks.length > 0 ? `(${this.library.tracks.length})` : '';

    if (tracks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="library-drop-zone" id="library-drop-target">
          <div class="drop-icon">&#128190;</div>
          <div class="drop-text">DROP FILES HERE</div>
          <div class="drop-hint">or click Import to add MP3, WAV, FLAC, OGG, AAC</div>
        </div>
      </td></tr>`;
      // Make the drop zone clickable
      const dropTarget = document.getElementById('library-drop-target');
      if (dropTarget) {
        dropTarget.addEventListener('click', () => this._triggerFileImport());
      }
      return;
    }

    tbody.innerHTML = tracks.map(t => `
      <tr data-id="${t.id}" class="${this.selectedTrack?.id === t.id ? 'selected' : ''}">
        <td>${t.artist}</td>
        <td>${t.name}</td>
        <td class="col-bpm">${t.bpm ? t.bpm.toFixed(1) : '---'}</td>
        <td class="col-key">${t.key || '---'}</td>
        <td class="col-duration">${this._formatTime(t.duration)}</td>
        <td>${t.genre || ''}</td>
        <td class="col-actions">
          <button class="load-btn load-a" data-id="${t.id}" data-ch="A">A</button>
          <button class="load-btn load-b" data-id="${t.id}" data-ch="B">B</button>
        </td>
      </tr>
    `).join('');

    // Bind row clicks
    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        this.selectedTrack = this.library.tracks.find(t => t.id === row.dataset.id);
        this._renderLibrary();
      });
      row.addEventListener('dblclick', () => {
        const track = this.library.tracks.find(t => t.id === row.dataset.id);
        if (track) this.loadTrackToDeck(track, 'A');
      });
    });

    // Bind load buttons
    tbody.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const track = this.library.tracks.find(t => t.id === btn.dataset.id);
        if (track) this.loadTrackToDeck(track, btn.dataset.ch);
      });
    });
  }

  _renderHistory(tbody) {
    if (this.library.history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="library-empty">No play history yet</td></tr>';
      return;
    }
    tbody.innerHTML = this.library.history.slice(0, 100).map(h => `
      <tr>
        <td>${h.artist || ''}</td>
        <td>${h.trackName}</td>
        <td colspan="3" class="col-duration">${new Date(h.timestamp).toLocaleString()}</td>
        <td colspan="2"></td>
      </tr>
    `).join('');
  }

  _renderPlaylists(tbody) {
    if (this.library.playlists.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="library-empty">No playlists. Create one from the AI panel.</td></tr>';
      return;
    }
    tbody.innerHTML = this.library.playlists.map(pl => `
      <tr class="playlist-row" data-plid="${pl.id}">
        <td colspan="5"><strong>${pl.name}</strong> (${pl.trackIds.length} tracks)</td>
        <td colspan="2">${new Date(pl.created).toLocaleDateString()}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.playlist-row').forEach(row => {
      row.addEventListener('click', () => {
        this.library.currentPlaylist = row.dataset.plid;
        this.libraryView = 'all';
        this._renderLibrary();
        this._updateTabs();
      });
    });
  }

  _updateTabs() {
    document.querySelectorAll('.library-tab').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById(`tab-${this.libraryView}`);
    if (tab) tab.classList.add('active');
  }

  _triggerFileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*';
    input.onchange = async () => {
      const files = Array.from(input.files);
      if (files.length === 0) return;
      // Show analyzing indicator in library
      const tbody = document.getElementById('library-tbody');
      if (tbody && this.library.tracks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="library-empty">
          <div class="analyzing-indicator"></div>
          Analyzing ${files.length} track${files.length > 1 ? 's' : ''}...
        </td></tr>`;
      }
      for (let i = 0; i < files.length; i++) {
        await this.library.importTrack(files[i]);
        // Progressive render after each track
        this._renderLibrary();
      }
    };
    input.click();
  }

  // ===== AI Panel =====
  _updateAISuggestions(channel) {
    const panel = document.getElementById('ai-panel');
    if (!panel || !panel.classList.contains('active')) return;

    const deck = channel === 'A' ? this.deckA : this.deckB;
    const currentTrack = this.library.tracks.find(t => t.name === deck.trackName);

    // Next track suggestions
    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (suggestionsContainer && currentTrack) {
      const suggestions = this.ai.suggestNextTrack(currentTrack, this.library.tracks, 5);
      suggestionsContainer.innerHTML = suggestions.map(s => `
        <div class="ai-suggestion" data-id="${s.track.id}">
          <div class="ai-suggestion-title">${s.track.artist} - ${s.track.name}</div>
          <div class="ai-suggestion-detail">${s.reasons.join(' | ')}</div>
          <div class="ai-suggestion-score">Match: ${s.score}%</div>
        </div>
      `).join('') || '<div class="ai-suggestion-detail">Load a track to get suggestions</div>';

      suggestionsContainer.querySelectorAll('.ai-suggestion').forEach(el => {
        el.addEventListener('click', () => {
          const track = this.library.tracks.find(t => t.id === el.dataset.id);
          const otherChannel = channel === 'A' ? 'B' : 'A';
          if (track) this.loadTrackToDeck(track, otherChannel);
        });
      });
    }

    // Transition suggestions
    const transContainer = document.getElementById('ai-transitions');
    if (transContainer) {
      const trackA = this.library.tracks.find(t => t.name === this.deckA.trackName);
      const trackB = this.library.tracks.find(t => t.name === this.deckB.trackName);

      if (trackA && trackB) {
        const transitions = this.ai.suggestTransition(
          { ...trackA, bpm: this.deckA.bpm, key: this.deckA.detectedKey },
          { ...trackB, bpm: this.deckB.bpm, key: this.deckB.detectedKey }
        );
        transContainer.innerHTML = transitions.map(t => `
          <div class="ai-transition">
            <div class="ai-transition-type">${t.type.toUpperCase()} (${Math.round(t.confidence * 100)}%)</div>
            <div class="ai-transition-desc">${t.description}</div>
            ${t.technique ? `<div class="ai-transition-technique">${t.technique}</div>` : ''}
          </div>
        `).join('');
      } else {
        transContainer.innerHTML = '<div class="ai-suggestion-detail">Load tracks on both decks for transition suggestions</div>';
      }
    }
  }

  _showPracticeResults(session) {
    const overlay = document.getElementById('practice-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    overlay.innerHTML = `
      <div class="practice-score">${session.overallScore}</div>
      <div class="practice-grade" style="color: ${session.overallScore >= 80 ? 'var(--accent-green)' : session.overallScore >= 60 ? 'var(--accent-yellow)' : 'var(--meter-red)'}">${this.practiceMode._getGrade(session.overallScore)}</div>
      <div class="practice-metrics">
        <div>Transitions: ${session.transitions.length}</div>
        <div>Duration: ${this._formatTime(session.duration)}</div>
      </div>
      <div class="practice-feedback">
        ${session.tips.map(t => `<div>&#8226; ${t}</div>`).join('')}
      </div>
      <div style="margin-top:12px;text-align:center">
        <button class="modal-btn" onclick="this.parentElement.parentElement.classList.remove('active')">Close</button>
      </div>
    `;
  }

  // ===== Master Stereo Meter (Canvas) =====
  _renderMasterMeter(levels) {
    const canvas = document.getElementById('master-meter');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Use analyser for stereo-ish simulation (L/R from channel levels)
    const levelL = Math.min(1, (levels.A || 0) * 5);
    const levelR = Math.min(1, (levels.B || 0) * 5);
    const masterLevel = Math.min(1, (levels.master || 0) * 5);

    // Blend: each bar is a mix of its channel + master
    const barL = Math.max(levelL, masterLevel) * 0.9 + masterLevel * 0.1;
    const barR = Math.max(levelR, masterLevel) * 0.9 + masterLevel * 0.1;

    const barW = Math.floor(w / 2) - 2;

    // Draw L bar
    this._drawMeterBar(ctx, 1, h, barW, barL);
    // Draw R bar
    this._drawMeterBar(ctx, barW + 3, h, barW, barR);
  }

  _drawMeterBar(ctx, x, h, barW, level) {
    const barH = Math.round(level * h);
    if (barH <= 0) return;

    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#00cc44');
    grad.addColorStop(0.6, '#00cc44');
    grad.addColorStop(0.8, '#ffcc00');
    grad.addColorStop(1.0, '#ff2200');

    ctx.fillStyle = grad;
    ctx.fillRect(x, h - barH, barW, barH);
  }

  // ===== Utility Methods =====
  _on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  _toggleClass(id, cls, force) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(cls, force);
  }

  _setDisplay(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', show);
  }

  _setMeterHeight(id, level) {
    const el = document.getElementById(id);
    if (el) {
      const pct = Math.min(100, level * 500); // amplify for visibility
      el.style.height = pct + '%';
    }
  }

  _updateMIDIStatus(connected) {
    const dot = document.getElementById('midi-dot');
    const label = document.getElementById('midi-label');
    if (dot) dot.classList.toggle('connected', connected);
    if (label) label.textContent = connected ? 'MIDI Connected' : 'No MIDI';
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ===== 808 / Kaossilator Pad Synth UI =====
  _initPadSynthUI() {
    const panel = document.getElementById('pad-synth-panel');
    if (!panel) return;

    // 808 button in top bar
    const btn808 = document.getElementById('btn-808');
    if (btn808) {
      btn808.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Mode buttons
    const modeContainer = document.getElementById('mode-buttons');
    if (modeContainer) {
      this.padSynth.getModes().forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m.icon + ' ' + m.name;
        btn.style.cssText = 'background:#1a1a2e;color:#ccc;border:1px solid #444;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;';
        btn.addEventListener('click', () => {
          this.padSynth.setMode(m.id);
          this._renderPadGrid();
          this._renderSeqGrid();
          // Highlight active
          modeContainer.querySelectorAll('button').forEach(b => b.style.borderColor = '#444');
          btn.style.borderColor = '#ff6600';
          // Show/hide sequencer
          const seqGrid = document.getElementById('seq-grid');
          if (seqGrid) seqGrid.style.display = m.id === 'sequencer' ? 'block' : 'none';
        });
        if (m.id === '808') btn.style.borderColor = '#ff6600';
        modeContainer.appendChild(btn);
      });
    }

    // Render pad grid
    this._renderPadGrid();

    // Synth controls
    const scaleEl = document.getElementById('synth-scale');
    if (scaleEl) scaleEl.addEventListener('change', () => {
      this.padSynth.setScale(scaleEl.value);
      this._renderPadGrid();
    });
    const waveEl = document.getElementById('synth-wave');
    if (waveEl) waveEl.addEventListener('change', () => this.padSynth.setWaveform(waveEl.value));
    const rootEl = document.getElementById('synth-root');
    if (rootEl) rootEl.addEventListener('change', () => {
      this.padSynth.setRootNote(parseInt(rootEl.value));
      this._renderPadGrid();
    });
    const filterEl = document.getElementById('synth-filter');
    if (filterEl) filterEl.addEventListener('input', () => this.padSynth.setFilterFreq(parseFloat(filterEl.value)));

    // Sequencer controls
    const seqBpm = document.getElementById('seq-bpm');
    if (seqBpm) seqBpm.addEventListener('change', () => this.padSynth.setBPM(parseInt(seqBpm.value)));
    const seqPlay = document.getElementById('seq-play');
    if (seqPlay) seqPlay.addEventListener('click', () => {
      if (this.padSynth.sequencer.running) {
        this.padSynth.stopSequencer();
        seqPlay.textContent = '▶ SEQ';
        seqPlay.style.background = '#ff6600';
      } else {
        this.padSynth.setMode('sequencer');
        this.padSynth.startSequencer();
        seqPlay.textContent = '⏹ STOP';
        seqPlay.style.background = '#ff0044';
      }
    });

    // Sequencer step highlight callback
    this.padSynth.onSequencerStep = (step) => {
      document.querySelectorAll('.seq-step').forEach(el => el.style.opacity = '1');
      document.querySelectorAll(`.seq-step[data-step="${step}"]`).forEach(el => el.style.opacity = '0.5');
    };

    this._renderSeqGrid();
  }

  _renderPadGrid() {
    const grid = document.getElementById('pad-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const labels = this.padSynth.getPadLabels();
    const colors = ['#ff6600','#ff3366','#9933ff','#00ccff','#00ff88','#ffcc00','#ff0044','#66ffcc'];
    labels.forEach((label, i) => {
      const pad = document.createElement('button');
      pad.textContent = label;
      pad.style.cssText = `background:${colors[i]};color:#000;border:none;border-radius:8px;padding:20px 8px;font-size:13px;font-weight:700;cursor:pointer;transition:transform 0.05s,box-shadow 0.15s,filter 0.2s;text-shadow:0 1px 2px rgba(0,0,0,0.3);`;
      // Velocity-sensitive flash helper
      const flashPad = (velocity) => {
        const brightness = 1.2 + velocity * 1.8; // 1.2x to 3.0x based on velocity
        const glowSize = 10 + Math.round(velocity * 30); // 10px to 40px
        pad.style.transform = 'scale(0.92)';
        pad.style.filter = `brightness(${brightness})`;
        pad.style.boxShadow = `0 0 ${glowSize}px ${colors[i]}`;
      };
      const releasePad = () => {
        pad.style.transform = 'scale(1)';
        pad.style.filter = 'brightness(1)';
        pad.style.boxShadow = 'none';
      };
      pad.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const velocity = 0.9;
        this.padSynth.padOn(i, velocity);
        flashPad(velocity);
      });
      pad.addEventListener('mouseup', () => {
        this.padSynth.padOff(i);
        releasePad();
      });
      pad.addEventListener('mouseleave', () => {
        this.padSynth.padOff(i);
        releasePad();
      });
      // Touch support with velocity from touch force
      pad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const velocity = touch.force > 0 ? Math.min(1, touch.force * 1.5) : 0.9;
        this.padSynth.padOn(i, velocity);
        flashPad(velocity);
      });
      pad.addEventListener('touchend', () => {
        this.padSynth.padOff(i);
        releasePad();
      });
      grid.appendChild(pad);
    });
    // Keyboard mapping: Z X C V B N M , for pads 0-7
    if (!this._padKeysbound) {
      this._padKeysbound = true;
      const padKeys = ['z','x','c','v','b','n','m',','];
      document.addEventListener('keydown', (e) => {
        if (document.getElementById('pad-synth-panel').style.display === 'none') return;
        const idx = padKeys.indexOf(e.key.toLowerCase());
        if (idx >= 0 && !e.repeat) this.padSynth.padOn(idx, 0.9);
      });
      document.addEventListener('keyup', (e) => {
        const idx = padKeys.indexOf(e.key.toLowerCase());
        if (idx >= 0) this.padSynth.padOff(idx);
      });
    }
  }

  _renderSeqGrid() {
    const container = document.getElementById('seq-rows');
    if (!container) return;
    container.innerHTML = '';
    const labels = this.padSynth.kits[this.padSynth.currentKit]?.sounds.map(s => s.name) || Array(8).fill('---');
    const colors = ['#ff6600','#ff3366','#9933ff','#00ccff','#00ff88','#ffcc00','#ff0044','#66ffcc'];
    labels.forEach((label, row) => {
      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText = `color:${colors[row]};font-size:10px;padding:2px 4px;display:flex;align-items:center;`;
      container.appendChild(lbl);
      for (let step = 0; step < 16; step++) {
        const cell = document.createElement('div');
        cell.className = 'seq-step';
        cell.dataset.step = step;
        cell.dataset.row = row;
        const active = this.padSynth.sequencer.pattern[row][step];
        cell.style.cssText = `background:${active ? colors[row] : '#1a1a2e'};border:1px solid #333;border-radius:3px;padding:6px;cursor:pointer;transition:background 0.1s;`;
        if (step % 4 === 0) cell.style.borderLeft = '2px solid #666';
        cell.addEventListener('click', () => {
          const on = this.padSynth.toggleStep(row, step);
          cell.style.background = on ? colors[row] : '#1a1a2e';
          // Play sound for feedback
          if (on) {
            const kit = this.padSynth.kits[this.padSynth.currentKit];
            if (kit && kit.sounds[row]) kit.sounds[row].fn(0.6);
          }
        });
        container.appendChild(cell);
      }
    });
  }
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AuralityApp();

  const startScreen = document.getElementById('start-screen');
  const appEl = document.getElementById('app');
  const startBtn = document.getElementById('start-btn');
  const startStatus = document.getElementById('start-status');

  const doInit = async () => {
    if (startStatus) startStatus.textContent = 'Initializing audio engine...';
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = 'LOADING...';
    }
    try {
      await window.app.init();
      // Fade out start screen, reveal app
      if (startScreen) {
        startScreen.style.opacity = '0';
        startScreen.style.visibility = 'hidden';
      }
      if (appEl) appEl.style.opacity = '1';
    } catch (err) {
      console.error('[Aurality] Init failed:', err);
      if (startStatus) startStatus.textContent = 'Error: ' + err.message;
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'RETRY';
      }
    }
  };

  if (startBtn) {
    startBtn.addEventListener('click', doInit);
  }
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[SW] Registered:', reg.scope);
    }).catch(err => {
      console.log('[SW] Registration failed (OK for local dev):', err.message);
    });
  });
}

window.AuralityApp = AuralityApp;
