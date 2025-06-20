'use client'

import { useEffect, useState } from 'react';
import { Activity, PreferenceDriver, TagScore, User } from '@/types/quiz';
import { calculatePreferenceDrivers } from '@/lib/eloCalculations';
import { personaTraitMap } from '@/lib/constants';

interface ResultsViewProps {
  onRetakeQuiz: () => void;
  onClearData: () => void;
  currentUser: User | null;
  onCreateProfile: (username: string) => void;
  onBackToSplash: () => void;
  onBackToProfile?: () => void;
  activityData?: Activity[];
  totalMatchups?: number;
}

export default function ResultsView({ onRetakeQuiz, onClearData, currentUser, onCreateProfile, onBackToSplash, onBackToProfile, activityData: propsActivityData, totalMatchups: propsTotalMatchups }: ResultsViewProps) {
  const [activityData, setActivityData] = useState<Activity[]>([]);
  const [preferenceDrivers, setPreferenceDrivers] = useState<PreferenceDriver[]>([]);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [personaName, setPersonaName] = useState<string>("Calculating...");
  const [topTags, setTopTags] = useState<TagScore[]>([]);
  const [worstTags, setWorstTags] = useState<TagScore[]>([]);
  const [totalMatchups, setTotalMatchups] = useState<number>(0);

  useEffect(() => {
    loadAndProcessResults();
  }, []);

  const loadAndProcessResults = () => {
    console.log("loadAndProcessResults: Loading results...");
    
    // Use props data if available (for logged-in users), otherwise load from localStorage (anonymous users)
    let finalData: Activity[] | null = null;
    let matchupsCount = 0;
    
    if (propsActivityData && propsActivityData.length > 0) {
      console.log("Using props activity data for logged-in user");
      finalData = propsActivityData;
      matchupsCount = propsTotalMatchups || 0;
    } else {
      console.log("Loading from localStorage for anonymous user");
      const storedActivityData = localStorage.getItem('quizActivityELOs');
      const storedMatchups = localStorage.getItem('totalMatchupsPlayed');
      
      if (storedActivityData) {
        finalData = JSON.parse(storedActivityData);
        if (storedMatchups) {
          matchupsCount = JSON.parse(storedMatchups);
        }
      }
    }
    
    if (finalData && finalData.length > 0) {
      setActivityData(finalData);
      setTotalMatchups(matchupsCount);
      
      const drivers = calculatePreferenceDrivers(finalData);
      setPreferenceDrivers(drivers);
      
      generatePersonaName(drivers);
      calculateTopTags(finalData);
    } else {
      console.warn("No activity data found to display results");
    }
  };

  const generatePersonaName = (drivers: PreferenceDriver[]) => {
    console.log("generatePersonaName: Generating persona...");
    
    const validDrivers = drivers.filter(driver => !isNaN(driver.correlation) && Math.abs(driver.correlation) >= 0.05);
    
    if (validDrivers.length === 0) {
      setPersonaName("The Oracle is Pondering Your Vibe...");
      return;
    }

    let adj1 = "Balanced";
    let desc2 = "Explorer";

    const getTrait = (driver: PreferenceDriver, traitType: 'primary' | 'descriptor' = 'primary'): string | null => {
      if (!driver || isNaN(driver.correlation) || Math.abs(driver.correlation) < 0.05) {
        return null;
      }
      
      const dimMapEntry = personaTraitMap[driver.key];
      if (!dimMapEntry) {
        console.warn(`getTrait: No personaTraitMap entry for key: ${driver.key}`);
        return null;
      }
      
      const type = driver.correlation > 0 ? 'high' : 'low';
      const traitsObject = dimMapEntry[type];
      
      if (!traitsObject || !traitsObject[traitType] || !Array.isArray(traitsObject[traitType]) || traitsObject[traitType].length === 0) {
        console.warn(`getTrait: Missing or empty '${traitType}' array for ${driver.key} -> ${type}`);
        return null;
      }
      
      const traitArray = traitsObject[traitType];
      return traitArray[Math.floor(Math.random() * traitArray.length)];
    };

    adj1 = getTrait(validDrivers[0], 'primary') || adj1;
    
    if (validDrivers.length > 1) {
      desc2 = getTrait(validDrivers[1], 'descriptor') || desc2;
      
      if (adj1 && desc2 && adj1.toLowerCase() === desc2.toLowerCase()) {
        if (validDrivers.length > 2) {
          const newDesc2 = getTrait(validDrivers[2], 'descriptor');
          if (newDesc2 && newDesc2.toLowerCase() !== adj1.toLowerCase()) {
            desc2 = newDesc2;
          }
        } else {
          desc2 = "Maverick";
        }
      }
    } else if (validDrivers.length === 1) {
      desc2 = getTrait(validDrivers[0], 'descriptor') || desc2;
      if (adj1 && desc2 && adj1.toLowerCase() === desc2.toLowerCase()) {
        desc2 = "Maverick";
      }
    }

    setPersonaName(`You are a ${adj1} ${desc2}!`);
  };

  const calculateTopTags = (activities: Activity[]) => {
    if (!activities || activities.length === 0) {
      setTopTags([]);
      setWorstTags([]);
      return;
    }

    const tagMap = new Map<string, { totalElo: number; count: number; activities: Activity[] }>();
    
    activities.forEach(activity => {
      (activity.tags || []).forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { totalElo: 0, count: 0, activities: [] });
        }
        const tagData = tagMap.get(tag)!;
        tagData.totalElo += activity.elo;
        tagData.count++;
        tagData.activities.push(activity);
      });
    });

    // Calculate overall statistics
    const allElos = activities.map(a => a.elo);
    const meanElo = allElos.reduce((sum, elo) => sum + elo, 0) / allElos.length;
    const variance = allElos.reduce((sum, elo) => sum + Math.pow(elo - meanElo, 2), 0) / allElos.length;
    const stdDev = Math.sqrt(variance);

    const tagScores: TagScore[] = [];
    
    tagMap.forEach((data, tag) => {
      if (data.count > 0) {
        const averageElo = data.totalElo / data.count;
        
        // Calculate standard error of the mean for this tag group
        // Smaller groups need larger deviations to be significant
        const standardError = stdDev / Math.sqrt(data.count);
        
        // Calculate how many standard errors away from the mean this tag group is
        const zScore = (averageElo - meanElo) / standardError;
        
        // Use z-score as the ranking metric
        // Positive z-scores = above average, negative = below average
        // Higher absolute z-scores = more statistically significant
        tagScores.push({
          tag: tag,
          score: zScore,
          averageElo: Math.round(averageElo),
          activityCount: data.count
        });
      }
    });

    // Sort by z-score (descending for top tags)
    tagScores.sort((a, b) => b.score - a.score);
    setTopTags(tagScores.slice(0, 15));
    
    // Set worst tags (lowest z-scores, but only those with negative z-scores)
    const negativeTags = tagScores.filter(tag => tag.score < 0);
    setWorstTags(negativeTags.slice(-10).reverse()); // Get bottom 10, reverse for worst-first
  };

  const getPreferenceInterpretation = (driver: PreferenceDriver): string => {
    if (isNaN(driver.correlation)) {
      return `Could not determine correlation for ${driver.dimension} (likely not enough variance in data).`;
    }
    
    const strength = Math.abs(driver.correlation);
    if (strength > 0.35) {
      return driver.correlation > 0 
        ? `You strongly prefer activities that are <strong class="text-emerald-600">more ${driver.high}</strong>.`
        : `You strongly prefer activities that are <strong class="text-sky-600">more ${driver.low}</strong>.`;
    } else if (strength > 0.15) {
      return driver.correlation > 0 
        ? `You lean towards activities that are more ${driver.high}.`
        : `You lean towards activities that are more ${driver.low}.`;
    } else {
      return `${driver.dimension} doesn't seem to be a major factor in your choices.`;
    }
  };

  const sortedActivities = [...activityData].sort((a, b) => b.elo - a.elo);
  const topActivities = sortedActivities.slice(0, 10);
  const bottomActivities = sortedActivities.length <= 10 
    ? sortedActivities 
    : sortedActivities.slice(-10).reverse();

  const getPersonalityInsights = (): string[] => {
    const insights: string[] = [];
    const validDrivers = preferenceDrivers.filter(d => !isNaN(d.correlation) && Math.abs(d.correlation) > 0.15);
    
    validDrivers.slice(0, 3).forEach(driver => {
      if (driver.correlation > 0.35) {
        insights.push(`You're drawn to activities that are ${driver.high.toLowerCase()}`);
      } else if (driver.correlation < -0.35) {
        insights.push(`You prefer activities that are ${driver.low.toLowerCase()}`);
      } else if (driver.correlation > 0.15) {
        insights.push(`You lean towards ${driver.high.toLowerCase()} activities`);
      } else if (driver.correlation < -0.15) {
        insights.push(`You lean towards ${driver.low.toLowerCase()} activities`);
      }
    });
    
    // Add insight about top tags
    if (topTags.length > 0) {
      const topTag = topTags[0].tag.toLowerCase();
      insights.push(`You have a thing for ${topTag} activities`);
    }
    
    return insights.length > 0 ? insights : ["You have unique and interesting preferences!"];
  };

  const getActivityRecommendationReason = (activity: Activity, isTop: boolean): string => {
    const reasons = [];
    
    // Check which dimensions align with user preferences
    preferenceDrivers.slice(0, 2).forEach(driver => {
      if (Math.abs(driver.correlation) > 0.3) {
        const activityValue = activity[driver.key as keyof Activity] as number;
        if (driver.correlation > 0 && activityValue > 6) {
          reasons.push(`high ${driver.dimension.toLowerCase()}`);
        } else if (driver.correlation < 0 && activityValue < 5) {
          reasons.push(`low ${driver.dimension.toLowerCase()}`);
        }
      }
    });
    
    // Check tags
    if (topTags.length > 0 && activity.tags) {
      const topUserTags = topTags.slice(0, 3).map(t => t.tag);
      const matchingTags = activity.tags.filter(tag => topUserTags.includes(tag));
      if (matchingTags.length > 0) {
        reasons.push(matchingTags[0].toLowerCase());
      }
    }
    
    if (reasons.length === 0) {
      return isTop ? "fits your style perfectly" : "doesn't match your preferences";
    }
    
    return reasons.join(", ");
  };

  const personalityInsights = getPersonalityInsights();

  return (
    <div className="w-full max-w-4xl mx-auto py-6 md:py-8 px-4">
      <header className="text-center mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-light text-white mb-4">your activity personality revealed!</h1>
        <p className="text-gray-400 text-base md:text-lg">here&apos;s what we discovered about you</p>
      </header>
      
      <main className="space-y-6 md:space-y-8">
        {/* Big Personality Section */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6 md:p-8 text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{personaName}</h2>
          <div className="space-y-3">
            {personalityInsights.map((insight, index) => (
              <p key={index} className="text-lg text-gray-300 italic">
                ✨ {insight}
              </p>
            ))}
          </div>
        </section>

        {/* Top Tags Section */}
        {topTags.length > 0 && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏷️</span>
              <h2 className="text-2xl font-bold text-white">Your favorite types</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4 italic">
              These activity types really resonate with you (statistically speaking)...
            </p>
            <div className="flex flex-wrap gap-2">
              {topTags.slice(0, 8).map((tagScore, index) => (
                <div key={tagScore.tag} className="bg-gray-700/70 rounded-full px-4 py-2 border border-gray-600">
                  <span className="text-white font-medium">#{index + 1} {tagScore.tag}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({tagScore.activityCount} activities, avg ELO {tagScore.averageElo})
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Worst Tags Section */}
        {worstTags.length > 0 && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🚯</span>
              <h2 className="text-2xl font-bold text-white">Not really your vibe</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4 italic">
              These activity types consistently rank below your average...
            </p>
            <div className="flex flex-wrap gap-2">
              {worstTags.slice(0, 6).map((tagScore) => (
                <div key={tagScore.tag} className="bg-gray-700/70 rounded-full px-4 py-2 border border-gray-600">
                  <span className="text-gray-300 font-medium">{tagScore.tag}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({tagScore.activityCount} activities, avg ELO {tagScore.averageElo})
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Perfect For You Section */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎯</span>
            <h2 className="text-2xl font-bold text-white">Perfect for you!</h2>
          </div>
          <div className="space-y-3">
            {topActivities.slice(0, 5).map((activity, index) => (
              <div key={activity.id} className="bg-gray-700/70 rounded-lg p-4 border-l-4 border-emerald-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{activity.title}</h3>
                    <p className="text-gray-300 text-sm mb-2">{activity.subtitle}</p>
                    <p className="text-xs text-emerald-400 italic">
                      Why: {getActivityRecommendationReason(activity, true)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">#{index + 1}</div>
                    <div className="text-xs font-mono text-emerald-400">ELO {activity.elo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Probably Not Your Thing Section */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🚫</span>
            <h2 className="text-2xl font-bold text-white">Probably not your thing</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4 italic">
            Based on your choices, you might want to skip these...
          </p>
          <div className="space-y-3">
            {bottomActivities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="bg-gray-700/70 rounded-lg p-4 border-l-4 border-red-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{activity.title}</h3>
                    <p className="text-gray-300 text-sm mb-2">{activity.subtitle}</p>
                    <p className="text-xs text-red-400 italic">
                      Why not: {getActivityRecommendationReason(activity, false)}
                    </p>
                  </div>
                  <div className="text-xs font-mono text-red-400">ELO {activity.elo}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Expandable Technical Details */}
        <details className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6">
          <summary className="cursor-pointer text-lg font-semibold text-white hover:text-gray-300">
            🤓 Show me the nerdy details
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">Preference Analysis:</h3>
              <div className="space-y-1">
                {preferenceDrivers.map((driver, driverIndex) => {
                  const corrDisplay = isNaN(driver.correlation) ? "N/A" : driver.correlation.toFixed(2);
                  const interpretation = getPreferenceInterpretation(driver);
                  
                  return (
                    <div key={driverIndex} className="text-xs text-gray-300 p-2 bg-gray-700/70 rounded">
                      <strong>{driver.dimension}:</strong>{' '}
                      <span dangerouslySetInnerHTML={{ __html: interpretation }} />
                      {' '}(Correlation: {corrDisplay})
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-2">Complete Rankings:</h3>
              <div className="max-h-40 overflow-y-auto bg-gray-700/70 rounded p-2">
                <ul>
                  {sortedActivities.map((activity, index) => (
                    <li key={activity.id} className="flex justify-between text-xs py-1 text-gray-300">
                      <span>{index + 1}. {activity.title}</span>
                      <span className="font-mono text-gray-400">ELO {activity.elo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              Quiz completed with {totalMatchups} choices
            </div>
          </div>
        </details>

        {/* Profile Creation Section */}
        {!currentUser && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6 mt-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-3">💾 Save Your Results!</h3>
              <p className="text-gray-300 mb-4">
                Create a profile to save your preferences and never lose your personalized recommendations.
              </p>
              <button 
                onClick={() => setShowCreateProfile(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                📝 create profile
              </button>
            </div>
          </section>
        )}

        {/* User Info Section */}
        {currentUser && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-emerald-600 rounded-xl p-4 mt-6">
            <div className="text-center">
              <p className="text-emerald-400">
                ✅ Saved to profile: <strong>{currentUser.username}</strong>
              </p>
              <p className="text-emerald-300 text-sm">Your results are automatically saved!</p>
            </div>
          </section>
        )}

        <footer className="text-center mt-8">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 justify-center">
              <button 
                onClick={onRetakeQuiz}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium text-base px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🔄 take it again!
              </button>
              <button 
                onClick={onClearData}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-base px-6 py-3 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
              >
                🗑️ start fresh
              </button>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {onBackToProfile && (
                <button 
                  onClick={onBackToProfile}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
                >
                  👤 back to profile
                </button>
              )}
              <button 
                onClick={onBackToSplash}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
              >
                ← back to home
              </button>
            </div>
          </div>
        </footer>
      </main>
      
      {/* Profile Creation Modal */}
      {showCreateProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-4 text-white">
              💾 Create Your Profile
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Choose a username to save your quiz results and preferences.
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newUsername.trim()) {
                onCreateProfile(newUsername.trim());
                setShowCreateProfile(false);
                setNewUsername('');
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="new-username" className="block text-sm font-medium text-gray-300 mb-2">
                  Choose a username
                </label>
                <input
                  type="text"
                  id="new-username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                  placeholder="your username"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProfile(false);
                    setNewUsername('');
                  }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-2 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  disabled={!newUsername.trim()}
                >
                  create profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-6 text-center">
        &copy; 2025
      </p>
    </div>
  );
}