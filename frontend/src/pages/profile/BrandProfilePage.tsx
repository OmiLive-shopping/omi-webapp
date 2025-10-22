import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building,
  MapPin,
  Link as LinkIcon,
  Package,
  Star,
  Shield,
  Settings,
  ShoppingBag,
  Globe,
  Mail,
  Phone
} from 'lucide-react';
import { useAuthState } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import clsx from 'clsx';

interface BrandProfile {
  id: string;
  companyName: string;
  companyDescription: string | null;
  websiteUrl: string | null;
  businessEmail: string;
  businessPhone: string | null;
  verified: boolean;
  approvalStatus: string;
  slug: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  location: string | null;
  socialLinks: any;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    _count: {
      followers: number;
    };
  };
  products: any[];
  _count: {
    products: number;
  };
}

const BrandProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthState();
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user owns this brand
  const isOwner = currentUser && profile?.user?.id === currentUser.id;

  useEffect(() => {
    if (slug) {
      fetchBrandProfile();
    }
  }, [slug]);

  const fetchBrandProfile = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get<{ success: boolean; data: BrandProfile; message?: string }>(
        `/profiles/brands/${slug}`
      );

      if (result.success) {
        setProfile(result.data);
      } else {
        setError(result.message || 'Brand not found');
      }
    } catch (err) {
      setError('Failed to load brand profile');
      console.error('Error fetching brand profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Brand not found'}
          </h2>
          <Link to="/products" className="text-red-500 hover:text-red-600">
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  const socialPlatforms = profile.socialLinks ? Object.entries(profile.socialLinks) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-r from-red-500 to-pink-500">
        {profile.coverImageUrl ? (
          <img
            src={profile.coverImageUrl}
            alt={`${profile.companyName} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-500 to-pink-500" />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-30" />
      </div>

      {/* Brand Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {profile.logoUrl ? (
                  <img
                    className="h-24 w-24 rounded-lg shadow-lg"
                    src={profile.logoUrl}
                    alt={profile.companyName}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center shadow-lg">
                    <Building className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
              </div>

              {/* Brand Details */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.companyName}
                      </h1>
                      {profile.verified && (
                        <div className="flex items-center text-blue-500">
                          <Shield className="h-5 w-5" />
                          <span className="text-sm ml-1">Verified</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      @{profile.user.username}
                    </p>
                  </div>

                  {isOwner && (
                    <Link
                      to="/brand"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Brand
                    </Link>
                  )}
                </div>

                {profile.companyDescription && (
                  <p className="mt-3 text-gray-600 dark:text-gray-400">
                    {profile.companyDescription}
                  </p>
                )}

                {/* Meta Info */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {profile.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile.location}
                    </div>
                  )}

                  {profile.websiteUrl && (
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Website
                    </a>
                  )}

                  {profile.businessEmail && (
                    <a
                      href={`mailto:${profile.businessEmail}`}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Contact
                    </a>
                  )}

                  {profile.businessPhone && (
                    <a
                      href={`tel:${profile.businessPhone}`}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      {profile.businessPhone}
                    </a>
                  )}
                </div>

                {/* Social Links */}
                {socialPlatforms.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {socialPlatforms.map(([platform, url]) => (
                      url && (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          {platform}
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile._count.products}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.user._count.followers}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.products.filter((p: any) => p.rating >= 4).length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Top Rated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mt-8 pb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Products ({profile.products.length})
          </h2>

          {profile.products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profile.products.map((product: any) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {product.imageUrl || product.images?.[0] ? (
                    <img
                      src={product.imageUrl || product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-red-500">
                          ${product.price}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-gray-400 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>

                      {product.rating > 0 && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1">{product.rating.toFixed(1)}</span>
                          {product.reviewCount > 0 && (
                            <span className="ml-1">({product.reviewCount})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {product.inStock === false && (
                      <div className="mt-2 text-xs text-red-500">Out of Stock</div>
                    )}

                    {product.tags && product.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No products available yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandProfilePage;