import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Save,
  X,
  Upload,
  Globe,
  MapPin,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthState } from '@/lib/auth-client';

interface BrandProfile {
  id: string;
  companyName: string;
  companyDescription: string | null;
  location: string | null;
  websiteUrl: string | null;
  businessEmail: string;
  businessPhone: string | null;
  verified: boolean;
  slug: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  socialLinks: Record<string, string> | null;
}

interface BrandProfileFormData {
  companyDescription: string;
  location: string;
  logoUrl: string;
  coverImageUrl: string;
  slug: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
    facebook: string;
    website: string;
  };
}

const BrandProfileSettingsPage: React.FC = () => {
  const { user } = useAuthState();
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<BrandProfileFormData>({
    companyDescription: '',
    location: '',
    logoUrl: '',
    coverImageUrl: '',
    slug: '',
    socialLinks: {
      twitter: '',
      instagram: '',
      linkedin: '',
      youtube: '',
      facebook: '',
      website: ''
    }
  });

  useEffect(() => {
    fetchBrandProfile();
  }, []);

  const fetchBrandProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Better Auth may use 'name' (display name) or custom fields
      // We need to access the actual username field from the user object
      console.log('User data:', user);

      // Try to get username - Better Auth stores it in a custom field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const username = (user as any)?.username || user?.email?.split('@')[0];

      if (!username) {
        setError('User information not available');
        setLoading(false);
        return;
      }

      console.log('Fetching profile for username:', username);

      // Get the current user's profile with brand data using the username
      const result = await apiClient.get<{ success: boolean; data: { brand: BrandProfile }; message?: string }>(
        `/profiles/users/${username}`
      );

      if (result.success && result.data?.brand) {
        const brandData = result.data.brand;
        setProfile(brandData);

        // Populate form with existing data
        setFormData({
          companyDescription: brandData.companyDescription || '',
          location: brandData.location || '',
          logoUrl: brandData.logoUrl || '',
          coverImageUrl: brandData.coverImageUrl || '',
          slug: brandData.slug || '',
          socialLinks: {
            twitter: brandData.socialLinks?.twitter || '',
            instagram: brandData.socialLinks?.instagram || '',
            linkedin: brandData.socialLinks?.linkedin || '',
            youtube: brandData.socialLinks?.youtube || '',
            facebook: brandData.socialLinks?.facebook || '',
            website: brandData.socialLinks?.website || ''
          }
        });
      } else {
        setError('Brand profile not found. Please create a brand account first.');
      }
    } catch (err) {
      console.error('Error fetching brand profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load brand profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BrandProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform: keyof BrandProfileFormData['socialLinks'], value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setError('Brand profile not found');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Clean up data - remove empty strings and convert to undefined
      const updateData = {
        brandId: profile.id,
        companyDescription: formData.companyDescription.trim() || undefined,
        location: formData.location.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        slug: formData.slug.trim() || undefined,
        socialLinks: Object.fromEntries(
          Object.entries(formData.socialLinks)
            .filter(([_, value]) => value.trim() !== '')
        )
      };

      const result = await apiClient.patch<{ success: boolean; message?: string }>(
        '/profiles/my-brand',
        updateData
      );

      if (result.success) {
        setSuccess('Profile updated successfully!');
        // Refresh the profile data
        await fetchBrandProfile();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error updating brand profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      // Reset form to original profile data
      setFormData({
        companyDescription: profile.companyDescription || '',
        location: profile.location || '',
        logoUrl: profile.logoUrl || '',
        coverImageUrl: profile.coverImageUrl || '',
        slug: profile.slug || '',
        socialLinks: {
          twitter: profile.socialLinks?.twitter || '',
          instagram: profile.socialLinks?.instagram || '',
          linkedin: profile.socialLinks?.linkedin || '',
          youtube: profile.socialLinks?.youtube || '',
          facebook: profile.socialLinks?.facebook || '',
          website: profile.socialLinks?.website || ''
        }
      });
      setError(null);
      setSuccess(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading brand profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Brand Profile Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <Link
            to="/brand"
            className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building className="w-8 h-8 text-red-500" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Brand Profile Settings
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Update your brand information and social links
              </p>
            </div>
            {profile?.slug && (
              <Link
                to={`/profiles/brands/${profile.slug}`}
                className="text-red-500 hover:text-red-600 text-sm font-medium"
              >
                View Public Profile →
              </Link>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Company Name (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={profile?.companyName || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Company name cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Brand URL Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">/profiles/brands/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="your-brand-name"
                    pattern="[a-z0-9-]+"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Only lowercase letters, numbers, and hyphens. Minimum 3 characters.
                </p>
              </div>

              {/* Company Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Description
                </label>
                <textarea
                  value={formData.companyDescription}
                  onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell customers about your brand..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formData.companyDescription.length}/1000 characters
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  maxLength={100}
                  placeholder="San Francisco, CA"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Brand Images */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              <Upload className="inline h-5 w-5 mr-2" />
              Brand Images
            </h2>

            <div className="space-y-4">
              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {formData.logoUrl && (
                  <div className="mt-3">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-24 w-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={formData.coverImageUrl}
                  onChange={(e) => handleInputChange('coverImageUrl', e.target.value)}
                  placeholder="https://example.com/cover.png"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {formData.coverImageUrl && (
                  <div className="mt-3">
                    <img
                      src={formData.coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              <LinkIcon className="inline h-5 w-5 mr-2" />
              Social Links
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.socialLinks).map(([platform, url]) => (
                <div key={platform}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                    <Globe className="inline h-4 w-4 mr-1" />
                    {platform}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleSocialLinkChange(platform as keyof BrandProfileFormData['socialLinks'], e.target.value)}
                    placeholder={`https://${platform}.com/yourprofile`}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="inline h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandProfileSettingsPage;
