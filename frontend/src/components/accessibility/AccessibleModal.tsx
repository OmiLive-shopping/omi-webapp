import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { announce } from './ScreenReaderAnnouncer';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  ariaDescribedBy?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  ariaDescribedBy
}) => {
  const titleId = useId();
  const descriptionId = useId();
  
  const modalRef = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    autoFocus: true,
    restoreFocus: true,
    onEscape: onClose
  });

  useEffect(() => {
    if (isOpen) {
      // Announce modal opening
      announce(`${title} dialog opened`, 'assertive');
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Add aria-hidden to other content
      const appRoot = document.getElementById('root');
      if (appRoot) {
        appRoot.setAttribute('aria-hidden', 'true');
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      const appRoot = document.getElementById('root');
      if (appRoot) {
        appRoot.removeAttribute('aria-hidden');
      }
    };
  }, [isOpen, title]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy || descriptionId}
        className={`
          relative w-full ${sizeClasses[size]} 
          bg-background-primary rounded-lg shadow-xl 
          max-h-[90vh] flex flex-col
          animate-fade-in
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 
            id={titleId}
            className="text-xl font-semibold text-text-primary"
          >
            {title}
          </h2>
          
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5 text-text-secondary" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div 
          id={descriptionId}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          {children}
        </div>
      </div>
    </div>
  );
};