import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Eye, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface HeroSlide {
  id: number;
  title: string;
  streamer: string;
  viewers: number;
  products: string[];
  image: string;
  isLive: boolean;
}

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: 'My Eco-Friendly Hair Care Faves this Spring',
    streamer: 'Maria Salvidar',
    viewers: 1432,
    products: ['Hair', 'Vinamalita Local', 'Paraben-Free', 'Jumbo'],
    image: 'https://images.unsplash.com/photo-1576828831022-ca41d3905fb7?w=1200',
    isLive: true
  },
  {
    id: 2,
    title: 'Summer Skincare Essentials',
    streamer: 'Beauty Expert',
    viewers: 892,
    products: ['Skincare', 'Natural', 'SPF Protection'],
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
    isLive: true
  },
  {
    id: 3,
    title: 'Home Decor Must-Haves',
    streamer: 'Interior Designer',
    viewers: 567,
    products: ['Home', 'Decor', 'Sustainable'],
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200',
    isLive: false
  }
];

export const HomePageCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  return (
    <section className="relative h-[500px] overflow-hidden">
      <div className="relative h-full">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={clsx(
              "absolute inset-0 transition-opacity duration-1000",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="relative h-full">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4">
                  <div className="max-w-2xl">
                    {slide.isLive && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded-full mb-4">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}
                    
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                      {slide.title}
                    </h1>
                    
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
                    
                    <div className="flex flex-wrap gap-2 mb-8">
                      {slide.products.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => navigate('/live-streams')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Controls */}
      <button
        onClick={goToPrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goToNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={clsx(
              "w-2 h-2 rounded-full transition-all",
              index === currentSlide
                ? "w-8 bg-white"
                : "bg-white/50 hover:bg-white/70"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HomePageCarousel;