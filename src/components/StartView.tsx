import { User } from '@/types/quiz';

interface StartViewProps {
  onStartQuiz: () => void;
  currentUser: User | null;
  onBackToSplash: () => void;
}

export default function StartView({ onStartQuiz, currentUser, onBackToSplash }: StartViewProps) {
  return (
    <div className="view-container max-w-xl w-full text-center playful-card p-6 md:p-10">
      {currentUser && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-700 font-medium">👋 Welcome back, {currentUser.username}!</p>
          <p className="text-purple-600 text-sm">Ready to discover your social preferences?</p>
        </div>
      )}
      
      <header className="mb-6">
        <h1>activity picker!</h1>
        <p className="text-brown-700 text-base md:text-lg">let&apos;s find some fun stuff for you to do!</p>
      </header>
      
      <main className="mb-8">
        <p className="text-brown-600 mb-6 text-sm md:text-base">
          pick your faves and we&apos;ll figure out what makes an event super cool for YOU.
        </p>
      </main>
      
      <footer>
        <button 
          onClick={onStartQuiz}
          className="playful-button-primary mb-4"
        >
          let&apos;s go!
        </button>
        
        <div className="space-y-2">
          <button 
            onClick={onBackToSplash}
            className="playful-button-secondary text-sm px-4 py-2"
          >
            ← back to home
          </button>
          <p className="text-xs text-brown-500">&copy; 2025 Fun Finder ELO Edition</p>
        </div>
      </footer>
    </div>
  );
}