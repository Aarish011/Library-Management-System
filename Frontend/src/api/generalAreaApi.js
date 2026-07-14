import axios from './axiosConfig';

export const getGeneralAreaAvailability = async () => {
  try {
    const response = await axios.get('/general-area/availability');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load general area availability' };
  }
};
