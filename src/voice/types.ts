import type { AbilityId } from '../config/abilities';

export type RecognitionState = 'off' | 'starting' | 'listening' | 'restarting' | 'error' | 'unsupported';
export type VoiceMode = 'precise' | 'responsive';
export interface Transcript {
  id: string;
  text: string;
  final: boolean;
  confidence: number | null;
  receivedAt: number;
  speechStartedAt: number | null;
  firstInterimAt: number | null;
  finalReceivedAt: number | null;
}
export interface RecognitionStatus { state: RecognitionState; message: string }
export interface SpeechPort {
  onTranscript: (transcript: Transcript) => void;
  onSpeechEnd: (at: number) => void;
  onStatus: (status: RecognitionStatus) => void;
  start(options: SpeechOptions): Promise<void>;
  stop(): void;
  dispose(): void;
}
export interface SpeechOptions { language: 'es-PE' | 'es-ES'; localOnly: boolean; phrases: readonly string[] }
export type PersonalAliases = Partial<Record<AbilityId, string[]>>;
export type Interpretation = { accepted: true; abilityId: AbilityId; normalized: string; matchedAlias: string; structure: string } | { accepted: false; reason: string; normalized: string };

export interface VoiceRecord {
  id: string;
  text: string;
  normalized: string;
  matchedAlias: string | null;
  structure: string | null;
  interpretationMs: number;
  abilityId: AbilityId | null;
  status: 'accepted' | 'rejected';
  reason: string;
  source: 'final' | 'speech-end';
  speechStartedAt: number | null;
  firstInterimAt: number | null;
  finalReceivedAt: number | null;
  transcriptReceivedAt: number;
  interpretedAt: number;
  requestedAt: number | null;
  effectStartedAt: number | null;
}
