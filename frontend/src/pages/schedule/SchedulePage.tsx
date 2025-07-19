import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  Clock,
  Bell,
  BellOff,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Users,
  Tag,
  Share2,
  Heart
} from 'lucide-react';
import Layout from '@/components/layouts/Layout';

interface ScheduledStream {
  id: number;
  title: string;
  streamer: {
    id: number;
    name: string;
    avatar: string;
    followers: number;
    isVerified: boolean;
  };
  scheduledTime: Date;
  duration: string;
  category: string;
  tags: string[];
  description: string;
  thumbnail: string;
  expectedViewers: number;
  isReminded: boolean;
  products: number;
}

const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [remindedStreams, setRemindedStreams] = useState<number[]>([1, 3]);

  // Mock scheduled streams data
  const scheduledStreams: ScheduledStream[] = [
    {
      id: 1,
      title: "Tech Tuesday: Latest Gadget Reviews",
      streamer: {
        id: 1,
        name: "TechReviewer",
        avatar: "/placeholder-avatar.jpg",
        followers: 125000,
        isVerified: true
      },
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      duration: "2 hours",
      category: "Technology",
      tags: ["gadgets", "reviews", "tech"],
      description: "Join me for in-depth reviews of the latest tech gadgets including smartphones, laptops, and smart home devices!",
      thumbnail: "/placeholder-stream.jpg",
      expectedViewers: 5000,
      isReminded: true,
      products: 12
    },
    {
      id: 2,
      title: "Fashion Forward: Spring Collection Launch",
      streamer: {
        id: 2,
        name: "StyleGuru",
        avatar: "/placeholder-avatar.jpg",
        followers: 89000,
        isVerified: true
      },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: "1.5 hours",
      category: "Fashion",
      tags: ["fashion", "spring", "newcollection"],
      description: "Exclusive first look at our new spring collection with special discounts for viewers!",
      thumbnail: "/placeholder-stream.jpg",
      expectedViewers: 3000,
      isReminded: false,
      products: 25
    },
    {
      id: 3,
      title: "Home Cooking Masterclass",
      streamer: {
        id: 3,
        name: "ChefMaster",
        avatar: "/placeholder-avatar.jpg",
        followers: 67000,
        isVerified: false
      },
      scheduledTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
      duration: "1 hour",
      category: "Lifestyle",
      tags: ["cooking", "recipes", "kitchen"],
      description: "Learn to cook restaurant-quality meals at home with professional chef tips and tricks!",
      thumbnail: "/placeholder-stream.jpg",
      expectedViewers: 2000,
      isReminded: true,
      products: 8
    }
  ];

  const categories = ['all', 'Technology', 'Fashion', 'Beauty', 'Lifestyle', 'Gaming', 'Sports'];

  const handleToggleReminder = (streamId: number) => {
    if (remindedStreams.includes(streamId)) {
      setRemindedStreams(remindedStreams.filter(id => id !== streamId));
    } else {
      setRemindedStreams([...remindedStreams, streamId]);
    }
  };

  const getTimeUntilStream = (scheduledTime: Date) => {
    const now = new Date();
    const diff = scheduledTime.getTime() - now.getTime();
    
    if (diff < 0) return 'Starting soon';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    
    const minutes = Math.floor(diff / (1000 * 60));
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  const formatStreamTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatStreamDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Filter streams
  const filteredStreams = scheduledStreams
    .filter(stream => filterCategory === 'all' || stream.category === filterCategory)
    .filter(stream => 
      searchQuery === '' || 
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.streamer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Group streams by date
  const groupedStreams = filteredStreams.reduce((groups: { [key: string]: ScheduledStream[] }, stream) => {
    const dateKey = formatStreamDate(stream.scheduledTime);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(stream);
    return groups;
  }, {});

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Live Stream Schedule</h1>
          <p className="text-gray-400">Discover upcoming live shopping streams from your favorite creators</p>
        </div>

        {/* Controls Bar */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search streams, creators, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    view === v ? 'bg-primary-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                <Filter className="w-4 h-4" />
                <span>{filterCategory === 'all' ? 'All Categories' : filterCategory}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-10">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setFilterCategory(category);
                        setShowFilters(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-gray-900 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <button className="p-2 hover:bg-gray-800 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <span className="font-medium">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <button className="p-2 hover:bg-gray-800 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scheduled Streams */}
        {Object.keys(groupedStreams).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedStreams).map(([date, streams]) => (
              <div key={date}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>{date}</span>
                  <span className="text-sm text-gray-400">({streams.length} streams)</span>
                </h2>
                
                <div className="space-y-4">
                  {streams.map((stream) => (
                    <div key={stream.id} className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors">
                      <div className="flex flex-col lg:flex-row">
                        {/* Thumbnail */}
                        <div className="relative lg:w-64">
                          <img 
                            src={stream.thumbnail} 
                            alt={stream.title}
                            className="w-full h-48 lg:h-full object-cover cursor-pointer"
                            onClick={() => navigate(`/schedule/${stream.id}`)}
                          />
                          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{formatStreamTime(stream.scheduledTime)}</span>
                          </div>
                          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                            {stream.duration}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 
                                className="text-lg font-semibold mb-2 cursor-pointer hover:text-primary-400"
                                onClick={() => navigate(`/schedule/${stream.id}`)}
                              >
                                {stream.title}
                              </h3>
                              
                              {/* Streamer Info */}
                              <div className="flex items-center gap-3 mb-3">
                                <img 
                                  src={stream.streamer.avatar} 
                                  alt={stream.streamer.name}
                                  className="w-8 h-8 rounded-full"
                                />
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{stream.streamer.name}</span>
                                  {stream.streamer.isVerified && (
                                    <span className="bg-primary-600 w-4 h-4 rounded-full flex items-center justify-center">
                                      <Star className="w-2.5 h-2.5 fill-white" />
                                    </span>
                                  )}
                                  <span className="text-sm text-gray-400">
                                    {stream.streamer.followers.toLocaleString()} followers
                                  </span>
                                </div>
                              </div>

                              <p className="text-gray-300 mb-3 line-clamp-2">{stream.description}</p>

                              {/* Tags and Stats */}
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex gap-2">
                                  {stream.tags.map((tag) => (
                                    <span key={tag} className="bg-gray-800 px-2 py-1 rounded text-sm">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {stream.expectedViewers.toLocaleString()} expected
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Tag className="w-4 h-4" />
                                    {stream.products} products
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Time Badge */}
                            <div className="text-right">
                              <span className="bg-primary-600/20 text-primary-400 px-3 py-1 rounded-lg text-sm">
                                {getTimeUntilStream(stream.scheduledTime)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                            <button 
                              onClick={() => handleToggleReminder(stream.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                                remindedStreams.includes(stream.id)
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-800 hover:bg-gray-700'
                              }`}
                            >
                              {remindedStreams.includes(stream.id) ? (
                                <>
                                  <Bell className="w-4 h-4" />
                                  Reminder Set
                                </>
                              ) : (
                                <>
                                  <BellOff className="w-4 h-4" />
                                  Set Reminder
                                </>
                              )}
                            </button>
                            
                            <button className="p-2 hover:bg-gray-800 rounded-lg">
                              <Share2 className="w-5 h-5" />
                            </button>
                            
                            <button className="p-2 hover:bg-gray-800 rounded-lg">
                              <Heart className="w-5 h-5" />
                            </button>

                            <button 
                              onClick={() => navigate(`/streamers/${stream.streamer.id}`)}
                              className="ml-auto text-sm text-primary-400 hover:text-primary-300"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No scheduled streams found</h2>
            <p className="text-gray-400 mb-6">Check back later or adjust your filters</p>
            <button 
              onClick={() => navigate('/live')}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Watch Live Streams
            </button>
          </div>
        )}

        {/* Upcoming This Week */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Popular This Week</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src="/placeholder-avatar.jpg" 
                    alt="Streamer"
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium">PopularStreamer{i}</p>
                    <p className="text-sm text-gray-400">50K followers</p>
                  </div>
                </div>
                <p className="text-sm mb-3">Weekly Tech Talk Episode #{i}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Every Wednesday</span>
                  <span className="text-primary-400">7:00 PM EST</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SchedulePage;