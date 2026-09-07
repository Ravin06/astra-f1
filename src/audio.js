export class AudioSystem {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.nextNote = 0;
    this.note = 0;
  }
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.3;
    this.master.connect(this.ctx.destination);
    this.engine = this.ctx.createOscillator();
    this.engine.type = "sawtooth";
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engine.connect(this.filter);
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engine.start();
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 2,
      this.ctx.sampleRate,
    );
    const a = buffer.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    this.noise = this.ctx.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = 1200;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.master);
    this.noise.start();
  }
  tone(freq, duration = 0.12, volume = 0.3, type = "sine") {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume * this.settings.effects, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  update(k, active, throttle = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const speed = Math.abs(k?.speed || 0),
      gear = Math.min(6, Math.floor(speed / 8) + 1),
      rpm = 1800 + (speed % 8) * 600 + throttle * 600;
    this.engine.frequency.setTargetAtTime(35 + rpm / 50, t, 0.06);
    this.filter.frequency.setTargetAtTime(
      180 + throttle * 550 + speed * 9,
      t,
      0.1,
    );
    this.engineGain.gain.setTargetAtTime(
      active ? this.settings.engine * (0.14 + throttle * 0.24) : 0,
      t,
      0.12,
    );
    this.noiseGain.gain.setTargetAtTime(
      active
        ? this.settings.effects * (speed / 500 + (k?.drifting ? 0.14 : 0))
        : 0,
      t,
      0.1,
    );
    if (this.settings.music > 0 && t > this.nextNote) {
      this.nextNote = t + (active ? 0.34 : 0.52);
      const scale = [110, 0, 164.81, 220, 0, 146.83, 164.81, 0];
      const f = scale[this.note++ % scale.length];
      if (f) {
        const o = this.ctx.createOscillator(),
          g = this.ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(this.settings.music * 0.17, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g);
        g.connect(this.master);
        o.start();
        o.stop(t + 0.4);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      }
    }
  }
}
