/**
 * Aurality Studio — AI Mix Assistant
 * Harmonic mixing (Camelot wheel), transition suggestions, smart playlist generation.
 */
class AIAssistant {
  constructor() {
    // Camelot wheel compatibility
    this.camelotWheel = {
      '1A': ['1A', '1B', '12A', '2A'],
      '2A': ['2A', '2B', '1A', '3A'],
      '3A': ['3A', '3B', '2A', '4A'],
      '4A': ['4A', '4B', '3A', '5A'],
      '5A': ['5A', '5B', '4A', '6A'],
      '6A': ['6A', '6B', '5A', '7A'],
      '7A': ['7A', '7B', '6A', '8A'],
      '8A': ['8A', '8B', '7A', '9A'],
      '9A': ['9A', '9B', '8A', '10A'],
      '10A': ['10A', '10B', '9A', '11A'],
      '11A': ['11A', '11B', '10A', '12A'],
      '12A': ['12A', '12B', '11A', '1A'],
      '1B': ['1B', '1A', '12B', '2B'],
      '2B': ['2B', '2A', '1B', '3B'],
      '3B': ['3B', '3A', '2B', '4B'],
      '4B': ['4B', '4A', '3B', '5B'],
      '5B': ['5B', '5A', '4B', '6B'],
      '6B': ['6B', '6A', '5B', '7B'],
      '7B': ['7B', '7A', '6B', '8B'],
      '8B': ['8B', '8A', '7B', '9B'],
      '9B': ['9B', '9A', '8B', '10B'],
      '10B': ['10B', '10A', '9B', '11B'],
      '11B': ['11B', '11A', '10B', '12B'],
      '12B': ['12B', '12A', '11B', '1B']
    };

    // Energy estimation based on BPM ranges
    this.energyRanges = [
      { min: 60, max: 90, energy: 1, label: 'Chill' },
      { min: 90, max: 110, energy: 2, label: 'Laid Back' },
      { min: 110, max: 120, energy: 3, label: 'Groovy' },
      { min: 120, max: 128, energy: 4, label: 'Driving' },
      { min: 128, max: 135, energy: 5, label: 'High Energy' },
      { min: 135, max: 145, energy: 6, label: 'Peak' },
      { min: 145, max: 160, energy: 7, label: 'Intense' },
      { min: 160, max: 200, energy: 8, label: 'Maximum' }
    ];
  }

  // Suggest next track based on current track
  suggestNextTrack(currentTrack, library, count = 5) {
    if (!currentTrack || !library.length) return [];

    const scores = library
      .filter(t => t.id !== currentTrack.id)
      .map(track => {
        let score = 0;

        // Key compatibility (Camelot wheel)
        const compatible = this.camelotWheel[currentTrack.key] || [];
        if (compatible.includes(track.key)) {
          score += 40; // Strong key match
        } else if (track.key === currentTrack.key) {
          score += 50; // Same key = perfect
        }

        // BPM compatibility (+/- 5%)
        if (currentTrack.bpm && track.bpm) {
          const bpmDiff = Math.abs(track.bpm - currentTrack.bpm);
          const bpmPercent = bpmDiff / currentTrack.bpm;
          if (bpmPercent < 0.02) score += 30; // within 2%
          else if (bpmPercent < 0.05) score += 20; // within 5%
          else if (bpmPercent < 0.10) score += 10; // within 10%
          // Half/double time compatibility
          const halfDouble = Math.abs(track.bpm - currentTrack.bpm * 2);
          const halfDoublePct = halfDouble / (currentTrack.bpm * 2);
          if (halfDoublePct < 0.05) score += 15;
        }

        // Energy flow (prefer gradual increase)
        const currentEnergy = this._estimateEnergy(currentTrack.bpm);
        const trackEnergy = this._estimateEnergy(track.bpm);
        const energyDiff = trackEnergy - currentEnergy;
        if (energyDiff >= 0 && energyDiff <= 1) score += 15; // Gradual build
        else if (energyDiff === 0) score += 10; // Maintain
        else if (energyDiff === -1) score += 5; // Slight drop OK

        // Genre match (if available)
        if (currentTrack.genre && track.genre && currentTrack.genre === track.genre) {
          score += 10;
        }

        // Avoid recently played
        if (track.lastPlayed) {
          const hoursSincePlayed = (Date.now() - track.lastPlayed) / (1000 * 60 * 60);
          if (hoursSincePlayed < 1) score -= 20;
        }

        return { track, score, reasons: this._getReasons(currentTrack, track, score) };
      })
      .sort((a, b) => b.score - a.score);

    return scores.slice(0, count);
  }

