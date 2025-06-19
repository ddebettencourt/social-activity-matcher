import { Activity } from '@/types/quiz';
import { dimensionsMeta } from './constants';
import { getActivityIcon } from './iconMapping';

export function parseCSVData(csvText: string): Activity[] | null {
  console.log("Attempting to parse CSV data...");
  const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) { 
    console.warn("CSV: Too short (needs header + data)."); 
    return null; 
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const expectedFixedHeaders = ['Activity','Subtitle','Social Intensity','Structure','Novelty','Formality','Energy Level','Scale & Immersion'];
  
  for(let i = 0; i < expectedFixedHeaders.length; i++) {
    if (!headers[i] || expectedFixedHeaders[i].toLowerCase() !== headers[i].toLowerCase()) {
      console.error(`CSV Header Mismatch at column ${i+1}. Expected: "${expectedFixedHeaders[i]}", Got: "${headers[i]}".`);
      return null;
    }
  }
  console.log("CSV Fixed Headers match expected format.");

  const headerMap: Record<string, string> = {};
  expectedFixedHeaders.forEach((eh) => {
    const keyInDimMeta = dimensionsMeta.find(dm => dm.label.toLowerCase().replace(/\s+/g, '') === eh.toLowerCase().replace(/\s+/g, ''));
    if (keyInDimMeta) {
      headerMap[eh] = keyInDimMeta.key;
    } else if (eh.toLowerCase() === 'activity') {
      headerMap[eh] = 'title';
    } else if (eh.toLowerCase() === 'subtitle') {
      headerMap[eh] = 'subtitle';
    }
  });

  const activities: Activity[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(','); 
    try {
      const activity: Partial<Activity> = { 
        id: 5000 + i, 
        elo: 1200, 
        eloUpdateCount: 0, 
        tags: [] 
      };
      let validEntry = true;

      expectedFixedHeaders.forEach((header, index) => {
        const key = headerMap[header];
        if (key) {
          const rawValue = values[index] ? values[index].trim() : '';
          if (key === 'title' || key === 'subtitle') {
            activity[key as keyof Activity] = rawValue as never;
          } else { 
            const score = parseInt(rawValue, 10);
            if (isNaN(score) || score < 1 || score > 10) {
              console.warn(`CSV Line ${i+1}, Header "${header}" (key "${key}"): Invalid score "${rawValue}".`); 
              validEntry = false;
            }
            activity[key as keyof Activity] = score as never;
          }
        }
      });
      
      if (!activity.title) { 
        console.warn(`CSV Line ${i+1}: Missing title.`); 
        validEntry = false; 
      }
      
      if (values.length > expectedFixedHeaders.length) {
        for (let j = expectedFixedHeaders.length; j < values.length; j++) {
          const tag = values[j] ? values[j].trim() : '';
          if (tag) { 
            activity.tags!.push(tag);
          }
        }
      }

      dimensionsMeta.forEach(dim => {
        if (activity[dim.key as keyof Activity] === undefined) {
          console.warn(`CSV Line ${i+1}, Activity "${activity.title || 'Untitled'}": Missing score for dimension "${dim.label}". Defaulting to 5.`);
          activity[dim.key as keyof Activity] = 5 as never; 
        }
      });

      // Add icon type based on activity title and tags
      if (activity.title && activity.tags) {
        activity.iconType = getActivityIcon(activity.title, activity.tags);
      }

      if (validEntry) activities.push(activity as Activity);
    } catch (e) { 
      console.error(`CSV Line ${i+1} Parse Error:`, e); 
    }
  }
  console.log(`Parsed ${activities.length} activities from CSV text.`);
  return activities.length > 0 ? activities : null;
}

export async function loadActivities(): Promise<Activity[]> {
  console.log("loadActivities: Attempting to fetch activities_with_tags.csv...");
  try {
    // Check if we're running on the server or client
    if (typeof window === 'undefined') {
      // Server-side: read from filesystem
      const fs = await import('fs');
      const path = await import('path');
      const csvPath = path.join(process.cwd(), 'public', 'activities_with_tags.csv');
      const csvText = fs.readFileSync(csvPath, 'utf8');
      const activities = parseCSVData(csvText);
      if (activities && activities.length > 0) {
        console.log(`loadActivities: Successfully parsed ${activities.length} activities from CSV (server-side).`);
        return activities.map(act => ({...act, eloUpdateCount: 0, tags: act.tags || []}));
      }
    } else {
      // Client-side: use fetch
      const response = await fetch('/activities_with_tags.csv'); 
      if (response.ok) {
        const csvText = await response.text();
        const activities = parseCSVData(csvText);
        if (activities && activities.length > 0) {
          console.log(`loadActivities: Successfully parsed ${activities.length} activities from CSV (client-side).`);
          return activities.map(act => ({...act, eloUpdateCount: 0, tags: act.tags || []}));
        }
      }
    }
    
    console.warn(`loadActivities: Could not load CSV. Using empty array.`);
    return [];
  } catch (error) {
    console.error("loadActivities: Error loading CSV:", error, "Using empty array.");
    return [];
  }
}