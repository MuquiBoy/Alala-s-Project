import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABILITIES, type AbilityId } from '../src/config/abilities';
import { CommandInterpreter } from '../src/voice/CommandInterpreter';
import { VoicePipeline } from '../src/voice/VoicePipeline';
import { WebSpeechRecognizer, type NativeRecognition } from '../src/voice/WebSpeechRecognizer';
import { PersonalProfile } from '../src/voice/PersonalProfile';
import { CalibrationSession } from '../src/voice/CalibrationSession';
import { AbilitySystem } from '../src/combat/AbilitySystem';
import type { Transcript } from '../src/voice/types';
const legacy = ABILITIES.filter(ability => ['flamethrower', 'armor_guard', 'charge_dash', 'thermal_pulse'].includes(ability.id));

const transcript = (id: string, text: string, final = true, at = 100): Transcript => ({ id, text, final, receivedAt: at, speechStartedAt: null, firstInterimAt: final ? null : at, finalReceivedAt: final ? at : null, confidence: 0.95 });
const positive: [string, AbilityId][] = [
  ['Lanzallamas', 'flamethrower'], ['Usa lanzallamas', 'flamethrower'], ['Ataca con llamas', 'flamethrower'], ['Llamas', 'flamethrower'], ['  LANZA   LLAMAS!! ', 'flamethrower'], ['lanza flamas', 'flamethrower'], ['lanzallama', 'flamethrower'],
  ['Coraza', 'armor_guard'], ['PROTECCIÓN', 'armor_guard'], ['Protégete', 'armor_guard'], ['Activa coraza', 'armor_guard'], ['Defiéndete', 'armor_guard'],
  ['Embestida', 'charge_dash'], ['Embiste', 'charge_dash'], ['DASH', 'charge_dash'], ['Carga', 'charge_dash'],
  ['Pulso', 'thermal_pulse'], ['Pulso térmico', 'thermal_pulse'], ['Expulsa calor', 'thermal_pulse'], ['Activa pulso', 'thermal_pulse'],
];
const negative = [
  'No uses lanzallamas', 'Creo que las llamas son bonitas', 'Quizás debería activar el escudo', '¿Cómo funciona la embestida?', 'como funciona la embestida', 'Coraza y pulso', 'Lanzallamas embestida',
  'No, coraza', 'Nunca embistas', 'Pulso no', 'Lanzallamas, pero no', 'Puedes usar coraza', 'Si uso lanzallamas', 'Sin protección', 'Por favor, pulso térmico', 'Coraza por favor', 'La carga del sistema está completa', 'Las llamas son muy grandes', 'El pulso es estable', 'Corazones', 'Recarga', 'Pulsonar', 'Dashboards', 'hola', '', ' '.repeat(10), 'x'.repeat(101), 'Protección?', 'Dime protección', 'lanzallamas son bonitas',
];

describe('gramática de intención verbal', () => {
  it('limita la voz actual al repertorio equipado y admite órdenes tácticas breves', () => {
    const interpreter = new CommandInterpreter();
    const commands: [string, AbilityId][] = [
      ['contraataca con llamas', 'flamethrower'], ['lanza llamas, lanza llamas', 'flamethrower'],
      ['ataca con ráfaga', 'barrage'], ['activa blindaje', 'armor'], ['ahora usa embestida', 'charge'],
    ];
    for (const [phrase, id] of commands) expect(interpreter.interpret(phrase)).toMatchObject({ accepted: true, abilityId: id });
    for (const phrase of ['coraza', 'pulso térmico', 'por favor activa blindaje', '¿usa ráfaga?', 'quiero usar embestida'])
      expect(interpreter.interpret(phrase).accepted).toBe(false);
  });
  it.each(positive)('acepta %s como %s en la biblioteca anterior', (text, id) => expect(new CommandInterpreter(legacy).interpret(text)).toMatchObject({ accepted: true, abilityId: id }));
  it.each(negative)('rechaza conversación, negación, ambigüedad o subcadena: %s', text => expect(new CommandInterpreter(legacy).interpret(text).accepted).toBe(false));
  it('rechaza un alias configurado para dos habilidades', () => {
    const definitions = ABILITIES.map(a => ({ ...a, aliases: [...a.aliases, 'orden compartida'] }));
    expect(new CommandInterpreter(definitions).interpret('orden compartida').accepted).toBe(false);
  });
  it('adapta una transcripción personal explícita sin coincidencias difusas', () => {
    const profile = new PersonalProfile(); expect(profile.add('armor_guard', 'corasa')).toBeNull();
    const interpreter = new CommandInterpreter(ABILITIES, profile.aliases);
    expect(interpreter.interpret('corasa')).toMatchObject({ accepted: true, abilityId: 'armor_guard' });
    expect(interpreter.interpret('carcasa').accepted).toBe(false);
    expect(profile.add('charge_dash', 'pulso')).not.toBeNull(); expect(profile.add('armor_guard', 'no uses coraza')).not.toBeNull();
  });
  it('tolera almacenamiento corrupto y descarta alias peligrosos al cargarlo', () => {
    const storage = { getItem: () => '{mal', setItem: vi.fn(), removeItem: vi.fn() };
    expect(new PersonalProfile(storage).aliases).toEqual({});
    storage.getItem = () => JSON.stringify({ armor_guard: ['no coraza', 'corasa'], charge_dash: ['pulso'] });
    expect(new PersonalProfile(storage).aliases).toEqual({ armor_guard: ['corasa'] });
  });
});

