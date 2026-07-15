import axios from './axiosConfig';

// Register new user
export const register = async (userData) => {
  try {
    const response = await axios.post('/auth/register', userData, {
      headers:
        userData instanceof FormData
          ? { 'Content-Type': 'multipart/form-data' }
          : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Login user
export const login = async (credentials) => {
  try {
    const response = await axios.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await axios.get('/auth/me');
    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || { message: 'Failed to get user' }),
      status: error.response?.status || null,
      isNetworkError: !error.response,
    };
  }
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Forgot password
export const forgotPassword = async (payload) => {
  try {
    const body =
      typeof payload === 'string' ? { email: payload, method: 'email' } : payload;
    const response = await axios.post('/auth/forgot-password', body, {
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to send reset link' };
  }
};

export const resetPassword = async (token, password) => {
  try {
    const response = await axios.post(`/auth/reset-password/${token}`, {
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to reset password' };
  }
};
