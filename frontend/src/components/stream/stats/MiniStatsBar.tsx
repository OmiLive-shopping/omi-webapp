import React from 'react';
import { Radio, Camera, Activity, Wifi, Users } from 'lucide-react';

export interface MiniStatsBarProps {
  stats: {
    bitrate?: number;
    fps?: number;
    latency?: number;
    packetLoss?: number;
    viewers?: number;
  };
  
  // Display options
  showLabels?: boolean;
  showIcons?: boolean;
  orientation?: 'horizontal' | 'vertical';
  
  // Styling
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const MiniStatsBar: React.FC<MiniStatsBarProps> = ({
  stats,
  showLabels = true,
  showIcons = true,
  orientation = 'horizontal',
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  };
  
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  };
  
  const orientationClasses = orientation === 'horizontal' 
    ? 'flex flex-row items-center gap-3 flex-wrap'
    : 'flex flex-col gap-2';
  
  const StatItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    unit?: string;
    color?: string;
  }> = ({ icon, label, value, unit, color = 'text-gray-600 dark:text-gray-400' }) => (
    <div className="flex items-center gap-1.5">
      {showIcons && (
        <span className={color}>
          {icon}
        </span>
      )}
      {showLabels && (
        <span className={`${sizeClasses[size]} font-medium text-gray-500 dark:text-gray-400`}>
          {label}:
        </span>
      )}
      <span className={`${sizeClasses[size]} font-semibold text-gray-900 dark:text-gray-100`}>
        {value}
      </span>
      {unit && (
        <span className={`${sizeClasses[size]} text-gray-500 dark:text-gray-400`}>
          {unit}
        </span>
      )}
    </div>
  );
  
  const getPacketLossColor = (loss: number): string => {
    if (loss > 5) return 'text-red-500';
    if (loss > 1) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  const getLatencyColor = (latency: number): string => {
    if (latency > 200) return 'text-red-500';
    if (latency > 100) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  return (
    <div className={`mini-stats-bar ${orientationClasses} ${className}`}>
      {stats.bitrate !== undefined && (
        <StatItem
          icon={<Radio className={iconSizes[size]} />}
          label="Bitrate"
          value={Math.round(stats.bitrate / 1000)}
          unit="kbps"
        />
      )}
      
      {stats.fps !== undefined && (
        <StatItem
          icon={<Camera className={iconSizes[size]} />}
          label="FPS"
          value={Math.round(stats.fps)}
        />
      )}
      
      {stats.latency !== undefined && (
        <StatItem
          icon={<Activity className={iconSizes[size]} />}
          label="Latency"
          value={Math.round(stats.latency)}
          unit="ms"
          color={getLatencyColor(stats.latency)}
        />
      )}
      
      {stats.packetLoss !== undefined && (
        <StatItem
          icon={<Wifi className={iconSizes[size]} />}
          label="Loss"
          value={stats.packetLoss.toFixed(1)}
          unit="%"
          color={getPacketLossColor(stats.packetLoss)}
        />
      )}
      
      {stats.viewers !== undefined && (
        <StatItem
          icon={<Users className={iconSizes[size]} />}
          label="Viewers"
          value={stats.viewers}
        />
      )}
    </div>
  );
};

export default MiniStatsBar;