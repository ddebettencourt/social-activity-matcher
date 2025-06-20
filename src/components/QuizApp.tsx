'use client'

import { useState, useEffect, useCallback } from 'react';
import { QuizState, User } from '@/types/quiz';
import { loadActivities } from '@/lib/csvParser';
import { initialActivitiesData, MIN_MATCHUPS_FOR_ALGORITHM, TARGET_ALGORITHM_STRENGTH } from '@/lib/constants';
import { createUser, getUser, updateUserLastActive, saveQuizResults, getQuizResults, clearQuizResults, migrateLocalStorageToSupabase, testConnection } from '@/lib/database';
import SplashView from './SplashView';
import StartView from './StartView';
import QuizView from './QuizView';
import ResultsView from './ResultsView';
import ProfileView from './ProfileView';
import CustomEventView from './CustomEventView';
import ProfilesPage from './ProfilesPage';

type ViewType = 'splash' | 'start' | 'quiz' | 'results' | 'profile' | 'customEvent' | 'profiles';

export default function QuizApp() {
  const [currentView, setCurrentView] = useState<ViewType>('splash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    currentMatchup: 0,
    activityData: [],
    currentActivityA: null,
    currentActivityB: null,
    recentMatchupHistory: [],
    isQuizComplete: false,
    algorithmStrength: {
      score: 0,
      confidence: 'low',
      isReady: false,
      predictionHistory: []
    },
    minMatchups: MIN_MATCHUPS_FOR_ALGORITHM,
    targetStrength: TARGET_ALGORITHM_STRENGTH,
    insights: [],
    currentInsight: undefined,
    actualChoices: []
  });

  useEffect(() => {
    // Test Supabase connection on app start
    testConnection();
  }, []);
  
  useEffect(() => {
    // Only initialize fresh quiz state for anonymous users starting a new quiz
    if (currentView === 'start' && !currentUser && quizState.activityData.length === 0) {
      initializeQuizState();
    }
  }, [currentView, currentUser, quizState.activityData.length, initializeQuizState]);

  // User Management Functions
  const loginUser = async (username: string) => {
    console.log("loginUser: Attempting to log in user:", username);
    setIsLoading(true);
    
    try {
      // Check if user exists
      let user = await getUser(username);
      
      if (user) {
        // User exists, update last active
        await updateUserLastActive(username);
        setCurrentUser(user);
        
        if (user.hasCompletedQuiz) {
          // Load their quiz data and show profile
          const quizData = await getQuizResults(username);
          if (quizData) {
            setQuizState(prev => ({
              ...prev,
              activityData: quizData.activityData,
              currentMatchup: quizData.totalMatchups,
              isQuizComplete: true,
              insights: quizData.insights || []
            }));
            setCurrentView('profile');
          } else {
            setCurrentView('start');
          }
        } else {
          setCurrentView('start');
        }
      } else {
        // New user, create profile
        console.log("loginUser: Creating new user profile");
        user = await createUser(username);
        if (user) {
          setCurrentUser(user);
          
          // Check if they have localStorage data to migrate
          const migrated = await migrateLocalStorageToSupabase(username);
          if (migrated) {
            // Reload user data after migration
            const updatedUser = await getUser(username);
            if (updatedUser?.hasCompletedQuiz) {
              const quizData = await getQuizResults(username);
              if (quizData) {
                setQuizState(prev => ({
                  ...prev,
                  activityData: quizData.activityData,
                  currentMatchup: quizData.totalMatchups,
                  isQuizComplete: true,
                  insights: quizData.insights || []
                }));
                setCurrentUser(updatedUser);
                setCurrentView('profile');
                alert('Welcome back! We found your previous quiz data and migrated it to your new profile.');
                return;
              }
            }
          }
          
          setCurrentView('start');
        } else {
          alert('Failed to create user profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startQuizFromSplash = () => {
    console.log("startQuizFromSplash: Starting quiz without login");
    setCurrentUser(null);
    setCurrentView('start');
  };

  const initializeQuizState = useCallback(async () => {
    console.log("initializeQuizState: Initializing quiz data and ELOs...");
    
    // If user is logged in, their data should already be loaded from loginUser()
    // Just load initial activity data for new quizzes
    
    // Try to load from localStorage for anonymous users (backwards compatibility)
    if (!currentUser) {
      const storedActivityData = localStorage.getItem('quizActivityELOs');
      if (storedActivityData) {
        try {
          const loadedActivityData = JSON.parse(storedActivityData);
          console.log(`Found existing ELO data in localStorage: ${loadedActivityData.length} activities`);
          // Only use localStorage if it has a reasonable number of activities (CSV data, not defaults)
          if (loadedActivityData.length > 10) {
            setQuizState(prev => ({
              ...prev,
              activityData: loadedActivityData
            }));
            setCurrentView('results');
            return;
          } else {
            console.log('localStorage has too few activities, ignoring and loading CSV');
          }
        } catch {
          console.log('Error parsing localStorage data, ignoring');
        }
      }
    }
    
    // Load activities from CSV or use fallback
    let loadedActivities = await loadActivities();
    if (!loadedActivities || loadedActivities.length === 0) {
      console.log("Using fallback default activities");
      loadedActivities = initialActivitiesData.map(act => ({
        ...act,
        elo: act.elo || 1200,
        matchups: 0, 
        wins: 0, 
        chosenCount: 0,
        eloUpdateCount: act.eloUpdateCount || 0,
        tags: act.tags || []
      }));
    }

    setQuizState({
      currentMatchup: 0,
      activityData: loadedActivities,
      currentActivityA: null,
      currentActivityB: null,
      recentMatchupHistory: [],
      isQuizComplete: false,
      algorithmStrength: {
        score: 0,
        confidence: 'low',
        isReady: false,
        predictionHistory: []
      },
      minMatchups: MIN_MATCHUPS_FOR_ALGORITHM,
      targetStrength: TARGET_ALGORITHM_STRENGTH,
      insights: [],
      currentInsight: undefined,
      actualChoices: []
    });

    console.log(`initializeQuizState: ${loadedActivities.length} activities initialized.`);
  }, [currentUser]);


  const startNewQuiz = async () => {
    console.log("startNewQuiz: Starting new quiz...");
    
    // For logged-in users, only initialize if they don't have data yet
    if (currentUser && quizState.activityData.length > 0) {
      console.log("User already has quiz data, using existing data");
    } else {
      await initializeQuizState();
    }
    
    if (!quizState.activityData || quizState.activityData.length < 2) {
      console.error("startNewQuiz: Not enough activity data to start quiz.");
      return;
    }
    
    setCurrentView('quiz');
    console.log("startNewQuiz: New quiz started.");
  };

  const finishQuiz = async () => {
    console.log("finishQuiz: Quiz complete. Total matchups:", quizState.currentMatchup);
    setIsLoading(true);
    
    try {
      // Save to Supabase if logged in
      if (currentUser) {
        const success = await saveQuizResults(
          currentUser.username, 
          quizState.activityData, 
          quizState.currentMatchup,
          quizState.insights || []
        );
        
        if (success) {
          setCurrentUser(prev => prev ? { ...prev, hasCompletedQuiz: true } : null);
          console.log("finishQuiz: Saved complete state to Supabase for", currentUser.username);
        } else {
          alert('Failed to save quiz results. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        // Save to localStorage for anonymous users (backwards compatibility)
        localStorage.setItem('quizActivityELOs', JSON.stringify(quizState.activityData)); 
        localStorage.setItem('totalMatchupsPlayed', JSON.stringify(quizState.currentMatchup));
        console.log("finishQuiz: Saved final ELOs to localStorage.");
      }
      
      setQuizState(prev => ({ ...prev, isQuizComplete: true }));
      setTimeout(() => {
        // For logged-in users, go back to profile; for anonymous users, go to results
        setCurrentView(currentUser ? 'profile' : 'results');
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error finishing quiz:', error);
      alert('Failed to save quiz results. Please try again.');
      setIsLoading(false);
    }
  };

  const createProfileFromResults = async (username: string) => {
    console.log("createProfileFromResults: Creating profile for", username);
    setIsLoading(true);
    
    try {
      // Create user
      const newUser = await createUser(username);
      if (!newUser) {
        alert('Failed to create user profile. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Save quiz results
      const success = await saveQuizResults(username, quizState.activityData, quizState.currentMatchup, quizState.insights || []);
      if (!success) {
        alert('Failed to save quiz results. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Update user state
      setCurrentUser({
        ...newUser,
        hasCompletedQuiz: true
      });
      
      // Clear old localStorage data since it's now saved to Supabase
      localStorage.removeItem('quizActivityELOs');
      localStorage.removeItem('totalMatchupsPlayed');
      localStorage.removeItem('userProfiles'); // Clear old profile system
      
      alert(`Profile created for ${username}! Your results are now saved.`);
    } catch (error) {
      console.error('Error creating profile from results:', error);
      alert('Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllDataAndRetake = async () => {
    if (confirm("sure you wanna erase everything and start over?")) {
      console.log("clearAllDataAndRetake: Clearing data and restarting quiz.");
      setIsLoading(true);
      
      try {
        if (currentUser) {
          // Clear user's quiz data from Supabase
          const success = await clearQuizResults(currentUser.username);
          if (success) {
            setCurrentUser(prev => prev ? { ...prev, hasCompletedQuiz: false } : null);
          } else {
            alert('Failed to clear quiz data. Please try again.');
            setIsLoading(false);
            return;
          }
        } else {
          // Clear anonymous localStorage data
          localStorage.removeItem('quizActivityELOs'); 
          localStorage.removeItem('totalMatchupsPlayed');
        }
        
        alert("all gone! let's try that again.");
        startNewQuiz();
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Failed to clear data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const backToSplash = () => {
    setCurrentUser(null);
    setCurrentView('splash');
  };
  
  const goToCustomEvent = () => {
    setCurrentView('customEvent');
  };
  
  const goToProfiles = () => {
    setCurrentView('profiles');
  };

  const continueQuiz = () => {
    console.log("continueQuiz: Starting additional matchups for logged-in user");
    // Reset algorithm state but keep ELO data
    setQuizState(prev => ({
      ...prev,
      currentMatchup: prev.currentMatchup, // Keep total count
      currentActivityA: null,
      currentActivityB: null,
      recentMatchupHistory: [],
      isQuizComplete: false,
      algorithmStrength: {
        score: 0,
        confidence: 'low', 
        isReady: false,
        predictionHistory: []
      }
    }));
    setCurrentView('quiz');
  };

  const viewFullResults = () => {
    setCurrentView('results');
  };
  
  const backToProfile = () => {
    setCurrentView('profile');
  };

  const saveProgress = async () => {
    if (!currentUser) return;
    
    console.log("saveProgress: Saving current progress for logged-in user");
    try {
      const success = await saveQuizResults(
        currentUser.username, 
        quizState.activityData, 
        quizState.currentMatchup,
        quizState.insights || []
      );
      
      if (success) {
        console.log("saveProgress: Progress saved successfully");
      } else {
        console.error("saveProgress: Failed to save progress");
      }
    } catch (error) {
      console.error("saveProgress: Error saving progress:", error);
    }
  };

  const stopQuizAndSave = async () => {
    if (currentUser) {
      setIsLoading(true);
      await saveProgress();
      setIsLoading(false);
      setCurrentView('profile');
    } else {
      await finishQuiz();
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen ${['splash', 'start', 'quiz', 'profile', 'results', 'customEvent', 'profiles'].includes(currentView) ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' : ''}`}>
      {currentView === 'splash' && (
        <SplashView 
          onStartQuiz={startQuizFromSplash}
          onLogin={loginUser}
          isLoading={isLoading}
        />
      )}
      {currentView === 'start' && (
        <StartView 
          onStartQuiz={startNewQuiz}
          currentUser={currentUser}
          onBackToSplash={backToSplash}
        />
      )}
      {currentView === 'quiz' && (
        <QuizView 
          quizState={quizState}
          setQuizState={setQuizState}
          onFinishQuiz={finishQuiz}
          currentUser={currentUser}
          onStopQuiz={stopQuizAndSave}
          onSaveProgress={saveProgress}
        />
      )}
      {currentView === 'profile' && currentUser && (
        <ProfileView 
          currentUser={currentUser}
          activityData={quizState.activityData}
          totalMatchups={quizState.currentMatchup}
          onContinueQuiz={continueQuiz}
          onViewFullResults={viewFullResults}
          onBackToSplash={backToSplash}
          onClearData={clearAllDataAndRetake}
          onCustomEvent={goToCustomEvent}
          onProfiles={goToProfiles}
        />
      )}
      {currentView === 'results' && (
        <ResultsView 
          onRetakeQuiz={startNewQuiz}
          onClearData={clearAllDataAndRetake}
          currentUser={currentUser}
          onCreateProfile={createProfileFromResults}
          onBackToSplash={backToSplash}
          onBackToProfile={currentUser ? backToProfile : undefined}
          activityData={quizState.activityData}
          totalMatchups={quizState.currentMatchup}
        />
      )}
      {currentView === 'customEvent' && (
        <CustomEventView 
          onBackToProfile={backToProfile}
          currentUser={currentUser}
        />
      )}
      {currentView === 'profiles' && (
        <ProfilesPage onBackToProfile={backToProfile} />
      )}
    </div>
  );
}