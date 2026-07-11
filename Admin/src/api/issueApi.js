import { apiRequest } from './client';

export const getIssues = (query = '') => apiRequest(`/admin/issues${query}`);

export const updateIssue = (id, payload) =>
  apiRequest(`/admin/issues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
