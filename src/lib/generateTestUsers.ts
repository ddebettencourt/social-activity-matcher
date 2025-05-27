import { Activity } from '@/types/quiz';
import { createUser, saveQuizResults } from './database';
import { loadActivities } from './csvParser';
import { processChoice } from './eloCalculations';

interface TestUserPersonality {
  username: string;
  preferences: {
    socialIntensity: number;      // 1-10, how much they like social vs intimate
    structure: number;           // 1-10, how much they like organized vs spontaneous
    novelty: number;             // 1-10, how much they like new vs familiar
    formality: number;           // 1-10, how much they like formal vs casual
    energyLevel: number;         // 1-10, how much they like high vs low energy
    scaleImmersion: number;      // 1-10, how much they like long vs brief activities
  };
  description: string;
}

const TEST_USERS: TestUserPersonality[] = [
  {
    username: 'HighEnergyHarry',
    preferences: {
      socialIntensity: 9,
      structure: 4,
      novelty: 8,
      formality: 2,
      energyLevel: 10,
      scaleImmersion: 7
    },
    description: 'Loves high-energy, active, social activities with lots of people'
  },
  {
    username: 'QuietBookwormBella',
    preferences: {
      socialIntensity: 2,
      structure: 8,
      novelty: 3,
      formality: 6,
      energyLevel: 2,
      scaleImmersion: 9
    },
    description: 'Prefers calm, structured, intimate activities with deep focus'
  },
  {
    username: 'AdventurousAlex',
    preferences: {
      socialIntensity: 6,
      structure: 3,
      novelty: 10,
      formality: 2,
      energyLevel: 8,
      scaleImmersion: 8
    },
    description: 'Seeks novel, spontaneous adventures and unique experiences'
  },
  {
    username: 'FormalFiona',
    preferences: {
      socialIntensity: 7,
      structure: 9,
      novelty: 4,
      formality: 9,
      energyLevel: 4,
      scaleImmersion: 6
    },
    description: 'Enjoys elegant, well-organized, sophisticated social events'
  },
  {
    username: 'CasualChris',
    preferences: {
      socialIntensity: 8,
      structure: 2,
      novelty: 5,
      formality: 1,
      energyLevel: 6,
      scaleImmersion: 4
    },
    description: 'Loves relaxed, informal hangouts with friends'
  },
  {
    username: 'CreativeCarla',
    preferences: {
      socialIntensity: 5,
      structure: 4,
      novelty: 9,
      formality: 3,
      energyLevel: 6,
      scaleImmersion: 8
    },
    description: 'Passionate about artistic, creative, and unique experiences'
  },
  {
    username: 'RoutineRobert',
    preferences: {
      socialIntensity: 4,
      structure: 9,
      novelty: 2,
      formality: 7,
      energyLevel: 3,
      scaleImmersion: 5
    },
    description: 'Prefers familiar, well-planned activities with clear structure'
  },
  {
    username: 'PartyPaulina',
    preferences: {
      socialIntensity: 10,
      structure: 3,
      novelty: 7,
      formality: 2,
      energyLevel: 9,
      scaleImmersion: 6
    },
    description: 'The life of the party - loves crowds, energy, and social chaos'
  },
  {
    username: 'IntellectualIan',
    preferences: {
      socialIntensity: 3,
      structure: 7,
      novelty: 6,
      formality: 8,
      energyLevel: 2,
      scaleImmersion: 9
    },
    description: 'Enjoys thoughtful, educational activities with meaningful discussion'
  },
  {
    username: 'FlexibleFreya',
    preferences: {
      socialIntensity: 5,
      structure: 5,
      novelty: 5,
      formality: 5,
      energyLevel: 5,
      scaleImmersion: 5
    },
    description: 'Open to all types of activities - the perfect middle ground'
  }
];

// Calculate how much a user would like an activity based on their preferences
function calculateUserActivityPreference(userPrefs: TestUserPersonality['preferences'], activity: Activity): number {
  // Calculate similarity to user's ideal preferences
  const diffs = {
    socialIntensity: Math.abs(userPrefs.socialIntensity - activity.socialIntensity),
    structure: Math.abs(userPrefs.structure - activity.structureSpontaneity),
    novelty: Math.abs(userPrefs.novelty - activity.familiarityNovelty),
    formality: Math.abs(userPrefs.formality - activity.formalityGradient),
    energyLevel: Math.abs(userPrefs.energyLevel - activity.energyLevel),
    scaleImmersion: Math.abs(userPrefs.scaleImmersion - activity.scaleImmersion)
  };
  
  // Calculate average difference (0 = perfect match, 9 = worst match)
  const avgDiff = Object.values(diffs).reduce((sum, diff) => sum + diff, 0) / 6;
  
  // Convert to 0-1 preference score (1 = loves it, 0 = hates it)
  const preferenceScore = 1 - (avgDiff / 9);
  
  return preferenceScore;
}

