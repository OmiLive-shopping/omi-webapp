import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { PromoBannerProps } from './PromoBanner.types';

const BANNER_STORAGE_KEY = 'promo-banner-dismissed';

export const PromoBanner: React.FC<PromoBannerProps> = ({
  message,
  ctaText,
  ctaLink,
  dismissible = false,
  variant = 'default',
  startDate,
  endDate,
  onDismiss,
  onCtaClick,
  className
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const now = new Date();
    
    if (startDate && now < startDate) {
      setIsVisible(false);
      return;
    }
    
    if (endDate && now > endDate) {
      setIsVisible(false);
      return;
    }

    if (dismissible) {
      const dismissedBanners = JSON.parse(
        localStorage.getItem(BANNER_STORAGE_KEY) || '{}'
      );
      const bannerId = `${message}-${ctaText}`;
      
      if (dismissedBanners[bannerId]) {
        const dismissedAt = new Date(dismissedBanners[bannerId]);
        const daysSinceDismissed = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceDismissed < 7) {
          setIsVisible(false);
        }
      }
    }
  }, [message, ctaText, dismissible, startDate, endDate]);

  const handleDismiss = () => {
    setIsVisible(false);
    
    if (dismissible) {
      const dismissedBanners = JSON.parse(
        localStorage.getItem(BANNER_STORAGE_KEY) || '{}'
      );
      const bannerId = `${message}-${ctaText}`;
      dismissedBanners[bannerId] = new Date().toISOString();
      localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(dismissedBanners));
    }
    
    onDismiss?.();
  };

  const handleCtaClick = () => {
    onCtaClick?.();
  };

  if (!isVisible) return null;

  const variantClasses = {
    default: 'bg-mint-100 dark:bg-mint-700 text-mint-900 dark:text-mint-50',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100',
    info: 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-900 dark:text-secondary-100'
  };

  return (
    <div 
      className={clsx(
        'relative w-full transition-all duration-300 ease-in-out',
        variantClasses[variant],
        className
      )}
    >
      <div className="relative flex items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-center">
          <p className="text-sm font-medium leading-6">
            {message}
            {ctaText && (
              <>
                {' '}
                {ctaLink ? (
                  <a
                    href={ctaLink}
                    onClick={handleCtaClick}
                    className="underline font-semibold hover:opacity-80 transition-opacity"
                  >
                    {ctaText}
                  </a>
                ) : (
                  <button
                    onClick={handleCtaClick}
                    className="underline font-semibold hover:opacity-80 transition-opacity"
                  >
                    {ctaText}
                  </button>
                )}
              </>
            )}
          </p>
        </div>

        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={clsx(
              'absolute right-0 top-1/2 -translate-y-1/2 pr-4 sm:pr-6 lg:pr-8 p-2',
              'hover:opacity-70',
              'transition-opacity duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              variant === 'default' && 'focus:ring-mint-500',
              variant === 'success' && 'focus:ring-green-500',
              variant === 'warning' && 'focus:ring-amber-500',
              variant === 'info' && 'focus:ring-secondary-500'
            )}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PromoBanner;