import { AlgorithmStrength } from '@/types/quiz';

interface AlgorithmStrengthMeterProps {
  algorithmStrength: AlgorithmStrength;
  currentMatchup: number;
  minMatchups: number;
  targetStrength: number;
}

export default function AlgorithmStrengthMeter({ 
  algorithmStrength, 
  currentMatchup, 
  minMatchups,
  targetStrength 
}: AlgorithmStrengthMeterProps) {
  const isTrackingStarted = currentMatchup >= minMatchups;
  
  // Human-friendly status messages
  const getStatusMessage = () => {
    if (!isTrackingStarted) {
      return {
        emoji: "🤔",
        title: "Getting to know you...",
        description: `I need to see how you choose before I can predict! ${minMatchups - currentMatchup} more choices to go.`,
        color: "text-blue-600"
      };
    }
    
    if (algorithmStrength.isReady) {
      return {
        emoji: "🎯",
        title: "I've got your style figured out!",
        description: `I've been getting your recent choices right consistently. Ready to finish!`,
        color: "text-emerald-600"
      };
    } else if (algorithmStrength.confidence === 'high') {
      return {
        emoji: "🧠",
        title: "Almost there!",
        description: `Getting good at predicting your recent choices. Just need a bit more confidence...`,
        color: "text-amber-600"
      };
    } else if (algorithmStrength.confidence === 'medium') {
      return {
        emoji: "🤖",
        title: "Learning your patterns...",
        description: `I'm starting to understand your recent preferences. Keep going so I can get better!`,
        color: "text-blue-600"
      };
    } else {
      return {
        emoji: "📚",
        title: "Still figuring you out...",
        description: `Your preferences are unique and I'm still learning!`,
        color: "text-gray-600"
      };
    }
  };
  
  const status = getStatusMessage();
  
  if (!isTrackingStarted) {
    return (
      <div className="bg-white/80 border-2 border-dashed border-blue-400 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{status.emoji}</span>
          <div className="flex-1">
            <span className={`text-sm font-semibold ${status.color}`}>{status.title}</span>
            <div className="text-xs text-gray-700 mt-1">{status.description}</div>
          </div>
          <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
            {currentMatchup}/{minMatchups}
          </span>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(currentMatchup / minMatchups) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  const progressFillWidth = (algorithmStrength.score / targetStrength) * 100;
  const isReady = algorithmStrength.isReady;
  
  return (
    <div className={`bg-white/80 border-2 border-dashed rounded-lg p-4 mb-4 ${
      isReady ? 'border-emerald-400 bg-emerald-50/80' : 
      algorithmStrength.confidence === 'high' ? 'border-amber-400 bg-amber-50/80' :
      'border-blue-400'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{status.emoji}</span>
        <div className="flex-1">
          <span className={`text-sm font-semibold ${status.color}`}>{status.title}</span>
          <div className="text-xs text-gray-700 mt-1">{status.description}</div>
        </div>
{(() => {
          const predictions = algorithmStrength.predictionHistory.filter(p => p.wasCorrect !== null);
          return predictions.length > 0 && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
              {predictions.filter(p => p.wasCorrect).length}/{predictions.length} right
            </span>
          );
        })()}
      </div>
      
      {/* Progress visualization */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-3 relative overflow-hidden">
        {/* Progress fill */}
        <div 
          className={`h-4 rounded-full transition-all duration-500 ${
            isReady 
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
              : algorithmStrength.confidence === 'high'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500'
              : algorithmStrength.confidence === 'medium'
              ? 'bg-gradient-to-r from-blue-400 to-blue-500'
              : 'bg-gradient-to-r from-gray-400 to-gray-500'
          }`}
          style={{ width: `${Math.min(100, progressFillWidth)}%` }}
        />
        
        {/* Success sparkle effect */}
        {isReady && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
        )}
      </div>
      
      {/* Recent prediction dots visualization */}
      {(() => {
        const predictions = algorithmStrength.predictionHistory.filter(p => p.wasCorrect !== null);
        return predictions.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Recent predictions:</span>
            <div className="flex gap-1">
              {algorithmStrength.predictionHistory
                .slice(-8) // Show last 8 predictions
                .map((prediction, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      prediction.wasCorrect === true 
                        ? 'bg-emerald-400 scale-110' 
                        : prediction.wasCorrect === false 
                        ? 'bg-red-400' 
                        : 'bg-gray-300'
                    }`}
                    title={`Choice ${prediction.matchupNumber}: ${
                      prediction.wasCorrect === true ? 'I guessed right!' : 
                      prediction.wasCorrect === false ? 'I guessed wrong' : 'Tie/unclear'
                    }`}
                  />
                ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}