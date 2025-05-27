import { supabase } from './supabase';
import { Activity, User } from '@/types/quiz';

// Test Supabase connection
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...');
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
}

// User Management
export async function createUser(username: string): Promise<User | null> {
  try {
    console.log('Creating user with username:', username);
    
    // Check if user already exists first
    const existingUser = await getUser(username);
    if (existingUser) {
      console.log('User already exists:', username);
      return existingUser;
    }
    
    // Insert new user (let database set timestamps with defaults)
    const { data, error } = await supabase
      .from('users')
      .insert([{ username }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating user:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }

    if (!data) {
      console.error('No data returned from user creation');
      return null;
    }

    console.log('User created successfully:', data);
    
    return {
      username: data.username,
      createdAt: data.created_at,
      lastActive: data.last_active,
      hasCompletedQuiz: false
    };
  } catch (error) {
    console.error('Unexpected error creating user:', error);
    return null;
  }
}

export async function getUser(username: string): Promise<User | null> {
  try {
    console.log('Getting user:', username);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      // Don't log "not found" errors as they're expected
      if (error.code !== 'PGRST116') {
        console.error('Supabase error getting user:', {
          error,
          message: error.message,
          code: error.code,
          username
        });
      }
      return null;
    }

    if (!data) {
      console.log('No user data found for:', username);
      return null;
    }

    console.log('Found user:', data);

    // Check if user has completed quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_results')
      .select('id')
      .eq('user_id', data.id)
      .single();

    if (quizError && quizError.code !== 'PGRST116') {
      console.error('Error checking quiz completion:', quizError);
    }

    return {
      username: data.username,
      createdAt: data.created_at,
      lastActive: data.last_active,
      hasCompletedQuiz: !!quizData
    };
  } catch (error) {
    console.error('Unexpected error getting user:', error);
    return null;
  }
}

export async function updateUserLastActive(username: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('username', username);
  } catch (error) {
    console.error('Error updating user last active:', error);
  }
}

// Quiz Results Management
export async function saveQuizResults(
  username: string, 
  activityData: Activity[], 
  totalMatchups: number
): Promise<boolean> {
  try {
    console.log('Saving quiz results for:', username);
    console.log('Activity count:', activityData.length);
    console.log('Total matchups:', totalMatchups);
    
    // First get the user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      console.error('Error finding user:', userError);
      return false;
    }

    // Delete any existing quiz results for this user
    await supabase
      .from('quiz_results')
      .delete()
      .eq('user_id', userData.id);

    // Prepare complete ELO state (everything needed for continuity)
    const completeActivityData = activityData.map(activity => ({
      id: activity.id,
      title: activity.title,
      subtitle: activity.subtitle,
      socialIntensity: activity.socialIntensity,
      structureSpontaneity: activity.structureSpontaneity,
      familiarityNovelty: activity.familiarityNovelty,
      formalityGradient: activity.formalityGradient,
      energyLevel: activity.energyLevel,
      scaleImmersion: activity.scaleImmersion,
      tags: activity.tags,
      elo: activity.elo,
      eloUpdateCount: activity.eloUpdateCount,
      matchups: activity.matchups || 0,
      wins: activity.wins || 0,
      chosenCount: activity.chosenCount || 0
    }));

    console.log('Saving complete ELO state for', activityData.length, 'activities');

    // Insert new quiz results
    const { error: insertError } = await supabase
      .from('quiz_results')
      .insert([{
        user_id: userData.id,
        activity_data: completeActivityData,
        total_matchups: totalMatchups,
        completed_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('Error saving quiz results:', insertError);
      return false;
    }

    console.log('Quiz results saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving quiz results:', error);
    return false;
  }
}

export async function getQuizResults(username: string): Promise<{ 
  activityData: Activity[], 
  totalMatchups: number
} | null> {
  try {
    console.log('Getting quiz results for:', username);
    
    // Get user ID first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      console.log('User not found for quiz results');
      return null;
    }

    // Get their latest quiz results
    const { data, error } = await supabase
      .from('quiz_results')
      .select('activity_data, total_matchups')
      .eq('user_id', userData.id)
      .order('completed_at', { ascending: false })
      .single();

    if (error || !data) {
      console.log('No quiz results found');
      return null;
    }

    console.log('Retrieved quiz results with', data.activity_data.length, 'activities');

    return {
      activityData: data.activity_data,
      totalMatchups: data.total_matchups
    };
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return null;
  }
}

export async function clearQuizResults(username: string): Promise<boolean> {
  try {
    // Get user ID first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      return false;
    }

    // Delete their quiz results
    const { error } = await supabase
      .from('quiz_results')
      .delete()
      .eq('user_id', userData.id);

    if (error) {
      console.error('Error clearing quiz results:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing quiz results:', error);
    return false;
  }
}

// Migration helper to move localStorage data to Supabase
export async function migrateLocalStorageToSupabase(username: string): Promise<boolean> {
  try {
    // Check if localStorage has quiz data
    const localActivityData = localStorage.getItem('quizActivityELOs');
    const localMatchups = localStorage.getItem('totalMatchupsPlayed');
    
    if (!localActivityData || !localMatchups) {
      return false;
    }

    const activityData = JSON.parse(localActivityData);
    const totalMatchups = JSON.parse(localMatchups);

    // Save to Supabase
    const success = await saveQuizResults(username, activityData, totalMatchups);
    
    if (success) {
      // Clear localStorage after successful migration
      localStorage.removeItem('quizActivityELOs');
      localStorage.removeItem('totalMatchupsPlayed');
      localStorage.removeItem('userProfiles'); // Clear old profile system too
      console.log('Successfully migrated localStorage data to Supabase');
    }

    return success;
  } catch (error) {
    console.error('Error migrating localStorage to Supabase:', error);
    return false;
  }
}

// Get all users with sufficient quiz data for custom event analysis
export async function getQualifiedUsersForEventAnalysis(minMatchups: number = 10): Promise<{
  username: string;
  activityData: Activity[];
  totalMatchups: number;
}[]> {
  try {
    console.log('Getting qualified users for event analysis with min matchups:', minMatchups);
    
    // Get all users first
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError || !users) {
      console.log('No users found or error:', usersError);
      return [];
    }
    
    console.log(`Found ${users.length} total users:`, users.map(u => u.username));

    const qualifiedUsers: {
      username: string;
      activityData: Activity[];
      totalMatchups: number;
    }[] = [];

    // Check each user's quiz data
    for (const user of users) {
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_results')
        .select('activity_data, total_matchups')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .single();

      if (quizError) {
        if (quizError.code === 'PGRST116') {
          console.log(`${user.username} has no quiz results`);
        } else {
          console.log(`Quiz data error for ${user.username}:`, quizError);
        }
      } else if (!quizData) {
        console.log(`No quiz data found for ${user.username}`);
      } else {
        console.log(`${user.username} has ${quizData.total_matchups} matchups (need ${minMatchups})`);
        if (quizData.total_matchups >= minMatchups) {
          qualifiedUsers.push({
            username: user.username,
            activityData: quizData.activity_data,
            totalMatchups: quizData.total_matchups
          });
        }
      }
    }

    console.log(`Found ${qualifiedUsers.length} qualified users`);
    return qualifiedUsers;
  } catch (error) {
    console.error('Error getting qualified users:', error);
    return [];
  }
}