export const PRESETS = {
  light_hit: { stop: .018, shake: 1.2, duration: .07, flash: .055, particles: 4, color: '#83e8df', sound: 'hit' },
  heavy_hit: { stop: .045, shake: 3.2, duration: .13, flash: .075, particles: 8, color: '#e9bd7e', sound: 'heavy' },
  explosion: { stop: .055, shake: 4.5, duration: .18, flash: .09, particles: 10, color: '#e9bd7e', sound: 'explosion' },
  perfect_dodge: { stop: 0, shake: 0, duration: .5, flash: .12, particles: 6, color: '#9ef4ed', sound: 'dodge' },
  player_hurt: { stop: .04, shake: 3, duration: .14, flash: .10, particles: 5, color: '#ff907d', sound: 'hurt' }
} as const;
export type PresetId = keyof typeof PRESETS;
