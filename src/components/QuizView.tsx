'use client'

import { useEffect, useState, useCallback } from 'react';
import { Activity, QuizState, MatchupPrediction, PreferenceStrength, User, Insight } from '@/types/quiz';
import { ABSOLUTE_MAX_MATCHUPS, RECENT_HISTORY_SIZE } from '@/lib/constants';
import { processChoice } from '@/lib/eloCalculations';
import { makePrediction, updatePredictionWithResult, calculateAlgorithmStrength } from '@/lib/algorithmStrength';
// import AlgorithmStrengthMeter from './AlgorithmStrengthMeter';
import TutorialOverlay from './TutorialOverlay';

interface QuizViewProps {
  quizState: QuizState;
  setQuizState: React.Dispatch<React.SetStateAction<QuizState>>;
  onFinishQuiz: () => void;
  currentUser: User | null;
  onStopQuiz?: () => void;
  onSaveProgress?: () => void;
}

const handleEndEarly = (onFinishQuiz: () => void, currentUser: User | null, onStopQuiz?: () => void) => {
  if (currentUser && onStopQuiz) {
    // For logged-in users, they can stop anytime and continue later
    if (confirm("Want to stop for now? Your progress will be saved and you can continue anytime!")) {
      onStopQuiz();
    }
  } else {
    // For anonymous users, warn about losing progress
    if (confirm("Are you sure you want to end the quiz early? The algorithm will work better with more data!")) {
      onFinishQuiz();
    }
  }
};