  // Suggest transition type
  suggestTransition(trackA, trackB) {
    if (!trackA || !trackB) return { type: 'blend', confidence: 0.5, description: 'Standard crossfade' };

    const bpmDiffPct = trackA.bpm && trackB.bpm ?
      Math.abs(trackA.bpm - trackB.bpm) / trackA.bpm : 0;

    const keyCompatible = this._keysCompatible(trackA.key, trackB.key);
    const energyA = this._estimateEnergy(trackA.bpm);
    const energyB = this._estimateEnergy(trackB.bpm);
    const energyDiff = energyB - energyA;

    let suggestions = [];

    // Long blend: good for compatible keys and similar BPM
    if (keyCompatible && bpmDiffPct < 0.03) {
      suggestions.push({
        type: 'blend',
        confidence: 0.9,
        description: 'Long harmonic blend (16-32 bars). Keys are compatible and tempos match perfectly.',
        duration: '32 bars',
        technique: 'Gradually swap bass EQs while crossfading. Bring in B\'s highs first, then swap the lows.'
      });
    }

    // Echo out: good for energy drops
    if (energyDiff < -1) {
      suggestions.push({
        type: 'echo-out',
        confidence: 0.85,
        description: 'Echo out with filter sweep. Good for dropping energy.',
        duration: '8 bars',
        technique: 'Activate echo effect on A, slowly close low-pass filter, fade in B clean.'
      });
    }

    // Cut: good for drops or same key
    if (trackA.key === trackB.key && bpmDiffPct < 0.01) {
      suggestions.push({
        type: 'cut',
        confidence: 0.8,
        description: 'Hard cut on the 1. Same key and tempo - a clean cut will be powerful.',
        duration: 'instant',
        technique: 'Cue B to its first beat. Cut the crossfader on A\'s downbeat.'
      });
    }

    // Filter swap: works for most transitions
    if (bpmDiffPct < 0.05) {
      suggestions.push({
        type: 'filter-sweep',
        confidence: 0.75,
        description: 'Filter sweep transition. Close filter on A while opening on B.',
        duration: '16 bars',
        technique: 'High-pass A while low-passing B, then swap. Meet in the middle.'
      });
    }

    // BPM ride: if tempos don't match
    if (bpmDiffPct >= 0.03 && bpmDiffPct < 0.10) {
      suggestions.push({
        type: 'bpm-ride',
        confidence: 0.7,
        description: 'Tempo ride. Gradually sync BPM over 16 bars before blending.',
        duration: '16-32 bars',
        technique: 'Slowly adjust A\'s pitch to match B, then blend when locked.'
      });
    }

    // Default blend
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'blend',
        confidence: 0.5,
        description: 'Standard crossfade with EQ swap.',
        duration: '16 bars',
        technique: 'Classic EQ swap: kill B\'s bass, blend, swap bass, remove A.'
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Generate smart playlist
  generateSmartPlaylist(library, options = {}) {
    const {
      targetBPMMin = 120,
      targetBPMMax = 130,
      targetLength = 10, // tracks
      energyArc = 'build', // build, peak, journey, constant
      startKey = null
    } = options;

    // Filter by BPM range
    let pool = library.filter(t =>
      t.bpm >= targetBPMMin * 0.9 && t.bpm <= targetBPMMax * 1.1
    );

    if (pool.length === 0) pool = [...library];
    if (pool.length === 0) return [];

    const playlist = [];
    let currentKey = startKey;

    // Pick first track
    let firstTrack;
    if (currentKey) {
      firstTrack = pool.find(t => t.key === currentKey) || pool[0];
    } else {
      // Start with lower energy track for build arc
      if (energyArc === 'build' || energyArc === 'journey') {
        pool.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
        firstTrack = pool[0];
      } else {
        firstTrack = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    playlist.push(firstTrack);
    const used = new Set([firstTrack.id]);

    // Build playlist
    for (let i = 1; i < targetLength && pool.length > used.size; i++) {
      const current = playlist[playlist.length - 1];
      const targetEnergy = this._getTargetEnergy(i, targetLength, energyArc);
      const available = pool.filter(t => !used.has(t.id));

      // Score candidates
      const scored = available.map(t => {
        let score = 0;

        // Key compatibility
        const compat = this.camelotWheel[current.key] || [];
        if (compat.includes(t.key)) score += 30;
        else if (t.key === current.key) score += 35;

        // Energy match
        const trackEnergy = this._estimateEnergy(t.bpm);
        const energyDiff = Math.abs(trackEnergy - targetEnergy);
        score += Math.max(0, 20 - energyDiff * 5);

        // BPM proximity
        if (current.bpm && t.bpm) {
          const diff = Math.abs(t.bpm - current.bpm);
          score += Math.max(0, 15 - diff);
        }

        return { track: t, score };
      }).sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        // Pick from top 3 with some randomness
        const pick = scored[Math.floor(Math.random() * Math.min(3, scored.length))];
        playlist.push(pick.track);
        used.add(pick.track.id);
      }
    }

    return playlist;
  }

  _estimateEnergy(bpm) {
    if (!bpm) return 3;
    for (const range of this.energyRanges) {
      if (bpm >= range.min && bpm < range.max) return range.energy;
    }
    return 5;
  }

  _getEnergyLabel(bpm) {
    if (!bpm) return 'Unknown';
    for (const range of this.energyRanges) {
      if (bpm >= range.min && bpm < range.max) return range.label;
    }
    return 'Unknown';
  }

  _keysCompatible(keyA, keyB) {
    if (!keyA || !keyB) return false;
    const compat = this.camelotWheel[keyA] || [];
    return compat.includes(keyB);
  }

  _getTargetEnergy(position, total, arc) {
    const pct = position / total;
    switch (arc) {
      case 'build': return 2 + pct * 6;
      case 'peak': return pct < 0.5 ? 2 + pct * 10 : 7 - (pct - 0.5) * 6;
      case 'journey': return 3 + Math.sin(pct * Math.PI * 2) * 3;
      case 'constant': return 5;
      default: return 5;
    }
  }

  _getReasons(current, candidate, score) {
    const reasons = [];
    const compat = this.camelotWheel[current.key] || [];
    if (compat.includes(candidate.key) || candidate.key === current.key) {
      reasons.push(`Key: ${candidate.key} (compatible with ${current.key})`);
    }
    if (current.bpm && candidate.bpm) {
      const diff = Math.abs(candidate.bpm - current.bpm);
      if (diff < 3) reasons.push(`BPM: ${candidate.bpm.toFixed(1)} (close match)`);
    }
    reasons.push(`Energy: ${this._getEnergyLabel(candidate.bpm)}`);
    return reasons;
  }
}

window.AuralityAI = AIAssistant;
