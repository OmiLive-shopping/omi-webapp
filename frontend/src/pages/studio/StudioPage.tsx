import React, { useState } from 'react';
import usePageTitle from '@/hooks/usePageTitle';
import { StreamerStudio } from '@/components/stream/StreamerStudio';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  Eye, 
  Heart, 
  MessageSquare, 
  Package, 
  Settings,
  TrendingUp,
  Users,
  Video,
  Clock,
  AlertCircle,
  ChevronRight,
  Play
} from 'lucide-react';
import clsx from 'clsx';

interface StreamStats {
  totalViews: number;
  totalFollowers: number;
  totalRevenue: number;
  totalStreams: number;
  avgViewers: number;
  totalProducts: number;
}

interface RecentStream {
  id: string;
  title: string;
  date: Date;
  duration: number;
  viewers: number;
  revenue: number;
  thumbnail: string;
}

interface ScheduledStream {
  id: string;
  title: string;
  scheduledDate: Date;
  products: number;
  description: string;
}

const StudioPage: React.FC = () => {
  usePageTitle('Creator Studio');
  const navigate = useNavigate();
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stream' | 'analytics' | 'products'>('stream');
  
  // Generate a unique stream key (in production this would come from the backend)
  const streamKey = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Mock data - replace with real API calls
  const stats: StreamStats = {
    totalViews: 125432,
    totalFollowers: 8912,
    totalRevenue: 15678.50,
    totalStreams: 47,
    avgViewers: 1243,
    totalProducts: 89
  };

  const recentStreams: RecentStream[] = [
    {
      id: '1',
      title: 'Spring Hair Care Essentials',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      duration: 125,
      viewers: 1854,
      revenue: 432.50,
      thumbnail: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400'
    },
    {
      id: '2',
      title: 'Natural Skincare Routine',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      duration: 98,
      viewers: 1432,
      revenue: 287.80,
      thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400'
    },
    {
      id: '3',
      title: 'Home Decor Haul',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      duration: 87,
      viewers: 967,
      revenue: 189.90,
      thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'
    }
  ];

  const scheduledStreams: ScheduledStream[] = [
    {
      id: '1',
      title: 'Summer Beauty Must-Haves',
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      products: 12,
      description: 'Discover the best beauty products for summer 2025'
    },
    {
      id: '2',
      title: 'Eco-Friendly Living Tips',
      scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      products: 8,
      description: 'Sustainable products for everyday living'
    }
  ];

  const handleStreamStart = () => {
    setIsStreaming(true);
    console.log('Stream started with key:', streamKey);
  };

  const handleStreamEnd = () => {
    setIsStreaming(false);
    console.log('Stream ended');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(date.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (date > now) {
      return `In ${diffDays} days`;
    } else {
      return `${diffDays} days ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Simplified Header with Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* Tabs */}
          <div className="flex gap-6">
            {[
              { id: 'stream', label: 'Go Live', icon: Video },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'products', label: 'Products', icon: Package }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "flex items-center gap-2 px-1 py-2 border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - no padding for stream tab */}
      <div className={activeTab === 'stream' ? '' : 'max-w-7xl mx-auto px-4 py-6'}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, change: '+12%' },
                { label: 'Followers', value: stats.totalFollowers.toLocaleString(), icon: Heart, change: '+8%' },
                { label: 'Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, change: '+15%' },
                { label: 'Avg. Viewers', value: stats.avgViewers.toLocaleString(), icon: Users, change: '+5%' }
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Streams */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Streams</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentStreams.map((stream) => (
                  <div key={stream.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <img
                        src={stream.thumbnail}
                        alt={stream.title}
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{stream.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>{formatDate(stream.date)}</span>
                          <span>{formatDuration(stream.duration)}</span>
                          <span>{stream.viewers.toLocaleString()} viewers</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${stream.revenue.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 text-center">
                <Link
                  to="/studio/streams"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All Streams →
                </Link>
              </div>
            </div>

            {/* Scheduled Streams */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Streams</h2>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Schedule New
                </button>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {scheduledStreams.map((stream) => (
                  <div key={stream.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{stream.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {stream.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {stream.scheduledDate.toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {stream.products} products
                          </span>
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/30 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/studio/products"
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Package className="w-8 h-8 text-primary-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Manage Products</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {stats.totalProducts} products
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>

              <Link
                to="/studio/audience"
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Users className="w-8 h-8 text-primary-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Audience Insights</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      View demographics
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>

              <Link
                to="/studio/settings"
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Settings className="w-8 h-8 text-primary-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Studio Settings</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Configure studio
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'stream' && (
          <div className="h-[calc(100vh-60px)]">
            {/* Main Studio Component - full height */}
            <StreamerStudio
              onStreamStart={handleStreamStart}
              onStreamEnd={handleStreamEnd}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Analytics</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed analytics coming soon. Track your stream performance, audience engagement, and revenue metrics.
            </p>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Products</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage products to feature in your streams. Add, edit, and organize your product catalog.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioPage;