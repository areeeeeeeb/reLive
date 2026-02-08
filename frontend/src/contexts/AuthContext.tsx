import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import auth0, { Auth0DecodedHash, Auth0UserProfile } from 'auth0-js';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from '@/lib/config';
import { User } from '@/lib/types';
import apiClient from '@/lib/v2api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // initialize Auth0 WebAuth
  const webAuth = useMemo(() => new auth0.WebAuth({
    domain: AUTH0_DOMAIN,
    clientID: AUTH0_CLIENT_ID,
    redirectUri: window.location.origin,
    responseType: 'token id_token',
    scope: 'openid profile email',
    audience: AUTH0_AUDIENCE
  }), []);

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

      // sync user with backend and get backend user data
      try {
        const backendUser = await syncUserWithBackend(authResult.accessToken || '', profile);
        setUser(backendUser);
        setIsAuthenticated(true);
      } catch (syncErr) {
        console.error('Failed to sync user with backend:', syncErr);
        setError('Failed to sync user with backend');
      }

      setIsLoading(false);
    });
  };

  // sync user with backend database
  const syncUserWithBackend = useCallback(async (accessToken: string, profile: Auth0UserProfile): Promise<User> => {
    const response = await apiClient.post('/v2/api/users/sync', {
      email: profile.email || '',
      username: profile.username || '',
      profile_picture: profile.picture || null,
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data.user;
  }, []);

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

          // after successful signup, automatically log in with username
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
  const logout = useCallback(() => {
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
  }, [webAuth]);

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
      webAuth.client.userInfo(token, async (err, profile) => {
        if (err) {
          console.error('Failed to get user info:', err);
          logout();
          setIsLoading(false);
          return;
        }

        // sync user with backend
        try {
          const backendUser = await syncUserWithBackend(token, profile);
          setUser(backendUser);
          setIsAuthenticated(true);
        } catch (syncErr) {
          console.error('Failed to sync user with backend:', syncErr);
          logout();
        }

        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [webAuth, logout, syncUserWithBackend]);

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
