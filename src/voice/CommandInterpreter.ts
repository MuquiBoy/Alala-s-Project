import { ABILITIES, type AbilityDefinition, type AbilityId } from '../config/abilities';
import { THERMAL_TANK } from '../config/creatures';
import type { Interpretation, PersonalAliases } from './types';

export const normalizeCommand = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const prohibited = new Set(['no', 'nunca', 'jamas', 'ni', 'sin', 'tampoco', 'evita', 'cancelar', 'cancela', 'quizas', 'quiza', 'deberia', 'podria', 'creo', 'como', 'cuando', 'donde', 'por', 'si', 'puedes', 'puedo', 'funciona']);

/** Collapses immediate shouted repetitions without changing the order of other words. */
const collapseRepetitions = (text: string): string => {
  const words = text.split(' ');
  let changed = true;
  while (changed) {
    changed = false;
    for (let size = Math.min(4, Math.floor(words.length / 2)); size >= 1 && !changed; size--) {
      for (let start = 0; start + size * 2 <= words.length; start++) {
        const repeated = words.slice(start, start + size).every((word, index) => word === words[start + size + index]);
        if (!repeated) continue;
        words.splice(start + size, size); changed = true; break;
      }
    }
  }
  return words.join(' ');
};
/** Shared by live combat and calibration so both score the same acceptance rule. */
export const validateConfidence = (parsed: Interpretation, confidence: number | null): Interpretation =>
  confidence !== null && confidence < 0.55 ? { accepted: false, reason: 'Confianza acústica insuficiente.', normalized: parsed.normalized } : parsed;

/** Whole command grammar. Never fuzzy-match arbitrary conversation or substrings. */
export class CommandInterpreter {
  private readonly aliases = new Map<string, Set<AbilityId>>();
  private readonly structures = new Map<string, string>();

  constructor(private readonly definitions: readonly AbilityDefinition[] = THERMAL_TANK.abilities.map(id => ABILITIES.find(ability => ability.id === id)!), personal: PersonalAliases = {}) {
    for (const definition of definitions) {
      const generated = (definition.voiceNouns ?? []).flatMap(noun =>
        ['usa', 'usar', 'utiliza', 'activa', 'ataca con', 'ataca usando', 'contraataca con', 'contrataca con', 'ahora usa', 'vamos usa', 'rápido usa'].map(verb => `${verb} ${noun}`));
      for (const text of [...definition.aliases, ...generated, ...(personal[definition.id] ?? [])]) {
      const normalized = normalizeCommand(text);
      const matches = this.aliases.get(normalized) ?? new Set<AbilityId>();
      matches.add(definition.id); this.aliases.set(normalized, matches);
      this.structures.set(normalized, definition.commands?.find(command => normalizeCommand(command.phrase) === normalized)?.structure ?? (personal[definition.id]?.includes(text) ? 'alias personal confirmado' : generated.includes(text) ? 'gramática combinable' : 'alias breve'));
      }
    }
  }

  interpret(text: string): Interpretation {
    let normalized = normalizeCommand(text);
    if (/[?¿]/.test(text)) return { accepted: false, reason: 'Pregunta: no expresa una orden inequívoca.', normalized };
    if (!normalized || normalized.length > 100) return { accepted: false, reason: 'Orden vacía o demasiado larga.', normalized };
    if (normalized.split(' ').some(word => prohibited.has(word))) return { accepted: false, reason: 'Negación, duda o conversación detectada.', normalized };
    let exact = this.aliases.get(normalized);
    if (!exact) {
      const collapsed = collapseRepetitions(normalized);
      if (collapsed !== normalized && collapsed.split(' ').length <= 8) {
        normalized = collapsed;
        exact = this.aliases.get(normalized);
      }
    }
    if (exact?.size === 1) return { accepted: true, abilityId: [...exact][0], normalized, matchedAlias: normalized, structure: this.structures.get(normalized)! };
    if (exact && exact.size > 1) return { accepted: false, reason: 'Alias ambiguo entre habilidades.', normalized };
    const matches = new Set<AbilityId>();
    const padded = ` ${normalized} `;
    for (const [alias, ids] of this.aliases) if (padded.includes(` ${alias} `)) ids.forEach(id => matches.add(id));
    return { accepted: false, reason: matches.size > 1 ? 'Varias habilidades en una misma orden; pronúncialas por separado.' : 'Frase fuera del vocabulario de órdenes.', normalized };
  }

  validateAlias(text: string, abilityId: AbilityId): string | null {
    const normalized = normalizeCommand(text);
    if (/[?¿]/.test(text) || normalized.length < 3 || normalized.length > 40 || normalized.split(' ').length > 5) return 'Usa una expresión breve de 1 a 5 palabras.';
    if (normalized.split(' ').some(word => prohibited.has(word))) return 'No se admiten preguntas, negaciones ni expresiones dudosas.';
    for (const [alias, ids] of this.aliases) {
      if ((` ${normalized} `.includes(` ${alias} `) || normalized === alias) && [...ids].some(id => id !== abilityId)) return 'La expresión coincide con otra habilidad.';
    }
    if (!this.definitions.some(definition => definition.id === abilityId)) return 'Habilidad desconocida.';
    return null;
  }

  get phrases(): string[] {
    const byAbility = this.definitions.map(definition => [...this.aliases].filter(([, ids]) => ids.has(definition.id)).map(([phrase]) => phrase));
    const interleaved: string[] = [];
    for (let index = 0; byAbility.some(group => index < group.length); index++) for (const group of byAbility) if (group[index]) interleaved.push(group[index]);
    return [...new Set(interleaved)];
  }
}
