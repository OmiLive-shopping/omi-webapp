import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface ExpandableSectionProps {
  children: React.ReactNode[];
  initialCount?: number;
  gridClassName?: string;
  containerClassName?: string;
  expandText?: string;
  collapseText?: string;
  showItemCount?: boolean;
  animationDuration?: number;
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  children,
  initialCount = 4,
  gridClassName = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3',
  containerClassName = '',
  expandText = 'Show More',
  collapseText = 'Show Less',
  showItemCount = true,
  animationDuration = 300
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const totalItems = React.Children.count(children);
  const hasMore = totalItems > initialCount;
  const visibleChildren = isExpanded ? children : children.slice(0, initialCount);
  const remainingCount = totalItems - initialCount;

  useEffect(() => {
    if (!contentRef.current) return;

    const updateHeight = () => {
      if (!contentRef.current) return;
      
      if (isAnimating) {
        const currentHeight = contentRef.current.scrollHeight;
        setHeight(currentHeight);
      } else {
        setHeight('auto');
      }
    };

    updateHeight();
  }, [visibleChildren, isAnimating]);

  const handleToggle = () => {
    if (!contentRef.current) return;

    setIsAnimating(true);
    
    if (isExpanded) {
      // Collapsing
      const currentHeight = contentRef.current.scrollHeight;
      setHeight(currentHeight);
      
      requestAnimationFrame(() => {
        setIsExpanded(false);
        requestAnimationFrame(() => {
          if (contentRef.current) {
            const newHeight = contentRef.current.scrollHeight;
            setHeight(newHeight);
            setTimeout(() => {
              setIsAnimating(false);
              setHeight('auto');
            }, animationDuration);
          }
        });
      });
    } else {
      // Expanding
      const currentHeight = contentRef.current.scrollHeight;
      setHeight(currentHeight);
      
      requestAnimationFrame(() => {
        setIsExpanded(true);
        requestAnimationFrame(() => {
          if (contentRef.current) {
            const newHeight = contentRef.current.scrollHeight;
            setHeight(newHeight);
            setTimeout(() => {
              setIsAnimating(false);
              setHeight('auto');
            }, animationDuration);
          }
        });
      });
    }
  };

  if (!hasMore) {
    return (
      <div className={containerClassName}>
        <div className={gridClassName}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          height: isAnimating ? height : 'auto',
          transition: isAnimating ? `height ${animationDuration}ms ease-in-out` : 'none'
        }}
      >
        <div className={gridClassName}>
          {visibleChildren}
        </div>
      </div>

      {/* Separator with button */}
      <div className="relative mt-8 mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <button
            onClick={handleToggle}
            className="bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 flex items-center gap-2"
          >
            <span>
              {isExpanded ? collapseText : expandText}
              {!isExpanded && showItemCount && remainingCount > 0 && (
                <span className="ml-1 text-gray-500">
                  ({remainingCount} more)
                </span>
              )}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Alternative variant with a more prominent button style
export const ExpandableSectionAlt: React.FC<ExpandableSectionProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItems = React.Children.count(props.children);
  const hasMore = totalItems > (props.initialCount || 4);
  const visibleChildren = isExpanded ? props.children : props.children.slice(0, props.initialCount || 4);
  const remainingCount = totalItems - (props.initialCount || 4);

  if (!hasMore) {
    return (
      <div className={props.containerClassName}>
        <div className={props.gridClassName || 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'}>
          {props.children}
        </div>
      </div>
    );
  }

  return (
    <div className={props.containerClassName}>
      <div className={props.gridClassName || 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'}>
        {visibleChildren}
      </div>

      {/* Alternative button style - full width with subtle background */}
      <div className="mt-6 w-full">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors duration-200 rounded-lg flex items-center justify-center gap-2"
        >
          <span>
            {isExpanded ? props.collapseText || 'Show Less' : props.expandText || 'Show More'}
            {!isExpanded && props.showItemCount !== false && remainingCount > 0 && (
              <span className="ml-1 text-gray-500">
                ({remainingCount})
              </span>
            )}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ExpandableSection;