import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Store,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { CreateProductModal, EditProductModal, ProductFormData } from '../../components/modals';

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

interface BrandStats {
  totalProducts: number;
  activeProducts: number;
  pendingApproval: number;
  lowStock: number;
  totalRevenue: number;
}


export const BrandDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<BrandStats>({
    totalProducts: 0,
    activeProducts: 0,
    pendingApproval: 0,
    lowStock: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    originalPrice: undefined,
    imageUrl: '',
    images: [],
    active: true,
    public: true,
    inStock: true,
    stockCount: 0,
    featured: false,
    categoryId: '',
    tags: []
  });

  // Test API endpoints
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Testing GET /v1/brands/products...');
      const response = await fetch('/v1/brands/products', {
        credentials: 'include' // Include session cookies
      });

      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error response:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      
      if (data.success && data.data) {
        const productList = Array.isArray(data.data.products) ? data.data.products : [];
        setProducts(productList);
        
        // Calculate stats
        const stats = calculateStats(productList);
        setStats(stats);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setProducts([]);
      }
    } catch (err) {
      console.error('💥 Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (products: Product[]): BrandStats => {
    return {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.active && p.public).length,
      pendingApproval: products.filter(p => p.approvalStatus === 'pending').length,
      lowStock: products.filter(p => p.stockCount !== undefined && p.stockCount < 10).length,
      totalRevenue: products.reduce((sum, p) => sum + (p.price || 0), 0)
    };
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      originalPrice: undefined,
      imageUrl: '',
      images: [],
      active: true,
      public: true,
      inStock: true,
      stockCount: 0,
      featured: false,
      categoryId: '',
      tags: []
    });
  };

  const populateForm = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.imageUrl || '',
      images: product.images || [],
      active: product.active,
      public: product.public,
      inStock: product.inStock,
      stockCount: product.stockCount,
      featured: product.featured,
      categoryId: '',
      tags: [] // Product interface doesn't have tags, but we'll include it for consistency
    });
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    populateForm(product);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    resetForm();
  };

  const createProduct = async () => {
    try {
      setIsCreating(true);
      setError(null);
      console.log('🔄 Creating product:', formData);
      
      // Clean up the data
      const productData = {
        ...formData,
        description: formData.description && formData.description.trim() !== '' ? formData.description : undefined,
        originalPrice: formData.originalPrice || undefined,
        stockCount: formData.inStock ? formData.stockCount : undefined,
        imageUrl: formData.imageUrl && formData.imageUrl.trim() !== '' ? formData.imageUrl : undefined,
        images: formData.imageUrl && formData.imageUrl.trim() !== '' ? [formData.imageUrl, ...formData.images] : formData.images,
        categoryId: formData.categoryId && formData.categoryId.trim() !== '' ? formData.categoryId : undefined
      };

      const response = await fetch('/v1/brands/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(productData)
      });

      console.log('📊 Create response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Create error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ Product created:', data);
      
      // Refresh the product list and close modal
      fetchProducts();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('💥 Create error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsCreating(false);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    try {
      setIsUpdating(true);
      setError(null);
      console.log('🔄 Updating product:', editingProduct.id, formData);
      
      // Clean up the data
      const productData = {
        ...formData,
        description: formData.description && formData.description.trim() !== '' ? formData.description : undefined,
        originalPrice: formData.originalPrice || undefined,
        stockCount: formData.inStock ? formData.stockCount : undefined,
        imageUrl: formData.imageUrl && formData.imageUrl.trim() !== '' ? formData.imageUrl : undefined,
        images: formData.imageUrl && formData.imageUrl.trim() !== '' ? [formData.imageUrl, ...formData.images] : formData.images,
        categoryId: formData.categoryId && formData.categoryId.trim() !== '' ? formData.categoryId : undefined
      };

      const response = await fetch(`/v1/brands/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(productData)
      });

      console.log('📊 Update response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Update error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ Product updated:', data);
      
      // Refresh the product list and close modal
      fetchProducts();
      closeEditModal();
    } catch (err) {
      console.error('💥 Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      console.log(`🔄 Testing DELETE /v1/brands/products/${productId}...`);
      
      const response = await fetch(`/v1/brands/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      console.log('📊 Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Delete error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ Product deleted:', data);
      
      // Refresh the product list
      fetchProducts();
    } catch (err) {
      console.error('💥 Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Brand Dashboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your products and test API endpoints
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStock}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
            <button
              onClick={fetchProducts}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Refresh (Test GET)
            </button>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Create Product Modal */}
        <CreateProductModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          formData={formData}
          onInputChange={handleInputChange}
          onTagsChange={handleTagsChange}
          onSubmit={createProduct}
          isCreating={isCreating}
        />

        {/* Edit Product Modal */}
        <EditProductModal
          isOpen={showEditModal}
          onClose={closeEditModal}
          product={editingProduct}
          formData={formData}
          onInputChange={handleInputChange}
          onTagsChange={handleTagsChange}
          onSubmit={updateProduct}
          isUpdating={isUpdating}
        />

        {/* Products Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Products</h3>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No products found. Create your first product!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Approval
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          ${product.price}
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="ml-1 text-xs text-gray-500 line-through">
                              ${product.originalPrice}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {product.active ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {product.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {product.inStock ? (
                            product.stockCount !== undefined ? `${product.stockCount} units` : 'In Stock'
                          ) : (
                            'Out of Stock'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(product.approvalStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEditModal(product)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Debug Console */}
        <div className="mt-8 bg-gray-900 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">API Testing Console</h4>
          <div className="text-green-400 text-sm font-mono">
            <p>📍 Base URL: /v1/brands/products</p>
            <p>🔧 Open browser console (F12) to see detailed API logs</p>
            <p>🧪 Use buttons above to test GET, POST, PUT, DELETE endpoints</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandDashboard;
