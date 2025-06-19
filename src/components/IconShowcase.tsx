'use client'

import ActivityIcon from './ActivityIcon';

export default function IconShowcase() {
  const iconTypes = [
    { type: 'dinner', label: 'Food & Dining', examples: ['Restaurants', 'Tastings', 'Tea Service'] },
    { type: 'movie', label: 'Entertainment', examples: ['Movies', 'Theater', 'Performances'] },
    { type: 'exercise', label: 'Fitness', examples: ['Yoga', 'Gym', 'Sports'] },
    { type: 'music', label: 'Music', examples: ['Concerts', 'Acoustic Sessions', 'Live Music'] },
    { type: 'travel', label: 'Adventure', examples: ['Expeditions', 'Tours', 'Exploration'] },
    { type: 'social', label: 'Social', examples: ['Parties', 'Networking', 'Group Events'] },
    { type: 'reading', label: 'Learning', examples: ['Workshops', 'Classes', 'Educational'] },
    { type: 'default', label: 'General', examples: ['Other Activities'] }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Activity Icon System</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {iconTypes.map(({ type, label, examples }) => (
          <div key={type} className="text-center">
            <div className="flex justify-center mb-3">
              <ActivityIcon iconType={type} className="w-16 h-16" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">{label}</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              {examples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">How It Works</h3>
        <p className="text-sm text-gray-600">
          The system automatically detects activity types from titles and tags, then assigns appropriate modern SVG icons. 
          Icons feature gradient colors, subtle shadows, and hover effects for a sleek, interactive experience.
        </p>
      </div>
    </div>
  );
}