import type { AttackRegistration } from './types';
import { FLAMETHROWER } from './flamethrower/definition';
import { createFlamethrower } from './flamethrower/behavior';
import { ARMOR_GUARD } from './armor_guard/definition';
import { createArmorGuard } from './armor_guard/behavior';
import { CHARGE_DASH } from './charge_dash/definition';
import { createChargeDash } from './charge_dash/behavior';
import { THERMAL_PULSE } from './thermal_pulse/definition';
import { createThermalPulse } from './thermal_pulse/behavior';
import { BARRAGE } from './barrage/definition';
import { createBarrage } from './barrage/behavior';
import { ARMOR } from './armor/definition';
import { createArmor } from './armor/behavior';
import { CHARGE } from './charge/definition';
import { createCharge } from './charge/behavior';
/** One implementation per attack; each factory allocates independent actor state. */
export const ATTACK_REGISTRY = Object.freeze({
  flamethrower: { definition: FLAMETHROWER, create: createFlamethrower },
  barrage: { definition: BARRAGE, create: createBarrage },
  armor: { definition: ARMOR, create: createArmor },
  charge: { definition: CHARGE, create: createCharge },
  armor_guard: { definition: ARMOR_GUARD, create: createArmorGuard },
  charge_dash: { definition: CHARGE_DASH, create: createChargeDash },
  thermal_pulse: { definition: THERMAL_PULSE, create: createThermalPulse },
} satisfies Record<string, AttackRegistration>);
export const ABILITIES = Object.freeze(Object.values(ATTACK_REGISTRY).map(entry => entry.definition));