// Simulate quiz choices for a user based on their preferences
function simulateUserQuiz(userPrefs: TestUserPersonality['preferences'], activities: Activity[], numMatchups: number = 80): Activity[] {
  const activitiesCopy = activities.map(a => ({
    ...a,
    elo: 1200, // Reset ELO
    eloUpdateCount: 0,
    matchups: 0,
    wins: 0,
    chosenCount: 0
  }));
  
  console.log(`Simulating ${numMatchups} matchups for user with preferences:`, userPrefs);
  
  for (let i = 0; i < numMatchups; i++) {
    // Pick two random activities
    const shuffled = [...activitiesCopy].sort(() => Math.random() - 0.5);
    const actA = shuffled[0];
    const actB = shuffled[1];
    
    // Calculate how much the user likes each activity
    const prefA = calculateUserActivityPreference(userPrefs, actA);
    const prefB = calculateUserActivityPreference(userPrefs, actB);
    
    // Add more randomness but still personality-driven
    const randomFactorA = 0.5 + (Math.random() * 1.0); // 0.5 to 1.5 multiplier (wider range)
    const randomFactorB = 0.5 + (Math.random() * 1.0);
    
    const adjustedPrefA = prefA * randomFactorA;
    const adjustedPrefB = prefB * randomFactorB;
    
    // User chooses the activity they prefer more
    const outcomeForA = adjustedPrefA > adjustedPrefB ? 1 : 0;
    
    // Use the real ELO processing function with propagation
    const updatedActivities = processChoice(actA, actB, outcomeForA, activitiesCopy, 'strong');
    
    // Replace our local copy with the updated activities
    for (let j = 0; j < updatedActivities.length; j++) {
      activitiesCopy[j] = {
        ...updatedActivities[j],
        matchups: updatedActivities[j].matchups || 0,
        wins: updatedActivities[j].wins || 0,
        chosenCount: updatedActivities[j].chosenCount || 0
      };
    }
  }
  
  return activitiesCopy;
}

export async function generateAllTestUsers(): Promise<void> {
  try {
    console.log('Starting test user generation...');
    
    // Load activities
    const baseActivities = await loadActivities();
    if (!baseActivities || baseActivities.length === 0) {
      throw new Error('Failed to load activities');
    }
    
    console.log(`Loaded ${baseActivities.length} activities`);
    
    // Generate each test user
    for (const testUser of TEST_USERS) {
      console.log(`\n=== Creating ${testUser.username} ===`);
      console.log(`Description: ${testUser.description}`);
      
      // Create user in database
      const user = await createUser(testUser.username);
      if (!user) {
        console.error(`Failed to create user: ${testUser.username}`);
        continue;
      }
      
      // Simulate their quiz with more matchups for dramatic ELO differences
      const userActivities = simulateUserQuiz(testUser.preferences, baseActivities, 80);
      
      // Save quiz results
      const success = await saveQuizResults(testUser.username, userActivities, 80);
      
      if (success) {
        console.log(`✅ Successfully created ${testUser.username} with 80 matchups`);
        
        // Show their top 5 preferred activities
        const topActivities = userActivities
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 5)
          .map(a => `${a.title} (ELO: ${Math.round(a.elo)})`)
          .join(', ');
        console.log(`Top preferences: ${topActivities}`);
      } else {
        console.error(`❌ Failed to save quiz results for ${testUser.username}`);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 Test user generation complete!');
    console.log(`Created ${TEST_USERS.length} users with distinct personality profiles.`);
    
  } catch (error) {
    console.error('Error generating test users:', error);
    throw error;
  }
}

// Helper function to generate just one user (for testing)
export async function generateSingleTestUser(username: string): Promise<void> {
  const testUser = TEST_USERS.find(user => user.username === username);
  if (!testUser) {
    throw new Error(`Test user ${username} not found`);
  }
  
  const baseActivities = await loadActivities();
  if (!baseActivities) {
    throw new Error('Failed to load activities');
  }
  
  const user = await createUser(testUser.username);
  if (!user) {
    throw new Error(`Failed to create user: ${testUser.username}`);
  }
  
  const userActivities = simulateUserQuiz(testUser.preferences, baseActivities, 80);
  const success = await saveQuizResults(testUser.username, userActivities, 80);
  
  if (!success) {
    throw new Error(`Failed to save quiz results for ${testUser.username}`);
  }
  
  console.log(`Created test user: ${testUser.username}`);
}