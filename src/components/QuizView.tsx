'use client'

import { useEffect, useState } from 'react';
import { Activity, QuizState, MatchupPrediction, PreferenceStrength, User } from '@/types/quiz';
import { ABSOLUTE_MAX_MATCHUPS, RECENT_HISTORY_SIZE } from '@/lib/constants';
import { processChoice } from '@/lib/eloCalculations';
import { makePrediction, updatePredictionWithResult, calculateAlgorithmStrength } from '@/lib/algorithmStrength';
import AlgorithmStrengthMeter from './AlgorithmStrengthMeter';

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

export default function QuizView({ quizState, setQuizState, onFinishQuiz, currentUser, onStopQuiz, onSaveProgress }: QuizViewProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<MatchupPrediction | null>(null);

  useEffect(() => {
    if (quizState.activityData.length >= 2 && !quizState.currentActivityA && !quizState.currentActivityB) {
      displayMatchup();
    }
  }, [quizState.activityData]);

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

  const displayMatchup = () => {
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
  };

  const handleChoice = (chosenActivityId: number, strength: PreferenceStrength = 'somewhat') => {
    console.log(`handleChoice: User chose activity ID ${chosenActivityId} with strength ${strength}.`);
    if (isTransitioning || quizState.currentMatchup >= ABSOLUTE_MAX_MATCHUPS || !quizState.currentActivityA || !quizState.currentActivityB) return;
    
    // Start transition animation
    setIsTransitioning(true);
    
    const outcomeForDisplayedA = quizState.currentActivityA.id === chosenActivityId ? 1 : 0;
    const updatedActivityData = processChoice(
      quizState.currentActivityA, 
      quizState.currentActivityB, 
      outcomeForDisplayedA, 
      quizState.activityData,
      strength
    );
    
    const newMatchupCount = quizState.currentMatchup + 1;
    
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
      algorithmStrength: newAlgorithmStrength
    }));

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
      algorithmStrength: newAlgorithmStrength
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

  if (!quizState.currentActivityA || !quizState.currentActivityB) {
    return (
      <div className="view-container w-full max-w-5xl">
        <header className="mb-4 md:mb-6 text-center">
          <h1>would you rather...</h1>
          <div className="w-full progress-bar-container rounded-full h-4 md:h-5 mb-1">
            <div className="progress-bar-fill h-3 md:h-4" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="text-xs md:text-sm text-brown-600">thinking...</p>
        </header>
        
        <AlgorithmStrengthMeter 
          algorithmStrength={quizState.algorithmStrength}
          currentMatchup={quizState.currentMatchup}
          minMatchups={quizState.minMatchups}
          targetStrength={quizState.targetStrength}
        />
        <main className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-stretch mb-4">
          <div className="activity-card playful-card">
            <div className="activity-card-content">
              <h3 className="activity-title">loading...</h3>
              <p className="activity-subtitle">just a sec...</p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <span className="vs-separator">or maybe...</span>
          </div>
          <div className="activity-card playful-card md:mt-0 mt-4">
            <div className="activity-card-content">
              <h3 className="activity-title">loading...</h3>
              <p className="activity-subtitle">hang on...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="view-container w-full max-w-5xl">
      <header className="mb-4 md:mb-6 text-center">
        <h1>would you rather...</h1>
        <div className="w-full progress-bar-container rounded-full h-4 md:h-5 mb-1">
          <div className="progress-bar-fill h-3 md:h-4" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <p className="text-xs md:text-sm text-brown-600">
          choice #{quizState.currentMatchup} 
          {quizState.currentMatchup >= quizState.minMatchups 
            ? ` • ${quizState.algorithmStrength.isReady ? 'algorithm ready!' : 'learning your style...'}`
            : ` • warming up... (${quizState.minMatchups - quizState.currentMatchup} more to start tracking)`
          }
        </p>
      </header>
      
      <AlgorithmStrengthMeter 
        algorithmStrength={quizState.algorithmStrength}
        currentMatchup={quizState.currentMatchup}
        minMatchups={quizState.minMatchups}
        targetStrength={quizState.targetStrength}
      />
      
      {/* Tutorial hint for first few matchups */}
      {quizState.currentMatchup < 3 && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-400 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">💡 How to choose:</span> Click the <strong>top half</strong> of a card if you strongly prefer it (💪), 
            or the <strong>bottom half</strong> if you somewhat prefer it (👍)
          </p>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-stretch mb-4">
        {/* Activity A */}
        <div className={`activity-card playful-card transition-all duration-300 ${
          isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}>
          {/* Strong preference zone (top half) */}
          <div 
            className="activity-choice-zone activity-choice-strong cursor-pointer flex-1 rounded-t-lg hover:bg-coral-100/30 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityA!.id, 'strong')}
          >
            <div className="activity-card-content pb-1">
              <h3 className="activity-title">{quizState.currentActivityA.title}</h3>
              <p className="activity-subtitle">{quizState.currentActivityA.subtitle}</p>
            </div>
            <div className="absolute top-2 right-2 text-xs text-coral-600 opacity-70 font-medium">
              💪 strongly
            </div>
          </div>
          
          {/* Divider line */}
          <div className="border-t-2 border-dashed border-coral-300 mx-4"></div>
          
          {/* Somewhat preference zone (bottom half) */}
          <div 
            className="activity-choice-zone activity-choice-somewhat cursor-pointer flex-none py-3 rounded-b-lg hover:bg-blue-100/30 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityA!.id, 'somewhat')}
          >
            <div className="text-center">
              <div className="text-xs text-blue-600 font-medium">👍 somewhat prefer</div>
            </div>
            <div className="absolute top-1 right-2 text-xs text-blue-600 opacity-70 font-medium">
              👍 somewhat
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <span className="vs-separator">or maybe...</span>
        </div>
        
        {/* Activity B */}
        <div className={`activity-card playful-card md:mt-0 mt-4 transition-all duration-300 ${
          isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}>
          {/* Strong preference zone (top half) */}
          <div 
            className="activity-choice-zone activity-choice-strong cursor-pointer flex-1 rounded-t-lg hover:bg-coral-100/30 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityB!.id, 'strong')}
          >
            <div className="activity-card-content pb-1">
              <h3 className="activity-title">{quizState.currentActivityB.title}</h3>
              <p className="activity-subtitle">{quizState.currentActivityB.subtitle}</p>
            </div>
            <div className="absolute top-2 right-2 text-xs text-coral-600 opacity-70 font-medium">
              💪 strongly
            </div>
          </div>
          
          {/* Divider line */}
          <div className="border-t-2 border-dashed border-coral-300 mx-4"></div>
          
          {/* Somewhat preference zone (bottom half) */}
          <div 
            className="activity-choice-zone activity-choice-somewhat cursor-pointer flex-none py-3 rounded-b-lg hover:bg-blue-100/30 transition-colors duration-200 relative"
            onClick={() => !isTransitioning && handleChoice(quizState.currentActivityB!.id, 'somewhat')}
          >
            <div className="text-center">
              <div className="text-xs text-blue-600 font-medium">👍 somewhat prefer</div>
            </div>
            <div className="absolute top-1 right-2 text-xs text-blue-600 opacity-70 font-medium">
              👍 somewhat
            </div>
          </div>
        </div>
      </main>
      
      <div className="button-group my-4 md:my-6">
        <button 
          onClick={() => handleSpecialChoice(0.5)}
          disabled={isTransitioning}
          className={`playful-button-secondary transition-all duration-300 ${
            isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
          }`}
        >
          hmm, both sound good!
        </button>
        <button 
          onClick={() => handleSpecialChoice(0.5)}
          disabled={isTransitioning}
          className={`playful-button-tertiary transition-all duration-300 ${
            isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
          }`}
        >
          ugh, neither are great.
        </button>
        {currentUser ? (
          // Logged-in users can stop anytime and save progress
          <div className="flex gap-2 flex-wrap justify-center">
            <button 
              onClick={() => handleEndEarly(onFinishQuiz, currentUser, onStopQuiz)}
              disabled={isTransitioning}
              className={`playful-button-secondary text-sm transition-all duration-300 ${
                isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              💾 stop & save progress
            </button>
            {onSaveProgress && (
              <button 
                onClick={onSaveProgress}
                disabled={isTransitioning}
                className={`playful-button-tertiary text-sm transition-all duration-300 ${
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
              className={`playful-button-secondary text-sm transition-all duration-300 ${
                isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              end quiz early
            </button>
          )
        )}
      </div>
      
      <footer className="mt-4 md:mt-6 text-center">
        <p className="text-xs text-brown-500">&copy; 2025</p>
      </footer>
    </div>
  );
}