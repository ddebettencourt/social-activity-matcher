import { User } from '@/types/quiz';

interface StartViewProps {
  onStartQuiz: () => void;
  currentUser: User | null;
  onBackToSplash: () => void;
}

export default function StartView({ onStartQuiz, currentUser, onBackToSplash }: StartViewProps) {
  return (
    <div className="w-full flex items-center justify-center px-4 relative">
      <div className="max-w-lg w-full text-center relative z-10">
        {currentUser && (
          <div className="mb-6 p-4 bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700">
            <p className="text-white font-medium">👋 Hey {currentUser.username}!</p>
          </div>
        )}
        
        <header className="mb-12">
          <div className="text-4xl md:text-5xl mb-6">🎯</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4 leading-tight">
            ready to <span className="font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">discover</span> your style?
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            pick your favorites in 1v1 matchups, and we'll learn your preferences
          </p>
        </header>
        
        <footer className="space-y-6">
          <button 
            onClick={onStartQuiz}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            let's go! ✨
          </button>
          
          <div className="space-y-3">
            <button 
              onClick={onBackToSplash}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-6 py-3 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
            >
              ← back to home
            </button>
            
          </div>
        </footer>
      </div>
    </div>
  );
}