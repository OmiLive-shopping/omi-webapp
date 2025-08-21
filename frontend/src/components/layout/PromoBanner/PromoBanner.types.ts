export interface PromoBannerProps {
  message: string;
  ctaText?: string;
  ctaLink?: string;
  dismissible?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'info';
  startDate?: Date;
  endDate?: Date;
  onDismiss?: () => void;
  onCtaClick?: () => void;
  className?: string;
}