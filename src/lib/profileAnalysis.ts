import { Activity } from '@/types/quiz';

export interface TagAnalysis {
  tag: string;
  activityCount: number;
  userAvgElo: number;
  overallAvgElo: number;
  standardDeviation: number;
  zScore: number;
  percentile: number;
  topActivities: string[];
  significance: 'Highly Significant' | 'Significant' | 'Moderate' | 'Weak' | 'None';
}

export interface ProfileSummary {
  username: string;
  totalMatchups: number;
  completionDate: string;
  overallStats: {
    meanElo: number;
    medianElo: number;
    standardDeviation: number;
    range: { min: number; max: number };
    q1: number;
    q3: number;
  };
  allActivities: Array<{
    rank: number;
    title: string;
    elo: number;
    percentile: number;
  }>;
  tagAnalysis: TagAnalysis[];
  dimensions: {
    socialIntensity: { preference: string; score: number; explanation: string };
    structure: { preference: string; score: number; explanation: string };
    novelty: { preference: string; score: number; explanation: string };
    formality: { preference: string; score: number; explanation: string };
    energyLevel: { preference: string; score: number; explanation: string };
    scaleImmersion: { preference: string; score: number; explanation: string };
  };
}

// Normalize tag for comparison (handle hyphens vs spaces)
function normalizeTag(tag: string): string {
  return tag.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, '&')
    .trim();
}

