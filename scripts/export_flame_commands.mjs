import { writeFile } from 'node:fs/promises';
import { FLAME_COMMANDS } from '../src/attacks/flamethrower/commands.ts';

// Node >=22.12 with --experimental-strip-types; no second handwritten vocabulary.
const base = [...new Set(FLAME_COMMANDS.map(command => command.phrase))];
const groups = Map.groupBy(FLAME_COMMANDS, command => command.structure);
const list = commands => commands.map(command => '• ' + command.phrase);
const content = [
  "ALALA'S CHILDREN — VOICEATTACK: LANZALLAMAS",
  'Biblioteca integrada de órdenes de entrenador.',
  '',
  'ESTADO',
  'Las frases enumeradas están integradas en el vocabulario real de la demo.',
  'El sistema tolera mayúsculas, tildes, puntuación, espacios y repeticiones inmediatas.',
  'Gritar o hablar con otra entonación no modifica la potencia ni la duración del ataque.',
  'La precisión con cada voz, micrófono y ambiente debe comprobarse jugando.',
  '',
  'REGLAS DE COMBATE',
  'Di una orden breve y completa. Las preguntas, negaciones, descripciones y frases ambiguas se rechazan.',
  'Las repeticiones enfáticas dentro de una misma intervención cuentan como una sola orden.',
  'Una nueva intervención puede dar otra orden; el ejecutor sigue respetando el estado y la recarga.',
  'No se generan fórmulas de cortesía: se priorizan órdenes tácticas propias de un combate PvP.',
  '',
  ...[...groups].flatMap(([name, commands]) => [name.toUpperCase(), ...list(commands), '']),
  'RECONOCIMIENTO DE ENTONACIÓN Y FUROR PvP',
  'El motor de voz convierte audio en texto y el intérprete evalúa la frase normalizada.',
  'El volumen, la velocidad o el tono no son órdenes distintas. El ajuste automático de entrada ayuda con voces fuertes.',
  'Formas como «llamas, llamas» y «lanza llamas, lanza llamas» están incluidas para el habla urgente.',
  'Si el reconocedor divide una repetición del mismo turno de voz, la canalización conserva una sola solicitud.',
  '',
  'TOTAL: ' + base.length + ' expresiones integradas.',
  'Fuente única: src/attacks/flamethrower/commands.ts',
  'Generar de nuevo: pnpm commands:export',
  '',
].join('\r\n');
await writeFile(new URL('../COMANDOS-LANZALLAMAS.txt', import.meta.url), '\uFEFF' + content, 'utf8');
console.log('TXT de Lanzallamas: ' + base.length + ' órdenes integradas, sin variantes de cortesía.');
