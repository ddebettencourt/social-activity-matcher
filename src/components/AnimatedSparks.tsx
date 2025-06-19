'use client'

import { useEffect, useState } from 'react';

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  sparklePhase: number;
}

export default function AnimatedSparks() {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    const colors = [
      '#ec4899', // pink-500
      '#a855f7', // purple-500
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#ffffff', // white
    ];

    const generateSparks = () => {
      const newSparks: Spark[] = [];
      
      // Generate 15-20 sparks
      for (let i = 0; i < Math.floor(Math.random() * 6) + 15; i++) {
        newSparks.push({
          id: i,
          x: Math.random() * 100, // percentage
          y: Math.random() * 100, // percentage
          vx: (Math.random() - 0.5) * 0.02, // very slow horizontal movement
          vy: (Math.random() - 0.5) * 0.02, // very slow vertical movement
          size: Math.random() * 4 + 3, // 3-7px
          opacity: Math.random() * 0.5 + 0.5, // 0.5-1.0
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 2, // -1 to 1 degrees per frame
          color: colors[Math.floor(Math.random() * colors.length)],
          sparklePhase: Math.random() * Math.PI * 2,
        });
      }
      
      setSparks(newSparks);
    };

    generateSparks();
    
    // Animate sparks movement
    const animateFrame = () => {
      setSparks(prevSparks => 
        prevSparks.map(spark => ({
          ...spark,
          x: (spark.x + spark.vx + 100) % 100, // wrap around screen
          y: (spark.y + spark.vy + 100) % 100, // wrap around screen
          rotation: spark.rotation + spark.rotationSpeed,
          sparklePhase: spark.sparklePhase + 0.1,
        }))
      );
    };

    const interval = setInterval(animateFrame, 50); // 20 FPS
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const createSparkSVG = (spark: Spark) => {
    const sparkleIntensity = Math.abs(Math.sin(spark.sparklePhase)) * 0.5 + 0.5;
    
    return (
      <svg 
        width={spark.size * 2} 
        height={spark.size * 2} 
        viewBox="0 0 20 20"
        style={{
          transform: `rotate(${spark.rotation}deg)`,
          opacity: spark.opacity * sparkleIntensity,
        }}
      >
        <defs>
          <filter id={`glow-${spark.id}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main star shape */}
        <path
          d="M10 2 L12 8 L18 8 L13.5 12 L15.5 18 L10 14 L4.5 18 L6.5 12 L2 8 L8 8 Z"
          fill={spark.color}
          filter={`url(#glow-${spark.id})`}
        />
        
        {/* Inner sparkle lines */}
        <g stroke={spark.color} strokeWidth="1" opacity={sparkleIntensity}>
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="10" y1="16" x2="10" y2="19" />
          <line x1="1" y1="10" x2="4" y2="10" />
          <line x1="16" y1="10" x2="19" y2="10" />
          <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" />
          <line x1="13.5" y1="13.5" x2="15.5" y2="15.5" />
          <line x1="15.5" y1="4.5" x2="13.5" y2="6.5" />
          <line x1="6.5" y1="13.5" x2="4.5" y2="15.5" />
        </g>
        
        {/* Central bright point */}
        <circle 
          cx="10" 
          cy="10" 
          r="1" 
          fill="white" 
          opacity={sparkleIntensity}
        />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute"
          style={{
            left: `${spark.x}%`,
            top: `${spark.y}%`,
            transform: 'translate(-50%, -50%)',
            filter: `drop-shadow(0 0 ${spark.size}px ${spark.color})`,
          }}
        >
          {createSparkSVG(spark)}
        </div>
      ))}
    </div>
  );
}