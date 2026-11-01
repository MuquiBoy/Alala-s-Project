import type { AbilityId } from '../config/abilities';
import type { Activation } from '../combat/AbilitySystem';
import { CommandInterpreter, validateConfidence } from './CommandInterpreter';
import type { Transcript, VoiceMode, VoiceRecord } from './types';

interface Candidate { transcript: Transcript; id: AbilityId; since: number; count: number; normalized: string }

/** Partial hypotheses are previews. Optional early commit requires a stable candidate AND a speech-end event. */
export class VoicePipeline {
  readonly records: VoiceRecord[] = [];
  accepted = 0;
  rejected = 0;
  mode: VoiceMode = 'precise';
  onPreview: (text: string, ability: AbilityId | null) => void = () => {};
  onRecord: (record: VoiceRecord) => void = () => {};
  private readonly processed = new Map<string, VoiceRecord>();
  private readonly utteranceAbilities = new Map<number, Set<AbilityId>>();
  private candidate: Candidate | null = null;

  constructor(public interpreter: CommandInterpreter, private readonly activate: (id: AbilityId, commandId: string) => Activation) {}

  receive(transcript: Transcript): void {
    const previous = this.processed.get(transcript.id);
    if (previous) {
      if (transcript.final && previous.finalReceivedAt === null) {
        previous.finalReceivedAt = transcript.finalReceivedAt;
        const final = this.interpreter.interpret(transcript.text);
        if (previous.source === 'speech-end' && (!final.accepted || final.abilityId !== previous.abilityId)) previous.reason += ' La hipótesis final cambió después de la activación temprana.';
        this.onRecord(previous);
      }
      return;
    }
    const interpretation = this.interpreter.interpret(transcript.text);
    this.onPreview(transcript.text, interpretation.accepted ? interpretation.abilityId : null);
    if (transcript.final) { this.commit(transcript, 'final'); if (this.candidate?.transcript.id === transcript.id) this.candidate = null; return; }
    if (!interpretation.accepted) { this.candidate = null; return; }
    const candidate = this.candidate;
    if (candidate && candidate.transcript.id === transcript.id && candidate.normalized === interpretation.normalized) {
      candidate.count++; candidate.transcript = transcript;
    } else this.candidate = { transcript, id: interpretation.abilityId, since: transcript.receivedAt, count: 1, normalized: interpretation.normalized };
  }

  speechEnd(at: number): void {
    const candidate = this.candidate; this.candidate = null;
    if (this.mode !== 'responsive' || !candidate || candidate.count < 2 || at - candidate.since < 160 || at - candidate.transcript.receivedAt > 1500) return;
    // Unknown confidence is not fabricated as high confidence. Prefer final results in that case.
    if (candidate.transcript.confidence === null || candidate.transcript.confidence < 0.8) return;
    this.commit(candidate.transcript, 'speech-end');
  }

  private commit(transcript: Transcript, source: VoiceRecord['source']): void {
    if (this.processed.has(transcript.id)) return;
    const interpretationStartedAt = performance.now();
    const parsed = this.interpreter.interpret(transcript.text);
    const interpretedAt = performance.now();
    const interpretation = validateConfidence(parsed, transcript.confidence);
    const utterance = transcript.speechStartedAt === null ? null : this.utteranceAbilities.get(transcript.speechStartedAt);
    const repeatedInUtterance = interpretation.accepted && utterance?.has(interpretation.abilityId) === true;
    const requestedAt = interpretation.accepted && !repeatedInUtterance ? performance.now() : null;
    const result = interpretation.accepted && !repeatedInUtterance ? this.activate(interpretation.abilityId, transcript.id) : null;
    if (interpretation.accepted && !repeatedInUtterance && transcript.speechStartedAt !== null) {
      const abilities = utterance ?? new Set<AbilityId>(); abilities.add(interpretation.abilityId);
      this.utteranceAbilities.set(transcript.speechStartedAt, abilities);
      if (this.utteranceAbilities.size > 40) this.utteranceAbilities.delete(this.utteranceAbilities.keys().next().value!);
    }
    const record: VoiceRecord = {
      id: transcript.id, text: transcript.text, abilityId: interpretation.accepted ? interpretation.abilityId : null,
      normalized: parsed.normalized, matchedAlias: parsed.accepted ? parsed.matchedAlias : null,
      structure: parsed.accepted ? parsed.structure : null, interpretationMs: interpretedAt - interpretationStartedAt,
      status: result?.accepted ? 'accepted' : 'rejected',
      reason: repeatedInUtterance ? 'Repetición enfática de la misma intervención; se conserva una sola orden.' : result?.reason ?? (interpretation.accepted ? 'No disponible.' : interpretation.reason), source,
      speechStartedAt: transcript.speechStartedAt, firstInterimAt: transcript.firstInterimAt, finalReceivedAt: transcript.finalReceivedAt,
      transcriptReceivedAt: transcript.receivedAt, interpretedAt, requestedAt, effectStartedAt: result?.startedAt ?? null,
    };
    if (record.status === 'accepted') this.accepted++; else if (!repeatedInUtterance) this.rejected++;
    this.records.push(record); this.processed.set(transcript.id, record);
    if (this.records.length > 300) { const removed = this.records.shift()!; this.processed.delete(removed.id); }
    this.onRecord(record);
  }

  clearPending(): void { this.candidate = null; this.utteranceAbilities.clear(); }
}
