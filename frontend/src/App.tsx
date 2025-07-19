import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layouts/Layout';
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
  AuthPage,
  LiveStreamsPage
} from '@/pages';
import MessageListDemo from '@/components/chat/MessageListDemo';
import ChatInputDemo from '@/components/chat/ChatInputDemo';
import MessageListTest from '@/components/chat/MessageListTest';
import ChatLayoutComparison from '@/components/chat/ChatLayoutComparison';
import MessageListComparison from '@/components/chat/MessageListComparison';
import ViewerCountDemo from '@/components/stream/ViewerCountDemo';
import ChatInputDebug from '@/components/chat/ChatInputDebug';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout type="responsive" />}>
          {/* Public Routes */}
          <Route index element={<HomePage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="live-streams" element={<LiveStreamsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="stream/:id" element={<StreamPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="message-list-demo" element={<MessageListDemo />} />
          <Route path="chat-input-demo" element={<ChatInputDemo />} />
          <Route path="message-list-test" element={<MessageListTest />} />
          <Route path="chat-layout-comparison" element={<ChatLayoutComparison />} />
          <Route path="message-list-comparison" element={<MessageListComparison />} />
          <Route path="viewer-count-demo" element={<ViewerCountDemo />} />
          <Route path="chat-input-debug" element={<ChatInputDebug />} />
          
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