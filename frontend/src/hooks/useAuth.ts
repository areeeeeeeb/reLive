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
        async openUrl(url) {
          await Browser.open({
            url,
            windowName: "_self"
          });
        }
      });
    } else {
      // On web, use default behavior (window redirect)
      await loginWithRedirect();
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

  return {
    login,
    logout,
    ...rest
  };
};
