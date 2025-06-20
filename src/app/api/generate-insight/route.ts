import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Choice {
  activityA: string;
  activityB: string;
  chosen: string;
  strength: 'strong' | 'somewhat' | 'tie';
  matchupNumber: number;
}

interface GenerateInsightRequest {
  choices: Choice[];
  pastInsights: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { choices, pastInsights }: GenerateInsightRequest = await request.json();

    if (!choices || choices.length < 6) {
      return NextResponse.json(
        { error: 'At least 6 choices are required to generate insights' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    // 3% chance of showing the Severance reference
    if (Math.random() < 0.03) {
      return NextResponse.json({
        insight: "Please enjoy each Insight equally."
      });
    }

    // Format choices for Claude
    const choicesText = choices.map((choice, index) => 
      `Choice ${index + 1}: Between "${choice.activityA}" and "${choice.activityB}", you ${choice.strength === 'strong' ? 'strongly' : choice.strength === 'somewhat' ? 'somewhat' : 'equally'} preferred "${choice.chosen}"`
    ).join('\n');

    const pastInsightsText = pastInsights.length > 0 
      ? `\n\nPrevious insights already shared (do not repeat these themes):\n${pastInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}`
      : '';

    const prompt = `You are analyzing someone's social activity preferences based on their choices. Generate a short, engaging insight about their preferences. Be conversational and specific.

User's choices:
${choicesText}${pastInsightsText}

Generate a fresh insight that:
1. Is very short (1 sentence, max 15 words)
2. Reveals something specific about their preferences
3. Is different from any previous insights
4. Is not generic, and can be funny or clever.
5. It can be oddly specific, but it shouldn't directly reference an oddly specific event.
6. Can be casual, but not mean. 

They are taking this quiz/making these choices all at the same time, and don't make meta-commentary about them choosing options.

Some good insights, don't copy these but sort of have a similar vibe.

"You're definitely always making your friends take shots" - if they made a lot of party choices
"Most likely to go camping and bring your PlayStation" - if they seem to only like indoor things

Respond with ONLY the insight text (no JSON, no markdown, no explanations).

Insight:`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const insight = content.text.trim();

    if (!insight) {
      throw new Error('Failed to generate insight');
    }

    console.log('Claude insight generated for', choices.length, 'choices');
    
    return NextResponse.json({ insight });

  } catch (error) {
    console.error('Error in generate-insight API:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request data:', { choices: choices?.length, pastInsights: pastInsights?.length });
    
    if (error instanceof Error) {
      console.error('Specific error message:', error.message);
      return NextResponse.json(
        { error: `Insight generation failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate insight' },
      { status: 500 }
    );
  }
}