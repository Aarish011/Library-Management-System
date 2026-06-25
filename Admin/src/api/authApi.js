import { apiRequest } from './client';

export const adminLogin = (credentials) => apiRequest('/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const getCurrentAdmin = () => apiRequest('/auth/me');