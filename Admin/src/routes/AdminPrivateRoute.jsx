import { useAdminAuth } from '../hooks/useAdminAuth';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
export default function AdminPrivateRoute({ children }) { const { isAuthenticated, loading } = useAdminAuth(); if (loading) return <div className='loader'>Loading...</div>; return isAuthenticated ? children : <AdminLoginPage />; }