import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import auth0, { Auth0DecodedHash, Auth0Error, Auth0UserProfile, WebAuth } from 'auth0-js';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID } from '@/lib/config';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0UserProfile | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  authorize: () => void;
  passwordlessStart: (email: string) => Promise<void>;
  passwordlessLogin: (email: string, verificationCode: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  getUserId: () => number | null;
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
    scope: 'openid profile email'
  });

  // handle authentication result
  const handleAuthentication = useCallback(() => {
    webAuth.parseHash((err: Auth0Error | null, authResult: Auth0DecodedHash | null) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        setSession(authResult);
        // clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      } else if (err) {
        console.error('Authentication error:', err);
        setError(err.errorDescription || 'Authentication failed');
        setIsLoading(false);
      }
    });
  }, []);

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
    webAuth.client.userInfo(authResult.accessToken || '', (err, profile) => {
      if (err) {
        console.error('Failed to get user info:', err);
        setError('Failed to get user information');
        setIsLoading(false);
        return;
      }

      setUser(profile);
      setIsAuthenticated(true);
      setIsLoading(false);
    });
  };

  // login with email and password (embedded login)
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      webAuth.login(
        {
          realm: 'Username-Password-Authentication',
          email,
          password
        },
        (err) => {
          if (err) {
            console.error('Login error:', err);
            setError(err.description || 'Login failed');
            setIsLoading(false);
            reject(err);
            return;
          }
          // after successful login, parse the hash
          handleAuthentication();
          resolve();
        }
      );
    });
  };

  // authorize using Universal Login Page (ULP)
  const authorize = () => {
    setError(null);
    webAuth.authorize({
      responseType: 'id_token',
      prompt: 'none' // Skip consent screen
    } as any);
  };

  // start passwordless authentication
  const passwordlessStart = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      webAuth.passwordlessStart(
        {
          connection: 'email',
          send: 'code',
          email
        },
        (err, result) => {
          setIsLoading(false);
          if (err) {
            console.error('Passwordless start error:', err);
            setError(err.description || 'Failed to send verification code');
            reject(err);
            return;
          }
          console.log('Passwordless code sent:', result);
          resolve();
        }
      );
    });
  };

  // verify passwordless code and login
  const passwordlessLogin = async (email: string, verificationCode: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      webAuth.passwordlessLogin(
        {
          connection: 'email',
          verificationCode,
          email
        },
        (err, res) => {
          if (err) {
            console.error('Passwordless login error:', err);
            setError(err.description || 'Verification failed');
            setIsLoading(false);
            reject(err);
            return;
          }
          console.log('Passwordless login success:', res);
          handleAuthentication();
          resolve();
        }
      );
    });
  };

  // Signup with email and password
  const signup = async (email: string, password: string, name?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      webAuth.signup(
        {
          connection: 'Username-Password-Authentication',
          email,
          password,
          user_metadata: name ? { name } : undefined,
        } as any,
        (err) => {
          if (err) {
            console.error('Signup error:', err);
            setError(err.description || (err as any).message || 'Signup failed');
            setIsLoading(false);
            reject(err);
            return;
          }

          // After successful signup, automatically log in
          // NOTE: This triggers a redirect to Auth0's consent page on localhost
          login(email, password)
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

    // logout from Auth0
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

  // get access token (renew if needed)
  const getAccessToken = async (): Promise<string | null> => {
    const token = localStorage.getItem('access_token');

    if (token && isSessionValid()) {
      return token;
    }

    // try to renew token silently using checkSession
    return new Promise((resolve) => {
      webAuth.checkSession({}, (err, authResult) => {
        if (err) {
          console.error('Session renewal failed:', err);
          logout();
          resolve(null);
          return;
        }

        if (authResult && authResult.accessToken) {
          setSession(authResult);
          resolve(authResult.accessToken);
        } else {
          resolve(null);
        }
      });
    });
  };

  // initialize - check for existing session
  useEffect(() => {
    // check if redirected back from Auth0
    if (window.location.hash) {
      handleAuthentication();
      return;
    }

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
  }, [handleAuthentication]);

  const getUserId = (): number | null => {
    // PLACEHOLDER
    return 1;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        login,
        authorize,
        passwordlessStart,
        passwordlessLogin,
        signup,
        logout,
        getAccessToken,
        getUserId,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
