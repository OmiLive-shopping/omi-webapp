import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, Calendar } from 'lucide-react';

export interface HeroSlideData {
  id: number;
  title: string;
  streamer: string;
  viewers: number;
  products: string[];
  image: string;
  isLive: boolean;
}

interface HeroSlideProps {
  slide: HeroSlideData;
  isActive: boolean;
}

export const HeroSlide: React.FC<HeroSlideProps> = ({ slide, isActive }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative h-full">
        {/* Background Image */}
        <img
          src={slide.image}
          alt={slide.title}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl relative">
              {/* Live Badge - Positioned at top but aligned with content */}
              {slide.isLive && (
                <div className="absolute -top-16 left-0 inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {slide.title}
              </h1>
              
              {/* Meta Info */}
              <div className="flex items-center gap-4 text-white mb-6">
                <span className="flex items-center gap-2">
                  <img
                    src={`https://ui-avatars.com/api/?name=${slide.streamer}&background=random`}
                    alt={slide.streamer}
                    className="w-8 h-8 rounded-full"
                  />
                  hosted by {slide.streamer}
                </span>
                {slide.isLive && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {slide.viewers.toLocaleString()} watching
                  </span>
                )}
              </div>
              
              {/* Product Tags */}
              <div className="flex flex-wrap gap-2">
                {slide.products.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Button - Bottom Right */}
        <div className="absolute bottom-8 right-8">
          <button
            onClick={() => navigate('/live-streams')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
          >
            {slide.isLive ? (
              <>
                Tune In
                <Play className="w-4 h-4" />
              </>
            ) : (
              <>
                View Schedule
                <Calendar className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSlide;