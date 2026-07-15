import { apiRequest } from './client';
export const getStudents = (query = '') => apiRequest(`/admin/students${query}`);
export const getStudentDetails = (id) => apiRequest(`/admin/students/${id}`);
export const updateStudent = (id, payload) => apiRequest(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const uploadStudentAvatar = (id, file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);
  return apiRequest(`/admin/students/${id}/avatar`, {
    method: 'POST',
    body: formData,
  });
};
export const deleteStudent = (id) => apiRequest(`/admin/students/${id}`, { method: 'DELETE' });
