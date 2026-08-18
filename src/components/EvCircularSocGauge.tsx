import React from 'react';
import { Zap, AlertTriangle, BatteryCharging, BatteryWarning, BatteryMedium, Battery } from 'lucide-react';

export interface EvCircularSocGaugeProps {
  socPercent: number; // 0 - 100
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showStatusBadge?: boolean;
  isCharging?: boolean;
  batteryCapacityKwh?: number;
  estimatedRangeKm?: number;
  className?: string;
}

/**
 * Returns color category based on user requirement:
 * - Red: < 20%
 * - Amber: 20% - 50%
 * - Green: > 50%
 */
export function getSocColorConfig(soc: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(soc)));

  if (clamped < 20) {
    return {
      category: 'RED' as const,
      strokeColor: '#ef4444', // Red-500
      glowColor: 'rgba(239, 68, 68, 0.35)',
      textColor: 'text-red-400',
      fillColor: '#ef4444',
      bgRingColor: '#451a1a',
      badgeBg: 'bg-red-500/20',
      badgeText: 'text-red-300',
      badgeBorder: 'border-red-500/40',
      statusText: 'Critical (< 20%)',
      shortStatus: 'Low',
      pulse: true
    };
  }

  if (clamped <= 50) {
    return {
      category: 'AMBER' as const,
      strokeColor: '#f59e0b', // Amber-500
      glowColor: 'rgba(245, 158, 11, 0.35)',
      textColor: 'text-amber-400',
      fillColor: '#f59e0b',
      bgRingColor: '#452b12',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      statusText: 'Moderate (20-50%)',
      shortStatus: 'Moderate',
      pulse: false
    };
  }

  return {
    category: 'GREEN' as const,
    strokeColor: '#10b981', // Emerald-500
    glowColor: 'rgba(16, 185, 129, 0.35)',
    textColor: 'text-emerald-400',
    fillColor: '#10b981',
    bgRingColor: '#063828',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    statusText: 'Optimal (> 50%)',
    shortStatus: 'Good',
    pulse: false
  };
}

export const EvCircularSocGauge: React.FC<EvCircularSocGaugeProps> = ({
  socPercent = 0,
  size = 'md',
  showLabel = true,
  showStatusBadge = false,
  isCharging = false,
  batteryCapacityKwh,
  estimatedRangeKm,
  className = ''
}) => {
  const clampedSoc = Math.max(0, Math.min(100, Math.round(socPercent)));
  const colorCfg = getSocColorConfig(clampedSoc);

  // Dimension settings based on size
  const dimensions = {
    xs: { dim: 40, strokeWidth: 3.5, fontSize: 'text-[10px]', iconSize: 10 },
    sm: { dim: 56, strokeWidth: 4.5, fontSize: 'text-xs', iconSize: 12 },
    md: { dim: 76, strokeWidth: 6, fontSize: 'text-sm font-black', iconSize: 14 },
    lg: { dim: 96, strokeWidth: 7.5, fontSize: 'text-lg font-black', iconSize: 16 },
    xl: { dim: 120, strokeWidth: 9, fontSize: 'text-2xl font-black', iconSize: 20 }
  }[size];

  const { dim, strokeWidth, fontSize, iconSize } = dimensions;
  const radius = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedSoc / 100) * circumference;

  // Remaining kWh calculation
  const remainingKwh = batteryCapacityKwh 
    ? ((batteryCapacityKwh * clampedSoc) / 100).toFixed(1)
    : null;

  return (
    <div className={`flex flex-col items-center justify-center gap-1 relative ${className}`}>
      
      {/* SVG Circular Gauge */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        <svg 
          width={dim} 
          height={dim} 
          className="transform -rotate-90 origin-center"
          viewBox={`0 0 ${dim} ${dim}`}
        >
          {/* Background Track Circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="#1e293b" // slate-800
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Inner Accent Shadow Ring */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke={colorCfg.bgRingColor}
            strokeWidth={strokeWidth}
            strokeOpacity={0.5}
            fill="transparent"
          />

          {/* Animated Progress Gauge Ring */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke={colorCfg.strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: isCharging || colorCfg.category === 'RED' ? `drop-shadow(0 0 6px ${colorCfg.glowColor})` : undefined
            }}
          />
        </svg>

        {/* Center Percentage & Icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="flex items-center justify-center gap-0.5">
            {isCharging ? (
              <Zap 
                className="text-amber-400 animate-bounce" 
                style={{ width: iconSize, height: iconSize }} 
              />
            ) : colorCfg.category === 'RED' ? (
              <AlertTriangle 
                className="text-red-400 animate-pulse" 
                style={{ width: iconSize, height: iconSize }} 
              />
            ) : null}
            
            <span className={`font-mono font-bold leading-none ${fontSize} ${colorCfg.textColor}`}>
              {clampedSoc}%
            </span>
          </div>

          {size !== 'xs' && size !== 'sm' && showLabel && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">
              SoC
            </span>
          )}
        </div>

        {/* Outer Glow Pulse for Critical Charge (< 20%) */}
        {colorCfg.category === 'RED' && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping opacity-25 pointer-events-none"
          />
        )}
      </div>

      {/* Optional Status Badge */}
      {showStatusBadge && (
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${colorCfg.badgeBg} ${colorCfg.badgeText} ${colorCfg.badgeBorder}`}>
          <span 
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: colorCfg.strokeColor }} 
          />
          <span>{colorCfg.statusText}</span>
        </div>
      )}

      {/* Capacity / Range details tooltip / subtext */}
      {(remainingKwh || estimatedRangeKm !== undefined) && size !== 'xs' && size !== 'sm' && (
        <div className="text-[10px] text-slate-400 font-mono text-center flex items-center gap-1.5 mt-0.5">
          {remainingKwh && <span>{remainingKwh} kWh</span>}
          {remainingKwh && estimatedRangeKm !== undefined && <span>•</span>}
          {estimatedRangeKm !== undefined && <span className="text-emerald-400 font-bold">{estimatedRangeKm} km</span>}
        </div>
      )}

    </div>
  );
};
