export type UserRole = 'user' | 'guide' | 'admin';

export interface AuthContext {
  userId: string;
  role: UserRole;
  isAdmin: boolean;
}

export type DefenseMode = 'assessed' | 'sparring';

export type DefenseStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'complete'
  | 'failed';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export type LevelAttemptStatus = 'in_progress' | 'evaluating' | 'passed' | 'failed';

export type CoachingStatus = 'active' | 'addressed' | 'dismissed';

export type GauntletStatus = 'upcoming' | 'active' | 'completed';

export type GauntletRole = 'defender' | 'attacker' | 'observer';

export type PerformanceLevel = 'exemplary' | 'proficient' | 'developing' | 'beginning';

export type OpponentPersona = 'philosopher' | 'empiricist' | 'contrarian' | 'strategist';

export type DifficultyLevel = 'curious_skeptic' | 'domain_expert' | 'sources_weaponized';

export type InputMode = 'text' | 'voice';

/** 5 scoring axes, 4 criteria each = 20 points max */
export const SCORING_AXES = [
  'factual_accuracy',
  'depth_of_reasoning',
  'epistemic_honesty',
  'composure_under_pressure',
  'argument_evolution',
] as const;

export type ScoringAxis = typeof SCORING_AXES[number];

export interface EvidenceItem {
  claim: string;
  source: string;
  sourceUrl?: string;
}

export interface CounterEvidenceItem {
  claim: string;
  source: string;
  sourceUrl?: string;
}

export interface ScoreBreakdown {
  axis: ScoringAxis;
  criteria: Array<{
    name: string;
    met: boolean;
    evidence: string;
  }>;
  score: number;
  maxScore: number;
}

export interface EvaluationOutput {
  scores: ScoreBreakdown[];
  totalScore: number;
  maxScore: number;
  penalties: Array<{ reason: string; deduction: number }>;
  strongestMoments: string[];
  improvementAreas: string[];
}

export interface AdaptiveState {
  currentDifficulty: DifficultyLevel;
  evidenceUse: number;
  responsiveness: number;
  clarity: number;
  upgradeTriggered: boolean;
  upgradeRound?: number;
}

export interface AutoReviewResult {
  pass: boolean;
  feedback: string[];
  suggestedRevisions: string[];
}

export interface FillerPenalty {
  round: number;
  fillerCount: number;
  repetitionScore: number;
  penaltyPoints: number;
}

export interface StallingResultV2 {
  isStalling: boolean;
  flags: string[];
  details: string;
  fillerCount: number;
  repetitionScore: number;
  penaltyPoints: number;
}

export type SparringSequenceType =
  | 'foundations'
  | 'evidence_stress_test'
  | 'pressure_chamber'
  | 'systems_mapping'
  | 'mirror_match';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  round: number;
  timestamp: string;
  wordCount?: number;
  stallingFlags?: string[];
}
