import { vec, normal, type Vec2 } from './types';
export interface InputFrame { move: Vec2; aim: Vec2; fire: boolean; skill: boolean; dash: boolean; swap: boolean; interact: boolean;ultimate:boolean }
export const emptyInput = (): InputFrame => ({ move: vec(), aim: vec(600, 340), fire: false, skill: false, dash: false, swap: false, interact: false,ultimate:false });
export class InputManager {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private mouse = vec(600, 340);
  private controller = new AbortController();
  constructor(private canvas: HTMLCanvasElement, private offset: () => Vec2, command: (key: string) => void, lostFocus: () => void, unlock: () => void) {
    const options = { signal: this.controller.signal };
    window.addEventListener('keydown', event => {
      if (event.code === 'Escape' || event.code === 'F2') { event.preventDefault(); if (!event.repeat) command(event.code); return; }
      if (event.target instanceof HTMLElement && (event.target.closest('input,select,textarea,[contenteditable=true]') || (event.target.closest('button') && ['Space','Enter'].includes(event.code)))) return;
      if (['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR'].includes(event.code)) event.preventDefault();
      if (!this.held.has(event.code) && !event.repeat) this.pressed.add(event.code);
      this.held.add(event.code); unlock();
    }, options);
    window.addEventListener('keyup', event => this.held.delete(event.code), options);
    canvas.addEventListener('pointermove', event => { this.mouse = vec(event.clientX, event.clientY); this.mouseKnown = true; }, options);
    canvas.addEventListener('pointerdown', event => {
      this.mouse = vec(event.clientX, event.clientY); this.mouseKnown = true;
      const key = `Mouse${event.button}`; this.held.add(key); this.pressed.add(key); unlock();
      event.preventDefault(); canvas.setPointerCapture(event.pointerId);
    }, options);
    window.addEventListener('pointerup', event => this.held.delete(`Mouse${event.button}`), options);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
    window.addEventListener('blur', () => { this.clear(); lostFocus(); }, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clear(); lostFocus(); } }, options);
  }
  private mouseKnown = false;
  take(): InputFrame {
    const rect = this.canvas.getBoundingClientRect();
    const shake = this.offset();
    const aim = this.mouseKnown ? vec((this.mouse.x - rect.left) / rect.width * 960 - shake.x, (this.mouse.y - rect.top) / rect.height * 540 - shake.y) : vec(600, 340);
    const frame = {
      move: normal(vec(Number(this.held.has('KeyD')) - Number(this.held.has('KeyA')), Number(this.held.has('KeyS')) - Number(this.held.has('KeyW')))),
      aim, fire: this.held.has('Mouse0'), skill: this.pressed.has('Mouse2'), dash: this.pressed.has('Space'), swap: this.pressed.has('KeyQ'), interact: this.pressed.has('KeyE'),ultimate:this.pressed.has('KeyR')
    };
    this.pressed.clear(); return frame;
  }
  clear() { this.held.clear(); this.pressed.clear(); }
  dispose() { this.controller.abort(); this.clear(); }
}
