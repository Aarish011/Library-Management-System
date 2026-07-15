import axios from './axiosConfig';

export const submitCareerApplication = async (payload) => {
  try {
    const response = await axios.post('/careers', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to submit application' };
  }
};
