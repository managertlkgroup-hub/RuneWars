// RUNE WARS — аудио-движок на Web Audio API (синтез, без файлов)

type SoundName =
  | "click"
  | "hover"
  | "matchRed"
  | "matchBlue"
  | "matchGreen"
  | "matchYellow"
  | "cascade"
  | "enemyHit"
  | "enemyAttack"
  | "heal"
  | "shield"
  | "rage"
  | "rageStrike"
  | "victory"
  | "defeat"
  | "levelUp";

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  private lastCascadeTime = 0;
  private cascadeStep = 0;

  ensureContext() {
    if (this.ctx) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.ensureContext();
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  // базовые примитивы
  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol = 0.3,
    when = 0,
    freqEnd?: number
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.25, when = 0, filterFreq = 1200) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + when;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  play(name: SoundName, opts?: { cascadeLevel?: number }) {
    this.ensureContext();
    if (!this.ctx) return;
    switch (name) {
      case "click":
        this.tone(1400, 0.04, "square", 0.15);
        break;
      case "hover":
        this.tone(900, 0.03, "sine", 0.06);
        break;
      case "matchRed":
        this.tone(220, 0.12, "sawtooth", 0.3, 0, 110);
        this.noise(0.08, 0.15, 0, 800);
        break;
      case "matchBlue":
        this.tone(880, 0.14, "sine", 0.25, 0, 1320);
        break;
      case "matchGreen":
        this.tone(660, 0.18, "sine", 0.22, 0, 880);
        this.tone(990, 0.16, "sine", 0.12, 0.05);
        break;
      case "matchYellow":
        this.tone(440, 0.18, "triangle", 0.25, 0, 880);
        break;
      case "cascade": {
        const level = opts?.cascadeLevel ?? 1;
        const base = 600 + level * 120;
        this.tone(base, 0.12, "square", 0.18, 0, base * 1.5);
        this.tone(base * 1.5, 0.1, "sine", 0.12, 0.04);
        break;
      }
      case "enemyHit":
        this.noise(0.12, 0.25, 0, 600);
        this.tone(160, 0.1, "sawtooth", 0.2, 0, 80);
        break;
      case "enemyAttack":
        this.tone(110, 0.18, "sawtooth", 0.32, 0, 60);
        this.noise(0.16, 0.2, 0.02, 500);
        break;
      case "heal":
        this.tone(660, 0.16, "sine", 0.22, 0, 990);
        this.tone(990, 0.14, "sine", 0.14, 0.06, 1320);
        break;
      case "shield":
        this.tone(520, 0.18, "triangle", 0.22, 0, 780);
        this.tone(780, 0.14, "sine", 0.12, 0.04);
        break;
      case "rage":
        this.tone(330, 0.2, "sawtooth", 0.25, 0, 660);
        break;
      case "rageStrike":
        this.tone(220, 0.08, "sawtooth", 0.3, 0, 880);
        this.tone(880, 0.18, "square", 0.25, 0.08, 220);
        this.noise(0.1, 0.2, 0.08, 1200);
        break;
      case "victory":
        // фанфары
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.22, "square", 0.22, i * 0.14)
        );
        this.tone(1047, 0.4, "sine", 0.18, 0.56);
        break;
      case "defeat":
        [440, 370, 294, 220].forEach((f, i) =>
          this.tone(f, 0.3, "sawtooth", 0.2, i * 0.18, f * 0.7)
        );
        break;
      case "levelUp":
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, 0.14, "square", 0.2, i * 0.08)
        );
        break;
    }
  }

  /** Пауза при потере фокуса вкладки. */
  suspendOnBlur() {
    if (this.ctx && this.ctx.state === "running") {
      void this.ctx.suspend();
    }
  }
  resumeOnFocus() {
    this.resume();
  }
}

// глобальный синглтон
let _audio: AudioEngine | null = null;
export function getAudio(): AudioEngine {
  if (!_audio) _audio = new AudioEngine();
  return _audio;
}
