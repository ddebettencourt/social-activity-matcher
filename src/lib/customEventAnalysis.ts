import { Activity } from '@/types/quiz';
import { getQualifiedUsersForEventAnalysis } from './database';

export interface CustomEventDimensions {
  socialIntensity: number;      // 1-10 scale
  structure: number;           // 1-10 scale  
  novelty: number;             // 1-10 scale
  formality: number;           // 1-10 scale
  energyLevel: number;         // 1-10 scale
  scaleImmersion: number;      // 1-10 scale
}

export interface CustomEventAnalysis {
  title: string;
  subtitle: string;
  dimensions: CustomEventDimensions;
  tags: Array<{name: string; importance: number}> | string[]; // Support both formats for backwards compatibility
}

export interface UserPrediction {
  username: string;
  enjoymentScore: number;
  explanation: string;
  insights: {
    likedSimilarActivities: string[];
    enjoyedTags: string[];
    dislikedTags: string[];
    personalityInsights: string[];
  };
  hybridBreakdown: {
    calculationSteps: string[];
    claudeBaseScore: number;
    tagAnalysis: {
      tag: string;
      importance: number;
      userAvgElo: number;
      overallAvgElo: number;
      standardDeviation: number;
      standardError: number;
      zScore: number;
      activityCount: number;
      importanceWeight: number;
      adjustment: number;
      topActivities: string[];
    }[];
    finalAdjustment: number;
    similarActivitiesUsed: {
      title: string;
      similarity: number;
      elo: number;
      explanation: string;
    }[];
  };
}

