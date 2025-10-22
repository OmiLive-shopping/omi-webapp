import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Edit3, 
  Shield, 
  CreditCard, 
  Package, 
  Heart, 
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  ShoppingBag,
  Video,
  MessageSquare,
  Bell,
  Globe,
  HelpCircle,
  FileText,
  Download,
  Check,
  Clock,
  Loader,
  Key,
  Copy
} from 'lucide-react';
// Layout is already provided by the router, no need to import it
import { useProfile, UpdateProfileData } from '@/hooks/useProfile';
import { signOutUser } from '@/lib/auth-client';
import clsx from 'clsx';

interface Order {
  id: number;
  orderNumber: string;
  date: string;
  status: 'delivered' | 'shipped' | 'processing' | 'cancelled';
  total: number;
  items: number;
}

interface Address {
  id: number;
  type: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  isDefault: boolean;
}
// TODO: these have to be real
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading, error, updateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedStreamKey, setCopiedStreamKey] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    streamAlerts: true,
    orderUpdates: true,
    promotions: false
  });

  // Form state for editing
  const [formData, setFormData] = useState<UpdateProfileData>({
    name: '',
    bio: '',
    location: '',
    socialLinks: {},
    publicProfile: true,
    avatarUrl: ''
  });

  // Initialize form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        bio: profile.bio || '',
        location: profile.location || '',
        socialLinks: profile.socialLinks || {},
        publicProfile: profile.publicProfile ?? true,
        avatarUrl: profile.avatarUrl || ''
      });
    }
  }, [profile]);

  // Mock data for orders (replace with real API later)
  const recentOrders: Order[] = [];

  const addresses: Address[] = [];

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const result = await updateProfile(formData);
    
    if (result.success) {
      setIsEditing(false);
    } else {
      // TODO: Show error toast
      console.error('Failed to update profile:', result.error);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
  };

  const copyStreamKey = async () => {
    if (profile?.streamKey) {
      try {
        await navigator.clipboard.writeText(profile.streamKey);
        setCopiedStreamKey(true);
        setTimeout(() => setCopiedStreamKey(false), 2000);
      } catch (err) {
        console.error('Failed to copy stream key:', err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-400';
      case 'shipped': return 'text-blue-400';
      case 'processing': return 'text-yellow-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <Check className="w-4 h-4" />;
      case 'shipped': return <Package className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error || 'Failed to load profile'}</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  const displayName = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.username;
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <img 
                src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`} 
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover"
              />
              <button className="absolute bottom-0 right-0 bg-primary-600 p-2 rounded-full hover:bg-primary-700">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{displayName}</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{profile.bio || 'No bio yet'}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {memberSince}
                    </span>
                    {profile.role === 'streamer' && (
                      <span className="flex items-center gap-1 text-primary-500">
                        <Video className="w-4 h-4" />
                        Verified Streamer
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Wishlist</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile._count?.following || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile._count?.followers || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
            </div>
            {profile.role === 'streamer' && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile._count?.streams || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Streams</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id 
                      ? 'bg-primary-600 text-white' 
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-900"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Edit Profile Form */}
                {isEditing && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 space-y-4 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Display Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-300 dark:border-gray-700"
                          placeholder="Your display name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-300 dark:border-gray-700"
                          placeholder="City, Country"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Username</label>
                        <input
                          type="text"
                          value={profile.username}
                          disabled
                          className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 opacity-50 cursor-not-allowed border border-gray-300 dark:border-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 opacity-50 cursor-not-allowed border border-gray-300 dark:border-gray-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        rows={3}
                        className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-300 dark:border-gray-700"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    {/* Social Links */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Social Links</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['twitter', 'instagram', 'youtube', 'twitch', 'tiktok', 'website'].map((platform) => (
                          <div key={platform}>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 capitalize">{platform}</label>
                            <input
                              type="url"
                              value={formData.socialLinks?.[platform] || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                socialLinks: { ...formData.socialLinks, [platform]: e.target.value }
                              })}
                              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-300 dark:border-gray-700"
                              placeholder={`https://${platform}.com/...`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Public Profile Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Public Profile</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Allow others to view your profile</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, publicProfile: !formData.publicProfile })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.publicProfile ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            formData.publicProfile ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
                            bio: profile.bio || '',
                            location: profile.location || '',
                            socialLinks: profile.socialLinks || {},
                            publicProfile: profile.publicProfile ?? true,
                            avatarUrl: profile.avatarUrl || ''
                          });
                        }}
                        className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact Information & Social Links */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Contact Information</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{profile.email}</span>
                    </div>
                    {profile.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{profile.location}</span>
                      </div>
                    )}
                    {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Social Links</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(profile.socialLinks).map(([platform, url]) => (
                            url && (
                              <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                              >
                                <Globe className="w-3 h-3" />
                                {platform}
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Streamer Settings */}
                {profile.role === 'streamer' && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Streaming Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Stream Key</label>
                        <div className="flex items-center gap-2">
                          <input
                            type={showStreamKey ? 'text' : 'password'}
                            value={profile.streamKey || ''}
                            readOnly
                            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 font-mono text-sm border border-gray-300 dark:border-gray-700"
                          />
                          <button
                            onClick={() => setShowStreamKey(!showStreamKey)}
                            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700"
                            title={showStreamKey ? 'Hide' : 'Show'}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={copyStreamKey}
                            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700"
                            title="Copy"
                          >
                            {copiedStreamKey ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Keep this key secret. Use it to stream with OBS or other software.
                        </p>
                      </div>
                      <div className="pt-4">
                        <button
                          onClick={() => navigate('/studio')}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Go to Studio
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Activity</h2>
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order History</h2>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-lg">
                    <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No orders yet</p>
                    <button 
                      onClick={() => navigate('/products')}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="bg-gray-900 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-medium mb-1 text-gray-900 dark:text-white">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{order.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${order.total}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{order.items} item(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-sm text-gray-400 hover:text-white">
                            Track Order
                          </button>
                          <span className="text-gray-600">•</span>
                          <button className="text-sm text-gray-400 hover:text-white">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">My Wishlist</h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-lg">
                  <Heart className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Your wishlist is empty</p>
                  <button 
                    onClick={() => navigate('/products')}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Browse Products
                  </button>
                </div>
              </div>
            )}

            {/* Other tabs remain similar but with empty states */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saved Addresses</h2>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                    Add New Address
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-lg">
                  <MapPin className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No saved addresses</p>
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                    Add Payment Method
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-lg">
                  <CreditCard className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No payment methods saved</p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Notification Preferences</h2>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 space-y-4 shadow-lg">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize text-gray-900 dark:text-white">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {key === 'streamAlerts' && 'Get notified when your favorite streamers go live'}
                          {key === 'orderUpdates' && 'Receive updates about your order status'}
                          {key === 'promotions' && 'Special offers and discount codes'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [key]: !value })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          value ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Security Settings</h2>

                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Password</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manage your password through Better Auth</p>
                      </div>
                      <button className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 transition-colors">
                        Change Password
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
                      </div>
                      <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                        Enable
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                    <p className="font-medium mb-4 text-gray-900 dark:text-white">Active Sessions</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">Current Session</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Active now</p>
                          </div>
                        </div>
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                          Current
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help Tab */}
            {activeTab === 'help' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Help & Support</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="bg-white dark:bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-lg">
                    <FileText className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1 text-gray-900 dark:text-white">FAQ</p>
                    <p className="text-sm text-gray-400">Find answers to common questions</p>
                  </button>

                  <button className="bg-white dark:bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-lg">
                    <MessageSquare className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1 text-gray-900 dark:text-white">Contact Support</p>
                    <p className="text-sm text-gray-400">Get help from our support team</p>
                  </button>

                  <button className="bg-white dark:bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-lg">
                    <Download className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1 text-gray-900 dark:text-white">Download Data</p>
                    <p className="text-sm text-gray-400">Export your account data</p>
                  </button>

                  <button className="bg-white dark:bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-lg">
                    <Shield className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1 text-gray-900 dark:text-white">Privacy Policy</p>
                    <p className="text-sm text-gray-400">Learn how we protect your data</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default ProfilePage;