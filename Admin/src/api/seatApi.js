import { apiRequest } from './client';
export const getSeats = () => apiRequest('/admin/seats');
export const updateSeat = (id, payload) => apiRequest(`/admin/seats/${id}`, { method: 'PUT', body: JSON.stringify(payload) });