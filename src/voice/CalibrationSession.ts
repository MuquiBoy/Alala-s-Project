import type { AbilityId } from '../config/abilities';
import type { CommandInterpreter } from './CommandInterpreter';
import { validateConfidence } from './CommandInterpreter';
import type { Transcript } from './types';

export interface CalibrationTrial {
  expected: AbilityId | null;
  predicted: AbilityId | null;
  outcome: 'correct' | 'wrong' | 'ignored' | 'timeout' | 'correct-rejection';
  text: string;
  recognitionMs: number | null;
  confidence: number | null;
}

/** Scores labelled trials. Never invokes combat and never retains audio. */
export class CalibrationSession {
  readonly trials: CalibrationTrial[] = [];
  private pending: { expected: AbilityId | null; beganAt: number } | null = null;
  onTrial: (trial: CalibrationTrial) => void = () => {};
  get waiting(): boolean { return this.pending !== null; }
  begin(expected: AbilityId | null, at: number): void { this.pending = { expected, beganAt: at }; }
  cancel(): void { this.pending = null; }

  receive(transcript: Transcript, interpreter: CommandInterpreter): void {
    if (!transcript.final || !this.pending) return;
    const expected = this.pending.expected; this.pending = null;
    const result = validateConfidence(interpreter.interpret(transcript.text), transcript.confidence);
    const predicted = result.accepted ? result.abilityId : null;
    const outcome = expected === null ? (predicted === null ? 'correct-rejection' : 'wrong') : predicted === expected ? 'correct' : predicted === null ? 'ignored' : 'wrong';
    this.add({ expected, predicted, outcome, text: transcript.text, confidence: transcript.confidence, recognitionMs: transcript.speechStartedAt === null ? null : transcript.receivedAt - transcript.speechStartedAt });
  }

  expire(at: number): void {
    if (this.pending && at - this.pending.beganAt > 10000) {
      const expected = this.pending.expected; this.pending = null;
      this.add({ expected, predicted: null, outcome: 'timeout', text: '', confidence: null, recognitionMs: null });
    }
  }

  private add(trial: CalibrationTrial): void { this.trials.push(trial); if (this.trials.length > 100) this.trials.shift(); this.onTrial(trial); }

  summary(): { trials: number; positives: number; correct: number; wrong: number; ignored: number; negatives: number; falseActivations: number } {
    return { trials: this.trials.length, positives: this.trials.filter(t => t.expected !== null).length, correct: this.trials.filter(t => t.outcome === 'correct').length, wrong: this.trials.filter(t => t.outcome === 'wrong').length, ignored: this.trials.filter(t => ['ignored', 'timeout'].includes(t.outcome)).length, negatives: this.trials.filter(t => t.expected === null).length, falseActivations: this.trials.filter(t => t.expected === null && t.predicted !== null).length };
  }
}
