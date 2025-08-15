import React from 'react';
import { 
  Wifi, WifiOff, Activity, AlertCircle, 
  CheckCircle, XCircle, Signal, SignalHigh,
  SignalLow, SignalMedium, SignalZero
} from 'lucide-react';

export interface NetworkQualityIndicatorProps {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'offline';
  score?: number;
  
  // Optional metrics
  latency?: number;
  packetLoss?: number;
  jitter?: number;
  bitrate?: number;
  
  // Display options
  showDetails?: boolean;
  showLabel?: boolean;
  showIcon?: boolean;
  showBars?: boolean;
  
  // Layout
  layout?: 'horizontal' | 'vertical' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  // Styling
  className?: string;
}

export const NetworkQualityIndicator: React.FC<NetworkQualityIndicatorProps> = ({
  quality,
  score = 0,
  latency,
  packetLoss,
  jitter,
  bitrate,
  showDetails = false,
  showLabel = true,
  showIcon = true,
  showBars = true,
  layout = 'horizontal',
  size = 'md',
  className = ''
}) => {
  // Quality configurations
  const qualityConfig = {
    excellent: {
      label: 'Excellent',
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      icon: <SignalHigh className="w-full h-full" />,
      bars: 5
    },
    good: {
      label: 'Good',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      icon: <Signal className="w-full h-full" />,
      bars: 4
    },
    fair: {
      label: 'Fair',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      icon: <SignalMedium className="w-full h-full" />,
      bars: 3
    },
    poor: {
      label: 'Poor',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      icon: <SignalLow className="w-full h-full" />,
      bars: 2
    },
    critical: {
      label: 'Critical',
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      borderColor: 'border-red-500',
      icon: <SignalZero className="w-full h-full" />,
      bars: 1
    },
    offline: {
      label: 'Offline',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500',
      borderColor: 'border-gray-500',
      icon: <WifiOff className="w-full h-full" />,
      bars: 0
    }
  };
  
  const config = qualityConfig[quality];
  
  // Size configurations
  const sizeConfig = {
    xs: {
      container: 'text-xs',
      icon: 'w-3 h-3',
      bar: 'w-1 h-2',
      padding: 'p-1',
      gap: 'gap-0.5'
    },
    sm: {
      container: 'text-sm',
      icon: 'w-4 h-4',
      bar: 'w-1.5 h-3',
      padding: 'p-2',
      gap: 'gap-1'
    },
    md: {
      container: 'text-base',
      icon: 'w-5 h-5',
      bar: 'w-2 h-4',
      padding: 'p-3',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'text-lg',
      icon: 'w-6 h-6',
      bar: 'w-2.5 h-5',
      padding: 'p-4',
      gap: 'gap-2'
    }
  };
  
  const sizes = sizeConfig[size];
  
  // Signal bars component
  const SignalBars: React.FC = () => {
    if (!showBars) return null;
    
    return (
      <div className={`flex items-end ${sizes.gap}`}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`
              ${sizes.bar}
              transition-all duration-300
              ${bar <= config.bars ? config.bgColor : 'bg-gray-300 dark:bg-gray-600'}
            `}
            style={{ height: `${bar * 20}%` }}
          />
        ))}
      </div>
    );
  };
  
  // Metric display component
  const MetricItem: React.FC<{
    label: string;
    value: number | string;
    unit?: string;
    status?: 'good' | 'warning' | 'bad';
  }> = ({ label, value, unit, status }) => {
    const statusColors = {
      good: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      bad: 'text-red-600 dark:text-red-400'
    };
    
    return (
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-400">{label}:</span>
        <span className={status ? statusColors[status] : 'text-gray-900 dark:text-gray-100'}>
          {value}{unit}
        </span>
      </div>
    );
  };
  
  // Get metric status
  const getLatencyStatus = (val: number): 'good' | 'warning' | 'bad' => {
    if (val < 50) return 'good';
    if (val < 150) return 'warning';
    return 'bad';
  };
  
  const getPacketLossStatus = (val: number): 'good' | 'warning' | 'bad' => {
    if (val < 1) return 'good';
    if (val < 5) return 'warning';
    return 'bad';
  };
  
  const getJitterStatus = (val: number): 'good' | 'warning' | 'bad' => {
    if (val < 30) return 'good';
    if (val < 50) return 'warning';
    return 'bad';
  };
  
  // Render compact version
  if (layout === 'compact') {
    return (
      <div className={`flex items-center ${sizes.gap} ${className}`}>
        {showIcon && (
          <div className={`${sizes.icon} ${config.color}`}>
            {config.icon}
          </div>
        )}
        {showBars && <SignalBars />}
        {showLabel && (
          <span className={`${sizes.container} font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
      </div>
    );
  }
  
  // Render full version
  const layoutClasses = layout === 'horizontal' 
    ? 'flex flex-row items-center' 
    : 'flex flex-col';
  
  return (
    <div className={`network-quality-indicator ${className}`}>
      <div className={`${layoutClasses} ${sizes.gap} ${sizes.padding} bg-white dark:bg-gray-800 rounded-lg border ${config.borderColor} border-opacity-20`}>
        {/* Main indicator */}
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className={`${sizes.icon} ${config.color}`}>
              {config.icon}
            </div>
          )}
          
          {showBars && <SignalBars />}
          
          <div>
            {showLabel && (
              <div className={`${sizes.container} font-semibold ${config.color}`}>
                {config.label}
              </div>
            )}
            {score !== undefined && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Score: {score}/100
              </div>
            )}
          </div>
        </div>
        
        {/* Detailed metrics */}
        {showDetails && (latency !== undefined || packetLoss !== undefined || jitter !== undefined || bitrate !== undefined) && (
          <div className={`${layout === 'horizontal' ? 'ml-auto' : 'mt-3'} ${sizes.container} space-y-1 min-w-[150px]`}>
            {latency !== undefined && (
              <MetricItem
                label="Latency"
                value={Math.round(latency)}
                unit="ms"
                status={getLatencyStatus(latency)}
              />
            )}
            {packetLoss !== undefined && (
              <MetricItem
                label="Packet Loss"
                value={packetLoss.toFixed(1)}
                unit="%"
                status={getPacketLossStatus(packetLoss)}
              />
            )}
            {jitter !== undefined && (
              <MetricItem
                label="Jitter"
                value={Math.round(jitter)}
                unit="ms"
                status={getJitterStatus(jitter)}
              />
            )}
            {bitrate !== undefined && (
              <MetricItem
                label="Bitrate"
                value={Math.round(bitrate / 1000)}
                unit=" kbps"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkQualityIndicator;