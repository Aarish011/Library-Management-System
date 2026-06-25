import { apiRequest } from './client';
export const getSubscriptions = () => apiRequest('/admin/subscriptions');