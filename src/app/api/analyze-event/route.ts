import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Existing tags from the activities database
const EXISTING_TAGS = [
  'acupuncture-therapy', 'active', 'adult-only', 'adventure', 'after-work', 'alcohol-focused', 
  'animal-interaction', 'artistic', 'arts-&-culture', 'adrenaline-rush', 'athletic', 'atmospheric',
  'author-access', 'balance', 'beach-day', 'beginner-friendly', 'budget-friendly', 'caffeine',
  'carnival', 'casual', 'challenge', 'charitable', 'charity', 'chaotic', 'chill-vibe', 'colorful',
  'communal', 'community', 'competition', 'conversation-focused', 'conversation-starter', 'cozy',
  'creative', 'creative-expression', 'crowded/busy', 'cult-films', 'cultural', 'cultural-immersion',
  'culinary-adventure', 'culinary-challenge', 'cute', 'daily-life', 'dance', 'dangerous', 'daring',
  'day-trip', 'digital', 'disconnected', 'discussion-based', 'diverse-options', 'diy/homemade',
  'dizzy', 'dress-up', 'driving', 'early-riser', 'easy-going', 'educational', 'endurance',
  'entertainment-focused', 'evening-experience', 'exclusive', 'experimental', 'family-friendly',
  'feel-good', 'festival', 'festival-experience', 'fire', 'flash-mob', 'flexible', 'foodie',
  'food-&-drink', 'free-activity', 'fresh', 'friend-group-classic', 'friend-support', 'full-day-event',
  'full-immersion', 'funny', 'game-based', 'gift-making', 'global', 'glowing', 'golden-hour',
  'gourmet', 'group-friendly', 'guided-experience', 'hands-on', 'healthy', 'height', 'hidden-gem',
  'high-energy', 'high-formality', 'high-speed', 'hip', 'historic', 'historical-site', 'hip-hop',
  'immersive', 'inclusive', 'indoor-activity', 'inspired-by-tv', 'instagram-worthy', 'intellectual',
  'intense', 'interactive', 'international', 'intimate', 'introverted', 'jazz', 'large-group',
  'late-night', 'learning-opportunity', 'limited-time', 'literary', 'live-music', 'local-craft-beer',
  'local-exploration', 'local-favorite', 'local-scene', 'low-energy', 'low-key', 'luxury-experience',
  'meditative', 'memorable', 'meet-new-people', 'morning-activity', 'movement', 'muddy', 'multi-day',
  'music-centered', 'mystical', 'natural-beauty', 'nature-focused', 'networking', 'nightlife',
  'no-pressure', 'nostalgic', 'outdoor-activity', 'overnight', 'participatory', 'party-game',
  'performance-art', 'photogenic', 'photography', 'physical-activity', 'physical-exertion',
  'plant-focused', 'playful', 'pop-culture', 'progressive', 'quirky/unique', 'racing', 'recurring',
  'regular-event', 'relaxation', 'remote/rural', 'retro/nostalgic', 'role-playing', 'romantic',
  'rooftop', 'rowdy/party', 'scene', 'scenic', 'science', 'science-based', 'screen-free', 'seasonal',
  'self-care', 'self-guided', 'sensory-experience', 'shopping', 'skill-building', 'skill-required',
  'skill-showcase', 'small-group', 'sneaky', 'social', 'social-cause', 'social-experiment',
  'solo-friendly', 'sophisticated', 'special-occasion', 'spectator-event', 'sports-related',
  'stargazing', 'strategic', 'stress-relief', 'structured', 'supportive', 'sustainable', 'sweet-tooth',
  'swimming', 'take-home-item', 'tasting', 'team-building', 'team-spirit', 'tech-focused',
  'theatrical', 'thrill-seeking', 'tournament', 'trading', 'traditional', 'trendy/popular', 'trendy',
  'unique-combination', 'unique-concept', 'unique-experience', 'upscale', 'urban-art', 'urban-culture',
  'urban-exploration', 'urban-setting', 'vertical', 'visual-arts', 'volunteer', 'walking-tour',
  'water-activity', 'waterfront', 'weather-dependent', 'weekend-activity', 'weekend-required',
  'wellness', 'wholesome', 'wine'
];

