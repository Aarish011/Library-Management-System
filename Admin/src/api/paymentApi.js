import { apiRequest } from './client';
export const getPayments = () => apiRequest('/admin/payments');
export const confirmDeskPayment = (id) => apiRequest(`/admin/payments/${id}/confirm-desk`, { method: 'PUT' });