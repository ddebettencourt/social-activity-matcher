import { Activity, PreferenceDriver, PreferenceStrength } from '@/types/quiz';
import { 
  dimensionsMeta, 
  K_FACTOR_STRONG,
  K_FACTOR_SOMEWHAT,
  K_FACTOR_TIE,
  K_FACTOR_DIM_SIM_PROPAGATION, 
  K_FACTOR_TAG_PROPAGATION, 
  SIMILARITY_THRESHOLD_FOR_DIM_PROPAGATION 
} from './constants';

export function getKFactorForStrength(strength: PreferenceStrength): number {
  switch (strength) {
    case 'strong': return K_FACTOR_STRONG;
    case 'somewhat': return K_FACTOR_SOMEWHAT;
    case 'tie': return K_FACTOR_TIE;
    default: return K_FACTOR_SOMEWHAT;
  }
}

export function calculateExpectedScore(elo1: number, elo2: number): number {
  return 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
}

export function updateSingleELO(elo: number, expectedScore: number, actualScore: number, kFactorToUse: number): number {
  return Math.round(elo + kFactorToUse * (actualScore - expectedScore));
}

export function calculateSimilarity(act1: Activity, act2: Activity): number { 
  if (!act1 || !act2) return 0;
  let sumAbsDiff = 0;
  let numComparedDimensions = 0;
  
  dimensionsMeta.forEach(dim => {
    if (typeof act1[dim.key] === 'number' && typeof act2[dim.key] === 'number') {
      sumAbsDiff += Math.abs(act1[dim.key] - act2[dim.key]);
      numComparedDimensions++;
    }
  });
  
  if (numComparedDimensions === 0) return 0;
  const maxPossibleSumDiff = numComparedDimensions * 9; 
  if (maxPossibleSumDiff === 0) return 1; 
  const normalizedDistance = sumAbsDiff / maxPossibleSumDiff;
  return 1 - normalizedDistance; 
}

