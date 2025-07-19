import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Play, 
  Share2, 
  TrendingUp,
  Shield,
  Truck,
  Package,
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from 'lucide-react';
import Layout from '@/components/layouts/Layout';

interface Review {
  id: number;
  user: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [activeTab, setActiveTab] = useState('description');

  // Mock data - would come from API
  const product = {
    id: Number(id),
    title: "Premium Wireless Headphones",
    brand: "AudioTech Pro",
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.5,
    reviews: 342,
    sold: 1234,
    inStock: true,
    description: "Experience crystal-clear audio with our premium wireless headphones. Featuring active noise cancellation, 30-hour battery life, and premium comfort for all-day wear.",
    features: [
      "Active Noise Cancellation",
      "30-hour battery life",
      "Premium leather cushions",
      "Bluetooth 5.0",
      "Voice assistant support",
      "Foldable design"
    ],
    specifications: {
      "Battery Life": "30 hours",
      "Charging Time": "2 hours",
      "Bluetooth Version": "5.0",
      "Weight": "250g",
      "Driver Size": "40mm",
      "Frequency Response": "20Hz - 20kHz"
    },
    images: [
      { id: 1, url: "/placeholder-product-1.jpg", alt: "Front view" },
      { id: 2, url: "/placeholder-product-2.jpg", alt: "Side view" },
      { id: 3, url: "/placeholder-product-3.jpg", alt: "Detail view" },
      { id: 4, url: "/placeholder-product-4.jpg", alt: "In use" }
    ],
    sizes: ["One Size"],
    colors: ["Black", "Silver", "Rose Gold"],
    streamer: {
      id: 1,
      name: "TechReviewer",
      avatar: "/placeholder-avatar.jpg",
      isLive: true,
      viewers: 1234
    }
  };

  const reviews: Review[] = [
    {
      id: 1,
      user: "John D.",
      avatar: "/placeholder-avatar-1.jpg",
      rating: 5,
      date: "2 days ago",
      comment: "Amazing sound quality! The noise cancellation is top-notch.",
      helpful: 23
    },
    {
      id: 2,
      user: "Sarah M.",
      avatar: "/placeholder-avatar-2.jpg",
      rating: 4,
      date: "1 week ago",
      comment: "Great headphones, but I wish the battery lasted a bit longer.",
      helpful: 15
    }
  ];

  const relatedProducts = [
    {
      id: 2,
      title: "Wireless Earbuds Pro",
      price: 199.99,
      image: "/placeholder-product.jpg",
      rating: 4.3,
      reviews: 256
    },
    {
      id: 3,
      title: "Studio Monitor Headphones",
      price: 349.99,
      image: "/placeholder-product.jpg",
      rating: 4.7,
      reviews: 189
    },
    {
      id: 4,
      title: "Gaming Headset RGB",
      price: 149.99,
      image: "/placeholder-product.jpg",
      rating: 4.4,
      reviews: 567
    },
    {
      id: 5,
      title: "Bluetooth Speaker Ultra",
      price: 129.99,
      image: "/placeholder-product.jpg",
      rating: 4.6,
      reviews: 421
    }
  ];

  const handleAddToCart = () => {
    console.log('Adding to cart:', { productId: product.id, quantity, color: selectedColor });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8 text-sm">
          <a href="/" className="text-gray-400 hover:text-white">Home</a>
          <span className="mx-2 text-gray-400">/</span>
          <a href="/products" className="text-gray-400 hover:text-white">Products</a>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-white">{product.title}</span>
        </nav>

        {/* Product Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative bg-gray-800 rounded-xl overflow-hidden">
              <img 
                src={product.images[selectedImage].url} 
                alt={product.images[selectedImage].alt}
                className="w-full h-[500px] object-cover"
              />
              
              {/* Image Navigation */}
              <button 
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Zoom Icon */}
              <button className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-black/70">
                <ZoomIn className="w-5 h-5" />
              </button>

              {/* Live Indicator */}
              {product.streamer.isLive && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">LIVE</span>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="flex gap-4">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`relative rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-primary-500' : 'border-gray-700'
                  }`}
                >
                  <img 
                    src={image.url} 
                    alt={image.alt}
                    className="w-20 h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Brand */}
            <div>
              <p className="text-gray-400 mb-2">{product.brand}</p>
              <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
              
              {/* Rating and Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-gray-400">({product.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>{product.sold} sold</span>
                </div>
              </div>
            </div>

            {/* Live Stream Info */}
            {product.streamer.isLive && (
              <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={product.streamer.avatar} 
                    alt={product.streamer.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{product.streamer.name} is live</p>
                    <p className="text-sm text-gray-400">{product.streamer.viewers} watching</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/stream/${product.streamer.id}`)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Watch Live
                </button>
              </div>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">${product.price}</span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">${product.originalPrice}</span>
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-green-400 text-sm">✓ In Stock</p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {/* Color Selection */}
              <div>
                <p className="font-medium mb-2">Color</p>
                <div className="flex gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg border ${
                        selectedColor === color 
                          ? 'border-primary-500 bg-primary-500/20' 
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <p className="font-medium mb-2">Quantity</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-700 rounded-lg">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-gray-800"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 min-w-[50px] text-center">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 hover:bg-gray-800"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-gray-400">Available: 50+ pieces</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button 
                onClick={handleBuyNow}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-medium"
              >
                Buy Now
              </button>
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button 
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`p-3 rounded-lg border ${
                  isWishlisted ? 'bg-red-600 border-red-600' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>
              <button className="p-3 rounded-lg border border-gray-700 hover:border-gray-600">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="font-medium">Free Shipping</p>
                  <p className="text-sm text-gray-400">On orders over $50</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="font-medium">2 Year Warranty</p>
                  <p className="text-sm text-gray-400">Extended protection</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="font-medium">Easy Returns</p>
                  <p className="text-sm text-gray-400">30-day return policy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="font-medium">24/7 Support</p>
                  <p className="text-sm text-gray-400">Dedicated help</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="bg-gray-900 rounded-xl p-6 mb-12">
          <div className="flex gap-8 border-b border-gray-800 mb-6">
            {['description', 'specifications', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 capitalize font-medium ${
                  activeTab === tab 
                    ? 'text-primary-500 border-b-2 border-primary-500' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'description' && (
            <div className="space-y-4">
              <p className="text-gray-300">{product.description}</p>
              <div>
                <h3 className="font-semibold mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary-500 mt-1">•</span>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">{key}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{product.rating}</p>
                    <div className="flex my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-400">{product.reviews} reviews</p>
                  </div>
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-sm w-2">{stars}</span>
                        <Star className="w-3 h-3 text-yellow-400" />
                        <div className="w-32 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${stars === 5 ? 60 : stars === 4 ? 30 : 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                  Write a Review
                </button>
              </div>

              {/* Review List */}
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-800 pb-4">
                    <div className="flex items-start gap-4">
                      <img 
                        src={review.avatar} 
                        alt={review.user}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{review.user}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-400">{review.date}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-300 mb-2">{review.comment}</p>
                        <button className="text-sm text-gray-400 hover:text-white">
                          Helpful ({review.helpful})
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <div 
                key={product.id}
                onClick={() => navigate(`/products/${product.id}`)}
                className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-transform"
              >
                <img 
                  src={product.image} 
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-medium mb-2 line-clamp-2">{product.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-400">({product.reviews})</span>
                  </div>
                  <p className="text-lg font-bold">${product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetailPage;