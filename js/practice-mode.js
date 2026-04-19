/**
 * Aurality Studio — Practice Mode
 * Analyzes beatmatching/transitions and gives scoring with improvement tips.
 */
class PracticeMode {
  constructor() {
    this.active = false;
    this.sessions = [];
    this.currentSession = null;
    this.transitionLog = [];
    this.beatmatchScores = [];
  }

  startSession() {
    this.active = true;
    this.currentSession = {
      id: Date.now(),
      started: Date.now(),
      transitions: [],
      scores: [],
      overallScore: 0,
      tips: []
    };
    console.log('[PracticeMode] Session started');
  }

  endSession() {
    if (!this.currentSession) return null;
    this.active = false;
    this.currentSession.ended = Date.now();
    this.currentSession.duration = (this.currentSession.ended - this.currentSession.started) / 1000;

    // Calculate overall score
    if (this.currentSession.scores.length > 0) {
      this.currentSession.overallScore = Math.round(
        this.currentSession.scores.reduce((s, v) => s + v, 0) / this.currentSession.scores.length
      );
    }

    // Generate tips
    this.currentSession.tips = this._generateTips(this.currentSession);

    this.sessions.push(this.currentSession);
    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }

  // Score a beatmatch attempt
  scoreBeatmatch(deckA, deckB) {
    if (!this.active || !this.currentSession) return null;

    const score = {
      timestamp: Date.now(),
      type: 'beatmatch',
      metrics: {}
    };

    // BPM accuracy (how close are the effective BPMs)
    const bpmA = deckA.bpm * deckA.getEffectiveRate();
    const bpmB = deckB.bpm * deckB.getEffectiveRate();
    const bpmDiff = Math.abs(bpmA - bpmB);
    const bpmScore = Math.max(0, 100 - bpmDiff * 20); // Lose 20 points per BPM off
    score.metrics.bpmAccuracy = Math.round(bpmScore);

    // Phase alignment (how close are the beat positions)
    const beatIntervalA = 60 / bpmA;
    const beatIntervalB = 60 / bpmB;
    const posA = deckA.getCurrentPosition() % beatIntervalA;
    const posB = deckB.getCurrentPosition() % beatIntervalB;
    const phaseDiff = Math.abs(posA - posB);
    const phaseScore = Math.max(0, 100 - (phaseDiff / beatIntervalA) * 200);
    score.metrics.phaseAlignment = Math.round(phaseScore);

    // Key compatibility
    const keyCompatible = this._checkKeyCompatibility(deckA.detectedKey, deckB.detectedKey);
    score.metrics.keyCompatibility = keyCompatible ? 100 : 50;

    // Overall transition score
    const totalScore = Math.round(
      score.metrics.bpmAccuracy * 0.4 +
      score.metrics.phaseAlignment * 0.4 +
      score.metrics.keyCompatibility * 0.2
    );

    score.totalScore = totalScore;
    score.grade = this._getGrade(totalScore);
    score.feedback = this._getFeedback(score.metrics);

    this.currentSession.transitions.push(score);
    this.currentSession.scores.push(totalScore);

    return score;
  }

  // Score an EQ transition
  scoreEQTransition(mixerStates, duration) {
    if (!this.active || !this.currentSession) return null;

    const score = {
      timestamp: Date.now(),
      type: 'eq-transition',
      duration,
      metrics: {}
    };

    // Check if bass was properly swapped (not doubled)
    const bassDoubled = mixerStates.A.eqLo > -10 && mixerStates.B.eqLo > -10;
    score.metrics.bassManagement = bassDoubled ? 40 : 90;

    // Duration scoring (16-32 bars is ideal at ~128 BPM = 7.5-15 seconds)
    if (duration >= 7 && duration <= 20) {
      score.metrics.timing = 90;
    } else if (duration >= 4 && duration <= 30) {
      score.metrics.timing = 70;
    } else {
      score.metrics.timing = 50;
    }

    score.totalScore = Math.round(
      score.metrics.bassManagement * 0.6 +
      score.metrics.timing * 0.4
    );

    score.grade = this._getGrade(score.totalScore);
    this.currentSession.transitions.push(score);
    this.currentSession.scores.push(score.totalScore);

    return score;
  }

