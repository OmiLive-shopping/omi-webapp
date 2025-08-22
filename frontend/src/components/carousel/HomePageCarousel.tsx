import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { HeroSlide, HeroSlideData } from './HeroSlide';

const heroSlides: HeroSlideData[] = [
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
          <HeroSlide
            key={slide.id}
            slide={slide}
            isActive={index === currentSlide}
          />
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