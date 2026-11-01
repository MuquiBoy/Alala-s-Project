import type { AbilityDefinition } from '../types';

export const BARRAGE: AbilityDefinition = Object.freeze({
  id: 'barrage', name: 'Ráfaga', description: '50 proyectiles de alcance largo', exclusiveGroup: 'main-emission',
  voiceNouns: ['ráfaga'],
  aliases: Object.freeze([
    'ráfaga', 'dispara', 'dispárale', 'ahora dispara', 'ahora dispárale', 'vamos dispara', 'dispárale ahora',
    'dispara ráfaga', 'dispara con ráfaga', 'lánza una ráfaga', 'lanza una ráfaga', 'atácalo con ráfaga',
  ]),
  duration: 5, cooldown: 4, cooldownFrom: 'end', range: 18, damage: 3,
  projectileCount: 50, projectileInterval: 0.1, projectileSpeed: 30,
  assistCone: 15 * Math.PI / 180, assistCorrection: 12 * Math.PI / 180,
  damageReduction: 0, speedMultiplier: 1, distance: 0,
});
