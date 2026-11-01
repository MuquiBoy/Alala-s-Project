/** Compatibility facade. Source of truth: src/attacks/<id>/. */
import { ATTACK_REGISTRY } from '../attacks/registry';
import type { AbilityDefinition, AbilityId } from '../attacks/types';
export { ABILITIES } from '../attacks/registry';
export { COMBAT } from '../attacks/shared/tuning';
export type { AbilityDefinition, AbilityId } from '../attacks/types';
export const abilityById = (id: AbilityId): AbilityDefinition => ATTACK_REGISTRY[id].definition;
