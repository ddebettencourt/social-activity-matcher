'use client'

interface ActivityIconProps {
  iconType: string;
  className?: string;
}

export default function ActivityIcon({ iconType, className = "w-12 h-12" }: ActivityIconProps) {
  const getIconPath = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dinner':
      case 'restaurant':
      case 'food':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="dinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF7F50"/>
                <stop offset="100%" stopColor="#E57348"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#dinnerGrad)" opacity="0.1"/>
            <path d="M16 24h32c2 0 4 2 4 4v16c0 2-2 4-4 4H16c-2 0-4-2-4-4V28c0-2 2-4 4-4z" 
                  fill="url(#dinnerGrad)" stroke="#E57348" strokeWidth="2"/>
            <circle cx="22" cy="32" r="3" fill="#fff" opacity="0.8"/>
            <circle cx="32" cy="35" r="2" fill="#fff" opacity="0.8"/>
            <circle cx="42" cy="30" r="2.5" fill="#fff" opacity="0.8"/>
            <path d="M20 20v-4M28 20v-6M36 20v-4M44 20v-6" stroke="#E57348" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
        
      case 'movie':
      case 'cinema':
      case 'film':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="movieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6495ED"/>
                <stop offset="100%" stopColor="#5A88D7"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#movieGrad)" opacity="0.1"/>
            <rect x="12" y="20" width="40" height="24" rx="4" 
                  fill="url(#movieGrad)" stroke="#5A88D7" strokeWidth="2"/>
            <circle cx="18" cy="26" r="2" fill="#fff"/>
            <circle cx="26" cy="26" r="2" fill="#fff"/>
            <circle cx="34" cy="26" r="2" fill="#fff"/>
            <circle cx="42" cy="26" r="2" fill="#fff"/>
            <circle cx="46" cy="26" r="2" fill="#fff"/>
            <path d="M16 32l8 4v-8l-8 4z" fill="#fff"/>
            <rect x="28" y="30" width="20" height="8" rx="2" fill="#fff" opacity="0.3"/>
          </svg>
        );
        
      case 'exercise':
      case 'gym':
      case 'fitness':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="exerciseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#32CD32"/>
                <stop offset="100%" stopColor="#228B22"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#exerciseGrad)" opacity="0.1"/>
            <rect x="14" y="28" width="8" height="8" rx="2" fill="url(#exerciseGrad)"/>
            <rect x="42" y="28" width="8" height="8" rx="2" fill="url(#exerciseGrad)"/>
            <rect x="22" y="30" width="20" height="4" rx="2" fill="url(#exerciseGrad)"/>
            <circle cx="26" cy="32" r="2" fill="#fff"/>
            <circle cx="32" cy="32" r="2" fill="#fff"/>
            <circle cx="38" cy="32" r="2" fill="#fff"/>
          </svg>
        );
        
      case 'music':
      case 'concert':
      case 'sound':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="musicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9370DB"/>
                <stop offset="100%" stopColor="#7B68EE"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#musicGrad)" opacity="0.1"/>
            <path d="M28 16v24c0 4-4 8-8 8s-8-4-8-8 4-8 8-8c2 0 4 1 6 2V20l16-4v20c0 4-4 8-8 8s-8-4-8-8 4-8 8-8c2 0 4 1 6 2V16l-12 0z" 
                  fill="url(#musicGrad)" stroke="#7B68EE" strokeWidth="1"/>
            <circle cx="20" cy="40" r="4" fill="#fff" opacity="0.8"/>
            <circle cx="44" cy="32" r="4" fill="#fff" opacity="0.8"/>
          </svg>
        );
        
      case 'travel':
      case 'adventure':
      case 'explore':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="travelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6347"/>
                <stop offset="100%" stopColor="#DC143C"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#travelGrad)" opacity="0.1"/>
            <path d="M32 12L40 28H48L42 34L44 48L32 42L20 48L22 34L16 28H24L32 12Z" 
                  fill="url(#travelGrad)" stroke="#DC143C" strokeWidth="1"/>
            <circle cx="32" cy="28" r="6" fill="#fff" opacity="0.3"/>
            <circle cx="32" cy="28" r="2" fill="url(#travelGrad)"/>
          </svg>
        );
        
      case 'social':
      case 'party':
      case 'friends':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="socialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700"/>
                <stop offset="100%" stopColor="#FFA500"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#socialGrad)" opacity="0.1"/>
            <circle cx="24" cy="26" r="8" fill="url(#socialGrad)" opacity="0.8"/>
            <circle cx="40" cy="26" r="8" fill="url(#socialGrad)" opacity="0.8"/>
            <circle cx="32" cy="38" r="8" fill="url(#socialGrad)" opacity="0.8"/>
            <circle cx="24" cy="26" r="3" fill="#fff"/>
            <circle cx="40" cy="26" r="3" fill="#fff"/>
            <circle cx="32" cy="38" r="3" fill="#fff"/>
          </svg>
        );
        
      case 'reading':
      case 'book':
      case 'study':
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="readingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B4513"/>
                <stop offset="100%" stopColor="#A0522D"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#readingGrad)" opacity="0.1"/>
            <rect x="16" y="18" width="32" height="28" rx="2" 
                  fill="url(#readingGrad)" stroke="#A0522D" strokeWidth="2"/>
            <path d="M32 18v28" stroke="#A0522D" strokeWidth="2"/>
            <rect x="20" y="24" width="8" height="2" fill="#fff" opacity="0.6"/>
            <rect x="36" y="24" width="8" height="2" fill="#fff" opacity="0.6"/>
            <rect x="20" y="28" width="8" height="2" fill="#fff" opacity="0.6"/>
            <rect x="36" y="28" width="8" height="2" fill="#fff" opacity="0.6"/>
            <rect x="20" y="32" width="8" height="2" fill="#fff" opacity="0.6"/>
            <rect x="36" y="32" width="8" height="2" fill="#fff" opacity="0.6"/>
          </svg>
        );
        
      default:
        return (
          <svg viewBox="0 0 64 64" className={className}>
            <defs>
              <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D2B48C"/>
                <stop offset="100%" stopColor="#DEB887"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#defaultGrad)" opacity="0.2"/>
            <circle cx="32" cy="32" r="16" fill="url(#defaultGrad)" stroke="#DEB887" strokeWidth="2"/>
            <circle cx="32" cy="32" r="8" fill="#fff" opacity="0.6"/>
            <path d="M28 28l8 8M36 28l-8 8" stroke="url(#defaultGrad)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  return <div className="activity-icon">{getIconPath(iconType)}</div>;
}