import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@/styles/global.css';
import Layout from './components/layouts/Layout.tsx';
import { Providers } from './components/providers';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Providers>
      <Layout type='responsive'>
        <App />
      </Layout>
    </Providers>
  </React.StrictMode>
);