// Get all unique tags from activities
function getAllTags(activities: Activity[]): string[] {
  const tagSet = new Set<string>();
  activities.forEach(activity => {
    if (activity.tags) {
      activity.tags.forEach(tag => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
}

// Calculate tag z-score analysis
function analyzeTag(tag: string, userActivities: Activity[]): TagAnalysis | null {
  const normalizedTag = normalizeTag(tag);
  
  // Find activities with this tag
  const activitiesWithTag = userActivities.filter(activity => 
    activity.tags && activity.tags.some(actTag => normalizeTag(actTag) === normalizedTag)
  );
  
  if (activitiesWithTag.length < 3) {
    return null; // Need at least 3 activities for meaningful statistics
  }
  
  // Calculate overall statistics
  const allElos = userActivities.map(a => a.elo);
  const overallAvgElo = allElos.reduce((sum, elo) => sum + elo, 0) / allElos.length;
  const overallVariance = allElos.reduce((sum, elo) => sum + Math.pow(elo - overallAvgElo, 2), 0) / allElos.length;
  const overallStdDev = Math.sqrt(overallVariance);
  
  // Calculate tag statistics
  const tagElos = activitiesWithTag.map(a => a.elo);
  const tagAvgElo = tagElos.reduce((sum, elo) => sum + elo, 0) / tagElos.length;
  const tagVariance = tagElos.reduce((sum, elo) => sum + Math.pow(elo - tagAvgElo, 2), 0) / tagElos.length;
  const tagStdDev = Math.sqrt(tagVariance);
  
  // Calculate proper pooled z-score
  const rawStandardDeviations = overallStdDev > 0 ? (tagAvgElo - overallAvgElo) / overallStdDev : 0;
  const n = activitiesWithTag.length;
  const pooledFactor = Math.sqrt(n / (1 + 0.3 * (n - 1))); // Using 0.3 correlation
  const zScore = rawStandardDeviations * pooledFactor;
  
  // Calculate percentile (where this tag ranks among user's preferences)
  const sortedElos = allElos.sort((a, b) => b - a);
  let rank = 0;
  for (let i = 0; i < sortedElos.length; i++) {
    if (tagAvgElo > sortedElos[i]) {
      rank = i;
      break;
    }
    rank = i + 1;
  }
  const percentile = 1 - (rank / sortedElos.length);
  
  // Determine significance level
  let significance: TagAnalysis['significance'];
  const absZ = Math.abs(zScore);
  if (absZ > 3) significance = 'Highly Significant';
  else if (absZ > 2) significance = 'Significant'; 
  else if (absZ > 1) significance = 'Moderate';
  else if (absZ > 0.5) significance = 'Weak';
  else significance = 'None';
  
  return {
    tag,
    activityCount: activitiesWithTag.length,
    userAvgElo: Number(tagAvgElo.toFixed(1)),
    overallAvgElo: Number(overallAvgElo.toFixed(1)),
    standardDeviation: Number(tagStdDev.toFixed(1)),
    zScore: Number(zScore.toFixed(2)),
    percentile: Number(percentile.toFixed(3)),
    topActivities: activitiesWithTag
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5)
      .map(a => a.title),
    significance
  };
}

// Analyze dimensional preferences
function analyzeDimensions(activities: Activity[]): ProfileSummary['dimensions'] {
  const dimensionMapping = {
    socialIntensity: 'socialIntensity',
    structure: 'structureSpontaneity', 
    novelty: 'familiarityNovelty',
    formality: 'formalityGradient',
    energyLevel: 'energyLevel',
    scaleImmersion: 'scaleImmersion'
  } as const;
  
  const results: Partial<ProfileSummary['dimensions']> = {};
  
  Object.entries(dimensionMapping).forEach(([dimName, activityProp]) => {
    // Calculate weighted average (weight by ELO to see preferences)
    let weightedSum = 0;
    let weightSum = 0;
    
    activities.forEach(activity => {
      const dimValue = activity[activityProp as keyof Activity] as number;
      const weight = activity.elo - 1000; // Use ELO deviation from default as weight
      weightedSum += dimValue * weight;
      weightSum += weight;
    });
    
    const weightedAverage = weightSum > 0 ? weightedSum / weightSum : 5.5;
    const score = Number(weightedAverage.toFixed(1));
    
    // Generate preference description
    let preference = '';
    let explanation = '';
    
    switch (dimName) {
      case 'socialIntensity':
        if (score >= 7) {
          preference = 'Large Groups';
          explanation = 'Prefers big social gatherings and events with many people';
        } else if (score >= 4) {
          preference = 'Moderate Groups';
          explanation = 'Comfortable with medium-sized social settings';
        } else {
          preference = 'Intimate Settings';
          explanation = 'Prefers small, close-knit gatherings and one-on-one activities';
        }
        break;
      case 'structure':
        if (score >= 7) {
          preference = 'Highly Organized';
          explanation = 'Likes well-planned, structured activities with clear agendas';
        } else if (score >= 4) {
          preference = 'Semi-Structured';
          explanation = 'Enjoys a mix of planned and spontaneous elements';
        } else {
          preference = 'Spontaneous';
          explanation = 'Prefers unplanned, go-with-the-flow activities';
        }
        break;
      case 'novelty':
        if (score >= 7) {
          preference = 'Adventure Seeker';
          explanation = 'Loves new experiences and trying unfamiliar activities';
        } else if (score >= 4) {
          preference = 'Balanced Explorer';
          explanation = 'Enjoys mix of familiar favorites and new experiences';
        } else {
          preference = 'Comfort Zone';
          explanation = 'Prefers familiar, tried-and-true activities';
        }
        break;
      case 'formality':
        if (score >= 7) {
          preference = 'Formal/Elegant';
          explanation = 'Enjoys sophisticated, upscale, and polished experiences';
        } else if (score >= 4) {
          preference = 'Smart Casual';
          explanation = 'Comfortable with moderately formal settings';
        } else {
          preference = 'Casual/Relaxed';
          explanation = 'Prefers laid-back, informal atmospheres';
        }
        break;
      case 'energyLevel':
        if (score >= 7) {
          preference = 'High Energy';
          explanation = 'Loves active, dynamic, physically or mentally stimulating activities';
        } else if (score >= 4) {
          preference = 'Moderate Energy';
          explanation = 'Enjoys a balance of active and relaxed activities';
        } else {
          preference = 'Low Key';
          explanation = 'Prefers calm, peaceful, and restorative activities';
        }
        break;
      case 'scaleImmersion':
        if (score >= 7) {
          preference = 'Long-term Commitment';
          explanation = 'Enjoys immersive experiences and longer-duration activities';
        } else if (score >= 4) {
          preference = 'Moderate Duration';
          explanation = 'Comfortable with medium-length activities and commitments';
        } else {
          preference = 'Brief & Flexible';
          explanation = 'Prefers short, low-commitment activities';
        }
        break;
    }
    
    results[dimName as keyof ProfileSummary['dimensions']] = {
      preference,
      score,
      explanation
    };
  });
  
  return results as ProfileSummary['dimensions'];
}


// Generate comprehensive profile summary
export function generateProfileSummary(
  username: string,
  activityData: Activity[],
  totalMatchups: number
): ProfileSummary {
  if (activityData.length === 0) {
    // Return empty profile for users with no quiz data
    return {
      username,
      totalMatchups: 0,
      completionDate: 'No quiz data',
      overallStats: {
        meanElo: 0,
        medianElo: 0,
        standardDeviation: 0,
        range: { min: 0, max: 0 },
        q1: 0,
        q3: 0
      },
      allActivities: [],
      tagAnalysis: [],
      dimensions: {
        socialIntensity: { preference: 'Unknown', score: 0, explanation: 'No data' },
        structure: { preference: 'Unknown', score: 0, explanation: 'No data' },
        novelty: { preference: 'Unknown', score: 0, explanation: 'No data' },
        formality: { preference: 'Unknown', score: 0, explanation: 'No data' },
        energyLevel: { preference: 'Unknown', score: 0, explanation: 'No data' },
        scaleImmersion: { preference: 'Unknown', score: 0, explanation: 'No data' }
      }
    };
  }
  
  // Calculate overall statistics
  const elos = activityData.map(a => a.elo);
  const sortedElos = [...elos].sort((a, b) => a - b);
  const meanElo = elos.reduce((sum, elo) => sum + elo, 0) / elos.length;
  const variance = elos.reduce((sum, elo) => sum + Math.pow(elo - meanElo, 2), 0) / elos.length;
  const standardDeviation = Math.sqrt(variance);
  
  const medianElo = sortedElos.length % 2 === 0
    ? (sortedElos[sortedElos.length / 2 - 1] + sortedElos[sortedElos.length / 2]) / 2
    : sortedElos[Math.floor(sortedElos.length / 2)];
  
  const q1Index = Math.floor(sortedElos.length * 0.25);
  const q3Index = Math.floor(sortedElos.length * 0.75);
  const q1 = sortedElos[q1Index];
  const q3 = sortedElos[q3Index];
  
  // Get all activities ranked by ELO
  const allActivities = [...activityData]
    .sort((a, b) => b.elo - a.elo)
    .map((activity, index) => ({
      rank: index + 1,
      title: activity.title,
      elo: activity.elo,
      percentile: 1 - (index / activityData.length)
    }));
  
  // Analyze all tags
  const allTags = getAllTags(activityData);
  const tagAnalysis = allTags
    .map(tag => analyzeTag(tag, activityData))
    .filter((analysis): analysis is TagAnalysis => analysis !== null)
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)); // Sort by significance
  
  // Analyze dimensional preferences
  const dimensions = analyzeDimensions(activityData);
  
  // Return profile summary
  return {
    username,
    totalMatchups,
    completionDate: new Date().toISOString().split('T')[0], // Today's date as placeholder
    overallStats: {
      meanElo: Number(meanElo.toFixed(1)),
      medianElo: Number(medianElo.toFixed(1)),
      standardDeviation: Number(standardDeviation.toFixed(1)),
      range: { 
        min: Math.min(...elos), 
        max: Math.max(...elos) 
      },
      q1: Number(q1.toFixed(1)),
      q3: Number(q3.toFixed(1))
    },
    allActivities,
    tagAnalysis,
    dimensions
  };
}

// Generate copyable text summary for multiple profiles
export function generateCopyableProfileSummary(profiles: ProfileSummary[]): string {
  if (profiles.length === 0) {
    return 'No profiles selected.';
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  let output = `Profile Analysis Summary - ${timestamp}\n`;
  output += `====================================================\n\n`;
  output += `Selected Profiles: ${profiles.length}\n`;
  output += `Users: ${profiles.map(p => p.username).join(', ')}\n\n`;
  
  profiles.forEach((profile, index) => {
    output += `${index + 1}. ${profile.username.toUpperCase()}\n`;
    output += `${'='.repeat(profile.username.length + 3)}\n\n`;
    
    // Basic stats
    output += `Quiz Completion: ${profile.totalMatchups} matchups\n`;
    output += `Completion Date: ${profile.completionDate}\n\n`;
    
    if (profile.totalMatchups === 0) {
      output += `No quiz data available for this user.\n\n`;
      return;
    }
    
    // Overall statistics
    output += `OVERALL STATISTICS:\n`;
    output += `-`.repeat(20) + `\n`;
    output += `Mean ELO: ${profile.overallStats.meanElo}\n`;
    output += `Median ELO: ${profile.overallStats.medianElo}\n`;
    output += `Standard Deviation: ${profile.overallStats.standardDeviation}\n`;
    output += `Range: ${profile.overallStats.range.min} - ${profile.overallStats.range.max}\n`;
    output += `Quartiles: Q1=${profile.overallStats.q1}, Q3=${profile.overallStats.q3}\n\n`;
    
    // Dimensional preferences
    output += `DIMENSIONAL PREFERENCES:\n`;
    output += `-`.repeat(25) + `\n`;
    Object.entries(profile.dimensions).forEach(([dim, data]) => {
      const dimName = dim.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      output += `${dimName}: ${data.preference} (${data.score}/10)\n`;
    });
    output += `\n`;
    
    // All activities with percentiles
    output += `ALL ACTIVITIES (by percentile):\n`;
    output += `-`.repeat(32) + `\n`;
    profile.allActivities.forEach(activity => {
      output += `${activity.rank.toString().padStart(3)}. ${activity.title.padEnd(50)} ${(activity.percentile * 100).toFixed(1).padStart(5)}%\n`;
    });
    output += `\n`;
    
    // All tag analysis
    if (profile.tagAnalysis.length > 0) {
      output += `TAG ANALYSIS:\n`;
      output += `-`.repeat(13) + `\n`;
      output += `Tag Name                          Count   Z-Score   Percentile\n`;
      output += `-`.repeat(65) + `\n`;
      
      profile.tagAnalysis.forEach(tag => {
        output += `${tag.tag.padEnd(32)} ${tag.activityCount.toString().padStart(5)} `;
        output += `${tag.zScore.toString().padStart(7)} `;
        output += `${(tag.percentile * 100).toFixed(1).padStart(9)}%\n`;
      });
      output += `\n`;
    }
    
    output += `${'='.repeat(80)}\n\n`;
  });
  
  return output;
}