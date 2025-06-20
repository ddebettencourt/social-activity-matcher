'use client'

import { useState } from 'react';
import { User } from '@/types/quiz';
import { analyzeCustomEventForAllUsers } from '@/lib/customEventAnalysis';

interface CustomEventViewProps {
  onBackToProfile: () => void;
  currentUser: User | null;
}

interface UserPrediction {
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
      userAvgElo: number;
      overallAvgElo: number;
      standardDeviation: number;
      zScore: number;
      activityCount: number;
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

interface CustomEventAnalysis {
  title: string;
  subtitle: string;
  dimensions: {
    socialIntensity: number;
    structure: number;
    novelty: number;
    formality: number;
    energyLevel: number;
    scaleImmersion: number;
  };
  tags: Array<{name: string; importance: number}> | string[];
  userPredictions: UserPrediction[];
}

export default function CustomEventView({ onBackToProfile, currentUser }: CustomEventViewProps) {
  const [eventDescription, setEventDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CustomEventAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugUserExpanded, setDebugUserExpanded] = useState<string | null>(null);

  const handleAnalyzeEvent = async () => {
    if (!eventDescription.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeCustomEventForAllUsers(eventDescription.trim());
      
      setAnalysis({
        title: result.eventAnalysis.title,
        subtitle: result.eventAnalysis.subtitle,
        dimensions: result.eventAnalysis.dimensions,
        tags: result.eventAnalysis.tags,
        userPredictions: result.userPredictions
      });
    } catch (err) {
      setError('Failed to analyze event. Please try again.');
      console.error('Error analyzing event:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    // Clear all state properly for mobile
    setEventDescription('');
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false); // Ensure analyzing state is reset
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-600 bg-green-100';
    if (score >= 7.0) return 'text-emerald-600 bg-emerald-100';
    if (score >= 5.5) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4.0) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 8.5) return '🤩';
    if (score >= 7.0) return '😊';
    if (score >= 5.5) return '😐';
    if (score >= 4.0) return '😕';
    return '😞';
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 md:py-8 px-4">
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
          🎯 Who Should You Invite?
        </h1>
        <p className="text-gray-400 text-lg">
          describe any social event and we&apos;ll find the people who&apos;d love it most
        </p>
      </header>

      <main className="space-y-6">
        {/* Input Section */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📝 Describe Your Event</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="event-description" className="block text-sm font-medium text-gray-300 mb-2">
                What&apos;s the social activity or event you&apos;re planning?
              </label>
              <textarea
                id="event-description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder-gray-400"
                rows={4}
                placeholder="Your amazing event here"
                disabled={isAnalyzing}
              />
              <p className="text-xs text-gray-400 mt-1">
                Be as specific as possible - include details about group size, setting, activities, etc.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAnalyzeEvent}
                disabled={!eventDescription.trim() || isAnalyzing}
                className={`bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium flex-1 min-h-[48px] rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? '🤖 finding perfect guests...' : '🔍 find who would love this'}
              </button>
              
              {(analysis || error) && (
                <button
                  onClick={resetForm}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white min-h-[48px] sm:w-auto w-full rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
                  disabled={isAnalyzing}
                >
                  🔄 try another event
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isAnalyzing && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🤖</div>
              <h2 className="text-xl font-bold text-white mb-2">Analyzing Your Event...</h2>
              <div className="space-y-2 text-gray-300">
                <p>🧠 Determining the event dimensions</p>
                <p>🏷️ Generating relevant tags</p>
                <p>👥 Scanning user profiles for compatibility</p>
                <p>📊 Computing enjoyment predictions</p>
              </div>
            </div>
          </section>
        )}

        {/* Analysis Results */}
        {analysis && (
          <>
            {/* Event Summary */}
            <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">📋 Event Analysis</h2>
              
              <div className="bg-gray-700/70 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-white mb-2">{analysis.title}</h3>
                <p className="text-gray-300 text-sm mb-3">{analysis.subtitle}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">📊 Event Characteristics</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(analysis.dimensions).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-300 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-white font-medium">{value}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">🏷️ Activity Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-600 text-gray-200 px-2 py-1 rounded-full text-xs">
                          {typeof tag === 'string' ? tag : tag.name}
                          {typeof tag === 'object' && tag.importance && (
                            <span className="ml-1 text-yellow-400 font-bold">
                              {'★'.repeat(tag.importance)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* User Predictions */}
            <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                🎯 Perfect Guest List ({analysis.userPredictions.length} users analyzed)
              </h2>
              
              <div className="space-y-4">
                {analysis.userPredictions
                  .sort((a, b) => b.enjoymentScore - a.enjoymentScore)
                  .map((prediction, index) => (
                  <div key={prediction.username} className="bg-gray-700/70 rounded-lg p-4 border-l-4 border-purple-400">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getScoreEmoji(prediction.enjoymentScore)}</div>
                        <div>
                          <h3 className="font-bold text-white">
                            {index + 1}. {prediction.username}
                            {currentUser?.username === prediction.username && (
                              <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded-full ml-2">
                                you
                              </span>
                            )}
                          </h3>
                          {/* User-friendly insights */}
                          <div className="space-y-1">
                            {prediction.insights?.personalityInsights?.slice(0, 2).map((insight, i) => (
                              <p key={i} className="text-gray-300 text-xs bg-gray-600 px-2 py-1 rounded">
                                💡 {insight}
                              </p>
                            ))}
                            
                            {prediction.insights?.likedSimilarActivities?.length > 0 && (
                              <p className="text-gray-300 text-xs bg-emerald-800/50 px-2 py-1 rounded">
                                ✅ Liked similar: {prediction.insights?.likedSimilarActivities?.slice(0, 2).join(', ')}
                              </p>
                            )}
                            
                            {prediction.insights?.enjoyedTags?.length > 0 && (
                              <p className="text-gray-300 text-xs bg-blue-800/50 px-2 py-1 rounded">
                                🏷️ Enjoys: {prediction.insights?.enjoyedTags?.slice(0, 3).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="px-4 py-2 rounded-full font-bold text-xl shadow-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white border border-purple-400">
                          {prediction.enjoymentScore.toFixed(1)}/10
                        </div>
                        <div className="text-xs text-gray-400 mt-1">enjoyment score</div>
                      </div>
                    </div>
                    
                    
                    {/* Debug Button */}
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <button
                        onClick={() => setDebugUserExpanded(
                          debugUserExpanded === prediction.username ? null : prediction.username
                        )}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white px-3 py-1 rounded-full transition-colors"
                      >
                        🔍 {debugUserExpanded === prediction.username ? 'Hide' : 'Show'} Technical Details
                      </button>
                    </div>
                    
                    {/* Debug Expanded View */}
                    {debugUserExpanded === prediction.username && analysis && (
                      <div className="mt-3 p-3 bg-gray-600/50 rounded border border-gray-600">
                        <h4 className="font-semibold text-white mb-3">🔍 Technical Algorithm Details</h4>
                        
                        {/* Hybrid Analysis - Primary Algorithm */}
                        {prediction.hybridBreakdown && (
                          <div className="bg-gray-700/70 rounded p-3 mb-4">
                            <h5 className="font-semibold text-purple-400 mb-2">🔥 Hybrid Algorithm (Primary)</h5>
                            <div className="space-y-2 text-xs text-gray-300">
                              <p><strong>Final Score:</strong> {prediction.enjoymentScore.toFixed(1)}/10</p>
                              <p><strong>Logic:</strong> {prediction.explanation}</p>
                              
                              <div className="mt-3 p-2 bg-gray-600/50 rounded">
                                <h6 className="font-semibold mb-2 text-white">🔥 Step-by-Step Hybrid Calculation:</h6>
                                
                                <div className="space-y-1 font-mono text-xs bg-gray-800 text-gray-300 p-2 rounded max-h-48 overflow-y-auto">
                                  {prediction.hybridBreakdown.calculationSteps.map((step, i) => (
                                    <div key={i} className={step.startsWith('STEP') || step.startsWith('HYBRID') ? 'font-bold text-purple-400 mt-2' : 'ml-2 text-gray-300'}>
                                      {step}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Claude's Similar Activities Used */}
                                {prediction.hybridBreakdown.similarActivitiesUsed.length > 0 && (
                                  <div className="mt-2">
                                    <strong className="text-white">Claude&apos;s Similarity Analysis:</strong>
                                    <div className="max-h-32 overflow-y-auto bg-gray-700 p-1 rounded text-xs">
                                      {prediction.hybridBreakdown.similarActivitiesUsed.map((activity, i) => (
                                        <div key={i} className="p-1 border-b border-gray-600">
                                          <div className="font-semibold text-white">{activity.title}</div>
                                          <div className="text-gray-300">Similarity: {activity.similarity}, ELO: {activity.elo}</div>
                                          <div className="text-blue-400 italic">&quot;{activity.explanation}&quot;</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Tag Analysis */}
                                {prediction.hybridBreakdown.tagAnalysis.length > 0 && (
                                  <div className="mt-2">
                                    <strong className="text-white">Tag ELO Analysis:</strong>
                                    <div className="max-h-32 overflow-y-auto bg-gray-700 p-1 rounded text-xs">
                                      {prediction.hybridBreakdown.tagAnalysis.map((tag, i) => (
                                        <div key={i} className="p-1 border-b border-gray-600">
                                          <div className="font-semibold text-white">{tag.tag}</div>
                                          <div className="text-gray-300">Count: {tag.activityCount}, User Avg: {tag.userAvgElo}, Overall: {tag.overallAvgElo}</div>
                                          <div className="text-gray-300">Z-score: {tag.zScore}, Adjustment: {tag.adjustment}</div>
                                          {tag.topActivities && tag.topActivities.length > 0 && (
                                            <div className="text-gray-400">Top: {tag.topActivities.slice(0, 2).join(', ')}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="mt-2 p-1 bg-purple-800/30 rounded">
                                  <strong className="text-white">Summary:</strong> <span className="text-gray-300">Claude base: {prediction.hybridBreakdown.claudeBaseScore}, 
                                  Tag adjustment: {prediction.hybridBreakdown.finalAdjustment}, 
                                  Final: {prediction.enjoymentScore.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Event Analysis Reference */}
                        <div className="p-2 bg-emerald-800/30 rounded border border-emerald-600">
                          <h5 className="font-semibold text-emerald-400 mb-1">📋 Custom Event Details</h5>
                          <div className="text-xs grid md:grid-cols-2 gap-2">
                            <div>
                              <strong className="text-white">Dimensions:</strong>
                              {Object.entries(analysis.dimensions).map(([key, value]) => (
                                <div key={key} className="text-emerald-300">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}: {value}/10
                                </div>
                              ))}
                            </div>
                            <div>
                              <strong className="text-white">Tags:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {analysis.tags.map((tag, i) => (
                                  <span key={i} className="bg-emerald-700 text-emerald-200 px-1 rounded text-xs">
                                    {typeof tag === 'string' ? tag : tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Insights */}
            <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">💡 Event Insights</h2>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700/70 rounded-lg p-4">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-sm text-gray-300">Top Score</div>
                  <div className="text-lg font-bold text-white">
                    {Math.max(...analysis.userPredictions.map(p => p.enjoymentScore)).toFixed(1)}/10
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {analysis.userPredictions.find(p => p.enjoymentScore === Math.max(...analysis.userPredictions.map(p => p.enjoymentScore)))?.username}
                  </div>
                </div>
                <div className="bg-gray-700/70 rounded-lg p-4">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm text-gray-300">Average Score</div>
                  <div className="text-lg font-bold text-white">
                    {(analysis.userPredictions.reduce((sum, p) => sum + p.enjoymentScore, 0) / analysis.userPredictions.length).toFixed(1)}/10
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    across {analysis.userPredictions.length} users
                  </div>
                </div>
                <div className="bg-gray-700/70 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm text-gray-300">Great Matches</div>
                  <div className="text-lg font-bold text-white">
                    {analysis.userPredictions.filter(p => p.enjoymentScore >= 7.0).length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    score ≥ 7.0/10
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Error Display */}
        {error && (
          <section className="bg-gray-800/70 backdrop-blur-sm border border-red-500 rounded-xl p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">😅</div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Oops!</h2>
              <p className="text-red-300">{error}</p>
            </div>
          </section>
        )}

        {/* How It Works */}
        <section className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🤔 How This Works</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">🧠 Algorithmic Analysis</h3>
              <p>Our algorithm analyzes your event description along 6 dimensions, as well as adding relevant tags.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🎯 Smart Matching</h3>
              <p>We find users with complete profiles (20+ quiz responses) and predict their enjoyment based on similar activities they&apos;ve rated highly.</p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="text-center">
          <button 
            onClick={onBackToProfile}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-6 py-3 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
          >
            ← back to profile
          </button>
        </section>
      </main>

      <p className="text-xs text-gray-500 mt-6 text-center">
        &copy; 2025
      </p>
    </div>
  );
}