import React, { useState } from 'react';
import { 
  Navigation, 
  Sidebar, 
  Avatar, 
  Dropdown,
  Input,
  Badge,
  Button,
  Icon,
  Text,
  Logo,
  Tooltip,
  Divider
} from '@bolt/ui';
import { Link, useLocation } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'viewer' | 'streamer' | 'admin';
}

interface MainNavigationProps {
  user?: User | null;
  onLogout: () => void;
  onSearch: (query: string) => void;
  notificationCount?: number;
  cartItemCount?: number;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  user,
  onLogout,
  onSearch,
  notificationCount = 0,
  cartItemCount = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { path: '/', label: 'Home', icon: 'home' },
    { path: '/streams', label: 'Live Streams', icon: 'video' },
    { path: '/products', label: 'Products', icon: 'shopping-bag' },
    { path: '/categories', label: 'Categories', icon: 'grid' }
  ];

  return (
    <>
      <Navigation.Bar 
        sticky 
        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Icon name={isMobileMenuOpen ? 'x' : 'menu'} size="md" />
          </Button>

          {/* Logo */}
          <Navigation.Brand>
            <Link to="/" className="flex items-center gap-2">
              <Logo size="sm" />
              <Text weight="bold" size="lg" className="hidden sm:block">
                OMI Live
              </Text>
            </Link>
          </Navigation.Brand>

          {/* Desktop Navigation */}
          <Navigation.Menu className="hidden lg:flex">
            {navigationItems.map((item) => (
              <Navigation.Item 
                key={item.path}
                href={item.path}
                active={isActive(item.path)}
                className="flex items-center gap-2"
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
              </Navigation.Item>
            ))}
          </Navigation.Menu>
        </div>

        {/* Search Bar */}
        <Navigation.Search className="flex-1 max-w-xl mx-4">
          <form onSubmit={handleSearch} className="w-full">
            <Input
              type="search"
              placeholder="Search streams, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Icon name="search" size="sm" />}
              rightElement={
                searchQuery && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon name="x" size="xs" />
                  </Button>
                )
              }
            />
          </form>
        </Navigation.Search>

        {/* Right Actions */}
        <Navigation.Actions className="flex items-center gap-2">
          {/* Cart */}
          <Tooltip content="Shopping Cart">
            <Button
              as={Link}
              to="/cart"
              variant="ghost"
              size="sm"
              className="relative"
            >
              <Icon name="shopping-cart" size="md" />
              {cartItemCount > 0 && (
                <Badge 
                  variant="danger" 
                  size="xs" 
                  className="absolute -top-1 -right-1"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </Tooltip>

          {/* Notifications */}
          {user && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant="ghost" size="sm" className="relative">
                  <Icon name="bell" size="md" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="danger" 
                      size="xs" 
                      className="absolute -top-1 -right-1"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Menu align="end" className="w-80">
                <Dropdown.Header>
                  <Text weight="semibold">Notifications</Text>
                </Dropdown.Header>
                <Dropdown.Separator />
                <Dropdown.Item>
                  <div className="flex items-start gap-3">
                    <Icon name="video" size="sm" className="mt-0.5 text-primary-500" />
                    <div className="flex-1">
                      <Text size="sm">Your favorite streamer is live!</Text>
                      <Text size="xs" variant="muted">2 minutes ago</Text>
                    </div>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item>
                  <div className="flex items-start gap-3">
                    <Icon name="shopping-bag" size="sm" className="mt-0.5 text-green-500" />
                    <div className="flex-1">
                      <Text size="sm">Flash sale on featured products</Text>
                      <Text size="xs" variant="muted">1 hour ago</Text>
                    </div>
                  </div>
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item className="text-center">
                  <Link to="/notifications" className="text-primary-500">
                    View all notifications
                  </Link>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}

          {/* User Menu */}
          {user ? (
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar 
                    src={user.avatar} 
                    name={user.name} 
                    size="sm"
                  />
                  <Text className="hidden sm:block">{user.name}</Text>
                  <Icon name="chevron-down" size="xs" />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Menu align="end">
                <Dropdown.Item as={Link} to="/profile">
                  <Icon name="user" size="sm" className="mr-2" />
                  Profile
                </Dropdown.Item>
                {user.role === 'streamer' && (
                  <Dropdown.Item as={Link} to="/studio">
                    <Icon name="video" size="sm" className="mr-2" />
                    Creator Studio
                  </Dropdown.Item>
                )}
                <Dropdown.Item as={Link} to="/orders">
                  <Icon name="package" size="sm" className="mr-2" />
                  Orders
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/wishlist">
                  <Icon name="heart" size="sm" className="mr-2" />
                  Wishlist
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/settings">
                  <Icon name="settings" size="sm" className="mr-2" />
                  Settings
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item onClick={onLogout} className="text-red-600">
                  <Icon name="log-out" size="sm" className="mr-2" />
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div className="flex items-center gap-2">
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Login
              </Button>
              <Button as={Link} to="/register" variant="primary" size="sm">
                Sign Up
              </Button>
            </div>
          )}
        </Navigation.Actions>
      </Navigation.Bar>

      {/* Mobile Sidebar */}
      <Sidebar
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        side="left"
        className="lg:hidden"
      >
        <Sidebar.Header>
          <Logo size="sm" />
          <Text weight="bold" size="lg">OMI Live</Text>
        </Sidebar.Header>
        
        <Sidebar.Content>
          <Sidebar.Section>
            {navigationItems.map((item) => (
              <Sidebar.Item
                key={item.path}
                as={Link}
                to={item.path}
                active={isActive(item.path)}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon name={item.icon} size="sm" className="mr-3" />
                {item.label}
              </Sidebar.Item>
            ))}
          </Sidebar.Section>
          
          {user && (
            <>
              <Divider />
              <Sidebar.Section title="Account">
                <Sidebar.Item
                  as={Link}
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon name="user" size="sm" className="mr-3" />
                  Profile
                </Sidebar.Item>
                {user.role === 'streamer' && (
                  <Sidebar.Item
                    as={Link}
                    to="/studio"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon name="video" size="sm" className="mr-3" />
                    Creator Studio
                  </Sidebar.Item>
                )}
                <Sidebar.Item
                  as={Link}
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon name="package" size="sm" className="mr-3" />
                  Orders
                </Sidebar.Item>
                <Sidebar.Item
                  as={Link}
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon name="settings" size="sm" className="mr-3" />
                  Settings
                </Sidebar.Item>
              </Sidebar.Section>
            </>
          )}
        </Sidebar.Content>
        
        <Sidebar.Footer>
          {user ? (
            <Button 
              variant="ghost" 
              fullWidth 
              onClick={() => {
                onLogout();
                setIsMobileMenuOpen(false);
              }}
              className="text-red-600"
            >
              <Icon name="log-out" size="sm" className="mr-2" />
              Logout
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                as={Link} 
                to="/login" 
                variant="outline" 
                fullWidth
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Button>
              <Button 
                as={Link} 
                to="/register" 
                variant="primary" 
                fullWidth
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Button>
            </div>
          )}
        </Sidebar.Footer>
      </Sidebar>
    </>
  );
};