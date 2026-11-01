import type { AbilityDefinition } from '../types';

export const ARMOR: AbilityDefinition = Object.freeze({
  id: 'armor', name: 'Blindaje', description: 'Protección contra proyectiles y fuego',
  voiceNouns: ['blindaje'],
  aliases: Object.freeze([
    'blindaje', 'protégete', 'protección', 'ahora protégete', 'protégete ahora',
    'activa la protección', 'defiéndete', 'vamos protégete', 'contrataca con blindaje',
  ]),
  duration: 5, cooldown: 15, cooldownFrom: 'end', range: 0, damage: 0,
  damageReduction: 0.75, speedMultiplier: 1, distance: 0,
});