export async function POST(request: NextRequest) {
  try {
    const { eventDescription, userActivities = [] } = await request.json();

    if (!eventDescription || typeof eventDescription !== 'string') {
      return NextResponse.json(
        { error: 'Event description is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    // Format user activities list if provided
    const activitiesListText = userActivities.length > 0 
      ? `\n\nUSER'S ACTIVITY PREFERENCES:
${userActivities.map((activity: any, index: number) => 
  `${index + 1}. "${activity.title}" - ${activity.subtitle}`
).join('\n')}

After analyzing the custom event, also find the 5 most similar activities from the user's list above. Focus heavily on tag overlap and general activity type/setting similarities.

For each similar activity, provide:
1. The exact activity title from the list
2. A similarity score from 0.0 to 1.0 (where 1.0 = nearly identical, 0.8+ = very similar, 0.6+ = moderately similar, 0.4+ = somewhat similar)
3. A brief explanation of why they're similar

Be realistic with similarity scores - most won't be above 0.8. Order from most similar to least similar.`
      : '';

    const responseFormat = userActivities.length > 0 
      ? `{
  "title": "Brief title for the event (max 60 chars)",
  "subtitle": "One sentence description",
  "dimensions": {
    "socialIntensity": 7,
    "structure": 5,
    "novelty": 8,
    "formality": 3,
    "energyLevel": 6,
    "scaleImmersion": 4
  },
  "tags": [
    {"name": "social", "importance": 5},
    {"name": "group-friendly", "importance": 4},
    {"name": "active", "importance": 3}
  ],
  "similarActivities": [
    {
      "title": "exact activity title from list",
      "similarity": 0.85,
      "explanation": "brief explanation of similarity"
    }
  ]
}`
      : `{
  "title": "Brief title for the event (max 60 chars)",
  "subtitle": "One sentence description",
  "dimensions": {
    "socialIntensity": 7,
    "structure": 5,
    "novelty": 8,
    "formality": 3,
    "energyLevel": 6,
    "scaleImmersion": 4
  },
  "tags": [
    {"name": "social", "importance": 5},
    {"name": "group-friendly", "importance": 4},
    {"name": "active", "importance": 3}
  ]
}`;

    const prompt = `You are an expert social activity analyst. Analyze the following social event description and provide a structured analysis.

Event Description: "${eventDescription}"

Please analyze this event across these 6 dimensions on a scale of 1-10:

1. Social Intensity (1 = very intimate/private, 10 = large groups/high social interaction)
2. Structure (1 = very spontaneous/unplanned, 10 = highly organized/scheduled)
3. Novelty (1 = very familiar/routine, 10 = completely new/unique experience)
4. Formality (1 = very casual/relaxed, 10 = very formal/professional)
5. Energy Level (1 = very calm/low-key, 10 = very active/high-energy)
6. Scale & Immersion (1 = brief/surface-level, 10 = long-term/deeply immersive)

For tags, please select 3-8 relevant tags from this existing list (use these exact tag names):
${EXISTING_TAGS.join(', ')}

For each tag you select, also rate its IMPORTANCE to this specific activity on a scale of 1-5:
- 5 = Essential (if you don't enjoy this tag, you won't enjoy this activity)
- 4 = Very Important (core to the experience)
- 3 = Important (describes the activity well, but you could not enjoy this kind of thing and still like this)
- 2 = Somewhat Important (relevant but not defining)
- 1 = Generic (applies to lots of activities, not specific to this one)

Choose the most relevant tags that best describe the activity type, setting, energy level, and characteristics.${activitiesListText}

IMPORTANT: 
- Respond with ONLY valid JSON (no markdown, no explanations, no code blocks)
- Use exact numeric values (1-10 integers) for dimensions
- For tags, use format: [{"name": "tag-name", "importance": 4}]
- Use exact tag names from the provided list
${userActivities.length > 0 ? '- Include "similarActivities" array with exactly 5 activities from the user list' : '- Do NOT include "similarActivities" field'}
- Ensure all strings are properly quoted

JSON format:
${responseFormat}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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

    // Parse Claude's JSON response
    let analysis;
    try {
      analysis = JSON.parse(content.text);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text);
      throw new Error('Invalid JSON response from Claude');
    }

    // Validate the response structure
    if (!analysis.dimensions || !analysis.tags || !analysis.title) {
      console.error('Invalid response structure:', analysis);
      throw new Error('Invalid response structure from Claude');
    }

    // Ensure dimensions are numbers and within range
    const dimensions = analysis.dimensions;
    Object.keys(dimensions).forEach(key => {
      const value = dimensions[key];
      if (typeof value !== 'number' || value < 1 || value > 10) {
        dimensions[key] = Math.max(1, Math.min(10, Number(value) || 5));
      }
    });

    // Handle tags - support both old string format and new object format
    if (!Array.isArray(analysis.tags)) {
      analysis.tags = [{name: 'social', importance: 4}, {name: 'group-friendly', importance: 3}];
    } else {
      // Check if tags are in old string format and convert
      if (analysis.tags.length > 0 && typeof analysis.tags[0] === 'string') {
        // Convert old string format to new object format with default importance
        analysis.tags = analysis.tags
          .filter((tag: string) => EXISTING_TAGS.includes(tag))
          .map((tag: string) => ({name: tag, importance: 3})); // Default importance
      } else {
        // Validate new object format
        analysis.tags = analysis.tags.filter((tag: any) => 
          tag.name && 
          EXISTING_TAGS.includes(tag.name) &&
          typeof tag.importance === 'number' &&
          tag.importance >= 1 && tag.importance <= 5
        );
      }
      
      // Ensure we have at least some tags
      if (analysis.tags.length === 0) {
        analysis.tags = [{name: 'social', importance: 4}, {name: 'group-friendly', importance: 3}];
      }
    }

    // Validate similarActivities if present
    if (analysis.similarActivities) {
      if (!Array.isArray(analysis.similarActivities)) {
        analysis.similarActivities = [];
      } else {
        // Validate each similar activity
        analysis.similarActivities = analysis.similarActivities.filter((activity: any) => {
          return activity.title && 
                 typeof activity.similarity === 'number' && 
                 activity.similarity >= 0 && 
                 activity.similarity <= 1 &&
                 activity.explanation;
        });
      }
    }

    console.log('Claude analysis completed for event:', eventDescription.slice(0, 50));
    
    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error in analyze-event API:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a more specific error message
    if (error instanceof Error) {
      console.error('Specific error message:', error.message);
      return NextResponse.json(
        { error: `Analysis failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze event' },
      { status: 500 }
    );
  }
}