// Function to generate insight from user choices
const generateInsight = async (
  quizState: QuizState, 
  setQuizState: React.Dispatch<React.SetStateAction<QuizState>>, 
  setIsGenerating: (value: boolean) => void,
  resetChoiceCounter: () => void
) => {
  if (setIsGenerating) setIsGenerating(true);
  
  try {
    // Validate we have enough data
    if (!quizState.activityData || quizState.activityData.length < 10) {
      console.log('Not enough activity data for insight generation');
      return;
    }

    if (quizState.currentMatchup < 6) {
      console.log('Not enough matchups completed for insight generation');
      return;
    }

    // Use the actual choices the user has made!
    const choices = quizState.actualChoices.filter(choice => choice.chosen !== 'tie'); // Exclude ties
    
    if (choices.length < 6) {
      console.log(`Only ${choices.length} actual choices available for insight generation`);
      return;
    }

    // Get past insights text
    const pastInsights = quizState.insights.map(insight => insight.text);

    console.log('Sending insight request with:', { 
      choicesCount: choices.length, 
      pastInsightsCount: pastInsights.length,
      recentChoices: choices.slice(-3).map(c => `${c.chosen} over ${c.activityA === c.chosen ? c.activityB : c.activityA}`)
    });

    const response = await fetch('/api/generate-insight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        choices,
        pastInsights
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error Response:', errorData);
      throw new Error(`Failed to generate insight: ${errorData.error || response.statusText}`);
    }

    const { insight } = await response.json();

    // Create new insight object
    const newInsight: Insight = {
      id: `insight-${Date.now()}`,
      text: insight,
      generatedAt: new Date().toISOString(),
      matchupNumber: quizState.currentMatchup
    };

    console.log('Generated insight:', insight);
    console.log('Setting insight in state:', newInsight);

    // Update quiz state with new insight and reset counter immediately
    setQuizState(prev => {
      console.log('Setting currentInsight in state. Previous currentInsight:', prev.currentInsight);
      const newState = {
        ...prev,
        insights: [...prev.insights, newInsight],
        currentInsight: newInsight
      };
      console.log('New state will have currentInsight:', newState.currentInsight);
      return newState;
    });
    
    // Reset the choice counter immediately when setting insight
    console.log('Resetting choice counter to 0 for new insight');
    resetChoiceCounter();

    console.log('Insight should now be visible');
  } catch (error) {
    console.error('Error generating insight:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    if (setIsGenerating) setIsGenerating(false);
  }
};

export default function QuizView({ quizState, setQuizState, onFinishQuiz, currentUser, onStopQuiz, onSaveProgress }: QuizViewProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<MatchupPrediction | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    // Show tutorial on first visit for new users (first matchup)
    return quizState.currentMatchup === 0;
  });

  // Track choices made since insight was shown
  const [choicesSinceInsight, setChoicesSinceInsight] = useState(0);
  // Track if we're currently generating an insight to prevent duplicates
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // Auto-dismiss insights after 3 choices
  useEffect(() => {
    console.log('Auto-dismiss check: insight =', quizState.currentInsight?.text, 'choicesSinceInsight =', choicesSinceInsight);
    if (quizState.currentInsight && choicesSinceInsight >= 3) {
      console.log('Auto-dismissing insight after 3 choices');
      setQuizState(prev => ({
        ...prev,
        currentInsight: undefined
      }));
      setChoicesSinceInsight(0);
    }
  }, [choicesSinceInsight, quizState.currentInsight, setQuizState]);

  // Note: Choice counter is reset immediately when insight is generated, not in useEffect

  const shuffleArray = <T,>(array: T[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  const selectActivitiesForMatchup = (): { actA: Activity; actB: Activity } | null => {
    console.groupCollapsed(`selectActivitiesForMatchup (Matchup #${quizState.currentMatchup + 1})`);
    if (quizState.activityData.length < 2) {
      console.error("Not enough activities (<2)."); 
      console.groupEnd(); 
      return null;
    }

    console.log("Recent history (IDs to avoid if possible):", quizState.recentMatchupHistory);

    let candidatePool = quizState.activityData.filter(act => !quizState.recentMatchupHistory.includes(act.id));
    if (candidatePool.length < 2) { 
      console.warn("Not enough non-recent activities for matchup. Using full list and ignoring recent history for this selection.");
      candidatePool = [...quizState.activityData];
    }
    
    candidatePool.sort((a,b) => a.eloUpdateCount - b.eloUpdateCount);
    
    const subPoolSize = Math.min(candidatePool.length, 15); 
    let selectionPool = candidatePool.slice(0, subPoolSize);
    shuffleArray(selectionPool); 

    if (selectionPool.length < 2) { 
      console.warn("Sub-pool of least updated is too small. Using larger candidate pool.");
      selectionPool = [...candidatePool]; 
      shuffleArray(selectionPool);
      if (selectionPool.length < 2) {
        console.error("CRITICAL: Not enough distinct activities in the entire list.");
        console.groupEnd();
        return null;
      }
    }
    
    const actA = selectionPool[0];
    let actB = null;
    
    for (let i = 1; i < selectionPool.length; i++) {
      if (selectionPool[i].id !== actA.id) {
        actB = selectionPool[i];
        break;
      }
    }

    if (!actB) {
      console.warn("Could not find distinct B in initial selection pool. Trying broader candidate pool.");
      const broaderCandidatePoolB = quizState.activityData.filter(a => a.id !== actA.id);
      if (broaderCandidatePoolB.length > 0) {
        shuffleArray(broaderCandidatePoolB);
        actB = broaderCandidatePoolB[0];
      } else {
        console.error("CRITICAL: Only one unique activity available in total.");
        console.groupEnd(); 
        return null;
      }
    }
    
    console.log(`Selected Activity A: "${actA.title}" (ELO: ${actA.elo}, Updates: ${actA.eloUpdateCount})`);
    console.log(`Selected Activity B: "${actB.title}" (ELO: ${actB.elo}, Updates: ${actB.eloUpdateCount})`);
    
    let finalActA = actA;
    let finalActB = actB;
    if (Math.random() < 0.5) {
      [finalActA, finalActB] = [finalActB, finalActA];
      console.log("   Swapped A and B for display order.");
    }
    
    console.log(`Final Pair Displayed: A="${finalActA.title}" (ID:${finalActA.id}), B="${finalActB.title}" (ID:${finalActB.id})`);
    console.groupEnd();
    return { actA: finalActA, actB: finalActB };
  };

  const displayMatchup = useCallback(() => {
    const pair = selectActivitiesForMatchup();
    if (!pair) { 
      console.error("displayMatchup: No pair selected, finishing quiz.");
      onFinishQuiz(); 
      return; 
    }

    // Make prediction for this matchup
    const prediction = makePrediction(
      pair.actA, 
      pair.actB, 
      quizState.activityData, 
      quizState.currentMatchup + 1
    );
    setCurrentPrediction(prediction);

    setQuizState(prev => {
      const newHistory = [...prev.recentMatchupHistory, pair.actA.id, pair.actB.id];
      if (newHistory.length > RECENT_HISTORY_SIZE) {
        newHistory.splice(0, newHistory.length - RECENT_HISTORY_SIZE);
      }

      return {
        ...prev,
        currentActivityA: pair.actA,
        currentActivityB: pair.actB,
        recentMatchupHistory: newHistory
      };
    });
  }, [quizState.activityData, quizState.recentMatchupHistory, onFinishQuiz]);

  useEffect(() => {
    if (quizState.activityData.length >= 2 && !quizState.currentActivityA && !quizState.currentActivityB) {
      displayMatchup();
    }
  }, [quizState.activityData, quizState.currentActivityA, quizState.currentActivityB, displayMatchup]);

  const handleChoice = (chosenActivityId: number, strength: PreferenceStrength = 'somewhat') => {
    console.log(`handleChoice: User chose activity ID ${chosenActivityId} with strength ${strength}.`);
    if (isTransitioning || quizState.currentMatchup >= ABSOLUTE_MAX_MATCHUPS || !quizState.currentActivityA || !quizState.currentActivityB) return;
    
    // Start transition animation
    setIsTransitioning(true);
    
    // Increment choice counter for insight dismissal
    setChoicesSinceInsight(prev => {
      const newCount = prev + 1;
      console.log('Incrementing choice counter from', prev, 'to', newCount);
      return newCount;
    });
    
    const outcomeForDisplayedA = quizState.currentActivityA.id === chosenActivityId ? 1 : 0;
    const updatedActivityData = processChoice(
      quizState.currentActivityA, 
      quizState.currentActivityB, 
      outcomeForDisplayedA, 
      quizState.activityData,
      strength
    );
    
    const newMatchupCount = quizState.currentMatchup + 1;
    
    // Track the actual choice made for insights
    const actualChoice = {
      activityA: quizState.currentActivityA.title,
      activityB: quizState.currentActivityB.title,
      chosen: chosenActivityId === quizState.currentActivityA.id ? quizState.currentActivityA.title : quizState.currentActivityB.title,
      strength,
      matchupNumber: newMatchupCount
    };
    
    // Update prediction with actual result and calculate algorithm strength
    const updatedPredictions = [...quizState.algorithmStrength.predictionHistory];
    if (currentPrediction) {
      const completedPrediction = updatePredictionWithResult(currentPrediction, chosenActivityId);
      updatedPredictions.push(completedPrediction);
    }
    
    const newAlgorithmStrength = calculateAlgorithmStrength(updatedPredictions, newMatchupCount);
    
    // Update activity data and matchup count immediately
    setQuizState(prev => ({
      ...prev,
      activityData: updatedActivityData,
      currentMatchup: newMatchupCount,
      algorithmStrength: newAlgorithmStrength,
      actualChoices: [...prev.actualChoices, actualChoice]
    }));

    // Check for insight generation (25% chance after 6+ choices)
    // Only generate if we don't already have a current insight showing and not currently generating
    if (newMatchupCount >= 6 && Math.random() < 0.25 && !quizState.currentInsight && !isGeneratingInsight) {
      // Use the updated state that includes the new actualChoice
      const updatedQuizStateForInsight = {
        ...quizState,
        currentMatchup: newMatchupCount,
        algorithmStrength: newAlgorithmStrength,
        activityData: updatedActivityData,
        actualChoices: [...quizState.actualChoices, actualChoice]
      };
      
      generateInsight(
        updatedQuizStateForInsight,
        setQuizState,
        setIsGeneratingInsight,
        () => setChoicesSinceInsight(0)
      );
    }

    // Check if quiz should end based on algorithm confidence or max limit
    // For logged-in users, never force completion based on algorithm readiness
    const shouldEnd = currentUser 
      ? newMatchupCount >= ABSOLUTE_MAX_MATCHUPS
      : (newAlgorithmStrength.isReady || newMatchupCount >= ABSOLUTE_MAX_MATCHUPS);
    
    if (shouldEnd) {
      setTimeout(() => onFinishQuiz(), 300);
    } else {
      // Add a brief animation delay before showing next matchup
      setTimeout(() => {
        // Generate next matchup
        const pair = selectActivitiesForMatchup();
        if (pair) {
          // Make new prediction
          const prediction = makePrediction(
            pair.actA, 
            pair.actB, 
            updatedActivityData, 
            newMatchupCount + 1
          );
          setCurrentPrediction(prediction);

          setQuizState(prev => {
            console.log('Setting up next matchup in handleChoice. Current insight before:', prev.currentInsight);
            const newHistory = [...prev.recentMatchupHistory, pair.actA.id, pair.actB.id];
            if (newHistory.length > RECENT_HISTORY_SIZE) {
              newHistory.splice(0, newHistory.length - RECENT_HISTORY_SIZE);
            }

            const newState = {
              ...prev,
              currentActivityA: pair.actA,
              currentActivityB: pair.actB,
              recentMatchupHistory: newHistory
              // Preserve currentInsight and other fields automatically with ...prev
            };
            console.log('Next matchup state will have insight:', newState.currentInsight);
            return newState;
          });
        }
        setIsTransitioning(false);
      }, 300); // Smooth transition delay
    }
  };

  const handleSpecialChoice = (outcomeValue: number) => {
    console.log(`handleSpecialChoice: User chose special option with outcome ${outcomeValue}.`);
    if (isTransitioning || quizState.currentMatchup >= ABSOLUTE_MAX_MATCHUPS || !quizState.currentActivityA || !quizState.currentActivityB) return;
    
    setIsTransitioning(true);
    
    const updatedActivityData = processChoice(
      quizState.currentActivityA, 
      quizState.currentActivityB, 
      outcomeValue, 
      quizState.activityData,
      'tie' // Special choices use tie strength
    );
    
    const newMatchupCount = quizState.currentMatchup + 1;
    
    // Track the special choice (tie)
    const actualChoice = {
      activityA: quizState.currentActivityA.title,
      activityB: quizState.currentActivityB.title,
      chosen: 'tie', // Special indicator for ties
      strength: 'tie' as const,
      matchupNumber: newMatchupCount
    };
    
    // For special choices (ties), we don't update prediction accuracy since there's no clear winner
    // But we still calculate algorithm strength based on existing predictions
    const newAlgorithmStrength = calculateAlgorithmStrength(
      quizState.algorithmStrength.predictionHistory, 
      newMatchupCount
    );
    
    setQuizState(prev => ({
      ...prev,
      activityData: updatedActivityData,
      currentMatchup: newMatchupCount,
      algorithmStrength: newAlgorithmStrength,
      actualChoices: [...prev.actualChoices, actualChoice]
    }));

    // For logged-in users, never force completion based on algorithm readiness
    const shouldEnd = currentUser 
      ? newMatchupCount >= ABSOLUTE_MAX_MATCHUPS
      : (newAlgorithmStrength.isReady || newMatchupCount >= ABSOLUTE_MAX_MATCHUPS);

    if (shouldEnd) {
      setTimeout(() => onFinishQuiz(), 300);
    } else {
      setTimeout(() => {
        const pair = selectActivitiesForMatchup();
        if (pair) {
          const prediction = makePrediction(
            pair.actA, 
            pair.actB, 
            updatedActivityData, 
            newMatchupCount + 1
          );
          setCurrentPrediction(prediction);

          setQuizState(prev => {
            const newHistory = [...prev.recentMatchupHistory, pair.actA.id, pair.actB.id];
            if (newHistory.length > RECENT_HISTORY_SIZE) {
              newHistory.splice(0, newHistory.length - RECENT_HISTORY_SIZE);
            }

            return {
              ...prev,
              currentActivityA: pair.actA,
              currentActivityB: pair.actB,
              recentMatchupHistory: newHistory
              // Preserve currentInsight and other fields automatically with ...prev
            };
          });
        }
        setIsTransitioning(false);
      }, 300);
    }
  };

  // Calculate progress differently for adaptive quiz
  const progressPercentage = quizState.currentMatchup >= quizState.minMatchups 
    ? Math.min(100, (quizState.algorithmStrength.score / quizState.targetStrength) * 100)
    : (quizState.currentMatchup / quizState.minMatchups) * 50; // First 50% is just getting to min matchups
    
  // Get algorithm status for combined display
  const getAlgorithmStatus = () => {
    const isTrackingStarted = quizState.currentMatchup >= quizState.minMatchups;
    
    console.log('getAlgorithmStatus: currentInsight =', quizState.currentInsight);
    
    // If there's a current insight, display it
    if (quizState.currentInsight) {
      console.log('Displaying insight:', quizState.currentInsight.text);
      return {
        emoji: "💡",
        title: "Insight:",
        subtitle: quizState.currentInsight.text,
        color: "text-blue-400",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        isInsight: true
      };
    }
    
    if (!isTrackingStarted) {
      return {
        emoji: "🤔",
        title: "Getting to know you...",
        subtitle: `${quizState.minMatchups - quizState.currentMatchup} more to start tracking`,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200"
      };
    }
    
    if (quizState.algorithmStrength.isReady) {
      return {
        emoji: "🎯",
        title: "I've got your style!",
        subtitle: "Ready to finish anytime",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200"
      };
    } else if (quizState.algorithmStrength.confidence === 'high') {
      return {
        emoji: "🧠",
        title: "Almost there!",
        subtitle: "Getting good at predicting",
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200"
      };
    } else if (quizState.algorithmStrength.confidence === 'medium') {
      return {
        emoji: "🤖",
        title: "Learning your patterns...",
        subtitle: "Starting to understand",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200"
      };
    } else {
      return {
        emoji: "📚",
        title: "Figuring you out...",
        subtitle: "Your preferences are unique",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200"
      };
    }
  };

  const algorithmStatus = getAlgorithmStatus();

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  if (!quizState.currentActivityA || !quizState.currentActivityB) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4">
        <header className="mb-2 md:mb-6 text-center">
          <h1 className="hidden md:block text-2xl md:text-3xl font-light text-white mb-4">would you rather...</h1>
          
          {/* Combined progress and algorithm status */}
          <div className="w-full bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 mb-2 md:p-4 md:mb-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{algorithmStatus.emoji}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">{algorithmStatus.title}</div>
                <div className="text-xs text-gray-400">{algorithmStatus.subtitle}</div>
              </div>
              <div className="text-xs text-right text-gray-400">
                {(() => {
                  if (quizState.currentMatchup >= quizState.minMatchups) {
                    const predictions = quizState.algorithmStrength.predictionHistory.filter(p => p.wasCorrect !== null);
                    const correct = predictions.filter(p => p.wasCorrect === true).length;
                    return `${correct}/${predictions.length} correct`;
                  } else {
                    return `${quizState.currentMatchup}/${quizState.minMatchups}`;
                  }
                })()}
              </div>
            </div>
            
            {/* Combined progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            
            {/* Recent predictions dots - only show when tracking */}
            {quizState.currentMatchup >= quizState.minMatchups && (() => {
              const predictions = quizState.algorithmStrength.predictionHistory.filter(p => p.wasCorrect !== null);
              return predictions.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Recent predictions:</span>
                  <div className="flex gap-1">
                    {quizState.algorithmStrength.predictionHistory
                      .slice(-6) // Show last 6 predictions for mobile
                      .map((prediction, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${prediction.wasCorrect === true ? 'bg-emerald-400' : prediction.wasCorrect === false ? 'bg-red-400' : 'bg-gray-600'}`}
                        />
                      ))}
                  </div>
                </div>
              );
            })()}
          </div>
          
          <p className="text-xs md:text-sm text-gray-400">thinking...</p>
        </header>
        
        <main className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-6 items-stretch mb-2 md:mb-4">
          <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="">
              <h3 className="text-white font-semibold mb-1">loading...</h3>
              <p className="text-gray-300 text-sm">just a sec...</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:flex-col">
            <span className="text-gray-400 md:text-sm text-base">or maybe...</span>
          </div>
          <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg p-4 md:mt-0 mt-2">
            <div className="">
              <h3 className="text-white font-semibold mb-1">loading...</h3>
              <p className="text-gray-300 text-sm">hang on...</p>
            </div>
          </div>
        </main>
        
        {/* Tutorial Overlay */}
        {showTutorial && (
          <TutorialOverlay onComplete={handleTutorialComplete} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <header className="mb-2 md:mb-6 text-center">
        <h1 className="hidden md:block text-2xl md:text-3xl font-light text-white mb-4">would you rather...</h1>
        
        {/* Combined progress and algorithm status */}
        <div className="w-full bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 mb-2 md:p-4 md:mb-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">{algorithmStatus.emoji}</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white">{algorithmStatus.title}</div>
              <div className="text-xs text-gray-400">{algorithmStatus.subtitle}</div>
            </div>
            <div className="text-xs text-right text-gray-400">
              {(() => {
                if (quizState.currentMatchup >= quizState.minMatchups) {
                  const predictions = quizState.algorithmStrength.predictionHistory.filter(p => p.wasCorrect !== null);
                  const correct = predictions.filter(p => p.wasCorrect === true).length;
                  return `${correct}/${predictions.length} correct`;
                } else {
                  return `${quizState.currentMatchup}/${quizState.minMatchups}`;
                }
              })()}
            </div>
          </div>
          
          {/* Combined progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          
          {/* Recent predictions dots - only show when tracking */}
          {quizState.currentMatchup >= quizState.minMatchups && (() => {
            const predictions = quizState.algorithmStrength.predictionHistory.filter(p => p.wasCorrect !== null);
            return predictions.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Recent predictions:</span>
                <div className="flex gap-1">
                  {quizState.algorithmStrength.predictionHistory
                    .slice(-6) // Show last 6 predictions for mobile
                    .map((prediction, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${prediction.wasCorrect === true ? 'bg-emerald-400' : prediction.wasCorrect === false ? 'bg-red-400' : 'bg-gray-300'}`}
                      />
                    ))}
                </div>
              </div>
            );
          })()}
        </div>
      </header>
      
      {/* Tutorial hint for first matchup only */}
      {quizState.currentMatchup === 0 && (
        <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-600 rounded-lg p-2 mb-2 md:p-3 md:mb-4 text-center">
          <p className="text-xs md:text-sm text-gray-300">
            <span className="font-semibold text-yellow-400">💡 Tip:</span> Top half = <strong className="text-pink-400">strongly</strong> prefer 💪, bottom half = <strong className="text-blue-400">somewhat</strong> prefer 👍
          </p>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-6 items-stretch mb-2 md:mb-4">
        {/* Activity A */}
        <div className={`bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${
          isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}>
          {/* Strong preference zone (top half) */}
          <div 
            className="cursor-pointer flex-1 p-4 hover:bg-pink-600/20 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityA!.id, 'strong')}
          >
            <div className="pb-1">
              <h3 className="text-white font-semibold mb-1">{quizState.currentActivityA.title}</h3>
              <p className="text-gray-300 text-sm">{quizState.currentActivityA.subtitle}</p>
            </div>
            <div className="absolute top-2 right-2 text-xs text-pink-400 opacity-60 font-medium">
              💪 strongly
            </div>
          </div>
          
          {/* Divider line */}
          <div className="border-t border-gray-600 mx-4"></div>
          
          {/* Somewhat preference zone (bottom half) */}
          <div 
            className="cursor-pointer py-3 px-4 hover:bg-blue-500/20 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityA!.id, 'somewhat')}
          >
            <div className="text-center">
              <div className="text-xs text-blue-400 font-medium">👍 somewhat prefer</div>
            </div>
            <div className="absolute top-1 right-2 text-xs text-blue-400 opacity-70 font-medium">
              👍
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center md:flex-col">
          <span className="text-gray-400 md:text-sm text-base">or maybe...</span>
        </div>
        
        {/* Activity B */}
        <div className={`bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden md:mt-0 mt-2 transition-all duration-300 ${
          isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}>
          {/* Strong preference zone (top half) */}
          <div 
            className="cursor-pointer flex-1 p-4 hover:bg-pink-600/20 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityB!.id, 'strong')}
          >
            <div className="pb-1">
              <h3 className="text-white font-semibold mb-1">{quizState.currentActivityB.title}</h3>
              <p className="text-gray-300 text-sm">{quizState.currentActivityB.subtitle}</p>
            </div>
            <div className="absolute top-2 right-2 text-xs text-pink-400 opacity-70 font-medium">
              💪 strongly
            </div>
          </div>
          
          {/* Divider line */}
          <div className="border-t border-gray-600 mx-4"></div>
          
          {/* Somewhat preference zone (bottom half) */}
          <div 
            className="cursor-pointer py-3 px-4 hover:bg-blue-500/20 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityB!.id, 'somewhat')}
          >
            <div className="text-center">
              <div className="text-xs text-blue-400 font-medium">👍 somewhat prefer</div>
            </div>
            <div className="absolute top-1 right-2 text-xs text-blue-400 opacity-70 font-medium">
              👍 
            </div>
          </div>
        </div>
      </main>
      
      <div className="flex flex-wrap gap-3 justify-center my-2 md:my-6">
        <button 
          onClick={() => handleSpecialChoice(0.5)}
          disabled={isTransitioning}
          className={`bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-600 ${
            isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
          }`}
        >
          🤔 both sound good!
        </button>
        <button 
          onClick={() => handleSpecialChoice(0.5)}
          disabled={isTransitioning}
          className={`bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-300 px-4 py-2 rounded-lg transition-all duration-300 border border-gray-600 hover:border-gray-500 ${
            isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
          }`}
        >
          😐 neither appeal to me
        </button>
        {currentUser ? (
          // Logged-in users can stop anytime and save progress
          <div className="flex gap-2 flex-wrap justify-center">
            <button 
              onClick={() => handleEndEarly(onFinishQuiz, currentUser, onStopQuiz)}
              disabled={isTransitioning}
              className={`bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-600 ${
                isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              💾 stop & save progress
            </button>
            {onSaveProgress && (
              <button 
                onClick={onSaveProgress}
                disabled={isTransitioning}
                className={`bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-300 text-sm px-4 py-2 rounded-lg transition-all duration-300 border border-gray-600 hover:border-gray-500 ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
                }`}
              >
                💾 quick save
              </button>
            )}
          </div>
        ) : (
          // Anonymous users only see end early after minimum matchups
          quizState.currentMatchup >= quizState.minMatchups && (
            <button 
              onClick={() => handleEndEarly(onFinishQuiz, currentUser, onStopQuiz)}
              disabled={isTransitioning}
              className={`bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-600 ${
                isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              end quiz early
            </button>
          )
        )}
      </div>
      
      <footer className="hidden md:block mt-4 md:mt-6 text-center">
        <p className="text-xs text-gray-500">&copy; 2025</p>
      </footer>
      
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay onComplete={handleTutorialComplete} />
      )}
    </div>
  );
}