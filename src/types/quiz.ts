export interface Activity {
  id: number;
  title: string;
  subtitle: string;
  socialIntensity: number;
  structureSpontaneity: number;
  familiarityNovelty: number;
  formalityGradient: number;
  energyLevel: number;
  scaleImmersion: number;
  tags: string[];
  elo: number;
  eloUpdateCount: number;
  matchups?: number;
  wins?: number;
  chosenCount?: number;
}

export interface DimensionMeta {
  key: keyof Pick<Activity, 'socialIntensity' | 'structureSpontaneity' | 'familiarityNovelty' | 'formalityGradient' | 'energyLevel' | 'scaleImmersion'>;
  label: string;
  low: string;
  high: string;
  color: string;
}

export interface PreferenceDriver {
  dimension: string;
  correlation: number;
  low: string;
  high: string;
  key: string;
}

export interface PersonaTraits {
  primary: string[];
  descriptor: string[];
}

export interface PersonaTraitMap {
  [key: string]: {
    high: PersonaTraits;
    low: PersonaTraits;
  };
}

export interface TagScore {
  tag: string;
  score: number;
  averageElo: number;
  activityCount: number;
}

export interface DimensionalDifference {
  [key: string]: number; // dimension key -> absolute difference (0-9)
}

export interface MatchupPrediction {
  matchupNumber: number;
  predictedWinnerId: number;
  actualWinnerId: number | null;
  confidenceLevel: number; // 0-1, based on ELO difference relative to full range
  wasCorrect: boolean | null;
  eloA: number;
  eloB: number;
  eloRange: number; // min-max ELO at time of prediction
  dimensionalDifferences: DimensionalDifference; // differences in each dimension
}

export interface AlgorithmStrength {
  score: number; // 0-1, where 1 is perfect prediction
  confidence: 'low' | 'medium' | 'high';
  isReady: boolean; // true when algorithm is confident enough to stop
  predictionHistory: MatchupPrediction[];
}

export type PreferenceStrength = 'strong' | 'somewhat' | 'tie';

export interface User {
  username: string;
  createdAt: string;
  lastActive: string;
  hasCompletedQuiz: boolean;
}

export interface UserProfile {
  user: User;
  activityData?: Activity[];
  totalMatchups?: number;
  quizCompletedAt?: string;
}

export interface QuizState {
  currentMatchup: number;
  activityData: Activity[];
  currentActivityA: Activity | null;
  currentActivityB: Activity | null;
  recentMatchupHistory: number[];
  isQuizComplete: boolean;
  algorithmStrength: AlgorithmStrength;
  minMatchups: number; // minimum before algorithm strength kicks in
  targetStrength: number; // strength score needed to complete quiz
}