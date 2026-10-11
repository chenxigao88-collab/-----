import { getWeapon, type WeaponData } from '../data/weapons';
import type { ResonanceType } from '../core/types';
import type { ResonanceEffect } from '../data/resonance';
import type { EventBus } from '../core/EventBus';
export interface WeaponSlot { data: WeaponData; cooldown: number; skillCooldown: number; typeOverride?: ResonanceType; pending?: ResonanceEffect }
export class WeaponController {
  static readonly manualSwitchDelay = 3;
  slots: WeaponSlot[] = [this.makeSlot('ash_needle'), this.makeSlot('gravel_bell')];
  active = 0; switchLock = 0; manualSwitchCooldown = 0;
  constructor(private events: EventBus) {}
  private makeSlot(id: string): WeaponSlot { return { data: getWeapon(id), cooldown: 0, skillCooldown: 0 }; }
  get current() { return this.slots[this.active]; }
  type(index: number): ResonanceType { const slot = this.slots[index]; return slot.typeOverride ?? slot.data.resonanceType; }
  step(dt: number) { this.switchLock = Math.max(0, this.switchLock - dt); this.manualSwitchCooldown = Math.max(0, this.manualSwitchCooldown - dt); for (const slot of this.slots) { slot.cooldown = Math.max(0, slot.cooldown - dt); slot.skillCooldown = Math.max(0, slot.skillCooldown - dt); } }
  trySwitch(blocked = false) {
    if (blocked || this.switchLock > 0 || this.manualSwitchCooldown > 1e-8) return false;
    const from = this.active; this.active = 1 - this.active; this.switchLock = .16;
    this.manualSwitchCooldown = WeaponController.manualSwitchDelay;
    this.slots[from].pending = undefined;
    this.events.emit('weaponSwitched', { from, to: this.active }); return true;
  }
  replace(index: number, id: string) { this.slots[index] = this.makeSlot(id); }
}
