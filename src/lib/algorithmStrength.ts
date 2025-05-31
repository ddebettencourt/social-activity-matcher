import { Activity, MatchupPrediction, AlgorithmStrength, DimensionalDifference } from '@/types/quiz';
import { MIN_MATCHUPS_FOR_ALGORITHM, ALGORITHM_HISTORY_SIZE, TARGET_ALGORITHM_STRENGTH, dimensionsMeta } from './constants';
import { calculateExpectedScore } from './eloCalculations';

function calculateDimensionalDifferences(activityA: Activity, activityB: Activity): DimensionalDifference {
  const differences: DimensionalDifference = {};
  
  dimensionsMeta.forEach(dim => {
    const valueA = activityA[dim.key] || 5; // Default to middle if missing
    const valueB = activityB[dim.key] || 5;
    differences[dim.key] = Math.abs(valueA - valueB);
  });
  
  return differences;
}

export function makePrediction(
  activityA: Activity, 
  activityB: Activity, 
  activityData: Activity[], 
  matchupNumber: number
): MatchupPrediction {
  // Calculate ELO range for confidence weighting
  const elos = activityData.map(act => act.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const eloRange = maxElo - minElo;
  
  // Predict winner based on ELO ratings
  const expectedScoreA = calculateExpectedScore(activityA.elo, activityB.elo);
  const predictedWinnerId = expectedScoreA > 0.5 ? activityA.id : activityB.id;
  
  // Calculate confidence level based on ELO difference relative to full range
  const eloDifference = Math.abs(activityA.elo - activityB.elo);
  const confidenceLevel = eloRange > 0 ? eloDifference / eloRange : 0;
  
  // Calculate dimensional differences for learning
  const dimensionalDifferences = calculateDimensionalDifferences(activityA, activityB);
  
  return {
    matchupNumber,
    predictedWinnerId,
    actualWinnerId: null, // Will be filled in when user makes choice
    confidenceLevel,
    wasCorrect: null,
    eloA: activityA.elo,
    eloB: activityB.elo,
    eloRange,
    dimensionalDifferences
  };
}

export function updatePredictionWithResult(
  prediction: MatchupPrediction, 
  actualWinnerId: number
): MatchupPrediction {
  return {
    ...prediction,
    actualWinnerId,
    wasCorrect: prediction.predictedWinnerId === actualWinnerId
  };
}

function calculateDimensionalPredictiveness(predictionHistory: MatchupPrediction[]): Record<string, number> {
  const dimensionalAccuracy: Record<string, { correct: number; total: number; weightedCorrect: number; weightedTotal: number }> = {};
  
  // Initialize tracking for each dimension
  dimensionsMeta.forEach(dim => {
    dimensionalAccuracy[dim.key] = { correct: 0, total: 0, weightedCorrect: 0, weightedTotal: 0 };
  });
  
  // Analyze each prediction
  predictionHistory.filter(p => p.wasCorrect !== null).forEach(prediction => {
    dimensionsMeta.forEach(dim => {
      const dimensionalDiff = prediction.dimensionalDifferences[dim.key] || 0;
      
      // Only count predictions where this dimension had a meaningful difference
      if (dimensionalDiff >= 2) { // At least 2-point difference on 1-10 scale
        const weight = dimensionalDiff / 9; // Weight by how different they were (0-1)
        
        dimensionalAccuracy[dim.key].total += 1;
        dimensionalAccuracy[dim.key].weightedTotal += weight;
        
        if (prediction.wasCorrect) {
          dimensionalAccuracy[dim.key].correct += 1;
          dimensionalAccuracy[dim.key].weightedCorrect += weight;
        }
      }
    });
  });
  
  // Calculate predictiveness score for each dimension
  const dimensionalPredictiveness: Record<string, number> = {};
  dimensionsMeta.forEach(dim => {
    const data = dimensionalAccuracy[dim.key];
    if (data.weightedTotal > 0) {
      dimensionalPredictiveness[dim.key] = data.weightedCorrect / data.weightedTotal;
    } else {
      dimensionalPredictiveness[dim.key] = 0.5; // Default to neutral if no data
    }
  });
  
  return dimensionalPredictiveness;
}

export function calculateAlgorithmStrength(
  predictionHistory: MatchupPrediction[], 
  currentMatchup: number
): AlgorithmStrength {
  // Only start calculating after minimum matchups
  if (currentMatchup < MIN_MATCHUPS_FOR_ALGORITHM) {
    return {
      score: 0,
      confidence: 'low',
      isReady: false,
      predictionHistory
    };
  }
  
  // Use last N predictions for calculation
  const recentPredictions = predictionHistory
    .filter(p => p.wasCorrect !== null)
    .slice(-ALGORITHM_HISTORY_SIZE);
  
  if (recentPredictions.length === 0) {
    return {
      score: 0,
      confidence: 'low',
      isReady: false,
      predictionHistory
    };
  }
  
  // Calculate dimensional learning
  const dimensionalPredictiveness = calculateDimensionalPredictiveness(recentPredictions);
  
  // Calculate weighted accuracy score with dimensional learning boost
  let totalWeight = 0;
  let weightedCorrect = 0;
  
  recentPredictions.forEach(prediction => {
    // Base weight by confidence level
    let weight = Math.max(0.1, prediction.confidenceLevel);
    
    // Boost weight if dimensional differences align with learned patterns
    let dimensionalBoost = 0;
    let dimensionalCount = 0;
    
    dimensionsMeta.forEach(dim => {
      const dimDiff = prediction.dimensionalDifferences[dim.key] || 0;
      if (dimDiff >= 2) { // Only consider meaningful differences
        const dimPredictiveness = dimensionalPredictiveness[dim.key];
        dimensionalBoost += dimPredictiveness;
        dimensionalCount += 1;
      }
    });
    
    // Apply modest dimensional boost (max 20% increase in weight)
    if (dimensionalCount > 0) {
      const avgDimensionalPredictiveness = dimensionalBoost / dimensionalCount;
      const dimensionalMultiplier = 1 + 0.2 * (avgDimensionalPredictiveness - 0.5); // -0.1 to +0.1 range, so 0.9x to 1.1x
      weight *= Math.max(0.8, Math.min(1.2, dimensionalMultiplier)); // Cap the boost
    }
    
    totalWeight += weight;
    
    if (prediction.wasCorrect) {
      weightedCorrect += weight;
    }
  });
  
  const score = totalWeight > 0 ? weightedCorrect / totalWeight : 0;
  
  // Determine confidence level based on score and sample size
  const sampleRatio = recentPredictions.length / ALGORITHM_HISTORY_SIZE;
  const minPredictionsForReady = 20; // Need at least 20 predictions TOTAL before considering ready
  
  // Count total predictions (not just recent ones)
  const totalPredictions = predictionHistory.filter(p => p.wasCorrect !== null).length;
  
  let confidence: 'low' | 'medium' | 'high' = 'low';
  
  if (score >= 0.8 && recentPredictions.length >= 8) {
    confidence = 'high';
  } else if (score >= 0.65 && recentPredictions.length >= 5) {
    confidence = 'medium';
  }
  
  // Calculate decaying threshold - Q30: 0.85 → Q70: 0.75 (then stops)
  // This prevents users from getting stuck in endless quiz loops
  let adjustedThreshold = TARGET_ALGORITHM_STRENGTH; // 0.85
  if (currentMatchup > 30) {
    // Linear decay from Q30 to Q70: 0.85 → 0.75
    const decayProgress = Math.min(1, (currentMatchup - 30) / 40); // 40 matchups = Q30 to Q70
    adjustedThreshold = 0.85 - (decayProgress * 0.10); // 0.85 - 0.10 = 0.75 at Q70
  }
  
  // Algorithm is ready when:
  // 1. Score meets adjusted threshold AND
  // 2. We have at least 20 total predictions AND  
  // 3. Sample ratio is good (at least 70% of target history size)
  const isReady = score >= adjustedThreshold && 
                  totalPredictions >= minPredictionsForReady && 
                  sampleRatio >= 0.7;
  
  return {
    score,
    confidence,
    isReady,
    predictionHistory
  };
}

export function getAlgorithmStrengthLabel(strength: AlgorithmStrength): string {
  const percentage = Math.round(strength.score * 100);
  
  if (strength.confidence === 'high') {
    return `Algorithm Mastery: ${percentage}% (Excellent!)`;
  } else if (strength.confidence === 'medium') {
    return `Algorithm Learning: ${percentage}% (Getting there...)`;
  } else {
    return `Algorithm Warming Up: ${percentage}% (Learning your style...)`;
  }
}

export function getAlgorithmStrengthColor(strength: AlgorithmStrength): string {
  if (strength.confidence === 'high') {
    return 'text-emerald-600';
  } else if (strength.confidence === 'medium') {
    return 'text-amber-600';
  } else {
    return 'text-blue-600';
  }
}