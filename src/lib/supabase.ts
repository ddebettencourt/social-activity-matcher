import { createClient } from '@supabase/supabase-js';
import { Activity } from '@/types/quiz';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface DatabaseUser {
  id: string;
  username: string;
  created_at: string;
  last_active: string;
}

export interface DatabaseQuizResult {
  id: string;
  user_id: string;
  activity_data: Activity[]; // JSON data
  total_matchups: number;
  completed_at: string;
  created_at: string;
}