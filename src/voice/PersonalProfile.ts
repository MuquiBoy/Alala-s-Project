import { ABILITIES, type AbilityDefinition, type AbilityId } from '../config/abilities';
import { CommandInterpreter, normalizeCommand } from './CommandInterpreter';
import type { PersonalAliases } from './types';

const key = 'alalas.voice-aliases.v1';
export class PersonalProfile {
  readonly aliases: PersonalAliases = {};
  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, private readonly definitions: readonly AbilityDefinition[] = ABILITIES) {
    try {
      const raw: unknown = JSON.parse(storage?.getItem(key) ?? '{}');
      if (typeof raw !== 'object' || raw === null) return;
      for (const ability of definitions) {
        const values: unknown = (raw as Record<string, unknown>)[ability.id];
        if (!Array.isArray(values)) continue;
        for (const text of values.slice(0, 8)) if (typeof text === 'string') this.add(ability.id, text, false);
      }
    } catch { /* Corrupt/blocked storage must never stop the game. */ }
  }

  add(id: AbilityId, text: string, save = true): string | null {
    const interpreter = new CommandInterpreter(this.definitions, this.aliases);
    const error = interpreter.validateAlias(text, id); if (error) return error;
    const existing = this.aliases[id] ?? [];
    const normalized = normalizeCommand(text);
    if (existing.includes(normalized)) return null;
    if (existing.length >= 8) return 'Máximo de ocho alias personales por habilidad.';
    this.aliases[id] = [...existing, normalized];
    if (save) try { this.storage?.setItem(key, JSON.stringify(this.aliases)); } catch { return 'Alias activo en esta sesión; el navegador no permitió guardarlo.'; }
    return null;
  }

  clear(): void { for (const ability of this.definitions) delete this.aliases[ability.id]; try { this.storage?.removeItem(key); } catch { /* Session remains usable. */ } }
}