export function processChoice(
  actDisplayedA: Activity, 
  actDisplayedB: Activity, 
  outcomeForDisplayedA: number,
  activityData: Activity[],
  preferenceStrength: PreferenceStrength = 'somewhat'
): Activity[] {
  if (!actDisplayedA || !actDisplayedB) { 
    console.error("processChoice: Missing activity objects."); 
    return activityData; 
  }
  
  console.groupCollapsed(`processChoice: Displayed A:"${actDisplayedA.title}" (ELO:${actDisplayedA.elo}) vs Displayed B:"${actDisplayedB.title}" (ELO:${actDisplayedB.elo}). Outcome for Displayed A: ${outcomeForDisplayedA}, Strength: ${preferenceStrength}`);

  const updatedData = [...activityData];
  const actA_data = updatedData.find(a => a.id === actDisplayedA.id);
  const actB_data = updatedData.find(a => a.id === actDisplayedB.id);

  if (!actA_data || !actB_data) {
    console.error("processChoice: Could not find activity objects in main data array.");
    console.groupEnd();
    return activityData;
  }

  const kFactor = getKFactorForStrength(preferenceStrength);
  const expectedA = calculateExpectedScore(actA_data.elo, actB_data.elo);
  const newEloA = updateSingleELO(actA_data.elo, expectedA, outcomeForDisplayedA, kFactor);
  const newEloB = updateSingleELO(actB_data.elo, (1 - expectedA), (1 - outcomeForDisplayedA), kFactor);

  console.log(`   Direct ELO Update: A (${actA_data.title}): ${actA_data.elo} -> ${newEloA}. B (${actB_data.title}): ${actB_data.elo} -> ${newEloB}`);
  actA_data.elo = newEloA;
  actB_data.elo = newEloB;
  actA_data.eloUpdateCount = (actA_data.eloUpdateCount || 0) + 1;
  actB_data.eloUpdateCount = (actB_data.eloUpdateCount || 0) + 1;

  if (outcomeForDisplayedA === 1) { 
    actA_data.wins = (actA_data.wins || 0) + 1;
    actA_data.chosenCount = (actA_data.chosenCount || 0) + 1;
  } else if (outcomeForDisplayedA === 0) { 
    actB_data.wins = (actB_data.wins || 0) + 1;
    actB_data.chosenCount = (actB_data.chosenCount || 0) + 1;
  }
  actA_data.matchups = (actA_data.matchups || 0) + 1;
  actB_data.matchups = (actB_data.matchups || 0) + 1;

  // ELO Propagation
  if (outcomeForDisplayedA === 1 || outcomeForDisplayedA === 0) {
    const winner = (outcomeForDisplayedA === 1) ? actA_data : actB_data;
    const loser = (outcomeForDisplayedA === 1) ? actB_data : actA_data;
    console.log(`   Propagating ELO. Winner: ${winner.title}, Loser: ${loser.title}`);

    const allTagsFrequency: Record<string, number> = {}; 
    updatedData.forEach(act => {
      (act.tags || []).forEach(tag => {
        allTagsFrequency[tag] = (allTagsFrequency[tag] || 0) + 1;
      });
    });

    // Calculate all propagation changes first (without applying them)
    const propagationChanges: { activityId: string; change: number; oldElo: number }[] = [];

    updatedData.forEach(otherAct => {
      if (otherAct.id === winner.id || otherAct.id === loser.id) return;

      let netEloChangeForOther = 0;

      // 1. Dimensional Similarity Propagation
      const simToWinnerDimensional = calculateSimilarity(otherAct, winner);
      if (simToWinnerDimensional > SIMILARITY_THRESHOLD_FOR_DIM_PROPAGATION) {
        const expectedOtherVsLoser = calculateExpectedScore(otherAct.elo, loser.elo);
        const eloChangeDimWin = K_FACTOR_DIM_SIM_PROPAGATION * simToWinnerDimensional * (1 - expectedOtherVsLoser);
        netEloChangeForOther += eloChangeDimWin;
        console.log(`     DimSim (Win-Like): ${otherAct.title.substring(0,10)} (sim to ${winner.title.substring(0,10)}: ${simToWinnerDimensional.toFixed(2)}) -> +${eloChangeDimWin.toFixed(2)} ELO`);
      }

      const simToLoserDimensional = calculateSimilarity(otherAct, loser);
      if (simToLoserDimensional > SIMILARITY_THRESHOLD_FOR_DIM_PROPAGATION) {
        const expectedOtherVsWinner = calculateExpectedScore(otherAct.elo, winner.elo);
        const eloChangeDimLoss = K_FACTOR_DIM_SIM_PROPAGATION * simToLoserDimensional * (0 - expectedOtherVsWinner);
        netEloChangeForOther += eloChangeDimLoss;
        console.log(`     DimSim (Loss-Like): ${otherAct.title.substring(0,10)} (sim to ${loser.title.substring(0,10)}: ${simToLoserDimensional.toFixed(2)}) -> ${eloChangeDimLoss.toFixed(2)} ELO`);
      }

      // 2. Tag-Based Propagation
      let netEloChangeFromTags = 0;
      (winner.tags || []).forEach(tag => {
        if ((otherAct.tags || []).includes(tag)) {
          const tagCount = allTagsFrequency[tag] || 1;
          const rarityWeight = updatedData.length / tagCount; 
          const normalizedRarity = Math.min(3, Math.max(0.5, rarityWeight / 5)); 
          const eloBoost = K_FACTOR_TAG_PROPAGATION * (normalizedRarity / 3) * 0.10;
          netEloChangeFromTags += eloBoost;
        }
      });
      (loser.tags || []).forEach(tag => {
        if ((otherAct.tags || []).includes(tag)) {
          const tagCount = allTagsFrequency[tag] || 1;
          const rarityWeight = updatedData.length / tagCount;
          const normalizedRarity = Math.min(3, Math.max(0.5, rarityWeight / 5));
          const eloPenalty = K_FACTOR_TAG_PROPAGATION * (normalizedRarity / 3) * 0.10;
          netEloChangeFromTags -= eloPenalty;
        }
      });
      
      if (Math.abs(netEloChangeFromTags) > 0.01) {
        console.log(`       Tag Influence on "${otherAct.title.substring(0,10)}": Net ELO change from tags: ${netEloChangeFromTags.toFixed(2)}`);
        netEloChangeForOther += netEloChangeFromTags;
      }
      
      // Store the change for later normalization
      if (Math.abs(netEloChangeForOther) > 0.01) {
        propagationChanges.push({
          activityId: otherAct.id,
          change: netEloChangeForOther,
          oldElo: otherAct.elo
        });
      }
    });

    // Normalize propagation changes to be zero-sum
    const totalPropagationChange = propagationChanges.reduce((sum, change) => sum + change.change, 0);
    console.log(`   Total propagation change before normalization: ${totalPropagationChange.toFixed(2)}`);

    if (propagationChanges.length > 0 && Math.abs(totalPropagationChange) > 0.01) {
      // Calculate normalization factor to make sum = 0
      const avgChange = totalPropagationChange / propagationChanges.length;
      
      // Apply normalized changes
      propagationChanges.forEach(propChange => {
        const normalizedChange = propChange.change - avgChange;
        const activity = updatedData.find(a => a.id === propChange.activityId);
        if (activity) {
          activity.elo = Math.round(propChange.oldElo + normalizedChange);
          activity.eloUpdateCount = (activity.eloUpdateCount || 0) + 0.25;
          console.log(`       NORMALIZED PROPAGATED ELO Change for "${activity.title.substring(0,15)}": ${propChange.oldElo} -> ${activity.elo} (Original: ${propChange.change.toFixed(2)}, Normalized: ${normalizedChange.toFixed(2)})`);
        }
      });
      
      const finalTotalChange = propagationChanges.reduce((sum, change) => sum + (change.change - avgChange), 0);
      console.log(`   Total propagation change after normalization: ${finalTotalChange.toFixed(2)}`);
    } else if (propagationChanges.length > 0) {
      // Apply changes as-is if total is already near zero
      propagationChanges.forEach(propChange => {
        const activity = updatedData.find(a => a.id === propChange.activityId);
        if (activity) {
          activity.elo = Math.round(propChange.oldElo + propChange.change);
          activity.eloUpdateCount = (activity.eloUpdateCount || 0) + 0.25;
          console.log(`       TOTAL PROPAGATED ELO Change for "${activity.title.substring(0,15)}": ${propChange.oldElo} -> ${activity.elo} (Net Delta: ${propChange.change.toFixed(2)})`);
        }
      });
    }
  } else {
    console.log("   Draw/Both Bad - No ELO propagation by tags or similarity.");
  }
  
  console.groupEnd();
  return updatedData;
}

