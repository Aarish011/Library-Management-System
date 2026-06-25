import { apiRequest } from './client';
export const getDashboard = () => apiRequest('/admin/dashboard');