import type { AbilityDefinition } from '../types';
export const ARMOR_GUARD: AbilityDefinition = Object.freeze({
  id: 'armor_guard', name: 'Coraza', aliases: Object.freeze(['coraza', 'protección', 'protégete', 'activa coraza', 'defiéndete']),
  duration: 2, cooldown: 8, cooldownFrom: 'start', range: 0, damage: 0, damageReduction: 0.65, speedMultiplier: 0.45, distance: 0,
});