// Analyze custom event using Claude API (optionally with similar activities)
export async function analyzeCustomEvent(
  eventDescription: string, 
  userActivities?: Activity[]
): Promise<CustomEventAnalysis & { similarActivities?: { title: string; similarity: number; explanation: string; }[] }> {
  try {
    console.log('Analyzing custom event with Claude API:', eventDescription);

    const response = await fetch('/api/analyze-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        eventDescription,
        userActivities: userActivities || []
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error('Error analyzing custom event:', error);
    throw new Error('Failed to analyze event');
  }
}

// Normalize tag for comparison (handle hyphens vs spaces)
function normalizeTag(tag: string): string {
  return tag.toLowerCase()
    .replace(/\s+/g, '-')  // Convert spaces to hyphens
    .replace(/&/g, '&')    // Normalize ampersands
    .trim();
}

// Calculate similarity between custom event and existing activity
export function calculateEventSimilarity(
  customEvent: CustomEventDimensions,
  activity: Activity,
  customEventTags: Array<{name: string; importance: number}> | string[] = []
): number {
  // Map custom event dimensions to Activity property names
  const dimensionMapping = {
    socialIntensity: activity.socialIntensity,
    structure: activity.structureSpontaneity,
    novelty: activity.familiarityNovelty,
    formality: activity.formalityGradient,
    energyLevel: activity.energyLevel,
    scaleImmersion: activity.scaleImmersion
  };
  
  // Calculate Euclidean distance in 6-dimensional space
  let sumSquaredDiffs = 0;
  
  Object.keys(customEvent).forEach(key => {
    const customVal = customEvent[key as keyof CustomEventDimensions];
    const activityVal = dimensionMapping[key as keyof typeof dimensionMapping];
    
    // Add debugging to catch NaN issues
    if (isNaN(customVal) || isNaN(activityVal)) {
      console.warn(`NaN values found in similarity calculation:`, {
        key,
        customVal,
        activityVal,
        activity: activity.title
      });
      return;
    }
    
    const diff = customVal - activityVal;
    sumSquaredDiffs += diff * diff;
  });
  
  const distance = Math.sqrt(sumSquaredDiffs);
  const maxDistance = Math.sqrt(6 * 9 * 9); // Max possible distance in 6D space with 9-point ranges
  
  // Convert distance to dimensional similarity (0-1 scale, where 1 = identical)
  const dimensionalSimilarity = 1 - (distance / maxDistance);
  
  // Calculate tag similarity (normalized for hyphens vs spaces)
  let tagSimilarity = 0;
  if (customEventTags.length > 0 && activity.tags && activity.tags.length > 0) {
    // Handle both old string format and new object format
    const customTagNames = Array.isArray(customEventTags) && customEventTags.length > 0 && typeof customEventTags[0] === 'object'
      ? (customEventTags as Array<{name: string; importance: number}>).map(t => t.name)
      : customEventTags as string[];
    
    // Normalize tags for consistent comparison
    const normalizedCustomTags = customTagNames.map(normalizeTag);
    const normalizedActivityTags = activity.tags.map(normalizeTag);
    
    // Count overlapping tags
    const overlappingTags = normalizedCustomTags.filter(tag => 
      normalizedActivityTags.includes(tag)
    ).length;
    
    // Use Jaccard similarity: intersection / union
    const allNormalizedTags = new Set([...normalizedCustomTags, ...normalizedActivityTags]);
    tagSimilarity = overlappingTags / allNormalizedTags.size;
  }
  
  // Combine dimensional and tag similarity with higher weight for tags
  const DIMENSION_WEIGHT = 0.3;  // 30% weight to dimensions
  const TAG_WEIGHT = 0.7;        // 70% weight to tags
  
  const combinedSimilarity = (dimensionalSimilarity * DIMENSION_WEIGHT) + (tagSimilarity * TAG_WEIGHT);
  
  if (isNaN(combinedSimilarity)) {
    console.warn('NaN similarity calculated for activity:', activity.title);
    return 0;
  }
  
  return Math.max(0, Math.min(1, combinedSimilarity));
}

// Predict user enjoyment for custom event
export function predictUserEnjoyment(
  customEvent: CustomEventDimensions,
  userActivities: Activity[],
  customEventTags: Array<{name: string; importance: number}> | string[] = []
): {
  enjoymentScore: number;
  explanation: string;
  topSimilarActivities: {
    title: string;
    elo: number;
    similarity: number;
  }[];
  mathBreakdown: {
    dimensionWeight: number;
    tagWeight: number;
    totalActivitiesAnalyzed: number;
    topSimilarActivitiesCount: number;
    weightedEloSum: number;
    totalWeight: number;
    estimatedElo: number;
    rank: number;
    totalRanked: number;
    percentile: number;
    tagContributions: {
      tag: string;
      matchingActivities: string[];
      contributionToSimilarity: number;
    }[];
    dimensionContributions: {
      dimension: string;
      customValue: number;
      avgSimilarValue: number;
      difference: number;
    }[];
  };
} {
  if (!userActivities || userActivities.length === 0) {
    return {
      enjoymentScore: 5.0,
      explanation: 'No profile data available for prediction',
      topSimilarActivities: [],
      mathBreakdown: {
        dimensionWeight: 0.3,
        tagWeight: 0.7,
        totalActivitiesAnalyzed: 0,
        topSimilarActivitiesCount: 0,
        weightedEloSum: 0,
        totalWeight: 0,
        estimatedElo: 1200,
        rank: 0,
        totalRanked: 0,
        percentile: 0.5,
        tagContributions: [],
        dimensionContributions: [],
      }
    };
  }
  
  // Calculate similarities and find top matches with detailed breakdown
  const activitiesWithSimilarity = userActivities.map(activity => ({
    activity,
    similarity: calculateEventSimilarity(customEvent, activity, customEventTags)
  }))
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 20); // Top 20 most similar
  
  if (activitiesWithSimilarity.length === 0) {
    return {
      enjoymentScore: 5.0,
      explanation: 'No similar activities found',
      topSimilarActivities: [],
      mathBreakdown: {
        dimensionWeight: 0.3,
        tagWeight: 0.7,
        totalActivitiesAnalyzed: userActivities.length,
        topSimilarActivitiesCount: 0,
        weightedEloSum: 0,
        totalWeight: 0,
        estimatedElo: 1200,
        rank: 0,
        totalRanked: userActivities.length,
        percentile: 0.5,
        tagContributions: [],
        dimensionContributions: [],
      }
    };
  }
  
  // Handle both old string format and new object format for tag contributions
  const customTagNames = Array.isArray(customEventTags) && customEventTags.length > 0 && typeof customEventTags[0] === 'object'
    ? (customEventTags as Array<{name: string; importance: number}>).map(t => t.name)
    : customEventTags as string[];
  
  // Calculate tag contributions (normalized for hyphens vs spaces)
  const tagContributions = customTagNames.map(tag => {
    const normalizedTag = normalizeTag(tag);
    const matchingActivities = activitiesWithSimilarity
      .filter(({ activity }) => activity.tags && activity.tags.some(actTag => normalizeTag(actTag) === normalizedTag))
      .map(({ activity }) => activity.title);
    
    // Calculate average contribution of this tag to similarity
    let totalContribution = 0;
    let count = 0;
    activitiesWithSimilarity.forEach(({ activity }) => {
      if (activity.tags && activity.tags.some(actTag => normalizeTag(actTag) === normalizedTag)) {
        // Jaccard similarity contribution for this tag (normalized)
        const normalizedCustomTags = customTagNames.map(normalizeTag);
        const normalizedActivityTags = activity.tags.map(normalizeTag);
        const intersection = normalizedCustomTags.filter(t => normalizedActivityTags.includes(t)).length;
        const union = new Set([...normalizedCustomTags, ...normalizedActivityTags]).size;
        const tagSimilarity = intersection / union;
        totalContribution += tagSimilarity * 0.7; // 70% weight
        count++;
      }
    });
    
    return {
      tag,
      matchingActivities,
      contributionToSimilarity: count > 0 ? totalContribution / count : 0
    };
  });
  
  // Calculate dimension contributions
  const dimensionKeys = Object.keys(customEvent) as (keyof CustomEventDimensions)[];
  const dimensionMapping = {
    socialIntensity: 'socialIntensity',
    structure: 'structureSpontaneity',
    novelty: 'familiarityNovelty',
    formality: 'formalityGradient',
    energyLevel: 'energyLevel',
    scaleImmersion: 'scaleImmersion'
  } as const;
  
  const dimensionContributions = dimensionKeys.map(dimKey => {
    const activityKey = dimensionMapping[dimKey] as keyof Activity;
    const customValue = customEvent[dimKey];
    
    // Calculate average value for similar activities
    const similarValues = activitiesWithSimilarity
      .map(({ activity }) => activity[activityKey] as number)
      .filter(val => typeof val === 'number');
    
    const avgSimilarValue = similarValues.length > 0 
      ? similarValues.reduce((sum, val) => sum + val, 0) / similarValues.length 
      : customValue;
    
    return {
      dimension: dimKey.replace(/([A-Z])/g, ' $1').trim(),
      customValue,
      avgSimilarValue: Number(avgSimilarValue.toFixed(1)),
      difference: Number(Math.abs(customValue - avgSimilarValue).toFixed(1))
    };
  });
  
  // Step 1: Calculate weighted average ELO based on similarity with detailed tracking
  let weightedEloSum = 0;
  let totalWeight = 0;
  const calculationSteps: string[] = [];
  const similarityCalculations: {
    activityTitle: string;
    dimensionalSimilarity: number;
    tagSimilarity: number;
    combinedSimilarity: number;
    elo: number;
    weight: number;
    weightedElo: number;
  }[] = [];
  
  calculationSteps.push(`STEP 1: Calculate similarity for top ${activitiesWithSimilarity.length} activities`);
  calculationSteps.push(`Formula: Similarity = (Dimensional × 30%) + (Tag × 70%)`);
  
  activitiesWithSimilarity.forEach(({ activity, similarity }, index) => {
    // Calculate detailed similarity breakdown for this activity
    const customTags = (Array.isArray(customEventTags) && customEventTags.length > 0 && typeof customEventTags[0] === 'object'
      ? (customEventTags as Array<{name: string; importance: number}>).map(t => t.name)
      : customEventTags as string[]).map(normalizeTag);
    const actTags = (activity.tags || []).map(normalizeTag);
    
    // Dimensional similarity calculation
    let dimDiffSum = 0;
    Object.keys(customEvent).forEach(key => {
      const customVal = customEvent[key as keyof CustomEventDimensions];
      const actVal = activity[dimensionMapping[key as keyof typeof dimensionMapping] as keyof Activity] as number;
      const diff = customVal - actVal;
      dimDiffSum += diff * diff;
    });
    const dimDistance = Math.sqrt(dimDiffSum);
    const maxDimDistance = Math.sqrt(6 * 9 * 9);
    const dimensionalSimilarity = 1 - (dimDistance / maxDimDistance);
    
    // Tag similarity calculation
    const overlappingTags = customTags.filter(tag => actTags.includes(tag)).length;
    const allTags = new Set([...customTags, ...actTags]).size;
    const tagSimilarity = allTags > 0 ? overlappingTags / allTags : 0;
    
    // Combined similarity
    const combinedSimilarity = (dimensionalSimilarity * 0.3) + (tagSimilarity * 0.7);
    
    // Weight calculation (cube for emphasis)
    const weight = Math.pow(similarity, 3);
    const weightedElo = activity.elo * weight;
    
    weightedEloSum += weightedElo;
    totalWeight += weight;
    
    similarityCalculations.push({
      activityTitle: activity.title,
      dimensionalSimilarity: Number(dimensionalSimilarity.toFixed(3)),
      tagSimilarity: Number(tagSimilarity.toFixed(3)),
      combinedSimilarity: Number(combinedSimilarity.toFixed(3)),
      elo: activity.elo,
      weight: Number(weight.toFixed(3)),
      weightedElo: Number(weightedElo.toFixed(1))
    });
    
    if (index < 5) { // Only show top 5 in steps to avoid clutter
      calculationSteps.push(
        `  ${activity.title}: dim=${dimensionalSimilarity.toFixed(3)} (30%) + tag=${tagSimilarity.toFixed(3)} (70%) = ${combinedSimilarity.toFixed(3)}`
      );
      calculationSteps.push(
        `    Weight = ${similarity.toFixed(3)}³ = ${weight.toFixed(3)}, ELO=${activity.elo} → Weighted=${weightedElo.toFixed(1)}`
      );
    }
  });
  
  calculationSteps.push(`STEP 2: Calculate weighted average ELO`);
  calculationSteps.push(`Sum of weighted ELOs: ${weightedEloSum.toFixed(1)}`);
  calculationSteps.push(`Sum of weights: ${totalWeight.toFixed(3)}`);
  calculationSteps.push(`Estimated ELO = ${weightedEloSum.toFixed(1)} ÷ ${totalWeight.toFixed(3)} = ${(weightedEloSum/totalWeight).toFixed(1)}`);
  
  const estimatedElo = totalWeight > 0 ? weightedEloSum / totalWeight : 1200;
  
  // Step 2: Find where this estimated ELO would rank in user's full activity list
  const sortedElos = userActivities.map(a => a.elo).sort((a, b) => b - a); // Descending order
  
  // Find the position where our estimated ELO would be inserted
  let rank = 0;
  for (let i = 0; i < sortedElos.length; i++) {
    if (estimatedElo > sortedElos[i]) {
      rank = i;
      break;
    }
    rank = i + 1;
  }
  
  // Step 3: Convert rank to percentile (0 = worst, 1 = best)
  const percentile = 1 - (rank / sortedElos.length);
  
  calculationSteps.push(`STEP 3: Determine ranking among user's ${sortedElos.length} activities`);
  calculationSteps.push(`Estimated ELO ${estimatedElo.toFixed(1)} ranks #${rank + 1} (${(percentile * 100).toFixed(1)}th percentile)`);
  
  // Step 4: Convert percentile to 0-10 scale
  const enjoymentScore = 0.5 + (percentile * 9);
  
  calculationSteps.push(`STEP 4: Convert to 0-10 scale`);
  calculationSteps.push(`Score = 0.5 + (${percentile.toFixed(3)} × 9) = ${enjoymentScore.toFixed(1)}/10`);
  
  // Generate explanation based on ranking
  const topActivity = activitiesWithSimilarity[0];
  let explanation = '';
  if (percentile >= 0.8) {
    explanation = `Would likely be in your top ${Math.round((1-percentile)*100)}% of activities`;
  } else if (percentile >= 0.6) {
    explanation = `Would rank in your upper-middle preferences`;
  } else if (percentile >= 0.4) {
    explanation = `Would be somewhere in the middle of your preferences`;
  } else if (percentile >= 0.2) {
    explanation = `Would rank in your lower-middle preferences`;
  } else {
    explanation = `Would likely be in your bottom ${Math.round(percentile*100+20)}% of activities`;
  }
  
  explanation += ` (estimated ELO: ${Math.round(estimatedElo)}, similar to ${topActivity.activity.title})`;
  
  return {
    enjoymentScore: Number(enjoymentScore.toFixed(1)),
    explanation,
    topSimilarActivities: activitiesWithSimilarity.slice(0, 3).map(({ activity, similarity }) => ({
      title: activity.title,
      elo: activity.elo,
      similarity: Number(similarity.toFixed(2))
    })),
    mathBreakdown: {
      dimensionWeight: 0.3,
      tagWeight: 0.7,
      totalActivitiesAnalyzed: userActivities.length,
      topSimilarActivitiesCount: activitiesWithSimilarity.length,
      weightedEloSum: Number(weightedEloSum.toFixed(1)),
      totalWeight: Number(totalWeight.toFixed(3)),
      estimatedElo: Number(estimatedElo.toFixed(1)),
      rank,
      totalRanked: sortedElos.length,
      percentile: Number(percentile.toFixed(3)),
      tagContributions,
      dimensionContributions
    }
  };
}


