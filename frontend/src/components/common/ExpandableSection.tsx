import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface ExpandableSectionProps {
  children: React.ReactNode[];
  initialCount?: number;
  gridClassName?: string;
  containerClassName?: string;
  expandText?: string;
  collapseText?: string;
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  children,
  initialCount = 4,
  gridClassName = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3',
  containerClassName = '',
  expandText = 'Show More',
  collapseText = 'Show Less'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalItems = React.Children.count(children);
  const hasMore = totalItems > initialCount;
  const remainingCount = totalItems - initialCount;
  const initialChildren = hasMore ? children.slice(0, initialCount) : children;
  const extraChildren = hasMore ? children.slice(initialCount) : [];

  return (
    <div className={containerClassName}>
      {/* Always visible items */}
      <div className={gridClassName}>
        {initialChildren}
      </div>

      {/* Expandable items with pure CSS grid animation - only render if there are extras */}
      {hasMore && (
        <div 
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ 
            gridTemplateRows: isExpanded ? '1fr' : '0fr'
          }}
        >
          <div className="overflow-hidden">
            <div className={`${gridClassName} mt-3`}>
              {extraChildren}
            </div>
          </div>
        </div>
      )}

      {/* Always show separator with pill button */}
      <div className="relative mt-8 mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          {hasMore ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="bg-white border border-gray-300 rounded-full px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              <span>
                {isExpanded ? collapseText : expandText}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-full px-6 py-2 text-sm font-medium text-gray-500 flex items-center gap-2 shadow-sm">
              <span>Showing All</span>
              <Check className="w-4 h-4" />
            </div>
          )}
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