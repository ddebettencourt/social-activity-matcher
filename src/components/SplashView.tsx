import { useState } from 'react';
import AnimatedSparks from './AnimatedSparks';

interface SplashViewProps {
  onStartQuiz: () => void;
  onLogin: (username: string) => void;
  isLoading: boolean;
}

export default function SplashView({ onStartQuiz, onLogin, isLoading }: SplashViewProps) {
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
    <div className="w-full flex items-center justify-center px-4 relative">
      {/* Animated sparks background */}
      <AnimatedSparks />
      
      <div className="max-w-lg w-full text-center relative z-10">
        {/* Main Logo/Title */}
        <div className="mb-12">
          <div className="text-6xl md:text-7xl mb-6">✨</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4 leading-tight">
            a <span className="font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">spark</span> for your social life
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            the right activities, with the right people
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-12">
          <button
            onClick={onStartQuiz}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
            disabled={isLoading}
          >
            {isLoading ? '⏳ starting...' : 'start the quiz'}
          </button>
          
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-6 py-3 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'loading...' : 'log in'}
          </button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
            <div className="text-lg mb-1">⚡</div>
            <div>5-10 minutes</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
            <div className="text-lg mb-1">🧠</div>
            <div>adaptive learning</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
            <div className="text-lg mb-1">🎯</div>
            <div>170+ activities</div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-medium text-center mb-6 text-white">
              welcome back
            </h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                  placeholder="enter your username"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-3 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
                  disabled={isLoading}
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  disabled={!username.trim() || isLoading}
                >
                  {isLoading ? 'loading...' : 'log in'}
                </button>
              </div>
            </form>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              new? just start the quiz to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}