// Predict user enjoyment using Claude's pre-computed similarity analysis
export function predictUserEnjoymentWithClaude(
  claudeSimilarActivities: {
    title: string;
    similarity: number;
    explanation: string;
  }[],
  userActivities: Activity[]
): {
  enjoymentScore: number;
  explanation: string;
  topSimilarActivities: {
    title: string;
    elo: number;
    similarity: number;
    explanation: string;
  }[];
  claudeBreakdown: {
    calculationSteps: string[];
    similarActivitiesUsed: {
      title: string;
      similarity: number;
      elo: number;
      weight: number;
      weightedElo: number;
      explanation: string;
    }[];
  };
} {
  if (!userActivities || userActivities.length === 0) {
    return {
      enjoymentScore: 5.0,
      explanation: 'No profile data available for prediction',
      topSimilarActivities: [],
      claudeBreakdown: {
        calculationSteps: [],
        similarActivitiesUsed: []
      }
    };
  }
  
  // Use the pre-computed Claude similarities
  
  if (claudeSimilarActivities.length === 0) {
    return {
      enjoymentScore: 5.0,
      explanation: 'Could not find similar activities',
      topSimilarActivities: [],
      claudeBreakdown: {
        calculationSteps: [],
        similarActivitiesUsed: []
      }
    };
  }
  
  // Find the actual activities and their ELOs
  const activitiesWithElo = claudeSimilarActivities.map(similar => {
    const activity = userActivities.find(a => a.title === similar.title);
    return activity ? {
      title: activity.title,
      elo: activity.elo,
      similarity: similar.similarity,
      explanation: similar.explanation
    } : null;
  }).filter(Boolean) as {
    title: string;
    elo: number;
    similarity: number;
    explanation: string;
  }[];
  
  if (activitiesWithElo.length === 0) {
    return {
      enjoymentScore: 5.0,
      explanation: 'No matching activities found in user profile',
      topSimilarActivities: [],
      claudeBreakdown: {
        calculationSteps: [],
        similarActivitiesUsed: []
      }
    };
  }
  
  // Calculate weighted ELO average using Claude's similarity scores with detailed tracking
  let weightedEloSum = 0;
  let totalWeight = 0;
  const calculationSteps: string[] = [];
  const similarActivitiesUsed: {
    title: string;
    similarity: number;
    elo: number;
    weight: number;
    weightedElo: number;
    explanation: string;
  }[] = [];
  
  calculationSteps.push(`CLAUDE APPROACH: Using Claude's semantic similarity analysis`);
  calculationSteps.push(`Found ${activitiesWithElo.length} similar activities from Claude's analysis`);
  calculationSteps.push(`Formula: Direct similarity weighting (no exponential cubing)`);
  
  activitiesWithElo.forEach(({ elo, similarity, explanation, title }) => {
    const weight = similarity; // Use Claude's similarity directly as weight
    const weightedElo = elo * weight;
    weightedEloSum += weightedElo;
    totalWeight += weight;
    
    similarActivitiesUsed.push({
      title,
      similarity: Number(similarity.toFixed(3)),
      elo,
      weight: Number(weight.toFixed(3)),
      weightedElo: Number(weightedElo.toFixed(1)),
      explanation
    });
    
    calculationSteps.push(
      `  ${title}: similarity=${similarity.toFixed(3)} × ELO=${elo} = ${weightedElo.toFixed(1)}`
    );
    calculationSteps.push(`    Claude reasoning: "${explanation}"`);
  });
  
  calculationSteps.push(`Total weighted ELO: ${weightedEloSum.toFixed(1)}`);
  calculationSteps.push(`Total weight: ${totalWeight.toFixed(3)}`);
  
  const estimatedElo = totalWeight > 0 ? weightedEloSum / totalWeight : 1200;
  calculationSteps.push(`Estimated ELO = ${weightedEloSum.toFixed(1)} ÷ ${totalWeight.toFixed(3)} = ${estimatedElo.toFixed(1)}`);
  
  // Find where this estimated ELO would rank in user's full activity list
  const sortedElos = userActivities.map(a => a.elo).sort((a, b) => b - a);
  
  let rank = 0;
  for (let i = 0; i < sortedElos.length; i++) {
    if (estimatedElo > sortedElos[i]) {
      rank = i;
      break;
    }
    rank = i + 1;
  }
  
  const percentile = 1 - (rank / sortedElos.length);
  const enjoymentScore = 0.5 + (percentile * 9);
  
  calculationSteps.push(`Ranking: ELO ${estimatedElo.toFixed(1)} ranks #${rank + 1} out of ${sortedElos.length} (${(percentile * 100).toFixed(1)}th percentile)`);
  calculationSteps.push(`Final Score: 0.5 + (${percentile.toFixed(3)} × 9) = ${enjoymentScore.toFixed(1)}/10`);
  
  const explanation = `Claude-based prediction: Would rank ${Math.round(percentile * 100)}th percentile (estimated ELO: ${Math.round(estimatedElo)})`;
  
  return {
    enjoymentScore: Number(enjoymentScore.toFixed(1)),
    explanation,
    topSimilarActivities: activitiesWithElo.slice(0, 5),
    claudeBreakdown: {
      calculationSteps,
      similarActivitiesUsed
    }
  };
}

