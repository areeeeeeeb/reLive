import { useAuth0 } from '@auth0/auth0-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const getRedirectUri = () => {
  if (Capacitor.isNativePlatform()) {
    // Native mobile app (iOS/Android)
    return `com.hackathon.relive://${import.meta.env.VITE_AUTH0_DOMAIN}/capacitor/com.hackathon.relive/callback`;
  } else {
    // Web browser
    return window.location.origin;
  }
};

export const useAuth = () => {
  const { loginWithRedirect, logout: auth0Logout, ...rest } = useAuth0();

  const login = async () => {
    if (Capacitor.isNativePlatform()) {
      // On native platforms, use Capacitor's Browser plugin
      await loginWithRedirect({
        appState: { returnTo: '/profile' },
        async openUrl(url) {
          await Browser.open({
            url,
            windowName: "_self"
          });
        }
      });
    } else {
      // On web, use default behavior (window redirect)
      await loginWithRedirect({
        appState: { returnTo: '/profile' }
      });
    }
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) {
      // On native platforms, use Capacitor's Browser plugin
      await auth0Logout({
        logoutParams: {
          returnTo: getRedirectUri(),
        },
        async openUrl(url) {
          window.location.replace(url);
          window.location.reload();
        }
      });
    } else {
      // On web, use default behavior (window redirect)
      await auth0Logout({
        logoutParams: {
          returnTo: getRedirectUri(),
        },
        async openUrl(url) {
          window.location.replace(url);
          window.location.reload();
        }
      });
    }
  };

  const getUserId = (): number | null => {
    if (!rest.user?.sub) {
      return null;
    }

    // Auth0 user.sub format is typically "auth0|123" or "google-oauth2|456"
    // Extract the part after the pipe
    const parts = rest.user.sub.split('|');
    if (parts.length > 1) {
      const idString = parts[1];
      // Take last 6 digits to avoid integer overflow in PostgreSQL
      const last6Digits = idString.slice(-6);
      const numericId = parseInt(last6Digits);
      return isNaN(numericId) ? null : numericId;
    }

    return null;
  };

  return {
    login,
    logout,
    getUserId,
    ...rest
  };
};
