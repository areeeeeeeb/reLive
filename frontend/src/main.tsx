import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

defineCustomElements(window);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);