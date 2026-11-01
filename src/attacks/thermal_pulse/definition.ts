import type { AbilityDefinition } from '../types';
export const THERMAL_PULSE: AbilityDefinition = Object.freeze({
  id: 'thermal_pulse', name: 'Pulso térmico', aliases: Object.freeze(['pulso', 'pulso térmico', 'expulsa calor', 'activa pulso']),
  duration: 0.55, cooldown: 7, cooldownFrom: 'start', range: 3, damage: 22, damageReduction: 0, speedMultiplier: 1, distance: 0.8,
});

