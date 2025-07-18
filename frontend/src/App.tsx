import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import {
  HomePage,
  StreamPage,
  StudioPage,
  ProductsPage,
  ProductDetailPage,
  ProfilePage,
  WishlistPage,
  SchedulePage,
  AuthPage
} from '@/pages';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<HomePage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="stream/:id" element={<StreamPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          
          {/* Protected Routes */}
          <Route path="studio" element={
            <ProtectedRoute>
              <StudioPage />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="wishlist" element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          } />
          
          {/* Catch all - 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;