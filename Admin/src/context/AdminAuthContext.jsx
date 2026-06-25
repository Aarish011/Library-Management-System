import { createContext, useContext, useEffect, useState } from 'react';
import { adminLogin, getCurrentAdmin } from '../api/authApi';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }
    getCurrentAdmin()
      .then((res) => {
        if (res.data?.role === 'admin') setAdmin(res.data);
        else localStorage.removeItem('adminToken');
      })
      .catch(() => localStorage.removeItem('adminToken'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const res = await adminLogin(credentials);
    const user = res.data?.user;
    const token = res.data?.token;
    if (user?.role !== 'admin') throw new Error('This account is not an admin');
    localStorage.setItem('adminToken', token);
    setAdmin(user);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
    window.location.hash = '#/login';
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, isAuthenticated: Boolean(admin), login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}