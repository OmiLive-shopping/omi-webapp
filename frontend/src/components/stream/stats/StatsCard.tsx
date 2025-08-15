import React from 'react';
import {
  TrendingUp, TrendingDown, Minus, Activity,
  Wifi, Users, Radio, Camera, Mic, HardDrive,
  Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import type { TrendData } from '@/lib/vdo-ninja/real-time-stats';

export interface StatsCardProps {
  // Metric info
  title: string;
  value: number | string;
  unit?: string;
  description?: string;
  
  // Trend data
  trend?: TrendData;
  previousValue?: number | string;
  changePercent?: number;
  
  // Visual options
  icon?: React.ReactNode;
  iconColor?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  
  // Status
  status?: 'good' | 'warning' | 'critical';
  threshold?: { warning: number; critical: number };
  
  // Layout
  layout?: 'vertical' | 'horizontal';
  showTrend?: boolean;
  showIcon?: boolean;
  
  // Styling
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  unit = '',
  description,
  trend,
  previousValue,
  changePercent,
  icon,
  iconColor,
  variant = 'default',
  size = 'md',
  status,
  threshold,
  layout = 'vertical',
  showTrend = true,
  showIcon = true,
  className = ''
}) => {
  // Format value based on type
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}k`;
      } else if (val < 1 && val > 0) {
        return val.toFixed(2);
      }
      return val.toFixed(0);
    }
    return val;
  };
  
  // Determine status based on threshold
  const getStatus = (): 'good' | 'warning' | 'critical' => {
    if (status) return status;
    if (!threshold || typeof value !== 'number') return 'good';
    
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'good';
  };
  
  // Get icon based on metric type
  const getDefaultIcon = (): React.ReactNode => {
    if (icon) return icon;
    
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('bitrate')) return <Radio className="w-4 h-4" />;
    if (lowerTitle.includes('fps') || lowerTitle.includes('frame')) return <Camera className="w-4 h-4" />;
    if (lowerTitle.includes('latency') || lowerTitle.includes('ping')) return <Activity className="w-4 h-4" />;
    if (lowerTitle.includes('packet')) return <Wifi className="w-4 h-4" />;
    if (lowerTitle.includes('viewer') || lowerTitle.includes('user')) return <Users className="w-4 h-4" />;
    if (lowerTitle.includes('audio')) return <Mic className="w-4 h-4" />;
    if (lowerTitle.includes('storage') || lowerTitle.includes('bytes')) return <HardDrive className="w-4 h-4" />;
    if (lowerTitle.includes('duration') || lowerTitle.includes('time')) return <Clock className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };
  
  // Get trend icon
  const getTrendIcon = (): React.ReactNode => {
    if (!trend && !changePercent) return null;
    
    const trendDirection = trend?.trend || (changePercent && changePercent > 0 ? 'improving' : 'degrading');
    
    if (trendDirection === 'improving') {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    } else if (trendDirection === 'degrading') {
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    } else {
      return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };
  
  // Size classes
  const sizeClasses = {
    sm: {
      container: 'p-3',
      title: 'text-xs',
      value: 'text-lg',
      description: 'text-xs'
    },
    md: {
      container: 'p-4',
      title: 'text-sm',
      value: 'text-2xl',
      description: 'text-xs'
    },
    lg: {
      container: 'p-5',
      title: 'text-base',
      value: 'text-3xl',
      description: 'text-sm'
    }
  };
  
  // Variant classes
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    primary: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };
  
  // Status colors
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  };
  
  const currentStatus = getStatus();
  
  // Layout classes
  const layoutClasses = layout === 'horizontal' 
    ? 'flex flex-row items-center justify-between gap-4'
    : 'flex flex-col';
  
  return (
    <div
      className={`
        ${sizeClasses[size].container}
        ${variantClasses[variant]}
        border rounded-lg transition-all duration-200
        hover:shadow-md
        ${layoutClasses}
        ${className}
      `}
    >
      {layout === 'vertical' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {showIcon && (
                <div className={`${iconColor || statusColors[currentStatus]}`}>
                  {getDefaultIcon()}
                </div>
              )}
              <h3 className={`${sizeClasses[size].title} font-medium text-gray-600 dark:text-gray-400`}>
                {title}
              </h3>
            </div>
            {showTrend && getTrendIcon()}
          </div>
          
          {/* Value */}
          <div className="flex items-baseline gap-1">
            <span className={`${sizeClasses[size].value} font-bold text-gray-900 dark:text-gray-100`}>
              {formatValue(value)}
            </span>
            {unit && (
              <span className={`${sizeClasses[size].title} text-gray-500`}>
                {unit}
              </span>
            )}
          </div>
          
          {/* Description or Change */}
          {(description || changePercent !== undefined) && (
            <div className={`${sizeClasses[size].description} text-gray-500 dark:text-gray-400 mt-1`}>
              {description || (
                <span className={changePercent && changePercent > 0 ? 'text-green-500' : 'text-red-500'}>
                  {changePercent && changePercent > 0 ? '+' : ''}{changePercent?.toFixed(1)}% from {formatValue(previousValue || 0)}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Horizontal Layout */}
          <div className="flex items-center gap-3">
            {showIcon && (
              <div className={`${iconColor || statusColors[currentStatus]}`}>
                {getDefaultIcon()}
              </div>
            )}
            <div>
              <h3 className={`${sizeClasses[size].title} font-medium text-gray-600 dark:text-gray-400`}>
                {title}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className={`${sizeClasses[size].value} font-bold text-gray-900 dark:text-gray-100`}>
                  {formatValue(value)}
                </span>
                {unit && (
                  <span className={`${sizeClasses[size].title} text-gray-500`}>
                    {unit}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showTrend && getTrendIcon()}
            {changePercent !== undefined && (
              <span className={`${sizeClasses[size].description} ${changePercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StatsCard;