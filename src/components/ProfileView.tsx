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
    <div className="view-container container mx-auto max-w-4xl py-6 md:py-8 px-2 md:px-4">
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-purple-700 mb-2">
          👋 Welcome back, {currentUser.username}!
        </h1>
        <p className="text-brown-700 text-lg">here&apos;s your social activity profile</p>
      </header>

      <main className="space-y-6">
        {/* Persona Summary */}
        <section className="playful-card p-6 bg-gradient-to-br from-purple-50 to-blue-50 text-center">
          <div className="text-5xl mb-3">🎭</div>
          <h2 className="text-2xl md:text-3xl font-bold text-purple-700 mb-3">{personaName}</h2>
          <p className="text-purple-600 text-lg mb-4">
            Based on {progress.matchups} choices across {progress.activitiesTested} activities
          </p>
          
          {/* Quiz Progress */}
          <div className="bg-white/70 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-purple-700">Activity Coverage</span>
              <span className="text-sm text-purple-600">{progress.coverage}%</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.coverage}%` }}
              />
            </div>
            <p className="text-xs text-purple-600 mt-2">
              {progress.activitiesTested} of {progress.totalActivities} activities explored
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <button 
              onClick={onContinueQuiz}
              className="playful-button-primary text-lg px-6 py-3"
            >
              🎯 refine my preferences
            </button>
            <button 
              onClick={onViewFullResults}
              className="playful-button-secondary text-base px-4 py-2"
            >
              📊 detailed results
            </button>
          </div>
        </section>

        {/* Current Top Preferences */}
        <section className="playful-card p-6 bg-gradient-to-br from-emerald-50 to-green-50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⭐</span>
            <h2 className="text-2xl font-bold text-emerald-700">Your current favorites</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {topActivities.map((activity, index) => (
              <div key={activity.id} className="bg-white/70 rounded-lg p-4 border-l-4 border-emerald-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-emerald-800 text-sm">{activity.title}</h3>
                    <p className="text-emerald-600 text-xs">{activity.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-600">#{index + 1}</div>
                    <div className="text-xs font-mono text-emerald-500">{activity.elo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Activity Types */}
        {topTags.length > 0 && (
          <section className="playful-card p-6 bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏷️</span>
              <h2 className="text-2xl font-bold text-amber-700">Types you gravitate toward</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tagScore, index) => (
                <div key={tagScore.tag} className="bg-white/70 rounded-full px-4 py-2 border border-amber-200">
                  <span className="text-amber-800 font-medium">#{index + 1} {tagScore.tag}</span>
                  <span className="text-xs text-amber-600 ml-2">
                    ({tagScore.activityCount} activities)
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Profile Actions */}
        <section className="playful-card p-6 bg-gradient-to-br from-gray-50 to-slate-50">
          <h2 className="text-xl font-bold text-gray-700 mb-4">🛠️ Profile Options</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={onContinueQuiz}
              className="playful-button-primary"
            >
              ➕ do more matchups
            </button>
            <button 
              onClick={onViewFullResults}
              className="playful-button-secondary"
            >
              📋 full analysis
            </button>
            <button 
              onClick={onCustomEvent}
              className="playful-button-secondary"
            >
              🔮 test custom event
            </button>
            <button 
              onClick={onProfiles}
              className="playful-button-secondary"
            >
              📊 view all profiles
            </button>
            <button 
              onClick={onClearData}
              className="playful-button-secondary text-red-700 border-red-300 hover:bg-red-50"
            >
              🗑️ reset preferences
            </button>
            <button 
              onClick={onBackToSplash}
              className="playful-button-secondary"
            >
              🏠 back to home
            </button>
          </div>
        </section>
      </main>

      <p className="text-xs text-brown-500 mt-6 text-center">
        &copy; 2025
      </p>
    </div>
  );
}