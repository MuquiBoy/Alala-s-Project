import type { AbilityDefinition } from '../types';

export const CHARGE: AbilityDefinition = Object.freeze({
  id: 'charge', name: 'Embestida', description: 'Impacto pesado de 30 de daño y empuje físico',
  voiceNouns: ['embestida'],
  aliases: Object.freeze([
    'embestida', 'embiste', 'carga', 'dash', 'ahora embiste', 'lánzate',
    'adelante embiste', 'contrataca con embestida',
  ]),
  windup: 2, duration: 2.65, cooldown: 9, cooldownFrom: 'end', range: 0, damage: 30,
  distance: 10, speedMultiplier: 0.15, damageReduction: 0,
  assistCone: 15 * Math.PI / 180, assistCorrection: 10 * Math.PI / 180,
});
