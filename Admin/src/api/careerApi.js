import { apiRequest } from './client';

export const getCareerApplications = (query = '') =>
  apiRequest(`/careers/admin${query}`);

export const updateCareerApplication = (id, payload) =>
  apiRequest(`/careers/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
