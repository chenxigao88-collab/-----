export const FIXED_STEP = 1 / 120;
export class GameLoop {
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  droppedTime = 0;
  fps = 60;
  frames = 0;
  frameSamples: number[] = [];
  constructor(private update: (dt: number) => void, private render: (dt: number) => void) {}
  start() {
    if (this.raf) return;
    this.last = performance.now(); this.raf = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    const real = Math.max(0, (now - this.last) / 1000); this.last = now;
    this.advance(real);
    this.render(Math.min(real, 0.1));
    this.raf = requestAnimationFrame(this.tick);
  };
  advance(real: number) {
    const accepted = Math.min(real, 0.1); this.droppedTime += Math.max(0, real - accepted);
    this.accumulator += accepted;
    let steps = 0;
    while (this.accumulator + 1e-10 >= FIXED_STEP && steps < 12) {
      this.update(FIXED_STEP); this.accumulator -= FIXED_STEP; steps++;
    }
    if (this.accumulator >= FIXED_STEP) { this.droppedTime += this.accumulator; this.accumulator = 0; }
    if (real > 0) this.fps += (1 / real - this.fps) * 0.06;
    this.frames++;
    this.frameSamples.push(real * 1000);
    if (this.frameSamples.length > 600) this.frameSamples.shift();
  }
  resetClock() { this.accumulator = 0; this.last = performance.now(); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
}
