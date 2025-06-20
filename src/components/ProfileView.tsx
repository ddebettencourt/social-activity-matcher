'use client'

import { useEffect, useState } from 'react';
import { Activity, PreferenceDriver, TagScore, User } from '@/types/quiz';
import { calculatePreferenceDrivers } from '@/lib/eloCalculations';
import { personaTraitMap } from '@/lib/constants';

interface ProfileViewProps {
  currentUser: User;
  activityData: Activity[];
  totalMatchups: number;
  onContinueQuiz: () => void;
  onViewFullResults: () => void;
  onBackToSplash: () => void;
  onClearData: () => void;
  onCustomEvent: () => void;
  onProfiles: () => void;
}

export default function ProfileView({ 
  currentUser, 
  activityData, 
  totalMatchups, 
  onContinueQuiz, 
  onViewFullResults, 
  onBackToSplash,
  onClearData,
  onCustomEvent,
  onProfiles
}: ProfileViewProps) {
  const [, setPreferenceDrivers] = useState<PreferenceDriver[]>([]);
  const [personaName, setPersonaName] = useState<string>("Analyzing...");
  const [topTags, setTopTags] = useState<TagScore[]>([]);

  useEffect(() => {
    if (activityData && activityData.length > 0) {
      const drivers = calculatePreferenceDrivers(activityData);
      setPreferenceDrivers(drivers);
      
      generatePersonaName(drivers);
      calculateTopTags(activityData);
    }
  }, [activityData]);

  const generatePersonaName = (drivers: PreferenceDriver[]) => {
    const validDrivers = drivers.filter(driver => !isNaN(driver.correlation) && Math.abs(driver.correlation) >= 0.05);
    
    if (validDrivers.length === 0) {
      setPersonaName("Unique Explorer");
      return;
    }

    const sortedDrivers = validDrivers.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    const primaryDriver = sortedDrivers[0];
    
    const traitMap = personaTraitMap[primaryDriver.key as keyof typeof personaTraitMap];
    if (!traitMap) {
      setPersonaName("Creative Spirit");
      return;
    }
    
    const isHighCorrelation = primaryDriver.correlation > 0;
    const traits = isHighCorrelation ? traitMap.high : traitMap.low;
    
    let adj1 = "Curious";
    let desc2 = "Explorer";
    
    if (traits.primary.length > 0) {
      adj1 = traits.primary[Math.floor(Math.random() * traits.primary.length)];
    }
    if (traits.descriptor.length > 0) {
      desc2 = traits.descriptor[Math.floor(Math.random() * traits.descriptor.length)];
    }

    setPersonaName(`${adj1} ${desc2}`);
  };

  const calculateTopTags = (activities: Activity[]) => {
    if (!activities || activities.length === 0) {
      setTopTags([]);
      return;
    }

    const tagMap = new Map<string, { totalElo: number; count: number }>();
    
    activities.forEach(activity => {
      (activity.tags || []).forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { totalElo: 0, count: 0 });
        }
        const tagData = tagMap.get(tag)!;
        tagData.totalElo += activity.elo;
        tagData.count++;
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
        const standardError = stdDev / Math.sqrt(data.count);
        const zScore = (averageElo - meanElo) / standardError;
        
        tagScores.push({
          tag: tag,
          score: zScore,
          averageElo: Math.round(averageElo),
          activityCount: data.count
        });
      }
    });

    tagScores.sort((a, b) => b.score - a.score);
    setTopTags(tagScores.slice(0, 8));
  };

  const sortedActivities = [...activityData].sort((a, b) => b.elo - a.elo);
  const topActivities = sortedActivities.slice(0, 6);
  
  const getQuizProgress = () => {
    const totalActivitiesWithMatchups = activityData.filter(a => (a.matchups || 0) > 0).length;
    const totalActivities = activityData.length;
    const coverage = (totalActivitiesWithMatchups / totalActivities) * 100;
    return {
      matchups: totalMatchups,
      coverage: Math.round(coverage),
      activitiesTested: totalActivitiesWithMatchups,
      totalActivities
    };
  };

  const progress = getQuizProgress();

  return (
    <div className="w-full max-w-4xl mx-auto py-6 md:py-8 px-4">
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
          👋 Welcome back, {currentUser.username}!
        </h1>
        <p className="text-gray-400 text-lg">here&apos;s your social activity profile</p>
      </header>

      <main className="space-y-6">
        {/* Persona Summary */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center">
          <div className="text-5xl mb-3">🎭</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{personaName}</h2>
          <p className="text-gray-300 text-lg mb-4">
            Based on {progress.matchups} choices across {progress.activitiesTested} activities
          </p>
          
          {/* Quiz Progress */}
          <div className="bg-gray-700/70 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white">Activity Coverage</span>
              <span className="text-sm text-gray-300">{progress.coverage}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.coverage}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {progress.activitiesTested} of {progress.totalActivities} activities explored
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <button 
              onClick={onContinueQuiz}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium text-lg px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🎯 refine my preferences
            </button>
            <button 
              onClick={onViewFullResults}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-base px-4 py-2 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
            >
              📊 detailed results
            </button>
          </div>
        </section>

        {/* Current Top Preferences */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⭐</span>
            <h2 className="text-2xl font-bold text-white">Your current favorites</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {topActivities.map((activity, index) => (
              <div key={activity.id} className="bg-gray-700/70 rounded-lg p-4 border-l-4 border-emerald-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{activity.title}</h3>
                    <p className="text-gray-300 text-xs">{activity.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">#{index + 1}</div>
                    <div className="text-xs font-mono text-emerald-400">{activity.elo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Activity Types */}
        {topTags.length > 0 && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏷️</span>
              <h2 className="text-2xl font-bold text-white">Types you gravitate toward</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tagScore, index) => (
                <div key={tagScore.tag} className="bg-gray-700/70 rounded-full px-4 py-2 border border-gray-600">
                  <span className="text-white font-medium">#{index + 1} {tagScore.tag}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({tagScore.activityCount} activities)
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Profile Actions */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🛠️ Profile Options</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={onContinueQuiz}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ➕ do more matchups
            </button>
            <button 
              onClick={onViewFullResults}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
            >
              📋 full analysis
            </button>
            <button 
              onClick={onCustomEvent}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
            >
              🔮 test custom event
            </button>
            <button 
              onClick={onProfiles}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
            >
              📊 view all profiles
            </button>
            <button 
              onClick={onClearData}
              className="bg-gray-700 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 border border-red-500 hover:border-red-400"
            >
              🗑️ reset preferences
            </button>
            <button 
              onClick={onBackToSplash}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
            >
              🏠 back to home
            </button>
          </div>
        </section>
      </main>

      <p className="text-xs text-gray-500 mt-6 text-center">
        &copy; 2025
      </p>
    </div>
  );
}