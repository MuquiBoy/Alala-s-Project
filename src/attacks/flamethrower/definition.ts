import type { AbilityDefinition } from '../types';
import { FLAME_COMMANDS } from './commands';
export const FLAMETHROWER: AbilityDefinition = Object.freeze({
  id: 'flamethrower', name: 'Lanzallamas', description: 'Cono térmico y casillas calientes', exclusiveGroup: 'main-emission', commands: FLAME_COMMANDS,
  aliases: Object.freeze([...FLAME_COMMANDS.map(command => command.phrase), 'usar lanzallamas']),
  duration: 5, cooldown: 5, cooldownFrom: 'end', range: 10, damage: 24, damageReduction: 0, speedMultiplier: 1, distance: 0,
  heatDuration: 4, heatDamage: 4,
});

