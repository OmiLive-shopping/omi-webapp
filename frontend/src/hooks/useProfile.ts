import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthState } from '@/lib/auth-client';

export interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  socialLinks?: Record<string, string>;
  publicProfile?: boolean;
  role: string;
  streamKey?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    streams: number;
    followers: number;
    following: number;
  };
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  location?: string;
  socialLinks?: Record<string, string>;
  publicProfile?: boolean;
  avatarUrl?: string;
}

export function useProfile() {
  const { user: authUser, isAuthenticated } = useAuthState();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the new profile endpoint
      const response = await apiClient.get(`/profiles/users/${authUser?.username}`);

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.message || 'Failed to fetch profile');
      }
    } catch (err) {
      setError('Failed to fetch profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      // Clean up the data - remove empty strings and empty objects
      const cleanedData: Partial<UpdateProfileData> = {};
      
      if (data.name && data.name.trim()) cleanedData.name = data.name.trim();
      if (data.bio !== undefined) cleanedData.bio = data.bio; // Allow empty string for bio
      if (data.location !== undefined) cleanedData.location = data.location; // Allow empty string for location
      if (data.publicProfile !== undefined) cleanedData.publicProfile = data.publicProfile;
      
      // Only include avatarUrl if it's a non-empty string
      if (data.avatarUrl && data.avatarUrl.trim()) {
        cleanedData.avatarUrl = data.avatarUrl.trim();
      }
      
      // Only include socialLinks if it has actual values
      if (data.socialLinks && Object.keys(data.socialLinks).length > 0) {
        const cleanedLinks: Record<string, string> = {};
        Object.entries(data.socialLinks).forEach(([key, value]) => {
          if (value && value.trim()) {
            cleanedLinks[key] = value.trim();
          }
        });
        if (Object.keys(cleanedLinks).length > 0) {
          cleanedData.socialLinks = cleanedLinks;
        }
      }

      // Use the new profile endpoint
      const response = await apiClient.patch('/profiles/me', cleanedData);

      if (response.success && response.data) {
        setProfile(response.data);
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.message || 'Failed to update profile' };
      }
    } catch (err) {
      console.error('Profile update error:', err);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
  };
}

export function usePublicProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/users/${userId}`);
      
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.message || 'Failed to fetch profile');
      }
    } catch (err) {
      setError('Failed to fetch profile');
      console.error('Public profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, error, refetch: fetchProfile };
}