describe('parciales, identidad y latencia observable', () => {
  const setup = () => { const engine = new AbilitySystem(legacy.map(a => a.id)); engine.enabled = true; const activate = vi.fn((id: AbilityId, request: string) => engine.request(id, request)); return { engine, activate, pipeline: new VoicePipeline(new CommandInterpreter(legacy), activate) }; };
  it('no ejecuta parciales en modo preciso y procesa el definitivo una sola vez', () => {
    const { pipeline, activate } = setup(); pipeline.receive(transcript('1', 'llamas', false)); pipeline.receive(transcript('1', 'llamas', false, 200)); expect(activate).not.toHaveBeenCalled();
    pipeline.receive(transcript('1', 'llamas')); pipeline.receive(transcript('1', 'llamas')); expect(activate).toHaveBeenCalledTimes(1); expect(pipeline.accepted).toBe(1);
  });
  it('distingue una nueva orden repetida de la duplicación de un resultado', () => {
    const { pipeline, engine } = setup(); pipeline.receive(transcript('1', 'pulso')); pipeline.receive(transcript('2', 'pulso')); expect(pipeline.accepted).toBe(1); expect(pipeline.rejected).toBe(1);
    engine.advance(8); pipeline.receive(transcript('3', 'pulso')); expect(pipeline.accepted).toBe(2);
  });
  it('trata resultados repetidos de la misma intervención como una sola orden', () => {
    const { pipeline, activate } = setup();
    pipeline.receive({ ...transcript('voz-1', 'llamas'), speechStartedAt: 50 });
    pipeline.receive({ ...transcript('voz-2', 'llamas'), speechStartedAt: 50 });
    expect(activate).toHaveBeenCalledTimes(1); expect(pipeline.accepted).toBe(1); expect(pipeline.rejected).toBe(0);
    expect(pipeline.records[1].reason).toContain('misma intervención');
  });
  it('acepta comandos consecutivos distintos sin esperar al efecto anterior', () => {
    const { pipeline } = setup(); ['lanzallamas', 'coraza', 'embiste', 'pulso'].forEach((text, index) => pipeline.receive(transcript(String(index), text))); expect(pipeline.accepted).toBe(4);
  });
  it('usa parcial estable sólo al observar el final de habla y deduplica el resultado final', () => {
    const { pipeline, activate } = setup(); pipeline.mode = 'responsive'; pipeline.receive(transcript('a', 'coraza', false, 100)); pipeline.receive(transcript('a', 'coraza', false, 280)); expect(activate).not.toHaveBeenCalled();
    pipeline.speechEnd(300); pipeline.receive(transcript('a', 'coraza', true, 400)); expect(activate).toHaveBeenCalledTimes(1); expect(pipeline.records[0].finalReceivedAt).toBe(400);
  });
  it('retira una hipótesis si la frase parcial pasa a negativa', () => {
    const { pipeline, activate } = setup(); pipeline.mode = 'responsive'; pipeline.receive(transcript('a', 'llamas', false, 100)); pipeline.receive(transcript('a', 'no uses llamas', false, 300)); pipeline.speechEnd(500); pipeline.receive(transcript('a', 'no uses llamas')); expect(activate).not.toHaveBeenCalled();
  });
  it('no presupone confianza ni inicio de habla cuando faltan datos', () => {
    const { pipeline, activate } = setup(); pipeline.mode = 'responsive';
    pipeline.receive({ ...transcript('a', 'coraza', false, 100), confidence: null }); pipeline.receive({ ...transcript('a', 'coraza', false, 300), confidence: null }); pipeline.speechEnd(500); expect(activate).not.toHaveBeenCalled();
    pipeline.receive({ ...transcript('a', 'coraza'), confidence: null }); expect(pipeline.records[0].speechStartedAt).toBeNull();
  });
  it('rechaza una orden reconocida con confianza acústica baja', () => { const { pipeline, activate } = setup(); pipeline.receive({ ...transcript('a', 'pulso'), confidence: 0.3 }); expect(activate).not.toHaveBeenCalled(); expect(pipeline.records[0].reason).toContain('Confianza'); });
  it('señala una corrección tardía del modo experimental sin volver a ejecutar', () => {
    const { pipeline, activate } = setup(); pipeline.mode = 'responsive'; pipeline.receive(transcript('a', 'coraza', false, 100)); pipeline.receive(transcript('a', 'coraza', false, 300)); pipeline.speechEnd(400); pipeline.receive(transcript('a', 'no coraza', true, 500)); expect(activate).toHaveBeenCalledTimes(1); expect(pipeline.records[0].reason).toContain('cambió');
  });
});

