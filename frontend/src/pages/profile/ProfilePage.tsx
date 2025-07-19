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
  Clock
} from 'lucide-react';
import Layout from '@/components/layouts/Layout';

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

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    streamAlerts: true,
    orderUpdates: true,
    promotions: false
  });

  // Mock user data
  const user = {
    id: 1,
    name: "Alex Johnson",
    username: "@alexj",
    email: "alex.johnson@example.com",
    phone: "+1 (555) 123-4567",
    avatar: "/placeholder-avatar.jpg",
    joinDate: "January 2023",
    bio: "Tech enthusiast and live shopping addict. Always looking for the latest gadgets and deals!",
    isStreamer: true,
    stats: {
      orders: 42,
      wishlist: 18,
      following: 156,
      reviews: 23,
      streams: 12,
      viewers: 3420,
      earnings: 1234.56
    }
  };

  const recentOrders: Order[] = [
    {
      id: 1,
      orderNumber: "ORD-2024-001",
      date: "2 days ago",
      status: "delivered",
      total: 299.99,
      items: 1
    },
    {
      id: 2,
      orderNumber: "ORD-2024-002",
      date: "1 week ago",
      status: "shipped",
      total: 149.99,
      items: 2
    },
    {
      id: 3,
      orderNumber: "ORD-2024-003",
      date: "2 weeks ago",
      status: "processing",
      total: 89.99,
      items: 1
    }
  ];

  const addresses: Address[] = [
    {
      id: 1,
      type: "Home",
      name: "Alex Johnson",
      street: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      phone: "+1 (555) 123-4567",
      isDefault: true
    },
    {
      id: 2,
      type: "Work",
      name: "Alex Johnson",
      street: "456 Business Ave",
      city: "San Francisco",
      state: "CA",
      zip: "94107",
      phone: "+1 (555) 987-6543",
      isDefault: false
    }
  ];

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

  const handleSaveProfile = () => {
    setIsEditing(false);
    console.log('Saving profile...');
  };

  const handleLogout = () => {
    console.log('Logging out...');
    navigate('/');
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <img 
                src={user.avatar} 
                alt={user.name}
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
                  <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
                  <p className="text-gray-400 mb-2">{user.username}</p>
                  <p className="text-gray-300 mb-4">{user.bio}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {user.joinDate}
                    </span>
                    {user.isStreamer && (
                      <span className="flex items-center gap-1 text-primary-500">
                        <Video className="w-4 h-4" />
                        Verified Streamer
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-6 pt-6 border-t border-gray-800">
            <div className="text-center">
              <p className="text-2xl font-bold">{user.stats.orders}</p>
              <p className="text-sm text-gray-400">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{user.stats.wishlist}</p>
              <p className="text-sm text-gray-400">Wishlist</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{user.stats.following}</p>
              <p className="text-sm text-gray-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{user.stats.reviews}</p>
              <p className="text-sm text-gray-400">Reviews</p>
            </div>
            {user.isStreamer && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold">{user.stats.streams}</p>
                  <p className="text-sm text-gray-400">Streams</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{user.stats.viewers.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">${user.stats.earnings}</p>
                  <p className="text-sm text-gray-400">Earnings</p>
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
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name</label>
                        <input 
                          type="text" 
                          defaultValue={user.name}
                          className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input 
                          type="text" 
                          defaultValue={user.username}
                          className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input 
                          type="email" 
                          defaultValue={user.email}
                          className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <input 
                          type="tel" 
                          defaultValue={user.phone}
                          className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Bio</label>
                      <textarea 
                        defaultValue={user.bio}
                        rows={3}
                        className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleSaveProfile}
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="bg-gray-900 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span>{user.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-900 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600/20 p-3 rounded-lg">
                        <ShoppingBag className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order Delivered</p>
                        <p className="text-sm text-gray-400">Premium Wireless Headphones</p>
                      </div>
                      <span className="text-sm text-gray-400">2 days ago</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-600/20 p-3 rounded-lg">
                        <Star className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Review Posted</p>
                        <p className="text-sm text-gray-400">5-star review for Gaming Mouse</p>
                      </div>
                      <span className="text-sm text-gray-400">5 days ago</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-red-600/20 p-3 rounded-lg">
                        <Heart className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Added to Wishlist</p>
                        <p className="text-sm text-gray-400">4K Webcam Pro</p>
                      </div>
                      <span className="text-sm text-gray-400">1 week ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Order History</h2>
                  <button className="text-primary-500 hover:text-primary-400">
                    View All Orders
                  </button>
                </div>

                {recentOrders.map((order) => (
                  <div key={order.id} className="bg-gray-900 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-medium mb-1">{order.orderNumber}</p>
                        <p className="text-sm text-gray-400">{order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${order.total}</p>
                        <p className="text-sm text-gray-400">{order.items} item(s)</p>
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
                ))}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">My Wishlist ({user.stats.wishlist} items)</h2>
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Your wishlist items will appear here</p>
                  <button 
                    onClick={() => navigate('/products')}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Browse Products
                  </button>
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Saved Addresses</h2>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                    Add New Address
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="bg-gray-900 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-medium mb-1">{address.type}</p>
                          {address.isDefault && (
                            <span className="bg-primary-600/20 text-primary-400 text-xs px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <button className="text-gray-400 hover:text-white">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p>{address.name}</p>
                        <p>{address.street}</p>
                        <p>{address.city}, {address.state} {address.zip}</p>
                        <p>{address.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Payment Methods</h2>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                    Add Payment Method
                  </button>
                </div>

                <div className="bg-gray-900 rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-400">Expires 12/25</p>
                    </div>
                    <button className="text-gray-400 hover:text-white">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>

                <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-400">
                          {key === 'streamAlerts' && 'Get notified when your favorite streamers go live'}
                          {key === 'orderUpdates' && 'Receive updates about your order status'}
                          {key === 'promotions' && 'Special offers and discount codes'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [key]: !value })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          value ? 'bg-primary-600' : 'bg-gray-700'
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
                <h2 className="text-xl font-bold mb-6">Security Settings</h2>

                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-gray-400">Last changed 3 months ago</p>
                      </div>
                      <button className="text-primary-500 hover:text-primary-400">
                        Change Password
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-400">Add an extra layer of security</p>
                      </div>
                      <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                        Enable
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-6">
                    <p className="font-medium mb-4">Active Sessions</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm">Chrome on MacOS</p>
                            <p className="text-xs text-gray-400">San Francisco, CA • Now</p>
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
                <h2 className="text-xl font-bold mb-6">Help & Support</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-800 transition-colors">
                    <FileText className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1">FAQ</p>
                    <p className="text-sm text-gray-400">Find answers to common questions</p>
                  </button>

                  <button className="bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-800 transition-colors">
                    <MessageSquare className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1">Contact Support</p>
                    <p className="text-sm text-gray-400">Get help from our support team</p>
                  </button>

                  <button className="bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-800 transition-colors">
                    <Download className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1">Download Data</p>
                    <p className="text-sm text-gray-400">Export your account data</p>
                  </button>

                  <button className="bg-gray-900 rounded-xl p-6 text-left hover:bg-gray-800 transition-colors">
                    <Shield className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="font-medium mb-1">Privacy Policy</p>
                    <p className="text-sm text-gray-400">Learn how we protect your data</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;