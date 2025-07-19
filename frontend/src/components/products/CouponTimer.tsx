import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Tag, 
  Copy, 
  Check, 
  AlertTriangle,
  Timer,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

interface CouponTimerProps {
  couponCode: string;
  expiresAt: Date | string;
  discountPercentage?: number;
  onExpired?: () => void;
  autoHideWhenExpired?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'urgent' | 'minimal';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const CouponTimer: React.FC<CouponTimerProps> = ({
  couponCode,
  expiresAt,
  discountPercentage,
  onExpired,
  autoHideWhenExpired = true,
  className,
  size = 'md',
  variant = 'default'
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });
  const [isExpired, setIsExpired] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Convert expiresAt to Date object if it's a string
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'p-2',
      text: 'text-xs',
      icon: 'w-3 h-3',
      button: 'px-2 py-1 text-xs'
    },
    md: {
      container: 'p-3',
      text: 'text-sm',
      icon: 'w-4 h-4',
      button: 'px-3 py-1.5 text-sm'
    },
    lg: {
      container: 'p-4',
      text: 'text-base',
      icon: 'w-5 h-5',
      button: 'px-4 py-2 text-base'
    }
  };

  const config = sizeConfig[size];

  // Calculate time remaining
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const distance = expiryDate.getTime() - now;

    if (distance < 0) {
      setIsExpired(true);
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0
      });
      onExpired?.();
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    setTimeLeft({
      days,
      hours,
      minutes,
      seconds,
      total: distance
    });

    // Set urgent state if less than 1 hour remaining
    setIsUrgent(distance < 60 * 60 * 1000);
  }, [expiryDate, onExpired]);

  // Update countdown every second
  useEffect(() => {
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft]);

  // Copy coupon code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy coupon code:', err);
    }
  };

  // Format time display
  const formatTimeUnit = (value: number, unit: string) => {
    return `${value.toString().padStart(2, '0')}${unit}`;
  };

  // Don't render if expired and autoHideWhenExpired is true
  if (isExpired && autoHideWhenExpired) {
    return null;
  }

  // Variant styles
  const variantStyles = {
    default: {
      container: clsx(
        'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
        'border border-purple-200 dark:border-purple-800',
        isUrgent && 'from-red-500/10 to-orange-500/10 border-red-200 dark:border-red-800'
      ),
      text: isUrgent ? 'text-red-600 dark:text-red-400' : 'text-purple-700 dark:text-purple-300',
      button: clsx(
        'bg-purple-600 hover:bg-purple-700 text-white',
        isUrgent && 'bg-red-600 hover:bg-red-700'
      )
    },
    urgent: {
      container: 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700',
      text: 'text-red-700 dark:text-red-300',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    minimal: {
      container: 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      button: 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  };

  const currentVariant = isUrgent && variant === 'default' ? 'urgent' : variant;
  const styles = variantStyles[currentVariant];

  return (
    <div 
      className={clsx(
        'rounded-lg transition-all duration-300',
        config.container,
        styles.container,
        isExpired && 'opacity-50',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className={clsx('flex-shrink-0', styles.text)}>
            {isUrgent ? (
              <AlertTriangle className={clsx(config.icon, 'animate-pulse')} />
            ) : isExpired ? (
              <Timer className={config.icon} />
            ) : (
              <Tag className={config.icon} />
            )}
          </div>

          {/* Discount and Timer */}
          <div className="flex flex-col">
            {discountPercentage && (
              <div className={clsx('font-semibold flex items-center gap-1', config.text, styles.text)}>
                <Zap className={clsx(config.icon, 'inline')} />
                {discountPercentage}% OFF
              </div>
            )}
            
            {!isExpired ? (
              <div className={clsx('font-mono tabular-nums', config.text, styles.text)}>
                {timeLeft.days > 0 && formatTimeUnit(timeLeft.days, 'd ')}
                {formatTimeUnit(timeLeft.hours, 'h ')}
                {formatTimeUnit(timeLeft.minutes, 'm ')}
                {formatTimeUnit(timeLeft.seconds, 's')}
              </div>
            ) : (
              <div className={clsx('font-medium', config.text, styles.text)}>
                Coupon Expired
              </div>
            )}

            {isUrgent && !isExpired && (
              <div className={clsx('text-xs font-medium animate-pulse', styles.text)}>
                Expires soon!
              </div>
            )}
          </div>
        </div>

        {/* Copy Button */}
        {!isExpired && (
          <button
            onClick={handleCopyCode}
            disabled={copiedCode}
            className={clsx(
              'flex items-center gap-1.5 rounded font-mono font-semibold transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              config.button,
              styles.button,
              copiedCode && 'bg-green-600 hover:bg-green-600'
            )}
          >
            {couponCode}
            {copiedCode ? (
              <Check className={config.icon} />
            ) : (
              <Copy className={config.icon} />
            )}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {!isExpired && variant !== 'minimal' && (
        <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={clsx(
              'h-full transition-all duration-1000',
              isUrgent 
                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            )}
            style={{
              width: `${Math.max(0, Math.min(100, (timeLeft.total / (24 * 60 * 60 * 1000)) * 100))}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

// Bulk Coupon Timer Component for multiple coupons
export const CouponTimerList: React.FC<{
  coupons: Array<{
    id: string;
    code: string;
    expiresAt: Date | string;
    discountPercentage?: number;
  }>;
  onExpired?: (couponId: string) => void;
  className?: string;
}> = ({ coupons, onExpired, className }) => {
  const [activeCoupons, setActiveCoupons] = useState(coupons);

  const handleCouponExpired = (couponId: string) => {
    setActiveCoupons(prev => prev.filter(c => c.id !== couponId));
    onExpired?.(couponId);
  };

  if (activeCoupons.length === 0) {
    return null;
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {activeCoupons.map((coupon) => (
        <CouponTimer
          key={coupon.id}
          couponCode={coupon.code}
          expiresAt={coupon.expiresAt}
          discountPercentage={coupon.discountPercentage}
          onExpired={() => handleCouponExpired(coupon.id)}
          autoHideWhenExpired={true}
          size="sm"
          variant={activeCoupons.length > 1 ? 'minimal' : 'default'}
        />
      ))}
    </div>
  );
};

export default CouponTimer;