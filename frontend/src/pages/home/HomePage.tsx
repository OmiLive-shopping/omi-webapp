import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';
import ProductCard from '@/components/products/ProductCard';
import { LivestreamCard } from '@/components/stream/LivestreamCard';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { HomePageCarousel } from '@/components/carousel/HomePageCarousel';
import { ExpandableSection } from '@/components/common/ExpandableSection';

// Live and upcoming streams data
// TODO: Products need to come from the backend
const liveStreams = [
  {
    id: '1',
    title: 'My Eco-Friendly Hair Care Faves this Spring',
    hostName: 'Maria Salvidar',
    hostAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    thumbnail:
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&h=450&fit=crop',
    isLive: true,
    viewerCount: 1234,
    category: 'Beauty',
  },
  {
    id: '2',
    title: 'Summer Skincare Routine for Glowing Skin',
    hostName: 'Emma Chen',
    hostAvatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    thumbnail:
      'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=450&fit=crop',
    isLive: true,
    viewerCount: 856,
    category: 'Skincare',
  },
  {
    id: '3',
    title: 'Natural Makeup Tutorial: No-Makeup Look',
    hostName: 'Sophie Anderson',
    thumbnail:
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=450&fit=crop',
    isLive: false,
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    category: 'Makeup',
  },
  {
    id: '4',
    title: 'DIY Hair Masks with Kitchen Ingredients',
    hostName: 'Zara Williams',
    hostAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail:
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=450&fit=crop',
    isLive: false,
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    category: 'Hair Care',
  },
];

// Categories data
const categories = [
  {
    id: 'haircare',
    name: 'Hair Care',
    image:
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=450&fit=crop',
    link: '/products?category=haircare',
    productCount: 124,
  },
  {
    id: 'home',
    name: 'Home',
    image:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=450&fit=crop',
    link: '/products?category=home',
    productCount: 89,
  },
  {
    id: 'apparel',
    name: 'Apparel',
    image:
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=450&fit=crop',
    link: '/products?category=apparel',
    productCount: 156,
  },
];

// Popular products data
const popularProducts = [
  {
    id: '1',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 12.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    stock: 15,
    timeLeft: '23h',
    viewers: 23,
  },
  {
    id: '2',
    name: 'White Tea Shampoo and Conditioner',
    brand: 'Westin Hotels',
    price: 24.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400',
    stock: 8,
    timeLeft: '12h',
    viewers: 54,
    isHot: true,
  },
  {
    id: '3',
    name: 'The Ordinary Shampoo and Conditioner',
    brand: 'The Ordinary',
    price: 18.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    stock: 30,
    timeLeft: '8h',
    viewers: 11,
  },
  {
    id: '4',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 14.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
    stock: 12,
    timeLeft: '22h',
    viewers: 32,
  },
  {
    id: '5',
    name: 'White Tea Shampoo and Conditioner',
    brand: 'Westin Hotels',
    price: 22.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=400',
    stock: 5,
    timeLeft: '6h',
    viewers: 41,
  },
  {
    id: '6',
    name: 'The Ordinary Shampoo and Conditioner',
    brand: 'The Ordinary',
    price: 16.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400',
    stock: 20,
    timeLeft: '8h',
    viewers: 62,
  },
  {
    id: '7',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 13.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1571781418606-70265b9cce90?w=400',
    stock: 10,
    timeLeft: '9h',
    viewers: 50,
  },
  {
    id: '8',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 15.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400',
    stock: 18,
    timeLeft: '11h',
    viewers: 80,
  },
];

const HomePage: React.FC = () => {
  usePageTitle('Home');
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);

  const handleAddToCart = (productId: string) => {
    console.log('Add to cart:', productId);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className='min-h-screen' style={{ backgroundColor: '#FFFFFF' }}>
      {/* Hero Carousel */}
      <HomePageCarousel />

      {/* Live and Upcoming Streams */}
      <section className='py-12 container mx-auto px-4'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-6'>
          Live and Upcoming Streams
        </h2>

        <ExpandableSection
          initialCount={4}
          gridClassName='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          expandText='Show More Streams'
          collapseText='Show Less'
        >
          {liveStreams.map((stream) => (
            <LivestreamCard key={stream.id} {...stream} />
          ))}
        </ExpandableSection>
      </section>

      {/* Streams and Products by Category */}
      <section className='py-12' style={{ backgroundColor: '#FFFFFF' }}>
        <div className='container mx-auto px-4'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-8'>
            Streams and Products by Category
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12'>
            {categories.map((category) => (
              <CategoryCard key={category.id} {...category} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className='py-12' style={{ backgroundColor: '#FFFFFF' }}>
        <div className='container mx-auto px-4'>
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>
            Popular Products
          </h2>

          <ExpandableSection
            initialCount={6}
            gridClassName='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
            expandText='Show More Products'
            collapseText='Show Less'
          >
            {popularProducts.map((product) => (
              <div key={product.id} className='relative'>
                {product.isHot && (
                  <div className='absolute -top-2 -right-2 z-10 px-2 py-1 bg-orange-500 text-white text-xs rounded-full'>
                    HOT!
                  </div>
                )}
                <ProductCard
                  variant='compact'
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    currency: product.currency,
                    image: product.image,
                    description: product.brand,
                    stock: product.stock,
                  }}
                  onAddToCart={handleAddToCart}
                  onQuickView={() => navigate(`/product/${product.id}`)}
                  isInWishlist={wishlistItems.includes(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              </div>
            ))}
          </ExpandableSection>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
