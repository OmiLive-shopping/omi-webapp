import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, Link as LinkIcon, Calendar, Video, Heart, Settings } from 'lucide-react';
import { useAuthState } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';

interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  socialLinks: any;
  publicProfile: boolean;
  createdAt: string;
  role: string;
  verified?: boolean;
  _count?: {
    followers: number;
    following: number;
    streams: number;
  };
  streams?: any[];
  wishlist?: any[];
  isFollowing?: boolean;
}

const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated } = useAuthState();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get<{ success: boolean; data: UserProfile; message?: string }>(
        `/profiles/users/${username}`
      );

      if (result.success) {
        setProfile(result.data);
      } else {
        setError(result.message || 'Profile not found');
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error fetching profile:', err);
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Profile not found'}
          </h2>
          <Link to="/" className="text-red-500 hover:text-red-600">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const socialPlatforms = profile.socialLinks ? Object.entries(profile.socialLinks) : [];
  const displayName = profile.name || profile.username;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatarUrl ? (
                  <img
                    className="h-24 w-24 rounded-full"
                    src={profile.avatarUrl}
                    alt={displayName}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {displayName}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>
                  </div>

                  {isAuthenticated && (
                    <>
                      {isOwnProfile ? (
                        <Link
                          to="/profile"
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Link>
                      ) : (
                        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                          {profile.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {profile.bio && (
                  <p className="mt-3 text-gray-600 dark:text-gray-400">
                    {profile.bio}
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

                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>

                  {profile.role === 'streamer' && (
                    <div className="flex items-center text-red-500">
                      <Video className="h-4 w-4 mr-1" />
                      Verified Streamer
                    </div>
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
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-md">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile._count?.followers || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile._count?.following || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile._count?.streams || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Streams</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Private Profile Message */}
        {!profile.publicProfile ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">This profile is private</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Only followers can see this user's content
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Streams Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Streams</h2>
              {profile.streams && profile.streams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.streams.map((stream: any) => (
                    <div key={stream.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{stream.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stream.description}</p>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {stream.viewerCount} viewers • {new Date(stream.startedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No streams yet</p>
                </div>
              )}
            </div>

            {/* Wishlist Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wishlist</h2>
              {profile.wishlist && profile.wishlist.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {profile.wishlist.map((product: any) => (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
                    >
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                      <p className="text-red-500 font-bold">${product.price}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No items in wishlist</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;