// Hybrid prediction combining Claude semantic analysis with tag-based ELO statistics
export function predictUserEnjoymentHybrid(
  claudeSimilarActivities: {
    title: string;
    similarity: number;
    explanation: string;
  }[],
  customEventTags: Array<{name: string; importance: number}> | string[],
  userActivities: Activity[]
): {
  hybridScore: number;
  hybridExplanation: string;
  insights: {
    likedSimilarActivities: string[];
    enjoyedTags: string[];
    dislikedTags: string[];
    personalityInsights: string[];
  };
  hybridBreakdown: {
    calculationSteps: string[];
    claudeBaseScore: number;
    tagAnalysis: {
      tag: string;
      importance: number;
      userAvgElo: number;
      overallAvgElo: number;
      standardDeviation: number;
      standardError: number;
      zScore: number;
      activityCount: number;
      importanceWeight: number;
      adjustment: number;
      topActivities: string[];
    }[];
    finalAdjustment: number;
    similarActivitiesUsed: {
      title: string;
      similarity: number;
      elo: number;
      explanation: string;
    }[];
  };
} {
  const calculationSteps: string[] = [];
  
  calculationSteps.push(`HYBRID APPROACH: Claude semantic analysis + Tag-based ELO statistics`);
  
  // Step 1: Get Claude's weighted average ELO (starting point)
  calculationSteps.push(`STEP 1: Calculate Claude base score from similar activities`);
  
  if (claudeSimilarActivities.length === 0 || userActivities.length === 0) {
    return {
      hybridScore: 5.0,
      hybridExplanation: 'Insufficient data for hybrid prediction',
      insights: {
        likedSimilarActivities: [],
        enjoyedTags: [],
        dislikedTags: [],
        personalityInsights: []
      },
      hybridBreakdown: {
        calculationSteps: ['No similar activities or user data available'],
        claudeBaseScore: 5.0,
        tagAnalysis: [],
        finalAdjustment: 0,
        similarActivitiesUsed: []
      }
    };
  }
  
  // Find activities with ELOs
  const activitiesWithElo = claudeSimilarActivities.map(similar => {
    const activity = userActivities.find(a => a.title === similar.title);
    return activity ? {
      title: activity.title,
      elo: activity.elo,
      similarity: similar.similarity,
      explanation: similar.explanation
    } : null;
  }).filter(Boolean) as {
    title: string;
    elo: number;
    similarity: number;
    explanation: string;
  }[];
  
  if (activitiesWithElo.length === 0) {
    return {
      hybridScore: 5.0,
      hybridExplanation: 'No matching activities found in user profile',
      insights: {
        likedSimilarActivities: [],
        enjoyedTags: [],
        dislikedTags: [],
        personalityInsights: []
      },
      hybridBreakdown: {
        calculationSteps: ['No Claude similar activities matched user profile'],
        claudeBaseScore: 5.0,
        tagAnalysis: [],
        finalAdjustment: 0,
        similarActivitiesUsed: []
      }
    };
  }
  
  // Calculate Claude's weighted average ELO
  let weightedEloSum = 0;
  let totalWeight = 0;
  
  activitiesWithElo.forEach(({ elo, similarity, title }) => {
    const weight = similarity;
    const weightedElo = elo * weight;
    weightedEloSum += weightedElo;
    totalWeight += weight;
    
    calculationSteps.push(`  ${title}: similarity=${similarity.toFixed(3)} × ELO=${elo} = ${weightedElo.toFixed(1)}`);
  });
  
  const claudeEstimatedElo = totalWeight > 0 ? weightedEloSum / totalWeight : 1200;
  calculationSteps.push(`Claude weighted ELO: ${weightedEloSum.toFixed(1)} ÷ ${totalWeight.toFixed(3)} = ${claudeEstimatedElo.toFixed(1)}`);
  
  // Convert Claude ELO to 0-10 scale (base score)
  const sortedElos = userActivities.map(a => a.elo).sort((a, b) => b - a);
  let rank = 0;
  for (let i = 0; i < sortedElos.length; i++) {
    if (claudeEstimatedElo > sortedElos[i]) {
      rank = i;
      break;
    }
    rank = i + 1;
  }
  const percentile = 1 - (rank / sortedElos.length);
  const claudeBaseScore = 0.5 + (percentile * 9);
  
  calculationSteps.push(`Claude base score: Rank ${rank + 1}/${sortedElos.length} (${(percentile * 100).toFixed(1)}%) = ${claudeBaseScore.toFixed(1)}/10`);
  
  // Step 2: Calculate tag-based ELO statistics with importance weighting
  calculationSteps.push(`STEP 2: Analyze tag-based ELO patterns with importance weighting`);
  
  // Handle both old string format and new object format
  const tagObjects = Array.isArray(customEventTags) && customEventTags.length > 0 && typeof customEventTags[0] === 'object'
    ? customEventTags as Array<{name: string; importance: number}>
    : (customEventTags as string[]).map(tag => ({name: tag, importance: 3})); // Default importance for old format
  
  // Calculate overall ELO statistics
  const overallElos = userActivities.map(a => a.elo);
  const overallAvgElo = overallElos.reduce((sum, elo) => sum + elo, 0) / overallElos.length;
  const variance = overallElos.reduce((sum, elo) => sum + Math.pow(elo - overallAvgElo, 2), 0) / overallElos.length;
  const overallStdDev = Math.sqrt(variance);
  
  calculationSteps.push(`Overall ELO: avg=${overallAvgElo.toFixed(1)}, std=${overallStdDev.toFixed(1)}`);
  
  const tagAnalysis: {
    tag: string;
    importance: number;
    userAvgElo: number;
    overallAvgElo: number;
    standardDeviation: number;
    standardError: number;
    zScore: number;
    activityCount: number;
    importanceWeight: number;
    adjustment: number;
  }[] = [];
  let weightedZScoreSum = 0;
  let totalImportanceWeight = 0;
  
  tagObjects.forEach(tagObj => {
    const tag = tagObj.name;
    const importance = tagObj.importance;
    const normalizedTag = normalizeTag(tag);
    const activitiesWithTag = userActivities.filter(activity => 
      activity.tags && activity.tags.some(actTag => normalizeTag(actTag) === normalizedTag)
    );
    
    if (activitiesWithTag.length >= 2) { // Need at least 2 activities for meaningful statistics
      const tagElos = activitiesWithTag.map(a => a.elo);
      const tagAvgElo = tagElos.reduce((sum, elo) => sum + elo, 0) / tagElos.length;
      const tagVariance = tagElos.reduce((sum, elo) => sum + Math.pow(elo - tagAvgElo, 2), 0) / tagElos.length;
      const tagStdDev = Math.sqrt(tagVariance);
      
      // Calculate proper group z-score using standard error of the mean
      // This measures how statistically significant the tag's deviation from overall average is
      const standardError = tagStdDev / Math.sqrt(activitiesWithTag.length);
      const zScore = standardError > 0 ? (tagAvgElo - overallAvgElo) / standardError : 0;
      
      // Weight this z-score by the tag's importance
      const importanceWeight = importance / 5; // Normalize importance to 0-1
      weightedZScoreSum += zScore * importanceWeight;
      totalImportanceWeight += importanceWeight;
      
      tagAnalysis.push({
        tag,
        importance,
        userAvgElo: Number(tagAvgElo.toFixed(1)),
        overallAvgElo: Number(overallAvgElo.toFixed(1)),
        standardDeviation: Number(tagStdDev.toFixed(1)),
        standardError: Number((tagStdDev / Math.sqrt(activitiesWithTag.length)).toFixed(2)),
        zScore: Number(zScore.toFixed(2)),
        activityCount: activitiesWithTag.length,
        importanceWeight: Number(importanceWeight.toFixed(2)),
        adjustment: Number((zScore * importanceWeight).toFixed(2))
      });
      
      calculationSteps.push(`Tag "${tag}" (importance=${importance}): ${activitiesWithTag.length} activities, avg=${tagAvgElo.toFixed(1)}, SE=${(tagStdDev / Math.sqrt(activitiesWithTag.length)).toFixed(2)}, z=${zScore.toFixed(2)}`);
    } else {
      calculationSteps.push(`Tag "${tag}" (importance=${importance}): Only ${activitiesWithTag.length} activities (insufficient for statistics)`);
    }
  });
  
  // Calculate overall weighted z-score
  const overallWeightedZScore = totalImportanceWeight > 0 ? weightedZScoreSum / totalImportanceWeight : 0;
  calculationSteps.push(`Overall weighted z-score: ${overallWeightedZScore.toFixed(3)}`);
  
  // Step 3: Apply tag-based adjustment using proper statistical significance
  calculationSteps.push(`STEP 3: Apply tag-based adjustment using statistical significance`);
  
  // Use statistical significance of weighted z-score for adjustment
  // Z-scores > 2 are statistically significant (95% confidence)
  // Z-scores > 3 are highly significant (99.7% confidence)
  // Maximum adjustment is +/- 3.0 points for highly significant deviations
  const maxAdjustment = 3.0;
  
  // Convert z-score to adjustment using sigmoid-like function
  // This provides strong adjustments for statistically significant deviations
  // but prevents completely extreme scores
  const rawAdjustment = Math.tanh(overallWeightedZScore / 3.0) * maxAdjustment;
  
  // Reduce adjustment slightly if Claude score is already extreme to prevent impossible scores
  const distanceFromMiddle = Math.abs(claudeBaseScore - 5.5); // 5.5 is middle of 0.5-10 scale
  const extremenessFactor = Math.max(0.6, 1 - (distanceFromMiddle / 4.5) * 0.4); // Reduce by up to 40% near extremes
  const finalAdjustment = rawAdjustment * extremenessFactor;
  
  const finalScore = Math.max(0.5, Math.min(10.0, claudeBaseScore + finalAdjustment));
  
  calculationSteps.push(`Base score: ${claudeBaseScore.toFixed(1)}`);
  calculationSteps.push(`Weighted z-score: ${overallWeightedZScore.toFixed(3)} (using standard errors for statistical significance)`);
  calculationSteps.push(`Raw adjustment: tanh(${overallWeightedZScore.toFixed(3)} ÷ 3) × ${maxAdjustment} = ${rawAdjustment.toFixed(2)}`);
  calculationSteps.push(`Extremeness factor: ${extremenessFactor.toFixed(2)} (prevents impossible scores)`);
  calculationSteps.push(`Final adjustment: ${rawAdjustment.toFixed(2)} × ${extremenessFactor.toFixed(2)} = ${finalAdjustment.toFixed(2)}`);
  calculationSteps.push(`Final hybrid score: ${claudeBaseScore.toFixed(1)} + ${finalAdjustment.toFixed(2)} = ${finalScore.toFixed(1)}/10`);
  
  // Add interpretation of statistical significance
  if (Math.abs(overallWeightedZScore) > 3) {
    calculationSteps.push(`→ Highly significant preference pattern (99.7% confidence)`);
  } else if (Math.abs(overallWeightedZScore) > 2) {
    calculationSteps.push(`→ Statistically significant preference pattern (95% confidence)`);
  } else if (Math.abs(overallWeightedZScore) > 1) {
    calculationSteps.push(`→ Moderate preference pattern detected`);
  } else {
    calculationSteps.push(`→ Weak or no clear preference pattern`);
  }
  
  let explanation = `Hybrid prediction: ${finalScore.toFixed(1)}/10`;
  if (Math.abs(finalAdjustment) > 0.1) {
    explanation += ` (Claude base: ${claudeBaseScore.toFixed(1)}, tag adjustment: ${finalAdjustment > 0 ? '+' : ''}${finalAdjustment.toFixed(1)})`;
  }
  
  // Generate user-friendly insights
  const likedSimilarActivities = activitiesWithElo
    .filter(({ elo }) => elo > overallAvgElo)
    .slice(0, 3)
    .map(({ title }) => title);
  
  const enjoyedTags = tagAnalysis
    .filter(analysis => analysis.zScore > 0.5 && analysis.activityCount >= 3)
    .slice(0, 3)
    .map(analysis => analysis.tag);
  
  const dislikedTags = tagAnalysis
    .filter(analysis => analysis.zScore < -0.5 && analysis.activityCount >= 3)
    .slice(0, 3)
    .map(analysis => analysis.tag);
  
  const personalityInsights: string[] = [];
  
  // Add insights based on score and similar activities
  if (finalScore >= 8) {
    personalityInsights.push(`This person would likely love this type of event`);
  } else if (finalScore >= 6.5) {
    personalityInsights.push(`This person would probably enjoy this event`);
  } else if (finalScore >= 4) {
    personalityInsights.push(`This person might be neutral about this event`);
  } else {
    personalityInsights.push(`This person would likely prefer other activities`);
  }
  
  if (likedSimilarActivities.length > 0) {
    personalityInsights.push(`They enjoyed similar activities like ${likedSimilarActivities.join(', ')}`);
  }
  
  if (enjoyedTags.length > 0) {
    personalityInsights.push(`They tend to enjoy ${enjoyedTags.join(', ')} activities`);
  }
  
  // Add tag-specific insights
  for (const analysis of tagAnalysis.slice(0, 2)) {
    if (analysis.adjustment > 0.3) {
      personalityInsights.push(`Strong preference for ${analysis.tag} activities (${analysis.activityCount} examples)`);
    } else if (analysis.adjustment < -0.3) {
      personalityInsights.push(`Generally avoids ${analysis.tag} activities (${analysis.activityCount} examples)`);
    }
  }
  
  return {
    hybridScore: Number(finalScore.toFixed(1)),
    hybridExplanation: explanation,
    insights: {
      likedSimilarActivities,
      enjoyedTags,
      dislikedTags,
      personalityInsights
    },
    hybridBreakdown: {
      calculationSteps,
      claudeBaseScore: Number(claudeBaseScore.toFixed(1)),
      tagAnalysis: tagAnalysis.map(analysis => ({
        ...analysis,
        topActivities: userActivities
          .filter(activity => activity.tags && activity.tags.some(tag => normalizeTag(tag) === normalizeTag(analysis.tag)))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 3)
          .map(a => a.title)
      })),
      finalAdjustment: Number(finalAdjustment.toFixed(2)),
      similarActivitiesUsed: activitiesWithElo.map(({ title, similarity, elo, explanation }) => ({
        title,
        similarity,
        elo,
        explanation
      }))
    }
  };
}

// Main function to analyze custom event and predict for all users
export async function analyzeCustomEventForAllUsers(eventDescription: string): Promise<{
  eventAnalysis: CustomEventAnalysis;
  userPredictions: UserPrediction[];
}> {
  try {
    console.log('Starting full custom event analysis for:', eventDescription);
    
    // Step 1: Get all qualified users (minimum 10 matchups for testing)
    const qualifiedUsers = await getQualifiedUsersForEventAnalysis(10);
    console.log(`Found ${qualifiedUsers.length} qualified users`);
    
    // Step 2: Analyze the custom event AND get Claude's similarity analysis in one call
    // Use the first user's activity data as the master list since all users have the same base activities
    const masterActivityList = qualifiedUsers.length > 0 ? qualifiedUsers[0].activityData : [];
    const eventAnalysisWithSimilarities = await analyzeCustomEvent(eventDescription, masterActivityList);
    
    const eventAnalysis: CustomEventAnalysis = {
      title: eventAnalysisWithSimilarities.title,
      subtitle: eventAnalysisWithSimilarities.subtitle,
      dimensions: eventAnalysisWithSimilarities.dimensions,
      tags: eventAnalysisWithSimilarities.tags
    };
    
    const claudeSimilarActivities = eventAnalysisWithSimilarities.similarActivities || [];
    console.log('Claude found similar activities:', claudeSimilarActivities.map(a => `${a.title} (${a.similarity})`));
    
    // Step 3: Predict enjoyment for each user using hybrid approach
    const userPredictions: UserPrediction[] = [];
    
    for (const user of qualifiedUsers) {
      // Get hybrid prediction combining Claude semantic analysis with tag-based ELO statistics
      const hybridPrediction = predictUserEnjoymentHybrid(claudeSimilarActivities, eventAnalysis.tags, user.activityData);
      
      userPredictions.push({
        username: user.username,
        enjoymentScore: hybridPrediction.hybridScore,
        explanation: hybridPrediction.hybridExplanation,
        insights: hybridPrediction.insights,
        hybridBreakdown: hybridPrediction.hybridBreakdown
      });
    }
    
    console.log(`Generated predictions for ${userPredictions.length} users`);
    
    return {
      eventAnalysis,
      userPredictions: userPredictions.sort((a, b) => b.enjoymentScore - a.enjoymentScore)
    };
  } catch (error) {
    console.error('Error in custom event analysis:', error);
    throw error;
  }
}