  _checkKeyCompatibility(keyA, keyB) {
    if (!keyA || !keyB) return true; // Give benefit of doubt
    const camelotWheel = {
      '1A': ['1A', '1B', '12A', '2A'], '2A': ['2A', '2B', '1A', '3A'],
      '3A': ['3A', '3B', '2A', '4A'], '4A': ['4A', '4B', '3A', '5A'],
      '5A': ['5A', '5B', '4A', '6A'], '6A': ['6A', '6B', '5A', '7A'],
      '7A': ['7A', '7B', '6A', '8A'], '8A': ['8A', '8B', '7A', '9A'],
      '9A': ['9A', '9B', '8A', '10A'], '10A': ['10A', '10B', '9A', '11A'],
      '11A': ['11A', '11B', '10A', '12A'], '12A': ['12A', '12B', '11A', '1A'],
      '1B': ['1B', '1A', '12B', '2B'], '2B': ['2B', '2A', '1B', '3B'],
      '3B': ['3B', '3A', '2B', '4B'], '4B': ['4B', '4A', '3B', '5B'],
      '5B': ['5B', '5A', '4B', '6B'], '6B': ['6B', '6A', '5B', '7B'],
      '7B': ['7B', '7A', '6B', '8B'], '8B': ['8B', '8A', '7B', '9B'],
      '9B': ['9B', '9A', '8B', '10B'], '10B': ['10B', '10A', '9B', '11B'],
      '11B': ['11B', '11A', '10B', '12B'], '12B': ['12B', '12A', '11B', '1B']
    };
    return (camelotWheel[keyA] || []).includes(keyB);
  }

  _getGrade(score) {
    if (score >= 95) return 'S';
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  _getFeedback(metrics) {
    const feedback = [];

    if (metrics.bpmAccuracy < 80) {
      feedback.push('BPM mismatch detected. Use the pitch slider to align tempos before transitioning.');
    } else if (metrics.bpmAccuracy < 95) {
      feedback.push('BPMs are close but not locked. Fine-tune the pitch for a tighter match.');
    } else {
      feedback.push('Excellent BPM match!');
    }

    if (metrics.phaseAlignment < 60) {
      feedback.push('Beats are out of phase. Use the jog wheel to nudge the track into alignment.');
    } else if (metrics.phaseAlignment < 85) {
      feedback.push('Phase is close. A small jog adjustment will lock the beats together.');
    } else {
      feedback.push('Beats are perfectly aligned!');
    }

    if (metrics.keyCompatibility < 100) {
      feedback.push('Keys may clash. Check the Camelot wheel for harmonically compatible tracks.');
    }

    return feedback;
  }

  _generateTips(session) {
    const tips = [];
    const avgScore = session.overallScore;

    if (avgScore < 60) {
      tips.push('Focus on getting the BPM matched before attempting transitions.');
      tips.push('Use the SYNC button to auto-match BPM, then practice manual beatmatching.');
      tips.push('Listen to both tracks in your headphones before bringing the new track in.');
    } else if (avgScore < 80) {
      tips.push('Your beatmatching is solid. Work on smoother EQ transitions.');
      tips.push('Try cutting the bass on the incoming track, then swapping the bass at a phrase change.');
      tips.push('Practice longer blends — aim for 16-32 bar transitions.');
    } else {
      tips.push('Great skills! Try more advanced techniques like filter sweeps and echo-outs.');
      tips.push('Experiment with harmonic mixing — stay within compatible keys on the Camelot wheel.');
      tips.push('Work on reading the crowd — practice selecting tracks that build energy gradually.');
    }

    return tips;
  }

  getSessionHistory() {
    return this.sessions.map(s => ({
      id: s.id,
      date: new Date(s.started).toLocaleString(),
      duration: s.duration,
      transitions: s.transitions.length,
      overallScore: s.overallScore,
      grade: this._getGrade(s.overallScore)
    }));
  }
}

window.AuralityPracticeMode = PracticeMode;
