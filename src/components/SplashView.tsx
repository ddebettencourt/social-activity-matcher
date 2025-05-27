import { useState } from 'react';

interface SplashViewProps {
  onStartQuiz: () => void;
  onLogin: (username: string) => void;
  onCustomEvent: () => void;
  isLoading: boolean;
}

export default function SplashView({ onStartQuiz, onLogin, onCustomEvent, isLoading }: SplashViewProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isLoading) return;
    
    await onLogin(username.trim());
    setShowLoginModal(false);
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Main Logo/Title */}
        <div className="mb-8 -mt-8">
          <div className="text-6xl md:text-8xl mb-4 md:mb-6">🧬</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 mb-6 md:mb-8 leading-tight py-2 md:py-4">
            find your social genes
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto px-4">
            take our fun quiz to uncover your social preferences and get personalized activity recommendations
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <button
            onClick={onStartQuiz}
            className="playful-button-primary text-lg sm:text-xl px-6 sm:px-8 py-3 sm:py-4 w-full md:w-auto min-w-64 min-h-[48px]"
            disabled={isLoading}
          >
            🚀 start the quiz!
          </button>
          
          <div className="text-gray-500 text-sm sm:text-base">or</div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowLoginModal(true)}
              className="playful-button-secondary text-base sm:text-lg px-4 sm:px-6 py-3 w-full sm:w-auto min-w-48 min-h-[48px]"
              disabled={isLoading}
            >
              {isLoading ? '⏳ loading...' : '👤 log in to profile'}
            </button>
            <button
              onClick={onCustomEvent}
              className="playful-button-secondary text-base sm:text-lg px-4 sm:px-6 py-3 w-full sm:w-auto min-w-48 min-h-[48px]"
              disabled={isLoading}
            >
              🔮 analyze custom event
            </button>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center text-xs sm:text-sm text-gray-600">
          <div className="playful-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚡</div>
            <div>takes 5-10 minutes</div>
          </div>
          <div className="playful-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🎯</div>
            <div>smart algorithm learns you</div>
          </div>
          <div className="playful-card p-3 sm:p-4">
            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🎪</div>
            <div>170+ activity options</div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full playful-card">
            <h2 className="text-2xl font-bold text-center mb-4 text-purple-700">
              👋 welcome back!
            </h2>
            <p className="text-gray-600 text-center mb-6">
              enter your username to load your profile
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="your username"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 playful-button-secondary py-2"
                  disabled={isLoading}
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 playful-button-primary py-2"
                  disabled={!username.trim() || isLoading}
                >
                  {isLoading ? 'loading...' : 'log in'}
                </button>
              </div>
            </form>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              don&apos;t have a profile? take the quiz and we&apos;ll help you create one!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}