export class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private active = new Set<OscillatorNode>();
  muted = false;
  async unlock() {
    try {
      if (!this.context) { this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = .35; this.master.connect(this.context.destination); }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio is optional; the game remains playable when autoplay is blocked. */ }
  }
  play(id: string) {
    if (!this.context || this.context.state !== 'running' || !this.master || this.muted || this.active.size >= 12) return;
    const table: Record<string, [number, number, number, OscillatorType]> = {
      shot: [540, 180, .055, 'square'], shotgun: [150, 40, .09, 'sawtooth'], slash: [380, 90, .1, 'triangle'],
      ice:[1400,500,.11,'sine'],fire:[210,45,.13,'sawtooth'],electric:[850,1200,.045,'sawtooth'],wind:[700,300,.07,'triangle'],bolt:[95,24,.16,'square'],ring:[900,420,.15,'sine'],
      hit: [300, 110, .045, 'triangle'], heavy: [120, 35, .09, 'sawtooth'], explosion: [90, 22, .15, 'sawtooth'],
      hurt: [130, 65, .15, 'square'], dodge: [600, 1300, .13, 'sine'], swap: [420, 700, .075, 'triangle'], victory: [440, 880, .3, 'sine']
    };
    const [from, to, duration, type] = table[id] ?? table.hit;
    const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
    oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.09, now + .004); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(this.master); this.active.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.active.delete(oscillator); };
    oscillator.start(); oscillator.stop(now + duration + .01);
  }
  clear() { for (const oscillator of this.active) { try { oscillator.stop(); } catch { /* Already ended. */ } } }
  get nodes() { return this.active.size; }
  dispose() { this.clear(); void this.context?.close(); }
}
