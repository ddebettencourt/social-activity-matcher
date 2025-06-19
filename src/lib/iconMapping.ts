export function getActivityIcon(activityTitle: string, tags: string[]): string {
  const title = activityTitle.toLowerCase();
  const allTags = tags.map(tag => tag.toLowerCase());

  // Food & Dining
  if (title.includes('dinner') || title.includes('restaurant') || title.includes('meal') || 
      title.includes('food') || title.includes('breakfast') || title.includes('lunch') ||
      title.includes('tasting') || title.includes('tea') || allTags.includes('food & drink')) {
    return 'dinner';
  }

  // Entertainment & Movies
  if (title.includes('movie') || title.includes('film') || title.includes('cinema') || 
      title.includes('theater') || title.includes('show') || title.includes('performance') ||
      allTags.includes('entertainment-focused')) {
    return 'movie';
  }

  // Exercise & Fitness
  if (title.includes('yoga') || title.includes('gym') || title.includes('workout') || 
      title.includes('fitness') || title.includes('sports') || title.includes('dodgeball') ||
      title.includes('exercise') || allTags.includes('physical activity') || allTags.includes('high energy')) {
    return 'exercise';
  }

  // Music & Concerts
  if (title.includes('music') || title.includes('concert') || title.includes('acoustic') || 
      title.includes('singalong') || title.includes('band') || title.includes('guitar') ||
      allTags.includes('music-centered')) {
    return 'music';
  }

  // Travel & Adventure
  if (title.includes('adventure') || title.includes('expedition') || title.includes('tour') || 
      title.includes('explore') || title.includes('journey') || title.includes('rooftop') ||
      title.includes('beachside') || allTags.includes('outdoor activity') || allTags.includes('guided experience')) {
    return 'travel';
  }

  // Social & Parties
  if (title.includes('party') || title.includes('social') || title.includes('gala') || 
      title.includes('ball') || title.includes('bonfire') || title.includes('fundraiser') ||
      allTags.includes('group-friendly') || allTags.includes('networking') || allTags.includes('evening experience')) {
    return 'social';
  }

  // Reading & Learning
  if (title.includes('book') || title.includes('reading') || title.includes('study') || 
      title.includes('learn') || title.includes('class') || title.includes('workshop') ||
      allTags.includes('educational') || allTags.includes('learning opportunity')) {
    return 'reading';
  }

  // Default fallback
  return 'default';
}