export function calculateCorrelation(arrX: number[], arrY: number[]): number {
  if (arrX.length !== arrY.length || arrX.length < 2) {
    console.warn("calculateCorrelation: Not enough data points or mismatched arrays. X length:", arrX.length, "Y length:", arrY.length);
    return NaN;
  }
  const n = arrX.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    if (typeof arrX[i] !== 'number' || typeof arrY[i] !== 'number' || isNaN(arrX[i]) || isNaN(arrY[i])) {
      console.warn("calculateCorrelation: Non-numeric or NaN data found in arrays. X:", arrX[i], "Y:", arrY[i]);
      return NaN; 
    }
    sumX += arrX[i];
    sumY += arrY[i];
    sumXY += arrX[i] * arrY[i];
    sumX2 += arrX[i] * arrX[i];
    sumY2 += arrY[i] * arrY[i];
  }
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) {
    console.warn("calculateCorrelation: Denominator is zero (likely all X or all Y values are the same).");
    return NaN; 
  }
  return numerator / denominator;
}

export function calculatePreferenceDrivers(activities: Activity[]): PreferenceDriver[] {
  const eloScores = activities.map(act => act.elo);
  const preferenceDrivers: PreferenceDriver[] = [];
  
  dimensionsMeta.forEach(dim => {
    const dimScores = activities.map(act => act[dim.key]);
    const corr = calculateCorrelation(eloScores, dimScores);
    console.log(`Correlation for ${dim.label}: ${corr}`);
    preferenceDrivers.push({ 
      dimension: dim.label, 
      correlation: corr, 
      low: dim.low, 
      high: dim.high, 
      key: dim.key 
    });
  });
  
  return preferenceDrivers.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}