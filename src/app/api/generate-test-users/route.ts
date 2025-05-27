import { NextRequest, NextResponse } from 'next/server';
import { generateAllTestUsers } from '@/lib/generateTestUsers';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting test user generation via API...');
    
    await generateAllTestUsers();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully generated 10 test users with distinct personalities' 
    });
    
  } catch (error) {
    console.error('Error generating test users:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to generate test users',
    testUsers: [
      'HighEnergyHarry - Loves high-energy, active, social activities',
      'QuietBookwormBella - Prefers calm, structured, intimate activities',
      'AdventurousAlex - Seeks novel, spontaneous adventures',
      'FormalFiona - Enjoys elegant, sophisticated social events',
      'CasualChris - Loves relaxed, informal hangouts',
      'CreativeCarla - Passionate about artistic experiences',
      'RoutineRobert - Prefers familiar, well-planned activities',
      'PartyPaulina - The life of the party, loves crowds',
      'IntellectualIan - Enjoys thoughtful, educational activities',
      'FlexibleFreya - Open to all types of activities'
    ]
  });
}