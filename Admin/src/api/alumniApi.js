import { apiRequest } from './client';

export const getAlumni = (query = '') =>
  apiRequest(`/admin/alumni${query}`);

export const getAlumniDetails = (id) =>
  apiRequest(`/admin/alumni/${id}`);
