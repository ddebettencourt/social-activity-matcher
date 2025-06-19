'use client'

import { useState } from 'react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [chosenSnakes, setChosenSnakes] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleChoice = (activityId: 'snakes' | 'dinner', strength: 'strong' | 'somewhat') => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (activityId === 'snakes') {
      setChosenSnakes(true);
    }
    
    // Go directly to explanation step with a smooth transition
    setTimeout(() => {
      setStep(1);
      setIsTransitioning(false);
    }, 500);
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const steps = [
    {
      title: "Welcome! Let's learn how this works 👋",
      subtitle: "Try choosing between these two activities to understand the interface:",
      showCards: true
    },
    {
      title: chosenSnakes ? "Great choice! 🐍😱" : "Great choice! 🎉",
      subtitle: chosenSnakes 
        ? "We can learn anyone's preferences, I guess. Let me explain how this works:"
        : "Now you know how to make choices. Here's what the interface does:",
      showCards: false
    },
    {
      title: "You're all set! 🚀",
      subtitle: "The algorithm learns from your choices and gets better at predicting your preferences. Ready to start the real quiz?",
      showCards: false
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="tutorial-overlay fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
        {/* Tutorial Header */}
        <div className="p-4 text-center border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-1">{currentStep.title}</h2>
          <p className="text-sm text-gray-400">{currentStep.subtitle}</p>
        </div>

        {/* Tutorial Content */}
        <div className="p-4">
          {currentStep.showCards && (
            <div className="space-y-3 mb-4">
              {/* Snakes Card */}
              <div className={`bg-gray-800 border border-gray-600 rounded-lg overflow-hidden transition-all duration-300 ${
                isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}>
                {/* Strong preference zone */}
                <div 
                  className="cursor-pointer flex-1 p-4 hover:bg-pink-600/20 transition-colors duration-200 relative"
                  onClick={() => !isTransitioning && handleChoice('snakes', 'strong')}
                >
                  <div className="pb-1">
                    <h3 className="text-white font-semibold mb-1">Falling Into a Pit of Snakes</h3>
                    <p className="text-gray-300 text-sm">The classic nightmare scenario</p>
                  </div>
                  <div className="absolute top-2 right-2 text-xs text-pink-400 opacity-60 font-medium">
                    💪 strongly
                  </div>
                </div>
                
                {/* Divider line */}
                <div className="border-t border-gray-600 mx-4"></div>
                
                {/* Somewhat preference zone */}
                <div 
                  className="cursor-pointer py-3 px-4 hover:bg-blue-500/20 transition-colors duration-200 relative"
                  onClick={() => !isTransitioning && handleChoice('snakes', 'somewhat')}
                >
                  <div className="text-center">
                    <div className="text-xs text-blue-400 font-medium">👍 somewhat prefer</div>
                  </div>
                  <div className="absolute top-1 right-2 text-xs text-blue-400 opacity-70 font-medium">
                    👍
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-400">or maybe...</span>
              </div>

              {/* Dinner Card */}
              <div className={`bg-gray-800 border border-gray-600 rounded-lg overflow-hidden transition-all duration-300 ${
                isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}>
                {/* Strong preference zone */}
                <div 
                  className="cursor-pointer flex-1 p-4 hover:bg-pink-600/20 transition-colors duration-200 relative"
                  onClick={() => !isTransitioning && handleChoice('dinner', 'strong')}
                >
                  <div className="pb-1">
                    <h3 className="text-white font-semibold mb-1">Nice Dinner With Friends</h3>
                    <p className="text-gray-300 text-sm">Good food, good company, good times</p>
                  </div>
                  <div className="absolute top-2 right-2 text-xs text-pink-400 opacity-60 font-medium">
                    💪 strongly
                  </div>
                </div>
                
                {/* Divider line */}
                <div className="border-t border-gray-600 mx-4"></div>
                
                {/* Somewhat preference zone */}
                <div 
                  className="cursor-pointer py-3 px-4 hover:bg-blue-500/20 transition-colors duration-200 relative"
                  onClick={() => !isTransitioning && handleChoice('dinner', 'somewhat')}
                >
                  <div className="text-center">
                    <div className="text-xs text-blue-400 font-medium">👍 somewhat prefer</div>
                  </div>
                  <div className="absolute top-1 right-2 text-xs text-blue-400 opacity-70 font-medium">
                    👍
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong className="text-pink-400">🎯 Top half</strong> = Strongly prefer (you really want this!)</p>
                <p><strong className="text-blue-400">👍 Bottom half</strong> = Somewhat prefer (it's a little better, I guess)</p>
                <p><strong className="text-gray-400">🤔 Other options</strong> = Both sound good, or neither appeals</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong className="text-purple-400">🧠 The Algorithm</strong> learns your patterns and gets better at predicting what you'll choose</p>
                <p><strong className="text-blue-400">📊 Progress Bar</strong> shows how confident the algorithm is about your preferences</p>
                <p>Once the algorithm finishes learning your preferences, you'll be shown some unique insights about yourself!</p>
              </div>
            </div>
          )}
        </div>

        {/* Tutorial Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === step ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {step === 0 && (
              <button
                onClick={onComplete}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors"
              >
                Skip Tutorial
              </button>
            )}
            
            {step >= 1 && (
              <button
                onClick={handleNext}
                className="text-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {step === 2 ? "Start Quiz! 🚀" : "Got it! 👍"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}