import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layouts/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import { NotFound } from '@/pages/NotFound';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { SkipLinks, ScreenReaderAnnouncer } from '@/components/accessibility';
import performanceMonitor from '@/utils/performance-monitoring';
import { AuthProvider } from '@/providers/AuthProvider';
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
  LiveStreamsPage,
  AboutPage
} from '@/pages';
import MessageListDemo from '@/components/chat/MessageListDemo';
import ChatInputDemo from '@/components/chat/ChatInputDemo';
import MessageListTest from '@/components/chat/MessageListTest';
import ChatLayoutComparison from '@/components/chat/ChatLayoutComparison';
import MessageListComparison from '@/components/chat/MessageListComparison';
import ViewerCountDemo from '@/components/stream/ViewerCountDemo';
import ChatInputDebug from '@/components/chat/ChatInputDebug';
import StreamLayoutDemo from '@/components/stream/StreamLayoutDemo';
// import MockApiDebugPage from '@/pages/debug/MockApiDebugPage'; // Removed - used old stream store
import VdoNinjaTestPage from '@/pages/debug/VdoNinjaTestPage';
import WebSocketTestPage from '@/pages/debug/WebSocketTestPage';
import WebSocketChatTest from '@/pages/test/WebSocketChatTest';

function App() {
  useEffect(() => {
    // Start monitoring app performance
    performanceMonitor.startMark('app-interactive');
    
    // Mark when app becomes interactive
    const timer = setTimeout(() => {
      performanceMonitor.endMark('app-interactive');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SkipLinks />
          <ScreenReaderAnnouncer />
          <SuspenseWrapper fullScreen message="Loading application...">
            <PWAInstallPrompt />
            <Routes>
            <Route path="/" element={<Layout type="responsive" />}>
              {/* Public Routes */}
              <Route index element={<HomePage />} />
              <Route path="auth" element={<AuthPage />} />
              <Route path="about" element={<AboutPage />} />
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
              <Route path="stream-layout-demo" element={<StreamLayoutDemo />} />
              {/* <Route path="mock-api-debug" element={<MockApiDebugPage />} /> Removed - used old stream store */}
              <Route path="vdo-ninja-test" element={<VdoNinjaTestPage />} />
              <Route path="websocket-test" element={<WebSocketTestPage />} />
              <Route path="websocket-chat-test" element={<WebSocketChatTest />} />
              
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
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SuspenseWrapper>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;