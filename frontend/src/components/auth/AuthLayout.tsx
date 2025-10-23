import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Video, TrendingUp, Star } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const features = [
    { icon: Video, text: "Watch live shopping streams" },
    { icon: ShoppingBag, text: "Exclusive deals and discounts" },
    { icon: TrendingUp, text: "Follow your favorite streamers" },
    { icon: Star, text: "Early access to new products" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-primary-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">OMI Live</span>
            </Link>
          </div>

          {/* Content slot */}
          {children}
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center px-8 text-white">
        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">
            Start your live shopping journey today
          </h2>
          <p className="text-xl mb-8 text-white/80">
            Join millions of users discovering amazing products through live streams
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <feature.icon className="w-5 h-5" />
                </div>
                <span className="text-lg">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-12">
            <div>
              <p className="text-3xl font-bold">2M+</p>
              <p className="text-white/80">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-white/80">Streamers</p>
            </div>
            <div>
              <p className="text-3xl font-bold">500K+</p>
              <p className="text-white/80">Products</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
