/**
 * Aurality Studio — Mixer
 * Crossfader, channel faders, EQ, filter sweep, headphone cue.
 */
class Mixer {
  constructor(engine) {
    this.engine = engine;
    this.channelStates = {
      A: { volume: 1.0, trim: 1.0, eqHi: 0, eqMid: 0, eqLo: 0, filterFreq: 20000, filterType: 'lowpass', cue: false },
      B: { volume: 1.0, trim: 1.0, eqHi: 0, eqMid: 0, eqLo: 0, filterFreq: 20000, filterType: 'lowpass', cue: false }
    };
    this.crossfaderValue = 0.5;
    this.crossfaderCurve = 'smooth';
    this.masterVolume = 1.0;
    this.headphoneMix = 0; // 0 = cue only, 1 = master only
    this.headphoneVolume = 1.0;
  }

  setVolume(channel, value) {
    value = Math.max(0, Math.min(1.5, value));
    this.channelStates[channel].volume = value;
    this._applyVolumes();
  }

  setTrim(channel, value) {
    value = Math.max(0, Math.min(2, value));
    this.channelStates[channel].trim = value;
    this.engine.setTrim(channel, value);
  }

  setEQ(channel, band, value) {
    // value: -26 (kill) to +6 dB
    value = Math.max(-26, Math.min(6, value));
    this.channelStates[channel][`eq${band.charAt(0).toUpperCase() + band.slice(1)}`] = value;
    this.engine.setEQ(channel, band, value);
  }

  setFilter(channel, value) {
    // value: 0 to 1 (center = no filter, left = lowpass, right = highpass)
    let freq, type;
    if (value < 0.48) {
      type = 'lowpass';
      freq = 20 + (value / 0.48) * 19980;
    } else if (value > 0.52) {
      type = 'highpass';
      freq = 20 + ((value - 0.52) / 0.48) * 19980;
    } else {
      type = 'lowpass';
      freq = 20000;
    }
    this.channelStates[channel].filterFreq = freq;
    this.channelStates[channel].filterType = type;
    this.engine.setFilter(channel, freq, type);
  }

  setCrossfader(value) {
    this.crossfaderValue = Math.max(0, Math.min(1, value));
    this._applyVolumes();
  }

  setCrossfaderCurve(curve) {
    this.crossfaderCurve = curve;
    this.engine.crossfaderCurve = curve;
  }

  toggleCue(channel) {
    this.channelStates[channel].cue = !this.channelStates[channel].cue;
    this.engine.setCue(channel, this.channelStates[channel].cue);
    return this.channelStates[channel].cue;
  }

  setMasterVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1.5, value));
    this.engine.setMasterVolume(this.masterVolume);
  }

  setHeadphoneMix(value) {
    this.headphoneMix = Math.max(0, Math.min(1, value));
  }

  setHeadphoneVolume(value) {
    this.headphoneVolume = Math.max(0, Math.min(1.5, value));
  }

  // Kill EQ band
  killEQ(channel, band) {
    const key = `eq${band.charAt(0).toUpperCase() + band.slice(1)}`;
    if (this.channelStates[channel][key] <= -25) {
      this.channelStates[channel][key] = 0;
    } else {
      this.channelStates[channel][key] = -26;
    }
    this.engine.setEQ(channel, band, this.channelStates[channel][key]);
  }

  _applyVolumes() {
    const cf = this.crossfaderValue;
    let gainA, gainB;

    switch (this.crossfaderCurve) {
      case 'sharp':
        gainA = cf < 0.05 ? 1 : cf > 0.95 ? 0 : cf < 0.5 ? 1 : 1 - ((cf - 0.5) / 0.45);
        gainB = cf > 0.95 ? 1 : cf < 0.05 ? 0 : cf > 0.5 ? 1 : 1 - ((0.5 - cf) / 0.45);
        break;
      case 'constant':
        gainA = Math.cos(cf * Math.PI / 2);
        gainB = Math.sin(cf * Math.PI / 2);
        break;
      default: // smooth
        gainA = Math.cos(cf * Math.PI / 2);
        gainB = Math.sin(cf * Math.PI / 2);
    }

    this.engine.setChannelVolume('A', this.channelStates.A.volume * gainA);
    this.engine.setChannelVolume('B', this.channelStates.B.volume * gainB);
  }

  getLevels() {
    return {
      A: this.engine.getChannelLevel('A'),
      B: this.engine.getChannelLevel('B'),
      master: this.engine.getMasterLevel()
    };
  }
}

window.AuralityMixer = Mixer;
