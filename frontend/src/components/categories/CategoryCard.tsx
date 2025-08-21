import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface CategoryCardProps {
  id: string;
  name: string;
  image: string;
  link: string;
  productCount?: number;
  className?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  name,
  image,
  link,
  productCount,
  className
}) => {
  return (
    <Link
      to={link}
      className={clsx(
        'block group relative',
        className
      )}
    >
      {/* Card Container */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700">
        {/* Image */}
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Text Overlay - Top Left */}
        <div className="absolute top-0 left-0 p-4">
          <h3 className="text-xl font-bold text-gray-900 bg-white/90 dark:bg-gray-100/90 backdrop-blur-sm px-3 py-1.5 rounded-lg inline-block">
            {name}
          </h3>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-gray-700 bg-white/90 dark:bg-gray-100/90 backdrop-blur-sm pl-3 pr-2 py-1.5 rounded-full inline-flex items-center gap-2">
              <span>View</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;