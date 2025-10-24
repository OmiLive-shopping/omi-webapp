import React, { useState } from 'react';
import { X, User, Store, Video, Shield, AlertTriangle } from 'lucide-react';
import { admin } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import UserRoleBadge from './UserRoleBadge';

type UserRole = 'user' | 'brand' | 'streamer' | 'admin';

interface Brand {
  companyName: string;
  verified: boolean;
  slug?: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  role: UserRole;
  avatarUrl?: string;
  brand?: Brand;
}

interface RoleManagementModalProps {
  user: User;
  onClose: () => void;
  onRoleUpdated: () => void;
}

const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  user,
  onClose,
  onRoleUpdated,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = [
    {
      value: 'user' as UserRole,
      label: 'User',
      icon: User,
      color: 'text-gray-600 dark:text-gray-400',
      description: 'Standard user with basic permissions',
    },
    {
      value: 'brand' as UserRole,
      label: 'Brand',
      icon: Store,
      color: 'text-purple-600 dark:text-purple-400',
      description: 'Brand account with product management access',
    },
    {
      value: 'streamer' as UserRole,
      label: 'Streamer',
      icon: Video,
      color: 'text-blue-600 dark:text-blue-400',
      description: 'Content creator with streaming capabilities',
    },
    {
      value: 'admin' as UserRole,
      label: 'Admin',
      icon: Shield,
      color: 'text-red-600 dark:text-red-400',
      description: 'Administrator with full system access',
    },
  ];

  const handleRoleChange = () => {
    if (selectedRole === 'brand' && !companyName.trim()) {
      setError('Company name is required for brand accounts');
      return;
    }
    setShowConfirmation(true);
  };

  const confirmRoleChange = async () => {
    try {
      setLoading(true);
      setError(null);

      // Update role directly via our API (Better Auth admin.setRole only supports limited roles)
      // apiClient automatically includes Bearer token from localStorage and prepends baseUrl
      await apiClient.patch('/profiles/users/role', {
        userId: user.id,
        role: selectedRole,
      });

      // If assigning brand role, create Brand record
      if (selectedRole === 'brand') {
        await apiClient.post('/profiles/brands', {
          userId: user.id,
          companyName: companyName.trim(),
          businessEmail: businessEmail.trim() || user.email,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          approvalStatus: 'approved',
        });
      }

      // Success - close modal and refresh
      onRoleUpdated();
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmation(false);
    setError(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={!showConfirmation ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage User Role
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* User Info */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {user.username}
                </div>
                {user.brand?.companyName && (
                  <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {user.brand.companyName}
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
              </div>
              <UserRoleBadge role={user.role} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}

            {/* Role Selection */}
            <div className="mb-6">
              <label
                htmlFor="role-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Select New Role
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>

              {/* Show role description */}
              {selectedRole && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    {(() => {
                      const Icon = roleOptions.find((r) => r.value === selectedRole)?.icon || User;
                      const color = roleOptions.find((r) => r.value === selectedRole)?.color || '';
                      return <Icon className={`w-4 h-4 ${color}`} />;
                    })()}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {roleOptions.find((r) => r.value === selectedRole)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {roleOptions.find((r) => r.value === selectedRole)?.description}
                  </p>
                </div>
              )}
            </div>

            {/* Brand-specific fields */}
            {selectedRole === 'brand' && (
              <div className="space-y-4 mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    placeholder="Enter company name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label
                    htmlFor="businessEmail"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Business Email
                  </label>
                  <input
                    type="email"
                    id="businessEmail"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    disabled={loading}
                    placeholder={user.email}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Defaults to user's email if not provided
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmation && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      Confirm Role Change
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Are you sure you want to change {user.username}'s role from{' '}
                      <strong>{user.role}</strong> to <strong>{selectedRole}</strong>?
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {showConfirmation ? (
              <>
                <button
                  onClick={cancelConfirmation}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleChange}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Confirm Change
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={loading || selectedRole === user.role}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Role
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RoleManagementModal;
