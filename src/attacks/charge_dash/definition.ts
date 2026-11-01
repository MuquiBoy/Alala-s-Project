import type { AbilityDefinition } from '../types';
export const CHARGE_DASH: AbilityDefinition = Object.freeze({
  id: 'charge_dash', name: 'Embestida', aliases: Object.freeze(['embestida', 'embiste', 'dash', 'carga']),
  duration: 0.4, cooldown: 6, cooldownFrom: 'start', range: 0, damage: 0, damageReduction: 0, speedMultiplier: 1, distance: 3,
});

