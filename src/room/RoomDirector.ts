import { WAVES, SPAWN_POINTS } from '../data/waves';
import { distance, type Vec2, type EnemyKind } from '../core/types';
export interface PendingSpawn { kind: EnemyKind; pos: Vec2; remaining: number; encounter: number; elite:boolean }
export class RoomDirector {
  state: 'ready' | 'spawning' | 'fighting' | 'intermission' | 'victory' = 'ready';
  wave = 0; aliveIds = new Set<number>(); pending: PendingSpawn[] = []; elapsed = 0;
  spawnedWaves: number[] = [];
  private waves:readonly (readonly EnemyKind[])[]=WAVES;
  private eliteWave=3;private eliteIndex=2;
  get totalWaves(){return this.waves.length;}
  configure(waves:EnemyKind[][],elite=false){this.clear();this.waves=waves;this.eliteWave=elite?waves.length:0;this.eliteIndex=0;}
  constructor(private spawn: (kind: EnemyKind, pos: Vec2, encounter: number,elite:boolean) => number, private playerPosition: () => Vec2) {}
  start() { if (this.state !== 'ready') return false; this.nextWave(); return true; }
  private nextWave() {
    this.wave++; this.spawnedWaves.push(this.wave); this.state = 'spawning'; this.elapsed = 0;
    const player = this.playerPosition();
    const points = [...SPAWN_POINTS].sort((a, b) => distance(b, player) - distance(a, player));
    this.pending = (this.waves[this.wave - 1]??[]).map((kind, index) => ({ kind, pos: { ...points[index%points.length] }, remaining: .6 + index * .18, encounter: this.wave,elite:this.wave===this.eliteWave&&index===this.eliteIndex }));
  }
  onDeath(id: number, encounter: number) { if (encounter === this.wave) this.aliveIds.delete(id); }
  step(dt: number) {
    if (dt <= 0) return;
    if (this.state === 'spawning') {
      for (const pending of this.pending) {
        pending.remaining -= dt;
        if (pending.remaining <= 0) this.aliveIds.add(this.spawn(pending.kind, pending.pos, pending.encounter,pending.elite));
      }
      this.pending = this.pending.filter(p => p.remaining > 0);
      if (!this.pending.length) this.state = 'fighting';
    } else if (this.state === 'fighting' && this.aliveIds.size === 0) {
      if (this.wave >= this.waves.length) this.state = 'victory';
      else { this.state = 'intermission'; this.elapsed = 0; }
    } else if (this.state === 'intermission') { this.elapsed += dt; if (this.elapsed >= 1) this.nextWave(); }
  }
  clear() { this.pending = []; this.aliveIds.clear(); this.state = 'ready'; this.wave = 0; this.elapsed = 0; }
}
