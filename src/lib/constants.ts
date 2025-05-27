import { DimensionMeta, PersonaTraitMap, Activity } from '@/types/quiz';

// Adaptive quiz parameters
export const MIN_MATCHUPS_FOR_ALGORITHM = 6; // Start tracking algorithm strength after this many
export const ALGORITHM_HISTORY_SIZE = 10; // Track last N matchups for algorithm strength
export const TARGET_ALGORITHM_STRENGTH = 0.85; // Algorithm strength needed to complete (0-1) - increased threshold
export const ABSOLUTE_MAX_MATCHUPS = 120; // Hard limit to prevent infinite quiz

// ELO K-factors based on preference strength
export const K_FACTOR_STRONG = 48; // Higher impact for strong preferences
export const K_FACTOR_SOMEWHAT = 24; // Lower impact for weak preferences  
export const K_FACTOR_TIE = 16; // Minimal impact for ties

export const K_FACTOR_DIM_SIM_PROPAGATION = 12;
export const K_FACTOR_TAG_PROPAGATION = 8;
export const SIMILARITY_THRESHOLD_FOR_DIM_PROPAGATION = 0.65;
export const RECENT_HISTORY_SIZE = 20;

export const dimensionsMeta: DimensionMeta[] = [
  { key: 'socialIntensity', label: 'Social Intensity', low: 'Low Key', high: 'High Buzz', color: 'bg-purple-400' },
  { key: 'structureSpontaneity', label: 'Structure', low: 'Structured', high: 'Spontaneous', color: 'bg-sky-400' },
  { key: 'familiarityNovelty', label: 'Novelty', low: 'Familiar', high: 'Novel', color: 'bg-amber-400' },
  { key: 'formalityGradient', label: 'Formality', low: 'Casual', high: 'Formal', color: 'bg-rose-400' },
  { key: 'energyLevel', label: 'Energy Level', low: 'Low Energy', high: 'High Energy', color: 'bg-emerald-400' },
  { key: 'scaleImmersion', label: 'Scale & Immersion', low: 'Intimate/Brief', high: 'Massive/Immersive', color: 'bg-pink-400' }
];

export const personaTraitMap: PersonaTraitMap = {
  socialIntensity: {
    high: { primary: ["Gregarious", "Vibrant", "Social", "Outgoing"], descriptor: ["Socialite", "Networker", "People-Person", "Extrovert"] },
    low: { primary: ["Introspective", "Chill", "Peaceful", "Reserved"], descriptor: ["Soloist", "Reflector", "Observer", "Introvert"] }
  },
  structureSpontaneity: { 
    high: { primary: ["Spontaneous", "Adventurous", "Free-Spirited", "Unpredictable"], descriptor: ["Adventurer", "Maverick", "Innovator", "Daredevil"] },
    low: { primary: ["Methodical", "Organized", "Deliberate", "Planner"], descriptor: ["Planner", "Strategist", "Architect", "Organizer"] }
  },
  familiarityNovelty: {
    high: { primary: ["Novelty-Seeking", "Explorer", "Trailblazer", "Curious"], descriptor: ["Explorer", "Pioneer", "Discoverer", "Innovator"] },
    low: { primary: ["Comfort-Loving", "Traditionalist", "Steady", "Classic"], descriptor: ["Traditionalist", "Connoisseur", "Aficionado", "Homebody"] }
  },
  formalityGradient: {
    high: { primary: ["Elegant", "Refined", "Distinguished", "Polished"], descriptor: ["Connoisseur", "Sophisticate", "Aesthete", "Formalist"] },
    low: { primary: ["Casual", "Relaxed", "Easygoing", "Down-to-Earth"], descriptor: ["Relaxer", "Chiller", "Everyperson", "Informalist"] }
  },
  energyLevel: {
    high: { primary: ["Energetic", "Dynamic", "Lively", "Active"], descriptor: ["Dynamo", "Sparkplug", "Go-Getter", "Activist"] },
    low: { primary: ["Calm", "Restful", "Mellow", "Serene"], descriptor: ["Zen-Master", "Contemplator", "Dreamer", "Relaxer"] }
  },
  scaleImmersion: {
    high: { primary: ["Expansive", "Immersive", "Epicurean", "Grand"], descriptor: ["World-Builder", "Visionary", "Maximalist", "Experiencer"] },
    low: { primary: ["Focused", "Intimate", "Concise", "Subtle"], descriptor: ["Minimalist", "Specialist", "Purist", "Simplifier"] }
  }
};

export const initialActivitiesData: Activity[] = [
  { id: 101, title: "Default: Chill Movie Night", subtitle: "Classic films, comfy couch.", socialIntensity: 3, structureSpontaneity: 4, familiarityNovelty: 2, formalityGradient: 1, energyLevel: 2, scaleImmersion: 2, tags: ["Indoor", "Relaxing", "Evening"], elo: 1200, eloUpdateCount: 0 },
  { id: 102, title: "Default: Park Picnic", subtitle: "Sunshine and sandwiches.", socialIntensity: 5, structureSpontaneity: 7, familiarityNovelty: 3, formalityGradient: 1, energyLevel: 3, scaleImmersion: 3, tags: ["Outdoor", "Daytime", "Casual", "Food"], elo: 1200, eloUpdateCount: 0 },
  { id: 103, title: "Default: Coffee Shop Chat", subtitle: "Caffeine and conversation.", socialIntensity: 4, structureSpontaneity: 8, familiarityNovelty: 3, formalityGradient: 2, energyLevel: 2, scaleImmersion: 2, tags: ["Indoor", "Casual", "Conversation"], elo: 1200, eloUpdateCount: 0 },
  { id: 104, title: "Default: Museum Visit", subtitle: "Art & Culture.", socialIntensity: 3, structureSpontaneity: 3, familiarityNovelty: 6, formalityGradient: 4, energyLevel: 3, scaleImmersion: 4, tags: ["Indoor", "Cultural", "Educational", "Quiet"], elo: 1200, eloUpdateCount: 0 },
  { id: 105, title: "Default: High Energy Dance Party", subtitle: "Loud music, lots of people.", socialIntensity: 9, structureSpontaneity: 8, familiarityNovelty: 5, formalityGradient: 2, energyLevel: 9, scaleImmersion: 7, tags: ["Nightlife", "Energetic", "Social", "Music"], elo: 1200, eloUpdateCount: 0 }
];