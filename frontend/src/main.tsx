import React from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { getRedirectUri } from './hooks/useAuth';

defineCustomElements(window);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      useRefreshTokens={true}
      useRefreshTokensFallback={false}
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: getRedirectUri()
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);