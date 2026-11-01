import type { VoiceCommand } from '../types';

/**
 * Finite combat grammar shared by decoder bias and the intent interpreter.
 * Keep phrases explicit: this prevents ordinary conversation from becoming an attack.
 */
const groups = {
  'nombre o llamada breve': [
    'lanzallamas', 'lanzallama', 'llamas', 'fuego', 'lanza llamas', 'lanza flamas',
  ],
  'orden de activación': [
    'usa lanzallamas', 'usa el lanzallamas', 'usa el ataque lanzallamas',
    'ahora usa lanzallamas', 'ahora usa el lanzallamas', 'ahora usa el ataque lanzallamas',
    'activa lanzallamas', 'activa el lanzallamas', 'activa el ataque lanzallamas',
    'ahora activa lanzallamas', 'ahora activa el lanzallamas', 'ahora activa el ataque lanzallamas',
    'utiliza lanzallamas', 'utiliza el lanzallamas', 'utiliza el ataque lanzallamas',
    'ahora utiliza lanzallamas', 'ahora utiliza el lanzallamas', 'ahora utiliza el ataque lanzallamas',
    'lanza fuego', 'lanza las llamas', 'escupe fuego', 'escupe llamas', 'dispara llamas', 'fuego ahora',
  ],
  'orden de ataque': [
    'ataca con lanzallamas', 'ataca con el lanzallamas', 'ataca con llamas',
    'ataca ahora con llamas', 'ahora ataca con llamas', 'ahora ataca con lanzallamas',
    'ataca usando lanzallamas', 'atacar con lanzallamas', 'lánzale llamas',
    'quémalo con fuego', 'dale con lanzallamas', 'dale con llamas',
  ],
  'orden de contraataque': [
    'contraataca usando lanzallamas', 'contraataca con lanzallamas', 'contraataca con llamas',
    'contraataca con fuego', 'contraatacar con lanzallamas',
    'contrataca usando lanzallamas', 'contrataca con lanzallamas', 'contrataca con llamas', 'contrataca con fuego',
    'responde con fuego', 'responde con llamas', 'devuélvele el ataque con llamas',
    'repele su ataque con fuego',
  ],
  'urgencia o repetición enfática': [
    'llamas llamas', 'fuego fuego', 'lanzallamas lanzallamas', 'lanza llamas lanza llamas',
    'ataca ataca con llamas', 'contraataca contraataca con fuego', 'contrataca contrataca con fuego',
    'ahora ahora lanzallamas', 'dale llamas',
  ],
} as const;

const commands = Object.entries(groups).flatMap(([structure, phrases]) =>
  phrases.map((phrase): VoiceCommand => Object.freeze({ phrase, structure })),
);

export const FLAME_COMMANDS: readonly VoiceCommand[] = Object.freeze(commands);

