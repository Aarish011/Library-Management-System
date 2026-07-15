import { apiRequest } from './client';

export const getAdmissionLeads = (query = '') =>
  apiRequest(`/admin/admission-leads${query}`);

export const createAdmissionLead = (payload) =>
  apiRequest('/admin/admission-leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateAdmissionLead = (id, payload) =>
  apiRequest(`/admin/admission-leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
