import React from 'react';
import { User, Store, Video, Shield } from 'lucide-react';

type UserRole = 'user' | 'brand' | 'streamer' | 'admin';

interface UserRoleBadgeProps {
  role: UserRole;
  className?: string;
}

const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role, className = '' }) => {
  const roleConfig = {
    user: {
      label: 'User',
      icon: User,
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconColor: 'text-gray-500 dark:text-gray-400',
    },
    brand: {
      label: 'Brand',
      icon: Store,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-700 dark:text-purple-300',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    streamer: {
      label: 'Streamer',
      icon: Video,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    admin: {
      label: 'Admin',
      icon: Shield,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  };

  const config = roleConfig[role] || roleConfig.user;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {config.label}
    </span>
  );
};

export default UserRoleBadge;
