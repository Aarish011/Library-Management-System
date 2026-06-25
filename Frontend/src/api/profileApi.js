import api from './axiosConfig';

function profileError(error, fallback) {
  return error.response?.data || { message: fallback };
}

export async function fetchProfile() {
  try {
    const { data } = await api.get('/auth/me');
    return data.data;
  } catch (error) {
    throw profileError(error, 'Failed to fetch profile');
  }
}

export async function updateProfile(payload) {
  try {
    const { data } = await api.put('/auth/me', payload);
    return data.data;
  } catch (error) {
    throw profileError(error, 'Failed to update profile');
  }
}

export async function changePassword(payload) {
  try {
    const { data } = await api.put('/auth/me/password', payload);
    return data;
  } catch (error) {
    throw profileError(error, 'Failed to change password');
  }
}

export async function uploadProfilePicture(file) {
  try {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const { data } = await api.post('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (error) {
    throw profileError(error, 'Failed to upload profile picture');
  }
}