class FakeRecognition implements NativeRecognition {
  static instances: FakeRecognition[] = [];
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onstart: NativeRecognition['onstart'] = null; onend: NativeRecognition['onend'] = null; onspeechstart: NativeRecognition['onspeechstart'] = null; onspeechend: NativeRecognition['onspeechend'] = null; onresult: NativeRecognition['onresult'] = null; onerror: NativeRecognition['onerror'] = null;
  constructor() { FakeRecognition.instances.push(this); }
  start(): void { this.onstart?.(); }
  abort(): void { this.onend?.(); }
}
afterEach(() => { vi.useRealTimers(); FakeRecognition.instances = []; });
describe('adaptador Web Speech sin micrófono humano', () => {
  const options = { language: 'es-PE' as const, localOnly: false, phrases: ['coraza'] };
  it('informa compatibilidad ausente y contexto inseguro', async () => {
    const speech = new WebSpeechRecognizer({}, true); const status = vi.fn(); speech.onStatus = status; await speech.start(options); expect(status).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'unsupported' }));
  });
  it('configura español, continuos y parciales, y descarta resultados de sesiones abortadas', async () => {
    const speech = new WebSpeechRecognizer({ SpeechRecognition: FakeRecognition }, true); const result = vi.fn(); speech.onTranscript = result;
    await speech.start(options); const native = FakeRecognition.instances[0]; expect(native.lang).toBe('es-PE'); expect(native.continuous && native.interimResults).toBe(true);
    const late = native.onresult!; speech.stop(); late({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: 'coraza', confidence: 0.95 } } } }); expect(result).not.toHaveBeenCalled();
  });
  it('se recupera de una interrupción y cancela la reconexión al detenerse', async () => {
    vi.useFakeTimers(); const speech = new WebSpeechRecognizer({ SpeechRecognition: FakeRecognition }, true); await speech.start(options); FakeRecognition.instances[0].onend?.(); await vi.advanceTimersByTimeAsync(300); expect(FakeRecognition.instances).toHaveLength(2); FakeRecognition.instances[1].onend?.(); speech.stop(); await vi.advanceTimersByTimeAsync(5000); expect(FakeRecognition.instances).toHaveLength(2);
  });
  it('no repite permisos denegados ni cambia a remoto al pedir sólo local', async () => {
    vi.useFakeTimers(); const speech = new WebSpeechRecognizer({ SpeechRecognition: FakeRecognition }, true); const status = vi.fn(); speech.onStatus = status;
    await speech.start(options); FakeRecognition.instances[0].onerror?.({ error: 'not-allowed' }); await vi.advanceTimersByTimeAsync(5000); expect(FakeRecognition.instances).toHaveLength(1); expect(status).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'error' }));
    await speech.start({ ...options, localOnly: true }); expect(FakeRecognition.instances).toHaveLength(1); expect(status).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'error' }));
  });
});

describe('ensayos etiquetados para la evaluación humana posterior', () => {
  it('calibración aplica el mismo rechazo de baja confianza que el combate', () => {
    const session = new CalibrationSession(), interpreter = new CommandInterpreter(legacy);
    session.begin(null, 0); session.receive({ ...transcript('low', 'usa lanzallamas'), confidence: 0.3 }, interpreter);
    expect(session.trials[0]).toMatchObject({ outcome: 'correct-rejection', predicted: null, confidence: 0.3 });
    session.begin('flamethrower', 0); session.receive({ ...transcript('high', 'usa lanzallamas'), confidence: 0.95 }, interpreter);
    expect(session.trials[1]).toMatchObject({ outcome: 'correct', predicted: 'flamethrower', confidence: 0.95 });
  });
  it('contabiliza aciertos, errores, rechazos negativos y ausencias sin ejecutar ataques', () => {
    const session = new CalibrationSession(), interpreter = new CommandInterpreter(legacy);
    session.begin('armor_guard', 0); session.receive(transcript('1', 'coraza'), interpreter);
    session.begin(null, 0); session.receive(transcript('2', 'no uses llamas'), interpreter);
    session.begin(null, 0); session.receive(transcript('3', 'pulso'), interpreter);
    session.begin('charge_dash', 0); session.expire(10001);
    expect(session.summary()).toMatchObject({ trials: 4, correct: 1, falseActivations: 1, ignored: 1, negatives: 2 });
  });
});
