import React from 'react';
import { X, Edit, Upload, Tag } from 'lucide-react';
import { ProductFormData } from './CreateProductModal';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  images?: string[];
  active: boolean;
  public: boolean;
  inStock: boolean;
  stockCount?: number;
  featured: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  formData: ProductFormData;
  onInputChange: (field: keyof ProductFormData, value: any) => void;
  onTagsChange: (tagsString: string) => void;
  onSubmit: () => void;
  isUpdating: boolean;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  formData,
  onInputChange,
  onTagsChange,
  onSubmit,
  isUpdating
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Product</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => onInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Describe your product"
              />
            </div>

            {/* Price Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => onInputChange('price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Original Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.originalPrice || ''}
                  onChange={(e) => onInputChange('originalPrice', parseFloat(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                Product Image URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => onInputChange('imageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => onTagsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="electronics, gadget, premium"
              />
            </div>

            {/* Stock Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={(e) => onInputChange('inStock', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">In Stock</span>
                </label>
                
                {formData.inStock && (
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockCount}
                      onChange={(e) => onInputChange('stockCount', parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Stock"
                    />
                    <span className="ml-1 text-sm text-gray-500">units</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Toggles */}
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => onInputChange('active', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.public}
                  onChange={(e) => onInputChange('public', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Public</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => onInputChange('featured', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Featured</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isUpdating || !formData.name || formData.price <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Update Product
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
