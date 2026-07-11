import { apiRequest } from './client';
export const getSubscriptions = () => apiRequest('/admin/subscriptions');
export const getRenewalsDue = () => apiRequest('/admin/renewals/due');
