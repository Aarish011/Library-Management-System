import { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, logout as logoutApi } from '../api/authApi';
import toast from 'react-hot-toast';

// Create context - EXPORT THIS
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('bookshelf:session-expired', handleSessionExpired);
    return () =>
      window.removeEventListener(
        'bookshelf:session-expired',
        handleSessionExpired
      );
  }, []);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      let cachedUser = null;

      try {
        cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        localStorage.removeItem('user');
      }

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        if (response.success) {
          setUser(response.data);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(response.data));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        const sessionRejected =
          error.status === 401 || error.status === 403;

        if (sessionRejected) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        } else if (cachedUser) {
          setUser(cachedUser);
          setIsAuthenticated(true);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    toast.success('Welcome back! 👋');
  };

  // Logout
  const logout = () => {
    logoutApi();
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook with error handling
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
