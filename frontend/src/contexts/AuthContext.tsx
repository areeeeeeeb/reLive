import React, { createContext, useContext, useEffect, useState } from 'react';
import auth0, { Auth0DecodedHash, Auth0UserProfile, WebAuth } from 'auth0-js';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from '@/lib/config';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0UserProfile | null;
  accessToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, displayName?: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Auth0UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // initialize Auth0 WebAuth
  const webAuth = new auth0.WebAuth({
    domain: AUTH0_DOMAIN,
    clientID: AUTH0_CLIENT_ID,
    redirectUri: window.location.origin,
    responseType: 'token id_token',
    scope: 'openid profile email',
    audience: AUTH0_AUDIENCE
  });

  // set authentication session
  const setSession = (authResult: Auth0DecodedHash) => {
    // set the time that the access token will expire
    const expiresAt = JSON.stringify(
      (authResult.expiresIn || 0) * 1000 + new Date().getTime()
    );

    localStorage.setItem('access_token', authResult.accessToken || '');
    localStorage.setItem('id_token', authResult.idToken || '');
    localStorage.setItem('expires_at', expiresAt);

    setAccessToken(authResult.accessToken || null);

    // get user profile
    webAuth.client.userInfo(authResult.accessToken || '', async (err, profile) => {
      if (err) {
        console.error('Failed to get user info:', err);
        setError('Failed to get user information');
        setIsLoading(false);
        return;
      }

      setUser(profile);
      setIsAuthenticated(true);

      // sync user with backend
      try {
        await syncUserWithBackend(authResult.accessToken || '', profile);
      } catch (syncErr) {
        console.error('Failed to sync user with backend:', syncErr);
      }

      setIsLoading(false);
    });
  };

  // sync user with backend database
  const syncUserWithBackend = async (accessToken: string, profile: Auth0UserProfile) => {
    const API_V2_BASE_URL = import.meta.env.VITE_API_V2_BASE_URL || 'http://localhost:8081';

    // THIS NEEDS FIXING: nickname is not the same as username
    const username = profile.nickname;

    const response = await fetch(`${API_V2_BASE_URL}/v2/api/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        email: profile.email || '',
        username
      })
    });

    if (!response.ok) {
      throw new Error(`Backend sync failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('User synced with backend:', data);
    return data;
  };

  // login with username and password
  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      webAuth.client.login(
        {
          realm: 'Username-Password-Authentication',
          username,
          password,
          audience: AUTH0_AUDIENCE,
          scope: 'openid profile email'
        },
        (err, authResult) => {
          if (err) {
            console.error('Login error:', err);
            setError(err.description || 'Login failed');
            setIsLoading(false);
            reject(err);
            return;
          }
          
          if (authResult && authResult.accessToken && authResult.idToken) {
            setSession(authResult as Auth0DecodedHash);
            resolve();
          } else {
            setError('Login failed - no tokens received');
            setIsLoading(false);
            reject(new Error('No tokens received'));
          }
        }
      );
    });
  };

  // signup
  const signup = async (email: string, password: string, username: string, displayName?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      webAuth.signup(
        {
          connection: 'Username-Password-Authentication',
          email,
          password,
          username,
          user_metadata: {
            displayName: displayName || username
          },
        } as any,
        (err) => {
          if (err) {
            console.error('Signup error:', err);
            setError(err.description || (err as any).message || 'Signup failed');
            setIsLoading(false);
            reject(err);
            return;
          }

          // After successful signup, automatically log in with username
          // NOTE: This triggers a redirect to Auth0's consent page on localhost
          login(username, password)
            .then(resolve)
            .catch((loginErr) => {
              setIsLoading(false);
              reject(loginErr);
            });
        }
      );
    });
  };

  // logout
  const logout = () => {
    // clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('expires_at');

    // clear state
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);

    // logout from Auth0 (clears Auth0 session)
    webAuth.logout({
      returnTo: window.location.origin,
      clientID: AUTH0_CLIENT_ID
    });
  };

  // check if session is still valid
  const isSessionValid = (): boolean => {
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt) return false;
    return new Date().getTime() < JSON.parse(expiresAt);
  };

  // initialize
  useEffect(() => {
    // check for existing valid session
    const token = localStorage.getItem('access_token');
    const idToken = localStorage.getItem('id_token');

    if (token && idToken && isSessionValid()) {
      setAccessToken(token);
      // get user profile
      webAuth.client.userInfo(token, (err, profile) => {
        if (err) {
          console.error('Failed to get user info:', err);
          logout();
          setIsLoading(false);
          return;
        }
        setUser(profile);
        setIsAuthenticated(true);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        login,
        signup,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
